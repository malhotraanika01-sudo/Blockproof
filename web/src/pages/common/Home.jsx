import { Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { FilePlus2, Search, ListChecks, Lock, Fingerprint, Link2 } from 'lucide-react';
import { useAuth } from '../../lib/auth.jsx';

const STEPS = [
  { icon: Lock, title: 'Encrypted on upload', body: 'Your files are sealed with AES-256-GCM before they are stored. Nobody browses them casually.' },
  { icon: Fingerprint, title: 'Fingerprinted with SHA-256', body: 'A one-way fingerprint of the original file is computed so any later change can be detected.' },
  { icon: Link2, title: 'Anchored on a ledger', body: 'The fingerprint and each custody step are written to a permissioned blockchain that cannot be quietly edited.' },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-civic-600">Citizen reporting portal</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold text-gray-900 md:text-4xl">
          Report a crime and know your evidence is protected.
        </h1>
        <p className="mt-3 max-w-xl text-gray-600">
          Hello {user?.fullName?.split(' ')[0]}. Submit a report with photos, video, audio or documents. You get a
          tracking code and can follow the status of your case.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-lg bg-civic-600 px-5 py-2.5 font-medium text-white hover:bg-civic-700"
          >
            <FilePlus2 className="h-4 w-4" /> Report a crime
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-4 w-4" /> Track a report
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <s.icon className="h-6 w-6 text-civic-600" />
            <h3 className="mt-3 font-semibold text-gray-900">{s.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{s.body}</p>
          </motion.div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-gray-900">
          <ListChecks className="h-5 w-5 text-civic-600" />
          <h2 className="font-semibold">What happens after you submit</h2>
        </div>
        <ol className="mt-3 space-y-2 text-sm text-gray-600">
          <li>1. You receive a tracking code (for example <span className="font-mono">BP-2026-0007</span>).</li>
          <li>2. The Head of Investigation reviews your report and may open an official case.</li>
          <li>3. An investigator is assigned and works the case; you can track progress under <em>My reports</em>.</li>
        </ol>
      </section>
    </div>
  );
}
