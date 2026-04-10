import { clamp, normalize } from "./math";
import type { StageDefinition } from "./definitions";
import type { Vec2 } from "./types";

export const ACTOR_RADIUS = 0.72;

export function resolveArenaMovement(stage: StageDefinition, position: Vec2, radius: number): Vec2 {
  let next = { ...position };
  next.x = clamp(next.x, -stage.width * 0.5 + radius, stage.width * 0.5 - radius);
  next.y = clamp(next.y, -stage.height * 0.5 + radius, stage.height * 0.5 - radius);

  for (const obstacle of stage.obstacles) {
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

export function traceLineDistance(stage: StageDefinition, start: Vec2, direction: Vec2, maxDistance: number): number {
  const dir = normalize(direction);
  const steps = Math.ceil(maxDistance / 0.35);
  let distance = maxDistance;
  for (let i = 1; i <= steps; i += 1) {
    const test = {
      x: start.x + dir.x * i * 0.35,
      y: start.y + dir.y * i * 0.35,
    };
    if (
      test.x <= -stage.width * 0.5 ||
      test.x >= stage.width * 0.5 ||
      test.y <= -stage.height * 0.5 ||
      test.y >= stage.height * 0.5 ||
      isBlocked(stage, test, 0.15)
    ) {
      distance = (i - 1) * 0.35;
      break;
    }
  }
  return clamp(distance, 0.8, maxDistance);
}

export function hasDirectPath(stage: StageDefinition, start: Vec2, end: Vec2, inflate = ACTOR_RADIUS): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 0.2));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const point = {
      x: start.x + dx * t,
      y: start.y + dy * t,
    };
    if (isBlocked(stage, point, inflate)) {
      return false;
    }
  }
  return true;
}

export function reachableStageNodeIndices(stage: StageDefinition, start: Vec2, inflate = ACTOR_RADIUS): number[] {
  const reachable: number[] = [];
  for (let index = 0; index < stage.navigationNodes.length; index += 1) {
    if (hasDirectPath(stage, start, stage.navigationNodes[index].pos, inflate)) {
      reachable.push(index);
    }
  }
  return reachable;
}

export function isBlocked(stage: StageDefinition, point: Vec2, inflate = 0): boolean {
  for (const obstacle of stage.obstacles) {
    if (
      Math.abs(point.x - obstacle.pos.x) <= obstacle.half.x + inflate &&
      Math.abs(point.y - obstacle.pos.y) <= obstacle.half.y + inflate
    ) {
      return true;
    }
  }
  return false;
}
