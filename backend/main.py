from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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

# Security/Scalability: Standardized logging for distributed environments
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("smart-vault")

app = FastAPI(title="Smart Vault API")

# Security: Strictly define allowed origins in production
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Security Headers Middleware (Inner)
# Using a simple function to avoid BaseHTTPMiddleware known issues with CORS preflight
@app.middleware("http")
async def add_security_headers(request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    
    response = await call_next(request)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
        "img-src 'self' data: fastapi.tiangolo.com; "
        "connect-src 'self' cdn.jsdelivr.net;"
    )
    return response

# Performance Middleware (Middle)
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Middleware (Outer - Must be added LAST in FastAPI to run FIRST)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.post("/receipts", response_model=schemas.ReceiptOut)
async def create_receipt(
    metadata: str = Form(...), # Sent as JSON string in form field
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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

    # 3. Save to DB with S3 Key
    db_receipt = models.Receipt(
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
def get_receipt_view_url(receipt_id: int, db: Session = Depends(get_db)):
    db_receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
    if not db_receipt or not db_receipt.file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    
    url = s3_service.generate_presigned_url(db_receipt.file_path)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate secure access link")
    
    return {"url": url}

@app.get("/receipts", response_model=List[schemas.ReceiptOut])
def read_receipts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    receipts = db.query(models.Receipt).offset(skip).limit(limit).all()
    return receipts

@app.delete("/receipts/{receipt_id}")
async def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    receipt = db.query(models.Receipt).filter(models.Receipt.id == receipt_id).first()
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
    db: Session = Depends(get_db)
):
    # Base query for totals
    total_query = db.query(func.sum(models.Receipt.total_amount))
    if start_date:
        total_query = total_query.filter(models.Receipt.date >= start_date)
    if end_date:
        total_query = total_query.filter(models.Receipt.date <= end_date)
    if categories:
        total_query = total_query.filter(models.Receipt.category.in_(categories))
        
    total_expenses = total_query.scalar() or 0.0

    # Category breakdown query
    cat_query = db.query(
        models.Receipt.category, 
        func.sum(models.Receipt.total_amount)
    ).group_by(models.Receipt.category)
    
    if start_date:
        cat_query = cat_query.filter(models.Receipt.date >= start_date)
    if end_date:
        cat_query = cat_query.filter(models.Receipt.date <= end_date)
    if categories:
        cat_query = cat_query.filter(models.Receipt.category.in_(categories))
        
    by_category = {cat: amt for cat, amt in cat_query.all() if cat}

    # Fetch detailed receipts
    receipts_query = db.query(models.Receipt)
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

