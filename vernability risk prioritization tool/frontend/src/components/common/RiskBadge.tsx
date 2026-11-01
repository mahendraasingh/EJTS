import React from 'react';
import { RiskPriority } from '../../types';

interface RiskBadgeProps {
  level: RiskPriority | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const normLevel = level ? level.toLowerCase() : 'low';

  let bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let dotColor = 'bg-emerald-400';

  if (normLevel === 'critical') {
    bg = 'bg-red-500/15 text-red-400 border-red-500/40 shadow-sm shadow-red-500/20';
    dotColor = 'bg-red-500 animate-pulse';
  } else if (normLevel === 'high') {
    bg = 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    dotColor = 'bg-orange-400';
  } else if (normLevel === 'medium') {
    bg = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    dotColor = 'bg-amber-400';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{level}</span>
      {score !== undefined && (
        <span className="font-mono opacity-90 pl-1 border-l border-current/20">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
};
