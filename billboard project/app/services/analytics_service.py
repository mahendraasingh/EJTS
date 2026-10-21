import csv
import io
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from app import db
from app.models import ViewerSession, Advertisement
from app.models.utils import utc_now, normalize_utc

def get_date_range(preset="7d", start_str=None, end_str=None):
    """Resolve start and end UTC datetime bounds based on preset or custom strings."""
    now = utc_now()
    if start_str and end_str:
        try:
            start_dt = normalize_utc(datetime.fromisoformat(start_str.replace("Z", "+00:00")))
            end_dt = normalize_utc(datetime.fromisoformat(end_str.replace("Z", "+00:00")))
            return start_dt, end_dt
        except Exception:
            pass

    if preset == "today":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start_dt, now
    elif preset == "30d":
        return now - timedelta(days=30), now
    elif preset == "all":
        return datetime(2020, 1, 1), now
    else:  # Default 7d
        return now - timedelta(days=7), now

def calculate_overview_metrics(start_dt, end_dt):
    """Aggregate high-level audience metrics across the specified time window.
    Strictly filters for verified, authentic computer vision detections."""
    query = ViewerSession.query.filter(
        ViewerSession.start_time >= start_dt,
        ViewerSession.start_time <= end_dt,
        ViewerSession.is_simulated == False
    )

    total_sessions = query.count()
    completed_query = query.filter_by(status="completed")
    completed_sessions = completed_query.count()

    # Sum and max duration
    duration_stats = db.session.query(
        func.sum(ViewerSession.estimated_duration),
        func.avg(ViewerSession.estimated_duration),
        func.max(ViewerSession.estimated_duration)
    ).filter(
        ViewerSession.start_time >= start_dt,
        ViewerSession.start_time <= end_dt,
        ViewerSession.status == "completed",
        ViewerSession.is_simulated == False
    ).first()

    total_duration = round(float(duration_stats[0] or 0.0), 1)
    avg_duration = round(float(duration_stats[1] or 0.0), 1)
    max_duration = round(float(duration_stats[2] or 0.0), 1)

    active_ads_count = Advertisement.query.filter_by(is_active=True, is_archived=False).count()

    return {
        "timeframe": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat()
        },
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_duration_seconds": total_duration,
        "avg_duration_seconds": avg_duration,
        "max_duration_seconds": max_duration,
        "active_advertisements": active_ads_count
    }

def calculate_advertisement_breakdown(start_dt, end_dt):
    """Calculate performance, share, and duration metrics grouped by advertisement.
    Strict Rule: Only generates deep analysis reports for advertisements where audience members
    were actually verified and detected seeing the ad by the backend vision logic."""
    total_period_sessions = ViewerSession.query.filter(
        ViewerSession.start_time >= start_dt,
        ViewerSession.start_time <= end_dt,
        ViewerSession.is_simulated == False,
        ViewerSession.status == "completed"
    ).count()

    # Query all unarchived advertisements
    ads = Advertisement.query.filter_by(is_archived=False).all()
    results = []

    for ad in ads:
        ad_sessions = ViewerSession.query.filter(
            ViewerSession.advertisement_id == ad.id,
            ViewerSession.start_time >= start_dt,
            ViewerSession.start_time <= end_dt,
            ViewerSession.is_simulated == False
        )
        count = ad_sessions.count()
        completed = ad_sessions.filter_by(status="completed").count()

        # Conditionally create the deep analysis report ONLY if people actually saw the ad
        if count == 0 and completed == 0:
            continue

        dur_stats = db.session.query(
            func.sum(ViewerSession.estimated_duration),
            func.avg(ViewerSession.estimated_duration),
            func.max(ViewerSession.estimated_duration)
        ).filter(
            ViewerSession.advertisement_id == ad.id,
            ViewerSession.start_time >= start_dt,
            ViewerSession.start_time <= end_dt,
            ViewerSession.status == "completed",
            ViewerSession.is_simulated == False
        ).first()

        tot_dur = round(float(dur_stats[0] or 0.0), 1)
        avg_dur = round(float(dur_stats[1] or 0.0), 1)
        max_dur = round(float(dur_stats[2] or 0.0), 1)
        share = round((completed / total_period_sessions * 100), 1) if total_period_sessions > 0 else 0.0

        results.append({
            "ad_id": ad.id,
            "name": ad.name,
            "category": ad.category,
            "media_type": ad.media_type,
            "total_sessions": count,
            "completed_sessions": completed,
            "total_duration": tot_dur,
            "avg_duration": avg_dur,
            "max_duration": max_dur,
            "session_share_percent": share,
            "is_active": ad.is_active,
            "verified_detection": True
        })

    # Sort by total sessions descending
    results.sort(key=lambda x: x["total_sessions"], reverse=True)
    return results

def calculate_timeseries(start_dt, end_dt):
    """Aggregate authentic session counts by day for Chart.js rendering."""
    sessions = ViewerSession.query.filter(
        ViewerSession.start_time >= start_dt,
        ViewerSession.start_time <= end_dt,
        ViewerSession.is_simulated == False
    ).order_by(ViewerSession.start_time.asc()).all()

    buckets = {}
    # Initialize daily buckets
    curr = start_dt.date()
    end_date = end_dt.date()
    while curr <= end_date:
        key = curr.strftime("%Y-%m-%d")
        buckets[key] = {"date": key, "sessions": 0, "total_duration": 0.0}
        curr += timedelta(days=1)

    for s in sessions:
        key = s.start_time.date().strftime("%Y-%m-%d")
        if key in buckets:
            buckets[key]["sessions"] += 1
            if s.status == "completed":
                buckets[key]["total_duration"] += s.estimated_duration

    chart_data = {
        "labels": list(buckets.keys()),
        "sessions": [b["sessions"] for b in buckets.values()],
        "avg_duration": [
            round(b["total_duration"] / b["sessions"], 1) if b["sessions"] > 0 else 0.0
            for b in buckets.values()
        ]
    }
    return chart_data

def generate_sessions_csv(start_dt, end_dt):
    """Export verified audience presence sessions to CSV string."""
    sessions = ViewerSession.query.filter(
        ViewerSession.start_time >= start_dt,
        ViewerSession.start_time <= end_dt,
        ViewerSession.is_simulated == False
    ).order_by(ViewerSession.start_time.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "session_id", "session_uuid", "tracking_id", "advertisement_id",
        "advertisement_name", "start_time", "end_time",
        "estimated_duration_seconds", "status", "exit_reason", "verified_ai_detection"
    ])

    for s in sessions:
        writer.writerow([
            s.id,
            s.session_uuid,
            s.tracking_id,
            s.advertisement_id or "",
            s.advertisement.name if s.advertisement else "Unknown/None",
            s.start_time.isoformat() if s.start_time else "",
            s.end_time.isoformat() if s.end_time else "",
            s.estimated_duration,
            s.status,
            s.exit_reason or "",
            "verified"
        ])

    return output.getvalue()

