import { clampLength } from "./math";
import type { Vec2 } from "./types";

interface StickRefs {
  zone: HTMLElement;
  knob: HTMLElement;
}

interface InputRefs {
  left: StickRefs;
  right: StickRefs;
  squidButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
}

export interface FrameInput {
  move: Vec2;
  aim: Vec2;
  shoot: boolean;
  squid: boolean;
}

interface TouchStickState {
  id: number | null;
  origin: Vec2;
  current: Vec2;
}

export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly refs: InputRefs;
  private readonly keys = new Set<string>();
  private readonly leftTouch: TouchStickState = { id: null, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
  private readonly rightTouch: TouchStickState = { id: null, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } };
  private move: Vec2 = { x: 0, y: 0 };
  private aim: Vec2 = { x: 1, y: 0 };
  private mouseAim: Vec2 = { x: 1, y: 0 };
  private shoot = false;
  private squidHeld = false;
  private pauseToggle = false;
  private coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  private enabled = false;

  constructor(canvas: HTMLCanvasElement, refs: InputRefs) {
    this.canvas = canvas;
    this.refs = refs;
    this.bindEvents();
    this.syncControlVisibility();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.move = { x: 0, y: 0 };
      this.shoot = false;
      this.squidHeld = false;
      this.resetStick(this.leftTouch, this.refs.left.knob);
      this.resetStick(this.rightTouch, this.refs.right.knob);
    }
    this.syncControlVisibility();
  }

  setSquidVisual(active: boolean): void {
    this.refs.squidButton.classList.toggle("active", active);
  }

  consumePauseToggle(): boolean {
    const value = this.pauseToggle;
    this.pauseToggle = false;
    return value;
  }

  getFrameInput(): FrameInput {
    if (!this.enabled) {
      return { move: { x: 0, y: 0 }, aim: this.aim, shoot: false, squid: false };
    }

    if (!this.coarsePointer) {
      this.move = this.computeKeyboardMove();
      this.aim = this.mouseAim;
      this.shoot = this.keys.has("Mouse0");
      this.squidHeld = this.keys.has("ShiftLeft") || this.keys.has("Space");
    } else {
      this.move = this.computeStickVector(this.leftTouch);
      const right = this.computeStickVector(this.rightTouch);
      if (Math.hypot(right.x, right.y) > 0.18) {
        this.aim = right;
      }
      this.shoot = this.rightTouch.id !== null && Math.hypot(right.x, right.y) > 0.18;
    }

    return {
      move: this.move,
      aim: this.aim,
      shoot: this.shoot,
      squid: this.squidHeld,
    };
  }

  private bindEvents(): void {
    window.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }
      this.keys.add(event.code);
      if (event.code === "KeyP" || event.code === "Escape") {
        this.pauseToggle = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    this.canvas.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }
      this.keys.add("Mouse0");
      this.updateMouseAim(event);
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.keys.delete("Mouse0");
      }
    });

    window.addEventListener("mousemove", (event) => {
      this.updateMouseAim(event);
    });

    this.refs.pauseButton.addEventListener("click", () => {
      this.pauseToggle = true;
    });

    const setupStick = (stick: TouchStickState, refs: StickRefs, isRight: boolean) => {
      const handlePointerDown = (event: PointerEvent) => {
        if (!this.enabled) {
          return;
        }
        this.coarsePointer = true;
        stick.id = event.pointerId;
        const point = { x: event.clientX, y: event.clientY };
        stick.origin = point;
        stick.current = point;
        refs.zone.setPointerCapture(event.pointerId);
        this.updateStick(stick, refs.knob);
        if (isRight) {
          this.aim = { x: 1, y: 0 };
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (stick.id !== event.pointerId) {
          return;
        }
        stick.current = { x: event.clientX, y: event.clientY };
        this.updateStick(stick, refs.knob);
      };

      const handlePointerEnd = (event: PointerEvent) => {
        if (stick.id !== event.pointerId) {
          return;
        }
        refs.zone.releasePointerCapture(event.pointerId);
        this.resetStick(stick, refs.knob);
      };

      refs.zone.addEventListener("pointerdown", handlePointerDown);
      refs.zone.addEventListener("pointermove", handlePointerMove);
      refs.zone.addEventListener("pointerup", handlePointerEnd);
      refs.zone.addEventListener("pointercancel", handlePointerEnd);
    };

    setupStick(this.leftTouch, this.refs.left, false);
    setupStick(this.rightTouch, this.refs.right, true);

    const squidPress = (active: boolean) => {
      if (!this.enabled) {
        return;
      }
      this.coarsePointer = true;
      this.squidHeld = active;
    };

    this.refs.squidButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      squidPress(true);
    });
    this.refs.squidButton.addEventListener("pointerup", () => squidPress(false));
    this.refs.squidButton.addEventListener("pointercancel", () => squidPress(false));

    window.addEventListener("resize", () => {
      this.coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      this.syncControlVisibility();
    });
  }

  private updateMouseAim(event: MouseEvent): void {
    if (this.coarsePointer) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width * 0.5);
    const dy = event.clientY - (rect.top + rect.height * 0.5);
    const aim = clampLength({ x: dx / (rect.width * 0.18), y: dy / (rect.height * 0.18) }, 1);
    if (Math.hypot(aim.x, aim.y) > 0.05) {
      this.mouseAim = aim;
    }
  }

  private computeKeyboardMove(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) {
      x -= 1;
    }
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) {
      x += 1;
    }
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) {
      y -= 1;
    }
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) {
      y += 1;
    }
    return clampLength({ x, y }, 1);
  }

  private computeStickVector(stick: TouchStickState): Vec2 {
    if (stick.id === null) {
      return { x: 0, y: 0 };
    }
    const dx = stick.current.x - stick.origin.x;
    const dy = stick.current.y - stick.origin.y;
    return clampLength({ x: dx / 52, y: dy / 52 }, 1);
  }

  private updateStick(stick: TouchStickState, knob: HTMLElement): void {
    const vector = this.computeStickVector(stick);
    knob.style.transform = `translate(${vector.x * 44}px, ${vector.y * 44}px)`;
  }

  private resetStick(stick: TouchStickState, knob: HTMLElement): void {
    stick.id = null;
    stick.origin = { x: 0, y: 0 };
    stick.current = { x: 0, y: 0 };
    knob.style.transform = "";
  }

  private syncControlVisibility(): void {
    const display = this.coarsePointer ? "" : "none";
    this.refs.left.zone.style.display = display;
    this.refs.right.zone.style.display = display;
    this.refs.squidButton.style.display = display;
  }
}
