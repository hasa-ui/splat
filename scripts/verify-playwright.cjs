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
  if (stateText) {
    fs.writeFileSync(path.join(outputDir, "manual-state.json"), stateText);
  }
  if (errors.length) {
    fs.writeFileSync(path.join(outputDir, "manual-errors.log"), errors.join("\n"));
  }

  console.log(
    JSON.stringify(
      {
        errors,
        stateText,
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
