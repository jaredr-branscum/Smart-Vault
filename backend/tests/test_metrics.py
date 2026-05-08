import pytest
from fastapi.testclient import TestClient


def test_metrics_endpoint_is_accessible(client):
    """The /metrics endpoint must respond with 200."""
    response = client.get("/metrics")
    assert response.status_code == 200


def test_metrics_endpoint_returns_prometheus_format(client):
    """The /metrics response should be in Prometheus text exposition format."""
    response = client.get("/metrics")
    assert "text/plain" in response.headers["content-type"]
    # Prometheus format always contains HELP and TYPE comment lines
    assert "# HELP" in response.text
    assert "# TYPE" in response.text


def test_metrics_tracks_http_requests(client):
    """After making a request, http_requests_total counter should appear."""
    # Trigger a tracked endpoint
    client.get("/receipts")

    response = client.get("/metrics")
    assert response.status_code == 200
    # The instrumentator exposes this standard metric
    assert "http_requests_total" in response.text or "http_request_duration" in response.text
