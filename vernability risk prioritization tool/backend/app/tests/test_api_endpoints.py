import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_demo_admin():
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"
    return data["access_token"]

def test_invalid_login():
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_dashboard_summary():
    token = test_login_demo_admin()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_vulnerabilities"] >= 30
    assert data["total_assets"] >= 15
    assert data["critical_vulnerabilities"] > 0

def test_list_assets():
    token = test_login_demo_admin()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/assets", headers=headers)
    assert response.status_code == 200
    assets = response.json()
    assert len(assets) >= 15

def test_prioritized_vulnerabilities():
    token = test_login_demo_admin()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/risk/prioritized", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "top_immediate_attention" in data
    assert len(data["top_immediate_attention"]) == 5
    assert len(data["items"]) > 0
    # First item must have highest risk score
    first_score = data["items"][0]["vulnerability"]["risk_score"]
    second_score = data["items"][1]["vulnerability"]["risk_score"]
    assert first_score >= second_score

def test_export_csv_report():
    token = test_login_demo_admin()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/reports/export/csv", headers=headers)
    assert response.status_code == 200
    assert "CVE ID" in response.text

def test_export_pdf_report():
    token = test_login_demo_admin()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/reports/export/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000
