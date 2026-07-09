// Tempus Focus Guard popup — deliberately minimal.
// A clock counting down the current work block, and a Home button.
// Everything else is configured on the Tempus website.

const DAY_LABELS = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const viewDisconnected = document.getElementById("view-disconnected");
const viewConnected = document.getElementById("view-connected");
const codeInput = document.getElementById("code-input");
const connectBtn = document.getElementById("connect-btn");
const connectError = document.getElementById("connect-error");
const clockEl = document.getElementById("clock");
const clockTime = document.getElementById("clock-time");
const clockLabel = document.getElementById("clock-label");
const idleEl = document.getElementById("idle");
const idleText = document.getElementById("idle-text");
const homeBtn = document.getElementById("home-btn");

let currentStatus = null;
let tickInterval = null;

init();

async function init() {
  await refresh();
  tickInterval = setInterval(renderClock, 1000);
}

async function refresh() {
  currentStatus = await chrome.runtime.sendMessage({ type: "getStatus" });
  render();
}

function render() {
  const s = currentStatus || {};
  viewDisconnected.hidden = !!s.connected;
  viewConnected.hidden = !s.connected;
  if (!s.connected) return;

  const showClock = s.showClock !== false;
  const hasCountdown = showClock && !!s.activeBlock;

  clockEl.hidden = !hasCountdown;
  idleEl.hidden = hasCountdown;

  if (hasCountdown) {
    clockLabel.textContent = s.activeBlock.title || "Focus block";
    renderClock();
  } else if (!s.hasSchedule) {
    idleText.textContent = "No schedule yet — build one on Tempus.";
  } else if (s.nextBlock && showClock) {
    idleText.textContent = `Next: ${s.nextBlock.title} — ${DAY_LABELS[s.nextBlock.day] || s.nextBlock.day} ${s.nextBlock.startTime}`;
  } else {
    idleText.textContent = "Tempus Focus Guard";
  }
}

function renderClock() {
  const s = currentStatus || {};
  if (!s.activeBlock || s.showClock === false) return;
  const [h, m] = String(s.activeBlock.endTime).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return;
  const now = new Date();
  const end = new Date(now);
  end.setHours(h, m, 0, 0);
  let secondsLeft = Math.max(0, Math.floor((end - now) / 1000));
  const hh = Math.floor(secondsLeft / 3600);
  const mm = Math.floor((secondsLeft % 3600) / 60);
  const ss = secondsLeft % 60;
  clockTime.textContent =
    hh > 0
      ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : `${mm}:${String(ss).padStart(2, "0")}`;
}

homeBtn.addEventListener("click", () => {
  const url = currentStatus && currentStatus.homeUrl;
  if (url) chrome.tabs.create({ url });
});

connectBtn.addEventListener("click", async () => {
  connectError.hidden = true;
  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting…";
  try {
    const raw = codeInput.value.trim();
    if (!raw) throw new Error("Paste your connection code first.");
    let parsed;
    try {
      parsed = JSON.parse(atob(raw));
    } catch {
      throw new Error("That doesn't look like a valid connection code.");
    }
    if (!parsed.apiUrl || !parsed.token) {
      throw new Error("That doesn't look like a valid connection code.");
    }
    const res = await fetch(`${parsed.apiUrl.replace(/\/$/, "")}/extension/config`, {
      headers: { Authorization: `Bearer ${parsed.token}` },
    });
    if (!res.ok) throw new Error("Couldn't connect — generate a fresh code on Tempus and try again.");
    await chrome.storage.local.set({
      apiUrl: parsed.apiUrl,
      token: parsed.token,
      homeUrl: parsed.homeUrl || null,
    });
    await chrome.runtime.sendMessage({ type: "sync" });
    await refresh();
  } catch (err) {
    connectError.textContent = err.message || "Something went wrong.";
    connectError.hidden = false;
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect";
  }
});
