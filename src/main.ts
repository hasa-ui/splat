import "./style.css";
import type { InkGame } from "./game/game";

function createShell(root: HTMLElement): void {
  root.innerHTML = `
    <div class="shell">
      <div class="scene-wrap" id="scene-wrap"></div>
      <div class="mesh-overlay"></div>
      <div class="vignette"></div>
      <div class="hud">
        <div class="topbar">
          <div class="badge-stack">
            <div>
              <div class="timer-label" id="timer-label">Time</div>
              <div class="timer-value" id="timer-value">3:00</div>
            </div>
          </div>
          <div class="score-card">
            <div class="score-label">Turf control</div>
            <div class="score-row">
              <div class="score-value ally" id="ally-score">50.0%</div>
              <div class="score-bar"><div class="score-fill" id="score-fill"></div></div>
              <div class="score-value enemy" id="enemy-score">50.0%</div>
            </div>
          </div>
        </div>
        <div class="center-note" id="center-note"></div>
        <div class="footer-panels">
          <div class="meter-wrap">
            <div class="meter-label">Ink reserve</div>
            <div class="meter-bar"><div class="meter-fill" id="ink-fill"></div></div>
            <div class="meter-meta">
              <span id="ink-value">100%</span>
              <span>Swim on your color to refill</span>
            </div>
          </div>
          <div class="status-chip" id="state-chip">Human Form</div>
        </div>
      </div>
      <div class="controls-layer">
        <div class="stick-zone left" id="left-zone"><div class="stick-knob" id="left-knob"></div></div>
        <div class="stick-zone right" id="right-zone"><div class="stick-knob" id="right-knob"></div></div>
        <button class="squid-button" id="squid-button">SQUID</button>
        <button class="pause-button" id="pause-button" style="display: none">Pause</button>
        <div class="rotate-note">
          <div>
            <strong>Rotate Device</strong>
            <span>Landscape mode gives space for both virtual sticks.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function collectGameRefs(root: HTMLElement) {
  return {
    shell: root.querySelector<HTMLElement>(".shell")!,
    sceneWrap: root.querySelector<HTMLElement>("#scene-wrap")!,
    centerNote: root.querySelector<HTMLElement>("#center-note")!,
    timerValue: root.querySelector<HTMLElement>("#timer-value")!,
    timerLabel: root.querySelector<HTMLElement>("#timer-label")!,
    allyScore: root.querySelector<HTMLElement>("#ally-score")!,
    enemyScore: root.querySelector<HTMLElement>("#enemy-score")!,
    scoreFill: root.querySelector<HTMLElement>("#score-fill")!,
    inkFill: root.querySelector<HTMLElement>("#ink-fill")!,
    inkValue: root.querySelector<HTMLElement>("#ink-value")!,
    stateChip: root.querySelector<HTMLElement>("#state-chip")!,
    leftZone: root.querySelector<HTMLElement>("#left-zone")!,
    leftKnob: root.querySelector<HTMLElement>("#left-knob")!,
    rightZone: root.querySelector<HTMLElement>("#right-zone")!,
    rightKnob: root.querySelector<HTMLElement>("#right-knob")!,
    squidButton: root.querySelector<HTMLButtonElement>("#squid-button")!,
    pauseButton: root.querySelector<HTMLButtonElement>("#pause-button")!,
  };
}

function renderBootstrapCard(centerNote: HTMLElement, muted: boolean, loading: boolean): void {
  centerNote.classList.remove("overlay-hidden");
  centerNote.innerHTML = `
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
      <button class="action-btn" data-action="start"${loading ? " disabled" : ""}>
        ${loading ? "Loading Arena..." : "Launch Match"}
      </button>
      <button class="quiet-btn" data-action="toggle-audio"${loading ? " disabled" : ""}>
        ${muted ? "Unmute SFX" : "Mute SFX"}
      </button>
    </div>
  `;
}

function renderBootError(centerNote: HTMLElement): void {
  centerNote.classList.remove("overlay-hidden");
  centerNote.innerHTML = `
    <h2 class="headline">WebGL Required</h2>
    <p class="result-copy">
      This build needs WebGL-enabled graphics. Try a current mobile or desktop browser with hardware acceleration turned on.
    </p>
  `;
}

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

createShell(app);
const refs = collectGameRefs(app);
let game: InkGame | null = null;
let muted = false;
let loadingGame = false;

renderBootstrapCard(refs.centerNote, muted, loadingGame);

async function loadGame(): Promise<InkGame | null> {
  if (game) {
    return game;
  }
  if (loadingGame) {
    return null;
  }

  loadingGame = true;
  renderBootstrapCard(refs.centerNote, muted, true);

  try {
    const { InkGame } = await import("./game/game");
    game = new InkGame(refs, { muted });
    window.addEventListener("beforeunload", () => {
      game?.dispose();
    });
    return game;
  } catch (error) {
    renderBootError(refs.centerNote);
    console.error(error);
    return null;
  } finally {
    loadingGame = false;
  }
}

refs.shell.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  const action = target?.dataset.action;
  if (!action || game) {
    return;
  }

  if (action === "toggle-audio") {
    muted = !muted;
    renderBootstrapCard(refs.centerNote, muted, loadingGame);
    return;
  }

  if (action === "start" || action === "restart") {
    void (async () => {
      const loadedGame = await loadGame();
      loadedGame?.launchMatch();
    })();
  }
});
