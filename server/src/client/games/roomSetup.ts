import { Room } from "colyseus";

function displayStatus(data)
{
    const status = document.getElementById("status");
    status.textContent = data;
}

export function setupRoom<T>(room: Room<T>): Room<T>
{
    sessionStorage.setItem("reconnectionToken", room.reconnectionToken);

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

    return room;
}