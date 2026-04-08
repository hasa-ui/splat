import { clamp } from "./math";
import type { Ownership, TeamId, Vec2 } from "./types";

export class PaintField {
  readonly width: number;
  readonly height: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly owners: Int8Array;
  private readonly teamCounts: [number, number];
  private dirty = true;
  private imageData: ImageData | null = null;

  constructor(width: number, height: number, worldWidth: number, worldHeight: number) {
    this.width = width;
    this.height = height;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.owners = new Int8Array(width * height);
    this.owners.fill(-1);
    this.teamCounts = [0, 0];
  }

  clear(): void {
    this.owners.fill(-1);
    this.teamCounts[0] = 0;
    this.teamCounts[1] = 0;
    this.dirty = true;
  }

  sampleWorld(x: number, y: number): Ownership {
    const { cx, cy } = this.worldToCell(x, y);
    return this.owners[this.index(cx, cy)] as Ownership;
  }

  stampWorld(center: Vec2, radius: number, team: TeamId): boolean {
    const scaleX = this.width / this.worldWidth;
    const scaleY = this.height / this.worldHeight;
    const cx = Math.round((center.x + this.worldWidth * 0.5) * scaleX);
    const cy = Math.round((center.y + this.worldHeight * 0.5) * scaleY);
    const rx = Math.ceil(radius * scaleX);
    const ry = Math.ceil(radius * scaleY);
    let changed = false;

    for (let y = cy - ry; y <= cy + ry; y += 1) {
      if (y < 0 || y >= this.height) {
        continue;
      }
      for (let x = cx - rx; x <= cx + rx; x += 1) {
        if (x < 0 || x >= this.width) {
          continue;
        }
        const world = this.cellToWorld(x, y);
        const dx = world.x - center.x;
        const dy = world.y - center.y;
        if ((dx * dx) / (radius * radius) + (dy * dy) / (radius * radius) > 1) {
          continue;
        }
        const idx = this.index(x, y);
        const previous = this.owners[idx] as Ownership;
        if (previous === team) {
          continue;
        }
        if (previous !== -1) {
          this.teamCounts[previous] -= 1;
        }
        this.owners[idx] = team;
        this.teamCounts[team] += 1;
        changed = true;
      }
    }

    if (changed) {
      this.dirty = true;
    }
    return changed;
  }

  scoreAround(center: Vec2, radius: number, team: TeamId): number {
    let score = 0;
    const min = this.worldToCell(center.x - radius, center.y - radius);
    const max = this.worldToCell(center.x + radius, center.y + radius);
    for (let y = min.cy; y <= max.cy; y += 1) {
      for (let x = min.cx; x <= max.cx; x += 1) {
        const owner = this.owners[this.index(x, y)] as Ownership;
        if (owner === team) {
          score += 1;
        } else if (owner === -1) {
          score += 0.35;
        } else {
          score -= 1.25;
        }
      }
    }
    return score;
  }

  getCoverage(): { ally: number; enemy: number; neutral: number } {
    const ally = this.teamCounts[0];
    const enemy = this.teamCounts[1];
    const neutral = this.owners.length - ally - enemy;
    return { ally, enemy, neutral };
  }

  getCoveragePercentages(): { ally: number; enemy: number } {
    const total = this.owners.length;
    if (!total) {
      return { ally: 50, enemy: 50 };
    }
    return {
      ally: (this.teamCounts[0] / total) * 100,
      enemy: (this.teamCounts[1] / total) * 100,
    };
  }

  drawToCanvas(canvas: HTMLCanvasElement): void {
    if (!this.dirty) {
      return;
    }
    if (canvas.width !== this.width || canvas.height !== this.height) {
      canvas.width = this.width;
      canvas.height = this.height;
    }

    if (!this.imageData) {
      this.imageData = new ImageData(this.width, this.height);
    }
    const data = this.imageData.data;
    for (let i = 0; i < this.owners.length; i += 1) {
      const owner = this.owners[i] as Ownership;
      const base = i * 4;
      if (owner === 0) {
        data[base] = 31;
        data[base + 1] = 228;
        data[base + 2] = 168;
      } else if (owner === 1) {
        data[base] = 255;
        data[base + 1] = 92;
        data[base + 2] = 138;
      } else {
        data[base] = 34;
        data[base + 1] = 46;
        data[base + 2] = 54;
      }
      data[base + 3] = 255;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.putImageData(this.imageData, 0, 0);
    this.dirty = false;
  }

  private worldToCell(x: number, y: number): { cx: number; cy: number } {
    return {
      cx: clamp(Math.floor(((x + this.worldWidth * 0.5) / this.worldWidth) * this.width), 0, this.width - 1),
      cy: clamp(Math.floor(((y + this.worldHeight * 0.5) / this.worldHeight) * this.height), 0, this.height - 1),
    };
  }

  private cellToWorld(cx: number, cy: number): Vec2 {
    return {
      x: ((cx + 0.5) / this.width) * this.worldWidth - this.worldWidth * 0.5,
      y: ((cy + 0.5) / this.height) * this.worldHeight - this.worldHeight * 0.5,
    };
  }

  private index(x: number, y: number): number {
    return y * this.width + x;
  }
}
