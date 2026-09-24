
# Scaling to 8–12 Players

I looked into what we need to change so our game can handle 8–12 players, since that's our goal for Iteration 2.

## Short version

- The server can already handle 12 players connected at once.
- Right now each game only allows 2 players, so we need to change that and the game design.
- The bigger risk is Google Cloud Run settings, not Colyseus.

## What happens right now

- **Only 2 players per game.** If a 3rd person joins, the server makes a new game for them instead of adding them.
- **Leaving takes about 30 seconds.** When someone closes the game, the server waits 30 seconds in case they come back before removing them.

## Testing

I opened the deployed game in a bunch of browser tabs at the same time.

| Players | Result |
|---|---|
| 2 | Ran fine |
| 8 | Ran fine |
| 12 | Ran fine |

Since the limit is 2 per game, these players got split into separate 2-player games. Once we allow more players per game, we should test again with everyone in the same game.

## Player limit

The limit is set by `maxClients` in our room file:

```ts
export class MyRoom extends Room {
  maxClients = 12;
}
```

Just changing this number won't be enough though. Pong only has 2 paddles, so we'd need to change the game to work with more people, like teams on each side or more than 2 sides.

## The 30 second leave delay

This comes from `allowReconnection()` in the room's `onDrop()`. It's useful if someone's Wi-Fi drops for a second, but it makes leaving feel slow. We could:

- Lower the wait time to something like 5–10 seconds
- Add a "Leave game" button that calls `room.leave()`, which should remove the player right away (need to test this)

## Google Cloud Run settings

Colyseus uses WebSockets, which Cloud Run supports. But there are a few settings we should check:

- **Timeout:** Cloud Run cuts off connections after 5 minutes by default. We should raise it to the max of 60 minutes so players don't get kicked mid-game.
- **Max instances:** If Cloud Run starts a second copy of our server, players in the same game could end up on different copies. We should set this to 1 for now.
- **Min instances:** Setting this to 1 keeps the server running so the first player doesn't have to wait for it to start up. This costs more, so we should check our budget.

Example command:

```
gcloud run services update [SERVICE_NAME] \
  --timeout 3600 \
  --max-instances 1 \
  --min-instances 1 \
  --session-affinity
```

If we ever need more than one server, Colyseus needs Redis to share game info between them. We don't need that for 8–12 players.

## Questions for the team

- How should Pong change to work with 8–12 players?
- What should happen when a game is full?
- Will this work okay on school Wi-Fi with $200 Chromebooks?
- What's our Google Cloud budget?

## Sources

- Cloud Run WebSockets: https://cloud.google.com/run/docs/triggering/websockets
- Colyseus scalability: https://docs.colyseus.io/scalability
- Colyseus server options: https://docs.colyseus.io/server/
