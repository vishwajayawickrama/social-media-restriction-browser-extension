const SUGGESTED_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "reddit.com",
  "x.com",
  "twitter.com",
  "snapchat.com",
  "pinterest.com",
  "threads.net",
  "bsky.app",
  "discord.com",
  "twitch.tv",
  "tumblr.com"
];

const form = document.getElementById("settingsForm");
const limitMinutes = document.getElementById("limitMinutes");
const domains = document.getElementById("domains");
const domainInput = document.getElementById("domainInput");
const addDomainButton = document.getElementById("addDomainButton");
const selectedDomains = document.getElementById("selectedDomains");
const availableDomains = document.getElementById("availableDomains");
const domainCount = document.getElementById("domainCount");
const message = document.getElementById("message");

let activeDomains = [];

loadSettings();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  syncDomainsField();

  const response = await chrome.runtime.sendMessage({
    type: "saveSettings",
    settings: {
      limitMinutes: limitMinutes.value,
      domains: activeDomains
    }
  });

  if (!response.ok) {
    message.textContent = response.error;
    message.className = "error";
    return;
  }

  limitMinutes.value = response.settings.limitMinutes;
  activeDomains = response.settings.domains;
  renderDomains();
  message.textContent = "Saved";
  message.className = "success";
});

addDomainButton.addEventListener("click", () => {
  addDomain(domainInput.value);
});

domainInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addDomain(domainInput.value);
  }
});

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "getSettings" });
  limitMinutes.value = settings.limitMinutes;
  activeDomains = settings.domains;
  renderDomains();
}

function renderDomains() {
  syncDomainsField();
  domainCount.textContent = `${activeDomains.length} active`;
  selectedDomains.replaceChildren(...activeDomains.map(createSelectedChip));

  const available = SUGGESTED_DOMAINS.filter((domain) => !activeDomains.includes(domain));
  availableDomains.replaceChildren(...available.map(createAvailableChip));
}

function createSelectedChip(domain) {
  const chip = document.createElement("button");
  chip.className = "domain-chip selected";
  chip.type = "button";
  chip.dataset.domain = domain;
  chip.setAttribute("aria-label", `Remove ${domain}`);
  chip.textContent = domain;

  const icon = createChipIcon("x");
  icon.setAttribute("aria-hidden", "true");
  chip.append(icon);

  chip.addEventListener("click", () => {
    activeDomains = activeDomains.filter((activeDomain) => activeDomain !== domain);
    renderDomains();
  });

  return chip;
}

function createAvailableChip(domain) {
  const chip = document.createElement("button");
  chip.className = "domain-chip available";
  chip.type = "button";
  chip.dataset.domain = domain;
  chip.setAttribute("aria-label", `Add ${domain}`);

  const icon = createChipIcon("plus");
  icon.setAttribute("aria-hidden", "true");
  chip.append(icon, domain);

  chip.addEventListener("click", () => {
    addDomain(domain);
  });

  return chip;
}

function addDomain(value) {
  const domain = normalizeDomain(value);
  if (!domain || activeDomains.includes(domain)) {
    domainInput.value = "";
    return;
  }

  activeDomains = [...activeDomains, domain];
  domainInput.value = "";
  renderDomains();
}

function normalizeDomain(value) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").split("/")[0];
  }
}

function syncDomainsField() {
  domains.value = activeDomains.join("\n");
}

function createChipIcon(name) {
  const paths = {
    plus: ["M5 12h14", "M12 5v14"],
    x: ["M18 6 6 18", "M6 6l12 12"]
  };
  const icon = document.createElement("span");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.4");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  for (const pathData of paths[name]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.append(path);
  }

  icon.append(svg);
  return icon;
}
