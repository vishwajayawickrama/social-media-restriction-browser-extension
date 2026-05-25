const timeValue = document.getElementById("timeValue");
const metricLabel = document.getElementById("metricLabel");
const details = document.getElementById("details");
const stateBadge = document.getElementById("stateBadge");
const optionsButton = document.getElementById("optionsButton");

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
setInterval(render, 1000);

async function render() {
  let status;
  try {
    status = await chrome.runtime.sendMessage({ type: "getStatus" });
  } catch (error) {
    showError(error?.message || "Unable to contact the extension background worker.");
    return;
  }

  if (!status || status.ok === false) {
    showError(status?.error || "Unable to read extension status.");
    return;
  }

  if (status.blocked) {
    metricLabel.textContent = "Blocked until";
    timeValue.textContent = formatClock(status.resetAt);
    stateBadge.textContent = "Blocked";
    stateBadge.className = "badge danger";
    details.textContent = "Social media tabs will close until the reset time.";
    return;
  }

  metricLabel.textContent = "Remaining";
  timeValue.textContent = formatDuration(status.remainingMs);
  stateBadge.textContent = status.active ? "Counting" : "Allowed";
  stateBadge.className = status.active ? "badge warning" : "badge";
  if (status.currentTabTracked) {
    details.textContent = "This tab is tracked while it is active.";
  } else if (status.currentHost) {
    details.textContent = `${status.currentHost} is not in the tracked domain list.`;
  } else {
    details.textContent = "This tab is not a trackable website.";
  }
}

function showError(message) {
  metricLabel.textContent = "Status";
  timeValue.textContent = "--:--";
  stateBadge.textContent = "Error";
  stateBadge.className = "badge danger";
  details.textContent = message;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatClock(timestamp) {
  if (!timestamp) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}
