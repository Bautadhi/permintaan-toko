/* ======================================================
   PERMINTAAN BARANG TOKO
   MASTER APPLICATION LOGIC & SUPABASE DATABASE ENGINE
====================================================== */

// STORAGE KEYS (V7_HARD_RESET_CLEAN)
const USERS_DB_KEY = 'STORE_USERS_DB_V7_CLEAN';
const REQUESTS_DB_KEY = 'STORE_REQUESTS_DB_V7_CLEAN';
const CHAT_DB_KEY = 'STORE_CHAT_DB_V7_CLEAN';
const CHAT_ROOM_DB_KEY = 'STORE_CHAT_ROOM_DB_V7_CLEAN';
const TTD_DB_KEY = 'STORE_TTD_DB_V7_CLEAN';
const SESSION_KEY = 'STORE_ACTIVE_SESSION_V7_CLEAN';
const THEME_KEY = 'STORE_ACTIVE_THEME_V7_CLEAN';
const STORES_DB_KEY = 'STORE_CUSTOM_TOKO_LIST_V7_CLEAN';
const DELETED_STORES_KEY = 'STORE_DELETED_TOKO_LIST_V7_CLEAN';
const NOTIFICATIONS_DB_KEY = 'STORE_SYSTEM_NOTIFICATIONS_V7_CLEAN';
const KODE_UNIT_MAP_KEY = 'STORE_KODE_UNIT_MAP_V7_CLEAN';
const FEATURE_PHOTOS_KEY = 'STORE_FEATURE_PHOTOS_V7_CLEAN';
const DELETED_REQUESTS_KEY = 'STORE_DELETED_REQUESTS_V7_CLEAN';
const DELETED_USERS_KEY = 'STORE_DELETED_USERS_V7_CLEAN';
const FONTE_TOKEN_KEY = 'STORE_FONTE_TOKEN_KEY_V7_CLEAN';
const ADMIN_REMINDER_KEY = 'STORE_ADMIN_REMINDER_KEY_V7_CLEAN';
const ADMIN_SECRET_KEY_STORAGE_KEY = 'STORE_ADMIN_SECRET_KEY_V7_CLEAN';
const ADMIN_SCRIPT_URL_KEY = 'STORE_ADMIN_SCRIPT_URL_V7_CLEAN';

if (!window.appStorage) {
  const fallbackMemory = {};
  window.appStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(fallbackMemory, key) ? String(fallbackMemory[key]) : null; },
    setItem(key, value) { fallbackMemory[key] = String(value); },
    removeItem(key) { delete fallbackMemory[key]; },
    clear() { Object.keys(fallbackMemory).forEach(key => delete fallbackMemory[key]); }
  };
}

// 10 THEME MODES
const THEME_MODES = [
  { id: 'dark-mode', icon: 'light_mode', name: 'DARK' },
  { id: 'light-mode', icon: 'dark_mode', name: 'LIGHT' },
  { id: 'classic-mode', icon: 'menu_book', name: 'CLASSIC' },
  { id: 'neon-mode', icon: 'bolt', name: 'NEON' },
  { id: 'forest-mode', icon: 'eco', name: 'FOREST' },
  { id: 'sunset-mode', icon: 'wb_sunny', name: 'SUNSET' },
  { id: 'ocean-mode', icon: 'water', name: 'OCEAN' },
  { id: 'coffee-mode', icon: 'coffee', name: 'COFFEE' },
  { id: 'purple-mode', icon: 'nights_stay', name: 'PURPLE DREAM' },
  { id: 'crimson-mode', icon: 'local_fire_department', name: 'CRIMSON' }
];

// AREA MAP
const AREA_MAP = {
  BDG: 'BANDUNG (BDG)', BDU: 'BANDUNG UTARA (BDU)', CRB: 'CIREBON (CRB)',
  SKB: 'SUKABUMI (SKB)', SBN: 'SUBANG (SBN)', TSM: 'TASIKMALAYA (TSM)'
};

// KNOWN UNIT TYPE LOOKUP DATABASE 
const KODE_UNIT_MAP = {};

// SEED USERS DATABASE (CLEAN INITIAL STATE: ONLY ADMIN PSW=1)
const SEED_USERS = [
  { id: 'USR-ADMIN', username: 'ADMIN', password: '1', fullName: 'ADMINISTRATOR PUSAT', phone: '', category: 'ADMIN', area: 'ALL', createdAt: '31/07/2026' }
];

// SEED REQUESTS DATABASE (CLEAN INITIAL STATE)
const SEED_REQUESTS = [];

// STATE VARIABLES
let currentUser = null;
let currentPhotos = [];
let currentThemeIndex = 0;
let filterStatusRiwayat = '';
let dashboardFilterStatus = 'PENDING';
let modeEdit = false;
let editNoSurat = '';
let confirmCallback = null;
let isAdminChat = false;
let currentRoom = '';
let currentChatUser = '';
let canvasTTD = null;
let ctxTTD = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let activeScanInput = null;
let html5QrCodeScanner = null;

// =========================================================================
// UTILITY DIALOGS & OVERLAYS (DIPINDAH KE ATAS AGAR TIDAK ERROR UNDEFINED)
// =========================================================================
function closeAllPopups() {
  const allOverlays = document.querySelectorAll('.popupOverlay, #imageViewer, #rejectOverlay, #confirmOverlay, #pdfModal, #popupDetail, #popupAkun, #popupUserForm, #popupTTD, #popupNotifList, #popupBantuan');
  allOverlays.forEach(el => {
    if (el) { el.style.display = 'none'; el.classList.remove('show'); }
  });
}
window.closeAllPopups = closeAllPopups;

function showConfirm(msg, callback) {
  document.getElementById('confirmMessage').innerHTML = msg;
  confirmCallback = callback;
  document.getElementById('confirmOverlay').style.display = 'flex';
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
}

function closeConfirm() {
  document.getElementById('confirmOverlay').style.display = 'none';
  confirmCallback = null;
}

function confirmYes() {
  const cb = confirmCallback;
  confirmCallback = null;
  closeConfirm();
  closeAllPopups();
  if (typeof cb === 'function') cb();
}

function showNotif(msg, type = 'info') {
  const notifOverlay = document.getElementById('popupNotif');
  const notifMessage = document.getElementById('popupNotifMessage');
  const notifCard = document.getElementById('popupNotifCard');
  const notifIcon = document.getElementById('popupNotifIcon');
  const notifTitle = document.getElementById('popupNotifTitle');

  if (!notifOverlay) return;
  if (notifMessage) notifMessage.textContent = msg || 'INFORMASI SISTEM';

  const lowerType = (type || 'info').toLowerCase();
  if (notifCard) {
    if (lowerType.includes('error') || lowerType.includes('salah') || lowerType.includes('gagal') || lowerType.includes('danger')) {
      notifCard.className = 'popupNotifCard notif-error';
      if(notifIcon) notifIcon.textContent = 'cancel';
      if(notifTitle) notifTitle.textContent = 'GAGAL';
    } else if (lowerType.includes('warning') || lowerType.includes('peringatan')) {
      notifCard.className = 'popupNotifCard notif-warning';
      if(notifIcon) notifIcon.textContent = 'warning';
      if(notifTitle) notifTitle.textContent = 'PERINGATAN';
    } else if (lowerType.includes('success') || lowerType.includes('berhasil')) {
      notifCard.className = 'popupNotifCard notif-success';
      if(notifIcon) notifIcon.textContent = 'check_circle';
      if(notifTitle) notifTitle.textContent = 'BERHASIL';
    } else {
      notifCard.className = 'popupNotifCard notif-info';
      if(notifIcon) notifIcon.textContent = 'info';
      if(notifTitle) notifTitle.textContent = 'INFORMASI';
    }
  }
  notifOverlay.style.display = 'flex';
}

function closePopup() {
  const notifOverlay = document.getElementById('popupNotif');
  if (notifOverlay) notifOverlay.style.display = 'none';
  const activePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
  if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng(activePage);
}

function showLoading(text) {
  const textEl = document.getElementById('loadingText');
  if (textEl) textEl.textContent = text || '';
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// HELPER: GET FORMATTED DATE (DD/MM/YYYY)
function getFormattedDateDDMMYYYY(dObj = new Date()) {
  const day = String(dObj.getDate()).padStart(2, '0');
  const month = String(dObj.getMonth() + 1).padStart(2, '0');
  const year = dObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateDDMMYYYYString(input) {
  if (!input) return '-';
  const str = String(input).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) { return str.split(' ')[0]; }
  const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) { return `${match[3]}/${match[2]}/${match[1]}`; }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

// ======================================================
// APP INITIALIZATION & BOOT SEQUENCE (ANTI-BLANK)
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    closeAllPopups();
    
    // Tahan layar kosong dengan loading saat tarik data pertama
    showLoading('MENGUNDUH DATA DARI SERVER...');

    if (typeof loadSupabaseConfigFromJson === 'function') {
      await loadSupabaseConfigFromJson();
    }
    
    if (typeof initSupabaseDB === 'function') {
      await initSupabaseDB();
    }
    
    initDatabase(); 
    if (typeof startCentralCloudSyncEngine === 'function') startCentralCloudSyncEngine();
    if (typeof startSupabaseKeepalive === 'function') startSupabaseKeepalive();
    loadSavedTheme();

    // 1. CEK SESSION STORAGE LOKAL
    const savedSession = sessionStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try { currentUser = JSON.parse(savedSession); } catch(e) { currentUser = null; }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (typeof window.prosesLogin === 'function') window.prosesLogin();
      });
    }

    const loginButton = document.getElementById('btnLogin');
    if (loginButton) {
      loginButton.addEventListener('click', () => {
        if (typeof window.prosesLogin === 'function') window.prosesLogin();
      });
    }

    const usernameInput = document.getElementById('username');
    if (usernameInput) {
      usernameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (typeof window.prosesLogin === 'function') window.prosesLogin();
        }
      });
    }

    const passwordInput = document.getElementById('password');
    if (passwordInput) {
      passwordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          if (typeof window.prosesLogin === 'function') window.prosesLogin();
        }
      });
    }

    autoLogin();

    if (typeof currentUser !== 'undefined' && currentUser) {
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (document.getElementById('masterDbTableBody') && typeof loadMasterDbTable === 'function') loadMasterDbTable();
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    }

    initMobileBackButtonEngine();
    initPullToRefresh();
    updateAdminReminderUI();
  } catch (err) {
    console.error("Boot error:", err);
  } finally {
    hideLoading(); 
    closeAllPopups();
    if (!document.querySelector('.page.active')) {
      const dash = document.getElementById('dashboardPage');
      if (dash) dash.classList.add('active');
    }
  }

  setTimeout(() => {
    if (typeof aturTampilanLonceng === 'function' && typeof getCurrentActivePageId === 'function') {
      aturTampilanLonceng(getCurrentActivePageId());
    }
  }, 500);
}); 

// ======================================================
// FUNGSI ADMIN, PULL REFRESH, REMINDER, DLL (ORIGINAL)
// ======================================================
function getSavedAdminSecretKey() { return (appStorage.getItem(ADMIN_SECRET_KEY_STORAGE_KEY) || '').trim(); }
function saveAdminSecretKey(secretKey) {
  const cleanKey = (secretKey || '').trim();
  if (cleanKey) { appStorage.setItem(ADMIN_SECRET_KEY_STORAGE_KEY, cleanKey); } 
  else { appStorage.removeItem(ADMIN_SECRET_KEY_STORAGE_KEY); }
}
function loadSavedAdminSecretKey() {
  const input = document.getElementById('adminSecretKeySettingInput');
  if (input) { input.value = getSavedAdminSecretKey(); }
}
function simpanAdminSecretKey() {
  const input = document.getElementById('adminSecretKeySettingInput');
  const value = input ? input.value.trim() : '';
  saveAdminSecretKey(value);
  showNotif(value ? 'SECRET KEY SUPABASE BERHASIL DISIMPAN!' : 'SECRET KEY SUPABASE DIHAPUS!', 'info');
}

function initPullToRefresh() {
  const container = document.getElementById('app') || document.body;
  let startY = 0; let moveY = 0; let isAtTop = false;
  container.addEventListener('touchstart', (e) => {
    if (container.scrollTop <= 5) { startY = e.touches[0].clientY; isAtTop = true; } 
    else { isAtTop = false; }
  }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (!isAtTop) return; moveY = e.touches[0].clientY;
  }, { passive: true });
  container.addEventListener('touchend', async () => {
    if (!isAtTop) return;
    const dist = moveY - startY;
    if (dist > 80 && container.scrollTop <= 5) {
      if(typeof pullCentralCloudDB === 'function') await pullCentralCloudDB();
    }
    startY = 0; moveY = 0; isAtTop = false;
  }, { passive: true });
}

function getAdminReminderEnabled() { return appStorage.getItem(ADMIN_REMINDER_KEY) !== 'false'; }
function toggleAdminReminderFeature() {
  const next = !getAdminReminderEnabled();
  appStorage.setItem(ADMIN_REMINDER_KEY, next ? 'true' : 'false');
  updateAdminReminderUI();
  showNotif(next ? 'REMINDER PENDING SERVICE & DM SEKARANG AKTIF (ON)!' : 'REMINDER PENDING SERVICE & DM NONAKTIF (OFF)!', 'info');
  if (next) checkAndTriggerPendingReminders();
}
window.toggleAdminReminderFeature = toggleAdminReminderFeature;

const ADMIN_REMINDER_TIME_KEY = 'STORE_ADMIN_REMINDER_TIME_KEY_V7';
function getAdminReminderTime() { return appStorage.getItem(ADMIN_REMINDER_TIME_KEY) || '09:00'; }
function simpanAdminReminderTime() {
  const input = document.getElementById('adminReminderTimeInput');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    appStorage.setItem(ADMIN_REMINDER_TIME_KEY, val);
    showNotif(`JADWAL JAM WA REMINDER DISIMPAN: ${val}!`, 'info');
  }
}
window.simpanAdminReminderTime = simpanAdminReminderTime;

function loadAdminReminderTimeInput() {
  const input = document.getElementById('adminReminderTimeInput');
  if (input) input.value = getAdminReminderTime();
}
window.loadAdminReminderTimeInput = loadAdminReminderTimeInput;

function updateAdminReminderUI() {
  const statusText = document.getElementById('reminderFeatureStatusText');
  const isEnabled = getAdminReminderEnabled();
  if (statusText) {
    statusText.textContent = isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }
  loadAdminReminderTimeInput();
  const container = document.getElementById('adminReminderControlContainer');
  if (container) container.style.display = (currentUser && currentUser.category === 'ADMIN') ? 'flex' : 'none';
}

function checkAndTriggerPendingReminders() {
  if (!getAdminReminderEnabled()) return;
  const requests = getRequestsFromDB();
  if (!requests.length) return;

  const notifs = getSystemNotifications();
  const pendingServiceReqs = requests.filter(r => r.status === 'PENDING' && !r.serviceApprove);
  const pendingDMReqs = requests.filter(r => r.status === 'PENDING' && r.serviceApprove);

  let hasNewReminder = false;
  if (pendingServiceReqs.length > 0) {
    pendingServiceReqs.forEach(r => {
      const message = `REMINDER PENDING: PERMINTAAN #${r.noSurat} DARI TOKO ${r.toko} BELUM DI-APPROVE SERVICE!`;
      const duplicate = notifs.some(n => n.noSurat === r.noSurat && String(n.message).includes('REMINDER PENDING') && String(n.message).includes('SERVICE'));
      if (!duplicate) {
        tambahNotifikasiSistem(['SERVICE'], r.area, message, r.noSurat);
        hasNewReminder = true;
      }
    });
  }

  if (pendingDMReqs.length > 0) {
    pendingDMReqs.forEach(r => {
      const message = `REMINDER PENDING: PERMINTAAN #${r.noSurat} DARI TOKO ${r.toko} BELUM DI-APPROVE DM!`;
      const duplicate = notifs.some(n => n.noSurat === r.noSurat && String(n.message).includes('REMINDER PENDING') && String(n.message).includes('DM'));
      if (!duplicate) {
        tambahNotifikasiSistem(['DM'], 'ALL', message, r.noSurat);
        hasNewReminder = true;
      }
    });
  }

  if (hasNewReminder) updateNotifBellCounter();
}

// =========================================================================
// REAL-TIME UI UPDATER 
// =========================================================================
function onSupabaseDataChange(keyChanged) {
  if (!currentUser) return;
  const activePage = document.querySelector('.page.active');
  const pageId = activePage ? activePage.id : '';

  // Hapus pemanggilan loadForm() di sini agar KEYBOARD AMAN saat mengetik!
  if (pageId === 'dashboardPage' && typeof loadDashboard === 'function') {
    loadDashboard();
  } else if (pageId === 'riwayatPage' && typeof loadRiwayat === 'function') {
    loadRiwayat();
  } else if (pageId === 'masterDbPage' && typeof loadMasterDbTable === 'function') {
    loadMasterDbTable();
  } else if (pageId === 'userManagementPage' && typeof loadUsersManagement === 'function') {
    loadUsersManagement();
  } 

  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();

  const popupBantuan = document.getElementById('popupBantuan');
  if (popupBantuan && (popupBantuan.classList.contains('show') || popupBantuan.style.display === 'block')) {
    if (typeof isAdminChat !== 'undefined' && isAdminChat) {
      if (typeof currentRoom !== 'undefined' && currentRoom && typeof loadChatAdmin === 'function') {
        loadChatAdmin(currentRoom);
      } else if (typeof loadDaftarChatAdmin === 'function') {
        loadDaftarChatAdmin();
      }
    } else {
      if (typeof loadChatUser === 'function') loadChatUser();
    }
  }

  const notifListPopup = document.getElementById('popupNotifList');
  if (notifListPopup && notifListPopup.classList.contains('show')) {
    if (typeof loadNotificationList === 'function') loadNotificationList();
  }
}

function bersihkanCacheAplikasiWeb() {
  if (typeof caches !== 'undefined' && caches.keys) {
    caches.keys().then(names => { names.forEach(name => caches.delete(name)); }).catch(() => {});
  }
}

function startCentralCloudSyncEngine() {
  setOnDataChangeCallback(onSupabaseDataChange);
  // Manual Polling dinonaktifkan
}

async function pushCentralCloudDB() {
  if (typeof pushToSupabaseNow === 'function') await pushToSupabaseNow();
}

function updateCloudStatusUI(isOnline) {
  if (typeof updateSupabaseStatusUI === 'function') updateSupabaseStatusUI(isOnline);
}

// UPLOAD FOTO DIGANTI MURNI SUPABASE
async function uploadFotoToFirebaseStorage(file, fileName) {
  return uploadPhotoToSupabaseStorage(file);
}

function syncRequestToCloud(reqObj) { pushCentralCloudDB(); }
function syncUserToCloud(userObj) { pushCentralCloudDB(); }
function initFirebaseCloudDB() { /* legacy noop */ }

function getFeaturePhotosEnabled() { return appStorage.getItem(FEATURE_PHOTOS_KEY) !== 'false'; }
function setFeaturePhotosEnabled(enabled) {
  appStorage.setItem(FEATURE_PHOTOS_KEY, enabled ? 'true' : 'false');
  updatePhotoSectionVisibility();
  pushCentralCloudDB();
}
function toggleFeaturePhotoAdmin() {
  const next = !getFeaturePhotosEnabled();
  setFeaturePhotosEnabled(next);
  showNotif(next ? 'FITUR UPLOAD FOTO SEKARANG AKTIF (ON)!' : 'FITUR UPLOAD FOTO NONAKTIF (OFF)!', 'info');
}
function updatePhotoSectionVisibility() {
  const section = document.getElementById('sectionUploadFoto');
  const isEnabled = getFeaturePhotosEnabled();
  if (section) section.style.display = isEnabled ? 'block' : 'none';
  const statusText = document.getElementById('photoFeatureStatusText');
  if (statusText) {
    statusText.textContent = isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }
}

// Murni Firebase Dihapus (Sisa kerangka)
let dbCloud = null;
let storageCloud = null;
let isCloudDBActive = false;
function getFirebaseConfig() { return {}; }
function setupFirestoreRealtimeListeners() {}

function normalizeUserList(users) {
  if (!Array.isArray(users)) return [];
  const seen = new Set();
  const cleaned = [];
  users.forEach(user => {
    if (!user || !user.username) return;
    const username = String(user.username).trim();
    if (!username) return;
    const key = username.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push({
      ...user, username,
      fullName: String(user.fullName || '').trim(),
      password: String(user.password || '').trim(),
      storeCode: String(user.storeCode || '').trim().toUpperCase(),
      phone: String(user.phone || '').trim(),
      category: String(user.category || 'TOKO').trim().toUpperCase(),
      area: String(user.area || 'BDG').trim().toUpperCase()
    });
  });
  return cleaned;
}

function clearAllAppCacheAndData(force = false) {
  if (!force) return false;
  try { if (window.appStorage) window.appStorage.clear(); } catch (err) {}
  try {
    const keysToRemove = Object.keys(localStorage || {});
    keysToRemove.forEach(key => {
      if (String(key).startsWith('STORE_') || String(key).startsWith('FIREBASE_')) localStorage.removeItem(key);
    });
  } catch (err) {}
  try {
    if (typeof caches !== 'undefined' && Array.isArray(caches)) caches.keys().then(names => names.forEach(n => caches.delete(n))).catch(() => {});
  } catch (err) {}

  if (window.appStorage) {
    window.appStorage.setItem(USERS_DB_KEY, JSON.stringify([...SEED_USERS]));
    window.appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([]));
    window.appStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
    window.appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));
    window.appStorage.setItem(TTD_DB_KEY, JSON.stringify({}));
    window.appStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify({}));
    window.appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify([]));
    window.appStorage.setItem(DELETED_USERS_KEY, JSON.stringify([]));
  }
  return true;
}

function getAdminScriptUrl() { return (appStorage.getItem(ADMIN_SCRIPT_URL_KEY) || '').trim(); }
function saveAdminScriptUrl(url) {
  const clean = (url || '').trim();
  if (clean) appStorage.setItem(ADMIN_SCRIPT_URL_KEY, clean);
  else appStorage.removeItem(ADMIN_SCRIPT_URL_KEY);
}
function loadAdminScriptUrlInput() {
  const input = document.getElementById('adminScriptUrlInput');
  if (input) input.value = getAdminScriptUrl();
}
function simpanAdminScriptUrl() {
  const input = document.getElementById('adminScriptUrlInput');
  const value = input ? input.value.trim() : '';
  saveAdminScriptUrl(value);
  showNotif(value ? 'URL GOOGLE APPS SCRIPT BERHASIL DISIMPAN!' : 'URL GOOGLE APPS SCRIPT DIHAPUS!', 'info');
}

function initDatabase() {
  const currentTheme = window.localStorage ? window.localStorage.getItem(THEME_KEY) : null;
  if (currentTheme) document.body.className = currentTheme;
  if (typeof updatePhotoSectionVisibility === 'function') updatePhotoSectionVisibility();
}

function getUsersFromDB() {
  let users = [];
  try { users = JSON.parse(appStorage.getItem(USERS_DB_KEY) || '[]'); } catch (e) { users = []; }
  users = normalizeUserList(users);

  if (!Array.isArray(users) || !users.length) {
    users = [...SEED_USERS];
    appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    return users;
  }

  const adminUser = users.find(u => u && u.username && u.username.toUpperCase() === 'ADMIN');
  if (!adminUser) {
    users.unshift({ ...SEED_USERS[0] });
    appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } else {
    adminUser.password = '1';
    appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }
  return users;
}

function saveUsersToDB(users) {
  const normalizedUsers = normalizeUserList(Array.isArray(users) ? users : []);
  appStorage.setItem(USERS_DB_KEY, JSON.stringify(normalizedUsers));
  pushCentralCloudDB();
  if (currentUser) {
    loadDashboard(); loadRiwayat();
    if (document.getElementById('userTableBody')) loadUsersManagement();
  }
}

function getRequestsFromDB() { return JSON.parse(appStorage.getItem(REQUESTS_DB_KEY) || '[]'); }
function saveRequestsToDB(requests) {
  appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
  pushCentralCloudDB();
  if (currentUser) { loadDashboard(); loadRiwayat(); }
}

function getSystemNotifications() { return JSON.parse(appStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]'); }

function getFonteToken() { return appStorage.getItem(FONTE_TOKEN_KEY) || ''; }
function simpanFonteToken() {
  const token = document.getElementById('fonteTokenInput').value.trim();
  appStorage.setItem(FONTE_TOKEN_KEY, token);
  showNotif(token ? 'TOKEN WA FONTE BERHASIL DISIMPAN!' : 'TOKEN WA DIKOSONGKAN!', 'info');
}
function loadFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  if (input) input.value = getFonteToken();
}

function kirimNotifikasiWA(targetPhone, message) {
  if (!targetPhone || targetPhone === '-') return false;
  const token = getFonteToken();
  if (!token) return false;

  let cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
  if (!cleanPhone) return false;
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  else if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

  const formData = new FormData();
  formData.append('target', cleanPhone);
  formData.append('message', message);
  formData.append('countryCode', '62');

  fetch('https://api.fonnte.com/send', {
    method: 'POST', headers: { 'Authorization': token }, body: formData
  }).then(res => res.json()).catch(err => console.error('[FONTE WA API ERROR]:', err));
  return true;
}

function loadSavedTheme() {
  const saved = appStorage.getItem(THEME_KEY) || 'dark-mode';
  document.body.className = saved;
  const idx = THEME_MODES.findIndex(t => t.id === saved);
  currentThemeIndex = idx !== -1 ? idx : 0;
  updateThemeIcon();
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEME_MODES.length;
  const t = THEME_MODES[currentThemeIndex];
  document.body.className = t.id;
  appStorage.setItem(THEME_KEY, t.id);
  updateThemeIcon();
}

function updateThemeIcon() {
  const iconSpans = document.querySelectorAll('.theme-toggle-btn span, .popupThemeToggleBtn span, .theme-icon-btn span, .theme-toggle-inline span');
  const currentIcon = THEME_MODES[currentThemeIndex] ? THEME_MODES[currentThemeIndex].icon : 'palette';
  iconSpans.forEach(el => { if (el) el.textContent = currentIcon; });
}

// =========================================================================
// AUTO LOGIN & PROSES LOGIN (SESSION STORAGE)
// =========================================================================
function autoLogin() {
  const savedSession = sessionStorage.getItem(SESSION_KEY);
  if (savedSession) {
    try {
      currentUser = JSON.parse(savedSession);
      bukaMainApp();
      return;
    } catch(e) { currentUser = null; }
  }
  pindahHalaman('loginPage');
}

async function prosesLogin() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (!uEl || !pEl) return;

  const u = uEl.value.trim().toUpperCase();
  const p = pEl.value.trim();

  if (!u || !p) { showNotif('USERNAME DAN PASSWORD WAJIB DIISI!', 'warning'); return; }

  showLoading('MEMPROSES LOGIN...');

  try {
    if (window.localStorage) localStorage.clear();
    if (window.appStorage && typeof window.appStorage.clear === 'function') window.appStorage.clear();
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then(names => { names.forEach(name => caches.delete(name)); }).catch(() => {});
    }

    if (!supabaseClient && typeof initSupabaseDB === 'function') await initSupabaseDB();

    let users = getUsersFromDB();
    if (supabaseClient) {
      try {
        const { data } = await supabaseClient.from('app_storage').select('value').eq('key', USERS_DB_KEY).single();
        if (data && data.value) {
          users = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
        }
      } catch (err) {}
    }

    let user = users.find(x => x && x.username && x.username.toUpperCase() === u && String(x.password).trim() === p);
    if (!user && u === 'ADMIN' && p === '1') user = SEED_USERS[0];

    if (user) {
      currentUser = user;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      catatLogLogin(user.username, user.fullName, user.area, 'BERHASIL');
      
      bukaMainApp();
      setTimeout(() => {
        if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng('dashboardPage');
        if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
      }, 150);
    } else {
      catatLogLogin(u, '-', '-', 'GAGAL - PASSWORD SALAH');
      showNotif('USERNAME ATAU PASSWORD SALAH!', 'error');
    }
  } catch (error) {
    console.error("Login error:", error);
    showNotif('GAGAL TERHUBUNG KE SERVER SUPABASE!', 'error');
  } finally {
    hideLoading();
  }
}

async function catatLogLogin(username, nama, area, status) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('log_login').insert([{ username, nama_lengkap: nama, area, status }]);
  } catch (e) { console.warn('Gagal mencatat log login.'); }
}

function fillLogin(u, p) {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (uEl) uEl.value = u;
  if (pEl) pEl.value = p;
  prosesLogin();
}

function logout() {
  showConfirm('YAKIN INGIN KELUAR DARI APLIKASI?', () => {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
    
    tutupAkun();
    tutupNotificationModal();
    const popupBantuan = document.getElementById('popupBantuan');
    if (popupBantuan) popupBantuan.classList.remove('show');
    document.getElementById('bottomMenu').style.display = 'none';
    document.getElementById('helpButton').style.display = 'none';
    
    pindahHalaman('loginPage');
    if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    showNotif('BERHASIL LOGOUT DARI SISTEM', 'success');
  });
}

function bukaMainApp() {
  const loginPage = document.getElementById('loginPage');
  if (loginPage) loginPage.classList.remove('active');
  
  const bottomMenu = document.getElementById('bottomMenu');
  if (bottomMenu) bottomMenu.style.display = 'flex';
  
  if (typeof initAllDraggableButtons === 'function') initAllDraggableButtons();

  const isAdmin = (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  
  const btnUserNav = document.getElementById('btnUserNav');
  const btnMasterDbNav = document.getElementById('btnMasterDbNav');

  if (btnUserNav) btnUserNav.style.display = isAdmin ? 'flex' : 'none';
  if (btnMasterDbNav) btnMasterDbNav.style.display = isAdmin ? 'flex' : 'none';

  isAdminChat = isAdmin || (currentUser.category === 'SERVICE' && currentUser.area === 'TSM');

  let savedPage = sessionStorage.getItem('LAST_ACTIVE_PAGE');
  if (!savedPage || savedPage === 'null' || savedPage === 'undefined' || !document.getElementById(savedPage)) {
    savedPage = 'dashboardPage';
  }
  
  pindahHalaman(savedPage);

  setTimeout(() => { if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng('dashboardPage'); }, 100);
  setTimeout(() => { if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng('dashboardPage'); }, 400);

  if (typeof setOnDataChangeCallback === 'function' && typeof onSupabaseDataChange === 'function') {
    setOnDataChangeCallback(onSupabaseDataChange);
  }

  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
  if (typeof updateAdminReminderUI === 'function') updateAdminReminderUI();
  if (typeof checkAndTriggerPendingReminders === 'function') checkAndTriggerPendingReminders();
}

function showPage(pageId) {
  if (modeEdit && pageId !== 'inputPage') {
    showConfirm('KELUAR DARI MENU EDIT?', () => {
      bersihkanForm();
      closeAllPopups();
      pindahHalaman(pageId);
      aturTampilanLonceng(pageId);
    });
    return;
  }
  closeAllPopups();
  pindahHalaman(pageId);
  aturTampilanLonceng(pageId);
}

function aturTampilanLonceng(pageId) {
  const notifBtn = document.getElementById('notifBellBtn');
  const helpBtn = document.getElementById('helpButton');
  const isDashboard = (pageId === 'dashboardPage' && typeof currentUser !== 'undefined' && currentUser !== null);

  if (notifBtn) notifBtn.style.setProperty('display', isDashboard ? 'flex' : 'none', 'important');
  if (helpBtn) helpBtn.style.setProperty('display', isDashboard ? 'flex' : 'none', 'important');
}

let mobileBackspaceCount = 0;
let mobileBackspaceTimer = null;

function pushPopupHistoryState() {
  try { history.pushState({ modalOpen: true, page: getCurrentActivePageId() }, '', location.href); } catch (e) {}
}

function initMobileBackButtonEngine() {
  try { history.pushState({ page: 'dashboardPage' }, '', location.href); } catch(e) {}
  window.addEventListener('popstate', (e) => {
    const openModals = [
      document.getElementById('popupDetail'), document.getElementById('popupNotifList'),
      document.getElementById('popupBantuan'), document.getElementById('popupAkun'),
      document.getElementById('popupUserForm'), document.getElementById('pdfModal'),
      document.getElementById('rejectOverlay'), document.getElementById('popupTTD'),
      document.getElementById('popupTambahToko'), document.getElementById('popupPdfModelsModal'),
      document.getElementById('confirmOverlay'), document.getElementById('imageViewer'),
      document.getElementById('scannerModal')
    ];

    let closedAnyModal = false;
    openModals.forEach(m => {
      if (m && (m.classList.contains('show') || m.style.display === 'flex' || m.style.display === 'block')) {
        m.classList.remove('show'); m.style.display = 'none'; closedAnyModal = true;
      }
    });

    if (closedAnyModal) {
      if (typeof tutupScanner === 'function') tutupScanner();
      if (typeof tutupImageViewer === 'function') tutupImageViewer();
      const activePageId = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
      if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng(activePageId);
      try { history.pushState({ page: getCurrentActivePageId() }, '', location.href); } catch(err) {}
      return;
    }

    const currentActivePage = getCurrentActivePageId();
    if (currentActivePage === 'inputPage' && typeof modeEdit !== 'undefined' && modeEdit) {
      try { history.pushState({ page: 'inputPage' }, '', location.href); } catch(err) {}
      showConfirm('KELUAR DARI MENU EDIT?', () => {
        if (typeof bersihkanForm === 'function') bersihkanForm();
        closeAllPopups(); pindahHalaman('dashboardPage');
      });
      return;
    }

    if (currentActivePage !== 'dashboardPage' && currentActivePage !== 'loginPage') {
      pindahHalaman('dashboardPage', false);
      try { history.pushState({ page: 'dashboardPage' }, '', location.href); } catch(err) {}
      if (typeof mobileBackspaceCount !== 'undefined') mobileBackspaceCount = 0;
      return;
    }

    if (currentActivePage === 'dashboardPage') {
      if (typeof mobileBackspaceCount === 'undefined') window.mobileBackspaceCount = 0;
      mobileBackspaceCount++;
      if (typeof mobileBackspaceTimer !== 'undefined' && mobileBackspaceTimer) clearTimeout(mobileBackspaceTimer);
      window.mobileBackspaceTimer = setTimeout(() => { mobileBackspaceCount = 0; }, 3500);
      if (mobileBackspaceCount < 5) {
        try { history.pushState({ page: 'dashboardPage' }, '', location.href); } catch(err) {}
      }
    }
  });
}

function getCurrentActivePageId() {
  const activeEl = document.querySelector('.page.active');
  return activeEl ? activeEl.id : 'dashboardPage';
}

function updateBottomMenuHighlight(pageId) {
  const bottomNav = document.getElementById('bottomMenu');
  if (!bottomNav) return;
  const btnMap = {
    'dashboardPage': "showPage('dashboardPage')", 'inputPage': "showPage('inputPage')",
    'riwayatPage': "bukaMenuRiwayat()", 'masterDbPage': "showPage('masterDbPage')",
    'userManagementPage': "showPage('userManagementPage')"
  };
  const buttons = bottomNav.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    const onclickAttr = btn.getAttribute('onclick') || '';
    const targetOnClick = btnMap[pageId];
    if (targetOnClick && onclickAttr.includes(targetOnClick)) btn.classList.add('active');
  });
}

function pindahHalaman(pageId, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  updateBottomMenuHighlight(pageId);
  if (pageId !== 'loginPage') sessionStorage.setItem('LAST_ACTIVE_PAGE', pageId);

  if (pushHistory && pageId !== 'loginPage') {
    try { history.pushState({ page: pageId }, '', location.href); } catch(e) {}
  }

  if (pageId === 'dashboardPage') loadDashboard();
  else if (pageId === 'inputPage') loadForm();
  else if (pageId === 'riwayatPage') loadRiwayat();
  else if (pageId === 'masterDbPage') loadMasterDbTable();
  else if (pageId === 'userManagementPage') {
    loadFonteToken(); loadUsersManagement(); updateActivePdfModelBadge();
  }
}

function getAccessibleRequests() {
  const requests = getRequestsFromDB();
  if (!currentUser) return [];
  if (currentUser.category === 'ADMIN' || currentUser.category === 'DM' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')) return requests;
  if (currentUser.category === 'TOKO') return requests.filter(r => r.userId === currentUser.id || r.toko.toUpperCase() === currentUser.fullName.toUpperCase());
  return requests.filter(r => r.area === currentUser.area);
}

function filterDashboardRecent(status) {
  dashboardFilterStatus = status;
  loadDashboard();
}

function loadDashboard() {
  if (!currentUser) return;
  document.getElementById('namaUser').textContent = currentUser.fullName;
  document.getElementById('areaUser').textContent = `${currentUser.category} - ${AREA_MAP[currentUser.area] || currentUser.area}`;

  const data = getAccessibleRequests();
  const pending = data.filter(r => r.status === 'PENDING').length;
  const approve = data.filter(r => r.status === 'APPROVE').length;
  const reject = data.filter(r => r.status === 'REJECT').length;
  const done = data.filter(r => r.status === 'DONE').length;
  const total = data.length || 1;

  document.getElementById('pending').textContent = pending;
  document.getElementById('approve').textContent = approve;
  document.getElementById('reject').textContent = reject;
  document.getElementById('done').textContent = done;

  const barPending = document.getElementById('barPending');
  const barApprove = document.getElementById('barApprove');
  const barReject = document.getElementById('barReject');
  const barDone = document.getElementById('barDone');

  if (barPending) barPending.style.width = `${data.length ? Math.max(12, Math.round((pending / total) * 100)) : 15}%`;
  if (barApprove) barApprove.style.width = `${data.length ? Math.max(12, Math.round((approve / total) * 100)) : 15}%`;
  if (barReject) barReject.style.width = `${data.length ? Math.max(12, Math.round((reject / total) * 100)) : 15}%`;
  if (barDone) barDone.style.width = `${data.length ? Math.max(12, Math.round((done / total) * 100)) : 15}%`;

  const titleEl = document.getElementById('dashboardRecentTitle');
  if (titleEl) titleEl.textContent = `PERMINTAAN [ ${dashboardFilterStatus} ] (KLIK BARIS UNTUK LIHAT DETAIL)`;

  const lastDataContainer = document.getElementById('lastData');
  lastDataContainer.innerHTML = '';

  const filteredData = data.filter(r => r.status === dashboardFilterStatus);
  if (filteredData.length === 0) {
    lastDataContainer.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-muted);">TIDAK ADA DATA PERMINTAAN DENGAN STATUS ${dashboardFilterStatus}.</div>`;
    return;
  }

  filteredData.forEach(r => {
    const div = document.createElement('div');
    div.className = 'lastItem';
    div.style.cursor = 'pointer';
    div.title = `KLIK BARIS INI UNTUK MEMBUKA PERMINTAAN #${r.noSurat}`;
    div.onclick = () => bukaDetailDariDashboard(r.noSurat);
    div.innerHTML = `
      <div class="colTanggal">${formatDateDDMMYYYYString(r.tanggal)}</div>
      <div class="colNo">${r.noSurat}</div>
      <div class="colToko">${r.toko} <small style="color:var(--primary);">(${r.area})</small></div>
      <div class="colStatus">${getBadgeStatus(r)}</div>
    `;
    lastDataContainer.appendChild(div);
  });
}

function bukaDetailDariDashboard(noSurat) { lihatDetail(noSurat, true); }

function getBadgeStatus(r) {
  if (typeof r === 'string') {
    if (r === 'DONE') return '<span>SUDAH DIPENUHI</span>';
    return `<span>${r}</span>`;
  }
  if (!r) return '<span>-</span>';
  const role = currentUser ? currentUser.category : '';
  const st = r.status;
  const serviceAppv = r.serviceApprove;

  if (st === 'DONE') return '<span>SUDAH DIPENUHI</span>';
  if (st === 'REJECT') return '<span>DITOLAK</span>';
  if (st === 'APPROVE') return '<span>DISETUJUI</span>';
  if (st === 'PENDING') {
    if (!serviceAppv) return '<span>TUNGGU SERVICE</span>';
    else {
      if (role === 'SERVICE' || role === 'TOKO' || role === 'SALES') return '<span>TUNGGU DM</span>';
      return '<span>TUNGGU APPROVAL DM</span>';
    }
  }
  return `<span>${st}</span>`;
}

// PERBAIKAN FORM AGAR KEYBOARD TIDAK TERTUTUP SAAT REALTIME SYNC
function loadForm() {
  const tglEl = document.getElementById('tanggal');
  if (tglEl && !tglEl.value) { tglEl.value = getFormattedDateDDMMYYYY(); }

  const tokoSelect = document.getElementById('toko');
  if (tokoSelect && tokoSelect.options.length === 0) {
    if (currentUser.category === 'TOKO') {
      tokoSelect.innerHTML = `<option value="${currentUser.fullName}">${currentUser.fullName} (${currentUser.area})</option>`;
    } else {
      const users = getUsersFromDB();
      const stores = users.filter(u => u.category === 'TOKO' && u.area === currentUser.area);
      if (stores.length > 0) {
        stores.forEach(s => { tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`; });
      } else {
        tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (${currentUser.area})</option>`;
      }
    }
  }

  const containerTambahToko = document.getElementById('containerTambahToko');
  if (containerTambahToko) {
    containerTambahToko.style.display = (currentUser.category === 'TOKO') ? 'none' : 'block';
  }

  const detailContainer = document.getElementById('detailContainer');
  if (detailContainer && detailContainer.children.length === 0 && !modeEdit) {
    tambahRow();
  }
}

function gantiJenis() {
  const container = document.getElementById('detailContainer');
  if (container.children.length > 0 && !modeEdit) {
    container.innerHTML = '';
    tambahRow();
  }
}

function tambahRow() {
  const jenis = document.getElementById('jenisPermintaan').value;
  const container = document.getElementById('detailContainer');
  const div = document.createElement('div');
  div.className = `detailRow ${jenis === 'DUS' ? 'dus' : 'seri'}`;
  const scanButtonHtml = `<button type="button" class="btnScanSeri" onclick="bukaScanner(this)" title="SCAN BARCODE / QR NO SERI"><span class="material-symbols-rounded">qr_code_scanner</span></button>`;

  if (jenis === 'DUS') {
    div.innerHTML = `
      <input type="text" inputmode="text" class="typeBarang" placeholder="TYPE BARANG" autocomplete="off">
      <div style="display:flex; gap:4px; align-items:center;">
        <input type="text" inputmode="text" class="seriBarang" placeholder="NO SERI" autocomplete="off" oninput="lookupTypeRow(this)" onkeyup="lookupTypeRow(this)" onblur="lookupTypeRow(this)">
        ${scanButtonHtml}
      </div>
      <input type="text" inputmode="text" class="namaBarang" placeholder="PERMINTAAN" autocomplete="off">
      <input type="text" inputmode="text" class="seriDusBarang" placeholder="NO SERI DUS" autocomplete="off">
      <input type="text" inputmode="text" class="alasan" placeholder="ALASAN" autocomplete="off">
      <input type="number" class="qty" value="1" min="1" style="text-align: center;" autocomplete="off">
      <button type="button" class="btnHapusRow" onclick="hapusRow(this)"><span class="material-symbols-rounded">remove</span></button>
    `;
  } else {
    div.innerHTML = `
      <input type="text" inputmode="text" class="typeBarang" placeholder="TYPE BARANG" autocomplete="off">
      <div style="display:flex; gap:4px; align-items:center;">
        <input type="text" inputmode="text" class="seriBarang" placeholder="NO SERI" autocomplete="off" oninput="lookupTypeRow(this)" onkeyup="lookupTypeRow(this)" onblur="lookupTypeRow(this)">
        ${scanButtonHtml}
      </div>
      <input type="text" inputmode="text" class="namaBarang" placeholder="PERMINTAAN" autocomplete="off">
      <input type="text" inputmode="text" class="alasan" placeholder="ALASAN" autocomplete="off">
      <input type="number" class="qty" value="1" min="1" style="text-align: center;" autocomplete="off">
      <button type="button" class="btnHapusRow" onclick="hapusRow(this)"><span class="material-symbols-rounded">remove</span></button>
    `;
  }
  container.appendChild(div);
}

function getKodeUnitMap() {
  const customMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
  const merged = { ...KODE_UNIT_MAP, ...customMap };
  const cleanMap = {};
  Object.keys(merged).forEach(k => {
    if (k !== undefined && k !== null && merged[k]) {
      const cleanKey = String(k).trim().toUpperCase();
      const cleanVal = String(merged[k]).trim().toUpperCase();
      if (cleanKey && cleanVal) cleanMap[cleanKey] = cleanVal;
    }
  });
  return cleanMap;
}

function bukaScanner(btn) {
  const row = btn.closest('.detailRow');
  if (row) activeScanInput = row.querySelector('.seriBarang');
  else activeScanInput = btn.parentElement.querySelector('.seriBarang');

  const modal = document.getElementById('scannerModal');
  if (modal) modal.style.display = 'flex';

  if (typeof Html5Qrcode !== 'undefined') {
    setTimeout(() => {
      try {
        if (html5QrCodeScanner) {
          try { html5QrCodeScanner.stop(); } catch(e) {}
          html5QrCodeScanner = null;
        }
        html5QrCodeScanner = new Html5Qrcode("readerScanner");
        const config = { fps: 15, qrbox: { width: 260, height: 160 } };
        html5QrCodeScanner.start({ facingMode: "environment" }, config, (decodedText) => {
            if (activeScanInput) {
              const cleanCode = String(decodedText || '').trim().toUpperCase();
              activeScanInput.value = cleanCode;
              activeScanInput.setAttribute('value', cleanCode);
              activeScanInput.dispatchEvent(new Event('input', { bubbles: true }));
              const targetRow = activeScanInput.closest('.detailRow');
              if (targetRow) {
                const namaInput = targetRow.querySelector('.namaBarang');
                if (namaInput) setTimeout(() => { namaInput.focus(); }, 300);
              }
            }
            tutupScanner();
          }, (errorMessage) => {}
        ).catch(err => {
          showNotif('KAMERA TIDAK TERSEDIA ATAU DIBLOKIR BROWSER!', 'warning');
          tutupScanner();
        });
      } catch(err) { console.warn("Kesalahan inisialisasi kamera:", err); }
    }, 200);
  } else { showNotif('MODUL SCANNER BELUM SIAP!', 'warning'); }
}

function tutupScanner() {
  const modal = document.getElementById('scannerModal');
  if (modal) modal.style.display = 'none';
  if (html5QrCodeScanner) {
    try {
      const scannerRef = html5QrCodeScanner;
      html5QrCodeScanner = null;
      scannerRef.stop().then(() => { try { scannerRef.clear(); } catch(e) {} }).catch(err => { try { scannerRef.clear(); } catch(e) {} });
    } catch(e) { html5QrCodeScanner = null; }
  }
  setTimeout(() => { activeScanInput = null; }, 500);
}

function lookupTypeRow(el, isFromScanner = false) {
  if (!el) return;
  const rawValue = String(el.value || '').trim().toUpperCase();
  el.value = rawValue;
  if (!rawValue || rawValue.length < 4) return;
  const first4Chars = rawValue.substring(0, 4);
  const fullMap = getKodeUnitMap();
  const keys = Object.keys(fullMap);
  let matchedType = null;
  for (const key of keys) {
    const cleanKey = String(key).trim().toUpperCase();
    if (cleanKey.substring(0, 4) === first4Chars) { matchedType = fullMap[key]; break; }
  }
  if (!matchedType) {
    for (const key of keys) {
      const cleanKey = String(key).trim().toUpperCase();
      if (cleanKey.length >= 4 && rawValue.startsWith(cleanKey)) { matchedType = fullMap[key]; break; }
    }
  }
  if (matchedType) {
    const row = el.closest('.detailRow');
    if (row) {
      const typeInput = row.querySelector('.typeBarang');
      if (typeInput) typeInput.value = matchedType;
      if (isFromScanner) {
        const namaInput = row.querySelector('.namaBarang');
        if (namaInput) setTimeout(() => namaInput.focus(), 150);
      }
    }
  }
}

function hapusRow(btn) {
  const row = btn.closest('.detailRow');
  if (row) row.remove();
  const container = document.getElementById('detailContainer');
  if (container.children.length === 0) tambahRow();
}

function pilihFoto() { document.getElementById('foto').click(); }

// UPLOAD FOTO MENTAH KE SUPABASE
async function uploadPhotoToSupabaseStorage(file) {
  if (!supabaseClient) return null;
  try {
    const ext = (file.name && file.name.split('.').pop()) || 'jpg';
    const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const { error } = await supabaseClient.storage.from('photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (err) { return null; }
}

async function previewFoto(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  if (currentPhotos.length + files.length > 5) {
    showNotif('MAKSIMAL FOTO DIBATASI HINGGA 5 FOTO SAJA!', 'warning');
    event.target.value = ''; return;
  }
  const previewText = document.getElementById('previewText');
  const originalText = previewText ? previewText.innerHTML : 'TAP / DRAG FOTO DI SINI';
  if (previewText) previewText.innerHTML = `<span class="material-symbols-rounded" style="font-size:22px; vertical-align:middle; display:inline-block; animation:spin 0.8s linear infinite; color:var(--primary);">sync</span> MENGUNGGAH FOTO...`;

  for (let i = 0; i < files.length; i++) {
    if (currentPhotos.length < 5) {
      try {
        const url = await uploadPhotoToSupabaseStorage(files[i]);
        if (url) currentPhotos.push(url);
      } catch (err) {}
    }
  }
  if (previewText) previewText.innerHTML = originalText;
  renderPhotoGrid();
  event.target.value = '';
}

function hapusFotoItem(idx) {
  currentPhotos.splice(idx, 1);
  renderPhotoGrid();
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoPreviewsGrid');
  grid.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-card';
    div.title = "KLIK UNTUK BUKA FOTO DI GOOGLE DRIVE / TAB BARU";
    div.onclick = () => window.open(src, '_blank');
    div.innerHTML = `<img src="${src}" alt="Foto ${idx + 1}"><button class="photo-del-btn" onclick="event.stopPropagation(); hapusFotoItem(${idx})">✕</button>`;
    grid.appendChild(div);
  });
}

function bersihkanForm() {
  currentPhotos = []; modeEdit = false; editNoSurat = '';
  const fileInput = document.getElementById('foto');
  if (fileInput) fileInput.value = '';
  const photoGrid = document.getElementById('photoPreviewsGrid');
  if (photoGrid) photoGrid.innerHTML = '';
  const previewText = document.getElementById('previewText');
  if (previewText) previewText.style.display = 'block';
  const catatanEl = document.getElementById('catatan');
  if (catatanEl) { catatanEl.value = ''; catatanEl.textContent = ''; }
  const jenisEl = document.getElementById('jenisPermintaan');
  if (jenisEl) jenisEl.value = 'DEFAULT';
  const btnSimpan = document.getElementById('btnSimpan');
  if (btnSimpan) btnSimpan.textContent = 'SIMPAN PERMINTAAN';

  const tokoSelect = document.getElementById('toko');
  if (tokoSelect && tokoSelect.options.length > 0) tokoSelect.selectedIndex = 0;

  const container = document.getElementById('detailContainer');
  if (container) container.innerHTML = '';
  tambahRow();

  const allInputs = document.querySelectorAll('#inputPage input, #inputPage textarea');
  allInputs.forEach(ipt => {
    if (ipt.id === 'tanggal') return;
    if (ipt.type === 'file') ipt.value = '';
    else if (ipt.classList.contains('qty')) ipt.value = '1';
    else { ipt.value = ''; ipt.setAttribute('value', ''); }
  });
}

function simpanData() {
  const toko = document.getElementById('toko').value;
  const jenis = document.getElementById('jenisPermintaan').value;
  const catatan = document.getElementById('catatan').value.trim().toUpperCase();

  const rows = document.querySelectorAll('.detailRow');
  let items = [];
  let valid = true;

  rows.forEach(r => {
    const type = r.querySelector('.typeBarang').value.trim().toUpperCase();
    const seri = r.querySelector('.seriBarang').value.trim().toUpperCase();
    const barang = r.querySelector('.namaBarang').value.trim().toUpperCase();
    const alasan = r.querySelector('.alasan').value.trim().toUpperCase();
    const qty = parseInt(r.querySelector('.qty').value) || 1;
    const dus = r.querySelector('.seriDusBarang') ? r.querySelector('.seriDusBarang').value.trim().toUpperCase() : '';

    if (!type || !seri || !barang || !alasan) valid = false;
    if (jenis === 'DUS' && !dus) valid = false;

    items.push({ type, seri, dus, barang, alasan, qty });
  });

  if (!valid) { showNotif('DETAIL BARANG & ALASAN WAJIB DIISI DENGAN LENGKAP!', 'warning'); return; }

  const allReq = getRequestsFromDB();
  let duplicateSerial = null;
  let duplicateNoSurat = null;

  items.forEach(it => {
    if (it.seri) {
      const match = allReq.find(r => r.noSurat !== editNoSurat && r.items.some(x => x.seri === it.seri));
      if (match) { duplicateSerial = it.seri; duplicateNoSurat = match.noSurat; }
    }
  });

  if (duplicateSerial && !modeEdit) {
    showConfirm(`NO SERI ${duplicateSerial} SUDAH TERDAFTAR PADA ${duplicateNoSurat}. LANJUTKAN TRANSAKSI?`, () => {
      prosesSimpanKeDB(toko, jenis, catatan, items);
    });
  } else {
    prosesSimpanKeDB(toko, jenis, catatan, items);
  }
}

function prosesSimpanKeDB(toko, jenis, catatan, items) {
  setTimeout(() => {
    hideLoading();
    const requests = getRequestsFromDB();

    if (modeEdit && editNoSurat) {
      const idx = requests.findIndex(r => r.noSurat === editNoSurat);
      if (idx !== -1) {
        requests[idx].toko = toko; requests[idx].jenis = jenis; requests[idx].catatan = catatan;
        requests[idx].items = items; requests[idx].photos = [...currentPhotos];
        saveRequestsToDB(requests);
        showNotif(`PERMINTAAN #${editNoSurat} BERHASIL DIPERBARUI!`, 'success');
        bersihkanForm();
      }
    } else {
      const now = new Date();
      const codeYear = String(now.getFullYear()).slice(-2);
      const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
      const codeDay = String(now.getDate()).padStart(2, '0');

      const allStores = getStoresFromDB();
      const safeToko = String(toko || '').trim().toUpperCase();
      const matchedStore = allStores.find(s => s && s.fullName && String(s.fullName).trim().toUpperCase() === safeToko);
      let storeCode = matchedStore ? (matchedStore.storeCode || generateStoreCode(matchedStore.fullName)) : generateStoreCode(safeToko);

      const seqNo = String(requests.length + 1).padStart(2, '0');
      const noSurat = `PRMT/${currentUser.area}-${storeCode}/${codeYear}${codeMonth}${codeDay}${seqNo}`;
      
      const newRecord = {
        noSurat, tanggal: getFormattedDateDDMMYYYY(now), area: currentUser.area, userId: currentUser.id,
        toko, jenis, catatan, items, photos: [...currentPhotos], status: 'PENDING', serviceApprove: false,
        createdBy: currentUser.fullName, createdAt: `${getFormattedDateDDMMYYYY(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, log: []
      };
      requests.unshift(newRecord);
      saveRequestsToDB(requests);
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DISIMPAN!`, 'success');
      bersihkanForm();

      tambahNotifikasiSistem(['SERVICE'], currentUser.area, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`, noSurat);
      const allUsers = getUsersFromDB();
      const serviceUsers = allUsers.filter(u => u.category === 'SERVICE' && u.area === currentUser.area);
      serviceUsers.forEach(srv => {
        if (srv.phone) kirimNotifikasiWA(srv.phone, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`);
      });
    }
    pindahHalaman('inputPage');
  }, 400);
}

function bukaMenuRiwayat() { filterStatusRiwayat = ''; document.getElementById('searchRiwayat').value = ''; showPage('riwayatPage'); }
function bukaRiwayat(status) { filterStatusRiwayat = status; document.getElementById('searchRiwayat').value = ''; showPage('riwayatPage'); }
function loadRiwayat() {
  const dropdown = document.getElementById('filterStatusDropdown');
  if (dropdown && filterStatusRiwayat) dropdown.value = filterStatusRiwayat;
  filterRiwayat();
}
function filterRiwayatDropdown() {
  filterStatusRiwayat = document.getElementById('filterStatusDropdown').value;
  if (filterStatusRiwayat === 'ALL') filterStatusRiwayat = '';
  filterRiwayat();
}

function filterRiwayat() {
  let data = getAccessibleRequests();
  const search = document.getElementById('searchRiwayat').value.toLowerCase().trim();

  if (filterStatusRiwayat && filterStatusRiwayat !== 'ALL') {
    data = data.filter(r => r.status === filterStatusRiwayat);
  }

  if (search) {
    data = data.filter(r =>
      r.noSurat.toLowerCase().includes(search) || r.toko.toLowerCase().includes(search) ||
      r.items.some(i => i.type.toLowerCase().includes(search) || i.seri.toLowerCase().includes(search) || i.barang.toLowerCase().includes(search))
    );
  }

  const thead = document.querySelector('.historyTable thead');
  const tbody = document.getElementById('riwayatData');
  const role = currentUser.category;

  thead.innerHTML = `<tr><th>AKSI</th><th>TGL</th><th>NO SURAT</th><th>TOKO</th><th>JENIS</th><th>STATUS</th><th>CATATAN</th></tr>`;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">BELUM ADA DATA PERMINTAAN.</td></tr>`;
    return;
  }

  data.forEach(r => {
    let aksi = '';
    const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));

    if (isAdminUser) {
      if (r.status === 'PENDING' && !r.serviceApprove) {
        aksi += `<button class="btnIcon btnApprove" onclick="approveService('${r.noSurat}')" title="APPROVE SERVICE"><span class="material-symbols-rounded">check_circle</span></button>
                 <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'SERVICE')" title="REJECT SERVICE"><span class="material-symbols-rounded">cancel</span></button>`;
      } else if (r.status === 'PENDING' && r.serviceApprove) {
        aksi += `<button class="btnIcon btnApprove" onclick="approveDM('${r.noSurat}')" title="APPROVE DM"><span class="material-symbols-rounded">check_circle</span></button>
                 <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'DM')" title="REJECT DM"><span class="material-symbols-rounded">cancel</span></button>`;
      } else if (r.status === 'APPROVE') {
        aksi += `<button class="btnIcon btnDone" onclick="doneService('${r.noSurat}')" title="DONE"><span class="material-symbols-rounded">task_alt</span></button>`;
      }
    } else if (role === 'SERVICE') {
      if (r.status === 'PENDING' && !r.serviceApprove) {
        aksi += `<button class="btnIcon btnApprove" onclick="approveService('${r.noSurat}')" title="APPROVE SERVICE"><span class="material-symbols-rounded">check_circle</span></button>
                 <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'SERVICE')" title="REJECT SERVICE"><span class="material-symbols-rounded">cancel</span></button>`;
      } else if (r.status === 'APPROVE') {
        aksi += `<button class="btnIcon btnDone" onclick="doneService('${r.noSurat}')" title="DONE"><span class="material-symbols-rounded">task_alt</span></button>`;
      }
    } else if (role === 'DM') {
      if (r.status === 'PENDING' && r.serviceApprove) {
        aksi += `<button class="btnIcon btnApprove" onclick="approveDM('${r.noSurat}')" title="APPROVE DM"><span class="material-symbols-rounded">check_circle</span></button>
                 <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'DM')" title="REJECT DM"><span class="material-symbols-rounded">cancel</span></button>`;
      }
    }

    aksi += `<button class="btnIcon btnInfo" onclick="lihatDetail('${r.noSurat}')" title="LIHAT DETAIL"><span class="material-symbols-rounded">visibility</span></button>`;

    const isPhotoHidden = (r.status === 'APPROVE' || r.status === 'DONE' || r.status === 'REJECT');
    if (r.photos && r.photos.length > 0 && !isPhotoHidden) {
      aksi += `<button class="btnIcon btnView" onclick="lihatFotoByNoSurat('${r.noSurat}')" title="LIHAT FOTO"><span class="material-symbols-rounded">image</span></button>`;
    }

    const isPdfVisible = (r.status === 'APPROVE' || r.status === 'DONE' || (isAdminUser && r.status !== 'REJECT'));
    if (isPdfVisible) {
      aksi += `<button class="btnIcon btnPdf" onclick="bukaPdfModal('${r.noSurat}')" title="CETAK PDF"><span class="material-symbols-rounded">picture_as_pdf</span></button>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div style="display:flex; gap:4px; align-items:center;">${aksi}</div></td>
      <td style="white-space:nowrap;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td style="font-weight:600; color:var(--primary);">${r.noSurat}</td>
      <td>${r.toko} <div style="font-size:11px; color:var(--text-muted);">${r.area}</div></td>
      <td style="white-space:nowrap; font-size:13px; font-family:inherit; color:var(--text-main); font-weight:normal;">${r.jenis || 'DEFAULT'}</td>
      <td>${getBadgeStatus(r)}</td>
      <td style="word-break:break-word; white-space:normal; color:var(--text-main);">${r.catatan || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function hapusSemuaDataLokal() {
  showConfirm('YAKIN INGIN MENGHAPUS SEMUA DATA LOKAL & CACHE? (Aplikasi akan keluar dan dimuat ulang)', () => {
    showLoading('');
    setTimeout(async () => {
      try {
        if (window.localStorage) localStorage.clear();
        if (window.sessionStorage) sessionStorage.clear();
        if (window.appStorage && typeof window.appStorage.clear === 'function') window.appStorage.clear();
        if (typeof caches !== 'undefined' && caches.keys) {
          const cacheNames = await caches.keys();
          for (let name of cacheNames) { await caches.delete(name); }
        }
        currentUser = null;
        window.location.reload(true);
      } catch (error) {
        hideLoading(); console.error('Gagal menghapus data lokal:', error);
        showNotif('TERJADI KESALAHAN SAAT MENGHAPUS DATA!', 'error');
      }
    }, 800);
  });
}

// Menonaktifkan Polling Manual (Karena Supabase Realtime sudah Aktif)
function initAutoSync() { /* Disabled for Supabase Realtime */ }
function startAutoDataSync() { /* Disabled for Supabase Realtime */ }
