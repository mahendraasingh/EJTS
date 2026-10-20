import os
import uuid
from pathlib import Path
from datetime import datetime
from werkzeug.utils import secure_filename
from app import db
from app.models import Advertisement, SystemEvent
from app.models.utils import normalize_utc

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "avi", "mov"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

def parse_iso_datetime(dt_str):
    """Safely parse ISO datetime string or return None."""
    if not dt_str:
        return None
    try:
        # Handle trailing 'Z' if present
        clean_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        return normalize_utc(dt)
    except (ValueError, TypeError):
        return None

def is_allowed_file(filename):
    """Check if extension is permissible."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS

def get_media_type(filename):
    """Differentiate images and videos based on extension."""
    ext = filename.rsplit(".", 1)[1].lower()
    return "video" if ext in ALLOWED_VIDEO_EXTENSIONS else "image"

def save_media_file(file_storage, upload_folder):
    """Securely save uploaded media with a unique hash prefix."""
    if not file_storage or file_storage.filename == "":
        raise ValueError("No file provided or filename is empty.")

    original_filename = secure_filename(file_storage.filename)
    if not original_filename:
        original_filename = "upload"

    ext = original_filename.rsplit(".", 1)[1].lower() if "." in original_filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    # Generate unique filename to avoid overwrites
    unique_name = f"{uuid.uuid4().hex[:12]}_{original_filename}"
    upload_path = Path(upload_folder) / unique_name
    upload_path.parent.mkdir(parents=True, exist_ok=True)
    
    file_storage.save(str(upload_path))
    media_type = get_media_type(unique_name)
    return unique_name, media_type

def create_ad(name, description, category, media_filename, media_type, duration=10,
              is_active=True, campaign_start=None, campaign_end=None, order_index=None):
    """Create and persist an advertisement record."""
    if not name or not name.strip():
        raise ValueError("Advertisement campaign name is required.")

    if order_index is None:
        # Set to next available order index
        max_idx = db.session.query(db.func.max(Advertisement.order_index)).scalar()
        order_index = (max_idx or 0) + 1

    ad = Advertisement(
        name=name.strip(),
        description=description.strip() if description else None,
        category=category.strip() if category else "General",
        media_filename=media_filename,
        media_type=media_type,
        duration=max(1, int(duration)),
        is_active=bool(is_active),
        order_index=int(order_index),
        campaign_start=campaign_start,
        campaign_end=campaign_end
    )
    db.session.add(ad)
    db.session.commit()
    SystemEvent.log("billboard", f"Created advertisement campaign '{ad.name}' (ID: {ad.id})")
    return ad
