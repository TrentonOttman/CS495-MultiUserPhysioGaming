# Game Resolution

- Original game is 1080 p (1920 x 1080)
- Current Pong scales horizontally with device width in a window within the browser, but static vertically at 604px
- Our version doesn't need to be as high quality
  - 1280 x 720 ; 16:9
- Aspect ratio should fit most laptops/desktops
- Fullscreen scaling is something to be considered further on in development, but for now, it can be a window inside the broswer
  - Example: Cool Math Games
- Chromebook native resolution:  1366 x 768
- Sprites can be made at a smaller resolution and scaled relatively easily as they're designs are 10px x 10px

# Etc

- Overall, it will be simple pixel graphics: no round corners allowed
- Scaling will eventually need to incorporate height and width
- Zoom in/out for accessibility much further in potential development
