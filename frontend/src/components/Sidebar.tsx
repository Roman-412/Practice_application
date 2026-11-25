import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  GraduationCap,
  History,
  Settings,
  X,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/chapters', label: 'Chapters', icon: BookOpen },
  { to: '/upload', label: 'Upload JSON', icon: Upload },
  { to: '/practice', label: 'Practice', icon: GraduationCap },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 shadow-sm shadow-teal-500/30">
              <Layers className="h-4 w-4 stroke-[2.25]" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-white block leading-none">
                ChapterFlow
              </span>
              <span className="text-[10px] font-medium text-teal-400 tracking-wide uppercase">
                Learning Studio
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.25)]'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
              <span className="text-xs font-medium text-slate-200">Neon PostgreSQL</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Cloud-synced chapter storage
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
