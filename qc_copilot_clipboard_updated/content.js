// content.js - SIMPLIFIED VERSION - Analysis always runs on page load

(function() {
  // === ANÁLISIS SIEMPRE ACTIVO - SIN BYPASS ===
  
  // NUEVO: Variables globales para control de análisis de audio
  let audioAnalysisEnabled = true;
  let audioAnalysisInProgress = false;
  let audioAnalysisQueue = [];
  let audioAnalysisResults = [];
  let importantModalsOpen = false;
  
  // NUEVO: Sistema de detección de cierre de modal para análisis más rápido
  let modalCloseObserver = null;
  let pendingModalClose = false;
  
  // NUEVO: Función para verificar si hay modales importantes abiertos
  function checkImportantModals() {
    const importantModalSelectors = [
      '#revision-add-ticket-modal',
      '#revision-client-action-modal', 
      '#modal-revision-approve',
      '#revision-reject-reason-modal'
    ];
    
    importantModalsOpen = importantModalSelectors.some(selector => {
      const modal = document.querySelector(selector);
      if (modal) {
        const style = window.getComputedStyle(modal);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               modal.classList.contains('show');
      }
      return false;
    });
    
    if (importantModalsOpen) {
      console.log('QC Copilot: Important modal detected, avoiding audio analysis');
    }
    
    return importantModalsOpen;
  }
  
  // NUEVO: Función para verificar si el análisis de audio está habilitado
  function isAudioAnalysisEnabled() {
    return audioAnalysisEnabled && !importantModalsOpen;
  }
  
  // NUEVO: Función para forzar la detención del análisis de audio
  function forceStopAudioAnalysis() {
    console.log('QC Copilot: Force stopping audio analysis...');
    
    // NUEVO: Marcar como deshabilitado
    audioAnalysisEnabled = false;
    audioAnalysisInProgress = false;
    
    // NUEVO: Cancelar todas las operaciones en progreso
    if (audioAnalysisAbortController) {
      audioAnalysisAbortController.abort();
      audioAnalysisAbortController = null;
    }
    
    // NUEVO: Limpiar estado
    audioAnalysisQueue = [];
    audioAnalysisResults = [];
    
    // NUEVO: Limpiar modales activos
    cleanupStuckModals();
    
    // NUEVO: Limpiar observer
    if (modalCloseObserver) {
      modalCloseObserver.disconnect();
      modalCloseObserver = null;
    }
    
    // NUEVO: Limpiar resultados en window
    window.qcAudioAnalysisResults = [];
    
    console.log('QC Copilot: Audio analysis force stopped and cleaned up');
  }
  
  // NUEVO: Función para habilitar/deshabilitar análisis de audio
  function setAudioAnalysisEnabled(enabled) {
    audioAnalysisEnabled = enabled;
    try {
      localStorage.setItem('qcAudioAnalysis', enabled.toString());
    } catch (_) {}
    
    if (!enabled) {
      // Detener análisis en progreso
      audioAnalysisInProgress = false;
      audioAnalysisQueue = [];
      audioAnalysisResults = [];
      
      // Cerrar modales de audio analysis si están abiertos
      const audioModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"]');
      audioModals.forEach(modal => {
        if (modal.classList.contains('show') || 
            window.getComputedStyle(modal).display !== 'none') {
          closeAudioModal(modal);
        }
      });
      
      console.log('QC Copilot: Audio analysis disabled, stopped all operations');
    } else {
      console.log('QC Copilot: Audio analysis enabled');
    }
  }
  
  // NUEVO: Función optimizada para análisis secuencial rápido de audio
  async function performOptimizedAudioAnalysis(tracksWithAlerts) {
    console.log('QC Copilot: performOptimizedAudioAnalysis called with tracks:', tracksWithAlerts);
    
    if (!audioAnalysisEnabled) {
      console.log('QC Copilot: Audio analysis disabled, skipping');
      return [];
    }
    
    if (importantModalsOpen) {
      console.log('QC Copilot: Important modals open, skipping audio analysis');
      return [];
    }
    
    if (audioAnalysisInProgress) {
      console.log('QC Copilot: Audio analysis already in progress, skipping');
      return audioAnalysisResults;
    }
    
    audioAnalysisInProgress = true;
    audioAnalysisQueue = [...tracksWithAlerts];
    audioAnalysisResults = [];
    
    console.log(`QC Copilot: Starting ULTRA FAST audio analysis for ${tracksWithAlerts.length} tracks`);
    
    // NUEVO: Configurar detección de cierre de modal para análisis más rápido
    setupModalCloseDetection();
    
    try {
      // OPTIMIZADO: Procesar tracks de forma ULTRA rápida
      for (let i = 0; i < tracksWithAlerts.length; i++) {
        // NUEVO: Verificar en cada iteración si el análisis fue deshabilitado
        if (!audioAnalysisEnabled) {
          console.log('QC Copilot: Audio analysis disabled during processing, stopping immediately');
          break;
        }
        
        const track = tracksWithAlerts[i];
        
        console.log(`QC Copilot: Processing track ${i + 1}/${tracksWithAlerts.length}:`, track);
        
        // Verificar si se debe continuar
        if (importantModalsOpen) {
          console.log('QC Copilot: Important modals opened during processing, stopping');
          break;
        }
        
        try {
          // OPTIMIZADO: Inicialización rápida solo al inicio
          if (i === 0) { 
            console.log(`QC Copilot: Initializing ultra-fast audio analysis`);
            initializeAudioAnalysisCache(); // Pre-cachear datos comunes
            await cleanupStuckModals(); // Limpiar modales del inicio
          }
          
          // OPTIMIZADO: Verificación rápida de modal
          if (!isAudioAnalysisModalAccessible()) {
            console.log(`QC Copilot: Modal not accessible for track ${i + 1}, quick cleanup and retry`);
            await cleanupStuckModals();
            await new Promise(resolve => setTimeout(resolve, 25)); // ULTRA-OPTIMIZADO: Reducido de 100ms a 25ms
            
            if (!isAudioAnalysisModalAccessible()) {
              console.log(`QC Copilot: Modal still not accessible for track ${i + 1}, skipping`);
              continue;
            }
          }
          
          // OPTIMIZADO: Análisis ultra rápido del track
          console.log(`QC Copilot: Starting ULTRA FAST analysis for track ${i + 1} (index: ${track.trackIndex})`);
          
          // NUEVO: Obtener el título real del track, no "Track X"
          const realTrackTitle = track.header && !track.header.startsWith('Track ') ? track.header : 
            document.querySelector(`#track-${track.trackIndex}-info h5.font-extra-bold.fs-5`)?.textContent?.trim() || track.header;
          
          console.log(`QC Copilot: Using real track title: "${realTrackTitle}" instead of "${track.header}"`);
          
          const result = await analyzeTrackAudioUltraFast(track.trackIndex, realTrackTitle);
          if (result) {
            audioAnalysisResults.push(result);
            console.log(`QC Copilot: Track ${i + 1} analysis completed ULTRA FAST:`, result);
          } else {
            console.warn(`QC Copilot: Track ${i + 1} analysis returned no result`);
          }
          
          // OPTIMIZADO: Pausa mínima entre tracks (reducida de 300ms a 50ms)
          if (i < tracksWithAlerts.length - 1) { // No esperar después del último track
            await new Promise(resolve => setTimeout(resolve, 25)); // OPTIMIZADO: Reducido de 50ms a 25ms
          }
          
        } catch (error) {
          console.error(`QC Copilot: Error analyzing track ${i + 1}:`, error);
          // Continuar con el siguiente track en lugar de fallar completamente
        }
      }
      
      console.log(`QC Copilot: ULTRA FAST audio analysis completed, ${audioAnalysisResults.length} results`);
      
      // NUEVO: Limpiar después del análisis para evitar bloqueos
      await cleanupAfterAudioAnalysis();
      
    } catch (error) {
      console.error('QC Copilot: Error during ULTRA FAST audio analysis:', error);
      
      // NUEVO: Limpiar también en caso de error
      await cleanupAfterAudioAnalysis();
    } finally {
      audioAnalysisInProgress = false;
      audioAnalysisQueue = [];
      
      // NUEVO: Limpiar el observer de detección de modal
      if (modalCloseObserver) {
        modalCloseObserver.disconnect();
        modalCloseObserver = null;
      }
      
      console.log('QC Copilot: Audio analysis state reset');
    }
    
    return audioAnalysisResults;
  }
  
  // OPTIMIZADO: Pre-cachear datos que se usan frecuentemente
  function initializeAudioAnalysisCache() {
    // Limpiar cache previo
    window._qcAlbumCache = null;
    
    // Pre-cachear álbum
    const albumElement = document.querySelector('body > main > section h2');
    if (albumElement) {
      window._qcAlbumCache = albumElement.textContent.trim();
      console.log('QC Copilot: Album cached:', window._qcAlbumCache);
    }
  }

  // OPTIMIZADO: Función ultra-rápida para análisis de audio de un track
  async function analyzeTrackAudioOptimized(trackIndex, trackTitle) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`QC Copilot: Starting ultra-fast analysis for track ${trackIndex + 1} (${trackTitle})`);
        
        // Verificación rápida de estado
        if (!audioAnalysisEnabled) {
          reject(new Error('Audio analysis disabled'));
          return;
        }
        
        if (importantModalsOpen) {
          reject(new Error('Important modals open'));
          return;
        }
        
        // Buscar botón de alerta de forma más eficiente
        console.log(`QC Copilot: Looking for alert button for track ${trackIndex + 1}`);
        const alertButton = findAlertButtonEfficiently(trackIndex);
        if (!alertButton) {
          console.error(`QC Copilot: No alert button found for track ${trackIndex + 1}`);
          reject(new Error(`No alert button found for track ${trackIndex + 1}`));
          return;
        }
        
        console.log(`QC Copilot: Alert button found for track ${trackIndex + 1}:`, alertButton);
        
        // Abrir modal de forma más rápida
        console.log(`QC Copilot: Opening modal for track ${trackIndex + 1}`);
        const modal = await openAudioModalQuickly(alertButton);
        if (!modal) {
          console.error(`QC Copilot: Failed to open modal for track ${trackIndex + 1}`);
          reject(new Error(`Failed to open modal for track ${trackIndex + 1}`));
          return;
        }
        
        console.log(`QC Copilot: Modal opened successfully for track ${trackIndex + 1}:`, modal.id);
        
        // Extraer datos rápidamente
        console.log(`QC Copilot: Extracting data from modal for track ${trackIndex + 1}`);
        const modalData = extractAudioAnalysisData(modal, trackTitle, trackIndex);
        console.log(`QC Copilot: Modal data extracted for track ${trackIndex + 1}:`, modalData);
        
        // Cerrar modal rápidamente
        console.log(`QC Copilot: Closing modal for track ${trackIndex + 1}`);
        await closeAudioModalQuickly(modal);
        console.log(`QC Copilot: Modal closed for track ${trackIndex + 1}`);
        
        // Extraer información adicional del track
        console.log(`QC Copilot: Extracting additional track info for track ${trackIndex + 1}`);
        const finalData = await extractTrackInfoAfterModalClose(trackIndex, trackTitle, modalData);
        console.log(`QC Copilot: Final data for track ${trackIndex + 1}:`, finalData);
        
        resolve(finalData);
        
      } catch (error) {
        console.error(`QC Copilot: Error in optimized analysis for track ${trackIndex + 1}:`, error);
        reject(error);
      }
    });
  }
  
  // NUEVO: Función eficiente para encontrar botón de alerta
  function findAlertButtonEfficiently(trackIndex) {
    console.log(`QC Copilot: Finding alert button for track index ${trackIndex}`);
    
    // Selectores optimizados y ordenados por prioridad
    const selectors = [
      `[id^="track-${trackIndex}-info"] button.alert`,
      `[id^="track-${trackIndex}-info"] button.alert-warning`,
      `[id^="track-${trackIndex}-info"] button.btn-warning`,
      `[id^="track-${trackIndex}-info"] button[class*="alert"]`,
      `[id^="track-${trackIndex}-info"] button[class*="warning"]`,
      // NUEVO: Selectores adicionales más genéricos
      `[id*="track-${trackIndex}"][id*="info"] button.alert`,
      `[id*="track-${trackIndex}"][id*="info"] button.alert-warning`,
      `[id*="track-${trackIndex}"][id*="info"] button.btn-warning`,
      // NUEVO: Buscar en contenedores cercanos
      `[id*="track-${trackIndex}"] button.alert`,
      `[id*="track-${trackIndex}"] button.alert-warning`,
      `[id*="track-${trackIndex}"] button.btn-warning`
    ];
    
    console.log(`QC Copilot: Trying selectors for track ${trackIndex}:`, selectors);
    
    for (const selector of selectors) {
      try {
        const button = document.querySelector(selector);
        if (button) {
          console.log(`QC Copilot: Found button with selector "${selector}":`, button);
          
          // Verificar que el botón sea usable
          const style = window.getComputedStyle(button);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0';
          
          if (button.disabled) {
            console.log(`QC Copilot: Button found but disabled:`, button);
            continue;
          }
          
          if (!isVisible) {
            console.log(`QC Copilot: Button found but not visible:`, button);
            continue;
          }
          
          console.log(`QC Copilot: Valid button found for track ${trackIndex}:`, button);
          return button;
        }
      } catch (error) {
        console.warn(`QC Copilot: Error with selector "${selector}":`, error);
      }
    }
    
    // NUEVO: Fallback - buscar en todo el documento por contenido
    console.log(`QC Copilot: No button found with selectors, trying fallback search`);
    
    const allButtons = document.querySelectorAll('button');
    for (const button of allButtons) {
      try {
        const buttonText = button.textContent.toLowerCase();
        const buttonTitle = button.title?.toLowerCase() || '';
        const buttonClasses = button.className.toLowerCase();
        
        if (buttonText.includes('alert') || buttonTitle.includes('alert') || buttonClasses.includes('alert') ||
            buttonText.includes('warning') || buttonTitle.includes('warning') || buttonClasses.includes('warning')) {
          
          // Verificar si está cerca del track correspondiente
          const trackElement = document.querySelector(`[id*="track-${trackIndex}"]`);
          if (trackElement && (
              trackElement.contains(button) || 
              trackElement.closest('.row')?.contains(button) ||
              button.closest('.row')?.contains(trackElement) ||
              button.closest('[id*="track-"]')?.id.includes(trackIndex.toString())
          )) {
            console.log(`QC Copilot: Found button via fallback for track ${trackIndex}:`, button);
            return button;
          }
        }
      } catch (error) {
        console.warn('QC Copilot: Error in fallback button search:', error);
      }
    }
    
    console.error(`QC Copilot: No alert button found for track ${trackIndex} with any method`);
    return null;
  }
  
  // OPTIMIZADO: Función ultra-rápida para abrir modal de audio
  async function openAudioModalQuickly(alertButton) {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 40; // Más intentos pero intervalos más cortos
      
      // Pre-configurar observer para detectar modal inmediatamente
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            for (const node of addedNodes) {
              if (node.nodeType === 1 && node.classList && node.classList.contains('modal')) {
                observer.disconnect();
                resolve(node);
                return;
              }
            }
          }
          // También observar cambios de clase en modales existentes
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList && target.classList.contains('modal') && target.classList.contains('show')) {
              observer.disconnect();
              resolve(target);
              return;
            }
          }
        }
      });
      
      // Observar cambios en el body para detectar modales nuevos
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
      
      const tryOpen = () => {
        if (attempts >= maxAttempts) {
          console.warn('QC Copilot: Modal open timeout');
          observer.disconnect();
          resolve(null);
          return;
        }
        
        attempts++;
        
        // Hacer click en el botón
        alertButton.click();
        
        // Verificación rápida con intervalo reducido
        setTimeout(() => {
          const modal = document.querySelector('.modal.show, .modal[style*="display: block"]');
          if (modal) {
            observer.disconnect();
            resolve(modal);
          } else {
            tryOpen();
          }
        }, 25); // Reducido de 100ms a 25ms
      };
      
      // Timeout de seguridad
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
      
      tryOpen();
    });
  }
  
  // OPTIMIZADO: Función ultra-rápida para cerrar modal de audio
  async function closeAudioModalQuickly(modal) {
    return new Promise((resolve) => {
      // Observer para detectar cuando el modal se cierra
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target === modal && !target.classList.contains('show')) {
              observer.disconnect();
              resolve();
              return;
            }
          }
          if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
            for (const removedNode of mutation.removedNodes) {
              if (removedNode === modal) {
                observer.disconnect();
                resolve();
                return;
              }
            }
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
      
      // Buscar botón de cierre con prioridad optimizada
      const closeSelectors = [
        '.btn-close',
        '.close', 
        '[data-bs-dismiss="modal"]',
        '[data-dismiss="modal"]',
        'button[class*="close"]'
      ];
      
      let closeButton = null;
      for (const selector of closeSelectors) {
        closeButton = modal.querySelector(selector);
        if (closeButton) break;
      }
      
      if (closeButton) {
        closeButton.click();
      } else {
        // Métodos alternativos más agresivos
        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        // Forzar cierre inmediato si no hay botón
        setTimeout(() => {
          modal.classList.remove('show', 'fade');
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
          // Remover overlay si existe
          const overlay = document.querySelector('.modal-backdrop');
          if (overlay) overlay.remove();
          observer.disconnect();
          resolve();
        }, 50); // Reducido de 200ms a 50ms
        return;
      }
      
      // Timeout de seguridad más corto
      setTimeout(() => {
        observer.disconnect();
        // Forzar cierre si no se cerró naturalmente
        modal.classList.remove('show', 'fade');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const overlay = document.querySelector('.modal-backdrop');
        if (overlay) overlay.remove();
        resolve();
      }, 300); // Reducido de timeout general
    });
  }
  
  // Detectar si es una recarga vs. nueva pestaña
  function shouldSkipAnalysis() {
    // SIMPLIFICADO: Siempre permitir análisis
    console.log('QC Copilot: Analysis always allowed - no bypass logic');
    return false;
  }
  
  // Función simplificada para marcar URL como analizada
  function markURLAsAnalyzed() {
    console.log('QC Copilot: URL marked as analyzed');
  }
  
  // Función simplificada para limpiar caché
  function clearAnalysisCache() {
    console.log('QC Copilot: Analysis cache cleared');
  }
  
  // MODIFICADO: Detectores mejorados para botones de acción
  function setupActionButtonDetectors() {
    // NUEVO: Selectores específicos proporcionados por el usuario
    const actionButtonSelectors = [
      '#button-revision-add-ticket',
      '#button-revision-disapprove', 
      '#button-revision-approve',
      '#button-revision-reject',
      '#revision-client-action-modal > div > div > div.modal-footer > button.btn.btn-primary',
      '#revision-client-action-modal > div > div > div.modal-footer > button.btn.btn-outline-secondary',
      '#revision-reject-reason-modal > div > div > div.modal-footer > button.btn.btn-primary',
      '#revision-reject-reason-modal > div > div > div.modal-footer > button.btn.btn-outline-secondary',
      // Selectores adicionales genéricos
      'button[type="submit"]',
      'button[onclick*="approve"]', 'button[onclick*="reject"]', 'button[onclick*="changes"]',
      '.btn-success', '.btn-danger', '.btn-warning',
      '[data-action="approve"]', '[data-action="reject"]', '[data-action="request-changes"]',
      'form button[type="submit"]'
    ];
    
    actionButtonSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(button => {
          // Evitar agregar listeners duplicados
          if (!button.hasAttribute('data-qc-monitored')) {
            button.addEventListener('click', () => {
              console.log('QC Copilot: Action button clicked');
            });
            button.setAttribute('data-qc-monitored', 'true');
          }
        });
      } catch (e) {
        // Selector inválido, ignorar
      }
    });
  }

  // Debounce function para limitar la frecuencia de ejecución de una función.
  function debounce(func, delay) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), delay);
    };
  }

  // Versión "debounced" de la función principal de extracción de datos.
  const debouncedExtractReleaseData = debounce(extractReleaseData, 500);

  const ZERO_DURATION_REGEX = /^0{1,2}:0{2}(?::0{2})?$/;
  function isZeroDuration(str) {
    if (!str) return false;
    const raw = String(str).split('/').pop().trim().replace(/\s+/g, '');
    return ZERO_DURATION_REGEX.test(raw);
  }

  function findDurationForTrack(trackIndex, infoDiv, playerDiv) {
    let player = playerDiv;
    if (!player) {
      player =
        document.querySelector(`.player[id="track-${trackIndex}-info"]`) ||
        document.querySelector(`.player[id^="track-${trackIndex}"]`) ||
        document.querySelector(`#track-${trackIndex}-info`) ||
        document.querySelector(`[data-track-player][id="track-${trackIndex}-info"]`) ||
        document.querySelector(`[data-track-player="${trackIndex}"]`);
    }

    const playerRow = player?.closest('div.row.mb-2');
    const scope = playerRow || player?.closest('.row') || player || infoDiv;
    let duration = '';

    const durationSpans = scope
      ? scope.querySelectorAll('span.player-time-duration:not(.player-time-current), span.player-time.player-time-duration:not(.player-time-current)')
      : [];
    if (durationSpans && durationSpans.length > 0) {
      const el = durationSpans[durationSpans.length - 1];
      duration = (el.textContent || el.innerText || '').trim();
    }

    if (!duration) {
      const fallbackDurationEl =
        document.querySelector(
          `#track-${trackIndex}-info span.player-time-duration:not(.player-time-current), #track-${trackIndex}-info span.player-time.player-time-duration:not(.player-time-current)`
        ) ||
        document.querySelector(
          `[id^="track-${trackIndex}"] span.player-time-duration:not(.player-time-current), [id^="track-${trackIndex}"] span.player-time.player-time-duration:not(.player-time-current)`
        );
      if (fallbackDurationEl) {
        duration = (fallbackDurationEl.textContent || fallbackDurationEl.innerText || '').trim();
      }
    }

    return duration;
  }

  // 1) Función principal de extracción de datos del release
  async function extractReleaseData() {
    // === VERIFICAR SI DEBE EVITAR EL ANÁLISIS ===
    if (shouldSkipAnalysis()) {
      console.log('QC Copilot: Analysis skipped');
      return; // Salir sin hacer análisis
    }
    
    // ==== DECLARACIONES DE VARIABLES AL INICIO ====
    let userStrikes = [];
    let strikeCount = 0;
    
    // ==== EXCLUSIÓN DE SELECTORES PARA NO INCLUIR EN METADATA ====
    const EXCLUDE_SELECTORS = [
      'body > main > section > div.row.row-cols-2.gx-1 > div:nth-child(1) > div > div > div.pt-3 > div:nth-child(5) > div.col-8.d-flex > p',
      '[id^="track-"][id$="-info"] > div:nth-child(5) > div.col-8.d-flex > p',
      'body > aside > div.sidebar.mb-3.d-flex.flex-grow-1.flex-column > nav > ul.list-unstyled.mb-0 > li > button > span',
      'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(3) > div > div > div:nth-child(6) > div:nth-child(2) > h5',
      'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(2) > div > div > div:nth-child(4) > div:nth-child(2) > h5',
      '#releaseShowMoreInfo > div:nth-child(2)',
      '#releaseShowMoreInfo > div:nth-child(2) > div.col-8.d-flex > p',
      '#releaseShowMoreInfo > div:nth-child(3)',
      '#releaseShowMoreInfo > div:nth-child(3) > div.col-8.d-flex > p'
    ];
    function isExcluded(node) {
      return EXCLUDE_SELECTORS.some(sel =>
        node.matches(sel) || node.closest(sel)
      );
    }

    // Extraer email del usuario
    const emailSelector = 'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(4) > div:nth-child(2) > h5, ' +
  'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(4) > div:nth-child(2) > p';
    const userEmail = document.querySelector(emailSelector)?.textContent.trim() || '';

    // ==== 1) TÍTULO / STATUS / COVER ====
    const releaseIdFromURL = (() => {
      try {
        const parts = (location.pathname || '').split('/').filter(Boolean);
        const idx = parts.indexOf('revisions');
        return idx !== -1 && parts[idx+1] ? parts[idx+1] : '';
      } catch (_) { return ''; }
    })();
    const title = document.querySelector('h2')?.innerText || '';
    const status = document.querySelector('span.badge')?.innerText || '';
    const coverUrl = document.querySelector('img.img-fluid')?.src || '';

    // ==== 2) CARDS ====
    const cards = {};
    document.querySelectorAll('div.row.row-cols-3 .card-body').forEach(card => {
      if (isExcluded(card)) return;
      const section = card.querySelector('h5.font-extra-bold')?.innerText.trim() || 'No section';
      const data = {};
      card.querySelectorAll('div.row.py-2.align-items-center').forEach(row => {
        if (isExcluded(row)) return;
        const key = row.querySelector('h5.text-muted')?.innerText.trim();
        if (!key || key === 'Digital Release' || key === 'Original Release') return;
        const raw = row.querySelector('p')?.innerHTML.trim() || '';
        data[key] = raw;
      });
      if (Object.keys(data).length) cards[section] = data;
    });

    // ==== 3) DECODIFICACIÓN DE EMAILS ====
    function decodeCloudflareEmail(enc) {
      let e = '', r = parseInt(enc.substr(0,2),16);
      for (let n = 2; n < enc.length; n += 2) {
        e += String.fromCharCode(parseInt(enc.substr(n,2),16) ^ r);
      }
      return e;
    }

    Object.values(cards).forEach(section => {
      Object.entries(section).forEach(([k,v]) => {
        if (/__cf_email__/.test(v)) {
          const enc = v.match(/data-cfemail="([a-f0-9]+)"/i)?.[1];
          if (enc) section[k] = decodeCloudflareEmail(enc);
        } else {
          section[k] = new DOMParser()
            .parseFromString(v,'text/html')
            .body.textContent
            .trim();
        }
      });
    });

    // ==== 4) showMoreInfo ====
    const showMoreInfo = [];
    document.querySelectorAll('#releaseShowMoreInfo > div').forEach(row => {
      if (isExcluded(row)) return;
      const key = row.querySelector('h5.text-muted')?.innerText.trim();
      if (key === 'Digital Release' || key === 'Original Release') return;
      const p = row.querySelector('p');
      if (!p) return;
      const txt = p.innerHTML.trim();
      if (/__cf_email__/.test(txt)) {
        const enc = txt.match(/data-cfemail="([a-f0-9]+)"/i)?.[1];
        if (enc) showMoreInfo.push(decodeCloudflareEmail(enc));
      } else {
        showMoreInfo.push(new DOMParser()
          .parseFromString(txt,'text/html')
          .body.textContent
          .trim());
      }
    });

    // ==== 5) basicInfo y ARTISTAS ====
    // MEJORADO: Captura dinámica de Artists - detecta cualquier campo dentro de la sección "Artists"
    const basicInfo = { Metadata: {}, Artists: {} };

    // Primero, encontrar los campos que están dentro de la sección "Artists" del DOM
    const artistSectionFields = new Set();
    document.querySelectorAll('h5.font-extra-bold').forEach(h5 => {
      if (h5.innerText.trim() !== 'Artists') return;
      // Encontrar el contenedor de la sección Artists y extraer todos los field names
      h5.closest('.pt-3')?.querySelectorAll('div.row.py-2').forEach(row => {
        if (isExcluded(row)) return;
        const divs = row.querySelectorAll(':scope > div');
        if (divs.length < 2) return;
        const key = divs[0].innerText.trim();
        if (key) artistSectionFields.add(key);
      });
    });
    console.log('[Artists Section] Dynamic fields detected:', Array.from(artistSectionFields));

    // Ahora procesar Basic Information usando los campos detectados dinámicamente
    document.querySelectorAll('h5.font-extra-bold').forEach(h5 => {
      if (h5.innerText.trim() !== 'Basic Information') return;
      h5.closest('.pt-3')?.querySelectorAll('div.row.py-2').forEach(row => {
        if (isExcluded(row)) return;
        const divs = row.querySelectorAll(':scope > div');
        if (divs.length < 2) return;
        const key = divs[0].innerText.trim();
        const val = divs[1].innerText.trim();
        if (!key || key === 'Release Date') return;
        const isArtistField = artistSectionFields.has(key);
        console.log(`[BasicInfo Debug] Field: "${key}" = "${val}" | isArtistField: ${isArtistField}`);
        if (isArtistField) basicInfo.Artists[key] = val;
        else basicInfo.Metadata[key] = val;
      });
    });

    // ==== 6) Strikes y Verificación de usuario ====
    // Variables ya declaradas al inicio de la función
    
    // MEJORADO: Múltiples selectores para encontrar los strikes
    const strikeSelectors = [
      "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(5) > div:nth-child(2) > h5 > a > u",
      "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(5) > div:nth-child(2) > h5 > a",
      "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(5) > div:nth-child(2) > h5",
      "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(5) > div:nth-child(2)"
    ];
    
    let strikeEl = null;
    for (const selector of strikeSelectors) {
      strikeEl = document.querySelector(selector);
      if (strikeEl) {
        console.log(`Strikes found with selector: ${selector}`);
        console.log(`Strike element text: "${strikeEl.textContent}"`);
        break;
      }
    }
    
    if (strikeEl) {
      const strikeText = strikeEl.textContent || strikeEl.innerText || '';
      console.log(`Full strike text: "${strikeText}"`);
      
      // MEJORADA: Regex más flexible para detectar diferentes formatos de strikes
      const strikePatterns = [
        /F\d+/gi           // Solo F seguido de números (más específico)
      ];
      
      let allMatches = [];
      strikePatterns.forEach((pattern, index) => {
        const matches = strikeText.match(pattern);
        if (matches) {
          console.log(`Pattern ${index + 1} (${pattern}) found:`, matches);
          allMatches = allMatches.concat(matches);
        }
      });
      
      // NO remover duplicados - mantener todos los strikes individuales
      const allStrikes = allMatches
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);
      
      strikeCount = allStrikes.length;
      
      console.log(`All strikes found:`, allStrikes);
      console.log(`Total strike count:`, strikeCount);
      
      // CAMBIO: Mostrar cada strike individual, no hacer resumen
      userStrikes = allStrikes; // Mantener la lista completa sin agrupar
      
      console.log(`Individual strikes to display:`, userStrikes);
      
    } else {
      console.warn('No strike element found with any selector');
      
      // FALLBACK: Buscar en toda la tarjeta de usuario
      const userCard = document.querySelector('body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1)');
      if (userCard) {
        const cardText = userCard.textContent || userCard.innerText || '';
        console.log(`Searching for strikes in user card text: "${cardText}"`);
        
        const matches = cardText.match(/F\d+/gi);
        if (matches) {
          const allStrikes = matches.map(s => s.trim().toUpperCase());
          strikeCount = allStrikes.length;
          
          // CAMBIO: Mostrar strikes individuales, no hacer resumen
          userStrikes = allStrikes; // Mantener la lista completa
          
          console.log(`Found strikes via fallback:`, userStrikes);
          console.log(`Total strike count via fallback:`, strikeCount);
        }
      }
    }
    
    // — Verificación (badge VERIFIED / NOT_VERIFIED / VERIFYING)
    let userVerificationStatus = '-', userVerificationColor = '#ff4949';
    const userCard = document.querySelector(
      'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1)'
    );
    if (userCard) {
      const verEl = Array.from(userCard.querySelectorAll('span.badge'))
        .find(el => /verified|verifying|-/i.test(el.textContent));
      if (verEl) {
        let txt = verEl.textContent.trim().toUpperCase();
        if (txt === '-' || txt === '–') txt = 'NOT_VERIFIED';
        userVerificationStatus = txt;
        if      (txt === 'VERIFIED')   userVerificationColor = '#28A745';
        else if (txt === 'VERIFYING')  userVerificationColor = '#17A2B8';
        else                            userVerificationColor = '#6C757D';
      }
    }

    // ==== 6) TRACKS ====
    const trackSections = [];

    // PASO 1: Encontrar todos los tracks de forma robusta (infoDivs y/o players)
    const infoCandidates = Array.from(document.querySelectorAll('[data-track-info]'));
    const playerCandidates = Array.from(document.querySelectorAll('.player[id^="track-"]'));

    const candidateEntries = [
      ...infoCandidates.map(div => ({ div, src: 'info' })),
      ...playerCandidates.map(div => ({ div, src: 'player' }))
    ];

    const seen = new Set();
    const trackInfoDivs = candidateEntries.map(({ div, src }) => {
        const match = div.id && div.id.match(/track-(\d+)-info/);
        const trackIndex = match ? parseInt(match[1], 10) : -1;
        return { div, trackIndex, src };
      })
      .filter(item => item.trackIndex >= 0 && !seen.has(item.trackIndex) && seen.add(item.trackIndex))
      .sort((a, b) => a.trackIndex - b.trackIndex);

    try { if (localStorage.getItem('qcDebug') === 'true') console.log('Track info divs found:', trackInfoDivs.map(t => `track-${t.trackIndex}-info`)); } catch (_) {}
    
    // CAMBIO: Usar for...of en lugar de forEach para poder usar await
    if (trackInfoDivs && trackInfoDivs.length > 0) {
      for (const { div: infoDiv, trackIndex } of trackInfoDivs) {
        const arrayIndex = trackInfoDivs.findIndex(item => item.div === infoDiv);
        const displayTrackNumber = arrayIndex + 1;
        
        // PASO 1: Extraer header y sections
        const header = infoDiv.querySelector('h5.font-extra-bold.fs-5')?.innerText.trim() || 'Untitled';
      const sections = { Metadata: {}, Artists: {} };

        // MEJORADO: Usar los campos de Artists detectados dinámicamente (artistSectionFields)
        infoDiv.querySelectorAll('div.row.py-2').forEach(row => {
          if (isExcluded(row)) return;
          const divs = row.querySelectorAll(':scope > div');
          if (divs.length < 2) return;
          const key = divs[0].innerText.trim();
          const val = divs[1].innerText.trim();
          if (!key || key === 'Release Date') return;
          const isArtistField = artistSectionFields.has(key);
          console.log(`[Track Debug] Field: "${key}" = "${val}" | isArtistField: ${isArtistField}`);
          if (isArtistField) sections.Artists[key] = val;
          else sections.Metadata[key] = val;
        });

        // PASO 2: Buscar el player correspondiente usando el trackIndex exacto
      let duration = '';
      let hasAlert = false;
      let analysis = [];

        // Algunos players no tienen valor en data-track-player, pero comparten el mismo id que el infoDiv (track-X-*)
        // Ampliamos la búsqueda para casos donde el id no termina en "-info" y para DOMs sin la clase mb-2.
        let playerDiv = document.querySelector(`.player[id="track-${trackIndex}-info"]`) ||
                        document.querySelector(`.player[id^="track-${trackIndex}"]`) ||
                        document.querySelector(`#track-${trackIndex}-info`) ||
                        document.querySelector(`[data-track-player][id="track-${trackIndex}-info"]`) ||
                        document.querySelector(`[data-track-player="${trackIndex}"]`);
        try { if (localStorage.getItem('qcDebug') === 'true') console.log(`Looking player for track-${trackIndex}:`, { found: !!playerDiv, candidate: playerDiv?.id || '(none)' }); } catch (_) {}
      
      if (playerDiv) {
        // Duración
        const playerRow = playerDiv.closest('div.row.mb-2');
        const scope = playerRow || playerDiv.closest('.row') || playerDiv || infoDiv;
        duration = findDurationForTrack(trackIndex, infoDiv, playerDiv);

    // Verificar alerta de audio en el mismo row del player
        const alertScope = playerRow || scope || playerDiv;
        const alertButton = alertScope?.querySelector('button.alert.alert-warning, button.alert-warning, button.btn-warning');
        if (alertButton) {
          hasAlert = true;
          try { if (localStorage.getItem('qcDebug') === 'true') console.log(`Audio alert track ${displayTrackNumber}`); } catch (_) {}
        }
      } else {
        try { if (localStorage.getItem('qcDebug') === 'true') console.warn(`Player not found for track ${displayTrackNumber}`); } catch (_) {}
      }

        // PASO 3: Agregar el track con toda la información
      trackSections.push({
        header,
        sections,
        duration,
        hasAlert,
        analysis,
        trackIndex, // Mantener referencia al índice real del DOM
        displayNumber: displayTrackNumber // Número que se muestra al usuario
      });
      
        try { if (localStorage.getItem('qcDebug') === 'true') console.log(`Track ${displayTrackNumber} processed`); } catch (_) {}
      }
    }

    try { if (localStorage.getItem('qcDebug') === 'true') console.log(`Tracks processed: ${trackSections.length}`); } catch (_) {}

    // ==== 7) Construcción de allTextRaw ====
    let allTextRaw = title + ' ' + status;

    // Cards (solo valores, ignorando labels .text-muted)
    Object.values(cards).forEach(section => {
      Object.values(section).forEach(val => {
        const text = (val || '').toString().trim();
        if (text) allTextRaw += ' ' + text;
      });
    });

    // showMoreInfo
    showMoreInfo.forEach(txt => { if (txt) allTextRaw += ' ' + txt; });

    // Basic Information (solo valores, sin labels .text-muted)
    Object.values(basicInfo.Metadata).forEach(val => {
      const text = (val || '').toString().trim();
      if (text) allTextRaw += ' ' + text;
    });
    Object.values(basicInfo.Artists).forEach(val => {
      const text = (val || '').toString().trim();
      if (text) allTextRaw += ' ' + text;
    });

    // Track sections
    trackSections.forEach(track => {
      allTextRaw += ' ' + track.header;
      Object.values(track.sections.Metadata).forEach(val => {
        if (val) allTextRaw += ' ' + val;
      });
      Object.values(track.sections.Artists).forEach(val => {
        if (val) allTextRaw += ' ' + val;
      });
    });

    // ==== 8) Guardar releaseData ====
    const releaseData = {
      title,
      status,
      coverUrl,
      cards: {
        ...cards,
        User: {
          ...(cards.User || {}),
          Email: userEmail
        }
      },
      basicInfo,
      trackSections,
      showMoreInfo,
      allTextRaw,
      userStrikes,
      strikeCount,
      userVerificationStatus,
      userVerificationColor
    };

    // ==== 9) Validación: "0 tracks" ====
    let noTracksValidation = false;
    
    if (trackSections.length === 0) {
      const trackInfoDivs = document.querySelectorAll('[data-track-info]');
      if (trackInfoDivs.length === 0) {
        noTracksValidation = true;
        console.log('No tracks confirmed');
      }
    }

    // ==== 10) Verificar historial de rechazos ====
    let previouslyRejected = false;
    try {
      try { if (localStorage.getItem('qcDebug') === 'true') console.log('Checking previous rejection...'); } catch (_) {}
      // Evitar múltiples checks para el mismo release
      if (window.__qcPrevRejCheckedForId !== releaseIdFromURL) {
      previouslyRejected = await checkPreviousRejectionDOM();
        window.__qcPrevRejCheckedForId = releaseIdFromURL;
      } else {
        previouslyRejected = releaseData.previouslyRejected || false;
      }
      try { if (localStorage.getItem('qcDebug') === 'true') console.log('Previous rejection:', previouslyRejected); } catch (_) {}
    } catch (error) {
      console.error('Error during previous rejection check:', error);
      if (status && status.toLowerCase().includes('rejected')) {
        previouslyRejected = true;
      }
    }

    // Re-chequear duraciones 00:00:00 después de un delay para evitar falsos positivos
    const zeroDurationTracks = trackSections.filter(t => isZeroDuration(t.duration || ''));
    if (zeroDurationTracks.length > 0) {
      try { if (window.__qcZeroDurationRecheckTimer) clearTimeout(window.__qcZeroDurationRecheckTimer); } catch (_) {}
      window.__qcZeroDurationRecheckTimer = setTimeout(() => {
        try {
          let changed = false;
          trackSections.forEach(t => {
            const infoEntry = trackInfoDivs.find(entry => entry.trackIndex === t.trackIndex);
            const newDuration = findDurationForTrack(t.trackIndex, infoEntry?.div);
            if (newDuration && newDuration !== t.duration) {
              t.duration = newDuration;
              changed = true;
            }
          });
          if (changed) {
            sendReleaseDataToBackground(releaseData, noTracksValidation, previouslyRejected);
          }
        } catch (err) {
          console.error('QC Copilot: zero-duration recheck failed:', err);
        }
      }, 3500);
    }


    // Marcar URL como analizada después de completar el análisis
    markURLAsAnalyzed();

    // Logging final
    try { if (localStorage.getItem('qcDebug') === 'true') {
      console.log('Release:', releaseData.title);
      console.log('Alerts:', trackSections.filter(t => t.hasAlert).map(t => `${t.displayNumber}. ${t.header}`));
      console.log('No tracks:', noTracksValidation);
    console.log('Previously rejected:', previouslyRejected);
      console.log('Strikes:', { strikesArray: userStrikes, totalStrikeCount: strikeCount, hasAnyStrikes: strikeCount > 0 });
    }} catch (_) {}

    // Enviar datos al background
    sendReleaseDataToBackground(releaseData, noTracksValidation, previouslyRejected);
  }

  // NUEVO: Función para extraer datos de Release History directamente desde la API
  async function extractReleaseHistoryFromAPI() {
    console.log('[QC] Extracting release history from API...');
    
    try {
      // Extraer el release_reference de la URL actual
      let releaseReference = null;
      
      // Método 1: Buscar directamente en la URL
      const directMatch = window.location.href.match(/release_reference=(\d+)/);
      if (directMatch) {
        releaseReference = directMatch[1];
      } else {
        // Método 2: Buscar en el returnUrl codificado
        const returnUrlMatch = window.location.href.match(/returnUrl=([^&]+)/);
        if (returnUrlMatch) {
          const decodedReturnUrl = decodeURIComponent(returnUrlMatch[1]);
          const searchValueMatch = decodedReturnUrl.match(/searchValue=(\d+)/);
          if (searchValueMatch && searchValueMatch[1]) {
            releaseReference = searchValueMatch[1];
          }
        }
      }
      
      // Método 3: Buscar en el DOM de la página
      if (!releaseReference) {
        // Buscar en elementos que puedan contener el release_reference
        const possibleElements = [
          'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(3) > div > div > div.row.pb-3.align-items-center > div > h5 > span',
          'input[name="release_reference"]',
          'input[id*="release"]',
          '[data-release-reference]',
          '[data-release-id]',
          '.release-reference',
          '.release-id'
        ];
        
        for (const selector of possibleElements) {
          const element = document.querySelector(selector);
          if (element) {
            // Para el selector específico, obtener el texto
            if (selector.includes('h5 > span')) {
              const text = element.textContent.trim();
              // Buscar número después de "ID:" o cualquier patrón numérico
              const numberMatch = text.match(/(\d+)/);
              if (numberMatch) {
                releaseReference = numberMatch[1];
                console.log(`[QC] Found release_reference in DOM element ${selector}: ${releaseReference} (from text: "${text}")`);
                break;
              }
            } else if (element.value) {
              releaseReference = element.value;
              console.log(`[QC] Found release_reference in DOM element ${selector}: ${releaseReference}`);
              break;
            }
          }
        }
      }
      
      // Método 4: Buscar en el texto de la página
      if (!releaseReference) {
        const pageText = document.body.textContent;
        const textMatch = pageText.match(/release[_\s]*reference[:\s]*(\d+)/i);
        if (textMatch) {
          releaseReference = textMatch[1];
          console.log(`[QC] Found release_reference in page text: ${releaseReference}`);
        }
      }
      
      if (!releaseReference) {
        console.log('[QC] Could not extract release_reference from URL or DOM');
        console.log('[QC] Current URL:', window.location.href);
        return { hasRejected: false, data: [] };
      }
      console.log(`[QC] Using release_reference: ${releaseReference}`);
      
      // Hacer la llamada AJAX directamente a la API
      const response = await fetch(
        `${window.location.origin}/api/v2/quality-control/revisions?order_by=created_at&release_reference=${releaseReference}`
      );
      
      if (!response.ok) {
        console.error('[QC] API call failed:', response.status, response.statusText);
        return { hasRejected: false, data: [] };
      }
      
      const apiData = await response.json();
      console.log('[QC] API response received:', apiData);
      
      if (!apiData.data || !apiData.data.values) {
        console.log('[QC] No data in API response');
        return { hasRejected: false, data: [] };
      }
      
      let hasRejected = false;
      const historyData = [];
      
      // Procesar cada revisión
      apiData.data.values.forEach((revision, index) => {
        const status = revision.status || '';
        const statusLower = status.toLowerCase();
        
        // Detectar rechazos (solo "rejected" es rechazado)
        const isRejected = statusLower === 'rejected';
        
        if (isRejected) {
          hasRejected = true;
          console.log(`[QC] Rejected status found in revision ${index + 1}: "${status}"`);
        }
        
        const rowData = {
          index: index + 1,
          title: revision.release.title || '',
          date: new Date(revision.created_at).toLocaleDateString(),
          status: status,
          isRejected: isRejected
        };
        
        historyData.push(rowData);
        
        // Log de cada revisión para debug
        console.log(`[QC] Revision ${index + 1}: "${revision.release.title}" - ${status} ${isRejected ? '(REJECTED)' : ''}`);
      });
      
      console.log(`[QC] Release history extracted: ${historyData.length} entries, hasRejected: ${hasRejected}`);
      
      return {
        hasRejected,
        data: historyData,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[QC] Error extracting release history from API:', error);
      return { hasRejected: false, data: [] };
    }
  }

  // NUEVO: Función para extraer datos de Release History directamente del DOM
  async function extractReleaseHistoryFromDOM() {
    console.log('QC Copilot: Extracting release history data directly from DOM...');
    
    const modal = document.querySelector('#revisionHistoryModal');
    if (!modal) {
      console.log('QC Copilot: Release history modal not found in DOM');
      return { hasRejected: false, data: [] };
    }

    const table = modal.querySelector('#revision-history');
    if (!table) {
      console.log('QC Copilot: Release history table not found in modal');
      return { hasRejected: false, data: [] };
    }

    let rows = table.querySelectorAll('tr');
    console.log(`QC Copilot: Found ${rows.length} rows in release history`);
    
    // Si no hay datos, hacer la llamada AJAX directamente
    if (rows.length === 0) {
      console.log('QC Copilot: No data in table, making direct AJAX call...');
      
      try {
        // Extraer el release_reference de la URL actual
        const urlMatch = window.location.href.match(/\/releases\/(\d+)/);
        if (!urlMatch) {
          console.log('QC Copilot: Could not extract release reference from URL');
          return { hasRejected: false, data: [] };
        }
        
        const releaseReference = urlMatch[1];
        console.log(`QC Copilot: Using release reference: ${releaseReference}`);
        
        // Hacer la llamada AJAX directamente
        const response = await fetch(
          `${window.location.origin}/api/v2/quality-control/revisions?order_by=created_at&release_reference=${releaseReference}`
        );
        
        if (!response.ok) {
          console.error('QC Copilot: AJAX call failed:', response.status, response.statusText);
          return { hasRejected: false, data: [] };
        }
        
        const data = await response.json();
        console.log('QC Copilot: AJAX response:', data);
        
        // Limpiar la tabla y agregar los datos
        table.textContent = '';
        
        if (data.data && data.data.values) {
          data.data.values.forEach(revision => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${revision.release.title}</td>
              <td>${new Date(revision.created_at).toLocaleDateString()}</td>
              <td>
                <a href="#" class="badge bg-yellow">${revision.status}</a>
              </td>
            `;
            table.appendChild(row);
          });
          
          // Volver a buscar las filas después de agregar los datos
          rows = table.querySelectorAll('tr');
          console.log(`QC Copilot: After AJAX call, found ${rows.length} rows`);
        } else {
          console.log('QC Copilot: No data in AJAX response');
          return { hasRejected: false, data: [] };
        }
      } catch (error) {
        console.error('QC Copilot: Error making AJAX call:', error);
        return { hasRejected: false, data: [] };
      }
    }
    
    let hasRejected = false;
    const historyData = [];
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        const rowData = {
          index: index + 1,
          title: cells[0] ? cells[0].textContent.trim() : '',
          date: cells[1] ? cells[1].textContent.trim() : '',
          status: cells[2] ? cells[2].textContent.trim() : '',
          hasRejectedLink: false
        };
        
        // Verificar si hay enlace de rechazo
        const statusCell = cells[2];
        if (statusCell) {
          const rejectedLink = statusCell.querySelector('a');
          if (rejectedLink) {
            rowData.hasRejectedLink = true;
            rowData.rejectedLinkText = rejectedLink.textContent.trim();
          }
          
          // Verificar si es un rechazo
          const statusText = statusCell.textContent.trim().toLowerCase();
          if (statusText.includes('rejected') || 
              (rejectedLink && rejectedLink.textContent.trim().toLowerCase().includes('rejected'))) {
            hasRejected = true;
            rowData.isRejected = true;
            console.log(`QC Copilot: Rejected status found in row ${index + 1}: ${statusText}`);
          }
        }
        
        historyData.push(rowData);
      }
    });
    
    console.log(`QC Copilot: Release history extraction completed - ${historyData.length} entries, hasRejected: ${hasRejected}`);
    
    return {
      hasRejected,
      data: historyData,
      extractedAt: new Date().toISOString()
    };
  }

  // NUEVO: Función de debug para inspeccionar Release History
  window.debugReleaseHistory = async function() {
    console.log('QC Copilot: Debugging Release History structure...');
    
    const modal = document.querySelector('#revisionHistoryModal');
    if (!modal) {
      console.warn('Release History modal not found');
      return;
    }
    
    console.log('Release History Modal:', modal);
    console.log('Modal HTML:', modal.outerHTML);
    
    const table = modal.querySelector('#revision-history');
    if (!table) {
      console.warn('Release History table not found');
      return;
    }
    
    console.log('Release History Table:', table);
    console.log('Table HTML:', table.outerHTML);
    
    const rows = table.querySelectorAll('tr');
    console.log(`Found ${rows.length} rows in release history`);
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      console.log(`Row ${index + 1}:`, {
        cells: cells.length,
        content: Array.from(cells).map(cell => cell.textContent.trim())
      });
    });
    
    // Probar la extracción
    const result = await extractReleaseHistoryFromDOM();
    console.log('Extraction result:', result);
  };

  // NUEVO: Función de debug simple que se puede ejecutar directamente
  window.debugReleaseHistorySimple = async function() {
    console.log('[QC] Simple Release History Debug...');
    
    // Verificar URL actual
    console.log('[QC] Current URL:', window.location.href);
    
    // Extraer release_reference
    const urlMatch = window.location.href.match(/release_reference=(\d+)/);
    if (!urlMatch) {
      console.warn('[QC] No release_reference found in URL');
      return;
    }
    
    const releaseReference = urlMatch[1];
    console.log('[QC] Release reference:', releaseReference);
    
    // Construir URL de la API
    const apiUrl = `${window.location.origin}/api/v2/quality-control/revisions?order_by=created_at&release_reference=${releaseReference}`;
    console.log('[QC] API URL:', apiUrl);
    
    try {
      // Hacer la llamada manual
      const response = await fetch(apiUrl);
      console.log('[QC] Response status:', response.status);
      
      if (!response.ok) {
        console.error('[QC] API call failed:', response.status);
        return;
      }
      
      const apiData = await response.json();
      console.log('[QC] API response:', apiData);
      
      if (!apiData.data || !apiData.data.values) {
        console.log('[QC] No data.values in response');
        return;
      }
      
      console.log('[QC] Number of revisions:', apiData.data.values.length);
      
      // Mostrar cada revisión
      apiData.data.values.forEach((revision, index) => {
        const status = revision.status || '';
        const isRejected = status.toLowerCase().includes('reject') || status.toLowerCase() === 'denied';
        console.log(`[QC] ${index + 1}. "${revision.release?.title}" - ${status} ${isRejected ? '(REJECTED!)' : ''}`);
      });
      
      // Verificar si hay rechazos
      const hasRejected = apiData.data.values.some(revision => {
        const status = (revision.status || '').toLowerCase();
        return status.includes('reject') || status === 'denied';
      });
      
      console.log('[QC] Has rejected revisions:', hasRejected);
      
    } catch (error) {
      console.error('[QC] Error:', error);
    }
  };

  // NUEVO: Función de debug para Release History API
  window.debugReleaseHistoryAPI = async function() {
    console.log('[QC] Debugging Release History API...');
    
    // Verificar URL actual
    console.log('[QC] Current URL:', window.location.href);
    
    // Extraer release_reference
    const urlMatch = window.location.href.match(/release_reference=(\d+)/);
    if (!urlMatch) {
      console.warn('[QC] No release_reference found in URL');
      return;
    }
    
    const releaseReference = urlMatch[1];
    console.log('[QC] Release reference:', releaseReference);
    
    // Construir URL de la API
    const apiUrl = `${window.location.origin}/api/v2/quality-control/revisions?order_by=created_at&release_reference=${releaseReference}`;
    console.log('[QC] API URL:', apiUrl);
    
    try {
      // Hacer la llamada manual para debug
      const response = await fetch(apiUrl);
      console.log('[QC] Response status:', response.status);
      console.log('[QC] Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('[QC] API call failed:', response.status, response.statusText);
        return;
      }
      
      const apiData = await response.json();
      console.log('[QC] Raw API response:', apiData);
      
      if (!apiData.data || !apiData.data.values) {
        console.log('[QC] No data.values in API response');
        return;
      }
      
      console.log('[QC] Number of revisions:', apiData.data.values.length);
      
      // Mostrar cada revisión
      apiData.data.values.forEach((revision, index) => {
        console.log(`[QC] Revision ${index + 1}:`, {
          title: revision.release?.title,
          status: revision.status,
          created_at: revision.created_at,
          isRejected: revision.status === 'rejected'
        });
      });
      
      // Probar la extracción
      const result = await extractReleaseHistoryFromAPI();
      console.log('[QC] API extraction result:', result);
      
    } catch (error) {
      console.error('[QC] Error in debug:', error);
    }
  };

  // NUEVO: Función de debug simple para Release History
  window.debugReleaseHistory = function() {
    console.log('QC Copilot: Debugging Release History...');
    
    const modal = document.querySelector('#revisionHistoryModal');
    if (!modal) {
      console.warn('Release History modal not found');
      return;
    }
    
    const table = modal.querySelector('#revision-history');
    if (!table) {
      console.warn('Release History table not found');
      return;
    }
    
    const rows = table.querySelectorAll('tr');
    console.log(`Found ${rows.length} rows in release history`);
    
    if (rows.length > 0) {
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        console.log(`Row ${index + 1}:`, Array.from(cells).map(cell => cell.textContent.trim()));
      });
    } else {
      console.log('No rows found - table is empty');
    }
    
    // Probar la extracción
    extractReleaseHistoryFromDOM().then(result => {
      console.log('Extraction result:', result);
    });
  };

  // NUEVO: Función que se puede ejecutar directamente en la consola
  window.testReleaseHistoryAPI = async function() {
    console.log('[QC] Testing Release History API directly...');
    
    // Extraer release_reference de la URL
    const urlMatch = window.location.href.match(/release_reference=(\d+)/);
    if (!urlMatch) {
      console.error('[QC] No release_reference found in URL');
      return false;
    }
    
    const releaseReference = urlMatch[1];
    const apiUrl = `${window.location.origin}/api/v2/quality-control/revisions?order_by=created_at&release_reference=${releaseReference}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.data && data.data.values) {
        const hasRejected = data.data.values.some(revision => {
          const status = (revision.status || '').toLowerCase();
          return status.includes('reject') || 
                 status === 'denied' || 
                 status === 'under_review' ||
                 status.includes('review');
        });
        
        console.log('[QC] Result:', hasRejected);
        return hasRejected;
      }
    } catch (error) {
      console.error('[QC] Error:', error);
    }
    
    return false;
  };

  // NUEVO: Función optimizada para verificar rechazos previos usando extracción directa de la API
  async function checkPreviousRejectionDOM() {
    console.log('[QC] Checking previous rejection using API extraction...');
    
    // Usar extracción directa de la API (nunca abre modal)
    const apiResult = await extractReleaseHistoryFromAPI();
    
    if (apiResult.data.length > 0) {
      console.log(`[QC] API extraction successful - ${apiResult.data.length} entries found, hasRejected: ${apiResult.hasRejected}`);
      return apiResult.hasRejected;
    }
    
    // Si no hay datos de la API, retornar false (no rechazos)
    console.log('[QC] No release history data found via API');
    return false;
  }

  // Nueva función para verificar rechazos previos
// NUEVA: Función mejorada para verificar rechazos previos con mejor debugging
// NUEVA: Función completamente corregida para verificar rechazos previos
async function checkPreviousRejection() {
  if (localStorage.qcDebug === 'true') {
    console.log('=== CHECKING PREVIOUS REJECTION ===');
  }
  
  // CORREGIDO: Usar el selector específico que proporcionaste (sin la <u>)
  const historyButtonSelector = 'body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) > div > div > div:nth-child(6) > div:nth-child(2) > h5 > a';
  const releaseHistoryButton = document.querySelector(historyButtonSelector);

  if (!releaseHistoryButton) {
    console.warn('No history button found');
    return false;
  }

  if (localStorage.qcDebug === 'true') {
    console.log(`History button found: ${historyButtonSelector}`);
  }

  return new Promise((resolve) => {
    let rejected = false;
    let timeoutId = null;
    let observer = null;
    let done = false;
    let dataLoadAttempts = 0;
    const maxDataLoadAttempts = 15; // Esperar hasta 15 intentos (3 segundos)

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
    };

    const finishCheck = (result) => {
      if (done) return;
      done = true;
      cleanup();
      if (localStorage.qcDebug === 'true') {
        console.log(`Previous rejection check completed: ${result}`);
      }
      resolve(result);
    };

    // CORREGIDO: Timeout más largo para dar tiempo a cargar datos
    timeoutId = setTimeout(() => {
      if (localStorage.qcDebug === 'true') {
        console.warn('History check timeout after 8 seconds');
      }
      finishCheck(false);
    }, 8000);

    // NUEVO: Función para comprobar si los datos han cargado
    const checkForHistoryData = () => {
      const modal = document.querySelector('#revisionHistoryModal');
      if (!modal) return false;

      const table = modal.querySelector('#revision-history');
      if (!table) return false;

      const rows = table.querySelectorAll('tr');
      
      if (localStorage.qcDebug === 'true') {
        console.log(`Data load attempt ${dataLoadAttempts}: Found ${rows.length} rows`);
      }

      if (rows.length > 0) {
        // CORREGIDO: Usar los selectores específicos que proporcionaste
        rows.forEach((row, index) => {
          // Buscar en la columna 3 específicamente (td:nth-child(3))
          const statusCell = row.querySelector('td:nth-child(3)');
          if (statusCell) {
            const statusText = statusCell.textContent.trim().toLowerCase();
            const hasRejectedLink = statusCell.querySelector('a');
            
            if (localStorage.qcDebug === 'true') {
              console.log(`Row ${index + 1} status:`, statusText);
              if (hasRejectedLink) {
                console.log(`Row ${index + 1} link text:`, hasRejectedLink.textContent.trim());
              }
            }
            
            // CORREGIDO: Buscar "rejected" tanto en texto directo como en enlaces
            if (statusText.includes('rejected') || 
                (hasRejectedLink && hasRejectedLink.textContent.trim().toLowerCase().includes('rejected'))) {
              if (localStorage.qcDebug === 'true') {
                console.log(`🚨 REJECTED status found in row ${index + 1}`);
              }
              rejected = true;
            }
          }
        });
        
        // Datos cargados, cerrar modal y terminar
        setTimeout(() => {
          closeModalSafely(modal);
          finishCheck(rejected);
        }, 500);
        
        return true; // Datos encontrados
      }
      
      return false; // Sin datos aún
    };

    // Observer para detectar cuando aparece el modal
    observer = new MutationObserver((mutations) => {
      const modal = document.querySelector('#revisionHistoryModal');
      if (!modal || done) return;

      // NUEVO: Comprobar si el modal se está mostrando
      const isModalVisible = modal.classList.contains('show') || 
                           modal.style.display === 'block' ||
                           window.getComputedStyle(modal).display === 'block';

      if (isModalVisible) {
        // CORREGIDO: Esperar múltiples veces para que carguen los datos AJAX
        const waitForData = () => {
          if (done) return;
          
          dataLoadAttempts++;
          
          if (checkForHistoryData()) {
            // Datos encontrados, el checkForHistoryData ya maneja el cierre
            return;
          }
          
          // Si no hay datos y no hemos alcanzado el límite, seguir esperando
          if (dataLoadAttempts < maxDataLoadAttempts) {
            setTimeout(waitForData, 200); // Esperar 200ms más
          } else {
            // Sin datos después de intentos máximos
            if (localStorage.qcDebug === 'true') {
              console.log('No history data loaded after maximum attempts');
            }
            setTimeout(() => {
              closeModalSafely(modal);
              finishCheck(false);
            }, 500);
          }
        };

        // CORREGIDO: Esperar un poco más antes de empezar a comprobar datos
        setTimeout(waitForData, 800);
      }
    });

    // Observar cambios en el modal específico y en todo el documento
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // CORREGIDO: Hacer clic de manera más robusta para evitar problemas de CSP
    try {
      if (localStorage.qcDebug === 'true') {
        console.log('Clicking history button...');
      }
      
      // NUEVO: Primero intentar el click directo
      releaseHistoryButton.click();
      
      // NUEVO: Si tiene href, también navegar programáticamente como fallback
      if (releaseHistoryButton.href && releaseHistoryButton.href.includes('#')) {
        // Es un enlace tipo hash, activar manualmente
        const href = releaseHistoryButton.href;
        const hash = href.split('#')[1];
        if (hash) {
          // Simular la apertura del modal usando Bootstrap si está disponible
          try {
            if (window.bootstrap && window.bootstrap.Modal) {
              const targetModal = document.querySelector(`#${hash}`);
              if (targetModal) {
                const modalInstance = new window.bootstrap.Modal(targetModal);
                modalInstance.show();
                if (localStorage.qcDebug === 'true') {
                  console.log('Modal opened using Bootstrap API');
                }
              }
            }
          } catch (e) {
            if (localStorage.qcDebug === 'true') {
              console.log('Bootstrap API fallback failed:', e);
            }
          }
        }
      }
      
      // NUEVO: También disparar eventos de mouse como backup
      ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        releaseHistoryButton.dispatchEvent(new MouseEvent(eventType, { 
          bubbles: true, 
          cancelable: true,
          view: window,
          detail: 1
        }));
      });
      
    } catch (error) {
      console.error('Error clicking history button:', error);
      finishCheck(false);
    }
  });
}

// MEJORADA: Función para cerrar modal de forma más segura
function closeModalSafely(modal) {
  if (localStorage.qcDebug === 'true') {
    console.log('Attempting to close history modal...');
  }
  
  try {
    // CORREGIDO: Buscar botón de cierre usando selectores más específicos
    const closeSelectors = [
      '#revisionHistoryModal .close',
      '#revisionHistoryModal [data-bs-dismiss="modal"]',
      '#revisionHistoryModal .modal-header button',
      '.close',
      '[data-bs-dismiss="modal"]'
    ];
    
    let closeButton = null;
    
    for (const selector of closeSelectors) {
      closeButton = document.querySelector(selector);
      if (closeButton) {
        if (localStorage.qcDebug === 'true') {
          console.log(`Close button found with selector: ${selector}`);
        }
        break;
      }
    }
    
    if (closeButton) {
      // MEJORADO: Múltiples métodos de cierre
      closeButton.click();
      
      // También usar Bootstrap API
      try {
        if (window.bootstrap && window.bootstrap.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
            if (localStorage.qcDebug === 'true') {
              console.log('Bootstrap modal.hide() executed');
            }
          }
        }
      } catch (e) {
        // Bootstrap no disponible, continuar
      }
      
    } else {
      if (localStorage.qcDebug === 'true') {
        console.log('No close button found, using Escape key');
      }
      // Fallback: usar tecla Escape
      modal.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Escape', 
        bubbles: true 
      }));
    }
    
    // NUEVO: Verificación más robusta del cierre
    setTimeout(() => {
      const stillVisible = modal && (
        modal.classList.contains('show') || 
        modal.style.display === 'block' ||
        window.getComputedStyle(modal).display === 'block'
      );
      
      if (stillVisible) {
        if (localStorage.qcDebug === 'true') {
          console.log('Modal still visible after close attempt, forcing close');
        }
        
        // MEJORADO: Forzar cierre más completo
        modal.classList.remove('show', 'fade', 'in');
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-modal');
        
        // Limpiar efectos del modal en el body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Remover todos los backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
          backdrop.remove();
        });
        
        // Limpiar focus trap si existe
        if (document.activeElement && modal.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        
        if (localStorage.qcDebug === 'true') {
          console.log('Modal forcefully closed');
        }
      } else {
        if (localStorage.qcDebug === 'true') {
          console.log('Modal closed successfully');
        }
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

// NUEVA: Función mejorada para cerrar modal de forma segura
function closeModalSafely(modal) {
  console.log('🔒 Attempting to close modal safely...');
  
  try {
    // Buscar botón de cierre con múltiples estrategias
    const closeSelectors = [
      '.close',
      '.btn-close', 
      '[data-dismiss="modal"]',
      '[data-bs-dismiss="modal"]',
      'button[aria-label*="Close"]',
      'button[aria-label*="Cerrar"]',
      '.modal-header button',
      '.modal-footer button'
    ];
    
    let closeButton = null;
    
    for (const selector of closeSelectors) {
      closeButton = modal.querySelector(selector);
      if (closeButton) {
        console.log(`✅ Close button found with selector: ${selector}`);
        break;
      }
    }
    
    if (closeButton) {
      console.log(`🖱️ Clicking close button:`, closeButton.outerHTML.substring(0, 100));
      closeButton.click();
      
      // También usar Bootstrap API si está disponible
      try {
        if (window.bootstrap && window.bootstrap.Modal) {
          const modalInstance = window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) {
            modalInstance.hide();
            console.log('✅ Bootstrap modal.hide() executed');
          }
        }
      } catch (e) {
        console.log('⚠️ Bootstrap modal API not available');
      }
      
    } else {
      console.log('❌ No close button found, using Escape key');
      modal.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Escape', 
        bubbles: true 
      }));
    }
    
    // Verificar si se cerró después de un tiempo
    setTimeout(() => {
      const stillVisible = modal && (
        modal.classList.contains('show') || 
        modal.style.display === 'block' ||
        modal.style.display === 'block'
      );
      
      if (stillVisible) {
        console.log('⚠️ Modal still visible, forcing manual close');
        
        // Forzar cierre manual
        modal.classList.remove('show', 'fade');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Limpiar efectos del modal
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Remover backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
          backdrop.remove();
        });
        
        console.log('✅ Modal forcefully closed');
      } else {
        console.log('✅ Modal closed successfully');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error closing modal:', error);
  }
}

  // Función para enviar datos al background
  function sendReleaseDataToBackground(releaseData, noTracksValidation, previouslyRejected) {
    releaseData.previouslyRejected = previouslyRejected;
    try {
      const tenantEl = document.querySelector('body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(2) > div > div > div.row.pb-3.align-items-center > div:nth-child(2) > h5');
      const tenantName = tenantEl ? (tenantEl.textContent || tenantEl.innerText || '').trim() : '';
      if (tenantName) releaseData.tenantName = tenantName;
      // Extract tenant code explicitly (one-word code)
      let tenantCode = '';
      try { const url = new URL(window.location.href); tenantCode = url.searchParams.get('client') || url.searchParams.get('tenant') || ''; } catch (_) {}
      if (!tenantCode) {
        const codeEl = document.querySelector('[data-tenant-code]') || document.querySelector('h5 .tenant-code, h5.tenant-code');
        if (codeEl) tenantCode = (codeEl.getAttribute('data-tenant-code') || codeEl.textContent || '').trim();
      }
      if (tenantCode) releaseData.tenantCode = tenantCode;
    } catch (_) {}

    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.storage.local.set({ releaseData }, () => {
            chrome.runtime.sendMessage({ action: 'validateRelease' }, response => {
                // Verificar si hay errores de conexión
                if (chrome.runtime.lastError) {
                    console.error('QC Copilot: Connection error to background script:', chrome.runtime.lastError);
                    
                    // Si es un error de conexión, reintentar después de un delay
                    if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                        console.log('QC Copilot: Background script not ready, retrying in 2 seconds...');
                        setTimeout(() => {
                            sendReleaseDataToBackground(releaseData, noTracksValidation, previouslyRejected);
                        }, 2000);
                        return;
                    }
                    return;
                }
                
                if (!response) {
                    console.error('No response from background');
                    return;
                }
                
                if (response.error) {
                    console.error('Background error:', response.error);
                    return;
                }
                
                const payload = {
                    tipo: 'initRelease',
                    flags: {
                        ...response.flags,
                        noTracks: noTracksValidation
                    },
                    releaseData: response.releaseData,
                    audioMatchTracks: response.audioMatchTracks,
                    audioAnalysisResults: window.qcAudioAnalysisResults || [], // NUEVO: Incluir resultados de audio analysis
                    explicitFound: response.explicitFound,
                    zendeskInfo: response.zendeskInfo,
                  previouslyRejected: response.previouslyRejected,
                  tenantInfo: response.tenantInfo || null
                };

                // NUEVO: Guardar los datos en window para poder reenviarlos después del refresh
                window.qcLastReleaseData = payload;

                function postInitToDrawer(tries = 0) {
                  const iframe = document.getElementById('qc-copilot-sidebar')
                                       ?.querySelector('iframe#qc-sidebar-iframe');
                  if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage(payload, '*');
                  } else if (tries < 15) {
                    setTimeout(() => postInitToDrawer(tries + 1), 200);
                  } else {
                    console.warn('QC Copilot: iframe not ready, could not deliver initRelease');
                  }
                }
                postInitToDrawer();
            });
        });
    }
  }

  // 2) Interceptar la API de History
  const _push = history.pushState;
  const _repl = history.replaceState;
  
  // NUEVO: Listener para mensajes del drawer (refresh analysis)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.tipo === 'refreshAnalysis') {
      console.log('QC Copilot: Refresh analysis requested from drawer');
      
      // CORREGIDO: Limpiar caché y forzar re-análisis
      clearAnalysisCache();
      
      // CORREGIDO: Forzar re-análisis completo incluyendo modales
      const performFullRefresh = async () => {
        try {
          console.log('QC Copilot: Starting full refresh analysis...');
          
          // 1. Extraer datos del release
          console.log('QC Copilot: Extracting release data...');
          await extractReleaseData();
          
          // 2. Forzar verificación de rechazo previo (abrir modal de histórico)
          console.log('QC Copilot: Forcing previous rejection check...');
          await checkPreviousRejectionDOM();
          
          // 3. Forzar análisis de audio si hay tracks
          // Convert NodeList to array to safely use array methods in all browsers
          const trackInfoDivs = Array.from(document.querySelectorAll('[id^="track-"][id$="-info"]'));
          if (trackInfoDivs.length > 0) {
            console.log('QC Copilot: Forcing audio analysis...');
            console.log(`QC Copilot: Found ${trackInfoDivs.length} track info divs`);
            
            // NUEVO: Usar análisis optimizado de audio
            console.log('QC Copilot: Starting optimized audio analysis...');
            
            // Verificar modales importantes antes de empezar
            checkImportantModals();
            console.log(`QC Copilot: Important modals open: ${importantModalsOpen}`);
            console.log(`QC Copilot: Audio analysis enabled: ${isAudioAnalysisEnabled()}`);
            
            let audioAnalysisResults = []; // NUEVO: Declarar la variable aquí
            
            if (!importantModalsOpen && isAudioAnalysisEnabled()) {
              // Filtrar tracks con alertas
              const tracksWithAlerts = trackInfoDivs
                .map((trackDiv, index) => {
                  const trackTitle = trackDiv.querySelector('h5.font-extra-bold.fs-5')?.textContent?.trim() || `Track ${index + 1}`;
                  const hasAlert = trackDiv.querySelector('button.alert, button.alert-warning, button.btn-warning, button[class*="alert"], button[class*="warning"]');
                  
                  console.log(`QC Copilot: Track ${index + 1}: "${trackTitle}", hasAlert: ${!!hasAlert}`);
                  
                  return {
                    trackIndex: index,
                    header: trackTitle,
                    hasAlert: !!hasAlert
                  };
                })
                .filter(track => track.hasAlert);
              
              console.log(`QC Copilot: Tracks with alerts:`, tracksWithAlerts);
              
              if (tracksWithAlerts.length > 0) {
                console.log(`QC Copilot: Found ${tracksWithAlerts.length} tracks with audio alerts, starting optimized analysis`);
                
            // NUEVO: Intentar extracción directa del DOM primero
            console.log('QC Copilot: Attempting direct DOM extraction...');
            const domResults = extractAllAudioAnalysisDataFromDOM();
            
            if (domResults && domResults.length > 0) {
              // Usar resultados del DOM si están disponibles
              audioAnalysisResults = domResults;
              console.log(`QC Copilot: DOM extraction successful, ${audioAnalysisResults.length} results extracted`);
            } else {
              // Fallback al método anterior si no hay modales en el DOM
              console.log('QC Copilot: No modals found in DOM, falling back to parallel analysis...');
              audioAnalysisResults = await performMassiveParallelAudioAnalysis(tracksWithAlerts);
              console.log(`QC Copilot: Parallel analysis completed, ${audioAnalysisResults.length} results saved`);
            }
            
            // Guardar resultados
            window.qcAudioAnalysisResults = audioAnalysisResults;
              } else {
                console.log('QC Copilot: No tracks with audio alerts found');
                window.qcAudioAnalysisResults = [];
              }
            } else {
              console.log('QC Copilot: Audio analysis skipped - important modals open or disabled');
              window.qcAudioAnalysisResults = [];
            }
            
            // NUEVO: Guardar los resultados de audio analysis en window para enviarlos al drawer
            window.qcAudioAnalysisResults = audioAnalysisResults;
            console.log(`QC Copilot: Audio analysis completed, ${audioAnalysisResults.length} results saved`);
          } else {
            console.log('QC Copilot: No track info divs found, skipping audio analysis');
          }
          
          console.log('QC Copilot: Full refresh analysis completed');
          
          // Enviar mensaje al drawer indicando que el análisis está completo
          const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ tipo: 'analysisComplete' }, '*');
            console.log('QC Copilot: Sent analysisComplete message to drawer');
            
            // También enviar los datos actualizados al drawer
            // Esto asegura que el drawer tenga la información más reciente
            if (window.qcLastReleaseData) {
              const payload = {
                tipo: 'initRelease',
                flags: window.qcLastReleaseData.flags || {},
                releaseData: window.qcLastReleaseData.releaseData || {},
                audioMatchTracks: window.qcLastReleaseData.audioMatchTracks || [],
                audioAnalysisResults: window.qcAudioAnalysisResults || [], // NUEVO: Incluir resultados de audio analysis
                explicitFound: window.qcLastReleaseData.explicitFound || false,
                zendeskInfo: window.qcLastReleaseData.zendeskInfo || null,
                previouslyRejected: window.qcLastReleaseData.previouslyRejected || false,
                tenantInfo: window.qcLastReleaseData.tenantInfo || null
              };
              iframe.contentWindow.postMessage(payload, '*');
              console.log('QC Copilot: Sent updated release data to drawer with audio analysis results');
            }
          }
        } catch (error) {
          console.error('QC Copilot: Error during full refresh:', error);
          
          // NUEVO: Enviar mensaje de error al drawer
          const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ 
              tipo: 'analysisError', 
              error: error.message 
            }, '*');
            console.log('QC Copilot: Sent analysisError message to drawer');
          }
          

        }
      };
      
      // CORREGIDO: Ejecutar el refresh inmediatamente sin verificar background script
      // El background script se verificará dentro de extractReleaseData si es necesario
      console.log('QC Copilot: Executing refresh analysis immediately...');
      performFullRefresh();
    }
  });
  history.pushState = function() {
    _push.apply(this, arguments);
    debouncedExtractReleaseData();
  };
  history.replaceState = function() {
    _repl.apply(this, arguments);
    debouncedExtractReleaseData();
  };
  window.addEventListener('popstate', () => debouncedExtractReleaseData());

  // 3) Observar cambios en el DOM
  const mainEl = document.querySelector('body > main');
  if (mainEl) {
    new MutationObserver((mutations) => {
      const AUDIO_PLAYER_SELECTOR = '#track-0-info > div > div.player-controls > div.player-timeline'; 
      
      const isPlayerMutation = mutations.some(mutation => {
        const targetIsPlayer = mutation.target.closest && mutation.target.closest(AUDIO_PLAYER_SELECTOR);
        const addedNodeIsPlayer = Array.from(mutation.addedNodes).some(node => 
          node.closest && node.closest(AUDIO_PLAYER_SELECTOR)
        );
        const removedNodeIsPlayer = Array.from(mutation.removedNodes).some(node => 
          node.closest && node.closest(AUDIO_PLAYER_SELECTOR)
        );
        
        return targetIsPlayer || addedNodeIsPlayer || removedNodeIsPlayer;
      });

      if (isPlayerMutation) {
        console.log("Audio player change detected - ignoring");
        return; 
      }

      const hasSignificantChange = mutations.some(mutation => 
        mutation.addedNodes.length > 0 || 
        mutation.removedNodes.length > 0
      );
      if (hasSignificantChange) {
        debouncedExtractReleaseData();
      }
    }).observe(mainEl, { childList: true, subtree: true });
  }
  
  // NUEVO: Observer para detectar cambios en modales importantes
  const bodyEl = document.querySelector('body');
  if (bodyEl) {
    new MutationObserver((mutations) => {
      let modalStateChanged = false;
      
      mutations.forEach(mutation => {
        // Detectar cambios en modales importantes
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
          const target = mutation.target;
          if (target.id && (
              target.id === 'revision-add-ticket-modal' ||
              target.id === 'revision-client-action-modal' ||
              target.id === 'modal-revision-approve' ||
              target.id === 'revision-reject-reason-modal'
          )) {
            modalStateChanged = true;
          }
        }
        
        // Detectar modales agregados/removidos
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.id && (
                node.id === 'revision-add-ticket-modal' ||
                node.id === 'revision-client-action-modal' ||
                node.id === 'modal-revision-approve' ||
                node.id === 'revision-reject-reason-modal'
            )) {
              modalStateChanged = true;
            }
          });
          
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.id && (
                node.id === 'revision-add-ticket-modal' ||
                node.id === 'revision-client-action-modal' ||
                node.id === 'modal-revision-approve' ||
                node.id === 'revision-reject-reason-modal'
            )) {
              modalStateChanged = true;
            }
          });
        }
      });
      
      if (modalStateChanged) {
        const previousState = importantModalsOpen;
        checkImportantModals();
        
        if (previousState !== importantModalsOpen) {
          console.log(`QC Copilot: Important modal state changed: ${importantModalsOpen ? 'OPEN' : 'CLOSED'}`);
          
          // Si se abrió un modal importante, detener análisis de audio
          if (importantModalsOpen && audioAnalysisInProgress) {
            console.log('QC Copilot: Important modal opened, stopping audio analysis');
            audioAnalysisInProgress = false;
            audioAnalysisQueue = [];
          }
          
          // Notificar al drawer sobre el cambio de estado
          const iframe = document.getElementById('qc-copilot-sidebar')
                               ?.querySelector('iframe#qc-sidebar-iframe');
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              tipo: 'importantModalStateChange',
              open: importantModalsOpen
            }, '*');
          }
        }
      }
    }).observe(bodyEl, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['class', 'style'] 
    });
  }

  // 4) Llamada inicial
  debouncedExtractReleaseData();
  let lastURL = location.href;
  setInterval(() => {
    if (location.href !== lastURL) {
      lastURL = location.href;

      debouncedExtractReleaseData();
    }
  }, 1000);
  
  // 5) Escuchar actualizaciones de Zendesk
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateZendeskInfo') {
      const iframe = document.getElementById('qc-copilot-sidebar')
                           ?.querySelector('iframe#qc-sidebar-iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          tipo: 'updateZendesk',
          zendeskInfo: request.zendeskInfo
        }, '*');
      }
    }
  });

  // ---- QCWT: provide lightweight DOM snapshot for approve/reject logging ----
  function qcwtGetContext() {
    const href = window.location.href;
    const isIndividual = /\/revisions\/\d+/.test(href);
    const isQueue = /\/revisions(\?|$)/.test(href) && !isIndividual;
    return isIndividual ? 'individual' : (isQueue ? 'queue' : 'unknown');
  }
  function qcwtGetQCData(actionType) {
    const location = qcwtGetContext();
    let tenantCode = '';
    let tenantName = '';
    let releaseIds = [];
    let reasons = [];

    function extractReleaseIdFromCellText(txt) {
      if (!txt) return '';
      const m = String(txt).match(/ID\s*:\s*(\d+)/i);
      if (m) return m[1];
      const digits = String(txt).replace(/[^0-9]/g, '').trim();
      return digits || String(txt).trim();
    }

    if (location === 'queue') {
      const checked = document.querySelectorAll("#revisionsTable input.form-check-input[name='revision_id[]']:checked, #revisionsTable input[name='revision_id[]']:checked");
      checked.forEach(chk => {
        let tenant = chk.getAttribute('data-client-code') || '';
        if (!tenant) {
          const row = chk.closest('tr');
          if (row) {
            const cells = row.querySelectorAll('td');
            for (let i = 0; i < cells.length; i++) {
              const t = (cells[i].innerText || '').trim();
              if (t && t.length >= 2 && t.length <= 10 && /^[A-Z0-9_-]+$/i.test(t)) { tenant = t; break; }
            }
          }
        }
        if (!tenant) {
          try { const url = new URL(window.location.href); tenant = url.searchParams.get('client') || url.searchParams.get('tenant') || ''; } catch(_) {}
        }
        if (tenant && !tenantCode) tenantCode = tenant;
        const row = chk.closest('tr');
        if (row && !tenantName) {
          const cells = row.querySelectorAll('td');
          for (let i = 1; i < Math.min(cells.length, 4); i++) {
            const txt = (cells[i].innerText || '').trim();
            if (txt && txt.length > 10 && !/^[A-Z0-9_-]+$/i.test(txt)) { tenantName = txt; break; }
          }
        }
        const relCell = row?.querySelector('td:nth-child(6)');
        const relText = relCell ? (relCell.innerText || relCell.textContent || '').trim() : '';
        const releaseId = extractReleaseIdFromCellText(relText);
        if (releaseId) releaseIds.push(releaseId);
      });
      document.querySelectorAll("input[name='reject_reasons_codes[]']:checked").forEach(r => reasons.push(r.value));
    } else if (location === 'individual') {
      const tenantSelectors = [
        "body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(2) > div > div > div.row.pb-3.align-items-center > div:nth-child(2) > h5",
        "main section .row.pb-3.align-items-center div:nth-child(2) h5",
        ".row.pb-3.align-items-center div:nth-child(2) h5",
        "[data-tenant-code]",
        "h5 .tenant-code, h5.tenant-code"
      ];
      for (const sel of tenantSelectors) {
        const el = document.querySelector(sel);
        if (el) { tenantCode = (el.getAttribute('data-tenant-code') || el.innerText || '').trim(); if (tenantCode) break; }
      }
      const releaseSelectors = [
        "body > main section div.row.row-cols-3.gx-1 > div:nth-child(3) h5 span",
        "main section .row.pb-3.align-items-center div:nth-child(3) h5 span",
        ".row.pb-3.align-items-center div:nth-child(3) h5 span",
        "h5 span"
      ];
      for (const sel of releaseSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText) { releaseIds.push(el.innerText.trim().replace(/^ID:\s*/i, '').trim()); break; }
      }
      document.querySelectorAll("input[name='reject_reasons_codes[]']:checked").forEach(r => reasons.push(r.value));
    }
    // de-dup and clean
    releaseIds = Array.from(new Set(releaseIds.map(x => String(x).trim()).filter(Boolean)));
    return { tenantCode, tenantName, releaseIds, reasons: reasons.join(', '), type: actionType, location };
  }
  function qcwtSnapshotQueueState() {
    if (qcwtGetContext() !== 'queue') return;
    try {
      const data = qcwtGetQCData('snapshot');
      if (!data.tenantCode) {
        try { const url = new URL(window.location.href); data.tenantCode = url.searchParams.get('client') || ''; } catch(_) {}
      }
      const snapshot = {
        tenantCode: data.tenantCode || '',
        releaseIds: data.releaseIds || [],
        reasons: (data.reasons || '').split(/\s*,\s*/).filter(Boolean),
        location: data.location
      };
      chrome.storage.local.set({ QCWT_queueSnapshot: snapshot });
    } catch (_) {}
  }
  if (qcwtGetContext() === 'queue') {
    qcwtSnapshotQueueState();
    document.addEventListener('change', (ev) => {
      const t = ev.target; if (!(t instanceof HTMLInputElement)) return;
      if (t.matches("input.form-check-input[name='revision_id[]']") || t.matches("input[name='reject_reasons_codes[]']")) {
        qcwtSnapshotQueueState();
      }
    }, true);
  }
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'FETCH_QC_DATA') {
      const data = qcwtGetQCData(msg.type);
      console.log('[QCWT] FETCH_QC_DATA response', data);
      sendResponse(data);
    }
    if (msg && msg.action === 'QCWT_SENT') {
      if (msg.ok) {
        console.log('[QCWT] Sent to Apps Script OK:', msg.result);
      } else {
        console.error('[QCWT] Send to Apps Script FAILED:', msg.error);
      }
    }
  });

  // 6) Escuchar solicitudes de análisis de audio y control
  window.addEventListener('message', async (event) => {
    if (event.data.tipo === 'audioAnalysisRequest') {
      // Verificar si el análisis está habilitado
      if (!isAudioAnalysisEnabled()) {
        console.log('QC Copilot: Audio analysis request rejected - disabled');
        const iframe = document.getElementById('qc-copilot-sidebar')
                             ?.querySelector('iframe#qc-sidebar-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            tipo: 'audioAnalysisError',
            trackIndex: event.data.trackIndex,
            error: 'Audio analysis is disabled'
          }, '*');
        }
        return;
      }
      
      // Verificar modales importantes
      if (checkImportantModals()) {
        console.log('QC Copilot: Audio analysis request rejected - important modals open');
        const iframe = document.getElementById('qc-copilot-sidebar')
                             ?.querySelector('iframe#qc-sidebar-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            tipo: 'audioAnalysisError',
            trackIndex: event.data.trackIndex,
            error: 'Important modals are open, cannot perform audio analysis'
          }, '*');
        }
        return;
      }
      
      const { trackIndex, trackTitle } = event.data;
      try {
        const result = await analyzeTrackAudio(trackIndex, trackTitle);
        const iframe = document.getElementById('qc-copilot-sidebar')
                             ?.querySelector('iframe#qc-sidebar-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            tipo: 'audioAnalysisResult',
            trackIndex,
            result
          }, '*');
        }
      } catch (error) {
        console.error('Error en análisis de audio:', error);
        const iframe = document.getElementById('qc-copilot-sidebar')
                             ?.querySelector('iframe#qc-sidebar-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            tipo: 'audioAnalysisError',
            trackIndex,
            error: error.message
          }, '*');
        }
      }
    }
    
    // NUEVO: Escuchar solicitudes de control de análisis de audio
    if (event.data.tipo === 'audioAnalysisControl') {
      const { action, tracks } = event.data;
      
      console.log('QC Copilot: Received audioAnalysisControl message:', { action, tracksCount: tracks?.length });
      
      if (action === 'enable') {
        setAudioAnalysisEnabled(true);
        console.log('QC Copilot: Audio analysis enabled via message');
      } else if (action === 'disable') {
        setAudioAnalysisEnabled(false);
        console.log('QC Copilot: Audio analysis disabled via message');
      } else if (action === 'status') {
        const iframe = document.getElementById('qc-copilot-sidebar')
                             ?.querySelector('iframe#qc-sidebar-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            tipo: 'audioAnalysisStatus',
            enabled: audioAnalysisEnabled,
            inProgress: audioAnalysisInProgress,
            resultsCount: audioAnalysisResults.length
          }, '*');
        }
      } else if (action === 'startOptimized') {
        console.log('QC Copilot: Starting optimized audio analysis for tracks:', tracks);
        
        // NUEVO: Intentar extracción directa del DOM primero
        console.log('QC Copilot: Attempting direct DOM extraction for manual analysis...');
        const domResults = extractAllAudioAnalysisDataFromDOM();
        
        if (domResults && domResults.length > 0) {
          // Usar resultados del DOM si están disponibles
          console.log(`QC Copilot: DOM extraction successful for manual analysis, ${domResults.length} results extracted`);
          
          // Enviar resultados al drawer
          const iframe = document.getElementById('qc-copilot-sidebar')
                               ?.querySelector('iframe#qc-sidebar-iframe');
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              tipo: 'optimizedAudioAnalysisComplete',
              results: domResults
            }, '*');
          }
        } else {
          // Fallback al método anterior si no hay modales en el DOM
          console.log('QC Copilot: No modals found in DOM for manual analysis, falling back to parallel analysis...');
          
          // Ejecutar análisis optimizado
          if (tracks && tracks.length > 0) {
          // NUEVO: Normalizar la estructura de los tracks para asegurar compatibilidad
          const normalizedTracks = tracks.map(track => ({
            trackIndex: track.trackIndex || track.displayNumber - 1 || 0,
            header: track.header || track.title || `Track ${track.displayNumber || track.trackIndex + 1}`,
            displayNumber: track.displayNumber || track.trackIndex + 1,
            hasAlert: track.hasAlert !== false // Asegurar que hasAlert sea true si no está definido
          }));
          
          console.log('QC Copilot: Normalized tracks:', normalizedTracks);
          
          performOptimizedAudioAnalysis(normalizedTracks).then(results => {
            console.log('QC Copilot: Optimized analysis completed, sending results to drawer:', results);
            // Enviar resultados al drawer
            const iframe = document.getElementById('qc-copilot-sidebar')
                                 ?.querySelector('iframe#qc-sidebar-iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                tipo: 'optimizedAudioAnalysisComplete',
                results: results
              }, '*');
            }
          }).catch(error => {
            console.error('QC Copilot: Error in optimized audio analysis:', error);
            // Enviar error al drawer
            const iframe = document.getElementById('qc-copilot-sidebar')
                                 ?.querySelector('iframe#qc-sidebar-iframe');
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage({
                tipo: 'optimizedAudioAnalysisError',
                error: error.message
              }, '*');
            }
          });
        } else {
          console.warn('QC Copilot: No tracks provided for optimized analysis');
          // Enviar mensaje de error al drawer
          const iframe = document.getElementById('qc-copilot-sidebar')
                               ?.querySelector('iframe#qc-sidebar-iframe');
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({
              tipo: 'optimizedAudioAnalysisError',
              error: 'No tracks provided for analysis'
            }, '*');
          }
        }
        }
      }
    }
    
    // NUEVO: Escuchar solicitudes de highlighting mejorado
    if (event.data.tipo === 'highlightRequest') {
      handleHighlightRequest(event.data.payload);
    }
    
    // NUEVO: Escuchar solicitudes de limpieza después del análisis de audio
    if (event.data.tipo === 'cleanupAfterAudioAnalysis') {
      cleanupAfterAudioAnalysis();
    }
    
    // Clean mode is always active - no listener needed
  });

  // NUEVO: Función mejorada para highlighting específico
  function handleHighlightRequest(payload) {
    const { rawKey, flagType, text, trackNum, params } = payload || {};
    
    try {
      console.log('Highlight request:', payload);
      
      // MEJORADO: Función helper para encontrar el elemento MÁS ESPECÍFICO que contiene el texto
      const findByText = (selectorList, txt) => {
        if (!txt || !txt.trim()) return null;
        const searchText = txt.toLowerCase().trim();

        // Función para encontrar el elemento más profundo/específico que contiene el texto
        const findDeepestMatch = (element) => {
          if (!element) return null;

          const elementText = (element.textContent || '').toLowerCase();
          if (!elementText.includes(searchText)) return null;

          // Buscar en hijos directos primero (elementos más específicos)
          const children = Array.from(element.children);
          for (const child of children) {
            const childText = (child.textContent || '').toLowerCase();
            if (childText.includes(searchText)) {
              // Recursivamente buscar en el hijo
              const deeper = findDeepestMatch(child);
              if (deeper) return deeper;
            }
          }

          // Si ningún hijo contiene el texto, este es el elemento más específico
          // Pero verificar que no sea un contenedor muy grande
          const isSmallEnough = element.children.length <= 5 &&
                                element.textContent.length < 500;

          return isSmallEnough ? element : null;
        };

        for (const sel of selectorList) {
          const nodes = Array.from(document.querySelectorAll(sel));

          for (const node of nodes) {
            const nodeText = (node.textContent || '').toLowerCase();
            if (!nodeText.includes(searchText)) continue;

            // Buscar el elemento más específico dentro de este nodo
            const specificElement = findDeepestMatch(node);
            if (specificElement) {
              console.log(`findByText: Found specific element for "${txt}":`, specificElement.tagName, specificElement.className);
              return specificElement;
            }

            // Fallback: buscar elementos leaf que contengan el texto
            const leafElements = node.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, code, strong, em, a, td, th');
            for (const leaf of leafElements) {
              const leafText = (leaf.textContent || '').toLowerCase();
              if (leafText.includes(searchText) && leaf.children.length <= 2) {
                console.log(`findByText: Found leaf element for "${txt}":`, leaf.tagName, leaf.className);
                return leaf;
              }
            }

            // Si no encontramos nada más específico, devolver el nodo original
            // pero solo si no es demasiado grande
            if (node.textContent.length < 1000) {
              return node;
            }
          }
        }
        return null;
      };

      // NUEVO: Función helper para encontrar tracks específicos
      const findTrackElement = (trackNumber) => {
        if (!trackNumber || trackNumber < 1) return null;
        
        const trackIndex = trackNumber - 1; // Convertir a índice 0-based
        
        // Intentar múltiples selectores para encontrar el track
        const trackSelectors = [
          `#track-${trackIndex}-info`,
          `.player[id="track-${trackIndex}-info"]`,
          `[data-track-player="${trackIndex}"]`,
          `[data-track-info][id*="track-${trackIndex}"]`
        ];
        
        for (const selector of trackSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log(`Track ${trackNumber} found with selector: ${selector}`);
            return element;
          }
        }
        
        // Fallback: buscar por contenido del header
        const trackInfoDivs = document.querySelectorAll('[data-track-info]');
        for (let i = 0; i < trackInfoDivs.length; i++) {
          const header = trackInfoDivs[i].querySelector('h5.font-extra-bold.fs-5');
          if (header && header.textContent.includes(`${trackNumber}.`)) {
            console.log(`Track ${trackNumber} found by header content`);
            return trackInfoDivs[i];
          }
        }
        
        return null;
      };

      // NUEVO: Función helper para encontrar el elemento más específico dentro de un track
      const findSpecificTrackElement = (trackElement, text) => {
        if (!trackElement) return null;
        
        // MEJORADO: Buscar EXACTAMENTE el campo de texto donde está la coincidencia
        const textToFind = text.toLowerCase().trim();
        
        // 1. Buscar en campos de entrada (inputs) - PRIORIDAD MÁXIMA
        const inputFields = trackElement.querySelectorAll('input[type="text"], input[type="email"], textarea, .form-control');
        for (const input of inputFields) {
          const inputValue = (input.value || '').toLowerCase();
          const inputPlaceholder = (input.placeholder || '').toLowerCase();
          const inputName = (input.name || '').toLowerCase();
          
          if (inputValue.includes(textToFind) || 
              inputPlaceholder.includes(textToFind) || 
              inputName.includes(textToFind)) {
            console.log(`Found exact input field for text "${text}":`, input);
            return input;
          }
        }
        
        // 2. Buscar en labels específicos que contengan el texto
        const labels = trackElement.querySelectorAll('label');
        for (const label of labels) {
          const labelText = (label.textContent || '').toLowerCase();
          if (labelText.includes(textToFind)) {
            console.log(`Found exact label for text "${text}":`, label);
            return label;
          }
        }
        
        // 3. Buscar en spans y elementos de texto que contengan EXACTAMENTE el texto
        const textElements = trackElement.querySelectorAll('span, p, div, h5, h6, strong, em');
        for (const el of textElements) {
          const elementText = (el.textContent || '').toLowerCase();
          if (elementText.includes(textToFind)) {
            // Verificar que no sea un contenedor muy grande
            const childElements = el.querySelectorAll('*');
            if (childElements.length <= 2) { // Solo elementos con pocos hijos
              console.log(`Found exact text element for "${text}":`, el);
              return el;
            }
          }
        }
        
        // 4. Buscar en campos específicos por nombre o atributos
        const specificFields = trackElement.querySelectorAll('[name*="title"], [name*="artist"], [name*="album"], [name*="duration"], [name*="version"]');
        for (const field of specificFields) {
          const fieldValue = (field.value || '').toLowerCase();
          const fieldName = (field.name || '').toLowerCase();
          
          if (fieldValue.includes(textToFind) || fieldName.includes(textToFind)) {
            console.log(`Found specific field for text "${text}":`, field);
            return field;
          }
        }
        
        // 5. Fallback: buscar en el header del track si no se encuentra nada más específico
        const header = trackElement.querySelector('h5.font-extra-bold.fs-5');
        if (header) {
          console.log(`Using track header as fallback for text "${text}"`);
          return header;
        }
        
        return trackElement;
      };

      const highlight = (el, searchText = '') => {
        if (!el) return false;

        // MEJORADO: Buscar el elemento más específico que contenga el texto
        let targetElement = el;
        const textToFind = (searchText || t || '').toLowerCase().trim();

        // Función helper para verificar si un elemento es "pequeño" (específico)
        const isSpecificElement = (elem) => {
          if (!elem) return false;
          const tag = elem.tagName?.toLowerCase();
          // Elementos que son inherentemente específicos
          if (['input', 'textarea', 'select', 'label', 'code', 'strong', 'em', 'a', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            return elem.children.length <= 2;
          }
          // Para otros elementos, verificar tamaño del contenido
          return elem.textContent && elem.textContent.length < 200 && elem.children.length <= 3;
        };

        // Función helper para encontrar el elemento más específico con el texto
        const findMostSpecific = (container, text) => {
          if (!container || !text) return container;

          // Buscar elementos leaf que contengan el texto exacto
          const candidates = container.querySelectorAll('p, span, h5, h6, label, code, strong, em, a, td, input, textarea');
          let bestMatch = null;
          let bestMatchLength = Infinity;

          for (const candidate of candidates) {
            const candidateText = (candidate.value || candidate.textContent || '').toLowerCase();
            if (candidateText.includes(text)) {
              // Preferir elementos más pequeños (más específicos)
              if (candidateText.length < bestMatchLength && isSpecificElement(candidate)) {
                bestMatch = candidate;
                bestMatchLength = candidateText.length;
              }
            }
          }

          return bestMatch || container;
        };

        // Si es un contenedor grande, buscar elemento más específico
        const isLargeContainer = el.classList?.contains('row') ||
                                 el.classList?.contains('card') ||
                                 el.classList?.contains('card-body') ||
                                 el.classList?.contains('player') ||
                                 el.classList?.contains('container') ||
                                 el.classList?.contains('pt-3') ||
                                 (el.children && el.children.length > 5) ||
                                 (el.textContent && el.textContent.length > 500);

        if (isLargeContainer && textToFind) {
          const specific = findMostSpecific(el, textToFind);
          if (specific && specific !== el) {
            console.log(`Highlight: Found more specific element for "${textToFind}":`, specific.tagName, specific.className || '(no class)');
            targetElement = specific;
          }
        }

        // Si es un input o textarea, usarlo directamente
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          targetElement = el;
        }

        // Scroll suave al elemento
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Overlay flotante que se reposiciona con scroll/resize - MÁS ESPECÍFICO
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.border = '3px solid #10b981';
        overlay.style.boxShadow = '0 0 0 6px rgba(16,185,129,0.25)';
        overlay.style.borderRadius = '8px';
        overlay.style.background = 'transparent';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '2147483646';
        overlay.style.transition = 'opacity .35s ease';
        document.body.appendChild(overlay);

        const updateOverlayPosition = () => {
          const r = targetElement.getBoundingClientRect();
          // MEJORADO: Padding más específico para campos de texto
          const padding = targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' ? 2 : 4;
          overlay.style.left = (r.left - padding) + 'px';
          overlay.style.top = (r.top - padding) + 'px';
          overlay.style.width = (r.width + padding * 2) + 'px';
          overlay.style.height = (r.height + padding * 2) + 'px';
        };

        // Actualizar posición múltiples veces durante el scroll suave
        let rafId = 0, ticks = 0;
        const tick = () => {
          updateOverlayPosition();
          if (ticks++ < 12) { // ~12 frames ~200ms
            rafId = requestAnimationFrame(tick);
          }
        };
        tick();

        // Reposicionar en scroll/resize/zoom durante el tiempo visible
        const onScroll = () => updateOverlayPosition();
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);

        // Fade out y cleanup
        setTimeout(() => { overlay.style.opacity = '0'; }, 1800);
        setTimeout(() => {
          if (rafId) cancelAnimationFrame(rafId);
          window.removeEventListener('scroll', onScroll, true);
          window.removeEventListener('resize', onScroll);
          overlay.remove();
        }, 2300);
        return true;
      };

      const t = (text||'').trim();
      const raw = (rawKey||'').toLowerCase();
      const flag = (flagType||'').toLowerCase();

      // NUEVO: Casos específicos mejorados con prioridad por trackNum
      
      // 1) Audio tracks específicos - PRIORIDAD MÁXIMA
      if (trackNum && (raw.includes('audio') || raw.includes('track'))) {
        console.log(`Highlighting specific track: ${trackNum}`);
        const trackElement = findTrackElement(trackNum);
        if (trackElement) {
          // MEJORADO: Buscar el elemento más específico dentro del track
          const specificElement = findSpecificTrackElement(trackElement, t);
          if (highlight(specificElement)) return;
        }
      }
      
      // 2) Casos generales de usuario
      if (raw.includes('user has strikes') || flag.includes('userstrikes')) {
        const userCard = document.querySelector('body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1)');
        if (highlight(userCard)) return;
      }
      
      if (raw.includes('user not verified')) {
        const badge = document.querySelector('body > main > section > div.row.row-cols-3.gx-1 > div:nth-child(1) span.badge');
        if (highlight(badge)) return;
      }
      
      // 3) Casos de blacklist/curated
      if (raw.includes('blacklisted') || flag.includes('blacklist')) {
        const el = findByText([
          'div.row.row-cols-3 .card-body',
          '[data-track-info] .row.py-2',
          'main'
        ], t);
        if (highlight(el, t)) return;
      }

      if (raw.includes('curated') || flag.includes('curated')) {
        const el = findByText([
          'div.row.row-cols-3 .card-body',
          '[data-track-info] .row.py-2',
          'main'
        ], t);
        if (highlight(el, t)) return;
      }

      // 4) Terms sospechosos
      if (flag.includes('terms') || raw.includes('suspicious term')) {
        const el = findByText([
          '[data-track-info] .row.py-2',
          'div.row.row-cols-3 .card-body',
          'main'
        ], t);
        if (highlight(el, t)) return;
      }
      
      // 5) Track duration específico
      if (raw.includes('track') && raw.includes('duration')) {
        const num = parseInt((t.match(/Track\s+(\d+)/i)||[])[1]||params.trackNum||'',10);
        if (!Number.isNaN(num)) {
          const trackElement = findTrackElement(num);
          if (trackElement) {
            // MEJORADO: Buscar específicamente el campo de duración
            const durationElement = trackElement.querySelector('input[name*="duration"], .form-control[placeholder*="duration"], label:contains("Duration"), span:contains("Duration")');
            if (durationElement) {
              if (highlight(durationElement)) return;
            } else {
              // Fallback al header del track
              const header = trackElement.querySelector('h5.font-extra-bold.fs-5');
              if (highlight(header || trackElement)) return;
            }
          }
        }
      }
      
      // 6) Top songs matches
      if (raw.includes('track matches top song') || raw.includes('matches top song')) {
        const num = parseInt((t.match(/Track\s+(\d+)/i)||[])[1]||params.trackNum||'',10);
        if (!Number.isNaN(num)) {
          const trackElement = findTrackElement(num);
          if (trackElement) {
            // MEJORADO: Resaltar específicamente el header del track
            const header = trackElement.querySelector('h5.font-extra-bold.fs-5');
            if (highlight(header || trackElement)) return;
          }
        } else {
          // A nivel release: título principal
          const title = document.querySelector('h2');
          if (highlight(title)) return;
        }
      }
      
      // 7) Version tags
      if (raw.includes('version')) {
        // Si hay trackNum, buscar específicamente ese track
        if (trackNum) {
          const trackElement = findTrackElement(trackNum);
          if (trackElement) {
            // MEJORADO: Buscar específicamente el campo Version
            const versionElement = trackElement.querySelector('input[name*="version"], .form-control[placeholder*="version"], label:contains("Version"), span:contains("Version")');
            if (versionElement) {
              if (highlight(versionElement)) return;
            } else {
              // Fallback al header del track
              const header = trackElement.querySelector('h5.font-extra-bold.fs-5');
              if (highlight(header || trackElement)) return;
            }
          }
        } else {
          // Buscar campos Version generales
          const el = findByText([
            '[data-track-info] .row.py-2',
            'div.row.row-cols-3 .card-body',
          ], 'version');
          if (highlight(el, 'version')) return;
        }
      }

      // Fallback: buscar coincidencia general en toda la página
      console.log('Using fallback highlighting for:', t);
      const fallback = findByText(['main', 'body'], t);
      highlight(fallback, t);
      
    } catch (error) {
      console.error('Error in highlight request:', error);
    }
  }

  // Función para analizar audio de una pista específica
  async function analyzeTrackAudio(trackIndex, trackTitle) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`=== INICIANDO ANÁLISIS DE AUDIO PARA TRACK ${trackIndex + 1} ===`);
        
        // Buscar el botón de alerta para la pista con múltiples selectores
        const alertButtonSelectors = [
          `[id^="track-${trackIndex}-info"] .alert-button`,
          `[id^="track-${trackIndex}-info"] .btn-alert`,
          `[id^="track-${trackIndex}-info"] button[title*="alert"]`,
          `[id^="track-${trackIndex}-info"] button[aria-label*="alert"]`,
          `[id^="track-${trackIndex}-info"] button.alert`,
          `[id^="track-${trackIndex}-info"] button.alert-warning`,
          `[id^="track-${trackIndex}-info"] button.btn-warning`,
          `[id^="track-${trackIndex}-info"] button[class*="alert"]`,
          `[id^="track-${trackIndex}-info"] button[class*="warning"]`,
          `[id^="track-${trackIndex}-info"] .alert`,
          `[id^="track-${trackIndex}-info"] .warning`,
          `[id^="track-${trackIndex}-info"] [class*="alert"]`,
          `[id^="track-${trackIndex}-info"] [class*="warning"]`
        ];
        
        let alertButton = null;
        for (const selector of alertButtonSelectors) {
          alertButton = document.querySelector(selector);
          if (alertButton) break;
        }
        
        // Si no se encuentra con selectores específicos, buscar en el contenedor padre
        if (!alertButton) {
          const trackElement = document.querySelector(`[id^="track-${trackIndex}-info"]`);
          if (trackElement) {
            const parentRow = trackElement.closest('.row');
            if (parentRow) {
              alertButton = parentRow.querySelector('button.alert, button.alert-warning, button.btn-warning, button[class*="alert"], button[class*="warning"]');
            }
          }
        }
        
        // Si no se encuentra con selectores específicos, buscar en todo el documento
        if (!alertButton) {
          const allButtons = document.querySelectorAll('button');
          for (const button of allButtons) {
            const buttonText = button.textContent.toLowerCase();
            const buttonTitle = button.title?.toLowerCase() || '';
            const buttonAriaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
            const buttonClasses = button.className.toLowerCase();
            
            if (buttonText.includes('alert') || buttonText.includes('warning') ||
                buttonTitle.includes('alert') || buttonTitle.includes('warning') ||
                buttonAriaLabel.includes('alert') || buttonAriaLabel.includes('warning') ||
                buttonClasses.includes('alert') || buttonClasses.includes('warning')) {
              
              // Verificar si está cerca del track correspondiente
              const trackElement = document.querySelector(`[id^="track-${trackIndex}-info"]`);
              if (trackElement && (trackElement.contains(button) || 
                                  trackElement.closest('.row')?.contains(button) ||
                                  button.closest('.row')?.contains(trackElement))) {
                alertButton = button;
                break;
              }
            }
          }
        }
        
        if (!alertButton) {
          reject(new Error(`No se encontró botón de alerta para track ${trackIndex + 1}`));
          return;
        }

        console.log(`Botón de alerta encontrado para track ${trackIndex + 1}:`, alertButton);
        console.log(`Botón HTML:`, alertButton.outerHTML);
        
        // NUEVO: Verificar que el modal de audio analysis esté accesible antes de hacer click
        if (!isAudioAnalysisModalAccessible()) {
          console.log(`QC Copilot: Modal not accessible for track ${trackIndex + 1}, attempting cleanup...`);
          await cleanupStuckModals();
          // Esperar un poco después de la limpieza
          await new Promise(resolve => setTimeout(resolve, 100)); // OPTIMIZADO: Reducido de 500ms a 100ms
          
          // Verificar nuevamente
          if (!isAudioAnalysisModalAccessible()) {
            console.error(`QC Copilot: Modal still not accessible for track ${trackIndex + 1} after cleanup`);
            reject(new Error(`Modal de audio analysis no accesible para track ${trackIndex + 1}`));
            return;
          }
        }
        
        // NUEVO: Verificar que el botón no esté deshabilitado
        if (alertButton.disabled || alertButton.hasAttribute('disabled')) {
          console.warn(`Botón de alerta para track ${trackIndex + 1} está deshabilitado`);
          reject(new Error(`Botón de alerta deshabilitado para track ${trackIndex + 1}`));
          return;
        }
        
        // NUEVO: Verificar que el botón sea visible
        const buttonStyle = window.getComputedStyle(alertButton);
        if (buttonStyle.display === 'none' || buttonStyle.visibility === 'hidden' || buttonStyle.opacity === '0') {
          console.warn(`Botón de alerta para track ${trackIndex + 1} no es visible`);
          reject(new Error(`Botón de alerta no visible para track ${trackIndex + 1}`));
          return;
        }
        
        // NUEVO: Intentar múltiples métodos de click para mayor confiabilidad
        let clickSuccessful = false;
        const clickMethods = [
          () => alertButton.click(),
          () => alertButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
          () => alertButton.dispatchEvent(new Event('click', { bubbles: true, cancelable: true })),
          () => {
            // Simular click completo con mousedown, mouseup, click
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
              alertButton.dispatchEvent(new MouseEvent(eventType, { 
                bubbles: true, 
                cancelable: true,
                view: window,
                detail: 1
              }));
            });
          }
        ];
        
        for (let i = 0; i < clickMethods.length && !clickSuccessful; i++) {
          try {
            console.log(`Intentando método de click ${i + 1} para track ${trackIndex + 1}`);
            clickMethods[i]();
            
            // Esperar un poco antes de verificar si el modal apareció
            await new Promise(resolve => setTimeout(resolve, 50)); // OPTIMIZADO: Reducido de 200ms a 50ms
            
            // Verificar si el modal apareció
            const modal = document.querySelector('.modal.show, .modal[style*="display: block"], .modal[style*="display:block"]');
            if (modal) {
              console.log(`Modal apareció con método de click ${i + 1} para track ${trackIndex + 1}`);
              clickSuccessful = true;
              break;
            }
          } catch (error) {
            console.warn(`Error con método de click ${i + 1}:`, error);
          }
        }
        
        if (!clickSuccessful) {
          console.error(`Ningún método de click funcionó para track ${trackIndex + 1}`);
          reject(new Error(`No se pudo abrir el modal para track ${trackIndex + 1}`));
          return;
        }
        
        // NUEVO: Esperar a que aparezca el modal con mejor lógica de detección
        let modal = null;
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos máximo (aumentado de 5)
        
        console.log(`Esperando modal para track ${trackIndex + 1}...`);
        
        while (!modal && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // NUEVO: Múltiples métodos de detección de modal
          const modalSelectors = [
            '.modal.show',
            '.modal[style*="display: block"]',
            '.modal[style*="display:block"]',
            '.modal:not([style*="display: none"])',
            '[id^="revision-audio-analysis-modal-"]',
            '.modal[aria-hidden="false"]'
          ];
          
          for (const selector of modalSelectors) {
            modal = document.querySelector(selector);
            if (modal) {
              // NUEVO: Verificar que el modal sea realmente visible
              const modalStyle = window.getComputedStyle(modal);
              if (modalStyle.display !== 'none' && modalStyle.visibility !== 'hidden' && modalStyle.opacity !== '0') {
                break;
              } else {
                modal = null; // Reset si no es realmente visible
              }
            }
          }
          
          attempts++;
          if (attempts % 20 === 0) {
            console.log(`Intento ${attempts}/${maxAttempts} - Modal encontrado:`, !!modal);
          }
        }
        
        if (!modal) {
          console.error(`Modal no apareció después de ${maxAttempts} intentos para track ${trackIndex + 1}`);
          
          // NUEVO: Intentar cerrar cualquier modal que pueda estar bloqueando
          const blockingModals = document.querySelectorAll('.modal');
          if (blockingModals.length > 0) {
            console.log(`Encontrados ${blockingModals.length} modales que pueden estar bloqueando, intentando cerrarlos...`);
            for (const blockingModal of blockingModals) {
              try {
                await closeAudioModal(blockingModal);
              } catch (e) {
                console.warn('Error al cerrar modal bloqueante:', e);
              }
            }
          }
          
          reject(new Error(`Modal no apareció para track ${trackIndex + 1}`));
          return;
        }

        console.log(`Modal encontrado para track ${trackIndex + 1} después de ${attempts} intentos`);
        console.log(`Modal HTML:`, modal.outerHTML.substring(0, 500) + '...');
        
        // NUEVO: Verificar que el modal sea el correcto (audio analysis)
        if (!modal.id || !modal.id.includes('audio-analysis')) {
          console.warn(`Modal encontrado no parece ser de audio analysis: ${modal.id}`);
          // Continuar de todas formas, puede ser un modal genérico
        }
        
        // Extraer datos del modal
        const modalData = extractAudioAnalysisData(modal, trackTitle, trackIndex);
        
        // Cerrar el modal
        await closeAudioModal(modal);
        
        // NUEVO: Extraer información del artista y álbum después de cerrar el modal
        // cuando el DOM esté más estable
        const finalTrackData = await extractTrackInfoAfterModalClose(trackIndex, trackTitle, modalData);
        
        console.log(`=== ANÁLISIS DE AUDIO COMPLETADO PARA TRACK ${trackIndex + 1} ===`);
        resolve(finalTrackData);
        
      } catch (error) {
        console.error(`Error en análisis de audio para track ${trackIndex + 1}:`, error);
        reject(error);
      }
    });
  }

  // NUEVO: Función para extraer datos de TODOS los modales de audio analysis directamente del DOM
  function extractAllAudioAnalysisDataFromDOM() {
    console.log('QC Copilot: Extracting all audio analysis data directly from DOM...');
    
    const startTime = performance.now();
    const allResults = [];
    
    // Buscar todos los modales de audio analysis en el DOM
    const audioModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"]');
    console.log(`QC Copilot: Found ${audioModals.length} audio analysis modals in DOM`);
    
    if (audioModals.length === 0) {
      console.log('QC Copilot: No audio analysis modals found in DOM');
      return [];
    }
    
    // Procesar todos los modales en paralelo
    audioModals.forEach(modal => {
      try {
        // Extraer trackIndex del ID del modal
        const modalId = modal.id;
        const trackIndexMatch = modalId.match(/revision-audio-analysis-modal-(\d+)/);
        if (!trackIndexMatch) {
          console.warn(`QC Copilot: Could not extract trackIndex from modal ID: ${modalId}`);
          return;
        }
        
        const trackIndex = parseInt(trackIndexMatch[1], 10);
        console.log(`QC Copilot: Processing modal for track ${trackIndex}`);
        
        // Extraer datos del modal
        const modalData = extractSingleModalData(modal, trackIndex);
        if (modalData) {
          allResults.push(modalData);
          console.log(`QC Copilot: Successfully extracted data for track ${trackIndex}:`, modalData);
        }
        
      } catch (error) {
        console.error('QC Copilot: Error processing modal:', error);
      }
    });
    
    const processingTime = performance.now() - startTime;
    console.log(`QC Copilot: DOM extraction completed in ${processingTime.toFixed(2)}ms - ${allResults.length} tracks processed`);
    
    return allResults;
  }

  // NUEVO: Función para extraer datos de un modal individual
  function extractSingleModalData(modal, trackIndex) {
    try {
      // Extraer información del track desde el DOM
      const trackInfo = document.getElementById(`track-${trackIndex}-info`);
      if (!trackInfo) {
        console.warn(`QC Copilot: Track info not found for track ${trackIndex}`);
        return null;
      }
      
      // Extraer título del track usando el selector correcto
      let trackTitle = 'Unknown Track';
      const titleElement = trackInfo.querySelector('div > div.player-track-meta > p:nth-child(1)');
      if (titleElement) {
        trackTitle = titleElement.textContent.trim();
        console.log(`QC Copilot: Track title found: ${trackTitle}`);
      }
      
      // Extraer artista del track usando el selector correcto
      let trackArtist = '—';
      const artistElement = trackInfo.querySelector('div > div.player-track-meta > p:nth-child(2) > span');
      if (artistElement) {
        trackArtist = artistElement.textContent.trim();
        console.log(`QC Copilot: Track artist found: ${trackArtist}`);
      }
      
      // Extraer álbum usando el selector correcto (cache para evitar múltiples búsquedas)
      let trackAlbum = '—';
      if (!window._qcAlbumCache) {
        const albumElement = document.querySelector('body > main > section > div.row.row-cols-2.gx-1 > div:nth-child(1) > div > div > div.container.gy-1.pb-3.d-flex.flex-row > div:nth-child(2) > div:nth-child(1) > div.col-10 > h2');
        window._qcAlbumCache = albumElement ? albumElement.textContent.trim() : '—';
        console.log(`QC Copilot: Album found: ${window._qcAlbumCache}`);
      }
      trackAlbum = window._qcAlbumCache;
      
      // Buscar el cuerpo del modal
      const modalBody = modal.querySelector('.modal-body.side-modal--body > div > div');
      if (!modalBody) {
        console.warn(`QC Copilot: Modal body not found for track ${trackIndex}`);
        return {
          trackTitle,
          trackArtist,
          trackAlbum,
          trackIndex,
          results: [],
          extractedAt: new Date().toISOString()
        };
      }
      
      
      // Buscar todas las tablas de resultados
      const allTables = modalBody.querySelectorAll('table');
      console.log(`QC Copilot: Found ${allTables.length} tables in modal for track ${trackIndex}`);
      
      const results = [];
      let resultIndex = 1;
      
      // Procesar cada tabla
      allTables.forEach(table => {
        const result = {
          index: resultIndex,
          title: '',
          artists: [],
          album: '',
          score: 0
        };
        
        // Procesar filas de la tabla
        const rows = table.querySelectorAll('tbody > tr, tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim().toLowerCase();
            const value = cells[1].textContent.trim();
            
            // Saltar valores vacíos
            if (!value || value === '-' || value === '') return;
            
            // Mapear labels a campos
            if (label.includes('artist')) {
              result.artists = [value];
            } else if (label.includes('album') || label.includes('álbum')) {
              result.album = value;
            } else if (label.includes('title') || label.includes('título') || label.includes('track')) {
              result.title = value;
            } else if (label.includes('score') || label.includes('match') || label.includes('similarity')) {
              const scoreMatch = value.match(/(\d+)%?/);
              if (scoreMatch) {
                result.score = parseInt(scoreMatch[1], 10);
              }
            }
          }
        });
        
        // Solo agregar si tiene datos válidos
        if (result.title || result.artists.length > 0 || result.score > 0) {
          results.push(result);
          resultIndex++;
        }
      });
      
      // Deduplicar resultados
      const uniqueResults = [];
      const seenResults = new Set();
      
      results.forEach(result => {
        const resultKey = `${result.title}|${result.artists[0] || ''}|${result.album}|${result.score}`;
        if (!seenResults.has(resultKey)) {
          seenResults.add(resultKey);
          uniqueResults.push(result);
        }
      });
      
      console.log(`QC Copilot: Track ${trackIndex} - ${uniqueResults.length} unique results extracted`);
      
      return {
        trackTitle,
        trackArtist,
        trackAlbum,
        trackIndex,
        results: uniqueResults,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`QC Copilot: Error extracting data from modal for track ${trackIndex}:`, error);
      return null;
    }
  }

  // NUEVO: Función de debug mejorada para inspeccionar la estructura del DOM de tracks
  window.debugTrackStructure = function(trackIndex = 0) {
    console.log(`QC Copilot: Debugging track structure for track ${trackIndex}`);
    
    const trackInfo = document.getElementById(`track-${trackIndex}-info`);
    if (!trackInfo) {
      console.warn(`Track info not found for track ${trackIndex}`);
      
      // Buscar alternativas si no encuentra el elemento
      const alternatives = [
        `[data-track-player="${trackIndex}"]`,
        `[data-track-info][id*="track-${trackIndex}"]`,
        `.player[id="track-${trackIndex}-info"]`,
        `[id*="track-${trackIndex}"]`
      ];
      
      for (const selector of alternatives) {
        const alt = document.querySelector(selector);
        if (alt) {
          console.log(`Found alternative with selector "${selector}":`, alt);
          return debugElement(alt, `Alternative for track ${trackIndex}`);
        }
      }
      
      return;
    }
    
    debugElement(trackInfo, `Track ${trackIndex}`);
  };
  
  // Función helper para debuggear cualquier elemento
  function debugElement(element, label) {
    console.log(`=== ${label} ===`);
    console.log('Element:', element);
    console.log('Tag:', element.tagName);
    console.log('Classes:', element.className);
    console.log('ID:', element.id);
    console.log('Text Content:', element.textContent);
    console.log('Inner HTML:', element.innerHTML);
    
    // Buscar todos los elementos hijos con texto
    const childrenWithText = Array.from(element.querySelectorAll('*')).filter(el => 
      el.textContent.trim() && el.children.length === 0
    );
    
    console.log('Children with text:');
    childrenWithText.forEach((child, i) => {
      console.log(`  ${i}: "${child.textContent.trim()}" (${child.tagName}, classes: ${child.className})`);
    });
    
    // Buscar todos los elementos que podrían ser títulos
    const possibleTitles = element.querySelectorAll('h1, h2, h3, h4, h5, h6, .title, .track-title, .song-title, [class*="title"]');
    console.log('Possible title elements:');
    possibleTitles.forEach((title, i) => {
      console.log(`  ${i}: "${title.textContent.trim()}" (${title.tagName}, classes: ${title.className})`);
    });
    
    // Buscar elementos con clases específicas de la aplicación
    const appElements = element.querySelectorAll('[class*="player"], [class*="track"], [class*="song"], [class*="audio"]');
    console.log('App-specific elements:');
    appElements.forEach((el, i) => {
      console.log(`  ${i}: "${el.textContent.trim()}" (${el.tagName}, classes: ${el.className})`);
    });
    
    // Buscar en elementos padre
    let parent = element.parentElement;
    let level = 1;
    while (parent && level <= 5) {
      console.log(`Parent level ${level}:`, parent.tagName, parent.className, parent.id);
      if (parent.textContent.trim()) {
        console.log(`  Text: "${parent.textContent.trim().substring(0, 100)}..."`);
      }
      parent = parent.parentElement;
      level++;
    }
  }
  
  // Función para debuggear todos los tracks disponibles
  window.debugAllTracks = function() {
    console.log('QC Copilot: Debugging all available tracks');
    
    // Buscar todos los elementos que podrían ser tracks
    const possibleTracks = document.querySelectorAll('[id*="track"], [class*="track"], [data-track]');
    console.log(`Found ${possibleTracks.length} possible track elements`);
    
    possibleTracks.forEach((track, i) => {
      console.log(`\n--- Track ${i} ---`);
      console.log('Element:', track);
      console.log('ID:', track.id);
      console.log('Classes:', track.className);
      console.log('Text:', track.textContent.trim().substring(0, 100));
    });
  };

  // OPTIMIZADO: Función ultra-rápida para extraer datos del modal de análisis de audio
  function extractAudioAnalysisData(modal, trackTitle, trackIndex) {
    const startTime = performance.now();
    const allResults = []; // NUEVO: Lista plana de todos los results
    
    console.log(`Extrayendo datos del modal: ${modal.id}`);
    
    // OPTIMIZADO: Extraer información del track usando selectores cacheados y más rápidos
    let trackArtist = '—';
    let trackAlbum = '—';
    let realTrackTitle = trackTitle;
    
    try {
      // Cache de elementos para evitar múltiples querySelector
      const trackInfo = document.getElementById(`track-${trackIndex}-info`);
      
      if (trackInfo) {
        // OPTIMIZADO: Obtener título directamente del elemento cacheado
        if (!realTrackTitle || realTrackTitle.startsWith('Track ')) {
          const titleElement = trackInfo.querySelector('h5.font-extra-bold.fs-5');
          if (titleElement) {
            realTrackTitle = titleElement.textContent.trim();
            console.log(`Track title real extraído: "${realTrackTitle}"`);
          }
        }
        
        // OPTIMIZADO: Extraer artista con selector simplificado
        const artistElement = trackInfo.querySelector('.player-track-meta p:nth-child(2) span');
        if (artistElement) {
          trackArtist = artistElement.textContent.trim();
          console.log(`Track artist extraído: ${trackArtist}`);
        }
      }
      
      // OPTIMIZADO: Cache del álbum para evitar búsquedas repetidas
      if (!window._qcAlbumCache) {
        const albumElement = document.querySelector('body > main > section h2');
        window._qcAlbumCache = albumElement ? albumElement.textContent.trim() : '—';
      }
      trackAlbum = window._qcAlbumCache;
      
    } catch (error) {
      console.warn('Error extrayendo información del track:', error);
    }
    
    // NUEVO: Buscar la estructura correcta según los selectores proporcionados
    const modalBody = modal.querySelector('.modal-body.side-modal--body > div > div');
    if (!modalBody) {
      console.error('No se encontró el cuerpo del modal');
      return {
        trackTitle: trackTitle || 'Unknown Track',
        trackArtist: trackArtist,
        trackAlbum: trackAlbum,
        trackIndex: trackIndex, // NUEVO: Incluir trackIndex
        results: [], // NUEVO: Cambiado de fragments a results
        extractedAt: new Date().toISOString()
      };
    }
    
    // NUEVO: Buscar todos los results individuales en todo el modal
    // Cada result está en una tabla individual, sin importar el fragmento
    const allTables = modalBody.querySelectorAll('table');
    console.log(`Encontradas ${allTables.length} tablas de results en total`);
    
    let resultIndex = 1;
    
    // OPTIMIZADO: Procesar tablas de forma ultra-rápida con cache y optimizaciones
    const labelCache = new Map();
    const scoreRegex = /(\d+)%?/; // Pre-compilar regex
    
    for (let tableIndex = 0; tableIndex < allTables.length; tableIndex++) {
      const table = allTables[tableIndex];
      console.log(`Procesando result ${resultIndex} (tabla ${tableIndex + 1})`);
      
      const result = {
        index: resultIndex,
        title: '',
        artists: [],
        album: '',
        score: 0
      };
      
      try {
        // OPTIMIZADO: Usar querySelectorAll una sola vez y cachear
        const rows = table.querySelectorAll('tbody > tr, tr');
        
        // OPTIMIZADO: Usar for loop tradicional (más rápido que forEach)
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const cells = row.querySelectorAll('td');
          
          if (cells.length >= 2) {
            let label = cells[0].textContent.trim();
            const value = cells[1].textContent.trim();
            
            // OPTIMIZADO: Cache de labels procesados
            if (!labelCache.has(label)) {
              labelCache.set(label, label.toLowerCase());
            }
            const lowerLabel = labelCache.get(label);
            
            // OPTIMIZADO: Early exit para valores vacíos
            if (!value || value === '-' || value === '') continue;
            
            // OPTIMIZADO: Switch mejorado con early exit
            if (lowerLabel.includes('artist')) {
              result.artists = [value];
            } else if (lowerLabel.includes('album') || lowerLabel.includes('álbum')) {
              result.album = value;
            } else if (lowerLabel.includes('title') || lowerLabel.includes('título') || lowerLabel.includes('track')) {
              result.title = value;
            } else if (lowerLabel.includes('score') || lowerLabel.includes('match') || lowerLabel.includes('similarity')) {
              const scoreMatch = scoreRegex.exec(value);
              if (scoreMatch) {
                result.score = parseInt(scoreMatch[1], 10);
              }
            }
          }
        }
        
        // OPTIMIZADO: Verificación rápida de validez
        if (result.title || result.artists.length > 0 || result.score > 0) {
          allResults.push(result);
          console.log(`Result ${resultIndex} agregado:`, result);
          resultIndex++;
        } else {
          console.log(`Result ${resultIndex} descartado por falta de datos válidos`);
        }
        
      } catch (error) {
        console.error(`Error procesando result ${resultIndex}:`, error);
      }
    }
    
    // OPTIMIZADO: Deduplicación ultra-rápida
    const uniqueResults = [];
    const seenResults = new Set();
    
    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      // OPTIMIZADO: Clave más eficiente
      const resultKey = `${result.title}|${result.artists[0] || ''}|${result.album}|${result.score}`;
      
      if (!seenResults.has(resultKey)) {
        seenResults.add(resultKey);
        uniqueResults.push(result);
      } else {
        console.log(`Result duplicado omitido:`, result);
      }
    }
    
    const processingTime = performance.now() - startTime;
    console.log(`Extracción completada en ${processingTime.toFixed(2)}ms - Results: ${allResults.length}, únicos: ${uniqueResults.length}`);
    
    return {
      trackTitle: realTrackTitle || 'Unknown Track', // NUEVO: Usar el título real
      trackArtist: trackArtist,
      trackAlbum: trackAlbum,
      trackIndex: trackIndex, // NUEVO: Incluir trackIndex para que drawer.js pueda procesarlo correctamente
      results: uniqueResults, // NUEVO: Retornar results únicos
      processingTime: processingTime,
      extractedAt: new Date().toISOString()
    };
  }

  // Función para analizar alertas de un result
  function analyzeFragmentAlerts(result, trackTitle) {
    const alerts = [];
    
    // Alerta si score es 100%
    if (result.score === 100) {
      alerts.push({ message: 'Score 100%', type: 'score_100' });
    }
    
    // Alerta si título es similar pero artistas son diferentes
    if (isSimilarTitle(result.title, trackTitle) && result.artists.length > 0) {
      // NUEVO: Comparar con el artista del track original si está disponible
      const trackArtist = extractTrackArtist(trackTitle);
      if (trackArtist && result.artists.length > 0) {
        const hasDifferentArtist = !result.artists.some(artist => 
          isSimilarArtist(artist, trackArtist)
        );
        if (hasDifferentArtist) {
          alerts.push({ 
            message: `Título similar (${result.title}) pero artista diferente (${result.artists.join(', ')})`, 
            type: 'title_similar_artist_different' 
          });
        }
      } else {
        alerts.push({ 
          message: `Título similar (${result.title})`, 
          type: 'title_similar' 
        });
      }
    }
    
    // Alerta si hay artistas adicionales
    if (result.artists.length > 1) {
      alerts.push({ 
        message: `Múltiples artistas: ${result.artists.join(', ')}`, 
        type: 'multiple_artists' 
      });
    }
    
    // NUEVO: Alerta si el score es alto pero hay diferencias significativas
    if (result.score >= 80 && result.score < 100) {
      if (result.title && result.title !== trackTitle) {
        alerts.push({ 
          message: `Score alto (${result.score}%) pero título diferente: "${result.title}"`, 
          type: 'high_score_different_title' 
        });
      }
    }
    
    // NUEVO: Alerta si hay información de álbum diferente
    if (result.album && result.album !== '—') {
      alerts.push({ 
        message: `Álbum: ${result.album}`, 
        type: 'album_info' 
      });
    }
    
    return alerts;
  }

  // NUEVA: Función helper para extraer artista del track
  function extractTrackArtist(trackTitle) {
    // Esta función puede ser implementada para extraer el artista del track
    // Por ahora retornamos null para usar la lógica existente
    return null;
  }

  // NUEVA: Función helper para comparar similitud de artistas
  function isSimilarArtist(artist1, artist2) {
    if (!artist1 || !artist2) return false;
    
    const clean1 = artist1.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const clean2 = artist2.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    return clean1.includes(clean2) || clean2.includes(clean1) || 
           clean1.split(' ').some(word => clean2.includes(word)) ||
           clean2.split(' ').some(word => clean1.includes(word));
  }

  // Función para verificar similitud de títulos
  function isSimilarTitle(title1, title2) {
    if (!title1 || !title2) return false;
    
    const clean1 = title1.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const clean2 = title2.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    return clean1.includes(clean2) || clean2.includes(clean1) || 
           clean1.split(' ').some(word => clean2.includes(word)) ||
           clean2.split(' ').some(word => clean1.includes(word));
  }

  // Función para cerrar el modal de audio
  async function closeAudioModal(modal) {
    return new Promise((resolve) => {
      console.log('=== INICIANDO CIERRE DE MODAL DE AUDIO ===');
      
      // NUEVO: Verificar que el modal sea válido
      if (!modal || !modal.nodeType) {
        console.warn('Modal inválido proporcionado a closeAudioModal');
        resolve();
        return;
      }
      
      // NUEVO: Buscar botón de cierre con múltiples selectores mejorados
      const closeButtonSelectors = [
        '.close', 
        '.btn-close', 
        '[data-dismiss="modal"]', 
        '[data-bs-dismiss="modal"]', 
        'button[aria-label*="Close"]', 
        'button[aria-label*="Cerrar"]', 
        '.modal-header button', 
        '.modal-footer button',
        'button[class*="close"]',
        'button[title*="close"]',
        'button[title*="cerrar"]',
        '.modal-header .btn',
        '.modal-footer .btn'
      ];
      
      let closeButton = null;
      for (const selector of closeButtonSelectors) {
        closeButton = modal.querySelector(selector);
        if (closeButton) break;
      }
      
      // NUEVO: Si no se encuentra botón de cierre, buscar en todo el modal
      if (!closeButton) {
        const allButtons = modal.querySelectorAll('button');
        for (const button of allButtons) {
          const buttonText = button.textContent.toLowerCase();
          const buttonTitle = button.title?.toLowerCase() || '';
          const buttonAriaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          const buttonClasses = button.className.toLowerCase();
          
          if (buttonText.includes('close') || buttonText.includes('cerrar') || buttonText.includes('×') ||
              buttonTitle.includes('close') || buttonTitle.includes('cerrar') ||
              buttonAriaLabel.includes('close') || buttonAriaLabel.includes('cerrar') ||
              buttonClasses.includes('close')) {
            closeButton = button;
            break;
          }
        }
      }
      
      if (closeButton) {
        console.log('Botón de cierre encontrado:', closeButton.outerHTML);
        
        // NUEVO: Intentar múltiples métodos de cierre para mayor confiabilidad
        const closeMethods = [
          () => closeButton.click(),
          () => {
            if (closeButton.hasAttribute('data-bs-dismiss')) {
              const bootstrapEvent = new Event('click', { bubbles: true, cancelable: true });
              closeButton.dispatchEvent(bootstrapEvent);
            }
          },
          () => {
            // Simular eventos de mouse completos
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
              closeButton.dispatchEvent(new MouseEvent(eventType, { 
                bubbles: true, 
                cancelable: true,
                view: window,
                detail: 1
              }));
            });
          },
          () => {
            // Simular eventos de teclado
            closeButton.focus();
            closeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            closeButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
          }
        ];
        
        // Ejecutar todos los métodos de cierre
        closeMethods.forEach((method, index) => {
          try {
            method();
          } catch (error) {
            console.log(`Error con método de cierre ${index + 1}:`, error);
          }
        });
        
      } else {
        console.log('No se encontró botón de cierre, usando Escape key');
        // NUEVO: Intentar múltiples métodos de cierre con Escape
        const escapeMethods = [
          () => modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
          () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
          () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        ];
        
        escapeMethods.forEach((method, index) => {
          try {
            method();
          } catch (error) {
            console.log(`Error con método Escape ${index + 1}:`, error);
          }
        });
      }
      
      // NUEVO: Esperar a que el modal se cierre y verificar con mejor lógica
      const checkModalClosed = () => {
        // NUEVO: Múltiples métodos de verificación de cierre
        const modalSelectors = [
          '.modal.show',
          '.modal[style*="display: block"]',
          '.modal[style*="display:block"]',
          '.modal:not([style*="display: none"])'
        ];
        
        let modalStillVisible = null;
        for (const selector of modalSelectors) {
          modalStillVisible = document.querySelector(selector);
          if (modalStillVisible) break;
        }
        
        if (!modalStillVisible) {
          console.log('Modal cerrado exitosamente');
          resolve();
        } else {
          console.log('Modal aún visible, intentando cerrar nuevamente...');
          
          // NUEVO: Intentar cerrar nuevamente con métodos más agresivos
          if (closeButton) {
            closeButton.click();
          } else {
            // Intentar con Escape nuevamente
            modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          
          // NUEVO: Forzar cierre manual si aún está visible después de 1 segundo
          setTimeout(() => {
            const stillVisible = document.querySelector('.modal.show, .modal[style*="display: block"], .modal[style*="display:block"]');
            if (stillVisible) {
              console.log('Forzando cierre manual del modal');
              
              // NUEVO: Método más agresivo y completo de cierre
              try {
                // Remover clases y estilos
                stillVisible.classList.remove('show', 'fade', 'in');
                stillVisible.style.display = 'none';
                stillVisible.style.opacity = '0';
                stillVisible.style.visibility = 'hidden';
                stillVisible.setAttribute('aria-hidden', 'true');
                stillVisible.setAttribute('data-backdrop', 'false');
                
                // Limpiar body completamente
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                document.body.style.position = '';
                
                // Remover todos los backdrops
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                  backdrop.remove();
                });
                
                // Remover estilos inline que puedan estar causando problemas
                stillVisible.removeAttribute('style');
                
                // Quitar focus del modal
                if (document.activeElement && stillVisible.contains(document.activeElement)) {
                  document.activeElement.blur();
                }
                
                // NUEVO: Disparar evento personalizado para notificar que el modal se cerró
                stillVisible.dispatchEvent(new CustomEvent('modalClosed', { bubbles: true }));
                
                console.log('Cierre manual del modal completado');
              } catch (error) {
                console.warn('Error durante cierre manual del modal:', error);
              }
            }
            resolve();
          }, 800);
        }
      };
      
      // NUEVO: Reducir el tiempo de espera inicial para mejor respuesta
      setTimeout(checkModalClosed, 200);
    });
  }

  // NUEVO: Función para limpiar modales bloqueantes
  async function cleanupStuckModals() {
    console.log('QC Copilot: Checking for stuck modals...');
    
    // SOLO limpiar modales de audio analysis, NO todos los modales
    const stuckModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"], .modal[class*="audio-analysis"]');
    if (stuckModals.length === 0) {
      console.log('QC Copilot: No stuck audio analysis modals found');
      return;
    }
    
    console.log(`QC Copilot: Found ${stuckModals.length} potentially stuck audio analysis modals, attempting cleanup...`);
    
    for (const modal of stuckModals) {
      try {
        console.log('QC Copilot: Cleaning up audio analysis modal:', modal.id || 'unknown');
        await closeAudioModalUltraFast(modal); // Usar la versión ultra rápida
      } catch (error) {
        console.warn('QC Copilot: Error cleaning up audio analysis modal:', error);
      }
    }
    
    // OPTIMIZADO: Espera reducida para mejor respuesta
    await new Promise(resolve => setTimeout(resolve, 50)); // ULTRA-OPTIMIZADO: Reducido de 200ms a 50ms
    console.log('QC Copilot: Audio analysis modal cleanup completed');
  }

  // === INICIALIZACIÓN DE DETECTORES DE BOTONES ===
  // Configurar detectores inmediatamente
  setupActionButtonDetectors();
  
  // También configurar detectores periódicamente para botones que aparezcan dinámicamente
  setInterval(() => {
    setupActionButtonDetectors();
  }, 2000);
  
  console.log('QC Copilot: Action button detectors initialized');
  
  // NUEVO: Inicializar sistema de detección de cierre de modal
  setupModalCloseDetection();
  
  // NUEVO: Inicializar estado del análisis de audio
  audioAnalysisEnabled = isAudioAnalysisEnabled();
  console.log(`QC Copilot: Audio analysis initialized - enabled: ${audioAnalysisEnabled}`);
  
  // NUEVO: Verificar modales importantes al inicio
  checkImportantModals();
  console.log(`QC Copilot: Important modals check completed - open: ${importantModalsOpen}`);

  // NUEVO: Función para verificar si el modal de audio analysis está accesible
  function isAudioAnalysisModalAccessible() {
    // OPTIMIZADO: Verificación más rápida y específica
    const blockingAudioModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"].show, [id^="revision-audio-analysis-modal-"][style*="display: block"]');
    if (blockingAudioModals.length > 0) {
      return false;
    }
    
    // Verificar que el body no tenga estilos que bloqueen modales
    const bodyStyle = window.getComputedStyle(document.body);
    if (bodyStyle.overflow === 'hidden' && !bodyStyle.position) {
      return false;
    }
    
    // OPTIMIZADO: Solo verificar backdrops de audio analysis
    const activeAudioBackdrops = document.querySelectorAll('[id^="revision-audio-analysis-modal-"] + .modal-backdrop, .modal-backdrop[data-bs-target*="audio-analysis"]');
    if (activeAudioBackdrops.length > 0) {
      return false;
    }
    
    return true;
  }

  // NUEVO: Función para extraer información del track después de cerrar el modal
  // cuando el DOM esté más estable
  async function extractTrackInfoAfterModalClose(trackIndex, trackTitle, modalData) {
    console.log(`Extrayendo información del track ${trackIndex + 1} después de cerrar el modal...`);
    
    // Esperar un poco para que el DOM se estabilice
    await new Promise(resolve => setTimeout(resolve, 100)); // OPTIMIZADO: Reducido de 500ms a 100ms
    
    let trackArtist = modalData.trackArtist || '—';
    let trackAlbum = modalData.trackAlbum || '—';
    let realTrackTitle = trackTitle;
    
    try {
      // NUEVO: Obtener el título real del track si no lo tenemos
      if (!realTrackTitle || realTrackTitle.startsWith('Track ')) {
        const titleElement = document.querySelector(`#track-${trackIndex}-info h5.font-extra-bold.fs-5`);
        if (titleElement) {
          realTrackTitle = titleElement.textContent.trim();
          console.log(`Track title real extraído después del modal: "${realTrackTitle}"`);
        }
      }
      // Intentar extraer artista del track usando el selector CSS específico
      const artistSelector = `#track-${trackIndex}-info > div > div.player-track-meta > p:nth-child(2) > span`;
      const artistElement = document.querySelector(artistSelector);
      if (artistElement) {
        trackArtist = artistElement.textContent.trim();
        console.log(`Track artist extraído después del modal:`, trackArtist);
      } else {
        console.warn(`No se encontró elemento artista después del modal con selector: ${artistSelector}`);
      }
      
      // Intentar extraer álbum del título principal de la página
      const albumSelector = 'body > main > section > div.row.row-cols-2.gx-1 > div:nth-child(1) > div > div > div.container.gy-1.pb-3.d-flex.flex-row > div:nth-child(2) > div:nth-child(1) > div.col-10 > h2';
      const albumElement = document.querySelector(albumSelector);
      if (albumElement) {
        trackAlbum = albumElement.textContent.trim();
        console.log(`Track album extraído después del modal:`, trackAlbum);
      } else {
        console.warn(`No se encontró elemento álbum después del modal con selector: ${albumSelector}`);
      }
    } catch (error) {
      console.warn('Error extrayendo información del track después del modal:', error);
    }
    
    // Retornar los datos actualizados
    return {
      ...modalData,
      trackTitle: realTrackTitle, // NUEVO: Usar el título real
      trackArtist: trackArtist,
      trackAlbum: trackAlbum
    };
  }

  // NUEVO: Función para limpiar modales bloqueantes
  async function cleanupAfterAudioAnalysis() {
    console.log('QC Copilot: Cleaning up after audio analysis...');
    
    // OPTIMIZADO: Espera reducida para mejor respuesta
    await new Promise(resolve => setTimeout(resolve, 50)); // ULTRA-OPTIMIZADO: Reducido de 200ms a 50ms
    
    // Verificar si hay modales de audio analysis que no se cerraron correctamente
    const stuckAudioModals = document.querySelectorAll('[id^="revision-audio-analysis-modal-"]');
    if (stuckAudioModals.length > 0) {
      console.log(`QC Copilot: Found ${stuckAudioModals.length} stuck audio analysis modals, cleaning up...`);
      
      for (const modal of stuckAudioModals) {
        try {
          await closeAudioModalUltraFast(modal); // Usar la versión ultra rápida con detección
        } catch (error) {
          console.warn('QC Copilot: Error cleaning up stuck audio modal:', error);
        }
      }
    }
    
    // OPTIMIZADO: Limpieza rápida de backdrops
    const activeBackdrops = document.querySelectorAll('.modal-backdrop');
    if (activeBackdrops.length > 0) {
      console.log(`QC Copilot: Found ${activeBackdrops.length} active backdrops, removing...`);
      
      activeBackdrops.forEach(backdrop => {
        try {
          backdrop.remove();
        } catch (error) {
          console.warn('QC Copilot: Error removing backdrop:', error);
        }
      });
    }
    
    // Restaurar el scroll del body si fue modificado
    if (document.body.style.overflow === 'hidden') {
      console.log('QC Copilot: Restoring body overflow');
      document.body.style.overflow = '';
    }
    
    console.log('QC Copilot: Cleanup after audio analysis completed');
  }

  // NUEVO: Función ULTRA RÁPIDA para análisis de audio de un track
  async function analyzeTrackAudioUltraFast(trackIndex, trackTitle, abortSignal) {
    console.log(`QC Copilot: Starting ULTRA FAST analysis for track ${trackIndex + 1} (${trackTitle})`);
    
    try {
      // NUEVO: Verificar aborto antes de empezar
      if (abortSignal?.aborted) {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted before starting`);
        return null;
      }
      
      // NUEVO: Buscar botón de alerta SIN delays
      const alertButton = await findAlertButtonUltraFast(trackIndex);
      if (!alertButton) {
        console.warn(`QC Copilot: No alert button found for track ${trackIndex + 1}`);
        return null;
      }
      
      // NUEVO: Verificar aborto antes del click
      if (abortSignal?.aborted) {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted before clicking button`);
        return null;
      }
      
      // NUEVO: Click inmediato SIN esperar
      console.log(`QC Copilot: Clicking alert button for track ${trackIndex + 1} immediately`);
      alertButton.click();
      
      // NUEVO: Esperar modal con timeout mínimo y verificación de aborto
      const modalId = `revision-audio-analysis-modal-${trackIndex}`;
      const modal = await waitForModalUltraFast(modalId, 1000, abortSignal); // NUEVO: Pasar abortSignal
      
      if (!modal) {
        console.warn(`QC Copilot: Modal not found for track ${trackIndex + 1} after timeout or abort`);
        return null;
      }
      
      // NUEVO: Verificar aborto antes de extraer datos
      if (abortSignal?.aborted) {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted before data extraction`);
        return null;
      }
      
      // NUEVO: Extraer datos SIN delays
      console.log(`QC Copilot: Extracting data from modal for track ${trackIndex + 1}`);
      const audioData = await extractAudioAnalysisDataUltraFast(modal, trackIndex);
      
      // NUEVO: Verificar aborto antes de cerrar modal
      if (abortSignal?.aborted) {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted before modal close`);
        return null;
      }
      
      // NUEVO: Cerrar modal inmediatamente
      console.log(`QC Copilot: Closing modal for track ${trackIndex + 1} immediately`);
      await closeAudioModalUltraFast(modal, modalId);
      
      // NUEVO: Verificar aborto antes de extraer info del track
      if (abortSignal?.aborted) {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted before track info extraction`);
        return null;
      }
      
      // NUEVO: Extraer info del track SIN delays
      console.log(`QC Copilot: Extracting track info for track ${trackIndex + 1}`);
      const trackInfo = await extractTrackInfoUltraFast(trackIndex);
      
      // NUEVO: Combinar resultados
      const result = {
        trackIndex,
        trackTitle,
        audioData,
        trackInfo,
        timestamp: Date.now()
      };
      
      console.log(`QC Copilot: ULTRA FAST analysis completed for track ${trackIndex + 1}:`, result);
      return result;
      
    } catch (error) {
      // NUEVO: Verificar si el error es por aborto
      if (error.name === 'AbortError') {
        console.log(`QC Copilot: Track ${trackIndex + 1} analysis aborted during processing`);
        return null;
      }
      console.error(`QC Copilot: Error in ULTRA FAST analysis for track ${trackIndex + 1}:`, error);
      return null;
    }
  }

  // NUEVO: Función ultra rápida para encontrar botón de alerta
  function findAlertButtonUltraFast(trackIndex) {
    // OPTIMIZADO: Selectores más específicos y directos
    const alertButtonSelectors = [
      `#track-${trackIndex}-info .alert-button`,
      `#track-${trackIndex}-info .btn-alert`,
      `#track-${trackIndex}-info button[title*="alert"]`,
      `#track-${trackIndex}-info button.alert`,
      `#track-${trackIndex}-info button.alert-warning`,
      `#track-${trackIndex}-info button.btn-warning`
    ];
    
    for (const selector of alertButtonSelectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    
    // Fallback rápido: buscar en el contenedor del track
    const trackElement = document.querySelector(`#track-${trackIndex}-info`);
    if (trackElement) {
      const button = trackElement.querySelector('button.alert, button.alert-warning, button.btn-warning');
      if (button) return button;
    }
    
    return null;
  }

  // NUEVO: Función ultra rápida para extraer datos del modal sin delays
  async function extractAudioAnalysisDataUltraFast(modal, trackIndex) {
    console.log(`QC Copilot: Extracting audio data ultra fast from modal for track ${trackIndex + 1}`);
    
    try {
      // NUEVO: Extracción inmediata sin delays
      const trackArtist = modal.querySelector('.modal-title, .modal-header h5, h5')?.textContent?.trim() || '';
      const trackAlbum = document.querySelector('h1, .release-title, .album-title')?.textContent?.trim() || '';
      
      console.log(`QC Copilot: Track ${trackIndex + 1} - Artist: "${trackArtist}", Album: "${trackAlbum}"`);
      
      // NUEVO: Buscar tablas de resultados inmediatamente
      const resultTables = modal.querySelectorAll('table, .table, [class*="table"]');
      console.log(`QC Copilot: Found ${resultTables.length} result tables for track ${trackIndex + 1}`);
      
      const results = [];
      let uniqueResults = new Set();
      
      // NUEVO: Procesar tablas en paralelo sin delays
      const tablePromises = Array.from(resultTables).map(async (table, tableIndex) => {
        try {
          const tableResults = await processResultTableUltraFast(table, tableIndex + 1, trackIndex);
          return tableResults;
        } catch (error) {
          console.error(`QC Copilot: Error processing table ${tableIndex + 1} for track ${trackIndex + 1}:`, error);
          return [];
        }
      });
      
      // NUEVO: Esperar todas las tablas simultáneamente
      const allTableResults = await Promise.all(tablePromises);
      
      // NUEVO: Combinar resultados y eliminar duplicados
      allTableResults.forEach(tableResults => {
        tableResults.forEach(result => {
          const resultKey = `${result.title}-${result.artist}-${result.score}`;
          if (!uniqueResults.has(resultKey)) {
            uniqueResults.add(resultKey);
            results.push(result);
          }
        });
      });
      
      console.log(`QC Copilot: Track ${trackIndex + 1} - Total results: ${results.length}, Unique: ${results.length}`);
      
      return {
        trackArtist,
        trackAlbum,
        results,
        totalResults: results.length,
        uniqueResults: results.length
      };
      
    } catch (error) {
      console.error(`QC Copilot: Error extracting audio data for track ${trackIndex + 1}:`, error);
      return {
        trackArtist: '',
        trackAlbum: '',
        results: [],
        totalResults: 0,
        uniqueResults: 0
      };
    }
  }

  // NUEVO: Función ultra rápida para cerrar modal
  async function closeAudioModalUltraFast(modal) {
    if (!modal) return;
    
    try {
      const modalId = modal.id || 'unknown';
      console.log(`QC Copilot: Closing modal ${modalId} ultra fast`);
      
      // OPTIMIZADO: Cierre inmediato sin verificaciones innecesarias
      const closeButton = modal.querySelector('.close, .btn-close, [data-dismiss="modal"], [data-bs-dismiss="modal"]');
      if (closeButton) {
        closeButton.click();
      } else {
        // Cierre forzado
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
      }
      
      // NUEVO: Esperar a que el modal se cierre usando el sistema de detección
      try {
        await waitForModalClose(modalId, 3000); // Timeout reducido a 3 segundos
        console.log(`QC Copilot: Modal ${modalId} closed successfully`);
      } catch (error) {
        console.warn(`QC Copilot: Timeout waiting for modal ${modalId} to close, continuing...`);
        // Continuar de todas formas para no bloquear el proceso
      }
      
    } catch (error) {
      console.warn('QC Copilot: Error in ultra fast modal close:', error);
      // Cierre forzado en caso de error
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  }

  // NUEVO: Función ultra rápida para extraer información del track
  async function extractTrackInfoUltraFast(trackIndex, trackTitle, modalData) {
    // OPTIMIZADO: Sin esperas innecesarias
    let trackArtist = modalData.trackArtist || '—';
    let trackAlbum = modalData.trackAlbum || '—';
    let realTrackTitle = trackTitle;
    
    try {
      if (!realTrackTitle || realTrackTitle.startsWith('Track ')) {
        const titleElement = document.querySelector(`#track-${trackIndex}-info h5.font-extra-bold.fs-5`);
        if (titleElement) {
          realTrackTitle = titleElement.textContent.trim();
        }
      }
      
      const artistSelector = `#track-${trackIndex}-info > div > div.player-track-meta > p:nth-child(2) > span`;
      const artistElement = document.querySelector(artistSelector);
      if (artistElement) {
        trackArtist = artistElement.textContent.trim();
      }
      
      const albumSelector = 'body > main > section > div.row.row-cols-2.gx-1 > div:nth-child(1) > div > div > div.container.gy-1.pb-3.d-flex.flex-row > div:nth-child(2) > div:nth-child(1) > div.col-10 > h2';
      const albumElement = document.querySelector(albumSelector);
      if (albumElement) {
        trackAlbum = albumElement.textContent.trim();
      }
    } catch (error) {
      console.warn('Error en extracción rápida después del modal:', error);
    }
    
    return {
      ...modalData,
      trackTitle: realTrackTitle,
      trackArtist: trackArtist,
      trackAlbum: trackAlbum
    };
  }

  // NUEVO: Función para detectar cuando un modal se cierra
  function setupModalCloseDetection() {
    if (modalCloseObserver) {
      modalCloseObserver.disconnect();
    }
    
    modalCloseObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            // Detectar si se removió un modal
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.classList?.contains('modal') || node.id?.includes('audio-analysis'))) {
              console.log('QC Copilot: Modal detected as closed/removed');
              pendingModalClose = false;
              
              // Notificar que el modal está cerrado
              window.dispatchEvent(new CustomEvent('modalClosed', { 
                detail: { modalId: node.id || 'unknown' } 
              }));
            }
          });
        }
      });
    });
    
    modalCloseObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('QC Copilot: Modal close detection setup completed');
  }
  
  // NUEVO: Función para esperar a que un modal se cierre
  function waitForModalClose(modalId, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout waiting for modal ${modalId} to close`));
      }, timeout);
      
      const handleModalClose = (event) => {
        if (event.detail.modalId === modalId || event.detail.modalId === 'unknown') {
          clearTimeout(timeoutId);
          window.removeEventListener('modalClosed', handleModalClose);
          resolve();
        }
      };
      
      window.addEventListener('modalClosed', handleModalClose);
    });
  }

  // NUEVO: Función para control inmediato del análisis de audio
  function handleAudioAnalysisControl(data) {
    console.log(`QC Copilot: Audio analysis control received:`, data);
    
    // NUEVO: Manejar diferentes tipos de mensajes
    if (data.action === 'startOptimized') {
      // NUEVO: Iniciar análisis optimizado con tracks específicos
      console.log('QC Copilot: Starting optimized audio analysis with specific tracks');
      
      if (data.tracks && data.tracks.length > 0) {
        // NUEVO: Convertir tracks del drawer al formato del content.js
        const normalizedTracks = data.tracks.map((track, index) => ({
          trackIndex: track.trackIndex || index,
          header: track.title || track.trackTitle || `Track ${index + 1}`,
          hasAlert: true // Ya filtrados por el drawer
        }));
        
        console.log('QC Copilot: Normalized tracks:', normalizedTracks);
        
        // NUEVO: Iniciar análisis paralelo masivo con los tracks específicos
        if (!importantModalsOpen && !audioAnalysisInProgress) {
          performMassiveParallelAudioAnalysis(normalizedTracks);
        } else {
          console.log('QC Copilot: Cannot start analysis - modals open or already in progress');
        }
      }
      return;
    }
    
    // NUEVO: Manejar toggle simple (enabled/disabled)
    const enabled = data.enabled;
    console.log(`QC Copilot: Audio analysis toggle control - enabled: ${enabled}`);
    
    if (enabled) {
      // NUEVO: Habilitar análisis de audio
      audioAnalysisEnabled = true;
      console.log('QC Copilot: Audio analysis enabled via control');
      
      // NUEVO: Iniciar análisis paralelo masivo si hay tracks disponibles y no hay modales importantes
      if (!importantModalsOpen && !audioAnalysisInProgress) {
        console.log('QC Copilot: Starting MASSIVE PARALLEL audio analysis after enable control');
        // Buscar tracks con alertas y iniciar análisis paralelo
        const trackInfoDivs = document.querySelectorAll('[id^="track-"][id$="-info"]');
        if (trackInfoDivs.length > 0) {
          const tracksWithAlerts = trackInfoDivs
            .map((trackDiv, index) => {
              const trackTitle = trackDiv.querySelector('h5.font-extra-bold.fs-5')?.textContent?.trim() || `Track ${index + 1}`;
              const hasAlert = trackDiv.querySelector('button.alert, button.alert-warning, button.btn-warning, button[class*="alert"], button[class*="warning"]');
              
              return {
                trackIndex: index,
                header: trackTitle,
                hasAlert: !!hasAlert
              };
            })
            .filter(track => track.hasAlert);
          
          if (tracksWithAlerts.length > 0) {
            console.log(`QC Copilot: Found ${tracksWithAlerts.length} tracks with alerts, starting MASSIVE PARALLEL analysis`);
            // NUEVO: Usar análisis paralelo masivo en lugar del secuencial
            performMassiveParallelAudioAnalysis(tracksWithAlerts);
          }
        }
      }
    } else {
      // NUEVO: Deshabilitar análisis de audio INMEDIATAMENTE usando la función de fuerza
      console.log('QC Copilot: Audio analysis disabled via control - force stopping immediately');
      forceStopAudioAnalysis();
      
      // NUEVO: Notificar al drawer que el análisis se detuvo
      const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          tipo: 'audioAnalysisStopped',
          reason: 'User disabled via toggle'
        }, '*');
      }
    }
  }

  // Clean mode is always active - function removed

  // NUEVO: Función ULTRA OPTIMIZADA para análisis paralelo masivo de audio
  async function performMassiveParallelAudioAnalysis(tracksWithAlerts) {
    console.log('QC Copilot: performMassiveParallelAudioAnalysis called with tracks:', tracksWithAlerts);
    
    // NUEVO: Verificar estado ANTES de empezar
    if (!audioAnalysisEnabled) {
      console.log('QC Copilot: Audio analysis disabled, skipping');
      return [];
    }
    
    if (importantModalsOpen) {
      console.log('QC Copilot: Important modals open, skipping audio analysis');
      return [];
    }
    
    if (audioAnalysisInProgress) {
      console.log('QC Copilot: Audio analysis already in progress, skipping');
      return audioAnalysisResults;
    }
    
    // NUEVO: Crear AbortController para cancelar operaciones
    audioAnalysisAbortController = new AbortController();
    audioAnalysisInProgress = true;
    audioAnalysisResults = [];
    
    console.log(`QC Copilot: Starting MASSIVE PARALLEL audio analysis for ${tracksWithAlerts.length} tracks`);
    
    try {
      // NUEVO: Procesar TODOS los tracks en paralelo simultáneamente
      const parallelPromises = tracksWithAlerts.map(async (track, index) => {
        // NUEVO: Verificar en cada track si el análisis fue deshabilitado
        if (!audioAnalysisEnabled || audioAnalysisAbortController?.signal.aborted) {
          console.log(`QC Copilot: Audio analysis disabled/aborted during parallel processing of track ${index + 1}, skipping`);
          return null;
        }
        
        console.log(`QC Copilot: Starting parallel analysis for track ${index + 1}/${tracksWithAlerts.length}:`, track);
        
        try {
          // NUEVO: Obtener el título real del track
          const realTrackTitle = track.header && !track.header.startsWith('Track ') ? track.header : 
            document.querySelector(`#track-${track.trackIndex}-info h5.font-extra-bold.fs-5`)?.textContent?.trim() || track.header;
          
          console.log(`QC Copilot: Parallel analysis for track ${index + 1} using title: "${realTrackTitle}"`);
          
          // NUEVO: Análisis ultra rápido en paralelo con verificación de aborto
          const result = await analyzeTrackAudioUltraFast(track.trackIndex, realTrackTitle, audioAnalysisAbortController.signal);
          
          // NUEVO: Verificar si fue abortado durante el análisis
          if (audioAnalysisAbortController?.signal.aborted) {
            console.log(`QC Copilot: Track ${index + 1} analysis aborted during processing`);
            return null;
          }
          
          if (result) {
            console.log(`QC Copilot: Track ${index + 1} parallel analysis completed:`, result);
            return result;
          } else {
            console.warn(`QC Copilot: Track ${index + 1} parallel analysis returned no result`);
            return null;
          }
          
        } catch (error) {
          // NUEVO: Verificar si el error es por aborto
          if (error.name === 'AbortError') {
            console.log(`QC Copilot: Track ${index + 1} analysis aborted`);
            return null;
          }
          console.error(`QC Copilot: Error in parallel analysis for track ${index + 1}:`, error);
          return null;
        }
      });
      
      // NUEVO: Esperar a que TODOS los tracks terminen en paralelo con verificación de aborto
      console.log(`QC Copilot: Waiting for ${parallelPromises.length} parallel tracks to complete...`);
      
      // NUEVO: Usar Promise.race para detectar aborto
      const abortPromise = new Promise((_, reject) => {
        audioAnalysisAbortController.signal.addEventListener('abort', () => {
          reject(new Error('Audio analysis aborted by user'));
        });
      });
      
      const results = await Promise.race([
        Promise.allSettled(parallelPromises),
        abortPromise
      ]);
      
      // NUEVO: Verificar si fue abortado
      if (audioAnalysisAbortController?.signal.aborted) {
        console.log('QC Copilot: Audio analysis aborted by user, stopping immediately');
        return [];
      }
      
      // NUEVO: Procesar resultados exitosos
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          audioAnalysisResults.push(result.value);
          console.log(`QC Copilot: Parallel track ${index + 1} result added:`, result.value);
        } else if (result.status === 'rejected') {
          console.error(`QC Copilot: Parallel track ${index + 1} failed:`, result.reason);
        }
      });
      
      console.log(`QC Copilot: MASSIVE PARALLEL audio analysis completed, ${audioAnalysisResults.length} successful results`);
      
      // NUEVO: Limpieza masiva después del análisis paralelo
      await cleanupAfterAudioAnalysis();
      
    } catch (error) {
      // NUEVO: Verificar si el error es por aborto
      if (error.message === 'Audio analysis aborted by user') {
        console.log('QC Copilot: Audio analysis aborted by user, cleaning up...');
      } else {
        console.error('QC Copilot: Error during MASSIVE PARALLEL audio analysis:', error);
      }
      await cleanupAfterAudioAnalysis();
    } finally {
      // NUEVO: Limpiar estado
      audioAnalysisInProgress = false;
      audioAnalysisAbortController = null;
      console.log('QC Copilot: Parallel audio analysis state reset');
    }
    
    return audioAnalysisResults;
  }

  // NUEVO: Función ultra rápida para esperar modal sin delays y con control de aborto
  async function waitForModalUltraFast(modalId, timeout = 1000, abortSignal) {
    console.log(`QC Copilot: Waiting for modal ${modalId} ultra fast (timeout: ${timeout}ms)`);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // NUEVO: Verificar aborto antes de empezar
      if (abortSignal?.aborted) {
        reject(new Error('Modal wait aborted'));
        return;
      }
      
      // NUEVO: Función de verificación sin delays
      const checkModal = () => {
        // NUEVO: Verificar aborto en cada iteración
        if (abortSignal?.aborted) {
          console.log(`QC Copilot: Modal ${modalId} wait aborted`);
          reject(new Error('Modal wait aborted'));
          return;
        }
        
        const modal = document.getElementById(modalId);
        
        if (modal) {
          const style = window.getComputedStyle(modal);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            console.log(`QC Copilot: Modal ${modalId} found and visible in ${Date.now() - startTime}ms`);
            resolve(modal);
            return;
          }
        }
        
        // NUEVO: Verificar timeout
        if (Date.now() - startTime >= timeout) {
          console.warn(`QC Copilot: Modal ${modalId} timeout after ${timeout}ms`);
          resolve(null);
          return;
        }
        
        // NUEVO: Verificación cada 50ms (reducido de 100ms a 50ms)
        setTimeout(checkModal, 50);
      };
      
      // NUEVO: Iniciar verificación inmediatamente
      checkModal();
    });
  }

  // NUEVO: Función ultra rápida para procesar tablas de resultados
  async function processResultTableUltraFast(table, tableIndex, trackIndex) {
    console.log(`QC Copilot: Processing result table ${tableIndex} for track ${trackIndex + 1}`);
    
    try {
      const rows = table.querySelectorAll('tbody > tr, tr');
      const results = [];
      
      // NUEVO: Procesar filas en paralelo
      const rowPromises = Array.from(rows).map(async (row, rowIndex) => {
        try {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) return null;
          
          const label = cells[0]?.textContent?.trim() || '';
          const value = cells[1]?.textContent?.trim() || '';
          
          // NUEVO: Extracción rápida de datos
          if (label.toLowerCase().includes('artist') || label.toLowerCase().includes('artista')) {
            return { type: 'artist', value };
          } else if (label.toLowerCase().includes('title') || label.toLowerCase().includes('título')) {
            return { type: 'title', value };
          } else if (label.toLowerCase().includes('album') || label.toLowerCase().includes('álbum')) {
            return { type: 'album', value };
          } else if (label.toLowerCase().includes('score') || label.toLowerCase().includes('puntuación')) {
            return { type: 'score', value: parseFloat(value) || 0 };
          }
          
          return null;
        } catch (error) {
          console.warn(`QC Copilot: Error processing row ${rowIndex + 1} in table ${tableIndex}:`, error);
          return null;
        }
      });
      
      // NUEVO: Esperar todas las filas
      const rowResults = await Promise.all(rowPromises);
      
      // NUEVO: Construir resultado
      const result = {
        tableIndex,
        title: '',
        artist: '',
        album: '',
        score: 0
      };
      
      rowResults.forEach(rowResult => {
        if (rowResult) {
          if (rowResult.type === 'title') result.title = rowResult.value;
          else if (rowResult.type === 'artist') result.artist = rowResult.value;
          else if (rowResult.type === 'album') result.album = rowResult.value;
          else if (rowResult.type === 'score') result.score = rowResult.value;
        }
      });
      
      // NUEVO: Solo agregar si tiene datos válidos
      if (result.title || result.artist) {
        results.push(result);
        console.log(`QC Copilot: Table ${tableIndex} result added:`, result);
      }
      
      return results;
      
    } catch (error) {
      console.error(`QC Copilot: Error processing table ${tableIndex}:`, error);
      return [];
    }
  }

  // =====================================================
  // ACTION BUTTON CONFIRMATION SYSTEM
  // =====================================================

  // Store current QC flags received from drawer
  let qcCurrentFlags = null;
  let qcSupportLevel = null;

  // Listen for flags updates from drawer
  window.addEventListener('message', (event) => {
    if (event.data && event.data.tipo === 'qcFlagsUpdate') {
      qcCurrentFlags = event.data.flags || {};
      console.log('QC Copilot: Received flags update:', qcCurrentFlags);
    }
  });

  // Function to get support level from DOM
  function getSupportLevelFromDOM() {
    // Look for the support level text in the Client section
    // The element is: <p class="m-0 text-muted fs-6">Premium</p> or <p class="m-0 text-muted fs-6">Standard</p>
    const supportLevelElements = document.querySelectorAll('p.m-0.text-muted.fs-6');
    for (const el of supportLevelElements) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'premium' || text === 'standard') {
        console.log('QC Copilot: Detected support level:', text);
        return text;
      }
    }
    // Fallback: check if any parent contains "Support Level" label
    const allLabels = document.querySelectorAll('dt, label, th');
    for (const label of allLabels) {
      if ((label.textContent || '').toLowerCase().includes('support level')) {
        const valueEl = label.nextElementSibling || label.parentElement?.querySelector('dd, td, p');
        if (valueEl) {
          const text = (valueEl.textContent || '').trim().toLowerCase();
          if (text === 'premium' || text === 'standard') {
            console.log('QC Copilot: Detected support level from label:', text);
            return text;
          }
        }
      }
    }
    console.log('QC Copilot: Support level not found, defaulting to standard');
    return 'standard'; // Default to standard for safety
  }

  // Function to request current flags from drawer
  function requestCurrentFlags() {
    const iframe = document.getElementById('qc-copilot-sidebar')?.querySelector('iframe#qc-sidebar-iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ tipo: 'requestFlags' }, '*');
    }
  }

  // Function to check if there are critical alerts that need confirmation for approve
  function hasCriticalAlertsForApprove() {
    if (!qcCurrentFlags) return { hasCritical: false, alerts: [] };

    const alerts = [];

    if (qcCurrentFlags.curatedArtists && qcCurrentFlags.curatedArtists.length > 0) {
      alerts.push({
        type: 'curated artist',
        items: qcCurrentFlags.curatedArtists
      });
    }

    if (qcCurrentFlags.blacklistArtists && qcCurrentFlags.blacklistArtists.length > 0) {
      alerts.push({
        type: 'blacklisted artist',
        items: qcCurrentFlags.blacklistArtists
      });
    }

    if (qcCurrentFlags.blacklistLabels && qcCurrentFlags.blacklistLabels.length > 0) {
      alerts.push({
        type: 'blacklisted label',
        items: qcCurrentFlags.blacklistLabels
      });
    }

    if (qcCurrentFlags.blacklistEmails && qcCurrentFlags.blacklistEmails.length > 0) {
      alerts.push({
        type: 'blacklisted user',
        items: qcCurrentFlags.blacklistEmails
      });
    }

    return {
      hasCritical: alerts.length > 0,
      alerts: alerts
    };
  }

  // Function to show informational modal (non-blocking, just "Got it" button)
  function showQCInfoModal(title, message, headerColor = '#f59e0b') {
    // Remove any existing modal
    const existingModal = document.getElementById('qc-info-modal');
    if (existingModal) existingModal.remove();

    const gradientEnd = headerColor === '#f59e0b' ? '#d97706' : '#1d4ed8';

    // Create modal HTML
    const modalHtml = `
      <div id="qc-info-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 90%;
          overflow: hidden;
          animation: qcModalSlideIn 0.2s ease-out;
        ">
          <div style="
            background: linear-gradient(135deg, ${headerColor} 0%, ${gradientEnd} 100%);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span style="color: white; font-weight: 600; font-size: 16px;">${title}</span>
          </div>
          <div style="padding: 20px;">
            <p style="margin: 0 0 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
              ${message}
            </p>
            <div style="display: flex; justify-content: flex-end;">
              <button id="qc-modal-gotit" style="
                padding: 10px 24px;
                border: none;
                background: linear-gradient(135deg, ${headerColor} 0%, ${gradientEnd} 100%);
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: white;
                cursor: pointer;
                transition: all 0.15s ease;
              ">Got it</button>
            </div>
          </div>
        </div>
      </div>
      <style>
        @keyframes qcModalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        #qc-modal-gotit:hover {
          filter: brightness(1.1);
        }
      </style>
    `;

    // Insert modal into page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('qc-info-modal');
    const gotItBtn = document.getElementById('qc-modal-gotit');

    // Handle close
    const handleClose = () => {
      modal.remove();
    };

    gotItBtn.addEventListener('click', handleClose);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) handleClose();
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus the button
    gotItBtn.focus();
  }

  // Function to show Standard client info modal
  function showStandardClientInfoModal(actionName) {
    const message = `
      This client has <strong>Standard</strong> support level.<br><br>
      The "<strong>${actionName}</strong>" action is typically only available for Premium clients.
    `;
    showQCInfoModal('Standard Support Client', message, '#3b82f6');
  }

  // Function to show approve alerts info modal
  function showApproveAlertsInfoModal(alerts) {
    const alertMessages = alerts.map(alert => {
      const itemsList = alert.items.slice(0, 3).join(', ');
      const moreCount = alert.items.length > 3 ? ` and ${alert.items.length - 3} more` : '';
      return `• <strong>${alert.type}</strong>: ${itemsList}${moreCount}`;
    }).join('<br>');

    const message = `
      You are about to approve a release with the following alerts:<br><br>
      ${alertMessages}
    `;
    showQCInfoModal('Approval Notice', message, '#f59e0b');
  }

  // Setup button interceptors (informational only - does not block actions)
  function setupActionButtonInterceptors() {
    console.log('QC Copilot: Setting up action button interceptors...');

    // Request current flags from drawer
    requestCurrentFlags();

    // Button selectors
    const approveBtn = document.getElementById('button-revision-approve');
    const askModificationBtn = document.getElementById('button-revision-ask-modification');
    const askDocumentationBtn = document.getElementById('button-revision-ask-documentation');
    const rejectBtn = document.getElementById('button-revision-reject');

    // Track if we've already set up interceptors
    const INTERCEPTOR_ATTR = 'data-qc-interceptor-setup';

    // Approve button - show info modal if critical alerts (non-blocking)
    if (approveBtn && !approveBtn.hasAttribute(INTERCEPTOR_ATTR)) {
      approveBtn.setAttribute(INTERCEPTOR_ATTR, 'true');

      approveBtn.addEventListener('click', (e) => {
        // Request latest flags
        requestCurrentFlags();

        // Small delay to ensure flags are received
        setTimeout(() => {
          const { hasCritical, alerts } = hasCriticalAlertsForApprove();

          if (hasCritical) {
            console.log('QC Copilot: Critical alerts detected, showing info modal');
            showApproveAlertsInfoModal(alerts);
          }
        }, 50);

        // Don't prevent the action - just show info
      }, false); // Use bubble phase so action proceeds normally

      console.log('QC Copilot: Approve button interceptor set up (informational)');
    }

    // Ask for Modification button - show info modal for Standard clients (non-blocking)
    if (askModificationBtn && !askModificationBtn.hasAttribute(INTERCEPTOR_ATTR)) {
      askModificationBtn.setAttribute(INTERCEPTOR_ATTR, 'true');

      askModificationBtn.addEventListener('click', (e) => {
        const supportLevel = getSupportLevelFromDOM();

        if (supportLevel === 'standard') {
          console.log('QC Copilot: Standard client detected, showing info for Ask for Modification');
          showStandardClientInfoModal('Ask for Modification');
        }

        // Don't prevent the action - just show info
      }, false);

      console.log('QC Copilot: Ask for Modification button interceptor set up (informational)');
    }

    // Ask for Documentation button - show info modal for Standard clients (non-blocking)
    if (askDocumentationBtn && !askDocumentationBtn.hasAttribute(INTERCEPTOR_ATTR)) {
      askDocumentationBtn.setAttribute(INTERCEPTOR_ATTR, 'true');

      askDocumentationBtn.addEventListener('click', (e) => {
        const supportLevel = getSupportLevelFromDOM();

        if (supportLevel === 'standard') {
          console.log('QC Copilot: Standard client detected, showing info for Ask for Documentation');
          showStandardClientInfoModal('Ask for Documentation');
        }

        // Don't prevent the action - just show info
      }, false);

      console.log('QC Copilot: Ask for Documentation button interceptor set up');
    }

    // Reject button - no interceptor needed per requirements
    if (rejectBtn) {
      console.log('QC Copilot: Reject button found (no interceptor needed)');
    }
  }

  // Initialize button interceptors when DOM is ready and periodically check for buttons
  function initActionButtonInterceptors() {
    // Initial setup
    setupActionButtonInterceptors();

    // Also observe DOM for dynamically added buttons
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Check if any action buttons were added
          const hasActionButtons = document.getElementById('button-revision-approve') ||
                                   document.getElementById('button-revision-ask-modification') ||
                                   document.getElementById('button-revision-ask-documentation');
          if (hasActionButtons) {
            setupActionButtonInterceptors();
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('QC Copilot: Action button interceptor system initialized');
  }

  // Start initialization after a short delay to ensure page is ready
  setTimeout(initActionButtonInterceptors, 1000);

  // Also re-check when URL changes (SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(initActionButtonInterceptors, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
