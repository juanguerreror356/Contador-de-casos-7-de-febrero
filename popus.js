/******************************************************************************************
* Case Counter Pro v2.5.0 — POPUP SCRIPT ULTRA OPTIMIZADO
* 
* 🚀 MEJORAS IMPLEMENTADAS:
* ✅ Top 5 ranking en inicio
* ✅ Emoji personalizable en barra de progreso
* ✅ Modo oscuro/claro
* ✅ 5 paletas predefinidas (Mint, Ocean, Sunset, Sakura, Midnight)
* ✅ Diseño 100% unificado
* ✅ Solo una vista visible a la vez
* ✅ Login se oculta completamente
* ✅ Sincronización optimizada
******************************************************************************************/

// ========== CONFIGURACIÓN ==========
const CONFIG = {
  API_URL: "https://script.google.com/a/macros/mercadolibre.com.co/s/AKfycbxXLvBtrg8vxXBno6C98eCuAYzeZ76aF9pgSlBoJFM6g2oRkSBDHsu6VFWuVqnmnsgg_A/exec",
  VERSION: "2.5.0",
  POLLING_INTERVAL: 30000,
  PING_INTERVAL: 25000,
  REQUEST_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  CACHE_DURATION: 5000,
  MAX_TMC_MINUTES: 1440,
  BADGE_COLOR_DEFAULT: "#1DBA8E",
  RANKING_CACHE_DURATION: 5000
};

// ========== PALETAS PREDEFINIDAS ==========
const THEMES = {
  mint: {
    primary: '#1DBA8E',
    secondary: '#0ea5e9',
    background: '#0a0a0a',
    card: '#111111',
    text: '#e5e5e5',
    border: '#262626',
    success: '#10b981',
    error: '#ef4444'
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    background: '#0a0a0a',
    card: '#111111',
    text: '#e5e5e5',
    border: '#262626',
    success: '#10b981',
    error: '#ef4444'
  },
  sunset: {
    primary: '#f59e0b',
    secondary: '#ef4444',
    background: '#0a0a0a',
    card: '#111111',
    text: '#e5e5e5',
    border: '#262626',
    success: '#10b981',
    error: '#ef4444'
  },
  sakura: {
    primary: '#ec4899',
    secondary: '#a855f7',
    background: '#0a0a0a',
    card: '#111111',
    text: '#e5e5e5',
    border: '#262626',
    success: '#10b981',
    error: '#ef4444'
  },
  midnight: {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    background: '#0a0a0a',
    card: '#111111',
    text: '#e5e5e5',
    border: '#262626',
    success: '#10b981',
    error: '#ef4444'
  }
};

// 🆕 EMOJIS PARA PROGRESO
const PROGRESS_EMOJIS = [
  '🚀', '🎯', '⚡', '🔥', '💪', '🏆', '⭐', '✨',
  '💎', '👑', '🎖️', '🥇', '🎪', '🎨', '🎭', '🎬',
  '🎮', '🎲', '🎯', '🎪', '🌟', '💫', '🌠', '🔮'
];

// ========== ESTADO GLOBAL ==========
let state = {
  isAuthenticated: false,
  user: null,
  counts: { on: 0, off: 0, onLevelUp: 0, offLevelUp: 0, total: 0 },
  history: [],
  meta: 50,
  estiloMeliEnabled: false,
  lastCase: null,
  currentView: 'login',
  rankingViewMode: 'team',
  selectedTheme: 'mint',
  darkMode: true,
  progressEmoji: '🚀',
  customAvatar: '👤',
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

// ========== ELEMENTOS DEL DOM ==========
const els = {};

// ========== CACHÉ ==========
let rankingCache = {
  data: null,
  timestamp: 0
};

// ========== INTERVALOS ==========
let pollingInterval = null;
let pingInterval = null;

// ========== UTILIDADES ==========
function log(mensaje, datos = null, nivel = 'INFO') {
  const timestamp = new Date().toLocaleTimeString('es-CO');
  const emoji = {
    'INFO': 'ℹ️',
    'SUCCESS': '✅',
    'WARNING': '⚠️',
    'ERROR': '❌',
    'DEBUG': '🔍'
  }[nivel] || 'ℹ️';
  
  console.log(`[${timestamp}] ${emoji} ${mensaje}`, datos || '');
}

function normalize(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase();
}

function toDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ========== STORAGE ==========
async function saveState() {
  try {
    await chrome.storage.local.set({ caseCounterState: state });
    log('Estado guardado', null, 'DEBUG');
  } catch (error) {
    log('Error guardando estado', { error: error.message }, 'ERROR');
  }
}

async function loadState() {
  try {
    const result = await chrome.storage.local.get(['caseCounterState']);
    
    if (result.caseCounterState) {
      state = { ...state, ...result.caseCounterState };
      
      // Migrar datos antiguos
      if (!state.customColors) {
        state.customColors = THEMES.mint;
      }
      
      if (!state.historyRange) {
        state.historyRange = 'today';
        state.historyCustomFrom = null;
        state.historyCustomTo = null;
        state.historyFilter = 'all';
      }
      
      if (!state.progressEmoji) {
        state.progressEmoji = '🚀';
      }
      
      if (state.darkMode === undefined) {
        state.darkMode = true;
      }
      
      if (!state.lastMidnightCheck) {
        state.lastMidnightCheck = new Date().toISOString();
      }
      
      log('Estado cargado', { usuario: state.user?.ldap || 'No autenticado' }, 'SUCCESS');
    } else {
      log('No hay estado previo', null, 'INFO');
    }
  } catch (error) {
    log('Error cargando estado', { error: error.message }, 'ERROR');
  }
}

// ========== API CALLS ==========
async function apiCall(action, params = {}, retries = CONFIG.MAX_RETRIES) {
  const requestData = { action, ...params };
  
  log(`API Call: ${action}`, params, 'DEBUG');
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
      
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      log(`API Response: ${action}`, { ok: data.ok }, data.ok ? 'SUCCESS' : 'WARNING');
      
      return data;
      
    } catch (error) {
      log(`API Error (intento ${attempt}/${retries})`, { 
        action, 
        error: error.message 
      }, 'ERROR');
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      } else {
        return { 
          ok: false, 
          error: error.message.includes('aborted') 
            ? 'Tiempo de espera agotado' 
            : 'Error de conexión' 
        };
      }
    }
  }
}

// ========== TOAST ==========
function toast(mensaje, tipo = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  log(`Toast: ${mensaje}`, { tipo }, 'DEBUG');
}

// ========== LOADER ==========
function showLoader(show = true, text = 'Cargando...') {
  let loader = document.getElementById('loader');
  
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'loader';
      loader.className = 'loader';
      loader.innerHTML = `
        <div class="loader-spinner"></div>
        <div class="loader-text">${text}</div>
      `;
      document.body.appendChild(loader);
    } else {
      loader.querySelector('.loader-text').textContent = text;
      loader.style.display = 'flex';
    }
  } else {
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

// ========== BADGE ==========
async function updateBadge() {
  try {
    const total = state.counts.total || 0;
    const color = state.customColors?.primary || CONFIG.BADGE_COLOR_DEFAULT;
    
    await chrome.action.setBadgeText({ 
      text: total > 0 ? total.toString() : '' 
    });
    
    await chrome.action.setBadgeBackgroundColor({ 
      color: color 
    });
    
    log('Badge actualizado', { total, color }, 'DEBUG');
  } catch (error) {
    log('Error actualizando badge', { error: error.message }, 'ERROR');
  }
}

// ========== RELOJ ==========
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  if (els.clock) els.clock.textContent = timeString;
  if (els.focusClock) els.focusClock.textContent = timeString;
}

// ========== CACHEAR ELEMENTOS DEL DOM ==========
function cacheElements() {
  // Login
  els.loginForm = document.getElementById('loginForm');
  els.liderInput = document.getElementById('leaderLdapInput');
  els.usuarioInput = document.getElementById('ldapInput');
  els.loginBtn = document.getElementById('loginBtn');
  
  // Main
  els.caseIdInput = document.getElementById('caseIdInput');
  els.tmcInput = document.getElementById('tmcInput');
  els.btnOn = document.getElementById('btnOn');
  els.btnOff = document.getElementById('btnOff');
  els.btnOnText = document.getElementById('btnOnText');
  els.btnOffText = document.getElementById('btnOffText');
  els.estiloMeliToggle = document.getElementById('estiloMeliToggle');
  els.deleteLastBtn = document.getElementById('deleteLastBtn');
  
  // Último caso
  els.lastCaseInfo = document.getElementById('lastCaseInfo');
  els.lastCaseText = document.getElementById('lastCaseText');
  
  // Estadísticas
  els.statOn = document.getElementById('statOn');
  els.statOff = document.getElementById('statOff');
  els.statOnLevelUp = document.getElementById('statOnLevelUp');
  els.statOffLevelUp = document.getElementById('statOffLevelUp');
  els.statTotal = document.getElementById('statTotal');
  els.statTmc = document.getElementById('statTmc');
  
  // Meta
  els.metaValue = document.getElementById('metaValue');
  els.progressBar = document.getElementById('progressBar');
  els.progressText = document.getElementById('progressText');
  els.progressEmoji = document.getElementById('progressEmoji');
  els.metaEmojiBtn = document.getElementById('metaEmojiBtn');
  
  // Top 5
  els.top5List = document.getElementById('top5List');
  els.viewFullRankingBtn = document.getElementById('viewFullRankingBtn');
  
  // Navbar
  els.navHomeBtn = document.querySelector('.nav-btn[data-view="main"]');
  els.navRankingBtn = document.querySelector('.nav-btn[data-view="ranking"]');
  els.navSettingsBtn = document.querySelector('.nav-btn[data-view="settings"]');
  els.navBtns = document.querySelectorAll('.nav-btn');
  
  // Topbar
  els.clock = document.getElementById('clock');
  els.focusBtn = document.getElementById('focusBtn');
  
  // Ranking
  els.rankingList = document.getElementById('rankingList');
  els.rankingTeamBtn = document.getElementById('rankingTeamBtn');
  els.rankingShiftBtn = document.getElementById('rankingShiftBtn');
  
  // History
  els.historyList = document.getElementById('historyList');
  els.historyLink = document.getElementById('historyLink');
  els.applyCustomRange = document.getElementById('applyCustomRange');
  
  // Settings
  els.profileName = document.getElementById('profileName');
  els.profileLdap = document.getElementById('profileLdap');
  els.profileLeader = document.getElementById('profileLeader');
  els.profileShift = document.getElementById('profileShift');
  els.avatarDisplay = document.getElementById('avatarDisplay');
  els.avatarSelector = document.getElementById('avatarSelector');
  els.darkModeToggle = document.getElementById('darkModeToggle');
  els.logoutBtn = document.getElementById('logoutBtn');
  
  // Focus
  els.focusClock = document.getElementById('focusClock');
  els.focusCaseId = document.getElementById('focusCaseId');
  els.focusTmc = document.getElementById('focusTmc');
  els.focusBtnOn = document.getElementById('focusBtnOn');
  els.focusBtnOff = document.getElementById('focusBtnOff');
  els.focusBtnOnLevelUp = document.getElementById('focusBtnOnLevelUp');
  els.focusBtnOffLevelUp = document.getElementById('focusBtnOffLevelUp');
  els.focusTotal = document.getElementById('focusTotal');
  els.focusMeta = document.getElementById('focusMeta');
  els.backFromFocusBtn = document.getElementById('backFromFocusBtn');
  
  // Modales
  els.metaModal = document.getElementById('metaModal');
  els.metaInput = document.getElementById('metaInput');
  els.saveMetaBtn = document.getElementById('saveMetaBtn');
  els.cancelMetaBtn = document.getElementById('cancelMetaBtn');
  els.closeMetaModal = document.getElementById('closeMetaModal');
  
  els.emojiModal = document.getElementById('emojiModal');
  els.emojiGrid = document.getElementById('emojiGrid');
  els.closeEmojiModal = document.getElementById('closeEmojiModal');
  
  els.avatarModal = document.getElementById('avatarModal');
  els.avatarGrid = document.getElementById('avatarGrid');
  els.closeAvatarModal = document.getElementById('closeAvatarModal');
  
  els.deleteModal = document.getElementById('deleteModal');
  els.deleteCaseInfo = document.getElementById('deleteCaseInfo');
  els.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  els.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  els.closeDeleteModal = document.getElementById('closeDeleteModal');
  
  // Paleta de colores
  els.colorPrimary = document.getElementById('colorPrimary');
  els.colorSecondary = document.getElementById('colorSecondary');
  els.colorBackground = document.getElementById('colorBackground');
  els.colorCard = document.getElementById('colorCard');
  els.colorText = document.getElementById('colorText');
  els.colorBorder = document.getElementById('colorBorder');
  els.colorSuccess = document.getElementById('colorSuccess');
  els.colorError = document.getElementById('colorError');
  els.resetColorsBtn = document.getElementById('resetColorsBtn');
  
  log('Elementos del DOM cacheados', null, 'SUCCESS');
}

// 🔥 ========== GESTIÓN DE VISTAS ========== 🔥

function cleanAllViews() {
  log('Limpiando todas las vistas', null, 'DEBUG');
  
  const allViews = [
    'loginView',
    'mainView',
    'rankingView',
    'settingsView',
    'focusView',
    'historyView'
  ];
  
  allViews.forEach(viewId => {
    const view = document.getElementById(viewId);
    if (view) {
      view.classList.remove('active');
      view.style.display = 'none';
    }
  });
  
  log('Vistas limpiadas', null, 'SUCCESS');
}

function updateNavbar(viewName) {
  const navButtons = {
    'main': els.navHomeBtn,
    'ranking': els.navRankingBtn,
    'settings': els.navSettingsBtn
  };
  
  Object.values(navButtons).forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  
  if (navButtons[viewName]) {
    navButtons[viewName].classList.add('active');
  }
}

function showView(viewName) {
  log('Cambiando a vista', { view: viewName }, 'INFO');
  
  cleanAllViews();
  
  const targetView = document.getElementById(`${viewName}View`);
  if (targetView) {
    targetView.style.display = 'block';
    targetView.classList.add('active');
    
    setTimeout(() => {
      targetView.scrollTop = 0;
      const rootEl = document.querySelector('.root');
      if (rootEl) rootEl.scrollTop = 0;
    }, 50);
  }
  
  updateNavbar(viewName);
  
  state.currentView = viewName;
  saveState();
  
  if (viewName === 'main') {
    renderMain();
    setTimeout(() => els.caseIdInput?.focus(), 100);
  } else if (viewName === 'ranking') {
    renderRanking();
  } else if (viewName === 'history') {
    renderHistory();
  } else if (viewName === 'settings') {
    renderSettings();
  } else if (viewName === 'focus') {
    renderFocus();
    setTimeout(() => els.focusCaseId?.focus(), 100);
  }
  
  log('Vista cambiada', { view: viewName }, 'SUCCESS');
}

// ========== VALIDACIÓN ==========
function isDuplicateCase(caseId) {
  const today = toDayKey();
  const normalizedCaseId = normalize(caseId);
  
  return state.history.some(c => {
    try {
      const caseDate = toDayKey(new Date(c.timestamp || c.ts));
      const caseCaseId = normalize(c.caseId);
      return caseDate === today && caseCaseId === normalizedCaseId;
    } catch {
      return false;
    }
  });
}

// 🆕 ========== ÚLTIMO CASO ========== 🆕
function updateLastCaseDisplay() {
  if (!els.lastCaseInfo || !els.lastCaseText) return;
  
  if (state.lastCase) {
    const emoji = state.lastCase.tipo.includes('ON') ? '📞' : '✉️';
    const levelUp = state.lastCase.tipo.includes('LEVEL UP') ? ' ⭐' : '';
    const text = `${emoji} ${state.lastCase.caseId} • ${state.lastCase.tmc} min${levelUp}`;
    
    els.lastCaseText.textContent = text;
    els.lastCaseInfo.style.display = 'flex';
    
    log('Último caso actualizado', { caso: text }, 'DEBUG');
  } else {
    els.lastCaseInfo.style.display = 'none';
  }
}

// 🆕 ========== COLORES Y TEMAS ========== 🆕

function applyTheme(themeName) {
  if (!THEMES[themeName]) {
    log('Tema no encontrado', { theme: themeName }, 'WARNING');
    return;
  }
  
  state.selectedTheme = themeName;
  state.customColors = { ...THEMES[themeName] };
  
  applyCustomColors();
  saveState();
  
  // Actualizar botones de tema
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === themeName);
  });
  
  toast(`✅ Tema ${themeName} aplicado`, 'success');
  log('Tema aplicado', { theme: themeName }, 'SUCCESS');
}

function applyCustomColors() {
  const root = document.documentElement;
  
  root.style.setProperty('--primary', state.customColors.primary);
  root.style.setProperty('--secondary', state.customColors.secondary);
  root.style.setProperty('--bg', state.customColors.background);
  root.style.setProperty('--bg-card', state.customColors.card);
  root.style.setProperty('--text', state.customColors.text);
  root.style.setProperty('--border', state.customColors.border);
  root.style.setProperty('--success', state.customColors.success);
  root.style.setProperty('--error', state.customColors.error);
  
  updateBadge();
  
  log('Colores personalizados aplicados', state.customColors, 'DEBUG');
}

function resetColors() {
  state.customColors = { ...THEMES.mint };
  state.selectedTheme = 'mint';
  
  applyCustomColors();
  renderSettings();
  saveState();
  
  toast('✅ Colores restaurados', 'success');
  log('Colores restaurados', null, 'SUCCESS');
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  
  if (state.darkMode) {
    document.body.classList.remove('light-mode');
    state.customColors.background = '#0a0a0a';
    state.customColors.card = '#111111';
    state.customColors.text = '#e5e5e5';
    state.customColors.border = '#262626';
  } else {
    document.body.classList.add('light-mode');
    state.customColors.background = '#ffffff';
    state.customColors.card = '#f9fafb';
    state.customColors.text = '#111827';
    state.customColors.border = '#e5e7eb';
  }
  
  applyCustomColors();
  saveState();
  
  toast(state.darkMode ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado', 'info');
  log('Modo oscuro toggled', { darkMode: state.darkMode }, 'DEBUG');
}

// ========== REGISTRO DE CASOS (INSTANTÁNEO) ==========
async function registerCase(tipo, fromFocus = false, forceLevelUp = false) {
  const caseIdInput = fromFocus ? els.focusCaseId : els.caseIdInput;
  const tmcInput = fromFocus ? els.focusTmc : els.tmcInput;

  const caseId = caseIdInput?.value.trim();
  const tmc = tmcInput?.value.trim();

  if (!caseId || !tmc) {
    toast("⚠️ Completa Case ID y TMC", "warning");
    return;
  }

  const tmcNum = parseInt(tmc);
  if (isNaN(tmcNum) || tmcNum <= 0 || tmcNum > CONFIG.MAX_TMC_MINUTES) {
    toast(`⚠️ TMC debe ser entre 1 y ${CONFIG.MAX_TMC_MINUTES}`, "warning");
    return;
  }

  if (isDuplicateCase(caseId)) {
    toast("⚠️ Ya registraste este caso hoy", "warning");
    return;
  }

  const levelUp = forceLevelUp || state.estiloMeliEnabled;
  let finalType = tipo.toUpperCase();
  if (levelUp) {
    finalType = finalType + ' LEVEL UP';
  }

  // 🔥 ACTUALIZACIÓN INSTANTÁNEA DE UI
  const newCase = {
    tipo: finalType,
    caseId: caseId,
    tmc: tmcNum,
    timestamp: Date.now(),
    hora: new Date().toLocaleTimeString('es-CO', { hour12: false })
  };

  if (finalType === 'ON') {
    state.counts.on++;
  } else if (finalType === 'OFF') {
    state.counts.off++;
  } else if (finalType === 'ON LEVEL UP') {
    state.counts.onLevelUp++;
  } else if (finalType === 'OFF LEVEL UP') {
    state.counts.offLevelUp++;
  }

  state.counts.total = state.counts.on + state.counts.off + 
                       state.counts.onLevelUp + state.counts.offLevelUp;

  state.history.unshift(newCase);
  state.lastCase = newCase;

  renderMain();
  updateBadge();
  updateLastCaseDisplay();

  if (caseIdInput) caseIdInput.value = '';
  if (tmcInput) tmcInput.value = '';
  
  setTimeout(() => {
    if (caseIdInput) caseIdInput.focus();
  }, 100);

  await saveState();

  toast(`✅ Caso ${tipo} registrado`, "success");

  log('Caso registrado localmente', { tipo: finalType, caseId, tmc: tmcNum }, 'SUCCESS');

  // Enviar a servidor en background
  apiCall('register_case', {
    usuario: state.user.ldap,
    lider: state.user.leaderLdap,
    tipo: tipo,
    caseId: caseId,
    tmc: tmcNum,
    levelUp: levelUp
  }).then(response => {
    if (!response.ok) {
      log('Error en servidor, revirtiendo', { error: response.error }, 'ERROR');
      
      if (finalType === 'ON') {
        state.counts.on--;
      } else if (finalType === 'OFF') {
        state.counts.off--;
      } else if (finalType === 'ON LEVEL UP') {
        state.counts.onLevelUp--;
      } else if (finalType === 'OFF LEVEL UP') {
        state.counts.offLevelUp--;
      }
      
      state.counts.total = state.counts.on + state.counts.off + 
                           state.counts.onLevelUp + state.counts.offLevelUp;
      
      state.history = state.history.filter(c => c.timestamp !== newCase.timestamp);
      
      if (state.lastCase?.timestamp === newCase.timestamp) {
        state.lastCase = state.history[0] || null;
      }
      
      renderMain();
      updateBadge();
      updateLastCaseDisplay();
      saveState();
      
      toast(`❌ ${response.error}`, "error");
    } else {
      log('Caso confirmado por servidor', null, 'SUCCESS');
      
      // Invalidar caché de ranking para actualizar Top 5
      rankingCache.data = null;
      rankingCache.timestamp = 0;
      
      // Actualizar Top 5 si estamos en vista Main
      if (state.currentView === 'main') {
        fetchRanking();
      }
    }
  }).catch(error => {
    log('Error de red', { error: error.message }, 'ERROR');
  });
}

// ========== SINCRONIZACIÓN ==========
async function syncCasesFromServer() {
  if (!state.isAuthenticated) return;

  try {
    const response = await apiCall('sync_cases', {
      usuario: state.user.ldap,
      lider: state.user.leaderLdap
    });

    if (response.ok && response.data) {
      const serverCounts = response.data.counts;
      const serverCases = response.data.cases || [];

      const hasChanges = 
        serverCounts.total !== state.counts.total ||
        serverCounts.on !== state.counts.on ||
        serverCounts.off !== state.counts.off ||
        serverCounts.onLevelUp !== state.counts.onLevelUp ||
        serverCounts.offLevelUp !== state.counts.offLevelUp;

      if (hasChanges) {
        log('Diferencias detectadas, sincronizando', {
          local: state.counts.total,
          server: serverCounts.total
        }, 'INFO');

        state.counts = serverCounts;
        state.history = serverCases;
        state.lastCase = serverCases[0] || null;

        renderMain();
        updateBadge();
        updateLastCaseDisplay();
        await saveState();

        toast('🔄 Datos sincronizados', 'info');
      }

      log('Sincronización completada', { total: serverCounts.total }, 'SUCCESS');
    }
  } catch (error) {
    log('Error en sincronización', { error: error.message }, 'ERROR');
  }
}

// ========== RANKING ==========
async function fetchRanking() {
  if (!state.isAuthenticated) return;

  try {
    const action = state.rankingViewMode === 'team' 
      ? 'get_ranking' 
      : 'get_ranking_by_shift';

    const params = {
      usuario: state.user.ldap,
      lider: state.user.leaderLdap
    };

    if (state.rankingViewMode === 'shift') {
      params.turno = state.user.turno;
    }

    const response = await apiCall(action, params);

    if (response.ok && response.data) {
      rankingCache.data = response.data.ranking;
      rankingCache.timestamp = Date.now();

      if (state.currentView === 'ranking') {
        renderRanking();
      } else if (state.currentView === 'main') {
        renderTop5();
      }

      log('Ranking actualizado', { 
        mode: state.rankingViewMode, 
        users: rankingCache.data?.length || 0 
      }, 'SUCCESS');
    }
  } catch (error) {
    log('Error obteniendo ranking', { error: error.message }, 'ERROR');
  }
}

// ========== ELIMINAR CASO ==========
async function deleteLastCase() {
  if (!state.lastCase) {
    toast('⚠️ No hay casos para eliminar', 'warning');
    return;
  }

  if (els.deleteModal && els.deleteCaseInfo) {
    els.deleteCaseInfo.innerHTML = `
      <div class="delete-case-row">
        <span class="delete-case-label">Tipo:</span>
        <span class="delete-case-value">${state.lastCase.tipo}</span>
      </div>
      <div class="delete-case-row">
        <span class="delete-case-label">Case ID:</span>
        <span class="delete-case-value">${state.lastCase.caseId}</span>
      </div>
      <div class="delete-case-row">
        <span class="delete-case-label">TMC:</span>
        <span class="delete-case-value">${state.lastCase.tmc} min</span>
      </div>
      <div class="delete-case-row">
        <span class="delete-case-label">Hora:</span>
        <span class="delete-case-value">${state.lastCase.hora}</span>
      </div>
    `;
    
    els.deleteModal.classList.add('active');
  }
}

async function confirmDelete() {
  if (!state.lastCase) return;

  const caseToDelete = state.lastCase;

  if (els.deleteModal) {
    els.deleteModal.classList.remove('active');
  }

  const tipo = caseToDelete.tipo;

  if (tipo === 'ON') {
    state.counts.on--;
  } else if (tipo === 'OFF') {
    state.counts.off--;
  } else if (tipo === 'ON LEVEL UP') {
    state.counts.onLevelUp--;
  } else if (tipo === 'OFF LEVEL UP') {
    state.counts.offLevelUp--;
  }

  state.counts.total = state.counts.on + state.counts.off + 
                       state.counts.onLevelUp + state.counts.offLevelUp;

  state.history = state.history.filter(c => c.timestamp !== caseToDelete.timestamp);
  state.lastCase = state.history[0] || null;

  renderMain();
  updateBadge();
  updateLastCaseDisplay();
  await saveState();

  toast('✅ Caso eliminado', 'success');

  log('Caso eliminado localmente', { caseId: caseToDelete.caseId }, 'SUCCESS');

  apiCall('delete_last_case', {
    usuario: state.user.ldap,
    lider: state.user.leaderLdap
  }).then(response => {
    if (!response.ok) {
      log('Error eliminando en servidor', { error: response.error }, 'ERROR');
      toast('⚠️ Error al eliminar en servidor', 'warning');
      syncCasesFromServer();
    } else {
      log('Caso eliminado en servidor', null, 'SUCCESS');
    }
  }).catch(error => {
    log('Error de red al eliminar', { error: error.message }, 'ERROR');
  });
}

// ========== META ==========
async function updateMeta() {
  const newMeta = parseInt(els.metaInput?.value);

  if (isNaN(newMeta) || newMeta < 1 || newMeta > 1000) {
    toast('⚠️ Meta debe estar entre 1 y 1000', 'warning');
    return;
  }

  if (els.metaModal) {
    els.metaModal.classList.remove('active');
  }

  state.meta = newMeta;
  renderMain();
  await saveState();

  toast(`✅ Meta actualizada a ${newMeta}`, 'success');

  log('Meta actualizada localmente', { meta: newMeta }, 'SUCCESS');

  apiCall('update_meta', {
    usuario: state.user.ldap,
    lider: state.user.leaderLdap,
    meta: newMeta
  }).then(response => {
    if (response.ok) {
      log('Meta actualizada en servidor', null, 'SUCCESS');
    } else {
      log('Error actualizando meta en servidor', { error: response.error }, 'ERROR');
    }
  });
}

// 🆕 ========== EMOJI DE PROGRESO ========== 🆕
function renderEmojiGrid() {
  if (!els.emojiGrid) return;

  els.emojiGrid.innerHTML = PROGRESS_EMOJIS.map(emoji => 
    `<div class="emoji-option" data-emoji="${emoji}">${emoji}</div>`
  ).join('');

  els.emojiGrid.querySelectorAll('.emoji-option').forEach(option => {
    option.addEventListener('click', async () => {
      const emoji = option.dataset.emoji;
      
      state.progressEmoji = emoji;
      await saveState();
      
      if (els.progressEmoji) {
        els.progressEmoji.textContent = emoji;
      }
      
      if (els.metaEmojiBtn) {
        els.metaEmojiBtn.textContent = emoji;
      }
      
      closeModal('emojiModal');
      
      toast('✅ Emoji actualizado', 'success');
      
      log('Emoji de progreso actualizado', { emoji }, 'SUCCESS');
    });
  });
}

// ========== RENDERIZADO ==========

function renderMain() {
  // Estadísticas
  if (els.statOn) els.statOn.textContent = state.counts.on;
  if (els.statOff) els.statOff.textContent = state.counts.off;
  if (els.statOnLevelUp) els.statOnLevelUp.textContent = state.counts.onLevelUp;
  if (els.statOffLevelUp) els.statOffLevelUp.textContent = state.counts.offLevelUp;
  if (els.statTotal) els.statTotal.textContent = state.counts.total;

  // TMC promedio
  if (els.statTmc) {
    const totalTmc = state.history.reduce((sum, c) => sum + (c.tmc || 0), 0);
    const avgTmc = state.history.length > 0 
      ? Math.round(totalTmc / state.history.length) 
      : 0;
    els.statTmc.textContent = avgTmc;
  }

  // Meta
  if (els.metaValue) els.metaValue.textContent = state.meta;

  // Progreso
  const progress = state.meta > 0 
    ? Math.min(100, Math.round((state.counts.total / state.meta) * 100)) 
    : 0;

  if (els.progressBar) {
    els.progressBar.style.width = `${progress}%`;
  }

  if (els.progressText) {
    els.progressText.textContent = `${state.counts.total}/${state.meta} (${progress}%)`;
  }

  // 🆕 Emoji de progreso
  if (els.progressEmoji) {
    els.progressEmoji.textContent = state.progressEmoji || '🚀';
  }

  if (els.metaEmojiBtn) {
    els.metaEmojiBtn.textContent = state.progressEmoji || '🚀';
  }

  // Botones ON/OFF
  if (state.estiloMeliEnabled) {
    if (els.btnOnText) els.btnOnText.textContent = 'ON ⭐';
    if (els.btnOffText) els.btnOffText.textContent = 'OFF ⭐';
  } else {
    if (els.btnOnText) els.btnOnText.textContent = 'ON';
    if (els.btnOffText) els.btnOffText.textContent = 'OFF';
  }

  if (els.estiloMeliToggle) {
    els.estiloMeliToggle.checked = state.estiloMeliEnabled;
  }

  updateLastCaseDisplay();
  
  // 🆕 Renderizar Top 5
  renderTop5();

  log('Vista Main renderizada', null, 'DEBUG');
}

// 🆕 ========== TOP 5 RANKING EN INICIO ========== 🆕
function renderTop5() {
  if (!els.top5List) return;

  if (!rankingCache.data || (Date.now() - rankingCache.timestamp) > CONFIG.RANKING_CACHE_DURATION) {
    els.top5List.innerHTML = '<p class="muted text-center">Cargando ranking...</p>';
    return;
  }

  const ranking = rankingCache.data;

  if (!ranking || ranking.length === 0) {
    els.top5List.innerHTML = '<p class="muted text-center">No hay datos</p>';
    return;
  }

  const top5 = ranking.slice(0, 5);

  els.top5List.innerHTML = top5.map((user, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    return `
      <div class="top5-item ${rankClass}" style="border-left-color: ${user.color || '#1DBA8E'}">
        <div class="top5-rank">${medal || `#${rank}`}</div>
        <div class="top5-avatar">${user.avatar || '👤'}</div>
        <div class="top5-name">${user.nombre || user.user}</div>
        <div class="top5-total" style="color: ${user.color || '#1DBA8E'}">${user.total}</div>
      </div>
    `;
  }).join('');

  log('Top 5 renderizado', { users: top5.length }, 'DEBUG');
}

function renderRanking() {
  if (!els.rankingList) return;

  if (!rankingCache.data || (Date.now() - rankingCache.timestamp) > CONFIG.RANKING_CACHE_DURATION) {
    els.rankingList.innerHTML = '<p class="muted text-center">Cargando ranking...</p>';
    fetchRanking();
    return;
  }

  const ranking = rankingCache.data;

  if (!ranking || ranking.length === 0) {
    els.rankingList.innerHTML = '<p class="muted text-center">No hay datos de ranking</p>';
    return;
  }

  els.rankingList.innerHTML = ranking.map((user, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    const statsHtml = `
      <div class="ranking-stats">
        <div class="ranking-stat on">
          <div class="ranking-stat-label">ON</div>
          <div class="ranking-stat-value">${user.on || 0}</div>
        </div>
        <div class="ranking-stat off">
          <div class="ranking-stat-label">OFF</div>
          <div class="ranking-stat-value">${user.off || 0}</div>
        </div>
        <div class="ranking-stat on-levelup">
          <div class="ranking-stat-label">ON+</div>
          <div class="ranking-stat-value">${user.onLevelUp || 0}</div>
        </div>
        <div class="ranking-stat off-levelup">
          <div class="ranking-stat-label">OFF+</div>
          <div class="ranking-stat-value">${user.offLevelUp || 0}</div>
        </div>
      </div>
    `;

    const progressHtml = state.rankingViewMode === 'team' && user.meta ? `
      <div class="ranking-progress">
        <div class="ranking-progress-bar">
          <div class="ranking-progress-fill" style="width: ${user.progress || 0}%; background: ${user.color || '#1DBA8E'}"></div>
        </div>
        <div class="ranking-progress-text">Meta: ${user.meta} (${user.progress || 0}%)</div>
      </div>
    ` : '';

    return `
      <div class="ranking-item ${rankClass}" style="border-left-color: ${user.color || '#1DBA8E'}">
        <div class="ranking-header-row">
          <div class="ranking-user">
            <div class="ranking-rank">${medal || `#${rank}`}</div>
            <div class="ranking-avatar">${user.avatar || '👤'}</div>
            <div class="ranking-name">${user.nombre || user.user}</div>
          </div>
          <div class="ranking-total" style="color: ${user.color || '#1DBA8E'}">${user.total}</div>
        </div>
        ${statsHtml}
        ${progressHtml}
      </div>
    `;
  }).join('');

  log('Ranking renderizado', { users: ranking.length }, 'DEBUG');
}

function renderHistory() {
  if (!els.historyList) return;

  let startDate, endDate;
  const today = new Date();

  if (state.historyRange === 'today') {
    startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
  } else if (state.historyRange === 'custom') {
    if (!state.historyCustomFrom || !state.historyCustomTo) {
      els.historyList.innerHTML = '<p class="muted text-center">Selecciona un rango de fechas</p>';
      return;
    }
    startDate = new Date(state.historyCustomFrom);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(state.historyCustomTo);
    endDate.setHours(23, 59, 59, 999);
  } else {
    const days = parseInt(state.historyRange);
    startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
  }

  let filteredHistory = state.history.filter(c => {
    try {
      const caseDate = new Date(c.timestamp || c.ts);
      return caseDate >= startDate && caseDate <= endDate;
    } catch {
      return false;
    }
  });

  if (state.historyFilter !== 'all') {
    if (state.historyFilter === 'LEVEL UP') {
      filteredHistory = filteredHistory.filter(c => c.tipo.includes('LEVEL UP'));
    } else {
      filteredHistory = filteredHistory.filter(c => c.tipo.startsWith(state.historyFilter));
    }
  }

  if (filteredHistory.length === 0) {
    els.historyList.innerHTML = '<p class="muted text-center">No hay casos en este rango</p>';
    return;
  }

  els.historyList.innerHTML = filteredHistory.map(c => {
    const emoji = c.tipo.includes('ON') ? '📞' : '✉️';
    const levelUp = c.tipo.includes('LEVEL UP') ? ' ⭐' : '';
    const typeClass = c.tipo.includes('LEVEL UP') 
      ? (c.tipo.includes('ON') ? 'on-levelup' : 'off-levelup')
      : (c.tipo.includes('ON') ? 'on' : 'off');

    return `
      <div class="history-item">
        <div class="history-item-left">
          <div class="history-time">${c.hora || '--:--:--'}</div>
          <div class="history-type ${typeClass}">${emoji} ${c.tipo}</div>
          <div class="history-case">${c.caseId}</div>
        </div>
        <div class="history-tmc">${c.tmc} min</div>
      </div>
    `;
  }).join('');

  log('Historial renderizado', { 
    total: filteredHistory.length,
    range: state.historyRange,
    filter: state.historyFilter
  }, 'DEBUG');
}

function renderSettings() {
  if (state.user) {
    if (els.profileName) els.profileName.textContent = state.user.nombre;
    if (els.profileLdap) els.profileLdap.textContent = state.user.ldap;
    if (els.profileLeader) els.profileLeader.textContent = state.user.leaderLdap;
    if (els.profileShift) els.profileShift.textContent = state.user.turno;
  }

  if (els.avatarDisplay) {
    els.avatarDisplay.textContent = state.customAvatar || '👤';
  }

  // Modo oscuro
  if (els.darkModeToggle) {
    els.darkModeToggle.checked = state.darkMode;
  }

  // Marcar tema activo
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === state.selectedTheme);
  });

  // Colores personalizados
  if (els.colorPrimary) {
    els.colorPrimary.value = state.customColors.primary;
    const valueEl = document.getElementById('colorPrimaryValue');
    if (valueEl) valueEl.textContent = state.customColors.primary;
  }
  if (els.colorSecondary) {
    els.colorSecondary.value = state.customColors.secondary;
    const valueEl = document.getElementById('colorSecondaryValue');
    if (valueEl) valueEl.textContent = state.customColors.secondary;
  }
  if (els.colorBackground) {
    els.colorBackground.value = state.customColors.background;
    const valueEl = document.getElementById('colorBackgroundValue');
    if (valueEl) valueEl.textContent = state.customColors.background;
  }
  if (els.colorCard) {
    els.colorCard.value = state.customColors.card;
    const valueEl = document.getElementById('colorCardValue');
    if (valueEl) valueEl.textContent = state.customColors.card;
  }
  if (els.colorText) {
    els.colorText.value = state.customColors.text;
    const valueEl = document.getElementById('colorTextValue');
    if (valueEl) valueEl.textContent = state.customColors.text;
  }
  if (els.colorBorder) {
    els.colorBorder.value = state.customColors.border;
    const valueEl = document.getElementById('colorBorderValue');
    if (valueEl) valueEl.textContent = state.customColors.border;
  }
  if (els.colorSuccess) {
    els.colorSuccess.value = state.customColors.success;
    const valueEl = document.getElementById('colorSuccessValue');
    if (valueEl) valueEl.textContent = state.customColors.success;
  }
  if (els.colorError) {
    els.colorError.value = state.customColors.error;
    const valueEl = document.getElementById('colorErrorValue');
    if (valueEl) valueEl.textContent = state.customColors.error;
  }

  log('Vista Settings renderizada', null, 'DEBUG');
}

function renderFocus() {
  if (els.focusTotal) {
    els.focusTotal.textContent = `${state.counts.total} casos`;
  }

  if (els.focusMeta) {
    els.focusMeta.textContent = `Meta: ${state.meta}`;
  }

  log('Vista Focus renderizada', null, 'DEBUG');
}

function renderUI() {
  if (state.currentView === 'main') {
    renderMain();
  } else if (state.currentView === 'ranking') {
    renderRanking();
  } else if (state.currentView === 'history') {
    renderHistory();
  } else if (state.currentView === 'settings') {
    renderSettings();
  } else if (state.currentView === 'focus') {
    renderFocus();
  }
}

// ========== AVATARES ==========
const AVATARES = [
  // Profesionales
  '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️',
  '👨‍🚀', '👩‍🚀', '👨‍🎨', '👩‍🎨', '👨‍🍳', '👩‍🍳', '👨‍🌾', '👩‍🌾', '👨‍🏭', '👩‍🏭',
  
  // Superhéroes
  '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '🧙‍♂️', '🧙‍♀️', '🧚‍♂️', '🧚‍♀️', '🧛‍♂️', '🧛‍♀️',
  '🧜‍♂️', '🧜‍♀️', '🧝‍♂️', '🧝‍♀️', '🧞‍♂️', '🧞‍♀️', '🧟‍♂️', '🧟‍♀️', '👼', '🎅',
  
  // Animales
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  
  // Gaming
  '🎮', '🕹️', '👾', '🤖', '👽', '🛸', '🚀', '⚡', '💻', '📱',
  '⌚', '🎧', '🎯', '🎲', '🎰', '🎪', '🎭', '🎨', '🎬', '🎤',
  
  // Deportes
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '🥊', '🥋', '⛳', '🏹', '🎣', '🥅', '⛸️', '🎿', '🏂', '🏋️',
  
  // Comida
  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇',
  '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🧀', '🥗', '🍝',
  
  // Naturaleza
  '🌸', '🌺', '🌻', '🌷', '🌹', '🥀', '🌾', '🌿', '☘️', '🍀',
  '🍁', '🍂', '🍃', '🌍', '🌎', '🌏', '🌙', '⭐', '✨', '⚡',
  
  // Objetos
  '💎', '👑', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '🎗️', '🎫'
];

function renderAvatarGrid() {
  if (!els.avatarGrid) return;

  els.avatarGrid.innerHTML = AVATARES.map(avatar => 
    `<div class="avatar-option" data-avatar="${avatar}">${avatar}</div>`
  ).join('');

  els.avatarGrid.querySelectorAll('.avatar-option').forEach(option => {
    option.addEventListener('click', async () => {
      const avatar = option.dataset.avatar;
      
      state.customAvatar = avatar;
      await saveState();
      
      if (els.avatarDisplay) {
        els.avatarDisplay.textContent = avatar;
      }
      
      closeModal('avatarModal');
      
      toast('✅ Avatar actualizado', 'success');
      
      apiCall('update_avatar', {
        usuario: state.user.ldap,
        lider: state.user.leaderLdap,
        avatar: avatar
      });
      
      log('Avatar actualizado', { avatar }, 'SUCCESS');
    });
  });
}

// ========== MODALES ==========
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    log(`Modal abierto: ${modalId}`, null, 'DEBUG');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    log(`Modal cerrado: ${modalId}`, null, 'DEBUG');
  }
}

// ========== LOGIN ==========
async function handleLogin() {
  const lider = els.liderInput?.value?.trim();
  const usuario = els.usuarioInput?.value?.trim();

  if (!lider || !usuario) {
    toast('⚠️ Completa ambos campos', 'warning');
    return;
  }

  showLoader(true, 'Validando usuario...');

  try {
    const response = await apiCall('validate_user', { usuario, lider });

    if (response.ok) {
      state.isAuthenticated = true;
      state.user = {
        ldap: response.data.userLdap,
        nombre: response.data.userName,
        leaderLdap: response.data.leaderLdap,
        turno: response.data.turno,
        color: response.data.color
      };
      state.currentView = 'main';

      await saveState();

      const loginView = document.getElementById('loginView');
      if (loginView) {
        loginView.classList.remove('active');
        loginView.style.display = 'none';
      }

      document.body.classList.add('authenticated');

      showView('main');

      await syncCasesFromServer();
      await fetchRanking();

      startPolling();
      startPinging();

      toast(`✅ Bienvenido, ${state.user.nombre}`, 'success');

      log('Login exitoso', { usuario: state.user.ldap }, 'SUCCESS');

    } else {
      toast(`❌ ${response.error}`, 'error');
      log('Login fallido', { error: response.error }, 'ERROR');
    }

  } catch (error) {
    toast('❌ Error de conexión', 'error');
    log('Error en login', { error: error.message }, 'ERROR');
  } finally {
    showLoader(false);
  }
}

async function handleLogout() {
  if (!confirm('¿Estás seguro de cerrar sesión?')) {
    return;
  }

  stopPolling();
  stopPinging();

  state = {
    isAuthenticated: false,
    user: null,
    counts: { on: 0, off: 0, onLevelUp: 0, offLevelUp: 0, total: 0 },
    history: [],
    meta: 50,
    estiloMeliEnabled: false,
    lastCase: null,
    currentView: 'login',
    rankingViewMode: 'team',
    selectedTheme: 'mint',
    darkMode: true,
    progressEmoji: '🚀',
    customAvatar: '👤',
    customColors: { ...THEMES.mint },
    historyRange: 'today',
    historyCustomFrom: null,
    historyCustomTo: null,
    historyFilter: 'all',
    lastMidnightCheck: new Date().toISOString()
  };

  await saveState();
  await chrome.action.setBadgeText({ text: '' });

  document.body.classList.remove('authenticated');
  cleanAllViews();
  showView('login');

  if (els.liderInput) els.liderInput.value = '';
  if (els.usuarioInput) els.usuarioInput.value = '';

  toast('👋 Sesión cerrada', 'info');

  log('Logout exitoso', null, 'SUCCESS');
}

// ========== POLLING ==========
function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    if (state.isAuthenticated) {
      await syncCasesFromServer();
      await fetchRanking();
    }
  }, CONFIG.POLLING_INTERVAL);

  log('Polling iniciado', { interval: `${CONFIG.POLLING_INTERVAL}ms` }, 'SUCCESS');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    log('Polling detenido', null, 'INFO');
  }
}

function startPinging() {
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  pingInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        log('Service worker desconectado, reconectando...', null, 'WARNING');
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'ping' });
        }, 1000);
      }
    });
  }, CONFIG.PING_INTERVAL);

  log('Ping iniciado', { interval: `${CONFIG.PING_INTERVAL}ms` }, 'SUCCESS');
}

function stopPinging() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    log('Ping detenido', null, 'INFO');
  }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  log('Configurando event listeners', null, 'INFO');

  // ========== LOGIN ==========
  els.loginBtn?.addEventListener('click', handleLogin);
  
  els.loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });

  els.liderInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      els.usuarioInput?.focus();
    }
  });

  els.usuarioInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });

  // ========== NAVBAR ==========
  els.navBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) {
        showView(view);
      }
    });
  });

  // ========== MAIN ==========
  els.btnOn?.addEventListener('click', () => registerCase('ON'));
  els.btnOff?.addEventListener('click', () => registerCase('OFF'));

  els.estiloMeliToggle?.addEventListener('change', async (e) => {
    state.estiloMeliEnabled = e.target.checked;
    await saveState();
    renderMain();
    
    toast(
      state.estiloMeliEnabled 
        ? '⭐ Estilo Meli activado' 
        : '⭐ Estilo Meli desactivado', 
      'info'
    );
    
    log('Estilo Meli toggled', { enabled: state.estiloMeliEnabled }, 'DEBUG');
  });

  els.deleteLastBtn?.addEventListener('click', deleteLastCase);

  els.caseIdInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      els.tmcInput?.focus();
    }
  });

  els.tmcInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      registerCase('ON');
    }
  });

  // 🆕 Top 5 - Ver ranking completo
  els.viewFullRankingBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('ranking');
  });

  // ========== META ==========
  document.getElementById('metaEditBtn')?.addEventListener('click', () => {
    if (els.metaInput) {
      els.metaInput.value = state.meta;
    }
    openModal('metaModal');
  });

  els.saveMetaBtn?.addEventListener('click', updateMeta);
  els.cancelMetaBtn?.addEventListener('click', () => closeModal('metaModal'));
  els.closeMetaModal?.addEventListener('click', () => closeModal('metaModal'));

  els.metaInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      updateMeta();
    }
  });

  // 🆕 Emoji de progreso
  els.metaEmojiBtn?.addEventListener('click', () => {
    renderEmojiGrid();
    openModal('emojiModal');
  });

  els.closeEmojiModal?.addEventListener('click', () => closeModal('emojiModal'));

  // ========== MODAL ELIMINAR ==========
  els.confirmDeleteBtn?.addEventListener('click', confirmDelete);
  els.cancelDeleteBtn?.addEventListener('click', () => closeModal('deleteModal'));
  els.closeDeleteModal?.addEventListener('click', () => closeModal('deleteModal'));

  // ========== RANKING ==========
  els.rankingTeamBtn?.addEventListener('click', async () => {
    state.rankingViewMode = 'team';
    await saveState();

    els.rankingTeamBtn?.classList.add('active');
    els.rankingShiftBtn?.classList.remove('active');

    rankingCache.data = null;
    rankingCache.timestamp = 0;
    
    showLoader(true, 'Cargando ranking...');
    await fetchRanking();
    showLoader(false);
    
    toast('👥 Ranking por equipo', 'info');
    log('Modo ranking cambiado a equipo', null, 'INFO');
  });

  els.rankingShiftBtn?.addEventListener('click', async () => {
    state.rankingViewMode = 'shift';
    await saveState();

    els.rankingShiftBtn?.classList.add('active');
    els.rankingTeamBtn?.classList.remove('active');

    rankingCache.data = null;
    rankingCache.timestamp = 0;
    
    showLoader(true, 'Cargando ranking...');
    await fetchRanking();
    showLoader(false);
    
    toast('🌙 Ranking por turno', 'info');
    log('Modo ranking cambiado a turno', null, 'INFO');
  });

  // ========== HISTORIAL ==========
  els.historyLink?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('history');
  });

  document.querySelectorAll('.date-range-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.date-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.historyRange = btn.dataset.range;
      await saveState();

      const customDateRange = document.getElementById('customDateRange');
      if (state.historyRange === 'custom') {
        customDateRange.style.display = 'grid';
      } else {
        customDateRange.style.display = 'none';
        renderHistory();
      }
      
      log('Rango de historial cambiado', { range: state.historyRange }, 'DEBUG');
    });
  });

  els.applyCustomRange?.addEventListener('click', async () => {
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;

    if (!dateFrom || !dateTo) {
      toast('⚠️ Selecciona ambas fechas', 'warning');
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      toast('⚠️ La fecha inicial debe ser anterior a la final', 'warning');
      return;
    }

    state.historyCustomFrom = dateFrom;
    state.historyCustomTo = dateTo;
    await saveState();

    renderHistory();
    toast('✅ Rango aplicado', 'success');
    
    log('Rango personalizado aplicado', { from: dateFrom, to: dateTo }, 'SUCCESS');
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.historyFilter = btn.dataset.filter;
      await saveState();

      renderHistory();
      
      log('Filtro de historial cambiado', { filter: state.historyFilter }, 'DEBUG');
    });
  });

  // ========== SETTINGS ==========
  els.logoutBtn?.addEventListener('click', handleLogout);

  // Avatar
  els.avatarSelector?.addEventListener('click', () => {
    renderAvatarGrid();
    openModal('avatarModal');
  });

  els.closeAvatarModal?.addEventListener('click', () => closeModal('avatarModal'));

  // 🆕 Modo oscuro
  els.darkModeToggle?.addEventListener('change', (e) => {
    toggleDarkMode();
  });

  // 🆕 Paletas predefinidas
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const theme = card.dataset.theme;
      applyTheme(theme);
    });
  });

  // 🆕 Colores personalizados con actualización de valor
  const colorInputs = [
    { el: els.colorPrimary, key: 'primary', valueId: 'colorPrimaryValue' },
    { el: els.colorSecondary, key: 'secondary', valueId: 'colorSecondaryValue' },
    { el: els.colorBackground, key: 'background', valueId: 'colorBackgroundValue' },
    { el: els.colorCard, key: 'card', valueId: 'colorCardValue' },
    { el: els.colorText, key: 'text', valueId: 'colorTextValue' },
    { el: els.colorBorder, key: 'border', valueId: 'colorBorderValue' },
    { el: els.colorSuccess, key: 'success', valueId: 'colorSuccessValue' },
    { el: els.colorError, key: 'error', valueId: 'colorErrorValue' }
  ];

  colorInputs.forEach(({ el, key, valueId }) => {
    el?.addEventListener('input', async (e) => {
      const color = e.target.value;
      state.customColors[key] = color;
      
      // Actualizar texto del valor
      const valueEl = document.getElementById(valueId);
      if (valueEl) {
        valueEl.textContent = color;
      }
      
      applyCustomColors();
      await saveState();
      
      log(`Color ${key} actualizado`, { color }, 'DEBUG');
    });
  });

  els.resetColorsBtn?.addEventListener('click', resetColors);

  // ========== FOCUS ==========
  els.focusBtn?.addEventListener('click', () => showView('focus'));
  els.backFromFocusBtn?.addEventListener('click', () => showView('main'));

  els.focusBtnOn?.addEventListener('click', () => registerCase('ON', true, false));
  els.focusBtnOff?.addEventListener('click', () => registerCase('OFF', true, false));
  els.focusBtnOnLevelUp?.addEventListener('click', () => registerCase('ON', true, true));
  els.focusBtnOffLevelUp?.addEventListener('click', () => registerCase('OFF', true, true));

  els.focusCaseId?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      els.focusTmc?.focus();
    }
  });

  els.focusTmc?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      registerCase('ON', true, false);
    }
  });

  // ========== CERRAR MODALES AL HACER CLICK FUERA ==========
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  log('Event listeners configurados', null, 'SUCCESS');
}

// ========== INICIALIZACIÓN ==========
async function init() {
  log('Inicializando extensión v2.5.0', null, 'INFO');

  try {
    await loadState();

    cacheElements();

    // Aplicar modo oscuro/claro
    if (state.darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }

    applyCustomColors();

    setupEventListeners();

    updateClock();
    setInterval(updateClock, 1000);

    if (state.isAuthenticated) {
      log('Usuario autenticado', { usuario: state.user?.ldap }, 'INFO');

      const loginView = document.getElementById('loginView');
      if (loginView) {
        loginView.classList.remove('active');
        loginView.style.display = 'none';
      }

      document.body.classList.add('authenticated');

      cleanAllViews();

      const viewToShow = state.currentView || 'main';
      showView(viewToShow);

      renderUI();

      await syncCasesFromServer();
      await fetchRanking();

      startPolling();
      startPinging();

    } else {
      log('Usuario no autenticado', null, 'INFO');

      cleanAllViews();

      document.body.classList.remove('authenticated');

      const loginView = document.getElementById('loginView');
      if (loginView) {
        loginView.style.display = 'block';
        loginView.classList.add('active');
      }

      setTimeout(() => {
        els.liderInput?.focus();
      }, 100);
    }

    log('Extensión inicializada correctamente', null, 'SUCCESS');

  } catch (error) {
    log('Error inicializando extensión', { error: error.message }, 'ERROR');
    toast('❌ Error al inicializar', 'error');
  }
}

// ========== DETECTAR CUANDO EL POPUP SE ABRE ==========
document.addEventListener('DOMContentLoaded', () => {
  log('DOM cargado, iniciando extensión v2.5.0', null, 'INFO');
  init();
});

// ========== RECONEXIÓN CON SERVICE WORKER ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reconnect') {
    log('Reconexión solicitada por service worker', null, 'INFO');
    
    if (state.isAuthenticated) {
      syncCasesFromServer();
      fetchRanking();
    }
    
    sendResponse({ ok: true });
  }
  
  return true;
});

// ========== DETECCIÓN DE VISIBILIDAD ==========
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.isAuthenticated) {
    log('Popup visible, sincronizando datos', null, 'INFO');
    syncCasesFromServer();
    fetchRanking();
  }
});

// ========== LOG FINAL ==========
log('✅ Case Counter Pro v2.5.0 cargado correctamente', null, 'SUCCESS');
log('🎨 Mejoras: Top 5, Emoji Progreso, Modo Oscuro, 5 Paletas, Diseño Unificado', null, 'INFO');
