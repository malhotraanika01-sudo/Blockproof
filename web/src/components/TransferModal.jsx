import { useState } from 'react';
import { motion } from '../lib/motion.jsx';
import { X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { Button, Field, Select, Input } from './ui.jsx';

export default function TransferModal({ evidence, onClose, onDone }) {
  const { data: locations } = useAsync(() => api.get('/admin/lookups/locations').then((r) => r.data));
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post('/transfers', {
        evidenceId: evidence.evidenceId,
        fromLocationId: Number(from),
        toLocationId: Number(to),
        reason,
      });
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Transfer evidence</h3>
          <button onClick={onClose}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <p className="mt-1 font-mono text-xs text-gray-400">
          {evidence.evidenceCode} · {evidence.originalFilename}
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field label="From location">
            <Select required value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Select…</option>
              {locations?.map((l) => (
                <option key={l.locationId} value={l.locationId}>
                  {l.name} ({l.kind})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="To location">
            <Select required value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Select…</option>
              {locations?.map((l) => (
                <option key={l.locationId} value={l.locationId}>
                  {l.name} ({l.kind})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason" error={err}>
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lab analysis" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Initiate transfer
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
