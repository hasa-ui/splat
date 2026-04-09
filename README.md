# Inkline Arena

Browser-based ink battle prototype built with `Vite`, `TypeScript`, and `Three.js`.

## Local Development

```bash
npm ci
npm run dev
```

Open the local dev server URL printed by Vite and play in a WebGL-capable browser.

## Tests and Build

```bash
npm test
npm run build
```

Production builds target the GitHub Pages project-site path for this repository.

## GitHub Pages Deployment

This repository is set up to deploy from GitHub Actions when `main` is updated.

Expected public URL:

`https://hasa-ui.github.io/splat/`

Repository setting required once:

1. Open GitHub repository settings.
2. Go to `Pages`.
3. Set `Source` to `GitHub Actions`.

After that, each push to `main` will run `.github/workflows/deploy-pages.yml` and publish the latest `dist/` build.
