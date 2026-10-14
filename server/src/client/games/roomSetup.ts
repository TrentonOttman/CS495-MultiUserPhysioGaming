import { Room } from "colyseus";
import type { GameId } from "../../shared/games.js";

const REJOIN_KEY = "colyseus-rejoin";

function displayStatus(data)
{
    const status = document.getElementById("status");
    status.textContent = data;
}

export function setupRoom<T>(room: Room<T>, gameId: GameId): Room<T>
{
    sessionStorage.setItem(
        "colyseus-rejoin",
        JSON.stringify({
            token: room.reconnectionToken,
            gameId,
            roomId: room.id,
        })
    );

    room.onReconnect(() => {
        // the token is refreshed on every successful connection
        sessionStorage.setItem("reconnectionToken", room.reconnectionToken);
    });

    room.onLeave((code) => {
        console.log(`Room left (code: ${code})`);
        window.location.href = "../../index.html";
    });

    room.onMessage("disconnect", (data) => {
        displayStatus(data);
    });

    room.onMessage("leave", (data) => {
        displayStatus(data);
    });

    

    room.onMessage("gameEnded", (data) => {
        sessionStorage.removeItem(REJOIN_KEY);

        displayStatus(data ?? "The game has closed.");
    });

    return room;
}