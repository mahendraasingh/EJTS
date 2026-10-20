import pytest
import time
from datetime import datetime, timezone, timedelta
from app import create_app, db
from app.models import Advertisement, ViewerSession
from app.services.tracker_service import CentroidTracker
from app.services.session_service import SessionManager
from config import TestingConfig

@pytest.fixture
def app_ctx():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

def test_centroid_tracker_lifecycle():
    """Verify centroid tracker maintains tracking ID across frames and detects zone presence."""
    tracker = CentroidTracker(lost_track_timeout=1.0, max_distance=100)
    zone = {"x1": 0.2, "y1": 0.2, "x2": 0.8, "y2": 0.8}

    # Frame 1: Person at (320, 240) in 640x480 frame -> Inside zone
    dets_frame1 = [{"box": [300, 200, 340, 280], "centroid": (320, 240), "confidence": 0.9}]
    tracks1 = tracker.update(dets_frame1, monitoring_zone=zone, frame_width=640, frame_height=480)
    assert len(tracks1) == 1
    t1 = tracks1[0]
    assert t1["tracking_id"] == 1
    assert t1["in_zone"] is True

    # Frame 2: Person moves slightly to (330, 245) -> Same tracking ID
    dets_frame2 = [{"box": [310, 205, 350, 285], "centroid": (330, 245), "confidence": 0.88}]
    tracks2 = tracker.update(dets_frame2, monitoring_zone=zone, frame_width=640, frame_height=480)
    assert len(tracks2) == 1
    assert tracks2[0]["tracking_id"] == 1
    assert tracks2[0]["centroid"] == (330, 245)

    # Frame 3: Person moves outside zone to (50, 50)
    dets_frame3 = [{"box": [30, 30, 70, 70], "centroid": (50, 50), "confidence": 0.85}]
    # Force associate by giving close distance or separate
    tracks3 = tracker.update(dets_frame3, monitoring_zone=zone, frame_width=640, frame_height=480)
    # Centroid (50, 50) is outside zone
    outside_tracks = [t for t in tracks3 if not t["in_zone"]]
    assert len(outside_tracks) >= 1

def test_session_manager_attribution_and_duration(app_ctx):
    """Verify session manager creates session, attributes active ad, and calculates duration."""
    ad = Advertisement(name="Coffee Promo", media_filename="coffee.jpg", media_type="image")
    db.session.add(ad)
    db.session.commit()

    manager = SessionManager(min_session_duration=0.5, grace_period=0.2)

    # Track enters zone
    mock_tracks = [{
        "tracking_id": 42,
        "centroid": (320, 240),
        "in_zone": True
    }]
    manager.process_tracks(mock_tracks, current_ad_id=ad.id)
    assert 42 in manager.active_sessions
    assert manager.get_current_occupancy() == 1

    # Simulate presence time
    time.sleep(0.6)

    # Track leaves zone
    manager.process_tracks([], current_ad_id=ad.id)
    # Grace period
    time.sleep(0.3)
    manager.process_tracks([], current_ad_id=ad.id)

    assert 42 not in manager.active_sessions
    assert manager.get_current_occupancy() == 0

    # Verify session persisted in DB
    session = ViewerSession.query.filter_by(tracking_id=42).first()
    assert session is not None
    assert session.advertisement_id == ad.id
    assert session.status == "completed"
    assert session.estimated_duration >= 0.5
