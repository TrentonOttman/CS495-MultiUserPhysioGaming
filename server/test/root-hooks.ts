import { getTestServer, shutdownTestServer } from "./harness.js";

/**
 * Mocha root hooks: boot the shared test server once for the entire run and
 * tear it down at the end, rather than each suite booting its own.
 */
export const mochaHooks = {
    async beforeAll() {
        await getTestServer();
    },
    async afterAll() {
        await shutdownTestServer();
    },
};
