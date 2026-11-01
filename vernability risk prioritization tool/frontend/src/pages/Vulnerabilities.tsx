import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Upload,
  ExternalLink,
  Trash2,
  Edit,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { Vulnerability, Asset, CVSSSeverity, RiskPriority, RemediationStatus, RiskBreakdown } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBreakdownModal } from '../components/risk/RiskBreakdownModal';
import { useAuth } from '../contexts/AuthContext';

export const Vulnerabilities: React.FC = () => {
  const { user } = useAuth();
  const { globalSearch } = useOutletContext<{ globalSearch: string }>() || { globalSearch: '' };

  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [assetFilter, setAssetFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Breakdown Modal
  const [selectedBreakdown, setSelectedBreakdown] = useState<RiskBreakdown | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    cve_id: '',
    title: '',
    description: '',
    cvss_score: 7.5,
    cvss_severity: 'High' as CVSSSeverity,
    cwe_id: 'CWE-89',
    affected_software: '',
    affected_version: '',
    asset_id: 1,
    epss_score: 0.15,
    kev_status: false,
    exploit_available: false,
    remediation_recommendation: '',
  });

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Delete Confirmation
  const [vulnToDelete, setVulnToDelete] = useState<Vulnerability | null>(null);

  const fetchVulnerabilities = async () => {
    setLoading(true);
    try {
      const activeSearch = searchTerm || globalSearch;
      const params: any = {
        sort_by: 'risk_score',
        sort_dir: sortDir,
      };
      if (activeSearch) params.search = activeSearch;
      if (severityFilter) params.severity = severityFilter;
      if (riskFilter) params.risk_priority = riskFilter;
      if (assetFilter) params.asset_id = parseInt(assetFilter);
      if (statusFilter) params.remediation_status = statusFilter;

      const [vulns, asts] = await Promise.all([
        api.vulnerabilities.list(params),
        api.assets.list(),
      ]);
      setVulnerabilities(vulns);
      setAssets(asts);
      if (asts.length > 0 && addForm.asset_id === 1) {
        setAddForm((prev) => ({ ...prev, asset_id: asts[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulnerabilities();
  }, [searchTerm, globalSearch, severityFilter, riskFilter, assetFilter, statusFilter, sortDir]);

  const handleOpenBreakdown = async (id: number) => {
    try {
      const b = await api.risk.getBreakdown(id);
      setSelectedBreakdown(b);
      setIsBreakdownOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.vulnerabilities.create(addForm);
      setIsAddModalOpen(false);
      fetchVulnerabilities();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create vulnerability');
    }
  };

  const handleDelete = async () => {
    if (!vulnToDelete) return;
    try {
      await api.vulnerabilities.delete(vulnToDelete.id);
      setVulnToDelete(null);
      fetchVulnerabilities();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete vulnerability');
    }
  };

  const handlePreviewFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    setImportResult(null);
    try {
      const prev = await api.importExport.previewCsv(file);
      setImportPreview(prev);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to parse CSV preview');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const res = await api.importExport.uploadCsv(importFile);
      setImportResult(res);
      fetchVulnerabilities();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1a2744]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Vulnerability Inventory & Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, analyze, and manage vulnerabilities across your infrastructure
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportPreview(null);
              setImportResult(null);
              setImportFile(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 border border-[#1e2e4f] text-xs font-semibold text-slate-200 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            Import CSV
          </button>

          {user?.role !== 'VIEWER' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Finding
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search CVE, Title, Package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All CVSS Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Risk Priority Filter */}
          <div>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Risk Priorities</option>
              <option value="Critical">Critical Risk (≥80)</option>
              <option value="High">High Risk (60-79)</option>
              <option value="Medium">Medium Risk (40-59)</option>
              <option value="Low">Low Risk (&lt;40)</option>
            </select>
          </div>

          {/* Asset Filter */}
          <div>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500 truncate"
            >
              <option value="">All Assets</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Resolved">Resolved</option>
              <option value="Accepted Risk">Accepted Risk</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#172542] text-xs text-slate-400">
          <div>
            Showing <span className="font-mono font-bold text-slate-200">{vulnerabilities.length}</span> security findings
          </div>
          <button
            onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 text-slate-300 hover:text-sky-400 font-mono text-[11px]"
          >
            <ArrowUpDown className="w-3 h-3" />
            Sort Score: {sortDir.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Vulnerabilities Table */}
      <div className="rounded-2xl bg-[#0c1426] border border-[#1c2c4b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">CVE ID</th>
                <th className="py-3 px-4">Vulnerability Title</th>
                <th className="py-3 px-4">Software / Version</th>
                <th className="py-3 px-4">Target Asset</th>
                <th className="py-3 px-4">CVSS</th>
                <th className="py-3 px-4">EPSS</th>
                <th className="py-3 px-4">KEV</th>
                <th className="py-3 px-4">Calculated Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No matching vulnerabilities found with current filters.
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                      <Link to={`/vulnerabilities/${v.id}`} className="hover:underline">
                        {v.cve_id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200 max-w-xs truncate" title={v.title}>
                      <Link to={`/vulnerabilities/${v.id}`} className="hover:text-sky-300">
                        {v.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="text-slate-200">{v.affected_software}</span>{' '}
                      <span className="text-slate-500">v{v.affected_version}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {v.asset?.name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{v.cvss_score.toFixed(1)}</td>
                    <td className="py-3.5 px-4 font-mono text-sky-300">{(v.epss_score * 100).toFixed(1)}%</td>
                    <td className="py-3.5 px-4">
                      {v.kev_status ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 text-[10px]">
                          CISA KEV
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge level={v.risk_priority} score={v.risk_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={v.remediation_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenBreakdown(v.id)}
                          className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-medium transition-all"
                        >
                          Breakdown
                        </button>
                        <Link
                          to={`/vulnerabilities/${v.id}`}
                          className="p-1 text-slate-400 hover:text-white"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {user?.role !== 'VIEWER' && (
                          <button
                            onClick={() => setVulnToDelete(v)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vulnerability Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0c1427] border border-[#1e2e4f] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2e4f] bg-[#090f1d]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-400" /> Ingest Vulnerability Finding
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CVE ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CVE-2024-3094"
                    value={addForm.cve_id}
                    onChange={(e) => setAddForm({ ...addForm, cve_id: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Asset *</label>
                  <select
                    value={addForm.asset_id}
                    onChange={(e) => setAddForm({ ...addForm, asset_id: parseInt(e.target.value) })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.environment})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vulnerability Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote Code Execution via Buffer Overflow"
                  value={addForm.title}
                  onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Detailed description of attack vector and flaw mechanics..."
                  className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Affected Software</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nginx"
                    value={addForm.affected_software}
                    onChange={(e) => setAddForm({ ...addForm, affected_software: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Affected Version</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1.24.0"
                    value={addForm.affected_version}
                    onChange={(e) => setAddForm({ ...addForm, affected_version: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CVSS Base (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={addForm.cvss_score}
                    onChange={(e) => setAddForm({ ...addForm, cvss_score: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">EPSS Probability (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={addForm.epss_score}
                    onChange={(e) => setAddForm({ ...addForm, epss_score: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CWE ID</label>
                  <input
                    type="text"
                    value={addForm.cwe_id}
                    onChange={(e) => setAddForm({ ...addForm, cwe_id: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.kev_status}
                    onChange={(e) => setAddForm({ ...addForm, kev_status: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Listed on CISA KEV (Known Exploited)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.exploit_available}
                    onChange={(e) => setAddForm({ ...addForm, exploit_available: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>Public Exploit Available</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Remediation Recommendation</label>
                <input
                  type="text"
                  placeholder="e.g. Upgrade package or apply official security hotfix"
                  value={addForm.remediation_recommendation}
                  onChange={(e) => setAddForm({ ...addForm, remediation_recommendation: e.target.value })}
                  className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#1e2e4f]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20"
                >
                  Evaluate & Save Finding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0c1427] border border-[#1e2e4f] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2e4f] bg-[#090f1d]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">Batch Vulnerability CSV Import</h3>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-950/20 border border-sky-800/30 text-xs">
                <span className="text-sky-300">Supported columns: CVE, Title, CVSS, EPSS, Asset, OS, Software, KEV</span>
                <a
                  href={api.importExport.sampleCsvUrl}
                  download="vrpt_sample_vulnerabilities.csv"
                  className="text-xs text-sky-400 hover:underline font-semibold"
                >
                  Download Sample CSV
                </a>
              </div>

              <div className="border-2 border-dashed border-[#1e2e4f] hover:border-sky-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#080d19]">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handlePreviewFile}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    {importFile ? importFile.name : 'Click to select CSV scan file'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Parses, validates, and auto-calculates risk scores</p>
                </label>
              </div>

              {/* Preview Box */}
              {importPreview && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">File Validation Summary</span>
                    <div className="flex gap-3">
                      <span className="text-emerald-400 font-mono">Valid: {importPreview.valid_count}</span>
                      <span className="text-red-400 font-mono">Invalid: {importPreview.invalid_count}</span>
                    </div>
                  </div>

                  {importPreview.invalid_rows?.length > 0 && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-1">
                      <div className="font-bold">Errors in uploaded CSV:</div>
                      {importPreview.invalid_rows.map((inv: any, i: number) => (
                        <div key={i} className="text-[11px]">
                          Row {inv.row_number}: {inv.errors?.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto border border-[#1e2e4f] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#090f1d] text-slate-400 font-mono">
                        <tr>
                          <th className="p-2">Row</th>
                          <th className="p-2">CVE</th>
                          <th className="p-2">Title</th>
                          <th className="p-2">Asset</th>
                          <th className="p-2">CVSS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#182643]">
                        {importPreview.preview_valid?.map((r: any) => (
                          <tr key={r.row_number}>
                            <td className="p-2 font-mono text-slate-500">#{r.row_number}</td>
                            <td className="p-2 font-mono text-sky-400">{r.cve_id}</td>
                            <td className="p-2 truncate max-w-xs">{r.title}</td>
                            <td className="p-2">{r.asset_name}</td>
                            <td className="p-2 font-mono">{r.cvss_score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  Import completed! Imported {importResult.imported_count} records. Rejected {importResult.rejected_count}.
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#1e2e4f] bg-[#090f1d] flex justify-end gap-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              {importPreview && importPreview.valid_count > 0 && !importResult && (
                <button
                  onClick={handleConfirmImport}
                  disabled={importLoading}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {importLoading ? 'Importing & Scoring...' : `Confirm Import (${importPreview.valid_count} Records)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {vulnToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1427] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Delete Vulnerability Finding?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete finding{' '}
              <span className="font-mono text-sky-400 font-bold">{vulnToDelete.cve_id}</span> ({vulnToDelete.title})?
              This will remove its historical risk records and associated remediation tasks.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVulnToDelete(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Breakdown Modal */}
      <RiskBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        breakdown={selectedBreakdown}
      />
    </div>
  );
};
