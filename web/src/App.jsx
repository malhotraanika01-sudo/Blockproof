import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Spinner } from './components/ui.jsx';

import LoginPage from './pages/Login.jsx';
import RegisterPage from './pages/Register.jsx';

import CommonShell from './shells/CommonShell.jsx';
import Home from './pages/common/Home.jsx';
import ReportCrime from './pages/common/ReportCrime.jsx';
import MyReports from './pages/common/MyReports.jsx';
import TrackReport from './pages/common/TrackReport.jsx';

import InvestigatorShell from './shells/InvestigatorShell.jsx';
import InvDashboard from './pages/investigator/Dashboard.jsx';
import InvCases from './pages/investigator/Cases.jsx';
import InvCaseDetail from './pages/investigator/CaseDetail.jsx';
import InvEvidence from './pages/investigator/EvidenceDetail.jsx';

import HeadShell from './shells/HeadShell.jsx';
import CommandCenter from './pages/head/CommandCenter.jsx';
import HeadReports from './pages/head/Reports.jsx';
import HeadCases from './pages/head/Cases.jsx';
import HeadCaseDetail from './pages/head/CaseDetail.jsx';
import HeadEvidence from './pages/head/Evidence.jsx';
import BlockchainHistory from './pages/head/BlockchainHistory.jsx';
import AuditLogs from './pages/head/AuditLogs.jsx';
import Users from './pages/head/Users.jsx';

const HOME_FOR = { COMMON_USER: '/', INVESTIGATOR: '/investigator', HEAD: '/head' };

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && user.role !== role) return <Navigate to={HOME_FOR[user.role] || '/login'} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={HOME_FOR[user.role]} replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to={HOME_FOR[user.role]} replace /> : <RegisterPage />} />

      {/* Common User — public crime reporting portal */}
      <Route
        element={
          <Guard role="COMMON_USER">
            <CommonShell />
          </Guard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ReportCrime />} />
        <Route path="/my-reports" element={<MyReports />} />
        <Route path="/track" element={<TrackReport />} />
      </Route>

      {/* Investigator — investigation workspace */}
      <Route
        element={
          <Guard role="INVESTIGATOR">
            <InvestigatorShell />
          </Guard>
        }
      >
        <Route path="/investigator" element={<InvDashboard />} />
        <Route path="/investigator/cases" element={<InvCases />} />
        <Route path="/investigator/cases/:id" element={<InvCaseDetail />} />
        <Route path="/investigator/evidence/:id" element={<InvEvidence />} />
      </Route>

      {/* Head of Investigation — command center */}
      <Route
        element={
          <Guard role="HEAD">
            <HeadShell />
          </Guard>
        }
      >
        <Route path="/head" element={<CommandCenter />} />
        <Route path="/head/reports" element={<HeadReports />} />
        <Route path="/head/cases" element={<HeadCases />} />
        <Route path="/head/cases/:id" element={<HeadCaseDetail />} />
        <Route path="/head/evidence" element={<HeadEvidence />} />
        <Route path="/head/blockchain" element={<BlockchainHistory />} />
        <Route path="/head/audit" element={<AuditLogs />} />
        <Route path="/head/users" element={<Users />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? HOME_FOR[user.role] : '/login'} replace />} />
    </Routes>
  );
}
