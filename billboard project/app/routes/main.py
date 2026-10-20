from datetime import datetime, timezone
from flask import Blueprint, jsonify, render_template, redirect, url_for, current_app

main_bp = Blueprint("main", __name__)

@main_bp.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint for container / process monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "smart-billboard-ai",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200

@main_bp.route("/api/status", methods=["GET"])
def system_status():
    """Return status of core subsystems (camera, AI, database, billboard)."""
    return jsonify({
        "system_time": datetime.now(timezone.utc).isoformat(),
        "camera": {
            "status": "idle",
            "index": current_app.config.get("CAMERA_INDEX", 0)
        },
        "ai_engine": {
            "model": current_app.config.get("YOLO_MODEL", "yolov8n.pt"),
            "status": "ready"
        },
        "database": {
            "status": "connected"
        },
        "active_advertisement": None
    }), 200

@main_bp.route("/")
def index():
    return redirect(url_for("main.dashboard_view"))

@main_bp.route("/dashboard")
def dashboard_view():
    return render_template("dashboard.html")

@main_bp.route("/billboard")
def billboard_view():
    return render_template("billboard.html")

@main_bp.route("/advertisements")
def advertisements_view():
    return render_template("advertisements.html")

@main_bp.route("/monitoring")
def monitoring_view():
    return render_template("monitoring.html")

@main_bp.route("/analytics")
def analytics_view():
    return render_template("analytics.html")

@main_bp.route("/settings")
def settings_view():
    return render_template("settings.html")

@main_bp.route("/about")
def about_view():
    return render_template("about.html")
