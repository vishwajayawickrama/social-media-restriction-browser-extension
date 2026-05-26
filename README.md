# Nuan

Reclaim the present.

A Chromium Manifest V3 extension that limits active social media browsing time.

Version: `0.1.0.alpha.1`

## Behavior

- Default allowance: 5 minutes.
- Reset window: every 6 hours from the first tracked social media use.
- Time counts only while a tracked social media tab is active in the focused browser window.
- When the allowance is used, tracked social media tabs are closed.
- Future visits to tracked domains are closed until the reset window expires.
- The time limit and domain list can be changed from the extension settings page.
- A small in-page toast appears when tracking starts.
- A warning appears when 1 minute remains.
- A visible `3`, `2`, `1` countdown appears before tracked tabs close.
- When blocked, the popup shows how long to wait before social media is available again.

## Default Tracked Domains

- facebook.com
- instagram.com
- linkedin.com
- tiktok.com
- reddit.com
- x.com
- twitter.com
- snapchat.com
- pinterest.com

## Load in Chromium

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.
5. Open the extension popup or settings page to check the timer and change domains.
