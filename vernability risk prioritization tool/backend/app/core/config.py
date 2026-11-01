import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vulnerability Risk Prioritization Tool (VRPT)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "vrpt-super-secret-key-change-in-production-2026-sec-ops")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # SQLite fallback by default for local development, easily overridden with Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vrpt.db")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # External Security APIs
    FIRST_EPSS_API_URL: str = "https://api.first.org/data/v1/epss"
    CISA_KEV_API_URL: str = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    NVD_API_URL: str = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    NVD_API_KEY: str = os.getenv("NVD_API_KEY", "")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
