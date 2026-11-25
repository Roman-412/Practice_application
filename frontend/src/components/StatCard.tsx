import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  helper?: string;
  tone?: 'teal' | 'sky' | 'amber' | 'emerald';
}

const toneStyles = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200/70',
  sky: 'bg-sky-50 text-sky-700 border-sky-200/70',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/70',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  helper,
  tone = 'teal',
}: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_20px_-4px_rgba(15,23,42,0.08)] transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`h-9 w-9 rounded-xl border flex items-center justify-center ${toneStyles[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value}
      </div>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}
