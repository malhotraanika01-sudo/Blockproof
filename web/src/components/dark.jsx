// Small dark-theme primitives for the Head command center.
export function DarkPanel({ className = '', children }) {
  return <div className={`rounded-xl border border-command-line bg-command-panel ${className}`}>{children}</div>;
}

export function DarkTable({ columns, rows, empty = 'Nothing to show', renderRow }) {
  return (
    <div className="bp-scroll overflow-x-auto rounded-xl border border-command-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-command-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DarkInput(props) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-command-line bg-command-bg px-3 py-2 text-sm text-gray-200 outline-none placeholder:text-gray-600 focus:border-command-accent ${props.className || ''}`}
    />
  );
}

export function DarkSelect(props) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-command-line bg-command-bg px-3 py-2 text-sm text-gray-200 outline-none focus:border-command-accent ${props.className || ''}`}
    />
  );
}
