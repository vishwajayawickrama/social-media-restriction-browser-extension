const form = document.getElementById("settingsForm");
const limitMinutes = document.getElementById("limitMinutes");
const domains = document.getElementById("domains");
const message = document.getElementById("message");

loadSettings();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const response = await chrome.runtime.sendMessage({
    type: "saveSettings",
    settings: {
      limitMinutes: limitMinutes.value,
      domains: domains.value.split(/\r?\n/)
    }
  });

  if (!response.ok) {
    message.textContent = response.error;
    message.className = "error";
    return;
  }

  limitMinutes.value = response.settings.limitMinutes;
  domains.value = response.settings.domains.join("\n");
  message.textContent = "Saved";
  message.className = "success";
});

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "getSettings" });
  limitMinutes.value = settings.limitMinutes;
  domains.value = settings.domains.join("\n");
}
