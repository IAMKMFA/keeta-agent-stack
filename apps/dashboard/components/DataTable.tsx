export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, string | number>[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 text-left font-medium text-slate-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-900/40">
              {columns.map((c) => (
                <td key={c} className="px-4 py-3 text-slate-200">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
