## Project Handoff FAQ ##

- Account Ownership
    - The github project is forkable, and is currently owned by TrentonOttman, a personal account
    - The deployment is handled by github

- Secrets
    - N/A

- Hosting Costs
    - TBD

- Third-Party Limits
    - Phaser
    - Colyseus
    - Node.js with version >= 22.12.0
        - npm

- data persistence/backups
    - Colyseus server
        - Room states
        - Player info
        - Reloads rooms on server restart
    - Client side 
        - Player names
        - Reconnection tokens

- Known Limitations
    - Physio Park currently supports a maximum of 8 players per game.
    - Pong currently supports only 2 players.
    - Requires ganglion sensor

- Lobby System
    - How to create a new game for the lobby
        - Create the game implementation on the client.
        - Create a corresponding Colyseus room on the server.
        - Make the room compatible with the existing lobby system by extending LobbyCapableRoom.
        - Register the room in server/src/app.config.ts.
        - Add the game to GAME_REGISTRY in server/src/shared/games.ts.
        - Add the new game's startup function import to server/src/client/index.ts.
        - Add a case for the new game ID in enterGame() in server/src/client/index.ts. This allows the client to launch the correct game when the lobby signals that the game is ready.
        - Add a corresponding case in resumeGame() in server/src/client/index.ts if the game should support reconnecting to an existing session.
        - Set the game's room name, display label, minimum player count, and maximum player count in GAME_REGISTRY. The lobby dropdown is generated automatically from this registry, so no separate dropdown option needs to be added.
        - Add the client-side game initialization to server/src/client/index.ts.



Add the game to the appropriate client-side game selection and initialization logic.
    - How do join codes work
        - Generate a unique six-character join code whenever a new lobby is created. Codes use a restricted alphabet that excludes easily confused characters such as 0, O, 1, I, and L.
        - Store the generated code in the lobby's replicated state (LobbyState.joinCode) so the host and players in that lobby can see it.
        - Maintain a server-side mapping between each join code and its corresponding Colyseus lobby room ID in server/src/lobby/joinCodeIndex.ts.
        - Display the join code in the lobby waiting-room interface so the host can share it with other players.
        - Allow players to enter a join code through the code form in server/src/client/lobby.ts.
        - Normalize entered codes by trimming whitespace, converting letters to uppercase, and removing spaces and hyphens. This allows codes to be entered in different formats.
        - Resolve the submitted code to a lobby room ID through the /api/lobby/resolve/:code endpoint registered in server/src/app.config.ts.
        - Use the returned room ID to join the lobby with Colyseus joinById(), passing the join code along with the player's display name.
        - Validate the join code again on the server in LobbyRoom.authorizeJoin(). Private lobbies require a valid code matching that specific room, while public lobbies can be joined without one.
        - Apply rate limiting to the join code resolution endpoint to reduce code guessing attempts. The current limit is 10 requests per IP address per minute.
        - Release the join code from the server-side index when its lobby is disposed so expired codes cannot be used to find an ended lobby.


- Physio Park Level Creation
    - How to create a level for physio-park
        - create a level on https://ldtk.io
        - use server/scripts/convert-ldtk.mjs to convert the level file into a .ts file
        - put the converted .ts file into server/src/shared/physioPark/levels
        - create a level#.ts file in server/src/shared/physioPark/levels which follows the format of the other level#.ts files
        - In server/src/shared/physioPark/physioParkLevel.ts import the level#.ts file 
        - Add the imported level to "PHYSIO_PARK_LEVELS," the list of levels in server/src/shared/physioPark/physioParkLevel.ts

- Sensor Information
    - How does the sensor connect
        - The sensor uses bluetooth to connect to a device
    - How does the project interface with the sensor
        - The relevant files for the sensor are in server/src/sensor
        - For physio-park, sensorData.js is imported in server/src/client/games/physio-park.ts
        - Values are read from from sensorData.js to be used for inputs to control the characters

- How to run the project locally
    - Clone the repository
    - Change directory to server
    - Run "npm run dev"