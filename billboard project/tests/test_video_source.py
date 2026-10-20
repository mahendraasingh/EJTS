import io
import pytest
from app import create_app, db
from config import TestingConfig

@pytest.fixture
def client(tmp_path):
    app = create_app(TestingConfig)
    app.config["INSTANCE_PATH"] = tmp_path / "instance"
    app.config["INSTANCE_PATH"].mkdir(parents=True, exist_ok=True)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_video_source_endpoints(client):
    """Test switching between physical webcam and cached video file source."""
    # 1. Get initial source (default webcam)
    res = client.get("/api/monitoring/source")
    assert res.status_code == 200
    assert res.get_json()["source_mode"] == "webcam"

    # 2. Switch source
    res_switch = client.post("/api/monitoring/source", json={"source_mode": "video_file"})
    assert res_switch.status_code == 200
    assert res_switch.get_json()["source"]["source_mode"] == "video_file"

    # 3. Switch back to webcam
    res_cam = client.post("/api/monitoring/source", json={"source_mode": "webcam"})
    assert res_cam.status_code == 200
    assert res_cam.get_json()["source"]["source_mode"] == "webcam"

def test_upload_video_source(client):
    """Test uploading a video file into cache and activating it as input stream."""
    data = {
        "video": (io.BytesIO(b"fake mp4 video binary bytes"), "crowd_test.mp4")
    }
    res = client.post("/api/monitoring/upload_video_source", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    result = res.get_json()
    assert "crowd_test.mp4" in result["filename"]
    assert result["source"]["source_mode"] == "video_file"

def test_invalid_video_upload(client):
    """Verify non-video extension is rejected."""
    data = {
        "video": (io.BytesIO(b"text file content"), "script.py")
    }
    res = client.post("/api/monitoring/upload_video_source", data=data, content_type="multipart/form-data")
    assert res.status_code == 400
    assert "Invalid format" in res.get_json()["error"]
