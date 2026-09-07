import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from '../lib/motion.jsx';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { Button, Field, Input } from '../components/ui.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await register(form);
      toast.success('Account created');
      nav('/', { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-civic-50 to-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-7 shadow-lg"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-civic-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="font-bold text-gray-900">Create your account</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name">
            <Input required value={form.fullName} onChange={set('fullName')} autoFocus />
          </Field>
          <Field label="Email">
            <Input type="email" required value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Password" error={err} hint="At least 8 characters">
            <Input type="password" required minLength={8} value={form.password} onChange={set('password')} />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-civic-600 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-gray-400">
          Public sign-up creates a citizen reporting account. Investigator and Head accounts are provisioned internally.
        </p>
      </motion.div>
    </div>
  );
}
