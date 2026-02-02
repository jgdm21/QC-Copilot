// Minimal background service worker with QCWT logging + eventual delivery
// Restores functionality after accidental truncation

const QCWT_PREFIX = '[QCWT]';
const log = (...a) => console.log(QCWT_PREFIX, ...a);
const warn = (...a) => console.warn(QCWT_PREFIX, ...a);
const err = (...a) => console.error(QCWT_PREFIX, ...a);

// ===== QC Copilot data sources (from previous stable version) =====
// Google Sheets CSV exports
// Curated artists now come from a specific column in a shared sheet
// Column: "Spotify and Apple Combined" (gid=573812010)
const QC_CURATED_COMBINED_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=573812010';
const QC_BLACKLIST_EMAILS_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=137283885';
const QC_BLACKLIST_ARTISTS_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=0';
const QC_BLACKLIST_LABELS_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=55458291';
const QC_SUSPICIOUS_TERMS_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=923800218';

// Tenant info (published CSVs)
const QC_TENANT_CONSIDERATIONS_CSV = 'https://docs.google.com/spreadsheets/d/191BKJj_8bRbzeAXEEoFxTzj3zhIdhOw504ylC4tNL6Q/export?format=csv&gid=578660392';
// Bump cache key to force-refresh considerations when sheet text changes
const QC_TENANT_CONSIDERATIONS_KEY = 'QC_TENANT_CONSIDERATIONS_TABLE_V2';
// QC Approach CSVs (tenant code in Name column -> QC Approach exact)
// Use the QC Agents Workload Tracker doc (same as Agent Colours)
const QC_APPROACH_TODAY_CSV = 'https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=1060948492';
const QC_APPROACH_YDAY_CSV  = 'https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=738619283';

// Zendesk proxy (Apps Script Web App)
const QC_ZENDESK_PROXY = 'https://script.google.com/macros/s/AKfycbxhT1vfIu7BiWLJIQkMr4WzYtajfjakYHhcNkw1u7DSWHNcljvIFTMmYTnHoL5Q8Q-b/exec';

// Suspicious email domains (hardcoded)
const QC_SUSPICIOUS_EMAIL_DOMAINS = [
  'protonmail.com','tutanota.com','mail.ru','yopmail.com','guerrillamail.com','10minutemail.com','cock.li','mailinator.com','hushmail.com','riseup.net'
];

// Caches TTL (ms)
const QC_LIST_TTL_MS = 24 * 60 * 60 * 1000;      // 24h for curated/blacklists
const QC_TERMS_TTL_MS = 5 * 60 * 1000;           // 5m for Suspicious Terms (faster updates)
const QC_TENANT_TTL_MS = 6 * 60 * 60 * 1000;     // 6h for tenant tables
const QC_ZENDESK_TTL_MS = 30 * 1000;             // 30s for zendesk proxy

// Storage helpers
function getLocal(keys) {
  return new Promise(res => {
    try { chrome.storage.local.get(keys, v => res(v || {})); } catch { res({}); }
  });
}
function setLocal(obj) {
  return new Promise(res => {
    try { chrome.storage.local.set(obj, () => res()); } catch { res(); }
  });
}

// Simple CSV first-field parser (handles quoted first column)
function csvFirstField(line) {
  if (!line) return '';
  let s = line.trim();
  if (!s) return '';
  if (s[0] === '"') {
    // find closing quote
    let i = 1, val = '';
    while (i < s.length) {
      if (s[i] === '"') {
        // if next char is quote, it's an escaped quote
        if (s[i+1] === '"') { val += '"'; i += 2; continue; }
        // end of quoted field
        return val.trim();
      }
      val += s[i];
      i++;
    }
    return val.trim();
  } else {
    const idx = s.indexOf(',');
    return (idx === -1 ? s : s.slice(0, idx)).trim();
  }
}
function parseCSVFirstColumn(text) {
  const out = [];
  if (!text) return out;
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = csvFirstField(lines[i]);
    // skip header-like row
    if (i === 0 && /^(name|artist|email|label|term)\b/i.test(raw)) continue;
    if (raw) out.push(raw);
  }
  return out;
}
function parseCSVRows(text) {
  if (!text) return [];
  const lines = String(text).split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // very simple split (will misparse complex CSVs but works for basic sheets)
    // prioritize first 4 columns
    const cols = [];
    let s = line, c = '', inQ = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"') {
        if (inQ && s[i+1] === '"') { c += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(c.trim()); c = '';
      } else {
        c += ch;
      }
    }
    cols.push(c.trim());
    rows.push(cols);
  }
  return rows;
}

async function loadCSVListCached(key, url, ttlMs) {
  const now = Date.now();
  const store = await getLocal([key]);
  const entry = store[key];
  if (entry && entry.expiresAt && entry.expiresAt > now && Array.isArray(entry.data)) {
    return entry.data;
  }
  const resp = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!resp.ok) return Array.isArray(entry?.data) ? entry.data : [];
  const text = await resp.text();
  const list = parseCSVFirstColumn(text)
    .map(x => String(x).trim())
    .filter(Boolean);
  await setLocal({ [key]: { data: list, expiresAt: now + ttlMs } });
  return list;
}

async function loadCSVTableCached(key, url, ttlMs) {
  const now = Date.now();
  const store = await getLocal([key]);
  const entry = store[key];
  if (entry && entry.expiresAt && entry.expiresAt > now && Array.isArray(entry.data)) {
    return entry.data;
  }
  const resp = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!resp.ok) return Array.isArray(entry?.data) ? entry.data : [];
  const text = await resp.text();
  const rows = parseCSVRows(text);
  await setLocal({ [key]: { data: rows, expiresAt: now + ttlMs } });
  return rows;
}

function normalizeStr(s) { return String(s || '').trim().toLowerCase(); }
function normalizeKey(s) { return normalizeStr(s).replace(/[^a-z0-9]/g, ''); }
// Normalize for fuzzy text matching in page content: lower, remove accents, drop punctuation, collapse spaces
function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9 ]+/g, ' ')      // remove punctuation/symbols, keep spaces
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();
}

async function computeTenantInfoByName(tenantName, tenantCodeFromData) {
  // Prefer explicit tenant code (one word) when available
  const code = tenantCodeFromData ? normalizeKey(tenantCodeFromData) : '';
  const name = code || normalizeKey(tenantName);
  if (!name) return null;
  try {
    const [consRows] = await Promise.all([
      loadCSVTableCached(QC_TENANT_CONSIDERATIONS_KEY, QC_TENANT_CONSIDERATIONS_CSV, QC_TENANT_TTL_MS)
    ]);
    // Considerations: assume [tenant, consideration]
    let consideration = '';
    for (const r of consRows) {
      if (!r || !r.length) continue;
      if (normalizeKey(r[0]) === name) { consideration = String(r[1] || '').trim(); break; }
    }
    // Removed Fraud Points integration (no longer used)
    // QC Approach lookup
    function mapApproachDescriptor(rawKey) {
      const k = String(rawKey || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      if (k === 'premium') {
        return { key: 'premium', label: 'Premium', color: '#FFF2CC', message: 'Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' };
      }
      if (k === 'pretir' || k === 'pretirtir') {
        return { key: 'pre-tir/tir', label: 'Pre‑TIR / TIR', color: '#F4CCCC', message: 'Client under review; do not perform QC while this status is active.' };
      }
      if (k === 'toppriority' || k === 'priority') {
        return { key: 'top-priority', label: 'Top Priority', color: '#A4C2F4', message: 'Prioritize reviews while respecting the tenant’s support level (premium or standard).' };
      }
      if (k === 'standard') {
        return { key: 'standard', label: 'Standard', color: '#FFFFFF', message: 'Approve/reject only. Do not create tickets.' };
      }
      if (k === 'graceperiod' || k === 'grace') {
        return { key: 'grace-period', label: 'Grace Period', color: '#D9D2E9', message: 'New client. Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' };
      }
      if (k === 'posttirontrial') {
        return { key: 'post-tir-on-trial', label: 'Post‑TIR on trial', color: '#D9EAD3', message: 'Approve/reject only. Do not create tickets. Inform the manager if fraudulent content is detected.' };
      }
      if (k === 'posttir') {
        return { key: 'post-tir', label: 'Post‑TIR', color: '#EFEFEF', message: 'Approve/reject only. Do not create tickets.' };
      }
      return null;
    }

    async function fetchApproachRows() {
      // Always fetch fresh (no storage cache) to reflect midday changes
      const [tResp, yResp] = await Promise.all([
        fetch(QC_APPROACH_TODAY_CSV, { method: 'GET', cache: 'no-store' }),
        fetch(QC_APPROACH_YDAY_CSV, { method: 'GET', cache: 'no-store' })
      ]);
      const [tText, yText] = await Promise.all([
        tResp.ok ? tResp.text() : Promise.resolve(''),
        yResp.ok ? yResp.text() : Promise.resolve('')
      ]);
      return { today: parseCSVRows(tText), yday: parseCSVRows(yText) };
    }

    function lookupApproach(rows) {
      try {
        if (Array.isArray(rows) && rows.length) {
          const header = rows[0].map(x => String(x || '').toLowerCase());
          // In this doc, tenant code is in column 'Name'
          let tIdx = header.findIndex(h => h.trim() === 'name' || /tenant/.test(h));
          let aIdx = header.findIndex(h => /qc\s*approach/i.test(h) || /approach/.test(h));
          const start = (tIdx !== -1 && aIdx !== -1) ? 1 : 0;
          if (tIdx === -1) tIdx = 0;
          if (aIdx === -1) aIdx = 1;
          for (let i = start; i < rows.length; i++) {
            const r = rows[i];
            if (!r || !r.length) continue;
            if (normalizeKey(r[tIdx]) === name) {
              const desc = mapApproachDescriptor(r[aIdx]);
              if (desc) return desc;
            }
          }
        }
      } catch(_) {}
      return null;
    }
    // Fetch latest approach rows and resolve; Today takes precedence
    let qcApproach = null;
    try {
      const { today: approachTodayRows, yday: approachYdayRows } = await fetchApproachRows();
      qcApproach = lookupApproach(approachTodayRows) || lookupApproach(approachYdayRows) || null;
    } catch(_) {}

    return { tenant: tenantCodeFromData || tenantName, consideration, qcApproach };
  } catch (e) {
    warn('computeTenantInfoByName error', e);
    return null;
  }
}

async function getZendeskInfoCached(email) {
  const key = `QC_ZENDESK_${normalizeStr(email)}`;
  const now = Date.now();
  try {
    const store = await getLocal([key]);
    const entry = store[key];
    if (entry && entry.expiresAt && entry.expiresAt > now) return entry.data;
  } catch {}
  try {
    const url = `${QC_ZENDESK_PROXY}?email=${encodeURIComponent(email)}`;
    const resp = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const payload = {
      status: data?.status || 'ok',
      ticketCount: Number(data?.ticketCount || 0),
      fraudTickets: Number(data?.fraudTickets || 0),
      lastUpdated: Date.now()
    };
    await setLocal({ [key]: { data: payload, expiresAt: now + QC_ZENDESK_TTL_MS } });
    return payload;
  } catch (e) {
    return { status: 'error', ticketCount: -1, fraudTickets: -1 };
  }
}

// Outbox for retries
const OUTBOX_KEY = 'QCWT_outbox';
const BACKOFF_MIN = [1, 5, 15, 60];
const RECENT_WINDOW_MS = 7000; // dedupe short window
const recentMap = new Map(); // key -> ts

// Apps Script endpoint (server routes to gid=1696267429 internally)
const APPS_SCRIPT_EXEC = 'https://script.google.com/macros/s/AKfycbyPfR1YnIIuqTF1F0ssivgcNXV5GxvPlMsdn4dPNwA4wtHyjQFn6nMNmWMpjU5B-MEO9Q/exec';

// Helpers storage
function getOutbox() {
  return new Promise(res => {
    try { chrome.storage.local.get(OUTBOX_KEY, r => res(Array.isArray(r[OUTBOX_KEY]) ? r[OUTBOX_KEY] : [])); }
    catch { res([]); }
  });
}
function saveOutbox(list) {
  return new Promise(res => {
    try { chrome.storage.local.set({ [OUTBOX_KEY]: list }, () => res()); } catch { res(); }
  });
}
async function enqueue(payload, reason) {
  const list = await getOutbox();
  list.push({ payload, tries: 0, nextAttemptAt: Date.now() + 30 * 1000, lastError: reason || '' });
  await saveOutbox(list);
  warn('Queued QCWT payload for retry', { reason, size: list.length });
}
async function processOutbox() {
  const list = await getOutbox();
  const now = Date.now();
  let changed = false;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (!it || now < (it.nextAttemptAt || 0)) continue;
    log('Retrying QCWT payload', { tries: it.tries, next: new Date(it.nextAttemptAt).toISOString() });
    try {
      await sendToAppsScript(it.payload);
      list.splice(i, 1); i--; changed = true;
    } catch (e) {
      const idx = Math.min(it.tries, BACKOFF_MIN.length - 1);
      it.tries = (it.tries || 0) + 1;
      it.nextAttemptAt = Date.now() + BACKOFF_MIN[idx] * 60 * 1000;
      it.lastError = String(e || 'unknown');
      changed = true;
    }
  }
  if (changed) await saveOutbox(list);
}

try {
  chrome.runtime.onInstalled.addListener(() => { try { chrome.alarms.create('QCWT_OUTBOX', { periodInMinutes: 1 }); } catch {} });
  chrome.runtime.onStartup.addListener(() => { try { chrome.alarms.create('QCWT_OUTBOX', { periodInMinutes: 1 }); } catch {}; processOutbox(); });
  chrome.alarms.onAlarm.addListener(a => { if (a && a.name === 'QCWT_OUTBOX') processOutbox(); });
} catch (e) { warn('alarms setup failed', e); }

// Messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;

  if (request.action === 'QCWT_HTTP_GET' && request.url) {
    (async () => {
      try {
        const resp = await fetch(request.url, { method: 'GET' });
        const text = await (async () => { try { return await resp.text(); } catch { return '<unreadable>'; } })();
        sendResponse({ ok: resp.ok, status: resp.status, text, url: request.url });
      } catch (e) { sendResponse({ ok: false, error: String(e) }); }
    })();
    return true;
  }

  if (request.action === 'QC_CLEAR_CACHE') {
    (async () => {
      try {
        const all = await new Promise(res => chrome.storage.local.get(null, res));
        const toRemove = [];
        const allowlist = new Set([
          'selectedAgent',
          'qcwt.selectedAgent',
          'releaseData',          // keep current release payload to avoid spinner after cache clear
          'qcLastReleaseData'     // keep any mirrored copy if present
        ]);
        const keepPrefixes = []; // keep most user prefs
        for (const k of Object.keys(all || {})) {
          if (allowlist.has(k)) continue;
          if (
            k === 'QC_CURATED_TABLE' ||
            k === 'QC_CURATED_ARTISTS' ||
            k === 'QC_BLACKLIST_EMAILS' ||
            k === 'QC_BLACKLIST_ARTISTS' ||
            k === 'QC_BLACKLIST_LABELS' ||
            k === 'QC_SUSPICIOUS_TERMS' ||
            k === 'QC_TENANT_CONSIDERATIONS_TABLE' || // old key cleanup
            k === QC_TENANT_CONSIDERATIONS_KEY ||
            k === 'QC_APPROACH_TODAY_TABLE' ||
            k === 'QC_APPROACH_YDAY_TABLE' ||
            k.startsWith('QC_ZENDESK_') ||
            k === 'QCWT_queueSnapshot'
          ) {
            toRemove.push(k);
          }
        }
        if (toRemove.length) await new Promise(res => chrome.storage.local.remove(toRemove, () => res()));
        sendResponse && sendResponse({ ok: true, removed: toRemove });
      } catch (e) {
        sendResponse && sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (request.action === 'QCWT_DIRECT_SEND' && request.payload) {
    log('QCWT_DIRECT_SEND received', { fromTab: sender?.tab?.id, payload: request.payload });
    sendToAppsScript(request.payload);
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'QCWT_OPEN_URL' && request.url) {
    const targetUrl = request.url;
    (async () => {
      try {
        const tabs = await new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, res));
        if (tabs && tabs[0]) {
          await new Promise(res => chrome.tabs.update(tabs[0].id, { url: targetUrl }, () => res()));
          sendResponse && sendResponse({ ok: true });
        } else {
          await new Promise(res => chrome.tabs.create({ url: targetUrl }, () => res()));
          sendResponse && sendResponse({ ok: true, created: true });
        }
      } catch (e) {
        sendResponse && sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (request.action === 'QCWT_RETRY_NOW') {
    processOutbox();
    sendResponse && sendResponse({ ok: true });
    return true;
  }

  // ===== QC Copilot: validateRelease =====
  // Builds validations (flags) from the stored releaseData and performs
  // follow-up async lookups (Zendesk) without blocking the initial render.
  if (request.action === 'validateRelease') {
    try {
      chrome.storage.local.get(['releaseData'], ({ releaseData }) => {
        (async () => {
          try {
            const rd = releaseData || {};
            const flags = { blacklistEmails: [], blacklistArtists: [], blacklistLabels: [], curatedArtists: [], terms: [] };

            // Load lists (cached)
            // Curated artists: load full table and extract the column "Spotify and Apple Combined"
            const [curatedTable, blEmails, blArtists, blLabels, suspTerms] = await Promise.all([
              loadCSVTableCached('QC_CURATED_TABLE', QC_CURATED_COMBINED_CSV, QC_LIST_TTL_MS),
              loadCSVListCached('QC_BLACKLIST_EMAILS', QC_BLACKLIST_EMAILS_CSV, QC_LIST_TTL_MS),
              loadCSVListCached('QC_BLACKLIST_ARTISTS', QC_BLACKLIST_ARTISTS_CSV, QC_LIST_TTL_MS),
              loadCSVListCached('QC_BLACKLIST_LABELS', QC_BLACKLIST_LABELS_CSV, QC_LIST_TTL_MS),
              loadCSVListCached('QC_SUSPICIOUS_TERMS', QC_SUSPICIOUS_TERMS_CSV, QC_TERMS_TTL_MS)
            ]);

            // Aggregate text for matching
            const allTextRaw = String(rd.allTextRaw || '').replace(/\s+/g, ' ').trim();
            const allText = allTextRaw.toLowerCase();
            const allTextNorm = normalizeForMatch(allTextRaw);

            // Build curated list from the requested column
            let curatedList = [];
            try {
              if (Array.isArray(curatedTable) && curatedTable.length > 0) {
                const header = (curatedTable[0] || []).map(x => String(x || ''));
                const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
                const target = 'spotifyandapplecombined';
                let idx = header.findIndex(h => norm(h) === target);
                if (idx === -1) {
                  // Fallback: pick a column that mentions spotify and apple
                  idx = header.findIndex(h => {
                    const l = String(h || '').toLowerCase();
                    return l.includes('spotify') && l.includes('apple');
                  });
                }
                if (idx === -1) idx = 0; // ultimate fallback: first column
                curatedList = curatedTable.slice(1)
                  .map(r => String((r && r[idx]) || '').trim())
                  .filter(Boolean);
              }
            } catch (_) {}

            // ---- Suspicious terms ----
            const foundTerms = new Set();
            suspTerms.forEach(t => { const n = String(t).trim(); if (!n) return; if (allText.includes(n.toLowerCase())) foundTerms.add(n); });
            if (foundTerms.size) flags.terms = Array.from(foundTerms).sort();

            // ---- Blacklisted labels ----
            const foundLabels = new Set();
            blLabels.forEach(n => {
              const v = String(n).trim();
              if (!v) return;
              const vNorm = normalizeForMatch(v);
              if (vNorm && allTextNorm.includes(vNorm)) foundLabels.add(v);
            });
            if (foundLabels.size) flags.blacklistLabels = Array.from(foundLabels);

            // ---- Blacklisted emails (exact match from sheet) ----
            try {
              const emailRaw = String(rd.cards?.User?.Email || '').trim();
              // Extraer el primer email válido que aparezca en el texto
              const match = emailRaw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
              const email = match ? match[0].toLowerCase() : '';
              if (email) {
                const blEmailsLower = blEmails.map(e => String(e).trim().toLowerCase());
                if (blEmailsLower.includes(email)) {
                  flags.blacklistEmails.push(email);
                }
              }
            } catch(_) {}

            // Extra: buscar emails en todo allTextRaw contra la blacklist
            try {
              const blEmailsLower = new Set(
                blEmails.map(e => String(e).trim().toLowerCase()).filter(Boolean)
              );
              const emailsFound = new Set(flags.blacklistEmails || []);
              const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
              const textToScan = String(rd.allTextRaw || '');
              let match;
              while ((match = emailRegex.exec(textToScan)) !== null) {
                const email = match[0].toLowerCase();
                if (blEmailsLower.has(email)) {
                  emailsFound.add(email);
                }
              }
              if (emailsFound.size) {
                flags.blacklistEmails = Array.from(emailsFound);
              }
            } catch(_) {}

            // ---- Suspicious email domains (hardcoded list) ----
            try {
              const email = String(rd.cards?.User?.Email || '').trim().toLowerCase();
              const domain = email.includes('@') ? email.split('@')[1] : '';
              if (domain && QC_SUSPICIOUS_EMAIL_DOMAINS.includes(domain)) {
                flags.suspiciousEmailDomains = [domain];
              }
            } catch(_) {}

            // ---- Blacklisted artists ----
            const foundBLArtists = new Set();
            blArtists.forEach(n => {
              const v = String(n).trim();
              if (!v) return;
              const vNorm = normalizeForMatch(v);
              if (vNorm && allTextNorm.includes(vNorm)) foundBLArtists.add(v);
            });
            if (foundBLArtists.size) flags.blacklistArtists = Array.from(foundBLArtists);

            // ---- Curated artists ----
            // Heuristics to reduce false positives:
            // - Single-word names (any length): match ONLY within artist fields
            //   (avoids "Shame" in title "Shame on U")
            // - Multi-word names (e.g., "Bad Bunny"): also search in titles/all text
            //   (catches "I feel like Bad Bunny" in titles)
            // - For very short names (len <=2): require exact equality of an artist token
            const foundCurated = new Set();
            // Build artists-only normalized text and token set
            const artistNormValues = [];
            try {
              const addVal = (s) => { const v = normalizeForMatch(s); if (v) artistNormValues.push(v); };
              const aRelease = rd.basicInfo?.Artists || {};
              Object.values(aRelease).forEach(addVal);
              const tss2 = Array.isArray(rd.trackSections) ? rd.trackSections : [];
              tss2.forEach(t => {
                const a = t?.sections?.Artists || {};
                Object.values(a).forEach(addVal);
              });
            } catch(_) {}
            const artistsNormText = artistNormValues.join(' ').trim();
            const pad = (s) => ` ${s} `;
            const paddedAll = pad(allTextNorm);
            const paddedArtists = pad(artistsNormText);
            const artistWordSet = new Set(artistsNormText.split(' ').filter(Boolean));

            curatedList.forEach(n => {
              const original = String(n).trim();
              if (!original) return;
              const norm = normalizeForMatch(original);
              if (!norm) return;

              const wordCount = norm.split(' ').filter(Boolean).length;
              const isMultiWord = wordCount >= 2;

              if (norm.length <= 2) {
                // Very short names: only if an artist token equals exactly
                if (artistWordSet.has(norm)) foundCurated.add(original);
              } else if (isMultiWord) {
                // Multi-word names (e.g., "Bad Bunny"): search in ALL text including titles
                // because multi-word matches are unlikely to be false positives
                if (paddedAll.includes(` ${norm} `)) foundCurated.add(original);
              } else {
                // Single-word names (3+ chars): ONLY match within artist fields
                // This prevents "Shame" matching in title "Shame on U"
                if (paddedArtists.includes(` ${norm} `)) foundCurated.add(original);
              }
            });
            if (foundCurated.size) {
              const seenCurated = new Set();
              const uniqueCurated = [];
              Array.from(foundCurated).forEach(name => {
                const key = name.toLowerCase().trim();
                if (seenCurated.has(key)) return;
                seenCurated.add(key);
                uniqueCurated.push(name);
              });
              flags.curatedArtists = uniqueCurated;
            }

            // ---- Product-level explicit detection ----
            // Only consider the Basic Information > Explicit field.
            // Trigger when it equals exactly "explicit" (case/space-insensitive).
            // If it says "non explicit", do not flag.
            let explicitFound = false;
            try {
              const explicitVal = String(rd.basicInfo?.Metadata?.Explicit || '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ');
              if (explicitVal === 'explicit') explicitFound = true;
            } catch(_) {}

            // ---- Audio matches from page alerts ----
            let audioMatchTracks = [];
            try {
              const tss = Array.isArray(rd.trackSections) ? rd.trackSections : [];
              audioMatchTracks = tss.filter(t => t && (t.hasAlert === true)).map(t => {
                const num = t.displayNumber || (typeof t.trackIndex === 'number' ? (t.trackIndex + 1) : '?');
                return `Track ${num}: ${t.header || 'Unknown Track'}`;
              });
            } catch(_) {}

            // ---- Tenant info (from CSVs) ----
            let tenantInfo = null;
            try {
              const tName = rd.tenantName || rd.cards?.Tenant || '';
              const tCode = rd.tenantCode || '';
              tenantInfo = await computeTenantInfoByName(tName, tCode);
            } catch(_) {}

            // Prepare initial response; zendesk marked as searching if email present
            const initialZendesk = (rd.cards?.User?.Email ? { status: 'searching' } : null);

            sendResponse({
              flags,
              releaseData: rd,
              audioMatchTracks,
              explicitFound,
              previouslyRejected: !!(rd && rd.previouslyRejected),
              zendeskInfo: initialZendesk,
              tenantInfo
            });

            // Follow-up: Zendesk lookup (non-blocking, via Apps Script proxy, 30s cache)
            try {
              const requesterEmail = String(rd.cards?.User?.Email || '').trim();
              const targetTabId = sender && sender.tab && sender.tab.id;
              if (requesterEmail && targetTabId) {
                const info = await getZendeskInfoCached(requesterEmail);
                try { chrome.tabs.sendMessage(targetTabId, { action: 'updateZendeskInfo', zendeskInfo: info }); } catch {}
              }
            } catch(_) {}
          } catch (inner) {
            sendResponse({ error: String(inner) });
          }
        })();
      });
    } catch (e) {
      sendResponse({ error: String(e) });
    }
    return true;
  }
});

// Intercept approve/reject/changes requests
try {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.method !== 'POST') return;
      const url = (details.url || '').toLowerCase();
      if (url.includes('/revisions')) {
        log('onBeforeRequest POST', { url, tabId: details.tabId });
      }
      let actionType = '';
      const isApprove = /\/revisions\/.+\/approve(\b|\?|#)/.test(url) || /\/revisions\/approve(\b|\?|#)/.test(url) || /\/api\/v\d+\/quality-control\/revisions\/.+\/approve(\b|\?|#)/.test(url);
      const isReject  = /\/revisions\/.+\/reject(\b|\?|#)/.test(url)  || /\/revisions\/reject(\b|\?|#)/.test(url)  || /\/api\/v\d+\/quality-control\/revisions\/.+\/reject(\b|\?|#)/.test(url);
      const isChange  = /client[-_]action[-_]?required/.test(url);
      if (isApprove) actionType = 'approve'; else if (isReject) actionType = 'reject'; else if (isChange) actionType = 'changes';
      if (!actionType) return;

      log('Intercept POST', { url: details.url, tabId: details.tabId, actionType });

      buildFallbackPayload(details, actionType).then((fallback) => {
        const targetTabId = details.tabId;
        if (targetTabId === -1 || targetTabId === undefined) {
          warn('onBeforeRequest without valid tabId', details.url);
          if (fallback) finalizeAndSendAggregate(fallback);
          return;
        }
        chrome.tabs.sendMessage(targetTabId, { action: 'FETCH_QC_DATA', type: actionType }, (response) => {
          if (!response) {
            const lastErr = chrome.runtime.lastError && chrome.runtime.lastError.message;
            warn('No response from content script (FETCH_QC_DATA)', { lastErr, targetTabId });
            if (fallback) finalizeAndSendAggregate(fallback);
            return;
          }
          // Merge DOM + fallback
          const domPayload = {
            tenantCode: response.tenantCode || '',
            tenantName: response.tenantName || '',
            releaseIds: Array.isArray(response.releaseIds) ? response.releaseIds : [],
            type: response.type || actionType,
            reason: response.reasons || '',
            location: response.location || 'unknown'
          };
          const merged = { ...domPayload };
          if (fallback) {
            if (!merged.tenantCode && fallback.tenantCode) merged.tenantCode = fallback.tenantCode;
            if (!merged.tenantName && (fallback.tenantName || fallback.tenantCode)) merged.tenantName = fallback.tenantName || fallback.tenantCode;
            const a = Array.isArray(merged.releaseIds) ? merged.releaseIds : [];
            const b = Array.isArray(fallback.releaseIds) ? fallback.releaseIds : [];
            let union = Array.from(new Set([...a, ...b].map(x => String(x).trim()).filter(Boolean)));
            const numericOnly = union.filter(id => /^\d+$/.test(id));
            if (numericOnly.length > 0) union = numericOnly; // prefer numeric release IDs (ignore UUIDs)
            merged.releaseIds = union;
            if (!merged.reason && fallback.reason) merged.reason = fallback.reason;
            if (!merged.location && fallback.location) merged.location = fallback.location;
            if (!merged.type && fallback.type) merged.type = fallback.type;
          }
          finalizeAndSendAggregate(merged);
          try { chrome.runtime.sendMessage({ action: 'QCWT_ACTION', type: actionType }); } catch {}
        });
      });
    },
    { urls: ['https://backoffice.sonosuite.com/*'] },
    ['requestBody']
  );
} catch (e) { err('webRequest listener failed to register:', e); }

// Finalize payload and send
function finalizeAndSendAggregate(partial) {
  chrome.storage.local.get(['selectedAgent', 'qcwt.selectedAgent'], (data) => {
    const agent = data['selectedAgent'] || data['qcwt.selectedAgent'] || '';
    const releases = Array.isArray(partial.releaseIds)
      ? partial.releaseIds
      : (typeof partial.releaseId === 'string' ? partial.releaseId.split(/\s*,\s*/) : []);
    let releaseIds = Array.from(new Set(releases.map(r => (r || '').trim()).filter(Boolean)));
    const numericOnly = releaseIds.filter(id => /^\d+$/.test(id));
    if (numericOnly.length > 0) releaseIds = numericOnly;

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const payload = {
      date: `${dd}/${mm}/${yyyy}`,
      time: new Date().toLocaleTimeString('en-GB'),
      agent,
      tenantCode: partial.tenantCode || '',
      tenantName: partial.tenantName || partial.tenantCode || '',
      releaseIds,
      releaseId: releaseIds.join(', '),
      type: partial.type || '',
      reason: partial.reason || '',
      location: partial.location || 'unknown'
    };

    // Dedupe short window (normalize by preferring numeric IDs only)
    try {
      const idsForKey = (payload.releaseIds && payload.releaseIds.length)
        ? (payload.releaseIds.some(x => /^\d+$/.test(x))
            ? payload.releaseIds.filter(x => /^\d+$/.test(x))
            : payload.releaseIds)
        : [];
      const key = `${payload.type}|${idsForKey.slice().sort().join(',')}`;
      const nowTs = Date.now();
      const last = recentMap.get(key) || 0;
      if (recentMap.size > 200) { for (const [k, ts] of recentMap.entries()) { if (nowTs - ts > 60000) recentMap.delete(k); } }
      if (nowTs - last < RECENT_WINDOW_MS) { warn('Skip duplicate send (recent window)', { key }); return; }
      recentMap.set(key, nowTs);
    } catch {}

    log('Built payload (aggregate)', payload);
    try { chrome.storage.local.set({ QCWT_lastAction: { ts: Date.now(), type: payload.type || '' } }); } catch {}
    try { chrome.runtime.sendMessage({ action: 'QCWT_ACTION', type: payload.type || '' }); } catch {}
    sendToAppsScript(payload);
  });
}

// Fallback payload builder using request body + stored snapshot
async function buildFallbackPayload(details, actionType) {
  try {
    let revisionIds = [];
    let reasons = [];
    const rb = details.requestBody || {};
    if (rb.formData) {
      for (const [k, v] of Object.entries(rb.formData)) {
        if (/^revision_id(\[\])?$/i.test(k)) revisionIds = revisionIds.concat(v);
        if (/^reject_reasons_codes(\[\])?$/i.test(k)) reasons = reasons.concat(v);
      }
    } else if (rb.raw && rb.raw.length) {
      try {
        const bytes = rb.raw[0].bytes;
        const text = new TextDecoder().decode(bytes);
        log('fallback: raw body', (text || '').slice(0, 200));
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json.ids)) revisionIds = revisionIds.concat(json.ids.map(String));
          if (Array.isArray(json.reasons)) reasons = reasons.concat(json.reasons.map(String));
        } catch (_) {
          const params = new URLSearchParams(text);
          params.forEach((val, key) => {
            if (/^revision_id(\[\])?$/i.test(key)) revisionIds.push(val);
            if (/^reject_reasons_codes(\[\])?$/i.test(key)) reasons.push(val);
          });
        }
      } catch (e) { warn('fallback: unable to parse raw body', e); }
    }
    const snapshot = await new Promise(resolve => { chrome.storage.local.get('QCWT_queueSnapshot', r => resolve(r.QCWT_queueSnapshot || {})); });
    const tenantCode = snapshot.tenantCode || '';
    const releaseIds = ((snapshot.releaseIds && snapshot.releaseIds.length) ? snapshot.releaseIds : revisionIds).map(String);
    const reason = (reasons.length ? reasons : (snapshot.reasons || [])).join(', ');
    const location = revisionIds.length > 0 ? 'queue' : (snapshot.location || 'queue');
    const out = { tenantCode, releaseIds, releaseId: releaseIds.join(', '), type: actionType, reason, location };
    log('Built fallback payload', out);
    return out;
  } catch (e) {
    warn('buildFallbackPayload error', e);
    return { type: actionType, location: 'queue' };
  }
}

async function sendToAppsScript(data) {
  // Tracking disabled: skip sending payloads to Apps Script to avoid registering reviewed launches
  try { log('Skipping Apps Script send (tracking disabled)', { preview: data }); } catch (_) {}
  try { chrome.runtime.sendMessage({ action: 'QCWT_SENT', ok: true, skipped: true }); } catch (_) {}
}
