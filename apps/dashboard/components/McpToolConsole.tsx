'use client';

import { useEffect, useState, useTransition } from 'react';
import { isApiConfigured, requestJson } from '../lib/api';

type OracleMcpTool = {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

type ToolsResponse = {
  ok: boolean;
  count: number;
  tools: OracleMcpTool[];
};

type ToolCallResponse = {
  ok: boolean;
  tool: string;
  data: unknown;
};

export function McpToolConsole({
  initialTools = [],
}: {
  initialTools?: OracleMcpTool[];
}) {
  const [tools, setTools] = useState<OracleMcpTool[]>(initialTools);
  const [selectedTool, setSelectedTool] = useState(initialTools[0]?.name ?? '');
  const [argsText, setArgsText] = useState('{}');
  const [output, setOutput] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (selectedTool || tools.length === 0) return;
    setSelectedTool(tools[0]?.name ?? '');
  }, [selectedTool, tools]);

  async function refreshTools() {
    setError(null);
    if (!isApiConfigured()) {
      setError('Set NEXT_PUBLIC_API_URL to discover MCP tools.');
      return;
    }
    try {
      const response = await requestJson<ToolsResponse>('/oracle/mcp/tools');
      startTransition(() => {
        setTools(response.tools);
      });
      if (!selectedTool && response.tools[0]?.name) {
        setSelectedTool(response.tools[0].name);
      }
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Unable to list MCP tools';
      setError(message);
    }
  }

  async function runTool() {
    setError(null);
    if (!selectedTool) {
      setError('Select a tool first.');
      return;
    }
    if (!isApiConfigured()) {
      setError('Set NEXT_PUBLIC_API_URL to call MCP tools.');
      return;
    }
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(argsText) as Record<string, unknown>;
    } catch {
      setError('Arguments must be valid JSON.');
      return;
    }
    try {
      const response = await requestJson<ToolCallResponse>(`/oracle/mcp/tools/${encodeURIComponent(selectedTool)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedArgs),
      });
      startTransition(() => {
        setOutput(response.data);
      });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Unable to execute tool';
      setError(message);
    }
  }

  const currentTool = tools.find((tool) => tool.name === selectedTool);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="hub-kicker">MCP Console</div>
          <h3 className="hub-heading mt-1 text-xl font-semibold">Oracle tool explorer</h3>
          <p className="mt-1 text-sm text-[var(--hub-muted)]">
            Inspect and invoke mirrored KTA-Oracle MCP tools directly from the hub.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshTools}
          className="rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 text-xs text-[#555] transition hover:bg-[#f5f5f5]"
        >
          Refresh tools
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Tool</span>
          <select
            value={selectedTool}
            onChange={(event) => setSelectedTool(event.target.value)}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
          >
            {tools.length === 0 ? <option value="">No tools discovered</option> : null}
            {tools.map((tool) => (
              <option key={tool.name} value={tool.name}>
                {tool.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Arguments (JSON)</span>
          <textarea
            value={argsText}
            onChange={(event) => setArgsText(event.target.value)}
            rows={7}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 font-mono text-xs outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder='{"currency":"USD"}'
          />
        </label>
      </div>

      {currentTool?.description ? (
        <div className="rounded-xl border border-[var(--hub-line)] bg-[#f8f8f8] px-3 py-2 text-sm text-[#5c5a5a]">
          {currentTool.description}
        </div>
      ) : null}

      <button
        type="button"
        onClick={runTool}
        disabled={isPending}
        className="rounded-xl bg-[var(--hub-accent)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Running...' : 'Run tool'}
      </button>

      {error ? (
        <div className="rounded-xl border border-[rgba(190,63,67,0.42)] bg-[rgba(190,63,67,0.08)] px-3 py-2 text-sm text-[var(--hub-danger)]">
          {error}
        </div>
      ) : null}

      {output ? (
        <pre className="max-h-[360px] overflow-auto rounded-2xl border border-[var(--hub-line)] bg-[#111313] p-4 text-xs text-[#dde6e6]">
          {JSON.stringify(output, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
