const DEFAULT_SETTINGS = {
  limitMinutes: 5,
  domains: [
    "facebook.com",
    "instagram.com",
    "linkedin.com",
    "tiktok.com",
    "reddit.com",
    "x.com",
    "twitter.com",
    "youtube.com",
    "snapchat.com",
    "pinterest.com"
  ]
};

const DEFAULT_STATE = {
  windowStart: null,
  usedMs: 0,
  activeTabId: null,
  activeWindowId: null,
  activeSessionStart: null,
  oneMinuteWarningWindowStart: null,
  countdownWindowStart: null
};

const RESET_INTERVAL_MS = 6 * 60 * 60 * 1000;
const TICK_ALARM = "social-media-time-guard-tick";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await refreshActiveTracking();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  await refreshActiveTracking();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) {
    updateUsageAndEnforce();
  }
});

chrome.tabs.onActivated.addListener(() => {
  refreshActiveTracking();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  refreshActiveTracking({ removedTabId: tabId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    handleTabUrlChange(tabId, tab);
  }
});

chrome.windows.onFocusChanged.addListener(() => {
  refreshActiveTracking();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) {
    updateUsageAndEnforce();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "getStatus") {
    respondAsync(getStatus(), sendResponse);
    return true;
  }

  if (message?.type === "getSettings") {
    respondAsync(getSettings(), sendResponse);
    return true;
  }

  if (message?.type === "saveSettings") {
    respondAsync(saveSettings(message.settings), sendResponse);
    return true;
  }

  if (message?.type === "countdownFinished") {
    respondAsync(handleCountdownFinished(sender), sendResponse);
    return true;
  }

  return false;
});

function respondAsync(promise, sendResponse) {
  promise
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || "The extension background worker failed."
      });
    });
}

async function ensureDefaults() {
  const data = await chrome.storage.local.get(["settings", "state"]);
  const updates = {};

  if (!data.settings) {
    updates.settings = DEFAULT_SETTINGS;
  } else {
    updates.settings = normalizeSettings(data.settings);
  }

  if (!data.state) {
    updates.state = DEFAULT_STATE;
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

async function getSettings() {
  await ensureDefaults();
  const { settings } = await chrome.storage.local.get("settings");
  return normalizeSettings(settings);
}

async function getState() {
  await ensureDefaults();
  const { state } = await chrome.storage.local.get("state");
  return { ...DEFAULT_STATE, ...state };
}

async function setState(state) {
  await chrome.storage.local.set({ state: { ...DEFAULT_STATE, ...state } });
}

async function saveSettings(rawSettings) {
  const settings = normalizeSettings(rawSettings);
  if (settings.limitMinutes < 1 || settings.domains.length === 0) {
    return {
      ok: false,
      error: "Use a limit of at least 1 minute and add at least one domain."
    };
  }

  await chrome.storage.local.set({ settings });
  await refreshActiveTracking();
  return { ok: true, settings };
}

async function updateUsageAndEnforce(options = {}) {
  const settings = await getSettings();
  let state = await getState();
  const now = Date.now();

  state = resetIfExpired(state, now);
  state = accrueActiveTime(state, now);

  const limitMs = settings.limitMinutes * 60 * 1000;
  if (state.windowStart && state.usedMs >= limitMs) {
    state.usedMs = limitMs;
    state.activeTabId = null;
    state.activeWindowId = null;
    state.activeSessionStart = null;
    await setState(state);
    await closeTrackedTabs(settings);
    return state;
  }

  await setState(state);

  if (!options.skipRefresh) {
    await refreshActiveTracking({ alreadySynced: true });
  }

  return state;
}

async function refreshActiveTracking(options = {}) {
  const settings = await getSettings();
  let state = options.alreadySynced ? await getState() : await updateUsageAndEnforce({ skipRefresh: true });
  const now = Date.now();
  const previousTabId = state.activeTabId;

  state = resetIfExpired(state, now);

  if (state.windowStart && state.usedMs >= settings.limitMinutes * 60 * 1000) {
    await setState({ ...state, activeTabId: null, activeWindowId: null, activeSessionStart: null });
    await closeTrackedTabs(settings);
    return;
  }

  const activeTab = await getFocusedActiveTab();
  const shouldTrack =
    activeTab &&
    activeTab.id !== options.removedTabId &&
    isTrackedUrl(activeTab.url || activeTab.pendingUrl, settings.domains);

  if (!shouldTrack) {
    await sendTrackingPaused(previousTabId);
    await setState({
      ...state,
      activeTabId: null,
      activeWindowId: null,
      activeSessionStart: null
    });
    return;
  }

  if (!state.windowStart) {
    state.windowStart = now;
  }

  const limitMs = settings.limitMinutes * 60 * 1000;
  const remainingMs = Math.max(0, limitMs - state.usedMs);
  const startedNewSession = state.activeTabId !== activeTab.id || !state.activeSessionStart;
  const nextState = {
    ...state,
    activeTabId: activeTab.id,
    activeWindowId: activeTab.windowId,
    activeSessionStart: now
  };

  await setState(nextState);

  if (startedNewSession) {
    await sendTrackingPaused(previousTabId, activeTab.id);
    await safeSendTabMessage(activeTab.id, {
      type: "trackingStarted",
      remainingMs,
      limitMs
    });
  }
}

async function handleTabUrlChange(tabId, tab) {
  const settings = await getSettings();
  const url = tab?.url || tab?.pendingUrl;

  if (!isTrackedUrl(url, settings.domains)) {
    await refreshActiveTracking();
    return;
  }

  const status = await getStatus();
  if (status.blocked) {
    await safeCloseTab(tabId);
    return;
  }

  await refreshActiveTracking();
}

async function getStatus() {
  const settings = await getSettings();
  let state = await updateUsageAndEnforce({ skipRefresh: true });
  const now = Date.now();
  state = resetIfExpired(state, now);

  const activeTab = await getFocusedActiveTab();
  const activeTabUrl = activeTab?.url || activeTab?.pendingUrl || "";
  const currentTabTracked = isTrackedUrl(activeTabUrl, settings.domains);
  const limitMs = settings.limitMinutes * 60 * 1000;
  const blocked = Boolean(state.windowStart && state.usedMs >= limitMs);
  const resetAt = state.windowStart ? state.windowStart + RESET_INTERVAL_MS : null;

  return {
    settings,
    usedMs: state.usedMs,
    remainingMs: Math.max(0, limitMs - state.usedMs),
    limitMs,
    blocked,
    resetAt,
    currentTabTracked,
    currentHost: getHostname(activeTabUrl),
    active: Boolean(state.activeTabId && state.activeSessionStart),
    windowStart: state.windowStart
  };
}

async function handleCountdownFinished(sender) {
  const settings = await getSettings();
  const state = await getState();
  const senderUrl = sender?.tab?.url || sender?.tab?.pendingUrl || "";

  if (senderUrl && !isTrackedUrl(senderUrl, settings.domains)) {
    return { ok: false, error: "Countdown finished from an untracked tab." };
  }

  await setState({
    ...state,
    usedMs: settings.limitMinutes * 60 * 1000,
    activeTabId: null,
    activeWindowId: null,
    activeSessionStart: null
  });
  await closeTrackedTabs(settings);
  return { ok: true };
}

function accrueActiveTime(state, now) {
  if (!state.activeSessionStart) {
    return state;
  }

  if (!state.windowStart) {
    state.windowStart = state.activeSessionStart;
  }

  const elapsed = Math.max(0, now - state.activeSessionStart);
  return {
    ...state,
    usedMs: state.usedMs + elapsed,
    activeSessionStart: now
  };
}

function resetIfExpired(state, now) {
  if (!state.windowStart || now - state.windowStart < RESET_INTERVAL_MS) {
    return state;
  }

  return { ...DEFAULT_STATE };
}

async function closeTrackedTabs(settings) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => isTrackedUrl(tab.url || tab.pendingUrl, settings.domains))
      .map((tab) => safeCloseTab(tab.id))
  );
}

async function sendTrackingPaused(tabId, exceptTabId = null) {
  if (typeof tabId !== "number" || tabId === exceptTabId) {
    return;
  }

  await safeSendTabMessage(tabId, { type: "trackingPaused" });
}

async function safeSendTabMessage(tabId, message) {
  if (typeof tabId !== "number") {
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!String(error?.message || "").includes("Receiving end does not exist")) {
      return null;
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (_error) {
    return null;
  }
}

async function safeCloseTab(tabId) {
  if (typeof tabId !== "number") {
    return;
  }

  try {
    await chrome.tabs.remove(tabId);
  } catch (_error) {
    // The tab may already be gone.
  }
}

async function getFocusedActiveTab() {
  const queryAttempts = [
    { active: true, lastFocusedWindow: true },
    { active: true, currentWindow: true }
  ];

  for (const queryInfo of queryAttempts) {
    try {
      const [tab] = await chrome.tabs.query(queryInfo);
      if (tab?.url || tab?.pendingUrl) {
        return tab;
      }
    } catch (_error) {
      // Fall through to the next lookup strategy.
    }
  }

  try {
    const browserWindow = await chrome.windows.getLastFocused({ populate: true });
    return browserWindow?.tabs?.find((tab) => tab.active) || null;
  } catch (_error) {
    return null;
  }
}

function isTrackedUrl(url, domains) {
  const hostname = getHostname(url);
  if (!hostname) {
    return false;
  }

  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function getHostname(url) {
  if (typeof url !== "string" || !url) {
    return "";
  }

  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function normalizeSettings(settings = {}) {
  return {
    limitMinutes: normalizeLimit(settings.limitMinutes),
    domains: normalizeDomains(settings.domains)
  };
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.limitMinutes;
}

function normalizeDomains(domains) {
  const source = Array.isArray(domains) ? domains : DEFAULT_SETTINGS.domains;
  const normalized = source.map(normalizeDomain).filter(Boolean);
  return [...new Set(normalized)];
}

function normalizeDomain(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.hostname.replace(/^www\./, "");
  } catch (_error) {
    return trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .trim();
  }
}
