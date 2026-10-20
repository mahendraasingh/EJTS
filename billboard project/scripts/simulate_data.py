import sys
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app import create_app, db
from app.models import Advertisement, ViewerSession, SystemEvent
from app.models.utils import utc_now
from config import DevelopmentConfig

def generate_demo_sessions(count=35):
    """Generate realistic demonstration audience presence episodes for college presentations."""
    app = create_app(DevelopmentConfig)
    with app.app_context():
        ads = Advertisement.query.filter_by(is_archived=False).all()
        if not ads:
            print(" * No active campaigns found. Please run scripts/initialize_db.py first.")
            return

        print(f" * Generating {count} simulated audience sessions across campaigns...")
        now = utc_now()
        created = 0

        for i in range(count):
            ad = random.choice(ads)
            # Spread sessions across past 5 days
            minutes_ago = random.randint(5, 5 * 24 * 60)
            start_t = now - timedelta(minutes=minutes_ago)
            # Duration between 1.5s and 25s
            duration = round(random.uniform(1.8, 22.0), 1)
            end_t = start_t + timedelta(seconds=duration)

            session = ViewerSession(
                tracking_id=random.randint(100, 999),
                advertisement_id=ad.id,
                start_time=start_t,
                end_time=end_t,
                estimated_duration=duration,
                status="completed",
                exit_reason="left_zone",
                is_simulated=True
            )
            db.session.add(session)
            created += 1

        db.session.commit()
        SystemEvent.log("system", f"Generated {created} simulated demonstration sessions.")
        print(f" * Successfully generated and persisted {created} demonstration sessions in SQLite!")

if __name__ == "__main__":
    generate_demo_sessions()
