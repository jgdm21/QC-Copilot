// drawer_injector.js - FIXED VERSION with audio modal detection

// ===== Helpers globales =====
function qcShouldDebug() {
  try { return localStorage.getItem('qcDebug') === 'true'; } catch (_) { return false; }
}
function isListPage() {
  return location.pathname === '/quality-control/revisions' ||
         location.pathname === '/login' ||
         /^\/quality-control\/revisions\\?state=/.test(location.pathname + location.search) ||
         location.href === 'https://backoffice.sonosuite.com/';
}

function getDrawerIframeSrc() {
  return isListPage()
    ? chrome.runtime.getURL('drawer_blank.html')
    : chrome.runtime.getURL('drawer.html');
}

// Helper para copiar al portapapeles
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    console.log('Text copied to clipboard:', text);
    const copyConfirm = document.createElement('div');
    copyConfirm.textContent = 'Copied!';
    copyConfirm.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#28a745; color:#fff; padding:8px 15px; border-radius:5px; z-index:1000; font-size:14px;';
    document.body.appendChild(copyConfirm);
    setTimeout(() => copyConfirm.remove(), 1500);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
  document.body.removeChild(textarea);
}

// Configuracion de listas del clipboard
const DEFAULT_CLIPBOARD_LIST = 'General';
const LAST_CLIPBOARD_LIST_KEY = 'qcLastClipboardList';

function normalizeClipboardLists(data) {
  let lists = data.qcClipboardLists;
  let changed = false;

  if (!lists || typeof lists !== 'object') {
    lists = {};
    changed = true;
  }

  // Migration from legacy array-only structure
  Object.keys(lists).forEach(name => {
    const entry = lists[name];
    if (Array.isArray(entry)) {
      lists[name] = { items: entry, description: '' };
      changed = true;
    } else if (entry && typeof entry === 'object') {
      const items = Array.isArray(entry.items) ? entry.items : [];
      const description = typeof entry.description === 'string' ? entry.description : '';
      lists[name] = { items, description };
      if (entry.items !== items || entry.description !== description) changed = true;
    } else {
      lists[name] = { items: [], description: '' };
      changed = true;
    }
  });

  // If legacy qcClipboard exists, migrate to default list
  if ((!lists || !Object.keys(lists).length) && Array.isArray(data.qcClipboard) && data.qcClipboard.length) {
    lists[DEFAULT_CLIPBOARD_LIST] = { items: data.qcClipboard, description: '' };
    changed = true;
  }

  if (!lists[DEFAULT_CLIPBOARD_LIST]) {
    lists[DEFAULT_CLIPBOARD_LIST] = { items: [], description: '' };
    changed = true;
  }

  return { lists, changed };
}

function getClipboardLists(callback) {
  chrome.storage.local.get({ qcClipboardLists: null, qcClipboard: [] }, data => {
    const { lists, changed } = normalizeClipboardLists(data);
    const done = () => callback(lists);
    if (changed) {
      chrome.storage.local.set({ qcClipboardLists: lists }, done);
    } else {
      done();
    }
  });
}

function setClipboardLists(lists, callback) {
  chrome.storage.local.set({ qcClipboardLists: lists }, () => {
    updateClipboardDisplays(lists);
    if (callback) callback(lists);
  });
}

function getTotalClipboardItems(lists) {
  return Object.values(lists || {}).reduce((acc, entry) => acc + (Array.isArray(entry?.items) ? entry.items.length : 0), 0);
}

function updateClipboardDisplays(lists) {
  const total = getTotalClipboardItems(lists);
  const counter = document.getElementById('qc-clipboard-counter');
  if (counter) {
    counter.textContent = total;
    counter.style.display = total > 0 ? 'flex' : 'none';
  }

  const miniCounter = document.getElementById('qc-mini-counter');
  if (miniCounter) {
    miniCounter.textContent = total;
    miniCounter.style.display = total > 0 ? 'block' : 'none';
  }
}

// Mantener nombre original para compatibilidad
function updateClipboardCounter() {
  getClipboardLists(updateClipboardDisplays);
}

function buildClipboardText(items) {
  return items
    .map(i => `**Release Title**: ${i.title}\n**Release ID**: ${i.id}\n**User Email**: ${i.email}`)
    .join('\n\n');
}

let clipboardSyncListenerSet = false;
function setupClipboardSyncListener() {
  if (clipboardSyncListenerSet) return;
  clipboardSyncListenerSet = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.qcClipboardLists || changes.qcClipboard) {
      updateClipboardCounter();
    }
  });
}

// Agrega los releases marcados en la lista al clipboard seleccionado
function addCheckedToClipboard(targetListName) {
  return new Promise(resolve => {
    const rows = document.querySelectorAll('#revisionsTable > tbody > tr');
    const releases = [];
    rows.forEach((row) => {
      const checkbox = row.querySelector('td:nth-child(1) input[type="checkbox"], td:nth-child(1) input');
      if (checkbox && checkbox.checked) {
        const title = row.querySelector('td:nth-child(5) h4')?.innerText.trim() || '';
        const releaseId = (row.querySelector('td:nth-child(6)')?.innerText.trim() || '').replace('ID:', '').trim();
        const email = row.querySelector('td:nth-child(9)')?.innerText.trim() || '';
        releases.push({ title, id: releaseId, email });
      }
    });
    if (!releases.length) {
      copyToClipboard('No releases selected.');
      resolve(false);
      return;
    }
    getClipboardLists(lists => {
      const listName = targetListName || DEFAULT_CLIPBOARD_LIST;
      const listEntry = lists[listName] || { items: [], description: '' };
      const currentList = Array.isArray(listEntry.items) ? listEntry.items : [];
      releases.forEach(rel => {
        if (!currentList.some(x => x.id === rel.id)) {
          currentList.push(rel);
        }
      });
      lists[listName] = { items: currentList, description: listEntry.description || '' };
      setClipboardLists(lists, () => {
        copyToClipboard(buildClipboardText(currentList));
        resolve(true);
      });
    });
  });
}

function rememberLastClipboardList(name) {
  try { localStorage.setItem(LAST_CLIPBOARD_LIST_KEY, name); } catch (_) { /* ignore */ }
}

function getPreferredClipboardList(lists) {
  try {
    const stored = localStorage.getItem(LAST_CLIPBOARD_LIST_KEY);
    if (stored && lists[stored]) return stored;
  } catch (_) { /* ignore */ }
  if (lists[DEFAULT_CLIPBOARD_LIST]) return DEFAULT_CLIPBOARD_LIST;
  const names = Object.keys(lists || {});
  return names.length ? names[0] : DEFAULT_CLIPBOARD_LIST;
}

function getSortedListNames(lists) {
  const names = Object.keys(lists || {});
  return names.sort((a, b) => {
    if (a === DEFAULT_CLIPBOARD_LIST) return -1;
    if (b === DEFAULT_CLIPBOARD_LIST) return 1;
    return a.localeCompare(b);
  });
}

function selectClipboardList({ title = 'Select a list', confirmText = 'Use list' } = {}) {
  return new Promise(resolve => {
    getClipboardLists(lists => {
      let selectedName = getPreferredClipboardList(lists);
      const modal = document.createElement('div');
      modal.className = 'qc-modal';
      modal.innerHTML = `
        <div class="qc-modal-bg"></div>
        <div class="qc-modal-dialog" style="max-width:420px;">
          <div class="qc-modal-header">
            <span>${title}</span>
            <button class="qc-modal-close" title="Close">x</button>
          </div>
          <div class="qc-modal-content" style="display:flex;flex-direction:column;gap:10px;">
            <div style="color:#4b5563;font-size:13px;">Choose the list to store or read items. You can create or delete custom lists.</div>
            <div class="qc-list-options" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto;"></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input id="qc-new-list-name" type="text" placeholder="New list" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;" />
              <button data-action="create-list" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#f8fafc;cursor:pointer;">Create</button>
            </div>
            <textarea id="qc-new-list-desc" placeholder="Description (optional)" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-height:50px;resize:vertical;"></textarea>
            <div class="qc-modal-error" style="color:#b91c1c;font-size:12px;min-height:14px;"></div>
          </div>
          <div class="qc-modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button data-role="cancel" class="qc-modal-cancel" style="padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;">Cancel</button>
            <button data-role="confirm" class="qc-modal-confirm" style="padding:6px 12px;border:none;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;">${confirmText}</button>
          </div>
        </div>
      `;

      const listContainer = modal.querySelector('.qc-list-options');
      const errorLabel = modal.querySelector('.qc-modal-error');
      const newListInput = modal.querySelector('#qc-new-list-name');
      const newListDesc = modal.querySelector('#qc-new-list-desc');

      function showError(msg) {
        if (errorLabel) errorLabel.textContent = msg || '';
      }

      function close(result) {
        modal.remove();
        resolve(result);
      }

      function renderOptions() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        getSortedListNames(lists).forEach(name => {
          const option = document.createElement('div');
          option.className = 'qc-list-option';
          option.style.display = 'flex';
          option.style.alignItems = 'center';
          option.style.gap = '8px';
          option.style.padding = '8px';
          option.style.border = '1px solid #e5e7eb';
          option.style.borderRadius = '8px';

          const label = document.createElement('label');
          label.style.display = 'flex';
          label.style.alignItems = 'center';
          label.style.gap = '8px';
          label.style.flex = '1';
          label.style.cursor = 'pointer';

          const input = document.createElement('input');
          input.type = 'radio';
          input.name = 'qc-list-option';
          input.value = name;
          input.checked = name === selectedName;
          input.onchange = () => { selectedName = name; showError(''); };

          const textWrap = document.createElement('div');
          textWrap.style.display = 'flex';
          textWrap.style.flexDirection = 'column';

          const titleLabel = document.createElement('strong');
          titleLabel.textContent = name;

          const countLabel = document.createElement('span');
          countLabel.textContent = `${Array.isArray((lists[name]||{}).items) ? lists[name].items.length : 0} items`;
          countLabel.style.color = '#6b7280';
          countLabel.style.fontSize = '12px';

          const descLabel = document.createElement('span');
          const desc = (lists[name] && lists[name].description) || '';
          descLabel.textContent = desc ? desc : 'No description';
          descLabel.style.color = '#4b5563';
          descLabel.style.fontSize = '12px';

          textWrap.appendChild(titleLabel);
          textWrap.appendChild(countLabel);
          textWrap.appendChild(descLabel);
          label.appendChild(input);
          label.appendChild(textWrap);
          option.appendChild(label);

          if (name !== DEFAULT_CLIPBOARD_LIST) {
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.setAttribute('data-delete', name);
            Object.assign(delBtn.style, {
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              padding: '6px 8px',
              cursor: 'pointer'
            });
            delBtn.onclick = (e) => {
              e.stopPropagation();
              const confirmed = confirm(`Delete list "${name}"? Items will be removed.`);
              if (!confirmed) return;
              delete lists[name];
              if (!Object.keys(lists).length) {
                lists[DEFAULT_CLIPBOARD_LIST] = [];
                selectedName = DEFAULT_CLIPBOARD_LIST;
              }
              if (selectedName === name) {
                selectedName = getPreferredClipboardList(lists);
              }
              setClipboardLists(lists, () => {
                renderOptions();
                showError('');
              });
            };
            option.appendChild(delBtn);
          }

          listContainer.appendChild(option);
        });
      }

      renderOptions();

      modal.querySelector('.qc-modal-bg').onclick =
      modal.querySelector('.qc-modal-close').onclick =
      modal.querySelector('[data-role="cancel"]').onclick = () => close(null);

      modal.querySelector('[data-role="confirm"]').onclick = () => {
        const chosen = modal.querySelector('input[name="qc-list-option"]:checked');
        if (!chosen) {
          showError('Select a list.');
          return;
        }
        selectedName = chosen.value;
        rememberLastClipboardList(selectedName);
        showError('');
        close(selectedName);
      };

      modal.querySelector('[data-action="create-list"]').onclick = () => {
        const name = (newListInput.value || '').trim();
        if (!name) {
          showError('Enter a name for the list.');
          return;
        }
        if (lists[name]) {
          showError('A list with that name already exists.');
          return;
        }
        const desc = (newListDesc.value || '').trim();
        lists[name] = { items: [], description: desc };
        selectedName = name;
        rememberLastClipboardList(name);
        newListInput.value = '';
        newListDesc.value = '';
        setClipboardLists(lists, () => {
          renderOptions();
          showError('');
        });
      };

      document.body.appendChild(modal);
    });
  });
}

function selectListsToClear() {
  return new Promise(resolve => {
    getClipboardLists(lists => {
      let selected = new Set(Object.keys(lists));
      const modal = document.createElement('div');
      modal.className = 'qc-modal';
      modal.innerHTML = `
        <div class="qc-modal-bg"></div>
        <div class="qc-modal-dialog" style="max-width:420px;">
          <div class="qc-modal-header">
            <span>Clear clipboard</span>
            <button class="qc-modal-close" title="Close">x</button>
          </div>
          <div class="qc-modal-content" style="display:flex;flex-direction:column;gap:10px;">
            <div style="color:#4b5563;font-size:13px;">Choose whether to clear all lists or only specific ones.</div>
            <label style="display:flex;align-items:center;gap:8px;font-weight:600;">
              <input id="qc-clear-all-toggle" type="checkbox" checked />
              Clear all lists
            </label>
            <div class="qc-clear-list-options" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#f8fafc;"></div>
            <div class="qc-modal-error" style="color:#b91c1c;font-size:12px;min-height:14px;"></div>
          </div>
          <div class="qc-modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button data-role="cancel" class="qc-modal-cancel" style="padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;">Cancel</button>
            <button data-role="confirm" class="qc-modal-confirm" style="padding:6px 12px;border:none;border-radius:6px;background:#dc2626;color:#fff;cursor:pointer;">Clear</button>
          </div>
        </div>
      `;

      const listContainer = modal.querySelector('.qc-clear-list-options');
      const clearAllToggle = modal.querySelector('#qc-clear-all-toggle');
      const errorLabel = modal.querySelector('.qc-modal-error');

      function showError(msg) {
        if (errorLabel) errorLabel.textContent = msg || '';
      }

      function close(result) {
        modal.remove();
        resolve(result);
      }

      function renderOptions() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        getSortedListNames(lists).forEach(name => {
          const option = document.createElement('label');
          option.style.display = 'flex';
          option.style.alignItems = 'center';
          option.style.gap = '8px';
          option.style.padding = '6px 8px';
          option.style.borderRadius = '6px';
          option.style.cursor = 'pointer';

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = name;
          input.checked = selected.has(name);
          input.onchange = () => {
            if (input.checked) selected.add(name);
            else selected.delete(name);
            showError('');
          };

          const text = document.createElement('div');
          text.style.display = 'flex';
          text.style.flexDirection = 'column';
          const titleLabel = document.createElement('strong');
          titleLabel.textContent = name;
          const countLabel = document.createElement('span');
          countLabel.textContent = `${Array.isArray((lists[name]||{}).items) ? lists[name].items.length : 0} items`;
          countLabel.style.color = '#6b7280';
          countLabel.style.fontSize = '12px';

          text.appendChild(titleLabel);
          text.appendChild(countLabel);
          option.appendChild(input);
          option.appendChild(text);
          listContainer.appendChild(option);
        });
      }

      renderOptions();

      function toggleListSelectors() {
        const disabled = clearAllToggle.checked;
        listContainer.style.opacity = disabled ? '0.6' : '1';
        listContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.disabled = disabled;
        });
      }

      clearAllToggle.onchange = toggleListSelectors;
      toggleListSelectors();

      modal.querySelector('.qc-modal-bg').onclick =
      modal.querySelector('.qc-modal-close').onclick =
      modal.querySelector('[data-role="cancel"]').onclick = () => close(null);

      modal.querySelector('[data-role="confirm"]').onclick = () => {
        if (clearAllToggle.checked) {
          close({ clearAll: true, lists: [] });
          return;
        }
        if (!selected.size) {
          showError('Select at least one list or choose "Clear all lists".');
          return;
        }
        close({ clearAll: false, lists: Array.from(selected) });
      };

      document.body.appendChild(modal);
    });
  });
}

function openClipboardManager() {
  getClipboardLists(lists => {
    let selectedName = getPreferredClipboardList(lists);

    const modal = document.createElement('div');
    modal.className = 'qc-modal';
    modal.innerHTML = `
      <div class="qc-modal-bg"></div>
      <div class="qc-modal-dialog" style="max-width:540px;">
        <div class="qc-modal-header">
          <span>Manage clipboard lists</span>
          <button class="qc-modal-close" title="Close">x</button>
        </div>
        <div class="qc-modal-content" style="display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:hidden;">
          <div style="display:flex;gap:8px;align-items:center;">
            <label style="font-weight:600;">List:</label>
            <select id="qc-manage-select" style="flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;"></select>
            <button id="qc-manage-delete-list" style="padding:6px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#b91c1c;cursor:pointer;">Delete list</button>
            ${isListPage() ? '<button id="qc-manage-apply" style="padding:6px 10px;border:1px solid #93c5fd;border-radius:6px;background:#eff6ff;color:#1d4ed8;cursor:pointer;">Check rows</button>' : ''}
          </div>
          <div style="font-size:13px;color:#475569;">Remove individual items to clean up a list without clearing everything.</div>
          <div id="qc-manage-items" style="flex:1;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;min-height:120px;background:#f8fafc;"></div>
          <div id="qc-manage-empty" style="display:none;color:#6b7280;font-size:13px;">This list is empty.</div>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#475569;">
            Description
            <textarea id="qc-manage-desc" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;min-height:80px;resize:vertical;"></textarea>
          </label>
        </div>
        <div class="qc-modal-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
          <button data-role="close" class="qc-modal-cancel" style="padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;">Close</button>
        </div>
      </div>
    `;

    const selectEl = modal.querySelector('#qc-manage-select');
    const itemsContainer = modal.querySelector('#qc-manage-items');
    const emptyLabel = modal.querySelector('#qc-manage-empty');
    const deleteListBtn = modal.querySelector('#qc-manage-delete-list');
    const applyBtn = modal.querySelector('#qc-manage-apply');
    const descArea = modal.querySelector('#qc-manage-desc');

    function refreshSelect() {
      selectEl.innerHTML = '';
      getSortedListNames(lists).forEach(name => {
      const option = document.createElement('option');
        option.value = name;
        const count = Array.isArray((lists[name]||{}).items) ? lists[name].items.length : 0;
        option.textContent = `${name} (${count})`;
        if (name === selectedName) option.selected = true;
        selectEl.appendChild(option);
      });
    }

    function renderItems() {
      const currentEntry = lists[selectedName] || { items: [], description: '' };
      const current = currentEntry.items || [];
      if (descArea) descArea.value = currentEntry.description || '';
      itemsContainer.innerHTML = '';
      if (!current.length) {
        emptyLabel.style.display = 'block';
        return;
      }
      emptyLabel.style.display = 'none';
      current.forEach((item, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.gap = '10px';
        row.style.padding = '6px 8px';
        row.style.borderBottom = '1px solid #e5e7eb';

        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.innerHTML = `
          <strong style="font-size:13px;">${item.title}</strong>
          <span style="font-size:12px;color:#475569;">ID: ${item.id}</span>
          <span style="font-size:12px;color:#475569;">Email: ${item.email}</span>
        `;

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Remove';
        Object.assign(delBtn.style, {
          padding: '6px 10px',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          background: '#fef2f2',
          color: '#b91c1c',
          cursor: 'pointer'
        });
        delBtn.onclick = () => {
          const entry = lists[selectedName] || { items: [], description: '' };
          if (Array.isArray(entry.items)) {
            entry.items.splice(idx, 1);
            lists[selectedName] = entry;
          }
          setClipboardLists(lists, () => {
            refreshSelect();
            renderItems();
          });
        };

        row.appendChild(info);
        row.appendChild(delBtn);
        itemsContainer.appendChild(row);
      });
    }

    selectEl.onchange = () => {
      selectedName = selectEl.value;
      rememberLastClipboardList(selectedName);
      renderItems();
    };

    deleteListBtn.onclick = () => {
      if (selectedName === DEFAULT_CLIPBOARD_LIST) {
        alert('Default list cannot be deleted.');
        return;
      }
      const confirmed = confirm(`Delete list "${selectedName}"? Items will be removed.`);
      if (!confirmed) return;
      delete lists[selectedName];
      selectedName = getPreferredClipboardList(lists);
      if (!Object.keys(lists).length) {
        lists[DEFAULT_CLIPBOARD_LIST] = { items: [], description: '' };
        selectedName = DEFAULT_CLIPBOARD_LIST;
      }
      setClipboardLists(lists, () => {
        refreshSelect();
        renderItems();
      });
    };

    modal.querySelector('.qc-modal-bg').onclick =
    modal.querySelector('.qc-modal-close').onclick =
    modal.querySelector('[data-role="close"]').onclick = () => modal.remove();

    if (descArea) {
      descArea.onchange = () => {
        const entry = lists[selectedName] || { items: [], description: '' };
        entry.description = descArea.value;
        lists[selectedName] = entry;
        setClipboardLists(lists);
      };
    }

    if (applyBtn) {
      applyBtn.onclick = () => {
        modal.remove();
        applyListToCheckboxes(selectedName);
      };
    }

    refreshSelect();
    renderItems();
    document.body.appendChild(modal);
  });
}

function normalizeReleaseId(idText) {
  if (!idText) return '';
  return idText.replace('ID:', '').trim();
}

async function applyListToCheckboxes(listName) {
  const statusBox = document.getElementById('qc-list-apply-status');
  const resetStatus = () => {
    if (statusBox) { statusBox.style.display = 'none'; statusBox.textContent = ''; }
  };
  if (!isListPage()) {
    resetStatus();
    return;
  }
  getClipboardLists(lists => {
    const entry = lists[listName] || { items: [], description: '' };
    const items = entry.items || [];
    const targetIds = new Set(items.map(i => normalizeReleaseId(i.id)).filter(Boolean));
    const rows = document.querySelectorAll('#revisionsTable > tbody > tr');
    let matched = 0;

    // First uncheck all rows using real clicks to keep platform state consistent
    rows.forEach(row => {
      const checkbox = row.querySelector('td:nth-child(1) input[type="checkbox"], td:nth-child(1) input');
      if (checkbox && checkbox.checked) {
        checkbox.click();
      }
    });

    // Then check only target IDs using clicks (fires platform listeners and opens bulk modal)
    rows.forEach(row => {
      const releaseId = normalizeReleaseId((row.querySelector('td:nth-child(6)')?.innerText || ''));
      if (!releaseId) return;
      if (targetIds.has(releaseId)) {
        const checkbox = row.querySelector('td:nth-child(1) input[type="checkbox"], td:nth-child(1) input');
        if (checkbox && !checkbox.checked) {
          checkbox.click();
          matched++;
          targetIds.delete(releaseId);
        }
      }
    });

    const missing = items.filter(i => {
      const norm = normalizeReleaseId(i.id);
      return norm && targetIds.has(norm);
    });

    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div><strong>Applied list:</strong> ${listName}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="color:#065f46;background:#ecfdf3;border:1px solid #bbf7d0;padding:4px 8px;border-radius:6px;">Checked ${matched}/${items.length} rows</span>
            ${missing.length ? `<span style="color:#991b1b;background:#fef2f2;border:1px solid #fecdd3;padding:4px 8px;border-radius:6px;">X missing: ${missing.map(m => m.id).join(', ')}</span>` : '<span style="color:#1e3a8a;">All items found</span>'}
          </div>
        </div>
      `;
    }
  });
}

// ====== FUNCIONES PARA GESTIÓN DEL MENÚ DE NAVEGACIÓN ======

// Detectar si el menú de navegación está abierto
function isNavigationMenuOpen() {
  const aside = document.querySelector('body > aside') || document.querySelector('aside');
  if (!aside) return false;
  const sidebar = aside.querySelector('.sidebar');
  const body = document.body;

  // Señales por clases del layout (comunes en AdminLTE/plantillas similares)
  const bodyHasOpen = body.classList.contains('sidebar-open');
  const bodyHasCollapsed = body.classList.contains('sidebar-collapse');
  const isCollapsed = aside.classList.contains('collapsed') || (sidebar && sidebar.classList.contains('collapsed'));

  // Chequeo geométrico: el aside visible y parcialmente dentro del viewport a la izquierda
  const rect = aside.getBoundingClientRect();
  const computed = window.getComputedStyle(aside);
  const isVisible = computed.visibility !== 'hidden' && computed.display !== 'none';
  const wideEnough = rect.width > 100; // típicamente ~250px cuando está abierto
  const onScreenLeft = rect.left >= -5; // tolerancia por transiciones

  const isOpen = (bodyHasOpen && !bodyHasCollapsed) || (!isCollapsed && isVisible && wideEnough && onScreenLeft);

  return isOpen;
}

// NUEVO: Función para detectar si hay modales de audio analysis abiertos
function isAudioAnalysisModalOpen() {
  const audioModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"]');
  return Array.from(audioModals).some(modal => {
    const style = window.getComputedStyle(modal);
    return style.display !== 'none' && modal.classList.contains('show');
  });
}

// NUEVO: Función para manejar cambios de estado de modales de audio
function handleAudioModalStateChange(isOpening, sidebarControls) {
  const { originalPosition, sidebarPosition, isTemporarilyMoved, isTemporarilyMovedForAudio, 
          setSidebarPosition, applySidebarStyles, updateResizerPosition, showNotification } = sidebarControls;
  
  if (qcShouldDebug()) console.log('QC Copilot: Audio modal state changing to:', isOpening ? 'OPEN' : 'CLOSED');
  
  // Solo mover si el sidebar está en la derecha originalmente y no está ya movido por el menú
  if (originalPosition === 'right' && !isTemporarilyMoved) {
    if (isOpening && sidebarPosition === 'right') {
      // Modal de audio se está abriendo y el sidebar está a la derecha
      console.log('QC Copilot: Moving sidebar to left (audio modal opening)');
      setSidebarPosition('left', false, true); // false = no user action, true = for audio
      showNotification('↔️ Sidebar temporarily moved to left (audio analysis)', 'left');
    } else if (!isOpening && isTemporarilyMovedForAudio && sidebarPosition === 'left') {
      // Modal de audio se está cerrando y el sidebar fue movido temporalmente
      console.log('QC Copilot: Moving sidebar back to right (audio modal closing)');
      setSidebarPosition('right', false, false); // false = no user action, false = not for audio
      showNotification('↔️ Sidebar moved back to right', 'right');
    }
  }
}

// Cerrar el menú de navegación simulando click
function closeNavigationMenu() {
  // Buscar el botón toggle del menú - actualizado con más selectores
  const menuToggleSelectors = [
    'body > nav > ul > li > a',
    'button[data-toggle="sidebar"]',
    '.sidebar-toggle',
    'a[href="#"][onclick*="sidebar"]',
    'body > aside button.btn-link',
    '[data-widget="pushmenu"]',
    '.nav-link[data-widget="pushmenu"]'
  ];
  
  for (const selector of menuToggleSelectors) {
    const toggleButton = document.querySelector(selector);
    if (toggleButton) {
      console.log('QC Copilot: Closing navigation menu via:', selector);
      toggleButton.click();
      return true;
    }
  }
  
  console.warn('QC Copilot: Could not find menu toggle button');
  return false;
}

// ====== SPA support: detecta cambios de URL =====
let lastPathname = location.pathname;
function onUrlChange() {
  if (location.pathname !== lastPathname) {
    lastPathname = location.pathname;
    removeDrawer();
    injectDrawer();
  }
}
const originalPushState = history.pushState;
history.pushState = function(...args) {
  originalPushState.apply(this, args);
  onUrlChange();
};
window.addEventListener('popstate', onUrlChange);

// ===== Elimina el sidebar =====
function removeDrawer() {
  const existing = document.getElementById('qc-copilot-sidebar');
  if (existing) existing.remove();
}

// ===== Inyecta el sidebar =====
function injectDrawer() {
  const EXCLUDE_SELECTORS = [
    'selector-1-que-quieras-excluir',
    'selector-2-que-quieras-excluir'
  ];
  EXCLUDE_SELECTORS.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => el.remove())
  );

  // Evita duplicados
  if (document.getElementById('qc-copilot-sidebar')) return;

  // Selectores para extraer info del release en detalle
  const SELECTORS = {
    email:    "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(4) > div:nth-child(2) > h5",
    releaseId:"body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(3) > div > div > div.row.pb-3.align-items-center > div > h5 > span",
    title:    "body > main > section > div.row.mb-3.align-items-center.justify-content-between > div.col-md-8.d-flex.align-items-center.gap-2 > h2"
  };

  // Funciones internas del clipboard con listas nombradas
  function addToClipboard(targetListName) {
    return new Promise(resolve => {
      const email = document.querySelector(SELECTORS.email)?.innerText.trim() || '';
      const id = (document.querySelector(SELECTORS.releaseId)?.innerText.trim() || '').replace('ID:', '').trim();
      const title = document.querySelector(SELECTORS.title)?.innerText.trim() || '';

      if (!email || !id || !title) {
          console.warn('Cannot add to clipboard: Missing release data (email, id, or title).');
          resolve(false);
          return;
      }

      getClipboardLists(lists => {
        const listName = targetListName || DEFAULT_CLIPBOARD_LIST;
        const entry = lists[listName] || { items: [], description: '' };
        const currentList = Array.isArray(entry.items) ? entry.items : [];
        const exists = currentList.some(i => i.id === id);
        if (!exists) {
          currentList.push({ email, id, title });
          lists[listName] = { items: currentList, description: entry.description || '' };
          setClipboardLists(lists, () => {
            console.log('Added to internal clipboard:', { email, id, title, listName });
            resolve(true);
          });
        } else {
          console.log('Release already exists in internal clipboard, not adding:', { email, id, title, listName });
          updateClipboardDisplays(lists);
          resolve(true);
        }
      });
    });
  }

  function copyClipboardList(targetListName) {
    getClipboardLists(lists => {
      const listName = targetListName || DEFAULT_CLIPBOARD_LIST;
      const selected = lists[listName] || { items: [], description: '' };
      const selectedList = selected.items || [];
      if (!selectedList.length) {
        copyToClipboard(`List "${listName}" is empty.`);
        return;
      }
      copyToClipboard(buildClipboardText(selectedList));
    });
  }

  function clearClipboard(listNames = [], clearAll = false) {
    getClipboardLists(lists => {
      const namesToClear = clearAll || !listNames.length ? Object.keys(lists) : listNames;
      namesToClear.forEach(name => {
        if (lists[name]) {
          const desc = lists[name].description || '';
          lists[name] = { items: [], description: desc };
        }
      });
      setClipboardLists(lists);
    });
  }

  function searchZendesk() {
    const userEmail = document.querySelector(SELECTORS.email)?.innerText.trim();
    if (userEmail) {
      const zendeskSearchUrl = `https://sonosuite.zendesk.com/agent/search/1?copy&type=ticket&q=${encodeURIComponent(userEmail)}`;
      window.open(zendeskSearchUrl, '_blank');
    } else {
      const alertModal = document.createElement('div');
      alertModal.className = 'qc-modal';
      alertModal.innerHTML = `
        <div class="qc-modal-bg"></div>
        <div class="qc-modal-dialog">
          <div class="qc-modal-header">
            <span>Error</span>
            <button class="qc-modal-close" title="Close">x</button>
          </div>
          <div class="qc-modal-content">Could not extract the email to search in Zendesk.</div>
        </div>
      `;
      document.body.appendChild(alertModal);
      alertModal.querySelector('.qc-modal-close').onclick =
      alertModal.querySelector('.qc-modal-bg').onclick = () => alertModal.remove();
    }
  }

  // ===== Sidebar UI =====
  const width = 400, minWidth = 40, qcColor = '#23272B';
  const sidebar = document.createElement('div');
  sidebar.id = 'qc-copilot-sidebar';

  // === GESTIÓN DE POSICIÓN DEL SIDEBAR ===
  // NOTA: El sidebar ya NO se mueve automáticamente con el menú.
  // El usuario controla la posición manualmente con el botón de toggle.
  let originalPosition = localStorage.getItem('qcSidebarPosition') || 'right';
  let sidebarPosition = originalPosition;
  let isTemporarilyMoved = false;
  let isTemporarilyMovedForAudio = false;

  // Estado minimizado
  let minimized = localStorage.getItem('qcSidebarMinimized') === 'true';

  // Función para cambiar la posición del sidebar
  function setSidebarPosition(position, isUserAction = false, isForAudio = false) {
    sidebarPosition = position;

    if (isUserAction) {
      // El usuario cambió manualmente la posición - guardar preferencia
      originalPosition = position;
      localStorage.setItem('qcSidebarPosition', position);
      isTemporarilyMoved = false;
      isTemporarilyMovedForAudio = false;
    } else if (isForAudio) {
      // Movimiento por modal de audio (temporal)
      isTemporarilyMovedForAudio = true;
      isTemporarilyMoved = false;
    }
    
    applySidebarStyles();
    updateResizerPosition();
  }

  function applySidebarStyles() {
    Object.assign(sidebar.style, {
      position: 'fixed', top: '0', height: '100vh',
      background: '#fff', boxShadow: sidebarPosition === 'right' ? '-3px 0 12px rgba(0,0,0,0.1)' : '3px 0 12px rgba(0,0,0,0.1)',
      fontFamily: 'sans-serif', fontSize: '14px', color: '#111',
      display: 'flex', flexDirection: 'column', transition: 'width .25s, left .25s, right .25s',
      zIndex: '100000',
      width: `${minimized ? minWidth : (parseInt(localStorage.getItem('qcSidebarWidth'), 10) || width)}px`,
      left: sidebarPosition === 'left' ? '0' : 'auto',
      right: sidebarPosition === 'right' ? '0' : 'auto',
      borderLeft: sidebarPosition === 'right' ? '1px solid #e2e8f0' : 'none',
      borderRight: sidebarPosition === 'left' ? '1px solid #e2e8f0' : 'none'
    });

    // NOTE: We no longer modify body margins - the sidebar floats over the content
    // This prevents layout conflicts with the backoffice menu
  }

  function setMinimized(min) {
    minimized = min;
    localStorage.setItem('qcSidebarMinimized', min);
    if (min) {
      Object.assign(sidebar.style, { width: `${minWidth}px`, background: qcColor });
      mainContent.style.display = 'none';
      miniBar.style.display = 'flex';
    } else {
      const saved = parseInt(localStorage.getItem('qcSidebarWidth'), 10) || width;
      const w = Math.max(saved, minWidth);
      Object.assign(sidebar.style, { width: `${w}px`, background: '#fff' });
      mainContent.style.display = 'flex';
      miniBar.style.display = 'none';
    }
    applySidebarStyles();
  }

  // NUEVO: Función helper para mostrar notificaciones
  function showNotification(text, side = 'right') {
    const notification = document.createElement('div');
    notification.textContent = text;
    notification.style.cssText = `
      position:fixed; 
      top:70px; 
      ${side}:20px; 
      background:#3b82f6; 
      color:#fff; 
      padding:10px 15px; 
      border-radius:8px; 
      z-index:100001; 
      font-size:13px; 
      box-shadow:0 2px 8px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // NUEVO: Objeto para pasar controles del sidebar a las funciones de manejo
  const sidebarControls = {
    originalPosition,
    get sidebarPosition() { return sidebarPosition; },
    isTemporarilyMoved,
    isTemporarilyMovedForAudio,
    setSidebarPosition,
    applySidebarStyles,
    updateResizerPosition: null, // Se definirá más adelante
    showNotification
  };

  // === OBSERVER PARA DETECTAR CAMBIOS EN EL MENÚ ===
  // NOTA: El sidebar YA NO se mueve cuando el menú se abre/cierra.
  // El usuario pidió que el menú se abra AL LADO del copilot sin moverlo.
  // Solo mantenemos logging para debugging si es necesario.
  function setupMenuObserver() {
    if (qcShouldDebug()) {
      console.log('QC Copilot: Menu observer initialized (sidebar will NOT move with menu)');
      console.log('QC Copilot: Initial menu state:', isNavigationMenuOpen() ? 'OPEN' : 'CLOSED');
    }
    // No hay más lógica - el sidebar permanece en su posición fija
  }

  // NUEVO: Función para observar modales de audio analysis
  function setupAudioModalObserver() {
    let audioModalWasOpen = isAudioAnalysisModalOpen();
    if (qcShouldDebug()) console.log('QC Copilot: Initial audio modal state:', audioModalWasOpen);
    
    // Actualizar sidebarControls con las referencias actuales
    sidebarControls.originalPosition = originalPosition;
    sidebarControls.isTemporarilyMoved = isTemporarilyMoved;
    sidebarControls.isTemporarilyMovedForAudio = isTemporarilyMovedForAudio;
    
    // Observer para detectar nuevos modales de audio que se agreguen al DOM
    const audioModalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Verificar si el nodo agregado o sus hijos son modales de audio
            const audioModals = node.id && node.id.startsWith('revision-audio-analysis-modal-') 
              ? [node] 
              : node.querySelectorAll ? Array.from(node.querySelectorAll('[id^="revision-audio-analysis-modal-"]')) : [];
            
            audioModals.forEach((modal) => {
              // Observar cambios de clase en el modal específico
              const modalObserver = new MutationObserver(() => {
                const isNowOpen = isAudioAnalysisModalOpen();
                if (isNowOpen !== audioModalWasOpen) {
                  if (qcShouldDebug()) console.log(`QC Copilot: Audio modal state changed from ${audioModalWasOpen} to ${isNowOpen}`);
                  // Actualizar referencias en sidebarControls
                  sidebarControls.isTemporarilyMoved = isTemporarilyMoved;
                  sidebarControls.isTemporarilyMovedForAudio = isTemporarilyMovedForAudio;
                  handleAudioModalStateChange(isNowOpen, sidebarControls);
                  audioModalWasOpen = isNowOpen;
                  
                  // Actualizar variables locales después del manejo
                  isTemporarilyMovedForAudio = sidebarControls.isTemporarilyMovedForAudio;
                }
              });
              
              modalObserver.observe(modal, { 
                attributes: true, 
                attributeFilter: ['class', 'style', 'aria-hidden'] 
              });
            });
          }
        });
      });
    });
    
    // Observar el body para detectar cuando se agregan nuevos modales
    audioModalObserver.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // También verificar periódicamente por si acaso
    setInterval(() => {
      const isNowOpen = isAudioAnalysisModalOpen();
      if (isNowOpen !== audioModalWasOpen) {
        if (qcShouldDebug()) console.log(`QC Copilot: Audio modal state changed (periodic check) from ${audioModalWasOpen} to ${isNowOpen}`);
        // Actualizar referencias en sidebarControls
        sidebarControls.isTemporarilyMoved = isTemporarilyMoved;
        sidebarControls.isTemporarilyMovedForAudio = isTemporarilyMovedForAudio;
        handleAudioModalStateChange(isNowOpen, sidebarControls);
        audioModalWasOpen = isNowOpen;
        
        // Actualizar variables locales después del manejo
        isTemporarilyMovedForAudio = sidebarControls.isTemporarilyMovedForAudio;
      }
    }, 1000);
    
    if (qcShouldDebug()) console.log('QC Copilot: Audio modal observer setup complete');
  }

  // Contenido principal con botones mejorados
  const mainContent = document.createElement('div');
  mainContent.id = 'qc-main-content';
  Object.assign(mainContent.style, {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    overflow: 'hidden'
  });

  mainContent.innerHTML = `
    <div style="padding:12px; background:#f8f9fa; border-bottom:1px solid #eaeaea; display:flex; align-items:center; justify-content:space-between;">
      <strong style="font-size:16px; color:#1e3a8a;">QC Copilot</strong>
      <div style="display:flex; gap:8px;">
        <button id="qc-sidebar-add" class="qc-toolbar-btn" title="Add to clipboard">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
          </svg>
          <span>Add</span>
        </button>

        <button id="qc-sidebar-copy-all" class="qc-toolbar-btn" title="Copy current release summary or all clipboard items">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span>Copy</span>
          <span id="qc-clipboard-counter" class="qc-badge">0</span>
        </button>

        <button id="qc-sidebar-manage" class="qc-toolbar-btn" title="Manage clipboard lists">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 16h14M9 4h6M9 20h6"/>
          </svg>
          <span>Lists</span>
        </button>

        <button id="qc-sidebar-clear" class="qc-toolbar-btn" title="Clear clipboard">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <span>Clear</span>
        </button>

        <button id="qc-sidebar-zendesk" class="qc-toolbar-btn" title="Search Zendesk">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>Zendesk</span>
        </button>



        <button id="qc-sidebar-toggle-side" class="qc-icon-btn" title="Toggle side">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
        </button>

        <div style="position:relative;">
          <button id="qc-sidebar-min" class="qc-icon-btn" title="Minimize">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14"/>
            </svg>
          </button>
        </div>

        <button id="qc-sidebar-close" class="qc-icon-btn" title="Close">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    <div id="qc-list-apply-status" style="display:none;padding:8px 10px;background:#f8fafc;border-bottom:1px solid #e5e7eb;color:#111;font-size:13px;"></div>
    <iframe id="qc-sidebar-iframe" src="${getDrawerIframeSrc()}" style="flex:1; border:none; width:100%;"></iframe>
  `;

  // Estilos para los botones
  const style = document.createElement('style');
  style.textContent = `
    .qc-toolbar-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 60px;
      position: relative;
    }

    .qc-toolbar-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .qc-toolbar-btn svg {
      width: 18px;
      height: 18px;
      margin-bottom: 4px;
      stroke: #4b5563;
    }

    .qc-toolbar-btn span {
      line-height: 1;
    }

    .qc-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .qc-icon-btn:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .qc-icon-btn svg {
      width: 16px;
      height: 16px;
      stroke: #4b5563;
    }

    .qc-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: #ef4444;
      color: white;
      border-radius: 10px;
      min-width: 18px;
      height: 18px;
      font-size: 11px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      display: none;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);

  // Resizer draggable
  const resizer = document.createElement('div');
  resizer.style = `
    position:absolute; top:0; bottom:0; width:7px;
    cursor:col-resize; z-index:100000;
    background:linear-gradient(to right,#e0e0e0 0 80%,transparent 100%);
    border-left:2px solid #b0b0b0;
  `;
  sidebar.appendChild(resizer);

  let startX = 0, startW = 0, resizing = false, shield = null;
  function onMouseMove(e) {
    if (!resizing) return;
    const dx = sidebarPosition === 'right' ? startX - e.clientX : e.clientX - startX;
    const newW = Math.max(minWidth, startW + dx);
    if (newW <= minWidth) { 
      setMinimized(true); 
      cleanup(); 
    } else {
      setMinimized(false);
      sidebar.style.width = newW + 'px';
      if (sidebarPosition === 'right') {
        document.body.style.marginRight = newW + 'px';
      } else {
        document.body.style.marginLeft = newW + 'px';
      }
      localStorage.setItem('qcSidebarWidth', newW);
    }
  }
  
  function cleanup() {
    resizing = false;
    window.removeEventListener('mousemove', onMouseMove, true);
    window.removeEventListener('mouseup', onMouseUp, true);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (shield) { 
      shield.remove(); 
      shield = null; 
    }
  }
  
  function onMouseUp() { 
    if (resizing) cleanup(); 
  }
  
  resizer.addEventListener('mousedown', e => {
    resizing = true;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    shield = document.createElement('div');
    shield.style = `
      position:fixed; left:0; top:0; width:100vw; height:100vh;
      z-index:2147483647; cursor:col-resize; background:transparent;
    `;
    document.body.appendChild(shield);

    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);
  });

  // Mini bar
  const miniBar = document.createElement('div');
  miniBar.id = 'qc-mini';
  Object.assign(miniBar.style, { 
    display: 'none', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: qcColor, 
    height: '100vh', 
    width: '100%', 
    cursor: 'pointer' 
  });
  miniBar.innerHTML = `
    <div style="writing-mode: sideways-lr; color:#fff; font-weight:bold;">QC Copilot</div>
    <div style="position:relative;margin-top:10px;">
      <span id="qc-mini-counter" style="
        background:#ff4444;
        color:white;
        border-radius:10px;
        padding:2px 6px;
        font-size:11px;
        font-weight:bold;
        min-width:16px;
        text-align:center;
        display:none;
      ">0</span>
    </div>
    <button id="qc-sidebar-expand" title="Expand" style="background:none;border:none;color:#fff;margin-top:10px;">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    </button>
  `;

  sidebar.appendChild(mainContent);
  sidebar.appendChild(miniBar);
  document.body.appendChild(sidebar);
  document.body.style.transition = 'margin-right .2s, margin-left .2s';

  // Bind handlers con feedback
  const btnAdd     = mainContent.querySelector('#qc-sidebar-add');
  const btnCopyAll = mainContent.querySelector('#qc-sidebar-copy-all');
  const btnClear   = mainContent.querySelector('#qc-sidebar-clear');
  const btnManage  = mainContent.querySelector('#qc-sidebar-manage');
  const btnZendesk = mainContent.querySelector('#qc-sidebar-zendesk');

  const btnToggleSide = mainContent.querySelector('#qc-sidebar-toggle-side');

  btnAdd.onclick = async function() {
    try {
      const targetList = await selectClipboardList({ title: 'Select the list to add to', confirmText: 'Use list' });
      if (!targetList) return;
      const span = btnAdd.querySelector('span');
      if (isListPage()) {
        addCheckedToClipboard(targetList).then(success => {
          if (success && span) {
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            setTimeout(() => span.textContent = originalText, 1000);
          }
        });
      } else {
        addToClipboard(targetList).then(added => {
          if (added && span) {
            const originalText = span.textContent;
            span.textContent = 'Added!';
            setTimeout(() => span.textContent = originalText, 1000);
          }
        });
      }
    } catch (e) { console.warn('Add button error:', e); }
  };

  btnCopyAll.onclick = async function() {
    try {
      const targetList = await selectClipboardList({ title: 'Select the list to copy', confirmText: 'Copy' });
      if (!targetList) return;
      const span = btnCopyAll.querySelector('span');
      const markCopied = () => {
        if (span) {
          const originalText = span.textContent;
          span.textContent = 'Copied!';
          setTimeout(() => span.textContent = originalText, 1000);
        }
      };

      if (isListPage()) {
        copyClipboardList(targetList);
        markCopied();
      } else {
        copyClipboardList(targetList);
        markCopied();
      }
    } catch (e) { console.warn('Copy button error:', e); }
  };

  btnClear.onclick = async function() {
    try {
      const selection = await selectListsToClear();
      if (!selection) return;
      clearClipboard(selection.lists, selection.clearAll);
      const span = btnClear.querySelector('span');
      if (span) {
        const originalText = span.textContent;
        span.textContent = 'Cleared!';
        setTimeout(() => span.textContent = originalText, 1000);
      }
    } catch (e) { console.warn('Clear button error:', e); }
  };

  btnManage.onclick = function() {
    openClipboardManager();
  };

  btnZendesk.onclick = searchZendesk;

  btnToggleSide.onclick = function() {
    const newPosition = sidebarPosition === 'right' ? 'left' : 'right';
    setSidebarPosition(newPosition, true); // true = acción del usuario
  };

  mainContent.querySelector('#qc-sidebar-min').onclick = () => setMinimized(true);
  mainContent.querySelector('#qc-sidebar-close').onclick = () => removeDrawer();
  miniBar.querySelector('#qc-sidebar-expand').onclick = () => setMinimized(false);

  // Ajustar la posición del resizer
  function updateResizerPosition() {
    if (sidebarPosition === 'left') {
      resizer.style.left = 'auto';
      resizer.style.right = '0';
      resizer.style.background = 'linear-gradient(to left,#e0e0e0 0 80%,transparent 100%)';
      resizer.style.borderLeft = 'none';
      resizer.style.borderRight = '2px solid #b0b0b0';
    } else {
      resizer.style.left = '0';
      resizer.style.right = 'auto';
      resizer.style.background = 'linear-gradient(to right,#e0e0e0 0 80%,transparent 100%)';
      resizer.style.borderLeft = '2px solid #b0b0b0';
      resizer.style.borderRight = 'none';
    }
  }

  // MODIFICADO: Actualizar sidebarControls con updateResizerPosition
  sidebarControls.updateResizerPosition = updateResizerPosition;

  // Estado inicial
  applySidebarStyles();
  updateResizerPosition();
  setMinimized(minimized);
  
  // Configurar el observer del menu
  setupMenuObserver();

  // NUEVO: Configurar el observer de modales de audio
  setupAudioModalObserver();

  // Actualizar contador al cargar
  updateClipboardCounter();
  setupClipboardSyncListener();
}

// Funcion para actualizar ambos contadores (normal y mini)
function updateAllCounters() {
  getClipboardLists(updateClipboardDisplays);
}

// Reemplazar las llamadas a updateClipboardCounter por updateAllCounters
window.updateClipboardCounter = updateAllCounters;

console.log("QC Copilot: Starting injectionón en", window.location.href);

// Inyección inicial robusta
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectDrawer();
} else {
  document.addEventListener('DOMContentLoaded', injectDrawer);
}
