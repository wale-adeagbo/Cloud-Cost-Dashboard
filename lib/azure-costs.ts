import { DefaultAzureCredential } from "@azure/identity";
import type { AzureCostResult, ServiceSpend } from "./types";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type AzureQueryResponse = {
  properties?: {
    columns?: { name: string; type: string }[];
    rows?: unknown[][];
  };
};

export async function fetchAzureCosts(): Promise<AzureCostResult> {
  const sub = process.env.AZURE_SUBSCRIPTION_ID;

  if (process.env.DISABLE_AZURE === "true" || !sub) {
    return {
      ok: false,
      configured: Boolean(sub),
      currency: "USD",
      totalLast30Days: 0,
      byService: [],
      error: sub
        ? "Azure disabled (DISABLE_AZURE=true)."
        : "Set AZURE_SUBSCRIPTION_ID and Azure credentials (DefaultAzureCredential).",
    };
  }

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  const body = {
    type: "ActualCost",
    timeframe: "Custom",
    timePeriod: {
      from: `${ymd(start)}T00:00:00Z`,
      to: `${ymd(end)}T00:00:00Z`,
    },
    dataset: {
      granularity: "None",
      aggregation: {
        totalCost: { name: "Cost", function: "Sum" },
      },
      grouping: [{ type: "Dimension", name: "ServiceName" }],
    },
  };

  try {
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken("https://management.azure.com/.default");
    if (!token) {
      throw new Error("No Azure token from DefaultAzureCredential");
    }

    const url = `https://management.azure.com/subscriptions/${sub}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Azure Cost Management ${res.status}: ${t.slice(0, 500)}`);
    }

    const data = (await res.json()) as AzureQueryResponse;
    const cols = data.properties?.columns ?? [];
    const rows = data.properties?.rows ?? [];

    const serviceIdx = cols.findIndex((c) => c.name === "ServiceName");
    const costIdx = cols.findIndex((c) => c.name === "Cost" || c.name === "PreTaxCost");
    const currencyIdx = cols.findIndex((c) => c.name === "Currency");

    const byService: ServiceSpend[] = [];
    let totalLast30Days = 0;
    let currency = "USD";

    for (const row of rows) {
      if (!row || costIdx < 0) continue;
      const name =
        serviceIdx >= 0 ? String(row[serviceIdx] ?? "Unknown") : "Aggregated";
      const amount = Number(row[costIdx] ?? 0);
      if (currencyIdx >= 0 && row[currencyIdx]) {
        currency = String(row[currencyIdx]);
      }
      if (amount > 0) {
        byService.push({ name, amount, currency });
        totalLast30Days += amount;
      }
    }

    byService.sort((a, b) => b.amount - a.amount);

    return {
      ok: true,
      configured: true,
      currency,
      totalLast30Days,
      byService,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      configured: true,
      currency: "USD",
      totalLast30Days: 0,
      byService: [],
      error: msg,
    };
  }
}
