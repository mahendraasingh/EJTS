import React, { useEffect, useState } from 'react';
import {
  FileBarChart2,
  Download,
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Server,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { KPISummary } from '../types';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await api.dashboard.getSummary();
        setSummary(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-3 border-b border-[#1a2744]">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          Executive Compliance & Security Risk Reports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export audit-ready risk analysis documents, compliance posture summaries, and remediation queues
        </p>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Executive Report Card */}
        <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] flex flex-col justify-between space-y-4 shadow-lg hover:border-sky-500/40 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Executive Security Assessment (PDF)</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Comprehensive executive briefing document featuring executive metrics, Top 10 prioritized findings,
              asset exposure breakdowns, and strategic mitigation recommendations formatted for leadership and compliance auditors.
            </p>
            <div className="space-y-1 text-[11px] text-slate-500 font-mono">
              <div>• Generated on-the-fly via ReportLab engine</div>
              <div>• Formatted for CISO, SOC Lead, and external compliance reviews</div>
            </div>
          </div>

          <a
            href={api.reports.exportPdfUrl}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Executive PDF Report
          </a>
        </div>

        {/* CSV Data Dump Card */}
        <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] flex flex-col justify-between space-y-4 shadow-lg hover:border-sky-500/40 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Raw Technical Risk Matrix (CSV)</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full dataset export containing all raw and calculated vulnerability fields: CVSS, EPSS, KEV status,
              Asset metadata, Normalized factors, calculated Risk Scores, and Remediation statuses.
            </p>
            <div className="space-y-1 text-[11px] text-slate-500 font-mono">
              <div>• Ready for Excel, PowerBI, Tableau, or Splunk ingestion</div>
              <div>• Complete multi-parameter vulnerability audit trail</div>
            </div>
          </div>

          <a
            href={api.reports.exportCsvUrl}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Export Complete CSV Data
          </a>
        </div>
      </div>

      {/* Report Preview Summary */}
      <div className="p-6 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-4">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" /> Current Executive Posture Metrics Summary
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-[#080d19] border border-[#172542]">
            <span className="text-[11px] text-slate-400 block">Total Vulnerabilities</span>
            <span className="text-2xl font-mono font-bold text-white mt-1 block">
              {summary?.total_vulnerabilities || 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080d19] border border-red-500/30">
            <span className="text-[11px] text-red-400 block">Critical Findings</span>
            <span className="text-2xl font-mono font-bold text-red-400 mt-1 block">
              {summary?.critical_vulnerabilities || 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080d19] border border-orange-500/30">
            <span className="text-[11px] text-orange-400 block">High Risk Findings</span>
            <span className="text-2xl font-mono font-bold text-orange-400 mt-1 block">
              {summary?.high_vulnerabilities || 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080d19] border border-emerald-500/30">
            <span className="text-[11px] text-emerald-400 block">Remediated & Verified</span>
            <span className="text-2xl font-mono font-bold text-emerald-400 mt-1 block">
              {summary?.remediated_vulnerabilities || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
