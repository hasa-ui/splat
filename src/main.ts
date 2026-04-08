import "./style.css";
import { InkGame } from "./game/game";

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
        <button class="pause-button" id="pause-button">Pause</button>
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

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

createShell(app);

try {
  const game = new InkGame({
    shell: app.querySelector<HTMLElement>(".shell")!,
    sceneWrap: app.querySelector<HTMLElement>("#scene-wrap")!,
    centerNote: app.querySelector<HTMLElement>("#center-note")!,
    timerValue: app.querySelector<HTMLElement>("#timer-value")!,
    timerLabel: app.querySelector<HTMLElement>("#timer-label")!,
    allyScore: app.querySelector<HTMLElement>("#ally-score")!,
    enemyScore: app.querySelector<HTMLElement>("#enemy-score")!,
    scoreFill: app.querySelector<HTMLElement>("#score-fill")!,
    inkFill: app.querySelector<HTMLElement>("#ink-fill")!,
    inkValue: app.querySelector<HTMLElement>("#ink-value")!,
    stateChip: app.querySelector<HTMLElement>("#state-chip")!,
    leftZone: app.querySelector<HTMLElement>("#left-zone")!,
    leftKnob: app.querySelector<HTMLElement>("#left-knob")!,
    rightZone: app.querySelector<HTMLElement>("#right-zone")!,
    rightKnob: app.querySelector<HTMLElement>("#right-knob")!,
    squidButton: app.querySelector<HTMLButtonElement>("#squid-button")!,
    pauseButton: app.querySelector<HTMLButtonElement>("#pause-button")!,
  });

  window.addEventListener("beforeunload", () => {
    game.dispose();
  });
} catch (error) {
  const centerNote = app.querySelector<HTMLElement>("#center-note");
  if (centerNote) {
    centerNote.classList.remove("overlay-hidden");
    centerNote.innerHTML = `
      <h2 class="headline">WebGL Required</h2>
      <p class="result-copy">
        This build needs WebGL-enabled graphics. Try a current mobile or desktop browser with hardware acceleration turned on.
      </p>
    `;
  }
  console.error(error);
}
