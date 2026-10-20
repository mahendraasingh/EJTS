from app import db
from app.models.utils import utc_now, normalize_utc

class Advertisement(db.Model):
    """Advertisement campaign model for digital billboard playback."""
    __tablename__ = "advertisements"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default="General", index=True)
    media_filename = db.Column(db.String(255), nullable=False)
    media_type = db.Column(db.String(20), nullable=False)  # 'image' or 'video'
    duration = db.Column(db.Integer, default=10)  # Playback duration in seconds (for images)
    is_active = db.Column(db.Boolean, default=True, index=True)
    order_index = db.Column(db.Integer, default=0, index=True)
    
    # Campaign scheduling
    campaign_start = db.Column(db.DateTime, nullable=True)
    campaign_end = db.Column(db.DateTime, nullable=True)
    
    # Archival and timestamps
    is_archived = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    sessions = db.relationship("ViewerSession", back_populates="advertisement", lazy="dynamic")

    def is_currently_valid(self, at_time=None):
        """Check if ad is active, unarchived, and within scheduled campaign dates."""
        if not self.is_active or self.is_archived:
            return False
        
        current = normalize_utc(at_time) or utc_now()
        start = normalize_utc(self.campaign_start)
        end = normalize_utc(self.campaign_end)

        if start and current < start:
            return False
        if end and current > end:
            return False
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "media_filename": self.media_filename,
            "media_type": self.media_type,
            "duration": self.duration,
            "is_active": self.is_active,
            "order_index": self.order_index,
            "campaign_start": self.campaign_start.isoformat() if self.campaign_start else None,
            "campaign_end": self.campaign_end.isoformat() if self.campaign_end else None,
            "is_archived": self.is_archived,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_valid": self.is_currently_valid()
        }
