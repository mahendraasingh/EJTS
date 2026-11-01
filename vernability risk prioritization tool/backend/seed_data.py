import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.asset import Asset, AssetType, Environment, BusinessCriticality, InternetExposure
from app.models.vulnerability import Vulnerability, CVSSSeverity, RiskPriority, RemediationStatus
from app.models.remediation import RemediationTask, RemediationTaskPriority, RemediationTaskStatus
from app.models.risk_config import RiskConfig
from app.models.notification import Notification, NotificationType
from app.services.risk_engine import RiskEngineService
from app.services.audit_service import AuditService

def seed_database():
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding Users...")
        # 1. Users
        admin_user = User(
            email="admin@vrpt.security",
            username="admin",
            full_name="Alexander Vance (Lead Security Architect)",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        analyst_user = User(
            email="analyst@vrpt.security",
            username="analyst",
            full_name="Maya Lin (Senior Vulnerability Analyst)",
            hashed_password=get_password_hash("analyst123"),
            role=UserRole.SECURITY_ANALYST,
            is_active=True
        )
        viewer_user = User(
            email="viewer@vrpt.security",
            username="viewer",
            full_name="Elena Rostova (Compliance Auditor)",
            hashed_password=get_password_hash("viewer123"),
            role=UserRole.VIEWER,
            is_active=True
        )
        db.add_all([admin_user, analyst_user, viewer_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(analyst_user)
        db.refresh(viewer_user)

        # 2. Risk Config
        print("Seeding Risk Scoring Configuration...")
        config = RiskConfig(
            version_name="v1.0-default",
            description="Enterprise Weighted Multi-Factor Risk Prioritization Model",
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

        # 3. 16 Realistic Enterprise Assets across Production, Staging, Dev
        print("Seeding 16 Enterprise Assets...")
        assets_data = [
            # Internet Facing Production
            ("AST-PRD-001", "Edge-API-Gateway-Primary", "198.51.100.10", "Linux Ubuntu 22.04 LTS", AssetType.SERVER, Environment.PRODUCTION, BusinessCriticality.CRITICAL, InternetExposure.INTERNET_FACING, "Platform Ops", "Infrastructure", "AWS us-east-1"),
            ("AST-PRD-002", "Customer-Auth-Vault-Cluster", "198.51.100.22", "Red Hat Enterprise Linux 9", AssetType.SERVER, Environment.PRODUCTION, BusinessCriticality.CRITICAL, InternetExposure.INTERNET_FACING, "Identity Team", "Security", "AWS us-east-1"),
            ("AST-PRD-003", "Main-Storefront-Web-App", "198.51.100.35", "Alpine Linux 3.19 (K8s)", AssetType.WEB_APPLICATION, Environment.PRODUCTION, BusinessCriticality.CRITICAL, InternetExposure.INTERNET_FACING, "Web Frontend Team", "E-Commerce", "Cloudflare / AWS"),
            ("AST-PRD-004", "Payment-Processing-Service", "198.51.100.48", "Debian GNU/Linux 12", AssetType.SERVER, Environment.PRODUCTION, BusinessCriticality.CRITICAL, InternetExposure.INTERNET_FACING, "FinTech Core", "Finance", "US-East PCI Zone"),
            ("AST-PRD-005", "Public-DNS-LoadBalancer-01", "198.51.100.5", "FreeBSD 14.0", AssetType.NETWORK_DEVICE, Environment.PRODUCTION, BusinessCriticality.HIGH, InternetExposure.INTERNET_FACING, "NetOps", "Infrastructure", "Equinix Ashburn"),
            
            # Internal Production
            ("AST-PRD-006", "Primary-PostgreSQL-Core-DB", "10.100.1.50", "Ubuntu Linux 22.04", AssetType.DATABASE, Environment.PRODUCTION, BusinessCriticality.CRITICAL, InternetExposure.INTERNAL, "DBA Team", "Data Ops", "Private Subnet A"),
            ("AST-PRD-007", "Enterprise-Kafka-Message-Bus", "10.100.2.14", "RHEL 8.9", AssetType.SERVER, Environment.PRODUCTION, BusinessCriticality.HIGH, InternetExposure.INTERNAL, "Platform Engineering", "Data Ops", "Private Subnet B"),
            ("AST-PRD-008", "Corporate-LDAP-ActiveDirectory", "10.100.0.10", "Windows Server 2022 Datacenter", AssetType.SERVER, Environment.PRODUCTION, BusinessCriticality.HIGH, InternetExposure.INTERNAL, "IT Sysadmin", "Internal IT", "HQ Data Center"),
            ("AST-PRD-009", "Elasticsearch-Log-Analytics", "10.100.5.88", "Ubuntu 20.04 LTS", AssetType.DATABASE, Environment.PRODUCTION, BusinessCriticality.MEDIUM, InternetExposure.INTERNAL, "Observability Team", "DevOps", "Private Subnet C"),
            
            # Staging & Cloud
            ("AST-STG-010", "Staging-ECommerce-Cluster", "10.200.1.12", "Ubuntu 22.04 LTS", AssetType.CLOUD_INSTANCE, Environment.STAGING, BusinessCriticality.HIGH, InternetExposure.INTERNAL, "QA Platform", "Quality Assurance", "GCP us-central1"),
            ("AST-STG-011", "PreProd-Payment-Gateway", "10.200.2.20", "Debian 12", AssetType.SERVER, Environment.STAGING, BusinessCriticality.MEDIUM, InternetExposure.INTERNAL, "FinTech Core", "Finance", "GCP us-central1"),
            ("AST-STG-012", "Microservice-Mesh-Envoy", "10.200.3.44", "Container Linux", AssetType.CONTAINER, Environment.STAGING, BusinessCriticality.MEDIUM, InternetExposure.INTERNAL, "Core Backend", "Engineering", "EKS Staging"),

            # Development & Internal Workstations
            ("AST-DEV-013", "CI-CD-Jenkins-Master", "10.150.1.10", "Debian 11", AssetType.SERVER, Environment.DEVELOPMENT, BusinessCriticality.HIGH, InternetExposure.INTERNAL, "DevOps Team", "Infrastructure", "Dev VNet"),
            ("AST-DEV-014", "Sandbox-ML-Training-Node", "10.150.8.99", "Ubuntu 22.04 LTS (NVIDIA CUDA)", AssetType.SERVER, Environment.DEVELOPMENT, BusinessCriticality.LOW, InternetExposure.ISOLATED, "AI Research", "R&D", "Isolated GPU Rack"),
            ("AST-DEV-015", "Lead-SecOps-Analyst-MacBook", "10.50.4.101", "macOS Sonoma 14.4", AssetType.WORKSTATION, Environment.DEVELOPMENT, BusinessCriticality.MEDIUM, InternetExposure.INTERNAL, "Maya Lin", "Cybersecurity", "Corporate Office"),
            ("AST-DEV-016", "Internal-Security-Scanner-Box", "10.50.9.15", "Kali Linux 2024.1", AssetType.WORKSTATION, Environment.TESTING, BusinessCriticality.LOW, InternetExposure.ISOLATED, "Red Team", "SecOps", "Lab Enclave")
        ]

        assets = []
        for code, name, ip, os_name, atype, env, crit, exp, owner, dept, loc in assets_data:
            a = Asset(
                asset_id=code,
                name=name,
                ip_address=ip,
                operating_system=os_name,
                asset_type=atype,
                environment=env,
                business_criticality=crit,
                internet_exposure=exp,
                owner=owner,
                department=dept,
                location=loc
            )
            db.add(a)
            assets.append(a)

        db.commit()
        for a in assets:
            db.refresh(a)

        # 4. 32 Realistic CVE Vulnerabilities
        print("Seeding 32 CVE Vulnerabilities with realistic threat intel...")
        now = datetime.now(timezone.utc)
        vuln_seeds = [
            # Critical & High Threat Intel
            ("CVE-2024-3094", "XZ Utils Malicious Backdoor (liblzma)", "Malicious obfuscated backdoor code discovered in upstream XZ/liblzma tarballs compromising SSH authentication daemon.", 10.0, CVSSSeverity.CRITICAL, "CWE-506", "xz-utils / liblzma", "5.6.0 - 5.6.1", 0, 0.95, True, True, "Immediately downgrade or rebuild liblzma from verified upstream git commits."),
            ("CVE-2023-44487", "HTTP/2 Rapid Reset Denial of Service", "HTTP/2 protocol flaw allows rapid stream reset frames causing massive server resource exhaustion and outage.", 7.5, CVSSSeverity.HIGH, "CWE-400", "NGINX Web Server", "1.24.0", 0, 0.88, True, True, "Apply Nginx security patch and tune keepalive and active stream concurrency limits."),
            ("CVE-2024-21626", "runc Container Escape File Descriptor Leak", "Internal file descriptor leakage in runc allows container escape and arbitrary host filesystem write access.", 8.6, CVSSSeverity.HIGH, "CWE-403", "runc", "1.1.11", 2, 0.74, True, True, "Upgrade runc package to 1.1.12 or newer on all container orchestrator nodes."),
            ("CVE-2023-38606", "Apple XNU Kernel State Manipulation", "A logic issue in Apple kernel allows apps to modify sensitive kernel state with kernel privileges.", 5.5, CVSSSeverity.MEDIUM, "CWE-362", "macOS XNU Kernel", "13.4", 14, 0.15, False, False, "Deploy Apple macOS security update 14.4.1 across corporate fleet."),
            ("CVE-2023-22515", "Atlassian Confluence Privilege Escalation", "Flaw allows unauthenticated attacker to create rogue administrator accounts on exposed instances.", 9.8, CVSSSeverity.CRITICAL, "CWE-287", "Confluence Data Center", "8.5.1", 1, 0.92, True, True, "Upgrade Atlassian Confluence to version 8.5.3 or restrict network ingress."),
            ("CVE-2024-3400", "Palo Alto PAN-OS Command Injection", "Arbitrary command injection in GlobalProtect feature allows unauthenticated root remote code execution.", 10.0, CVSSSeverity.CRITICAL, "CWE-77", "PAN-OS GlobalProtect", "10.2.9", 4, 0.96, True, True, "Apply vendor hotfix and enable threat prevention signature ID 95187."),
            ("CVE-2023-46805", "Ivanti Connect Secure Authentication Bypass", "Control check bypass flaw in web component allows remote attackers to access restricted resources.", 8.2, CVSSSeverity.HIGH, "CWE-287", "Ivanti Connect Secure", "9.1R14", 1, 0.91, True, True, "Apply Ivanti mitigation XML and upgrade to fixed firmware image."),
            ("CVE-2024-27198", "JetBrains TeamCity Authentication Bypass", "Authentication bypass in TeamCity web controller enabling full administrative server takeover.", 9.8, CVSSSeverity.CRITICAL, "CWE-306", "TeamCity Server", "2023.11.3", 12, 0.89, True, True, "Upgrade TeamCity to version 2023.11.4 or apply official security plugin."),
            ("CVE-2023-34362", "MOVEit Transfer SQL Injection Vulnerability", "SQL injection in MOVEit Transfer web app allows unauthenticated remote attacker unauthorized DB access.", 9.8, CVSSSeverity.CRITICAL, "CWE-89", "MOVEit Transfer", "2023.0.0", 3, 0.94, True, True, "Apply Progress Software security patch and inspect database audit logs."),
            ("CVE-2024-1709", "ConnectWise ScreenConnect Authentication Bypass", "Direct path traversal and auth bypass allows creation of arbitrary administrative user accounts.", 10.0, CVSSSeverity.CRITICAL, "CWE-288", "ScreenConnect Server", "23.9.7", 0, 0.97, True, True, "Immediately upgrade ScreenConnect to version 23.9.8 or higher."),
            
            # Databases & Infrastructure Vulnerabilities
            ("CVE-2023-2454", "PostgreSQL Insufficient Schema Permissions", "Improper schema object search path execution allows unprivileged users to execute code as superuser.", 6.7, CVSSSeverity.MEDIUM, "CWE-426", "PostgreSQL Server", "14.7", 5, 0.22, False, False, "Upgrade PostgreSQL to version 14.8+ and audit search_path configurations."),
            ("CVE-2023-28252", "Windows CLFS Driver Elevation of Privilege", "Common Log File System driver flaw exploited by Nokoyawa ransomware operators for SYSTEM access.", 7.8, CVSSSeverity.HIGH, "CWE-787", "Windows Server CLFS", "2022", 7, 0.85, True, True, "Apply Microsoft Patch Tuesday KB5025229 update."),
            ("CVE-2023-38545", "cURL SOCKS5 Heap Buffer Overflow", "Heap buffer overflow in SOCKS5 proxy handshake protocol handling slow or malformed hostname resolution.", 9.8, CVSSSeverity.CRITICAL, "CWE-122", "libcurl", "8.3.0", 6, 0.45, False, True, "Upgrade libcurl package to version 8.4.0 or disable socks5h proxy schemes."),
            ("CVE-2024-23897", "Jenkins CLI Arbitrary File Read", "Args4j parser flaw allows unauthenticated remote attackers to read arbitrary files from Jenkins master.", 9.8, CVSSSeverity.CRITICAL, "CWE-22", "Jenkins Core", "2.441", 12, 0.82, True, True, "Disable Jenkins CLI feature or upgrade Jenkins to weekly 2.442 / LTS 2.426.3."),
            ("CVE-2023-48795", "Terrapin Attack SSH Protocol Downgrade", "Prefix truncation attack against ChaCha20-Poly1305 and CBC ciphers allows handshake manipulation.", 5.9, CVSSSeverity.MEDIUM, "CWE-310", "OpenSSH Server", "8.9p1", 6, 0.18, False, False, "Upgrade OpenSSH to 9.6p1 and disable vulnerable chacha20-poly1305 ciphers."),
            ("CVE-2023-4911", "GNU C Library ld.so Looney Tunables Overflow", "Buffer overflow in GLIBC dynamic loader processing GLIBC_TUNABLES environment variable.", 7.8, CVSSSeverity.HIGH, "CWE-120", "glibc", "2.35", 5, 0.86, True, True, "Upgrade glibc package via apt-get update && apt-get upgrade libc6."),
            
            # Web & App Layer
            ("CVE-2023-29489", "cPanel Cross-Site Scripting Injection", "Reflected cross-site scripting vulnerability in cPanel management interface port 2082/2083.", 6.1, CVSSSeverity.MEDIUM, "CWE-79", "cPanel CPSrvd", "11.108", 3, 0.62, True, True, "Update cPanel to build 11.108.0.13 or newer."),
            ("CVE-2024-21413", "Microsoft Outlook Moniker Remote Code Execution", "Flaw allows attackers to bypass Office Protected View when rendering malicious file links in emails.", 9.8, CVSSSeverity.CRITICAL, "CWE-20", "Microsoft 365 Outlook", "16.0.17", 14, 0.84, True, True, "Deploy Microsoft 365 Apps update 2402 (Build 17328.20142)."),
            ("CVE-2023-4966", "Citrix NetScaler ADC Sensitive Data Leak (Citrix Bleed)", "Buffer overflow in OpenID Connect endpoint exposes sensitive user session tokens.", 9.4, CVSSSeverity.CRITICAL, "CWE-119", "Citrix NetScaler ADC", "13.1-48", 4, 0.94, True, True, "Install firmware hotfix and terminate all existing authenticated ICA sessions."),
            ("CVE-2023-20198", "Cisco IOS XE Web UI Privilege Escalation", "Web UI flaw allows remote unauthenticated attacker to create level 15 privilege accounts.", 10.0, CVSSSeverity.CRITICAL, "CWE-287", "Cisco IOS XE", "17.9.3", 4, 0.98, True, True, "Disable HTTP/HTTPS server feature or install official Cisco maintenance release."),
            ("CVE-2024-27348", "Apache HugeGraph Remote Code Execution", "Gremlin traversal language execution allows bypass of security manager and system command execution.", 9.8, CVSSSeverity.CRITICAL, "CWE-94", "Apache HugeGraph", "1.2.0", 8, 0.65, False, True, "Upgrade Apache HugeGraph server to version 1.3.0 or higher."),
            ("CVE-2024-21762", "Fortinet FortiOS SSL-VPN Out-of-Bounds Write", "Out-of-bounds write in FortiOS allows unauthenticated remote attacker to execute arbitrary code.", 9.8, CVSSSeverity.CRITICAL, "CWE-787", "Fortinet FortiOS", "7.4.2", 0, 0.91, True, True, "Upgrade FortiOS to version 7.4.3 or disable SSL-VPN web portal."),
            
            # Medium and Lower Risks
            ("CVE-2023-38035", "Ivanti Sentry MICS Administrative Access", "Apache HTTPD configuration flaw exposes sensitive MobileIron Configuration Service API endpoints.", 7.2, CVSSSeverity.HIGH, "CWE-284", "Ivanti Sentry", "9.18", 1, 0.81, True, True, "Apply RPM patch RPM-Sentry-9.18.0-2 or block access to port 8443."),
            ("CVE-2024-20931", "Oracle WebLogic Server T3/IIOP Deserialization", "Vulnerability in WebLogic core enables unauthenticated attacker to achieve remote code execution.", 7.5, CVSSSeverity.HIGH, "CWE-502", "Oracle WebLogic", "14.1.1", 10, 0.42, False, True, "Apply Oracle Critical Patch Update for WebLogic Server April 2024."),
            ("CVE-2023-26159", "Follow-Redirects Prototype Pollution", "Improper URL parsing causes unauthorized redirect header leaks in NodeJS backend microservices.", 6.5, CVSSSeverity.MEDIUM, "CWE-1321", "follow-redirects", "1.15.3", 11, 0.12, False, False, "Upgrade follow-redirects npm dependency to version 1.15.4."),
            ("CVE-2023-45853", "MiniZip Integer Overflow in Cryptography", "Integer overflow in MiniZip package when handling large archives leads to memory corruption.", 5.3, CVSSSeverity.MEDIUM, "CWE-190", "MiniZip / zlib", "1.2.13", 13, 0.08, False, False, "Update zlib packages to 1.3 or compile with checked integer arithmetic."),
            ("CVE-2023-36025", "Windows SmartScreen Security Feature Bypass", "Flaw enables malicious internet shortcut (.url) files to bypass SmartScreen safety prompts.", 8.8, CVSSSeverity.HIGH, "CWE-20", "Windows SmartScreen", "10/11", 14, 0.89, True, True, "Deploy Microsoft November 2023 cumulative security updates."),
            ("CVE-2024-0519", "Google Chrome V8 Out-of-bounds Memory Access", "Out of bounds memory access in V8 JavaScript engine allows memory leak and sandbox bypass.", 8.8, CVSSSeverity.HIGH, "CWE-125", "Google Chrome V8", "120.0", 14, 0.83, True, True, "Update Google Chrome to 120.0.6099.224 or newer."),
            ("CVE-2023-28771", "Zyxel Firewall IKE Packet Command Injection", "Remote command injection in Internet Key Exchange packet handler on Zyxel USG firewalls.", 9.8, CVSSSeverity.CRITICAL, "CWE-78", "Zyxel USG Firmware", "5.35", 4, 0.93, True, True, "Install Zyxel firmware patch ZLD V5.36 or higher."),
            ("CVE-2024-23113", "Fortinet FortiOS Format String Vulnerability", "Use of externally-controlled format string in fgfmd daemon allows unauthenticated code execution.", 9.8, CVSSSeverity.CRITICAL, "CWE-134", "Fortinet fgfmd", "7.2.6", 0, 0.77, True, True, "Upgrade FortiOS to 7.2.7 or remove fgfm service listening ports."),
            ("CVE-2023-32315", "Openfire Administrative Console Path Traversal", "Path traversal vulnerability allows unauthenticated access to setup tool and admin credentials.", 7.5, CVSSSeverity.HIGH, "CWE-22", "Openfire XMPP Server", "4.7.4", 9, 0.79, True, True, "Upgrade Openfire to version 4.7.5 or 4.8.0."),
            ("CVE-2024-1086", "Linux Kernel Netfilter Use-After-Free", "Use-after-free bug in netfilter nf_tables subsystem allows local unprivileged user privilege escalation to root.", 7.8, CVSSSeverity.HIGH, "CWE-416", "Linux Kernel nf_tables", "6.6.14", 5, 0.71, True, True, "Upgrade distribution kernel to 6.6.15+ or disable unprivileged user namespaces.")
        ]

        vulnerabilities = []
        for cve, title, desc, cvss, sev, cwe, soft, ver, asset_idx, epss, kev, pub_exp, rec in vuln_seeds:
            target_asset = assets[asset_idx % len(assets)]
            v = Vulnerability(
                cve_id=cve,
                title=title,
                description=desc,
                cvss_score=cvss,
                cvss_severity=sev,
                cwe_id=cwe,
                affected_software=soft,
                affected_version=ver,
                asset_id=target_asset.id,
                epss_score=epss,
                kev_status=kev,
                exploit_available=pub_exp,
                discovery_date=now - timedelta(days=(len(vulnerabilities) * 2 + 1)),
                remediation_status=RemediationStatus.OPEN,
                remediation_recommendation=rec,
                assigned_to_id=analyst_user.id if len(vulnerabilities) % 3 == 0 else None
            )
            db.add(v)
            vulnerabilities.append((v, target_asset))

        db.commit()

        # Calculate Risk Scores for all 32 Vulnerabilities
        print("Calculating intelligent multi-factor risk scores...")
        for v, asset in vulnerabilities:
            db.refresh(v)
            RiskEngineService.evaluate_and_persist(db, v, asset)

        # 5. Seed 12 Remediation Tasks across various statuses
        print("Seeding 12 Remediation Tasks...")
        rem_tasks_data = [
            (0, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.IN_PROGRESS, 2, "Upgrade XZ utils to patched release across edge gateway fleet.", analyst_user.id),
            (1, RemediationTaskPriority.HIGH, RemediationTaskStatus.OPEN, 4, "Tune HTTP/2 keepalive parameters and apply vendor mitigation patch.", analyst_user.id),
            (2, RemediationTaskPriority.HIGH, RemediationTaskStatus.RESOLVED, -1, "Patched runc binary on all K8s worker nodes.", analyst_user.id),
            (4, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.IN_PROGRESS, 1, "Deploy network firewall filter rule and upgrade Confluence container.", admin_user.id),
            (5, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.OPEN, 3, "Install PAN-OS emergency hotfix on GlobalProtect interface.", admin_user.id),
            (6, RemediationTaskPriority.HIGH, RemediationTaskStatus.PENDING_VERIFICATION, 2, "Applied Ivanti mitigation script; awaiting automated re-scan verification.", analyst_user.id),
            (8, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.RESOLVED, -3, "Upgraded MOVEit transfer cluster and rotated all database passwords.", analyst_user.id),
            (9, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.IN_PROGRESS, 1, "Updated ScreenConnect instances and verified access control lists.", analyst_user.id),
            (11, RemediationTaskPriority.HIGH, RemediationTaskStatus.OPEN, 5, "Schedule Windows Server CLFS monthly patch maintenance window.", analyst_user.id),
            (12, RemediationTaskPriority.MEDIUM, RemediationTaskStatus.ACCEPTED_RISK, 30, "Risk accepted by business owner pending scheduled quarterly infrastructure overhaul.", admin_user.id),
            (13, RemediationTaskPriority.CRITICAL, RemediationTaskStatus.OPEN, 1, "Upgrade Jenkins master nodes to latest LTS release.", analyst_user.id),
            (17, RemediationTaskPriority.HIGH, RemediationTaskStatus.RESOLVED, -2, "Deployed Microsoft 365 security updates across workstation fleet.", analyst_user.id)
        ]

        for idx, (v_idx, prio, status, due_days, desc_text, user_id) in enumerate(rem_tasks_data, start=1):
            vuln, asset = vulnerabilities[v_idx]
            task = RemediationTask(
                task_id=f"REM-2026-{idx:03d}",
                vulnerability_id=vuln.id,
                asset_id=asset.id,
                assigned_to_id=user_id,
                description=desc_text,
                priority=prio,
                due_date=now + timedelta(days=due_days),
                status=status,
                created_at=now - timedelta(days=5),
                completed_at=now - timedelta(days=1) if status == RemediationTaskStatus.RESOLVED else None
            )
            db.add(task)
            
            # Sync vulnerability status
            if status == RemediationTaskStatus.RESOLVED:
                vuln.remediation_status = RemediationStatus.RESOLVED
            elif status == RemediationTaskStatus.PENDING_VERIFICATION:
                vuln.remediation_status = RemediationStatus.PENDING_VERIFICATION
            elif status == RemediationTaskStatus.IN_PROGRESS:
                vuln.remediation_status = RemediationStatus.IN_PROGRESS
            elif status == RemediationTaskStatus.ACCEPTED_RISK:
                vuln.remediation_status = RemediationStatus.ACCEPTED_RISK

        db.commit()

        # 6. Seed In-App Notifications
        print("Seeding Notifications...")
        notifs = [
            ("Critical Zero-Day Ingested: CVE-2024-3094", "XZ Utils backdoor detected on internet-facing Edge-API-Gateway-Primary with calculated risk score 96.5!", NotificationType.CRITICAL_VULNERABILITY),
            ("CISA KEV Alert: Active Exploitation", "CISA catalog reports active exploitation for Palo Alto PAN-OS (CVE-2024-3400). Immediate action required.", NotificationType.KEV_ALERT),
            ("Overdue Remediation Task", "Task REM-2026-003 for runc container escape remediation is due today.", NotificationType.OVERDUE_REMEDIATION),
            ("Remediation Verified & Closed", "Task REM-2026-007 (MOVEit Transfer SQL Injection) verified and closed by Alexander Vance.", NotificationType.TASK_COMPLETED),
            ("Risk Model Configuration Active", "Enterprise risk weighting formula v1.0 is currently active.", NotificationType.INFO)
        ]
        for title, msg, ntype in notifs:
            n = Notification(
                title=title,
                message=msg,
                notification_type=ntype,
                is_read=False
            )
            db.add(n)

        # 7. Seed Initial Audit Logs
        print("Seeding Audit Logs...")
        AuditService.log_action(db, action="SYSTEM_INIT", entity_type="System", user=admin_user, metadata="Enterprise VRPT platform initialized.")
        AuditService.log_action(db, action="RISK_CONFIG_SET", entity_type="RiskConfig", user=admin_user, metadata="Scoring model v1.0 activated.")
        AuditService.log_action(db, action="BULK_INGESTION", entity_type="Vulnerability", user=analyst_user, metadata="32 CVE records evaluated and prioritized.")

        print("\n=======================================================")
        print("[OK] DATABASE SEEDED SUCCESSFULLY WITH PRODUCTION DEMO DATA!")
        print("=======================================================")
        print("Demo Credentials:")
        print("  ADMIN:            admin / admin123")
        print("  SECURITY ANALYST: analyst / analyst123")
        print("  VIEWER:           viewer / viewer123")
        print("Assets Seeded: 16 | Vulnerabilities Seeded: 32 | Tasks: 12")
        print("=======================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
