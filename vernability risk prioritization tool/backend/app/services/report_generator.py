import io
import csv
from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.vulnerability import Vulnerability, RiskPriority
from app.models.asset import Asset
from app.models.remediation import RemediationTask, RemediationTaskStatus

class ReportGeneratorService:
    @classmethod
    def generate_csv_report(cls, db: Session) -> str:
        """
        Generates CSV report of all vulnerabilities and calculated risks.
        """
        vulns = db.query(Vulnerability).order_by(Vulnerability.risk_score.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Rank", "CVE ID", "Title", "Risk Score", "Risk Priority",
            "CVSS Score", "CVSS Severity", "EPSS Score", "KEV Status",
            "Exploit Available", "Asset Name", "Asset IP", "Asset Criticality",
            "Internet Exposure", "Environment", "Remediation Status"
        ])
        
        for rank, v in enumerate(vulns, start=1):
            writer.writerow([
                rank,
                v.cve_id,
                v.title,
                f"{v.risk_score:.2f}",
                v.risk_priority.value,
                f"{v.cvss_score:.1f}",
                v.cvss_severity.value,
                f"{v.epss_score:.4f}",
                "Yes" if v.kev_status else "No",
                "Yes" if v.exploit_available else "No",
                v.asset.name if v.asset else "N/A",
                v.asset.ip_address if v.asset else "N/A",
                v.asset.business_criticality.value if v.asset else "N/A",
                v.asset.internet_exposure.value if v.asset else "N/A",
                v.asset.environment.value if v.asset else "N/A",
                v.remediation_status.value
            ])
            
        return output.getvalue()

    @classmethod
    def generate_pdf_report(cls, db: Session) -> bytes:
        """
        Generates enterprise PDF executive security report using ReportLab.
        """
        vulns = db.query(Vulnerability).order_by(Vulnerability.risk_score.desc()).all()
        total_assets = db.query(Asset).count()
        tasks = db.query(RemediationTask).all()

        crit_count = sum(1 for v in vulns if v.risk_priority == RiskPriority.CRITICAL)
        high_count = sum(1 for v in vulns if v.risk_priority == RiskPriority.HIGH)
        med_count = sum(1 for v in vulns if v.risk_priority == RiskPriority.MEDIUM)
        low_count = sum(1 for v in vulns if v.risk_priority == RiskPriority.LOW)
        resolved_count = sum(1 for v in vulns if v.remediation_status.value == "Resolved")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=15
        )
        heading2_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=12,
            spaceAfter=8
        )
        cell_style = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#334155')
        )
        cell_header_style = ParagraphStyle(
            'CellHeaderText',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            fontName='Helvetica-Bold',
            textColor=colors.white
        )

        elements = []

        # Title & Meta
        elements.append(Paragraph("Enterprise Vulnerability Risk Prioritization Report", title_style))
        report_date = datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC")
        elements.append(Paragraph(f"Generated on {report_date} | Confidential Security Assessment", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=12))

        # Executive Summary Stats Table
        elements.append(Paragraph("1. Executive Summary & Security Posture", heading2_style))
        summary_data = [
            ["Total Assets", "Total Vulnerabilities", "Critical Risks", "High Risks", "Remediated"],
            [str(total_assets), str(len(vulns)), str(crit_count), str(high_count), str(resolved_count)]
        ]
        summary_table = Table(summary_data, colWidths=[108, 108, 108, 108, 108])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('TEXTCOLOR', (2, 1), (2, 1), colors.HexColor('#dc2626')),
            ('TEXTCOLOR', (3, 1), (3, 1), colors.HexColor('#ea580c')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 14))

        # Top 10 Riskiest Vulnerabilities Table
        elements.append(Paragraph("2. Top 10 Prioritized Vulnerabilities (Immediate Action Required)", heading2_style))
        table_rows = [[
            Paragraph("Rank", cell_header_style),
            Paragraph("CVE ID", cell_header_style),
            Paragraph("Asset", cell_header_style),
            Paragraph("CVSS", cell_header_style),
            Paragraph("EPSS", cell_header_style),
            Paragraph("KEV", cell_header_style),
            Paragraph("Risk Score", cell_header_style),
            Paragraph("Status", cell_header_style)
        ]]

        for r, v in enumerate(vulns[:10], start=1):
            table_rows.append([
                Paragraph(str(r), cell_style),
                Paragraph(v.cve_id, cell_style),
                Paragraph(v.asset.name[:20] if v.asset else "N/A", cell_style),
                Paragraph(f"{v.cvss_score:.1f}", cell_style),
                Paragraph(f"{(v.epss_score*100):.1f}%", cell_style),
                Paragraph("YES" if v.kev_status else "No", cell_style),
                Paragraph(f"<b>{v.risk_score:.2f}</b>", cell_style),
                Paragraph(v.remediation_status.value, cell_style)
            ])

        vuln_table = Table(table_rows, colWidths=[35, 80, 120, 45, 50, 40, 65, 105])
        vuln_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(vuln_table)
        elements.append(Spacer(1, 14))

        # Recommendations
        elements.append(Paragraph("3. Strategic Security Recommendations", heading2_style))
        recs = [
            "1. Immediately isolate and patch internet-facing production assets affected by CISA KEV vulnerabilities.",
            "2. Fast-track remediation for assets categorized as Critical business infrastructure.",
            "3. Deploy runtime detection/WAF mitigations where immediate binary patching requires maintenance windows.",
            "4. Verify all remediated findings through re-scanning before closing remediation tasks."
        ]
        for rec in recs:
            elements.append(Paragraph(rec, cell_style))
            elements.append(Spacer(1, 3))

        doc.build(elements)
        return buffer.getvalue()
