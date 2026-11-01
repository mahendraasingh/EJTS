from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch notifications targeted to user or broadcast (user_id is None)
    notifs = (
        db.query(Notification)
        .filter(or_(Notification.user_id == current_user.id, Notification.user_id == None))
        .order_by(desc(Notification.created_at))
        .limit(50)
        .all()
    )
    return notifs

@router.put("/{id}/read", response_model=NotificationOut)
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        or_(Notification.user_id == current_user.id, Notification.user_id == None)
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
