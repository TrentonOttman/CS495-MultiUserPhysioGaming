# Iteration 2 Game Planning

## Technical Considerations

- We have settled on using Colyseus for server-side implementation, and TypeScript with an undecided engine for the game logic and client. 
- Nobody on the team is especially well versed in creating textures or models. 
- Because one arm will be used for the EMG sensor, the game must be playable with only one other input (either a keyboard or a mouse) alongside the sensor.
- The game must support 8-12 people per session and run on low-end hardware.
- We only have the rest of the semester to work on this project.

**Because of these factors, a 2D game would generally fit the criteria over a 3D game given:**
- Simpler game and rendering logic &rarr; Good for developement time and performance.
- Less textures and no 3D models needed &rarr; Fits our teams skill set better.
- No complex camera controls needed &rarr; Makes it is easier to design a game which uses limited input.

## Game Ideas

### Pico Park Clone

Pico park is a 2D multiplayer game which supports up to eight players. It also has a simple art style and simple control scheme with three inputs. Therefore, it is a prime candidate for our final game design as it fits all of our criteria mentioned above. Furthermore, it is level based, which would allow our team to work on expanding the quantity of game content in parallel. The cooperative design also fits well with an educational setting.