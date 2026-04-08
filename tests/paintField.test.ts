import { describe, expect, it } from "vitest";
import { PaintField } from "../src/game/paintField";

describe("PaintField", () => {
  it("tracks team coverage after repainting", () => {
    const field = new PaintField(32, 24, 16, 12);
    field.stampWorld({ x: 0, y: 0 }, 2, 0);
    const first = field.getCoverage();

    expect(first.ally).toBeGreaterThan(0);
    expect(first.enemy).toBe(0);

    field.stampWorld({ x: 0.5, y: 0 }, 1.4, 1);
    const second = field.getCoverage();

    expect(second.enemy).toBeGreaterThan(0);
    expect(second.ally).toBeLessThan(first.ally);
    expect(second.ally + second.enemy + second.neutral).toBe(32 * 24);
  });

  it("samples ownership using world coordinates", () => {
    const field = new PaintField(24, 24, 12, 12);
    field.stampWorld({ x: -3, y: 2 }, 1.5, 1);

    expect(field.sampleWorld(-3, 2)).toBe(1);
    expect(field.sampleWorld(4, -4)).toBe(-1);
  });
});
