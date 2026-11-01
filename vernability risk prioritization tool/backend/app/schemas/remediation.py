from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.remediation import RemediationTaskStatus, RemediationTaskPriority
from app.schemas.user import UserOut

class RemediationTaskBase(BaseModel):
    task_id: str
    vulnerability_id: int
    asset_id: int
    assigned_to_id: Optional[int] = None
    description: str
    priority: RemediationTaskPriority = RemediationTaskPriority.HIGH
    due_date: datetime
    status: RemediationTaskStatus = RemediationTaskStatus.OPEN

class RemediationTaskCreate(BaseModel):
    vulnerability_id: int
    assigned_to_id: Optional[int] = None
    description: str
    priority: RemediationTaskPriority = RemediationTaskPriority.HIGH
    due_date: datetime

class RemediationTaskUpdate(BaseModel):
    assigned_to_id: Optional[int] = None
    description: Optional[str] = None
    priority: Optional[RemediationTaskPriority] = None
    due_date: Optional[datetime] = None
    status: Optional[RemediationTaskStatus] = None

class RemediationTaskOut(BaseModel):
    id: int
    task_id: str
    vulnerability_id: int
    asset_id: int
    assigned_to_id: Optional[int]
    description: str
    priority: RemediationTaskPriority
    due_date: datetime
    status: RemediationTaskStatus
    created_at: datetime
    completed_at: Optional[datetime]
    
    cve_id: Optional[str] = None
    vulnerability_title: Optional[str] = None
    asset_name: Optional[str] = None
    assigned_to: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)
