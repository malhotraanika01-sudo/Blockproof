import { useState } from 'react';
import { fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { Badge, Spinner, Pagination } from '../../components/ui.jsx';
import { DarkTable, DarkInput } from '../../components/dark.jsx';

export default function AuditLogs() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, loading } = useAsync(
    () => fetchList('/admin/audit', { q: dq || undefined, page, pageSize: 20 }),
    [dq, page],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-400">
          System actions. Many rows are written automatically by database triggers on sensitive changes.
        </p>
      </div>

      <DarkInput placeholder="Search action or detail" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-full max-w-sm" />

      {loading ? (
        <Spinner />
      ) : (
        <DarkTable
          columns={['Time', 'Actor', 'Action', 'Entity', 'Detail']}
          rows={data?.items ?? []}
          renderRow={(a) => (
            <tr key={a.auditId} className="text-gray-300">
              <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2.5 text-sm">
                {a.actor?.fullName || <span className="text-gray-600">system / trigger</span>}
                {a.actor?.role?.name && <span className="ml-1 text-xs text-gray-500">({a.actor.role.name})</span>}
              </td>
              <td className="px-4 py-2.5">
                <Badge tone="gray">{a.action}</Badge>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-400">
                {a.entityType}
                {a.entityId ? ` #${a.entityId}` : ''}
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{a.detail || '—'}</td>
            </tr>
          )}
        />
      )}
      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />}
    </div>
  );
}
