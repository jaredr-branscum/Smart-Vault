from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime

import models
import schemas
from database import engine, get_db
from pdf_parser import parse_pdf_receipt

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Vault API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For PoC
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload", response_model=schemas.ReceiptBase)
async def upload_receipt(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for now.")
        
    contents = await file.read()
    parsed_data = parse_pdf_receipt(contents)
    
    if "error" in parsed_data:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {parsed_data['error']}")
        
    return parsed_data

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
    categories: List[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Receipt)
    if start_date:
        query = query.filter(models.Receipt.date >= start_date)
    if end_date:
        query = query.filter(models.Receipt.date <= end_date)
    if categories:
        query = query.filter(models.Receipt.category.in_(categories))
        
    receipts = query.all()
    
    total = sum(r.total_amount for r in receipts if r.total_amount)
    by_category = {}
    for r in receipts:
        if r.category:
            by_category[r.category] = by_category.get(r.category, 0) + (r.total_amount or 0)
            
    return {
        "total_expenses": total,
        "by_category": by_category,
        "receipts": [{"id": r.id, "merchant": r.merchant, "amount": r.total_amount, "date": r.date, "category": r.category} for r in receipts]
    }

