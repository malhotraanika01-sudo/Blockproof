import { useParams, Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { ArrowLeft, FileText, Download, MapPin, Clock } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { Badge, Spinner, ErrorState, Button } from '../../components/ui.jsx';
import VerifyButton from '../../components/VerifyButton.jsx';

export default function EvidenceDetail() {
  const { id } = useParams();
  const ev = useAsync(() => api.get(`/evidence/${id}`).then((r) => r.data), [id]);
  const custody = useAsync(() => api.get(`/evidence/${id}/custody`).then((r) => r.data), [id]);

  if (ev.loading && !ev.data) return <Spinner />;
  if (ev.error && !ev.data) return <ErrorState message={ev.error} onRetry={ev.refetch} />;
  const e = ev.data;

  const openContent = async () => {
    const res = await api.get(`/evidence/${id}/content`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <div className="space-y-6">
      <Link
        to={e.caseId ? `/investigator/cases/${e.caseId}` : '/investigator/cases'}
        className="inline-flex items-center gap-1 text-sm text-forensic-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to case
      </Link>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-forensic-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-forensic-600">{e.evidenceCode}</span>
              <Badge status={e.integrityStatus} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-forensic-900">
              <FileText className="h-5 w-5 text-forensic-300" />
              <span className="font-medium">{e.originalFilename}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm text-forensic-500">
              <dt>Type</dt>
              <dd className="text-forensic-800">{e.evidenceType?.name}</dd>
              <dt>Size</dt>
              <dd className="text-forensic-800">{(Number(e.sizeBytes) / 1024).toFixed(1)} KB</dd>
              <dt>MIME</dt>
              <dd className="text-forensic-800">{e.mimeType}</dd>
              <dt>Last verified</dt>
              <dd className="text-forensic-800">
                {e.lastVerifiedAt ? new Date(e.lastVerifiedAt).toLocaleString() : 'never'}
              </dd>
            </dl>
            <div className="mt-3 rounded-lg bg-forensic-50 p-3">
              <div className="text-xs uppercase tracking-wide text-forensic-400">SHA-256 fingerprint</div>
              <div className="mt-1 break-all font-mono text-xs text-forensic-700">{e.sha256Hash}</div>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={openContent}>
              <Download className="h-4 w-4" /> Open decrypted file
            </Button>
          </div>

          <div className="rounded-xl border border-forensic-100 bg-white p-5">
            <h3 className="font-semibold text-forensic-900">Integrity check</h3>
            <p className="mt-1 text-sm text-forensic-500">
              Recomputes the SHA-256 of the stored file and compares it to the fingerprint anchored on the ledger. You see
              the result only — not the underlying blockchain history.
            </p>
            <div className="mt-3">
              <VerifyButton evidenceId={e.evidenceId} onDone={() => { ev.refetch(); custody.refetch(); }} />
            </div>
          </div>
        </div>

        {/* Custody timeline */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-forensic-900">Chain of custody</h3>
          {custody.loading && <Spinner />}
          {custody.data && (
            <div className="space-y-3">
              {custody.data.transfers.length > 0 && (
                <div className="rounded-lg border border-forensic-100 bg-white p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-forensic-400">Transfers</div>
                  {custody.data.transfers.map((t) => (
                    <div key={t.transferId} className="mt-2 flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 text-forensic-300" />
                      <div>
                        <div className="text-forensic-800">
                          {t.fromLocation.name} → {t.toLocation.name}
                        </div>
                        <div className="text-xs text-forensic-400">
                          {t.reason} · <Badge status={t.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-forensic-100 bg-white p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-forensic-400">Event timeline</div>
                <ol className="mt-2 space-y-3">
                  {custody.data.timeline.map((ledgerEvent, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative pl-5"
                    >
                      <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-forensic-400" />
                      {i < custody.data.timeline.length - 1 && (
                        <span className="absolute left-[4px] top-3.5 h-full w-px bg-forensic-100" />
                      )}
                      <div className="text-sm font-medium text-forensic-800">
                        {ledgerEvent.eventType.replaceAll('_', ' ')}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-forensic-400">
                        <Clock className="h-3 w-3" />
                        {new Date(ledgerEvent.recordedAt).toLocaleString()}
                      </div>
                    </motion.li>
                  ))}
                </ol>
                <p className="mt-3 text-[11px] text-forensic-400">
                  Ledger transaction IDs and block references are visible to the Head of Investigation only.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
