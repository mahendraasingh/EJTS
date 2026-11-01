import React from 'react';
import { X, ShieldAlert, Cpu, Globe, Zap, Server, Activity, Calculator } from 'lucide-react';
import { RiskBreakdown } from '../../types';
import { RiskBadge } from '../common/RiskBadge';

interface RiskBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: RiskBreakdown | null;
}

export const RiskBreakdownModal: React.FC<RiskBreakdownModalProps> = ({
  isOpen,
  onClose,
  breakdown,
}) => {
  if (!isOpen || !breakdown) return null;

  const factorIcons: Record<string, React.ReactNode> = {
    'CVSS Score': <ShieldAlert className="w-4 h-4 text-rose-400" />,
    'EPSS Exploit Likelihood': <Activity className="w-4 h-4 text-sky-400" />,
    'Asset Business Criticality': <Server className="w-4 h-4 text-purple-400" />,
    'Internet Exposure': <Globe className="w-4 h-4 text-amber-400" />,
    'Exploitation Intelligence': <Zap className="w-4 h-4 text-red-400" />,
    'Environment Tier': <Cpu className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0c1427] border border-[#1e2e4f] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2e4f] bg-[#090f1d]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {breakdown.cve_id}
                </span>
                <span className="text-xs text-slate-400">on</span>
                <span className="text-xs font-medium text-slate-200">{breakdown.asset_name}</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 truncate max-w-md">
                {breakdown.vulnerability_title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Overview Banner */}
        <div className="p-6 bg-gradient-to-r from-[#0f1b33] to-[#0c1527] border-b border-[#1e2e4f]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                Calculated Final Risk Score
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold font-mono tracking-tight text-white">
                  {breakdown.final_risk_score.toFixed(2)}
                </span>
                <span className="text-sm text-slate-400 font-mono">/ 100</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Model: <span className="text-sky-300">{breakdown.scoring_version}</span>
              </div>
            </div>
            <div>
              <RiskBadge level={breakdown.risk_level} size="lg" />
            </div>
          </div>

          {/* Summation Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Risk Severity Threshold</span>
              <span>100 Max</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-700/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  breakdown.final_risk_score >= 80
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-sm shadow-red-500/50'
                    : breakdown.final_risk_score >= 60
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : breakdown.final_risk_score >= 40
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, breakdown.final_risk_score))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Factor Breakdown Grid */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Mathematical Contribution Breakdown
          </div>

          {breakdown.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#0a101f] border border-[#1b2b4a] rounded-xl flex items-center justify-between hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50">
                  {factorIcons[item.factor] || <ShieldAlert className="w-4 h-4 text-slate-400" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">{item.factor}</div>
                  <div className="text-xs text-slate-400">{item.explanation}</div>
                </div>
              </div>

              <div className="text-right pl-4">
                <div className="text-sm font-bold font-mono text-sky-300">
                  +{item.contribution.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  raw: {item.raw_value} (wt: {(item.weight * 100).toFixed(0)}%)
                </div>
              </div>
            </div>
          ))}

          {/* Verification Sum alert */}
          <div className="p-3 mt-4 bg-sky-950/30 border border-sky-800/40 rounded-xl text-xs text-sky-300 flex items-center justify-between">
            <span>Formula: Sum(Normalized Factor × Weight) = Final Risk Score</span>
            <span className="font-mono font-semibold">
              Sum: {breakdown.items.reduce((acc, curr) => acc + curr.contribution, 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1e2e4f] bg-[#090f1d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
