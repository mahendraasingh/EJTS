import pytest
from app.models.asset import Asset, AssetType, Environment, BusinessCriticality, InternetExposure
from app.models.vulnerability import Vulnerability, CVSSSeverity, RiskPriority
from app.services.risk_engine import RiskEngineService

def test_case_1_critical_internet_facing():
    """
    Case 1: A critical vulnerability with a high EPSS score on an internet-facing
    production server should receive a high risk score.
    """
    asset = Asset(
        asset_id="AST-TEST-001",
        name="Production Edge Gateway",
        ip_address="198.51.100.1",
        operating_system="Ubuntu 22.04",
        asset_type=AssetType.SERVER,
        environment=Environment.PRODUCTION,
        business_criticality=BusinessCriticality.CRITICAL,
        internet_exposure=InternetExposure.INTERNET_FACING
    )
    vuln = Vulnerability(
        id=1,
        cve_id="CVE-2024-TEST1",
        title="Remote Code Execution",
        description="Critical test flaw",
        cvss_score=10.0,
        cvss_severity=CVSSSeverity.CRITICAL,
        affected_software="nginx",
        affected_version="1.24",
        asset_id=1,
        epss_score=0.95,
        kev_status=True,
        exploit_available=True
    )

    res = RiskEngineService.calculate_vulnerability_risk(vuln, asset)
    assert res["final_risk_score"] >= 80.0
    assert res["risk_level"] == "Critical"
    # Contributions should sum accurately to final risk score
    contrib_sum = round(sum(item.contribution for item in res["items"]), 2)
    assert abs(contrib_sum - res["final_risk_score"]) < 0.05

def test_case_2_low_isolated_asset():
    """
    Case 2: A vulnerability with low CVSS, low EPSS, and an isolated low-criticality asset
    should receive a lower risk score.
    """
    asset = Asset(
        asset_id="AST-TEST-002",
        name="Isolated Lab VM",
        ip_address="10.99.1.5",
        operating_system="Debian 11",
        asset_type=AssetType.WORKSTATION,
        environment=Environment.TESTING,
        business_criticality=BusinessCriticality.LOW,
        internet_exposure=InternetExposure.ISOLATED
    )
    vuln = Vulnerability(
        id=2,
        cve_id="CVE-2024-TEST2",
        title="Minor Info Disclosure",
        description="Low test flaw",
        cvss_score=2.0,
        cvss_severity=CVSSSeverity.LOW,
        affected_software="test-pkg",
        affected_version="0.1",
        asset_id=2,
        epss_score=0.01,
        kev_status=False,
        exploit_available=False
    )

    res = RiskEngineService.calculate_vulnerability_risk(vuln, asset)
    assert res["final_risk_score"] < 40.0
    assert res["risk_level"] == "Low"

def test_case_3_kev_increases_risk_score():
    """
    Case 3: A known exploited vulnerability should receive a higher risk score
    than an otherwise identical vulnerability without known exploitation.
    """
    asset = Asset(
        asset_id="AST-TEST-003",
        name="Internal App Node",
        ip_address="10.10.1.20",
        operating_system="RHEL 9",
        asset_type=AssetType.SERVER,
        environment=Environment.STAGING,
        business_criticality=BusinessCriticality.MEDIUM,
        internet_exposure=InternetExposure.INTERNAL
    )
    vuln_no_exploit = Vulnerability(
        id=3,
        cve_id="CVE-2024-TEST3A",
        title="Flaw Without Exploit",
        description="Identical base flaw",
        cvss_score=7.5,
        cvss_severity=CVSSSeverity.HIGH,
        affected_software="libtest",
        affected_version="1.0",
        asset_id=3,
        epss_score=0.10,
        kev_status=False,
        exploit_available=False
    )
    vuln_with_kev = Vulnerability(
        id=4,
        cve_id="CVE-2024-TEST3B",
        title="Flaw With KEV",
        description="Identical base flaw with KEV",
        cvss_score=7.5,
        cvss_severity=CVSSSeverity.HIGH,
        affected_software="libtest",
        affected_version="1.0",
        asset_id=3,
        epss_score=0.10,
        kev_status=True,
        exploit_available=True
    )

    res_no_exploit = RiskEngineService.calculate_vulnerability_risk(vuln_no_exploit, asset)
    res_with_kev = RiskEngineService.calculate_vulnerability_risk(vuln_with_kev, asset)

    assert res_with_kev["final_risk_score"] > res_no_exploit["final_risk_score"]
    # Exactly 10.0 difference corresponding to 0.10 weight * (100 - 0)
    assert round(res_with_kev["final_risk_score"] - res_no_exploit["final_risk_score"], 1) == 10.0

def test_case_4_invalid_cvss_rejected():
    """
    Case 4: Invalid CVSS values above 10 should be rejected.
    """
    with pytest.raises(ValueError):
        RiskEngineService.normalize_cvss(10.5)

    with pytest.raises(ValueError):
        RiskEngineService.normalize_cvss(-1.0)

def test_case_5_scores_bounded_0_to_100():
    """
    Case 5: Risk scores should always stay between 0 and 100.
    """
    for cvss in [0.0, 5.0, 10.0]:
        for epss in [0.0, 0.5, 1.0]:
            for crit in list(BusinessCriticality):
                for exp in list(InternetExposure):
                    for env in list(Environment):
                        asset = Asset(
                            asset_id="AST-BND",
                            name="Bound Test",
                            ip_address="10.0.0.1",
                            operating_system="OS",
                            asset_type=AssetType.SERVER,
                            environment=env,
                            business_criticality=crit,
                            internet_exposure=exp
                        )
                        vuln = Vulnerability(
                            id=99,
                            cve_id="CVE-BOUND",
                            title="Bound",
                            description="Test",
                            cvss_score=cvss,
                            cvss_severity=CVSSSeverity.MEDIUM,
                            affected_software="pkg",
                            affected_version="1",
                            asset_id=99,
                            epss_score=epss,
                            kev_status=True,
                            exploit_available=True
                        )
                        res = RiskEngineService.calculate_vulnerability_risk(vuln, asset)
                        assert 0.0 <= res["final_risk_score"] <= 100.0
