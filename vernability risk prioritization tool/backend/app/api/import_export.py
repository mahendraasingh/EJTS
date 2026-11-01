from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.api.deps import get_current_user, require_role
from app.services.csv_importer import CSVImporterService

router = APIRouter(prefix="/import", tags=["Data Import"])

@router.post("/preview")
async def preview_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    preview = CSVImporterService.parse_and_preview(text)
    return preview

@router.post("/csv")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SECURITY_ANALYST))
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    result = CSVImporterService.execute_import(db, text, file.filename, current_user)
    return result

@router.get("/sample-csv")
def download_sample_csv():
    sample_content = (
        "cve_id,title,description,cvss_score,cwe_id,affected_software,affected_version,asset_name,ip_address,operating_system,epss_score,kev_status,exploit_available\n"
        "CVE-2024-3094,XZ Utils Backdoor Liblzma,Malicious code discovered in upstream tarballs of xz,10.0,CWE-506,xz-utils,5.6.0,Prod-Edge-Gateway-01,198.51.100.12,Linux Debian 12,0.92,true,true\n"
        "CVE-2023-44487,HTTP/2 Rapid Reset Attack,High volume request cancellation DDoS flaw,7.5,CWE-400,Nginx,1.24.0,Prod-Web-Cluster-A,198.51.100.45,Ubuntu 22.04 LTS,0.78,true,true\n"
        "CVE-2023-38606,Apple Kernel State Confusion,Flaw allows app to modify sensitive kernel state,5.5,CWE-362,macOS Kernel,13.4,Eng-Staff-MacBook-04,10.20.4.15,macOS Ventura,0.12,false,false\n"
        "CVE-2024-21626,runc Container Breakout Leaky File Descriptors,Internal file descriptor leak allows container breakout,8.6,CWE-403,runc,1.1.11,K8s-Worker-Node-07,10.30.1.77,CoreOS Linux,0.64,true,true\n"
        "CVE-2023-22515,Atlassian Confluence Privilege Escalation,Allows unauthenticated attacker to create admin accounts,9.8,CWE-287,Confluence Server,8.5.1,Internal-Wiki-Host,10.10.8.22,Red Hat Enterprise Linux 8,0.85,true,true\n"
    )
    return Response(
        content=sample_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vrpt_sample_vulnerabilities.csv"}
    )
