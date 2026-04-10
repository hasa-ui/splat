import { MathUtils } from "three";
import type { StageDefinition } from "./definitions";
import type { ActorState, BotBehavior, TeamId } from "./types";
import { vec } from "./math";

const MAX_HP = 4;
const MAX_INK = 1;

function defaultAngle(team: TeamId): number {
  return team === 0 ? 0 : Math.PI;
}

function defaultAim(team: TeamId) {
  return { x: team === 0 ? 1 : -1, y: 0 };
}

function defaultBehavior(team: TeamId): BotBehavior {
  return team === 0 ? "paint" : "contest";
}

function defaultTargetNode(stage: StageDefinition, team: TeamId): number {
  return stage.ruleAnchors.retreatNodeByTeam[team];
}

export function createActorState(
  id: string,
  team: TeamId,
  isPlayer: boolean,
  spawnSlot: number,
  loadoutId: string,
): ActorState {
  return {
    id,
    team,
    isPlayer,
    spawnSlot,
    loadoutId,
    pos: vec(),
    vel: vec(),
    aim: defaultAim(team),
    angle: defaultAngle(team),
    ink: MAX_INK,
    hp: MAX_HP,
    alive: true,
    squid: false,
    respawnTimer: 0,
    invulnTimer: 0,
    shootCooldown: 0,
    behavior: defaultBehavior(team),
    targetNode: 0,
    thinkTimer: 0,
    meshJitter: Math.random() * Math.PI * 2,
  };
}

export function restoreActorState(actor: ActorState, stage: StageDefinition, initial = false): void {
  const spawn = stage.spawnPoints[actor.team][actor.spawnSlot];
  actor.pos = { x: spawn.x, y: spawn.y };
  actor.vel = vec();
  actor.aim = defaultAim(actor.team);
  actor.angle = defaultAngle(actor.team);
  actor.ink = MAX_INK;
  actor.hp = MAX_HP;
  actor.alive = true;
  actor.squid = false;
  actor.respawnTimer = 0;
  actor.invulnTimer = initial ? 0 : 1.2;
  actor.shootCooldown = 0;
  actor.behavior = defaultBehavior(actor.team);
  actor.targetNode = defaultTargetNode(stage, actor.team);
  actor.thinkTimer = MathUtils.randFloat(0.1, 0.4);
}
