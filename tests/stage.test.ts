import { describe, expect, it } from "vitest";
import { DEFAULT_STAGE_ID, getStageDefinition } from "../src/game/definitions";
import {
  ACTOR_RADIUS,
  hasDirectPath,
  isBlocked,
  reachableStageNodeIndices,
  resolveArenaMovement,
  traceLineDistance,
} from "../src/game/stage";

describe("stage collision helpers", () => {
  const stage = getStageDefinition(DEFAULT_STAGE_ID);

  it("keeps actors inside arena bounds", () => {
    const clamped = resolveArenaMovement(stage, { x: 40, y: -40 }, 0.72);
    expect(clamped.x).toBeLessThan(21);
    expect(clamped.y).toBeGreaterThan(-14);
  });

  it("stops line traces at blocking geometry", () => {
    const openDistance = traceLineDistance(stage, { x: -15, y: -10 }, { x: 1, y: 0 }, 8);
    const blockedDistance = traceLineDistance(stage, { x: -4.8, y: 0 }, { x: 1, y: 0 }, 8);

    expect(openDistance).toBeGreaterThan(6);
    expect(blockedDistance).toBeLessThan(4);
  });

  it("keeps all navigation nodes outside blocked geometry", () => {
    for (const node of stage.navigationNodes) {
      expect(isBlocked(stage, node.pos, ACTOR_RADIUS)).toBe(false);
    }
  });

  it("filters contested nodes by direct reachability from the bot position", () => {
    expect(hasDirectPath(stage, { x: -17, y: 4.2 }, stage.navigationNodes[5].pos)).toBe(true);
    expect(hasDirectPath(stage, { x: -16, y: 0 }, stage.navigationNodes[5].pos)).toBe(false);
    expect(reachableStageNodeIndices(stage, { x: -17, y: 4.2 })).toContain(5);
    expect(reachableStageNodeIndices(stage, { x: -16, y: 0 })).not.toContain(5);
    expect(reachableStageNodeIndices(stage, stage.navigationNodes[5].pos)).toContain(7);
  });

  it("provides valid team spawns inside the arena", () => {
    for (const team of [0, 1] as const) {
      for (const spawn of stage.spawnPoints[team]) {
        expect(spawn.x).toBeGreaterThan(-stage.width * 0.5);
        expect(spawn.x).toBeLessThan(stage.width * 0.5);
        expect(spawn.y).toBeGreaterThan(-stage.height * 0.5);
        expect(spawn.y).toBeLessThan(stage.height * 0.5);
        expect(isBlocked(stage, spawn, ACTOR_RADIUS * 0.5)).toBe(false);
      }
    }
  });
});
