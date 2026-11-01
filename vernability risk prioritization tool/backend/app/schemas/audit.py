from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    username: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    change_metadata: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
