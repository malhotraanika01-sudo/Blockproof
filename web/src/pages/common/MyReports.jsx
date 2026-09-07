import { Link } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { FileText, ArrowRight } from 'lucide-react';
import { fetchList } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { Badge, Spinner, EmptyState, ErrorState } from '../../components/ui.jsx';

export default function MyReports() {
  const { data, loading, error, refetch } = useAsync(() => fetchList('/reports', { pageSize: 50 }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">My reports</h1>
      <p className="mt-1 text-sm text-gray-500">Every report you have submitted and its current status.</p>

      <div className="mt-6 space-y-3">
        {loading && <Spinner />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {data?.items?.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            hint="When you submit a report it will appear here with a tracking code."
            action={
              <Link to="/report" className="mt-2 rounded-lg bg-civic-600 px-4 py-2 text-sm font-medium text-white">
                Report a crime
              </Link>
            }
          />
        )}
        {data?.items?.map((r, i) => (
          <motion.div
            key={r.reportId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-civic-700">{r.trackingCode}</span>
                  <Badge status={r.status} />
                  {r.case && <Badge tone="purple">{r.case.caseNumber}</Badge>}
                </div>
                <div className="mt-1 font-medium text-gray-900">{r.title}</div>
                <div className="mt-0.5 text-sm text-gray-500">
                  {r.crimeType} · {r._count.evidence} evidence file(s) · submitted{' '}
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Link
                to={`/track?code=${r.trackingCode}`}
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-civic-600 hover:underline"
              >
                Track <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
