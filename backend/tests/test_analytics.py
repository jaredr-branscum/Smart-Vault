import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_analytics.db"
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

@pytest.fixture(autouse=True)
def setup_data():
    # Clear and insert dummy data
    db = TestingSessionLocal()
    from models import Receipt
    db.query(Receipt).delete()
    db.add_all([
        Receipt(merchant="Walmart", total_amount=100.0, date=datetime.date(2026, 5, 1), category="Groceries"),
        Receipt(merchant="Target", total_amount=50.0, date=datetime.date(2026, 5, 2), category="Groceries"),
        Receipt(merchant="Amazon", total_amount=200.0, date=datetime.date(2026, 5, 5), category="Software"),
        Receipt(merchant="Shell", total_amount=40.0, date=datetime.date(2026, 5, 6), category="Travel"),
    ])
    db.commit()
    db.close()

def test_get_analytics_all():
    response = client.get("/analytics")
    assert response.status_code == 200
    data = response.json()
    assert data["total_expenses"] == 390.0
    assert "Groceries" in data["by_category"]
    assert data["by_category"]["Groceries"] == 150.0

def test_get_analytics_with_date_filter():
    response = client.get("/analytics?start_date=2026-05-04&end_date=2026-05-10")
    assert response.status_code == 200
    data = response.json()
    assert data["total_expenses"] == 240.0  # Amazon + Shell

def test_get_analytics_with_category_filter():
    response = client.get("/analytics?categories=Groceries&categories=Software")
    assert response.status_code == 200
    data = response.json()
    assert data["total_expenses"] == 350.0  # Walmart + Target + Amazon
    assert "Travel" not in data["by_category"]
