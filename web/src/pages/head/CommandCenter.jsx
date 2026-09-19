import { motion } from '../../lib/motion.jsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { FolderKanban, Activity, FileWarning, Boxes, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { Spinner } from '../../components/ui.jsx';
import CountUp from '../../components/CountUp.jsx';

const PIE = ['#14b8a6', '#7c3aed', '#f59e0b', '#ef4444', '#3b82f6', '#22c55e'];
const TOOLTIP_STYLE = {
  background: '#f8f5ee',
  border: '1px solid #d6d0c4',
  borderRadius: 8,
  color: '#1f2937',
};

function Panel({ title, children }) {
  return (
    <div className="rounded-xl border border-command-line bg-command-panel p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-gray-200">{title}</h3>}
      {children}
    </div>
  );
}

export default function CommandCenter() {
  const summary = useAsync(() => api.get('/analytics/summary').then((r) => r.data));
  const charts = useAsync(() => api.get('/analytics/charts').then((r) => r.data));

  if (summary.loading) return <Spinner label="Loading command center…" />;
  const s = summary.data;

  const cards = [
    { label: 'Total cases', value: s.totalCases, icon: FolderKanban, tone: 'text-command-accent' },
    { label: 'Active cases', value: s.activeCases, icon: Activity, tone: 'text-command-accent' },
    { label: 'Pending reports', value: s.pendingReports, icon: FileWarning, tone: 'text-amber-400' },
    { label: 'Evidence items', value: s.evidenceCount, icon: Boxes, tone: 'text-gray-200' },
    { label: 'Verified', value: s.verifiedCount, icon: ShieldCheck, tone: 'text-emerald-400' },
    { label: 'Tamper alerts', value: s.tamperAlerts, icon: ShieldAlert, tone: s.tamperAlerts ? 'text-red-400' : 'text-gray-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-command-accent">Investigation control room</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Command Center</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-command-line bg-command-panel p-4"
          >
            <c.icon className={`h-5 w-5 ${c.tone}`} />
            <div className={`mt-2 text-2xl font-bold ${c.tone}`}>
              <CountUp value={c.value} />
            </div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {charts.loading && <Spinner />}
      {charts.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Cases by status">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.data.casesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233040" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Reports by crime type">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.data.reportsByType} dataKey="value" nameKey="label" outerRadius={80} label>
                  {charts.data.reportsByType.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Investigator workload">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.data.workload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#233040" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                <Bar dataKey="cases" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Evidence by type">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.data.evidenceByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#233040" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                <Bar dataKey="items" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}
    </div>
  );
}
