const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function stepFrames(page, frames) {
  for (let index = 0; index < frames; index += 1) {
    await page.evaluate(() => {
      if (typeof window.advanceTime === "function") {
        window.advanceTime(1000 / 60);
      }
    });
  }
}

function normalize2d(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 1e-6) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
}

function dot2d(a, b) {
  return a.x * b.x + a.y * b.y;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader"],
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${String(err)}`);
  });

  await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const unsupportedText = await page.locator("#center-note").textContent();
  if (unsupportedText?.includes("WebGL Required")) {
    throw new Error("WebGL is unavailable in the current headless browser environment.");
  }
  await page.click('[data-action="start"]');

  await stepFrames(page, 190);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("canvas not found");
  }

  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.38);
  await page.mouse.down();
  await stepFrames(page, 10);
  await page.mouse.up();

  await page.keyboard.down("ArrowRight");
  await stepFrames(page, 20);
  await page.keyboard.up("ArrowRight");

  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.36);
  await page.mouse.down();
  await page.keyboard.down("ArrowRight");
  await stepFrames(page, 14);
  await page.keyboard.up("ArrowRight");
  await page.mouse.up();

  await page.keyboard.down("Space");
  await page.keyboard.down("ArrowRight");
  await stepFrames(page, 18);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Space");
  await stepFrames(page, 12);

  const outputDir = path.resolve("output/web-game");
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, "manual-check.png") });
  const stateText = await page.evaluate(() => (window.render_game_to_text ? window.render_game_to_text() : null));
  if (!stateText) {
    throw new Error("render_game_to_text returned no state");
  }
  const state = JSON.parse(stateText);
  if (state.mode !== "playing") {
    throw new Error(`expected mode=playing, received ${state.mode}`);
  }
  if (state.camera?.mode !== "gameplay") {
    throw new Error(`expected gameplay camera during match, received ${state.camera?.mode}`);
  }
  const cameraToPlayer = normalize2d({
    x: state.player.x - state.camera.position.x,
    y: state.player.y - state.camera.position.z,
  });
  const targetAhead = normalize2d({
    x: state.camera.target.x - state.player.x,
    y: state.camera.target.z - state.player.y,
  });
  if (dot2d(cameraToPlayer, state.player.aim) < 0.45) {
    throw new Error("camera is not staying behind the player relative to facing direction");
  }
  if (dot2d(targetAhead, state.player.aim) < 0.45) {
    throw new Error("camera target is not looking ahead of the player");
  }

  await page.keyboard.press("Escape");
  await stepFrames(page, 2);
  const pausedText = await page.evaluate(() => (window.render_game_to_text ? window.render_game_to_text() : null));
  const pausedState = pausedText ? JSON.parse(pausedText) : null;
  if (!pausedState || pausedState.mode !== "paused") {
    throw new Error(`expected mode=paused after Escape, received ${pausedState?.mode}`);
  }
  if (pausedState.camera?.mode !== "overview") {
    throw new Error(`expected overview camera while paused, received ${pausedState.camera?.mode}`);
  }
  if (stateText) {
    fs.writeFileSync(path.join(outputDir, "manual-state.json"), stateText);
  }
  if (pausedText) {
    fs.writeFileSync(path.join(outputDir, "paused-state.json"), pausedText);
  }
  if (errors.length) {
    fs.writeFileSync(path.join(outputDir, "manual-errors.log"), errors.join("\n"));
  }

  console.log(
    JSON.stringify(
      {
        errors,
        state,
        pausedState,
      },
      null,
      2,
    ),
  );
  await browser.close();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
