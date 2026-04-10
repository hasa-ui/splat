# Inkline Arena Specification

## 1. Product Summary

`Inkline Arena` is an offline, browser-based, mobile-friendly 3D ink battle game inspired by the player fantasy and match loop of Splatoon, while keeping its own original presentation and a browser-realistic implementation scope.

The current game is a compact prototype. This specification preserves the current playable loop and defines the next target state for a richer offline turf-battle game that feels more recognizably like a modern ink action game.

Core product goals:

- Preserve `offline-only`, `WebGL browser`, and `mobile landscape-first` constraints.
- Keep the game readable and responsive on mid-range phones and desktop browsers.
- Move closer to the desired loop through more weapons, sub/special systems, stronger squid movement, better stages, richer AI, and better match presentation.
- Avoid direct reuse of copyrighted names, visuals, maps, sounds, or branding from existing IP.

## 2. Current Implemented Specification

### 2.1 Match Structure

- Rule: single offline turf battle.
- Teams: `player + 2 ally bots` versus `3 enemy bots`.
- Match length: `180 seconds`.
- Start flow: title -> countdown -> playing -> results.
- Pause flow: pause and resume are available during play.
- Win condition: painted ground ownership percentage at timer end.

### 2.2 Player State

- One controllable avatar.
- Two forms:
  - Human form: move, shoot, paint.
  - Squid form: faster movement, no shooting, ink recovery on friendly paint.
- Health model: `4 hits` to splat.
- Respawn: `3 seconds`.
- Post-respawn invulnerability: short grace period.

### 2.3 Weapons and Combat

- One mid-range shooter only.
- Fire cadence, ink cost, hit detection, and circular paint stamps are already implemented.
- No sub weapon.
- No special weapon.
- No weapon selection or loadout screen.

### 2.4 Stage and Paint

- One arena only.
- Central obstacles, side approach lanes, and simple height variation.
- Paint applies to the floor-space simulation only.
- Score comes from the paint field percentages.
- Vertical wall painting and wall traversal are not supported.

### 2.5 AI

- Bots use node-based goal selection and direct path checks.
- Behaviors: `paint`, `contest`, `chase`, `retreat`, `respawn`.
- Bots can paint, chase nearby enemies, retreat to recover, and respawn.
- Bots do not have explicit combat roles, loadouts, or special ability logic.

### 2.6 Controls and UI

- Mobile: dual virtual sticks + `SQUID` button + pause button.
- Desktop: keyboard + mouse support.
- HUD: timer, paint control bar, ink reserve, player state chip.
- Center overlay: title, countdown, pause, results.
- Portrait on coarse-pointer devices shows a rotate note.

## 3. Target Product Specification

### 3.1 Design Principles

- The product remains offline and bot-driven.
- New systems must improve the moment-to-moment turf-war fantasy before adding breadth.
- Every added feature must justify its performance cost on mobile browsers.
- “Closer to Splatoon” means closer loop and role feel, not direct replication.

### 3.2 Match Rules and Modes

### Required Rule Set

- Primary rule remains `Turf Battle`.
- Turf Battle remains the default and first-class mode for all roadmap phases.
- Turf Battle uses:
  - `3v3` offline format.
  - `180-second` timer by default.
  - final score by paint coverage.

### Deferred Rule Set

- A secondary control-point rule, described as `Area Control`, may be designed in the spec as a later expansion target.
- It is not part of the initial implementation roadmap and should not block the Turf Battle roadmap.

### 3.3 Weapons

The target game supports three weapon families. Each family ships with one baseline loadout before variations are added.

### Shooter Family

- Role: balanced frontline painter and duelist.
- Fire pattern: sustained automatic shots.
- Strengths: reliable painting, flexible combat, easy to learn.
- Weaknesses: lower burst damage and lower reach than specialist weapons.

### Roller Family

- Role: close-range area control and lane pressure.
- Paint pattern:
  - rolling paint while moving on ground.
  - short-range flick attack for burst painting and damage.
- Strengths: wide paint output, strong ambushes, easy area denial.
- Weaknesses: short reach, commitment during engagement.

### Charger Family

- Role: long-range threat and precision picks.
- Fire pattern: hold-to-charge, then release.
- Strengths: long reach, high damage, lane control.
- Weaknesses: slower paint output, slower handling, higher execution demand.

### Weapon Definition Requirements

Each weapon family must be spec’d using a common data model with:

- `id`
- `displayName`
- `family`
- `inkCost`
- `fireInterval` or `chargeWindow`
- `baseDamage`
- `paintProfile`
- `effectiveRange`
- `mobilityModifier`
- `subWeaponId`
- `specialId`

### 3.4 Sub Weapons

Each baseline loadout has one sub weapon. Sub weapons are intentionally simple and browser-friendly.

Required initial sub weapon set:

- `Burst Bomb` equivalent:
  - quick throw
  - small explosion
  - good poke and repaint tool
- `Ink Mine` equivalent:
  - placeable trap
  - delayed trigger on enemy proximity
  - defensive lane control
- `Line Marker` equivalent:
  - fast straight projectile
  - light damage
  - reveals enemy briefly and paints lightly

Sub weapon rules:

- Sub weapons consume ink.
- Sub weapons share no cooldown with main weapon unless explicitly defined by loadout.
- Only one sub weapon is active per loadout.

### 3.5 Special Weapons

Each baseline loadout has one special weapon that fills from painting and contribution.

Required initial special set:

- `Wave Pulse` equivalent:
  - emits expanding pulses
  - reveals enemies
  - minor damage or pressure
- `Ink Storm` equivalent:
  - targeted area denial
  - sustained repainting over time
- `Zip/Strike alternative` is excluded for the first target state because traversal-heavy specials are expensive and require bigger movement-system changes.

Special rules:

- Special gauge fills from painting ground and minor combat contribution.
- Gauge resets or partially resets after use.
- Special activation temporarily overrides normal fire input.
- Bots must understand when to save or deploy a special.

### 3.6 Player Movement and Ink Interaction

### Required Movement Behavior

- Human form and squid form remain the two primary states.
- Friendly paint must provide:
  - faster squid movement
  - steady ink recovery
  - lower visibility through silhouette reduction or simplified visual cue
- Enemy paint must provide:
  - movement penalty
  - pressure against staying exposed
- Squid form remains unable to fire.

### Explicit Non-Goal

- Full wall-paint traversal is not part of this specification’s initial target state.
- Wall surfaces may be paintable later only if a simpler representation is introduced, but wall-swim traversal is out of scope for the planned roadmap.

### 3.7 Stages

### Target Stage Count

- Expand from `1` stage to `3` stages.

### Stage Design Requirements

Each stage must include:

- one clearly contestable center area
- at least two flank routes
- readable cover and elevation
- distinct paint-routing decisions
- safe bot navigation nodes and reachable combat lanes

### Stage Definition Requirements

Each stage must define:

- `id`
- `displayName`
- `dimensions`
- `spawnLocations`
- `paintableSurfaces`
- `navigationNodes`
- `combatLanes`
- `specialTargetZones`

### 3.8 Bots and Roles

Bots move from generic behavior toward role-driven behavior.

Required bot roles:

- `Painter`
  - prioritizes map coverage
  - avoids overcommitting to duels
- `Skirmisher`
  - contests center and pressures enemies
  - uses subs aggressively
- `Anchor`
  - holds safe lines
  - uses long range or defensive specials

Bot logic requirements:

- choose goals from stage and rule context
- switch between paint, chase, retreat, support, and special-use decisions
- respect weapon family range and mobility differences
- avoid obvious dead-end pathing
- use sub and special timing heuristics

### 3.9 Match Flow, UI, and Presentation

### Match Flow

- Add a pre-match loadout selection screen.
- Keep countdown, pause, and results screens.
- Expand results screen to show:
  - coverage percent
  - splats / splatted count
  - main contribution summary
  - special usage count

### HUD Targets

HUD must grow to support:

- main ink reserve
- special gauge
- current weapon/loadout identity
- timer
- turf control summary
- player state

### Tutorial / Onboarding

- Add a short playable onboarding or guided training flow.
- Teach movement, squid recovery, painting, sub use, and special activation.

### 3.10 Progression and Persistence

Persistence remains lightweight and offline.

Initial progression target:

- local unlock tracking only
- no account system
- no online profile

Allowed uses:

- unlock additional loadouts
- unlock additional stages or challenge presets
- store settings and last-selected loadout

### 3.11 Audio and Effects

Target additions:

- weapon-family-specific fire SFX
- sub and special activation cues
- clearer splat and respawn feedback
- stronger paint-impact feedback

Constraints:

- use compact local assets only
- no streaming dependencies

### 3.12 Technical Constraints

- Platform: browser-only, WebGL-capable browsers.
- Network: none at runtime.
- Performance target:
  - stable gameplay on mid-range mobile browsers
  - main eager JS budget remains below existing enforced threshold unless consciously revised
- Rendering:
  - maintain simple stylized presentation
  - avoid systems that require heavy physics or complex shader pipelines

## 4. Data and Interface Specification

The implementation roadmap assumes the following game-facing definitions.

### 4.1 `WeaponDefinition`

- Purpose: describe all main-weapon family behaviors through data rather than branching logic.
- Required fields:
  - `id`
  - `displayName`
  - `family`
  - `inkCost`
  - `cooldownMs`
  - `damage`
  - `range`
  - `paintRadius`
  - `projectileProfile`
  - `movementModifier`
  - `subWeaponId`
  - `specialId`

### 4.2 `SubWeaponDefinition`

- Purpose: define throw/place/line utility actions.
- Required fields:
  - `id`
  - `displayName`
  - `inkCost`
  - `deployType`
  - `damageProfile`
  - `paintProfile`
  - `cooldownMs`

### 4.3 `SpecialDefinition`

- Purpose: define charge-based high-impact abilities.
- Required fields:
  - `id`
  - `displayName`
  - `gaugeCost`
  - `activationTimeMs`
  - `durationMs`
  - `effectProfile`

### 4.4 `LoadoutDefinition`

- Purpose: combine main, sub, and special into a player-selectable package.
- Required fields:
  - `id`
  - `displayName`
  - `mainWeaponId`
  - `subWeaponId`
  - `specialId`
  - `botRoleHint`

### 4.5 `MatchRuleDefinition`

- Purpose: encapsulate scoring and objective rules.
- Required fields:
  - `id`
  - `displayName`
  - `durationSeconds`
  - `scoreModel`
  - `hudModel`
  - `botGoalModel`

### 4.6 `StageDefinition`

- Purpose: move map data out of hard-coded single-stage assumptions.
- Required fields:
  - `id`
  - `displayName`
  - `width`
  - `height`
  - `spawnPoints`
  - `obstacles`
  - `navigationNodes`
  - `paintFieldLayout`
  - `ruleAnchors`

### 4.7 `BotRole`

- Allowed values:
  - `painter`
  - `skirmisher`
  - `anchor`

## 5. Acceptance Criteria

The target specification is considered met when:

- the game supports three distinct loadouts built from three main weapon families
- every loadout has one sub and one special
- at least three stages are playable in offline turf battle
- bots can complete full matches on each stage without common pathing stalls
- the player can choose a loadout before match start
- the HUD shows ink and special gauge clearly on mobile landscape
- local progression and settings persist without a network dependency
- automated tests cover data definitions, rule scoring, bot decision selection, and layout regressions

## 6. Non-Goals

- online multiplayer
- matchmaking
- account systems
- direct map, UI, audio, or naming reuse from Splatoon
- full wall-swim traversal in the initial roadmap
