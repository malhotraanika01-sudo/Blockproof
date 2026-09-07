import { Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { FolderOpen, FileCheck2, Boxes, ArrowRight } from 'lucide-react';
import { api, fetchList } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { useAuth } from '../../lib/auth.jsx';
import { Spinner, Badge, EmptyState } from '../../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const cases = useAsync(() => fetchList('/cases', { pageSize: 50 }));
  const workload = useAsync(() => api.get('/analytics/my-workload').then((r) => r.data));

  const w = workload.data || {};
  const stats = [
    { label: 'Assigned cases', value: w.assigned_cases ?? '—', icon: FolderOpen },
    { label: 'In progress', value: w.in_progress_cases ?? '—', icon: FileCheck2 },
    { label: 'Evidence in scope', value: w.evidence_in_scope ?? '—', icon: Boxes },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forensic-900">Good day, {user?.fullName?.split(' ').slice(-1)}</h1>
        <p className="mt-1 text-sm text-forensic-500">Your active caseload and evidence.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-forensic-100 bg-white p-4"
          >
            <s.icon className="h-5 w-5 text-forensic-400" />
            <div className="mt-2 text-2xl font-bold text-forensic-900">{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-forensic-400">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-forensic-900">My cases</h2>
          <Link to="/investigator/cases" className="text-sm font-medium text-forensic-600 hover:underline">
            View all
          </Link>
        </div>
        {cases.loading && <Spinner />}
        {cases.data?.items?.length === 0 && (
          <EmptyState icon={FolderOpen} title="No cases assigned yet" hint="The Head of Investigation assigns cases to you." />
        )}
        <div className="space-y-2">
          {cases.data?.items?.slice(0, 6).map((c) => (
            <Link
              key={c.caseId}
              to={`/investigator/cases/${c.caseId}`}
              className="flex items-center justify-between rounded-lg border border-forensic-100 bg-white p-4 transition hover:border-forensic-300"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-forensic-700">{c.caseNumber}</span>
                  <Badge status={c.status} />
                  <Badge status={c.priority} />
                </div>
                <div className="mt-1 font-medium text-forensic-900">{c.title}</div>
                <div className="text-xs text-forensic-400">
                  {c.report?.crimeType} · {c._count.evidence} evidence · {c._count.updates} updates
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-forensic-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
