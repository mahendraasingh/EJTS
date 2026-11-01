from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class AssetType(str, enum.Enum):
    SERVER = "Server"
    WORKSTATION = "Workstation"
    DATABASE = "Database"
    NETWORK_DEVICE = "Network Device"
    WEB_APPLICATION = "Web Application"
    CLOUD_INSTANCE = "Cloud Instance"
    CONTAINER = "Container"

class Environment(str, enum.Enum):
    PRODUCTION = "Production"
    STAGING = "Staging"
    DEVELOPMENT = "Development"
    TESTING = "Testing"

class BusinessCriticality(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class InternetExposure(str, enum.Enum):
    INTERNET_FACING = "Internet Facing"
    INTERNAL = "Internal"
    ISOLATED = "Isolated"

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(100), nullable=False)
    operating_system = Column(String(150), nullable=False)
    asset_type = Column(Enum(AssetType), default=AssetType.SERVER, nullable=False)
    environment = Column(Enum(Environment), default=Environment.PRODUCTION, nullable=False)
    business_criticality = Column(Enum(BusinessCriticality), default=BusinessCriticality.HIGH, nullable=False)
    internet_exposure = Column(Enum(InternetExposure), default=InternetExposure.INTERNAL, nullable=False)
    owner = Column(String(150), nullable=False, default="SecOps Team")
    department = Column(String(150), nullable=False, default="Engineering")
    location = Column(String(150), nullable=False, default="US-East DataCenter")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    vulnerabilities = relationship("Vulnerability", back_populates="asset", cascade="all, delete-orphan")
    remediation_tasks = relationship("RemediationTask", back_populates="asset", cascade="all, delete-orphan")
