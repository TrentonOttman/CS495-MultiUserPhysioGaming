import assert from "assert";
import { FALLBACK_PLAYER_LABEL, getPlayerLabel } from "../src/shared/physioPark/physioParkNames.js";
import { DISPLAY_NAME_MAX_LENGTH } from "../src/shared/displayName.js";

const names = (entries: Record<string, string>) => new Map(
    Object.entries(entries).map(([id, displayName]) => [id, { displayName }]),
);

describe("physio park name tags", () => {
    it("uses the display name picked in the lobby", () => {
        assert.strictEqual(getPlayerLabel(names({ a: "Ansel" }), "a"), "Ansel");
    });

    it("trims spaces around the name", () => {
        assert.strictEqual(getPlayerLabel(names({ a: "  Ansel  " }), "a"), "Ansel");
    });

    it("falls back when the player has no name yet", () => {
        assert.strictEqual(getPlayerLabel(names({}), "a"), FALLBACK_PLAYER_LABEL);
        assert.strictEqual(getPlayerLabel(names({ a: "   " }), "a"), FALLBACK_PLAYER_LABEL);
        assert.strictEqual(getPlayerLabel(undefined, "a"), FALLBACK_PLAYER_LABEL);
    });

    it("caps long names at the lobby's length limit", () => {
        const long = "x".repeat(DISPLAY_NAME_MAX_LENGTH + 10);
        assert.strictEqual(getPlayerLabel(names({ a: long }), "a").length, DISPLAY_NAME_MAX_LENGTH);
    });
});
