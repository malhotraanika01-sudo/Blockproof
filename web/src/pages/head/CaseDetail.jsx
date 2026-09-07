import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, UserCog, RefreshCw, Link2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { Badge, Spinner, ErrorState, Button } from '../../components/ui.jsx';
import { DarkPanel, DarkSelect } from '../../components/dark.jsx';

export default function CaseDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data: c, loading, error, refetch } = useAsync(() => api.get(`/cases/${id}`).then((r) => r.data), [id]);
  const investigators = useAsync(() => api.get('/admin/lookups/investigators').then((r) => r.data));
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !c) return <Spinner />;
  if (error && !c) return <ErrorState message={error} onRetry={refetch} />;

  const active = c.assignments.find((a) => a.isActive);

  const reassign = async () => {
    if (!assignee) return;
    setBusy(true);
    try {
      await api.post(`/cases/${id}/assign`, { investigatorId: Number(assignee) });
      toast.success('Investigator assigned');
      setAssignee('');
      refetch();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    try {
      await api.patch(`/cases/${id}/status`, { status });
      toast.success(`Case ${status}`);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/head/cases" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>

      <DarkPanel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-command-accent">{c.caseNumber}</span>
          <Badge status={c.status} />
          <Badge status={c.priority} />
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {c.report?.crimeType} · reported by {c.report?.reporter?.fullName} · tracking {c.report?.trackingCode}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {c.status !== 'CLOSED' && (
            <Button size="sm" variant="outline" className="border-command-line text-gray-300 hover:bg-white/5" onClick={() => setStatus('CLOSED')}>
              Close case
            </Button>
          )}
          {c.status === 'CLOSED' && (
            <Button size="sm" variant="command" onClick={() => setStatus('REOPENED')}>
              <RefreshCw className="h-3.5 w-3.5" /> Reopen
            </Button>
          )}
        </div>
      </DarkPanel>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-semibold text-gray-200">Evidence ({c.evidence.length})</h2>
          {c.evidence.map((e) => (
            <DarkPanel key={e.evidenceId} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{e.evidenceCode}</span>
                  <Badge status={e.integrityStatus} />
                </div>
                <div className="mt-1 text-sm text-gray-200">{e.originalFilename}</div>
              </div>
              <Link
                to={`/head/blockchain?evidence=${e.evidenceCode}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-command-accent hover:underline"
              >
                <Link2 className="h-3.5 w-3.5" /> Ledger
              </Link>
            </DarkPanel>
          ))}

          <h2 className="pt-2 font-semibold text-gray-200">Investigation updates</h2>
          {c.updates.length === 0 && <p className="text-sm text-gray-500">No updates.</p>}
          {c.updates.map((u) => (
            <DarkPanel key={u.updateId} className="p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Badge tone="gray">{u.updateType}</Badge>
                {new Date(u.createdAt).toLocaleString()} · {u.author?.fullName}
              </div>
              <p className="mt-1 text-sm text-gray-300">{u.body}</p>
            </DarkPanel>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <DarkPanel className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200">
              <UserCog className="h-4 w-4" /> Assignment
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Current: <span className="text-gray-200">{active?.investigator?.fullName || 'unassigned'}</span>
            </p>
            <div className="mt-3 space-y-2">
              <DarkSelect value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full">
                <option value="">Select investigator…</option>
                {investigators.data?.map((inv) => (
                  <option key={inv.userId} value={inv.userId}>
                    {inv.fullName} ({inv.badgeNumber})
                  </option>
                ))}
              </DarkSelect>
              <Button size="sm" variant="command" loading={busy} onClick={reassign} className="w-full">
                {active ? 'Reassign' : 'Assign'}
              </Button>
            </div>

            <div className="mt-4 border-t border-command-line pt-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">History</div>
              {c.assignments.map((a) => (
                <div key={a.assignmentId} className="mt-1.5 text-xs text-gray-400">
                  {a.investigator?.fullName} · {new Date(a.assignedAt).toLocaleDateString()}
                  {a.isActive ? <span className="ml-1 text-command-accent">active</span> : ' (ended)'}
                </div>
              ))}
            </div>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
