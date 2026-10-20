import pytest
from app import create_app
from config import TestingConfig

@pytest.fixture
def client():
    app = create_app(TestingConfig)
    with app.test_client() as client:
        with app.app_context():
            yield client

def test_health_endpoint(client):
    """Verify health check returns healthy status code 200."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_status_endpoint(client):
    """Verify system status endpoint returns subsystem metadata."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.get_json()
    assert "camera" in data
    assert "ai_engine" in data
    assert "database" in data

def test_page_views(client):
    """Verify view endpoints load successfully."""
    # Index redirects to dashboard
    index_res = client.get("/")
    assert index_res.status_code == 302

    endpoints = [
        "/dashboard",
        "/billboard",
        "/advertisements",
        "/monitoring",
        "/analytics",
        "/settings",
        "/about"
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"Failed on endpoint {ep}"

def test_api_404_json(client):
    """Verify API 404 returns JSON."""
    response = client.get("/api/unknown_endpoint")
    assert response.status_code == 404
    data = response.get_json()
    assert "error" in data
