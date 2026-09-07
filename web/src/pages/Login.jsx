import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from '../lib/motion.jsx';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useToast } from '../lib/toast.jsx';
import { Button, Field, Input } from '../components/ui.jsx';

const HOME_FOR = { COMMON_USER: '/', INVESTIGATOR: '/investigator', HEAD: '/head' };

const DEMO = [
  ['Head of Investigation', 'head@blockproof.demo'],
  ['Investigator', 'rmalone@blockproof.demo'],
  ['Common User', 'asha.reddy@example.com'],
];

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const user = await login(email, password);
      toast.success(`Signed in as ${user.fullName}`);
      nav(HOME_FOR[user.role] || '/', { replace: true });
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
          <div>
            <div className="font-bold text-gray-900">BlockProof</div>
            <div className="text-xs text-gray-400">Secure evidence &amp; investigation</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Password" error={err}>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-civic-600 hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Demo accounts · Password123!</p>
          <div className="space-y-1">
            {DEMO.map(([label, mail]) => (
              <button
                key={mail}
                onClick={() => {
                  setEmail(mail);
                  setPassword('Password123!');
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-gray-50"
              >
                <span className="text-gray-600">{label}</span>
                <span className="font-mono text-xs text-gray-400">{mail}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
