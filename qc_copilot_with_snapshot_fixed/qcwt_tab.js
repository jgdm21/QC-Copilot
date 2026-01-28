// qcwt_tab.js: QC Workload tab component (scoped to #qcwt-tab)
(function () {
  if (window.__qcwtInitialized) return; // guard
  window.__qcwtInitialized = true;

  // Lightweight runtime event buffer for debugging (kept tiny for perf)
  const __rtEvents = (window.__qcwtRtEvents = Array.isArray(window.__qcwtRtEvents) ? window.__qcwtRtEvents : []);
  function rtPush(type, data) {
    try {
      __rtEvents.push({ ts: new Date().toISOString(), type, data });
      if (__rtEvents.length > 20) __rtEvents.splice(0, __rtEvents.length - 20);
    } catch (_) {}
  }

  const CONFIG = {
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz6Hg5Z50Ok8htGQyUlqSOJMuVDJDKfjp9345MvVfC9-Sut-E4PX04IxbKdvzB9f7SK/exec",
    AGENT_COLORS_CSV_URL: "https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=631841993",
    QCWT_WORKLOAD_TTL_MS: 5 * 60 * 1000, // 5m (allow midday updates)
    QC_APPROACH_TODAY_CSV_URL: "https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=1060948492",
    QC_APPROACH_YDAY_CSV_URL:  "https://docs.google.com/spreadsheets/d/18GkGVdOPDJ4hnaM65tSCNeAv9DhA95htNaS89V5jKgM/export?format=csv&gid=738619283",
    QCWT_WORKLOAD_REFRESH_MS: 5 * 60 * 1000 // 5m periodic full refresh
  };

  const SKEYS = {
    agent: 'qcwt.selectedAgent',
    day: 'qcwt.selectedDay',
    lock: 'qcwt.agentLock',
    color: 'qcwt.agentColor',
    workloadCache: 'qcwt.workloadCache',
    agentsCache: 'qcwt.agentsCache'
  };

  const SVG = {
    LOCK_OPEN: '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#4A4A4A" fill-rule="nonzero"><path d="M4.8,10.9953976 L4.8,10.9953976 L4.8,19.0046024 C4.8,19.5443356 5.20329495,20 5.70078449,20 L18.2992155,20 C18.7998322,20 19.2,19.5543453 19.2,19.0046024 L19.2,10.9953976 C19.2,10.4556644 18.796705,10 18.2992155,10 L5.70078449,10 C5.20016778,10 4.8,10.4456547 4.8,10.9953976 L4.8,10.9953976 Z M3,10.9953976 C3,9.33850596 4.2083756,8 5.70078449,8 L18.2992155,8 C19.7882905,8 21,9.34828102 21,10.9953976 L21,19.0046024 C21,20.661494 19.7916244,22 18.2992155,22 L5.70078449,22 C4.2117095,22 3,20.651719 3,19.0046024 L3,10.9953976 Z M23,8 L21,8 C21,5.790861 19.209139,4 17,4 C14.790861,4 13,5.790861 13,8 L11,8 C11,4.6862915 13.6862915,2 17,2 C20.3137085,2 23,4.6862915 23,8 Z M12,16 C12.5522847,16 13,15.5522847 13,15 C13,14.4477153 12.5522847,14 12,14 C11.4477153,14 11,14.4477153 11,15 C11,15.5522847 11.4477153,16 12,16 Z"/></g></svg>',
    LOCK_CLOSED: '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g fill="#4A4A4A" fill-rule="nonzero"><path d="M4.8,10.9953976 L4.8,10.9953976 L4.8,19.0046024 C4.8,19.5443356 5.20329495,20 5.70078449,20 L18.2992155,20 C18.7998322,20 19.2,19.5543453 19.2,19.0046024 L19.2,10.9953976 C19.2,10.4556644 18.796705,10 18.2992155,10 L5.70078449,10 C5.20016778,10 4.8,10.4456547 4.8,10.9953976 L4.8,10.9953976 Z M3,10.9953976 C3,9.33850596 4.2083756,8 5.70078449,8 L18.2992155,8 C19.7882905,8 21,9.34828102 21,10.9953976 L21,19.0046024 C21,20.661494 19.7916244,22 18.2992155,22 L5.70078449,22 C4.2117095,22 3,20.651719 3,19.0046024 L3,10.9953976 Z M18,8 L16,8 C16,5.790861 14.209139,4 12,4 C9.790861,4 8,5.790861 8,8 L6,8 C6,4.6862915 8.6862915,2 12,2 C15.3137085,2 18,4.6862915 18,8 Z M12,16 C12.5522847,16 13,15.5522847 13,15 C13,14.4477153 12.5522847,14 12,14 C11,14.4477153 11,15 11,15.5522847 11.4477153,16 12,16 Z"/></g></svg>'
  };

  function svgData(svg) {
    try { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; } catch (_) { return ''; }
  }

  function read(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch(_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch(_) {}
  }
  function readJSON(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(_) { return fallback; }
  }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(_) {} }

  function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // --- QC Approach support ---
  let __qcApproachMap = null; // normalize(tenant) -> { key,label,color,message } (we will refetch each render)
  let __qcApproachOrigin = {}; // normalize(tenant) -> 'today' | 'yday'
  let __qcApproachRaw = {};    // normalize(tenant) -> raw string from sheet
  let __qcwtDebugLast = null;  // last assembled debug payload

  function parseCSVRows(text) {
    if (!text) return [];
    const lines = String(text).split(/\r?\n/);
    const rows = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = [];
      let s = line, c = '', inQ = false;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '"') {
          if (inQ && s[i+1] === '"') { c += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          cols.push(c.trim()); c = '';
        } else { c += ch; }
      }
      cols.push(c.trim());
      rows.push(cols);
    }
    return rows;
  }

  function mapApproachDescriptor(rawKey) {
    const raw = String(rawKey || '').trim();
    if (!raw) return null;
    // Normalize hyphens and slashes, compare exact against the only allowed values
    const norm = raw
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g, '-')  // various dashes to '-'
      .replace(/\s*\/\s*/g, '/')       // trim around '/'
      .replace(/\s+/g, ' ')              // collapse spaces
      .trim();

    const table = new Map([
      ['premium',                { key: 'premium',            label: 'Premium',            color: '#FFF2CC', message: 'Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' }],
      ['pre-tir/tir',            { key: 'pre-tir/tir',        label: 'Pre‑TIR / TIR',      color: '#F4CCCC', message: 'Client under review; do not perform QC while this status is active.' }],
      ['top priority',           { key: 'top-priority',       label: 'Top Priority',       color: '#A4C2F4', message: 'Prioritize reviews while respecting the tenant’s support level (premium or standard).' }],
      ['standard',               { key: 'standard',           label: 'Standard',           color: '#FFFFFF', message: 'Approve/reject only. Do not create tickets.' }],
      ['post-tir',               { key: 'post-tir',           label: 'Post‑TIR',           color: '#EFEFEF', message: 'Approve/reject only. Do not create tickets.' }],
      ['grace period',           { key: 'grace-period',       label: 'Grace Period',       color: '#D9D2E9', message: 'New client. Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' }],
      ['post-tir on trial',      { key: 'post-tir-on-trial',  label: 'Post‑TIR on trial',  color: '#D9EAD3', message: 'Approve/reject only. Do not create tickets. Inform the manager if fraudulent content is detected.' }]
    ]);

    // Try exact after normalization; also allow small variants with spaces around slash
    const v = table.get(norm) || table.get(norm.replace(' / ', '/')) || null;
    return v;
  }

  // Override mapping with a safe, ASCII-only version to avoid encoding glitches
  // that could break parsing/rendering in some environments.
  function mapApproachDescriptor(rawKey) {
    const raw = String(rawKey || '').trim();
    if (!raw) return null;
    const norm = raw
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ')
      .trim();
    switch (norm) {
      case 'premium':
        return { key: 'premium', label: 'Premium', color: '#FFF2CC', message: 'Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' };
      case 'pre-tir/tir':
        return { key: 'pre-tir/tir', label: 'Pre-TIR / TIR', color: '#F4CCCC', message: 'Client under review; do not perform QC while this status is active.' };
      case 'top priority':
        return { key: 'top-priority', label: 'Top Priority', color: '#A4C2F4', message: 'Prioritize reviews while respecting the tenant support level (premium or standard).' };
      case 'standard':
        return { key: 'standard', label: 'Standard', color: '#FFFFFF', message: 'Approve/reject only. Do not create tickets.' };
      case 'post-tir':
        return { key: 'post-tir', label: 'Post-TIR', color: '#EFEFEF', message: 'Approve/reject only. Do not create tickets.' };
      case 'grace period':
        return { key: 'grace-period', label: 'Grace Period', color: '#D9D2E9', message: 'New client. Reject only if fraud is confirmed and always open a ticket to inform; request modifications via ticket when applicable.' };
      case 'post-tir on trial':
        return { key: 'post-tir-on-trial', label: 'Post-TIR on trial', color: '#D9EAD3', message: 'Approve/reject only. Do not create tickets. Inform the manager if fraudulent content is detected.' };
      default:
        return null;
    }
  }

  async function loadQcApproachMap() {
    // Always fetch fresh to reflect midday changes
    try {
      const [csvToday, csvYday] = await Promise.all([
        fetchText(CONFIG.QC_APPROACH_TODAY_CSV_URL),
        fetchText(CONFIG.QC_APPROACH_YDAY_CSV_URL)
      ]);
      const rowsToday = parseCSVRows(csvToday);
      const rowsYday  = parseCSVRows(csvYday);
      const buildMap = (rows) => {
        const out = {};
        const raw = {};
        if (!rows || !rows.length) return out;
        const header = rows[0].map(h => h.toLowerCase());
        let tenantIdx = header.findIndex(h => h.trim() === 'name' || /tenant/.test(h));
        let approachIdx = header.findIndex(h => h.trim() === 'qc approach' || /qc\s*approach/i.test(h) || /approach/.test(h));
        const start = (tenantIdx !== -1 && approachIdx !== -1) ? 1 : 0;
        if (tenantIdx === -1) tenantIdx = 0;
        if (approachIdx === -1) approachIdx = 1;
        for (let i = start; i < rows.length; i++) {
          const r = rows[i];
          if (!r || !r.length) continue;
          const t = (r[tenantIdx] || '').trim();
          const a = (r[approachIdx] || '').trim();
          if (!t || !a) continue;
          const desc = mapApproachDescriptor(a);
          if (desc) { out[normalize(t)] = desc; raw[normalize(t)] = a; }
        }
        return { map: out, raw };
      };
      // Merge with TODAY override
      const y = buildMap(rowsYday);
      const t = buildMap(rowsToday);
      const map = { ...y.map, ...t.map };
      const origins = {};
      const raw = { ...y.raw, ...t.raw };
      Object.keys(y.map).forEach(k => origins[k] = 'yday');
      Object.keys(t.map).forEach(k => origins[k] = 'today');
      __qcApproachMap = map; __qcApproachOrigin = origins; __qcApproachRaw = raw;
      return map;
    } catch (_) { __qcApproachMap = {}; return __qcApproachMap; }
  }

  async function fetchText(url, timeoutMs = 15000) {
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = controller ? setTimeout(() => { try { controller.abort('timeout'); } catch(_) {} }, timeoutMs) : null;
    try {
      const res = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: controller ? controller.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.error('[QCWT] fetchText error', url, e);
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async function fetchJSON(url) {
    const txt = await fetchText(url);
    try { return JSON.parse(txt); } catch (e) { throw new Error('Invalid JSON'); }
  }

  async function mountMarkup(mountEl) {
    // Load HTML template dynamically so we keep markup separate
    const tplUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('qcwt_tab.html')
      : 'qcwt_tab.html';
    const html = await fetchText(tplUrl).catch(() => '<div id="qcwt-tab"></div>');
    mountEl.innerHTML = html;
    rtPush('mountMarkup', { ok: !!html });
  }

  function hexToRgb(hex){
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex||'');
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : null;
  }
  function applyColor(color) {
    const btn = document.getElementById('qcwt-refresh');
    if (btn) { btn.style.backgroundColor = color; btn.style.color = '#fff'; }
    try {
      const el = document.querySelector('#qcwt-tab');
      if (el) {
        el.style.setProperty('--qcwt-accent', color);
        const rgb = hexToRgb(color);
        if (rgb) {
          el.style.setProperty('--qcwt-accent-10', `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`);
          el.style.setProperty('--qcwt-accent-20', `rgba(${rgb.r},${rgb.g},${rgb.b},0.20)`);
        }
      }
    } catch (_) {}
  }

  async function initOnce(container) {
    if (container && container.getAttribute('data-qcwt-bound') === '1') {
      // Already bound; avoid double listeners
      return;
    }
    rtPush('initOnce', {});
    try { container.setAttribute('data-qcwt-bound', '1'); } catch(_) {}
    const agentSel = container.querySelector('#qcwt-agent');
    const daySel = container.querySelector('#qcwt-day');
    const lockBtn = container.querySelector('#qcwt-lock');
    const refreshBtn = container.querySelector('#qcwt-refresh');
    const debugBtn = container.querySelector('#qcwt-debug');
    const lastUpdate = container.querySelector('#qcwt-lastUpdate');
    const debugInfo = container.querySelector('#qcwt-debugInfo');
    const tenantList = container.querySelector('#qcwt-tenantList');

    const agentColors = {};

    // Immediate state from storage (no flicker)
    const savedAgent = read(SKEYS.agent, '');
    const savedDay = read(SKEYS.day, 'today');
    let locked = read(SKEYS.lock, null);
    const savedColor = read(SKEYS.color, '');

    if (savedAgent) {
      // add temporary option to display immediately
      const temp = document.createElement('option');
      temp.value = savedAgent; temp.textContent = savedAgent;
      agentSel.appendChild(temp);
      agentSel.value = savedAgent;
    }
    daySel.value = savedDay || 'today';
    if (savedColor) applyColor(savedColor);
    if (locked === null) {
      locked = !!savedAgent; // auto-lock first time if agent present
      write(SKEYS.lock, locked ? 'true' : 'false');
    } else {
      locked = locked === 'true';
    }
    agentSel.disabled = locked;
    lockBtn.innerHTML = `<img src="${svgData(locked ? SVG.LOCK_CLOSED : SVG.LOCK_OPEN)}" alt="${locked ? 'Locked' : 'Unlocked'}" width="18" height="18" />`;
    lockBtn.title = locked ? 'Unlock agent' : 'Lock agent';

    // Helper caches
    function cacheKey(agent, day) { return `${agent}|${day}`; }
    function getCachedWorkload(agent, day) {
      const all = readJSON(SKEYS.workloadCache, {});
      const entry = all[cacheKey(agent, day)];
      if (!entry) return null;
      if (Date.now() - entry.ts > CONFIG.QCWT_WORKLOAD_TTL_MS) return null;
      return entry.workload || null;
    }
    // Non-strict lookup: return cached workload even if stale (for instant UI)
    function getAnyCachedWorkload(agent, day) {
      const all = readJSON(SKEYS.workloadCache, {});
      const entry = all[cacheKey(agent, day)];
      return entry && entry.workload ? entry.workload : null;
    }
    function setCachedWorkload(agent, day, workload) {
      const all = readJSON(SKEYS.workloadCache, {});
      all[cacheKey(agent, day)] = { workload, ts: Date.now() };
      writeJSON(SKEYS.workloadCache, all);
    }

    // Render workload view only (no completion tracking)
    async function render(workload, _completed, fromCache) {
      if (!workload || workload.length === 0) {
        tenantList.innerHTML = '<p>No workload assigned for this day</p>';
      } else {
        // Ensure QC Approach map loaded (today overrides yesterday)
        const approachMap = await loadQcApproachMap();
        const debugItems = [];
        const items = workload.map(item => {
          const assigned = parseInt(item.releases || 0, 10) || 0;
          // Prefer approach provided by workload row itself, fall back to map
          const rawApproach = (item.qcApproach || item.approach || item.QCApproach || item['QC Approach'] || item['qc_approach'] || '').toString();
          const approachFromItem = rawApproach ? mapApproachDescriptor(rawApproach) : null;
          const key = normalize(item.tenant);
          const mapAp = approachMap[key] || null;
          const approach = approachFromItem || mapAp;
          debugItems.push({
            tenant: item.tenant,
            key,
            assigned,
            rawApproachFromItem: rawApproach || null,
            approachFromItem: approachFromItem ? approachFromItem.label : null,
            approachFromMap: mapAp ? mapAp.label : null,
            mapOrigin: __qcApproachOrigin[key] || null,
            mapRaw: __qcApproachRaw[key] || null,
            chosen: approach ? approach.label : null
          });
          return { item, assigned, approach };
        });
        __qcwtDebugLast = {
          ts: new Date().toISOString(),
          selected: { agent: agentSel.value, day: daySel.value || 'today' },
          sources: {
            APPS_SCRIPT_URL: CONFIG.APPS_SCRIPT_URL,
            AGENT_COLORS_CSV_URL: CONFIG.AGENT_COLORS_CSV_URL,
            QC_APPROACH_TODAY_CSV_URL: CONFIG.QC_APPROACH_TODAY_CSV_URL,
            QC_APPROACH_YDAY_CSV_URL: CONFIG.QC_APPROACH_YDAY_CSV_URL
          },
          approachMapCounts: { todayOrYday: Object.keys(approachMap || {}).length },
          workloadFetch: __qcwtLastWorkload ? { ts: __qcwtLastWorkload.ts, url: __qcwtLastWorkload.url } : null,
          items: debugItems
        };
        tenantList.innerHTML = items.map(({item, assigned, approach}) => {
          const platformUrl = `https://${encodeURIComponent(item.tenant)}.sonosuite.com/sonosuite-login`;
          const backofficeUrl = `https://backoffice.sonosuite.com/quality-control/revisions?state=pending&order_by=created_at&order=ASC&client=${encodeURIComponent(item.tenant)}`;
          const approachHtml = approach ? `
            <div class="qcwt-approach" style="margin-top:6px;">
              <span class="qcwt-approach-pill" tabindex="0" data-tooltip="${escapeHtml(approach.message)}" aria-label="${escapeHtml(approach.message)}" style="display:inline-block; padding:4px 8px; border-radius:6px; border:1px solid #ddd; background:${approach.color}; font-size:12px; font-weight:600; color:#333; cursor:help;">${escapeHtml(approach.label)}</span>
            </div>` : '';
          return `
            <div class="qcwt-tenant">
              <div class="qcwt-tenant-header">
                <div class="qcwt-tenant-name">${escapeHtml(item.tenant)}</div>
                <div class="qcwt-progress">Assigned: ${assigned}</div>
              </div>
              <div class="qcwt-tenant-details">
                <span>Releases: ${assigned}</span>
                ${item.days ? `<span>Delay: ${String(item.days)} days</span>` : ''}
              </div>
              ${approachHtml}
              ${item.comments ? `<div class="qcwt-comments">Today's Comment: ${escapeHtml(String(item.comments))}</div>` : ''}
              <div class="qcwt-tenant-actions">
                <button data-url="${platformUrl}" data-kind="platform" class="qcwt-open">Platform</button>
                <button data-url="${backofficeUrl}" data-kind="backoffice" class="qcwt-open qcwt-backoffice">Backoffice</button>
              </div>
            </div>`;
        }).join('');
        // click handlers
        tenantList.querySelectorAll('.qcwt-open').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            const kind = e.currentTarget.getAttribute('data-kind') || '';
            // visual feedback
            try { btn.classList.add('qcwt-clicked'); setTimeout(() => btn.classList.remove('qcwt-clicked'), 150); } catch(_){ }
            // open link
            if (kind === 'backoffice' && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              try {
                chrome.runtime.sendMessage({ action: 'QCWT_OPEN_URL', url, sameTabPreferred: true }, (res)=>{
                  if (!res || res.ok !== true) { try { window.open(url, '_blank'); } catch(_) { location.href = url; } }
                });
              } catch (_) { try { window.open(url, '_blank'); } catch(_) { location.href = url; } }
            } else {
              try { window.open(url, '_blank'); } catch(_) { location.href = url; }
            }
          });
        });
      }
      const ts = new Date();
      lastUpdate.textContent = `Last updated: ${ts.toLocaleTimeString()}${fromCache ? ' (cache)' : ''}`;
      try { window.__qcwtLastRenderTs = Date.now(); } catch(_) {}
      try { rtPush('render', { items: Array.isArray(workload) ? workload.length : 0, fromCache: !!fromCache }); } catch(_) {}
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    }

    // Load colors CSV and agents list in parallel
    async function loadAgentColors() {
      try {
        const csv = await fetchText(CONFIG.AGENT_COLORS_CSV_URL);
        const lines = csv.split(/\r?\n/).filter(Boolean);
        lines.slice(1).forEach(line => {
          const [agent, color] = line.split(',');
          if (agent && color) agentColors[agent.trim()] = color.trim();
        });
        // If current agent has a color, apply immediately
        const a = agentSel.value;
        if (a && agentColors[a]) {
          applyColor(agentColors[a]);
          write(SKEYS.color, agentColors[a]);
        }
      } catch (_) { /* ignore */ }
    }

    async function loadAgents() {
      // Always include all Agent names from Agent Colours sheet
      // Then union with backend list and workload sheets (HOY/AYER) to be safe
      await loadAgentColors();
      const colorAgents = Object.keys(agentColors);
      const ac = readJSON(SKEYS.agentsCache, null);
      const now = Date.now();
      let agents = null;
      if (ac && (now - ac.ts) < 60 * 1000) agents = ac.agents;
      if (!agents) {
        let base = [];
        try {
          const data = await fetchJSON(`${CONFIG.APPS_SCRIPT_URL}?action=getAgents`);
          if (data.status === 'success') base = data.agents || [];
        } catch (_) { /* ignore */ }
        // Collect agents from workload sheets (Agent column)
        let extraAgents = [];
        try {
          const [csvT, csvY] = await Promise.all([
            fetchText(CONFIG.QC_APPROACH_TODAY_CSV_URL),
            fetchText(CONFIG.QC_APPROACH_YDAY_CSV_URL)
          ]);
          const rowsT = parseCSVRows(csvT);
          const rowsY = parseCSVRows(csvY);
          const collect = (rows) => {
            if (!rows || !rows.length) return [];
            const header = rows[0].map(h => String(h || '').toLowerCase());
            const agentIdx = header.findIndex(h => h.trim() === 'agent');
            if (agentIdx === -1) return [];
            const out = [];
            for (let i = 1; i < rows.length; i++) {
              const r = rows[i]; if (!r || !r.length) continue;
              const a = (r[agentIdx] || '').trim();
              if (a && a !== '-') out.push(a);
            }
            return out;
          };
          extraAgents = [...collect(rowsY), ...collect(rowsT)];
        } catch (_) { /* ignore CSV errors */ }
        const set = new Set([...colorAgents, ...base, ...extraAgents]);
        agents = Array.from(set);
        writeJSON(SKEYS.agentsCache, { agents, ts: now });
      }
      // fill select while preserving saved selection
      const current = agentSel.value;
      agentSel.innerHTML = '';
      agents.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a; agentSel.appendChild(opt);
      });
      if (current) {
        if (![...agentSel.options].some(o => o.value === current)) {
          const opt = document.createElement('option'); opt.value = current; opt.textContent = current; agentSel.appendChild(opt);
        }
        agentSel.value = current; // keep
      }
    }

    async function fetchWorkload(agent, day) {
      const url = `${CONFIG.APPS_SCRIPT_URL}?action=getWorkload&agent=${encodeURIComponent(agent)}&day=${encodeURIComponent(day)}&_ts=${Date.now()}`;
      const data = await fetchJSON(url);
      if (data.status !== 'success') throw new Error(data.message || 'Error');
      __qcwtLastWorkload = { ts: Date.now(), url, data };
      rtPush('fetchWorkload.ok', {});
      return data.workload || [];
    }

    async function loadWorkloadAndCompleted(force = false) {
      const agent = agentSel.value; const day = daySel.value || 'today';
      if (!agent) return;
      // 1) Instant render from any cached workload (stale-while-revalidate)
      let alreadyRendered = false;
      try {
        const staleWl = getAnyCachedWorkload(agent, day);
        if (staleWl && Array.isArray(staleWl)) {
          await render(staleWl, {}, true);
          alreadyRendered = true;
        }
      } catch (_) { /* ignore */ }
      // 2) Normal path (strict TTL)
      let workload = null; let fromCache = false;
      if (!force) {
        const cached = getCachedWorkload(agent, day);
        if (cached) { workload = cached; fromCache = true; }
      }
      if (workload) {
        render(workload, {}, true);
      } else {
        // show lightweight loading only when doing real fetch
        if (!alreadyRendered) tenantList.innerHTML = '<p>Loading...</p>';
        try {
          workload = await fetchWorkload(agent, day);
          setCachedWorkload(agent, day, workload);
          render(workload, {}, false);
        } catch (e) {
          console.error('[QCWT] loadWorkload error', e);
          rtPush('load.error', { message: e && e.message ? e.message : String(e) });
          tenantList.innerHTML = `<p>Error loading data: ${escapeHtml(e.message || 'Unknown')}</p>`;
        }
      }
    }

    // Wire events
    agentSel.addEventListener('change', () => {
      write(SKEYS.agent, agentSel.value);
      try { chrome?.storage?.local?.set && chrome.storage.local.set({ selectedAgent: agentSel.value, 'qcwt.selectedAgent': agentSel.value }); } catch(_) {}
      // auto-lock when selecting
      agentSel.disabled = true; write(SKEYS.lock, 'true');
      lockBtn.innerHTML = SVG.LOCK_CLOSED; lockBtn.title = 'Unlock agent';
      // update color if known
      const color = agentColors[agentSel.value];
      if (color) { applyColor(color); write(SKEYS.color, color); }
      loadWorkloadAndCompleted(true);
    });
    daySel.addEventListener('change', () => {
      write(SKEYS.day, daySel.value);
      loadWorkloadAndCompleted(false);
    });
    lockBtn.addEventListener('click', () => {
      const newLocked = !agentSel.disabled;
      agentSel.disabled = newLocked;
      write(SKEYS.lock, newLocked ? 'true' : 'false');
      lockBtn.innerHTML = `<img src="${svgData(newLocked ? SVG.LOCK_CLOSED : SVG.LOCK_OPEN)}" alt="${newLocked ? 'Locked' : 'Unlocked'}" width="18" height="18" />`;
      lockBtn.title = newLocked ? 'Unlock agent' : 'Lock agent';
    });
    // Unified user refresh logic (used by button and programmatic triggers)
    function doUserRefresh() {
      const agent = agentSel.value; const day = daySel.value || 'today';
      if (agent) {
        const all = readJSON(SKEYS.workloadCache, {});
        delete all[`${agent}|${day}`];
        writeJSON(SKEYS.workloadCache, all);
      }
      loadWorkloadAndCompleted(true);
    }
    try { window.__qcwtDoUserRefresh = doUserRefresh; } catch(_) {}

    function doFullRefresh() {
      const agent = agentSel.value; const day = daySel.value || 'today';
      try {
        if (agent) {
          const all = readJSON(SKEYS.workloadCache, {});
          delete all[`${agent}|${day}`];
          writeJSON(SKEYS.workloadCache, all);
        }
        localStorage.removeItem(SKEYS.agentsCache);
      } catch(_) {}
      const startTs = Date.now();
      loadWorkloadAndCompleted(true);
      setTimeout(() => {
        try {
          const last = window.__qcwtLastRenderTs || 0;
          if (last < startTs && agentSel.value) {
            loadWorkloadAndCompleted(true);
          }
        } catch(_) {}
      }, 2500);
    }
    try { window.__qcwtDoFullRefresh = doFullRefresh; } catch(_) {}

    refreshBtn.addEventListener('click', () => { doUserRefresh(); });
    debugBtn.addEventListener('click', async () => {
      const showing = debugInfo.style.display !== 'none';
      debugInfo.style.display = showing ? 'none' : 'block';
      if (!showing) {
        const allCache = readJSON(SKEYS.workloadCache, {});
        // Build a small DOM snapshot on demand (only when clicking)
        const hostPanel = document.getElementById('qc-tab-workload');
        const singleMount = document.getElementById('qcwt-single-mount');
        const tab = document.getElementById('qcwt-tab');
        const list = tab && tab.querySelector('#qcwt-tenantList');
        const last = tab && tab.querySelector('#qcwt-lastUpdate');
        const tenantsRendered = list ? list.querySelectorAll('.qcwt-tenant').length : 0;
        const entry = (allCache || {})[`${agentSel.value}|${daySel.value || 'today'}`];
        const now = Date.now();
        const staleSec = entry ? Math.round((now - entry.ts) / 1000) : null;
        const payload = {
          meta: { ts: new Date().toISOString() },
          selected: { agent: agentSel.value, day: daySel.value || 'today', locked: agentSel.disabled },
          color: read(SKEYS.color, ''),
          cacheKeys: Object.keys(allCache),
          cacheEntry: { hasEntry: !!entry, staleSec },
          sources: {
            APPS_SCRIPT_URL: CONFIG.APPS_SCRIPT_URL,
            AGENT_COLORS_CSV_URL: CONFIG.AGENT_COLORS_CSV_URL,
            QC_APPROACH_TODAY_CSV_URL: CONFIG.QC_APPROACH_TODAY_CSV_URL,
            QC_APPROACH_YDAY_CSV_URL: CONFIG.QC_APPROACH_YDAY_CSV_URL
          },
          approachMapCounts: { entries: __qcApproachMap ? Object.keys(__qcApproachMap).length : 0 },
          approachOrigins: __qcApproachOrigin,
          approachRaw: __qcApproachRaw,
          workloadFetch: __qcwtLastWorkload ? { ts: __qcwtLastWorkload.ts, url: __qcwtLastWorkload.url } : null,
          items: (__qcwtDebugLast && __qcwtDebugLast.items) || [],
          dom: {
            hasHostPanel: !!hostPanel,
            hasSingleMount: !!singleMount,
            hasTab: !!tab,
            hasList: !!list,
            hasLastUpdate: !!last,
            lastUpdateText: last ? last.textContent : null,
            tenantsRendered,
            visibility: document.visibilityState,
            url: location.href
          },
          rtRecent: __rtEvents.slice(-10)
        };
        const text = JSON.stringify(payload, null, 2);
        debugInfo.textContent = text;
        try { chrome?.storage?.local?.set && chrome.storage.local.set({ QCWT_debugClipboard: text }); } catch(_) {}
        try { await navigator.clipboard.writeText(text); } catch(_) {}
      }
    });

    // initial data flow (non-blocking to avoid grey state if a source hangs)
    const _p1 = loadAgentColors().catch(() => {});
    const _p2 = loadAgents().catch(() => {});
    Promise.allSettled([_p1, _p2]);
    // Mirror selected agent to chrome storage for background logging compatibility
    try { if (agentSel.value) chrome?.storage?.local?.set && chrome.storage.local.set({ selectedAgent: agentSel.value, 'qcwt.selectedAgent': agentSel.value }); } catch(_) {}
    // If savedAgent existed but is now in list, keep official option
    if (agentSel.value) {
      const col = agentColors[agentSel.value];
      if (col) { applyColor(col); write(SKEYS.color, col); }
      loadWorkloadAndCompleted(false);
    }
    // Safety kick: if nothing rendered after 2s, try once
    let _renderedOnce = false;
    const _origRender = render;
    render = async function(workload, _completed, fromCache){
      _renderedOnce = true; return _origRender(workload, _completed, fromCache);
    };
    setTimeout(() => { try { if (!_renderedOnce && agentSel.value) loadWorkloadAndCompleted(false); } catch(_) {} }, 2000);
    const timers = (window.__qcwtTimers = window.__qcwtTimers || {});
    // expose full refresh for external triggers (e.g., when tab becomes visible)
    try { window.__qcwtRefreshAll = (force = false) => loadWorkloadAndCompleted(!!force); } catch(_) {}
    // periodic full refresh respects TTL; fetches when stale
    if (!timers.fullInterval) {
      timers.fullInterval = setInterval(() => loadWorkloadAndCompleted(false), CONFIG.QCWT_WORKLOAD_REFRESH_MS);
    }
    // Watchdog: if UI stays blank or stale while Workload tab visible + agent seleccionado, hace full refresh
    if (!timers.watchdog) {
      timers.watchdog = setInterval(() => {
        try {
          const tab = document.getElementById('qc-tab-workload');
          const visible = tab && tab.style.display !== 'none';
          const hasAgent = !!read(SKEYS.agent, '');
          if (!visible || !hasAgent) return;
          const lastTxt = (lastUpdate && lastUpdate.textContent) || '';
          const neverUpdated = /Last updated:\s*-/.test(lastTxt);
          const lastTs = window.__qcwtLastRenderTs || 0;
          const veryStale = lastTs ? (Date.now() - lastTs > 60 * 1000) : false;
          const blank = !tenantList || tenantList.children.length === 0;
          if ((neverUpdated || blank || veryStale) && typeof window.__qcwtDoFullRefresh === 'function') {
            window.__qcwtDoFullRefresh();
          }
        } catch (_) {}
      }, 4000);
    }
  }

  async function boot() {
    rtPush('boot', {});
    // Determine mount target: tab panel in drawer.html, or a single mount in drawer_blank.html
    const tabPanel = document.getElementById('qc-tab-workload');
    const singleMount = document.getElementById('qcwt-single-mount');
    const mount = tabPanel || singleMount;
    if (!mount) return;
    await mountMarkup(mount);
    const container = mount.querySelector('#qcwt-tab');
    if (container) initOnce(container);

    // Observe future DOM changes to the mount area; if the UI is removed or
    // re-inserted (e.g., after SPA navigations), re-bind without full reload.
    try {
      const mo = new MutationObserver(() => {
        const c = (tabPanel || singleMount).querySelector('#qcwt-tab');
        if (!c) {
          // UI was removed; remount minimal markup and bind again
          mountMarkup(mount).then(() => {
            const cc = mount.querySelector('#qcwt-tab');
            if (cc) initOnce(cc);
          });
        } else if (!c.getAttribute('data-qcwt-bound')) {
          // UI exists but not bound yet (freshly inserted)
          initOnce(c);
        }
      });
      mo.observe(mount, { childList: true, subtree: true });
    } catch(_) {}

    // Real-time refresh when QC actions happen
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        let lastRt = 0;
        chrome.runtime.onMessage.addListener((msg) => {
          if (!msg || !msg.action) return;
          // On explicit action (approve/reject/changes) or confirmed send, refresh aggressively
          if (msg.action === 'QCWT_ACTION' || (msg.action === 'QCWT_SENT' && msg.ok === true)) {
            const now = Date.now();
            if (now - lastRt < 800) return; // throttle
            lastRt = now;
            rtPush(msg.action, { ok: msg.ok, type: msg.type });
            try {
              if (typeof window.__qcwtDoFullRefresh === 'function') {
                window.__qcwtDoFullRefresh(); // Full refresh: clear caches and reload if needed
              } else if (typeof window.__qcwtDoUserRefresh === 'function') {
                window.__qcwtDoUserRefresh();
              } else if (typeof window.__qcwtRefreshAll === 'function') {
                window.__qcwtRefreshAll(true);
              }
            } catch(_) {}
          }
        });
      }
    } catch (_) { /* ignore */ }

    // Track navigation/visibility events (helps correlate grey states)
    try {
      window.addEventListener('pageshow', () => {
        rtPush('pageshow', {});
        try {
          const tab = document.getElementById('qc-tab-workload');
          const visible = tab && tab.style.display !== 'none';
          const hasAgent = !!read(SKEYS.agent, '');
          if (visible && hasAgent) {
            if (typeof window.__qcwtDoFullRefresh === 'function') window.__qcwtDoFullRefresh();
            else if (typeof window.__qcwtDoUserRefresh === 'function') window.__qcwtDoUserRefresh();
            else if (typeof window.__qcwtRefreshAll === 'function') window.__qcwtRefreshAll(true);
          }
        } catch(_) {}
      });
      document.addEventListener('visibilitychange', () => {
        rtPush('visibility', { state: document.visibilityState });
        if (document.visibilityState === 'visible') {
          try {
            const tab = document.getElementById('qc-tab-workload');
            const visible = tab && tab.style.display !== 'none';
            const hasAgent = !!read(SKEYS.agent, '');
            if (visible && hasAgent) {
              if (typeof window.__qcwtDoFullRefresh === 'function') window.__qcwtDoFullRefresh();
              else if (typeof window.__qcwtDoUserRefresh === 'function') window.__qcwtDoUserRefresh();
              else if (typeof window.__qcwtRefreshAll === 'function') window.__qcwtRefreshAll(true);
            }
          } catch(_) {}
        }
      });
      // Refresh numbers when the Workload tab is shown (custom event dispatched by tabs JS)
      window.addEventListener('qcwt:shown', () => {
        rtPush('tabShown', {});
        try {
          if (typeof window.__qcwtDoUserRefresh === 'function') window.__qcwtDoUserRefresh();
          else if (typeof window.__qcwtRefreshAll === 'function') window.__qcwtRefreshAll(true);
        } catch(_) {}
      });
      // Listen to page-level notifications posted by content scripts (cross-extension)
      window.addEventListener('message', (ev) => {
        const d = ev && ev.data;
        if (!d || (d.tipo !== 'QCWT_ACTION' && d.tipo !== 'QCWT_SENT')) return;
        rtPush('postMessage', { tipo: d.tipo, action: d.action, ok: d.ok });
        try {
          if (typeof window.__qcwtDoFullRefresh === 'function') window.__qcwtDoFullRefresh();
          else if (typeof window.__qcwtDoUserRefresh === 'function') window.__qcwtDoUserRefresh();
          else if (typeof window.__qcwtRefreshAll === 'function') window.__qcwtRefreshAll(true);
        } catch(_) {}
      });
      // Also react to storage flag set by background (survives reload timing)
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes && changes.QCWT_lastAction) {
            rtPush('storageLastAction', changes.QCWT_lastAction.newValue || {});
            try {
              if (typeof window.__qcwtDoFullRefresh === 'function') window.__qcwtDoFullRefresh();
              else if (typeof window.__qcwtDoUserRefresh === 'function') window.__qcwtDoUserRefresh();
              else if (typeof window.__qcwtRefreshAll === 'function') window.__qcwtRefreshAll(true);
            } catch(_) {}
          }
        });
      }
    } catch(_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
