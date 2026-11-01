from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.vulnerability import Vulnerability, RiskPriority
from app.models.risk_config import RiskConfig
from app.models.user import User, UserRole
from app.schemas.risk import RiskBreakdownOut, RiskConfigOut, RiskConfigUpdate
from app.schemas.vulnerability import VulnerabilityOut
from app.api.deps import get_current_user, require_role
from app.services.risk_engine import RiskEngineService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/risk", tags=["Risk Prioritization Engine"])

@router.get("/prioritized")
def get_prioritized_vulnerabilities(
    search: Optional[str] = None,
    risk_level: Optional[RiskPriority] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vulnerability).order_by(desc(Vulnerability.risk_score))
    if search:
        s = f"%{search}%"
        query = query.filter(Vulnerability.cve_id.ilike(s) | Vulnerability.title.ilike(s))
    if risk_level:
        query = query.filter(Vulnerability.risk_priority == risk_level)

    all_prioritized = query.offset(skip).limit(limit).all()

    # Dynamic Top 5 Immediate Attention
    top_5 = (
        db.query(Vulnerability)
        .filter(Vulnerability.remediation_status != "Resolved")
        .order_by(desc(Vulnerability.risk_score))
        .limit(5)
        .all()
    )

    return {
        "top_immediate_attention": [VulnerabilityOut.model_validate(v) for v in top_5],
        "total_count": query.count(),
        "items": [
            {
                "rank": idx + 1 + skip,
                "vulnerability": VulnerabilityOut.model_validate(v),
            }
            for idx, v in enumerate(all_prioritized)
        ]
    }

@router.get("/breakdown/{vulnerability_id}", response_model=RiskBreakdownOut)
def get_risk_breakdown(
    vulnerability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vulnerability_id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    config = db.query(RiskConfig).filter(RiskConfig.is_active == True).first()
    breakdown = RiskEngineService.calculate_vulnerability_risk(vuln, vuln.asset, config)
    return breakdown

@router.post("/calculate/{vulnerability_id}", response_model=RiskBreakdownOut)
def recalculate_single_risk(
    vulnerability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vulnerability_id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    RiskEngineService.evaluate_and_persist(db, vuln, vuln.asset)
    config = db.query(RiskConfig).filter(RiskConfig.is_active == True).first()
    breakdown = RiskEngineService.calculate_vulnerability_risk(vuln, vuln.asset, config)
    
    AuditService.log_action(db, action="RECALCULATE_RISK", entity_type="Vulnerability", entity_id=str(vuln.id), user=current_user)
    return breakdown

@router.post("/recalculate-all")
def recalculate_all_risks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    vulns = db.query(Vulnerability).all()
    count = 0
    for v in vulns:
        RiskEngineService.evaluate_and_persist(db, v, v.asset)
        count += 1

    AuditService.log_action(db, action="RECALCULATE_ALL_RISKS", entity_type="Vulnerability", user=current_user, metadata={"count": count})
    return {"message": f"Successfully recalculated risk scores for {count} vulnerabilities."}

@router.get("/config", response_model=RiskConfigOut)
def get_risk_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(RiskConfig).filter(RiskConfig.is_active == True).first()
    if not config:
        config = RiskConfig(
            version_name="v1.0-default",
            cvss_weight=0.30,
            epss_weight=0.20,
            asset_criticality_weight=0.15,
            internet_exposure_weight=0.15,
            exploitation_weight=0.10,
            environment_weight=0.10,
            is_active=True
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/config", response_model=RiskConfigOut)
def update_risk_configuration(
    config_in: RiskConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    config = db.query(RiskConfig).filter(RiskConfig.is_active == True).first()
    if not config:
        config = RiskConfig()
        db.add(config)

    for field, val in config_in.model_dump(exclude_unset=True).items():
        setattr(config, field, val)

    # Validate weights sum to ~1.0
    total_w = (
        config.cvss_weight +
        config.epss_weight +
        config.asset_criticality_weight +
        config.internet_exposure_weight +
        config.exploitation_weight +
        config.environment_weight
    )
    if not (0.95 <= total_w <= 1.05):
        raise HTTPException(
            status_code=400,
            detail=f"Total weights must sum to approximately 1.0 (current sum: {total_w:.2f})"
        )

    db.commit()
    db.refresh(config)

    # Recalculate all vulnerabilities with new weights
    for v in db.query(Vulnerability).all():
        RiskEngineService.evaluate_and_persist(db, v, v.asset)

    AuditService.log_action(db, action="UPDATE_RISK_CONFIG", entity_type="RiskConfig", user=current_user, metadata={"weights_sum": total_w})
    return config
