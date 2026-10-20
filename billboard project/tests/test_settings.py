import pytest
from app import create_app, db
from app.models import Setting
from config import TestingConfig

@pytest.fixture
def client():
    app = create_app(TestingConfig)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_settings_api_lifecycle(client):
    """Verify settings fetch, update, and reset endpoints."""
    # 1. Fetch settings
    res = client.get("/api/settings")
    assert res.status_code == 200
    settings = res.get_json()["settings"]
    assert "confidence_threshold" in settings
    assert "inference_fps" in settings

    # 2. Update settings
    update_payload = {
        "confidence_threshold": 0.60,
        "inference_fps": 12,
        "demonstration_mode": True
    }
    res_put = client.put("/api/settings", json=update_payload)
    assert res_put.status_code == 200
    assert res_put.get_json()["updated"]["confidence_threshold"] == 0.60

    # Verify updated in subsequent GET
    res_verify = client.get("/api/settings")
    s2 = res_verify.get_json()["settings"]
    assert s2["confidence_threshold"] == 0.60
    assert s2["inference_fps"] == 12
    assert s2["demonstration_mode"] is True

    # 3. Reset settings
    res_reset = client.post("/api/settings/reset")
    assert res_reset.status_code == 200
    res_after_reset = client.get("/api/settings")
    s3 = res_after_reset.get_json()["settings"]
    assert s3["confidence_threshold"] == 0.45
