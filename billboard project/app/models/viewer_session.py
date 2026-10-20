import uuid
from app import db
from app.models.utils import utc_now, normalize_utc

class ViewerSession(db.Model):
    """Tracks a detected audience member presence episode in the monitoring zone."""
    __tablename__ = "viewer_sessions"

    id = db.Column(db.Integer, primary_key=True)
    tracking_id = db.Column(db.Integer, nullable=False, index=True)
    session_uuid = db.Column(db.String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4()), index=True)
    
    advertisement_id = db.Column(
        db.Integer,
        db.ForeignKey("advertisements.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    start_time = db.Column(db.DateTime, nullable=False, default=utc_now, index=True)
    end_time = db.Column(db.DateTime, nullable=True, index=True)
    estimated_duration = db.Column(db.Float, default=0.0)  # Total seconds
    
    status = db.Column(db.String(20), default="active", index=True)  # 'active', 'completed', 'interrupted'
    exit_reason = db.Column(db.String(50), nullable=True)  # 'left_zone', 'timeout', 'app_shutdown'
    is_simulated = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now)

    # Relationships
    advertisement = db.relationship("Advertisement", back_populates="sessions")

    def finalize(self, end_timestamp=None, reason="left_zone"):
        """Finalize the session, calculate duration, and set status."""
        end_dt = normalize_utc(end_timestamp) or utc_now()
        start_dt = normalize_utc(self.start_time)
        self.end_time = end_dt
        
        # Calculate duration in seconds
        delta = (end_dt - start_dt).total_seconds()
        self.estimated_duration = max(0.0, round(delta, 2))
        self.status = "completed" if reason != "app_shutdown" else "interrupted"
        self.exit_reason = reason

    def to_dict(self):
        return {
            "id": self.id,
            "session_uuid": self.session_uuid,
            "tracking_id": self.tracking_id,
            "advertisement_id": self.advertisement_id,
            "advertisement_name": self.advertisement.name if self.advertisement else "Unknown/None",
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "estimated_duration": self.estimated_duration,
            "status": self.status,
            "exit_reason": self.exit_reason,
            "is_simulated": self.is_simulated,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
