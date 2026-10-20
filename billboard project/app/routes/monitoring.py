import cv2
import time
from flask import Blueprint, Response, jsonify, request, current_app
from app.services.pipeline import pipeline_engine
from app.models.setting import Setting
from app.models.system_event import SystemEvent

monitoring_bp = Blueprint("monitoring", __name__)

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

    # Validate ranges
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
