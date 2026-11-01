import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  UserCheck,
  ShieldCheck,
  Calendar,
  Filter,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { RemediationTask, Vulnerability, RemediationStatus, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

export const Remediation: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<RemediationTask[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    vulnerability_id: 1,
    description: '',
    priority: 'High' as 'Critical' | 'High' | 'Medium' | 'Low',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const fetchRemediation = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status_filter = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const [taskList, overdue, vulns] = await Promise.all([
        api.remediation.list(params),
        api.remediation.getOverdue(),
        api.vulnerabilities.list({ limit: 100 }),
      ]);
      setTasks(taskList);
      setOverdueTasks(overdue);
      setVulnerabilities(vulns);
      if (vulns.length > 0 && createForm.vulnerability_id === 1) {
        setCreateForm((prev) => ({ ...prev, vulnerability_id: vulns[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemediation();
  }, [statusFilter, priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.remediation.create({
        ...createForm,
        due_date: new Date(createForm.due_date).toISOString(),
      });
      setIsCreateModalOpen(false);
      fetchRemediation();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create remediation task');
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: RemediationStatus) => {
    try {
      await api.remediation.update(taskId, { status: newStatus });
      fetchRemediation();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update task status');
    }
  };

  const handleVerifyAndClose = async (taskId: number) => {
    try {
      await api.remediation.verifyAndClose(taskId);
      alert('Verification successful! Task and associated vulnerability officially verified & resolved.');
      fetchRemediation();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Verification failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1a2744]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Remediation & SLA Task Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign mitigation tasks, enforce SLA deadlines, and verify patched findings
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Remediation Task
          </button>
        )}
      </div>

      {/* Overdue Alert Banner */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-red-300">
              {overdueTasks.length} Remediation Tasks Currently Overdue SLA!
            </span>
            <p className="text-slate-400 leading-relaxed">
              These tasks have exceeded target remediation dates. Immediate escalation recommended.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Task Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Resolved">Resolved</option>
            <option value="Accepted Risk">Accepted Risk</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Task Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="font-mono text-slate-400">
          Total Tasks: <span className="text-white font-bold">{tasks.length}</span>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="rounded-2xl bg-[#0c1426] border border-[#1c2c4b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Task ID</th>
                <th className="py-3 px-4">Finding / CVE</th>
                <th className="py-3 px-4">Affected Host</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Target Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No remediation tasks found matching filter.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const isOverdue =
                    new Date(t.due_date) < new Date() &&
                    t.status !== 'Resolved' &&
                    t.status !== 'Accepted Risk';

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{t.task_id}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        <span className="font-bold text-sky-300">{t.cve_id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">{t.asset_name}</td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold ${
                            t.priority === 'Critical'
                              ? 'text-red-400'
                              : t.priority === 'High'
                              ? 'text-orange-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={isOverdue ? 'text-red-400 font-bold' : 'text-slate-300'}>
                            {new Date(t.due_date).toLocaleDateString()}
                          </span>
                          {isOverdue && (
                            <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user?.role !== 'VIEWER' && t.status !== 'Resolved' && (
                            <select
                              value={t.status}
                              onChange={(e) => handleStatusChange(t.id, e.target.value as RemediationStatus)}
                              className="bg-[#080d19] border border-[#1d2d4c] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Pending Verification">Pending Verification</option>
                              <option value="Accepted Risk">Accepted Risk</option>
                            </select>
                          )}

                          {user?.role !== 'VIEWER' && t.status === 'Pending Verification' && (
                            <button
                              onClick={() => handleVerifyAndClose(t.id)}
                              className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold transition-all flex items-center gap-1"
                              title="Officially verify fix and mark vulnerability as Resolved"
                            >
                              <ShieldCheck className="w-3 h-3" /> Verify & Close
                            </button>
                          )}

                          {t.status === 'Resolved' && (
                            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                            </span>
                          )}
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

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1427] border border-[#1e2e4f] rounded-2xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#1e2e4f] pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> Create Remediation Task
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Vulnerability Finding *</label>
                <select
                  value={createForm.vulnerability_id}
                  onChange={(e) => setCreateForm({ ...createForm, vulnerability_id: parseInt(e.target.value) })}
                  className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {vulnerabilities.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.cve_id} - {v.title} ({v.asset?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Description / Instructions *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Apply kernel security update and reboot node during scheduled maintenance window..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SLA Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Critical">Critical (24h SLA)</option>
                    <option value="High">High (7-day SLA)</option>
                    <option value="Medium">Medium (30-day SLA)</option>
                    <option value="Low">Low (60-day SLA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1e2e4f]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
