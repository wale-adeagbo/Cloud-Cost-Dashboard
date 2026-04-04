# Cloud cost monitoring dashboard

A Next.js app that pulls **AWS Cost Explorer** (last ~30 days by service + daily series), **Azure Cost Management** (subscription scope, by service), and **GCP Recommender** idle VM hints. Includes a simple **daily spend anomaly** heuristic for AWS (not a replacement for AWS Cost Anomaly Detection).

## Prerequisites

- Node **22+**
- Cloud IAM permissions (see below)

## Quick start

```bash
cd cloud-cost-dashboard
npm install
cp .env.example .env.local
# Fill .env.local; authenticate each cloud you enable
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Refresh** to re-query APIs.

## IAM / permissions

### AWS

- Enable **Cost Explorer** in the billing console (once per payer account).
- IAM policy must allow `ce:GetCostAndUsage` (e.g. `AWSBillingReadOnlyAccess` or a custom statement).
- Credentials: `AWS_PROFILE`, instance role, or env keys. The app calls Cost Explorer in **`us-east-1`** (API requirement).

### Azure

- Set `AZURE_SUBSCRIPTION_ID`.
- Use [DefaultAzureCredential](https://learn.microsoft.com/en-us/javascript/api/overview/azure/identity-readme): service principal env vars, managed identity, or `az login` for local dev.
- Role: **Cost Management Reader** (or broader) on the subscription.

### GCP

- Set `GCP_PROJECT_ID`.
- [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc): `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS`.
- Role: **Recommender Viewer** or **Viewer** on the project (for idle VM recommender). Billing **cost totals** are not queried here; extend the app with Billing Export to BigQuery if you need GCP spend charts.

## Production

```bash
npm run build
npm run start
```

Run behind your org’s auth (VPN, OAuth proxy, or private network). **Do not** expose this app publicly without protecting it—API routes use your cloud credentials.

## Suggested GitHub name

`Cloud-Cost-Dashboard` or align with your naming standard.
