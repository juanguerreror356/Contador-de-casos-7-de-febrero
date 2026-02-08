/******************************************************************************************
* background.js v2.4.1 — SERVICE WORKER ULTRA OPTIMIZADO
* 
* 🚀 CORRECCIONES CRÍTICAS:
* ✅ Mantiene conexión activa permanentemente
* ✅ Reconexión automática al abrir popup
* ✅ Heartbeat más agresivo (cada 20 segundos)
* ✅ Restauración de estado al despertar
* ✅ Previene desconexiones
******************************************************************************************/

// ========== CONFIGURACIÓN ==========
const CONFIG = {
  VERSION: '2.4.1',
  HEARTBEAT_INTERVAL: 20, // 🔥 Reducido a 20 segundos
  MIDNIGHT_CHECK_ALARM: 'midnight_check',
  BADGE_COLOR_DEFAULT: '#1DBA8E',
  TIMEZONE: 'America/Bogota',
  KEEPALIVE_INTERVAL: 25000 // 🆕 Keep-alive cada 25 segundos
};

// 🆕 Variable para mantener el service worker activo
let keepAliveInterval = null;

// ========== UTILIDADES ==========
function log(mensaje, datos = null, nivel = 'INFO') {
  const timestamp = new Date().toISOString();
  const emoji = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🔍'
  }[nivel] || 'ℹ️';
  
  console.log(`[${timestamp}] ${emoji} [Background] ${mensaje}`, datos || '');
}

// ========== BADGE ==========
async function updateBadge(total, color = CONFIG.BADGE_COLOR_DEFAULT) {
  try {
    const text = total > 0 ? total.toString() : '';
    
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    
    log('Badge actualizado', { total, color }, 'DEBUG');
  } catch (error) {
    log('Error actualizando badge', { error: error.message }, 'ERROR');
  }
}

async function restoreBadgeFromStorage() {
  try {
    const result = await chrome.storage.local.get(['caseCounterState']);
    
    if (result.caseCounterState) {
      const total = result.caseCounterState.counts?.total || 0;
      const color = result.caseCounterState.customColors?.primary || 
                    result.caseCounterState.customColor || 
                    CONFIG.BADGE_COLOR_DEFAULT;
      
      await updateBadge(total, color);
      log('Badge restaurado desde storage', { total, color }, 'SUCCESS');
    }
  } catch (error) {
    log('Error restaurando badge', { error: error.message }, 'ERROR');
  }
}

// 🆕 KEEP-ALIVE AGRESIVO
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(() => {
    // Mantener el service worker activo
    chrome.storage.local.get(['caseCounterState'], (result) => {
      if (result.caseCounterState) {
        log('Keep-alive ping', { 
          user: result.caseCounterState.user?.ldap || 'No autenticado',
          timestamp: new Date().toISOString()
        }, 'DEBUG');
      }
    });
  }, CONFIG.KEEPALIVE_INTERVAL);
  
  log('Keep-alive iniciado', { interval: `${CONFIG.KEEPALIVE_INTERVAL}ms` }, 'SUCCESS');
}

// ========== ALARMAS ==========
function setupHeartbeat() {
  chrome.alarms.create('heartbeat', {
    periodInMinutes: CONFIG.HEARTBEAT_INTERVAL / 60
  });
  
  log('Heartbeat configurado', { interval: `${CONFIG.HEARTBEAT_INTERVAL}s` }, 'SUCCESS');
}

function setupMidnightAlarm() {
  chrome.alarms.create(CONFIG.MIDNIGHT_CHECK_ALARM, {
    periodInMinutes: 1
  });
  
  log('Alarma de medianoche configurada', null, 'SUCCESS');
}

// ========== VERIFICACIÓN DE MEDIANOCHE ==========
async function checkMidnight() {
  try {
    const result = await chrome.storage.local.get(['caseCounterState']);
    
    if (!result.caseCounterState) return;
    
    const state = result.caseCounterState;
    const now = new Date();
    const lastCheck = state.lastMidnightCheck ? new Date(state.lastMidnightCheck) : null;
    
    if (!lastCheck || now.toDateString() !== lastCheck.toDateString()) {
      const wasToday = lastCheck && now.toDateString() === lastCheck.toDateString();
      
      if (!wasToday && lastCheck) {
        log('Nuevo día detectado - Reseteando contadores', {
          lastCheck: lastCheck.toISOString(),
          now: now.toISOString()
        }, 'INFO');
        
        state.counts = { on: 0, off: 0, onLevelUp: 0, offLevelUp: 0, total: 0 };
        state.history = [];
        state.lastCase = null;
        state.lastMidnightCheck = now.toISOString();
        
        await chrome.storage.local.set({ caseCounterState: state });
        await updateBadge(0, state.customColors?.primary || CONFIG.BADGE_COLOR_DEFAULT);
        
        await showNotification(
          '🌅 Nuevo Día',
          'Contadores reseteados. ¡Buen día!'
        );
        
        log('Contadores reseteados exitosamente', null, 'SUCCESS');
      } else if (!lastCheck) {
        state.lastMidnightCheck = now.toISOString();
        await chrome.storage.local.set({ caseCounterState: state });
        log('Primera verificación de medianoche', null, 'INFO');
      }
    }
  } catch (error) {
    log('Error verificando medianoche', { error: error.message }, 'ERROR');
  }
}

// ========== NOTIFICACIONES ==========
async function showNotification(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: title,
      message: message,
      priority: 1
    });
    
    log('Notificación mostrada', { title }, 'DEBUG');
  } catch (error) {
    log('Error mostrando notificación', { error: error.message }, 'WARNING');
  }
}

// ========== INSTALACIÓN/ACTUALIZACIÓN ==========
chrome.runtime.onInstalled.addListener(async (details) => {
  log('Extensión instalada/actualizada', { 
    reason: details.reason, 
    version: CONFIG.VERSION 
  }, 'INFO');
  
  if (details.reason === "install") {
    log('Primera instalación', null, 'SUCCESS');
    
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setBadgeBackgroundColor({ color: CONFIG.BADGE_COLOR_DEFAULT });
    
    const initialState = {
      isAuthenticated: false,
      user: null,
      counts: { on: 0, off: 0, onLevelUp: 0, offLevelUp: 0, total: 0 },
      history: [],
      lastCase: null,
      meta: 50,
      estiloMeliEnabled: false,
      currentView: 'login',
      customColor: '#1DBA8E',
      customColorSecondary: '#0ea5e9',
      customAvatar: '👤',
      customEmoji: '🚀',
      darkMode: false,
      selectedTheme: 'mint',
      customColors: {
        primary: '#1DBA8E',
        secondary: '#0ea5e9',
        background: '#0a0a0a',
        card: '#111111',
        text: '#e5e5e5',
        border: '#262626',
        success: '#10b981',
        error: '#ef4444'
      },
      historyRange: 'today',
      historyCustomFrom: null,
      historyCustomTo: null,
      historyFilter: 'all',
      lastMidnightCheck: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ caseCounterState: initialState });
    
    await showNotification(
      '🎉 Case Counter Pro Instalado',
      'Presiona Ctrl+Shift+C para comenzar'
    );
    
    log('Estado inicial configurado', null, 'SUCCESS');
  } 
  else if (details.reason === "update") {
    const previousVersion = details.previousVersion;
    log('Extensión actualizada', { from: previousVersion, to: CONFIG.VERSION }, 'SUCCESS');
    
    const result = await chrome.storage.local.get(['caseCounterState']);
    
    if (result.caseCounterState) {
      const state = result.caseCounterState;
      
      if (!state.customColors) {
        state.customColors = {
          primary: state.customColor || '#1DBA8E',
          secondary: state.customColorSecondary || '#0ea5e9',
          background: '#0a0a0a',
          card: '#111111',
          text: '#e5e5e5',
          border: '#262626',
          success: '#10b981',
          error: '#ef4444'
        };
      }
      
      if (!state.historyRange) {
        state.historyRange = 'today';
        state.historyCustomFrom = null;
        state.historyCustomTo = null;
        state.historyFilter = 'all';
      }
      
      if (!state.lastMidnightCheck) {
        state.lastMidnightCheck = new Date().toISOString();
      }
      
      await chrome.storage.local.set({ caseCounterState: state });
      log('Estado migrado a v2.4.1', null, 'SUCCESS');
    }
    
    await restoreBadgeFromStorage();
    
    await showNotification(
      '🔄 Case Counter Pro Actualizado',
      `Versión ${CONFIG.VERSION} instalada`
    );
  }
  
  setupHeartbeat();
  setupMidnightAlarm();
  startKeepAlive(); // 🆕
  
  await checkMidnight();
});

// ========== INICIO DEL SERVICE WORKER ==========
chrome.runtime.onStartup.addListener(async () => {
  log(`Case Counter Pro v${CONFIG.VERSION} - Service Worker iniciado`, null, 'SUCCESS');
  
  await restoreBadgeFromStorage();
  
  setupHeartbeat();
  setupMidnightAlarm();
  startKeepAlive(); // 🆕
  
  await checkMidnight();
});

// 🆕 RECONEXIÓN AL ABRIR POPUP
chrome.action.onClicked.addListener(() => {
  log('Popup abierto - Reconectando service worker', null, 'INFO');
  startKeepAlive();
});

// ========== COMANDOS DE TECLADO ==========
chrome.commands.onCommand.addListener(async (command) => {
  log(`Comando recibido: ${command}`, null, 'INFO');

  if (command === '_execute_action') {
    log('Abriendo extensión', null, 'SUCCESS');
    startKeepAlive(); // 🆕
  }
});

// ========== LISTENER DE MENSAJES ==========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log('Mensaje recibido', { type: msg?.type }, 'DEBUG');

  // 🆕 Reiniciar keep-alive al recibir mensaje
  startKeepAlive();

  if (msg?.type === "UPDATE_BADGE") {
    const total = msg.total || 0;
    const color = msg.color || CONFIG.BADGE_COLOR_DEFAULT;
    
    updateBadge(total, color);
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "GET_STATE") {
    chrome.storage.local.get(['caseCounterState'], (result) => {
      sendResponse({ state: result.caseCounterState || null });
    });
    return true;
  }

  if (msg?.type === "RESET_COUNTERS") {
    chrome.storage.local.get(['caseCounterState'], async (result) => {
      if (result.caseCounterState) {
        const state = result.caseCounterState;
        state.counts = { on: 0, off: 0, onLevelUp: 0, offLevelUp: 0, total: 0 };
        state.history = [];
        state.lastCase = null;
        
        await chrome.storage.local.set({ caseCounterState: state });
        await updateBadge(0, state.customColors?.primary || CONFIG.BADGE_COLOR_DEFAULT);
        
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'No state found' });
      }
    });
    return true;
  }

  // 🆕 Ping para mantener conexión
  if (msg?.type === "PING") {
    sendResponse({ ok: true, timestamp: Date.now() });
    return true;
  }

  sendResponse({ ok: false, error: 'Tipo de mensaje no reconocido' });
  return false;
});

// ========== LISTENER DE ALARMAS ==========
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'heartbeat') {
    log('Heartbeat ejecutado', null, 'DEBUG');
    
    chrome.storage.local.get(['caseCounterState'], (result) => {
      if (result.caseCounterState) {
        log('Service worker activo', { 
          user: result.caseCounterState.user?.ldap || 'No autenticado',
          total: result.caseCounterState.counts?.total || 0
        }, 'DEBUG');
      }
    });
  } 
  else if (alarm.name === CONFIG.MIDNIGHT_CHECK_ALARM) {
    log('Verificando medianoche', null, 'DEBUG');
    checkMidnight();
  }
});

// ========== MANEJO DE ERRORES GLOBALES ==========
self.addEventListener('error', (event) => {
  log('Error global capturado', { 
    message: event.message,
    filename: event.filename,
    lineno: event.lineno
  }, 'ERROR');
});

self.addEventListener('unhandledrejection', (event) => {
  log('Promesa rechazada no manejada', { 
    reason: event.reason 
  }, 'ERROR');
});

// 🆕 DETECTAR CUANDO EL SERVICE WORKER SE SUSPENDE
self.addEventListener('suspend', (event) => {
  log('Service Worker suspendido - Intentando mantener activo', null, 'WARNING');
  startKeepAlive();
});

// 🆕 DETECTAR CUANDO EL SERVICE WORKER SE REACTIVA
self.addEventListener('activate', (event) => {
  log('Service Worker activado', null, 'SUCCESS');
  event.waitUntil((async () => {
    await restoreBadgeFromStorage();
    setupHeartbeat();
    setupMidnightAlarm();
    startKeepAlive();
    await checkMidnight();
  })());
});

// ========== INICIALIZACIÓN ==========
(async function init() {
  log(`Case Counter Pro v${CONFIG.VERSION} - Service Worker cargado`, null, 'SUCCESS');
  
  await restoreBadgeFromStorage();
  
  setupHeartbeat();
  setupMidnightAlarm();
  startKeepAlive(); // 🆕
  
  await checkMidnight();
})();

log('✅ Background Service Worker listo', null, 'SUCCESS');