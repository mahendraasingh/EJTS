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
    { name: 'Dashboard & CSV Scan', path: '/', icon: LayoutDashboard },
    { name: 'Vulnerabilities', path: '/vulnerabilities', icon: ShieldAlert },
    { name: 'Assets & Exposure', path: '/assets', icon: Server },
    { name: 'Risk Prioritization', path: '/risk-prioritization', icon: SlidersHorizontal },
    { name: 'Remediation SLA', path: '/remediation', icon: CheckCircle2 },
    { name: 'Executive Reports', path: '/reports', icon: FileBarChart2 },
    { name: 'Engine Weights', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#09090b] border-r border-[#27272a] flex flex-col h-screen select-none shrink-0 transition-colors">
      {/* Brand Logo & Name */}
      <div className="h-16 px-6 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
              VRPT <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded font-mono font-medium">v1.2</span>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Risk Prioritization Tool</div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          SecOps Platform
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
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Engine Status Card */}
      <div className="p-3 border-t border-[#27272a]">
        <div className="p-2.5 rounded-xl bg-[#121215] border border-[#27272a] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-500/30">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-200 truncate">Multi-Factor Engine</div>
            <div className="text-[10px] text-cyan-400 font-mono tracking-tight">CVSS · EPSS · KEV</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
