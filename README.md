# Nuan

Reclaim the present.

Nuan is a Chromium Manifest V3 extension that limits active social media browsing time. It only counts time while a tracked domain is active in the focused browser window.

Version: `0.1.0.alpha.1`

## Features

- Default allowance of 5 minutes.
- Six-hour reset window from the first tracked social media use.
- Time counts only for active tracked tabs in the focused browser window.
- Tracked tabs close when the allowance is used.
- Future visits to tracked domains close until the reset window expires.
- Configurable time limit and tracked domains from the settings page.
- Chip-based tracked-domain editor with add, remove, and confirmation flows.
- Themed popup and settings UI based on the `vishwajayawickrama-site` paper/dot-canvas visual language.
- In-page tracking toast, one-minute warning, and final `3`, `2`, `1` countdown.
- Popup status with remaining time, blocked state, and reset countdown.

## Default Tracked Domains

- `facebook.com`
- `instagram.com`
- `linkedin.com`
- `tiktok.com`
- `reddit.com`
- `x.com`
- `twitter.com`
- `snapchat.com`
- `pinterest.com`

`youtube.com` is available as a suggested domain in settings.

## Project Structure

```text
.
├── manifest.json
├── icons/
├── resources/
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   ├── shared/
│   │   └── dot-canvas.js
│   └── ui/
│       ├── styles.css
│       ├── options/
│       │   ├── options.html
│       │   └── options.js
│       └── popup/
│           ├── popup.html
│           └── popup.js
├── docs/
└── TODOs.md
```

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for entry points and ownership notes.

## Load in Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open the extension popup or settings page to check the timer and change domains.

After changing `manifest.json`, background code, content scripts, icons, or HTML paths, reload the unpacked extension from `chrome://extensions`.

## Development

This project has no build step. Chrome loads the source files directly from `manifest.json`.

Useful checks:

```sh
python3 -m json.tool manifest.json
node --check src/background/background.js
node --check src/content/content.js
node --check src/shared/dot-canvas.js
node --check src/ui/options/options.js
node --check src/ui/popup/popup.js
```

## Notes

- Extension pages use relative paths from their HTML file location.
- `src/background/background.js` also references `src/content/content.js` for fallback programmatic injection.
- Keep extension assets that Chrome resolves from the manifest, such as icons, at paths referenced by `manifest.json`.
