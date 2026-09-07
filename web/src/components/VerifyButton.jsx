import { useState, useRef, useEffect } from 'react';
import { motion } from '../lib/motion.jsx';
import { ShieldCheck, ShieldAlert, Loader2, Fingerprint } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/toast.jsx';

const STEPS = ['Reading stored file…', 'Computing SHA-256…', 'Comparing with ledger fingerprint…'];

/** Runs the verification with a short staged animation, then shows the result. */
export default function VerifyButton({ evidenceId, onDone, variant = 'forensic' }) {
  const toast = useToast();
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = async () => {
    setPhase('running');
    setResult(null);
    setStep(0);
    timers.current = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1050),
    ];
    try {
      const { data } = await api.post(`/evidence/${evidenceId}/verify`);
      await new Promise((r) => setTimeout(r, 1200));
      setResult(data);
      setPhase('done');
      toast[data.result === 'VERIFIED' ? 'success' : 'error'](
        data.result === 'VERIFIED' ? 'Integrity verified' : 'Tampering detected',
      );
      onDone?.(data);
    } catch (e) {
      toast.error(e.message);
      setPhase('idle');
    } finally {
      timers.current.forEach(clearTimeout);
    }
  };

  const btn =
    variant === 'command'
      ? 'bg-command-accent text-command-bg hover:brightness-110'
      : 'bg-forensic-700 text-white hover:bg-forensic-600';

  if (phase === 'running') {
    return (
      <div className="space-y-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 text-sm ${i <= step ? 'text-gray-700' : 'text-gray-300'}`}>
            {i < step ? (
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            ) : i === step ? (
              <Loader2 className="h-4 w-4 animate-spin text-forensic-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-gray-200" />
            )}
            {s}
          </div>
        ))}
      </div>
    );
  }

  if (phase === 'done' && result) {
    const ok = result.result === 'VERIFIED';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-lg border p-4 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
      >
        <div className="flex items-center gap-2">
          {ok ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
          <span className={`font-semibold ${ok ? 'text-emerald-900' : 'text-red-900'}`}>
            {ok ? 'Integrity verified' : 'Tampering detected'}
          </span>
        </div>
        <dl className="mt-2 space-y-0.5 font-mono text-[11px] text-gray-500">
          <div className="truncate">computed: {result.computedHash || '(unreadable)'}</div>
          <div className="truncate">anchored: {result.anchoredHash || '(none on ledger)'}</div>
        </dl>
        <button onClick={() => setPhase('idle')} className="mt-2 text-xs font-medium text-forensic-600 hover:underline">
          Run again
        </button>
      </motion.div>
    );
  }

  return (
    <button onClick={run} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${btn}`}>
      <Fingerprint className="h-4 w-4" /> Verify integrity
    </button>
  );
}
