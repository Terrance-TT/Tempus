// Tempus Focus 3 — service worker.
// The extension is a thin client: every setting (blocked sites, blocking
// mode, on/off, clock visibility) lives on the Tempus website and is fetched
// from the server. Nothing can be changed from the extension itself.

const CONFIG_TTL_MS = 5 * 60 * 1000;
const USAGE_FLUSH_MS = 5 * 60 * 1000;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WORK_CATEGORIES = ["homework"];
const FREE_CATEGORIES = ["free", "break"];

chrome.runtime.onInstalled.addListener(() => init());
chrome.runtime.onStartup.addListener(() => init());

async function init() {
  await chrome.alarms.create("tick", { periodInMinutes: 1 });
  await evaluate();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tick") {
    trackUsage();
    evaluate();
  }
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

async function getStored() {
  return chrome.storage.local.get([
    "apiUrl",
    "homeUrl",
    "token",
    "configCache",
    "configFetchedAt",
    "usageBuffer",
    "usageFlushedAt",
  ]);
}

async function fetchConfig(apiUrl, token) {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/extension/config`, {
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

function currentBlocks(blocks) {
  const now = new Date();
  const day = DAY_KEYS[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (blocks || []).filter((block) => {
    if (block.day !== day) return false;
    const start = parseMinutes(block.startTime);
    const end = parseMinutes(block.endTime);
    if (start === null || end === null) return false;
    return minutes >= start && minutes < end;
  });
}

function findNextWorkBlock(blocks) {
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

// Decide whether blocking should be on right now, per the server-side mode:
//   work_blocks — block only while a homework/study block is active.
//   non_free    — block whenever any non-free block (class, work…) is active.
function shouldBlock(settings, blocks) {
  // Commit mode (hidden switch) always forces blocking on, even if a stale
  // config somehow carries active=false.
  if (!settings.active && !settings.hideActivateSwitch) return { blocking: false, reasonBlock: null };
  if (settings.blockMode === "always") {
    return { blocking: true, reasonBlock: { title: "All-day focus", category: "homework" } };
  }
  const active = currentBlocks(blocks);
  if (settings.blockMode === "non_free") {
    const busy = active.find((b) => !FREE_CATEGORIES.includes(b.category));
    return { blocking: !!busy, reasonBlock: busy || null };
  }
  const work = active.find((b) => WORK_CATEGORIES.includes(b.category));
  return { blocking: !!work, reasonBlock: work || null };
}

async function evaluate(options = {}) {
  const stored = await getStored();

  if (!stored.token || !stored.apiUrl) {
    await setBlockingRules([]);
    await setBadge("");
    await chrome.storage.local.set({ status: { connected: false } });
    return;
  }

  let config = stored.configCache;
  const stale = Date.now() - (stored.configFetchedAt || 0) > CONFIG_TTL_MS;
  if (options.forceFetch || stale || !config) {
    try {
      config = await fetchConfig(stored.apiUrl, stored.token);
      await chrome.storage.local.set({
        configCache: config,
        configFetchedAt: Date.now(),
      });
    } catch (err) {
      if (String(err && err.message) === "unauthorized") {
        // Token revoked/invalid — disconnect rather than block forever.
        await chrome.storage.local.remove(["token", "configCache"]);
        await setBlockingRules([]);
        await setBadge("");
        await chrome.storage.local.set({ status: { connected: false } });
        return;
      }
      // Network hiccup: keep using the cached config if we have one.
    }
  }

  if (!config) {
    await chrome.storage.local.set({ status: { connected: true, loading: true } });
    return;
  }

  const settings = config.settings || {};
  const blocks = config.hasSchedule ? config.blocks : [];
  const { blocking, reasonBlock } = shouldBlock(settings, blocks);

  await setBlockingRules(blocking ? settings.blockedSites || [] : []);
  await setBadge(blocking ? "ON" : "");

  // The clock counts down the active work block (an assignment/study session).
  const activeWork = currentBlocks(blocks).find((b) => WORK_CATEGORIES.includes(b.category)) || null;
  const nextWork = findNextWorkBlock(blocks);

  await chrome.storage.local.set({
    status: {
      connected: true,
      hasSchedule: !!config.hasSchedule,
      blocking,
      showClock: settings.showClock !== false,
      activeBlock: activeWork
        ? { title: activeWork.title, endTime: activeWork.endTime }
        : reasonBlock
          ? { title: reasonBlock.title, endTime: reasonBlock.endTime }
          : null,
      nextBlock: nextWork
        ? { title: nextWork.title, day: nextWork.day, startTime: nextWork.startTime }
        : null,
      checkedAt: Date.now(),
    },
  });

  await maybeFlushUsage(stored);
}

// ——— Usage tracking (powers the Pro analytics card on the website) ———
// Once a minute, attribute a minute of active time to the focused tab's
// domain. Batched locally and flushed to the server every few minutes.

async function trackUsage() {
  try {
    const stored = await chrome.storage.local.get(["token", "usageBuffer"]);
    if (!stored.token) return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) return;
    let hostname;
    try {
      const url = new URL(tab.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      hostname = url.hostname.replace(/^www\./, "");
    } catch {
      return;
    }
    if (!hostname || !hostname.includes(".")) return;
    const day = localDayString();
    const buffer = stored.usageBuffer || {};
    const key = `${day}|${hostname}`;
    buffer[key] = (buffer[key] || 0) + 60;
    await chrome.storage.local.set({ usageBuffer: buffer });
  } catch {
    // tracking is best-effort
  }
}

function localDayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function maybeFlushUsage(stored) {
  const flushedAt = stored.usageFlushedAt || 0;
  if (Date.now() - flushedAt < USAGE_FLUSH_MS) return;
  const { usageBuffer } = await chrome.storage.local.get(["usageBuffer"]);
  const entries = Object.entries(usageBuffer || {}).map(([key, seconds]) => {
    const [day, domain] = key.split("|");
    return { day, domain, seconds };
  });
  if (!entries.length) {
    await chrome.storage.local.set({ usageFlushedAt: Date.now() });
    return;
  }
  try {
    const res = await fetch(`${stored.apiUrl.replace(/\/$/, "")}/extension/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.token}`,
      },
      body: JSON.stringify({ entries: entries.slice(0, 200) }),
    });
    if (res.ok) {
      await chrome.storage.local.set({ usageBuffer: {}, usageFlushedAt: Date.now() });
    }
  } catch {
    // keep the buffer, retry next flush window
  }
}

async function getStatus() {
  const data = await chrome.storage.local.get(["status", "token", "homeUrl", "apiUrl"]);
  const homeUrl =
    data.homeUrl ||
    (data.apiUrl ? `${data.apiUrl.replace(/\/api\/?$/, "")}/focus-guard` : null);
  return {
    connected: !!data.token,
    homeUrl,
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
  const addRules = (domains || [])
    .map(normalizeDomain)
    .filter(Boolean)
    .map((domain, i) => ({
      id: i + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" },
      },
      condition: {
        requestDomains: [domain],
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
