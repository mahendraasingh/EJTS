from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.api.deps import get_current_user
from app.services.csv_importer import CSVImporterService

router = APIRouter(prefix="/import", tags=["Data Import"])

@router.post("/preview")
async def preview_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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

@router.post("/reset")
def reset_workspace_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clears all vulnerabilities, assets, tasks, and notifications to format everything to 0.
    """
    from app.models.vulnerability import Vulnerability
    from app.models.asset import Asset
    from app.models.remediation import RemediationTask
    from app.models.notification import Notification

    db.query(RemediationTask).delete()
    db.query(Notification).delete()
    db.query(Vulnerability).delete()
    db.query(Asset).delete()
    db.commit()

    return {"status": "success", "message": "All vulnerabilities and assets reset to 0"}

@router.post("/seed-demo")
def seed_demo_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Seeds a rich sample vulnerability scan for testing prioritization.
    """
    sample_content = (
        "cve_id,title,description,cvss_score,cwe_id,affected_software,affected_version,asset_name,ip_address,operating_system,epss_score,kev_status,exploit_available\n"
        "CVE-2024-3094,XZ Utils Backdoor Liblzma,Malicious code discovered in upstream tarballs of xz leading to sshd compromise,10.0,CWE-506,xz-utils,5.6.0,Prod-Edge-Gateway-01,198.51.100.12,Linux Debian 12,0.94,true,true\n"
        "CVE-2023-44487,HTTP/2 Rapid Reset Attack,High volume request cancellation DDoS flaw affecting reverse proxies,7.5,CWE-400,Nginx,1.24.0,Prod-Web-Cluster-A,198.51.100.45,Ubuntu 22.04 LTS,0.78,true,true\n"
        "CVE-2021-44228,Log4Shell Remote Code Execution,JNDI injection in Apache Log4j allows full unauthenticated RCE,10.0,CWE-502,Apache Log4j,2.14.1,Core-Payment-Processor,10.200.4.5,Red Hat Enterprise Linux 8,0.97,true,true\n"
        "CVE-2024-21626,runc Container Breakout Leaky File Descriptors,Internal file descriptor leak allows container escape to host system,8.6,CWE-403,runc,1.1.11,K8s-Worker-Node-07,10.30.1.77,CoreOS Linux,0.64,true,true\n"
        "CVE-2023-22515,Atlassian Confluence Privilege Escalation,Allows unauthenticated attacker to create admin accounts,9.8,CWE-287,Confluence Server,8.5.1,Internal-Wiki-Host,10.10.8.22,Red Hat Enterprise Linux 8,0.85,true,true\n"
        "CVE-2024-1709,ConnectWise ScreenConnect Auth Bypass,Authentication bypass using an alternate path or channel,10.0,CWE-288,ScreenConnect,23.9.7,Support-Remote-Proxy,198.51.100.89,Windows Server 2022,0.91,true,true\n"
        "CVE-2023-38606,Apple Kernel State Confusion,Flaw allows malicious app to modify sensitive kernel state,5.5,CWE-362,macOS Kernel,13.4,Eng-Staff-MacBook-04,10.20.4.15,macOS Ventura,0.12,false,false\n"
        "CVE-2024-21413,Microsoft Outlook RCE Moniker Vulnerability,Allows remote code execution via malicious preview pane moniker,9.8,CWE-94,Microsoft Outlook,Office 2021,Exec-Laptop-Win11,10.10.2.14,Windows 11 Pro,0.76,true,true\n"
        "CVE-2023-34362,MOVEit Transfer SQL Injection RCE,Pre-auth SQL injection leading to remote arbitrary code execution,9.8,CWE-89,MOVEit Transfer,2023.0.0,Finance-File-Transfer-01,10.50.2.90,Windows Server 2019,0.95,true,true\n"
        "CVE-2023-46604,Apache ActiveMQ Remote Code Execution,Allows remote code execution via OpenWire protocol marshalling,9.8,CWE-502,ActiveMQ,5.18.2,Message-Broker-Cluster-02,10.80.3.11,Ubuntu 20.04 LTS,0.88,true,true\n"
        "CVE-2022-30190,Follina MSDT Windows Support Diagnostic Tool RCE,Remote code execution vulnerability when MSDT is called from Word,7.8,CWE-94,Windows MSDT,Windows 10,HR-Station-03,10.10.5.60,Windows 10 Enterprise,0.52,true,true\n"
        "CVE-2023-23397,Microsoft Outlook NTLM Elevation of Privilege,Triggers NTLM relay attacks without user interaction via audio reminder,9.8,CWE-290,Microsoft Outlook,Office 2019,Legal-Workstation-02,10.10.3.44,Windows 10 Enterprise,0.82,true,true\n"
    )
    result = CSVImporterService.execute_import(db, sample_content, "demo_scan_feed.csv", current_user)
    return result

@router.get("/sample-csv")
def download_sample_csv():
    sample_content = (
        "cve_id,title,description,cvss_score,cwe_id,affected_software,affected_version,asset_name,ip_address,operating_system,epss_score,kev_status,exploit_available\n"
        "CVE-2024-3094,XZ Utils Backdoor Liblzma,Malicious code discovered in upstream tarballs of xz leading to sshd compromise,10.0,CWE-506,xz-utils,5.6.0,Prod-Edge-Gateway-01,198.51.100.12,Linux Debian 12,0.94,true,true\n"
        "CVE-2023-44487,HTTP/2 Rapid Reset Attack,High volume request cancellation DDoS flaw affecting reverse proxies,7.5,CWE-400,Nginx,1.24.0,Prod-Web-Cluster-A,198.51.100.45,Ubuntu 22.04 LTS,0.78,true,true\n"
        "CVE-2021-44228,Log4Shell Remote Code Execution,JNDI injection in Apache Log4j allows full unauthenticated RCE,10.0,CWE-502,Apache Log4j,2.14.1,Core-Payment-Processor,10.200.4.5,Red Hat Enterprise Linux 8,0.97,true,true\n"
        "CVE-2024-21626,runc Container Breakout Leaky File Descriptors,Internal file descriptor leak allows container escape to host system,8.6,CWE-403,runc,1.1.11,K8s-Worker-Node-07,10.30.1.77,CoreOS Linux,0.64,true,true\n"
        "CVE-2023-22515,Atlassian Confluence Privilege Escalation,Allows unauthenticated attacker to create admin accounts,9.8,CWE-287,Confluence Server,8.5.1,Internal-Wiki-Host,10.10.8.22,Red Hat Enterprise Linux 8,0.85,true,true\n"
        "CVE-2024-1709,ConnectWise ScreenConnect Auth Bypass,Authentication bypass using an alternate path or channel,10.0,CWE-288,ScreenConnect,23.9.7,Support-Remote-Proxy,198.51.100.89,Windows Server 2022,0.91,true,true\n"
        "CVE-2023-38606,Apple Kernel State Confusion,Flaw allows malicious app to modify sensitive kernel state,5.5,CWE-362,macOS Kernel,13.4,Eng-Staff-MacBook-04,10.20.4.15,macOS Ventura,0.12,false,false\n"
        "CVE-2024-21413,Microsoft Outlook RCE Moniker Vulnerability,Allows remote code execution via malicious preview pane moniker,9.8,CWE-94,Microsoft Outlook,Office 2021,Exec-Laptop-Win11,10.10.2.14,Windows 11 Pro,0.76,true,true\n"
        "CVE-2023-34362,MOVEit Transfer SQL Injection RCE,Pre-auth SQL injection leading to remote arbitrary code execution,9.8,CWE-89,MOVEit Transfer,2023.0.0,Finance-File-Transfer-01,10.50.2.90,Windows Server 2019,0.95,true,true\n"
        "CVE-2023-46604,Apache ActiveMQ Remote Code Execution,Allows remote code execution via OpenWire protocol marshalling,9.8,CWE-502,ActiveMQ,5.18.2,Message-Broker-Cluster-02,10.80.3.11,Ubuntu 20.04 LTS,0.88,true,true\n"
        "CVE-2022-30190,Follina MSDT Windows Support Diagnostic Tool RCE,Remote code execution vulnerability when MSDT is called from Word,7.8,CWE-94,Windows MSDT,Windows 10,HR-Station-03,10.10.5.60,Windows 10 Enterprise,0.52,true,true\n"
        "CVE-2023-23397,Microsoft Outlook NTLM Elevation of Privilege,Triggers NTLM relay attacks without user interaction via audio reminder,9.8,CWE-290,Microsoft Outlook,Office 2019,Legal-Workstation-02,10.10.3.44,Windows 10 Enterprise,0.82,true,true\n"
    )
    return Response(
        content=sample_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vrpt_vulnerabilities_template.csv"}
    )
