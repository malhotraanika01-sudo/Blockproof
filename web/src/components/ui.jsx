import { motion } from '../lib/motion.jsx';
import { Loader2, Inbox } from 'lucide-react';

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function Button({ as: As = 'button', variant = 'primary', size = 'md', className = '', loading, children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  const variants = {
    primary: 'bg-civic-600 text-white hover:bg-civic-700',
    forensic: 'bg-forensic-700 text-white hover:bg-forensic-600',
    command: 'bg-command-accent text-command-bg hover:brightness-110 font-semibold',
    ghost: 'text-gray-600 hover:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <As className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </As>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <div>
      {label && <label className="bp-label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export const Input = (props) => <input {...props} className={`bp-input ${props.className || ''}`} />;
export const Textarea = (props) => <textarea {...props} className={`bp-input min-h-[96px] ${props.className || ''}`} />;
export const Select = (props) => <select {...props} className={`bp-input ${props.className || ''}`} />;

const badgeColors = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-civic-100 text-civic-700',
  purple: 'bg-violet-100 text-violet-800',
};

const STATUS_TONE = {
  SUBMITTED: 'blue', UNDER_REVIEW: 'amber', ESCALATED: 'purple', REJECTED: 'red', CLOSED: 'gray',
  OPEN: 'blue', IN_PROGRESS: 'amber', REOPENED: 'purple',
  PENDING: 'amber', VERIFIED: 'green', TAMPERED: 'red', COMPLETED: 'green',
  LOW: 'gray', MEDIUM: 'blue', HIGH: 'amber', CRITICAL: 'red',
};

export function Badge({ children, tone, status }) {
  const t = tone || STATUS_TONE[status] || 'gray';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[t]}`}>
      {children ?? status}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 py-14 text-center">
      <Icon className="h-8 w-8 text-gray-300" />
      <p className="font-medium text-gray-600">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-400">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {message}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 underline">
          retry
        </button>
      )}
    </div>
  );
}

export function Card({ className = '', children, motionProps }) {
  return (
    <motion.div variants={fadeUp} {...motionProps} className={`bp-card p-5 ${className}`}>
      {children}
    </motion.div>
  );
}

export function Stat({ label, value, tone = 'blue' }) {
  return (
    <div className="bp-card p-4">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
