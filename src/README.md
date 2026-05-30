# Source Layout

The extension source is grouped by runtime responsibility:

- `background/` contains the Manifest V3 service worker.
- `content/` contains scripts injected into webpages.
- `shared/` contains utilities reused by extension pages.
- `ui/` contains popup/options pages, page scripts, and shared UI styles.

There is no bundler or build output. Files in this folder are loaded directly through `manifest.json` and relative HTML references.
