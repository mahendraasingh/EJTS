from flask import Blueprint, jsonify, request, Response
from app.services.analytics_service import (
    get_date_range,
    calculate_overview_metrics,
    calculate_advertisement_breakdown,
    calculate_timeseries,
    generate_sessions_csv
)
from app.models import ViewerSession
from app.services.pipeline import pipeline_engine

analytics_bp = Blueprint("analytics", __name__)

@analytics_bp.route("/api/analytics/overview", methods=["GET"])
def get_overview():
    """Return aggregated audience metrics and real-time vision telemetry."""
    preset = request.args.get("preset", "7d")
    start = request.args.get("start")
    end = request.args.get("end")

    start_dt, end_dt = get_date_range(preset=preset, start_str=start, end_str=end)
    metrics = calculate_overview_metrics(start_dt, end_dt)

    # Attach live status
    vision_status = pipeline_engine.get_status()
    metrics["live_telemetry"] = {
        "current_detected_people": vision_status["detected_count"],
        "current_zone_occupancy": vision_status["zone_occupancy"],
        "camera_available": vision_status["camera"]["camera_available"],
        "pipeline_active": vision_status["pipeline_active"]
    }
    return jsonify(metrics), 200

@analytics_bp.route("/api/analytics/advertisements", methods=["GET"])
def get_advertisement_metrics():
    """Return campaign-level metrics and session share percentages."""
    preset = request.args.get("preset", "7d")
    start = request.args.get("start")
    end = request.args.get("end")

    start_dt, end_dt = get_date_range(preset=preset, start_str=start, end_str=end)
    breakdown = calculate_advertisement_breakdown(start_dt, end_dt)
    return jsonify({
        "timeframe": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
        "campaigns": breakdown
    }), 200

@analytics_bp.route("/api/analytics/timeseries", methods=["GET"])
def get_timeseries_metrics():
    """Return daily session volumes and average durations for Chart.js."""
    preset = request.args.get("preset", "7d")
    start = request.args.get("start")
    end = request.args.get("end")

    start_dt, end_dt = get_date_range(preset=preset, start_str=start, end_str=end)
    timeseries = calculate_timeseries(start_dt, end_dt)
    return jsonify(timeseries), 200

@analytics_bp.route("/api/analytics/sessions", methods=["GET"])
def get_recent_sessions():
    """Return paginated list of recent audience presence sessions."""
    limit = min(100, int(request.args.get("limit", 20)))
    offset = max(0, int(request.args.get("offset", 0)))
    ad_id = request.args.get("advertisement_id")

    query = ViewerSession.query
    if ad_id:
        query = query.filter_by(advertisement_id=int(ad_id))

    total = query.count()
    sessions = query.order_by(ViewerSession.start_time.desc()).offset(offset).limit(limit).all()

    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "sessions": [s.to_dict() for s in sessions]
    }), 200

@analytics_bp.route("/api/analytics/export/csv", methods=["GET"])
def export_csv():
    """Download historical session attribution data as a CSV spreadsheet."""
    preset = request.args.get("preset", "all")
    start = request.args.get("start")
    end = request.args.get("end")

    start_dt, end_dt = get_date_range(preset=preset, start_str=start, end_str=end)
    csv_data = generate_sessions_csv(start_dt, end_dt)

    filename = f"billboard_analytics_{preset}_{start_dt.strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
