from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from app import db
from app.models import Advertisement, SystemEvent, Setting
from app.models.utils import utc_now

billboard_bp = Blueprint("billboard", __name__)

# Global active advertisement tracker in memory for ultra-fast session attribution
_current_active_ad = {
    "ad_id": None,
    "name": "Default Welcome Ad",
    "media_filename": "default_ad.jpg",
    "media_type": "image",
    "transition_time": utc_now().isoformat()
}

def get_current_active_ad():
    """Return the currently displaying billboard advertisement."""
    global _current_active_ad
    # If ad_id is not set, attempt to get first active ad from DB
    if not _current_active_ad["ad_id"]:
        first_ad = Advertisement.query.filter_by(is_active=True, is_archived=False)\
            .order_by(Advertisement.order_index.asc()).first()
        if first_ad:
            _current_active_ad["ad_id"] = first_ad.id
            _current_active_ad["name"] = first_ad.name
            _current_active_ad["media_filename"] = first_ad.media_filename
            _current_active_ad["media_type"] = first_ad.media_type
    return _current_active_ad

def set_current_active_ad(ad):
    """Set the currently displaying billboard advertisement."""
    global _current_active_ad
    if ad:
        _current_active_ad = {
            "ad_id": ad.id,
            "name": ad.name,
            "media_filename": ad.media_filename,
            "media_type": ad.media_type,
            "transition_time": utc_now().isoformat()
        }
        Setting.set_val("active_billboard_ad_id", ad.id)
    return _current_active_ad

@billboard_bp.route("/api/billboard/current", methods=["GET"])
def current_billboard_ad():
    """Get the currently displaying advertisement on the billboard."""
    ad_info = get_current_active_ad()
    return jsonify(ad_info), 200

@billboard_bp.route("/api/billboard/playlist", methods=["GET"])
def get_playlist():
    """Retrieve active and scheduled advertisements for billboard playback."""
    now = utc_now()
    ads = Advertisement.query.filter_by(is_active=True, is_archived=False)\
        .order_by(Advertisement.order_index.asc(), Advertisement.id.asc()).all()
    
    valid_playlist = [ad.to_dict() for ad in ads if ad.is_currently_valid(now)]
    
    # If no valid ads, supply the default fallback banner
    if not valid_playlist:
        valid_playlist = [{
            "id": None,
            "name": "Smart Billboard AI Welcome",
            "description": "Default billboard display screen",
            "category": "System",
            "media_filename": "default_ad.jpg",
            "media_type": "image",
            "duration": 10,
            "is_active": True,
            "is_valid": True
        }]

    return jsonify({
        "count": len(valid_playlist),
        "playlist": valid_playlist
    }), 200

@billboard_bp.route("/api/billboard/transition", methods=["POST"])
def record_transition():
    """Update active advertisement when billboard transitions."""
    data = request.get_json(silent=True) or {}
    ad_id = data.get("ad_id")

    if ad_id:
        ad = db.session.get(Advertisement, ad_id)
        if ad:
            set_current_active_ad(ad)
            SystemEvent.log("billboard", f"Billboard transitioned to '{ad.name}' (ID: {ad.id})")
            return jsonify({
                "message": "Billboard transition recorded.",
                "current_ad": ad.to_dict()
            }), 200
        else:
            return jsonify({"error": f"Advertisement ID {ad_id} not found."}), 404
    else:
        # Default placeholder transition
        global _current_active_ad
        _current_active_ad = {
            "ad_id": None,
            "name": "Default Welcome Screen",
            "media_filename": "default_ad.jpg",
            "media_type": "image",
            "transition_time": utc_now().isoformat()
        }
        return jsonify({"message": "Billboard reset to default ad."}), 200
