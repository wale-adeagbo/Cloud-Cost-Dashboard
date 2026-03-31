import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer";
import { detectDailySpendAnomalies } from "./spend-anomaly";
import type { AwsCostResult } from "./types";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchAwsCosts(): Promise<AwsCostResult> {
  if (process.env.DISABLE_AWS === "true") {
    return {
      ok: false,
      configured: false,
      currency: "USD",
      totalLast30Days: 0,
      byService: [],
      daily: [],
      anomalies: [],
      error: "AWS disabled (DISABLE_AWS=true).",
    };
  }

  /** Cost Explorer API is only available in us-east-1. */
  const client = new CostExplorerClient({ region: "us-east-1" });

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  try {
    const byServiceOut = await client.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: ymd(start), End: ymd(end) },
        Granularity: "MONTHLY",
        Metrics: ["UnblendedCost"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
      }),
    );

    const dailyOut = await client.send(
      new GetCostAndUsageCommand({
        TimePeriod: { Start: ymd(start), End: ymd(end) },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost"],
      }),
    );

    const rows = byServiceOut.ResultsByTime?.flatMap((r) => r.Groups ?? []) ?? [];
    const currency =
      rows[0]?.Metrics?.UnblendedCost?.Unit ??
      byServiceOut.ResultsByTime?.[0]?.Groups?.[0]?.Metrics?.UnblendedCost?.Unit ??
      "USD";

    const merged = new Map<string, number>();
    for (const g of rows) {
      const name = g.Keys?.[0] ?? "Unknown";
      const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount ?? "0");
      merged.set(name, (merged.get(name) ?? 0) + amt);
    }

    const byService = [...merged.entries()]
      .map(([name, amount]) => ({ name, amount, currency }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const totalLast30Days = byService.reduce((s, x) => s + x.amount, 0);

    const daily: { date: string; amount: number }[] =
      dailyOut.ResultsByTime?.map((r) => ({
        date: r.TimePeriod?.Start ?? "",
        amount: parseFloat(
          r.Total?.UnblendedCost?.Amount ??
            r.Groups?.reduce(
              (acc, g) => acc + parseFloat(g.Metrics?.UnblendedCost?.Amount ?? "0"),
              0,
            ).toString() ??
            "0",
        ),
      })) ?? [];

    const multiplier = Number(process.env.SPEND_ANOMALY_MULTIPLIER ?? "1.6");
    const anomalies = detectDailySpendAnomalies(daily, multiplier);

    return {
      ok: true,
      configured: true,
      currency,
      totalLast30Days,
      byService,
      daily,
      anomalies,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      configured: true,
      currency: "USD",
      totalLast30Days: 0,
      byService: [],
      daily: [],
      anomalies: [],
      error: msg,
    };
  }
}
