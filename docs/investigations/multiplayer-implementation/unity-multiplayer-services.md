# Unity

Unity has a suite of built-in packages that can be used for developing multiplayer games.
Because we have settled on using Unity (besides confirming with our sponsor), using built-in tools seems like a viable choice.

## Netcode for GameObjects and Unity Transport.
- Good for casual co-op games.
- Ideal for games with small numbers of players.
- Real-time synchronization is not well supported.
- Distributed authority network (split between host and client).
- Unity Transport is a transport layer and provides a low-level which supports both reliable and unreliable communication.
- Reportedly supports up to 16 players, but this depends on game scope and our technical ability.

## Netcode for Entities and Unity Transport
- Good for competitive games where game state is exchanged constantly
- Server authoratative network.
- Netcode for Entities provides high-performance networking for large-scale games that supports client prediction and lag compensation.
- Player count depends on strength of the server.

## Overview

Netcode for GameObjects is likely the better solution for our use-case. Our game is unlikely to be competitive and the overhead of managing a server is probably not in-scope for this project.