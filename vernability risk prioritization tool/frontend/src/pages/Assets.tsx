import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Edit,
  Globe,
  Shield,
  Layers,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Asset, AssetType, Environment, BusinessCriticality, InternetExposure } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [critFilter, setCritFilter] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState({
    asset_id: '',
    name: '',
    ip_address: '',
    operating_system: '',
    asset_type: 'Server' as AssetType,
    environment: 'Production' as Environment,
    business_criticality: 'High' as BusinessCriticality,
    internet_exposure: 'Internal' as InternetExposure,
    owner: 'Platform Team',
    department: 'Engineering',
    location: 'AWS us-east-1',
  });

  // Delete modal
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.asset_type = typeFilter;
      if (envFilter) params.environment = envFilter;
      if (critFilter) params.criticality = critFilter;

      const data = await api.assets.list(params);
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, typeFilter, envFilter, critFilter]);

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setAssetForm({
      asset_id: `AST-NEW-${Math.floor(Math.random() * 900) + 100}`,
      name: '',
      ip_address: '10.100.1.',
      operating_system: 'Linux Ubuntu 22.04 LTS',
      asset_type: 'Server',
      environment: 'Production',
      business_criticality: 'High',
      internet_exposure: 'Internal',
      owner: 'SecOps',
      department: 'Infrastructure',
      location: 'Primary Cloud',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Asset) => {
    setEditingAsset(a);
    setAssetForm({
      asset_id: a.asset_id,
      name: a.name,
      ip_address: a.ip_address,
      operating_system: a.operating_system,
      asset_type: a.asset_type,
      environment: a.environment,
      business_criticality: a.business_criticality,
      internet_exposure: a.internet_exposure,
      owner: a.owner,
      department: a.department,
      location: a.location,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await api.assets.update(editingAsset.id, assetForm);
      } else {
        await api.assets.create(assetForm);
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Asset save failed');
    }
  };

  const handleDelete = async () => {
    if (!assetToDelete) return;
    try {
      await api.assets.delete(assetToDelete.id);
      setAssetToDelete(null);
      fetchAssets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Asset deletion failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1a2744]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Asset Inventory & Attack Surface
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track business criticality, internet exposure tiers, and asset vulnerability clusters
          </p>
        </div>

        {user?.role !== 'VIEWER' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Enroll Asset
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-[#0c1426] border border-[#1c2c4b] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Hostname, Asset ID, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Asset Types</option>
            <option value="Server">Server</option>
            <option value="Workstation">Workstation</option>
            <option value="Database">Database</option>
            <option value="Network Device">Network Device</option>
            <option value="Web Application">Web Application</option>
            <option value="Cloud Instance">Cloud Instance</option>
            <option value="Container">Container</option>
          </select>
        </div>

        <div>
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Environments</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
            <option value="Testing">Testing</option>
          </select>
        </div>

        <div>
          <select
            value={critFilter}
            onChange={(e) => setCritFilter(e.target.value)}
            className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Criticality</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="rounded-2xl bg-[#0c1426] border border-[#1c2c4b] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090f1d] border-b border-[#1c2c4b] text-slate-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Host Name</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Operating System</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Business Criticality</th>
                <th className="py-3 px-4">Exposure</th>
                <th className="py-3 px-4">Findings</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172542]">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sky-400">
                    <Link to={`/assets/${a.id}`} className="hover:underline">
                      {a.asset_id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-100">
                    <Link to={`/assets/${a.id}`} className="hover:text-sky-300">
                      {a.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{a.ip_address}</td>
                  <td className="py-3 px-4 text-slate-300">{a.operating_system}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {a.asset_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        a.environment === 'Production'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          : a.environment === 'Staging'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-700/40 text-slate-300'
                      }`}
                    >
                      {a.environment}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span
                      className={
                        a.business_criticality === 'Critical'
                          ? 'text-red-400'
                          : a.business_criticality === 'High'
                          ? 'text-orange-400'
                          : a.business_criticality === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {a.business_criticality}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        a.internet_exposure === 'Internet Facing'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                          : a.internet_exposure === 'Internal'
                          ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {a.internet_exposure}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="px-2 py-0.5 bg-slate-800 rounded font-bold text-slate-200">
                      {a.vulnerability_count || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/assets/${a.id}`}
                        className="p-1 text-slate-400 hover:text-white"
                        title="View Asset Findings"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      {user?.role !== 'VIEWER' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(a)}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssetToDelete(a)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Form Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#0c1427] border border-[#1e2e4f] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2e4f] bg-[#090f1d]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                {editingAsset ? `Edit Asset: ${editingAsset.name}` : 'Enroll New Asset'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset ID *</label>
                  <input
                    type="text"
                    required
                    value={assetForm.asset_id}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_id: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Host Name *</label>
                  <input
                    type="text"
                    required
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    placeholder="e.g. Prod-App-Gateway"
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">IP Address / Hostname *</label>
                  <input
                    type="text"
                    required
                    value={assetForm.ip_address}
                    onChange={(e) => setAssetForm({ ...assetForm, ip_address: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Operating System</label>
                  <input
                    type="text"
                    required
                    value={assetForm.operating_system}
                    onChange={(e) => setAssetForm({ ...assetForm, operating_system: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Type</label>
                  <select
                    value={assetForm.asset_type}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as AssetType })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Server">Server</option>
                    <option value="Workstation">Workstation</option>
                    <option value="Database">Database</option>
                    <option value="Network Device">Network Device</option>
                    <option value="Web Application">Web Application</option>
                    <option value="Cloud Instance">Cloud Instance</option>
                    <option value="Container">Container</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Environment Tier</label>
                  <select
                    value={assetForm.environment}
                    onChange={(e) => setAssetForm({ ...assetForm, environment: e.target.value as Environment })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Production">Production (100% Weight)</option>
                    <option value="Staging">Staging (70% Weight)</option>
                    <option value="Development">Development (40% Weight)</option>
                    <option value="Testing">Testing (20% Weight)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Business Criticality</label>
                  <select
                    value={assetForm.business_criticality}
                    onChange={(e) => setAssetForm({ ...assetForm, business_criticality: e.target.value as BusinessCriticality })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Critical">Critical (100% Normalized)</option>
                    <option value="High">High (80% Normalized)</option>
                    <option value="Medium">Medium (50% Normalized)</option>
                    <option value="Low">Low (20% Normalized)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Internet Exposure</label>
                  <select
                    value={assetForm.internet_exposure}
                    onChange={(e) => setAssetForm({ ...assetForm, internet_exposure: e.target.value as InternetExposure })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Internet Facing">Internet Facing (100% Normalized)</option>
                    <option value="Internal">Internal (50% Normalized)</option>
                    <option value="Isolated">Isolated (10% Normalized)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Owner / Team</label>
                  <input
                    type="text"
                    value={assetForm.owner}
                    onChange={(e) => setAssetForm({ ...assetForm, owner: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={assetForm.department}
                    onChange={(e) => setAssetForm({ ...assetForm, department: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Cloud</label>
                  <input
                    type="text"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full bg-[#080d19] border border-[#1d2d4c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#1e2e4f]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/20"
                >
                  {editingAsset ? 'Update Asset' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0c1427] border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Decommission Asset?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete asset{' '}
              <span className="font-mono text-sky-400 font-bold">{assetToDelete.name}</span> ({assetToDelete.asset_id})?
              All vulnerabilities linked to this asset will also be removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-500/20"
              >
                Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
