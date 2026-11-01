from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.core.database import get_db
from app.models.vulnerability import Vulnerability, CVSSSeverity, RiskPriority, RemediationStatus
from app.models.asset import Asset
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.schemas.vulnerability import VulnerabilityCreate, VulnerabilityUpdate, VulnerabilityOut
from app.api.deps import get_current_user, require_role
from app.services.risk_engine import RiskEngineService
from app.services.external_intelligence import ExternalIntelligenceService
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerabilities"])

@router.get("", response_model=List[VulnerabilityOut])
def list_vulnerabilities(
    search: Optional[str] = None,
    severity: Optional[CVSSSeverity] = None,
    risk_priority: Optional[RiskPriority] = None,
    asset_id: Optional[int] = None,
    remediation_status: Optional[RemediationStatus] = None,
    sort_by: str = "risk_score",
    sort_dir: str = "desc",
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vulnerability)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(
            Vulnerability.cve_id.ilike(s),
            Vulnerability.title.ilike(s),
            Vulnerability.affected_software.ilike(s)
        ))
    if severity:
        query = query.filter(Vulnerability.cvss_severity == severity)
    if risk_priority:
        query = query.filter(Vulnerability.risk_priority == risk_priority)
    if asset_id:
        query = query.filter(Vulnerability.asset_id == asset_id)
    if remediation_status:
        query = query.filter(Vulnerability.remediation_status == remediation_status)

    # Sorting
    sort_column = getattr(Vulnerability, sort_by, Vulnerability.risk_score)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    return query.offset(skip).limit(limit).all()

@router.post("", response_model=VulnerabilityOut, status_code=status.HTTP_201_CREATED)
async def create_vulnerability(
    vuln_in: VulnerabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    asset = db.query(Asset).filter(Asset.id == vuln_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Target asset not found")

    # If EPSS or KEV was left at default, enrich automatically from threat intelligence
    epss_score = vuln_in.epss_score
    kev_status = vuln_in.kev_status
    if epss_score == 0.0 or not kev_status:
        enriched = await ExternalIntelligenceService.enrich_cve(vuln_in.cve_id)
        if epss_score == 0.0:
            epss_score = enriched.get("epss_score", 0.05)
        if not kev_status and enriched.get("kev_status"):
            kev_status = True

    vuln_data = vuln_in.model_dump()
    vuln_data["epss_score"] = epss_score
    vuln_data["kev_status"] = kev_status

    vuln = Vulnerability(**vuln_data)
    db.add(vuln)
    db.commit()
    db.refresh(vuln)

    # Calculate risk score
    RiskEngineService.evaluate_and_persist(db, vuln, asset)

    # Notify if critical or KEV
    if vuln.risk_priority == RiskPriority.CRITICAL:
        NotificationService.create_notification(
            db,
            title=f"Critical Risk Discovered: {vuln.cve_id}",
            message=f"{vuln.cve_id} on {asset.name} has a critical calculated risk score of {vuln.risk_score}!",
            notification_type=NotificationType.CRITICAL_VULNERABILITY
        )
    if vuln.kev_status:
        NotificationService.create_notification(
            db,
            title=f"CISA KEV Alert: {vuln.cve_id}",
            message=f"{vuln.cve_id} on {asset.name} is confirmed to be actively exploited in the wild!",
            notification_type=NotificationType.KEV_ALERT
        )

    AuditService.log_action(db, action="CREATE_VULNERABILITY", entity_type="Vulnerability", entity_id=str(vuln.id), user=current_user)
    return vuln

@router.get("/{id}")
def get_vulnerability_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    # Latest risk breakdown
    breakdown = RiskEngineService.calculate_vulnerability_risk(vuln, vuln.asset)
    
    # Audit log activities for this vulnerability
    activities = db.query(AuditService.__dict__.get("AuditLog", None) or AuditService).filter_by() if False else []
    
    return {
        "vulnerability": VulnerabilityOut.model_validate(vuln),
        "breakdown": breakdown,
        "history": [
            {
                "id": a.id,
                "calculated_at": a.calculated_at,
                "scoring_version": a.scoring_version,
                "final_risk_score": a.final_risk_score,
                "risk_level": a.risk_level
            }
            for a in vuln.risk_assessments[:10]
        ],
        "remediation_tasks": vuln.remediation_tasks
    }

@router.put("/{id}", response_model=VulnerabilityOut)
def update_vulnerability(
    id: int,
    vuln_in: VulnerabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    risk_factors_changed = False
    for field, val in vuln_in.model_dump(exclude_unset=True).items():
        if field in ["cvss_score", "epss_score", "kev_status", "exploit_available", "asset_id"] and getattr(vuln, field) != val:
            risk_factors_changed = True
        setattr(vuln, field, val)

    db.commit()
    db.refresh(vuln)

    if risk_factors_changed:
        RiskEngineService.evaluate_and_persist(db, vuln, vuln.asset)

    AuditService.log_action(db, action="UPDATE_VULNERABILITY", entity_type="Vulnerability", entity_id=str(vuln.id), user=current_user)
    return vuln

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vulnerability(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    db.delete(vuln)
    db.commit()
    AuditService.log_action(db, action="DELETE_VULNERABILITY", entity_type="Vulnerability", entity_id=str(id), user=current_user)
    return None
