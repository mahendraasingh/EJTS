from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.core.database import get_db
from app.models.vulnerability import Vulnerability, RiskPriority, RemediationStatus, CVSSSeverity
from app.models.asset import Asset
from app.models.remediation import RemediationTask, RemediationTaskStatus
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.dashboard import (
    KPISummary, SeverityDistributionItem, RiskTrendPoint,
    AssetVulnerabilityItem, RemediationProgress, ActivityItem
)
from app.schemas.vulnerability import VulnerabilityOut
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=KPISummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_vulns = db.query(Vulnerability).count()
    crit_vulns = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.CRITICAL).count()
    high_vulns = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.HIGH).count()
    med_vulns = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.MEDIUM).count()
    low_vulns = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.LOW).count()
    total_assets = db.query(Asset).count()
    open_vulns = db.query(Vulnerability).filter(Vulnerability.remediation_status != RemediationStatus.RESOLVED).count()
    remediated_vulns = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.RESOLVED).count()

    avg_score = db.query(func.avg(Vulnerability.risk_score)).scalar() or 0.0

    return KPISummary(
        total_vulnerabilities=total_vulns,
        critical_vulnerabilities=crit_vulns,
        high_vulnerabilities=high_vulns,
        medium_vulnerabilities=med_vulns,
        low_vulnerabilities=low_vulns,
        total_assets=total_assets,
        open_vulnerabilities=open_vulns,
        remediated_vulnerabilities=remediated_vulns,
        average_risk_score=round(avg_score, 2)
    )

@router.get("/severity-distribution", response_model=List[SeverityDistributionItem])
def get_severity_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    crit = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.CRITICAL).count()
    high = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.HIGH).count()
    med = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.MEDIUM).count()
    low = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.LOW).count()

    return [
        SeverityDistributionItem(name="Critical Risk", value=crit, color="#ef4444"),
        SeverityDistributionItem(name="High Risk", value=high, color="#f97316"),
        SeverityDistributionItem(name="Medium Risk", value=med, color="#eab308"),
        SeverityDistributionItem(name="Low Risk", value=low, color="#22c55e")
    ]

@router.get("/risk-trends", response_model=List[RiskTrendPoint])
def get_risk_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Simulated 7-day chronological historical risk trends based on real DB totals
    now = datetime.now(timezone.utc)
    crit = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.CRITICAL).count()
    high = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.HIGH).count()
    med = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.MEDIUM).count()
    low = db.query(Vulnerability).filter(Vulnerability.risk_priority == RiskPriority.LOW).count()
    avg = db.query(func.avg(Vulnerability.risk_score)).scalar() or 50.0

    points = []
    multipliers = [0.82, 0.88, 0.91, 0.95, 0.92, 0.97, 1.00]
    for i in range(7):
        day = (now - timedelta(days=(6 - i))).strftime("%b %d")
        m = multipliers[i]
        points.append(RiskTrendPoint(
            date=day,
            critical=max(0, int(crit * m)),
            high=max(0, int(high * m)),
            medium=max(0, int(med * m)),
            low=max(0, int(low * m)),
            avg_score=round(avg * m, 2)
        ))
    return points

@router.get("/top-risks", response_model=List[VulnerabilityOut])
def get_top_risks(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vulns = (
        db.query(Vulnerability)
        .order_by(desc(Vulnerability.risk_score))
        .limit(limit)
        .all()
    )
    return [VulnerabilityOut.model_validate(v) for v in vulns]

@router.get("/asset-distribution", response_model=List[AssetVulnerabilityItem])
def get_asset_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assets = db.query(Asset).limit(8).all()
    results = []
    for a in assets:
        c = sum(1 for v in a.vulnerabilities if v.risk_priority == RiskPriority.CRITICAL)
        h = sum(1 for v in a.vulnerabilities if v.risk_priority == RiskPriority.HIGH)
        m = sum(1 for v in a.vulnerabilities if v.risk_priority == RiskPriority.MEDIUM)
        l = sum(1 for v in a.vulnerabilities if v.risk_priority == RiskPriority.LOW)
        results.append(AssetVulnerabilityItem(
            asset_name=a.name,
            asset_id=a.asset_id,
            critical=c,
            high=h,
            medium=m,
            low=l,
            total=len(a.vulnerabilities)
        ))
    return sorted(results, key=lambda x: x.critical * 4 + x.high * 2 + x.total, reverse=True)

@router.get("/remediation-progress", response_model=RemediationProgress)
def get_remediation_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(Vulnerability).count()
    op = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.OPEN).count()
    inp = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.IN_PROGRESS).count()
    pend = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.PENDING_VERIFICATION).count()
    res = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.RESOLVED).count()
    acc = db.query(Vulnerability).filter(Vulnerability.remediation_status == RemediationStatus.ACCEPTED_RISK).count()

    rate = (res / total * 100.0) if total > 0 else 0.0

    return RemediationProgress(
        open_count=op,
        in_progress_count=inp,
        pending_verification_count=pend,
        resolved_count=res,
        accepted_risk_count=acc,
        completion_rate_percentage=round(rate, 1)
    )

@router.get("/recent-activities", response_model=List[ActivityItem])
def get_recent_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(10).all()
    results = []
    for l in logs:
        badge = "blue"
        if "CRITICAL" in l.action or "DELETE" in l.action:
            badge = "red"
        elif "RESOLVE" in l.action or "VERIFY" in l.action:
            badge = "green"
        elif "IMPORT" in l.action:
            badge = "purple"

        results.append(ActivityItem(
            id=l.id,
            title=l.action.replace("_", " ").title(),
            description=f"Action on {l.entity_type} {f'({l.entity_id})' if l.entity_id else ''} by {l.username}",
            timestamp=l.created_at.strftime("%b %d, %H:%M"),
            type=l.action,
            badge=badge
        ))
    return results
