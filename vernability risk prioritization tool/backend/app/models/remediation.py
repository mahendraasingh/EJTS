from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class RemediationTaskStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    PENDING_VERIFICATION = "Pending Verification"
    RESOLVED = "Resolved"
    ACCEPTED_RISK = "Accepted Risk"

class RemediationTaskPriority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class RemediationTask(Base):
    __tablename__ = "remediation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(50), unique=True, index=True, nullable=False)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    description = Column(Text, nullable=False)
    priority = Column(Enum(RemediationTaskPriority), default=RemediationTaskPriority.HIGH, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(Enum(RemediationTaskStatus), default=RemediationTaskStatus.OPEN, nullable=False, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    vulnerability = relationship("Vulnerability", back_populates="remediation_tasks")
    asset = relationship("Asset", back_populates="remediation_tasks")
    assigned_to = relationship("User", back_populates="assigned_tasks")
