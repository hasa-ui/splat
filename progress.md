Original prompt: Implement the plan for an offline-capable mobile-friendly browser ink battle game inspired by Splatoon 3.

- 2026-04-08: Bootstrapped project structure and task tracking files.
- 2026-04-08: Implemented a Vite + TypeScript + Three.js prototype with one arena, 3v3 turf loop, paint field scoring, bot AI, mobile dual-stick controls, desktop controls, UI flow, and browser automation hooks.
- 2026-04-08: Added unit tests for paint coverage and stage collision helpers.
- 2026-04-08: Verified `npm test` and `npm run build`. Added a WebGL fallback notice because the headless browser environment cannot create a WebGL context, which blocks automated gameplay capture here.
- 2026-04-08: Fixed the stuck mobile SQUID control by capturing the button pointer through release, and moved the center bot navigation node out of blocked geometry. Added a regression test covering navigation node placement.
- 2026-04-08: Fixed the remaining bot stall by moving the contested center node into the upper opening and making bot node scoring ignore stage nodes that are not directly reachable from the current bot position.
- 2026-04-08: Adjusted the contested center node again so it is both reachable from the upper lane and connected onward to another paint target, preventing bots from parking at a dead-end node.
