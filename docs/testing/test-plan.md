# Testing Plan — Physio Park

## Scope & Objectives

Verify the multiplayer lobby, the Physio Park game room, the shared platformer physics, client-side prediction, and player name tags, so changes can be merged without breaking existing gameplay.

What is covered:

- **Automated (server and shared code):** lobby creation, configuration, join codes, starting games, disconnect/reconnect handling, Physio Park room physics, the goal quorum with dropped players, shared input rules, client-side prediction, and name tag labels.
- **Build check (browser code):** the client is type-checked and built, but it has no automated tests. Browser behavior is covered by the manual test cases below.
- **Manual:** multiplayer play-testing in the browser, the EMG sensor, level completion and transitions (levels 1 to 3), Level 2's button and crate, Level 3's switches and moving platforms, and client-side prediction under network lag.

## Test Environment Setup

Requirements: **Node.js 22 or newer** (`node -v` to check) and npm. On Windows, run everything inside WSL (Ubuntu).

```bash
git clone https://github.com/TrentonOttman/CS495-MultiUserPhysioGaming.git
cd CS495-MultiUserPhysioGaming/server
npm install
```

If Node is too old, install 22 with nvm:

```bash
nvm install 22
nvm alias default 22
```

Then delete `node_modules` and run `npm install` again.

## Run Instructions

All commands run from the `server/` folder.

| What | Command | Expected result |
|---|---|---|
| Automated tests | `npm test` | `68 passing` (about 15 seconds) |
| Type check | `npx tsc --noEmit` | No output (no errors) |
| Client build | `npm run build` | Ends with `✓ built in ...` |
| Run the game locally | `npm run dev` | Prints a local address to open in the browser |

Run a single test file:

```bash
npx mocha -r tsx -r ./test/root-hooks.ts test/PhysioParkRoom.test.ts --exit --timeout 15000
```

`npm install` can rewrite `package-lock.json`. If you did not mean to change dependencies, undo it before committing with `git restore package-lock.json`.

### Continuous Integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`. It uses Node 22 and runs `npm ci`, `npx tsc --noEmit`, `npm test`, and `npm run build`. A pull request should not be merged while this check is failing.

## Test Case Inventory

Automated tests live in `server/test/`. The test server is started once for the whole run by `test/root-hooks.ts` using `test/harness.ts` (`@colyseus/testing`).

### Lobby — `test/LobbyRoom.test.ts` (`session_lobby`)

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-L01 | Creator is seated and becomes host | Automated | `seats the creator and marks them host` | Creator is in the roster and marked host |
| T-L02 | Host gets a join code to share | Automated | `mints a join code for the host to share` | A join code is created for the lobby |
| T-L03 | Unknown game is rejected | Automated | `rejects an unknown game` | Lobby creation fails for a game not in the registry |
| T-L04 | Roster syncs to every client | Automated | `replicates the roster and count to every client as players join and leave` | All clients see the same roster and player count after joins and leaves |
| T-L05 | Lobby capacity is enforced | Automated | `does not admit players beyond the configured capacity` | Join beyond max players is refused |
| T-L06 | Dropped player keeps their seat | Automated | `keeps an unexpectedly dropped player seated during the reconnection window` | Player stays in the roster during the reconnection window |
| T-L07 | Host role passes on if host never returns | Automated | `promotes the next player after a dropped host's reconnection window expires` | Next player becomes host after the window expires |
| T-L08 | Only the host can kick | Automated | `allows only the host to kick a player and replicates the removal` | Non-host kick is ignored; host kick removes the player for everyone (**known flaky**, see Limitations) |
| T-L09 | Valid lobby size accepted | Automated | `accepts a size the game allows` | Size within the game's allowed range is applied |
| T-L10 | Name and visibility recorded | Automated | `records the name and visibility in state and metadata` | Name and public/private appear in state and listing metadata |
| T-L11 | Invalid size rejected | Automated | `rejects a size the game does not allow` | Out-of-range size is refused |
| T-L12 | Fractional size rejected | Automated | `rejects a fractional size` | Non-integer size is refused |
| T-L13 | Blank name rejected | Automated | `rejects an empty or whitespace-only name` | Empty or whitespace name is refused |
| T-L14 | Over-long name rejected | Automated | `rejects a name longer than the limit` | Name over the limit is refused |
| T-L15 | Visibility must be true/false | Automated | `rejects a non-boolean visibility` | Non-boolean visibility is refused |
| T-L16 | Only the host can configure | Automated | `refuses configuration from a non-host` | Non-host configuration is ignored |
| T-L17 | Public lobby names are unique | Automated | `rejects a duplicate name between public lobbies` | Second public lobby with the same name is refused |
| T-L18 | Private lobbies may share names | Automated | `allows two private lobbies to share a name` | Both private lobbies are accepted |
| T-L19 | Private lobbies stay unlisted | Automated | `keeps private lobbies out of the public listing` | Private lobby is not in the public list |
| T-L20 | Public lobbies are listed | Automated | `lists public lobbies` | Public lobby appears in the list |
| T-L21 | Start creates the game room | Automated | `creates the game room with the configured lobby` | Game room is created with the lobby's settings |
| T-L22 | Start uses the registered room | Automated | `starts the room named by the registry` | The room registered for the chosen game is started |
| T-L23 | No joins after start | Automated | `rejects joins after the host starts the game` | Join after start is refused |
| T-L24 | Only the host can start | Automated | `refuses to start from a non-host` | Non-host start is ignored |
| T-L25 | Lobby must be named to start | Automated | `refuses to start an unnamed lobby` | Start is refused |
| T-L26 | Minimum players required | Automated | `refuses to start before the game minimum is met` | Start is refused below the game's minimum |
| T-L27 | Double start ignored | Automated | `ignores a second start` | Only one game room is created |
| T-L28 | Join code resolves to its lobby | Automated | `resolves a code to the lobby that minted it` | Code returns the right lobby |
| T-L29 | Unknown code resolves to nothing | Automated | `returns nothing for an unknown code` | No lobby is returned |
| T-L30 | Code expires with its lobby | Automated | `stops resolving once the lobby is disposed` | Code no longer resolves after the lobby closes |
| T-L31 | Right code admits to private lobby | Automated | `admits a guest presenting the right code to a private lobby` | Guest joins |
| T-L32 | Wrong code refused | Automated | `refuses a guest with the wrong code on a private lobby` | Guest is refused |
| T-L33 | Missing code refused | Automated | `refuses a guest with no code at all on a private lobby` | Guest is refused |
| T-L34 | Public lobby needs no code | Automated | `lets any guest into a public lobby without a code` | Guest joins |
| T-L35 | Code carries into the game room | Automated | `carries the code into the game room it starts` | Game room has the lobby's code (used for rejoining) |
| T-L36 | Shared validator matches the room | Automated | `agrees with the room on what is valid` | Client-side and server-side validation agree |
| T-L37 | Validator rejects non-objects | Automated | `rejects non-objects` | Non-object configuration is invalid |
| T-L38 | Listing describes a public lobby | Automated | `describes a public lobby from the room listing` | Listing shows name, game, and occupancy |
| T-L39 | Listing omits private lobbies | Automated | `omits a private lobby` | Private lobby not listed |
| T-L40 | Listing omits unconfigured lobbies | Automated | `omits a lobby that has not been configured yet` | Unconfigured lobby not listed |
| T-L41 | Listing tracks occupancy | Automated | `tracks occupancy as players join and leave` | Player count updates |
| T-L42 | Listing omits started game rooms | Automated | `omits the game room a lobby starts` | Game room not listed as a lobby |
| T-L43 | Listing omits closed lobbies | Automated | `omits lobbies that have closed` | Closed lobby removed |
| T-L44 | Join codes never leak | Automated | `never exposes a join code` | Listing contains no join codes |

### Physio Park room — `test/PhysioParkRoom.test.ts` (`physio_park_room`)

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-P01 | Players spawn and land | Automated | `spawns joining players and lets them land on the ground` | Each player is created and ends up standing on the ground |
| T-P02 | Held input keeps applying | Automated | `keeps moving a player while the last input is held` | Player keeps moving on ticks with no new input |
| T-P03 | Grounded player can jump | Automated | `jumps a grounded player` | Player leaves the ground |
| T-P04 | One input per tick | Automated | `applies one buffered input per tick` | A burst of inputs is applied one per tick, not all at once (required by client-side prediction) |
| T-P05 | Dropped players and the goal | Automated | `excludes dropped players from the goal quorum and restores them on reconnect` | Dropped players don't block completion and are restored when they reconnect |

The level completion and progression test (`requires every active player at the goal and completes levels in order`) was removed during PBI-31 because it broke with the new levels. Until it is rewritten, level completion is only covered by manual tests M-07, M-08, and M-12.

### Shared input rules — `test/physioParkInput.test.ts`

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-I01 | Walk speed from input | Automated | `sets horizontal speed from moveX, clamped to -1..1` | Speed follows `moveX`, clamped to the allowed range |
| T-I02 | Jump from the ground | Automated | `jumps when grounded` | Upward velocity is set |
| T-I03 | Coyote time | Automated | `still jumps within coyote time after leaving the ground` | Jump still works briefly after walking off a ledge |
| T-I04 | No mid-air jump | Automated | `does not jump after coyote time runs out` | No jump once coyote time has passed |
| T-I05 | Variable jump height | Automated | `cuts the jump short when jump is released while rising` | Releasing jump stops the rise |
| T-I06 | Fall speed cap | Automated | `caps falling speed` | Falling speed never exceeds the maximum |

### Client-side prediction — `test/physioParkPrediction.test.ts`

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-C01 | Prediction matches the server | Automated | `predicts the local player's movement exactly like the server` | Same inputs (walk, jump, stop) give the same final position on the client and the real room |
| T-C02 | Pushing matches the server | Automated | `predicts pushing into another player like the server` | Both players end in the same spots on the client and the server |
| T-C03 | Stand on another player | Automated | `lets the local player stand on another player` | Player rests on the other player's head |
| T-C04 | Ride a walking player | Automated | `carries the local player along on top of a walking player` | Rider moves with the player underneath |
| T-C05 | Disconnected players don't block | Automated | `lets the local player walk through a disconnected player` | Player walks through a frozen, disconnected player |
| T-C06 | Level change rebuilds the world | Automated | `rebuilds when the level changes` | New level's geometry (conveyor) is used |
| T-C07 | Guess other players' input | Automated | `guesses another player's input from their velocity` | Walking direction and held jump are read from velocity |

### Name tags — `test/physioParkNames.test.ts`

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-N01 | Lobby name shown | Automated | `uses the display name picked in the lobby` | Tag shows the lobby display name |
| T-N02 | Name trimmed | Automated | `trims spaces around the name` | Surrounding spaces removed |
| T-N03 | Fallback name | Automated | `falls back when the player has no name yet` | Blank or missing name shows "Player" |
| T-N04 | Length cap | Automated | `caps long names at the lobby's length limit` | Name cut to the lobby limit (20 characters) |

### Pong prototype — `test/MyRoom.test.ts`

| ID | Behavior / Requirement | Type | Test | Expected Result |
|---|---|---|---|---|
| T-M01 | Buffered input moves a player | Automated | `advances a player from its buffered input` | Player position changes after input |
| T-M02 | Out-of-range input clamped | Automated | `clamps input that is out of range` | Movement is limited to the allowed range |

### Disabled

`test/platformerMovement.test.ts` (11 tests) is commented out. It tests the original platformer functions that were replaced by the `PhysicsWorld` engine. The same behaviors are now covered by T-P01 to T-P04, T-I01 to T-I06, and T-C03 to T-C05.

The prediction world also mirrors Level 3's moving platforms and switches, but there are no automated tests for that part yet.

## Manual Test Cases

Start the game with `npm run dev` and open the printed address. To simulate several players on one computer, use separate browser windows (one normal and one incognito, or different browsers) and give each a different display name.

| ID | Behavior | Steps | Expected Result |
|---|---|---|---|
| M-01 | Create and join a lobby | Window 1: enter a name, create a Physio Park lobby. Window 2: join with the join code. | Both players appear in the waiting room roster |
| M-02 | Start the game | Host clicks Start. | Both windows load level 1 with both players |
| M-03 | Movement and jumping | Move with A/D or ←/→, jump with W, ↑ or Space. | Player walks, jumps, and lands; walk/jump animations play |
| M-04 | Stacking | Jump onto the other player's head, then have them walk. | Rider stays on top and is carried along |
| M-05 | Name tags | Look at both windows. | Each player's name is above their character; your own name is bold; names don't overlap when standing together |
| M-06 | Lava respawn | Walk into the lava. | Player respawns at their spawn point |
| M-07 | Level transition | Get every player to the goal flag on levels 1 and 2. | Level completes only when everyone is at the goal; the next level loads for everyone, ending on level 3 |
| M-08 | Level 2 button and crate | Stand on the button. | Button presses down and the crate drops |
| M-09 | Disconnect and rejoin | Close one window mid-game, then rejoin from the page. | Name fades while disconnected; player returns to the same game |
| M-10 | EMG sensor jump | Click **Connect** in the sensor panel and pair the sensor over Bluetooth. Adjust the sensitivity slider. Flex. | Sensor status shows connected; flexing makes the player jump |
| M-11 | Client-side prediction under lag | Run the lag proxy (below) and play through it, then repeat with `?prediction=off` at the end of the address. | With prediction, movement responds immediately; without it, there is a noticeable delay |
| M-12 | Level 3 switches and moving platforms | On level 3, have each player jump up into the switch matching their color (hit it from underneath). | Only the matching player can trigger each switch; its platform starts moving and players can ride it |

### Simulating network lag (M-11)

Localhost has almost no lag, so prediction is hard to notice. A small proxy adds delay between the browser and the game:

1. With `npm run dev` running, note the port in the printed address (for example `5173`).
2. In a second terminal (also in `server/`), run `node tools/lagproxy.cjs 3100 5173 75` (75 ms each way = 150 ms round trip).
3. Open `http://localhost:3100` instead of the normal address.
4. To compare, open `http://localhost:3100/?prediction=off`. Prediction is read when the game starts, so start a new lobby after switching.

Measured with 150 ms of added round-trip lag:

| | Prediction on | Prediction off |
|---|---|---|
| Walk starts | ~20 ms | ~300 ms |
| Jump starts | ~25 ms | ~260 ms |

## Pass/Fail Criteria

A change is ready to merge when:

- The CI check passes on the pull request (type check, all automated tests, build).
- `npm test` passes locally, apart from a documented flaky test that passes on a re-run.
- The manual test cases affected by the change pass. For any change to the Physio Park client (`server/src/client/games/physio-park/`), the physics, or the room (`server/src/rooms/physio-park/`), at least M-01 to M-04 are run, plus M-07 when levels change.

## Limitations

- **Browser code has no automated tests.** Phaser rendering, input handling, and the lobby UI are only checked by the build and manual testing.
- **Flaky test:** T-L08 (`allows only the host to kick a player...`) sometimes fails because it checks the roster right after the kick message arrives, before the server has finished removing the player. Re-run `npm test` if only this test fails.
- **The EMG sensor** can only be tested manually with the physical sensor and a browser that supports Web Bluetooth (Chrome or Edge).
- **Level completion has no automated test** since the PBI-31 removal (see the Physio Park room section). Level 2's button and crate and Level 3's switches and moving platforms are also manual-only.
- **No load testing:** the target of 8 to 12 players has not been tested with real players or simulated clients.
- **No accessibility, cross-browser, or deployed-server testing** yet. Lag is only simulated locally.
