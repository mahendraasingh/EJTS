import React from 'react';
import { RemediationStatus } from '../../types';

interface StatusBadgeProps {
  status: RemediationStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status ? status.toLowerCase() : 'open';

  let style = 'bg-slate-700/50 text-slate-300 border-slate-600/50';

  if (norm === 'open') {
    style = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
  } else if (norm === 'in progress') {
    style = 'bg-sky-500/10 text-sky-300 border-sky-500/30';
  } else if (norm === 'pending verification') {
    style = 'bg-purple-500/15 text-purple-300 border-purple-500/30 animate-pulse';
  } else if (norm === 'resolved') {
    style = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  } else if (norm === 'accepted risk') {
    style = 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
};
