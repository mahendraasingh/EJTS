import io
import pytest
from app import create_app, db
from app.models import Advertisement
from config import TestingConfig

@pytest.fixture
def client(tmp_path):
    app = create_app(TestingConfig)
    app.config["UPLOAD_FOLDER"] = tmp_path / "media"
    app.config["UPLOAD_FOLDER"].mkdir(parents=True, exist_ok=True)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_advertisement_crud_json(client):
    """Test creating, fetching, updating, and archiving an ad via JSON."""
    # 1. Create Ad
    payload = {
        "name": "Spring Promo",
        "description": "Special Spring Offer",
        "category": "Seasonal",
        "media_filename": "spring.jpg",
        "media_type": "image",
        "duration": 12,
        "is_active": True
    }
    res = client.post("/api/advertisements", json=payload)
    assert res.status_code == 201
    created_id = res.get_json()["advertisement"]["id"]

    # 2. Get Ad
    res_get = client.get(f"/api/advertisements/{created_id}")
    assert res_get.status_code == 200
    assert res_get.get_json()["name"] == "Spring Promo"

    # 3. Update Ad
    res_put = client.put(f"/api/advertisements/{created_id}", json={"duration": 18, "category": "Promotions"})
    assert res_put.status_code == 200
    assert res_put.get_json()["advertisement"]["duration"] == 18

    # 4. Toggle Active
    res_toggle = client.post(f"/api/advertisements/{created_id}/activate")
    assert res_toggle.status_code == 200
    assert res_toggle.get_json()["advertisement"]["is_active"] is False

    # 5. Archive Ad
    res_del = client.delete(f"/api/advertisements/{created_id}")
    assert res_del.status_code == 200
    assert res_del.get_json()["id"] == created_id

    # Should not show in default list
    res_list = client.get("/api/advertisements")
    assert res_list.get_json()["count"] == 0

def test_advertisement_file_upload(client):
    """Test creating an ad using multipart form data with a real file buffer."""
    data = {
        "name": "Banner Upload Test",
        "description": "Uploaded via form",
        "category": "Display",
        "duration": "10",
        "file": (io.BytesIO(b"fake image data binary content"), "banner_test.png")
    }
    res = client.post("/api/advertisements", data=data, content_type="multipart/form-data")
    assert res.status_code == 201
    ad_data = res.get_json()["advertisement"]
    assert ad_data["name"] == "Banner Upload Test"
    assert ad_data["media_type"] == "image"
    assert "banner_test.png" in ad_data["media_filename"]

def test_invalid_upload_extension(client):
    """Verify unsupported extensions are rejected with 400."""
    data = {
        "name": "Invalid Script File",
        "file": (io.BytesIO(b"malicious content"), "hack.exe")
    }
    res = client.post("/api/advertisements", data=data, content_type="multipart/form-data")
    assert res.status_code == 400
    assert "Unsupported file format" in res.get_json()["error"]

def test_playlist_reordering(client):
    """Verify playlist ordering endpoint updates order_index."""
    ad1 = Advertisement(name="Ad 1", media_filename="1.jpg", media_type="image", order_index=1)
    ad2 = Advertisement(name="Ad 2", media_filename="2.jpg", media_type="image", order_index=2)
    db.session.add_all([ad1, ad2])
    db.session.commit()

    reorder_payload = {
        "order": [
            {"id": ad1.id, "order_index": 5},
            {"id": ad2.id, "order_index": 1}
        ]
    }
    res = client.post("/api/advertisements/reorder", json=reorder_payload)
    assert res.status_code == 200

    refreshed_ad1 = Advertisement.query.get(ad1.id)
    refreshed_ad2 = Advertisement.query.get(ad2.id)
    assert refreshed_ad1.order_index == 5
    assert refreshed_ad2.order_index == 1
