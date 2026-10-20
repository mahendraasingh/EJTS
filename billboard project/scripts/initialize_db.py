import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import create_app, db
from app.models import Setting, SystemEvent, Advertisement
from config import DevelopmentConfig

def init_database():
    app = create_app(DevelopmentConfig)
    with app.app_context():
        print(" * Creating database tables...")
        db.create_all()

        # Seed default settings if they do not exist
        default_settings = {
            "camera_index": (0, "Default video capture device index (0 for built-in webcam)"),
            "frame_width": (640, "Frame capture width in pixels"),
            "frame_height": (480, "Frame capture height in pixels"),
            "confidence_threshold": (0.45, "Minimum confidence threshold for YOLO person detection"),
            "inference_fps": (10, "Target frame processing rate for AI inference (throttled for laptop CPU)"),
            "lost_track_timeout": (2.5, "Seconds before a temporarily occluded or lost track is expired"),
            "min_session_duration": (1.0, "Minimum presence duration in seconds to record as an audience session"),
            "default_ad_duration": (10, "Default duration in seconds for static image advertisements"),
            "dashboard_refresh_interval": (3000, "Dashboard polling interval in milliseconds"),
            "monitoring_zone": ({
                "x1": 0.20,
                "y1": 0.15,
                "x2": 0.80,
                "y2": 0.90
            }, "Region of interest coordinates (normalized relative 0.0 to 1.0)"),
            "demonstration_mode": (False, "Enable simulated presence generator for offline demonstrations")
        }

        print(" * Checking and seeding default settings...")
        for key, (val, desc) in default_settings.items():
            existing = Setting.query.filter_by(key=key).first()
            if not existing:
                Setting.set_val(key, val, description=desc)
                print(f"   + Seeded setting: {key} = {val}")

        # Check if default placeholder ad should be seeded
        if Advertisement.query.count() == 0:
            default_ad = Advertisement(
                name="Welcome to Smart Billboard AI",
                description="Default promotional campaign showcasing intelligent audience analytics.",
                category="Tech",
                media_filename="default_ad.jpg",
                media_type="image",
                duration=10,
                is_active=True,
                order_index=0
            )
            db.session.add(default_ad)
            db.session.commit()
            print(f"   + Seeded initial advertisement: {default_ad.name}")

        SystemEvent.log("system", "Database initialized and schema verified.")
        print(" * Database initialization complete!")

if __name__ == "__main__":
    init_database()
