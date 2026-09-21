# Investigation: Google Cloud Integration with Colyseus

## Objective

Investigate how Google Cloud can be used to host the browser-based multiplayer game and Colyseus server. The game will use a web-based framework such as Phaser or Babylon.js.

## Google Cloud and Colyseus

The Colyseus server is a Node.js/TypeScript application and can be deployed to Google Cloud Run. Cloud Run supports Node.js applications and containerized services.

Cloud Run can deploy directly from source code using Google Cloud's buildpacks and Cloud Build. This automatically creates a container image and stores it in Artifact Registry, so manually creating a Dockerfile and Artifact Registry repository is not required for a basic deployment. A custom Docker container can also be used if more control over the server environment is needed. ([docs.cloud.google.com](https://docs.cloud.google.com/run/docs/deploying-source-code))

## WebSocket Communication

Colyseus uses WebSockets for real-time communication between the game and server. Cloud Run supports WebSocket connections, making it suitable for hosting the Colyseus server.

The local development connection:

`ws://localhost:2567`

would be replaced by a secure production connection such as:

`wss://<colyseus-server-domain>`

The browser game would connect directly to the deployed Colyseus server and use Colyseus rooms to manage multiplayer sessions.

## Hosting the Web Game

The browser game can also be hosted on Google Cloud. Since Phaser and Babylon.js produce web applications, the game's HTML, JavaScript, and other assets can be served as a web application.

The web game and Colyseus server do not need to run on the same service. The browser downloads the game from its web host and then establishes a WebSocket connection to the Colyseus server running on Cloud Run.

## Scaling

Cloud Run can create multiple instances of a service as demand increases. This introduces a consideration for Colyseus because room state is maintained by the server.

Google documents that WebSocket applications running across multiple Cloud Run instances may require state synchronization between instances. Session affinity can help keep clients connected to the same instance, but it is only best-effort. ([docs.cloud.google.com](https://docs.cloud.google.com/run/docs/triggering/websockets))

For the initial prototype, the expected number of players is small, so the primary goal is to establish a working deployment. Larger-scale deployment may require additional infrastructure for synchronizing Colyseus room state.

## Security

The production application should use HTTPS for the website and secure WebSockets (`wss://`) for communication between the game and Colyseus server. Cloud Run provides HTTPS endpoints and manages TLS certificates for its service URLs.

The Colyseus server should validate data received from clients rather than trusting client-provided game state. Server-side validation can prevent clients from sending invalid positions, player information, or other game data.

Any API keys, credentials, or other sensitive configuration required by the server should not be included in the browser game. Google Cloud provides Secret Manager for storing sensitive values that the server needs at runtime. ([docs.cloud.google.com](https://docs.cloud.google.com/run/docs/configuring/services/secrets))

Cloud Run also provides a service identity that can be given permissions to access other Google Cloud services. Permissions should be limited to only the resources required by the application. ([docs.cloud.google.com](https://docs.cloud.google.com/run/docs/securing/service-identity))

For the initial prototype, the primary security requirements are secure WebSocket connections, server-side validation, and keeping any server credentials out of the client-side game.

## Deployment

A simple deployment using Google Cloud can be performed directly from the Colyseus server's source code:

1. Configure the Google Cloud project for Cloud Run.
2. Deploy the Colyseus server from source using Cloud Run.
3. Google Cloud builds and containerizes the application automatically.
4. The resulting container is stored in Artifact Registry.
5. Cloud Run deploys the container and provides a public service URL.
6. Configure the web game to connect to the deployed Colyseus server.
7. Host the web game on an appropriate Google Cloud web hosting service.
8. Test multiple clients connecting to the same Colyseus room.

A custom Dockerfile and manually managed Artifact Registry repository can be introduced later if the project requires greater control over the deployment environment. ([docs.cloud.google.com](https://docs.cloud.google.com/run/docs/deploying-source-code))

## Result

Google Cloud is suitable for the proposed multiplayer architecture. Cloud Run can host the Node.js/Colyseus server and supports the WebSocket connections required for real-time multiplayer.

For the initial deployment, Cloud Run's source-based deployment is the simplest approach because Google handles the containerization and Artifact Registry storage automatically.

The main consideration for future scaling is how multiple Cloud Run instances interact with Colyseus room state. This is unlikely to be a significant issue for the initial prototype but should be considered if the number of simultaneous players or rooms increases.
