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
import { createActorState, restoreActorState } from "./actors";
import { scoreBotNodeCandidate } from "./botGoal";
import {
  DEFAULT_LOADOUT_ID,
  DEFAULT_RULE_ID,
  DEFAULT_STAGE_ID,
  getLoadoutDefinition,
  getMatchRuleDefinition,
  getStageDefinition,
  getWeaponDefinition,
} from "./definitions";
import { angleToVector, clamp, distance, dot, length, normalize, rotateToward, sub, vectorToAngle } from "./math";
import { InputManager } from "./input";
import { PaintField } from "./paintField";
import {
  ACTOR_RADIUS,
  isBlocked,
  reachableStageNodeIndices,
  resolveArenaMovement,
  traceLineDistance,
} from "./stage";
import type { ActorState, GameMode, MatchSnapshot, Vec2 } from "./types";

const FIXED_DT = 1 / 60;
const COUNTDOWN_SECONDS = 3;
const MAX_INK = 1;
const ALLY = new Color("#1fe4a8");
const ENEMY = new Color("#ff5c8a");
const INVULN_TINT = new Color("#f8fff7");
const ARENA_CENTER = new Vector3(0, 0, 0);
const GAMEPLAY_CAMERA_HEIGHT = 4.4;
const GAMEPLAY_CAMERA_DISTANCE = 5.6;
const GAMEPLAY_CAMERA_SHOULDER = 1.05;
const GAMEPLAY_CAMERA_LOOK_AHEAD = 4.2;
const GAMEPLAY_CAMERA_TARGET_HEIGHT = 1.65;
const GAMEPLAY_CAMERA_LERP = 0.18;
const OVERVIEW_CAMERA_LERP = 0.12;

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

interface CameraBasis {
  forward: Vec2;
  right: Vec2;
}

interface InkGameOptions {
  muted?: boolean;
}

export class InkGame {
  private readonly refs: HudRefs;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(56, 1, 0.1, 100);
  private readonly paintCanvas = document.createElement("canvas");
  private readonly paintTexture: Texture;
  private readonly stageDefinition = getStageDefinition(DEFAULT_STAGE_ID);
  private readonly matchRuleDefinition = getMatchRuleDefinition(DEFAULT_RULE_ID);
  private readonly paintField = new PaintField(
    this.stageDefinition.paintFieldLayout.width,
    this.stageDefinition.paintFieldLayout.height,
    this.stageDefinition.width,
    this.stageDefinition.height,
  );
  private readonly actors: ActorState[] = [];
  private readonly actorVisuals = new Map<string, ActorVisual>();
  private readonly input: InputManager;
  private readonly audio = new AudioBus();
  private readonly up = new Vector3(0, 1, 0);
  private readonly cameraTarget = new Vector3();
  private readonly cameraPosition = new Vector3();
  private readonly cameraAnchor = new Vector3();
  private cameraMode: MatchSnapshot["camera"]["mode"] = "overview";
  private mode: GameMode = "title";
  private matchTimer = this.matchRuleDefinition.durationSeconds;
  private countdown = COUNTDOWN_SECONDS;
  private accumulator = 0;
  private lastFrame = performance.now();
  private animationHandle = 0;
  private manualModeUntil = 0;
  private muted = false;

  constructor(refs: HudRefs, options: InkGameOptions = {}) {
    this.refs = refs;
    this.muted = options.muted ?? false;
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

    this.audio.setEnabled(!this.muted);
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

  launchMatch(): void {
    this.audio.unlock();
    this.audio.playUi(660);
    this.resetRound(true);
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
      new PlaneGeometry(this.stageDefinition.width, this.stageDefinition.height),
      new MeshBasicMaterial({
        map: this.paintTexture,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = false;
    this.scene.add(floor);

    const underlay = new Mesh(
      new PlaneGeometry(this.stageDefinition.width + 4, this.stageDefinition.height + 4),
      new MeshBasicMaterial({ color: "#0b141b" }),
    );
    underlay.rotation.x = -Math.PI / 2;
    underlay.position.y = -0.02;
    this.scene.add(underlay);

    const railMaterial = new MeshBasicMaterial({ color: "#162027" });
    const rails = [
      { x: 0, z: -this.stageDefinition.height * 0.5 - 0.35, w: this.stageDefinition.width + 1.2, d: 0.55 },
      { x: 0, z: this.stageDefinition.height * 0.5 + 0.35, w: this.stageDefinition.width + 1.2, d: 0.55 },
      { x: -this.stageDefinition.width * 0.5 - 0.35, z: 0, w: 0.55, d: this.stageDefinition.height + 1.2 },
      { x: this.stageDefinition.width * 0.5 + 0.35, z: 0, w: 0.55, d: this.stageDefinition.height + 1.2 },
    ];
    for (const rail of rails) {
      const mesh = new Mesh(new BoxGeometry(rail.w, 1.1, rail.d), railMaterial);
      mesh.position.set(rail.x, 0.5, rail.z);
      this.scene.add(mesh);
    }

    for (const obstacle of this.stageDefinition.obstacles) {
      const mesh = new Mesh(
        new BoxGeometry(obstacle.half.x * 2, obstacle.height, obstacle.half.y * 2),
        new MeshBasicMaterial({ color: obstacle.color }),
      );
      mesh.position.set(obstacle.pos.x, obstacle.height * 0.5, obstacle.pos.y);
      this.scene.add(mesh);
    }

    for (const [teamKey, spawns] of Object.entries(this.stageDefinition.spawnPoints)) {
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
    this.actors.push(createActorState("player", 0, true, 0, DEFAULT_LOADOUT_ID));
    this.actors.push(createActorState("ally-1", 0, false, 1, DEFAULT_LOADOUT_ID));
    this.actors.push(createActorState("ally-2", 0, false, 2, DEFAULT_LOADOUT_ID));
    this.actors.push(createActorState("enemy-1", 1, false, 0, DEFAULT_LOADOUT_ID));
    this.actors.push(createActorState("enemy-2", 1, false, 1, DEFAULT_LOADOUT_ID));
    this.actors.push(createActorState("enemy-3", 1, false, 2, DEFAULT_LOADOUT_ID));

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
        this.launchMatch();
      } else if (action === "resume") {
        this.enterGameplayMode();
        this.renderCenterCard();
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
      restoreActorState(actor, this.stageDefinition, true);
      if (!actor.isPlayer) {
        this.chooseBotGoal(actor);
      }
    }

    for (const spawn of this.stageDefinition.spawnPoints[0]) {
      this.paintField.stampWorld(spawn, 2.4, 0);
    }
    for (const spawn of this.stageDefinition.spawnPoints[1]) {
      this.paintField.stampWorld(spawn, 2.4, 1);
    }

    this.matchTimer = this.matchRuleDefinition.durationSeconds;
    this.countdown = COUNTDOWN_SECONDS;
    this.mode = startCountdown ? "countdown" : "title";
    this.input.setEnabled(false);
    this.updatePaintTexture();
    this.renderCenterCard();
    this.renderHud();
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
        this.enterGameplayMode();
      }
      this.renderCenterCard();
    }

    if (this.mode === "title" || this.mode === "results" || this.mode === "paused") {
      return;
    }

    if (this.mode === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.enterGameplayMode();
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
    const move = normalize(this.projectInputOnCameraPlane(actor, input.move));
    const aimInput = this.projectInputOnCameraPlane(actor, input.aim);
    const aim = length(aimInput) > 0.08 ? normalize(aimInput) : actor.aim;
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
      this.stageDefinition,
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
    const targetPos =
      nearbyEnemy && actor.behavior === "chase"
        ? nearbyEnemy.pos
        : this.stageDefinition.navigationNodes[actor.targetNode].pos;
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
      this.stageDefinition,
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
    restoreActorState(actor, this.stageDefinition);
  }

  private chooseBotGoal(actor: ActorState): void {
    const visibleEnemy = this.findVisibleEnemy(actor, 7.2, 0.84);
    if (actor.hp <= 1 || actor.ink < 0.16) {
      actor.behavior = "retreat";
      actor.targetNode = this.stageDefinition.ruleAnchors.retreatNodeByTeam[actor.team];
      return;
    }
    if (visibleEnemy) {
      actor.behavior = "chase";
      actor.targetNode = this.closestNodeIndex(visibleEnemy.pos);
      return;
    }

    const reachableNodeIndices = reachableStageNodeIndices(this.stageDefinition, actor.pos);
    if (reachableNodeIndices.length === 0) {
      actor.behavior = "paint";
      actor.targetNode = this.stageDefinition.ruleAnchors.fallbackPaintNodeByTeam[actor.team];
      return;
    }

    let bestNode = this.stageDefinition.ruleAnchors.fallbackPaintNodeByTeam[actor.team];
    let bestScore = -Infinity;
    for (const index of reachableNodeIndices) {
      const node = this.stageDefinition.navigationNodes[index];
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
    const [contestStart, contestEnd] = this.stageDefinition.ruleAnchors.contestNodeRange;
    actor.behavior = bestNode >= contestStart && bestNode <= contestEnd ? "contest" : "paint";
  }

  private closestNodeIndex(position: Vec2): number {
    let best = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < this.stageDefinition.navigationNodes.length; index += 1) {
      const candidate = distance(position, this.stageDefinition.navigationNodes[index].pos);
      if (candidate < bestDistance) {
        bestDistance = candidate;
        best = index;
      }
    }
    return best;
  }

  private getActorWeapon(actor: ActorState) {
    const loadout = getLoadoutDefinition(actor.loadoutId);
    return getWeaponDefinition(loadout.mainWeaponId);
  }

  private enterGameplayMode(): void {
    this.mode = "playing";
    this.updateCameraPose(this.actors[0], true);
    this.camera.position.copy(this.cameraPosition);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.cameraTarget);
    this.input.setEnabled(true);
  }

  private getCameraBasis(actor: ActorState): CameraBasis {
    const forward = length(actor.aim) > 0.001 ? normalize(actor.aim) : angleToVector(actor.angle);
    return {
      forward,
      right: { x: -forward.y, y: forward.x },
    };
  }

  private getRenderedCameraBasis(actor: ActorState): CameraBasis {
    const forward = normalize({
      x: this.cameraTarget.x - this.camera.position.x,
      y: this.cameraTarget.z - this.camera.position.z,
    });
    if (length(forward) <= 0.001) {
      return this.getCameraBasis(actor);
    }
    return {
      forward,
      right: { x: -forward.y, y: forward.x },
    };
  }

  private projectInputOnCameraPlane(actor: ActorState, input: Vec2): Vec2 {
    const magnitude = length(input);
    if (magnitude <= 0.001) {
      return { x: 0, y: 0 };
    }
    const basis = this.getRenderedCameraBasis(actor);
    return {
      x: basis.right.x * input.x + basis.forward.x * -input.y,
      y: basis.right.y * input.x + basis.forward.y * -input.y,
    };
  }

  private updateCameraPose(player: ActorState, snap = false): void {
    if (this.mode === "playing") {
      const basis = this.getCameraBasis(player);
      this.cameraMode = "gameplay";
      this.cameraTarget.set(
        player.pos.x + basis.forward.x * GAMEPLAY_CAMERA_LOOK_AHEAD,
        GAMEPLAY_CAMERA_TARGET_HEIGHT,
        player.pos.y + basis.forward.y * GAMEPLAY_CAMERA_LOOK_AHEAD,
      );
      this.cameraAnchor.set(
        player.pos.x - basis.forward.x * GAMEPLAY_CAMERA_DISTANCE - basis.right.x * GAMEPLAY_CAMERA_SHOULDER,
        GAMEPLAY_CAMERA_HEIGHT,
        player.pos.y - basis.forward.y * GAMEPLAY_CAMERA_DISTANCE - basis.right.y * GAMEPLAY_CAMERA_SHOULDER,
      );
      if (snap) {
        this.cameraPosition.copy(this.cameraAnchor);
      } else {
        this.cameraPosition.lerp(this.cameraAnchor, GAMEPLAY_CAMERA_LERP);
      }
      return;
    }

    const focus = this.mode === "title" ? { x: 0, y: 0 } : player.pos;
    this.cameraMode = "overview";
    this.cameraTarget.set(focus.x, 0.75, focus.y);
    this.cameraAnchor.set(focus.x - 1.5, 18, focus.y + 13.5);
    if (snap) {
      this.cameraPosition.copy(this.cameraAnchor);
    } else {
      this.cameraPosition.lerp(this.cameraAnchor, OVERVIEW_CAMERA_LERP);
    }
  }

  private getPlayerHudState(player: ActorState): {
    inkFillWidth: string;
    inkLabel: string;
    stateLabel: string;
    loadoutName: string;
  } {
    const loadout = getLoadoutDefinition(player.loadoutId);
    return {
      inkFillWidth: `${player.ink * 100}%`,
      inkLabel: player.alive ? `${Math.round(player.ink * 100)}%` : "RESPAWN",
      stateLabel: player.alive ? (player.squid ? "Squid Form" : "Human Form") : "Respawning",
      loadoutName: loadout.displayName,
    };
  }

  private tryFire(actor: ActorState): void {
    const weapon = this.getActorWeapon(actor);
    if (actor.shootCooldown > 0 || actor.ink < weapon.inkCost) {
      return;
    }

    actor.shootCooldown = weapon.cooldownMs / 1000;
    actor.ink = Math.max(0, actor.ink - weapon.inkCost);
    const direction = actor.aim;
    const range = traceLineDistance(this.stageDefinition, actor.pos, direction, weapon.projectileProfile.maxRange);
    const steps = Math.max(weapon.projectileProfile.minSteps, Math.floor(range / weapon.projectileProfile.stepDistance));
    for (let step = 1; step <= steps; step += 1) {
      const travel = Math.min(range, step * weapon.projectileProfile.stepDistance);
      const lateral = (Math.random() - 0.5) * weapon.projectileProfile.lateralSpread;
      const point = {
        x: actor.pos.x + direction.x * travel - direction.y * lateral,
        y: actor.pos.y + direction.y * travel + direction.x * lateral,
      };
      if (isBlocked(this.stageDefinition, point, weapon.projectileProfile.obstacleInflate)) {
        break;
      }
      const radius = Math.max(0.18, weapon.projectileProfile.trailPaintRadius - step * weapon.projectileProfile.trailPaintFalloff);
      this.paintField.stampWorld(point, radius, actor.team);
    }
    this.paintField.stampWorld(actor.pos, weapon.projectileProfile.selfPaintRadius, actor.team);

    const target = this.findVisibleEnemy(actor, range + 0.4, 0.9);
    if (target && target.invulnTimer <= 0) {
      target.hp -= weapon.damage;
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
      const clearDistance = traceLineDistance(this.stageDefinition, actor.pos, dir, dist + 0.1);
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
        const clearDistance = traceLineDistance(this.stageDefinition, actor.pos, dir, dist + 0.1);
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
    const hudState = this.getPlayerHudState(player);
    this.refs.inkFill.style.width = hudState.inkFillWidth;
    this.refs.inkValue.textContent = hudState.inkLabel;
    this.refs.stateChip.textContent = hudState.stateLabel;
    this.refs.stateChip.title = hudState.loadoutName;
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
      <p class="result-copy">The result is based entirely on painted ground ownership when the ${this.matchRuleDefinition.durationSeconds} second timer ends.</p>
      <div class="launch-row">
        <button class="action-btn" data-action="restart">Play Again</button>
        <button class="quiet-btn" data-action="toggle-audio">${this.muted ? "Unmute SFX" : "Mute SFX"}</button>
      </div>
    `;
  }

  private renderFrame(time: number): void {
    const player = this.actors[0];
    this.updateCameraPose(player);
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
        camera: {
          mode: this.cameraMode,
          position: {
            x: Number(this.camera.position.x.toFixed(2)),
            y: Number(this.camera.position.y.toFixed(2)),
            z: Number(this.camera.position.z.toFixed(2)),
          },
          target: {
            x: Number(this.cameraTarget.x.toFixed(2)),
            y: Number(this.cameraTarget.y.toFixed(2)),
            z: Number(this.cameraTarget.z.toFixed(2)),
          },
        },
        player: {
          x: Number(this.actors[0].pos.x.toFixed(2)),
          y: Number(this.actors[0].pos.y.toFixed(2)),
          ink: Number(this.actors[0].ink.toFixed(2)),
          hp: this.actors[0].hp,
          alive: this.actors[0].alive,
          squid: this.actors[0].squid,
          facing: Number(this.actors[0].angle.toFixed(2)),
          aim: {
            x: Number(this.actors[0].aim.x.toFixed(2)),
            y: Number(this.actors[0].aim.y.toFixed(2)),
          },
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
