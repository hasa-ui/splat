import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  CylinderGeometry,
  SphereGeometry,
  NearestFilter,
} from "three";
import { AudioBus } from "./audio";
import { scoreBotNodeCandidate } from "./botGoal";
import { angleToVector, clamp, distance, dot, length, normalize, rotateToward, sub, vec, vectorToAngle } from "./math";
import { InputManager } from "./input";
import { PaintField } from "./paintField";
import {
  ACTOR_RADIUS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  isBlocked,
  obstacles,
  reachableStageNodeIndices,
  resolveArenaMovement,
  stageNodes,
  teamSpawns,
  traceLineDistance,
} from "./stage";
import type { ActorState, GameMode, MatchSnapshot, TeamId, Vec2 } from "./types";

const FIXED_DT = 1 / 60;
const MATCH_SECONDS = 180;
const COUNTDOWN_SECONDS = 3;
const MAX_HP = 4;
const MAX_INK = 1;
const ALLY = new Color("#1fe4a8");
const ENEMY = new Color("#ff5c8a");
const INVULN_TINT = new Color("#f8fff7");
const ARENA_CENTER = new Vector3(0, 0, 0);

interface HudRefs {
  shell: HTMLElement;
  sceneWrap: HTMLElement;
  centerNote: HTMLElement;
  timerValue: HTMLElement;
  timerLabel: HTMLElement;
  allyScore: HTMLElement;
  enemyScore: HTMLElement;
  scoreFill: HTMLElement;
  inkFill: HTMLElement;
  inkValue: HTMLElement;
  stateChip: HTMLElement;
  leftZone: HTMLElement;
  leftKnob: HTMLElement;
  rightZone: HTMLElement;
  rightKnob: HTMLElement;
  squidButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
}

interface ActorVisual {
  group: Group;
  body: Mesh;
  head: Mesh;
  marker: Mesh;
  shadow: Mesh;
}

export class InkGame {
  private readonly refs: HudRefs;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(56, 1, 0.1, 100);
  private readonly paintCanvas = document.createElement("canvas");
  private readonly paintTexture: Texture;
  private readonly paintField = new PaintField(128, 96, STAGE_WIDTH, STAGE_HEIGHT);
  private readonly actors: ActorState[] = [];
  private readonly actorVisuals = new Map<string, ActorVisual>();
  private readonly input: InputManager;
  private readonly audio = new AudioBus();
  private readonly up = new Vector3(0, 1, 0);
  private readonly cameraTarget = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly pointerHint = new Vector3();
  private mode: GameMode = "title";
  private matchTimer = MATCH_SECONDS;
  private countdown = COUNTDOWN_SECONDS;
  private accumulator = 0;
  private lastFrame = performance.now();
  private animationHandle = 0;
  private manualModeUntil = 0;
  private muted = false;

  constructor(refs: HudRefs) {
    this.refs = refs;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";
    this.refs.sceneWrap.appendChild(this.renderer.domElement);

    this.paintTexture = new CanvasTexture(this.paintCanvas);
    this.paintTexture.colorSpace = SRGBColorSpace;
    this.paintTexture.minFilter = NearestFilter;
    this.paintTexture.magFilter = NearestFilter;

    this.buildScene();
    this.seedActors();

    this.input = new InputManager(this.renderer.domElement, {
      left: { zone: this.refs.leftZone, knob: this.refs.leftKnob },
      right: { zone: this.refs.rightZone, knob: this.refs.rightKnob },
      squidButton: this.refs.squidButton,
      pauseButton: this.refs.pauseButton,
    });

    this.bindUi();
    this.resetRound(false);
    this.resize();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("pointerdown", this.unlockAudio, { passive: true });
    this.exposeAutomationHooks();
    this.loop = this.loop.bind(this);
    this.animationHandle = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationHandle);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointerdown", this.unlockAudio);
  }

  private readonly handleResize = () => {
    this.resize();
  };

  private readonly unlockAudio = () => {
    this.audio.unlock();
  };

  private buildScene(): void {
    this.scene.background = new Color("#081116");

    const floor = new Mesh(
      new PlaneGeometry(STAGE_WIDTH, STAGE_HEIGHT),
      new MeshBasicMaterial({
        map: this.paintTexture,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    this.scene.add(floor);

    const underlay = new Mesh(
      new PlaneGeometry(STAGE_WIDTH + 4, STAGE_HEIGHT + 4),
      new MeshBasicMaterial({ color: "#0b141b" }),
    );
    underlay.rotation.x = -Math.PI / 2;
    underlay.position.y = -0.02;
    this.scene.add(underlay);

    const railMaterial = new MeshBasicMaterial({ color: "#162027" });
    const rails = [
      { x: 0, z: -STAGE_HEIGHT * 0.5 - 0.35, w: STAGE_WIDTH + 1.2, d: 0.55 },
      { x: 0, z: STAGE_HEIGHT * 0.5 + 0.35, w: STAGE_WIDTH + 1.2, d: 0.55 },
      { x: -STAGE_WIDTH * 0.5 - 0.35, z: 0, w: 0.55, d: STAGE_HEIGHT + 1.2 },
      { x: STAGE_WIDTH * 0.5 + 0.35, z: 0, w: 0.55, d: STAGE_HEIGHT + 1.2 },
    ];
    for (const rail of rails) {
      const mesh = new Mesh(new BoxGeometry(rail.w, 1.1, rail.d), railMaterial);
      mesh.position.set(rail.x, 0.5, rail.z);
      this.scene.add(mesh);
    }

    for (const obstacle of obstacles) {
      const mesh = new Mesh(
        new BoxGeometry(obstacle.half.x * 2, obstacle.height, obstacle.half.y * 2),
        new MeshBasicMaterial({ color: obstacle.color }),
      );
      mesh.position.set(obstacle.pos.x, obstacle.height * 0.5, obstacle.pos.y);
      this.scene.add(mesh);
    }

    for (const [teamKey, spawns] of Object.entries(teamSpawns)) {
      const color = Number(teamKey) === 0 ? ALLY : ENEMY;
      for (const spawn of spawns) {
        const pad = new Mesh(
          new CylinderGeometry(1.1, 1.1, 0.18, 24),
          new MeshBasicMaterial({ color }),
        );
        pad.position.set(spawn.x, 0.09, spawn.y);
        this.scene.add(pad);
      }
    }
  }

  private seedActors(): void {
    const createActor = (id: string, team: TeamId, isPlayer: boolean, spawnSlot: number): ActorState => ({
      id,
      team,
      isPlayer,
      spawnSlot,
      pos: vec(),
      vel: vec(),
      aim: { x: team === 0 ? 1 : -1, y: 0 },
      angle: team === 0 ? 0 : Math.PI,
      ink: MAX_INK,
      hp: MAX_HP,
      alive: true,
      squid: false,
      respawnTimer: 0,
      invulnTimer: 0,
      shootCooldown: 0,
      behavior: "paint",
      targetNode: 0,
      thinkTimer: 0,
      meshJitter: Math.random() * Math.PI * 2,
    });

    this.actors.push(createActor("player", 0, true, 0));
    this.actors.push(createActor("ally-1", 0, false, 1));
    this.actors.push(createActor("ally-2", 0, false, 2));
    this.actors.push(createActor("enemy-1", 1, false, 0));
    this.actors.push(createActor("enemy-2", 1, false, 1));
    this.actors.push(createActor("enemy-3", 1, false, 2));

    for (const actor of this.actors) {
      const visual = this.createActorVisual(actor);
      this.actorVisuals.set(actor.id, visual);
      this.scene.add(visual.group);
    }
  }

  private createActorVisual(actor: ActorState): ActorVisual {
    const group = new Group();
    const color = actor.team === 0 ? ALLY : ENEMY;
    const body = new Mesh(
      new CylinderGeometry(0.46, 0.52, 1.1, 14),
      new MeshBasicMaterial({ color }),
    );
    body.position.y = 0.72;
    const head = new Mesh(
      new SphereGeometry(0.34, 16, 16),
      new MeshBasicMaterial({ color: "#eefcf7" }),
    );
    head.position.y = 1.38;
    const marker = new Mesh(
      new CylinderGeometry(actor.isPlayer ? 0.18 : 0.1, actor.isPlayer ? 0.18 : 0.1, 0.1, 18),
      new MeshBasicMaterial({ color }),
    );
    marker.position.y = 1.9;
    const shadow = new Mesh(
      new CircleGeometry(0.62, 20),
      new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.24 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow, body, head, marker);
    return { group, body, head, marker, shadow };
  }

  private bindUi(): void {
    this.refs.shell.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      const action = target?.dataset.action;
      if (!action) {
        return;
      }
      if (action === "start" || action === "restart") {
        this.audio.unlock();
        this.audio.playUi(660);
        this.resetRound(true);
      } else if (action === "resume") {
        this.mode = "playing";
        this.input.setEnabled(true);
      } else if (action === "toggle-audio") {
        this.muted = !this.muted;
        this.audio.setEnabled(!this.muted);
        this.renderCenterCard();
      }
    });
  }

  private resetRound(startCountdown: boolean): void {
    this.paintField.clear();
    for (const actor of this.actors) {
      this.restoreActor(actor, true);
      if (!actor.isPlayer) {
        this.chooseBotGoal(actor);
      }
    }

    for (const spawn of teamSpawns[0]) {
      this.paintField.stampWorld(spawn, 2.4, 0);
    }
    for (const spawn of teamSpawns[1]) {
      this.paintField.stampWorld(spawn, 2.4, 1);
    }

    this.matchTimer = MATCH_SECONDS;
    this.countdown = COUNTDOWN_SECONDS;
    this.mode = startCountdown ? "countdown" : "title";
    this.input.setEnabled(false);
    this.updatePaintTexture();
    this.renderCenterCard();
    this.renderHud();
  }

  private restoreActor(actor: ActorState, initial = false): void {
    const spawn = teamSpawns[actor.team][actor.spawnSlot];
    actor.pos = { x: spawn.x, y: spawn.y };
    actor.vel = vec();
    actor.aim = { x: actor.team === 0 ? 1 : -1, y: 0 };
    actor.angle = actor.team === 0 ? 0 : Math.PI;
    actor.ink = MAX_INK;
    actor.hp = MAX_HP;
    actor.alive = true;
    actor.squid = false;
    actor.respawnTimer = 0;
    actor.invulnTimer = initial ? 0 : 1.2;
    actor.shootCooldown = 0;
    actor.behavior = actor.team === 0 ? "paint" : "contest";
    actor.targetNode = actor.team === 0 ? 1 : 7;
    actor.thinkTimer = MathUtils.randFloat(0.1, 0.4);
  }

  private loop(now: number): void {
    this.animationHandle = requestAnimationFrame(this.loop);
    const dt = clamp((now - this.lastFrame) / 1000, 0, 0.05);
    this.lastFrame = now;

    if (now > this.manualModeUntil) {
      this.accumulator += dt;
      while (this.accumulator >= FIXED_DT) {
        this.step(FIXED_DT);
        this.accumulator -= FIXED_DT;
      }
    }

    this.renderFrame(now / 1000);
  }

  private step(dt: number): void {
    if (this.input.consumePauseToggle()) {
      if (this.mode === "playing") {
        this.mode = "paused";
        this.input.setEnabled(false);
      } else if (this.mode === "paused") {
        this.mode = "playing";
        this.input.setEnabled(true);
      }
      this.renderCenterCard();
    }

    if (this.mode === "title" || this.mode === "results" || this.mode === "paused") {
      return;
    }

    if (this.mode === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.mode = "playing";
        this.input.setEnabled(true);
        this.audio.playUi(760);
        this.renderCenterCard();
      } else {
        this.renderCenterCard();
      }
      this.renderHud();
      return;
    }

    this.matchTimer = Math.max(0, this.matchTimer - dt);
    this.updatePlayer(this.actors[0], dt);
    for (const actor of this.actors.slice(1)) {
      this.updateBot(actor, dt);
    }
    this.updatePaintTexture();
    this.renderHud();

    if (this.matchTimer <= 0) {
      this.mode = "results";
      this.input.setEnabled(false);
      this.audio.playUi(500);
      this.renderCenterCard();
    }
  }

  private updatePlayer(actor: ActorState, dt: number): void {
    if (!actor.alive) {
      this.updateRespawn(actor, dt);
      return;
    }

    const input = this.input.getFrameInput();
    const move = normalize(input.move);
    const aim = length(input.aim) > 0.08 ? normalize(input.aim) : actor.aim;
    const desiredAngle = this.applyAimAssist(actor, vectorToAngle(aim));
    actor.angle = rotateToward(actor.angle, desiredAngle, dt * 8.2);
    actor.aim = angleToVector(actor.angle);

    this.updateVitals(actor, dt);
    actor.squid = input.squid && actor.ink > 0.08;

    const terrainOwner = this.paintField.sampleWorld(actor.pos.x, actor.pos.y);
    let speed = actor.squid ? 8.2 : 5.1;
    if (terrainOwner === actor.team && actor.squid) {
      speed *= 1.14;
      actor.ink = Math.min(MAX_INK, actor.ink + dt * 0.5);
    } else if (terrainOwner !== -1 && terrainOwner !== actor.team) {
      speed *= actor.squid ? 0.58 : 0.74;
    }

    const next = resolveArenaMovement(
      {
        x: actor.pos.x + move.x * speed * dt,
        y: actor.pos.y + move.y * speed * dt,
      },
      ACTOR_RADIUS,
    );
    actor.vel = sub(next, actor.pos);
    actor.pos = next;

    if (!actor.squid && length(move) > 0.2) {
      this.paintField.stampWorld(actor.pos, 0.16, actor.team);
    }

    if (!actor.squid && input.shoot) {
      this.tryFire(actor);
    }

    this.input.setSquidVisual(actor.squid);
  }

  private updateBot(actor: ActorState, dt: number): void {
    if (!actor.alive) {
      actor.behavior = "respawn";
      this.updateRespawn(actor, dt);
      return;
    }

    this.updateVitals(actor, dt);
    actor.thinkTimer -= dt;
    if (actor.thinkTimer <= 0) {
      this.chooseBotGoal(actor);
      actor.thinkTimer = MathUtils.randFloat(0.2, 0.45);
    }

    const nearbyEnemy = this.findVisibleEnemy(actor, 9.2, 0.8);
    const targetPos = nearbyEnemy && actor.behavior === "chase" ? nearbyEnemy.pos : stageNodes[actor.targetNode].pos;
    const desiredMove = normalize(sub(targetPos, actor.pos));
    const terrainOwner = this.paintField.sampleWorld(actor.pos.x, actor.pos.y);
    const targetDistance = distance(actor.pos, targetPos);

    const shouldSwim =
      actor.behavior === "retreat" ||
      (targetDistance > 3.2 && terrainOwner === actor.team && !nearbyEnemy && actor.ink < 0.96);

    actor.squid = shouldSwim && actor.ink > 0.05;

    let speed = actor.squid ? 7.6 : 4.6;
    if (terrainOwner === actor.team && actor.squid) {
      actor.ink = Math.min(MAX_INK, actor.ink + dt * 0.44);
      speed *= 1.12;
    } else if (terrainOwner !== -1 && terrainOwner !== actor.team) {
      speed *= actor.squid ? 0.6 : 0.77;
    }

    const aimDir = nearbyEnemy ? normalize(sub(nearbyEnemy.pos, actor.pos)) : desiredMove;
    if (length(aimDir) > 0.08) {
      actor.angle = rotateToward(actor.angle, vectorToAngle(aimDir), dt * 7);
      actor.aim = angleToVector(actor.angle);
    }

    const next = resolveArenaMovement(
      {
        x: actor.pos.x + desiredMove.x * speed * dt,
        y: actor.pos.y + desiredMove.y * speed * dt,
      },
      ACTOR_RADIUS,
    );
    actor.vel = sub(next, actor.pos);
    actor.pos = next;

    if (!actor.squid && length(desiredMove) > 0.12) {
      this.paintField.stampWorld(actor.pos, 0.16, actor.team);
    }

    if (!actor.squid) {
      if (nearbyEnemy && actor.ink > 0.1) {
        this.tryFire(actor);
      } else if (actor.ink > 0.18 && actor.shootCooldown <= 0 && Math.random() < 0.05) {
        const ahead = {
          x: actor.pos.x + actor.aim.x * 2.5,
          y: actor.pos.y + actor.aim.y * 2.5,
        };
        if (this.paintField.sampleWorld(ahead.x, ahead.y) !== actor.team) {
          this.tryFire(actor);
        }
      }
    }
  }

  private updateVitals(actor: ActorState, dt: number): void {
    actor.shootCooldown = Math.max(0, actor.shootCooldown - dt);
    actor.invulnTimer = Math.max(0, actor.invulnTimer - dt);
    if (actor.shootCooldown <= 0.02 && !actor.squid) {
      const regenRate = this.paintField.sampleWorld(actor.pos.x, actor.pos.y) === actor.team ? 0.16 : 0.1;
      actor.ink = Math.min(MAX_INK, actor.ink + regenRate * dt);
    }
  }

  private updateRespawn(actor: ActorState, dt: number): void {
    actor.respawnTimer -= dt;
    if (actor.respawnTimer > 0) {
      return;
    }
    this.restoreActor(actor);
  }

  private chooseBotGoal(actor: ActorState): void {
    const visibleEnemy = this.findVisibleEnemy(actor, 7.2, 0.84);
    if (actor.hp <= 1 || actor.ink < 0.16) {
      actor.behavior = "retreat";
      actor.targetNode = actor.team === 0 ? 1 : 7;
      return;
    }
    if (visibleEnemy) {
      actor.behavior = "chase";
      actor.targetNode = this.closestNodeIndex(visibleEnemy.pos);
      return;
    }

    const reachableNodeIndices = reachableStageNodeIndices(actor.pos);
    if (reachableNodeIndices.length === 0) {
      actor.behavior = "paint";
      actor.targetNode = actor.team === 0 ? 2 : 6;
      return;
    }

    let bestNode = actor.team === 0 ? 2 : 6;
    let bestScore = -Infinity;
    for (const index of reachableNodeIndices) {
      const node = stageNodes[index];
      const paintScore = -this.paintField.scoreAround(node.pos, 2.4, actor.team);
      const score = scoreBotNodeCandidate({
        actorPos: actor.pos,
        candidateIndex: index,
        reachableNodeCount: reachableNodeIndices.length,
        team: actor.team,
        node,
        paintScore,
      });
      if (score > bestScore) {
        bestScore = score;
        bestNode = index;
      }
    }

    actor.targetNode = bestNode;
    actor.behavior = bestNode >= 3 && bestNode <= 5 ? "contest" : "paint";
  }

  private closestNodeIndex(position: Vec2): number {
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < stageNodes.length; index += 1) {
      const candidate = distance(position, stageNodes[index].pos);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        best = index;
      }
    }
    return best;
  }

  private tryFire(actor: ActorState): void {
    if (actor.shootCooldown > 0 || actor.ink < 0.055) {
      return;
    }

    actor.shootCooldown = 0.12;
    actor.ink = Math.max(0, actor.ink - 0.055);
    const direction = actor.aim;
    const range = traceLineDistance(actor.pos, direction, 8.8);
    const steps = Math.max(3, Math.floor(range / 1.7));
    for (let step = 1; step <= steps; step += 1) {
      const travel = Math.min(range, step * 1.7);
      const lateral = (Math.random() - 0.5) * 0.4;
      const point = {
        x: actor.pos.x + direction.x * travel - direction.y * lateral,
        y: actor.pos.y + direction.y * travel + direction.x * lateral,
      };
      if (isBlocked(point, 0.2)) {
        break;
      }
      this.paintField.stampWorld(point, 0.72 - step * 0.06, actor.team);
    }
    this.paintField.stampWorld(actor.pos, 0.26, actor.team);

    const target = this.findVisibleEnemy(actor, range + 0.4, 0.9);
    if (target && target.invulnTimer <= 0) {
      target.hp -= 1;
      target.invulnTimer = 0.18;
      if (target.hp <= 0) {
        target.alive = false;
        target.squid = false;
        target.respawnTimer = 3;
        target.hp = 0;
        this.paintField.stampWorld(target.pos, 1.35, actor.team);
        this.audio.playSplat(actor.team);
      } else {
        this.audio.playHit(actor.team);
      }
    } else {
      this.audio.playShot(actor.team);
    }
  }

  private findVisibleEnemy(actor: ActorState, maxRange: number, coneThreshold: number): ActorState | null {
    let best: ActorState | null = null;
    let bestScore = -Infinity;
    for (const candidate of this.actors) {
      if (candidate.team === actor.team || !candidate.alive) {
        continue;
      }
      const offset = sub(candidate.pos, actor.pos);
      const dist = length(offset);
      if (dist > maxRange || dist < 0.001) {
        continue;
      }
      const dir = normalize(offset);
      const facing = dot(dir, actor.aim);
      if (facing < coneThreshold) {
        continue;
      }
      const clearDistance = traceLineDistance(actor.pos, dir, dist + 0.1);
      if (clearDistance + 0.05 < dist) {
        continue;
      }
      const score = facing * 10 - dist;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best;
  }

  private applyAimAssist(actor: ActorState, desiredAngle: number): number {
    const desired = angleToVector(desiredAngle);
    let bestAngle = desiredAngle;
    let bestDot = 0.92;
    for (const candidate of this.actors) {
      if (candidate.team === actor.team || !candidate.alive) {
        continue;
      }
      const offset = sub(candidate.pos, actor.pos);
      const dist = length(offset);
      if (dist > 9.5) {
        continue;
      }
      const dir = normalize(offset);
      const alignment = dot(desired, dir);
      if (alignment > bestDot) {
        const clearDistance = traceLineDistance(actor.pos, dir, dist + 0.1);
        if (clearDistance + 0.08 >= dist) {
          bestDot = alignment;
          bestAngle = vectorToAngle(dir);
        }
      }
    }
    return MathUtils.lerp(desiredAngle, bestAngle, 0.22);
  }

  private updatePaintTexture(): void {
    this.paintField.drawToCanvas(this.paintCanvas);
    this.paintTexture.needsUpdate = true;
  }

  private renderHud(): void {
    const coverage = this.paintField.getCoveragePercentages();
    this.refs.timerValue.textContent = this.formatTime(this.mode === "countdown" ? this.countdown : this.matchTimer);
    this.refs.timerLabel.textContent = this.mode === "countdown" ? "Deploying" : "Time";
    this.refs.allyScore.textContent = `${coverage.ally.toFixed(1)}%`;
    this.refs.enemyScore.textContent = `${coverage.enemy.toFixed(1)}%`;
    this.refs.scoreFill.style.width = `${coverage.ally}%`;

    const player = this.actors[0];
    this.refs.inkFill.style.width = `${player.ink * 100}%`;
    this.refs.inkValue.textContent = player.alive ? `${Math.round(player.ink * 100)}%` : "RESPAWN";
    this.refs.stateChip.textContent = player.alive ? (player.squid ? "Squid Form" : "Human Form") : "Respawning";
    this.refs.stateChip.classList.toggle("squid", player.squid);
    this.refs.pauseButton.style.display = this.mode === "playing" || this.mode === "paused" ? "" : "none";
  }

  private renderCenterCard(): void {
    if (this.mode === "playing") {
      this.refs.centerNote.classList.add("overlay-hidden");
      return;
    }
    this.refs.centerNote.classList.remove("overlay-hidden");

    const coverage = this.paintField.getCoveragePercentages();
    if (this.mode === "title") {
      this.refs.centerNote.innerHTML = `
        <div class="brand">
          <div class="brand-mark">INKLINE</div>
          <div class="brand-sub">offline arena</div>
        </div>
        <div class="headline">Paint the arena.<br />Out-swim the bots.</div>
        <p class="intro-copy">
          3-minute turf battle prototype. Works on mobile landscape and desktop with no runtime network dependency.
        </p>
        <div class="controls-grid">
          <div class="control-tile"><strong>Move</strong><span>Left stick / WASD</span></div>
          <div class="control-tile"><strong>Aim + Fire</strong><span>Right stick / Mouse hold</span></div>
          <div class="control-tile"><strong>Squid Form</strong><span>Hold SQUID / Shift</span></div>
        </div>
        <div class="launch-row">
          <button class="action-btn" data-action="start">Launch Match</button>
          <button class="quiet-btn" data-action="toggle-audio">${this.muted ? "Unmute SFX" : "Mute SFX"}</button>
        </div>
      `;
      return;
    }

    if (this.mode === "countdown") {
      const remaining = Math.max(1, Math.ceil(this.countdown));
      this.refs.centerNote.innerHTML = `
        <h2 class="headline">${remaining}</h2>
        <p class="result-copy">Secure the center, repaint enemy lanes, and hold your color until the buzzer.</p>
      `;
      return;
    }

    if (this.mode === "paused") {
      this.refs.centerNote.innerHTML = `
        <h2 class="headline">Paused</h2>
        <p class="result-copy">The match clock is frozen. Resume when you are ready.</p>
        <div class="launch-row">
          <button class="action-btn" data-action="resume">Resume Match</button>
          <button class="quiet-btn" data-action="toggle-audio">${this.muted ? "Unmute SFX" : "Mute SFX"}</button>
        </div>
      `;
      return;
    }

    const winner = coverage.ally >= coverage.enemy ? "Alliance wins" : "Rivals win";
    this.refs.centerNote.innerHTML = `
      <div class="brand">
        <div class="brand-mark">${winner}</div>
      </div>
      <h2 class="headline">${coverage.ally.toFixed(1)}% vs ${coverage.enemy.toFixed(1)}%</h2>
      <p class="result-copy">The result is based entirely on painted ground ownership when the 180 second timer ends.</p>
      <div class="launch-row">
        <button class="action-btn" data-action="restart">Play Again</button>
        <button class="quiet-btn" data-action="toggle-audio">${this.muted ? "Unmute SFX" : "Mute SFX"}</button>
      </div>
    `;
  }

  private renderFrame(time: number): void {
    const player = this.actors[0];
    const focus = this.mode === "title" ? { x: 0, y: 0 } : player.pos;
    this.cameraTarget.set(focus.x, 0.75, focus.y + (this.mode === "playing" ? 1.6 : 0));
    this.pointerHint.set(focus.x - 1.5, 18, focus.y + 13.5);
    this.cameraPosition.lerp(this.pointerHint, 0.12);
    this.camera.position.copy(this.cameraPosition);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.cameraTarget.lengthSq() > 0 ? this.cameraTarget : ARENA_CENTER);

    for (const actor of this.actors) {
      const visual = this.actorVisuals.get(actor.id);
      if (!visual) {
        continue;
      }
      visual.group.visible = actor.alive || actor.respawnTimer > 0;
      visual.group.position.set(actor.pos.x, 0, actor.pos.y);
      visual.group.rotation.y = -actor.angle + Math.PI * 0.5;
      const bob = actor.alive ? Math.sin(time * 7 + actor.meshJitter) * 0.04 : 0;
      visual.group.position.y = bob;
      const targetScale = actor.squid ? 0.72 : 1;
      visual.group.scale.lerp(new Vector3(1.05, targetScale, 1.05), 0.2);
      visual.head.visible = !actor.squid;
      visual.marker.visible = actor.alive;
      (visual.shadow.material as MeshBasicMaterial).opacity = actor.alive ? 0.24 : 0.1;

      const bodyMaterial = visual.body.material as MeshBasicMaterial;
      const teamColor = actor.team === 0 ? ALLY : ENEMY;
      bodyMaterial.color.lerpColors(teamColor, INVULN_TINT, actor.invulnTimer > 0 ? 0.45 : 0);
      visual.body.material = bodyMaterial;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private formatTime(seconds: number): string {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  }

  private resize(): void {
    const width = this.refs.sceneWrap.clientWidth;
    const height = this.refs.sceneWrap.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private exposeAutomationHooks(): void {
    const renderState = (): MatchSnapshot => {
      const coverage = this.paintField.getCoveragePercentages();
      return {
        mode: this.mode,
        timer: Number(this.matchTimer.toFixed(2)),
        allyCoverage: Number(coverage.ally.toFixed(2)),
        enemyCoverage: Number(coverage.enemy.toFixed(2)),
        player: {
          x: Number(this.actors[0].pos.x.toFixed(2)),
          y: Number(this.actors[0].pos.y.toFixed(2)),
          ink: Number(this.actors[0].ink.toFixed(2)),
          hp: this.actors[0].hp,
          alive: this.actors[0].alive,
          squid: this.actors[0].squid,
        },
        bots: this.actors.slice(1).map((actor) => ({
          id: actor.id,
          team: actor.team,
          x: Number(actor.pos.x.toFixed(2)),
          y: Number(actor.pos.y.toFixed(2)),
          alive: actor.alive,
          behavior: actor.behavior,
        })),
      };
    };

    window.render_game_to_text = () =>
      JSON.stringify(
        {
          coordinateSystem: "origin=center, x=left-to-right, y=top-to-bottom on arena plane",
          coordinateNote: "negative y is upper side of the arena, positive y is lower side",
          ...renderState(),
        },
        null,
        2,
      );

    window.advanceTime = (ms: number) => {
      this.manualModeUntil = performance.now() + 300;
      const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
      for (let index = 0; index < steps; index += 1) {
        this.step(FIXED_DT);
      }
      this.renderFrame(performance.now() / 1000);
    };
  }
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}
