import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class ExternalIntelligenceService:
    """
    Threat Intelligence integration with caching and resilient fallbacks:
    - FIRST.org EPSS API
    - CISA Known Exploited Vulnerabilities (KEV) Catalog
    - NVD (National Vulnerability Database)
    """

    # In-memory intelligence caches
    _epss_cache: Dict[str, float] = {}
    _kev_cache: Dict[str, bool] = {}
    _nvd_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    async def fetch_epss_score(cls, cve_id: str) -> Optional[float]:
        cve_upper = cve_id.strip().upper()
        if cve_upper in cls._epss_cache:
            return cls._epss_cache[cve_upper]

        try:
            url = f"{settings.FIRST_EPSS_API_URL}?cve={cve_upper}"
            async with httpx.AsyncClient(timeout=3.5) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    data_items = data.get("data", [])
                    if data_items:
                        score = float(data_items[0].get("epss", 0.0))
                        cls._epss_cache[cve_upper] = score
                        return score
        except Exception as e:
            logger.warning(f"Unable to query FIRST EPSS API for {cve_id}: {e}")

        return None

    @classmethod
    async def check_cisa_kev(cls, cve_id: str) -> Optional[bool]:
        cve_upper = cve_id.strip().upper()
        if cve_upper in cls._kev_cache:
            return cls._kev_cache[cve_upper]

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(settings.CISA_KEV_API_URL)
                if resp.status_code == 200:
                    data = resp.json()
                    vulnerabilities = data.get("vulnerabilities", [])
                    is_in_kev = any(v.get("cveID", "").upper() == cve_upper for v in vulnerabilities)
                    cls._kev_cache[cve_upper] = is_in_kev
                    return is_in_kev
        except Exception as e:
            logger.warning(f"Unable to query CISA KEV for {cve_id}: {e}")

        return None

    @classmethod
    async def enrich_cve(cls, cve_id: str) -> Dict[str, Any]:
        """
        Enriches a CVE with EPSS score and CISA KEV status, with local safe fallbacks.
        """
        epss = await cls.fetch_epss_score(cve_id)
        kev = await cls.check_cisa_kev(cve_id)
        return {
            "cve_id": cve_id,
            "epss_score": epss if epss is not None else 0.05,
            "kev_status": kev if kev is not None else False,
            "source": "FIRST EPSS & CISA KEV (Live/Cached)",
            "is_enriched": (epss is not None or kev is not None)
        }
