const { chromium } = require("playwright");

const TARGET_URL = process.env.LAYOUT_TEST_URL || "http://127.0.0.1:4173/splat/";
const TITLE_MARKUP = `
  <div class="brand">
    <div class="brand-mark">Ink Arena</div>
    <div class="brand-sub">Offline turf skirmish</div>
  </div>
  <h1 class="headline">Paint the floor before the clock hits zero.</h1>
  <p class="intro-copy">Move, aim, shoot, and swim through your own color while the AI teams fight for the center lanes.</p>
  <div class="controls-grid">
    <div class="control-tile"><strong>Move</strong><span>Left stick or arrow keys</span></div>
    <div class="control-tile"><strong>Aim + Shoot</strong><span>Right stick or mouse</span></div>
    <div class="control-tile"><strong>Swim</strong><span>Hold SQUID or Space</span></div>
  </div>
  <div class="launch-row">
    <button class="action-btn">Play Match</button>
    <button class="quiet-btn">Mute SFX</button>
  </div>
`;
const LONG_TITLE_COPY = "<p class=\"intro-copy\">Repaint the ramps, keep moving, and stay alive through the full three-minute timer.</p>".repeat(8);

const scenarios = [
  { name: "landscape-standard", viewport: { width: 844, height: 390 }, mode: "title" },
  { name: "landscape-short", viewport: { width: 667, height: 320 }, mode: "title", requireScrollableCenter: true },
  { name: "landscape-play", viewport: { width: 667, height: 320 }, mode: "play" },
  { name: "portrait-rotate-note", viewport: { width: 430, height: 932 }, mode: "portrait" },
];

function assertWithinViewport(label, box, viewportHeight) {
  if (!box || box.display === "none") {
    return;
  }
  if (box.bottom > viewportHeight + 0.5) {
    throw new Error(`${label} bottom ${box.bottom} exceeds viewport ${viewportHeight}`);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader"],
  });

  for (const scenario of scenarios) {
    const page = await browser.newPage({
      viewport: scenario.viewport,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(({ mode, titleMarkup, requireScrollableCenter, longTitleCopy }) => {
      const center = document.querySelector("#center-note");
      const rotate = document.querySelector(".rotate-note");
      if (!center || !rotate) {
        throw new Error("layout anchors not found");
      }

      if (mode === "title") {
        center.classList.remove("overlay-hidden");
        center.innerHTML = requireScrollableCenter ? `${titleMarkup}${longTitleCopy}` : titleMarkup;
      } else if (mode === "play") {
        center.classList.add("overlay-hidden");
      }

      const pick = (selector) => {
        const el = document.querySelector(selector);
        if (!el) {
          return null;
        }
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          display: getComputedStyle(el).display,
          pointerEvents: getComputedStyle(el).pointerEvents,
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
        };
      };

      return {
        viewportHeight: window.innerHeight,
        center: pick("#center-note"),
        footer: pick(".footer-panels"),
        topbar: pick(".topbar"),
        leftZone: pick("#left-zone"),
        rightZone: pick("#right-zone"),
        squidButton: pick("#squid-button"),
        pauseButton: pick("#pause-button"),
        rotateNote: pick(".rotate-note"),
      };
    }, {
      mode: scenario.mode,
      titleMarkup: TITLE_MARKUP,
      requireScrollableCenter: scenario.requireScrollableCenter ?? false,
      longTitleCopy: LONG_TITLE_COPY,
    });

    if (scenario.mode === "portrait") {
      if (!metrics.rotateNote || metrics.rotateNote.display === "none") {
        throw new Error("rotate note should be visible in portrait mode");
      }
      assertWithinViewport(`${scenario.name}: rotate note`, metrics.rotateNote, metrics.viewportHeight);
    } else {
      assertWithinViewport(`${scenario.name}: topbar`, metrics.topbar, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: center note`, metrics.center, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: footer`, metrics.footer, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: left stick`, metrics.leftZone, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: right stick`, metrics.rightZone, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: squid button`, metrics.squidButton, metrics.viewportHeight);
      assertWithinViewport(`${scenario.name}: pause button`, metrics.pauseButton, metrics.viewportHeight);
      if (scenario.requireScrollableCenter) {
        if (!metrics.center || metrics.center.pointerEvents !== "auto") {
          throw new Error(`${scenario.name}: center note must accept pointer input for scrolling`);
        }
        if (metrics.center.scrollHeight <= metrics.center.clientHeight) {
          throw new Error(`${scenario.name}: center note should overflow in the short-height scenario`);
        }
      }
    }

    console.log(JSON.stringify({ scenario: scenario.name, metrics }, null, 2));
    await page.close();
  }

  await browser.close();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
