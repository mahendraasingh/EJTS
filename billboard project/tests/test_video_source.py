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

def test_cached_video_file_serving_and_replay(client):
    """Verify cached video serving and replay endpoints."""
    # 1. Upload video
    data = {
        "video": (io.BytesIO(b"test video binary content for streaming"), "crowd_sample.mp4")
    }
    res_upload = client.post("/api/monitoring/upload_video_source", data=data, content_type="multipart/form-data")
    assert res_upload.status_code == 200
    assert "cached_url" in res_upload.get_json()

    # 2. Fetch cached video file
    res_file = client.get("/api/monitoring/cached_video_file")
    assert res_file.status_code == 200
    assert res_file.data == b"test video binary content for streaming"

    # 3. Test replay endpoint
    res_replay = client.post("/api/monitoring/replay_video")
    # Will respond with 200 (if cap opened) or handle gracefully
    assert res_replay.status_code in [200, 400]

def test_dual_monitoring_template_rendering(client):
    """Verify dual studio monitoring interface renders with 1-time video player and live camera elements."""
    res = client.get("/monitoring")
    assert res.status_code == 200
    html = res.data.decode("utf-8")
    assert "uploadedVideoPlayer" in html
    assert "videoFinishedOverlay" in html
    assert "liveVideoFeed" in html
    assert "globalRewatchBtn" in html
    assert "hudZoneOcc" in html
    assert "hudFovDet" in html
    assert "Rewatch / Replay Video" in html
