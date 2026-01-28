(function(){
  function activate(which){
    var cop = document.getElementById('qc-tab-copilot');
    var wlt = document.getElementById('qc-tab-workload');
    var bc = document.getElementById('qc-tab-btn-copilot');
    var bw = document.getElementById('qc-tab-btn-workload');
    if (!cop || !wlt) return;
    if (which === 'workload') {
      cop.style.display = 'none'; wlt.style.display = 'block';
      if (bc) { bc.style.background = '#fff'; bc.style.borderColor = '#e5e7eb'; }
      if (bw) { bw.style.background = '#f1f5f9'; bw.style.borderColor = '#cbd5e1'; }
      try { window.dispatchEvent(new CustomEvent('qcwt:shown')); } catch(_) {}
    } else {
      cop.style.display = 'block'; wlt.style.display = 'none';
      if (bc) { bc.style.background = '#f1f5f9'; bc.style.borderColor = '#cbd5e1'; }
      if (bw) { bw.style.background = '#fff'; bw.style.borderColor = '#e5e7eb'; }
    }
    try { localStorage.setItem('qc.activeTab', which); } catch(_) {}
  }

  function setup(){
    var bc = document.getElementById('qc-tab-btn-copilot');
    var bw = document.getElementById('qc-tab-btn-workload');
    if (bc) bc.addEventListener('click', function(){ activate('copilot'); });
    if (bw) bw.addEventListener('click', function(){ activate('workload'); });
    var last = null; try { last = localStorage.getItem('qc.activeTab'); } catch(_) {}
    activate(last === 'workload' ? 'workload' : 'copilot');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
