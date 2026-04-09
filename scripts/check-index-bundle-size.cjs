const fs = require("node:fs");
const path = require("node:path");

const MAX_INDEX_BUNDLE_BYTES = 500000;
const assetsDir = path.resolve("dist/assets");

if (!fs.existsSync(assetsDir)) {
  console.error(`Bundle size check failed: missing assets directory at ${assetsDir}`);
  process.exit(1);
}

const indexBundles = fs
  .readdirSync(assetsDir)
  .filter((file) => /^index-.*\.js$/.test(file))
  .map((file) => ({
    file,
    bytes: fs.statSync(path.join(assetsDir, file)).size,
  }))
  .sort((a, b) => a.file.localeCompare(b.file));

if (indexBundles.length === 0) {
  console.error("Bundle size check failed: no index-*.js bundle found in dist/assets");
  process.exit(1);
}

for (const bundle of indexBundles) {
  console.log(`${bundle.file}: ${bundle.bytes} bytes`);
}

if (indexBundles.some((bundle) => bundle.bytes >= MAX_INDEX_BUNDLE_BYTES)) {
  console.error(
    `Bundle size check failed: index bundle must be below ${MAX_INDEX_BUNDLE_BYTES} bytes.`,
  );
  process.exit(1);
}

console.log(`Bundle size check passed: all index bundles are below ${MAX_INDEX_BUNDLE_BYTES} bytes.`);
