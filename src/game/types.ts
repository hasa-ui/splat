export type TeamId = 0 | 1;
export type Ownership = TeamId | -1;
export type GameMode = "title" | "countdown" | "playing" | "paused" | "results";
export type BotBehavior = "paint" | "contest" | "chase" | "retreat" | "respawn";

export interface Vec2 {
  x: number;
  y: number;
}

export interface ActorState {
  id: string;
  team: TeamId;
  isPlayer: boolean;
  spawnSlot: number;
  loadoutId: string;
  pos: Vec2;
  vel: Vec2;
  aim: Vec2;
  angle: number;
  ink: number;
  hp: number;
  alive: boolean;
  squid: boolean;
  respawnTimer: number;
  invulnTimer: number;
  shootCooldown: number;
  behavior: BotBehavior;
  targetNode: number;
  thinkTimer: number;
  meshJitter: number;
}

export interface MatchSnapshot {
  mode: GameMode;
  timer: number;
  allyCoverage: number;
  enemyCoverage: number;
  camera: {
    mode: "overview" | "gameplay";
    position: {
      x: number;
      y: number;
      z: number;
    };
    target: {
      x: number;
      y: number;
      z: number;
    };
  };
  player: {
    x: number;
    y: number;
    ink: number;
    hp: number;
    alive: boolean;
    squid: boolean;
    facing: number;
    aim: Vec2;
  };
  bots: Array<{
    id: string;
    team: TeamId;
    x: number;
    y: number;
    alive: boolean;
    behavior: BotBehavior;
  }>;
}
