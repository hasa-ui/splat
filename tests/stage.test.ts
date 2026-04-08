import { describe, expect, it } from "vitest";
import {
  ACTOR_RADIUS,
  hasDirectPath,
  isBlocked,
  reachableStageNodeIndices,
  resolveArenaMovement,
  stageNodes,
  traceLineDistance,
} from "../src/game/stage";

describe("stage collision helpers", () => {
  it("keeps actors inside arena bounds", () => {
    const clamped = resolveArenaMovement({ x: 40, y: -40 }, 0.72);
    expect(clamped.x).toBeLessThan(21);
    expect(clamped.y).toBeGreaterThan(-14);
  });

  it("stops line traces at blocking geometry", () => {
    const openDistance = traceLineDistance({ x: -15, y: -10 }, { x: 1, y: 0 }, 8);
    const blockedDistance = traceLineDistance({ x: -4.8, y: 0 }, { x: 1, y: 0 }, 8);

    expect(openDistance).toBeGreaterThan(6);
    expect(blockedDistance).toBeLessThan(4);
  });

  it("keeps all navigation nodes outside blocked geometry", () => {
    for (const node of stageNodes) {
      expect(isBlocked(node.pos, ACTOR_RADIUS)).toBe(false);
    }
  });

  it("filters contested nodes by direct reachability from the bot position", () => {
    expect(hasDirectPath({ x: -17, y: 4.2 }, stageNodes[5].pos)).toBe(true);
    expect(hasDirectPath({ x: -16, y: 0 }, stageNodes[5].pos)).toBe(false);
    expect(reachableStageNodeIndices({ x: -17, y: 4.2 })).toContain(5);
    expect(reachableStageNodeIndices({ x: -16, y: 0 })).not.toContain(5);
  });
});
