from flask import Blueprint, jsonify, request
from app import db
from app.models.setting import Setting
from app.models.system_event import SystemEvent
from app.services.pipeline import pipeline_engine

settings_bp = Blueprint("settings", __name__)

DEFAULT_SETTINGS = {
    "camera_index": 0,
    "frame_width": 640,
    "frame_height": 480,
    "confidence_threshold": 0.45,
    "inference_fps": 10,
    "lost_track_timeout": 2.5,
    "min_session_duration": 1.0,
    "default_ad_duration": 10,
    "dashboard_refresh_interval": 3000,
    "demonstration_mode": False
}

@settings_bp.route("/api/settings", methods=["GET"])
def get_settings():
    """Retrieve all current system settings."""
    records = Setting.query.all()
    settings_dict = {}
    for r in records:
        settings_dict[r.key] = Setting.get_val(r.key)

    # Fill in defaults if any setting is missing
    for k, v in DEFAULT_SETTINGS.items():
        if k not in settings_dict:
            settings_dict[k] = v

    return jsonify({"settings": settings_dict}), 200

@settings_bp.route("/api/settings", methods=["PUT"])
def update_settings():
    """Update system settings and apply live reconfigurations."""
    data = request.get_json(silent=True) or {}
    updated = {}

    for key, val in data.items():
        if key in DEFAULT_SETTINGS or key in ["monitoring_zone"]:
            Setting.set_val(key, val)
            updated[key] = val

            # Apply live reconfiguration to running pipeline if active
            if key == "confidence_threshold":
                pipeline_engine.detector.confidence_threshold = float(val)
            elif key == "inference_fps":
                pipeline_engine.inference_fps = max(1, int(val))
            elif key == "lost_track_timeout":
                pipeline_engine.tracker.lost_track_timeout = float(val)
            elif key == "min_session_duration":
                pipeline_engine.session_manager.min_session_duration = float(val)

    SystemEvent.log("system", "System settings updated.", updated)
    return jsonify({
        "message": "Settings updated successfully.",
        "updated": updated
    }), 200

@settings_bp.route("/api/settings/reset", methods=["POST"])
def reset_settings():
    """Reset configuration to factory defaults."""
    for k, v in DEFAULT_SETTINGS.items():
        Setting.set_val(k, v)
    SystemEvent.log("system", "Settings reset to default values.")
    return jsonify({"message": "Settings reset to defaults successfully."}), 200
