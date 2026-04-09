const fs = require("node:fs");
const path = require("node:path");

const MAX_INITIAL_JS_BYTES = 500000;
const distDir = path.resolve("dist");
const indexHtmlPath = path.join(distDir, "index.html");

if (!fs.existsSync(indexHtmlPath)) {
  console.error(`Bundle size check failed: missing index.html at ${indexHtmlPath}`);
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
const eagerScriptRefs = new Set();
const refPattern =
  /<script[^>]*type="module"[^>]*src="([^"]+\.js)"|<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"/g;
let match = refPattern.exec(indexHtml);

while (match) {
  eagerScriptRefs.add(match[1] ?? match[2]);
  match = refPattern.exec(indexHtml);
}

if (eagerScriptRefs.size === 0) {
  console.error("Bundle size check failed: no eager JavaScript assets found in dist/index.html");
  process.exit(1);
}

const eagerBundles = [...eagerScriptRefs]
  .map((ref) => {
    const relativeRef = ref.replace(/^\/+/, "").replace(/^splat\//, "");
    const filePath = path.join(distDir, relativeRef);
    if (!fs.existsSync(filePath)) {
      console.error(`Bundle size check failed: missing eager asset ${ref} (${filePath})`);
      process.exit(1);
    }
    return {
      file: path.relative(distDir, filePath),
      bytes: fs.statSync(filePath).size,
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

let totalBytes = 0;
for (const bundle of eagerBundles) {
  totalBytes += bundle.bytes;
  console.log(`${bundle.file}: ${bundle.bytes} bytes`);
}

console.log(`Initial eager JavaScript total: ${totalBytes} bytes`);

if (totalBytes >= MAX_INITIAL_JS_BYTES) {
  console.error(
    `Bundle size check failed: initial eager JavaScript must stay below ${MAX_INITIAL_JS_BYTES} bytes.`,
  );
  process.exit(1);
}

console.log(`Bundle size check passed: initial eager JavaScript is below ${MAX_INITIAL_JS_BYTES} bytes.`);
