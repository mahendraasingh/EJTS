import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Server,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  SlidersHorizontal,
  Flame,
  Globe,
  Check,
  Zap,
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
import { useTheme } from '../contexts/ThemeContext';

export const Dashboard: React.FC = () => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [severityData, setSeverityData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topRisks, setTopRisks] = useState<Vulnerability[]>([]);
  const [assetDist, setAssetDist] = useState<any[]>([]);
  const [remediationProg, setRemediationProg] = useState<any | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CSV Ingestion States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadMessage({ type: 'error', text: 'Please upload a valid .csv file' });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const result = await api.importExport.uploadCsv(file);
      setUploadMessage({
        type: 'success',
        text: `Analysis complete: ${result.imported_count} vulnerabilities prioritized across ${result.imported_count} assets.`
      });
      await fetchDashboardData();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err?.response?.data?.detail || 'Failed to process CSV vulnerability feed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all vulnerability data and format everything back to 0?')) return;
    setIsUploading(true);
    try {
      await api.importExport.resetData();
      setUploadMessage({ type: 'success', text: 'All vulnerability and asset data reset to 0.' });
      await fetchDashboardData();
    } catch (err) {
      setUploadMessage({ type: 'error', text: 'Failed to reset workspace data.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const res = await api.importExport.seedDemo();
      setUploadMessage({
        type: 'success',
        text: `Demo scan loaded: ${res.imported_count} CVEs analyzed through the multi-factor prioritization engine.`
      });
      await fetchDashboardData();
    } catch (err) {
      setUploadMessage({ type: 'error', text: 'Failed to load demo vulnerability feed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenBreakdown = async (vulnId: number) => {
    try {
      const data = await api.risk.getBreakdown(vulnId);
      setSelectedBreakdown(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load breakdown', err);
    }
  };

  const totalVulnerabilities = summary?.total_vulnerabilities ?? 0;
  const hasData = totalVulnerabilities > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12 transition-colors">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#27272a]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Vulnerability Risk Prioritization Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time vulnerability risk scoring, CSV analysis, asset intelligence, and threat-guided triage
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121215] border border-[#27272a] hover:border-zinc-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {hasData && (
            <button
              onClick={handleResetData}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-all shadow-sm"
              title="Reset all vulnerabilities to 0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset to 0</span>
            </button>
          )}
        </div>
      </div>

      {/* CSV UPLOAD & ANALYSIS DROPZONE */}
      <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Dropzone area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-[#27272a] hover:border-cyan-500/50 bg-[#121215]/60 hover:bg-[#121215]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-sm font-bold text-zinc-100 text-center">
              {isUploading ? 'Analyzing CSV Vulnerability Data...' : 'Drop Vulnerability Scan CSV Here, or Click to Browse'}
            </div>
            <p className="text-xs text-zinc-400 text-center mt-1">
              Supports Nessus, Qualys, OpenVAS, Trivy, or custom CSV with CVE, CVSS, EPSS & Asset data
            </p>
          </div>

          {/* Quick Action Side Panel */}
          <div className="flex flex-row md:flex-col gap-2.5 w-full md:w-56 shrink-0">
            <a
              href="/api/import/sample-csv"
              download="vrpt_vulnerabilities_template.csv"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#121215] border border-[#27272a] hover:border-zinc-500 text-xs font-semibold text-zinc-200 hover:text-white transition-all text-center"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download CSV Template</span>
            </a>

            <button
              onClick={handleSeedDemo}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Load Demo Scan (12 CVEs)</span>
            </button>
          </div>
        </div>

        {/* Upload Status Banner */}
        {uploadMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              uploadMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {uploadMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
        )}
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Vulns */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Total CVEs</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {summary?.total_vulnerabilities ?? 0}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
            {hasData ? 'Active Ingested Scan' : 'Awaiting CSV Scan'}
          </div>
        </div>

        {/* Critical Risk */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-red-500/30 shadow-lg glow-critical flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-400 text-xs font-semibold">
            <span>Critical Priority</span>
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-black text-red-400 font-mono">
            {summary?.critical_vulnerabilities ?? 0}
          </div>
          <div className="text-[10px] text-red-400/80 mt-1 font-mono">
            Priority: Immediate Attention
          </div>
        </div>

        {/* High Risk */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-orange-500/20 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-400 text-xs font-semibold">
            <span>High Priority</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-orange-400 font-mono">
            {summary?.high_vulnerabilities ?? 0}
          </div>
          <div className="text-[10px] text-orange-400/80 mt-1 font-mono">
            Priority: High Escalation
          </div>
        </div>

        {/* Medium/Low Risk */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Medium / Low</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
            {(summary?.medium_vulnerabilities ?? 0) + (summary?.low_vulnerabilities ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
            Scheduled maintenance
          </div>
        </div>

        {/* Average Multi-Factor Risk Score */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Mean Risk Score</span>
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300 font-mono">
            {summary?.average_risk_score ?? 0} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
            Weighted Multi-Factor
          </div>
        </div>

        {/* Assets Monitored */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Target Assets</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {summary?.total_assets ?? 0}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 font-mono">
            Infrastructure nodes
          </div>
        </div>
      </div>

      {/* CONDITIONAL DISPLAY: ZERO STATE VS ANALYZED DATA */}
      {!hasData ? (
        /* ZERO STATE GUIDE */
        <div className="p-8 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-zinc-700 mx-auto flex items-center justify-center text-zinc-400 shadow-inner">
              <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Awaiting Vulnerability Scan Data</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              All metrics and prioritization models are currently formatted at <strong>0</strong>.
              Upload a vulnerability scan <code>.csv</code> file or click <strong>Load Demo Scan</strong> above to run real-time multi-factor prioritization and generate actionable risk analytics.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> 1. Threat Intel
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Combines CISA KEV exploitation records and EPSS probabilities.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> 2. Asset Context
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Incorporates business criticality, internet exposure, and environment tier.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a]">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> 3. Smart Formula
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Outputs an objective 0–100 score to guide risk prioritization.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MULTIPLE DIFFERENT OUTPUT DATA VIEWS */
        <>
          {/* ANALYTICS CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Priority Tier Distribution */}
            <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Prioritization Tier Breakdown
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">By Risk Score</span>
              </div>

              <div className="h-64 mt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #27272a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f4f4f5',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black font-mono text-white">
                    {summary?.total_vulnerabilities}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    Vulnerabilities
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#27272a]">
                {severityData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-zinc-400 text-[11px]">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-200">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Top Urgent Risks Ranked */}
            <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  Top Prioritized CVEs by Multi-Factor Risk Score
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Score (0–100)</span>
              </div>

              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topRisks.slice(0, 6).map((v) => ({
                      cve: v.cve_id,
                      score: v.risk_score,
                      cvss: v.cvss_score * 10,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="cve" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        border: '1px solid #27272a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f4f4f5',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="score" name="Multi-Factor Risk Score" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="cvss" name="CVSS Base (x10)" fill="#06b6d4" radius={[6, 6, 0, 0]} opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 text-right">
                <Link
                  to="/risk-prioritization"
                  className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View Full Prioritization Matrix <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* OUTPUT VIEW 3: PRIORITIZED VULNERABILITIES TABLE */}
          <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  Prioritized Vulnerability Queue
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sorted dynamically by calculated multi-factor risk score (highest risk first)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/vulnerabilities"
                  className="px-3 py-1.5 rounded-xl bg-[#121215] border border-[#27272a] hover:border-zinc-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  View All ({summary?.total_vulnerabilities})
                </Link>
                <a
                  href="/api/reports/export/csv"
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#27272a] text-zinc-400 font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">CVE ID</th>
                    <th className="py-2.5 px-3">Vulnerability Title</th>
                    <th className="py-2.5 px-3">Asset</th>
                    <th className="py-2.5 px-3">CVSS</th>
                    <th className="py-2.5 px-3">EPSS</th>
                    <th className="py-2.5 px-3">Threat Intel</th>
                    <th className="py-2.5 px-3">Risk Score</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {topRisks.map((vuln, index) => (
                    <tr key={vuln.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-zinc-500">
                        #{index + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        <Link to={`/vulnerabilities/${vuln.id}`} className="hover:underline">
                          {vuln.cve_id}
                        </Link>
                      </td>
                      <td className="py-3 px-3 font-medium text-zinc-200 max-w-xs truncate">
                        {vuln.title}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">
                        {vuln.asset?.name || 'Asset'}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold">
                        <span className={vuln.cvss_score >= 9.0 ? 'text-red-400' : vuln.cvss_score >= 7.0 ? 'text-orange-400' : 'text-zinc-300'}>
                          {vuln.cvss_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {(vuln.epss_score * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {vuln.kev_status && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold">
                              KEV
                            </span>
                          )}
                          {vuln.exploit_available && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono">
                              EXP
                            </span>
                          )}
                          {!vuln.kev_status && !vuln.exploit_available && (
                            <span className="text-zinc-600 font-mono text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className={vuln.risk_score >= 85 ? 'text-red-400' : vuln.risk_score >= 70 ? 'text-orange-400' : 'text-amber-400'}>
                            {vuln.risk_score.toFixed(1)}
                          </span>
                          <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                vuln.risk_score >= 85
                                  ? 'bg-red-500'
                                  : vuln.risk_score >= 70
                                  ? 'bg-orange-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${vuln.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge level={vuln.risk_priority} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenBreakdown(vuln.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#121215] border border-[#27272a] hover:border-cyan-500/50 text-[11px] text-cyan-400 hover:text-white transition-all"
                        >
                          Breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OUTPUT VIEW 4 & 5: ASSET IMPACT & REMEDIATION STATUS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Impact Breakdown */}
            <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Asset Blast Radius & Attack Surface
                </h3>
                <Link to="/assets" className="text-xs text-cyan-400 hover:underline">
                  All Assets &rarr;
                </Link>
              </div>

              <div className="space-y-3 mt-4">
                {assetDist.slice(0, 5).map((asset) => (
                  <div
                    key={asset.asset_id}
                    className="p-3 rounded-xl bg-[#121215] border border-[#27272a] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{asset.asset_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{asset.asset_id}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-red-400">
                          {asset.critical} Crit / {asset.high} High
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {asset.total} Total Vulns
                        </div>
                      </div>
                      <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${Math.min(100, ((asset.critical * 3 + asset.high) / 10) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Threat Intelligence & Exposure Insights */}
            <div className="p-5 rounded-2xl bg-[#09090b] border border-[#27272a] shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Threat Intelligence & Attack Surface
                  </h3>
                  <Link to="/risk-prioritization" className="text-xs text-cyan-400 hover:underline">
                    Prioritization Matrix &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-[11px] font-bold text-red-400">CISA KEV Weaponized</div>
                    <div className="text-xl font-black font-mono text-red-300 mt-1">
                      {topRisks.filter(v => v.kev_status).length} Active
                    </div>
                    <p className="text-[10px] text-red-400/80 mt-1">
                      Confirmed active exploitation in the wild.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[11px] font-bold text-amber-400">Public Exploit Available</div>
                    <div className="text-xl font-black font-mono text-amber-300 mt-1">
                      {topRisks.filter(v => v.exploit_available).length} Items
                    </div>
                    <p className="text-[10px] text-amber-400/80 mt-1">
                      Known PoC or exploit code published publicly.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#27272a] mt-3 text-xs text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Priority Recommendation:</strong> Triage top-ranked vulnerability (
                  <span className="text-cyan-400 font-mono">{topRisks[0]?.cve_id}</span>) immediately based on multi-factor blast radius.
                </div>
              </div>

              <div className="pt-4 border-t border-[#27272a] flex items-center justify-between mt-4">
                <span className="text-xs text-zinc-400">Multi-Factor Prioritization Model</span>
                <Link
                  to="/risk-prioritization"
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  Explore Risk Matrix <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Multi-factor Score Breakdown Modal */}
      {selectedBreakdown && (
        <RiskBreakdownModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          breakdown={selectedBreakdown}
        />
      )}
    </div>
  );
};
