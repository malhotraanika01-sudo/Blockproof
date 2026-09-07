import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, ShieldCheck, LogOut, Fingerprint } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  ['Dashboard', '/investigator', LayoutDashboard],
  ['My cases', '/investigator/cases', FolderOpen],
];

export default function InvestigatorShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen bg-forensic-50 text-forensic-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-forensic-100 bg-white">
        <div className="flex items-center gap-2 border-b border-forensic-100 px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-forensic-700 text-white">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold">BlockProof</div>
            <div className="text-[11px] uppercase tracking-wide text-forensic-400">Investigator</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/investigator'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-forensic-700 text-white' : 'text-forensic-600 hover:bg-forensic-50'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-forensic-100 p-3">
          <div className="mb-2 px-2 text-sm">
            <div className="font-medium">{user?.fullName}</div>
            <div className="font-mono text-[11px] text-forensic-400">{user?.badgeNumber}</div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-forensic-500 hover:bg-forensic-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
