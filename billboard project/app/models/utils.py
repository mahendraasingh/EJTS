from datetime import datetime, timezone

def utc_now():
    """Return naive datetime representing current UTC time for SQLite compatibility."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

def normalize_utc(dt):
    """Normalize datetime to naive UTC datetime for consistent database operations."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
