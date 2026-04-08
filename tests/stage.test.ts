import { describe, expect, it } from "vitest";
import { ACTOR_RADIUS, isBlocked, resolveArenaMovement, stageNodes, traceLineDistance } from "../src/game/stage";

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
});
