# Inkline Arena Task List

## Summary

This task list breaks the roadmap into implementation-ready work items. Each task has a clear objective, likely touchpoints, completion criteria, and validation expectations.

## Epic 1: Data Model

### Task 1.1: Introduce game definition modules

- Purpose: replace hard-coded single-instance assumptions with reusable data definitions.
- Change targets: game definitions layer, type definitions, game bootstrap wiring.
- Done when:
  - weapon, sub, special, rule, stage, and loadout definitions exist
  - current gameplay uses those definitions instead of inline constants
- Validation:
  - unit tests for definition lookup and default selection
  - existing match smoke tests still pass

### Task 1.2: Refactor current stage into `StageDefinition`

- Purpose: separate current map geometry and nodes from the main game loop.
- Change targets: stage data, paint field initialization, spawn setup.
- Done when:
  - current stage can be loaded by id
  - current bot navigation uses stage-provided nodes
- Validation:
  - stage tests for spawn validity, node reachability, and obstacle sanity

### Task 1.3: Add `LoadoutDefinition` support to actor state

- Purpose: make both player and bots loadout-driven.
- Change targets: actor state, spawn/reset logic, HUD metadata.
- Done when:
  - actors carry loadout ids
  - current shooter is represented as the default loadout
- Validation:
  - unit tests for actor reset and loadout assignment

## Epic 2: Combat and Weapons

### Task 2.1: Generalize main-weapon firing logic

- Purpose: support multiple main weapon families with one combat interface.
- Change targets: fire loop, damage logic, paint application.
- Done when:
  - shooter, roller, and charger families each execute through the shared weapon system
- Validation:
  - weapon-family tests for rate, paint pattern, and damage behavior

### Task 2.2: Implement roller baseline loadout

- Purpose: add close-range wide paint coverage and flick attacks.
- Change targets: movement-fire coupling, paint stamping, collision/damage rules.
- Done when:
  - rolling and flicking both work
  - roller paints meaningfully differently from shooter
- Validation:
  - gameplay simulation tests for paint area and close-range damage

### Task 2.3: Implement charger baseline loadout

- Purpose: add hold-to-charge long-range play.
- Change targets: input handling, charge state, projectile resolution, HUD state.
- Done when:
  - charge shot timing and long-range impact are implemented
- Validation:
  - tests for charge threshold, full-charge damage, and cancellation behavior

## Epic 3: Sub and Special Systems

### Task 3.1: Add sub-weapon action pipeline

- Purpose: support ink-costed alternate actions alongside main fire.
- Change targets: input model, actor action state, projectile/effect system.
- Done when:
  - sub weapons can be equipped and activated independently of main fire
- Validation:
  - tests for ink cost, cooldown, and spawn behavior

### Task 3.2: Implement baseline sub weapons

- Purpose: ship the initial utility kit.
- Change targets: effect logic and paint/damage resolution.
- Done when:
  - burst-bomb, ink-mine, and line-marker equivalents all function
- Validation:
  - tests for trigger behavior, area effect, and friendly/enemy interaction

### Task 3.3: Add special gauge and activation flow

- Purpose: create the reward loop for painting and contribution.
- Change targets: scoring hooks, HUD, action state machine.
- Done when:
  - gauge fills during play
  - special activation and completion are supported
- Validation:
  - tests for gauge accumulation, spend/reset behavior, and blocked activation states

### Task 3.4: Implement initial special set

- Purpose: ship the first high-impact abilities.
- Change targets: timed effects, targeting, AI awareness.
- Done when:
  - wave pulse and ink storm equivalents work end-to-end
- Validation:
  - tests for duration, area effect, reveal/damage behavior, and gauge drain

## Epic 4: Match Flow and UI

### Task 4.1: Build pre-match loadout selection

- Purpose: let the player choose a role before the countdown.
- Change targets: title flow, center-card UI, match boot sequence.
- Done when:
  - the player can choose among available loadouts before starting a match
- Validation:
  - DOM/UI tests for selection, confirmation, and default persistence

### Task 4.2: Expand HUD for loadouts and specials

- Purpose: expose the new combat state clearly on mobile.
- Change targets: HUD markup, styling, HUD render logic.
- Done when:
  - current loadout and special meter are visible and readable
- Validation:
  - layout tests at representative mobile landscape sizes

### Task 4.3: Enrich results presentation

- Purpose: provide feedback beyond final paint ratio.
- Change targets: results overlay, stat aggregation, copy.
- Done when:
  - results include paint percentage, splats, deaths, and special usage
- Validation:
  - UI snapshot or DOM tests plus stat aggregation unit tests

## Epic 5: Stage and Paint System

### Task 5.1: Add stage selection and stage loading

- Purpose: support multiple map definitions.
- Change targets: boot flow, stage initialization, camera defaults.
- Done when:
  - at least three stage definitions are selectable and playable
- Validation:
  - tests for stage load success and spawn placement validity

### Task 5.2: Extend paint-field support for varied stage layouts

- Purpose: allow map-specific paintable regions without breaking current scoring.
- Change targets: paint field setup, stage metadata, score calculations.
- Done when:
  - each stage can define its own paintable footprint and scoring anchors
- Validation:
  - tests for paint coverage correctness on multiple stages

### Task 5.3: Add special target zones and rule anchors

- Purpose: give AI and future rules map-aware targets.
- Change targets: stage metadata and bot/rule hooks.
- Done when:
  - stages expose anchor zones used by bots and optional future rules
- Validation:
  - unit tests for anchor lookup and availability

## Epic 6: Bot AI

### Task 6.1: Add bot roles

- Purpose: stop all bots from behaving like the same generic unit.
- Change targets: actor state, goal scoring, loadout assignment.
- Done when:
  - painter, skirmisher, and anchor roles produce different priorities
- Validation:
  - tests for role-based goal scoring and target selection

### Task 6.2: Make bots weapon-aware

- Purpose: align movement and engagement range with weapon family.
- Change targets: chase distance, retreat logic, fire timing.
- Done when:
  - bots position differently for shooter, roller, and charger loadouts
- Validation:
  - simulation tests around distance-to-target decisions

### Task 6.3: Add sub/special use heuristics

- Purpose: make new tools visible in offline matches.
- Change targets: bot think loop and ability dispatch rules.
- Done when:
  - bots can use subs and specials intentionally rather than randomly
- Validation:
  - tests for activation preconditions and cooldown/gauge behavior

## Epic 7: Mobile Controls

### Task 7.1: Expand input schema for sub and special

- Purpose: support the new combat surface on touch and desktop.
- Change targets: input manager, HUD controls, desktop bindings.
- Done when:
  - main, sub, special, squid, and pause all coexist on mobile landscape
- Validation:
  - input tests and layout verification for collision-free controls

### Task 7.2: Rebalance short-height HUD and controls for expanded combat UI

- Purpose: preserve readability after adding loadout and special HUD elements.
- Change targets: responsive CSS, HUD composition, layout verifier.
- Done when:
  - the expanded HUD still fits target short-height viewports
- Validation:
  - DOM layout checks for representative 320-390px tall landscape screens

## Epic 8: Audio and Effects

### Task 8.1: Differentiate weapon audio and feedback

- Purpose: make loadouts feel distinct.
- Change targets: audio bus, effect triggers, hit/paint feedback.
- Done when:
  - each main weapon family has distinct fire and impact cues
- Validation:
  - manual verification plus effect dispatch tests where practical

### Task 8.2: Add sub/special cue package

- Purpose: improve readability of larger combat interactions.
- Change targets: audio/effect hooks for ability start, travel, and resolution.
- Done when:
  - sub and special usage produce recognizably different cues
- Validation:
  - manual verification and runtime smoke test

## Epic 9: QA and Automation

### Task 9.1: Expand unit coverage for definitions and combat families

- Purpose: protect the new data-driven architecture.
- Change targets: tests for definitions, combat, rules, and AI.
- Done when:
  - the new data surfaces have dedicated regression coverage
- Validation:
  - `npm test`

### Task 9.2: Extend DOM layout verification for expanded HUD

- Purpose: keep mobile layout stable as UI grows.
- Change targets: `verify:layout` scenarios and assertions.
- Done when:
  - the verifier covers loadout-selection and expanded HUD states
- Validation:
  - `npm run verify:layout`

### Task 9.3: Add deterministic gameplay smoke coverage for multi-loadout flow

- Purpose: ensure a match can boot, play, and end under the richer system.
- Change targets: Playwright automation and text-state assertions.
- Done when:
  - automation can cover loadout selection, ability use, and results flow
- Validation:
  - Playwright-based smoke run in a WebGL-capable environment
