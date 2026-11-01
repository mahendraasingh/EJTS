from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.id", ondelete="CASCADE"), nullable=False, index=True)
    scoring_version = Column(String(50), default="v1.0-default", nullable=False)

    # Raw and Normalized & Contribution values
    cvss_score = Column(Float, nullable=False)
    cvss_normalized = Column(Float, nullable=False)
    cvss_contribution = Column(Float, nullable=False)

    epss_score = Column(Float, nullable=False)
    epss_normalized = Column(Float, nullable=False)
    epss_contribution = Column(Float, nullable=False)

    asset_criticality = Column(String(50), nullable=False)
    asset_criticality_normalized = Column(Float, nullable=False)
    asset_criticality_contribution = Column(Float, nullable=False)

    internet_exposure = Column(String(50), nullable=False)
    internet_exposure_normalized = Column(Float, nullable=False)
    internet_exposure_contribution = Column(Float, nullable=False)

    exploitation_status = Column(String(50), nullable=False)
    exploitation_normalized = Column(Float, nullable=False)
    exploitation_contribution = Column(Float, nullable=False)

    environment = Column(String(50), nullable=False)
    environment_normalized = Column(Float, nullable=False)
    environment_contribution = Column(Float, nullable=False)

    final_risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    vulnerability = relationship("Vulnerability", back_populates="risk_assessments")
