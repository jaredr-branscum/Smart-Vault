import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import fitz # PyMuPDF to create a fake PDF

from main import app
from database import Base, get_db

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def create_fake_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Test Merchant\nDate: 05/07/2026\nTotal: $123.45")
    return doc.write()

def test_upload_receipt():
    fake_pdf_bytes = create_fake_pdf()
    response = client.post(
        "/upload",
        files={"file": ("test_receipt.pdf", fake_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["merchant"] == "Test Merchant"
    assert data["total_amount"] == 123.45
    assert data["date"] == "2026-05-07"

def test_create_and_read_receipt():
    # Create
    create_response = client.post(
        "/receipts",
        json={"merchant": "Target", "total_amount": 55.0, "date": "2026-05-08", "category": "Groceries"}
    )
    assert create_response.status_code == 200
    data = create_response.json()
    assert data["merchant"] == "Target"
    assert data["id"] is not None
    
    # Read
    read_response = client.get("/receipts")
    assert read_response.status_code == 200
    receipts = read_response.json()
    assert len(receipts) > 0
    assert receipts[-1]["merchant"] == "Target"
