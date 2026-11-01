from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class NotificationType(str, enum.Enum):
    CRITICAL_VULNERABILITY = "CRITICAL_VULNERABILITY"
    HIGH_RISK = "HIGH_RISK"
    KEV_ALERT = "KEV_ALERT"
    OVERDUE_REMEDIATION = "OVERDUE_REMEDIATION"
    TASK_COMPLETED = "TASK_COMPLETED"
    RISK_INCREASE = "RISK_INCREASE"
    INFO = "INFO"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True) # None = broadcast to all
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), default=NotificationType.INFO, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notifications")
