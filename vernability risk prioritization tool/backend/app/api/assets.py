from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.asset import Asset, AssetType, Environment, BusinessCriticality, InternetExposure
from app.models.user import User, UserRole
from app.models.vulnerability import Vulnerability
from app.schemas.asset import AssetCreate, AssetUpdate, AssetOut
from app.schemas.vulnerability import VulnerabilityOut
from app.api.deps import get_current_user, require_role
from app.services.risk_engine import RiskEngineService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("", response_model=List[AssetOut])
def list_assets(
    search: Optional[str] = None,
    asset_type: Optional[AssetType] = None,
    environment: Optional[Environment] = None,
    criticality: Optional[BusinessCriticality] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Asset)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(Asset.name.ilike(s), Asset.asset_id.ilike(s), Asset.ip_address.ilike(s)))
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if environment:
        query = query.filter(Asset.environment == environment)
    if criticality:
        query = query.filter(Asset.business_criticality == criticality)

    assets = query.order_by(Asset.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with count of vulnerabilities
    result = []
    for a in assets:
        out = AssetOut.model_validate(a)
        out.vulnerability_count = len(a.vulnerabilities)
        result.append(out)
    return result

@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    existing = db.query(Asset).filter(
        (Asset.asset_id == asset_in.asset_id) | (Asset.name == asset_in.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset ID or Asset Name already exists")

    asset = Asset(**asset_in.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)

    AuditService.log_action(db, action="CREATE_ASSET", entity_type="Asset", entity_id=str(asset.id), user=current_user)
    out = AssetOut.model_validate(asset)
    out.vulnerability_count = 0
    return out

@router.get("/{id}")
def get_asset(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    out = AssetOut.model_validate(asset)
    out.vulnerability_count = len(asset.vulnerabilities)
    
    # Return asset with associated vulnerabilities
    vulns = [VulnerabilityOut.model_validate(v) for v in asset.vulnerabilities]
    return {
        "asset": out,
        "vulnerabilities": vulns
    }

@router.put("/{id}", response_model=AssetOut)
def update_asset(
    id: int,
    asset_in: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    crit_changed = False
    for field, val in asset_in.model_dump(exclude_unset=True).items():
        if field in ["business_criticality", "internet_exposure", "environment"] and getattr(asset, field) != val:
            crit_changed = True
        setattr(asset, field, val)

    db.commit()
    db.refresh(asset)

    # Recalculate risks for associated vulnerabilities if asset risk parameters changed
    if crit_changed:
        for v in asset.vulnerabilities:
            RiskEngineService.evaluate_and_persist(db, v, asset)

    AuditService.log_action(db, action="UPDATE_ASSET", entity_type="Asset", entity_id=str(asset.id), user=current_user)
    out = AssetOut.model_validate(asset)
    out.vulnerability_count = len(asset.vulnerabilities)
    return out

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(asset)
    db.commit()
    AuditService.log_action(db, action="DELETE_ASSET", entity_type="Asset", entity_id=str(id), user=current_user)
    return None
