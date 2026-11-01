import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Server,
  ShieldAlert,
  Globe,
  Layers,
  Activity,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, Vulnerability } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAssetData = async () => {
      setLoading(true);
      try {
        const res = await api.assets.get(parseInt(id));
        setAsset(res.asset);
        setVulnerabilities(res.vulnerabilities || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssetData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400 text-xs">
        Loading asset profile...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-8 text-center text-slate-400">
        Asset not found.{' '}
        <Link to="/assets" className="text-sky-400 hover:underline">
          Return to inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-3 border-b border-[#1a2744]">
        <Link
          to="/assets"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset Inventory
        </Link>
      </div>

      {/* Asset Overview Card */}
      <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                {asset.asset_id}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {asset.asset_type}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  asset.environment === 'Production'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-300'
                }`}
              >
                {asset.environment}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{asset.name}</h1>
            <p className="text-xs font-mono text-slate-400">{asset.ip_address} • {asset.operating_system}</p>
          </div>

          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Linked CVEs</div>
            <div className="text-3xl font-extrabold font-mono text-red-400">{vulnerabilities.length}</div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#182643] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Criticality Tier:</span>
            <span className="font-bold text-slate-200">{asset.business_criticality}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Exposure:</span>
            <span className="font-bold text-slate-200">{asset.internet_exposure}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Owner / Department:</span>
            <span className="font-bold text-slate-200">{asset.owner} ({asset.department})</span>
          </div>
          <div>
            <span className="text-slate-500 block">Deployment Location:</span>
            <span className="font-bold text-slate-200">{asset.location}</span>
          </div>
        </div>
      </div>

      {/* Vulnerabilities Associated with Asset */}
      <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-4">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" /> Active Security Findings on this Asset ({vulnerabilities.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-3">CVE ID</th>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Package</th>
                <th className="py-3 px-3">CVSS</th>
                <th className="py-3 px-3">EPSS</th>
                <th className="py-3 px-3">KEV</th>
                <th className="py-3 px-3">Calculated Risk</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No open vulnerabilities identified on this asset.
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-sky-400">
                      <Link to={`/vulnerabilities/${v.id}`} className="hover:underline">
                        {v.cve_id}
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate">{v.title}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {v.affected_software} <span className="text-slate-500">v{v.affected_version}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{v.cvss_score.toFixed(1)}</td>
                    <td className="py-3 px-3 font-mono text-sky-300">{(v.epss_score * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3">
                      {v.kev_status ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 text-[10px]">
                          KEV
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <RiskBadge level={v.risk_priority} score={v.risk_score} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={v.remediation_status} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/vulnerabilities/${v.id}`}
                        className="px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
