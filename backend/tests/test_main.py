import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

def test_create_and_read_receipt():
    # Clear DB before test
    db = TestingSessionLocal()
    from models import Receipt
    db.query(Receipt).delete()
    db.commit()
    db.close()

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
