import json
from app import db
from app.models.utils import utc_now

class Setting(db.Model):
    """Dynamic system configuration and threshold storage."""
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)  # JSON or primitive encoded as string
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    @classmethod
    def get_val(cls, key, default=None):
        """Fetch setting value parsed as JSON if applicable, or as raw string."""
        record = cls.query.filter_by(key=key).first()
        if not record:
            return default
        try:
            return json.loads(record.value)
        except (ValueError, TypeError):
            return record.value

    @classmethod
    def set_val(cls, key, value, description=None):
        """Set or create setting with string/JSON serialization."""
        serialized = json.dumps(value) if not isinstance(value, str) else value
        record = cls.query.filter_by(key=key).first()
        if record:
            record.value = serialized
            if description:
                record.description = description
            record.updated_at = utc_now()
        else:
            record = cls(key=key, value=serialized, description=description)
            db.session.add(record)
        db.session.commit()
        return record

    def to_dict(self):
        val = self.value
        try:
            val = json.loads(self.value)
        except Exception:
            pass
        return {
            "key": self.key,
            "value": val,
            "description": self.description,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
