import { GoogleAuth } from "google-auth-library";
import type { GcpIdleRecommendation, GcpResult } from "./types";

type ListRecommendationsResponse = {
  recommendations?: {
    name?: string;
    description?: string;
    state?: string;
    primaryImpact?: { costProjection?: { monthlySavings?: { units?: string } } };
  }[];
};

export async function fetchGcpIdleHints(): Promise<GcpResult> {
  const projectId = process.env.GCP_PROJECT_ID;

  if (process.env.DISABLE_GCP === "true" || !projectId) {
    return {
      ok: false,
      configured: Boolean(projectId),
      idleRecommendations: [],
      note: projectId
        ? "GCP disabled (DISABLE_GCP=true)."
        : "Set GCP_PROJECT_ID and Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login).",
    };
  }

  const recommenderId =
    process.env.GCP_IDLE_RECOMMENDER ??
    "google.compute.instance.IdleResourceRecommender";

  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;
    if (!token) throw new Error("No GCP access token");

    const parent = `projects/${projectId}/locations/global/recommenders/${recommenderId}`;
    const url = `https://recommender.googleapis.com/v1/${parent}/recommendations`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Recommender API ${res.status}: ${t.slice(0, 500)}`);
    }

    const data = (await res.json()) as ListRecommendationsResponse;
    const idleRecommendations: GcpIdleRecommendation[] = (
      data.recommendations ?? []
    ).map((r) => ({
      id: r.name?.split("/").pop() ?? r.name ?? "unknown",
      description: r.description ?? "",
      state: r.state ?? "",
      projectedMonthlySavings: r.primaryImpact?.costProjection?.monthlySavings?.units,
    }));

    return {
      ok: true,
      configured: true,
      idleRecommendations,
      note:
        idleRecommendations.length === 0
          ? "No idle VM recommendations returned (resources may be healthy or Recommender needs time)."
          : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      configured: true,
      idleRecommendations: [],
      error: msg,
    };
  }
}
