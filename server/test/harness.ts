import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";

/**
 * One booted server for the whole test run.
 *
 * `boot()` listens on a fixed port and `@colyseus/core`'s `matchMaker` is a
 * module-level singleton, so a second `boot()` would try to rebind the same port
 * and both servers would fight over the same matchmaker state. Every suite
 * therefore shares this one instance; `test/root-hooks.ts` boots it before the
 * first test and shuts it down after the last.
 */
let server: ColyseusTestServer<typeof appConfig> | null = null;
let booting: Promise<ColyseusTestServer<typeof appConfig>> | null = null;

export function getTestServer(): Promise<ColyseusTestServer<typeof appConfig>> {
    if (server) { return Promise.resolve(server); }
    booting ??= boot(appConfig).then((booted) => {
        server = booted;
        booting = null;
        return booted;
    });
    return booting;
}

export async function shutdownTestServer(): Promise<void> {
    if (server) {
        await server.shutdown();
        server = null;
    }
}
