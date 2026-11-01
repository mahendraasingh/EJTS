import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Flame,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { Vulnerability, RiskPriority, RiskBreakdown } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBreakdownModal } from '../components/risk/RiskBreakdownModal';
import { useAuth } from '../contexts/AuthContext';

export const RiskPrioritization: React.FC = () => {
  const { user } = useAuth();
  const [top5Immediate, setTop5Immediate] = useState<Vulnerability[]>([]);
  const [rankedItems, setRankedItems] = useState<{ rank: number; vulnerability: Vulnerability }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('');

  // Modal
  const [selectedBreakdown, setSelectedBreakdown] = useState<RiskBreakdown | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPrioritized = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (riskFilter) params.risk_level = riskFilter;

      const res = await api.risk.getPrioritized(params);
      setTop5Immediate(res.top_immediate_attention || []);
      setRankedItems(res.items || []);
      setTotalCount(res.total_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrioritized();
  }, [search, riskFilter]);

  const handleRecalculateAll = async () => {
    setRecalcLoading(true);
    try {
      await api.risk.recalculateAll();
      await fetchPrioritized();
    } catch (err) {
      console.error(err);
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleOpenBreakdown = async (id: number) => {
    try {
      const b = await api.risk.getBreakdown(id);
      setSelectedBreakdown(b);
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1a2744]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Intelligent Risk Prioritization Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic algorithmic ranking combining CVSS severity, EPSS exploit odds, asset exposure, and threat intel
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'VIEWER' && (
            <button
              onClick={handleRecalculateAll}
              disabled={recalcLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-[#1e2e4f] text-xs font-semibold text-slate-200 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalcLoading ? 'animate-spin text-sky-400' : ''}`} />
              Recalculate All Scores
            </button>
          )}

          <a
            href={api.reports.exportCsvUrl}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Priority CSV
          </a>
        </div>
      </div>

      {/* TOP 5 IMMEDIATE ATTENTION HIGHLIGHT SECTION */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-red-400 tracking-wider uppercase">
          <Flame className="w-4 h-4 animate-bounce text-red-500" />
          <span>Top 5 Vulnerabilities That Require Immediate Attention</span>
          <span className="text-[10px] text-slate-500 font-mono normal-case">
            (Dynamically evaluated highest active risk)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {top5Immediate.map((vuln, idx) => (
            <div
              key={vuln.id}
              className="p-4 rounded-2xl bg-gradient-to-b from-[#1c1018] to-[#0c1426] border border-red-500/40 hover:border-red-500/70 transition-all flex flex-col justify-between shadow-lg shadow-red-950/20 group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-red-400 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded">
                    RANK #{idx + 1}
                  </span>
                  <span className="text-lg font-mono font-extrabold text-white">{vuln.risk_score.toFixed(1)}</span>
                </div>

                <div className="font-mono text-xs font-bold text-sky-400 group-hover:underline">
                  {vuln.cve_id}
                </div>
                <div className="text-xs font-semibold text-slate-100 truncate mt-0.5" title={vuln.title}>
                  {vuln.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">
                  Host: <span className="text-slate-300 font-medium">{vuln.asset?.name}</span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-red-500/20 flex items-center justify-between">
                <span className="text-[10px] text-red-300/80 font-mono">
                  {vuln.kev_status ? 'CISA KEV ACTIVE' : `EPSS ${(vuln.epss_score * 100).toFixed(0)}%`}
                </span>
                <button
                  onClick={() => handleOpenBreakdown(vuln.id)}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                >
                  Breakdown →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Prioritized Table */}
      <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-4">
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by CVE ID or vulnerability name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Risk Categories</option>
              <option value="Critical">Critical (80–100)</option>
              <option value="High">High (60–79.99)</option>
              <option value="Medium">Medium (40–59.99)</option>
              <option value="Low">Low (0–39.99)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-[#1a2744] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">CVE ID</th>
                <th className="py-3 px-3">Vulnerability Title</th>
                <th className="py-3 px-3">Affected Asset</th>
                <th className="py-3 px-3">CVSS</th>
                <th className="py-3 px-3">EPSS</th>
                <th className="py-3 px-3">KEV</th>
                <th className="py-3 px-3">Risk Score</th>
                <th className="py-3 px-3">Risk Level</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {rankedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    No prioritized findings matching criteria.
                  </td>
                </tr>
              ) : (
                rankedItems.map(({ rank, vulnerability: v }) => {
                  const isTop10 = rank <= 10;
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isTop10 ? 'bg-red-500/[0.03]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            rank <= 5
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : rank <= 10
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          #{rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sky-400">
                        <Link to={`/vulnerabilities/${v.id}`} className="hover:underline">
                          {v.cve_id}
                        </Link>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate" title={v.title}>
                        {v.title}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{v.asset?.name || 'N/A'}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{v.cvss_score.toFixed(1)}</td>
                      <td className="py-3 px-3 font-mono text-sky-300">{(v.epss_score * 100).toFixed(1)}%</td>
                      <td className="py-3 px-3">
                        {v.kev_status ? (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 text-[10px]">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-white text-sm">
                        {v.risk_score.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge level={v.risk_priority} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={v.remediation_status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBreakdown(v.id)}
                            className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-semibold"
                          >
                            Breakdown
                          </button>
                          <Link
                            to={`/vulnerabilities/${v.id}`}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Inspect Finding"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Breakdown Modal */}
      <RiskBreakdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        breakdown={selectedBreakdown}
      />
    </div>
  );
};
