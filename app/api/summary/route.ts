import { NextResponse } from "next/server";
import { fetchAwsCosts } from "@/lib/aws-costs";
import { fetchAzureCosts } from "@/lib/azure-costs";
import { fetchGcpIdleHints } from "@/lib/gcp-idle";

export const dynamic = "force-dynamic";

export async function GET() {
  const [aws, azure, gcp] = await Promise.all([
    fetchAwsCosts(),
    fetchAzureCosts(),
    fetchGcpIdleHints(),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    spendAnomalyMultiplier: process.env.SPEND_ANOMALY_MULTIPLIER ?? "1.6",
    aws,
    azure,
    gcp,
  });
}
