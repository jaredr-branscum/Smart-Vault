from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
import datetime
import os
import json
import uuid
import logging

import models, schemas
from database import engine, get_db
from s3_service import s3_service
from logging_config import configure_logging
from auth import get_current_user

from config import settings

# Structured JSON logging — compatible with Datadog, CloudWatch Logs, Splunk, etc.
configure_logging()
logger = logging.getLogger("smart-vault")

app = FastAPI(title=settings.PROJECT_NAME)

# Prometheus metrics — exposes /metrics endpoint for Grafana scraping
Instrumentator().instrument(app).expose(app)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    
    response = await call_next(request)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Dynamic CSP based on environment settings
    s3_host = settings.S3_PUBLIC_URL.replace("http://", "").replace("https://", "")
    kc_host = settings.KEYCLOAK_URL.replace("http://", "").replace("https://", "")
    
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
        f"img-src 'self' data: {s3_host}; " 
        f"connect-src 'self' {kc_host} {s3_host};"
    )
    return response

# Performance Middleware (Middle)
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Middleware (Outer - Must be added LAST in FastAPI to run FIRST)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.post("/receipts", response_model=schemas.ReceiptOut)
async def create_receipt(
    metadata: str = Form(...), # Sent as JSON string in form field
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    # Note: We manually parse metadata from a Form field because the browser sends 
    # the receipt as multipart/form-data to support physical file uploads.
    try:
        data = json.loads(metadata)
        receipt_data = schemas.ReceiptCreate(**data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON string")
    except Exception as e:
        # Pydantic validation errors or others
        raise HTTPException(status_code=422, detail=str(e))

    # 1. Generate a unique key for S3
    file_extension = os.path.splitext(file.filename)[1]
    object_key = f"{uuid.uuid4()}{file_extension}"

    # 2. Upload to LocalStack S3
    if not s3_service.upload_file(file.file, object_key, content_type=file.content_type):
        raise HTTPException(status_code=500, detail="Failed to store document in vault")

    # 3. Save to DB with S3 Key and User ID
    db_receipt = models.Receipt(
        user_id=_user["sub"],
        merchant=receipt_data.merchant,
        total_amount=receipt_data.total_amount,
        date=receipt_data.date,
        category=receipt_data.category,
        file_path=object_key # Storing the S3 Key here
    )
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    return db_receipt

@app.get("/receipts/{receipt_id}/view-url")
def get_receipt_view_url(
    receipt_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    db_receipt = db.query(models.Receipt).filter(
        models.Receipt.id == receipt_id,
        models.Receipt.user_id == _user["sub"]
    ).first()
    if not db_receipt or not db_receipt.file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    
    url = s3_service.generate_presigned_url(db_receipt.file_path)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate secure access link")
    
    return {"url": url}

@app.get("/receipts", response_model=List[schemas.ReceiptOut])
def read_receipts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    receipts = db.query(models.Receipt).filter(
        models.Receipt.user_id == _user["sub"]
    ).offset(skip).limit(limit).all()
    return receipts

@app.delete("/receipts/{receipt_id}")
async def delete_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    receipt = db.query(models.Receipt).filter(
        models.Receipt.id == receipt_id,
        models.Receipt.user_id == _user["sub"]
    ).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    db.delete(receipt)
    db.commit()
    return {"message": "Receipt deleted"}

@app.get("/analytics")
def get_analytics(
    start_date: datetime.date = None,
    end_date: datetime.date = None,
    categories: List[str] = Query(None, max_length=10), # Prevent extremely long lists
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user)
):
    # Base query for totals - Filter by User ID
    total_query = db.query(func.sum(models.Receipt.total_amount)).filter(models.Receipt.user_id == _user["sub"])
    if start_date:
        total_query = total_query.filter(models.Receipt.date >= start_date)
    if end_date:
        total_query = total_query.filter(models.Receipt.date <= end_date)
    if categories:
        total_query = total_query.filter(models.Receipt.category.in_(categories))
        
    total_expenses = total_query.scalar() or 0.0

    # Category breakdown query - Filter by User ID
    cat_query = db.query(
        models.Receipt.category, 
        func.sum(models.Receipt.total_amount)
    ).filter(models.Receipt.user_id == _user["sub"]).group_by(models.Receipt.category)
    
    if start_date:
        cat_query = cat_query.filter(models.Receipt.date >= start_date)
    if end_date:
        cat_query = cat_query.filter(models.Receipt.date <= end_date)
    if categories:
        cat_query = cat_query.filter(models.Receipt.category.in_(categories))
        
    by_category = {cat: amt for cat, amt in cat_query.all() if cat}

    # Fetch detailed receipts - Filter by User ID
    receipts_query = db.query(models.Receipt).filter(models.Receipt.user_id == _user["sub"])
    if start_date:
        receipts_query = receipts_query.filter(models.Receipt.date >= start_date)
    if end_date:
        receipts_query = receipts_query.filter(models.Receipt.date <= end_date)
    if categories:
        receipts_query = receipts_query.filter(models.Receipt.category.in_(categories))
        
    receipts = receipts_query.all()
            
    return {
        "total_expenses": total_expenses,
        "by_category": by_category,
        "receipts": [schemas.ReceiptOut.model_validate(r) for r in receipts]
    }

