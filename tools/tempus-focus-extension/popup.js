const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const viewDisconnected = document.getElementById("view-disconnected");
const viewConnected = document.getElementById("view-connected");
const codeInput = document.getElementById("code-input");
const connectBtn = document.getElementById("connect-btn");
const connectError = document.getElementById("connect-error");
const statusCard = document.getElementById("status-card");
const statusTitle = document.getElementById("status-title");
const statusDetail = document.getElementById("status-detail");
const siteList = document.getElementById("site-list");
const siteInput = document.getElementById("site-input");
const addBtn = document.getElementById("add-btn");
const editHint = document.getElementById("edit-hint");

let currentStatus = null;

init();

async function init() {
  await refresh();
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

  const active = s.activeBlock;
  statusCard.classList.toggle("active", !!active);
  if (active) {
    statusTitle.textContent = `🔒 Focus block: ${active.title}`;
    statusDetail.textContent = `Distracting sites are blocked until ${active.endTime}.`;
  } else if (s.hasSchedule) {
    statusTitle.textContent = "No focus block right now";
    statusDetail.textContent = s.nextBlock
      ? `Next: ${s.nextBlock.title} — ${DAY_LABELS[s.nextBlock.day] || s.nextBlock.day} at ${s.nextBlock.startTime}`
      : "No upcoming work blocks on your schedule.";
  } else {
    statusTitle.textContent = "No schedule yet";
    statusDetail.textContent = "Generate a plan on Tempus and blocking will start automatically.";
  }

  // Strict mode: while a focus block is active, sites can be added but not removed.
  const locked = !!active;
  editHint.textContent = locked
    ? "You can add sites anytime, but can't remove them during a focus block."
    : "Blocked during your work blocks. At least one site must stay on the list.";

  siteList.innerHTML = "";
  const sites = s.sites || [];
  const lastOne = sites.length <= 1;
  for (const site of sites) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = site;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.title = locked
      ? "Locked during a focus block"
      : lastOne
        ? "At least one site must stay on the list"
        : "Remove";
    btn.disabled = locked || lastOne;
    btn.addEventListener("click", () => removeSite(site));
    li.appendChild(span);
    li.appendChild(btn);
    siteList.appendChild(li);
  }
}

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
    const res = await fetch(`${parsed.apiUrl.replace(/\/$/, "")}/extension/schedule`, {
      headers: { Authorization: `Bearer ${parsed.token}` },
    });
    if (!res.ok) throw new Error("Couldn't connect — generate a fresh code on Tempus and try again.");
    await chrome.storage.local.set({ apiUrl: parsed.apiUrl, token: parsed.token });
    await chrome.runtime.sendMessage({ type: "sync" });
    await refresh();
  } catch (err) {
    connectError.textContent = err.message || "Something went wrong.";
    connectError.hidden = false;
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "Connect to Tempus";
  }
});

addBtn.addEventListener("click", addSite);
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

function normalizeDomain(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function addSite() {
  const domain = normalizeDomain(siteInput.value);
  if (!domain || !domain.includes(".")) return;
  const { sites = [] } = await chrome.storage.local.get(["sites"]);
  if (!sites.includes(domain)) {
    await chrome.storage.local.set({ sites: [...sites, domain] });
    await chrome.runtime.sendMessage({ type: "sync" });
  }
  siteInput.value = "";
  await refresh();
}

async function removeSite(domain) {
  // Strict mode double-check: never allow removal while a block is active,
  // and never let the list become empty (that would be an off switch).
  const status = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (status.activeBlock) {
    await refresh();
    return;
  }
  const { sites = [] } = await chrome.storage.local.get(["sites"]);
  if (sites.length <= 1) {
    editHint.textContent = "At least one site has to stay on the list — strict mode.";
    return;
  }
  await chrome.storage.local.set({ sites: sites.filter((s) => s !== domain) });
  await chrome.runtime.sendMessage({ type: "sync" });
  await refresh();
}
