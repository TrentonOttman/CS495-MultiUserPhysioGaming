import {
    defineServer,
    defineRoom,
    monitor,
    playground,
    createRouter,
    createEndpoint,
    LobbyRoom,
} from "colyseus";

/**
 * Import your Room files
 */
import { MyRoom } from "./rooms/MyRoom.js";
import { PongRoom } from "./rooms/PongRoom.js";
import { PhysioParkRoom } from "./rooms/PhysioParkRoom.js";
import { resolveJoinCode } from "./client/matchmaking/joinCodeIndex.js";
// Aliased: `LobbyRoom` above is Colyseus's built-in room browser. This is ours.
import { LobbyRoom as SessionLobby } from "./rooms/LobbyRoom.js";

const server = defineServer({

    /**
     * Define your room handlers:
     *
     * `lobby` is Colyseus's built-in room *browser* — the global listing every
     * `enableRealtimeListing()` room publishes itself to.
     * `session_lobby` is the per-session waiting room players sit in while a
     * host configures the match. Different things; do not conflate them.
     */
    rooms: {
        my_room: defineRoom(MyRoom).enableRealtimeListing(),
        pong_room: defineRoom(PongRoom).enableRealtimeListing(),
        physio_park_room: defineRoom(PhysioParkRoom).enableRealtimeListing(),
        session_lobby: defineRoom(SessionLobby).enableRealtimeListing(),
        lobby: defineRoom(LobbyRoom),
    },

    /**
     * Experimental: Define API routes. Built-in integration with the "playground" and SDK.
     *
     * Usage from SDK:
     *   client.http.get("/api/hello").then((response) => {})
     *
     */
    routes: createRouter({
        api_hello: createEndpoint("/api/hello", { method: "GET" }, async (ctx) => {
            return { message: "Hello World" };
        }),

        /**
         * Turns a join code into the room id the client should join.
         *
         * The client cannot read a room's metadata through the SDK, and a
         * private room never appears in the room browser, so this is how a code
         * becomes a usable id. It answers 200 with `roomId: null` for an unknown
         * or stale code rather than an error status — an unknown code is an
         * ordinary outcome of a mistyped entry, not a server fault, and the
         * client renders it as a normal "not found".
         */
        resolve_join_code: createEndpoint("/api/lobby/resolve/:code", { method: "GET" }, async (ctx) => {
            return { roomId: resolveJoinCode(String(ctx.params.code)) };
        }),
    }),

    /**
     * Bind your custom express routes here:
     * Read more: https://expressjs.com/en/starter/basic-routing.html
     */
    express: (app) => {

        app.get("/hi", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        /**
         * Use @colyseus/monitor
         * If you expose it in production, make sure to protect it with a password:
         * https://docs.colyseus.io/tools/monitoring#password-protection
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/monitor", monitor());
        }

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/playground", playground());
        }
    }
});

export default server;

/** Named export read by the `colyseus/vite` plugin's `serverEntry`. */
export { server };
