# Human, Inc.

A workplace survival game. Everyone at the company is an AI Agent. You are the only human. Keep your cover, survive quarterly layoffs, and climb from Junior Associate to CEO.

**English edition · v0.1.2 — Contains traces of human.**

Carbon-based dependencies remain unresolved.

## Run locally

Node.js 18 or later is sufficient to run the game. No dependency installation is required for the local server.

```sh
npm start
```

Open http://localhost:3000. Use `PORT=8080 npm start` to select another port.

To produce a static site, run `npm run build` and host the contents of `dist/`.

## Release information

The header displays the game version on desktop and mobile. The version comes from `package.json` → `version`; the release name and note come from `gameRelease`. Both `npm start` and `npm run build` generate `src/version.js` automatically. Do not edit the generated file.

The English translation keeps version **0.1.2**. Game release versions and save-format versions are separate; updating the displayed version does not clear progress.

For a future release, update the package metadata and this document. For example, `npm version patch --no-git-tag-version` updates both package files without creating a Git tag.

## Deploy to Cloudflare Pages

The active site is [humaninc.pages.dev](https://humaninc.pages.dev/). In Cloudflare Pages, connect the GitHub repository `xiaoyuin/HumanInc` with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root; leave the default |
| Build command | `npm run build` |
| Build output directory | `dist` |

Use Node.js 22 or later for Cloudflare tooling. Pages publishes the static build output automatically; it does not run `server.js`. The repository retains the previous Workers configuration and deploy script for compatibility, but the active deployment uses Pages.

The build includes the generated release metadata and all public icons. Connected production-branch pushes trigger Pages builds. Local edits and local commits are not published until pushed.

## Sharing and icons

The default public URL is `https://humaninc.pages.dev/`. The initial HTML contains English Open Graph and Twitter Card titles, descriptions, and the green **hi** share image. Share metadata can be read without running JavaScript.

- `public/favicon.svg` is the vector source, used by both the in-game logo and the browser SVG icon.
- `public/assets/hi.png` is the 512 × 512 share image. The smaller PNGs and ICO use the same artwork.
- `npm run build` copies the contents of `public/` into the root of `dist/`.
- Set the build variable `SITE_URL` to use another public origin. The build updates canonical, Open Graph, and share-image URLs together.

Browser icons and chat thumbnails are separate display surfaces. Share-card presentation depends on the receiving app; generic metadata is not a WeChat JS-SDK integration.

## How to play

- Each quarter contains 3 events. Pick one of three responses; the base stat changes are shown before you choose.
- There are 40 events and 120 choices. A new 30-decision career does not repeat events. From Senior Associate onward, at least 3 of each rank's 6 decisions feature newly unlocked duties.
- The quarterly performance threshold starts at 60 and rises by 5 per rank. Trust must be at least 25 to pass an IBU.
- Exposure reaching 100 reveals your human identity and ends the run immediately.
- A decision that leaves Energy at zero adds 18 extra Exposure and removes 10 Performance.
- Passing a quarter restores 24 Energy, reduces Exposure by 8, and resets Performance to 45. Trust carries over.
- Survive 2 quarters per rank to earn a promotion. Become CEO after 10 quarters to win.
- Accepting an offer or restarting after an ending assigns a new employee ID. Reloading and continuing a run preserve it. Older saves retain `YOU-042`.
- The game saves in the current browser. **Resign** clears the active run and returns to onboarding. Accept the offer again to start a new run. Canceling resignation preserves all progress.

Saves are local to each browser and origin. A local server, `pages.dev`, and a custom domain do not share progress.

## Existing Chinese saves

The English edition keeps the same event IDs, options, effects, rank requirements, employee IDs, and save key. When loading an existing Chinese save, `restoreSave` updates the stored display copy to English in memory without changing progress or stats.

`legacySubject` and `legacyTitle` in the event data are lookup keys for older saves, including saves created before event IDs were recorded. They are not shown in the English interface. Future decisions record both an event ID and a choice index.

## Project files

- `src/events.js`: 40 events, with 16 general events and 6 new events unlocked at each playable higher rank.
- `src/game.js`: game state, quarterly reviews, promotions, employee IDs, and save restoration.
- `src/app.js`: dashboard, organization, handbook, choices, results, and endings.
- `src/style.css`: responsive styling with locally available system fonts.
- `scripts/build.js`: static build and share-URL configuration.
- `scripts/version.js`: generated release metadata.
- `server.js`: local static server.

## Verification

```sh
npm test
```

Tests cover exposure, exhaustion, quarterly thresholds, promotions, victory, employee IDs, save compatibility, English copy, event scheduling, and viable full careers using real choices.

This is a local single-player game with authored events. It does not call a model API, require a backend account, or depend on a paid service.
