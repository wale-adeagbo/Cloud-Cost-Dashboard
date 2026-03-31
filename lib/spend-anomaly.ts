import type { DailySpend, SpendAnomaly } from "./types";

/**
 * Simple statistical flag: any day above `multiplier` × trailing mean (excluding that day).
 * Complements (does not replace) AWS Cost Anomaly Detection in the console.
 */
export function detectDailySpendAnomalies(
  daily: DailySpend[],
  multiplier = 1.6,
  minBaselineDays = 5,
): SpendAnomaly[] {
  if (daily.length < minBaselineDays + 1) return [];

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const anomalies: SpendAnomaly[] = [];

  for (let i = minBaselineDays; i < sorted.length; i++) {
    const window = sorted.slice(i - minBaselineDays, i);
    const mean = window.reduce((s, d) => s + d.amount, 0) / window.length;
    if (mean <= 0) continue;
    const day = sorted[i];
    const ratio = day.amount / mean;
    if (ratio >= multiplier) {
      anomalies.push({
        date: day.date,
        amount: day.amount,
        ratioToBaseline: Math.round(ratio * 100) / 100,
        note: `Spend ~${ratio.toFixed(2)}× the prior ${minBaselineDays}-day average`,
      });
    }
  }

  return anomalies;
}
