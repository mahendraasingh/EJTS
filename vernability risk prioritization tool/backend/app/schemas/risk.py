from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class RiskContributionItem(BaseModel):
    factor: str
    raw_value: str
    normalized_value: float
    weight: float
    contribution: float
    explanation: str

class RiskBreakdownOut(BaseModel):
    vulnerability_id: int
    cve_id: str
    vulnerability_title: str
    asset_name: str
    scoring_version: str
    calculated_at: datetime
    
    cvss_score: float
    cvss_normalized: float
    cvss_contribution: float

    epss_score: float
    epss_normalized: float
    epss_contribution: float

    asset_criticality: str
    asset_criticality_normalized: float
    asset_criticality_contribution: float

    internet_exposure: str
    internet_exposure_normalized: float
    internet_exposure_contribution: float

    exploitation_status: str
    exploitation_normalized: float
    exploitation_contribution: float

    environment: str
    environment_normalized: float
    environment_contribution: float

    final_risk_score: float
    risk_level: str
    items: List[RiskContributionItem] = []

    model_config = ConfigDict(from_attributes=True)

class RiskConfigOut(BaseModel):
    id: int
    version_name: str
    description: Optional[str]
    cvss_weight: float
    epss_weight: float
    asset_criticality_weight: float
    internet_exposure_weight: float
    exploitation_weight: float
    environment_weight: float
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class RiskConfigUpdate(BaseModel):
    cvss_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    epss_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    asset_criticality_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    internet_exposure_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    exploitation_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    environment_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
