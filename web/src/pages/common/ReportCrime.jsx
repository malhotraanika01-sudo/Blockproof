import { useState } from 'react';
import { motion, AnimatePresence } from '../../lib/motion.jsx';
import { UploadCloud, X, FileText, CheckCircle2, Copy } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast } from '../../lib/toast.jsx';
import { Button, Field, Input, Textarea, Select } from '../../components/ui.jsx';

const CRIME_TYPES = ['Cyber Fraud', 'Identity Theft', 'Phishing', 'Financial Fraud', 'Harassment', 'Data Theft', 'Other'];

export default function ReportCrime() {
  const toast = useToast();
  const [form, setForm] = useState({
    crimeType: 'Cyber Fraud',
    title: '',
    description: '',
    incidentAt: '',
    incidentLocation: '',
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addFiles = (list) => {
    const incoming = Array.from(list).slice(0, 8 - files.length);
    setFiles((f) => [...f, ...incoming]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('files', f));
      const { data } = await api.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
      toast.success('Report submitted');
    } catch (e2) {
      if (e2.raw?.error?.details?.fieldErrors) setErrors(e2.raw.error.details.fieldErrors);
      toast.error(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-3 text-xl font-bold text-emerald-900">Report submitted</h1>
          <p className="mt-1 text-sm text-emerald-800">{result.message}</p>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">Your tracking code</div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="font-mono text-2xl font-bold text-gray-900">{result.trackingCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(result.trackingCode);
                  toast.info('Copied');
                }}
              >
                <Copy className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {result.evidence?.length > 0 && (
            <div className="mt-4 text-left text-sm text-emerald-900">
              <div className="font-medium">Evidence secured ({result.evidence.length}):</div>
              <ul className="mt-1 space-y-1">
                {result.evidence.map((e) => (
                  <li key={e.evidenceCode} className="font-mono text-xs">
                    {e.evidenceCode} · {e.filename}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" className="mt-6" onClick={() => window.location.assign('/my-reports')}>
            Go to my reports
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Report a crime</h1>
      <p className="mt-1 text-sm text-gray-500">All fields marked required. You can attach up to 8 files.</p>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Crime type">
            <Select value={form.crimeType} onChange={set('crimeType')}>
              {CRIME_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date &amp; time of incident" error={errors.incidentAt?.[0]}>
            <Input type="datetime-local" required value={form.incidentAt} onChange={set('incidentAt')} />
          </Field>
        </div>

        <Field label="Short title" error={errors.title?.[0]}>
          <Input required placeholder="e.g. Unauthorized transfers after phishing email" value={form.title} onChange={set('title')} />
        </Field>

        <Field label="Location" error={errors.incidentLocation?.[0]}>
          <Input required placeholder="Address, area, or 'Online'" value={form.incidentLocation} onChange={set('incidentLocation')} />
        </Field>

        <Field label="What happened?" error={errors.description?.[0]}>
          <Textarea required placeholder="Describe the incident in your own words." value={form.description} onChange={set('description')} />
        </Field>

        <Field label="Evidence files" hint="Images, video, audio, PDF or text. Max 25 MB each.">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 transition hover:border-civic-400 hover:bg-civic-50/40"
          >
            <UploadCloud className="h-6 w-6 text-gray-400" />
            Drag files here or click to browse
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
              accept="image/*,video/mp4,audio/*,application/pdf,text/plain"
            />
          </label>
          <AnimatePresence>
            {files.map((f, i) => (
              <motion.div
                key={`${f.name}-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                </span>
                <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </Field>

        <Button type="submit" size="lg" loading={busy} className="w-full">
          Submit report
        </Button>
      </form>
    </div>
  );
}
