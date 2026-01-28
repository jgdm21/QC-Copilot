// Content script for QC Workload Tracker
const QC_LOG_PREFIX = "[QCWT]"; // filter by this in console
const qclog = (...args) => console.log(QC_LOG_PREFIX, ...args);
const qcwarn = (...args) => console.warn(QC_LOG_PREFIX, ...args);
const qcerr = (...args) => console.error(QC_LOG_PREFIX, ...args);
qclog("content script loaded");

// Detect context: queue vs individual
function getContext() {
  const href = window.location.href;
  const isIndividual = /\/revisions\/\d+/.test(href);
  const isQueue = /\/revisions(\?|$)/.test(href) && !isIndividual;
  const ctx = isIndividual ? "individual" : (isQueue ? "queue" : "unknown");
  return ctx;
}

// Extract data depending on context
function getQCData(actionType) {
  const location = getContext();
  qclog("getQCData", { location, actionType, url: window.location.href });
  let tenantCode = "";
  let tenantName = "";
  let releaseIds = [];
  let reasons = [];

  if (location === "queue") {
    // For queue, get all checked items
    const checkedBoxes = document.querySelectorAll("input.form-check-input[name='revision_id[]']:checked");
    qclog("queue: checkedBoxes", checkedBoxes.length);

    // Try multiple strategies to get tenant information
    checkedBoxes.forEach(chk => {
      // Strategy 1: data-client-code attribute (this is the code)
      let tenant = chk.getAttribute("data-client-code") || "";

      // Strategy 2: Look in the row for tenant info (code)
      if (!tenant) {
        const row = chk.closest("tr");
        if (row) {
          // Try different column positions for tenant code
          const cells = row.querySelectorAll("td");
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i].innerText.trim();
            // Look for tenant-like patterns (usually short codes)
            if (cellText && cellText.length >= 2 && cellText.length <= 10 && /^[A-Z0-9_-]+$/i.test(cellText)) {
              tenant = cellText;
              break;
            }
          }
        }
      }

      // Strategy 3: Extract from URL or page context
      if (!tenant) {
        try {
          const url = new URL(window.location.href);
          tenant = url.searchParams.get("client") || url.searchParams.get("tenant") || "";
        } catch (e) { /* ignore */ }
      }

      if (tenant && !tenantCode) tenantCode = tenant; // Use first tenant as primary

      // Try to get tenant name (full name) from the row
      const row = chk.closest("tr");
      if (row && !tenantName) {
        // Look for tenant name in column 2 or 3 (usually contains the full name)
        const cells = row.querySelectorAll("td");
        for (let i = 1; i < Math.min(cells.length, 4); i++) { // Check columns 2-4
          const cellText = cells[i].innerText.trim();
          // Look for longer names that are not codes
          if (cellText && cellText.length > 10 && !/^[A-Z0-9_-]+$/i.test(cellText)) {
            tenantName = cellText;
            break;
          }
        }
      }

      // Get release ID from the row
      const releaseCell = chk.closest("tr").querySelector("td:nth-child(6)");
      if (releaseCell) {
        const releaseText = releaseCell.innerText.trim();
        if (releaseText) releaseIds.push(releaseText);
      }
    });

    qclog("queue: extracted data", { tenantCode, tenantName, releaseIds });

    // Get reasons from checked reject reason checkboxes
    document.querySelectorAll("input[name='reject_reasons_codes[]']:checked").forEach(r => {
      reasons.push(r.value);
    });
    qclog("queue: reasons", reasons);
  }

  if (location === "individual") {
    // Try the provided selector first, with sensible fallbacks
    const tenantSelectors = [
      "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(2) > div > div > div.row.pb-3.align-items-center > div:nth-child(2) > h5",
      "main section .row.pb-3.align-items-center div:nth-child(2) h5",
      ".row.pb-3.align-items-center div:nth-child(2) h5",
      "[data-tenant-code]",
      "h5 .tenant-code, h5.tenant-code"
    ];
    let tenantSelUsed = "";
    for (const sel of tenantSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        tenantCode = (el.getAttribute("data-tenant-code") || el.innerText || "").trim();
        tenantSelUsed = sel;
        if (tenantCode) break;
      }
    }
    qclog("individual: tenant", { tenantCode, tenantSelUsed });

    // Release ID: try a few likely locations
    const releaseSelectors = [
      "body > main section div.row.row-cols-3.gx-1 > div:nth-child(3) h5 span",
      "main section .row.pb-3.align-items-center div:nth-child(3) h5 span",
      ".row.pb-3.align-items-center div:nth-child(3) h5 span",
      "h5 span"
    ];
    let releaseText = "";
    let releaseSelUsed = "";
    for (const sel of releaseSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText) { releaseText = el.innerText.trim(); releaseSelUsed = sel; break; }
    }
    if (releaseText) {
      releaseIds.push(releaseText.replace(/^ID:\s*/i, "").trim());
    }
    qclog("individual: release", { releaseIds, releaseSelUsed });

    document.querySelectorAll("input[name='reject_reasons_codes[]']:checked").forEach(r => {
      reasons.push(r.value);
    });
    qclog("individual: reasons", reasons);
  }

  return {
    tenantCode,
    tenantName,
    releaseIds,
    reasons: reasons.join(", "),
    type: actionType,
    location
  };
}

// Persist a snapshot of the queue selection for fallback use
function snapshotQueueState() {
  if (getContext() !== "queue") return;
  try {
    const data = getQCData("snapshot");
    // Try to extract tenant from URL query if missing
    if (!data.tenantCode) {
      try {
        const url = new URL(window.location.href);
        data.tenantCode = url.searchParams.get("client") || "";
      } catch (e) { /* ignore */ }
    }
    const snapshot = {
      tenantCode: data.tenantCode || "",
      releaseIds: data.releaseIds || [],
      reasons: (data.reasons || "").split(/\s*,\s*/).filter(Boolean),
      location: data.location
    };
    chrome.storage.local.set({ QCWT_queueSnapshot: snapshot }, () => {
      qclog("queue: snapshot saved", snapshot);
    });
  } catch (e) {
    qcerr("queue: snapshot error", e);
  }
}

if (getContext() === "queue") {
  // Initial snapshot
  snapshotQueueState();
  // Watch for changes
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.matches("input.form-check-input[name='revision_id[]']") || t.matches("input[name='reject_reasons_codes[]']")) {
      snapshotQueueState();
    }
  }, true);
}

// ----- Drawer injection (inline panel, no iframe) -----
(function injectDrawer(){
  try {
    if (document.getElementById("qcwt-drawer")) return;
    const style = document.createElement("style");
      style.textContent = `
        #qcwt-drawer { position: fixed; top: 0; right: 0; height: 100vh; width: 420px; z-index: 2147483647; display: flex; flex-direction: column; box-shadow: -2px 0 8px rgba(0,0,0,0.2); background: #fff; border-left: 1px solid #ddd; transition: width 0.12s ease, height 0.12s ease; }
        #qcwt-drawer.left { right: auto; left: 0; box-shadow: 2px 0 8px rgba(0,0,0,0.2); border-left: none; border-right: 1px solid #ddd; }
        /* Minimized shrinks height only; keep width (avoid skinny bar) */
        #qcwt-drawer.min { height: 36px; }
        #qcwt-drawer-header { background: #4CAF50; color: #fff; height: 36px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; user-select: none; font-family: Arial, sans-serif; }
        #qcwt-drawer-title { font-size: 13px; font-weight: 600; }
        #qcwt-drawer-controls { display: flex; gap: 6px; }
        #qcwt-drawer-controls button { background: rgba(255,255,255,0.2); color: #fff; border: 0; border-radius: 3px; width: 24px; height: 22px; cursor: pointer; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
        #qcwt-drawer-body { flex: 1; position: relative; overflow: auto; }
        #qcwt-drawer-iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        #qcwt-resizer { position: absolute; top: 0; bottom: 0; left: -3px; width: 7px; cursor: col-resize; }
        #qcwt-resizer-bottom { position: absolute; left: 0; right: 0; bottom: -3px; height: 7px; cursor: row-resize; }
        #qcwt-drawer.left #qcwt-resizer { left: auto; right: -3px; }
        #qcwt-drawer.min #qcwt-drawer-body { display: none; }
        #qcwt-shield { position: fixed; inset: 0; z-index: 2147483646; cursor: col-resize; background: rgba(0,0,0,0); }
      `;
    (document.head || document.querySelector('head') || document.documentElement).appendChild(style);

    // Scoped styles for inline panel UI (no iframe)
    const style2 = document.createElement("style");
    style2.textContent = `
      #qcwt-panel { padding: 12px; font-family: Arial, sans-serif; }
      #qcwt-panel .selectors { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 10px; }
      #qcwt-panel .agent-row { display: grid; grid-template-columns: 1fr 36px; gap: 6px; align-items: center; }
      #qcwt-panel label { font-weight: 600; font-size: 12px; color: #555; }
      #qcwt-panel select, #qcwt-panel button { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
      #qcwt-panel button.primary { background: #4CAF50; color: #fff; border: none; font-weight: 600; cursor: pointer; }
      #qcwt-panel button.secondary { background: #f0f0f0; color: #333; border: 1px solid #ddd; cursor: pointer; }
      #qcwt-panel #lastUpdate { font-size: 12px; color: #666; text-align: center; margin: 6px 0; }
      #qcwt-panel #tenantList { margin-top: 8px; }
      #qcwt-panel #qcwt-lock { padding: 0; height: 32px; line-height: 32px; font-size: 16px; }
      #qcwt-panel .tenant { border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: #fff; overflow: visible; }
      #qcwt-panel .tenant-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
      #qcwt-panel .tenant-header strong { color: #333; font-size: 15px; flex: 1 1 auto; min-width: 0; }
      #qcwt-panel .tenant-details { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin: 5px 0; }
      #qcwt-panel .tenant-buttons { display: flex; gap: 6px; margin: 5px 0; }
      #qcwt-panel .tenant-buttons button { flex: 1; padding: 6px; font-size: 12px; border-radius: 3px; }
      #qcwt-panel .progress { font-weight: bold; font-size: 12px; padding: 9px 6px; border-radius: 12px; background: #f0f0f0; white-space: nowrap; flex: 0 0 auto; }
      #qcwt-panel .progress.completed { color: #fff; background: #4CAF50; }
      #qcwt-panel .progress.in-progress { color: #fff; background: #888; }
      #qcwt-panel .progress.not-started { color: #666; background: #e0e0e0; }
      #qcwt-panel .delay { color: #ff6b6b; font-weight: 700; }
      #qcwt-panel .comments { font-style: italic; color: #555; font-size: 12px; margin-top: 5px; padding-top: 5px; border-top: 1px solid #eee; background-color: #f6ebcfd9}
    `;
    (document.head || document.querySelector('head') || document.documentElement).appendChild(style2);

    const drawer = document.createElement("div");
    drawer.id = "qcwt-drawer";
    drawer.style.visibility = 'hidden';
    const header = document.createElement("div"); header.id = "qcwt-drawer-header";
    const title = document.createElement("div"); title.id = "qcwt-drawer-title"; title.textContent = "QC Workload Tracker";
    const ctrls = document.createElement("div"); ctrls.id = "qcwt-drawer-controls";
    const btnSide = document.createElement("button"); btnSide.title = "Toggle side"; btnSide.textContent = "⇄";
    const btnMin = document.createElement("button"); btnMin.title = "Minimize"; btnMin.textContent = "–";
    ctrls.appendChild(btnSide); ctrls.appendChild(btnMin);
    // Normalize button labels to ASCII to avoid encoding issues
    try { btnSide.textContent = 'LR'; } catch(e) {}
    try { btnMin.textContent = '_'; } catch(e) {}
    header.appendChild(title); header.appendChild(ctrls);
    // Apply requested icons for LR and minimize buttons
    try {
      btnSide.innerHTML = `<svg width=\"20\" height=\"20\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4\"></path></svg>`;
      btnMin.innerHTML = `<svg width=\"20\" height=\"20\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 12h14\"></path></svg>`;
    } catch (_) {}

    const body = document.createElement("div"); body.id = "qcwt-drawer-body";
    // Inline panel (ported from floating.html)
    const panel = document.createElement("div");
    panel.id = "qcwt-panel";
    const selectors = document.createElement('div'); selectors.className = 'selectors';
    const labAgent = document.createElement('label'); labAgent.setAttribute('for','qcwt-agent'); labAgent.textContent='Agent:';
    const agentRow = document.createElement('div'); agentRow.className = 'agent-row';
    const selAgent = document.createElement('select'); selAgent.id = 'qcwt-agent';
    const btnLock = document.createElement('button'); btnLock.id='qcwt-lock'; btnLock.className='secondary'; btnLock.title='Lock/Unlock agent';
    agentRow.appendChild(selAgent); agentRow.appendChild(btnLock);
    const labDay = document.createElement('label'); labDay.setAttribute('for','qcwt-day'); labDay.textContent='Day:';
    const selDay = document.createElement('select'); selDay.id='qcwt-day';
    const optToday=document.createElement('option'); optToday.value='today'; optToday.textContent='Today';
    const optYesterday=document.createElement('option'); optYesterday.value='yesterday'; optYesterday.textContent='Yesterday';
    selDay.appendChild(optToday); selDay.appendChild(optYesterday);
    const btnRefresh=document.createElement('button'); btnRefresh.id='qcwt-refresh'; btnRefresh.className='primary'; btnRefresh.textContent='Refresh';
    const btnDebug=document.createElement('button'); btnDebug.id='qcwt-debug'; btnDebug.className='secondary'; btnDebug.textContent='Debug Info';
    selectors.appendChild(labAgent); selectors.appendChild(agentRow); selectors.appendChild(labDay); selectors.appendChild(selDay); selectors.appendChild(btnRefresh); selectors.appendChild(btnDebug);
    const pLast=document.createElement('p'); pLast.id='lastUpdate'; pLast.textContent='Last updated: -';
    const divDebug=document.createElement('div'); divDebug.id='debugInfo'; divDebug.style.display='none';
    const divList=document.createElement('div'); divList.id='tenantList';
    panel.appendChild(selectors); panel.appendChild(pLast); panel.appendChild(divDebug); panel.appendChild(divList);
    body.appendChild(panel);
    const resizer = document.createElement("div"); resizer.id = "qcwt-resizer"; body.appendChild(resizer);
    const resizerBottom = document.createElement("div"); resizerBottom.id = "qcwt-resizer-bottom"; body.appendChild(resizerBottom);

    drawer.appendChild(header); drawer.appendChild(body);
    (document.body || document.documentElement).appendChild(drawer);
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        try {
          if (drawer.parentNode !== document.body) document.body.appendChild(drawer);
        } catch (_) {}
      }, { once: true });
    }

    // Restore state
      const MIN_WIDTH = 380;
    const MIN_HEIGHT = 200;
    chrome.storage.local.get(["QCWT_drawerSide", "QCWT_drawerWidth", "QCWT_drawerHeight", "QCWT_drawerMin"], (st) => {
      const side = st.QCWT_drawerSide || "right";
      const width = st.QCWT_drawerWidth || 420;
      const height = st.QCWT_drawerHeight || window.innerHeight;
      const min = !!st.QCWT_drawerMin;
      if (side === "left") drawer.classList.add("left");
      drawer.style.width = Math.max(MIN_WIDTH, Math.min(700, width)) + "px";
      const restoredH = Math.max(MIN_HEIGHT, Math.min(window.innerHeight, height));
      drawer.style.height = restoredH + "px";
      drawer.setAttribute('data-last-height', String(restoredH));
      if (min) drawer.classList.add("min");
    });

    // Controls
    btnSide.addEventListener("click", () => {
      const left = drawer.classList.toggle("left");
      chrome.storage.local.set({ QCWT_drawerSide: left ? "left" : "right" });
    });
    function toggleMin() {
      const min = drawer.classList.toggle('min');
      if (min) {
        drawer.style.height = '36px';
      } else {
        const stored = parseInt((drawer.getAttribute('data-last-height') || '0'), 10) || window.innerHeight;
        const h = Math.max(200, Math.min(window.innerHeight, stored));
        drawer.style.height = h + 'px';
      }
      chrome.storage.local.set({ QCWT_drawerMin: min });
    }
    btnMin.addEventListener('click', toggleMin);
    header.addEventListener('dblclick', toggleMin);

    // -------- Panel logic (inline UI) --------
    const agentSelect = document.getElementById('qcwt-agent');
    const lockBtn = document.getElementById('qcwt-lock');
    const daySelect = document.getElementById('qcwt-day');
    const refreshBtn = document.getElementById('qcwt-refresh');
    const debugBtn = document.getElementById('qcwt-debug');
    const tenantList = document.getElementById('tenantList');
    const lastUpdate = document.getElementById('lastUpdate');
    const debugInfo = document.getElementById('debugInfo');

    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz6Hg5Z50Ok8htGQyUlqSOJMuVDJDKfjp9345MvVfC9-Sut-E4PX04IxbKdvzB9f7SK/exec";
    const WORKLOAD_TTL_MS = 60 * 60 * 1000; // 1 hour
    const LOCK_ICON_OPEN = '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#4A4A4A" fill-rule="nonzero"><path d="M4.8,10.9953976 L4.8,10.9953976 L4.8,19.0046024 C4.8,19.5443356 5.20329495,20 5.70078449,20 L18.2992155,20 C18.7998322,20 19.2,19.5543453 19.2,19.0046024 L19.2,10.9953976 C19.2,10.4556644 18.796705,10 18.2992155,10 L5.70078449,10 C5.20016778,10 4.8,10.4456547 4.8,10.9953976 L4.8,10.9953976 Z M3,10.9953976 C3,9.33850596 4.2083756,8 5.70078449,8 L18.2992155,8 C19.7882905,8 21,9.34828102 21,10.9953976 L21,19.0046024 C21,20.661494 19.7916244,22 18.2992155,22 L5.70078449,22 C4.2117095,22 3,20.651719 3,19.0046024 L3,10.9953976 Z M23,8 L21,8 C21,5.790861 19.209139,4 17,4 C14.790861,4 13,5.790861 13,8 L11,8 C11,4.6862915 13.6862915,2 17,2 C20.3137085,2 23,4.6862915 23,8 Z M12,16 C12.5522847,16 13,15.5522847 13,15 C13,14.4477153 12.5522847,14 12,14 C11.4477153,14 11,14.4477153 11,15 C11,15.5522847 11.4477153,16 12,16 Z"/></g></svg>';
    const LOCK_ICON_CLOSED = '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#4A4A4A" fill-rule="nonzero"><path d="M4.8,10.9953976 L4.8,10.9953976 L4.8,19.0046024 C4.8,19.5443356 5.20329495,20 5.70078449,20 L18.2992155,20 C18.7998322,20 19.2,19.5543453 19.2,19.0046024 L19.2,10.9953976 C19.2,10.4556644 18.796705,10 18.2992155,10 L5.70078449,10 C5.20016778,10 4.8,10.4456547 4.8,10.9953976 L4.8,10.9953976 Z M3,10.9953976 C3,9.33850596 4.2083756,8 5.70078449,8 L18.2992155,8 C19.7882905,8 21,9.34828102 21,10.9953976 L21,19.0046024 C21,20.661494 19.7916244,22 18.2992155,22 L5.70078449,22 C4.2117095,22 3,20.651719 3,19.0046024 L3,10.9953976 Z M18,8 L16,8 C16,5.790861 14.209139,4 12,4 C9.790861,4 8,5.790861 8,8 L6,8 C6,4.6862915 8.6862915,2 12,2 C15.3137085,2 18,4.6862915 18,8 Z M12,16 C12.5522847,16 13,15.5522847 13,15 C13,14.4477153 12.5522847,14 12,14 C11.4477153,14 11,14.4477153 11,15 C11,15.5522847 11.4477153,16 12,16 Z"/></g></svg>';
    const agentColors = {};
    let savedHeaderColor = null;

    async function bgGet(url) {
      return await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'QCWT_HTTP_GET', url }, (res) => {
            const lastErr = chrome.runtime.lastError && chrome.runtime.lastError.message;
            if (!res) return reject(new Error(lastErr || 'No response from background'));
            if (!res.ok) return reject(new Error(res.error || `HTTP ${res.status}`));
            resolve(res.text || '');
          });
        } catch (e) { reject(e); }
      });
    }

    function updateHeaderColor(agent) {
      const color = agentColors[agent] || savedHeaderColor || '#4CAF50';
      document.getElementById('qcwt-drawer-header').style.backgroundColor = color;
      if (refreshBtn) { refreshBtn.style.backgroundColor = color; refreshBtn.style.color = '#fff'; }
      try { chrome.storage.local.set({ QCWT_agentColor: color }); } catch (_) {}
    }

    async function loadAgentColors() {
      try {
        const csvUrl = 'https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=631841993';
        const csv = await bgGet(csvUrl);
        const lines = csv.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const [agent, color] = lines[i].split(',');
          if (agent && color) agentColors[agent.trim()] = color.trim();
        }
      } catch (e) { /* ignore */ }
    }

    async function loadAgents() {
      try {
        const txt = await bgGet(`${APPS_SCRIPT_URL}?action=getAgents`);
        const data = JSON.parse(txt);
        if (data.status === 'success') {
          const current = agentSelect.value;
          agentSelect.innerHTML = '<option value="">Select Agent...</option>';
          data.agents.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a; opt.textContent = a; agentSelect.appendChild(opt);
          });
          if (current && Array.from(agentSelect.options).every(o => o.value !== current)) {
            const opt = document.createElement('option'); opt.value = current; opt.textContent = current; agentSelect.appendChild(opt);
          }
          if (current) agentSelect.value = current;
        } else {
          throw new Error(data.message || 'Unknown error');
        }
      } catch (err) {
        agentSelect.innerHTML = `<option value=\"\">Error: ${err.message}</option>`;
      }
    }

    async function getCachedWorkload(agent, day, force = false) {
      const key = `${agent}|${day}`;
      const cache = await new Promise(res => chrome.storage.local.get('QCWT_workloadCache', r => res(r.QCWT_workloadCache || {})));
      const entry = cache[key];
      const now = Date.now();
      if (!force && entry && entry.workload && (now - (entry.ts || 0) < WORKLOAD_TTL_MS)) {
        return { fromCache: true, workload: entry.workload };
      }
      const txt = await bgGet(`${APPS_SCRIPT_URL}?action=getWorkload&agent=${encodeURIComponent(agent)}&day=${day}`);
      const data = JSON.parse(txt);
      if (data.status !== 'success') throw new Error(data.message || 'Workload fetch failed');
      const next = Object.assign({}, cache, { [key]: { workload: data.workload, ts: now } });
      await new Promise(res => chrome.storage.local.set({ QCWT_workloadCache: next }, () => res()));
      return { fromCache: false, workload: data.workload };
    }

    async function loadWorkloadData(force = false) {
      if (!agentSelect.value) return;
      // Evita parpadeo: si hay caché válido, no muestres "Loading..."
      let showLoading = true;
      try {
        if (!force) {
          const key = `${agentSelect.value}|${daySelect.value}`;
          const cache = await new Promise(res => chrome.storage.local.get('QCWT_workloadCache', r => res(r.QCWT_workloadCache || {})));
          const entry = cache[key];
          const now = Date.now();
          if (entry && entry.workload && (now - (entry.ts || 0) < WORKLOAD_TTL_MS)) {
            showLoading = false;
          }
        }
      } catch (_) {}
      if (showLoading) tenantList.innerHTML = '<p>Loading...</p>';
      try {
        const [{ fromCache, workload }, completedText] = await Promise.all([
          getCachedWorkload(agentSelect.value, daySelect.value, force),
          bgGet(`${APPS_SCRIPT_URL}?action=getCompleted&agent=${encodeURIComponent(agentSelect.value)}&day=${daySelect.value}`)
        ]);
        const completedData = JSON.parse(completedText);
        if (completedData.status === 'success') {
          displayWorkload(workload, completedData.completed);
          updateHeaderColor(agentSelect.value);
          lastUpdate.textContent = 'Last updated: ' + new Date().toLocaleTimeString() + (fromCache ? ' (cache)' : '');
        } else {
          const msg = completedData.message || 'Unknown error';
          tenantList.innerHTML = `<p>Error loading data: ${msg}</p>`;
        }
      } catch (e) {
        tenantList.innerHTML = `<p>Error loading data: ${e.message}</p>`;
      }
    }

    function displayWorkload(workload, completed) {
      if (!Array.isArray(workload) || workload.length === 0) {
        tenantList.innerHTML = '<p>No workload assigned for this day</p>';
        return;
      }
      tenantList.innerHTML = '';
      workload.forEach(tenant => {
        let completedCount = 0;
        const tenantName = tenant.tenant;
        if (completed) {
          if (completed[tenantName] !== undefined) {
            completedCount = completed[tenantName];
          } else {
            const lower = tenantName.toLowerCase();
            const exact = Object.keys(completed).find(k => k.toLowerCase() === lower);
            if (exact) completedCount = completed[exact];
            else {
              const partial = Object.keys(completed).find(k => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase()));
              if (partial) completedCount = completed[partial];
            }
          }
        }
        const assignedCount = parseInt(tenant.releases) || 0;
        const progressPercent = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
        const statusClass = progressPercent === 100 ? 'completed' : (progressPercent > 0 ? 'in-progress' : 'not-started');

        const div = document.createElement('div');
        div.className = 'tenant';
        div.innerHTML = `
          <div class="tenant-header">
            <strong>${tenantName}</strong>
            <span class="progress ${statusClass}">${completedCount}/${assignedCount} (${progressPercent}%)</span>
          </div>
          <div class="tenant-details">
            <span>Releases: ${assignedCount} | Completed: ${completedCount}</span>
            ${tenant.days ? `<span class="delay">Delay: ${tenant.days} days</span>` : ''}
          </div>
          <div class="tenant-buttons">
            <button class="platform-btn">Platform</button>
            <button class="backoffice-btn">Backoffice</button>
          </div>
          ${tenant.comments ? `<div class="comments">Comments: ${tenant.comments}</div>` : ''}
        `;
        div.querySelector('.platform-btn').addEventListener('click', () => {
          window.open(`https://${tenantName}.sonosuite.com/sonosuite-login`, '_blank');
        });
        div.querySelector('.backoffice-btn').addEventListener('click', () => {
          const url = `https://backoffice.sonosuite.com/quality-control/revisions?state=pending&client=${tenantName}`;
          if (location.hostname.includes('backoffice.sonosuite.com')) {
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
        });
        tenantList.appendChild(div);
      });
    }

    async function toggleDebugInfo() {
      if (debugInfo.style.display === 'none') {
        debugInfo.style.display = 'block';
        debugBtn.textContent = 'Hide Debug';
        await loadDebugInfo();
      } else {
        debugInfo.style.display = 'none';
        debugBtn.textContent = 'Debug Info';
      }
    }

    async function loadDebugInfo() {
      if (!agentSelect.value) { debugInfo.innerHTML = '<p>Please select an agent first</p>'; return; }
      debugInfo.innerHTML = '<p>Loading debug info...</p>';
      try {
        const [workloadText, completedText] = await Promise.all([
          bgGet(`${APPS_SCRIPT_URL}?action=getWorkload&agent=${encodeURIComponent(agentSelect.value)}&day=${daySelect.value}`),
          bgGet(`${APPS_SCRIPT_URL}?action=getCompleted&agent=${encodeURIComponent(agentSelect.value)}&day=${daySelect.value}`)
        ]);
        const workloadData = JSON.parse(workloadText);
        const completedData = JSON.parse(completedText);
        let html = '<div style="font-size:12px; background:#f9f9f9; padding:10px; border-radius:4px; margin:10px 0;">';
        html += '<h4>Workload Data:</h4><pre>' + JSON.stringify(workloadData, null, 2) + '</pre>';
        html += '<h4>Completed Data:</h4><pre>' + JSON.stringify(completedData, null, 2) + '</pre>';
        html += '</div>';
        debugInfo.innerHTML = html;
      } catch (e) {
        debugInfo.innerHTML = `<p style="color:red">Error loading debug info: ${e.message}</p>`;
      }
    }

    // Init
      // Restore saved selection immediately to avoid flicker
        chrome.storage.local.get(["selectedAgent", "selectedDay", "QCWT_agentLock", "QCWT_agentColor"], data => {
          savedHeaderColor = data.QCWT_agentColor || null;
          if (savedHeaderColor) { try { document.getElementById('qcwt-drawer-header').style.backgroundColor = savedHeaderColor; } catch(_) {} }
        if (data.selectedAgent) {
          if (Array.from(agentSelect.options).every(o => o.value !== data.selectedAgent)) {
            const opt = document.createElement('option');
            opt.value = data.selectedAgent; opt.textContent = data.selectedAgent; agentSelect.appendChild(opt);
          }
          agentSelect.value = data.selectedAgent;
        }
        if (data.selectedDay) daySelect.value = data.selectedDay;
          updateHeaderColor(agentSelect.value);
          if (typeof data.QCWT_agentLock === 'undefined') {
            applyLock(!!agentSelect.value);
          } else {
            applyLock(!!data.QCWT_agentLock);
          }
          if (agentSelect.value) loadWorkloadData();
          try { document.getElementById('qcwt-drawer').style.visibility = 'visible'; } catch (_) {}
        });
      // Then load resources in background
      (async () => { try { await loadAgentColors(); await loadAgents(); } catch (_) {} })();

      agentSelect.addEventListener('change', () => {
        chrome.storage.local.set({ selectedAgent: agentSelect.value });
        if (agentSelect.value) applyLock(true); // auto-lock on select
        updateHeaderColor(agentSelect.value);
        if (agentSelect.value) loadWorkloadData(true);
      });
    daySelect.addEventListener('change', () => {
      chrome.storage.local.set({ selectedDay: daySelect.value });
      if (agentSelect.value) loadWorkloadData();
    });
    refreshBtn.addEventListener('click', () => loadWorkloadData(true));
    debugBtn.addEventListener('click', () => toggleDebugInfo());
    setInterval(() => { if (agentSelect.value) loadWorkloadData(); }, 5 * 60 * 1000);

    function applyLock(locked) {
      agentSelect.disabled = !!locked;
      // Según lo pedido: botón de bloquear = icono abierto; desbloquear = icono cerrado
      lockBtn.innerHTML = locked ? LOCK_ICON_CLOSED : LOCK_ICON_OPEN;
      lockBtn.title = locked ? 'Unlock agent' : 'Lock agent';
      chrome.storage.local.set({ QCWT_agentLock: !!locked });
    }
    lockBtn.addEventListener('click', () => {
      applyLock(!agentSelect.disabled);
    });

    // Resize logic (fluid with overlay + capture)
    let resizing = false; let resizingHeight = false; let startX = 0; let startY = 0; let startW = 0; let startH = 0; let shield = null;
    function onResize(ev) {
      if (!resizing) return;
      const leftSide = drawer.classList.contains('left');
      const dx = leftSide ? (ev.clientX - startX) : (startX - ev.clientX);
      let newW = startW + dx;
      newW = Math.max(MIN_WIDTH, Math.min(700, newW));
      drawer.classList.remove('min');
      drawer.style.width = Math.round(newW) + 'px';
    }
    function onResizeHeight(ev) {
      if (!resizingHeight) return;
      const dy = startY - ev.clientY;
      let newH = startH + dy;
      newH = Math.max(MIN_HEIGHT, Math.min(window.innerHeight, newH));
      drawer.classList.remove('min');
      newH = Math.round(newH);
      drawer.style.height = newH + 'px';
      drawer.setAttribute('data-last-height', String(newH));
    }
    function onResizeUp() {
      if (!resizing) return;
      resizing = false;
      try {
        window.removeEventListener('mousemove', onResize, true);
        window.removeEventListener('mouseup', onResizeUp, true);
      } catch (e) {}
      if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
      shield = null;
      document.body.style.userSelect = '';
      document.documentElement.style.cursor = '';
      const width = parseInt(drawer.style.width || '420', 10);
      chrome.storage.local.set({ QCWT_drawerWidth: width, QCWT_drawerMin: drawer.classList.contains('min') });
    }
    function onResizeHeightUp() {
      if (!resizingHeight) return;
      resizingHeight = false;
      try {
        window.removeEventListener('mousemove', onResizeHeight, true);
        window.removeEventListener('mouseup', onResizeHeightUp, true);
      } catch (e) {}
      if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
      shield = null;
      document.body.style.userSelect = '';
      document.documentElement.style.cursor = '';
      if (drawer.classList.contains('min')) {
        drawer.style.height = '36px';
      }
      const height = parseInt(drawer.style.height || window.innerHeight, 10);
      if (!drawer.classList.contains('min')) drawer.setAttribute('data-last-height', String(height));
      chrome.storage.local.set({ QCWT_drawerHeight: height, QCWT_drawerMin: drawer.classList.contains('min') });
    }
    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizing = true; startX = e.clientX; startW = drawer.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
      document.documentElement.style.cursor = 'col-resize';
      shield = document.createElement('div');
      shield.id = 'qcwt-shield';
      document.body.appendChild(shield);
      window.addEventListener('mousemove', onResize, true);
      window.addEventListener('mouseup', onResizeUp, true);
    });
    resizerBottom.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizingHeight = true; startY = e.clientY; startH = drawer.getBoundingClientRect().height;
      document.body.style.userSelect = 'none';
      document.documentElement.style.cursor = 'row-resize';
      shield = document.createElement('div');
      shield.id = 'qcwt-shield';
      shield.style.cursor = 'row-resize';
      document.body.appendChild(shield);
      window.addEventListener('mousemove', onResizeHeight, true);
      window.addEventListener('mouseup', onResizeHeightUp, true);
    });

    // Inline drawer mode: no cross-window drag/messaging required

    qclog("drawer: injected");
  } catch (e) {
    qcerr("drawer: error injecting", e);
  }
})();

// Listen for requests from background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_QC_DATA") {
    qclog("FETCH_QC_DATA received", msg);
    const data = getQCData(msg.type);
    qclog("FETCH_QC_DATA response", data);
    sendResponse(data);
  }
  // Relay background notifications to the page so extension iframes can react
  function postToIframe(payload){
    try {
      const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
      if (iframe?.contentWindow) iframe.contentWindow.postMessage(payload, '*');
    } catch {}
  }
  if (msg.action === 'QCWT_ACTION') {
    postToIframe({ tipo: 'QCWT_ACTION', action: msg.type || '' });
  }
  if (msg.action === 'QCWT_SENT') {
    postToIframe({ tipo: 'QCWT_SENT', ok: !!msg.ok });
  }
});

// Fallback: capture form submissions to trigger a send even if webRequest misses it
document.addEventListener("submit", (ev) => {
  try {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action = form.action || "";
    if (!action.includes("/quality-control/revisions/")) return;

    let actionType = "";
    if (action.includes("/approve")) actionType = "approve";
    else if (action.includes("/reject")) actionType = "reject";
    else if (action.includes("/client-action-required")) actionType = "changes";

    if (!actionType) return;
    // Ensure latest snapshot (pretty IDs) just before submit
    snapshotQueueState();
    const payload = getQCData(actionType);
    qclog("submit-capture: sending direct payload", { action, actionType, payload });
    chrome.runtime.sendMessage({ action: "QCWT_DIRECT_SEND", payload }, (res) => {
      qclog("submit-capture: background ack", res);
    });
    // Also proactively notify the page so any embedded extension UI can refresh
    try {
      const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
      if (iframe?.contentWindow) iframe.contentWindow.postMessage({ tipo: 'QCWT_ACTION', action: actionType }, '*');
    } catch {}
  } catch (e) {
    qcerr("submit-capture error", e);
  }
}, true);

// Queue diagnostics and network interception for bulk actions
function debugQueueSelectors() {
  try {
    const counts = {
      exact: document.querySelectorAll("input.form-check-input[name='revision_id[]']").length,
      nameExact: document.querySelectorAll("input[name='revision_id[]']").length,
      namePrefix: document.querySelectorAll("input[type='checkbox'][name^='revision_id']").length,
      nameContains: document.querySelectorAll("input[type='checkbox'][name*='revision']").length,
      withData: document.querySelectorAll("input[type='checkbox'][data-client-code]").length,
    };
    qclog("queue-debug: checkbox counts", counts);

    const sample = Array.from(document.querySelectorAll("input[type='checkbox']")).slice(0, 5).map(el => ({
      name: el.getAttribute("name"),
      value: el.value,
      dataClient: el.getAttribute("data-client-code"),
      checked: el.checked
    }));
    qclog("queue-debug: sample checkboxes", sample);

    const forms = Array.from(document.querySelectorAll("form[action*='/quality-control/revisions']")).map((f, idx) => ({
      idx,
      action: f.action,
      submits: Array.from(f.querySelectorAll("button[type='submit'], input[type='submit']")).map(b => ({
        tag: b.tagName,
        name: b.getAttribute("name"),
        value: b.getAttribute("value"),
        text: (b.textContent || "").trim()
      }))
    }));
    qclog("queue-debug: forms", forms);
  } catch (e) {
    qcerr("queue-debug error", e);
  }
}

function installNetworkDebug() {
  try {
    // fetch
    if (!window.__qcwtFetchPatched) {
      const origFetch = window.fetch;
      window.fetch = function(input, init = {}) {
        try {
          const url = (typeof input === 'string') ? input : input.url;
          const method = (init && init.method) || (typeof input !== 'string' && input.method) || 'GET';
          if (/\/quality-control\/revisions/.test(url)) {
            qclog("fetch-intercept", { method, url, hasBody: !!(init && init.body) });
          }
        } catch (e) { /* ignore */ }
        return origFetch.apply(this, arguments);
      };
      window.__qcwtFetchPatched = true;
    }

    // XHR
    if (!window.__qcwtXHRPatched) {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__qcwt = { method, url };
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function(body) {
        try {
          const info = this.__qcwt || {};
          if (info.url && /\/quality-control\/revisions/.test(info.url)) {
            qclog("xhr-intercept", { method: info.method, url: info.url, hasBody: !!body });
          }
        } catch (e) { /* ignore */ }
        return origSend.apply(this, arguments);
      };
      window.__qcwtXHRPatched = true;
    }
  } catch (e) {
    qcerr("network-debug patch error", e);
  }
}

// Initialize queue diagnostics if on queue page
if (getContext() === "queue") {
  qclog("queue: diagnostics init");
  debugQueueSelectors();
  installNetworkDebug();

  // Log clicks on potential bulk buttons/links
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest("button, input[type='submit'], a");
    if (!btn) return;
    const form = btn.closest("form");
    const info = {
      tag: btn.tagName,
      name: btn.getAttribute("name"),
      value: btn.getAttribute("value"),
      text: (btn.textContent || "").trim(),
      href: btn.getAttribute("href"),
      formAction: form ? form.getAttribute("action") : null
    };
    qclog("queue-click", info);
    if (info.name === "action" || /approve|reject|client-action-required/i.test(info.value || info.text || "")) {
      snapshotQueueState();
      try {
        const sel = "input.form-check-input[name='revision_id[]']:checked";
        const checked = Array.from(document.querySelectorAll(sel));
        const mapping = checked.map((chk) => {
          const tr = chk.closest("tr");
          const idCell = tr ? tr.querySelector("td:nth-child(6)") : null;
          return {
            checkboxName: chk.getAttribute("name"),
            value: chk.value,
            tenant: chk.getAttribute("data-client-code") || "",
            releaseText: idCell ? (idCell.innerText || "").trim() : "",
          };
        });
        qclog("queue: selection mapping", mapping);
      } catch (e) { /* ignore mapping errors */ }
    }
  }, true);
}

