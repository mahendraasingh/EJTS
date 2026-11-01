from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.asset import Asset, BusinessCriticality, InternetExposure, Environment
from app.models.vulnerability import Vulnerability, RiskPriority
from app.models.risk_assessment import RiskAssessment
from app.models.risk_config import RiskConfig
from app.schemas.risk import RiskContributionItem, RiskBreakdownOut

class RiskEngineService:
    """
    Intelligent Risk Prioritization Engine
    Calculates multi-parameter risk scores combining CVSS, EPSS, Threat Intel,
    Asset Criticality, Internet Exposure, and Operating Environment.
    """

    CRITICALITY_MAP = {
        BusinessCriticality.CRITICAL: 100.0,
        BusinessCriticality.HIGH: 80.0,
        BusinessCriticality.MEDIUM: 50.0,
        BusinessCriticality.LOW: 20.0
    }

    EXPOSURE_MAP = {
        InternetExposure.INTERNET_FACING: 100.0,
        InternetExposure.INTERNAL: 50.0,
        InternetExposure.ISOLATED: 10.0
    }

    ENVIRONMENT_MAP = {
        Environment.PRODUCTION: 100.0,
        Environment.STAGING: 70.0,
        Environment.DEVELOPMENT: 40.0,
        Environment.TESTING: 20.0
    }

    @classmethod
    def normalize_cvss(cls, cvss: float) -> float:
        if cvss < 0.0 or cvss > 10.0:
            raise ValueError(f"Invalid CVSS score: {cvss}. Must be between 0.0 and 10.0")
        return round((cvss / 10.0) * 100.0, 2)

    @classmethod
    def normalize_epss(cls, epss: float) -> float:
        if epss < 0.0 or epss > 1.0:
            raise ValueError(f"Invalid EPSS score: {epss}. Must be between 0.0 and 1.0")
        return round(epss * 100.0, 2)

    @classmethod
    def normalize_exploitation(cls, kev_status: bool, exploit_available: bool) -> Tuple[float, str]:
        if kev_status:
            return 100.0, "Known Exploited Vulnerability (CISA KEV)"
        elif exploit_available:
            return 75.0, "Public Exploit Available"
        else:
            return 0.0, "No Known Exploit"

    @classmethod
    def get_risk_level(cls, score: float) -> RiskPriority:
        if score >= 80.0:
            return RiskPriority.CRITICAL
        elif score >= 60.0:
            return RiskPriority.HIGH
        elif score >= 40.0:
            return RiskPriority.MEDIUM
        else:
            return RiskPriority.LOW

    @classmethod
    def calculate_vulnerability_risk(
        cls,
        vulnerability: Vulnerability,
        asset: Asset,
        config: RiskConfig = None
    ) -> Dict[str, Any]:
        """
        Pure calculation function returning normalized scores, factor contributions,
        and final risk score bounded between 0 and 100.
        """
        # Default weights
        w_cvss = config.cvss_weight if config else 0.30
        w_epss = config.epss_weight if config else 0.20
        w_asset = config.asset_criticality_weight if config else 0.15
        w_exposure = config.internet_exposure_weight if config else 0.15
        w_exploit = config.exploitation_weight if config else 0.10
        w_env = config.environment_weight if config else 0.10
        version = config.version_name if config else "v1.0-default"

        # 1. CVSS contribution
        cvss_norm = cls.normalize_cvss(vulnerability.cvss_score)
        cvss_contrib = round(cvss_norm * w_cvss, 2)

        # 2. EPSS contribution
        epss_norm = cls.normalize_epss(vulnerability.epss_score)
        epss_contrib = round(epss_norm * w_epss, 2)

        # 3. Asset Criticality contribution
        asset_crit_norm = cls.CRITICALITY_MAP.get(asset.business_criticality, 50.0)
        asset_crit_contrib = round(asset_crit_norm * w_asset, 2)

        # 4. Internet Exposure contribution
        exposure_norm = cls.EXPOSURE_MAP.get(asset.internet_exposure, 50.0)
        exposure_contrib = round(exposure_norm * w_exposure, 2)

        # 5. Exploitation status contribution
        exploit_norm, exploit_desc = cls.normalize_exploitation(
            vulnerability.kev_status, vulnerability.exploit_available
        )
        exploit_contrib = round(exploit_norm * w_exploit, 2)

        # 6. Environment contribution
        env_norm = cls.ENVIRONMENT_MAP.get(asset.environment, 70.0)
        env_contrib = round(env_norm * w_env, 2)

        # Final score summation bounded strictly to [0, 100]
        raw_final = (
            cvss_contrib +
            epss_contrib +
            asset_crit_contrib +
            exposure_contrib +
            exploit_contrib +
            env_contrib
        )
        final_score = round(max(0.0, min(100.0, raw_final)), 2)
        risk_level = cls.get_risk_level(final_score)

        items = [
            RiskContributionItem(
                factor="CVSS Score",
                raw_value=f"{vulnerability.cvss_score:.1f} / 10.0",
                normalized_value=cvss_norm,
                weight=w_cvss,
                contribution=cvss_contrib,
                explanation=f"Base severity rating normalized to {cvss_norm}%"
            ),
            RiskContributionItem(
                factor="EPSS Exploit Likelihood",
                raw_value=f"{(vulnerability.epss_score * 100):.1f}%",
                normalized_value=epss_norm,
                weight=w_epss,
                contribution=epss_contrib,
                explanation=f"Empirical probability of exploitation in wild normalized to {epss_norm}%"
            ),
            RiskContributionItem(
                factor="Asset Business Criticality",
                raw_value=asset.business_criticality.value,
                normalized_value=asset_crit_norm,
                weight=w_asset,
                contribution=asset_crit_contrib,
                explanation=f"Impact factor based on organizational asset criticality rating"
            ),
            RiskContributionItem(
                factor="Internet Exposure",
                raw_value=asset.internet_exposure.value,
                normalized_value=exposure_norm,
                weight=w_exposure,
                contribution=exposure_contrib,
                explanation=f"Attack surface reachability ({asset.internet_exposure.value})"
            ),
            RiskContributionItem(
                factor="Exploitation Intelligence",
                raw_value=exploit_desc,
                normalized_value=exploit_norm,
                weight=w_exploit,
                contribution=exploit_contrib,
                explanation=f"Real-time threat intelligence: KEV={vulnerability.kev_status}, PublicExploit={vulnerability.exploit_available}"
            ),
            RiskContributionItem(
                factor="Environment Tier",
                raw_value=asset.environment.value,
                normalized_value=env_norm,
                weight=w_env,
                contribution=env_contrib,
                explanation=f"Deployment environment tier ({asset.environment.value})"
            )
        ]

        return {
            "vulnerability_id": vulnerability.id,
            "cve_id": vulnerability.cve_id,
            "vulnerability_title": vulnerability.title,
            "asset_name": asset.name,
            "scoring_version": version,
            "cvss_score": vulnerability.cvss_score,
            "cvss_normalized": cvss_norm,
            "cvss_contribution": cvss_contrib,
            "epss_score": vulnerability.epss_score,
            "epss_normalized": epss_norm,
            "epss_contribution": epss_contrib,
            "asset_criticality": asset.business_criticality.value,
            "asset_criticality_normalized": asset_crit_norm,
            "asset_criticality_contribution": asset_crit_contrib,
            "internet_exposure": asset.internet_exposure.value,
            "internet_exposure_normalized": exposure_norm,
            "internet_exposure_contribution": exposure_contrib,
            "exploitation_status": exploit_desc,
            "exploitation_normalized": exploit_norm,
            "exploitation_contribution": exploit_contrib,
            "environment": asset.environment.value,
            "environment_normalized": env_norm,
            "environment_contribution": env_contrib,
            "final_risk_score": final_score,
            "risk_level": risk_level.value,
            "items": items
        }

    @classmethod
    def evaluate_and_persist(
        cls,
        db: Session,
        vulnerability: Vulnerability,
        asset: Asset
    ) -> RiskAssessment:
        # Load active risk config if present
        config = db.query(RiskConfig).filter(RiskConfig.is_active == True).first()
        res = cls.calculate_vulnerability_risk(vulnerability, asset, config)

        # Update vulnerability model
        vulnerability.risk_score = res["final_risk_score"]
        vulnerability.risk_priority = RiskPriority(res["risk_level"])
        
        # Create historical risk assessment record
        assessment = RiskAssessment(
            vulnerability_id=vulnerability.id,
            scoring_version=res["scoring_version"],
            cvss_score=res["cvss_score"],
            cvss_normalized=res["cvss_normalized"],
            cvss_contribution=res["cvss_contribution"],
            epss_score=res["epss_score"],
            epss_normalized=res["epss_normalized"],
            epss_contribution=res["epss_contribution"],
            asset_criticality=res["asset_criticality"],
            asset_criticality_normalized=res["asset_criticality_normalized"],
            asset_criticality_contribution=res["asset_criticality_contribution"],
            internet_exposure=res["internet_exposure"],
            internet_exposure_normalized=res["internet_exposure_normalized"],
            internet_exposure_contribution=res["internet_exposure_contribution"],
            exploitation_status=res["exploitation_status"],
            exploitation_normalized=res["exploitation_normalized"],
            exploitation_contribution=res["exploitation_contribution"],
            environment=res["environment"],
            environment_normalized=res["environment_normalized"],
            environment_contribution=res["environment_contribution"],
            final_risk_score=res["final_risk_score"],
            risk_level=res["risk_level"]
        )
        db.add(assessment)
        db.commit()
        db.refresh(vulnerability)
        db.refresh(assessment)
        return assessment
