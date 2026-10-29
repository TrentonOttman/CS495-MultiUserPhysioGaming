import type { Room } from "@colyseus/sdk";
import type { GameId } from "../../shared/games.js";

const REJOIN_KEY = "colyseus-rejoin";

function displayStatus(data: unknown) {
    const status = document.getElementById("status");
    if (!status) return;
    status.textContent = typeof data === "string" ? data : String(data ?? "");
}

export function setupRoom<T>(room: Room<T>, gameId: GameId): Room<T> {
    sessionStorage.setItem(
        REJOIN_KEY,
        JSON.stringify({
            token: room.reconnectionToken,
            gameId,
            roomId: room.roomId,
        })
    );

    room.onReconnect(() => {
        const saved = sessionStorage.getItem(REJOIN_KEY);
        if (!saved) return;

        try {
            const rejoinInfo = JSON.parse(saved) as { gameId: GameId; roomId: string };
            sessionStorage.setItem(REJOIN_KEY, JSON.stringify({
                ...rejoinInfo,
                token: room.reconnectionToken,
            }));
        } catch {
            sessionStorage.removeItem(REJOIN_KEY);
        }
    });

    room.onLeave((code) => {
        console.log(`Room left (code: ${code})`);
        window.location.href = "../../index.html";
    });

    room.onMessage("*", (messageType, data) => {
        if (messageType === "disconnect" || messageType === "leave") {
            displayStatus(data);
        } else if (messageType === "gameEnded") {
            sessionStorage.removeItem(REJOIN_KEY);
            displayStatus(data ?? "The game has closed.");
        }
    });

    return room;
}
