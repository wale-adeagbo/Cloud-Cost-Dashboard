"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Summary = {
  generatedAt: string;
  spendAnomalyMultiplier?: string;
  aws: {
    ok: boolean;
    configured: boolean;
    currency: string;
    totalLast30Days: number;
    byService: { name: string; amount: number }[];
    anomalies: { date: string; amount: number; ratioToBaseline: number; note: string }[];
    error?: string;
  };
  azure: {
    ok: boolean;
    configured: boolean;
    currency: string;
    totalLast30Days: number;
    byService: { name: string; amount: number }[];
    error?: string;
  };
  gcp: {
    ok: boolean;
    configured: boolean;
    idleRecommendations: {
      id: string;
      description: string;
      state: string;
      projectedMonthlySavings?: string;
    }[];
    note?: string;
    error?: string;
  };
};

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-lg ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function formatMoney(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function Home() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const awsTop = data?.aws.byService.slice(0, 12) ?? [];
  const azureTop = data?.azure.byService.slice(0, 12) ?? [];

  const chartData = awsTop.map((s) => ({
    name: s.name.length > 22 ? `${s.name.slice(0, 20)}…` : s.name,
    fullName: s.name,
    aws: s.amount,
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cloud cost dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Rolling ~30-day AWS spend (by service), Azure Cost Management totals, and GCP idle VM
            recommender hints. Configure credentials per README.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {err && (
        <p className="mb-6 rounded-lg border border-[var(--fail)]/40 bg-[var(--fail)]/10 px-4 py-3 text-sm text-[var(--fail)]">
          {err}
        </p>
      )}

      {data && (
        <p className="mb-6 text-xs text-[var(--muted)]">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card title="AWS (30d)">
          {!data?.aws.configured && (
            <p className="text-sm text-[var(--muted)]">Not configured or disabled.</p>
          )}
          {data?.aws.configured && data.aws.ok && (
            <p className="text-2xl font-semibold">
              {formatMoney(data.aws.totalLast30Days, data.aws.currency)}
            </p>
          )}
          {data?.aws.error && (
            <p className="text-sm text-[var(--warn)]">{data.aws.error}</p>
          )}
        </Card>
        <Card title="Azure (30d)">
          {!data?.azure.configured && (
            <p className="text-sm text-[var(--muted)]">Set AZURE_SUBSCRIPTION_ID + credentials.</p>
          )}
          {data?.azure.configured && data.azure.ok && (
            <p className="text-2xl font-semibold">
              {formatMoney(data.azure.totalLast30Days, data.azure.currency)}
            </p>
          )}
          {data?.azure.error && (
            <p className="text-sm text-[var(--warn)]">{data.azure.error}</p>
          )}
        </Card>
        <Card title="GCP idle hints">
          {!data?.gcp.configured && (
            <p className="text-sm text-[var(--muted)]">Set GCP_PROJECT_ID + ADC.</p>
          )}
          {data?.gcp.configured && data.gcp.ok && (
            <p className="text-2xl font-semibold">{data.gcp.idleRecommendations.length}</p>
          )}
          {data?.gcp.configured && data.gcp.ok && (
            <p className="mt-1 text-xs text-[var(--muted)]">Idle VM recommendations</p>
          )}
          {data?.gcp.error && (
            <p className="text-sm text-[var(--warn)]">{data.gcp.error}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="AWS — top services (~30d)">
          {awsTop.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No data.</p>
          ) : (
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3444" />
                  <XAxis type="number" tick={{ fill: "#8b939e", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: "#8b939e", fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141a22",
                      border: "1px solid #2a3444",
                      borderRadius: 8,
                    }}
                    formatter={(value: number) =>
                      data?.aws.currency
                        ? formatMoney(value, data.aws.currency)
                        : String(value)
                    }
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ""
                    }
                  />
                  <Bar dataKey="aws" name="Spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Azure — top services (~30d)">
          {azureTop.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No data.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {azureTop.map((s) => (
                <li
                  key={s.name}
                  className="flex justify-between gap-2 border-b border-[var(--border)] border-opacity-50 py-2 last:border-0"
                >
                  <span className="truncate text-[var(--muted)]" title={s.name}>
                    {s.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs">
                    {formatMoney(s.amount, data?.azure.currency ?? "USD")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Spend anomalies (AWS daily heuristic)" className="mt-8">
        <p className="mb-3 text-xs text-[var(--muted)]">
          Flags days above ~{data?.spendAnomalyMultiplier ?? "1.6"}× a trailing 5-day average. Tune
          with SPEND_ANOMALY_MULTIPLIER on the server. Not a substitute for AWS Cost Anomaly
          Detection.
        </p>
        {!data?.aws.anomalies?.length ? (
          <p className="text-sm text-[var(--muted)]">None detected or insufficient daily history.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.aws.anomalies.map((a) => (
              <li
                key={a.date}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-black/20 px-3 py-2"
              >
                <span className="font-mono text-[var(--warn)]">{a.date}</span>
                <span>
                  {formatMoney(a.amount, data.aws.currency)} ({a.ratioToBaseline}× baseline)
                </span>
                <span className="w-full text-xs text-[var(--muted)]">{a.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="GCP — idle / rightsizing hints" className="mt-8">
        {data?.gcp.note && <p className="mb-3 text-sm text-[var(--muted)]">{data.gcp.note}</p>}
        {!data?.gcp.idleRecommendations?.length ? (
          <p className="text-sm text-[var(--muted)]">No recommendations listed.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {data.gcp.idleRecommendations.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-[var(--border)] bg-black/15 p-3"
              >
                <div className="font-mono text-xs text-[var(--accent)]">{r.id}</div>
                <div className="mt-1">{r.description}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                  <span>State: {r.state}</span>
                  {r.projectedMonthlySavings && (
                    <span>Savings hint: {r.projectedMonthlySavings}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
