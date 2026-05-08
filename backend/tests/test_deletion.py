import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime

from main import app
from database import Base, get_db
from models import Receipt

# Setup isolated test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_delete.db"
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

@pytest.fixture
def setup_receipt():
    db = TestingSessionLocal()
    receipt = Receipt(merchant="DeleteMe", total_amount=10.0, date=datetime.date.today(), category="Test")
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    yield receipt
    db.close()

def test_delete_receipt_success(setup_receipt):
    receipt_id = setup_receipt.id
    response = client.delete(f"/receipts/{receipt_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Receipt deleted"
    
    # Verify it's gone
    db = TestingSessionLocal()
    assert db.query(Receipt).filter(Receipt.id == receipt_id).first() is None
    db.close()

def test_delete_receipt_not_found():
    response = client.delete("/receipts/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Receipt not found"
