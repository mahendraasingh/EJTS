import pytest
from app import create_app, db
from app.models import Advertisement
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

def test_empty_playlist_fallback(client):
    """When no active advertisements exist, verify fallback default ad is returned."""
    response = client.get("/api/billboard/playlist")
    assert response.status_code == 200
    data = response.get_json()
    assert data["count"] >= 1
    assert data["playlist"][0]["media_filename"] == "default_ad.jpg"

def test_billboard_playlist_and_transitions(client):
    """Verify playlist ordering and ad transition synchronization."""
    ad1 = Advertisement(name="Alpha Campaign", media_filename="alpha.jpg", media_type="image", order_index=1, is_active=True)
    ad2 = Advertisement(name="Beta Video", media_filename="beta.mp4", media_type="video", order_index=2, is_active=True)
    db.session.add_all([ad1, ad2])
    db.session.commit()

    # 1. Fetch Playlist
    res_playlist = client.get("/api/billboard/playlist")
    assert res_playlist.status_code == 200
    playlist = res_playlist.get_json()["playlist"]
    assert len(playlist) == 2
    assert playlist[0]["name"] == "Alpha Campaign"
    assert playlist[1]["name"] == "Beta Video"

    # 2. Transition to Ad 1
    res_trans1 = client.post("/api/billboard/transition", json={"ad_id": ad1.id})
    assert res_trans1.status_code == 200
    assert res_trans1.get_json()["current_ad"]["id"] == ad1.id

    # Verify Current Ad
    res_curr = client.get("/api/billboard/current")
    assert res_curr.status_code == 200
    assert res_curr.get_json()["ad_id"] == ad1.id

    # 3. Transition to Ad 2
    res_trans2 = client.post("/api/billboard/transition", json={"ad_id": ad2.id})
    assert res_trans2.status_code == 200
    assert res_trans2.get_json()["current_ad"]["id"] == ad2.id

    res_curr2 = client.get("/api/billboard/current")
    assert res_curr2.get_json()["ad_id"] == ad2.id

def test_transition_invalid_ad(client):
    """Verify transition with non-existent ad returns 404."""
    response = client.post("/api/billboard/transition", json={"ad_id": 99999})
    assert response.status_code == 404
