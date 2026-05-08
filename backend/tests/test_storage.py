import pytest
from unittest.mock import patch, MagicMock
import json

@patch("main.s3_service")
def test_upload_receipt_with_file(mock_s3, client):
    """Test that uploading a receipt with a file works and calls S3 with correct Content-Type."""
    mock_s3.upload_file.return_value = True
    
    metadata = {
        "merchant": "S3 Store",
        "total_amount": 123.45,
        "date": "2023-05-01",
        "category": "Cloud"
    }
    
    response = client.post(
        "/receipts",
        data={"metadata": json.dumps(metadata)},
        files={"file": ("receipt.png", b"fake-image-bytes", "image/png")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["merchant"] == "S3 Store"
    assert data["file_path"] is not None
    
    # Verify s3_service.upload_file was called with the correct content_type
    args, kwargs = mock_s3.upload_file.call_args
    assert kwargs["content_type"] == "image/png"
    assert mock_s3.upload_file.called

@patch("main.s3_service")
def test_get_view_url(mock_s3, client):
    """Test retrieving a pre-signed URL for an existing receipt."""
    # 1. Mock the DB and S3
    mock_s3.generate_presigned_url.return_value = "http://localhost:4566/signed-url"
    mock_s3.upload_file.return_value = True
    
    metadata = {"merchant": "ViewTest", "total_amount": 1.0, "date": "2023-01-01"}
    post_res = client.post(
        "/receipts",
        data={"metadata": json.dumps(metadata)},
        files={"file": ("test.jpg", b"abc", "image/jpeg")}
    )
    receipt_id = post_res.json()["id"]
    
    # 2. Call the view-url endpoint
    response = client.get(f"/receipts/{receipt_id}/view-url")
    
    assert response.status_code == 200
    assert response.json()["url"] == "http://localhost:4566/signed-url"
    assert mock_s3.generate_presigned_url.called

def test_view_url_not_found(client):
    """Test 404 for non-existent receipt."""
    response = client.get("/receipts/99999/view-url")
    assert response.status_code == 404
