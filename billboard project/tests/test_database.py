import pytest
from datetime import datetime, timezone, timedelta
from app import create_app, db
from app.models import Advertisement, ViewerSession, Setting, SystemEvent
from config import TestingConfig

@pytest.fixture
def app_ctx():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

def test_advertisement_lifecycle(app_ctx):
    """Test advertisement creation, campaign date validation, and archival."""
    now = datetime.now(timezone.utc)
    ad = Advertisement(
        name="Summer Sale 2026",
        description="50% off retail campaign",
        category="Retail",
        media_filename="summer_sale.jpg",
        media_type="image",
        duration=15,
        campaign_start=now - timedelta(days=1),
        campaign_end=now + timedelta(days=5),
        is_active=True
    )
    db.session.add(ad)
    db.session.commit()

    assert ad.id is not None
    assert ad.is_currently_valid() is True

    # Test future campaign start
    ad.campaign_start = now + timedelta(days=2)
    assert ad.is_currently_valid() is False

    # Restore and archive
    ad.campaign_start = now - timedelta(days=1)
    ad.is_archived = True
    assert ad.is_currently_valid() is False

    d = ad.to_dict()
    assert d["name"] == "Summer Sale 2026"
    assert d["media_type"] == "image"

def test_viewer_session_lifecycle(app_ctx):
    """Test viewer session duration calculations and ad attribution."""
    now = datetime.now(timezone.utc)
    ad = Advertisement(
        name="Tech Brand Ad",
        media_filename="tech.mp4",
        media_type="video",
        duration=20
    )
    db.session.add(ad)
    db.session.commit()

    # Create active session
    start_t = now - timedelta(seconds=12)
    session = ViewerSession(
        tracking_id=101,
        advertisement_id=ad.id,
        start_time=start_t
    )
    db.session.add(session)
    db.session.commit()

    assert session.status == "active"
    assert session.estimated_duration == 0.0

    # Finalize session
    end_t = now
    session.finalize(end_timestamp=end_t, reason="left_zone")
    db.session.commit()

    assert session.status == "completed"
    assert session.exit_reason == "left_zone"
    assert 11.5 <= session.estimated_duration <= 12.5

    data = session.to_dict()
    assert data["advertisement_name"] == "Tech Brand Ad"
    assert data["tracking_id"] == 101

def test_settings_persistence(app_ctx):
    """Test JSON and string serialization in settings."""
    Setting.set_val("confidence_threshold", 0.65, "Detection threshold")
    val = Setting.get_val("confidence_threshold")
    assert val == 0.65

    complex_val = {"x1": 0.1, "y1": 0.2, "x2": 0.9, "y2": 0.8}
    Setting.set_val("monitoring_zone", complex_val)
    loaded_zone = Setting.get_val("monitoring_zone")
    assert loaded_zone == complex_val
    assert loaded_zone["x1"] == 0.1

def test_system_event_logging(app_ctx):
    """Test system event logging and querying."""
    event = SystemEvent.log("camera", "Camera device 0 opened successfully", {"fps": 30})
    assert event.id is not None
    assert event.event_type == "camera"

    fetched = SystemEvent.query.filter_by(event_type="camera").first()
    assert fetched is not None
    assert "opened successfully" in fetched.message
    d = fetched.to_dict()
    assert d["details"]["fps"] == 30
