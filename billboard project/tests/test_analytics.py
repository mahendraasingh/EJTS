import pytest
from datetime import datetime, timezone, timedelta
from app import create_app, db
from app.models import Advertisement, ViewerSession
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

def test_analytics_endpoints(client):
    """Test overview metrics, ad breakdown, timeseries, and CSV export with real DB records."""
    now = datetime.now(timezone.utc)
    ad1 = Advertisement(name="Car Brand", media_filename="car.jpg", media_type="image", is_active=True)
    ad2 = Advertisement(name="Shoe Brand", media_filename="shoe.jpg", media_type="image", is_active=True)
    db.session.add_all([ad1, ad2])
    db.session.commit()

    # Session 1: completed for ad1, duration 10.5s
    s1 = ViewerSession(
        tracking_id=1,
        advertisement_id=ad1.id,
        start_time=now - timedelta(hours=2),
        end_time=now - timedelta(hours=2) + timedelta(seconds=10.5),
        estimated_duration=10.5,
        status="completed"
    )
    # Session 2: completed for ad1, duration 5.5s
    s2 = ViewerSession(
        tracking_id=2,
        advertisement_id=ad1.id,
        start_time=now - timedelta(hours=1),
        end_time=now - timedelta(hours=1) + timedelta(seconds=5.5),
        estimated_duration=5.5,
        status="completed"
    )
    # Session 3: completed for ad2, duration 8.0s
    s3 = ViewerSession(
        tracking_id=3,
        advertisement_id=ad2.id,
        start_time=now - timedelta(minutes=30),
        end_time=now - timedelta(minutes=30) + timedelta(seconds=8.0),
        estimated_duration=8.0,
        status="completed"
    )
    db.session.add_all([s1, s2, s3])
    db.session.commit()

    # 1. Overview API
    res_overview = client.get("/api/analytics/overview?preset=today")
    assert res_overview.status_code == 200
    ov = res_overview.get_json()
    assert ov["total_sessions"] == 3
    assert ov["completed_sessions"] == 3
    assert ov["total_duration_seconds"] == 24.0  # 10.5 + 5.5 + 8.0
    assert ov["avg_duration_seconds"] == 8.0     # 24.0 / 3
    assert ov["max_duration_seconds"] == 10.5
    assert "live_telemetry" in ov

    # 2. Advertisement Breakdown API
    res_ads = client.get("/api/analytics/advertisements?preset=today")
    assert res_ads.status_code == 200
    campaigns = res_ads.get_json()["campaigns"]
    assert len(campaigns) >= 2
    car_camp = next(c for c in campaigns if c["name"] == "Car Brand")
    assert car_camp["total_sessions"] == 2
    assert car_camp["session_share_percent"] == 66.7
    assert car_camp["total_duration"] == 16.0

    # 3. Timeseries API
    res_ts = client.get("/api/analytics/timeseries?preset=today")
    assert res_ts.status_code == 200
    ts = res_ts.get_json()
    assert "labels" in ts
    assert "sessions" in ts

    # 4. Recent Sessions API
    res_sess = client.get("/api/analytics/sessions?limit=10")
    assert res_sess.status_code == 200
    assert res_sess.get_json()["total"] == 3

    # 5. CSV Export API
    res_csv = client.get("/api/analytics/export/csv?preset=today")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.content_type
    csv_text = res_csv.data.decode("utf-8")
    assert "session_uuid" in csv_text
    assert "Car Brand" in csv_text
    assert "10.5" in csv_text
