import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { Search, FolderOpen } from 'lucide-react';
import { fetchList } from '../../lib/api.js';
import { useAsync, useDebounced } from '../../lib/hooks.js';
import { Badge, Spinner, EmptyState, Input, Select, Pagination } from '../../components/ui.jsx';

export default function Cases() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  const { data, loading } = useAsync(
    () => fetchList('/cases', { q: dq || undefined, status: status || undefined, page, pageSize: 12 }),
    [dq, status, page],
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-forensic-900">My cases</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-forensic-300" />
          <Input
            className="pl-9"
            placeholder="Search case number or title"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All statuses</option>
          {['OPEN', 'IN_PROGRESS', 'CLOSED', 'REOPENED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>

      <div className="mt-5 space-y-2">
        {loading && <Spinner />}
        {data?.items?.length === 0 && <EmptyState icon={FolderOpen} title="No cases match" />}
        {data?.items?.map((c, i) => (
          <motion.div key={c.caseId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <Link
              to={`/investigator/cases/${c.caseId}`}
              className="block rounded-lg border border-forensic-100 bg-white p-4 transition hover:border-forensic-300"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-forensic-700">{c.caseNumber}</span>
                <Badge status={c.status} />
                <Badge status={c.priority} />
                <span className="ml-auto text-xs text-forensic-400">
                  opened {new Date(c.openedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1 font-medium text-forensic-900">{c.title}</div>
              <div className="text-xs text-forensic-400">
                {c.report?.crimeType} · {c._count.evidence} evidence · {c._count.updates} updates
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {data && <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />}
    </div>
  );
}
