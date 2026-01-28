document.addEventListener("DOMContentLoaded", () => {
  const QC_LOG_PREFIX = "[QCWT]";
  const qclog = (...args) => console.log(QC_LOG_PREFIX, ...args);
  const agentSelect = document.getElementById("agentSelect");
  const daySelect = document.getElementById("daySelect");
  const refreshBtn = document.getElementById("refreshBtn");
  const tenantList = document.getElementById("tenantList");
  const lastUpdate = document.getElementById("lastUpdate");

  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz6Hg5Z50Ok8htGQyUlqSOJMuVDJDKfjp9345MvVfC9-Sut-E4PX04IxbKdvzB9f7SK/exec";

  // Load agents list first, then restore saved agent
  loadAgents().then(() => {
    // Load saved agent after agents are loaded
    chrome.storage.local.get(["selectedAgent", "selectedDay"], data => {
      if (data.selectedAgent) {
        agentSelect.value = data.selectedAgent;
      }
      if (data.selectedDay) {
        daySelect.value = data.selectedDay;
      }
      // Auto-load workload data when agent is restored
      if (agentSelect.value) {
        loadWorkloadData();
      }
    });
  });

  // Save agent selection
  agentSelect.addEventListener("change", () => {
    chrome.storage.local.set({ selectedAgent: agentSelect.value });
    if (agentSelect.value) {
      loadWorkloadData();
    }
  });

  // Day selection change
  daySelect.addEventListener("change", () => {
    chrome.storage.local.set({ selectedDay: daySelect.value });
    if (agentSelect.value) {
      loadWorkloadData();
    }
  });

  // Refresh button handler
  refreshBtn.addEventListener("click", () => {
    loadWorkloadData();
  });

  // No floating window; UI is injected as a drawer on the site

  // Auto-refresh every 5 minutes
  setInterval(() => {
    if (agentSelect.value) {
      loadWorkloadData();
    }
  }, 5 * 60 * 1000);

  async function loadAgents() {
    try {
      console.log("Loading agents from:", `${APPS_SCRIPT_URL}?action=getAgents`);
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getAgents`);
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.status === "success") {
        agentSelect.innerHTML = '<option value="">Select Agent...</option>';
        data.agents.forEach(agent => {
          const option = document.createElement("option");
          option.value = agent;
          option.textContent = agent;
          agentSelect.appendChild(option);
        });
        console.log("Agents loaded successfully:", data.agents);
        return Promise.resolve(); // Return resolved promise
      } else {
        throw new Error(data.message || "Unknown error from server");
      }
    } catch (error) {
      console.error("Error loading agents:", error);
      agentSelect.innerHTML = `<option value="">Error: ${error.message}</option>`;
      return Promise.reject(error);
    }
  }

  async function loadWorkloadData() {
    if (!agentSelect.value) return;
    
    tenantList.innerHTML = "<p>Loading...</p>";
    
    try {
      console.log("Loading workload for agent:", agentSelect.value, "day:", daySelect.value);
      
      const [workloadResponse, completedResponse] = await Promise.all([
        fetch(`${APPS_SCRIPT_URL}?action=getWorkload&agent=${encodeURIComponent(agentSelect.value)}&day=${daySelect.value}`),
        fetch(`${APPS_SCRIPT_URL}?action=getCompleted&agent=${encodeURIComponent(agentSelect.value)}&day=${daySelect.value}`)
      ]);

      console.log("Workload response status:", workloadResponse.status);
      console.log("Completed response status:", completedResponse.status);

      const workloadData = await workloadResponse.json();
      const completedData = await completedResponse.json();

      qclog("Workload data:", workloadData);
      qclog("Completed data:", completedData);

      if (workloadData.status === "success" && completedData.status === "success") {
        displayWorkload(workloadData.workload, completedData.completed);
        lastUpdate.textContent = "Last updated: " + new Date().toLocaleTimeString();
      } else {
        const errorMsg = workloadData.message || completedData.message || "Unknown error";
        tenantList.innerHTML = `<p>Error loading data: ${errorMsg}</p>`;
      }
    } catch (error) {
      console.error("Error loading workload:", error);
      tenantList.innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
  }

  function displayWorkload(workload, completed) {
    // Build normalized map for completed: lowercased, no spaces or punctuation
    const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const completedNorm = {};
    Object.keys(completed || {}).forEach(k => { completedNorm[normalize(k)] = completed[k]; });
    qclog("Completed keys (raw):", Object.keys(completed || {}));
    qclog("Workload tenants (raw):", workload.map(w => w.tenant));
    if (workload.length === 0) {
      tenantList.innerHTML = "<p>No workload assigned for this day</p>";
      return;
    }

    tenantList.innerHTML = "";
    
    workload.forEach(tenant => {
      const nameKey = normalize(tenant.tenant);
      const completedCount = (completed[tenant.tenant]) || completedNorm[nameKey] || 0;
      qclog("Match check", { tenant: tenant.tenant, key: nameKey, completedCount });
      const assignedCount = parseInt(tenant.releases) || 0;
      
      const tenantDiv = document.createElement("div");
      tenantDiv.className = "tenant";
      
      tenantDiv.innerHTML = `
        <div class="tenant-header">
          <strong>${tenant.tenant}</strong>
          <span class="progress">${completedCount}/${assignedCount}</span>
        </div>
        <div class="tenant-details">
          <span>Releases: ${assignedCount} | Completed: ${completedCount}</span>
          ${tenant.days ? `<span class="delay">Delay: ${tenant.days} days</span>` : ''}
        </div>
        ${tenant.comments ? `<div class="comments">Comments: ${tenant.comments}</div>` : ''}
      `;
      
      tenantList.appendChild(tenantDiv);
    });
  }
});
