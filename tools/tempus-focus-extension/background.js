// Tempus Focus Guard — service worker.
// Checks the user's Tempus schedule every minute and blocks distracting
// sites while a homework/study block is active. There is deliberately no
// off switch: removing the extension is the only way to disable it.

const DEFAULT_SITES = [
  "youtube.com",
  "instagram.com",
  "snapchat.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "facebook.com",
  "twitch.tv",
  "netflix.com",
  "discord.com",
  "pinterest.com",
];

const WORK_CATEGORIES = ["homework"];
const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

chrome.runtime.onInstalled.addListener(() => {
  init();
});
chrome.runtime.onStartup.addListener(() => {
  init();
});

async function init() {
  const stored = await chrome.storage.local.get(["sites"]);
  if (!stored.sites) {
    await chrome.storage.local.set({ sites: DEFAULT_SITES });
  }
  await chrome.alarms.create("tick", { periodInMinutes: 1 });
  await evaluate();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tick") evaluate();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "sync") {
    evaluate({ forceFetch: true }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "getStatus") {
    getStatus().then(sendResponse);
    return true;
  }
  return false;
});

async function getConfig() {
  const data = await chrome.storage.local.get([
    "apiUrl",
    "token",
    "sites",
    "scheduleCache",
    "scheduleFetchedAt",
  ]);
  return {
    apiUrl: data.apiUrl || null,
    token: data.token || null,
    sites: Array.isArray(data.sites) && data.sites.length ? data.sites : DEFAULT_SITES,
    scheduleCache: data.scheduleCache || null,
    scheduleFetchedAt: data.scheduleFetchedAt || 0,
  };
}

async function fetchSchedule(apiUrl, token) {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/extension/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`http ${res.status}`);
  return res.json();
}

function parseMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function findActiveBlock(blocks) {
  const now = new Date();
  const day = DAY_KEYS[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const block of blocks || []) {
    if (!WORK_CATEGORIES.includes(block.category)) continue;
    if (block.day !== day) continue;
    const start = parseMinutes(block.startTime);
    const end = parseMinutes(block.endTime);
    if (start === null || end === null) continue;
    if (minutes >= start && minutes < end) return block;
  }
  return null;
}

function findNextBlock(blocks) {
  const now = new Date();
  const todayIdx = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  let best = null;
  for (const block of blocks || []) {
    if (!WORK_CATEGORIES.includes(block.category)) continue;
    const dayIdx = DAY_KEYS.indexOf(block.day);
    if (dayIdx === -1) continue;
    const start = parseMinutes(block.startTime);
    if (start === null) continue;
    let daysAhead = (dayIdx - todayIdx + 7) % 7;
    if (daysAhead === 0 && start <= minutes) daysAhead = 7;
    const score = daysAhead * 1440 + start;
    if (!best || score < best.score) best = { score, block };
  }
  return best ? best.block : null;
}

async function evaluate(options = {}) {
  const cfg = await getConfig();

  if (!cfg.token || !cfg.apiUrl) {
    await setBlockingRules([]);
    await setBadge("");
    await chrome.storage.local.set({ status: { connected: false } });
    return;
  }

  let schedule = cfg.scheduleCache;
  const stale = Date.now() - cfg.scheduleFetchedAt > SCHEDULE_TTL_MS;
  if (options.forceFetch || stale || !schedule) {
    try {
      schedule = await fetchSchedule(cfg.apiUrl, cfg.token);
      await chrome.storage.local.set({
        scheduleCache: schedule,
        scheduleFetchedAt: Date.now(),
      });
    } catch (err) {
      if (String(err && err.message) === "unauthorized") {
        // Token revoked/invalid — disconnect rather than block forever.
        await chrome.storage.local.remove(["token", "scheduleCache"]);
        await setBlockingRules([]);
        await setBadge("");
        await chrome.storage.local.set({ status: { connected: false } });
        return;
      }
      // Network hiccup: keep using the cached schedule if we have one.
    }
  }

  const blocks = schedule && schedule.hasSchedule ? schedule.blocks : [];
  const active = findActiveBlock(blocks);
  const next = findNextBlock(blocks);

  if (active) {
    await setBlockingRules(cfg.sites);
    await setBadge("ON");
  } else {
    await setBlockingRules([]);
    await setBadge("");
  }

  await chrome.storage.local.set({
    status: {
      connected: true,
      hasSchedule: !!(schedule && schedule.hasSchedule),
      activeBlock: active
        ? { title: active.title, endTime: active.endTime }
        : null,
      nextBlock: next
        ? { title: next.title, day: next.day, startTime: next.startTime }
        : null,
      checkedAt: Date.now(),
    },
  });
}

async function getStatus() {
  const data = await chrome.storage.local.get(["status", "sites", "apiUrl", "token"]);
  return {
    connected: !!data.token,
    sites: Array.isArray(data.sites) && data.sites.length ? data.sites : DEFAULT_SITES,
    ...(data.status || {}),
  };
}

async function setBadge(text) {
  try {
    await chrome.action.setBadgeText({ text });
    if (text) {
      await chrome.action.setBadgeBackgroundColor({ color: "#4d8a6a" });
    }
  } catch {
    // badge is cosmetic
  }
}

async function setBlockingRules(domains) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" },
    },
    condition: {
      requestDomains: [normalizeDomain(domain)],
      resourceTypes: ["main_frame"],
    },
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

function normalizeDomain(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}
