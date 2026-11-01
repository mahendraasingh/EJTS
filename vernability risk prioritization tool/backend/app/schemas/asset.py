from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.asset import AssetType, Environment, BusinessCriticality, InternetExposure

class AssetBase(BaseModel):
    asset_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    ip_address: str = Field(..., min_length=1, max_length=100)
    operating_system: str = Field(..., min_length=1, max_length=150)
    asset_type: AssetType = AssetType.SERVER
    environment: Environment = Environment.PRODUCTION
    business_criticality: BusinessCriticality = BusinessCriticality.HIGH
    internet_exposure: InternetExposure = InternetExposure.INTERNAL
    owner: str = Field(default="SecOps Team", max_length=150)
    department: str = Field(default="Engineering", max_length=150)
    location: str = Field(default="US-East DataCenter", max_length=150)

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    operating_system: Optional[str] = None
    asset_type: Optional[AssetType] = None
    environment: Optional[Environment] = None
    business_criticality: Optional[BusinessCriticality] = None
    internet_exposure: Optional[InternetExposure] = None
    owner: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None

class AssetOut(AssetBase):
    id: int
    vulnerability_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
