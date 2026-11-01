from pydantic import BaseModel
from typing import List, Dict, Any

class KPISummary(BaseModel):
    total_vulnerabilities: int
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    low_vulnerabilities: int
    total_assets: int
    open_vulnerabilities: int
    remediated_vulnerabilities: int
    average_risk_score: float

class SeverityDistributionItem(BaseModel):
    name: str
    value: int
    color: str

class RiskTrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int
    avg_score: float

class AssetVulnerabilityItem(BaseModel):
    asset_name: str
    asset_id: str
    critical: int
    high: int
    medium: int
    low: int
    total: int

class RemediationProgress(BaseModel):
    open_count: int
    in_progress_count: int
    pending_verification_count: int
    resolved_count: int
    accepted_risk_count: int
    completion_rate_percentage: float

class ActivityItem(BaseModel):
    id: int
    title: str
    description: str
    timestamp: str
    type: str
    badge: str
