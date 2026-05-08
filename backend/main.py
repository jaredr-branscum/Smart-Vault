from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
import datetime
import os

import models
import schemas
from database import engine, get_db
import logging

# Security/Scalability: Standardized logging for distributed environments
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("smart-vault")

app = FastAPI(title="Smart Vault API")

# Security: Strictly define allowed origins in production
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Limit methods
    allow_headers=["Content-Type", "Authorization"],
)

# Performance: Compress large JSON responses
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.post("/receipts", response_model=schemas.ReceiptOut)
def create_receipt(receipt: schemas.ReceiptCreate, db: Session = Depends(get_db)):
    db_receipt = models.Receipt(**receipt.model_dump())
    db.add(db_receipt)
    db.commit()
    db.refresh(db_receipt)
    return db_receipt

@app.get("/receipts", response_model=List[schemas.ReceiptOut])
def read_receipts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    receipts = db.query(models.Receipt).offset(skip).limit(limit).all()
    return receipts

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

