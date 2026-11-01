import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.asset import Asset, AssetType, Environment, BusinessCriticality, InternetExposure
from app.models.vulnerability import Vulnerability, CVSSSeverity, RiskPriority, RemediationStatus
from app.models.notification import NotificationType
from app.models.user import User
from app.services.risk_engine import RiskEngineService
from app.services.notification_service import NotificationService
from app.services.audit_service import AuditService

class CSVImporterService:
    EXPECTED_COLUMNS = [
        "cve_id", "title", "description", "cvss_score", "cwe_id",
        "affected_software", "affected_version", "asset_name", "ip_address",
        "operating_system", "epss_score", "kev_status", "exploit_available"
    ]

    @classmethod
    def parse_and_preview(cls, file_content: str) -> Dict[str, Any]:
        """
        Parses CSV, validates rows, and returns a preview with error annotations.
        """
        f = io.StringIO(file_content)
        reader = csv.DictReader(f)
        
        valid_rows = []
        invalid_rows = []
        
        for idx, row in enumerate(reader, start=1):
            cleaned = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
            row_errors = []
            
            # Key checks
            cve = cleaned.get("cve_id") or cleaned.get("cve")
            title = cleaned.get("title") or cleaned.get("name")
            asset_name = cleaned.get("asset_name") or cleaned.get("asset")
            
            if not cve:
                row_errors.append("Missing CVE ID")
            if not title:
                row_errors.append("Missing Vulnerability Title/Name")
            if not asset_name:
                row_errors.append("Missing Asset Name")
                
            try:
                cvss = float(cleaned.get("cvss_score") or cleaned.get("cvss") or 5.0)
                if cvss < 0.0 or cvss > 10.0:
                    row_errors.append("CVSS score must be between 0.0 and 10.0")
            except ValueError:
                row_errors.append("Invalid numerical CVSS score")

            try:
                epss = float(cleaned.get("epss_score") or cleaned.get("epss") or 0.05)
                if epss < 0.0 or epss > 1.0:
                    row_errors.append("EPSS score must be between 0.0 and 1.0")
            except ValueError:
                row_errors.append("Invalid numerical EPSS score")

            item = {
                "row_number": idx,
                "cve_id": cve,
                "title": title,
                "asset_name": asset_name,
                "cvss_score": cleaned.get("cvss_score") or cleaned.get("cvss") or "5.0",
                "epss_score": cleaned.get("epss_score") or cleaned.get("epss") or "0.05",
                "affected_software": cleaned.get("affected_software", "Unknown"),
                "affected_version": cleaned.get("affected_version", "1.0"),
                "kev_status": cleaned.get("kev_status", "false").lower() in ["true", "1", "yes"],
                "exploit_available": cleaned.get("exploit_available", "false").lower() in ["true", "1", "yes"],
                "is_valid": len(row_errors) == 0,
                "errors": row_errors
            }
            
            if item["is_valid"]:
                valid_rows.append(item)
            else:
                invalid_rows.append(item)

        return {
            "total_rows": len(valid_rows) + len(invalid_rows),
            "valid_count": len(valid_rows),
            "invalid_count": len(invalid_rows),
            "preview_valid": valid_rows[:10],
            "invalid_rows": invalid_rows
        }

    @classmethod
    def execute_import(
        cls,
        db: Session,
        file_content: str,
        filename: str,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Executes actual DB commit for valid rows, links/creates assets,
        calculates risk scores, and generates notifications for critical items.
        """
        f = io.StringIO(file_content)
        reader = csv.DictReader(f)

        imported_count = 0
        skipped_count = 0
        rejected_count = 0
        errors = []

        for idx, row in enumerate(reader, start=1):
            cleaned = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items() if k}
            cve_id = cleaned.get("cve_id") or cleaned.get("cve")
            title = cleaned.get("title") or cleaned.get("name")
            asset_name = cleaned.get("asset_name") or cleaned.get("asset")

            if not cve_id or not title or not asset_name:
                rejected_count += 1
                errors.append(f"Row {idx}: Missing mandatory CVE, Title, or Asset Name")
                continue

            try:
                cvss = float(cleaned.get("cvss_score") or cleaned.get("cvss") or 5.0)
                epss = float(cleaned.get("epss_score") or cleaned.get("epss") or 0.05)
            except ValueError:
                rejected_count += 1
                errors.append(f"Row {idx}: Invalid numeric CVSS or EPSS score")
                continue

            # Determine CVSS Severity
            if cvss >= 9.0:
                cvss_sev = CVSSSeverity.CRITICAL
            elif cvss >= 7.0:
                cvss_sev = CVSSSeverity.HIGH
            elif cvss >= 4.0:
                cvss_sev = CVSSSeverity.MEDIUM
            else:
                cvss_sev = CVSSSeverity.LOW

            kev_status = cleaned.get("kev_status", "false").lower() in ["true", "1", "yes"]
            exploit_available = cleaned.get("exploit_available", "false").lower() in ["true", "1", "yes"]

            # Match or create Asset
            asset = db.query(Asset).filter(Asset.name == asset_name).first()
            if not asset:
                ip_addr = cleaned.get("ip_address", f"10.0.{idx // 256}.{idx % 256 + 10}")
                os_name = cleaned.get("operating_system", "Linux Ubuntu 22.04 LTS")
                asset = Asset(
                    asset_id=f"AST-IMP-{idx:03d}",
                    name=asset_name,
                    ip_address=ip_addr,
                    operating_system=os_name,
                    asset_type=AssetType.SERVER,
                    environment=Environment.PRODUCTION,
                    business_criticality=BusinessCriticality.HIGH,
                    internet_exposure=InternetExposure.INTERNAL
                )
                db.add(asset)
                db.commit()
                db.refresh(asset)

            # Check for existing vulnerability for this asset
            existing_vuln = db.query(Vulnerability).filter(
                Vulnerability.cve_id == cve_id,
                Vulnerability.asset_id == asset.id
            ).first()

            if existing_vuln:
                # Update existing
                existing_vuln.title = title
                existing_vuln.cvss_score = cvss
                existing_vuln.cvss_severity = cvss_sev
                existing_vuln.epss_score = epss
                existing_vuln.kev_status = kev_status
                existing_vuln.exploit_available = exploit_available
                existing_vuln.last_updated_date = datetime.now(timezone.utc)
                db.commit()
                RiskEngineService.evaluate_and_persist(db, existing_vuln, asset)
                imported_count += 1
            else:
                vuln = Vulnerability(
                    cve_id=cve_id,
                    title=title,
                    description=cleaned.get("description", f"Discovered vulnerability {cve_id} in {asset_name}"),
                    cvss_score=cvss,
                    cvss_severity=cvss_sev,
                    cwe_id=cleaned.get("cwe_id", "CWE-General"),
                    affected_software=cleaned.get("affected_software", "Enterprise Package"),
                    affected_version=cleaned.get("affected_version", "1.0"),
                    asset_id=asset.id,
                    epss_score=epss,
                    kev_status=kev_status,
                    exploit_available=exploit_available,
                    remediation_status=RemediationStatus.OPEN,
                    remediation_recommendation=f"Upgrade affected software package to latest patched release."
                )
                db.add(vuln)
                db.commit()
                db.refresh(vuln)
                RiskEngineService.evaluate_and_persist(db, vuln, asset)
                imported_count += 1

                # Alerts if critical or KEV
                if vuln.risk_priority == RiskPriority.CRITICAL:
                    NotificationService.create_notification(
                        db,
                        title=f"Critical Risk Discovered: {vuln.cve_id}",
                        message=f"{vuln.cve_id} on {asset.name} scored a critical risk of {vuln.risk_score}!",
                        notification_type=NotificationType.CRITICAL_VULNERABILITY
                    )
                if vuln.kev_status:
                    NotificationService.create_notification(
                        db,
                        title=f"CISA KEV Alert: {vuln.cve_id}",
                        message=f"{vuln.cve_id} on {asset.name} has confirmed active exploitation in the wild!",
                        notification_type=NotificationType.KEV_ALERT
                    )

        AuditService.log_action(
            db,
            action="CSV_IMPORT",
            entity_type="Vulnerability",
            user=current_user,
            metadata={"filename": filename, "imported": imported_count, "rejected": rejected_count}
        )

        return {
            "filename": filename,
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "rejected_count": rejected_count,
            "errors": errors
        }
