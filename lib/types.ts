export type ServiceSpend = { name: string; amount: number; currency: string };

export type DailySpend = { date: string; amount: number };

export type SpendAnomaly = {
  date: string;
  amount: number;
  ratioToBaseline: number;
  note: string;
};

export type AwsCostResult = {
  ok: boolean;
  configured: boolean;
  currency: string;
  totalLast30Days: number;
  byService: ServiceSpend[];
  daily: DailySpend[];
  anomalies: SpendAnomaly[];
  error?: string;
};

export type AzureCostResult = {
  ok: boolean;
  configured: boolean;
  currency: string;
  totalLast30Days: number;
  byService: ServiceSpend[];
  error?: string;
};

export type GcpIdleRecommendation = {
  id: string;
  description: string;
  state: string;
  projectedMonthlySavings?: string;
};

export type GcpResult = {
  ok: boolean;
  configured: boolean;
  idleRecommendations: GcpIdleRecommendation[];
  note?: string;
  error?: string;
};
