import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Server,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '../services/api';
import { KPISummary, Vulnerability, RiskBreakdown } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBreakdownModal } from '../components/risk/RiskBreakdownModal';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topRisks, setTopRisks] = useState<Vulnerability[]>([]);
  const [assetDist, setAssetDist] = useState<any[]>([]);
  const [remediationProg, setRemediationProg] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Breakdown modal state
  const [selectedBreakdown, setSelectedBreakdown] = useState<RiskBreakdown | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sum, sev, tr, top, ast, rem, act] = await Promise.all([
        api.dashboard.getSummary(),
        api.dashboard.getSeverityDistribution(),
        api.dashboard.getRiskTrends(),
        api.dashboard.getTopRisks(10),
        api.dashboard.getAssetDistribution(),
        api.dashboard.getRemediationProgress(),
        api.dashboard.getRecentActivities(),
      ]);

      setSummary(sum);
      setSeverityData(sev);
      setTrendData(tr);
      setTopRisks(top);
      setAssetDist(ast);
      setRemediationProg(rem);
      setActivities(act);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenBreakdown = async (vulnId: number) => {
    try {
      const data = await api.risk.getBreakdown(vulnId);
      setSelectedBreakdown(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load breakdown', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1a2744]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Security Risk Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time vulnerability exposure, multi-factor risk scoring, and remediation metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-[#1e2e4f] text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            Refresh Telemetry
          </button>
          <Link
            to="/risk-prioritization"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
          >
            View Priority Queue
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Vulns */}
        <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Findings</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {summary?.total_vulnerabilities || 0}
            </span>
            <span className="text-[10px] text-slate-400">across org</span>
          </div>
          <div className="text-[11px] text-sky-400 font-mono mt-1">Avg Score: {summary?.average_risk_score || 0}</div>
        </div>

        {/* Critical Vulns */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a0f18] to-[#0c1426] border border-red-500/30 relative overflow-hidden shadow-sm shadow-red-500/10">
          <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Risk</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-red-400">
              {summary?.critical_vulnerabilities || 0}
            </span>
            <span className="text-[10px] text-red-300/80">score ≥ 80</span>
          </div>
          <div className="text-[11px] text-red-400/80 font-mono mt-1">Immediate action required</div>
        </div>

        {/* High Risk */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c130d] to-[#0c1426] border border-orange-500/30 relative overflow-hidden">
          <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">High Risk</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-orange-400">
              {summary?.high_vulnerabilities || 0}
            </span>
            <span className="text-[10px] text-orange-300/80">score 60–79</span>
          </div>
          <div className="text-[11px] text-orange-400/80 font-mono mt-1">SLA 7 days target</div>
        </div>

        {/* Medium & Low */}
        <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Medium / Low</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
              {(summary?.medium_vulnerabilities || 0) + (summary?.low_vulnerabilities || 0)}
            </span>
            <span className="text-[10px] text-slate-400">
              ({summary?.medium_vulnerabilities} Med / {summary?.low_vulnerabilities} Low)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">Standard patch window</div>
        </div>

        {/* Total Assets */}
        <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monitored Assets</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-400">
              {summary?.total_assets || 0}
            </span>
            <span className="text-[10px] text-slate-400">endpoints & servers</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            <Link to="/assets" className="text-sky-400 hover:underline">View inventory →</Link>
          </div>
        </div>

        {/* Open Vulnerabilities */}
        <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Active Exposure</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400">
              {summary?.open_vulnerabilities || 0}
            </span>
            <span className="text-[10px] text-slate-400">open tickets</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">In progress & pending</div>
        </div>

        {/* Remediated */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0b1c15] to-[#0c1426] border border-emerald-500/30 relative overflow-hidden">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Remediated</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              {summary?.remediated_vulnerabilities || 0}
            </span>
            <span className="text-[10px] text-emerald-300/80">closed / verified</span>
          </div>
          <div className="text-[11px] text-emerald-400/80 font-mono mt-1">
            {remediationProg?.completion_rate_percentage || 0}% resolution rate
          </div>
        </div>

        {/* Threat Intelligence Feed status */}
        <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] relative overflow-hidden">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Threat Feeds</div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-slate-200">FIRST & CISA</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-2">EPSS v3 + KEV Catalog Sync</div>
        </div>
      </div>

      {/* Row 2: Charts (Severity Distribution & Risk Trends) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Pie Chart */}
        <div className="p-5 rounded-2xl bg-[#0c1426] border border-[#1c2c4b]">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
            Calculated Risk Distribution
          </h2>
          <p className="text-xs text-slate-400 mb-4">Multi-factor priority classification</p>

          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0c1426" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090f1d', borderColor: '#1e2e4f', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#172542]">
            {severityData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Trend Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0c1426] border border-[#1c2c4b]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Risk Posture Trend (7-Day Evolution)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Chronological severity progression</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Critical
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> High
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#16233d" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090f1d', borderColor: '#1e2e4f', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCrit)" />
                <Area type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorHigh)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Top 10 Riskiest Vulnerabilities Table */}
      <div className="p-5 rounded-2xl bg-[#0c1426] border border-[#1c2c4b]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Top 10 Riskiest Vulnerabilities (Calculated Priority)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked dynamically by the VRPT Multi-Factor Scoring Engine
            </p>
          </div>
          <Link
            to="/vulnerabilities"
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            View all findings →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">CVE ID</th>
                <th className="py-3 px-3">Vulnerability Title</th>
                <th className="py-3 px-3">Asset</th>
                <th className="py-3 px-3">CVSS</th>
                <th className="py-3 px-3">EPSS</th>
                <th className="py-3 px-3">KEV</th>
                <th className="py-3 px-3">Risk Score</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {topRisks.map((v, idx) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-3 font-mono font-bold text-sky-400">{v.cve_id}</td>
                  <td className="py-3 px-3 font-medium text-slate-200 max-w-xs truncate" title={v.title}>
                    {v.title}
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium">
                    {v.asset?.name || 'N/A'}
                  </td>
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
                  <td className="py-3 px-3">
                    <RiskBadge level={v.risk_priority} score={v.risk_score} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={v.remediation_status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenBreakdown(v.id)}
                        className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-medium transition-all"
                      >
                        Breakdown
                      </button>
                      <Link
                        to={`/vulnerabilities/${v.id}`}
                        className="p-1 text-slate-400 hover:text-white"
                        title="View details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Asset Vulnerability Distribution & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vulnerabilities by Asset Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0c1426] border border-[#1c2c4b]">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
            Vulnerabilities by Critical Asset
          </h2>
          <p className="text-xs text-slate-400 mb-4">Highest exposed systems requiring mitigation</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetDist} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16233d" />
                <XAxis dataKey="asset_name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090f1d', borderColor: '#1e2e4f', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="critical" name="Critical" fill="#ef4444" stackId="a" />
                <Bar dataKey="high" name="High" fill="#f97316" stackId="a" />
                <Bar dataKey="medium" name="Medium" fill="#eab308" stackId="a" />
                <Bar dataKey="low" name="Low" fill="#22c55e" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="p-5 rounded-2xl bg-[#0c1426] border border-[#1c2c4b]">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
            Recent SecOps Activity
          </h2>
          <p className="text-xs text-slate-400 mb-4">Real-time audit telemetry</p>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="text-xs text-slate-500 py-6 text-center">No recent activities.</div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-[#090f1d] border border-[#182643] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{act.title}</span>
                    <span className="text-[10px] font-mono text-slate-500">{act.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{act.description}</p>
                </div>
              ))
            )}
          </div>
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
