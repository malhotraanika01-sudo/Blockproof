import { useState } from 'react';
import { motion } from '../../lib/motion.jsx';
import { UserPlus, X } from 'lucide-react';
import { api, fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { useToast } from '../../lib/toast.jsx';
import { Badge, Spinner, Button, Pagination } from '../../components/ui.jsx';
import { DarkTable, DarkInput, DarkSelect } from '../../components/dark.jsx';

export default function Users() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [creating, setCreating] = useState(false);

  const { data, loading, refetch } = useAsync(
    () => fetchList('/admin/users', { q: dq || undefined, role: role || undefined, page, pageSize: 15 }),
    [dq, role, page],
  );

  const toggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u.userId}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Account deactivated' : 'Account activated');
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users &amp; Roles</h1>
          <p className="mt-1 text-sm text-gray-400">Provision investigator and head accounts. Citizens self-register.</p>
        </div>
        <Button variant="command" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> New staff account
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <DarkInput placeholder="Search name / email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="flex-1" />
        <DarkSelect value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {['HEAD', 'INVESTIGATOR', 'COMMON_USER'].map((r) => <option key={r}>{r}</option>)}
        </DarkSelect>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DarkTable
          columns={['Name', 'Email', 'Role', 'Badge', 'Activity', 'Status', '']}
          rows={data?.items ?? []}
          renderRow={(u) => (
            <tr key={u.userId} className="text-gray-300">
              <td className="px-4 py-3 font-medium text-gray-100">{u.fullName}</td>
              <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
              <td className="px-4 py-3">
                <Badge tone={u.role.name === 'HEAD' ? 'purple' : u.role.name === 'INVESTIGATOR' ? 'blue' : 'gray'}>
                  {u.role.name}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{u.badgeNumber || '—'}</td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {u._count.assignmentsAsInvestig} cases · {u._count.crimeReports} reports
              </td>
              <td className="px-4 py-3">
                <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'active' : 'inactive'}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => toggleActive(u)} className="text-xs font-medium text-command-accent hover:underline">
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          )}
        />
      )}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />}

      {creating && (
        <CreateUser
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            toast.success('Account created');
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CreateUser({ onClose, onDone }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'INVESTIGATOR', badgeNumber: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post('/admin/users', form);
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <motion.form
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-xl border border-command-line bg-command-panel p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">New staff account</h3>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <DarkInput required placeholder="Full name" value={form.fullName} onChange={set('fullName')} className="w-full" />
        <DarkInput required type="email" placeholder="Email" value={form.email} onChange={set('email')} className="w-full" />
        <DarkInput placeholder="Phone (optional)" value={form.phone} onChange={set('phone')} className="w-full" />
        <div className="flex gap-2">
          <DarkSelect value={form.role} onChange={set('role')} className="w-full">
            <option value="INVESTIGATOR">Investigator</option>
            <option value="HEAD">Head</option>
          </DarkSelect>
          <DarkInput placeholder="Badge #" value={form.badgeNumber} onChange={set('badgeNumber')} className="w-full" />
        </div>
        <DarkInput required type="password" minLength={8} placeholder="Temp password (8+ chars)" value={form.password} onChange={set('password')} className="w-full" />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <Button type="submit" variant="command" loading={busy} className="w-full">
          Create account
        </Button>
      </motion.form>
    </div>
  );
}
