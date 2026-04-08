import { clamp, normalize } from "./math";
import type { TeamId, Vec2 } from "./types";

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

export const STAGE_WIDTH = 42;
export const STAGE_HEIGHT = 28;
export const ACTOR_RADIUS = 0.72;

export const obstacles: StageObstacle[] = [
  { id: "center-block", pos: { x: 0, y: 0 }, half: { x: 2.4, y: 1.2 }, height: 2.2, color: "#25333a" },
  { id: "center-top", pos: { x: 0, y: -5.8 }, half: { x: 1.4, y: 1.1 }, height: 1.5, color: "#2d4048" },
  { id: "center-bottom", pos: { x: 0, y: 5.8 }, half: { x: 1.4, y: 1.1 }, height: 1.5, color: "#2d4048" },
  { id: "left-wing", pos: { x: -8.8, y: -1.6 }, half: { x: 1.9, y: 2.2 }, height: 1.9, color: "#1f2a30" },
  { id: "right-wing", pos: { x: 8.8, y: 1.6 }, half: { x: 1.9, y: 2.2 }, height: 1.9, color: "#1f2a30" },
  { id: "left-pocket", pos: { x: -14.2, y: 7.2 }, half: { x: 2.2, y: 1.4 }, height: 1.2, color: "#31434d" },
  { id: "right-pocket", pos: { x: 14.2, y: -7.2 }, half: { x: 2.2, y: 1.4 }, height: 1.2, color: "#31434d" },
];

export const stageNodes: StageNode[] = [
  { pos: { x: -16, y: 0 }, bias: [1.0, 0.2] },
  { pos: { x: -10, y: -8 }, bias: [1.0, 0.4] },
  { pos: { x: -10, y: 8 }, bias: [1.0, 0.4] },
  { pos: { x: -2.2, y: -4.4 }, bias: [0.9, 0.9] },
  { pos: { x: -2.2, y: 4.4 }, bias: [0.9, 0.9] },
  { pos: { x: 3.6, y: 0 }, bias: [0.8, 0.8] },
  { pos: { x: 8.5, y: -8 }, bias: [0.4, 1.0] },
  { pos: { x: 8.5, y: 8 }, bias: [0.4, 1.0] },
  { pos: { x: 15.5, y: 0 }, bias: [0.2, 1.0] },
];

export const teamSpawns: Record<TeamId, Vec2[]> = {
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
};

export function resolveArenaMovement(position: Vec2, radius: number): Vec2 {
  let next = { ...position };
  next.x = clamp(next.x, -STAGE_WIDTH * 0.5 + radius, STAGE_WIDTH * 0.5 - radius);
  next.y = clamp(next.y, -STAGE_HEIGHT * 0.5 + radius, STAGE_HEIGHT * 0.5 - radius);

  for (const obstacle of obstacles) {
    const dx = next.x - obstacle.pos.x;
    const dy = next.y - obstacle.pos.y;
    const overlapX = obstacle.half.x + radius - Math.abs(dx);
    const overlapY = obstacle.half.y + radius - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) {
      continue;
    }
    if (overlapX < overlapY) {
      next.x = obstacle.pos.x + Math.sign(dx || 1) * (obstacle.half.x + radius);
    } else {
      next.y = obstacle.pos.y + Math.sign(dy || 1) * (obstacle.half.y + radius);
    }
  }
  return next;
}

export function traceLineDistance(start: Vec2, direction: Vec2, maxDistance: number): number {
  const dir = normalize(direction);
  const steps = Math.ceil(maxDistance / 0.35);
  let distance = maxDistance;
  for (let i = 1; i <= steps; i += 1) {
    const test = {
      x: start.x + dir.x * i * 0.35,
      y: start.y + dir.y * i * 0.35,
    };
    if (
      test.x <= -STAGE_WIDTH * 0.5 ||
      test.x >= STAGE_WIDTH * 0.5 ||
      test.y <= -STAGE_HEIGHT * 0.5 ||
      test.y >= STAGE_HEIGHT * 0.5 ||
      isBlocked(test, 0.15)
    ) {
      distance = (i - 1) * 0.35;
      break;
    }
  }
  return clamp(distance, 0.8, maxDistance);
}

export function isBlocked(point: Vec2, inflate = 0): boolean {
  for (const obstacle of obstacles) {
    if (
      Math.abs(point.x - obstacle.pos.x) <= obstacle.half.x + inflate &&
      Math.abs(point.y - obstacle.pos.y) <= obstacle.half.y + inflate
    ) {
      return true;
    }
  }
  return false;
}
