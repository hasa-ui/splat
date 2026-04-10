import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOADOUT_ID,
  DEFAULT_RULE_ID,
  DEFAULT_STAGE_ID,
  DEFAULT_WEAPON_ID,
  getLoadoutDefinition,
  getMatchRuleDefinition,
  getStageDefinition,
  getWeaponDefinition,
} from "../src/game/definitions";

describe("game definitions", () => {
  it("resolves the default stage, rule, loadout, and weapon by id", () => {
    const stage = getStageDefinition(DEFAULT_STAGE_ID);
    const rule = getMatchRuleDefinition(DEFAULT_RULE_ID);
    const loadout = getLoadoutDefinition(DEFAULT_LOADOUT_ID);
    const weapon = getWeaponDefinition(DEFAULT_WEAPON_ID);

    expect(stage.displayName).toBe("Inkline Arena");
    expect(rule.durationSeconds).toBe(180);
    expect(loadout.mainWeaponId).toBe(DEFAULT_WEAPON_ID);
    expect(weapon.family).toBe("shooter");
  });

  it("represents the current shooter as the default loadout", () => {
    const loadout = getLoadoutDefinition(DEFAULT_LOADOUT_ID);
    const weapon = getWeaponDefinition(loadout.mainWeaponId);

    expect(loadout.id).toBe(DEFAULT_LOADOUT_ID);
    expect(weapon.id).toBe(DEFAULT_WEAPON_ID);
    expect(weapon.range).toBeGreaterThan(8);
    expect(weapon.cooldownMs).toBe(120);
  });
});
