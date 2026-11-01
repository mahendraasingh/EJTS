from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.remediation import RemediationTask, RemediationTaskStatus, RemediationTaskPriority
from app.models.vulnerability import Vulnerability, RemediationStatus
from app.models.asset import Asset
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.schemas.remediation import RemediationTaskCreate, RemediationTaskUpdate, RemediationTaskOut
from app.api.deps import get_current_user, require_role
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/remediation", tags=["Remediation"])

@router.get("", response_model=List[RemediationTaskOut])
def list_remediation_tasks(
    status_filter: Optional[RemediationTaskStatus] = None,
    priority: Optional[RemediationTaskPriority] = None,
    assigned_to_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RemediationTask)
    if status_filter:
        query = query.filter(RemediationTask.status == status_filter)
    if priority:
        query = query.filter(RemediationTask.priority == priority)
    if assigned_to_id:
        query = query.filter(RemediationTask.assigned_to_id == assigned_to_id)

    tasks = query.order_by(desc(RemediationTask.created_at)).offset(skip).limit(limit).all()
    results = []
    for t in tasks:
        out = RemediationTaskOut.model_validate(t)
        out.cve_id = t.vulnerability.cve_id if t.vulnerability else "N/A"
        out.vulnerability_title = t.vulnerability.title if t.vulnerability else "N/A"
        out.asset_name = t.asset.name if t.asset else "N/A"
        results.append(out)
    return results

@router.get("/overdue", response_model=List[RemediationTaskOut])
def list_overdue_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    tasks = db.query(RemediationTask).filter(
        RemediationTask.due_date < now,
        RemediationTask.status.in_([RemediationTaskStatus.OPEN, RemediationTaskStatus.IN_PROGRESS])
    ).all()
    
    results = []
    for t in tasks:
        out = RemediationTaskOut.model_validate(t)
        out.cve_id = t.vulnerability.cve_id if t.vulnerability else "N/A"
        out.vulnerability_title = t.vulnerability.title if t.vulnerability else "N/A"
        out.asset_name = t.asset.name if t.asset else "N/A"
        results.append(out)
    return results

@router.post("", response_model=RemediationTaskOut, status_code=status.HTTP_201_CREATED)
def create_remediation_task(
    task_in: RemediationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == task_in.vulnerability_id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Target vulnerability not found")

    count = db.query(RemediationTask).count() + 1
    task_code = f"REM-{datetime.now(timezone.utc).year}-{count:03d}"

    task = RemediationTask(
        task_id=task_code,
        vulnerability_id=vuln.id,
        asset_id=vuln.asset_id,
        assigned_to_id=task_in.assigned_to_id,
        description=task_in.description,
        priority=task_in.priority,
        due_date=task_in.due_date,
        status=RemediationTaskStatus.OPEN
    )
    db.add(task)

    # Set vulnerability status to in progress
    vuln.remediation_status = RemediationStatus.IN_PROGRESS
    db.commit()
    db.refresh(task)

    AuditService.log_action(db, action="CREATE_REMEDIATION_TASK", entity_type="RemediationTask", entity_id=str(task.id), user=current_user)

    out = RemediationTaskOut.model_validate(task)
    out.cve_id = vuln.cve_id
    out.vulnerability_title = vuln.title
    out.asset_name = vuln.asset.name
    return out

@router.put("/{id}", response_model=RemediationTaskOut)
def update_remediation_task(
    id: int,
    task_in: RemediationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    task = db.query(RemediationTask).filter(RemediationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Remediation task not found")

    for field, val in task_in.model_dump(exclude_unset=True).items():
        setattr(task, field, val)

    if task.status in [RemediationTaskStatus.RESOLVED, RemediationTaskStatus.PENDING_VERIFICATION]:
        # Note: Do not automatically mark vulnerability as fixed simply because task is resolved;
        # provide a verification step per specification!
        if task.status == RemediationTaskStatus.RESOLVED:
            task.completed_at = datetime.now(timezone.utc)
            task.vulnerability.remediation_status = RemediationStatus.PENDING_VERIFICATION
        elif task.status == RemediationTaskStatus.PENDING_VERIFICATION:
            task.vulnerability.remediation_status = RemediationStatus.PENDING_VERIFICATION
    elif task.status == RemediationTaskStatus.ACCEPTED_RISK:
        task.vulnerability.remediation_status = RemediationStatus.ACCEPTED_RISK

    db.commit()
    db.refresh(task)

    AuditService.log_action(db, action="UPDATE_REMEDIATION_TASK", entity_type="RemediationTask", entity_id=str(task.id), user=current_user)

    out = RemediationTaskOut.model_validate(task)
    out.cve_id = task.vulnerability.cve_id
    out.vulnerability_title = task.vulnerability.title
    out.asset_name = task.asset.name
    return out

@router.post("/{id}/verify", response_model=RemediationTaskOut)
def verify_and_close_remediation(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    """
    Verification step: Verifies fix effectiveness and officially marks vulnerability as RESOLVED.
    """
    task = db.query(RemediationTask).filter(RemediationTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Remediation task not found")

    task.status = RemediationTaskStatus.RESOLVED
    task.completed_at = datetime.now(timezone.utc)
    task.vulnerability.remediation_status = RemediationStatus.RESOLVED
    db.commit()
    db.refresh(task)

    NotificationService.create_notification(
        db,
        title=f"Vulnerability Remediated: {task.vulnerability.cve_id}",
        message=f"{task.vulnerability.cve_id} on {task.asset.name} was successfully verified and closed.",
        notification_type=NotificationType.TASK_COMPLETED
    )

    AuditService.log_action(db, action="VERIFY_REMEDIATION", entity_type="RemediationTask", entity_id=str(task.id), user=current_user)

    out = RemediationTaskOut.model_validate(task)
    out.cve_id = task.vulnerability.cve_id
    out.vulnerability_title = task.vulnerability.title
    out.asset_name = task.asset.name
    return out
