import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  ['Home', '/'],
  ['Report a crime', '/report'],
  ['My reports', '/my-reports'],
  ['Track a report', '/track'],
];

export default function CommonShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-civic-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold">BlockProof</span>
            <span className="hidden text-xs text-gray-400 sm:inline">Citizen Reporting Portal</span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? 'bg-civic-50 text-civic-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">{user?.fullName}</span>
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 md:hidden">
          {NAV.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-civic-50 text-civic-700' : 'text-gray-600'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-gray-400">
        BlockProof — academic demonstration. Evidence is encrypted (AES-256-GCM) and fingerprinted (SHA-256) on a permissioned ledger.
      </footer>
    </div>
  );
}
