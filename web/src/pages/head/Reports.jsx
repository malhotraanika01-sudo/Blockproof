import { useState } from 'react';
import { motion } from '../../lib/motion.jsx';
import { FolderPlus, UserPlus, X } from 'lucide-react';
import { api, fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { Badge, Spinner, Button, Field } from '../../components/ui.jsx';
import { DarkTable, DarkInput, DarkSelect } from '../../components/dark.jsx';

export default function Reports() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const dq = useDebounced(q);
  const { data, loading, refetch } = useAsync(
    () => fetchList('/reports', { q: dq || undefined, status: status || undefined, pageSize: 50 }),
    [dq, status],
  );
  const [escalating, setEscalating] = useState(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Crime Reports</h1>
        <p className="mt-1 text-sm text-gray-400">Incoming reports. Escalate a report into an official case and assign an investigator.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <DarkInput placeholder="Search title / tracking code" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        <DarkSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['SUBMITTED', 'UNDER_REVIEW', 'ESCALATED', 'REJECTED', 'CLOSED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </DarkSelect>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DarkTable
          columns={['Tracking', 'Title', 'Type', 'Evidence', 'Status', 'Case', '']}
          rows={data?.items ?? []}
          empty="No reports"
          renderRow={(r) => (
            <tr key={r.reportId} className="text-gray-300">
              <td className="px-4 py-3 font-mono text-xs text-command-accent">{r.trackingCode}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-100">{r.title}</div>
                <div className="text-xs text-gray-500">{r.reporter?.fullName}</div>
              </td>
              <td className="px-4 py-3">{r.crimeType}</td>
              <td className="px-4 py-3">{r._count.evidence}</td>
              <td className="px-4 py-3">
                <Badge status={r.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs">{r.case?.caseNumber || '—'}</td>
              <td className="px-4 py-3 text-right">
                {!r.case && (
                  <button
                    onClick={() => setEscalating(r)}
                    className="inline-flex items-center gap-1 rounded-md bg-command-accent/15 px-2.5 py-1 text-xs font-medium text-command-accent hover:bg-command-accent/25"
                  >
                    <FolderPlus className="h-3.5 w-3.5" /> Escalate
                  </button>
                )}
              </td>
            </tr>
          )}
        />
      )}

      {escalating && (
        <EscalateModal
          report={escalating}
          onClose={() => setEscalating(null)}
          onDone={() => {
            setEscalating(null);
            toast.success('Case created and assigned');
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EscalateModal({ report, onClose, onDone }) {
  const toast = useToast();
  const investigators = useAsync(() => api.get('/admin/lookups/investigators').then((r) => r.data));
  const [priority, setPriority] = useState('MEDIUM');
  const [investigatorId, setInvestigatorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { data: c } = await api.post('/cases', { reportId: report.reportId, priority });
      if (investigatorId) {
        await api.post(`/cases/${c.caseId}/assign`, { investigatorId: Number(investigatorId) });
      }
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-command-line bg-command-panel p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Escalate to case</h3>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-400">{report.title}</p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Priority</label>
            <DarkSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </DarkSelect>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Assign investigator (optional)</label>
            <DarkSelect value={investigatorId} onChange={(e) => setInvestigatorId(e.target.value)} className="w-full">
              <option value="">Assign later</option>
              {investigators.data?.map((inv) => (
                <option key={inv.userId} value={inv.userId}>
                  {inv.fullName} ({inv.badgeNumber})
                </option>
              ))}
            </DarkSelect>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="text-gray-300 hover:bg-white/5">
              Cancel
            </Button>
            <Button type="submit" variant="command" loading={busy}>
              <UserPlus className="h-4 w-4" /> Create case
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
