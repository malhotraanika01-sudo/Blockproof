import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { Badge, Spinner, Pagination } from '../../components/ui.jsx';
import { DarkTable, DarkInput, DarkSelect } from '../../components/dark.jsx';

export default function Cases() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  const { data, loading } = useAsync(
    () =>
      fetchList('/cases', {
        q: dq || undefined,
        status: status || undefined,
        priority: priority || undefined,
        page,
        pageSize: 15,
      }),
    [dq, status, priority, page],
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">All Cases</h1>

      <div className="flex flex-wrap gap-3">
        <DarkInput placeholder="Search case number / title" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="flex-1" />
        <DarkSelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any status</option>
          {['OPEN', 'IN_PROGRESS', 'CLOSED', 'REOPENED'].map((s) => <option key={s}>{s}</option>)}
        </DarkSelect>
        <DarkSelect value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}>
          <option value="">Any priority</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s}>{s}</option>)}
        </DarkSelect>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DarkTable
          columns={['Case', 'Title', 'Type', 'Investigator', 'Priority', 'Status', 'Evidence']}
          rows={data?.items ?? []}
          renderRow={(c) => (
            <tr
              key={c.caseId}
              onClick={() => nav(`/head/cases/${c.caseId}`)}
              className="cursor-pointer text-gray-300 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3 font-mono text-xs text-command-accent">{c.caseNumber}</td>
              <td className="px-4 py-3 font-medium text-gray-100">{c.title}</td>
              <td className="px-4 py-3">{c.report?.crimeType}</td>
              <td className="px-4 py-3">{c.assignments?.[0]?.investigator?.fullName || <span className="text-gray-600">unassigned</span>}</td>
              <td className="px-4 py-3"><Badge status={c.priority} /></td>
              <td className="px-4 py-3"><Badge status={c.status} /></td>
              <td className="px-4 py-3">{c._count.evidence}</td>
            </tr>
          )}
        />
      )}

      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />}
    </div>
  );
}
