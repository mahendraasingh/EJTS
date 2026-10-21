import time
from datetime import datetime, timezone
from app import db
from app.models import ViewerSession, Advertisement, SystemEvent, Setting
from app.models.utils import utc_now, normalize_utc

class SessionManager:
    """Manages audience presence episodes, grace periods, and advertisement attribution."""

    def __init__(self, min_session_duration=1.0, grace_period=2.0):
        self.min_session_duration = min_session_duration
        self.grace_period = grace_period
        # In-memory tracking state:
        # {tracking_id: {"session_id": int, "ad_id": int, "start_time": datetime, "last_seen_in_zone": float}}
        self.active_sessions = {}

    def process_tracks(self, active_tracks, current_ad_id=None, app_context=None):
        """Evaluate tracking IDs in current frame and update audience session lifecycle."""
        now_time = time.time()
        now_dt = utc_now()
        currently_in_zone_ids = set()

        for track in active_tracks:
            tid = track["tracking_id"]
            if track.get("in_zone", False):
                currently_in_zone_ids.add(tid)
                if tid not in self.active_sessions:
                    # New audience member entered monitoring zone
                    self._start_session(tid, current_ad_id, now_dt, now_time)
                else:
                    # Check if active advertisement changed while viewer was watching
                    sess = self.active_sessions[tid]
                    if sess.get("ad_id") != current_ad_id:
                        # Ad transitioned/completed: finalize session for previous ad
                        self._end_session(tid, now_dt, reason="ad_transition")
                        # Start new session attributed to the newly active ad
                        self._start_session(tid, current_ad_id, now_dt, now_time)
                    else:
                        # Update heartbeat for member currently in zone
                        sess["last_seen_in_zone"] = now_time

        # Check for sessions whose tracks have left the zone or expired
        terminated_ids = []
        for tid, sess in self.active_sessions.items():
            if tid not in currently_in_zone_ids:
                # Check if grace period has elapsed
                if now_time - sess["last_seen_in_zone"] > self.grace_period:
                    terminated_ids.append(tid)

        for tid in terminated_ids:
            self._end_session(tid, now_dt, reason="left_zone")

    def _start_session(self, tracking_id, current_ad_id, start_dt, now_time):
        """Create and persist a new viewer session associated with active ad."""
        try:
            # Check if ad_id is valid
            ad = None
            if current_ad_id:
                ad = db.session.get(Advertisement, current_ad_id)

            session_record = ViewerSession(
                tracking_id=tracking_id,
                advertisement_id=ad.id if ad else None,
                start_time=start_dt,
                status="active"
            )
            db.session.add(session_record)
            db.session.commit()

            self.active_sessions[tracking_id] = {
                "db_id": session_record.id,
                "ad_id": ad.id if ad else None,
                "start_time": start_dt,
                "last_seen_in_zone": now_time
            }
        except Exception as e:
            db.session.rollback()
            SystemEvent.log("session", f"Failed to start viewer session: {str(e)}")

    def _end_session(self, tracking_id, end_dt, reason="left_zone"):
        """Finalize viewer session, calculate duration, and persist to database."""
        sess_data = self.active_sessions.pop(tracking_id, None)
        if not sess_data:
            return

        db_id = sess_data["db_id"]
        try:
            session_record = db.session.get(ViewerSession, db_id)
            if session_record:
                # Calculate duration
                delta = (end_dt - session_record.start_time).total_seconds()
                duration = max(0.0, round(delta, 2))

                if duration >= self.min_session_duration:
                    session_record.finalize(end_timestamp=end_dt, reason=reason)
                    db.session.commit()
                else:
                    # Transient glance below threshold: delete to prevent noise
                    db.session.delete(session_record)
                    db.session.commit()
        except Exception as e:
            db.session.rollback()
            SystemEvent.log("session", f"Failed to finalize viewer session {db_id}: {str(e)}")

    def finalize_all(self, reason="app_shutdown"):
        """Gracefully finalize all open sessions on application shutdown."""
        now_dt = utc_now()
        for tid in list(self.active_sessions.keys()):
            self._end_session(tid, now_dt, reason=reason)

    def get_current_occupancy(self):
        """Return number of audience members currently active in the monitoring zone."""
        return len(self.active_sessions)
