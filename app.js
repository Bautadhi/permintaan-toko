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
const FIREBASE_USER_CONFIG_KEY = 'STORE_FIREBASE_USER_CONFIG_V7_CLEAN';

if (!window.appStorage) {
  const fallbackMemory = {};
  window.appStorage = {
    getItem(key) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(fallbackMemory, key) ? String(fallbackMemory[key]) : null;
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch (e) {}
      fallbackMemory[key] = String(value);
    },
    removeItem(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      delete fallbackMemory[key];
    },
    clear() {
      try {
        localStorage.clear();
      } catch (e) {}
      Object.keys(fallbackMemory).forEach(key => delete fallbackMemory[key]);
    }
  };
}

function getSavedAdminSecretKey() {
  return (appStorage.getItem(ADMIN_SECRET_KEY_STORAGE_KEY) || '').trim();
}

function saveAdminSecretKey(secretKey) {
  const cleanKey = (secretKey || '').trim();
  if (cleanKey) {
    appStorage.setItem(ADMIN_SECRET_KEY_STORAGE_KEY, cleanKey);
  } else {
    appStorage.removeItem(ADMIN_SECRET_KEY_STORAGE_KEY);
  }
}

function loadSavedAdminSecretKey() {
  const input = document.getElementById('adminSecretKeySettingInput');
  if (input) {
    input.value = getSavedAdminSecretKey();
  }
}

function simpanAdminSecretKey() {
  const input = document.getElementById('adminSecretKeySettingInput');
  const value = input ? input.value.trim() : '';
  saveAdminSecretKey(value);
  showNotif(value ? 'SECRET KEY SUPABASE BERHASIL DISIMPAN!' : 'SECRET KEY SUPABASE DIHAPUS!', 'info');
}

function getSystemNotifications() {
  return JSON.parse(appStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]');
}

function shouldEmitImportantNotification(targetRoles, targetArea, message, noSurat = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return false;

  const importantPatterns = [
    'PERMINTAAN BARU',
    'DISETUJUI SERVICE',
    'APPROVAL DM',
    'MOHON APPROVAL DM',
    'DITOLAK',
    'SELESAI (DONE)',
    'REMINDER PENDING'
  ];

  const containsImportant = importantPatterns.some(pattern => normalized.toUpperCase().includes(pattern));
  if (!containsImportant) return false;

  const noSuratKey = String(noSurat || '').trim();
  if (noSuratKey && noSuratKey.startsWith('PRMT/')) {
    return true;
  }

  return true;
}

function tambahNotifikasiSistem(targetRoles, targetArea, message, noSurat = '') {
  if (!shouldEmitImportantNotification(targetRoles, targetArea, message, noSurat)) {
    return;
  }

  const notifs = getSystemNotifications();
  const normalizedRoles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
  const dedupeKey = `${String(noSurat || '').trim()}|${String(targetArea || 'ALL')}|${String(message || '').trim()}`;
  const alreadyExists = notifs.some(n => {
    const nKey = `${String(n.noSurat || '').trim()}|${String(n.targetArea || 'ALL')}|${String(n.message || '').trim()}`;
    return nKey === dedupeKey;
  });

  if (alreadyExists) return;

  const newNotif = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    targetRoles: normalizedRoles,
    targetArea: targetArea || 'ALL',
    message: message,
    noSurat: noSurat,
    time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`,
    readBy: []
  };
  notifs.unshift(newNotif);
  if (notifs.length > 100) notifs.pop();
  appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
  pushCentralCloudDB();
  updateNotifBellCounter();
}

function getAccessibleNotifications() {
  if (!currentUser) return [];
  const notifs = getSystemNotifications();
  const userCat = String(currentUser.category || '').toUpperCase();
  const userArea = String(currentUser.area || '').toUpperCase();
  const userUname = String(currentUser.username || '').toUpperCase();
  const userFullName = String(currentUser.fullName || '').toUpperCase();
  const isSysAdmin = userCat === 'ADMIN' || userUname === 'ADMIN';

  const requests = getRequestsFromDB();

  let filtered = notifs.filter(n => {
    if (!n) return false;

    if (isSysAdmin) return true;

    // 1. FILTER AREA PER LOGGED-IN ACCOUNT
    const targetArea = String(n.targetArea || 'ALL').toUpperCase();
    const areaMatch = (targetArea === 'ALL' || targetArea === userArea || userArea === 'ALL');
    if (!areaMatch) return false;

    // 2. FILTER ROLE / PER LOGIN CATEGORY
    const targetRoles = Array.isArray(n.targetRoles) ? n.targetRoles.map(r => String(r).toUpperCase()) : [];
    const roleMatch = (targetRoles.includes('ALL') || targetRoles.includes(userCat));
    if (!roleMatch) return false;

    // 3. STRICT TOKO / SALES FILTER: Only show notification if request belongs to this logged-in TOKO/SALES user
    if (userCat === 'TOKO' || userCat === 'SALES') {
      if (n.noSurat) {
        const req = requests.find(r => r.noSurat === n.noSurat);
        if (req) {
          const isMyRequest = (
            req.userId === currentUser.id ||
            String(req.createdBy || '').toUpperCase() === userUname ||
            String(req.createdBy || '').toUpperCase() === userFullName ||
            String(req.toko || '').toUpperCase() === userFullName
          );
          if (!isMyRequest) return false;
        }
      }
    }

    // 4. STRICT SERVICE AREA FILTER: Only show notifications for requests in currentUser's area
    if (userCat === 'SERVICE') {
      if (n.noSurat) {
        const req = requests.find(r => r.noSurat === n.noSurat);
        if (req && req.area && req.area.toUpperCase() !== userArea && userArea !== 'ALL') {
          return false;
        }
      }
    }

    return true;
  });

  // SINTESIS STATUS TRANSAKSI PENDING UNTUK USER TOKO / SALES ONLY
  if (userCat === 'TOKO' || userCat === 'SALES') {
    const tokoPendingReqs = requests.filter(r => {
      const isMine = (
        r.userId === currentUser.id ||
        String(r.createdBy || '').toUpperCase() === userUname ||
        String(r.createdBy || '').toUpperCase() === userFullName ||
        String(r.toko || '').toUpperCase() === userFullName
      );
      return isMine && r.status === 'PENDING';
    });

    tokoPendingReqs.forEach(r => {
      const exists = filtered.some(n => n.noSurat === r.noSurat);
      if (!exists) {
        const stageMsg = r.serviceApprove ? 'SEDANG MENUNGGU APPROVAL DM' : 'SEDANG MENUNGGU APPROVAL SERVICE';
        filtered.unshift({
          id: `NTF-TK-${r.noSurat}`,
          targetRoles: ['TOKO', 'SALES'],
          targetArea: r.area || userArea,
          message: `PERMINTAAN Anda #${r.noSurat} (${stageMsg}).`,
          noSurat: r.noSurat,
          time: r.tanggalInput || r.createdAt || getFormattedDateDDMMYYYY(),
          readBy: []
        });
      }
    });
  }

  return filtered;
}

let globalRealtimeLoopInterval = null;

function startGlobalRealtimeLoop() {
  if (globalRealtimeLoopInterval) return;

  globalRealtimeLoopInterval = setInterval(() => {
    if (!currentUser || (document.getElementById('loginPage') && document.getElementById('loginPage').classList.contains('active'))) return;

    // 1. UPDATE LONCENG NOTIFIKASI & ANGKA JUMLAH
    if (typeof updateNotifBellCounter === 'function') {
      updateNotifBellCounter();
    }

    // 2. UPDATE BADGE CHAT BANTUAN UNREAD
    if (typeof cekUnreadNotif === 'function') {
      cekUnreadNotif();
    }

    // 3. REFRESH LIST NOTIFIKASI JIKA POPUP NOTIF TERBUKA
    const popupNotifList = document.getElementById('popupNotifList');
    if (popupNotifList && (popupNotifList.classList.contains('show') || popupNotifList.style.display === 'flex')) {
      if (typeof loadNotificationList === 'function') {
        loadNotificationList();
      }
    }
  }, 3000);
}

function updateNotifBellCounter() {
  const bellBtn = document.getElementById('notifBellBtn');
  const badgeEl = document.getElementById('notifBellBadge');
  if (!bellBtn || !badgeEl) return;

  if (!currentUser || (document.getElementById('loginPage') && document.getElementById('loginPage').classList.contains('active'))) {
    bellBtn.style.display = 'none';
    return;
  }

  bellBtn.style.display = 'flex';

  const userNotifs = getAccessibleNotifications();
  const unreadCount = userNotifs.filter(n => {
    if (!n || !n.readBy) return true;
    return !n.readBy.includes(currentUser.id) && !n.readBy.includes(currentUser.username);
  }).length;

  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badgeEl.style.display = 'flex';
  } else {
    badgeEl.style.display = 'none';
  }
}

function bukaNotificationModal() {
  const popup = document.getElementById('popupNotifList');
  if (!popup) return;

  if (typeof loadNotificationList === 'function') {
    loadNotificationList();
  }

  popup.style.display = 'flex';
  popup.classList.add('show');
  
  if (typeof pushPopupHistoryState === 'function') {
    pushPopupHistoryState();
  }
}

function tutupNotificationModal() {
  const popup = document.getElementById('popupNotifList');
  if (!popup) return;
  popup.style.display = 'none';
  popup.classList.remove('show');
}

function loadNotificationList() {
  const container = document.getElementById('notifListBody');
  if (!container) return;
  container.innerHTML = '';

  const userNotifs = getAccessibleNotifications();

  if (userNotifs.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:12.5px;">BELUM ADA NOTIFIKASI MASUK.</div>`;
    return;
  }

  userNotifs.forEach(n => {
    const isRead = n.readBy.includes(currentUser.id) || n.readBy.includes(currentUser.username);
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: ${isRead ? 'var(--bg-box)' : 'var(--bg-header)'};
      cursor: pointer;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: background 0.2s;
    `;
    item.onclick = () => clickNotificationItem(n.id, n.noSurat);

    item.innerHTML = `
      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isRead ? '#64748b' : '#0284c7'}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
        <span class="material-symbols-rounded" style="font-size: 18px;">notifications</span>
      </div>
      <div style="flex: 1;">
        <div style="font-size: 12.5px; font-weight: ${isRead ? '500' : '700'}; color: var(--text-main); line-height: 1.4;">
          ${n.message}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 10px; color: var(--text-muted);">
          <span>${n.time}</span>
          ${n.noSurat ? `<span style="color: var(--primary); font-weight: 600;">#${n.noSurat}</span>` : ''}
        </div>
      </div>
      ${!isRead ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; margin-top: 6px; flex-shrink: 0;"></div>` : ''}
    `;
    container.appendChild(item);
  });
}

function clickNotificationItem(notifId, noSurat) {
  markNotifAsRead(notifId, noSurat);

  const notifListPopup = document.getElementById('popupNotifList');
  if (notifListPopup) {
    notifListPopup.style.display = 'none';
    notifListPopup.classList.remove('show');
  }

  if (noSurat) {
    setTimeout(() => {
      lihatDetail(noSurat, true);
    }, 150);
  }
}

function markNotifAsRead(notifId, noSurat = '') {
  let notifs = getSystemNotifications();
  const idx = notifs.findIndex(n => n.id === notifId);

  const targetNoSurat = noSurat || (idx !== -1 ? notifs[idx].noSurat : '');
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === targetNoSurat);

  // JIKA STATUS PERMINTAAN SUDAH APPROVE, REJECT, ATAU DONE -> OTOMATIS HAPUS DARI PENYIMPANAN LOKAL & DATABASE CLOUD
  if (req && (req.status === 'APPROVE' || req.status === 'REJECT' || req.status === 'DONE')) {
    notifs = notifs.filter(n => n.id !== notifId && n.noSurat !== targetNoSurat);
    appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    updateNotifBellCounter();
    return;
  }

  if (idx !== -1) {
    if (!notifs[idx].readBy.includes(currentUser.id)) {
      notifs[idx].readBy.push(currentUser.id);
    }
    if (!notifs[idx].readBy.includes(currentUser.username)) {
      notifs[idx].readBy.push(currentUser.username);
    }
    appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    updateNotifBellCounter();
  }
}

function markAllNotifAsRead() {
  if (!currentUser) return;
  const notifs = getSystemNotifications();
  notifs.forEach(n => {
    if (!n.readBy.includes(currentUser.id)) n.readBy.push(currentUser.id);
    if (!n.readBy.includes(currentUser.username)) n.readBy.push(currentUser.username);
  });
  appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
  updateNotifBellCounter();
  loadNotificationList();
  showNotif('SEMUA NOTIFIKASI DITANDAI DIBACA!', 'info');
}

function generateStoreCode(namaToko) {
  if (!namaToko) return 'TK';
  const words = namaToko.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(w => w !== 'TOKO' && w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  } else {
    const clean = namaToko.toUpperCase().replace(/[^A-Z]/g, '');
    return (clean.length >= 2 ? clean.substring(0, 2) : 'TK');
  }
}

function getStoresFromDB() {
  const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
  const deletedStoreKeys = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
  const safeDeletedKeys = Array.isArray(deletedStoreKeys) ? deletedStoreKeys : [];
  const users = getUsersFromDB();
  const userStores = users.filter(u => u && u.category === 'TOKO').map(u => ({
    id: u.id,
    fullName: u.fullName || 'TOKO',
    area: u.area || '',
    storeCode: u.storeCode || generateStoreCode(u.fullName || '')
  }));

  const map = new Map();
  userStores.forEach(s => {
    if (s && s.fullName) {
      const key = `${String(s.fullName).toUpperCase()}_${String(s.area || '').toUpperCase()}`;
      map.set(key, s);
    }
  });

  if (Array.isArray(localStores)) {
    localStores.forEach(s => {
      if (s && s.fullName) {
        const key = `${String(s.fullName).toUpperCase()}_${String(s.area || '').toUpperCase()}`;
        map.set(key, s);
      }
    });
  }

  const allStores = Array.from(map.values());
  return allStores.filter(s => {
    if (!s || !s.fullName) return false;
    const key = `${String(s.fullName).toUpperCase()}_${String(s.area || '').toUpperCase()}`;
    return !safeDeletedKeys.includes(key);
  });
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
  BDG: 'BANDUNG (BDG)',
  BDU: 'BANDUNG UTARA (BDU)',
  CRB: 'CIREBON (CRB)',
  SKB: 'SUKABUMI (SKB)',
  SBN: 'SUBANG (SBN)',
  TSM: 'TASIKMALAYA (TSM)'
};

const KODE_UNIT_MAP = {};

const SEED_USERS = [
  {
    id: 'USR-ADMIN',
    username: 'ADMIN',
    password: '0',
    fullName: 'SUPER ADMIN',
    phone: '',
    category: 'ADMIN',
    area: 'TSM',
    createdAt: '31/07/2026'
  }
];

const SEED_REQUESTS = [];

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
let viewerPhotos = [];
let viewerCurrentIndex = 0;

function getFormattedDateDDMMYYYY(dObj = new Date()) {
  const d = (dObj instanceof Date && !isNaN(dObj.getTime())) ? dObj : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateDDMMYYYYString(input) {
  if (!input) return '-';
  const str = String(input).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    return str.split(' ')[0];
  }
  const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
}

function getRequestsFromDB() {
  return JSON.parse(appStorage.getItem(REQUESTS_DB_KEY) || '[]');
}

function saveRequestsToDB(requests) {
  appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
  if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB();
  }
}

function getUsersFromDB() {
  return JSON.parse(appStorage.getItem(USERS_DB_KEY) || '[]');
}

function saveUsersToDB(users) {
  appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB();
  }
}

// APP INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  try {
    closeAllPopups();

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
      if (typeof startGlobalRealtimeLoop === 'function') startGlobalRealtimeLoop();
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

function initPullToRefresh() {
  // PULL DOWN REFRESH DISABLED PER USER DIRECTIVE
}

function getAdminReminderEnabled() {
  const val = appStorage.getItem(ADMIN_REMINDER_KEY);
  return val !== 'false';
}

function toggleAdminReminderFeature() {
  const current = getAdminReminderEnabled();
  const next = !current;
  appStorage.setItem(ADMIN_REMINDER_KEY, next ? 'true' : 'false');
  updateAdminReminderUI();
  pushCentralCloudDB();
  showNotif(next ? 'REMINDER PENDING SERVICE & DM SEKARANG AKTIF (ON)!' : 'REMINDER PENDING SERVICE & DM NONAKTIF (OFF)!', 'info');
  if (next) {
    checkAndTriggerPendingReminders();
  }
}
window.toggleAdminReminderFeature = toggleAdminReminderFeature;

const ADMIN_REMINDER_TIME_KEY = 'STORE_ADMIN_REMINDER_TIME_KEY_V7';

function getAdminReminderTime() {
  return appStorage.getItem(ADMIN_REMINDER_TIME_KEY) || '09:00';
}

function simpanAdminReminderTime() {
  const input = document.getElementById('adminReminderTimeInput');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    appStorage.setItem(ADMIN_REMINDER_TIME_KEY, val);
    pushCentralCloudDB();
    showNotif(`JADWAL JAM WA REMINDER DISIMPAN: ${val}!`, 'info');
  }
}
window.simpanAdminReminderTime = simpanAdminReminderTime;

function loadAdminReminderTimeInput() {
  const input = document.getElementById('adminReminderTimeInput');
  if (input) {
    input.value = getAdminReminderTime();
  }
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
  if (container) {
    container.style.display = (currentUser && currentUser.category === 'ADMIN') ? 'flex' : 'none';
  }
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

  if (hasNewReminder) {
    updateNotifBellCounter();
  }
}

let cloudSyncInterval = null;

function onSupabaseDataChange(keyChanged) {
  if (!currentUser) return;

  const activePage = document.querySelector('.page.active');
  const pageId = activePage ? activePage.id : '';

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
      if (typeof loadChatUser === 'function') {
        loadChatUser();
      }
    }
  }

  const notifListPopup = document.getElementById('popupNotifList');
  if (notifListPopup && notifListPopup.classList.contains('show')) {
    if (typeof loadNotificationList === 'function') loadNotificationList();
  }
}

function bersihkanCacheAplikasiWeb() {
  if (typeof caches !== 'undefined' && caches.keys) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    }).catch(() => {});
  }
}

// DEFAULT FIREBASE ONLINE CONFIGURATION (PERMINTAAN TOKO - REAL LIVE DATABASE)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDrn_Wx2FAaVGfoIjiWyRjdAKpUw0M50SU",
  authDomain: "sementara-9985d.firebaseapp.com",
  projectId: "sementara-9985d",
  storageBucket: "sementara-9985d.firebasestorage.app",
  messagingSenderId: "837199245948",
  appId: "1:837199245948:web:92b4b2483380b393270ff9",
  measurementId: "G-5NE511H1S5"
};

let firebaseApp = null;
let dbFirestore = null;
let dbRealtime = null;

function getActiveFirebaseConfig() {
  return DEFAULT_FIREBASE_CONFIG;
}

function initFirebaseDB() {
  try {
    if (typeof firebase !== 'undefined') {
      const activeConfig = getActiveFirebaseConfig();
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(activeConfig);
      } else {
        firebaseApp = firebase.app();
      }

      // FIRESTORE ENGINE (UTAMA)
      if (typeof firebase.firestore === 'function') {
        try {
          dbFirestore = firebase.firestore();

          dbFirestore.collection('requests').onSnapshot(snapshot => {
            if (!snapshot.empty) {
              const reqs = [];
              snapshot.forEach(doc => reqs.push(doc.data()));
              if (reqs.length > 0) {
                appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(reqs));
                if (typeof currentUser !== 'undefined' && currentUser) {
                  if (typeof loadDashboard === 'function') loadDashboard();
                  if (typeof loadRiwayat === 'function') loadRiwayat();
                }
              }
            }

            const dot = document.getElementById('firebaseOnlineDot');
            if (dot) {
              dot.style.background = '#10b981';
              dot.style.boxShadow = '0 0 10px #10b981';
              dot.title = `FIREBASE DATABASE ONLINE: TERHUBUNG (${activeConfig.projectId})`;
            }
          }, err => {
            console.warn("[FIRESTORE NOTICE]:", err.message);
          });

          // REAL-TIME SNAPSHOT LISTENER UNTUK CHAT & SETTINGS PUSAT
          dbFirestore.collection('app_settings').doc('config').onSnapshot(doc => {
            if (doc.exists) {
              const cfg = doc.data() || {};
              if (cfg.notifications) appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(cfg.notifications));
              if (cfg.chatMessages) appStorage.setItem(CHAT_DB_KEY, JSON.stringify(cfg.chatMessages));
              if (cfg.chatRooms) appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(cfg.chatRooms));
              if (cfg.theme) {
                appStorage.setItem(THEME_KEY, cfg.theme);
                if (typeof loadSavedTheme === 'function') loadSavedTheme();
              }
              if (cfg.fonteToken) appStorage.setItem(FONTE_TOKEN_KEY, cfg.fonteToken);
              if (cfg.kodeUnitMap) {
                const existingMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
                const mergedMap = { ...existingMap, ...cfg.kodeUnitMap };
                appStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(mergedMap));
              }
              if (cfg.firebaseConfig) {
                const curLocal = appStorage.getItem(FIREBASE_USER_CONFIG_KEY);
                const newStr = typeof cfg.firebaseConfig === 'string' ? cfg.firebaseConfig : JSON.stringify(cfg.firebaseConfig);
                if (curLocal !== newStr && newStr !== 'null') {
                  appStorage.setItem(FIREBASE_USER_CONFIG_KEY, newStr);
                  if (typeof loadFirebaseConfigInput === 'function') loadFirebaseConfigInput();
                  initFirebaseDB();
                }
              }

              if (typeof refreshActiveChatUI === 'function') {
                refreshActiveChatUI();
              }
            }
          }, err => {
            console.warn("[FIRESTORE CONFIG SNAPSHOT NOTICE]:", err.message);
          });

          // JIKA FIRESTORE BERHASIL DIINISIALISASI, SET BULAT HIJAU
          const dot = document.getElementById('firebaseOnlineDot');
          if (dot) {
            dot.style.background = '#10b981';
            dot.style.boxShadow = '0 0 10px #10b981';
            dot.title = `FIREBASE DATABASE ONLINE: TERHUBUNG (${activeConfig.projectId})`;
          }
        } catch (e) {
          console.warn("[FIRESTORE INIT NOTICE]:", e.message);
        }
      }

      // REALTIME DATABASE (JIKA ADANYA CONFIG DATABASEURL)
      if (activeConfig.databaseURL && typeof firebase.database === 'function') {
        try {
          dbRealtime = firebase.database();
        } catch (e) {
          dbRealtime = null;
        }
      }

      const statusBadge = document.getElementById('firebaseStatusBadge');
      if (statusBadge) {
        statusBadge.textContent = `STATUS: TERHUBUNG KE FIREBASE ONLINE (${activeConfig.projectId})`;
        statusBadge.style.color = '#10b981';
      }

      console.log(`[FIREBASE ONLINE ENGINE]: Connected to ${activeConfig.projectId}`);
    }
  } catch (err) {
    const dot = document.getElementById('firebaseOnlineDot');
    if (dot) {
      dot.style.background = '#ef4444';
      dot.style.boxShadow = '0 0 10px #ef4444';
      dot.title = 'FIREBASE DATABASE ONLINE: TERPUTUS / DISKONEK';
    }
    console.warn("[FIREBASE ENGINE NOTICE]:", err.message);
  }
}

function loadFirebaseConfigInput() {
  const input = document.getElementById('firebaseConfigJsonInput');
  if (!input) return;
  const saved = appStorage.getItem(FIREBASE_USER_CONFIG_KEY);
  if (saved) {
    input.value = saved;
  } else {
    input.value = JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
  }
}

function simpanFirebaseConfigUser() {
  const input = document.getElementById('firebaseConfigJsonInput');
  const val = input ? input.value.trim() : '';

  if (!val) {
    appStorage.removeItem(FIREBASE_USER_CONFIG_KEY);
    showNotif('KONFIGURASI FIREBASE DI-RESET KE DEFAULT!', 'info');
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    initFirebaseDB();
    return;
  }

  try {
    const parsed = JSON.parse(val);
    if (!parsed.projectId) {
      showNotif('INVALID CONFIG! PROJECT ID TIDAK DITEMUKAN.', 'warning');
      return;
    }
    appStorage.setItem(FIREBASE_USER_CONFIG_KEY, JSON.stringify(parsed));
    showNotif('BERHASIL MENYIMPAN & MENSINKRONKAN KE SEMUA PERANGKAT!', 'success');
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    initFirebaseDB();
  } catch (e) {
    showNotif('FORMAT JSON KONFIGURASI FIREBASE TIDAK VALID!', 'error');
  }
}

function startCentralCloudSyncEngine() {
  initFirebaseDB();
  if (typeof setOnDataChangeCallback === 'function') {
    setOnDataChangeCallback(onSupabaseDataChange);
  }
  if (cloudSyncInterval) {
    clearInterval(cloudSyncInterval);
    cloudSyncInterval = null;
  }
}

async function syncAllDataToCache() {
  try {
    if (typeof pushToSupabaseNow === 'function') {
      await pushToSupabaseNow();
    }

    if (dbFirestore) {
      try {
        // 1. SYNC REQUESTS DATA
        const reqSnapshot = await dbFirestore.collection('requests').get();
        if (!reqSnapshot.empty) {
          const reqs = [];
          reqSnapshot.forEach(doc => reqs.push(doc.data()));
          if (reqs.length > 0) {
            appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(reqs));
          }
        }

        // 2. SYNC USERS MASTER DATA
        const userSnapshot = await dbFirestore.collection('users').get();
        if (!userSnapshot.empty) {
          const usrs = [];
          userSnapshot.forEach(doc => usrs.push(doc.data()));
          if (usrs.length > 0) {
            appStorage.setItem(USERS_DB_KEY, JSON.stringify(usrs));
          }
        }

        // 3. SYNC APP SETTINGS, NOTIFICATIONS, CHATS, ROOMS, THEMES, TOKENS
        const configDoc = await dbFirestore.collection('app_settings').doc('config').get();
        if (configDoc.exists) {
          const cfg = configDoc.data() || {};
          if (cfg.notifications) appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(cfg.notifications));
          if (cfg.chatMessages) appStorage.setItem(CHAT_DB_KEY, JSON.stringify(cfg.chatMessages));
          if (cfg.chatRooms) appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(cfg.chatRooms));
          if (cfg.theme) {
            appStorage.setItem(THEME_KEY, cfg.theme);
            if (typeof loadSavedTheme === 'function') loadSavedTheme();
          }
          if (cfg.fonteToken) appStorage.setItem(FONTE_TOKEN_KEY, cfg.fonteToken);
          if (cfg.adminReminder !== undefined) appStorage.setItem(ADMIN_REMINDER_KEY, String(cfg.adminReminder));
          if (cfg.adminReminderTime) appStorage.setItem(ADMIN_REMINDER_TIME_KEY, cfg.adminReminderTime);
          if (cfg.featurePhotos !== undefined) appStorage.setItem(FEATURE_PHOTOS_KEY, String(cfg.featurePhotos));
          if (cfg.kodeUnitMap) {
            const existingMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
            const mergedMap = { ...existingMap, ...cfg.kodeUnitMap };
            appStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(mergedMap));
          }
        }
      } catch (err) {
        console.warn("[FIREBASE SYNC NOTICE]:", err.message);
      }
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
}

async function pushCentralCloudDB() {
  try {
    if (dbFirestore) {
      try {
        // 1. PUSH REQUESTS
        const requests = getRequestsFromDB();
        const reqBatch = dbFirestore.batch();
        requests.forEach(r => {
          if (r && r.noSurat) {
            const docId = r.noSurat.replace(/[\/\.]/g, '_');
            const docRef = dbFirestore.collection('requests').doc(docId);
            reqBatch.set(docRef, r, { merge: true });
          }
        });
        await reqBatch.commit();

        // 2. PUSH USERS MASTER DATA
        const users = getUsersFromDB();
        const userBatch = dbFirestore.batch();
        users.forEach(u => {
          if (u && u.username) {
            const docId = String(u.username).toUpperCase();
            const docRef = dbFirestore.collection('users').doc(docId);
            userBatch.set(docRef, u, { merge: true });
          }
        });
        await userBatch.commit();

        // 3. PUSH APP CONFIG, NOTIFICATIONS, CHAT MESSAGES, CHAT ROOMS, THEME, FONTE TOKEN, KODE UNIT MAP
        const notifs = getSystemNotifications();
        const chatMsgs = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
        const chatRooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
        const theme = appStorage.getItem(THEME_KEY) || 'dark-mode';
        const fonteToken = getFonteToken();
        const adminReminder = getAdminReminderEnabled();
        const adminReminderTime = getAdminReminderTime();
        const featurePhotos = getFeaturePhotosEnabled();
        const kodeUnitMap = getKodeUnitMap();

        const firebaseCfgStr = appStorage.getItem(FIREBASE_USER_CONFIG_KEY);
        let parsedFbCfg = null;
        try { if (firebaseCfgStr) parsedFbCfg = JSON.parse(firebaseCfgStr); } catch(e) {}

        await dbFirestore.collection('app_settings').doc('config').set({
          notifications: notifs,
          chatMessages: chatMsgs,
          chatRooms: chatRooms,
          theme: theme,
          fonteToken: fonteToken,
          adminReminder: adminReminder,
          adminReminderTime: adminReminderTime,
          featurePhotos: featurePhotos,
          kodeUnitMap: kodeUnitMap,
          firebaseConfig: parsedFbCfg,
          updatedAt: new Date().toISOString()
        }, { merge: true });

      } catch (err) {
        console.warn("[FIREBASE PUSH NOTICE]:", err.message);
      }
    }

    if (dbRealtime) {
      try {
        const requests = getRequestsFromDB();
        const users = getUsersFromDB();
        const notifs = getSystemNotifications();
        const chatMsgs = JSON.parse(appStorage.getItem(CHAT_MESSAGES_KEY) || '[]');

        dbRealtime.ref('requests').set(requests);
        dbRealtime.ref('users').set(users);
        dbRealtime.ref('notifications').set(notifs);
        dbRealtime.ref('chat_messages').set(chatMsgs);
        dbRealtime.ref('settings').set({
          theme: appStorage.getItem(THEME_KEY) || 'dark-mode',
          fonteToken: getFonteToken(),
          adminReminder: getAdminReminderEnabled(),
          adminReminderTime: getAdminReminderTime(),
          featurePhotos: getFeaturePhotosEnabled()
        });
      } catch (err) {
        console.warn("[FIREBASE REALTIME PUSH NOTICE]:", err.message);
      }
    }

    await syncAllDataToCache();
  } finally {
    setTimeout(() => {
      hideLoading();
    }, 300);
  }
}

function updateCloudStatusUI(isOnline) {
  if (typeof updateSupabaseStatusUI === 'function') {
    updateSupabaseStatusUI(isOnline);
  }
}

function getFeaturePhotosEnabled() {
  const val = appStorage.getItem(FEATURE_PHOTOS_KEY);
  return val !== 'false';
}

function setFeaturePhotosEnabled(enabled) {
  appStorage.setItem(FEATURE_PHOTOS_KEY, enabled ? 'true' : 'false');
  updatePhotoSectionVisibility();
  pushCentralCloudDB();
}

function toggleFeaturePhotoAdmin() {
  const current = getFeaturePhotosEnabled();
  const next = !current;
  setFeaturePhotosEnabled(next);
  showNotif(next ? 'FITUR UPLOAD FOTO SEKARANG AKTIF (ON)!' : 'FITUR UPLOAD FOTO NONAKTIF (OFF)!', 'info');
}

function updatePhotoSectionVisibility() {
  const section = document.getElementById('sectionUploadFoto');
  const isEnabled = getFeaturePhotosEnabled();

  if (section) {
    section.style.display = isEnabled ? 'block' : 'none';
  }

  const statusText = document.getElementById('photoFeatureStatusText');
  if (statusText) {
    statusText.textContent = isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }

  const adminCard = document.getElementById('adminPhotoControlContainer');
  if (adminCard) {
    adminCard.style.display = (currentUser && (currentUser.category === 'ADMIN' || currentUser.username === 'ADMIN')) ? 'flex' : 'none';
  }

  if (typeof loadRiwayat === 'function' && document.getElementById('riwayatPage')?.classList.contains('active')) {
    loadRiwayat();
  }
}

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
      ...user,
      username,
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
  if (!force) {
    console.warn('clearAllAppCacheAndData blocked: destructive reset disabled to protect active app data.');
    return false;
  }

  try {
    if (window.appStorage) {
      window.appStorage.clear();
    }
  } catch (err) {}

  try {
    const keysToRemove = Object.keys(localStorage || {});
    keysToRemove.forEach(key => {
      if (String(key).startsWith('STORE_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {}

  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then(names => names.forEach(n => caches.delete(n))).catch(() => {});
    }
  } catch (err) {}

  const sessionKeys = [
    SESSION_KEY, THEME_KEY, USERS_DB_KEY, REQUESTS_DB_KEY, CHAT_DB_KEY, CHAT_ROOM_DB_KEY,
    TTD_DB_KEY, STORES_DB_KEY, DELETED_STORES_KEY, NOTIFICATIONS_DB_KEY, KODE_UNIT_MAP_KEY,
    FEATURE_PHOTOS_KEY, DELETED_REQUESTS_KEY, DELETED_USERS_KEY, FONTE_TOKEN_KEY,
    ADMIN_REMINDER_KEY, ADMIN_SECRET_KEY_STORAGE_KEY, ADMIN_SCRIPT_URL_KEY
  ];

  sessionKeys.forEach(key => {
    try { localStorage.removeItem(key); } catch (err) {}
    try { window.appStorage?.removeItem?.(key); } catch (err) {}
  });

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

function getAdminScriptUrl() {
  return (appStorage.getItem(ADMIN_SCRIPT_URL_KEY) || '').trim();
}

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
  const currentTheme = localStorage.getItem(THEME_KEY);
  if (currentTheme) {
    document.body.className = currentTheme;
  }
  if (typeof updatePhotoSectionVisibility === 'function') {
    updatePhotoSectionVisibility();
  }
}

function getUsersFromDB() {
  let users = [];
  try {
    users = JSON.parse(appStorage.getItem(USERS_DB_KEY) || '[]');
  } catch (e) {
    users = [];
  }

  users = normalizeUserList(users);

  const defaultUsernamesToRemove = ['SERVICE_TSM', 'DM_TSM', 'TOKO_1', 'SALES_1'];
  let updated = false;

  users = users.filter(u => {
    if (u && u.username && defaultUsernamesToRemove.includes(String(u.username).toUpperCase())) {
      updated = true;
      return false;
    }
    return true;
  });

  const adminIndex = users.findIndex(u => u && u.username && String(u.username).toUpperCase() === 'ADMIN');
  if (adminIndex !== -1) {
    if (users[adminIndex].password !== '0') {
      users[adminIndex].password = '0';
      updated = true;
    }
  } else {
    users.push({ ...SEED_USERS[0] });
    updated = true;
  }

  if (updated || !users.length) {
    users = normalizeUserList(users.length ? users : [...SEED_USERS]);
    appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }

  return users;
}

function saveUsersToDB(users) {
  const normalizedUsers = normalizeUserList(Array.isArray(users) ? users : []);
  appStorage.setItem(USERS_DB_KEY, JSON.stringify(normalizedUsers));
  pushCentralCloudDB();
  if (currentUser) {
    loadDashboard();
    loadRiwayat();
    if (document.getElementById('userTableBody')) loadUsersManagement();
  }
}

function getRequestsFromDB() {
  return JSON.parse(appStorage.getItem(REQUESTS_DB_KEY) || '[]');
}

function saveRequestsToDB(requests) {
  appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
  pushCentralCloudDB();
  if (currentUser) {
    loadDashboard();
    loadRiwayat();
  }
}

function getFonteToken() {
  return appStorage.getItem(FONTE_TOKEN_KEY) || '';
}

function simpanFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  const token = input ? input.value.trim() : '';
  appStorage.setItem(FONTE_TOKEN_KEY, token);
  pushCentralCloudDB();
  showNotif(token ? 'TOKEN WA FONTE BERHASIL DISIMPAN!' : 'TOKEN WA DIKOSONGKAN!', 'info');
}

function loadFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  if (input) {
    input.value = getFonteToken();
  }
}

function kirimNotifikasiWA(targetPhone, message) {
  if (!targetPhone || targetPhone === '-') return false;

  const token = getFonteToken();
  if (!token) {
    console.log(`[WA NOTIF SIMULATED - TOKEN BELUM DIISI] To: ${targetPhone} Msg: ${message}`);
    return false;
  }

  let cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
  if (!cleanPhone) return false;
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('62')) {
    cleanPhone = '62' + cleanPhone;
  }

  const formData = new FormData();
  formData.append('target', cleanPhone);
  formData.append('message', message);
  formData.append('countryCode', '62');

  fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      'Authorization': token
    },
    body: formData
  }).then(res => res.json()).then(data => {
    console.log('[FONTE WA API RESPONSE]:', data);
  }).catch(err => {
    console.error('[FONTE WA API ERROR]:', err);
  });

  return true;
}

function loadSavedTheme() {
  const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('APP_SELECTED_THEME') : null) || appStorage.getItem(THEME_KEY) || 'dark-mode';
  document.body.className = saved;
  const idx = THEME_MODES.findIndex(t => t.id === saved);
  currentThemeIndex = idx !== -1 ? idx : 0;
  updateThemeIcon();
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEME_MODES.length;
  const t = THEME_MODES[currentThemeIndex];
  document.body.className = t.id;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('APP_SELECTED_THEME', t.id);
    }
  } catch(e) {}
  appStorage.setItem(THEME_KEY, t.id);
  updateThemeIcon();
  pushCentralCloudDB();
}

function updateThemeIcon() {
  const iconSpans = document.querySelectorAll('.theme-toggle-btn span, .popupThemeToggleBtn span, .theme-icon-btn span, .theme-toggle-inline span');
  const currentIcon = THEME_MODES[currentThemeIndex] ? THEME_MODES[currentThemeIndex].icon : 'palette';
  iconSpans.forEach(el => {
    if (el) el.textContent = currentIcon;
  });
}

const STORE_REMEMBER_LOGIN_CREDS_KEY = 'STORE_REMEMBER_LOGIN_CREDS_V1';

function autoLogin() {
  if (!currentUser) {
    try {
      const savedSession = appStorage.getItem(SESSION_KEY);
      if (savedSession) {
        currentUser = JSON.parse(savedSession);
      }
    } catch (e) {
      currentUser = null;
    }
  }

  if (typeof currentUser !== 'undefined' && currentUser !== null) {
    bukaMainApp();
  } else {
    pindahHalaman('loginPage');
    
    // PRE-FILL USERNAME & PASSWORD HANYA JIKA INGAT SANDI DILAKUKAN DI PENYIMPANAN LOKAL
    const savedCredsStr = appStorage.getItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
    if (savedCredsStr) {
      try {
        const creds = JSON.parse(savedCredsStr);
        const uEl = document.getElementById('username');
        const pEl = document.getElementById('password');
        const remEl = document.getElementById('rememberMe');
        if (uEl && creds.username) uEl.value = creds.username;
        if (pEl && creds.password) pEl.value = creds.password;
        if (remEl) remEl.checked = true;
      } catch(e) {}
    }
  }
}

async function prosesLogin() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (!uEl || !pEl) return;

  const u = uEl.value.trim().toUpperCase();
  const p = pEl.value.trim();
  const remember = document.getElementById('rememberMe')?.checked === true;

  if (!u || !p) {
    showNotif('USERNAME DAN PASSWORD WAJIB DIISI!', 'warning');
    return;
  }

  showLoading('MEMPROSES LOGIN...');

  try {
    let users = getUsersFromDB();
    let user = users.find(x => x && x.username && String(x.username).trim().toUpperCase() === u && String(x.password).trim() === p);

    // JIKA USER TIDAK DITEMUKAN PADA CACHE LOKAL (MISAL SETELAH REFRESH HALAMAN SEBELUM CLOUD SYNC SELESAI),
    // SINKRONKAN DENGAN DATABASE CLOUD TERLEBIH DAHULU SEBELUM MENAMPILKAN PASSWORD SALAH
    if (!user && typeof syncAllDataToCache === 'function') {
      try {
        await syncAllDataToCache();
        users = getUsersFromDB();
        user = users.find(x => x && x.username && String(x.username).trim().toUpperCase() === u && String(x.password).trim() === p);
      } catch (e) {}
    }

    if (user) {
      currentUser = user;

      if (remember) {
        appStorage.setItem(SESSION_KEY, JSON.stringify(user));
        appStorage.setItem(STORE_REMEMBER_LOGIN_CREDS_KEY, JSON.stringify({ username: u, password: p }));
      } else {
        appStorage.removeItem(SESSION_KEY);
        appStorage.removeItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
      }

      catatLogLogin(user.username, user.fullName, user.area, 'BERHASIL');
      bukaMainApp();

      if (typeof syncAllDataToCache === 'function') {
        syncAllDataToCache().catch(() => {});
      }

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
    showNotif('GAGAL MEMPROSES LOGIN!', 'error');
  } finally {
    hideLoading();
  }
}
window.prosesLogin = prosesLogin;

async function catatLogLogin(username, nama, area, status) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      await supabaseClient.from('log_login').insert([{
        username: username,
        nama_lengkap: nama,
        area: area,
        status: status
      }]);
    } catch (e) {}
  }
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
    appStorage.removeItem(SESSION_KEY);
    
    // TIDAK MENGHAPUS CREDS JIKA USER MEMANG PERNAH MENYIMPAN INGAT SANDI, ATAU SESUAIKAN DENGAN FORM
    const remEl = document.getElementById('rememberMe');
    if (!remEl || !remEl.checked) {
      appStorage.removeItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
      const uEl = document.getElementById('username');
      const pEl = document.getElementById('password');
      if (uEl) uEl.value = '';
      if (pEl) pEl.value = '';
    }

    tutupAkun();
    tutupNotificationModal();
    const popupBantuan = document.getElementById('popupBantuan');
    if (popupBantuan) popupBantuan.classList.remove('show');
    const bottomMenu = document.getElementById('bottomMenu');
    if (bottomMenu) bottomMenu.style.display = 'none';
    const helpBtn = document.getElementById('helpButton');
    if (helpBtn) helpBtn.style.display = 'none';
    
    pindahHalaman('loginPage');
    if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    
    showNotif('BERHASIL LOGOUT', 'success');
  });
}

function bukaMainApp() {
  const loginPage = document.getElementById('loginPage');
  if (loginPage) loginPage.classList.remove('active');
  
  const bottomMenu = document.getElementById('bottomMenu');
  if (bottomMenu) bottomMenu.style.display = 'flex';
  
  if (typeof initAllDraggableButtons === 'function') initAllDraggableButtons();

  const isAdmin = (
    currentUser.category === 'ADMIN' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  );
  
  const btnUserNav = document.getElementById('btnUserNav');
  const btnMasterDbNav = document.getElementById('btnMasterDbNav');

  if (btnUserNav) btnUserNav.style.display = isAdmin ? 'flex' : 'none';
  if (btnMasterDbNav) btnMasterDbNav.style.display = isAdmin ? 'flex' : 'none';

  isAdminChat = typeof isServiceTSMUser === 'function' ? isServiceTSMUser() : (isAdmin || currentUser.category === 'SERVICE');

  pindahHalaman('dashboardPage');

  setTimeout(() => {
    if (typeof aturTampilanLonceng === 'function') {
      aturTampilanLonceng('dashboardPage');
    }
  }, 100);

  setTimeout(() => {
    if (typeof aturTampilanLonceng === 'function') {
      aturTampilanLonceng('dashboardPage');
    }
  }, 400);

  if (typeof setOnDataChangeCallback === 'function' && typeof onSupabaseDataChange === 'function') {
    setOnDataChangeCallback(onSupabaseDataChange);
  }

  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
  if (typeof startGlobalRealtimeLoop === 'function') startGlobalRealtimeLoop();
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
  const dotEl = document.getElementById('firebaseOnlineDot');

  const activePage = pageId || (typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage');
  const isLoggedIn = (typeof currentUser !== 'undefined' && currentUser !== null && !document.getElementById('loginPage')?.classList.contains('active'));
  const isDashboard = isLoggedIn && (activePage === 'dashboardPage');

  if (notifBtn) {
    notifBtn.style.display = isDashboard ? 'flex' : 'none';
  }
  
  if (helpBtn) {
    helpBtn.style.display = isDashboard ? 'flex' : 'none';
  }

  if (dotEl) {
    dotEl.style.display = isDashboard ? 'block' : 'none';
  }

  if (isLoggedIn) {
    updateNotifBellCounter();
    if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  }
}

let mobileBackspaceCount = 0;
let mobileBackspaceTimer = null;

function pushPopupHistoryState() {
  try {
    history.pushState({ modalOpen: true, page: getCurrentActivePageId() }, '', location.href);
  } catch (e) {}
}

function initMobileBackButtonEngine() {
  try {
    history.pushState({ page: 'dashboardPage' }, '', location.href);
  } catch(e) {}

  window.addEventListener('popstate', (e) => {
    const popTTD = document.getElementById('popupTTD');
    const isTtdOpen = popTTD && (popTTD.classList.contains('show') || popTTD.style.display === 'flex' || popTTD.style.display === 'block');

    // JIKA POPUP TTD TERBUKA & DI-BACK DARI HP -> KEMBALI KE POPUP AKUN
    if (isTtdOpen) {
      if (typeof tutupTTD === 'function') tutupTTD();
      if (typeof bukaAkun === 'function') bukaAkun();
      try { history.pushState({ page: getCurrentActivePageId() }, '', location.href); } catch(err) {}
      if (typeof aturTampilanLonceng === 'function') aturTampilanLonceng(getCurrentActivePageId());
      return;
    }

    const openModals = [
      document.getElementById('popupDetail'),
      document.getElementById('popupNotifList'),
      document.getElementById('popupBantuan'),
      document.getElementById('popupAkun'),
      document.getElementById('popupUserForm'),
      document.getElementById('pdfModal'),
      document.getElementById('rejectOverlay'),
      document.getElementById('popupTambahToko'),
      document.getElementById('popupPdfModelsModal'),
      document.getElementById('confirmOverlay'),
      document.getElementById('imageViewer'),
      document.getElementById('scannerModal')
    ];

    let closedAnyModal = false;
    openModals.forEach(m => {
      if (m && (m.classList.contains('show') || m.style.display === 'flex' || m.style.display === 'block')) {
        m.classList.remove('show');
        m.style.display = 'none';
        closedAnyModal = true;
      }
    });

    if (closedAnyModal) {
      if (typeof tutupScanner === 'function') tutupScanner();
      if (typeof tutupImageViewer === 'function') tutupImageViewer();
      
      // JAGA AGAR TOMBOL ICON HEADER (LONCENG & BANTUAN) TETAP TERSEDIA DI DASHBOARD
      const activePage = getCurrentActivePageId();
      if (typeof aturTampilanLonceng === 'function') {
        aturTampilanLonceng(activePage);
      }

      try { history.pushState({ page: activePage }, '', location.href); } catch(err) {}
      return;
    }

    const currentActivePage = getCurrentActivePageId();

    if (currentActivePage === 'inputPage' && typeof modeEdit !== 'undefined' && modeEdit) {
      try { history.pushState({ page: 'inputPage' }, '', location.href); } catch(err) {}
      
      showConfirm('KELUAR DARI MENU EDIT?', () => {
        if (typeof bersihkanForm === 'function') bersihkanForm();
        closeAllPopups();
        pindahHalaman('dashboardPage');
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
      window.mobileBackspaceTimer = setTimeout(() => {
        mobileBackspaceCount = 0;
      }, 3500);

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
    'dashboardPage': "showPage('dashboardPage')",
    'inputPage': "showPage('inputPage')",
    'riwayatPage': "bukaMenuRiwayat()",
    'masterDbPage': "showPage('masterDbPage')",
    'userManagementPage': "showPage('userManagementPage')"
  };

  const buttons = bottomNav.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    const onclickAttr = btn.getAttribute('onclick') || '';
    const targetOnClick = btnMap[pageId];

    if (targetOnClick && onclickAttr.includes(targetOnClick)) {
      btn.classList.add('active');
    }
  });
}

function pindahHalaman(pageId, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  updateBottomMenuHighlight(pageId);

  if (pushHistory && pageId !== 'loginPage') {
    try {
      history.pushState({ page: pageId }, '', location.href);
    } catch(e) {}
  }

  if (pageId === 'dashboardPage') {
    loadDashboard();
  } else if (pageId === 'inputPage') {
    loadForm();
  } else if (pageId === 'riwayatPage') {
    loadRiwayat();
  } else if (pageId === 'masterDbPage') {
    loadMasterDbTable();
  } else if (pageId === 'userManagementPage') {
    loadFonteToken();
    loadFirebaseConfigInput();
    loadUsersManagement();
    updateActivePdfModelBadge();
  }
}

function getAccessibleRequests() {
  const requests = getRequestsFromDB();
  if (!currentUser) return [];

  if (
    currentUser.category === 'ADMIN' ||
    currentUser.category === 'DM' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  ) {
    return requests;
  }

  if (currentUser.category === 'TOKO') {
    return requests.filter(r => 
      r.userId === currentUser.id || 
      r.toko.toUpperCase() === currentUser.fullName.toUpperCase()
    );
  }

  return requests.filter(r => r.area === currentUser.area);
}

function filterDashboardRecent(status) {
  dashboardFilterStatus = status;
  loadDashboard();
}

function loadDashboard() {
  if (!currentUser) return;

  const nameEl = document.getElementById('namaUser');
  const areaEl = document.getElementById('areaUser');
  if (nameEl) nameEl.textContent = currentUser.fullName;
  if (areaEl) areaEl.textContent = `${currentUser.category} - ${AREA_MAP[currentUser.area] || currentUser.area}`;

  const data = getAccessibleRequests();

  const pending = data.filter(r => r.status === 'PENDING').length;
  const approve = data.filter(r => r.status === 'APPROVE').length;
  const reject = data.filter(r => r.status === 'REJECT').length;
  const done = data.filter(r => r.status === 'DONE').length;
  const total = data.length || 1;

  const elPending = document.getElementById('pending');
  const elApprove = document.getElementById('approve');
  const elReject = document.getElementById('reject');
  const elDone = document.getElementById('done');

  if (elPending) elPending.textContent = pending;
  if (elApprove) elApprove.textContent = approve;
  if (elReject) elReject.textContent = reject;
  if (elDone) elDone.textContent = done;

  const barPending = document.getElementById('barPending');
  const barApprove = document.getElementById('barApprove');
  const barReject = document.getElementById('barReject');
  const barDone = document.getElementById('barDone');

  if (barPending) barPending.style.width = `${data.length ? Math.max(12, Math.round((pending / total) * 100)) : 15}%`;
  if (barApprove) barApprove.style.width = `${data.length ? Math.max(12, Math.round((approve / total) * 100)) : 15}%`;
  if (barReject) barReject.style.width = `${data.length ? Math.max(12, Math.round((reject / total) * 100)) : 15}%`;
  if (barDone) barDone.style.width = `${data.length ? Math.max(12, Math.round((done / total) * 100)) : 15}%`;

  const titleEl = document.getElementById('dashboardRecentTitle');
  if (titleEl) {
    titleEl.textContent = `PERMINTAAN ${dashboardFilterStatus}`;
  }

  const lastDataContainer = document.getElementById('lastData');
  if (!lastDataContainer) return;
  lastDataContainer.innerHTML = '';

  const filteredData = data.filter(r => r.status === dashboardFilterStatus);

  if (filteredData.length === 0) {
    lastDataContainer.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">TIDAK ADA DATA PERMINTAAN DENGAN STATUS ${dashboardFilterStatus}.</td></tr>`;
    return;
  }

  filteredData.forEach(r => {
    const isWaitingDM = (r.status === 'PENDING' && r.serviceApprove);
    const isWaitingService = (r.status === 'PENDING' && !r.serviceApprove);

    let isOrangeRow = false;
    let isBoldRow = false;
    if (currentUser) {
      const cat = (currentUser.category || '').toUpperCase();
      const isAdm = cat === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN');
      if ((cat === 'DM' || isAdm) && isWaitingDM) {
        isOrangeRow = true;
        isBoldRow = true;
      } else if ((cat === 'SERVICE' || isAdm) && isWaitingService) {
        isOrangeRow = true;
        isBoldRow = true;
      }
    }

    const tr = document.createElement('tr');
    tr.className = `${isOrangeRow ? 'rowHighlightOrange' : (isWaitingDM ? 'rowWaitingDmBlink' : '')}`;
    if (isBoldRow) {
      tr.style.fontWeight = '800';
    }
    tr.style.cursor = 'pointer';
    tr.title = `KLIK BARIS INI UNTUK MEMBUKA PERMINTAAN #${r.noSurat}`;
    tr.onclick = () => bukaDetailDariDashboard(r.noSurat);
    tr.innerHTML = `
      <td style="white-space:nowrap;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td style="font-weight:700; color:var(--primary);">${r.noSurat}</td>
      <td>${r.toko} <small style="color:var(--primary);">(${r.area})</small></td>
      <td style="text-align:center;">${getBadgeStatus(r)}</td>
    `;
    lastDataContainer.appendChild(tr);
  });
}

function bukaDetailDariDashboard(noSurat) {
  lihatDetail(noSurat, true);
}

function getBadgeStatus(r) {
  if (typeof r === 'string') {
    if (r === 'DONE') return '<span>SUDAH DIPENUHI</span>';
    return `<span>${r}</span>`;
  }

  if (!r) return '<span>-</span>';

  const role = currentUser ? String(currentUser.category || '').toUpperCase() : '';
  const isAdm = role === 'ADMIN' || (currentUser && currentUser.username && String(currentUser.username).toUpperCase() === 'ADMIN');
  const st = r.status;
  const serviceAppv = r.serviceApprove;

  if (st === 'DONE') return '<span>SUDAH DIPENUHI</span>';
  if (st === 'REJECT') return '<span>DITOLAK</span>';
  if (st === 'APPROVE') return '<span>DISETUJUI</span>';

  if (st === 'PENDING') {
    if (!serviceAppv) {
      const isServiceBold = (role === 'SERVICE' || isAdm) ? 'font-weight:900 !important; font-size:13.5px !important; letter-spacing:0.5px;' : '';
      return `<span style="${isServiceBold}">TUNGGU SERVICE</span>`;
    } else {
      const isDmBold = (role === 'DM' || isAdm) ? 'font-weight:900 !important; font-size:13.5px !important; letter-spacing:0.5px;' : '';
      return `<span style="${isDmBold}">TUNGGU DM</span>`;
    }
  }

  return `<span>${st}</span>`;
}

function loadForm() {
  const tglEl = document.getElementById('tanggal');
  if (tglEl && !tglEl.value) {
    tglEl.value = getFormattedDateDDMMYYYY();
  }

  const tokoSelect = document.getElementById('toko');
  if (tokoSelect && tokoSelect.options.length === 0) {
    if (currentUser.category === 'TOKO') {
      tokoSelect.innerHTML = `<option value="${currentUser.fullName}">${currentUser.fullName} (${currentUser.area})</option>`;
    } else {
      const users = getUsersFromDB();
      const stores = users.filter(u => u.category === 'TOKO' && u.area === currentUser.area);
      if (stores.length > 0) {
        stores.forEach(s => {
          tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`;
        });
      } else {
        tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (${currentUser.area})</option>`;
      }
    }
  }

  const containerTambahToko = document.getElementById('containerTambahToko');
  if (containerTambahToko) {
    containerTambahToko.style.display = (currentUser.category === 'TOKO') ? 'none' : 'block';
  }

  if (typeof updatePhotoSectionVisibility === 'function') {
    updatePhotoSectionVisibility();
  }

  const detailContainer = document.getElementById('detailContainer');
  if (detailContainer && detailContainer.children.length === 0 && !modeEdit) {
    tambahRow();
  }
}

function gantiJenis() {
  const container = document.getElementById('detailContainer');
  if (container && container.children.length > 0 && !modeEdit) {
    container.innerHTML = '';
    tambahRow();
  }
}

function tambahRow() {
  const jenisEl = document.getElementById('jenisPermintaan');
  const jenis = jenisEl ? jenisEl.value : 'DEFAULT';
  const container = document.getElementById('detailContainer');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `detailRow ${jenis === 'DUS' ? 'dus' : 'seri'}`;

  const scanButtonHtml = `
    <button type="button" class="btnScanSeri" onclick="bukaScanner(this)" title="SCAN BARCODE / QR NO SERI">
      <span class="material-symbols-rounded">qr_code_scanner</span>
    </button>
  `;

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
      <input type="number" class="qty" value="1" min="1" style="text-align: left;" autocomplete="off">
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
      <input type="number" class="qty" value="1" min="1" style="text-align: left;" autocomplete="off">
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
      if (cleanKey && cleanVal) {
        cleanMap[cleanKey] = cleanVal;
      }
    }
  });
  return cleanMap;
}

function bukaScanner(btn) {
  const row = btn.closest('.detailRow');
  if (row) {
    activeScanInput = row.querySelector('.seriBarang');
  } else {
    activeScanInput = btn.parentElement.querySelector('.seriBarang');
  }

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

        html5QrCodeScanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (activeScanInput) {
              const cleanCode = String(decodedText || '').trim().toUpperCase();
              
              activeScanInput.value = cleanCode;
              activeScanInput.setAttribute('value', cleanCode);
              activeScanInput.dispatchEvent(new Event('input', { bubbles: true }));
              
              const targetRow = activeScanInput.closest('.detailRow');
              if (targetRow) {
                const namaInput = targetRow.querySelector('.namaBarang');
                if (namaInput) {
                  setTimeout(() => {
                    namaInput.focus();
                  }, 300);
                }
              }
            }
            tutupScanner();
          },
          (errorMessage) => {}
        ).catch(err => {
          showNotif('KAMERA TIDAK TERSEDIA ATAU DIBLOKIR BROWSER!', 'warning');
          tutupScanner();
        });
      } catch(err) {
        console.warn("Kesalahan inisialisasi kamera:", err);
      }
    }, 200);
  } else {
    showNotif('MODUL SCANNER BELUM SIAP!', 'warning');
  }
}

function tutupScanner() {
  const modal = document.getElementById('scannerModal');
  if (modal) modal.style.display = 'none';

  if (html5QrCodeScanner) {
    try {
      const scannerRef = html5QrCodeScanner;
      html5QrCodeScanner = null;
      scannerRef.stop().then(() => {
        try { scannerRef.clear(); } catch(e) {}
      }).catch(err => {
        try { scannerRef.clear(); } catch(e) {}
      });
    } catch(e) {
      html5QrCodeScanner = null;
    }
  }
  setTimeout(() => {
    activeScanInput = null;
  }, 500);
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
    if (cleanKey.substring(0, 4) === first4Chars) {
      matchedType = fullMap[key];
      break;
    }
  }

  if (!matchedType) {
    for (const key of keys) {
      const cleanKey = String(key).trim().toUpperCase();
      if (cleanKey.length >= 4 && rawValue.startsWith(cleanKey)) {
        matchedType = fullMap[key];
        break;
      }
    }
  }

  if (matchedType) {
    const row = el.closest('.detailRow');
    if (row) {
      const typeInput = row.querySelector('.typeBarang');
      if (typeInput) {
        typeInput.value = matchedType;
      }

      if (isFromScanner) {
        const namaInput = row.querySelector('.namaBarang');
        if (namaInput) {
          setTimeout(() => namaInput.focus(), 150);
        }
      }
    }
  }
}

function hapusRow(btn) {
  const row = btn.closest('.detailRow');
  if (row) row.remove();
  const container = document.getElementById('detailContainer');
  if (container && container.children.length === 0) tambahRow();
}

function kompresiFoto(file, maxDimension = 720, quality = 0.65) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target.result || '');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function pilihFoto() {
  const fileInput = document.getElementById('foto');
  if (fileInput) fileInput.click();
}

async function uploadPhotoToSupabaseStorage(file) {
  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
      const { data, error } = await supabaseClient.storage.from('photos').upload(fileName, file);
      if (!error && data) {
        const { data: pubData } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
        if (pubData && pubData.publicUrl) return pubData.publicUrl;
      }
    } catch (e) {}
  }
  return await kompresiFoto(file, 400, 0.4);
}

async function previewFoto(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  if (currentPhotos.length + files.length > 5) {
    showNotif('MAKSIMAL FOTO DIBATASI HINGGA 5 FOTO SAJA!', 'warning');
    event.target.value = ''; 
    return;
  }

  const previewText = document.getElementById('previewText');
  const originalText = previewText ? previewText.innerHTML : 'TAP / DRAG FOTO DI SINI';
  if (previewText) {
    previewText.innerHTML = `<span class="material-symbols-rounded" style="font-size:22px; vertical-align:middle; display:inline-block; animation:spin 0.8s linear infinite; color:var(--primary);">sync</span> MENGUNGGAH FOTO...`;
  }

  for (let i = 0; i < files.length; i++) {
    if (currentPhotos.length < 5) {
      try {
        const url = await uploadPhotoToSupabaseStorage(files[i]);
        if (url) {
          currentPhotos.push(url);
        }
      } catch (err) {
        console.warn('Foto Upload Error:', err);
      }
    }
  }

  if (previewText) {
    previewText.innerHTML = originalText;
  }

  renderPhotoGrid();
  event.target.value = '';
}

function hapusFotoItem(idx) {
  currentPhotos.splice(idx, 1);
  renderPhotoGrid();
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoPreviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-card';
    div.title = "KLIK UNTUK BUKA FOTO DILAYAR PENUH";
    div.onclick = () => window.open(src, '_blank');
    div.innerHTML = `
      <img src="${src}" alt="Foto ${idx + 1}">
      <button class="photo-del-btn" onclick="event.stopPropagation(); hapusFotoItem(${idx})">✕</button>
    `;
    grid.appendChild(div);
  });
}

function bersihkanForm() {
  currentPhotos = [];
  modeEdit = false;
  editNoSurat = '';
  
  const fileInput = document.getElementById('foto');
  if (fileInput) fileInput.value = '';

  const photoGrid = document.getElementById('photoPreviewsGrid');
  if (photoGrid) photoGrid.innerHTML = '';

  const previewText = document.getElementById('previewText');
  if (previewText) previewText.style.display = 'block';

  const catatanEl = document.getElementById('catatan');
  if (catatanEl) {
    catatanEl.value = '';
    catatanEl.textContent = '';
  }

  const jenisEl = document.getElementById('jenisPermintaan');
  if (jenisEl) jenisEl.value = 'DEFAULT';

  const btnSimpan = document.getElementById('btnSimpan');
  if (btnSimpan) btnSimpan.textContent = 'SIMPAN PERMINTAAN';

  const tokoSelect = document.getElementById('toko');
  if (tokoSelect && tokoSelect.options.length > 0) {
    tokoSelect.selectedIndex = 0;
  }

  const container = document.getElementById('detailContainer');
  if (container) {
    container.innerHTML = '';
  }

  tambahRow();

  const allInputs = document.querySelectorAll('#inputPage input, #inputPage textarea');
  allInputs.forEach(ipt => {
    if (ipt.id === 'tanggal') return;
    if (ipt.type === 'file') {
      ipt.value = '';
    } else if (ipt.classList.contains('qty')) {
      ipt.value = '1';
    } else {
      ipt.value = '';
      ipt.setAttribute('value', '');
    }
  });
}

function simpanData() {
  const tokoSelect = document.getElementById('toko');
  const toko = tokoSelect ? tokoSelect.value : '';
  const jenisEl = document.getElementById('jenisPermintaan');
  const jenis = jenisEl ? jenisEl.value : 'DEFAULT';
  const catatanEl = document.getElementById('catatan');
  const catatan = catatanEl ? catatanEl.value.trim().toUpperCase() : '';

  const rows = document.querySelectorAll('.detailRow');
  let items = [];
  let valid = true;

  rows.forEach(r => {
    const type = r.querySelector('.typeBarang') ? r.querySelector('.typeBarang').value.trim().toUpperCase() : '';
    const seri = r.querySelector('.seriBarang') ? r.querySelector('.seriBarang').value.trim().toUpperCase() : '';
    const barang = r.querySelector('.namaBarang') ? r.querySelector('.namaBarang').value.trim().toUpperCase() : '';
    const alasan = r.querySelector('.alasan') ? r.querySelector('.alasan').value.trim().toUpperCase() : '';
    const qty = parseInt(r.querySelector('.qty') ? r.querySelector('.qty').value : '1') || 1;
    const dus = r.querySelector('.seriDusBarang') ? r.querySelector('.seriDusBarang').value.trim().toUpperCase() : '';

    if (!type || !seri || !barang || !alasan) valid = false;
    if (jenis === 'DUS' && !dus) valid = false;

    items.push({ type, seri, dus, barang, alasan, qty });
  });

  if (!valid) {
    showNotif('DETAIL BARANG & ALASAN WAJIB DIISI DENGAN LENGKAP!', 'warning');
    return;
  }

  const allReq = getRequestsFromDB();
  let duplicateSerial = null;
  let duplicateNoSurat = null;

  items.forEach(it => {
    if (it.seri) {
      const match = allReq.find(r => r.noSurat !== editNoSurat && r.items.some(x => x.seri === it.seri));
      if (match) {
        duplicateSerial = it.seri;
        duplicateNoSurat = match.noSurat;
      }
    }
  });

  if (duplicateSerial && !modeEdit) {
    showConfirm(
      `NO SERI ${duplicateSerial} SUDAH TERDAFTAR PADA ${duplicateNoSurat}. LANJUTKAN TRANSAKSI?`,
      () => {
        prosesSimpanKeDB(toko, jenis, catatan, items);
      }
    );
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
        requests[idx].toko = toko;
        requests[idx].jenis = jenis;
        requests[idx].catatan = catatan;
        requests[idx].items = items;
        requests[idx].photos = [...currentPhotos];
        
        saveRequestsToDB(requests);

        const docId = String(editNoSurat).replace(/[\/\.]/g, '_');
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
        }

        if (typeof pushCentralCloudDB === 'function') {
          pushCentralCloudDB();
        }

        showNotif(`PERMINTAAN #${editNoSurat} DATA BERHASIL DIPERBARUHI!`, 'success');
        bersihkanForm();
        pindahHalaman('riwayatPage');
        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
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
        noSurat,
        tanggal: getFormattedDateDDMMYYYY(now),
        area: currentUser.area,
        userId: currentUser.id,
        toko,
        jenis,
        catatan,
        items,
        photos: [...currentPhotos],
        status: 'PENDING',
        serviceApprove: false,
        createdBy: currentUser.fullName,
        createdAt: `${getFormattedDateDDMMYYYY(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
        log: []
      };
      requests.unshift(newRecord);
      saveRequestsToDB(requests);

      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(newRecord).catch(e => console.warn('[FIRESTORE SAVE NOTICE]:', e));
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(newRecord).catch(e => console.warn('[REALTIME SAVE NOTICE]:', e));
      }

      if (typeof pushCentralCloudDB === 'function') {
        pushCentralCloudDB();
      }

      showNotif(`PERMINTAAN #${noSurat} DATA BERHASIL DISIMPAN!`, 'success');
      bersihkanForm();

      // REMINDER DIKIRIM HANYA VIA WHATSAPP (FONNTE API), TIDAK LEWAT SYSTEM BELL NOTIFIKASI
      const allUsers = getUsersFromDB();
      const serviceUsers = allUsers.filter(u => u.category === 'SERVICE' && u.area === currentUser.area);
      serviceUsers.forEach(srv => {
        if (srv.phone) {
          kirimNotifikasiWA(srv.phone, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`);
        }
      });

      pindahHalaman('riwayatPage');
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM' && typeof loadMasterDbTable === 'function') {
        loadMasterDbTable();
      }
    }
  }, 200);
}

function bukaMenuRiwayat() {
  filterStatusRiwayat = '';
  const searchInput = document.getElementById('searchRiwayat');
  if (searchInput) searchInput.value = '';
  showPage('riwayatPage');
}

function bukaRiwayat(status) {
  filterStatusRiwayat = status;
  const searchInput = document.getElementById('searchRiwayat');
  if (searchInput) searchInput.value = '';
  showPage('riwayatPage');
}

function loadRiwayat() {
  const dropdown = document.getElementById('filterStatusDropdown');
  if (dropdown && filterStatusRiwayat) {
    dropdown.value = filterStatusRiwayat;
  }
  filterRiwayat();
}

function filterRiwayatDropdown() {
  const dropdown = document.getElementById('filterStatusDropdown');
  if (dropdown) {
    filterStatusRiwayat = dropdown.value;
    if (filterStatusRiwayat === 'ALL') filterStatusRiwayat = '';
  }
  filterRiwayat();
}

function filterRiwayat() {
  let data = getAccessibleRequests();
  const searchInput = document.getElementById('searchRiwayat');
  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (filterStatusRiwayat && filterStatusRiwayat !== 'ALL') {
    data = data.filter(r => r.status === filterStatusRiwayat);
  }

  if (search) {
    data = data.filter(r =>
      r.noSurat.toLowerCase().includes(search) ||
      r.toko.toLowerCase().includes(search) ||
      r.items.some(i => i.type.toLowerCase().includes(search) || i.seri.toLowerCase().includes(search) || i.barang.toLowerCase().includes(search))
    );
  }

  const thead = document.querySelector('.historyTable thead');
  const tbody = document.getElementById('riwayatData');
  if (!thead || !tbody) return;

  const role = currentUser ? currentUser.category : '';

  thead.innerHTML = `
    <tr>
      <th>AKSI</th>
      <th>TGL</th>
      <th>NO SURAT</th>
      <th>TOKO</th>
      <th>JENIS</th>
      <th>STATUS</th>
      <th>CATATAN</th>
    </tr>
  `;

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
        aksi += `
          <button class="btnIcon btnApprove" onclick="approveService('${r.noSurat}')" title="APPROVE SERVICE"><span class="material-symbols-rounded">check_circle</span></button>
          <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'SERVICE')" title="REJECT SERVICE"><span class="material-symbols-rounded">cancel</span></button>
        `;
      } else if (r.status === 'PENDING' && r.serviceApprove) {
        aksi += `
          <button class="btnIcon btnApprove" onclick="approveDM('${r.noSurat}')" title="APPROVE DM"><span class="material-symbols-rounded">check_circle</span></button>
          <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'DM')" title="REJECT DM"><span class="material-symbols-rounded">cancel</span></button>
        `;
      } else if (r.status === 'APPROVE') {
        aksi += `
          <button class="btnIcon btnDone" onclick="doneService('${r.noSurat}')" title="DONE"><span class="material-symbols-rounded">task_alt</span></button>
        `;
      }
    } else if (role === 'SERVICE') {
      if (r.status === 'PENDING' && !r.serviceApprove) {
        aksi += `
          <button class="btnIcon btnApprove" onclick="approveService('${r.noSurat}')" title="APPROVE SERVICE"><span class="material-symbols-rounded">check_circle</span></button>
          <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'SERVICE')" title="REJECT SERVICE"><span class="material-symbols-rounded">cancel</span></button>
        `;
      } else if (r.status === 'APPROVE') {
        aksi += `
          <button class="btnIcon btnDone" onclick="doneService('${r.noSurat}')" title="DONE"><span class="material-symbols-rounded">task_alt</span></button>
        `;
      }
    } else if (role === 'DM') {
      if (r.status === 'PENDING' && r.serviceApprove) {
        aksi += `
          <button class="btnIcon btnApprove" onclick="approveDM('${r.noSurat}')" title="APPROVE DM"><span class="material-symbols-rounded">check_circle</span></button>
          <button class="btnIcon btnReject" onclick="tolakServiceModal('${r.noSurat}', 'DM')" title="REJECT DM"><span class="material-symbols-rounded">cancel</span></button>
        `;
      }
    }

    const isOwner = currentUser && (r.userId === currentUser.id || r.createdBy === currentUser.fullName || r.createdBy === currentUser.username);
    const canEdit = (r.status === 'PENDING' && !r.serviceApprove && isOwner) || (isAdminUser && r.status === 'PENDING');
    const canDelete = (r.status === 'PENDING' && !r.serviceApprove && isOwner) || isAdminUser;

    if (canEdit) {
      aksi += `
        <button class="btnIcon btnEdit" onclick="editPermintaan('${r.noSurat}')" title="EDIT PERMINTAAN"><span class="material-symbols-rounded">edit</span></button>
      `;
    }

    if (canDelete) {
      aksi += `
        <button class="btnIcon btnDelete" onclick="hapusData('${r.noSurat}')" title="HAPUS PERMINTAAN"><span class="material-symbols-rounded">delete</span></button>
      `;
    }

    aksi += `
      <button class="btnIcon btnInfo" onclick="lihatDetail('${r.noSurat}')" title="LIHAT DETAIL"><span class="material-symbols-rounded">visibility</span></button>
    `;

    const isPhotoHidden = (r.status === 'APPROVE' || r.status === 'DONE' || r.status === 'REJECT') || !getFeaturePhotosEnabled();
    if (r.photos && r.photos.length > 0 && !isPhotoHidden) {
      aksi += `
        <button class="btnIcon btnView" onclick="lihatFotoByNoSurat('${r.noSurat}')" title="LIHAT FOTO"><span class="material-symbols-rounded">image</span></button>
      `;
    }

    const isPdfVisible = (r.status === 'APPROVE' || r.status === 'DONE' || (isAdminUser && r.status !== 'REJECT'));
    if (isPdfVisible) {
      aksi += `
        <button class="btnIcon btnPdf" onclick="bukaPdfModal('${r.noSurat}')" title="CETAK PDF"><span class="material-symbols-rounded">picture_as_pdf</span></button>
      `;
    }

    const isWaitingDM = (r.status === 'PENDING' && r.serviceApprove);
    const isWaitingService = (r.status === 'PENDING' && !r.serviceApprove);

    let isOrangeRow = false;
    if (currentUser) {
      const cat = (currentUser.category || '').toUpperCase();
      const isAdm = cat === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN');
      if ((cat === 'DM' || isAdm) && isWaitingDM) {
        isOrangeRow = true;
      } else if ((cat === 'SERVICE' || isAdm) && isWaitingService) {
        isOrangeRow = true;
      }
    }

    const tr = document.createElement('tr');
    if (isOrangeRow) {
      tr.className = 'rowHighlightOrange';
    } else if (isWaitingDM) {
      tr.className = 'rowWaitingDmBlink';
    }
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

function lihatFotoByNoSurat(noSurat) {
  if (!getFeaturePhotosEnabled()) {
    showNotif('FITUR UPLOAD & LIHAT FOTO SEDANG DINOAKTIFKAN OLEH ADMIN!', 'warning');
    return;
  }
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (req && req.photos && req.photos.length > 0) {
    viewerPhotos = req.photos;
    viewerCurrentIndex = 0;
    tampilkanFotoViewerAktif();
    
    if (typeof pushPopupHistoryState === 'function') {
      pushPopupHistoryState();
    }
  } else {
    showNotif('TIDAK ADA FOTO UNTUK PERMINTAAN INI!', 'warning');
  }
}

let viewerCurrentZoom = 1;
let viewerPanX = 0;
let viewerPanY = 0;
let isDraggingViewerImage = false;
let startDragX = 0;
let startDragY = 0;
let initialPinchDistance = 0;
let initialPinchZoom = 1;

function applyViewerTransform() {
  const img = document.getElementById('viewerImage');
  if (!img) return;
  if (viewerCurrentZoom <= 1) {
    viewerCurrentZoom = 1;
    viewerPanX = 0;
    viewerPanY = 0;
  }
  img.style.transform = `translate(${viewerPanX}px, ${viewerPanY}px) scale(${viewerCurrentZoom})`;
  img.style.cursor = viewerCurrentZoom > 1 ? (isDraggingViewerImage ? 'grabbing' : 'grab') : 'pointer';
}

function zoomImage(delta) {
  viewerCurrentZoom += delta;
  if (viewerCurrentZoom < 1) viewerCurrentZoom = 1;
  if (viewerCurrentZoom > 5) viewerCurrentZoom = 5;
  applyViewerTransform();
}

function resetZoom() {
  viewerCurrentZoom = 1;
  viewerPanX = 0;
  viewerPanY = 0;
  applyViewerTransform();
}

function initPhotoViewerGestureListeners() {
  const modal = document.getElementById('imageViewer');
  const img = document.getElementById('viewerImage');
  if (!modal || !img || modal.dataset.gesturesInited) return;
  modal.dataset.gesturesInited = 'true';

  // Touch Start (Pinch or Pan)
  modal.addEventListener('touchstart', (e) => {
    if (e.target.closest('#navViewerLeft') || e.target.closest('#navViewerRight') || e.target.closest('.closeViewer') || e.target.closest('.viewerBottomBar')) {
      return;
    }

    if (e.touches.length === 2) {
      isDraggingViewerImage = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistance = Math.hypot(dx, dy);
      initialPinchZoom = viewerCurrentZoom;
    } else if (e.touches.length === 1 && viewerCurrentZoom > 1) {
      isDraggingViewerImage = true;
      startDragX = e.touches[0].clientX - viewerPanX;
      startDragY = e.touches[0].clientY - viewerPanY;
    }
  }, { passive: false });

  // Touch Move
  modal.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance > 0) {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        viewerCurrentZoom = initialPinchZoom * (dist / initialPinchDistance);
        if (viewerCurrentZoom < 1) viewerCurrentZoom = 1;
        if (viewerCurrentZoom > 5) viewerCurrentZoom = 5;
        applyViewerTransform();
      }
    } else if (e.touches.length === 1 && isDraggingViewerImage && viewerCurrentZoom > 1) {
      if (e.cancelable) e.preventDefault();
      viewerPanX = e.touches[0].clientX - startDragX;
      viewerPanY = e.touches[0].clientY - startDragY;
      applyViewerTransform();
    }
  }, { passive: false });

  // Touch End
  modal.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialPinchDistance = 0;
    }
    if (e.touches.length === 0) {
      isDraggingViewerImage = false;
    }
  });

  // Mouse Drag (PC/Laptop)
  img.addEventListener('mousedown', (e) => {
    if (viewerCurrentZoom > 1) {
      isDraggingViewerImage = true;
      startDragX = e.clientX - viewerPanX;
      startDragY = e.clientY - viewerPanY;
      applyViewerTransform();
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingViewerImage && viewerCurrentZoom > 1) {
      viewerPanX = e.clientX - startDragX;
      viewerPanY = e.clientY - startDragY;
      applyViewerTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingViewerImage) {
      isDraggingViewerImage = false;
      applyViewerTransform();
    }
  });

  // Mouse Wheel Zoom
  modal.addEventListener('wheel', (e) => {
    if (e.target.closest('.viewerBottomBar')) return;
    if (e.cancelable) e.preventDefault();
    if (e.deltaY < 0) {
      zoomImage(0.25);
    } else {
      zoomImage(-0.25);
    }
  }, { passive: false });
}

function tampilkanFotoViewerAktif() {
  viewerCurrentZoom = 1;
  viewerPanX = 0;
  viewerPanY = 0;
  applyViewerTransform();

  const img = document.getElementById('viewerImage');
  if (img && viewerPhotos.length > 0) {
    img.src = viewerPhotos[viewerCurrentIndex];
  }
  const modal = document.getElementById('imageViewer');
  if (modal) {
    modal.style.display = 'flex';
    initPhotoViewerGestureListeners();
  }
  
  const btnLeft = document.getElementById('navViewerLeft');
  const btnRight = document.getElementById('navViewerRight');
  const textCounter = document.getElementById('viewerCounter');
  
  if (btnLeft) btnLeft.style.display = viewerPhotos.length > 1 ? 'flex' : 'none';
  if (btnRight) btnRight.style.display = viewerPhotos.length > 1 ? 'flex' : 'none';
  if (textCounter) textCounter.textContent = `${viewerCurrentIndex + 1} / ${viewerPhotos.length}`;
}

function gantiFotoViewer(arah) {
  viewerCurrentIndex += arah;
  if (viewerCurrentIndex < 0) {
    viewerCurrentIndex = viewerPhotos.length - 1;
  } else if (viewerCurrentIndex >= viewerPhotos.length) {
    viewerCurrentIndex = 0;
  }
  tampilkanFotoViewerAktif();
}

function approveService(noSurat) {
  showConfirm(`APPROVE PERMINTAAN #${noSurat}?`, () => {
    showLoading('');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      if (idx !== -1) {
        requests[idx].serviceApprove = true;
        requests[idx].serviceUserName = currentUser.fullName;

        const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
        const sig = ttdMap[currentUser.id] || ttdMap[currentUser.username] || ttdMap['SERVICE_' + currentUser.area] || ttdMap['SERVICE'] || '';
        if (sig) {
          requests[idx].serviceTTD = sig;
        }

        if (!requests[idx].log) requests[idx].log = [];
        requests[idx].log.push({
          action: 'APPROVE_SERVICE',
          user: currentUser.fullName,
          notes: 'DISETUJUI SERVICE',
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });
        saveRequestsToDB(requests);
        showNotif(`APPROVE BERHASIL`, 'info');

        // REMINDER DIKIRIM HANYA VIA WHATSAPP (FONNTE API), TIDAK LEWAT SYSTEM BELL NOTIFIKASI
        const users = getUsersFromDB();
        const dmUsers = users.filter(u => u.category === 'DM');
        dmUsers.forEach(dm => {
          if (dm.phone) {
            kirimNotifikasiWA(dm.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI SERVICE (${currentUser.fullName}). MOHON APPROVAL DM.`);
          }
        });

        loadRiwayat();
        loadDashboard();
        if (currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      }
    }, 300);
  });
}

function approveDM(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (req && !req.serviceApprove) {
    showNotif('PERMINTAAN WAJIB DI-APPROVE OLEH SERVICE TERLEBIH DAHULU SEBELUM DM DAPAT MEMPROSES APPROVAL!', 'warning');
    return;
  }

  showConfirm(`APPROVE PERMINTAAN #${noSurat}?`, () => {
    showLoading('');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      if (idx !== -1) {
        if (!requests[idx].serviceApprove) {
          showNotif('PERMINTAAN WAJIB DI-APPROVE OLEH SERVICE TERLEBIH DAHULU!', 'warning');
          return;
        }
        requests[idx].status = 'APPROVE';
        requests[idx].dmUserName = currentUser.fullName;

        const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
        const sig = ttdMap[currentUser.id] || ttdMap[currentUser.username] || ttdMap['DM'] || '';
        if (sig) {
          requests[idx].dmTTD = sig;
        }

        if (!requests[idx].log) requests[idx].log = [];
        requests[idx].log.push({
          action: 'APPROVE_DM',
          user: currentUser.fullName,
          notes: 'DISETUJUI DM',
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });
        saveRequestsToDB(requests);
        showNotif(`APPROVE BERHASIL`, 'info');

        tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM PUSAT. SILAKAN DIPROSES.`, noSurat);
        const users = getUsersFromDB();
        const serviceUsers = users.filter(u => u.category === 'SERVICE' && u.area === requests[idx].area);
        serviceUsers.forEach(srv => {
          if (srv.phone) {
            kirimNotifikasiWA(srv.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM. SILAKAN DIPROSES.`);
          }
        });

        loadRiwayat();
        loadDashboard();
        if (currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      }
    }, 300);
  });
}

function doneService(noSurat) {
  showConfirm(`UBAH STATUS PERMINTAAN #${noSurat} MENJADI DONE?`, () => {
    showLoading('');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      if (idx !== -1) {
        requests[idx].status = 'DONE';
        if (!requests[idx].log) requests[idx].log = [];
        requests[idx].log.push({
          action: 'DONE',
          user: currentUser.fullName,
          notes: 'BARANG TELAH DISERAHKAN / SELESAI',
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });
        saveRequestsToDB(requests);
        showNotif(`PERMINTAAN #${noSurat} DITANDAI DONE!`, 'info');

        tambahNotifikasiSistem(['TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH SELESAI (DONE).`, noSurat);
        const users = getUsersFromDB();
        const creator = users.find(u => u.id === requests[idx].userId || u.fullName === requests[idx].createdBy);
        if (creator && creator.phone) {
          kirimNotifikasiWA(creator.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH SELESAI (DONE).`);
        }

        loadRiwayat();
        loadDashboard();
        if (currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      }
    }, 300);
  });
}

function tolakServiceModal(noSurat, roleType) {
  const elNo = document.getElementById('rejectNoSurat');
  const elRole = document.getElementById('rejectRoleType');
  const elReason = document.getElementById('rejectReason');
  const elTitle = document.getElementById('rejectTitle');

  if (elNo) elNo.value = noSurat;
  if (elRole) elRole.value = roleType;
  if (elReason) elReason.value = '';
  if (elTitle) elTitle.textContent = `TOLAK PERMINTAAN`;
  
  const modal = document.getElementById('rejectOverlay');
  if (modal) modal.style.display = 'flex';
  pushPopupHistoryState();
}

function closeReject() {
  const modal = document.getElementById('rejectOverlay');
  if (modal) modal.style.display = 'none';
}

function kirimReject() {
  const noSurat = document.getElementById('rejectNoSurat').value;
  const roleType = document.getElementById('rejectRoleType').value;
  const alasan = document.getElementById('rejectReason').value.trim().toUpperCase();

  if (!alasan) {
    showNotif('MASUKKAN ALASAN PENOLAKAN!', 'warning');
    return;
  }

  closeReject();
  showLoading('');
  setTimeout(() => {
    hideLoading();
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r.noSurat === noSurat);
    if (idx !== -1) {
      requests[idx].status = 'REJECT';
      requests[idx].catatan = `DITOLAK ${roleType}: ${alasan}`;
      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: `REJECT_${roleType}`,
        user: currentUser.fullName,
        notes: alasan,
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });
      saveRequestsToDB(requests);
      showNotif(`PERMINTAAN BERHASIL DITOLAK`, 'info');

      const users = getUsersFromDB();
      const creator = users.find(u => u.id === requests[idx].userId || u.fullName === requests[idx].createdBy);

      if (roleType === 'SERVICE') {
        tambahNotifikasiSistem(['TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DITOLAK SERVICE. CATATAN: ${alasan}`, noSurat);
        if (creator && creator.phone) {
          kirimNotifikasiWA(creator.phone, `PERMINTAAN #${noSurat} DITOLAK SERVICE. CATATAN: ${alasan}`);
        }
      } else if (roleType === 'DM') {
        tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK DM. CATATAN: ${alasan}`, noSurat);
        if (creator && creator.phone) {
          kirimNotifikasiWA(creator.phone, `PERMINTAAN #${noSurat} DITOLAK DM. CATATAN: ${alasan}`);
        }
        const serviceUsers = users.filter(u => u.category === 'SERVICE' && u.area === requests[idx].area);
        serviceUsers.forEach(srv => {
          if (srv.phone) {
            kirimNotifikasiWA(srv.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK DM. CATATAN: ${alasan}`);
          }
        });
      }

      loadRiwayat();
      loadDashboard();
      if (currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
    }
  }, 300);
}

function editPermintaan(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (req.serviceApprove && !isAdminUser) {
    showNotif('PERMINTAAN TERKUNCI! TIDAK DAPAT DIUBAH KARENA SUDAH DI-APPROVE SERVICE.', 'warning');
    return;
  }

  modeEdit = true;
  editNoSurat = req.noSurat;

  pindahHalaman('inputPage');

  const tokoEl = document.getElementById('toko');
  const jenisEl = document.getElementById('jenisPermintaan');
  const catatanEl = document.getElementById('catatan');

  if (tokoEl) tokoEl.value = req.toko;
  if (jenisEl) jenisEl.value = req.jenis;
  if (catatanEl) catatanEl.value = req.catatan || '';

  gantiJenis();

  const container = document.getElementById('detailContainer');
  if (container) {
    container.innerHTML = '';

    req.items.forEach(item => {
      tambahRow();
      const row = container.lastElementChild;
      if (row.querySelector('.typeBarang')) row.querySelector('.typeBarang').value = item.type || '';
      if (row.querySelector('.seriBarang')) row.querySelector('.seriBarang').value = item.seri || '';
      if (row.querySelector('.seriDusBarang')) row.querySelector('.seriDusBarang').value = item.dus || '';
      if (row.querySelector('.namaBarang')) row.querySelector('.namaBarang').value = item.barang || '';
      if (row.querySelector('.qty')) row.querySelector('.qty').value = item.qty || 1;
      if (row.querySelector('.alasan')) row.querySelector('.alasan').value = item.alasan || '';
    });
  }

  currentPhotos = [...(req.photos || [])];
  renderPhotoGrid();

  const btnSimpan = document.getElementById('btnSimpan');
  if (btnSimpan) btnSimpan.textContent = 'SIMPAN PERUBAHAN';
}

function editData(noSurat) {
  editPermintaan(noSurat);
}
window.editData = editData;
window.editPermintaan = editPermintaan;

function hapusData(noSurat) {
  if (!noSurat) return;
  showConfirm(`HAPUS DATA PERMINTAAN #${noSurat}?`, () => {
    try {
      // 1. HAPUS DARI CACHE LOKAL SEKETIKA
      const currentReqs = getRequestsFromDB();
      const updatedReqs = currentReqs.filter(r => r.noSurat !== noSurat);
      
      const delReqs = JSON.parse(appStorage.getItem(DELETED_REQUESTS_KEY) || '[]');
      if (!delReqs.includes(noSurat)) delReqs.push(noSurat);
      appStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(delReqs));

      saveRequestsToDB(updatedReqs);

      // 2. HAPUS DOKUMEN DARI FIREBASE FIRESTORE & REALTIME DB ONLINE
      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).delete().catch(err => console.warn('[FIRESTORE DELETE NOTICE]:', err));
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).remove().catch(err => console.warn('[REALTIME DELETE NOTICE]:', err));
      }

      // 3. SINKRONKAN KE FIREBASE CLOUD
      if (typeof pushCentralCloudDB === 'function') {
        pushCentralCloudDB();
      }

      // 4. RE-RENDER TAMPILAN & TAMPILKAN NOTIFIKASI
      hideLoading();
      showNotif(`PERMINTAAN BERHASIL DIHAPUS!`, 'info');
      
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM' && typeof loadMasterDbTable === 'function') {
        loadMasterDbTable();
      }
    } catch (err) {
      hideLoading();
      console.error('[HAPUS DATA ERROR]:', err);
      showNotif('GAGAL MENGHAPUS DATA PERMINTAAN!', 'error');
    }
  });
}
window.hapusData = hapusData;

function lihatDetail(noSurat, fromDashboard = false) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  const popupTitle = document.getElementById('popupTitle');
  if (popupTitle) popupTitle.textContent = 'DETAIL PERMINTAAN';
  const msgBox = document.getElementById('popupMessage');
  if (!msgBox) return;

  let headerInfoHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-color); padding-bottom:10px; margin-bottom:14px; font-size:13px; color:var(--text-main); flex-wrap:wrap; gap:8px;">
      <div style="text-align:left;">NO SURAT : <span style="color:var(--primary); font-weight:bold;">${req.noSurat}</span></div>
      <span style="user-select:none;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      <div style="text-align:right;">TOKO : <span style="font-weight:bold;">${req.toko}</span></div>
    </div>
  `;

  const isDus = (req.jenis === 'DUS');

  let itemsHtml = req.items.map((i, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${i.type || '-'}</td>
      <td>${i.seri || '-'}</td>
      <td>${i.barang || '-'}</td>
      ${isDus ? `<td style="color:#d97706;">${i.dus || '-'}</td>` : ''}
      <td>${i.alasan || '-'}</td>
      <td style="text-align:center;">${i.qty || 1}</td>
    </tr>
  `).join('');

  let bottomActionsHtml = '';
  let actionButtons = [];
  const role = currentUser ? currentUser.category : '';
  const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));

  if (req.status === 'PENDING') {
    if (role === 'SERVICE' || isAdminUser) {
      if (!req.serviceApprove) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="closeDetail(); approveService('${req.noSurat}');">
            <span class="material-symbols-rounded">check_circle</span>
          </button>
        `);
        actionButtons.push(`
          <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="closeDetail(); tolakServiceModal('${req.noSurat}', 'SERVICE');">
            <span class="material-symbols-rounded">cancel</span>
          </button>
        `);
      } else if (isAdminUser) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="closeDetail(); approveDM('${req.noSurat}');">
            <span class="material-symbols-rounded">check_circle</span>
          </button>
        `);
        actionButtons.push(`
          <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="closeDetail(); tolakServiceModal('${req.noSurat}', 'DM');">
            <span class="material-symbols-rounded">cancel</span>
          </button>
        `);
      }
    }
    
    if (role === 'DM' && req.serviceApprove) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="closeDetail(); approveDM('${req.noSurat}');">
          <span class="material-symbols-rounded">check_circle</span>
        </button>
      `);
      actionButtons.push(`
        <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="closeDetail(); tolakServiceModal('${req.noSurat}', 'DM');">
          <span class="material-symbols-rounded">cancel</span>
        </button>
      `);
    }
  }

  const isPdfVisible = (req.status === 'APPROVE' || req.status === 'DONE' || (isAdminUser && req.status !== 'REJECT'));
  if (isPdfVisible) {
    actionButtons.push(`
      <button type="button" class="btnIcon btnPdf btnIconOnly" title="CETAK PDF" onclick="closeDetail(); bukaPdfModal('${req.noSurat}');">
        <span class="material-symbols-rounded">picture_as_pdf</span>
      </button>
    `);
  }

  if (req.status === 'APPROVE' && (role === 'SERVICE' || isAdminUser)) {
    actionButtons.push(`
      <button type="button" class="btnIcon btnDone btnIconOnly" title="SET DONE" onclick="closeDetail(); doneService('${req.noSurat}');">
        <span class="material-symbols-rounded">task_alt</span>
      </button>
    `);
  }

  const isCreator = currentUser && (req.userId === currentUser.id || req.createdBy === currentUser.fullName || (currentUser.category === 'TOKO' && req.toko.toUpperCase() === currentUser.fullName.toUpperCase()));
  const canCreatorEditDelete = isCreator && !req.serviceApprove && req.status === 'PENDING';
  const canServiceEditDelete = (role === 'SERVICE' && !req.serviceApprove && req.status === 'PENDING');
  const canAdminEditDelete = isAdminUser;

  if (canCreatorEditDelete || canServiceEditDelete || canAdminEditDelete) {
    actionButtons.push(`
      <button type="button" class="btnIcon btnEdit btnIconOnly" title="EDIT" onclick="closeDetail(); editPermintaan('${req.noSurat}');">
        <span class="material-symbols-rounded">edit</span>
      </button>
    `);
    actionButtons.push(`
      <button type="button" class="btnIcon btnDelete btnIconOnly" title="HAPUS" onclick="closeDetail(); hapusData('${req.noSurat}');">
        <span class="material-symbols-rounded">delete</span>
      </button>
    `);
  }

  if (actionButtons.length > 0) {
    bottomActionsHtml = `
      <div class="popupDetailActions" style="justify-content: flex-start !important; text-align: left !important; flex-wrap: wrap !important;">
        ${actionButtons.join('')}
      </div>
    `;
  }

  msgBox.innerHTML = `
    ${headerInfoHtml}
    <div class="popupTableScroll">
      <table class="detailTable2">
        <thead>
          <tr>
            <th style="width:45px; text-align:center;">NO</th>
            <th>TYPE</th>
            <th>SERI</th>
            <th>PERMINTAAN</th>
            ${isDus ? '<th>NO SN DUS</th>' : ''}
            <th>ALASAN</th>
            <th style="width:55px; text-align:center;">QTY</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
    ${bottomActionsHtml}
  `;

  const popupDetail = document.getElementById('popupDetail');
  if (popupDetail) popupDetail.style.display = 'flex';

  const notifBtn = document.getElementById('notifBellBtn');
  const helpBtn = document.getElementById('helpButton');
  if (notifBtn) notifBtn.style.setProperty('display', 'flex', 'important');
  if (helpBtn) helpBtn.style.setProperty('display', 'flex', 'important');
}

function closeDetail() {
  const detailModal = document.getElementById('popupDetail');
  if (detailModal) {
    detailModal.style.display = 'none';
    detailModal.classList.remove('show');
  }

  setTimeout(() => {
    const notifBtn = document.getElementById('notifBellBtn');
    const helpBtn = document.getElementById('helpButton');
    const dashboardPage = document.getElementById('dashboardPage');
    
    if (dashboardPage && dashboardPage.classList.contains('active')) {
      if (notifBtn) notifBtn.style.setProperty('display', 'flex', 'important');
      if (helpBtn) helpBtn.style.setProperty('display', 'flex', 'important');
    }
  }, 100);
}

const PDF_MODEL_KEY = 'SELECTED_PDF_MODEL';
let currentlyPreviewedModel = 'MODEL_1';

const PDF_MODELS_DATA = [
  { id: 'MODEL_1', title: 'MODE 1: STANDAR KLASIK', desc: 'Resmi, formal dengan underline header hitam & header tabel biru klasik.', color: '#0284c7' },
  { id: 'MODEL_2', title: 'MODE 2: MODERN MINIMALIS', desc: 'Header banner biru melengkung modern, tabel slate soft & badge terpadu.', color: '#0284c7' },
  { id: 'MODEL_3', title: 'MODE 3: ELEGANT CORPORATE', desc: 'Header navy gelap berbingkai aksen emas gold & font korporat elegan.', color: '#0f172a' },
  { id: 'MODEL_4', title: 'MODE 4: COMPACT GRID BOX', desc: 'Struktur grid hijau emerald bersih dengan border terstruktur presisi.', color: '#059669' },
  { id: 'MODEL_5', title: 'MODE 5: LUXURY GRADIENT BRAND', desc: 'Banner violet/purple gradient mewah dengan aksen badge rounded.', color: '#7c3aed' }
];

function getActivePdfModel() {
  return appStorage.getItem(PDF_MODEL_KEY) || 'MODEL_1';
}

function updateActivePdfModelBadge() {
  const badge = document.getElementById('activePdfModelBadge');
  if (!badge) return;
  const activeId = getActivePdfModel();
  const modelObj = PDF_MODELS_DATA.find(m => m.id === activeId) || PDF_MODELS_DATA[0];
  badge.textContent = `${modelObj.title.toUpperCase()}`;
}

function bukaModalPdfModels() {
  currentlyPreviewedModel = getActivePdfModel();
  renderFullPdfPreviewDocument(currentlyPreviewedModel);
  updatePdfModelSelectorButtons();
  const modal = document.getElementById('popupPdfModelsModal');
  if (modal) modal.style.display = 'flex';
  pushPopupHistoryState();
}

function tutupModalPdfModels() {
  const modal = document.getElementById('popupPdfModelsModal');
  if (modal) modal.style.display = 'none';
}

function switchPdfPreviewModel(modelId) {
  currentlyPreviewedModel = modelId;
  renderFullPdfPreviewDocument(currentlyPreviewedModel);
  updatePdfModelSelectorButtons();
}

function konfirmasiGunakanModelPdf() {
  appStorage.setItem(PDF_MODEL_KEY, currentlyPreviewedModel);
  updateActivePdfModelBadge();
  showNotif(`BERHASIL MENYIMPAN & MENGAKTIFKAN TEMPLATE PDF ${currentlyPreviewedModel.replace('_', ' ')}!`, 'success');
  tutupModalPdfModels();
}

function updatePdfModelSelectorButtons() {
  const containerNav = document.getElementById('pdfModelSelectorNav');
  const descBanner = document.getElementById('pdfModelDescBanner');

  const activeModelObj = PDF_MODELS_DATA.find(m => m.id === currentlyPreviewedModel) || PDF_MODELS_DATA[0];

  if (descBanner) {
    descBanner.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div style="font-weight:900; font-size:12.5px; color:var(--text-main); text-transform:uppercase; display:flex; align-items:center; gap:6px;">
          <span class="material-symbols-rounded" style="color:${activeModelObj.color}; font-size:18px;">style</span>
          ${activeModelObj.title}
        </div>
        <div style="font-size:11.5px; color:var(--text-muted); font-weight:600;">${activeModelObj.desc}</div>
      </div>
    `;
  }

  if (!containerNav) return;
  containerNav.innerHTML = '';

  PDF_MODELS_DATA.forEach(m => {
    const isActive = (m.id === currentlyPreviewedModel);
    const num = m.id.replace('MODEL_', '');
    
    let btnBg = 'var(--bg-box)';
    if (isActive) {
      btnBg = (m.color === '#0f172a' ? '#0f172a' : (m.color || '#7c3aed'));
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btnPdfNumSimple ${isActive ? 'active' : ''}`;
    btn.style.background = btnBg;
    if (isActive) {
      btn.style.color = '#ffffff';
    }

    btn.onclick = () => switchPdfPreviewModel(m.id);
    btn.innerHTML = `${num}`;
    btn.title = m.title;
    containerNav.appendChild(btn);
  });
}

function renderFullPdfPreviewDocument(modelId) {
  const container = document.getElementById('pdfModelFullPreviewArea');
  if (!container) return;

  const m = PDF_MODELS_DATA.find(x => x.id === modelId) || PDF_MODELS_DATA[0];

  let tableHeaderBg = '#0284c7';
  let headerTitleHtml = `
    <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 14px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
      PERMINTAAN TOKO
    </div>
  `;

  if (modelId === 'MODEL_2') {
    tableHeaderBg = '#334155';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; padding: 12px 18px; border-radius: 10px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_3') {
    tableHeaderBg = '#0f172a';
    headerTitleHtml = `
      <div style="background: #0f172a; color: #fbbf24; padding: 14px 18px; border-radius: 8px; border-bottom: 4px solid #fbbf24; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1.5px; text-transform: uppercase;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_4') {
    tableHeaderBg = '#059669';
    headerTitleHtml = `
      <div style="background: #059669; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1px; border-left: 6px solid #047857;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_5') {
    tableHeaderBg = '#7c3aed';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); color: #ffffff; padding: 14px 18px; border-radius: 12px; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1.5px; box-shadow: 0 6px 18px rgba(124,58,237,0.3);">
        PERMINTAAN TOKO
      </div>
    `;
  }

  container.innerHTML = `
    <div style="background: #ffffff; color: #0f172a; width: 100%; max-width: 720px; margin: 0 auto; padding: 20px 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-family: Arial, sans-serif; box-sizing: border-box; border: 1px solid #cbd5e1;">
      ${headerTitleHtml}

      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; padding: 2px 0; flex-wrap: wrap; gap: 6px; background: transparent; border: none;">
        <div><b>NO SURAT:</b> <span style="color:${m.color}; font-weight:800;">PRM/2026/001</span></div>
        <div><b>TOKO:</b> TOKO UTAMA BANDUNG</div>
        <div><b>TANGGAL:</b> 01/08/2026</div>
        <div><b>JENIS:</b> UNIT</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: ${tableHeaderBg}; color: #ffffff;">
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">NO</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">TIPE BARANG</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">NO. SERI</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">NAMA BARANG</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">ALASAN</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">QTY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0;">1</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">AC DAIKIN 2 PK</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">SN-889920112</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">UNIT INDOOR AC 2PK</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">KOMPRESOR BOCOR FREON</td>
            <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0; font-weight:bold;">1</td>
          </tr>
          <tr>
            <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0;">2</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">KULKAS 2 PINTU</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">SN-776655100</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">UNIT KULKAS INVERTER</td>
            <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">KARET PINTU LONGGAR</td>
            <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0; font-weight:bold;">1</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 8px; margin-bottom: 12px; font-size: 11px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1.5px solid #0284c7; border-left: 5px solid ${tableHeaderBg}; padding: 8px 12px; border-radius: 6px; color: #0f172a;">
        <div style="font-weight: 800; font-size: 11px; color: ${tableHeaderBg === '#0f172a' ? '#0369a1' : tableHeaderBg}; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
          <span>📌</span> CATATAN / KETERANGAN PERMINTAAN:
        </div>
        <div style="font-weight: 600; color: #0f172a; font-size: 11px;">MOHON DIPROSES SECEPATNYA UNTUK KEPERLUAN DISPLAY TOKO UTAMA.</div>
      </div>

      <div style="display: flex; justify-content: space-around; font-size: 10.5px; text-align: center; margin-top: 14px;">
        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 95px;">
          <div style="font-weight: 800; color: #0f172a; text-transform: uppercase;">PEMOHON</div>
          <div style="height: 35px;"></div>
          <div>
            <div style="font-weight: 800; color: #0f172a; font-size: 11px;">TOKO UTAMA</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">PEMOHON (TOKO)</div>
          </div>
        </div>

        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 95px;">
          <div style="font-weight: 800; color: #0f172a; text-transform: uppercase;">DIPERIKSA</div>
          <div style="height: 35px;"></div>
          <div>
            <div style="font-weight: 800; color: #0f172a; font-size: 11px;">SERVICE BANDUNG</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">HODS BANDUNG</div>
          </div>
        </div>

        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 95px;">
          <div style="font-weight: 800; color: #0f172a; text-transform: uppercase;">DISETUJUI</div>
          <div style="height: 35px;"></div>
          <div>
            <div style="font-weight: 800; color: #0f172a; font-size: 11px;">FERRY EDIYANTO</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">DISTRICT MANAGER</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bukaPdfModal(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  const pdfContainer = document.getElementById('pdfDocumentContent');
  if (!pdfContainer) return;

  const activeModel = getActivePdfModel();

  let itemRowsHtml = req.items.map((i, idx) => `
    <tr>
      <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${i.type}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${i.seri}</td>
      ${req.jenis === 'DUS' ? `<td style="padding:6px 8px; border-bottom:1px solid #e2e8f0; color:#d97706;">${i.dus || '-'}</td>` : ''}
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${i.barang}</td>
      <td style="padding:6px 8px; border-bottom:1px solid #e2e8f0;">${i.alasan}</td>
      <td style="text-align:center; padding:6px 8px; border-bottom:1px solid #e2e8f0;">${i.qty}</td>
    </tr>
  `).join('');

  const users = getUsersFromDB();
  const serviceUser = users.find(u => u.category === 'SERVICE' && u.area === req.area) || users.find(u => u.category === 'SERVICE');
  const dmUser = users.find(u => u.category === 'DM') || users.find(u => u.username === 'ADMIN');
  const serviceName = req.serviceUserName || (serviceUser ? serviceUser.fullName : 'SERVICE SUPERVISOR');

  const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
  let serviceTTD = req.serviceTTD || '';
  if (!serviceTTD && serviceUser) {
    serviceTTD = ttdMap[serviceUser.id] || ttdMap[serviceUser.username] || ttdMap[serviceUser.fullName] || '';
  }
  if (!serviceTTD) {
    serviceTTD = ttdMap['SERVICE_' + req.area] || ttdMap['SERVICE'] || ttdMap['HODS'] || '';
  }

  let dmTTD = req.dmTTD || '';
  if (!dmTTD && dmUser) {
    dmTTD = ttdMap[dmUser.id] || ttdMap[dmUser.username] || ttdMap[dmUser.fullName] || '';
  }
  if (!dmTTD) {
    dmTTD = ttdMap['DM'] || ttdMap['DM'] || '';
  }

  const nowPrint = new Date();
  const pDay = String(nowPrint.getDate()).padStart(2, '0');
  const pMonth = String(nowPrint.getMonth() + 1).padStart(2, '0');
  const pYear = nowPrint.getFullYear();
  const pHour = String(nowPrint.getHours()).padStart(2, '0');
  const pMin = String(nowPrint.getMinutes()).padStart(2, '0');
  const pSec = String(nowPrint.getSeconds()).padStart(2, '0');
  const timestampStr = `DICETAK PADA ${pDay}/${pMonth}/${pYear} Pukul ${pHour}:${pMin}:${pSec}`;

  let photoSection = '';
  if (req.photos && req.photos.length > 0) {
    photoSection = `
      <div style="margin-top: 12px; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #1e293b;">FOTO BARANG PENDUKUNG:</div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          ${req.photos.map(p => `
            <div style="width: 95px; height: 95px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #000;">
              <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const areaNameMap = {
    TSM: 'TASIKMALAYA',
    BDG: 'BANDUNG',
    BDU: 'BANDUNG UTARA',
    CRB: 'CIREBON',
    SKB: 'SUKABUMI',
    SBN: 'SUBANG'
  };
  const hodsAreaTitle = `HODS ${areaNameMap[req.area] || req.area}`;

  let tableHeaderBg = '#0284c7';
  let headerTitleHtml = `
    <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 14px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
      PERMINTAAN TOKO
    </div>
  `;

  if (activeModel === 'MODEL_2') {
    tableHeaderBg = '#334155';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; padding: 12px 18px; border-radius: 10px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (activeModel === 'MODEL_3') {
    tableHeaderBg = '#0f172a';
    headerTitleHtml = `
      <div style="background: #0f172a; color: #fbbf24; padding: 14px 18px; border-radius: 8px; border-bottom: 4px solid #fbbf24; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1.5px; text-transform: uppercase;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (activeModel === 'MODEL_4') {
    tableHeaderBg = '#059669';
    headerTitleHtml = `
      <div style="background: #059669; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1px; border-left: 6px solid #047857;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (activeModel === 'MODEL_5') {
    tableHeaderBg = '#7c3aed';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); color: #ffffff; padding: 14px 18px; border-radius: 12px; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 14px; letter-spacing: 1.5px; box-shadow: 0 6px 18px rgba(124,58,237,0.3);">
        PERMINTAAN TOKO
      </div>
    `;
  }

  pdfContainer.innerHTML = `
    <div class="pdf-paper" style="min-height: 680px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px; color: #0f172a; background: #ffffff; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
      <div>
        ${headerTitleHtml}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; background: transparent; border: none;">
          <tr>
            <td style="padding: 4px 0; width: 14%; font-weight: bold; border: none;">NO SURAT</td>
            <td style="padding: 4px 0; width: 2%; border: none;">:</td>
            <td style="padding: 4px 0; width: 34%; font-weight: 700; color: #0284c7; border: none;">${req.noSurat}</td>
            <td style="padding: 4px 0; width: 14%; font-weight: bold; border: none;">TANGGAL</td>
            <td style="padding: 4px 0; width: 2%; border: none;">:</td>
            <td style="padding: 4px 0; width: 34%; font-weight: 600; border: none;">${formatDateDDMMYYYYString(req.tanggal)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; border: none;">TOKO</td>
            <td style="padding: 4px 0; border: none;">:</td>
            <td style="padding: 4px 0; font-weight: 700; border: none;">${req.toko}</td>
            <td style="padding: 4px 0; font-weight: bold; border: none;">JENIS</td>
            <td style="padding: 4px 0; border: none;">:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #16a34a; border: none;">${req.jenis || 'DEFAULT'}</td>
          </tr>
        </table>

        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #0f172a;">DETAIL PERMINTAAN:</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: ${tableHeaderBg}; color: #ffffff;">
              <th style="width: 32px; text-align:center; padding:6px 8px; border:1px solid #cbd5e1;">NO</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">TIPE BARANG</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">NO. SERI</th>
              ${req.jenis === 'DUS' ? `<th style="padding:6px 8px; border:1px solid #cbd5e1;">NO. SERI DUS</th>` : ''}
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">PERMINTAAN BARANG</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">ALASAN PERMINTAAN</th>
              <th style="width: 45px; text-align:center; padding:6px 8px; border:1px solid #cbd5e1;">QTY</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>

        ${photoSection}

        ${(() => {
          const cTxt = (req.catatan || '').trim();
          if (cTxt && cTxt !== '-') {
            return `
              <div style="margin-top: 12px; margin-bottom: 16px; font-size: 11.5px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1.5px solid #0284c7; border-left: 6px solid ${tableHeaderBg}; padding: 12px 16px; border-radius: 8px; box-shadow: 0 3px 10px rgba(2,132,199,0.12); color: #0f172a; opacity: 1 !important;">
                <div style="font-weight: 800; font-size: 11.5px; color: ${tableHeaderBg === '#0f172a' ? '#0369a1' : tableHeaderBg}; margin-bottom: 4px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 14px;">📌</span> CATATAN / KETERANGAN PERMINTAAN:
                </div>
                <div style="font-weight: 600; color: #0f172a; line-height: 1.5; font-size: 11.5px; word-break: break-word;">${cTxt}</div>
              </div>
            `;
          }
          return '';
        })()}
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 28px; text-align: center; font-size: 11px;">
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">PEMOHON</div>
            <div style="height: 55px;"></div>
            <div>
              <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">${req.toko}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">PEMOHON (TOKO)</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DIPERIKSA</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${serviceTTD ? `<img src="${serviceTTD}" style="max-height: 52px; max-width: 100%; object-fit: contain;">` : ''}
            </div>
            <div>
              <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">${serviceName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">${hodsAreaTitle}</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DISETUJUI</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${dmTTD ? `<img src="${dmTTD}" style="max-height: 52px; max-width: 100%; object-fit: contain;">` : ''}
            </div>
            <div>
              <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">FERRY EDIYANTO</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">DISTRICT MANAGER</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 36px; text-align: right; font-size: 8px; font-style: italic; color: #64748b; opacity: 0.85; letter-spacing: 0.2px;">
          ${timestampStr}
        </div>
      </div>
    </div>
  `;

  const pdfModal = document.getElementById('pdfModal');
  if (pdfModal) pdfModal.style.display = 'flex';
}

function tutupPdfModal() {
  const pdfModal = document.getElementById('pdfModal');
  if (pdfModal) pdfModal.style.display = 'none';
}

function cetakDokumenPdf() {
  window.print();
}

function bukaTTD() {
  if (!currentUser || (currentUser.category !== 'SERVICE' && currentUser.category !== 'DM')) {
    showNotif('TANDA TANGAN DIGITAL KHUSUS UNTUK SERVICE & DM!', 'warning');
    return;
  }
  const modal = document.getElementById('popupTTD');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
  pushPopupHistoryState();
  setTimeout(() => {
    initCanvasTTD();
    loadTTD();
  }, 100);
}

function tutupTTD() {
  const modalTTD = document.getElementById('popupTTD');
  if (modalTTD) {
    modalTTD.classList.remove('show');
    modalTTD.style.display = 'none';
  }
}

function initCanvasTTD() {
  canvasTTD = document.getElementById('canvasTTD');
  if (!canvasTTD) return;

  const rect = canvasTTD.getBoundingClientRect();
  canvasTTD.width = rect.width || canvasTTD.offsetWidth || 540;
  canvasTTD.height = rect.height || canvasTTD.offsetHeight || 220;

  ctxTTD = canvasTTD.getContext('2d');
  ctxTTD.lineWidth = 2.8;
  ctxTTD.lineCap = 'round';
  ctxTTD.lineJoin = 'round';
  ctxTTD.strokeStyle = '#000000';

  ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);

  canvasTTD.onmousedown = null;
  canvasTTD.onmousemove = null;
  canvasTTD.onmouseup = null;
  canvasTTD.onmouseleave = null;

  canvasTTD.onmousedown = startDraw;
  canvasTTD.onmousemove = draw;
  canvasTTD.onmouseup = stopDraw;
  canvasTTD.onmouseleave = stopDraw;

  canvasTTD.addEventListener('touchstart', startDrawTouch, { passive: false });
  canvasTTD.addEventListener('touchmove', drawTouch, { passive: false });
  canvasTTD.addEventListener('touchend', stopDraw);
}

function getCanvasPointFromEvent(e) {
  if (!canvasTTD) return { x: 0, y: 0 };

  const rect = canvasTTD.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function startDrawTouch(e) {
  if (e.cancelable) e.preventDefault();
  isDrawing = true;
  const point = getCanvasPointFromEvent(e);
  lastX = point.x;
  lastY = point.y;
  ctxTTD.beginPath();
  ctxTTD.moveTo(lastX, lastY);
}

function drawTouch(e) {
  if (e.cancelable) e.preventDefault();
  if (!isDrawing) return;
  const point = getCanvasPointFromEvent(e);
  const x = point.x;
  const y = point.y;
  const mx = (lastX + x) / 2;
  const my = (lastY + y) / 2;
  ctxTTD.quadraticCurveTo(lastX, lastY, mx, my);
  ctxTTD.stroke();
  lastX = x;
  lastY = y;
}

function startDraw(e) {
  isDrawing = true;
  const point = getCanvasPointFromEvent(e);
  lastX = point.x;
  lastY = point.y;
  ctxTTD.beginPath();
  ctxTTD.moveTo(lastX, lastY);
}

function draw(e) {
  if (!isDrawing) return;
  const point = getCanvasPointFromEvent(e);
  const x = point.x;
  const y = point.y;
  const mx = (lastX + x) / 2;
  const my = (lastY + y) / 2;
  ctxTTD.quadraticCurveTo(lastX, lastY, mx, my);
  ctxTTD.stroke();
  lastX = x;
  lastY = y;
}

function stopDraw() { isDrawing = false; }

function hapusTTD() {
  if (ctxTTD && canvasTTD) ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
}

function simpanTTD() {
  showConfirm('SIMPAN TANDA TANGAN DIGITAL INI?', () => {
    if (!canvasTTD) return;
    const png = canvasTTD.toDataURL('image/png');
    const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
    const key = currentUser.category === 'DM' ? 'DM' : `SERVICE_${currentUser.area}`;
    ttdMap[key] = png;
    ttdMap[currentUser.fullName] = png;
    ttdMap[currentUser.username] = png;
    ttdMap[currentUser.id] = png;
    if (currentUser.category === 'SERVICE') {
      ttdMap['SERVICE'] = png;
      ttdMap[`SERVICE_${currentUser.area}`] = png;
      ttdMap['HODS'] = png;
    }
    appStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
    
    // SIMPAN PERSISTEN PADA PENYIMPANAN LOKAL (LOCALSTORAGE) PERANGKAT
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('APP_USER_TTD_MAP', JSON.stringify(ttdMap));
        if (currentUser) {
          if (currentUser.id) localStorage.setItem(`LOCAL_TTD_${currentUser.id}`, png);
          if (currentUser.username) localStorage.setItem(`LOCAL_TTD_${currentUser.username}`, png);
        }
      }
    } catch(e) {}

    if (currentUser) {
      if (currentUser.id) appStorage.setItem(`LOCAL_TTD_${currentUser.id}`, png);
      if (currentUser.username) appStorage.setItem(`LOCAL_TTD_${currentUser.username}`, png);
    }
    
    pushCentralCloudDB();
    showNotif('TANDA TANGAN BERHASIL DISIMPAN PADA PENYIMPANAN LOKAL PERANGKAT & CLOUD!', 'info');
    tutupTTD();
  });
}

function loadTTD() {
  let localTTD = null;
  try {
    if (typeof localStorage !== 'undefined' && currentUser) {
      localTTD = localStorage.getItem(`LOCAL_TTD_${currentUser.id}`) || localStorage.getItem(`LOCAL_TTD_${currentUser.username}`);
    }
  } catch(e) {}

  let ttdMap = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const rawMap = localStorage.getItem('APP_USER_TTD_MAP');
      if (rawMap) ttdMap = JSON.parse(rawMap);
    }
  } catch(e) {}

  if (!Object.keys(ttdMap).length) {
    ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
  }

  const data = localTTD || (currentUser ? (appStorage.getItem(`LOCAL_TTD_${currentUser.id}`) || appStorage.getItem(`LOCAL_TTD_${currentUser.username}`) || ttdMap[currentUser.id] || ttdMap[currentUser.username] || ttdMap[currentUser.fullName]) : null);
  if (data && ctxTTD && canvasTTD) {
    const img = new Image();
    img.onload = () => {
      ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
      ctxTTD.drawImage(img, 0, 0, canvasTTD.width, canvasTTD.height);
    };
    img.src = data;
  }
}

let activeChatRefreshInterval = null;

function refreshActiveChatUI() {
  if (!currentUser) return;
  const popupBantuan = document.getElementById('popupBantuan');
  if (popupBantuan && (popupBantuan.classList.contains('show') || popupBantuan.style.display === 'block')) {
    const chatBody = document.getElementById('chatBody');
    if (typeof isAdminChat !== 'undefined' && isAdminChat) {
      if (typeof currentRoom !== 'undefined' && currentRoom && chatBody && chatBody.style.display !== 'none') {
        loadChatAdmin(currentRoom);
      } else {
        loadDaftarChatAdmin();
      }
    } else {
      loadChatUser();
    }
  }
  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
}

function startActiveChatRefresh() {
  if (activeChatRefreshInterval) return;
  activeChatRefreshInterval = setInterval(() => {
    const popupBantuan = document.getElementById('popupBantuan');
    if (popupBantuan && (popupBantuan.classList.contains('show') || popupBantuan.style.display === 'block')) {
      if (typeof syncAllDataToCache === 'function') {
        syncAllDataToCache().then(() => {
          refreshActiveChatUI();
        }).catch(() => {
          refreshActiveChatUI();
        });
      } else {
        refreshActiveChatUI();
      }
    } else {
      stopActiveChatRefresh();
    }
  }, 2000);
}

function stopActiveChatRefresh() {
  if (activeChatRefreshInterval) {
    clearInterval(activeChatRefreshInterval);
    activeChatRefreshInterval = null;
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === CHAT_DB_KEY || e.key === CHAT_ROOM_DB_KEY) {
    refreshActiveChatUI();
  }
});

function isServiceTSMUser() {
  if (!currentUser) return false;
  const cat = String(currentUser.category || '').trim().toUpperCase();
  const area = String(currentUser.area || '').trim().toUpperCase();
  const uname = String(currentUser.username || '').trim().toUpperCase();

  return (cat === 'SERVICE' && (area === 'TSM' || area === 'ALL')) || cat === 'ADMIN' || uname === 'ADMIN';
}

async function bukaBantuan() {
  if (!currentUser) return;
  
  // SERVICE TSM or ADMIN acts as Customer Service Support Receiver
  isAdminChat = isServiceTSMUser();

  const popup = document.getElementById('popupBantuan');
  const btnHelp = document.getElementById('helpButton');
  if (btnHelp) btnHelp.style.display = 'none';
  if (popup) {
    popup.style.display = 'block';
    popup.classList.add('show');
    try { history.pushState({ popup: 'bantuan' }, '', location.href); } catch(e) {}
  }

  // SINKRONKAN CHAT & ROOM TERBARU DARI CLOUD DB PADA SAAT MENU CHAT DIBUKA
  if (typeof syncAllDataToCache === 'function') {
    await syncAllDataToCache().catch(() => {});
  }

  const chatList = document.getElementById('chatList');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (isAdminChat) {
    if (chatList) chatList.style.display = 'block';
    if (chatBody) chatBody.style.display = 'none';
    if (chatFooter) chatFooter.style.display = 'none';
    if (btnBack) btnBack.style.display = 'none';
    if (headerTitle) headerTitle.innerText = 'CHAT MASUK - SERVICE TSM';
    loadDaftarChatAdmin();
  } else {
    if (chatList) chatList.style.display = 'none';
    if (chatBody) chatBody.style.display = 'block';
    if (chatFooter) chatFooter.style.display = 'flex';
    if (btnBack) btnBack.style.display = 'none';
    if (headerTitle) headerTitle.innerText = 'SERVICE TSM SUPPORT';
    loadChatUser();
  }

  // AKTIFKAN REFRESH CHAT REALTIME JIKA KOLOM CHAT SEDANG DIBUKA
  startActiveChatRefresh();
}

function tutupBantuan() {
  stopActiveChatRefresh();

  const popup = document.getElementById('popupBantuan');
  if (popup) {
    popup.classList.remove('show'); 
    setTimeout(() => popup.style.display = 'none', 250); 
  }
  
  const activePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
  if (typeof aturTampilanLonceng === 'function') {
    aturTampilanLonceng(activePage);
  }

  if (typeof cekUnreadNotif === 'function') {
    cekUnreadNotif();
  }
}

function loadDaftarChatAdmin() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;
  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  chatList.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    chatList.innerHTML = `
      <div style="padding:30px 16px; text-align:center; color:var(--text-muted); font-size:12.5px;">
        <span class="material-symbols-rounded" style="font-size:36px; color:var(--primary); margin-bottom:6px; display:block;">chat_bubble_outline</span>
        BELUM ADA CHAT MASUK DARI TOKO / SALES.
      </div>
    `;
    return;
  }

  rooms.forEach(r => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:12px 14px; border-bottom:1px solid var(--border-color); cursor:pointer; transition:background 0.2s;';
    const unreadBadgeHtml = r.unreadAdmin > 0 ? `<span style="background:#ef4444; color:#fff; border-radius:10px; padding:2px 8px; font-size:10px; font-weight:bold;">${r.unreadAdmin} UNREAD</span>` : '';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <div style="font-size:13px; font-weight:700; color:var(--text-main);">
          ${r.user} <span style="font-size:11px; font-weight:bold; color:var(--primary); background:rgba(59,130,246,0.15); padding:2px 6px; border-radius:4px;">(${r.userArea || 'TSM'})</span>
        </div>
        ${unreadBadgeHtml}
      </div>
      <div style="color:var(--text-muted); font-size:11.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.last || '-'}</div>
    `;
    item.onclick = () => bukaRoomAdmin(r.room, r.user);
    chatList.appendChild(item);
  });
}

function bukaRoomAdmin(room, user) {
  currentRoom = room;
  currentChatUser = user;

  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  const roomUpper = String(room || '').toUpperCase();
  const userUpper = String(user || '').toUpperCase();

  const rIdx = rooms.findIndex(x => String(x.room || '').toUpperCase() === roomUpper || String(x.user || '').toUpperCase() === userUpper);
  if (rIdx !== -1) {
    rooms[rIdx].unreadAdmin = 0;
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
  }

  const chatList = document.getElementById('chatList');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (chatList) chatList.style.display = 'none';
  if (chatBody) chatBody.style.display = 'block';
  if (chatFooter) chatFooter.style.display = 'flex';
  if (btnBack) btnBack.style.display = 'inline-block';
  if (headerTitle) headerTitle.innerText = 'CHAT WITH ' + user;
  loadChatAdmin(room);
}

function loadChatAdmin(room) {
  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const roomUpper = String(room || '').toUpperCase();
  const userUpper = String(currentChatUser || '').toUpperCase();

  const roomChats = allChats.filter(c => 
    String(c.room || '').toUpperCase() === roomUpper || 
    String(c.user || '').toUpperCase() === userUpper
  );

  const body = document.getElementById('chatBody');
  if (!body) return;

  const isAtBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 80;
  body.innerHTML = '';

  if (roomChats.length === 0) {
    body.innerHTML = `<div class="chatAdmin"><div class="chatText">PESAN DARI ${currentChatUser || 'USER'} AKAN TAMPIL DI SINI.</div></div>`;
  } else {
    roomChats.forEach(c => {
      const isSelf = (c.pengirim === 'SERVICE' || c.pengirim === 'ADMIN' || (currentUser && String(c.senderUsername).toUpperCase() === String(currentUser.username).toUpperCase()));
      const div = document.createElement('div');
      div.className = isSelf ? 'chatUser' : 'chatAdmin';
      div.innerHTML = `
        <div class="chatText">${c.pesan}</div>
        <div class="chatTime">${c.tanggal}</div>
      `;
      body.appendChild(div);
    });
  }

  if (isAtBottom || roomChats.length <= 5) {
    body.scrollTop = body.scrollHeight;
  }
}

function loadChatUser() {
  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const myUsernameUpper = String(currentUser ? currentUser.username : '').toUpperCase();
  const roomName = 'ROOM_' + myUsernameUpper;

  const userChats = allChats.filter(c => 
    String(c.room || '').toUpperCase() === roomName || 
    String(c.user || '').toUpperCase() === myUsernameUpper ||
    String(c.senderUsername || '').toUpperCase() === myUsernameUpper
  );

  const body = document.getElementById('chatBody');
  if (!body) return;

  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  const rIdx = rooms.findIndex(x => String(x.room || '').toUpperCase() === roomName || String(x.user || '').toUpperCase() === myUsernameUpper);
  if (rIdx !== -1 && rooms[rIdx].unreadUser > 0) {
    rooms[rIdx].unreadUser = 0;
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB(); 
    if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  }

  const isAtBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 80;
  body.innerHTML = '';

  if (userChats.length === 0) {
    body.innerHTML = `
      <div class="chatAdmin">
        <div class="chatText">HALO 👋<br>ADA YANG BISA KAMI BANTU UNTUK PERMINTAAN TOKO ANDA? SILAKAN KIRIM PESAN DI SINI.</div>
      </div>
    `;
  } else {
    userChats.forEach(c => {
      const isSelf = (c.pengirim === 'USER' || (currentUser && String(c.senderUsername).toUpperCase() === myUsernameUpper));
      const div = document.createElement('div');
      div.className = isSelf ? 'chatUser' : 'chatAdmin';
      div.innerHTML = `
        <div class="chatText">${c.pesan}</div>
        <div class="chatTime">${c.tanggal}</div>
      `;
      body.appendChild(div);
    });
  }

  if (isAtBottom || userChats.length <= 5) {
    body.scrollTop = body.scrollHeight;
  }
}

function kirimPesanChat() {
  const txt = document.getElementById('chatPesan');
  if (!txt || !currentUser) return;
  const pesan = txt.value.trim().toUpperCase();
  if (!pesan) return;

  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  const senderId = currentUser.id;
  const senderUsername = currentUser.username;
  const now = new Date();
  const timeStr = getFormattedDateDDMMYYYY(now) + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  if (isAdminChat) {
    const targetUser = currentChatUser || 'USER';
    const roomTarget = currentRoom || ('ROOM_' + String(targetUser).toUpperCase());
    const roomUpper = String(roomTarget).toUpperCase();

    allChats.push({
      room: roomTarget,
      user: targetUser,
      pengirim: 'SERVICE',
      senderId,
      senderUsername,
      senderName: `SERVICE TSM (${currentUser.fullName || currentUser.username})`,
      pesan,
      tanggal: timeStr
    });

    const rIdx = rooms.findIndex(x => String(x.room).toUpperCase() === roomUpper || String(x.user).toUpperCase() === String(targetUser).toUpperCase());
    if (rIdx !== -1) {
      rooms[rIdx].last = `SERVICE TSM: ${pesan}`;
      rooms[rIdx].unreadUser = (rooms[rIdx].unreadUser || 0) + 1;
      rooms[rIdx].lastTime = timeStr;
    } else {
      rooms.push({
        room: roomTarget,
        user: targetUser,
        userArea: 'TSM',
        last: `SERVICE TSM: ${pesan}`,
        unreadAdmin: 0,
        unreadUser: 1,
        lastTime: timeStr
      });
    }

    appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();

    txt.value = '';
    loadChatAdmin(roomTarget);
  } else {
    const myUsernameUpper = String(currentUser.username).toUpperCase();
    const room = 'ROOM_' + myUsernameUpper;
    const roomUpper = room.toUpperCase();

    allChats.push({
      room,
      user: currentUser.username,
      userArea: currentUser.area,
      pengirim: 'USER',
      senderId,
      senderUsername,
      senderName: `${currentUser.fullName || currentUser.username} (${currentUser.toko || currentUser.area})`,
      pesan,
      tanggal: timeStr
    });

    const rIdx = rooms.findIndex(x => String(x.room).toUpperCase() === roomUpper || String(x.user).toUpperCase() === myUsernameUpper);
    if (rIdx !== -1) {
      rooms[rIdx].last = pesan;
      rooms[rIdx].unreadAdmin = (rooms[rIdx].unreadAdmin || 0) + 1;
      rooms[rIdx].lastTime = timeStr;
      rooms[rIdx].userArea = currentUser.area;
    } else {
      rooms.push({
        room,
        user: currentUser.username,
        userArea: currentUser.area,
        last: pesan,
        unreadAdmin: 1,
        unreadUser: 0,
        lastTime: timeStr
      });
    }

    appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();

    txt.value = '';
    loadChatUser();
  }

  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
}

function kembaliKeDaftarAdmin() {
  const chatList = document.getElementById('chatList');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (chatBody) chatBody.style.display = 'none';
  if (chatFooter) chatFooter.style.display = 'none';
  if (chatList) chatList.style.display = 'block';
  if (btnBack) btnBack.style.display = 'none';
  if (headerTitle) headerTitle.innerText = 'DAFTAR PESAN MASUK';
  loadDaftarChatAdmin();
}

function cekUnreadNotif() {
  if (!currentUser) return;
  const badge = document.getElementById('unreadBadge');
  if (!badge) return;

  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

  if (isAdminChat) {
    const total = rooms.reduce((acc, curr) => acc + (curr.unreadAdmin || 0), 0);
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } else {
    const myRoom = rooms.find(r => r.room === 'ROOM_' + currentUser.username);
    if (myRoom && myRoom.unreadUser > 0) {
      badge.textContent = myRoom.unreadUser > 99 ? '99+' : myRoom.unreadUser;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function hapusSemuaChatAdmin() {
  if (!currentUser || (currentUser.category !== 'ADMIN' && String(currentUser.username).toUpperCase() !== 'ADMIN')) {
    showNotif('HANYA SUPER ADMIN YANG DAPAT MENGHAPUS SELURUH CHAT!', 'warning');
    return;
  }

  showConfirm('YAKIN INGIN MENGHAPUS SELURUH RIWAYAT CHAT & ROOM DARI FIREBASE CLOUD & PENYIMPANAN LOKAL?', () => {
    showLoading('MENGHAPUS SEMUA CHAT CLOUD...');
    setTimeout(async () => {
      try {
        // 1. KOSONGKAN PENYIMPANAN LOKAL
        appStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
        appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));

        // 2. KOSONGKAN DI FIRESTORE
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          try {
            await dbFirestore.collection('app_settings').doc('config').set({
              chatMessages: [],
              chatRooms: []
            }, { merge: true });
          } catch(e) {
            console.warn('[FIRESTORE CHAT DELETE NOTICE]:', e);
          }
        }

        // 3. KOSONGKAN DI REALTIME DB
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          try {
            await dbRealtime.ref('chat_messages').remove();
            await dbRealtime.ref('chat_rooms').remove();
          } catch(e) {
            console.warn('[RTDB CHAT DELETE NOTICE]:', e);
          }
        }

        // 4. SYNC CENTRAL CLOUD
        if (typeof pushCentralCloudDB === 'function') {
          pushCentralCloudDB();
        }

        hideLoading();
        showNotif('SELURUH PESAN CHAT & ROOM BERHASIL DIHAPUS DARI FIREBASE CLOUD!', 'success');

        if (typeof refreshActiveChatUI === 'function') {
          refreshActiveChatUI();
        }
      } catch (err) {
        hideLoading();
        console.error('[HAPUS CHAT ERROR]:', err);
        showNotif('TERJADI KESALAHAN SAAT MENGHAPUS CHAT!', 'error');
      }
    }, 400);
  });
}
window.hapusSemuaChatAdmin = hapusSemuaChatAdmin;

window.bukaBantuan = bukaBantuan;
window.tutupBantuan = tutupBantuan;
window.kirimPesanChat = kirimPesanChat;
window.kembaliKeDaftarAdmin = kembaliKeDaftarAdmin;
window.cekUnreadNotif = cekUnreadNotif;
window.loadDaftarChatAdmin = loadDaftarChatAdmin;
window.bukaRoomAdmin = bukaRoomAdmin;
window.loadChatAdmin = loadChatAdmin;
window.loadChatUser = loadChatUser;
window.startGlobalRealtimeLoop = startGlobalRealtimeLoop;

// GLOBAL EVENT LISTENER: CLICK OUTSIDE BACKDROP TO CLOSE POPUPS (PC / LAPTOP / MOBILE)
window.addEventListener('click', function (e) {
  // 1. Detail Barang Popup (#popupDetail)
  const popupDetail = document.getElementById('popupDetail');
  if (popupDetail && e.target === popupDetail && typeof closeDetail === 'function') {
    closeDetail();
  }

  // 2. Akun Profile Popup (#popupAkun)
  const popupAkun = document.getElementById('popupAkun');
  if (popupAkun && e.target === popupAkun && typeof tutupAkun === 'function') {
    tutupAkun();
  }

  // 3. PDF Models Selector Modal (#popupPdfModelsModal)
  const popupPdfModelsModal = document.getElementById('popupPdfModelsModal');
  if (popupPdfModelsModal && e.target === popupPdfModelsModal && typeof tutupModalPdfModels === 'function') {
    tutupModalPdfModels();
  }

  // 4. PDF Document Modal (#pdfModal)
  const pdfModal = document.getElementById('pdfModal');
  if (pdfModal && e.target === pdfModal && typeof tutupPdfModal === 'function') {
    tutupPdfModal();
  }

  // 5. User Form Modal (#popupUserForm)
  const popupUserForm = document.getElementById('popupUserForm');
  if (popupUserForm && e.target === popupUserForm && typeof tutupUserModal === 'function') {
    tutupUserModal();
  }

  // 6. Tambah Toko Modal (#popupTambahToko)
  const popupTambahToko = document.getElementById('popupTambahToko');
  if (popupTambahToko && e.target === popupTambahToko && typeof tutupModalTambahToko === 'function') {
    tutupModalTambahToko();
  }

  // 7. Reject Reason Modal (#rejectOverlay)
  const rejectOverlay = document.getElementById('rejectOverlay');
  if (rejectOverlay && e.target === rejectOverlay && typeof closeReject === 'function') {
    closeReject();
  }

  // 8. TTD Modal (#popupTTD)
  const popupTTD = document.getElementById('popupTTD');
  if (popupTTD && e.target === popupTTD && typeof tutupTTD === 'function') {
    tutupTTD();
  }

  // 9. Image Viewer Modal (#imageViewer)
  const imageViewer = document.getElementById('imageViewer');
  if (imageViewer && e.target === imageViewer && typeof tutupImageViewer === 'function') {
    tutupImageViewer();
  }
});


function loadUsersManagement() {
  loadAdminScriptUrlInput();
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  let users = getUsersFromDB();

  if (!Array.isArray(users) || users.length === 0) {
    users = [...SEED_USERS];
    saveUsersToDB(users);
  }

  tbody.innerHTML = '';

  users.forEach(u => {
    const isSuperAdmin = (String(u.username).trim().toUpperCase() === 'ADMIN');
    const chkHtml = !isSuperAdmin ? `<input type="checkbox" class="userCheckbox" value="${u.id}" onchange="updateMultiUserBtnState()" style="cursor:pointer; width:16px; height:16px;">` : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;">${chkHtml}</td>
      <td style="font-weight:600; color:var(--text-main);">${u.username}</td>
      <td style="font-family:monospace; color:var(--text-muted);">${u.password}</td>
      <td>${u.fullName}</td>
      <td><strong style="color:var(--primary);">${u.storeCode || '-'}</strong></td>
      <td>${u.phone || '-'}</td>
      <td><span class="badgeStatus badge-pending" style="font-weight:600;">${u.category}</span></td>
      <td><span style="color:var(--primary); font-weight:600;">${u.area}</span></td>
      <td style="text-align: right; white-space:nowrap;">
        <button class="btnIcon btnEdit" onclick="bukaUserModal('${u.id}')" title="EDIT USER"><span class="material-symbols-rounded">edit</span></button>
        ${!isSuperAdmin ? `<button class="btnIcon btnDelete" onclick="hapusUser('${u.id}')" title="HAPUS USER"><span class="material-symbols-rounded">delete</span></button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateMultiUserBtnState();
}

function toggleSelectAllUsers(masterCheckbox) {
  const isChecked = masterCheckbox ? masterCheckbox.checked : false;
  const checkboxes = document.querySelectorAll('.userCheckbox');
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
  });
  updateMultiUserBtnState();
}

function updateMultiUserBtnState() {
  const checkboxes = document.querySelectorAll('.userCheckbox:checked');
  const btn = document.getElementById('btnHapusMultiUser');
  const selectAll = document.getElementById('selectAllUsers');
  const totalCheckboxes = document.querySelectorAll('.userCheckbox');

  if (selectAll && totalCheckboxes.length > 0) {
    selectAll.checked = (checkboxes.length === totalCheckboxes.length);
  }

  if (btn) {
    if (checkboxes.length > 0) {
      btn.style.display = 'inline-flex';
      btn.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; margin-right:4px;">delete_sweep</span> HAPUS (${checkboxes.length}) USER`;
    } else {
      btn.style.display = 'none';
    }
  }
}

function hapusMultiUser() {
  const selectedCheckboxes = document.querySelectorAll('.userCheckbox:checked');
  const userIds = Array.from(selectedCheckboxes).map(cb => cb.value).filter(Boolean);

  if (userIds.length === 0) {
    showNotif('PILIH MINIMAL 1 USER UNTUK DIHAPUS!', 'warning');
    return;
  }

  const users = getUsersFromDB();
  const selectedUsers = users.filter(u => userIds.includes(u.id) && String(u.username).trim().toUpperCase() !== 'ADMIN');

  if (selectedUsers.length === 0) {
    showNotif('TIDAK ADA USER VALID YANG DAPAT DIHAPUS!', 'warning');
    return;
  }

  const usernamesStr = selectedUsers.map(u => u.username).join(', ');

  showConfirm(`YAKIN INGIN MENGHAPUS ${selectedUsers.length} USER TERPILIH? (${usernamesStr})`, () => {
    showLoading('MENGHAPUS USER TERPILIH...');
    setTimeout(() => {
      const delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
      
      selectedUsers.forEach(u => {
        if (!delUsers.includes(u.id)) delUsers.push(u.id);

        const docId = String(u.username).toUpperCase();
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          dbFirestore.collection('users').doc(docId).delete().catch(e => console.warn(e));
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          dbRealtime.ref(`users/${docId}`).remove().catch(e => console.warn(e));
        }
      });

      appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));

      const remainingUsers = users.filter(u => !userIds.includes(u.id) || String(u.username).trim().toUpperCase() === 'ADMIN');
      saveUsersToDB(remainingUsers);

      hideLoading();
      showNotif(`BERHASIL MENGHAPUS ${selectedUsers.length} USER TERPILIH!`, 'success');
      loadUsersManagement();
    }, 400);
  });
}
window.toggleSelectAllUsers = toggleSelectAllUsers;
window.updateMultiUserBtnState = updateMultiUserBtnState;
window.hapusMultiUser = hapusMultiUser;

function bukaUserModal(userId = null) {
  if (typeof userId !== 'string' || userId.startsWith('[object')) {
    userId = null;
  }

  const editIdInput = document.getElementById('editUserId');
  if (editIdInput) editIdInput.value = userId || '';

  const title = document.getElementById('userFormTitle');

  if (userId) {
    const u = getUsersFromDB().find(x => x && x.id === userId);
    if (u) {
      document.getElementById('uFormUsername').value = u.username || '';
      document.getElementById('uFormPassword').value = u.password || '';
      document.getElementById('uFormFullName').value = u.fullName || '';
      document.getElementById('uFormStoreCode').value = u.storeCode || '';
      document.getElementById('uFormPhone').value = u.phone || '';
      document.getElementById('uFormCategory').value = u.category || 'TOKO';
      document.getElementById('uFormArea').value = u.area || 'BDG';
      if (title) title.textContent = `EDIT USER: ${u.username}`;
    }
  } else {
    document.getElementById('uFormUsername').value = '';
    document.getElementById('uFormPassword').value = '';
    document.getElementById('uFormFullName').value = '';
    document.getElementById('uFormStoreCode').value = '';
    document.getElementById('uFormPhone').value = '';
    document.getElementById('uFormCategory').value = 'TOKO';
    document.getElementById('uFormArea').value = 'BDG';
    if (title) title.textContent = 'TAMBAH USER BARU';
  }

  const modal = document.getElementById('popupUserForm');
  if (modal) modal.style.display = 'flex';
}

function tutupUserModal() {
  const modal = document.getElementById('popupUserForm');
  if (modal) modal.style.display = 'none';
}

function simpanUserData() {
  let editId = document.getElementById('editUserId') ? document.getElementById('editUserId').value : '';
  if (typeof editId !== 'string' || editId.startsWith('[object')) {
    editId = '';
  }

  const username = document.getElementById('uFormUsername').value.trim().toUpperCase();
  const password = document.getElementById('uFormPassword').value.trim();
  const fullName = document.getElementById('uFormFullName').value.trim().toUpperCase();
  const storeCode = document.getElementById('uFormStoreCode').value.trim().toUpperCase();
  const phone = document.getElementById('uFormPhone').value.trim();
  const category = document.getElementById('uFormCategory').value;
  const area = document.getElementById('uFormArea').value;

  if (!username || !password || !fullName) {
    showNotif('USERNAME, PASSWORD, DAN NAMA LENGKAP WAJIB DIISI!', 'warning');
    return;
  }

  const users = getUsersFromDB();

  if (editId) {
    const idx = users.findIndex(u => u && u.id === editId);
    if (idx !== -1) {
      const duplicateWithOtherUser = users.some(u => {
        if (!u || !u.username || u.id === editId) return false;
        return String(u.username).trim().toUpperCase() === username;
      });

      if (duplicateWithOtherUser) {
        showNotif(`USERNAME '${username}' SUDAH TERDAFTAR! GUNAKAN USERNAME LAIN.`, 'error');
        return;
      }

      users[idx].username = username;
      users[idx].password = password;
      users[idx].fullName = fullName;
      users[idx].storeCode = storeCode;
      users[idx].phone = phone;
      users[idx].category = category;
      users[idx].area = area;
      saveUsersToDB(users);

      const docId = String(username).toUpperCase();
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('users').doc(docId).set(users[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`users/${docId}`).set(users[idx]).catch(e => console.warn(e));
      }
      if (typeof pushCentralCloudDB === 'function') {
        pushCentralCloudDB();
      }

      showNotif(`USER ${username} DIPERBARUI & DISINKRONKAN KE FIREBASE!`, 'info');
      tutupUserModal();
      loadUsersManagement();
      return;
    }
  }

  const deletedUserKeys = new Set(
    (JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]') || [])
      .filter(Boolean)
      .map(v => String(v).trim())
  );

  const isDuplicate = users.some(u => {
    if (!u || !u.username) return false;

    const existingUsername = String(u.username).trim().toUpperCase();
    if (existingUsername !== username) return false;
    if (deletedUserKeys.has(String(u.id || '').trim()) || deletedUserKeys.has(existingUsername)) {
      return false;
    }
    return true;
  });

  if (isDuplicate) {
    showNotif(`USERNAME '${username}' SUDAH TERDAFTAR! GUNAKAN USERNAME LAIN.`, 'error');
    return;
  }

  const delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
  const cleanDelUsers = delUsers.filter(x => {
    const value = String(x || '').trim();
    return value && value !== username && value.toUpperCase() !== username && value.toLowerCase() !== username.toLowerCase();
  });
  appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(cleanDelUsers));

  const newUser = {
    id: `USR-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    username,
    password,
    fullName,
    storeCode,
    phone,
    category,
    area,
    createdAt: getFormattedDateDDMMYYYY()
  };

  users.push(newUser);
  saveUsersToDB(users);

  const docId = String(username).toUpperCase();
  if (typeof dbFirestore !== 'undefined' && dbFirestore) {
    dbFirestore.collection('users').doc(docId).set(newUser).catch(e => console.warn(e));
  }
  if (typeof dbRealtime !== 'undefined' && dbRealtime) {
    dbRealtime.ref(`users/${docId}`).set(newUser).catch(e => console.warn(e));
  }
  if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB();
  }

  showNotif(`USER ${fullName} (${username}) BERHASIL DISIMPAN & DISINKRONKAN KE FIREBASE!`, 'success');

  tutupUserModal();
  loadUsersManagement();
}

function hapusUser(userId) {
  const users = getUsersFromDB();
  const u = users.find(x => x.id === userId);
  if (!u) return;

  if (currentUser && u.username.toUpperCase() === currentUser.username.toUpperCase()) {
    showNotif('TIDAK DAPAT MENGHAPUS AKUN AKTIF ANDA!', 'error');
    return;
  }

  showConfirm(`HAPUS USER '${u.fullName}' (${u.username})?`, () => {
    const delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
    if (!delUsers.includes(userId)) delUsers.push(userId);
    appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));

    const docId = String(u.username).toUpperCase();
    if (typeof dbFirestore !== 'undefined' && dbFirestore) {
      dbFirestore.collection('users').doc(docId).delete().catch(e => console.warn(e));
    }
    if (typeof dbRealtime !== 'undefined' && dbRealtime) {
      dbRealtime.ref(`users/${docId}`).remove().catch(e => console.warn(e));
    }

    saveUsersToDB(users.filter(x => x.id !== userId));
    showNotif(`USER ${u.username} BERHASIL DIHAPUS!`, 'info');
    loadUsersManagement();
  });
}

function loadMasterDbTable() {
  const tbody = document.getElementById('masterDbTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('searchMasterDb');
  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let requests = getRequestsFromDB();

  if (search) {
    requests = requests.filter(r =>
      r.noSurat.toLowerCase().includes(search) ||
      r.toko.toLowerCase().includes(search) ||
      r.createdBy.toLowerCase().includes(search) ||
      r.catatan.toLowerCase().includes(search) ||
      r.items.some(i => i.type.toLowerCase().includes(search) || i.seri.toLowerCase().includes(search) || i.barang.toLowerCase().includes(search))
    );
  }

  tbody.innerHTML = '';

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--text-muted);">BELUM ADA DATA DI MASTER DATABASE.</td></tr>`;
    return;
  }

  requests.forEach(r => {
    let itemsDetailText = (r.items || []).map((i, idx) => {
      let dusText = i.dus ? ` | Dus:${i.dus}` : '';
      return `<div style="padding:3px 0; border-bottom:1px dashed var(--border-color); font-size:12px; line-height:1.4;">
        <strong>${idx + 1}. ${i.type || '-'}</strong> (SN: <span style="font-family:monospace; color:var(--primary);">${i.seri || '-'}${dusText}</span>)<br>
        <span style="color:var(--text-main);">${i.barang || '-'}</span> <small style="color:var(--text-muted);">[Alasan: ${i.alasan || '-'}]</small> 
        <strong style="color:var(--primary);">(Qty: ${i.qty || 1})</strong>
      </div>`;
    }).join('');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox" class="masterDbCheckbox" value="${r.noSurat}" onchange="updateMultiMasterDbBtnState()" style="cursor:pointer; width:16px; height:16px;"></td>
      <td style="font-weight:600; color:var(--primary);">${r.noSurat}</td>
      <td style="white-space:nowrap;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td>${r.toko} <div style="font-size:11px; color:var(--text-muted);">By: ${r.createdBy}</div></td>
      <td><span style="color:var(--primary); font-weight:600;">${r.area}</span></td>
      <td><span class="badgeStatus badge-pending" style="font-weight:600;">${r.jenis || 'DEFAULT'}</span></td>
      <td style="max-width:320px; word-break:break-word;">${itemsDetailText}</td>
      <td>${getBadgeStatus(r.status)}</td>
      <td style="word-break:break-word; max-width:200px;">${r.catatan || '-'}</td>
      <td style="text-align:center;">
        <button class="btnIcon btnDelete" onclick="hapusDataMaster('${r.noSurat}')" title="HAPUS DATA"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateMultiMasterDbBtnState();
}

function toggleSelectAllMasterDb(masterCheckbox) {
  const isChecked = masterCheckbox ? masterCheckbox.checked : false;
  const checkboxes = document.querySelectorAll('.masterDbCheckbox');
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
  });
  updateMultiMasterDbBtnState();
}

function updateMultiMasterDbBtnState() {
  const checkboxes = document.querySelectorAll('.masterDbCheckbox:checked');
  const btn = document.getElementById('btnHapusMultiMasterDb');
  const selectAll = document.getElementById('selectAllMasterDb');
  const totalCheckboxes = document.querySelectorAll('.masterDbCheckbox');

  if (selectAll && totalCheckboxes.length > 0) {
    selectAll.checked = (checkboxes.length === totalCheckboxes.length);
  }

  if (btn) {
    if (checkboxes.length > 0) {
      btn.style.display = 'inline-flex';
      btn.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; margin-right:4px;">delete_sweep</span> HAPUS (${checkboxes.length}) DATA`;
    } else {
      btn.style.display = 'none';
    }
  }
}

function hapusMultiMasterDb() {
  const selectedCheckboxes = document.querySelectorAll('.masterDbCheckbox:checked');
  const noSuratList = Array.from(selectedCheckboxes).map(cb => cb.value).filter(Boolean);

  if (noSuratList.length === 0) {
    showNotif('PILIH MINIMAL 1 DATA PERMINTAAN UNTUK DIHAPUS!', 'warning');
    return;
  }

  showConfirm(`ADMIN: YAKIN INGIN MENGHAPUS ${noSuratList.length} DATA PERMINTAAN TERPILIH DARI MASTER DATABASE?`, () => {
    showLoading('MENGHAPUS DATA TERPILIH...');
    setTimeout(() => {
      try {
        const currentReqs = getRequestsFromDB();
        const updatedReqs = currentReqs.filter(r => !noSuratList.includes(r.noSurat));
        saveRequestsToDB(updatedReqs);

        noSuratList.forEach(noSurat => {
          const docId = String(noSurat).replace(/[\/\.]/g, '_');
          if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            dbFirestore.collection('requests').doc(docId).delete().catch(err => console.warn('[FIRESTORE DELETE NOTICE]:', err));
          }
          if (typeof dbRealtime !== 'undefined' && dbRealtime) {
            dbRealtime.ref(`requests/${docId}`).remove().catch(err => console.warn('[REALTIME DELETE NOTICE]:', err));
          }
        });

        if (typeof pushCentralCloudDB === 'function') {
          pushCentralCloudDB();
        }

        hideLoading();
        showNotif(`BERHASIL MENGHAPUS ${noSuratList.length} DATA PERMINTAAN TERPILIH!`, 'info');

        if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
      } catch (err) {
        hideLoading();
        console.error('[HAPUS MULTI MASTER ERROR]:', err);
        showNotif('GAGAL MENGHAPUS DATA MULTI TERPILIH!', 'error');
      }
    }, 400);
  });
}
window.toggleSelectAllMasterDb = toggleSelectAllMasterDb;
window.updateMultiMasterDbBtnState = updateMultiMasterDbBtnState;
window.hapusMultiMasterDb = hapusMultiMasterDb;

function hapusDataMaster(noSurat) {
  if (!noSurat) return;
  showConfirm(`ADMIN: HAPUS DATA PERMINTAAN #${noSurat} DARI MASTER DATABASE?`, () => {
    try {
      const currentReqs = getRequestsFromDB();
      const updatedReqs = currentReqs.filter(r => r.noSurat !== noSurat);
      saveRequestsToDB(updatedReqs);

      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).delete().catch(err => console.warn('[FIRESTORE DELETE NOTICE]:', err));
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).remove().catch(err => console.warn('[REALTIME DELETE NOTICE]:', err));
      }

      if (typeof pushCentralCloudDB === 'function') {
        pushCentralCloudDB();
      }

      hideLoading();
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DIHAPUS!`, 'info');
      
      if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (err) {
      hideLoading();
      console.error('[HAPUS MASTER ERROR]:', err);
      showNotif('GAGAL MENGHAPUS DATA MASTER!', 'error');
    }
  });
}

function downloadMasterExcel() {
  const data = getRequestsFromDB();
  if (data.length === 0) {
    showNotif('TIDAK ADA DATA MASTER UNTUK DIEKSPOR!', 'warning');
    return;
  }

  showLoading('MEMBUAT FILE EXCEL (.XLSX) MASTER LENGKAP...');
  setTimeout(() => {
    hideLoading();
    const rows = [];
    rows.push([
      'NO SURAT', 'TANGGAL', 'TOKO / PEMOHON', 'AREA', 'JENIS',
      'TIPE BARANG', 'NO SERI', 'NO SERI DUS', 'PERMINTAAN',
      'ALASAN', 'QTY', 'STATUS', 'CATATAN', 'LOG APPROVAL'
    ]);

    data.forEach(r => {
      const logStr = (r.log || []).map(l => `${l.action} by ${l.user} (${l.time})`).join(' | ');
      r.items.forEach(it => {
        rows.push([
          r.noSurat,
          r.tanggal,
          `${r.toko} (${r.createdBy})`,
          r.area,
          r.jenis,
          it.type,
          it.seri,
          it.dus || '',
          it.barang,
          it.alasan,
          it.qty,
          r.status,
          r.catatan || '',
          logStr
        ]);
      });
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Database");
      XLSX.writeFile(wb, `MASTER_DATABASE_PERMINTAAN_LENGKAP_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotif('FILE EXCEL (.XLSX) BERHASIL DI-DOWNLOAD!', 'info');
    } else {
      showNotif('MODUL EXCEL (.XLSX) BELUM SIAP, PERIKSA KONEKSI INTERNET!', 'warning');
    }
  }, 400);
}

function prosesUploadExcelLookup(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    showNotif('MODUL SHEETJS UNTUK EXCEL BELUM TERMUAT!', 'error');
    return;
  }

  showLoading('MEMBACA FILE EXCEL LOOKUP KODE UNIT...');
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const newLookup = {};
      let count = 0;

      jsonRows.forEach((row, idx) => {
        if (row && row.length >= 2) {
          const colA = String(row[0] !== undefined && row[0] !== null ? row[0] : '').trim().toUpperCase();
          const colB = String(row[1] !== undefined && row[1] !== null ? row[1] : '').trim().toUpperCase();

          if (idx === 0 && (colA.includes('KODE') || colB.includes('TYPE') || colA.includes('SERI') || colB.includes('BARANG') || colB.includes('NAMA'))) return;

          if (colA && colB) {
            newLookup[colA] = colB;
            count++;
          }
        }
      });

      if (count > 0) {
        const existingMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
        const updatedMap = { ...existingMap, ...newLookup };
        appStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(updatedMap));

        // SYNC LANGSUNG KE FIRESTORE CLOUD & REALTIME DB (EFFICIENT SINGLE DOC SAVE)
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          dbFirestore.collection('app_settings').doc('config').set({
            kodeUnitMap: updatedMap
          }, { merge: true }).catch(e => console.warn('[FIRESTORE LOOKUP SYNC]:', e));
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          dbRealtime.ref('app_settings/kodeUnitMap').set(updatedMap).catch(e => console.warn('[RTDB LOOKUP SYNC]:', e));
        }

        if (typeof pushCentralCloudDB === 'function') {
          pushCentralCloudDB();
        }

        hideLoading();
        showNotif(`BERHASIL MEMPERBARUI ${count} KODE SERI BARANG & TERSINKRON KE DATABASE!`, 'info');
        const statusEl = document.getElementById('lookupUploadStatus');
        if (statusEl) statusEl.textContent = `✓ ${count} KODE SERI BERHASIL DITAMBAHKAN & TERKIRIM KE CLOUD DATABASE!`;
      } else {
        hideLoading();
        showNotif('TIDAK ADA DATA VALID DENGAN 2 KOLOM (KOLOM A & KOLOM B)!', 'warning');
      }
    } catch (err) {
      hideLoading();
      showNotif('GAGAL MEMBACA FILE EXCEL LOOKUP: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function bukaAkun() {
  if (!currentUser) return;

  if (typeof modeEdit !== 'undefined' && modeEdit) {
    showConfirm('KELUAR DARI MENU EDIT?', () => {
      if (typeof bersihkanForm === 'function') bersihkanForm();
      closeAllPopups();
      prosesBukaAkun();
    });
    return;
  }

  prosesBukaAkun();
}

function prosesBukaAkun() {
  const elNama = document.getElementById('akunNama');
  const elHP = document.getElementById('akunHP');
  const elArea = document.getElementById('akunArea');
  const elKat = document.getElementById('akunKategori');
  const elPass = document.getElementById('akunPassword');

  if (elNama) elNama.value = currentUser.fullName || '';
  if (elHP) elHP.value = currentUser.phone || '-';
  if (elArea) elArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;
  if (elKat) elKat.value = currentUser.category || '';
  if (elPass) elPass.value = '';

  const menuTTD = document.getElementById('menuTTD');
  if (menuTTD) {
    menuTTD.style.display = (currentUser.category === 'SERVICE' || currentUser.category === 'DM') ? 'block' : 'none';
  }

  const isToko = (currentUser.category === 'TOKO');
  
  const menuKelolaTokoAkun = document.getElementById('menuKelolaTokoAkun');
  if (menuKelolaTokoAkun) {
    menuKelolaTokoAkun.style.display = isToko ? 'none' : 'block';
  }

  const modal = document.getElementById('popupAkun');
  if (modal) modal.classList.add('show');
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
}

window.bukaAkun = bukaAkun;
window.prosesBukaAkun = prosesBukaAkun;

function tutupAkun() {
  const modal = document.getElementById('popupAkun');
  if (modal) modal.classList.remove('show');
}

function simpanAkun() {
  showConfirm('SIMPAN PERUBAHAN DATA AKUN?', () => {
    const nama = document.getElementById('akunNama').value.trim().toUpperCase();
    const hp = document.getElementById('akunHP').value.trim();
    const pass = document.getElementById('akunPassword').value.trim();

    if (!nama) {
      showNotif('NAMA LENGKAP TIDAK BOLEH KOSONG!', 'warning');
      return;
    }

    const users = getUsersFromDB();
    const idx = users.findIndex(u => u.id === currentUser.id);

    if (idx !== -1) {
      users[idx].fullName = nama;
      users[idx].phone = hp;
      if (pass) users[idx].password = pass;

      saveUsersToDB(users);
      currentUser = users[idx];
      appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

      showNotif('PROFIL BERHASIL DIPERBARUI!', 'info');

      const akunArea = document.getElementById('akunArea');
      if (akunArea) akunArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;

      const akunKategori = document.getElementById('akunKategori');
      if (akunKategori) akunKategori.value = currentUser.category;

      const akunNama = document.getElementById('akunNama');
      if (akunNama) akunNama.value = currentUser.fullName;

      const akunHP = document.getElementById('akunHP');
      if (akunHP) akunHP.value = currentUser.phone || '-';

      const akunPassword = document.getElementById('akunPassword');
      if (akunPassword) akunPassword.value = '';

      loadDashboard();
      if (document.getElementById('userTableBody')) {
        loadUsersManagement();
      }
    }
  });
}

function bukaModalTambahToko() {
  if (!currentUser) return;
  const modalAreaText = document.getElementById('tokoModalAreaText');
  if (modalAreaText) {
    modalAreaText.textContent = `${currentUser.area} (${AREA_MAP[currentUser.area] || currentUser.area})`;
  }
  const inputEl = document.getElementById('inputNamaTokoBaru');
  if (inputEl) inputEl.value = '';
  loadDaftarTokoModal();
  const popup = document.getElementById('popupTambahToko');
  if (popup) {
    popup.style.display = 'flex';
    popup.classList.add('show');
    pushPopupHistoryState();
  }
}

function tutupModalTambahToko() {
  const popup = document.getElementById('popupTambahToko');
  if (popup) {
    popup.style.display = 'none';
    popup.classList.remove('show');
  }
  loadForm();
}

function loadDaftarTokoModal() {
  const tbody = document.getElementById('daftarTokoTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allStores = getStoresFromDB();
  const areaStores = (currentUser.category === 'DM') ? allStores : allStores.filter(s => s.area === currentUser.area);

  if (areaStores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted);">BELUM ADA TOKO TERDAFTAR DI AREA INI.</td></tr>`;
    return;
  }

  areaStores.forEach(s => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    const code = s.storeCode || generateStoreCode(s.fullName);
    tr.innerHTML = `
      <td style="padding: 8px; font-weight: 600;">${s.fullName}</td>
      <td style="padding: 8px; text-align: center; color: var(--primary); font-weight: 700;">${code}</td>
      <td style="padding: 8px; text-align: center;">
        <button type="button" class="btnIcon btnDelete" onclick="hapusTokoCustom('${s.id}')" title="HAPUS TOKO"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function simpanTokoBaru() {
  const inputEl = document.getElementById('inputNamaTokoBaru');
  const namaToko = inputEl ? inputEl.value.trim().toUpperCase() : '';

  if (!namaToko) {
    showNotif('NAMA TOKO TIDAK BOLEH KOSONG!', 'warning');
    return;
  }

  const existingStores = getStoresFromDB();
  if (existingStores.some(s => s.fullName.toUpperCase() === namaToko && s.area === currentUser.area)) {
    showNotif(`TOKO '${namaToko}' SUDAH TERDAFTAR DI AREA ${currentUser.area}!`, 'warning');
    return;
  }

  const storeKey = `${namaToko}_${currentUser.area}`;
  let deletedStoreKeys = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
  if (deletedStoreKeys.includes(storeKey)) {
    deletedStoreKeys = deletedStoreKeys.filter(k => k !== storeKey);
    appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
  }

  const generatedCode = generateStoreCode(namaToko);
  const newId = `STK-${Date.now()}`;

  const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
  const newStore = {
    id: newId,
    fullName: namaToko,
    area: currentUser.area,
    storeCode: generatedCode,
    createdBy: currentUser.fullName
  };
  localStores.push(newStore);
  appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));

  const users = getUsersFromDB();
  const safeUsername = namaToko.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
  let newUserAcc = null;
  if (!users.some(u => u.username.toUpperCase() === safeUsername)) {
    newUserAcc = {
      id: newId,
      username: safeUsername,
      password: '123',
      fullName: namaToko,
      storeCode: generatedCode,
      phone: '-',
      category: 'TOKO',
      area: currentUser.area,
      createdAt: getFormattedDateDDMMYYYY()
    };
    users.push(newUserAcc);
    saveUsersToDB(users);
  }

  // SINKRONKAN LANGSUNG KE FIREBASE FIRESTORE & REALTIME DB
  if (typeof dbFirestore !== 'undefined' && dbFirestore) {
    dbFirestore.collection('stores').doc(newId).set(newStore).catch(e => console.warn(e));
    if (newUserAcc) {
      dbFirestore.collection('users').doc(safeUsername).set(newUserAcc).catch(e => console.warn(e));
    }
  }
  if (typeof dbRealtime !== 'undefined' && dbRealtime) {
    dbRealtime.ref(`stores/${newId}`).set(newStore).catch(e => console.warn(e));
    if (newUserAcc) {
      dbRealtime.ref(`users/${safeUsername}`).set(newUserAcc).catch(e => console.warn(e));
    }
  }
  if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB();
  }

  showNotif(`TOKO '${namaToko}' BERHASIL DITAMBAHKAN & DISINKRONKAN KE FIREBASE!`, 'info');
  if (inputEl) inputEl.value = '';
  loadDaftarTokoModal();
  loadForm();
  if (document.getElementById('userTableBody')) {
    loadUsersManagement();
  }
}

function hapusTokoCustom(id) {
  const allStores = getStoresFromDB();
  const store = allStores.find(s => s.id === id);
  const name = store ? store.fullName : 'TOKO';
  const storeArea = store ? store.area : currentUser.area;

  showConfirm(`HAPUS TOKO '${name}' DARI DAFTAR & DATABASE ADMIN?`, () => {
    const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
    const updatedLocal = localStores.filter(s => s.id !== id && s.fullName.toUpperCase() !== name.toUpperCase());
    appStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedLocal));

    const deletedStoreKeys = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
    const storeKey = `${name.toUpperCase()}_${storeArea}`;
    if (!deletedStoreKeys.includes(storeKey)) {
      deletedStoreKeys.push(storeKey);
      appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
    }

    const users = getUsersFromDB();
    const updatedUsers = users.filter(u => u.id !== id && !(u.category === 'TOKO' && u.fullName.toUpperCase() === name.toUpperCase()));
    saveUsersToDB(updatedUsers);

    // HAPUS DOKUMEN LANGSUNG DARI FIREBASE ONLINE
    const safeUsername = name.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
    if (typeof dbFirestore !== 'undefined' && dbFirestore) {
      dbFirestore.collection('stores').doc(id).delete().catch(e => console.warn(e));
      dbFirestore.collection('users').doc(safeUsername).delete().catch(e => console.warn(e));
    }
    if (typeof dbRealtime !== 'undefined' && dbRealtime) {
      dbRealtime.ref(`stores/${id}`).remove().catch(e => console.warn(e));
      dbRealtime.ref(`users/${safeUsername}`).remove().catch(e => console.warn(e));
    }
    if (typeof pushCentralCloudDB === 'function') {
      pushCentralCloudDB();
    }

    showNotif(`TOKO '${name}' BERHASIL DIHAPUS DARI CACHE & FIREBASE!`, 'info');
    loadDaftarTokoModal();
    loadForm();
    if (document.getElementById('userTableBody')) {
      loadUsersManagement();
    }
  });
}

function downloadExcel() {
  const data = getAccessibleRequests();
  if (data.length === 0) {
    showNotif('TIDAK ADA DATA UNTUK DIEKSPOR!', 'warning');
    return;
  }

  showLoading('MEMBUAT FILE EXCEL (.XLSX)...');
  setTimeout(() => {
    hideLoading();
    const rows = [];
    rows.push([
      'NO SURAT', 'TANGGAL', 'TOKO', 'AREA', 'JENIS PERMINTAAN', 'STATUS',
      'NO', 'TYPE BARANG', 'NO SERI', 'DUS BARANG', 'PERMINTAAN DETAIL', 'ALASAN', 'QTY',
      'PEMOHON', 'CATATAN'
    ]);

    data.forEach(r => {
      if (r.items && r.items.length > 0) {
        r.items.forEach((item, itemIdx) => {
          rows.push([
            r.noSurat,
            r.tanggal,
            r.toko,
            r.area,
            r.jenis,
            r.status,
            itemIdx + 1,
            item.type || '-',
            item.seri || '-',
            item.dus || '-',
            item.barang || '-',
            item.alasan || '-',
            item.qty || 1,
            r.createdBy,
            r.catatan || ''
          ]);
        });
      } else {
        rows.push([
          r.noSurat,
          r.tanggal,
          r.toko,
          r.area,
          r.jenis,
          r.status,
          1,
          '-',
          '-',
          '-',
          '-',
          '-',
          1,
          r.createdBy,
          r.catatan || ''
        ]);
      }
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Permintaan Detail");
      XLSX.writeFile(wb, `DATA_PERMINTAAN_DETAIL_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotif('BERHASIL DI-DOWNLOAD!', 'info');
    } else {
      showNotif('MODUL EXCEL (.XLSX) BELUM SIAP, PERIKSA KONEKSI INTERNET!', 'warning');
    }
  }, 400);
}

function closeAllPopups() {
  const allOverlays = document.querySelectorAll('.popupOverlay, #imageViewer, #rejectOverlay, #confirmOverlay, #pdfModal, #popupDetail, #popupAkun, #popupUserForm, #popupTTD, #popupNotifList, #popupBantuan');
  allOverlays.forEach(el => {
    if (el) {
      el.style.display = 'none';
      el.classList.remove('show');
    }
  });
}
window.closeAllPopups = closeAllPopups;

function showConfirm(msg, callback) {
  const msgEl = document.getElementById('confirmMessage');
  if (msgEl) msgEl.innerHTML = msg;
  confirmCallback = callback;
  const modal = document.getElementById('confirmOverlay');
  if (modal) modal.style.display = 'flex';
  pushPopupHistoryState();
}

function closeConfirm() {
  const modal = document.getElementById('confirmOverlay');
  if (modal) modal.style.display = 'none';
  confirmCallback = null;
}

function confirmYes() {
  const cb = confirmCallback;
  confirmCallback = null;
  closeConfirm();
  closeAllPopups();
  if (typeof cb === 'function') {
    cb();
  }
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
  if (typeof aturTampilanLonceng === 'function') {
    aturTampilanLonceng(activePage);
  }
}

function showLoading() {
  const modal = document.getElementById('loadingOverlay');
  if (modal) modal.style.display = 'flex';
}

function hideLoading() {
  const modal = document.getElementById('loadingOverlay');
  if (modal) modal.style.display = 'none';
}

let currentZoom = 1;

function zoomFoto(src) {
  currentZoom = 1;
  const img = document.getElementById('viewerImage');
  if (img) {
    img.src = src;
    img.style.transform = `scale(${currentZoom})`;
  }
  const modal = document.getElementById('imageViewer');
  if (modal) modal.style.display = 'flex';
  
  if (typeof pushPopupHistoryState === 'function') {
    pushPopupHistoryState();
  }
}

function tutupImageViewer() {
  const modal = document.getElementById('imageViewer');
  if (modal) modal.style.display = 'none';
}

function zoomImage(step) {
  currentZoom += step;
  if (currentZoom < 0.2) currentZoom = 0.2;
  if (currentZoom > 5) currentZoom = 5;
  const img = document.getElementById('viewerImage');
  if (img) {
    img.style.transform = `scale(${currentZoom})`;
  }
}

function resetZoom() {
  currentZoom = 1;
  const img = document.getElementById('viewerImage');
  if (img) {
    img.style.transform = `scale(${currentZoom})`;
  }
}

function initDraggableElement(element, storageKey) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;

  el.classList.add('draggable-btn');

  const savedPos = appStorage.getItem(storageKey);
  if (savedPos) {
    try {
      const pos = JSON.parse(savedPos);
      if (typeof pos.left === 'number' && typeof pos.top === 'number') {
        const maxX = window.innerWidth - (el.offsetWidth || 48);
        const maxY = window.innerHeight - (el.offsetHeight || 48);
        const clampedX = Math.max(0, Math.min(pos.left, maxX));
        const clampedY = Math.max(0, Math.min(pos.top, maxY));

        el.style.position = 'fixed';
        el.style.left = clampedX + 'px';
        el.style.top = clampedY + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      }
    } catch (e) {}
  }

  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let isDragging = false;
  const dragThreshold = 6;

  function onPointerDown(e) {
    const pointer = e.touches ? e.touches[0] : e;
    startX = pointer.clientX;
    startY = pointer.clientY;

    const rect = el.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    isDragging = false;

    if (e.type === 'touchstart') {
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    } else {
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
    }
  }

  function onPointerMove(e) {
    const pointer = e.touches ? e.touches[0] : e;
    const deltaX = pointer.clientX - startX;
    const deltaY = pointer.clientY - startY;

    if (!isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
      isDragging = true;
      el.classList.add('is-dragging');
    }

    if (isDragging) {
      if (e.cancelable) e.preventDefault();

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop; 

      const maxX = window.innerWidth - (el.offsetWidth || 48);
      newLeft = Math.max(0, Math.min(newLeft, maxX));

      el.style.position = 'fixed';
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
  }

  function onPointerUp(e) {
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);

    el.classList.remove('is-dragging');

    if (isDragging) {
      const rect = el.getBoundingClientRect();
      appStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));

      const preventClick = function(evt) {
        evt.stopImmediatePropagation();
        evt.preventDefault();
        el.removeEventListener('click', preventClick, true);
      };
      el.addEventListener('click', preventClick, true);
    }
  }

  el.addEventListener('mousedown', onPointerDown);
  el.addEventListener('touchstart', onPointerDown, { passive: true });
}

function initAllDraggableButtons() {
  // Fixed top-header layout per user instruction (non-draggable)
}

(function() {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    body:has(#loginPage.active) #notifBellBtn,
    body:has(#loginPage.active) .notif-bell-btn,
    body:has(#loginPage.active) #helpButton,
    body:has(#loginPage.active) .helpButton,
    body:has(#loginPage.active) #firebaseOnlineDot,
    body:has(.page.active:not(#dashboardPage)) #notifBellBtn,
    body:has(.page.active:not(#dashboardPage)) #helpButton,
    body:has(.page.active:not(#dashboardPage)) #firebaseOnlineDot {
      display: none !important;
    }
  `;
  document.head.appendChild(styleTag);
})();

function hapusSemuaDataLokal() {
  showConfirm('YAKIN INGIN MENGHAPUS SEMUA DATA LOKAL & CACHE? (Aplikasi akan keluar dan dimuat ulang)', () => {
    showLoading('');
    
    setTimeout(async () => {
      try {
        if (window.localStorage) {
          localStorage.clear();
        }
        if (window.sessionStorage) {
          sessionStorage.clear();
        }
        if (window.appStorage && typeof window.appStorage.clear === 'function') {
          window.appStorage.clear();
        }
        if (typeof caches !== 'undefined' && caches.keys) {
          const cacheNames = await caches.keys();
          for (let name of cacheNames) {
            await caches.delete(name);
          }
        }
        currentUser = null;
        window.location.reload(true);
      } catch (error) {
        hideLoading();
        console.error('Gagal menghapus data lokal:', error);
        showNotif('TERJADI KESALAHAN SAAT MENGHAPUS DATA!', 'error');
      }
    }, 800);
  });
}