(() => {
if (window.__timeGuardContentLoaded) {
  return;
}
window.__timeGuardContentLoaded = true;

const TOAST_ID = "time-guard-toast";
const OVERLAY_ID = "time-guard-countdown";
const WARNING_MS = 60 * 1000;
const FINAL_COUNTDOWN_MS = 3 * 1000;

let warningTimer = null;
let countdownTimer = null;
let countdownInterval = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "trackingStarted") {
    startTrackingNotice(message.remainingMs);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "trackingPaused") {
    clearScheduledNotices();
    removeCountdown();
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "showOneMinuteWarning") {
    showToast("1 minute remaining before social media is blocked.", "warning", 6000);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "startClosingCountdown") {
    startClosingCountdown();
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

function startTrackingNotice(remainingMs) {
  clearScheduledNotices();
  removeCountdown();

  showToast(`Tracking started. ${formatDuration(remainingMs)} remaining.`, "info", 4000);

  if (remainingMs > WARNING_MS) {
    warningTimer = window.setTimeout(() => {
      showToast("1 minute remaining before social media is blocked.", "warning", 6000);
    }, remainingMs - WARNING_MS);
  } else if (remainingMs > FINAL_COUNTDOWN_MS) {
    showToast("Less than 1 minute remaining before social media is blocked.", "warning", 6000);
  }

  if (remainingMs > FINAL_COUNTDOWN_MS) {
    countdownTimer = window.setTimeout(startClosingCountdown, remainingMs - FINAL_COUNTDOWN_MS);
  } else {
    startClosingCountdown();
  }
}

function startClosingCountdown() {
  clearScheduledNotices();
  let remaining = 3;
  renderCountdown(remaining);

  countdownInterval = window.setInterval(() => {
    remaining -= 1;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      chrome.runtime.sendMessage({ type: "countdownFinished" });
      return;
    }

    renderCountdown(remaining);
  }, 1000);
}

function clearScheduledNotices() {
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }

  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function showToast(message, tone, durationMs) {
  const toast = getOrCreateToast();
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;

  window.setTimeout(() => {
    if (toast.textContent === message) {
      toast.hidden = true;
    }
  }, durationMs);
}

function renderCountdown(seconds) {
  const overlay = getOrCreateCountdown();
  overlay.textContent = `Closing in ${seconds}`;
  overlay.hidden = false;
}

function removeCountdown() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}

function getOrCreateToast() {
  let toast = document.getElementById(TOAST_ID);
  if (toast) {
    return toast;
  }

  toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.hidden = true;
  document.documentElement.append(toast);
  injectStyles();
  return toast;
}

function getOrCreateCountdown() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.hidden = true;
  document.documentElement.append(overlay);
  injectStyles();
  return overlay;
}

function injectStyles() {
  if (document.getElementById("time-guard-styles")) {
    return;
  }

  const styles = document.createElement("style");
  styles.id = "time-guard-styles";
  styles.textContent = `
    #${TOAST_ID} {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647;
      max-width: min(360px, calc(100vw - 36px));
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.26);
      color: #ffffff;
      font: 600 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      padding: 12px 14px;
      background: #176b52;
    }

    #${TOAST_ID}[data-tone="warning"] {
      background: #9a6700;
    }

    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      background: rgba(12, 14, 16, 0.72);
      color: #ffffff;
      font: 800 clamp(42px, 9vw, 96px)/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      letter-spacing: 0;
      text-align: center;
    }

    #${TOAST_ID}[hidden],
    #${OVERLAY_ID}[hidden] {
      display: none !important;
    }
  `;
  document.documentElement.append(styles);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
})();
