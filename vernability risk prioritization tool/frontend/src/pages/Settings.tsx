import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  User,
  History,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AuditLogItem } from '../types';

export const Settings: React.FC = () => {
  const { user } = useAuth();

  // Scoring Weights State
  const [weights, setWeights] = useState({
    cvss_weight: 0.30,
    epss_weight: 0.20,
    asset_criticality_weight: 0.15,
    internet_exposure_weight: 0.15,
    exploitation_weight: 0.10,
    environment_weight: 0.10,
  });
  const [configVersion, setConfigVersion] = useState('v1.0-default');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const conf = await api.risk.getConfig();
        setWeights({
          cvss_weight: conf.cvss_weight,
          epss_weight: conf.epss_weight,
          asset_criticality_weight: conf.asset_criticality_weight,
          internet_exposure_weight: conf.internet_exposure_weight,
          exploitation_weight: conf.exploitation_weight,
          environment_weight: conf.environment_weight,
        });
        setConfigVersion(conf.version_name);
      } catch (err) {
        console.error(err);
      }

      try {
        const logs = await api.audit.list();
        setAuditLogs(logs);
      } catch (err) {
        console.error(err);
      } finally {
        setAuditLoading(false);
      }
    };
    loadSettings();
  }, []);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValidWeightSum = Math.abs(totalWeight - 1.0) < 0.01;

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidWeightSum) {
      alert('Total weights must sum to exactly 1.0 (100%)');
      return;
    }
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      await api.risk.updateConfig(weights);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update scoring configuration');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setWeights({
      cvss_weight: 0.30,
      epss_weight: 0.20,
      asset_criticality_weight: 0.15,
      internet_exposure_weight: 0.15,
      exploitation_weight: 0.10,
      environment_weight: 0.10,
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-[#1a2744]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Platform Configuration & Audit Center
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customize risk calculation algorithms, inspect security audit trails, and manage operator roles
        </p>
      </div>

      {/* Section 1: Risk Engine Algorithm Configuration */}
      <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#182643] pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" /> Multi-Factor Risk Weighting Model ({configVersion})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Adjust how much each cybersecurity factor influences the calculated risk score (0 to 100)
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Total Sum:</span>
            <span
              className={`font-bold px-2.5 py-1 rounded ${
                isValidWeightSum
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}
            >
              {(totalWeight * 100).toFixed(0)}% / 100%
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Risk model updated and recalculated across all vulnerabilities!</span>
          </div>
        )}

        <form onSubmit={handleSaveWeights} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CVSS Weight */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">CVSS Base Severity Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.cvss_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={weights.cvss_weight}
                onChange={(e) => setWeights({ ...weights, cvss_weight: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Industry baseline vulnerability severity rating</p>
            </div>

            {/* EPSS Weight */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">EPSS Exploit Likelihood Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.epss_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={weights.epss_weight}
                onChange={(e) => setWeights({ ...weights, epss_weight: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Real-world statistical probability of wild exploitation</p>
            </div>

            {/* Asset Criticality */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Asset Business Criticality Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.asset_criticality_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.05"
                value={weights.asset_criticality_weight}
                onChange={(e) =>
                  setWeights({ ...weights, asset_criticality_weight: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Impact factor if target host is compromised</p>
            </div>

            {/* Internet Exposure */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Internet Exposure Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.internet_exposure_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.05"
                value={weights.internet_exposure_weight}
                onChange={(e) =>
                  setWeights({ ...weights, internet_exposure_weight: parseFloat(e.target.value) })
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">External vs internal attack surface reachability</p>
            </div>

            {/* Threat Exploitation Status */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Exploit Threat Intel Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.exploitation_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.05"
                value={weights.exploitation_weight}
                onChange={(e) => setWeights({ ...weights, exploitation_weight: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">CISA KEV listing and public exploit availability</p>
            </div>

            {/* Environment Tier */}
            <div className="p-3.5 bg-[#090f1d] border border-[#182643] rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-200">Environment Tier Weight</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(weights.environment_weight * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.05"
                value={weights.environment_weight}
                onChange={(e) => setWeights({ ...weights, environment_weight: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">Production vs Staging vs Development tier</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#182643]">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default Formula (v1.0)
            </button>

            {user?.role === 'ADMIN' ? (
              <button
                type="submit"
                disabled={!isValidWeightSum || saveLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                {saveLoading ? 'Recalculating System...' : 'Save & Re-evaluate Risk Scores'}
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">Only ADMIN role can modify scoring weights.</span>
            )}
          </div>
        </form>
      </div>

      {/* Section 2: Audit Trail Log */}
      <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-4">
        <div className="flex items-center justify-between border-b border-[#182643] pb-3">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" /> Security Audit Log & Compliance Trail
          </h2>
          <span className="text-xs font-mono text-slate-400">Immutable Event Telemetry</span>
        </div>

        <div className="overflow-x-auto border border-[#1a2744] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase font-mono">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542] font-mono">
              {auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 font-bold">{log.username}</td>
                  <td className="py-2.5 px-3 text-sky-400">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-300">{log.entity_type}</td>
                  <td className="py-2.5 px-3 text-slate-400">{log.entity_id || '-'}</td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={log.change_metadata}>
                    {log.change_metadata || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
