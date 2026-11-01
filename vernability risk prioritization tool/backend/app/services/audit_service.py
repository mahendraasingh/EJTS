import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user: Optional[User] = None,
        metadata: Optional[Any] = None
    ) -> AuditLog:
        meta_str = None
        if metadata is not None:
            if isinstance(metadata, (dict, list)):
                meta_str = json.dumps(metadata)
            else:
                meta_str = str(metadata)

        log = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else "System",
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            change_metadata=meta_str
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
