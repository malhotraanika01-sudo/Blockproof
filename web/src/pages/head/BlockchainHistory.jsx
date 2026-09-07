import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from '../../lib/motion.jsx';
import { Link2, Search, Boxes, Hash } from 'lucide-react';
import { api, fetchList } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { Badge, Spinner, EmptyState } from '../../components/ui.jsx';
import { DarkPanel, DarkInput, DarkTable } from '../../components/dark.jsx';

export default function BlockchainHistory() {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('evidence') || '');
  const [active, setActive] = useState(params.get('evidence') || '');

  const feed = useAsync(() => fetchList('/blockchain', { pageSize: 40 }), []);
  const chain = useAsync(
    () => (active ? api.get(`/blockchain/evidence/${encodeURIComponent(active)}`).then((r) => r.data) : Promise.resolve(null)),
    [active],
  );

  useEffect(() => {
    if (params.get('evidence')) {
      setCode(params.get('evidence'));
      setActive(params.get('evidence'));
    }
  }, [params]);

  const lookup = (e) => {
    e.preventDefault();
    setActive(code.trim());
    setParams(code.trim() ? { evidence: code.trim() } : {});
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-command-accent">Head of Investigation only</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
          <Link2 className="h-6 w-6 text-command-accent" /> Blockchain History
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Immutable custody &amp; integrity events from the permissioned ledger. Investigators and citizens cannot access this view.
        </p>
      </div>

      <form onSubmit={lookup} className="flex gap-2">
        <DarkInput
          placeholder="Evidence code, e.g. EV-1002"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 font-mono"
        />
        <button className="inline-flex items-center gap-1 rounded-lg bg-command-accent px-4 py-2 text-sm font-semibold text-command-bg">
          <Search className="h-4 w-4" /> Trace
        </button>
      </form>

      {active && (
        <div>
          {chain.loading && <Spinner />}
          {chain.data && (
            <DarkPanel className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-command-accent">{chain.data.evidenceCode}</span>
                <Badge status={chain.data.integrityStatus} />
                <span className="text-xs text-gray-500">ledger driver: {chain.data.ledgerDriver}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-command-bg p-2 font-mono text-[11px] text-gray-400">
                <Hash className="h-3.5 w-3.5" />
                {chain.data.sha256}
              </div>

              <ol className="mt-5 space-y-4">
                {chain.data.chain.map((ev, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative rounded-lg border border-command-line bg-command-bg p-3 pl-6"
                  >
                    <span className="absolute left-2 top-4 h-2.5 w-2.5 rounded-full bg-command-accent" />
                    {i < chain.data.chain.length - 1 && (
                      <span className="absolute left-[11px] top-6 h-full w-px bg-command-line" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-100">{ev.eventType.replaceAll('_', ' ')}</span>
                      <span className="text-xs text-gray-500">{new Date(ev.timestamp).toLocaleString()}</span>
                    </div>
                    <dl className="mt-1.5 grid grid-cols-1 gap-0.5 font-mono text-[11px] text-gray-500 sm:grid-cols-2">
                      <div className="truncate">tx: {ev.fabricTxId}</div>
                      <div>block: {ev.blockReference || '—'}</div>
                      <div className="truncate sm:col-span-2">hash: {ev.recordedHash}</div>
                    </dl>
                  </motion.li>
                ))}
              </ol>
            </DarkPanel>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-200">
          <Boxes className="h-4 w-4" /> Full ledger feed
        </h2>
        {feed.loading ? (
          <Spinner />
        ) : feed.data?.items?.length === 0 ? (
          <EmptyState title="No ledger events yet" />
        ) : (
          <DarkTable
            columns={['Time', 'Evidence', 'Event', 'Fabric tx', 'Block', 'Hash']}
            rows={feed.data?.items ?? []}
            renderRow={(t) => (
              <tr key={t.txId} className="text-gray-300">
                <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(t.recordedAt).toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => {
                      setCode(t.evidence.evidenceCode);
                      setActive(t.evidence.evidenceCode);
                      setParams({ evidence: t.evidence.evidenceCode });
                    }}
                    className="font-mono text-xs text-command-accent hover:underline"
                  >
                    {t.evidence.evidenceCode}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-xs">{t.eventType.replaceAll('_', ' ')}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{t.fabricTxId.slice(0, 18)}…</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{t.blockReference || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500">{t.recordedHash.slice(0, 12)}…</td>
              </tr>
            )}
          />
        )}
      </div>
    </div>
  );
}
