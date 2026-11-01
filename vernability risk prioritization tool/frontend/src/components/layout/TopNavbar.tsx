import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Check, X, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface TopNavbarProps {
  onSearch?: (term: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onSearch }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="h-16 bg-[#09090b] border-b border-[#27272a] px-6 flex items-center justify-between z-30 shrink-0 transition-colors">
      {/* Global Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search CVE ID, software package, asset..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-[#121215] border border-[#27272a] rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold">Risk Engine Active</span>
        </div>

        {/* Bright / Dark Mode Toggle Icon */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-[#27272a] hover:border-zinc-500 bg-[#121215] text-zinc-300 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
          title={isDark ? "Switch to Bright Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Bright / Dark Mode"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              <span className="text-[11px] font-medium hidden md:inline text-zinc-400">Bright</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-cyan-400 transition-transform hover:-rotate-12" />
              <span className="text-[11px] font-medium hidden md:inline text-zinc-600">Dark</span>
            </>
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl border border-[#27272a] transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-[#101013] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 bg-[#09090b] border-b border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-zinc-200">System Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-mono">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#27272a]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 text-xs transition-colors cursor-pointer hover:bg-zinc-800/40 ${
                        !n.is_read ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                          {n.title}
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge (Display only) */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#27272a]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-cyan-500/20">
            {user?.username.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-zinc-200 leading-tight">{user?.full_name || 'SecOps Lead'}</div>
            <div className="text-[10px] text-cyan-400 font-mono tracking-tight uppercase">Admin Access</div>
          </div>
        </div>
      </div>
    </header>
  );
};
