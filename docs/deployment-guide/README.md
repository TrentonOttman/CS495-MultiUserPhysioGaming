# PhysioGaming Deployment Guide

This guide explains the project's current deployment on **Google Cloud Run**.

## Overview

PhysioGaming is a web-based multiplayer game using **Node.js**, **Colyseus**, **Vite**, **TypeScript**, and **Phaser**. Its application code is in the repository's `server/` directory.

The build packages both the web client and multiplayer server. The same Node.js service serves the website, HTTP APIs, and multiplayer connections; a separate frontend service is not required.

- **Repository:** https://github.com/TrentonOttman/CS495-MultiUserPhysioGaming
- **Current hosting platform:** Google Cloud Run (`us-central1`)
- **Existing deployment:** https://cs495-multiuserphysiogaming-iteration1-231223644907.us-central1.run.app/
- **Application port:** `8080` in the current Colyseus/Vite configuration
- **Node.js requirement:** `>=22.12.0`

> The existing Cloud Run URL belongs to the original Google Cloud project. A new team or host should create its own deployment rather than rely on continued access to that account.

## Prerequisites

For local builds or deployments, install:

- Git
- Node.js 22.12 or newer and npm
- Access to the GitHub repository

For Google Cloud deployment, also have:

- A Google Cloud project with billing enabled
- Permissions to manage Cloud Run services, builds, and the GitHub connection
- The APIs required by the chosen Cloud Run deployment workflow enabled (typically Cloud Run, Cloud Build, and Artifact Registry)

## Build and test locally

Commands below are run from the repository root unless otherwise indicated.

```bash
git clone https://github.com/TrentonOttman/CS495-MultiUserPhysioGaming.git
cd CS495-MultiUserPhysioGaming/server
npm ci
npm run test
npm run build
npm start
```

The build command runs `vite build` and generates `dist/client/` and `dist/server/`. The start command runs `node dist/server/server.mjs`.

To run the development server instead:

```bash
npm run dev
```

Open the local URL printed by the development server. To verify the production build, use the address and port printed by `npm start` and request `/api/hello`, which should return `{"message":"Hello World"}`.

## Current deployment: Google Cloud Run with GitHub

The original deployment was set up using **Cloud Run's GitHub repository integration**. Cloud Run connects to the repository, builds the application, and deploys a service. This section describes how a new maintainer can recreate that workflow; the exact options may differ with Google Cloud console updates.

1. Sign in to the [Google Cloud Console](https://console.cloud.google.com/) and select a project with billing enabled.
2. Open **Cloud Run** and create a service using the option to deploy continuously from a source repository.
3. Connect GitHub, authorize repository access, and select `TrentonOttman/CS495-MultiUserPhysioGaming` (or a fork).
4. Select the branch to deploy (for example, `main`).
5. **Important:** The Node application lives in `server/`, not at the repository root. Configure the build context / source directory accordingly, or supply a build configuration that explicitly enters `server/`.
6. Configure the build to install dependencies, run `npm run build`, and start the server using `npm start` (`node dist/server/server.mjs`). If the source-build workflow does not support these options directly, use an appropriate build configuration or Dockerfile instead.
7. Configure the container port as `8080` and use region `us-central1` if matching the original deployment.
8. Deploy the service. Configure public access only if the game is intended to be publicly accessible.
9. Visit the new service URL and verify that the website loads, `/api/hello` responds, and two browser sessions can connect to the same lobby and play.
10. Verify that subsequent pushes to the configured branch trigger builds and deploys in the connected workflow.

**Record the new project's settings here during handoff:**

| Setting | Value |
| --- | --- |
| Google Cloud project ID | _To be filled in_ |
| Cloud Run service name | _To be filled in_ |
| Region | `us-central1` (original) |
| Source repository / branch | _To be filled in_ |
| Build configuration / working directory | _To be filled in_ |
| Deployed service URL | _To be filled in_ |
| Service account and required permissions | _To be filled in_ |
| Environment variables / secrets | _To be filled in_ |

### Multiplayer hosting considerations

Colyseus maintains active rooms and connections in server memory. When operating without shared room state or distributed coordination:

- **Use a maximum of one running application instance** for the initial deployment. Multiple independent instances can split users and lobby state across processes.
- **Consider a minimum instance count of one** to avoid cold starts, while recognizing that it increases hosting cost.
- **Expect interrupted games during deployments, restarts, and instance shutdowns.** The current guide does not claim persistent sessions or automatic reconnection across server replacement.
- Cloud Run supports WebSocket connections, but they remain subject to **request timeouts**. Set and test an appropriate timeout, and verify that the client reconnects or displays a clear error after disconnection.
- Check Cloud Run logs and metrics if clients cannot connect or rooms unexpectedly disappear.

Review these limits before hosting a larger production workload. Scaling to multiple instances would require additional architecture and testing.

## Verification checklist

- [ ] The built application starts successfully in the chosen environment.
- [ ] The main website loads over HTTPS when publicly hosted.
- [ ] `GET /api/hello` returns `{"message":"Hello World"}`.
- [ ] A user can create a lobby and another user can join it.
- [ ] Two browsers can enter a multiplayer game and receive state updates.
- [ ] WebSockets function through the hosting provider's proxy or load balancer.
- [ ] Server logs are available and error-free during a basic multiplayer test.
- [ ] A new deployment and server restart have been tested for expected user impact.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Build fails | Node.js version, `npm ci`, source directory (`server/`), and build logs |
| Website returns 404 | Whether the complete Vite build ran and `serveClient: true` is configured |
| Service fails to start | Start command, `PORT`, container binding address, and Cloud Run logs |
| One player cannot join another | WebSocket support, room routing, and whether more than one instance is running |
| `/monitor` or `/playground` is missing | These routes are intentionally disabled when `NODE_ENV=production` |
| Sessions disappear after redeploy | In-memory Colyseus rooms do not automatically survive instance replacement |

## Future handoff tasks

- [ ] Add and test `server/Dockerfile` and `server/.dockerignore`.
- [ ] Confirm the exact original GitHub-to-Cloud Run build settings and document them above.
- [ ] Verify the server binds to `0.0.0.0` and respects `PORT` in each deployment environment.
- [ ] Document any required environment variables, secret management, and access transfer.
- [ ] Test deployment on a fresh Google Cloud project or an alternative container host.
