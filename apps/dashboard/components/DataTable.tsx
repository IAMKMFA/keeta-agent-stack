import type { ReactNode } from 'react';

type TableColumn = {
  key: string;
  label: string;
  className?: string;
};

export function DataTable({
  columns,
  rows,
  emptyMessage = 'No records yet.',
  rowKey,
}: {
  columns: TableColumn[];
  rows: Record<string, ReactNode>[];
  emptyMessage?: string;
  rowKey?: (row: Record<string, ReactNode>, index: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--hub-line)] bg-white/70">
      <table className="hub-table min-w-full text-sm">
        <thead className="bg-[#f8f8f8]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 text-left font-medium ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-[var(--hub-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={rowKey ? rowKey(row, idx) : String(idx)} className="hover:bg-[#f6f7f7]">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 text-[#343232] ${c.className ?? ''}`}>
                    {row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
