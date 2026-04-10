import { describe, expect, it } from "vitest";
import { createActorState, restoreActorState } from "../src/game/actors";
import { DEFAULT_LOADOUT_ID, DEFAULT_STAGE_ID, getStageDefinition } from "../src/game/definitions";

describe("actor state helpers", () => {
  const stage = getStageDefinition(DEFAULT_STAGE_ID);

  it("assigns the requested loadout when actors are created", () => {
    const actor = createActorState("player", 0, true, 0, DEFAULT_LOADOUT_ID);

    expect(actor.loadoutId).toBe(DEFAULT_LOADOUT_ID);
    expect(actor.spawnSlot).toBe(0);
  });

  it("restores actors to their team spawn while preserving the loadout id", () => {
    const actor = createActorState("enemy-1", 1, false, 0, DEFAULT_LOADOUT_ID);
    actor.pos = { x: 0, y: 0 };
    actor.hp = 1;
    actor.ink = 0.1;
    actor.alive = false;
    actor.squid = true;
    actor.respawnTimer = 2.5;

    restoreActorState(actor, stage);

    expect(actor.loadoutId).toBe(DEFAULT_LOADOUT_ID);
    expect(actor.pos).toEqual(stage.spawnPoints[1][0]);
    expect(actor.alive).toBe(true);
    expect(actor.squid).toBe(false);
    expect(actor.hp).toBe(4);
    expect(actor.ink).toBe(1);
  });
});
