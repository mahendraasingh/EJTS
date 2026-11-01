from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.services.report_generator import ReportGeneratorService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.api.dashboard import get_dashboard_summary
    return get_dashboard_summary(db, current_user)

@router.get("/export/csv")
def export_csv_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_data = ReportGeneratorService.generate_csv_report(db)
    AuditService.log_action(db, action="EXPORT_REPORT_CSV", entity_type="Report", user=current_user)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=VRPT_Risk_Report_{timestamp}.csv"}
    )

@router.get("/export/pdf")
def export_pdf_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pdf_bytes = ReportGeneratorService.generate_pdf_report(db)
    AuditService.log_action(db, action="EXPORT_REPORT_PDF", entity_type="Report", user=current_user)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=VRPT_Executive_Report_{timestamp}.pdf"}
    )
