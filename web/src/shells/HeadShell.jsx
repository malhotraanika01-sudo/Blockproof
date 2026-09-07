import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Gauge, FileWarning, FolderKanban, Boxes, Link2, ScrollText, Users2, LogOut, Radar,
} from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  ['Command Center', '/head', Gauge],
  ['Crime Reports', '/head/reports', FileWarning],
  ['All Cases', '/head/cases', FolderKanban],
  ['All Evidence', '/head/evidence', Boxes],
  ['Blockchain History', '/head/blockchain', Link2],
  ['Audit Logs', '/head/audit', ScrollText],
  ['Users', '/head/users', Users2],
];

export default function HeadShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="theme-command flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-command-line bg-command-panel">
        <div className="flex items-center gap-2 border-b border-command-line px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-command-accent text-command-bg">
            <Radar className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">BlockProof</div>
            <div className="text-[11px] uppercase tracking-wide text-command-accent">Command Center</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/head'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-command-accent/15 text-command-accent'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-command-line p-3">
          <div className="mb-2 px-2 text-sm">
            <div className="font-medium text-white">{user?.fullName}</div>
            <div className="font-mono text-[11px] text-gray-500">{user?.badgeNumber}</div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
