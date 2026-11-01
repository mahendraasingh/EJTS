import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  Server,
  SlidersHorizontal,
  CheckCircle2,
  FileBarChart2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Vulnerabilities', path: '/vulnerabilities', icon: ShieldAlert },
    { name: 'Assets', path: '/assets', icon: Server },
    { name: 'Risk Prioritization', path: '/risk-prioritization', icon: SlidersHorizontal },
    { name: 'Remediation', path: '/remediation', icon: CheckCircle2 },
    { name: 'Reports', path: '/reports', icon: FileBarChart2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a1120] border-r border-[#1a2744] flex flex-col h-screen select-none shrink-0">
      {/* Brand Logo & Name */}
      <div className="h-16 px-6 border-b border-[#1a2744] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
              VRPT <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.2 rounded font-mono font-medium">v1.0</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">SecOps Risk Engine</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Core Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Current User Card */}
      <div className="p-3 border-t border-[#1a2744]">
        <div className="p-2.5 rounded-xl bg-[#0e172a] border border-[#1b2b48] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
            {user?.username.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-200 truncate">{user?.full_name || 'Security User'}</div>
            <div className="text-[10px] text-sky-400 font-mono tracking-tight capitalize">{user?.role || 'Analyst'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
