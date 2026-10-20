import json
from app import db
from app.models.utils import utc_now

class SystemEvent(db.Model):
    """System event logging for camera, AI inference, and billboard state changes."""
    __tablename__ = "system_events"

    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False, index=True)  # 'camera', 'ai', 'billboard', 'session', 'system'
    message = db.Column(db.Text, nullable=False)
    details = db.Column(db.Text, nullable=True)  # JSON-encoded extra details
    timestamp = db.Column(db.DateTime, default=utc_now, index=True)

    @classmethod
    def log(cls, event_type, message, details=None):
        """Helper to create and persist a log event."""
        encoded = json.dumps(details) if details and not isinstance(details, str) else details
        event = cls(event_type=event_type, message=message, details=encoded)
        db.session.add(event)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
        return event

    def to_dict(self):
        parsed_details = self.details
        if self.details:
            try:
                parsed_details = json.loads(self.details)
            except Exception:
                pass
        return {
            "id": self.id,
            "event_type": self.event_type,
            "message": self.message,
            "details": parsed_details,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
