from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    if token:
        payload = decode_access_token(token)
        if payload is not None:
            username: str = payload.get("sub")
            if username:
                user = db.query(User).filter(User.username == username).first()
                if user and user.is_active:
                    return user
    
    # Seamless no-auth mode: fallback to primary admin user
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = db.query(User).first()
    if not user:
        from app.core.security import get_password_hash
        user = User(
            username="admin",
            email="admin@security.local",
            full_name="SecOps Lead",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def require_role(*roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {[r.value for r in roles]}"
            )
        return current_user
    return role_checker
