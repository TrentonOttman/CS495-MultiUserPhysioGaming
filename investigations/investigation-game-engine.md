# Investigation: Game Engine Selection (#54)

**Question:** What will our game engine investigations finally land on?
**Investigator:** Ansel Stinnett
**Timebox:** 3–4 hours
**Status:** Done



---

## Summary

| Option | Language | Cost | Fits our web + Colyseus stack | Learning curve | Verdict |
|---|---|---|---|---|---|
| **Phaser** | JavaScript / TypeScript | Free (open source) | Excellent: official Colyseus tutorial | Moderate | **Recommended** |
| KAPLAY (formerly Kaboom) | JavaScript / TypeScript | Free (open source, MIT) | Good: plain JS, but no official Colyseus guide | Low | Backup option |
| Defold | Lua | Free (open source) | Fair: official Colyseus SDK with HTML5 support, but a different language from our stack | Moderate | Viable, but behind Phaser |
| Godot | GDScript (or C#) | Free (open source) | Weak: separate language, experimental Colyseus SDK | Moderate–High | Not recommended |
| Unity | C# | Free tier (check current license terms) | Weak: heavy web builds, separate language | High | Not recommended/ Dr. Crawford warned us against it |
| Custom engine (raw WebGL) | JavaScript / TypeScript | Free | Good language fit, but everything built from scratch | Very high | Not recommended |

**Recommendation:** Phaser, with KAPLAY as a fallback if the team finds Phaser too heavy during setup.

---

## Context

- The project continues the previous PhysioGaming work: a **web** multiplayer game using **Colyseus** for networking, with EMG sensors as input.
- **Game idea (decided):** a 2-D co-op puzzle platformer in the style of *Pico Park*, where players must cooperate (e.g., stacking on each other, pressing switches together) to clear each level. A 2-D wave-survival RPG with class abilities was also considered but not chosen.

  - **Implication:** the JS pipeline fits a web/Colyseus game directly: each player's browser reads their own sensor and sends their input to the Colyseus server. A JavaScript engine (Phaser) can use this data with no bridge; Defold and Godot web builds would need a JavaScript bridge.
  - **Design implication:** the JS pipeline gives a continuous value, so the game can use a simple on/off threshold *or* flex strength (e.g., harder clench = more thrust or a stronger attack).
  - **Bluetooth implications:** Web Bluetooth generally works in Chrome and Edge but not Firefox or Safari, and only on secure pages (HTTPS or localhost), so the hosted game will need HTTPS.

Because our server (Colyseus) and likely our sensor code are JavaScript/TypeScript, an engine in the same language means the whole team works in one language and one codebase.

---

## Evaluation Criteria

1. **Feasible for our final game idea** within our time and complexity scope
2. **Learning curve** not too high
3. **Preferably free**

---

## Option 1: Phaser

**What it is:** A mature 2-D web game framework in JavaScript/TypeScript. Phaser 4 was released in April 2026; Phaser 3.90 is the final v3 release.

**Pros**
- Runs natively in the browser, same as our current stack.
- Official Colyseus + Phaser multiplayer tutorial (rooms, player movement, interpolation, client prediction, fixed tickrate).
- Built-in support for what a platformer needs: sprites, animations, arcade physics, tilemaps, collisions, cameras, scenes (menus, level select, game over).
- Large community, many examples and tutorials.
- Free and open source.

**Cons**
- More concepts to learn than KAPLAY (scenes, game config, physics systems).
- Phaser 4 is recent; most tutorials were written for Phaser 3, so expect small differences (confirmed in testing: the import line).
- Fit with game ideas:
  - Pico Park–style platformer: Phaser's arcade physics, collisions, and tilemaps cover the core needs (gravity, jumping, players standing on each other, switches, doors). ✅

**Evidence: hands-on tutorial test**

Completed Part 1 of the official Colyseus + Phaser tutorial (server + client, two browser tabs each controlling a ship with arrow keys, movement synced between tabs).

- **Time:** ~50 minutes from an empty folder to working multiplayer movement, including setup and debugging.
- **Setup:** Node.js 20 in Ubuntu (WSL) on Windows, VS Code, Parcel for the client, Colyseus server from `npm init colyseus-app`.
- **Versions used:** Phaser 4.2.1, Colyseus 0.17 (server and client SDK).
- **Problems encountered:**
  1. **Phaser 4 import change:** the tutorial's `import Phaser from "phaser"` fails in Phaser 4; it must be `import * as Phaser from "phaser"`. One-line fix; everything else in Part 1 worked unchanged with Phaser 4.
  2. **Colyseus version mismatch:** the tutorial docs target Colyseus 0.18, so installing the client SDK pulled 0.18, but `npm init colyseus-app` generated a 0.17 server. The mismatched state formats caused a client error (`i.get(...) is not a constructor`) on join. Fixed by installing the matching client SDK (`npm install @colyseus/sdk@0.17`). **Lesson for the team:** pin the same Colyseus version on client and server.

---

## Option 2: KAPLAY (formerly Kaboom.js)

**What it is:** A lightweight JavaScript/TypeScript game library, the community-maintained successor to Kaboom.js.

**Pros**
- Very low learning curve; simple function-based API.
- Component system makes it easy to give objects (players, switches, doors) different behaviors.
- Free and open source (MIT).
- Same language as our stack.

**Cons**
- Smaller community and fewer resources than Phaser.
- No official Colyseus tutorial; we would wire networking ourselves (doable, but more risk).
- Less proven for larger projects with many entities on screen.

---

## Option 3: Defold

**What it is:** A free, open-source engine focused on 2-D games, with its own editor. Games are written in Lua.

**Pros**
- Free and open source.
- Strong 2-D focus and small, lightweight web (HTML5) builds.
- Official Colyseus client SDK for Defold, tested on HTML5 (not experimental like Godot's).
- Handles platformers well.

**Cons**
- Different language (Lua) from our server and existing JS/TS code; team learns Lua plus a new editor.
- The prior team's browser EMG pipeline is JavaScript, so a Defold web build would need a JS-to-Lua bridge to use it: extra work and risk.
- Smaller community than Phaser; no full step-by-step Colyseus tutorial like Phaser's.

---

## Option 4: Godot

**What it is:** A free, open-source general-purpose engine with its own editor and language (GDScript).

**Pros**
- Excellent 2-D tools and editor.
- Free and open source.
- Colyseus has a Godot SDK that lists web as a supported platform.

**Cons**
- Different language from our server and existing code (GDScript instead of JS/TS).
- Colyseus's Godot extension is marked **experimental**.
- Godot 4 projects written in C# cannot be exported to the web, so we would be locked into GDScript.
- The prior team's browser EMG pipeline is JavaScript, so a Godot web build would need a JavaScript bridge to use it: extra work and risk.
- Team would need to learn a new editor and language.

---

## Option 5: Unity

**Pros**
- Industry-standard, huge community.
- Colyseus has a Unity SDK.
- **Prior work:** the previous team built a Unity game (FlyWorld, a jetpack parkour game: fist clenched = thrust, relaxed = off) that read the Python sensor script's TCP stream. Their projects are in the repo's `archive/` folder.
  - Realistically, the reusable part is the small TCP input script, not the game itself, since we are building a new multiplayer game.

**Cons**
- Steepest learning curve of the options.
- C# instead of our JS/TS stack.
- Web builds are heavier and slower to load than native web frameworks.
- Overkill for a 2-D game in one semester.
- Dr. Crawford recommended against using Unity for this project.

---

## Option 6: Custom Engine on Raw WebGL

**What it is:** Building our own game engine directly on WebGL, the browser's low-level graphics API (raised in a team meeting). WebGPU is its newer successor.

**Pros**
- Full control over everything.
- Same language as our stack (JavaScript/TypeScript).
- Strong learning experience in how engines work.

**Cons**
- WebGL only draws graphics. We would have to build everything else ourselves: sprite rendering and animation, cameras, physics (gravity, jumping, collisions, players standing on each other), input handling, scenes and menus, asset loading, and sound.
- That work is likely a semester-long project on its own, leaving little time for the actual EMG multiplayer game.
- No community, tutorials, or Colyseus integration to lean on; every bug is ours.
- **We already get WebGL's performance through Phaser:** Phaser renders with WebGL (our test showed `Phaser v4.2.1 (WebGL | Web Audio)` in the console).

---

## Recommendation

**Phaser.** It is the only option that is free, built for 2-D web games, in our existing language, and has an official Colyseus integration guide. Defold is the strongest non-JavaScript alternative (official Colyseus SDK, good 2-D tools), but it would add a new language for the team to learn and a bridge to the existing JavaScript EMG pipeline. Phaser can use that pipeline directly. Phaser's built-in arcade physics, collisions, and tilemaps fit a Pico Park–style platformer well.

**Phaser version:** Phaser 4 (tested with 4.2.1). Part 1 of the tutorial worked with Phaser 4 after a one-line import change, so there is no need to fall back to Phaser 3.

**Colyseus version:** pick one version (0.17 or 0.18) for both the server and the client SDK and keep them in sync. 

**Fallback:** If setup goes badly or the team finds Phaser's learning curve too steep, KAPLAY is the backup, accepting that we would build the Colyseus integration ourselves.

---

## Open Question for the Team

- Left/right movement will use the keyboard (arrow keys or A/D), so EMG only needs to drive the remaining action(s), such as jumping or any additional features we wish to add to our game. Do we use on/off input or flex strength for those?


---

## References

- Colyseus + Phaser tutorial: https://docs.colyseus.io/learn/tutorial/phaser
  - **Pitfalls hit or avoided while testing Part 1 (and fixes):**
    1. **Phaser 4 import:** the tutorial's `import Phaser from "phaser";` fails with Phaser 4. Use `import * as Phaser from "phaser";` instead.
    2. **Colyseus version mismatch:** the docs target Colyseus 0.18, but `npm init colyseus-app` currently generates a 0.17 server. Installing the client with `npm install @colyseus/sdk` pulls 0.18, and the client then crashes on join with `i.get(...) is not a constructor`. Fix: match the client to the server with `npm install @colyseus/sdk@0.17` (check versions with `npm list @colyseus/sdk @colyseus/schema` in the client and `npm list colyseus @colyseus/schema` in the server).
    3. **Parcel and `"main"`:** `npm init -y` adds `"main": "index.js"` to the client's `package.json`; delete that line before running `parcel serve index.html`.
- Phaser 4 releases: https://phaser.io/download/phaser4
- Colyseus Godot SDK: https://docs.colyseus.io/getting-started/godot
- Godot web export docs: https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html
- KAPLAY: https://kaplay.itch.io/kaplay
- Colyseus Defold SDK: https://docs.colyseus.io/getting-started/defold

---

## Time Log

| Task | Time spent |
|---|---|
| Research engines and Colyseus compatibility | ~50-60 min |
| Colyseus + Phaser tutorial test (Part 1) | ~50 min |
| Review prior PhysioGaming sensor code (Python + JS pipelines) | ~30 min |
| Write-up | ~60 min |
| **Total** | ~200 min |
