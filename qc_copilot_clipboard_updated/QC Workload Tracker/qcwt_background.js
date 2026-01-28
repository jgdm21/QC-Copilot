// Debug helpers with consistent prefix
const QC_LOG_PREFIX = "[QCWT]"; // filter by this in console
const qclog = (...args) => console.log(QC_LOG_PREFIX, ...args);
const qcwarn = (...args) => console.warn(QC_LOG_PREFIX, ...args);
const qcerr = (...args) => console.error(QC_LOG_PREFIX, ...args);

qclog("background service worker loaded");
chrome.runtime.onInstalled.addListener(() => qclog("onInstalled"));
chrome.runtime.onStartup.addListener(() => qclog("onStartup"));

let __qcwtLastActionTabId = null; // remember the last tab that initiated an action

// Fallback: allow content script to send payloads directly
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;
  if (msg.action === "QCWT_DIRECT_SEND" && msg.payload) {
    qclog("Received QCWT_DIRECT_SEND", { fromTab: sender?.tab?.id, payload: msg.payload });
    try { if (sender?.tab?.id != null) __qcwtLastActionTabId = sender.tab.id; } catch {}
    sendToAppsScript(msg.payload);
    sendResponse && sendResponse({ ok: true });
    return; // synchronous
  }
  if (msg.action === "QCWT_HTTP_GET" && msg.url) {
    // Proxy GET through background to avoid CSP/CORS issues
    (async () => {
      try {
        const resp = await fetch(msg.url, { method: 'GET' });
        const text = await safeReadText(resp);
        sendResponse({ ok: resp.ok, status: resp.status, text, url: msg.url });
      } catch (e) {
        sendResponse({ ok: false, error: String(e), url: msg.url });
      }
    })();
    return true; // keep the message channel open for async response
  }
});

// Listen to network requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === "POST") {
      qclog("Intercept POST", { url: details.url, tabId: details.tabId });
      let actionType = "";
      if (details.url.includes("/quality-control/revisions/approve")) actionType = "approve";
      if (details.url.includes("/quality-control/revisions/reject")) actionType = "reject";
      if (details.url.includes("/quality-control/revisions/client-action-required")) actionType = "changes";

      if (actionType) {
        qclog("Detected actionType", actionType);
        try { __qcwtLastActionTabId = details.tabId; } catch {}
        // Proactively notify the source tab (content script) that an action occurred
        try { if (__qcwtLastActionTabId != null) chrome.tabs.sendMessage(__qcwtLastActionTabId, { action: 'QCWT_ACTION', type: actionType }); } catch {}
        // Build fallback from request body + snapshot
        buildFallbackPayload(details, actionType).then((fallback) => {
          // Ask the specific tab where the request originated
          const targetTabId = details.tabId;
          if (targetTabId === -1 || targetTabId === undefined) {
            qcwarn("onBeforeRequest without valid tabId", details.url);
            if (fallback) finalizeAndSendAggregate(fallback);
            return;
          }

          qclog("Sending message to tab", { targetTabId, type: actionType });
          chrome.tabs.sendMessage(targetTabId, { action: "FETCH_QC_DATA", type: actionType }, (response) => {
            if (!response) {
              const lastErr = chrome.runtime.lastError && chrome.runtime.lastError.message;
              qcwarn("No response from content script", { lastErr, targetTabId });
              if (fallback) finalizeAndSendAggregate(fallback);
              return;
            }

            // Always prefer release IDs from network payload (fallback), unify format
            const payload = {
              tenantCode: response.tenantCode || "",
              tenantName: response.tenantName || "",
              releaseIds: (Array.isArray(fallback?.releaseIds) && fallback.releaseIds.length)
                ? fallback.releaseIds
                : (response.releaseIds || []),
              type: response.type || actionType,
              reason: response.reasons || fallback?.reason || "",
              location: response.location || fallback?.location || "unknown"
            };
            finalizeAndSendAggregate(payload);
          });
        });
      }
    }
  },
  { urls: ["https://backoffice.sonosuite.com/*"] },
  ["requestBody"]
);

async function sendToAppsScript(data) {
  const url = "https://script.google.com/macros/s/AKfycbyPfR1YnIIuqTF1F0ssivgcNXV5GxvPlMsdn4dPNwA4wtHyjQFn6nMNmWMpjU5B-MEO9Q/exec";
  try {
    qclog("POST to Apps Script", { url, preview: data });
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!resp.ok) {
      const text = await safeReadText(resp);
      qcerr("Apps Script HTTP error", resp.status, text);
      return;
    }

    // Attempt to read JSON response if available
    let result;
    try {
      result = await resp.json();
    } catch (_) {
      const text = await safeReadText(resp);
      qclog("Apps Script non-JSON response", text);
      return;
    }
    if (result && result.status !== "success") {
      qcerr("Apps Script returned error", result);
      try { if (__qcwtLastActionTabId != null) chrome.tabs.sendMessage(__qcwtLastActionTabId, { action: 'QCWT_SENT', ok: false, result }); } catch {}
    } else {
      qclog("Apps Script success", result);
      try { if (__qcwtLastActionTabId != null) chrome.tabs.sendMessage(__qcwtLastActionTabId, { action: 'QCWT_SENT', ok: true, result }); } catch {}
    }
  } catch (err) {
    qcerr("Failed to send to Apps Script", err);
    try { if (__qcwtLastActionTabId != null) chrome.tabs.sendMessage(__qcwtLastActionTabId, { action: 'QCWT_SENT', ok: false, error: String(err) }); } catch {}
  }
}

async function safeReadText(resp) {
  try { return await resp.text(); } catch { return "<unreadable response>"; }
}

function finalizeAndSendAggregate(partial) {
  chrome.storage.local.get("selectedAgent", (data) => {
    const releases = Array.isArray(partial.releaseIds)
      ? partial.releaseIds
      : (typeof partial.releaseId === "string" ? partial.releaseId.split(/\s*,\s*/) : []);
    const releaseIds = Array.from(new Set(releases.map(r => (r || "").trim()).filter(Boolean)));

    // Format date as DD/MM/YYYY to match Google Sheets format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const payload = {
      date: formattedDate,
      time: new Date().toLocaleTimeString("en-GB"),
      agent: data.selectedAgent || "",
      tenantCode: partial.tenantCode || "",
      tenantName: partial.tenantName || partial.tenantCode || "", // Add tenant name for better matching
      releaseIds: releaseIds,
      // also include joined string for backwards compatibility
      releaseId: releaseIds.join(", "),
      type: partial.type || "",
      reason: partial.reason || "",
      location: partial.location || "unknown"
    };
    qclog("Built payload (aggregate)", payload);
    sendToAppsScript(payload);
  });
}

async function buildFallbackPayload(details, actionType) {
  try {
    let revisionIds = [];
    let reasons = [];
    // Parse requestBody
    const rb = details.requestBody || {};
    if (rb.formData) {
      for (const [k, v] of Object.entries(rb.formData)) {
        if (/^revision_id(\[\])?$/i.test(k)) {
          revisionIds = revisionIds.concat(v);
        }
        if (/^reject_reasons_codes(\[\])?$/i.test(k)) {
          reasons = reasons.concat(v);
        }
      }
    } else if (rb.raw && rb.raw.length) {
      try {
        const bytes = rb.raw[0].bytes;
        const text = new TextDecoder().decode(bytes);
        qclog("fallback: raw body", text.slice(0, 200));
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json.ids)) revisionIds = json.ids.map(String);
          if (Array.isArray(json.reasons)) reasons = json.reasons.map(String);
        } catch (_) {
          // maybe urlencoded
          const params = new URLSearchParams(text);
          params.forEach((val, key) => {
            if (/^revision_id(\[\])?$/i.test(key)) revisionIds.push(val);
            if (/^reject_reasons_codes(\[\])?$/i.test(key)) reasons.push(val);
          });
        }
      } catch (e) {
        qcwarn("fallback: unable to parse raw body", e);
      }
    }

    // If still no IDs, try to parse from URL (individual revision)
    let parsedFromUrl = false;
    if (revisionIds.length === 0) {
      try {
        const m = (details.url || '').match(/\/revisions\/(\d+)/i);
        if (m && m[1]) { revisionIds.push(m[1]); parsedFromUrl = true; }
      } catch (_) {}
    }

    // Pull snapshot from storage (tenant/release mapping if any)
    const snapshot = await new Promise((resolve) => {
      chrome.storage.local.get("QCWT_queueSnapshot", (r) => resolve(r.QCWT_queueSnapshot || {}));
    });

    const tenantCode = snapshot.tenantCode || "";
    // Always prefer network payload IDs; fallback to snapshot only if none found
    const releaseIds = (revisionIds.length ? revisionIds : (Array.isArray(snapshot.releaseIds) ? snapshot.releaseIds : [])).map(String);
    const reason = (reasons.length ? reasons : (snapshot.reasons || [])).join(", ");
    const location = parsedFromUrl ? "individual" : (revisionIds.length > 0 ? "queue" : (snapshot.location || "queue"));

    const out = { tenantCode, releaseIds, releaseId: releaseIds.join(", "), type: actionType, reason, location };
    qclog("Built fallback payload", out);
    return out;
  } catch (e) {
    qcwarn("buildFallbackPayload error", e);
    return { type: actionType, location: "queue" };
  }
}
