import pytest
import datetime
import json
from models import Receipt

@pytest.fixture
def setup_receipt(db):
    receipt = Receipt(merchant="DeleteMe", total_amount=10.0, date=datetime.date.today(), category="Test")
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt

def test_delete_receipt_success(client, setup_receipt, db):
    receipt_id = setup_receipt.id
    response = client.delete(f"/receipts/{receipt_id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Receipt deleted"
    
    # Verify it's gone
    assert db.query(Receipt).filter(Receipt.id == receipt_id).first() is None

def test_delete_receipt_not_found(client):
    response = client.delete("/receipts/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Receipt not found"
