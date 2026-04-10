import type { TeamId, Vec2 } from "./types";

export type WeaponFamily = "shooter";
export type BotRole = "painter" | "skirmisher" | "anchor";

export interface StageObstacle {
  id: string;
  pos: Vec2;
  half: Vec2;
  height: number;
  color: string;
}

export interface StageNode {
  pos: Vec2;
  bias: [number, number];
}

export interface PaintFieldLayout {
  width: number;
  height: number;
}

export interface StageRuleAnchors {
  retreatNodeByTeam: Record<TeamId, number>;
  fallbackPaintNodeByTeam: Record<TeamId, number>;
  contestNodeRange: [number, number];
}

export interface ProjectileProfile {
  maxRange: number;
  stepDistance: number;
  minSteps: number;
  lateralSpread: number;
  trailPaintRadius: number;
  trailPaintFalloff: number;
  selfPaintRadius: number;
  obstacleInflate: number;
}

export interface WeaponDefinition {
  id: string;
  displayName: string;
  family: WeaponFamily;
  inkCost: number;
  cooldownMs: number;
  damage: number;
  range: number;
  paintRadius: number;
  projectileProfile: ProjectileProfile;
  movementModifier: number;
  subWeaponId: string;
  specialId: string;
}

export interface SubWeaponDefinition {
  id: string;
  displayName: string;
  inkCost: number;
  deployType: "none";
  damageProfile: "none";
  paintProfile: "none";
  cooldownMs: number;
}

export interface SpecialDefinition {
  id: string;
  displayName: string;
  gaugeCost: number;
  activationTimeMs: number;
  durationMs: number;
  effectProfile: "none";
}

export interface LoadoutDefinition {
  id: string;
  displayName: string;
  mainWeaponId: string;
  subWeaponId: string;
  specialId: string;
  botRoleHint: BotRole;
}

export interface MatchRuleDefinition {
  id: string;
  displayName: string;
  durationSeconds: number;
  scoreModel: "paint-coverage";
  hudModel: "basic-turf";
  botGoalModel: "node-paint-v1";
}

export interface StageDefinition {
  id: string;
  displayName: string;
  width: number;
  height: number;
  spawnPoints: Record<TeamId, Vec2[]>;
  obstacles: StageObstacle[];
  navigationNodes: StageNode[];
  paintFieldLayout: PaintFieldLayout;
  ruleAnchors: StageRuleAnchors;
}

export const DEFAULT_SUB_WEAPON_ID = "sub-none";
export const DEFAULT_SPECIAL_ID = "special-none";
export const DEFAULT_WEAPON_ID = "weapon-splatter";
export const DEFAULT_LOADOUT_ID = "loadout-splatter";
export const DEFAULT_RULE_ID = "rule-turf-battle";
export const DEFAULT_STAGE_ID = "stage-inkline-arena";

export const subWeaponDefinitions: SubWeaponDefinition[] = [
  {
    id: DEFAULT_SUB_WEAPON_ID,
    displayName: "No Sub Weapon",
    inkCost: 0,
    deployType: "none",
    damageProfile: "none",
    paintProfile: "none",
    cooldownMs: 0,
  },
];

export const specialDefinitions: SpecialDefinition[] = [
  {
    id: DEFAULT_SPECIAL_ID,
    displayName: "No Special Weapon",
    gaugeCost: 0,
    activationTimeMs: 0,
    durationMs: 0,
    effectProfile: "none",
  },
];

export const weaponDefinitions: WeaponDefinition[] = [
  {
    id: DEFAULT_WEAPON_ID,
    displayName: "Arena Splatter",
    family: "shooter",
    inkCost: 0.055,
    cooldownMs: 120,
    damage: 1,
    range: 8.8,
    paintRadius: 0.72,
    projectileProfile: {
      maxRange: 8.8,
      stepDistance: 1.7,
      minSteps: 3,
      lateralSpread: 0.4,
      trailPaintRadius: 0.72,
      trailPaintFalloff: 0.06,
      selfPaintRadius: 0.26,
      obstacleInflate: 0.2,
    },
    movementModifier: 1,
    subWeaponId: DEFAULT_SUB_WEAPON_ID,
    specialId: DEFAULT_SPECIAL_ID,
  },
];

export const loadoutDefinitions: LoadoutDefinition[] = [
  {
    id: DEFAULT_LOADOUT_ID,
    displayName: "Default Shooter",
    mainWeaponId: DEFAULT_WEAPON_ID,
    subWeaponId: DEFAULT_SUB_WEAPON_ID,
    specialId: DEFAULT_SPECIAL_ID,
    botRoleHint: "painter",
  },
];

export const matchRuleDefinitions: MatchRuleDefinition[] = [
  {
    id: DEFAULT_RULE_ID,
    displayName: "Turf Battle",
    durationSeconds: 180,
    scoreModel: "paint-coverage",
    hudModel: "basic-turf",
    botGoalModel: "node-paint-v1",
  },
];

export const stageDefinitions: StageDefinition[] = [
  {
    id: DEFAULT_STAGE_ID,
    displayName: "Inkline Arena",
    width: 42,
    height: 28,
    spawnPoints: {
      0: [
        { x: -17, y: -3.6 },
        { x: -17.8, y: 0.5 },
        { x: -17, y: 4.2 },
      ],
      1: [
        { x: 17, y: 3.6 },
        { x: 17.8, y: -0.5 },
        { x: 17, y: -4.2 },
      ],
    },
    obstacles: [
      { id: "center-block", pos: { x: 0, y: 0 }, half: { x: 2.4, y: 1.2 }, height: 2.2, color: "#25333a" },
      { id: "center-top", pos: { x: 0, y: -5.8 }, half: { x: 1.4, y: 1.1 }, height: 1.5, color: "#2d4048" },
      { id: "center-bottom", pos: { x: 0, y: 5.8 }, half: { x: 1.4, y: 1.1 }, height: 1.5, color: "#2d4048" },
      { id: "left-wing", pos: { x: -8.8, y: -1.6 }, half: { x: 1.9, y: 2.2 }, height: 1.9, color: "#1f2a30" },
      { id: "right-wing", pos: { x: 8.8, y: 1.6 }, half: { x: 1.9, y: 2.2 }, height: 1.9, color: "#1f2a30" },
      { id: "left-pocket", pos: { x: -14.2, y: 7.2 }, half: { x: 2.2, y: 1.4 }, height: 1.2, color: "#31434d" },
      { id: "right-pocket", pos: { x: 14.2, y: -7.2 }, half: { x: 2.2, y: 1.4 }, height: 1.2, color: "#31434d" },
    ],
    navigationNodes: [
      { pos: { x: -16, y: 0 }, bias: [1.0, 0.2] },
      { pos: { x: -10, y: -8 }, bias: [1.0, 0.4] },
      { pos: { x: -10, y: 8 }, bias: [1.0, 0.4] },
      { pos: { x: -2.2, y: -4.4 }, bias: [0.9, 0.9] },
      { pos: { x: -2.2, y: 4.4 }, bias: [0.9, 0.9] },
      { pos: { x: 1.8, y: 3.2 }, bias: [0.8, 0.8] },
      { pos: { x: 8.5, y: -8 }, bias: [0.4, 1.0] },
      { pos: { x: 8.5, y: 8 }, bias: [0.4, 1.0] },
      { pos: { x: 15.5, y: 0 }, bias: [0.2, 1.0] },
    ],
    paintFieldLayout: {
      width: 128,
      height: 96,
    },
    ruleAnchors: {
      retreatNodeByTeam: { 0: 1, 1: 7 },
      fallbackPaintNodeByTeam: { 0: 2, 1: 6 },
      contestNodeRange: [3, 5],
    },
  },
];

function createLookup<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>;
}

const stageLookup = createLookup(stageDefinitions);
const ruleLookup = createLookup(matchRuleDefinitions);
const loadoutLookup = createLookup(loadoutDefinitions);
const weaponLookup = createLookup(weaponDefinitions);
const subWeaponLookup = createLookup(subWeaponDefinitions);
const specialLookup = createLookup(specialDefinitions);

function getRequired<T>(lookup: Record<string, T>, id: string, kind: string): T {
  const value = lookup[id];
  if (!value) {
    throw new Error(`${kind} definition not found: ${id}`);
  }
  return value;
}

export function getStageDefinition(id: string): StageDefinition {
  return getRequired(stageLookup, id, "stage");
}

export function getMatchRuleDefinition(id: string): MatchRuleDefinition {
  return getRequired(ruleLookup, id, "match rule");
}

export function getLoadoutDefinition(id: string): LoadoutDefinition {
  return getRequired(loadoutLookup, id, "loadout");
}

export function getWeaponDefinition(id: string): WeaponDefinition {
  return getRequired(weaponLookup, id, "weapon");
}

export function getSubWeaponDefinition(id: string): SubWeaponDefinition {
  return getRequired(subWeaponLookup, id, "sub weapon");
}

export function getSpecialDefinition(id: string): SpecialDefinition {
  return getRequired(specialLookup, id, "special");
}
