# Authoritative server
- The games state, and almost everything else is handled by the server
- Game clients send inputs to the server and the server sends back the results
- Introduces the problem of lag between input and action
## Client side prediction
- When inputs are sent by the client the client also predicts what the server will do with them and render that effect
## Server reconciliation
- Client requests need be be sequenced as issues can arise with the server state updating the clients state to a previously predicted state
- For example a client sending and predicting two move requests and recieving the result of the first move request causing the client to move backwards before the second request is processed
# Server tick rate
- To improve CPU use and bandwidth
- Instead of processing every input as soon as it is sent, inputs are queued and processed periodically
- Introduces choppy movement of other players on client side
## How to deal with low frequency updates
- Dead reckoning predicts other player movements based on their state in the last update
- Entity interpolation shows the client the other players actual movements, just from a previous update late
# Lag compensation
- For games where position and timing are very important, the server can use the timestamp of inputs and simulate the clients world to mitigate the effect of lag


SOURCE
https://www.gabrielgambetta.com/client-server-game-architecture.html
