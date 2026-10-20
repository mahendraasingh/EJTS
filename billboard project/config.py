import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "smart-billboard-secret-key-prod-change-me")
    
    # Instance & Database
    INSTANCE_PATH = BASE_DIR / "instance"
    INSTANCE_PATH.mkdir(parents=True, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", f"sqlite:///{INSTANCE_PATH / 'billboard.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Uploads & Media
    UPLOAD_FOLDER = BASE_DIR / "media" / "advertisements"
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB max for video/image
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "avi", "mov"}
    ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

    # Camera & Computer Vision Defaults
    CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", 0))
    FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", 640))
    FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", 480))
    INFERENCE_FPS = int(os.getenv("INFERENCE_FPS", 10))
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.45))
    YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")
    
    # Central Region of Interest / Monitoring Zone (relative coords [x1, y1, x2, y2] from 0.0 to 1.0)
    # Default is the central 60% of the frame horizontally and vertically
    DEFAULT_MONITORING_ZONE = {
        "x1": 0.20,
        "y1": 0.15,
        "x2": 0.80,
        "y2": 0.90
    }
    
    # Tracking & Session Engine
    LOST_TRACK_TIMEOUT = float(os.getenv("LOST_TRACK_TIMEOUT", 2.5))  # seconds before track expires
    MIN_SESSION_DURATION = float(os.getenv("MIN_SESSION_DURATION", 1.0))  # seconds to count as valid session
    DEFAULT_AD_DURATION = int(os.getenv("DEFAULT_AD_DURATION", 10))  # seconds per image ad
    DASHBOARD_REFRESH_INTERVAL = int(os.getenv("DASHBOARD_REFRESH_INTERVAL", 3000))  # ms

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
