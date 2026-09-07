import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { ArrowLeft, FileText, Plus, ArrowRightLeft, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { Badge, Spinner, ErrorState, Button, Field, Textarea, Select } from '../../components/ui.jsx';
import TransferModal from '../../components/TransferModal.jsx';

export default function CaseDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data: c, loading, error, refetch } = useAsync(() => api.get(`/cases/${id}`).then((r) => r.data), [id]);
  const [updateType, setUpdateType] = useState('NOTE');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [transferFor, setTransferFor] = useState(null);

  if (loading && !c) return <Spinner />;
  if (error && !c) return <ErrorState message={error} onRetry={refetch} />;

  const addUpdate = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await api.post(`/cases/${id}/updates`, { updateType, body });
      setBody('');
      toast.success('Update added');
      refetch();
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/investigator/cases" className="inline-flex items-center gap-1 text-sm text-forensic-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All cases
      </Link>

      <div className="rounded-xl border border-forensic-100 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-forensic-700">{c.caseNumber}</span>
          <Badge status={c.status} />
          <Badge status={c.priority} />
        </div>
        <h1 className="mt-2 text-xl font-bold text-forensic-900">{c.title}</h1>
        <p className="mt-1 text-sm text-forensic-500">
          {c.report?.crimeType} · reported by {c.report?.reporter?.fullName} · lead: {c.leadHead?.fullName}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Evidence */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 font-semibold text-forensic-900">Evidence ({c.evidence.length})</h2>
          <div className="space-y-2">
            {c.evidence.map((e) => (
              <motion.div
                key={e.evidenceId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-forensic-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {e.integrityStatus === 'TAMPERED' ? (
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="font-mono text-xs text-forensic-500">{e.evidenceCode}</span>
                      <Badge status={e.integrityStatus} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 truncate text-sm text-forensic-800">
                      <FileText className="h-4 w-4 shrink-0 text-forensic-300" />
                      <span className="truncate">{e.originalFilename}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-forensic-400">
                      {e.evidenceType?.name} · {(Number(e.sizeBytes) / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      to={`/investigator/evidence/${e.evidenceId}`}
                      className="text-xs font-medium text-forensic-600 hover:underline"
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => setTransferFor(e)}
                      className="inline-flex items-center gap-1 text-xs text-forensic-500 hover:text-forensic-700"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Updates */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-forensic-900">Investigation updates</h2>
          <form onSubmit={addUpdate} className="mb-4 rounded-lg border border-forensic-100 bg-white p-3">
            <div className="flex gap-2">
              <Select value={updateType} onChange={(e) => setUpdateType(e.target.value)} className="w-32">
                {['NOTE', 'FINDING', 'REQUEST', 'STATUS_CHANGE'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <Textarea
              required
              className="mt-2"
              placeholder="Add a note, finding or request…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" size="sm" loading={posting} className="mt-2 w-full">
              <Plus className="h-4 w-4" /> Add update
            </Button>
          </form>

          <div className="space-y-2">
            {c.updates.length === 0 && <p className="text-sm text-forensic-400">No updates yet.</p>}
            {c.updates.map((u) => (
              <div key={u.updateId} className="rounded-lg border border-forensic-100 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-forensic-400">
                  <Badge tone="gray">{u.updateType}</Badge>
                  <Clock className="h-3 w-3" />
                  {new Date(u.createdAt).toLocaleString()}
                </div>
                <p className="mt-1 text-sm text-forensic-800">{u.body}</p>
                <p className="mt-1 text-xs text-forensic-400">— {u.author?.fullName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {transferFor && (
        <TransferModal
          evidence={transferFor}
          onClose={() => setTransferFor(null)}
          onDone={() => {
            setTransferFor(null);
            toast.success('Transfer initiated');
            refetch();
          }}
        />
      )}
    </div>
  );
}
