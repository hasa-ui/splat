import type { Vec2 } from "./types";

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(a: Vec2, scalar: number): Vec2 {
  return { x: a.x * scalar, y: a.y * scalar };
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len <= 1e-6) {
    return { x: 0, y: 0 };
  }
  return { x: a.x / len, y: a.y / len };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function angleToVector(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function vectorToAngle(dir: Vec2): number {
  return Math.atan2(dir.y, dir.x);
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function rotateToward(from: number, to: number, amount: number): number {
  let delta = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (Math.abs(delta) < amount) {
    return to;
  }
  delta = Math.sign(delta) * amount;
  return from + delta;
}

export function clampLength(dir: Vec2, maxLen = 1): Vec2 {
  const len = length(dir);
  if (len <= maxLen) {
    return dir;
  }
  return mul(dir, maxLen / len);
}
