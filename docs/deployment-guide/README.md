# PhysioGaming Deployment Guide

This guide deploys the combined PhysioGaming web client and Colyseus multiplayer server to Google Cloud Run. It is written for a new maintainer deploying from a fresh Google Cloud project. The original deployment URL is provided as a reference, but its project and credentials are owned separately.

## Architecture overview

PhysioGaming is a browser game built with Phaser and TypeScript. Vite builds the client and, through the Colyseus Vite plugin, the Node.js server. The production Node.js process serves the built client, HTTP endpoints, and Colyseus rooms/WebSocket connections from one Cloud Run service. The app source and npm project are in `server/`; deploy from that directory.

```text
Browser (HTTPS / WSS)
        │
Google Cloud Run HTTPS proxy
        │
One Node.js service (port 8080)
  ├── Vite-built Phaser client
  ├── HTTP API (/api/...)
  └── Colyseus rooms over WebSockets
```

Rooms, join-code lookup, and join-code rate-limit counters are held in process memory. Use one instance for this prototype; a restart or deployment ends active sessions. The application does not require a database or a separate frontend host in this configuration.

| Reference | Value |
| --- | --- |
| Hosting platform | Google Cloud Run |
| Original region | `us-central1` |
| Original URL | [Open existing deployment](https://cs495-multiuserphysiogaming-iteration1-231223644907.us-central1.run.app/) |
| Runtime | Node.js `>=22.12.0` |
| Container port | `8080` (configured in `server/vite.config.ts`) |
| Build/start | `npm run build` / `npm start` |

## Prerequisites

- Git access to this repository (or a fork).
- Node.js 22.12 or newer and npm for local validation.
- A Google account and a Google Cloud project with billing enabled.
- Permission to enable APIs, create Cloud Run services and builds, and use Artifact Registry. The deployer also needs permission to act as the selected runtime service account.
- Google Cloud CLI (`gcloud`) installed and authenticated for the command-line procedure below.
- A domain name only if using a custom URL; the Cloud Run URL works without one.

Enable the services used by the source deployment (one time per project):

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## Environment variables and secrets

The application has no required runtime environment variables or third-party credentials in the current source. `server/.env.development` and `server/.env.production` currently contain sample placeholders only; do not copy those sample values into Cloud Run. Vite loads build-time environment files, and the client bundle is public, so never place private keys or secrets in a `VITE_` variable.

Cloud Run supplies `PORT` to containers; the current Colyseus/Vite plugin configuration sets the application port to `8080`. Do not set `NODE_ENV` to development in the public service: production mode disables the Colyseus `/monitor` and `/playground` routes and enables the security header behavior. If future code adds configuration, document its name, purpose, whether it is build-time or runtime, and the Secret Manager mapping here before deploying.

| Name | Required | Purpose / handling |
| --- | --- | --- |
| `PORT` | Supplied by Cloud Run | Container listener port; app is configured for `8080`. |
| `NODE_ENV` | No explicit setting required by this guide | Ensure the deployed runtime is production; verify buildpack defaults if changing deployment method. |
| Third-party API keys | None currently | No external API key is needed for the documented deployment. |

## External services and keys

Cloud Run, Cloud Build, and Artifact Registry are Google Cloud services used to build and run the app. The repository's current runtime has no required external API integrations, database, or API keys. GitHub access is needed only if setting up repository-based continuous deployment. Use a dedicated least-privilege service account for production; do not commit credentials, service-account JSON, or `.env` secrets to Git.

## Step-by-step deployment (Google Cloud Run)

The commands below use Bash syntax. Choose a globally unique Cloud Run service name; `physiogaming` is an example. Run the project and region setup once, then deploy from the `server/` directory.

1. Clone the source and install dependencies:

   ```bash
   git clone https://github.com/TrentonOttman/CS495-MultiUserPhysioGaming.git
   cd CS495-MultiUserPhysioGaming/server
   npm ci
   npm run build
   ```

2. Select the Google Cloud project and region. Replace the example project ID with a project you control:

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud config set run/region us-central1
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

3. Deploy source from `server/`. Cloud Build builds the source; the Node package's `build` and `start` scripts provide the build and launch commands:

   ```bash
   gcloud run deploy physiogaming \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --max 1 \
     --timeout 3600
   ```

   `--allow-unauthenticated` makes the game public. Remove it for a service that should require authenticated access. A single instance keeps in-memory Colyseus rooms together. The 3600-second timeout accommodates longer WebSocket sessions; sessions still end at timeout, instance shutdown, or deployment. Cloud Run may require a service identity and additional IAM setup depending on project policy.

4. Copy the service URL printed by the deploy command. Cloud Run provisions HTTPS for its default `run.app` hostname. The client and server share the same origin, so no separate WebSocket URL or CORS setting is required for this deployment shape.

5. For later releases, repeat the build and deploy from the same `server/` directory after updating the checked-out branch. To automate this, connect the repository to Cloud Run's continuous deployment workflow or create a Cloud Build trigger; select `server/` as the source/build context. Verify the build and start commands, service name, region, and instance limit in that workflow.

6. Record the deployment details for the next maintainer:

   | Setting | Deployed value |
   | --- | --- |
   | Google Cloud project ID | _Fill in_ |
   | Cloud Run service name | _Fill in_ |
   | Region | `us-central1` |
   | Repository and branch | _Fill in_ |
   | Build context | `server/` |
   | Service URL | _Fill in_ |
   | Runtime service account | _Fill in_ |
   | Secrets / environment overrides | None currently; record future additions |

## SSL, domain, and DNS

The default `*.run.app` service URL is served over HTTPS by Cloud Run; browsers use secure WebSockets (WSS) through the same origin. No certificate or DNS changes are needed for the default URL.

For a custom domain, use Cloud Run's domain mapping where available or place a supported Google Cloud load balancer in front of the service. Follow the console's mapping instructions to add the requested DNS records at the domain registrar, wait for DNS propagation and certificate provisioning, then verify the custom hostname loads over HTTPS and the multiplayer WebSocket connects securely. Do not point a custom hostname at the service until the mapping is configured.

## Cost and hosting notes

Cloud Run is usage-based; the actual bill depends on region, CPU and memory allocation, request and WebSocket duration, traffic, minimum instances, builds, and logs. Cloud Build and Artifact Registry can also incur charges. Review current Google Cloud pricing and the project's billing budget before public use; this guide does not assume a fixed monthly price. Setting a minimum instance count of one can reduce cold starts but increases cost while idle. The deployment command leaves the minimum at zero.

Keep maximum instances at one for this in-memory multiplayer prototype. This limits horizontal scaling and may constrain availability or concurrency; increasing it can split lobbies and join-code lookups across independent processes. Multi-instance hosting needs shared room/coordination and lookup state, plus load testing. Deployments and instance recycling interrupt active matches. Monitor Cloud Run logs, instance count, CPU/memory, and request/WebSocket behavior after launch.

## Post-deploy verification

1. Open the service URL and confirm the game client loads without browser console errors.
2. Request `https://YOUR_SERVICE_URL/api/hello`; expect HTTP 200 and `{"message":"Hello World"}`.
3. In two separate browser sessions, create a lobby in one and join it from the other. Confirm both players appear and game state updates on both clients.
4. Confirm the browser's multiplayer connection uses `wss://` and remains connected during a short match.
5. Check Cloud Run logs for startup errors, failed requests, and WebSocket errors.
6. Deploy a small follow-up revision and confirm the new revision starts. Expect current sessions to be interrupted when traffic switches or the old instance stops.

## Troubleshooting

| Symptom | Checks and remedies |
| --- | --- |
| Build cannot find `package.json` or build fails | Deploy from `server/`, not repository root; use Node 22.12+ locally; inspect Cloud Build logs. |
| Revision does not start / health check fails | Check Cloud Run revision logs, `npm start`, built `dist/server/server.mjs`, and port configuration. The app is configured for port 8080. |
| Website is blank or returns 404 | Confirm `npm run build` completed and `dist/client/` was generated; confirm the production server serves the built client. |
| `/api/hello` returns an error | Check the active revision and Cloud Run request logs; verify deployment completed successfully. |
| One player cannot see another / rooms disappear | Keep maximum instances at one; confirm both sessions use the same service URL. Restarts and deployments clear in-memory rooms. |
| WebSocket disconnects during a match | Check that the browser connects via `wss://`, the service URL/proxy is correct, and the Cloud Run timeout is appropriate. Reconnect after a timeout; active state is not persisted. |
| `/monitor` or `/playground` is unavailable | These development routes are intentionally disabled when `NODE_ENV=production`. |
| Custom domain has certificate or connection errors | Check DNS records against the Cloud Run mapping instructions, allow time for propagation and certificate provisioning, then test HTTPS and WSS again. |
| Deploy command reports permission or API errors | Confirm project selection, billing, enabled APIs, deployer IAM permissions, and permission to use the runtime service account. |

## Maintainer follow-up

- Confirm the original Cloud Run build settings and whether the GitHub trigger is still active; those settings cannot be inferred from source alone.
- After changing port, runtime settings, secrets, domain, or scaling, update this guide and repeat the verification steps.
- Reassess architecture before allowing multiple instances or promising uninterrupted multiplayer sessions.
