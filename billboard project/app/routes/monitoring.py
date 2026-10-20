import os
import cv2
import time
from pathlib import Path
from flask import Blueprint, Response, jsonify, request, current_app
from werkzeug.utils import secure_filename
from app.services.pipeline import pipeline_engine
from app.models.setting import Setting
from app.models.system_event import SystemEvent

monitoring_bp = Blueprint("monitoring", __name__)

ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "avi", "mov", "mkv"}

def generate_frames():
    """Generator for MJPEG multipart video streaming."""
    while True:
        frame = pipeline_engine.get_annotated_frame()
        if frame is not None:
            ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b"--frame\r\n"
                       b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        time.sleep(0.06)  # ~16 FPS streaming rate

@monitoring_bp.route("/video_feed")
def video_feed():
    """Live MJPEG video feed with YOLO person overlays and monitoring zone."""
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@monitoring_bp.route("/api/monitoring/status", methods=["GET"])
def monitoring_status():
    """Return status and telemetry of computer vision pipeline."""
    status = pipeline_engine.get_status()
    return jsonify(status), 200

@monitoring_bp.route("/api/monitoring/source", methods=["GET"])
def get_source():
    """Return current video feed source info."""
    return jsonify(pipeline_engine.camera_service.get_source_info()), 200

@monitoring_bp.route("/api/monitoring/source", methods=["POST"])
def set_source():
    """Switch video input between physical webcam and cached video file."""
    data = request.get_json(silent=True) or {}
    mode = data.get("source_mode", "webcam")
    video_path = data.get("video_path")

    if mode not in ["webcam", "video_file"]:
        return jsonify({"error": "source_mode must be 'webcam' or 'video_file'."}), 400

    pipeline_engine.camera_service.set_source(mode, video_path=video_path)
    SystemEvent.log("camera", f"Switched video feed source mode to '{mode}'.")
    return jsonify({
        "message": f"Source mode switched to {mode}.",
        "source": pipeline_engine.camera_service.get_source_info()
    }), 200

@monitoring_bp.route("/api/monitoring/upload_video_source", methods=["POST"])
def upload_video_source():
    """Upload a test video into instance/video_cache and immediately activate as live vision feed."""
    if "video" not in request.files:
        return jsonify({"error": "No video file provided."}), 400

    file = request.files["video"]
    if not file or file.filename == "":
        return jsonify({"error": "Selected video file is empty."}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return jsonify({"error": f"Invalid format '.{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_VIDEO_EXTENSIONS))}"}), 400

    safe_name = secure_filename(file.filename)
    cache_dir = Path(current_app.config.get("INSTANCE_PATH", "instance")) / "video_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    target_path = cache_dir / f"cached_input_{safe_name}"
    file.save(str(target_path))

    # Switch camera service to this cached video
    pipeline_engine.camera_service.set_source("video_file", video_path=str(target_path), filename=safe_name)
    
    # Ensure pipeline is running
    if not pipeline_engine.is_active:
        pipeline_engine.init_app(current_app._get_current_object())
        pipeline_engine.start()

    SystemEvent.log("camera", f"Cached custom input video '{safe_name}' and activated vision pipeline.")
    return jsonify({
        "message": f"Video '{safe_name}' cached and activated as live input stream.",
        "filename": safe_name,
        "source": pipeline_engine.camera_service.get_source_info()
    }), 200

@monitoring_bp.route("/api/monitoring/start", methods=["POST"])
def start_monitoring():
    """Start video acquisition and AI inference."""
    pipeline_engine.init_app(current_app._get_current_object())
    pipeline_engine.start()
    SystemEvent.log("camera", "Vision monitoring pipeline started.")
    return jsonify({
        "message": "Vision monitoring pipeline started.",
        "status": pipeline_engine.get_status()
    }), 200

@monitoring_bp.route("/api/monitoring/stop", methods=["POST"])
def stop_monitoring():
    """Stop video acquisition and AI inference."""
    pipeline_engine.stop()
    SystemEvent.log("camera", "Vision monitoring pipeline stopped.")
    return jsonify({
        "message": "Vision monitoring pipeline stopped.",
        "status": pipeline_engine.get_status()
    }), 200

@monitoring_bp.route("/api/monitoring/zone", methods=["PUT"])
def update_monitoring_zone():
    """Update coordinates of the central audience monitoring zone (ROI)."""
    data = request.get_json(silent=True) or {}
    zone = data.get("zone")
    if not zone or not all(k in zone for k in ["x1", "y1", "x2", "y2"]):
        return jsonify({"error": "Invalid zone format. Must contain x1, y1, x2, y2 between 0.0 and 1.0."}), 400

    x1, y1, x2, y2 = float(zone["x1"]), float(zone["y1"]), float(zone["x2"]), float(zone["y2"])
    if not (0.0 <= x1 < x2 <= 1.0 and 0.0 <= y1 < y2 <= 1.0):
        return jsonify({"error": "Coordinates must satisfy 0.0 <= x1 < x2 <= 1.0 and 0.0 <= y1 < y2 <= 1.0."}), 400

    new_zone = {"x1": round(x1, 2), "y1": round(y1, 2), "x2": round(x2, 2), "y2": round(y2, 2)}
    pipeline_engine.monitoring_zone = new_zone
    Setting.set_val("monitoring_zone", new_zone, "Region of interest coordinates")
    SystemEvent.log("ai", "Monitoring zone ROI updated.", new_zone)

    return jsonify({
        "message": "Monitoring zone updated successfully.",
        "zone": new_zone
    }), 200
