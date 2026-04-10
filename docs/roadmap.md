# Inkline Arena Roadmap

## Summary

This roadmap converts the target specification into an implementation order that preserves the current playable prototype while expanding it toward a richer offline ink battle game. The roadmap is intentionally staged so each phase leaves the game playable and testable.

## Phase 0: Foundation Refactor

### Goals

- Move current single-weapon assumptions into shared data definitions.
- Prepare the codebase for multiple stages, loadouts, and rules without changing the playable loop yet.

### Deliverables

- `WeaponDefinition`, `SubWeaponDefinition`, `SpecialDefinition`, `LoadoutDefinition`, `MatchRuleDefinition`, and `StageDefinition` introduced.
- Current shooter, current turf rule, and current stage migrated into data.
- HUD/state code split so new gauges and loadout metadata can be added without rewriting the entire game loop.
- Tests added around data-driven weapon/rule/stage selection.

### Dependencies

- None. This phase is the foundation for everything else.

### Acceptance

- The current game still plays exactly as before using data-backed definitions.
- Existing tests still pass.
- New definitions can be swapped without touching core loop code paths.

## Phase 1: Core Combat Expansion

### Goals

- Add loadout selection and expand the playable core beyond one weapon.
- Introduce sub weapons and the special gauge loop.

### Deliverables

- Pre-match loadout selection screen.
- Baseline `Shooter`, `Roller`, and `Charger` loadouts.
- First-pass sub weapons.
- First-pass special gauge fill and special activation flow.
- HUD updates for loadout identity and special meter.

### Dependencies

- Requires Phase 0 data refactor.

### Acceptance

- The player can choose among three loadouts before a match.
- Each loadout has clearly different paint/combat behavior.
- Special gauge fills and can be spent during a match.

## Phase 2: Stage and AI Expansion

### Goals

- Expand the arena variety and make AI understand the richer combat loop.

### Deliverables

- Two additional stages beyond the current map.
- Stage selection flow or rotation for offline matches.
- Bot roles: `painter`, `skirmisher`, `anchor`.
- Bot logic for weapon-aware range, sub use, and special timing.
- Map-specific navigation and safer lane selection.

### Dependencies

- Requires Phase 0 definitions and Phase 1 loadout systems.

### Acceptance

- All stages can complete full offline matches.
- Bots no longer behave as generic clones across all loadouts.
- Common pathing dead-ends and idle stalls are covered by automated checks.

## Phase 3: Match Presentation and Onboarding

### Goals

- Improve readability, onboarding, and payoff so the game feels more complete.

### Deliverables

- Expanded results screen with contribution details.
- Tutorial or guided first-match onboarding.
- Improved SFX, weapon feedback, splat/respawn feedback, and special cues.
- Mobile HUD polish for the larger combat surface.

### Dependencies

- Benefits from Phases 1 and 2 but can overlap after their interfaces stabilize.

### Acceptance

- New players can learn the full loop without outside instructions.
- Results screens communicate more than final paint percentage.
- Mobile landscape remains readable under the larger HUD surface.

## Phase 4: Offline Progression and Extended Modes

### Goals

- Add light progression and optional rule depth without changing the offline-first identity.

### Deliverables

- Local unlocks for loadouts, stages, or challenge presets.
- Saved settings and remembered last-selected loadout.
- Optional experimental rule prototype such as `Area Control`.

### Dependencies

- Requires stable loadout, stage, and results systems from earlier phases.

### Acceptance

- Progression is stored locally and survives browser restarts.
- Extended rule work does not regress Turf Battle as the primary supported mode.
- No online systems are introduced.

## Release Strategy

### Milestone A

- End of Phase 1.
- Game is materially closer to the target combat fantasy and remains shippable on Pages.

### Milestone B

- End of Phase 2.
- Game has the minimum breadth expected from a fuller offline ink battle title.

### Milestone C

- End of Phase 4.
- Game has durable content, progression, and optional rule expansion while staying offline-only.
