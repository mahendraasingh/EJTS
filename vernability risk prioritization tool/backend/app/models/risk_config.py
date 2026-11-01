from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from app.core.database import Base

class RiskConfig(Base):
    __tablename__ = "risk_configs"

    id = Column(Integer, primary_key=True, index=True)
    version_name = Column(String(50), unique=True, nullable=False, default="v1.0-default")
    description = Column(String(255), nullable=True, default="Standard enterprise weighted vulnerability risk model")
    
    cvss_weight = Column(Float, nullable=False, default=0.30)
    epss_weight = Column(Float, nullable=False, default=0.20)
    asset_criticality_weight = Column(Float, nullable=False, default=0.15)
    internet_exposure_weight = Column(Float, nullable=False, default=0.15)
    exploitation_weight = Column(Float, nullable=False, default=0.10)
    environment_weight = Column(Float, nullable=False, default=0.10)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
