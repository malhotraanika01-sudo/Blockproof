import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { Search, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Button, Field, Input, Badge } from '../../components/ui.jsx';

const STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED'];

export default function TrackReport() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const lookup = async (value) => {
    const c = (value ?? code).trim();
    if (!c) return;
    setBusy(true);
    setErr(null);
    setReport(null);
    try {
      const { data } = await api.get(`/reports/track/${encodeURIComponent(c)}`);
      setReport(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (params.get('code')) lookup(params.get('code'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageIndex = report ? STAGES.indexOf(report.status === 'REJECTED' ? 'CLOSED' : report.status) : -1;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Track a report</h1>
      <p className="mt-1 text-sm text-gray-500">Enter the tracking code you received when you submitted.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup();
        }}
        className="mt-5 flex gap-2"
      >
        <Field label="">
          <Input placeholder="BP-2026-0001" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
        </Field>
        <Button type="submit" loading={busy} className="mt-0 h-[38px] self-end">
          <Search className="h-4 w-4" /> Track
        </Button>
      </form>

      {err && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {report && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-civic-700">{report.trackingCode}</span>
            <Badge status={report.status} />
          </div>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">{report.title}</h2>
          <p className="text-sm text-gray-500">
            {report.crimeType} · submitted {new Date(report.submittedAt).toLocaleString()}
          </p>

          <div className="mt-5 flex items-center gap-1">
            {STAGES.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div
                  className={`h-2 w-full rounded-full ${
                    i <= stageIndex ? 'bg-civic-500' : 'bg-gray-200'
                  } ${i === 0 ? 'rounded-l-full' : ''} ${i === STAGES.length - 1 ? 'rounded-r-full' : ''}`}
                />
                <span className={`mt-1.5 text-[10px] uppercase tracking-wide ${i <= stageIndex ? 'text-civic-600' : 'text-gray-400'}`}>
                  {s.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>

          {report.case && (
            <div className="mt-5 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Official case <span className="font-mono">{report.case.caseNumber}</span> ·{' '}
                <Badge status={report.case.status} /> · <Badge status={report.case.priority} />
              </div>
            </div>
          )}

          {report.evidence?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Evidence</div>
              <ul className="mt-2 space-y-1.5">
                {report.evidence.map((e) => (
                  <li key={e.evidenceCode} className="flex items-center gap-2 text-sm">
                    {e.integrityStatus === 'TAMPERED' ? (
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-mono text-xs text-gray-500">{e.evidenceCode}</span>
                    <span className="truncate text-gray-700">{e.originalFilename}</span>
                    <Badge status={e.integrityStatus} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-400">
                Evidence is encrypted and its fingerprint is recorded on a permissioned ledger. Investigation details are
                not shown here.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
