import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { Badge, Spinner, Pagination } from '../../components/ui.jsx';
import { DarkTable, DarkInput, DarkSelect } from '../../components/dark.jsx';

export default function Evidence() {
  const [q, setQ] = useState('');
  const [integrityStatus, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  const { data, loading } = useAsync(
    () => fetchList('/evidence', { q: dq || undefined, integrityStatus: integrityStatus || undefined, page, pageSize: 15 }),
    [dq, integrityStatus, page],
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">All Evidence</h1>

      <div className="flex flex-wrap gap-3">
        <DarkInput placeholder="Search code / filename / hash" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="flex-1" />
        <DarkSelect value={integrityStatus} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any integrity</option>
          {['PENDING', 'VERIFIED', 'TAMPERED'].map((s) => <option key={s}>{s}</option>)}
        </DarkSelect>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <DarkTable
          columns={['Code', 'File', 'Type', 'Case', 'Ledger events', 'Integrity', 'Last verified']}
          rows={data?.items ?? []}
          renderRow={(e) => (
            <tr key={e.evidenceId} className="text-gray-300">
              <td className="px-4 py-3">
                <Link to={`/head/blockchain?evidence=${e.evidenceCode}`} className="font-mono text-xs text-command-accent hover:underline">
                  {e.evidenceCode}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="text-gray-100">{e.originalFilename}</div>
                <div className="text-xs text-gray-500">{(Number(e.sizeBytes) / 1024).toFixed(0)} KB</div>
              </td>
              <td className="px-4 py-3">{e.evidenceType?.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.case?.caseNumber || '—'}</td>
              <td className="px-4 py-3">{e._count.ledgerTxs}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  {e.integrityStatus === 'TAMPERED' ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <Badge status={e.integrityStatus} />
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {e.lastVerifiedAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(e.lastVerifiedAt).toLocaleDateString()}
                  </span>
                ) : (
                  'never'
                )}
              </td>
            </tr>
          )}
        />
      )}

      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />}
    </div>
  );
}
