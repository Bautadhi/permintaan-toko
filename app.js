/* ======================================================
   PERMINTAAN BARANG TOKO
   MASTER APPLICATION LOGIC & LOCALSTORAGE DATABASE ENGINE
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

function getSystemNotifications() {
  return JSON.parse(localStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]');
}

function tambahNotifikasiSistem(targetRoles, targetArea, message, noSurat = '') {
  const notifs = getSystemNotifications();
  const newNotif = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    targetRoles: Array.isArray(targetRoles) ? targetRoles : [targetRoles],
    targetArea: targetArea || 'ALL',
    message: message,
    noSurat: noSurat,
    time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`,
    readBy: []
  };
  notifs.unshift(newNotif);
  if (notifs.length > 100) notifs.pop();
  localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
  pushCentralCloudDB();
  updateNotifBellCounter();
}

function getAccessibleNotifications() {
  if (!currentUser) return [];
  const notifs = getSystemNotifications();

  return notifs.filter(n => {
    const areaMatch = (n.targetArea === 'ALL' || currentUser.category === 'DM' || n.targetArea === currentUser.area);
    const roleMatch = (
      n.targetRoles.includes('ALL') ||
      n.targetRoles.includes(currentUser.category) ||
      (currentUser.category === 'TOKO' && n.targetRoles.includes('TOKO'))
    );
    return areaMatch && roleMatch;
  });
}

function updateNotifBellCounter() {
  const bellBtn = document.getElementById('notifBellBtn');
  const badgeEl = document.getElementById('notifBellBadge');
  if (!bellBtn || !badgeEl) return;

  if (!currentUser || document.getElementById('loginPage').classList.contains('active')) {
    bellBtn.style.display = 'none';
    return;
  }

  bellBtn.style.display = 'flex';

  const userNotifs = getAccessibleNotifications();
  let unreadCount = userNotifs.filter(n => !n.readBy.includes(currentUser.id) && !n.readBy.includes(currentUser.username)).length;

  // Include pending approval requests count for DM or SERVICE
  if (currentUser.category === 'DM') {
    const requests = getRequestsFromDB();
    const pendingDMCount = requests.filter(r => r.status === 'PENDING' && r.serviceApprove).length;
    unreadCount = Math.max(unreadCount, pendingDMCount);
  } else if (currentUser.category === 'SERVICE') {
    const requests = getAccessibleRequests();
    const pendingServiceCount = requests.filter(r => r.status === 'PENDING' && !r.serviceApprove).length;
    unreadCount = Math.max(unreadCount, pendingServiceCount);
  }

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

  loadNotificationList();
  popup.style.display = 'flex';
  popup.classList.add('show');
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
  markNotifAsRead(notifId);
  tutupNotificationModal();
  if (noSurat) {
    lihatDetail(noSurat, true);
  }
}

function markNotifAsRead(notifId) {
  const notifs = getSystemNotifications();
  const idx = notifs.findIndex(n => n.id === notifId);
  if (idx !== -1) {
    if (!notifs[idx].readBy.includes(currentUser.id)) {
      notifs[idx].readBy.push(currentUser.id);
    }
    if (!notifs[idx].readBy.includes(currentUser.username)) {
      notifs[idx].readBy.push(currentUser.username);
    }
    localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
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
  localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
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
  const localStores = JSON.parse(localStorage.getItem(STORES_DB_KEY) || '[]');
  const deletedStoreKeys = JSON.parse(localStorage.getItem(DELETED_STORES_KEY) || '[]');
  const users = getUsersFromDB();
  const userStores = users.filter(u => u.category === 'TOKO').map(u => ({
    id: u.id,
    fullName: u.fullName,
    area: u.area,
    storeCode: u.storeCode || generateStoreCode(u.fullName)
  }));

  const map = new Map();
  userStores.forEach(s => map.set(`${s.fullName.toUpperCase()}_${s.area}`, s));
  localStores.forEach(s => map.set(`${s.fullName.toUpperCase()}_${s.area}`, s));

  const allStores = Array.from(map.values());
  return allStores.filter(s => !deletedStoreKeys.includes(`${s.fullName.toUpperCase()}_${s.area}`));
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

// KNOWN UNIT TYPE LOOKUP DATABASE (EMPTY INITIAL STATE: POPULATED FROM GOOGLE SHEETS / EXCEL UPLOAD)
const KODE_UNIT_MAP = {};

// SEED USERS DATABASE (CLEAN INITIAL STATE: ONLY ADMIN PSW=1)
const SEED_USERS = [
  {
    id: 'USR-ADMIN',
    username: 'ADMIN',
    password: '1',
    fullName: 'ADMINISTRATOR PUSAT',
    phone: '',
    category: 'ADMIN',
    area: 'ALL',
    createdAt: '31/07/2026'
  }
];

// SEED REQUESTS DATABASE (CLEAN INITIAL STATE)
const SEED_REQUESTS = [];

// STATE VARIABLES
let currentUser = null;
let currentPhotos = [];
let currentThemeIndex = 0;
let filterStatusRiwayat = '';
let dashboardFilterStatus = 'PENDING'; // DEFAULT DASHBOARD FILTER STATUS IS PENDING
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

// HELPER: GET FORMATTED DATE (DD/MM/YYYY)
function getFormattedDateDDMMYYYY(dObj = new Date()) {
  const day = String(dObj.getDate()).padStart(2, '0');
  const month = String(dObj.getMonth() + 1).padStart(2, '0');
  const year = dObj.getFullYear();
  return `${day}/${month}/${year}`;
}

// APP INITIALIZATION
// APP INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
  initFirebaseCloudDB();
  startCentralCloudSyncEngine();
  loadSavedTheme();
  autoLogin();
  initMobileBackButtonEngine();
  initPullToRefresh();
  updateAdminReminderUI();
});

/* ======================================================
   MOBILE PULL-TO-REFRESH GESTURE ENGINE
   ====================================================== */
function initPullToRefresh() {
  const container = document.getElementById('app') || document.body;
  let startY = 0;
  let moveY = 0;
  let isAtTop = false;

  container.addEventListener('touchstart', (e) => {
    if (container.scrollTop <= 5) {
      startY = e.touches[0].clientY;
      isAtTop = true;
    } else {
      isAtTop = false;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isAtTop) return;
    moveY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', async () => {
    if (!isAtTop) return;
    const dist = moveY - startY;
    if (dist > 80 && container.scrollTop <= 5) {
      await pullCentralCloudDB();
    }
    startY = 0;
    moveY = 0;
    isAtTop = false;
  }, { passive: true });
}

/* ======================================================
   ADMIN FEATURE TOGGLE FOR PENDING APPROVAL REMINDERS (SERVICE & DM)
   ====================================================== */
const ADMIN_REMINDER_KEY = 'STORE_ADMIN_REMINDER_KEY_V7';

function getAdminReminderEnabled() {
  const val = localStorage.getItem(ADMIN_REMINDER_KEY);
  return val !== 'false';
}

function toggleAdminReminderFeature() {
  const current = getAdminReminderEnabled();
  const next = !current;
  localStorage.setItem(ADMIN_REMINDER_KEY, next ? 'true' : 'false');
  updateAdminReminderUI();
  showNotif(next ? 'REMINDER PENDING SERVICE & DM SEKARANG AKTIF (ON)!' : 'REMINDER PENDING SERVICE & DM NONAKTIF (OFF)!', 'info');
  if (next) {
    checkAndTriggerPendingReminders();
  }
}
window.toggleAdminReminderFeature = toggleAdminReminderFeature;

function updateAdminReminderUI() {
  const statusText = document.getElementById('reminderFeatureStatusText');
  const isEnabled = getAdminReminderEnabled();
  if (statusText) {
    statusText.textContent = isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  }
  const container = document.getElementById('adminReminderControlContainer');
  if (container) {
    container.style.display = (currentUser && currentUser.category === 'ADMIN') ? 'flex' : 'none';
  }
}

function checkAndTriggerPendingReminders() {
  if (!getAdminReminderEnabled()) return;
  const requests = getRequestsFromDB();
  if (!requests.length) return;

  const pendingServiceReqs = requests.filter(r => r.status === 'PENDING' && !r.serviceApprove);
  const pendingDMReqs = requests.filter(r => r.status === 'PENDING' && r.serviceApprove);

  let hasNewReminder = false;
  if (pendingServiceReqs.length > 0) {
    pendingServiceReqs.forEach(r => {
      tambahNotifikasiSistem(['SERVICE'], r.area, `REMINDER PENDING: PERMINTAAN #${r.noSurat} DARI TOKO ${r.toko} BELUM DI-APPROVE SERVICE!`, r.noSurat);
    });
    hasNewReminder = true;
  }

  if (pendingDMReqs.length > 0) {
    pendingDMReqs.forEach(r => {
      tambahNotifikasiSistem(['DM'], 'ALL', `REMINDER PENDING: PERMINTAAN #${r.noSurat} DARI TOKO ${r.toko} BELUM DI-APPROVE DM!`, r.noSurat);
    });
    hasNewReminder = true;
  }

  if (hasNewReminder) {
    updateNotifBellCounter();
  }
}

/* ======================================================
   CENTRAL ONLINE CLOUD DATABASE SYNC ENGINE (MULTI-DEVICE & WORLDWIDE)
   ====================================================== */
const SCRIPT_URL_STORAGE_KEY = 'STORE_SCRIPT_URL_V7';

function getGoogleSheetUrl() {
  return localStorage.getItem(SCRIPT_URL_STORAGE_KEY) || 'https://script.google.com/macros/s/AKfycbw-xUcnvyzBRPkuYoiVDMQtMq5Comyh-F7tjmz7bnQkEskGb1-YL9wTxTrLtuXKRp0klQ/exec';
}

function simpanAdminScriptUrl() {
  const input = document.getElementById('adminScriptUrlInput');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    localStorage.setItem(SCRIPT_URL_STORAGE_KEY, val);
    showNotif('URL GOOGLE APPS SCRIPT BERHASIL DISIMPAN & DIPERBARUI!', 'info');
    pushCentralCloudDB();
  } else {
    localStorage.removeItem(SCRIPT_URL_STORAGE_KEY);
    showNotif('URL SCRIPT DIKEMBALIKAN KE DEFAULT!', 'info');
  }
}
window.simpanAdminScriptUrl = simpanAdminScriptUrl;

function loadAdminScriptUrlInput() {
  const input = document.getElementById('adminScriptUrlInput');
  if (input) {
    input.value = getGoogleSheetUrl();
  }
}
window.loadAdminScriptUrlInput = loadAdminScriptUrlInput;

const PUBLIC_CLOUD_DB_URL = getGoogleSheetUrl();
let cloudSyncInterval = null;
let lastCloudSyncHash = '';
let isPushingCloud = false;

/* ======================================================
   ADMIN FEATURE TOGGLE FOR UPLOAD FOTO INPUT
   ====================================================== */
function getFeaturePhotosEnabled() {
  const val = localStorage.getItem(FEATURE_PHOTOS_KEY);
  return val !== 'false';
}

function setFeaturePhotosEnabled(enabled) {
  localStorage.setItem(FEATURE_PHOTOS_KEY, enabled ? 'true' : 'false');
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
}

function startCentralCloudSyncEngine() {
  pullCentralCloudDB();
  if (!cloudSyncInterval) {
    cloudSyncInterval = setInterval(pullCentralCloudDB, 800);
  }
}

async function pullCentralCloudDB() {
  const targetUrl = getGoogleSheetUrl();

  try {
    const res = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache'
    });

    if (!res.ok) {
      updateCloudStatusUI(false);
      return;
    }

    const data = await res.json();
    if (!data) return;

    const dataHash = JSON.stringify(data);
    if (dataHash === lastCloudSyncHash) return;
    lastCloudSyncHash = dataHash;

    let needUIRefresh = false;

    // Merge deleted requests & users blacklists from Cloud
    if (Array.isArray(data.deletedRequests)) {
      const delReqs = JSON.parse(localStorage.getItem(DELETED_REQUESTS_KEY) || '[]');
      const mergedDelReqs = Array.from(new Set([...delReqs, ...data.deletedRequests]));
      localStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(mergedDelReqs));
    }

    if (Array.isArray(data.deletedUsers)) {
      const delUsers = JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]');
      const mergedDelUsers = Array.from(new Set([...delUsers, ...data.deletedUsers]));
      localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(mergedDelUsers));
    }

    const currentDelReqs = JSON.parse(localStorage.getItem(DELETED_REQUESTS_KEY) || '[]');
    const currentDelUsers = JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]');

    const targetRequests = Array.isArray(data.requests) ? data.requests.filter(r => r && r.noSurat && !currentDelReqs.includes(r.noSurat)) : [];
    const prevReqHash = localStorage.getItem(REQUESTS_DB_KEY) || '[]';
    const newReqHash = JSON.stringify(targetRequests);
    if (prevReqHash !== newReqHash) {
      localStorage.setItem(REQUESTS_DB_KEY, newReqHash);
      needUIRefresh = true;
    }

    const targetUsers = Array.isArray(data.users) && data.users.length > 0 ? data.users.filter(u => u && u.id && !currentDelUsers.includes(u.id)) : [...SEED_USERS];
    const prevUserHash = localStorage.getItem(USERS_DB_KEY) || '[]';
    const newUserHash = JSON.stringify(targetUsers);
    if (prevUserHash !== newUserHash) {
      localStorage.setItem(USERS_DB_KEY, newUserHash);
      needUIRefresh = true;
    }

    if (data.ttd && typeof data.ttd === 'object') {
      localStorage.setItem(TTD_DB_KEY, JSON.stringify(data.ttd));
    }

    if (Array.isArray(data.stores)) {
      localStorage.setItem(STORES_DB_KEY, JSON.stringify(data.stores));
    }

    if (data.lookup && typeof data.lookup === 'object') {
      localStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(data.lookup));
    }

    if (data.featurePhotos !== undefined) {
      localStorage.setItem(FEATURE_PHOTOS_KEY, String(data.featurePhotos));
      updatePhotoSectionVisibility();
    }

    if (Array.isArray(data.chat)) {
      const prevChatHash = localStorage.getItem(CHAT_DB_KEY) || '[]';
      const newChatHash = JSON.stringify(data.chat);
      if (prevChatHash !== newChatHash) {
        localStorage.setItem(CHAT_DB_KEY, newChatHash);
        const popupBantuan = document.getElementById('popupBantuan');
        if (popupBantuan && popupBantuan.classList.contains('show')) {
          if (isAdminChat) {
            if (currentRoom) {
              loadChatAdmin(currentRoom);
            } else {
              loadDaftarChatAdmin();
            }
          } else {
            loadChatUser();
          }
        }
        cekUnreadNotif();
      }
    }

    if (Array.isArray(data.chatRooms)) {
      const prevRoomHash = localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]';
      const newRoomHash = JSON.stringify(data.chatRooms);
      if (prevRoomHash !== newRoomHash) {
        localStorage.setItem(CHAT_ROOM_DB_KEY, newRoomHash);
        const popupBantuan = document.getElementById('popupBantuan');
        if (popupBantuan && popupBantuan.classList.contains('show') && isAdminChat) {
          if (!currentRoom) loadDaftarChatAdmin();
        }
        cekUnreadNotif();
      }
    }

    if (Array.isArray(data.notifications)) {
      localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(data.notifications));
      updateNotifBellCounter();
    }

    if (needUIRefresh && currentUser) {
      loadDashboard();
      loadRiwayat();
      if (document.getElementById('userTableBody')) {
        loadUsersManagement();
      }
      if (document.getElementById('masterDbTableBody')) {
        loadMasterDbTable();
      }
    }

    updateCloudStatusUI(true);
  } catch (err) {
    updateCloudStatusUI(false);
  }
}

async function pushCentralCloudDB() {
  isPushingCloud = true;
  const payload = {
    requests: getRequestsFromDB(),
    users: getUsersFromDB(),
    deletedRequests: JSON.parse(localStorage.getItem(DELETED_REQUESTS_KEY) || '[]'),
    deletedUsers: JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]'),
    ttd: JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}'),
    stores: JSON.parse(localStorage.getItem(STORES_DB_KEY) || '[]'),
    lookup: JSON.parse(localStorage.getItem(KODE_UNIT_MAP_KEY) || '{}'),
    featurePhotos: getFeaturePhotosEnabled(),
    chat: JSON.parse(localStorage.getItem(CHAT_DB_KEY) || '[]'),
    chatRooms: JSON.parse(localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]'),
    notifications: JSON.parse(localStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]')
  };

  const targetUrl = getGoogleSheetUrl();
  const isGoogle = targetUrl.includes('script.google.com');

  try {
    const res = await fetch(targetUrl, {
      method: isGoogle ? 'POST' : 'PUT',
      headers: isGoogle ? { 'Content-Type': 'text/plain' } : { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok || res.type === 'opaque') {
      updateCloudStatusUI(true);
    } else {
      updateCloudStatusUI(false);
    }
  } catch (err) {
    updateCloudStatusUI(false);
  } finally {
    isPushingCloud = false;
  }
}

function updateCloudStatusUI(isOnline) {
  const badge = document.getElementById('cloudStatusBadge');
  if (badge) {
    if (isOnline) {
      badge.style.background = 'rgba(16, 185, 129, 0.18)';
      badge.style.color = '#10b981';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      badge.innerHTML = `<span class="material-symbols-rounded" style="font-size: 15px;">wifi</span> ONLINE`;
    } else {
      badge.style.background = 'rgba(239, 68, 68, 0.18)';
      badge.style.color = '#ef4444';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      badge.innerHTML = `<span class="material-symbols-rounded" style="font-size: 15px;">wifi_off</span> OFFLINE`;
    }
  }
}

/* ======================================================
   FIREBASE CLOUD FIRESTORE REALTIME DATABASE ENGINE
   ====================================================== */
let dbCloud = null;
let isCloudDBActive = false;

// Firebase Cloud Firestore Web Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-DEFAULT_PLACEHOLDER_KEY",
  authDomain: "permintaan-toko-app.firebaseapp.com",
  projectId: "permintaan-toko-app",
  storageBucket: "permintaan-toko-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};

function initFirebaseCloudDB() {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      dbCloud = firebase.firestore();
      isCloudDBActive = true;
      console.log('✅ FIREBASE CLOUD FIRESTORE TERHUBUNG BERHASIL!');
      setupFirestoreRealtimeListeners();
    } catch (err) {
      console.warn('⚠️ FIREBASE FIRESTORE OFFLINE FALLBACK (LOCALSTORAGE MODE):', err.message);
    }
  }
}

function setupFirestoreRealtimeListeners() {
  if (!dbCloud || !isCloudDBActive) return;

  // Realtime Sync for Requests Collection
  dbCloud.collection('requests').onSnapshot((snapshot) => {
    if (snapshot && !snapshot.empty) {
      const cloudRequests = [];
      snapshot.forEach(doc => {
        cloudRequests.push(doc.data());
      });
      if (cloudRequests.length > 0) {
        localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(cloudRequests));
        if (currentUser) {
          loadDashboard();
          loadRiwayat();
        }
      }
    }
  }, (err) => console.warn('Firestore Sync:', err.message));

  // Realtime Sync for Users Collection
  dbCloud.collection('users').onSnapshot((snapshot) => {
    if (snapshot && !snapshot.empty) {
      const cloudUsers = [];
      snapshot.forEach(doc => {
        cloudUsers.push(doc.data());
      });
      if (cloudUsers.length > 0) {
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(cloudUsers));
        if (currentUser && document.getElementById('userTableBody')) {
          loadUsersManagement();
        }
      }
    }
  }, (err) => console.warn('Firestore Users Sync:', err.message));
}

function syncRequestToCloud(reqObj) {
  if (!dbCloud || !isCloudDBActive || !reqObj || !reqObj.noSurat) return;
  try {
    dbCloud.collection('requests').doc(reqObj.noSurat).set(reqObj, { merge: true });
  } catch (e) {
    console.warn('Cloud Request Sync Error:', e);
  }
}

function syncUserToCloud(userObj) {
  if (!dbCloud || !isCloudDBActive || !userObj || !userObj.id) return;
  try {
    dbCloud.collection('users').doc(userObj.id).set(userObj, { merge: true });
  } catch (e) {
    console.warn('Cloud User Sync Error:', e);
  }
}

function initDatabase() {
  let storedUsers = [];
  try {
    storedUsers = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  } catch (e) {
    storedUsers = [];
  }

  // FORCE RESET TO ONLY 1 ADMIN USER IF UNCLEAN
  if (!Array.isArray(storedUsers) || !storedUsers.length || storedUsers.some(u => u.username !== 'ADMIN')) {
    storedUsers = [...SEED_USERS];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(storedUsers));
  }
  
  if (!localStorage.getItem(REQUESTS_DB_KEY)) {
    localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([]));
  }

  localStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
  localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));
  localStorage.setItem(TTD_DB_KEY, JSON.stringify({}));
  localStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify({}));
}

function getUsersFromDB() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(USERS_DB_KEY) || '[]');
  } catch (e) {
    users = [];
  }
  if (!Array.isArray(users) || !users.length) {
    users = [...SEED_USERS];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } else {
    const adminUser = users.find(u => u && u.username && u.username.toUpperCase() === 'ADMIN');
    if (!adminUser) {
      users.unshift(SEED_USERS[0]);
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } else {
      adminUser.password = '1';
    }
  }
  return users;
}

function saveUsersToDB(users) {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  pushCentralCloudDB();
  if (dbCloud && isCloudDBActive && Array.isArray(users)) {
    users.forEach(u => syncUserToCloud(u));
  }
}

function getRequestsFromDB() {
  return JSON.parse(localStorage.getItem(REQUESTS_DB_KEY) || '[]');
}

function saveRequestsToDB(requests) {
  localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
  pushCentralCloudDB();
  if (dbCloud && isCloudDBActive && Array.isArray(requests)) {
    requests.forEach(r => syncRequestToCloud(r));
  }
}

// AUTOMATED WHATSAPP NOTIFICATION ENGINE (FONTE / FONNTE API)
function getFonteToken() {
  return localStorage.getItem(FONTE_TOKEN_KEY) || '';
}

function simpanFonteToken() {
  const token = document.getElementById('fonteTokenInput').value.trim();
  localStorage.setItem(FONTE_TOKEN_KEY, token);
  showNotif(token ? 'TOKEN WA FONTE BERHASIL DISIMPAN!' : 'TOKEN WA DIKOSONGKAN!', 'info');
}

function loadFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  if (input) {
    input.value = getFonteToken();
  }
}

function kirimNotifikasiWA(targetPhone, message) {
  const token = getFonteToken();
  if (!token) {
    console.log(`[WA NOTIF SIMULATED - TOKEN BELUM DIISI] To: ${targetPhone} Msg: ${message}`);
    return;
  }

  if (!targetPhone) return;

  const formData = new FormData();
  formData.append('target', targetPhone);
  formData.append('message', message);

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
}

// 10 THEME ENGINE
function loadSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark-mode';
  document.body.className = saved;
  const idx = THEME_MODES.findIndex(t => t.id === saved);
  currentThemeIndex = idx !== -1 ? idx : 0;
  updateThemeIcon();
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEME_MODES.length;
  const t = THEME_MODES[currentThemeIndex];
  document.body.className = t.id;
  localStorage.setItem(THEME_KEY, t.id);
  updateThemeIcon();
}

function updateThemeIcon() {
  const iconSpan = document.querySelector('.theme-toggle-btn span');
  if (iconSpan) {
    iconSpan.textContent = THEME_MODES[currentThemeIndex].icon;
  }
}

// AUTHENTICATION & SESSION
function autoLogin() {
  const sess = localStorage.getItem(SESSION_KEY);
  if (sess) {
    currentUser = JSON.parse(sess);
    bukaMainApp();
  } else {
    pindahHalaman('loginPage');
  }
}

function fillLogin(u, p) {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (uEl) uEl.value = u;
  if (pEl) pEl.value = p;
  prosesLogin();
}

function prosesLogin() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (!uEl || !pEl) return;

  const u = uEl.value.trim().toUpperCase();
  const p = pEl.value.trim();

  if (!u || !p) {
    showNotif('USERNAME DAN PASSWORD WAJIB DIISI!', 'warning');
    return;
  }

  let users = getUsersFromDB();
  if (!Array.isArray(users) || !users.length) {
    users = [...SEED_USERS];
  }
  
  // 1. Match from active user database
  let user = users.find(x => x && x.username && x.username.toUpperCase() === u && String(x.password).trim() === p);

  // 2. Fallback match from SEED_USERS
  if (!user) {
    user = SEED_USERS.find(x => x && x.username && x.username.toUpperCase() === u && String(x.password).trim() === p);
    if (user) {
      users.push(user);
      saveUsersToDB(users);
    }
  }

  // 3. Fallback for ADMIN with password 1
  if (!user && u === 'ADMIN' && p === '1') {
    user = {
      id: 'USR-ADMIN',
      username: 'ADMIN',
      password: '1',
      fullName: 'ADMINISTRATOR PUSAT',
      phone: '',
      category: 'ADMIN',
      area: 'ALL',
      createdAt: '31/07/2026'
    };
    users.unshift(user);
    saveUsersToDB(users);
  }

  if (user) {
    currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    showNotif(`SELAMAT DATANG, ${user.fullName}!`, 'info');
    bukaMainApp();
  } else {
    showNotif('USERNAME ATAU PASSWORD SALAH!', 'error');
  }
}

function logout() {
  showConfirm('YAKIN INGIN KELUAR DARI APLIKASI?', () => {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    tutupAkun();
    tutupNotificationModal();
    const popupBantuan = document.getElementById('popupBantuan');
    if (popupBantuan) popupBantuan.classList.remove('show');
    document.getElementById('bottomMenu').style.display = 'none';
    document.getElementById('helpButton').style.display = 'none';
    pindahHalaman('loginPage');
    updateNotifBellCounter();
  });
}

function bukaMainApp() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('bottomMenu').style.display = 'flex';
  initAllDraggableButtons();

  const isAdmin = (
    currentUser.category === 'ADMIN' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  );
  const btnUserNav = document.getElementById('btnUserNav');
  const btnMasterDbNav = document.getElementById('btnMasterDbNav');

  if (btnUserNav) btnUserNav.style.display = isAdmin ? 'flex' : 'none';
  if (btnMasterDbNav) btnMasterDbNav.style.display = isAdmin ? 'flex' : 'none';

  const btnHelp = document.getElementById('helpButton');
  if (btnHelp) btnHelp.style.display = 'flex';

  isAdminChat = isAdmin;

  pindahHalaman('dashboardPage');
  cekUnreadNotif();
  updateNotifBellCounter();
  updateAdminReminderUI();
  checkAndTriggerPendingReminders();
}

// PAGE NAVIGATION WITH CONFIRMATION WHEN LEAVING EDIT MODE
function showPage(pageId) {
  if (modeEdit && pageId !== 'inputPage') {
    showConfirm('KELUAR DARI MENU EDIT?', () => {
      bersihkanForm();
      pindahHalaman(pageId);
    });
    return;
  }
  pindahHalaman(pageId);
}

let mobileBackspaceCount = 0;
let mobileBackspaceTimer = null;

function initMobileBackButtonEngine() {
  try {
    history.pushState({ page: 'dashboardPage' }, '', location.href);
  } catch(e) {}

  window.addEventListener('popstate', (e) => {
    // 1. If any modal is open -> Close modal first
    const openModals = [
      document.getElementById('popupDetail'),
      document.getElementById('popupNotifList'),
      document.getElementById('popupBantuan'),
      document.getElementById('popupAkun'),
      document.getElementById('popupUserForm'),
      document.getElementById('pdfModal'),
      document.getElementById('rejectOverlay'),
      document.getElementById('popupTTD')
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
      try { history.pushState({ page: getCurrentActivePageId() }, '', location.href); } catch(err) {}
      return;
    }

    const currentActivePage = getCurrentActivePageId();

    // 2. IF NOT ON DASHBOARD -> INSTANTLY RETURN TO DASHBOARD PAGE
    if (currentActivePage !== 'dashboardPage' && currentActivePage !== 'loginPage') {
      pindahHalaman('dashboardPage', false);
      try { history.pushState({ page: 'dashboardPage' }, '', location.href); } catch(err) {}
      mobileBackspaceCount = 0;
      return;
    }

    // 3. IF ALREADY ON DASHBOARD -> COUNT BACKSPACE 5 TIMES BEFORE EXIT (SILENT)
    if (currentActivePage === 'dashboardPage') {
      mobileBackspaceCount++;

      if (mobileBackspaceTimer) clearTimeout(mobileBackspaceTimer);
      mobileBackspaceTimer = setTimeout(() => {
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

function pindahHalaman(pageId, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

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
    loadUsersManagement();
  }
}

/// DATA ACCESS BY ROLE & AREA (ADMIN & DM HAVE UNRESTRICTED ACCESS TO ALL AREAS)
function getAccessibleRequests() {
  const requests = getRequestsFromDB();
  if (!currentUser) return [];

  // ADMIN & DM HAVE FULL ACCESS TO ALL DATA ACROSS ALL AREAS
  if (
    currentUser.category === 'ADMIN' ||
    currentUser.category === 'DM' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  ) {
    return requests;
  }

  if (currentUser.category === 'TOKO') {
    return requests.filter(r => r.userId === currentUser.id || r.toko.toUpperCase() === currentUser.fullName.toUpperCase() || r.area === currentUser.area);
  }

  // All SERVICE users (including TSM) and SALES are scoped strictly to their own area
  return requests.filter(r => r.area === currentUser.area);
}

// DASHBOARD: FILTER LIST BY METRIC CARDS (DEFAULT: PENDING)
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

  // DYNAMICALLY UPDATE DASHBOARD TITLE ACCORDING TO ACTIVE FILTER
  const titleEl = document.getElementById('dashboardRecentTitle');
  if (titleEl) {
    titleEl.textContent = `PERMINTAAN [ ${dashboardFilterStatus} ] (KLIK BARIS UNTUK LIHAT DETAIL)`;
  }

  const lastDataContainer = document.getElementById('lastData');
  lastDataContainer.innerHTML = '';

  // FILTER LIST ON DASHBOARD BY SELECTED STATUS (DEFAULT: PENDING)
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
        <div class="colTanggal">${r.tanggal}</div>
        <div class="colNo">${r.noSurat}</div>
        <div class="colToko">${r.toko} <small style="color:var(--primary);">(${r.area})</small></div>
        <div class="colStatus">${getBadgeStatus(r)}</div>
      `;
      lastDataContainer.appendChild(div);
    });
}

// KLIK BARIS DASHBOARD: TETAP DI DASHBOARD & BUKA POPUP DETAIL DENGAN TOMBOL LENGKAP
function bukaDetailDariDashboard(noSurat) {
  lihatDetail(noSurat, true);
}

// DYNAMIC FORM MULTI-ROW ENGINE WITH CAMERA SCANNER TOOL IN EVERY SERIAL COLUMN
function loadForm() {
  document.getElementById('tanggal').value = getFormattedDateDDMMYYYY();

  const tokoSelect = document.getElementById('toko');
  tokoSelect.innerHTML = '';

  if (currentUser.category === 'TOKO') {
    tokoSelect.innerHTML = `<option value="${currentUser.fullName}">${currentUser.fullName} (${currentUser.area})</option>`;
  } else if (
    currentUser.category === 'ADMIN' ||
    currentUser.category === 'DM' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  ) {
    // ADMIN & DM can select all stores across all areas
    const allStores = getStoresFromDB();
    if (allStores.length > 0) {
      allStores.forEach(s => {
        tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`;
      });
    } else {
      tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (BDG)</option>`;
    }
  } else {
    // Service & Sales dibatasi khusus area user sendiri
    const allStores = getStoresFromDB();
    const areaStores = allStores.filter(s => s.area === currentUser.area);
    if (areaStores.length > 0) {
      areaStores.forEach(s => {
        tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`;
      });
    } else {
      tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (${currentUser.area})</option>`;
    }
  }

  updatePhotoSectionVisibility();

  if (!modeEdit) {
    bersihkanForm();
  }
}

// PLAIN TEXT STATUS WITH ROLE-BASED CONDITIONAL LABELS
function getBadgeStatus(r) {
  if (typeof r === 'string') {
    if (r === 'DONE') return '<span>SUDAH DIPENUHI</span>';
    return `<span>${r}</span>`;
  }

  if (!r) return '<span>-</span>';

  const role = currentUser ? currentUser.category : '';
  const st = r.status;
  const serviceAppv = r.serviceApprove;

  if (st === 'DONE') {
    return '<span>SUDAH DIPENUHI</span>';
  }

  if (st === 'REJECT') {
    return '<span>DITOLAK</span>';
  }

  if (st === 'APPROVE') {
    return '<span>DISETUJUI</span>';
  }

  if (st === 'PENDING') {
    if (!serviceAppv) {
      if (role === 'DM') {
        return '<span>TUNGGU SERVICE</span>';
      }
      return '<span>TUNGGU SERVICE</span>';
    } else {
      if (role === 'SERVICE' || role === 'TOKO' || role === 'SALES') {
        return '<span>TUNGGU DM</span>';
      }
      return '<span>TUNGGU APPROVAL DM</span>';
    }
  }

  return `<span>${st}</span>`;
}

// DYNAMIC FORM MULTI-ROW ENGINE WITH CAMERA SCANNER TOOL IN EVERY SERIAL COLUMN
function loadForm() {
  document.getElementById('tanggal').value = getFormattedDateDDMMYYYY();

  const tokoSelect = document.getElementById('toko');
  tokoSelect.innerHTML = '';

  if (currentUser.category === 'TOKO') {
    tokoSelect.innerHTML = `<option value="${currentUser.fullName}">${currentUser.fullName} (${currentUser.area})</option>`;
  } else {
    const users = getUsersFromDB();
    // Filter toko khusus sesuai area user yang sedang login (hanya muncul area user saja)
    const stores = users.filter(u => u.category === 'TOKO' && u.area === currentUser.area);
    if (stores.length > 0) {
      stores.forEach(s => {
        tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`;
      });
    } else {
      tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (${currentUser.area})</option>`;
    }
  }

  if (!modeEdit) {
    bersihkanForm();
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

  const scanButtonHtml = `
    <button type="button" class="btnScanSeri" onclick="bukaScanner(this)" title="SCAN BARCODE / QR NO SERI">
      <span class="material-symbols-rounded">qr_code_scanner</span>
    </button>
  `;

  if (jenis === 'DUS') {
    div.innerHTML = `
      <input class="typeBarang" placeholder="TYPE BARANG" autocomplete="off">
      <div style="display:flex; gap:4px; align-items:center;">
        <input class="seriBarang" placeholder="NO SERI" autocomplete="off" oninput="lookupTypeRow(this)" onkeyup="lookupTypeRow(this)" onblur="lookupTypeRow(this)">
        ${scanButtonHtml}
      </div>
      <input class="namaBarang" placeholder="PERMINTAAN" autocomplete="off">
      <input class="seriDusBarang" placeholder="NO SERI DUS" autocomplete="off">
      <input class="alasan" placeholder="ALASAN" autocomplete="off">
      <input type="number" class="qty" value="1" min="1" style="text-align: center;" autocomplete="off">
      <button type="button" class="btnHapusRow" onclick="hapusRow(this)"><span class="material-symbols-rounded">remove</span></button>
    `;
  } else {
    div.innerHTML = `
      <input class="typeBarang" placeholder="TYPE BARANG" autocomplete="off">
      <div style="display:flex; gap:4px; align-items:center;">
        <input class="seriBarang" placeholder="NO SERI" autocomplete="off" oninput="lookupTypeRow(this)" onkeyup="lookupTypeRow(this)" onblur="lookupTypeRow(this)">
        ${scanButtonHtml}
      </div>
      <input class="namaBarang" placeholder="PERMINTAAN" autocomplete="off">
      <input class="alasan" placeholder="ALASAN" autocomplete="off">
      <input type="number" class="qty" value="1" min="1" style="text-align: center;" autocomplete="off">
      <button type="button" class="btnHapusRow" onclick="hapusRow(this)"><span class="material-symbols-rounded">remove</span></button>
    `;
  }

  container.appendChild(div);
}

// DYNAMIC KODE UNIT LOOKUP MAP ENGINE
function getKodeUnitMap() {
  const customMap = JSON.parse(localStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
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

// CAMERA BARCODE / QR SCANNER ENGINE (INSTANT AUTO-EXIT & AUTO-FOCUS TO PERMINTAAN COLUMN)
function bukaScanner(btn) {
  const row = btn.closest('.detailRow');
  if (row) {
    activeScanInput = row.querySelector('.seriBarang');
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
            const targetInput = activeScanInput;
            const targetRow = targetInput ? targetInput.closest('.detailRow') : null;

            if (targetInput) {
              const cleanCode = String(decodedText || '').trim().toUpperCase();
              targetInput.value = cleanCode;
              lookupTypeRow(targetInput, true);
              showNotif(`NO SERI BERHASIL DI-SCAN: ${cleanCode}`, 'info');
            }

            // OTOMATIS KELUAR POPUP SCANNER
            tutupScanner();

            // OTOMATIS PINDAHKAN KURSOR KE KOLOM PERMINTAAN (.namaBarang)
            if (targetRow) {
              const namaInput = targetRow.querySelector('.namaBarang');
              if (namaInput) {
                setTimeout(() => {
                  namaInput.focus();
                  if (typeof namaInput.select === 'function') namaInput.select();
                }, 200);
              }
            }
          },
          () => {}
        ).catch(err => {
          console.warn("Kamera tidak dapat diakses / fallback input manual", err);
          showNotif('IZIN KAMERA DITOLAK ATAU TERTUTUP BROWSER!', 'warning');
        });
      } catch(err) {
        console.warn("Gagal inisialisasi html5QrCode:", err);
      }
    }, 150);
  } else {
    showNotif('MODUL SCANNER BELUM SIAP, ATAU BROWSER TIDAK MENDUKUNG!', 'warning');
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

  if (activeScanInput) {
    const row = activeScanInput.closest('.detailRow');
    if (row) {
      const namaInput = row.querySelector('.namaBarang');
      if (namaInput) {
        setTimeout(() => {
          namaInput.focus();
        }, 200);
      }
    }
  }
  activeScanInput = null;
}

function lookupTypeRow(el, isFromScanner = false) {
  if (!el) return;
  const rawValue = String(el.value || '').trim().toUpperCase();
  el.value = rawValue;

  // STRICT RULE: Must be AT LEAST 4 characters long! (1, 2, or 3 digits are ignored)
  if (!rawValue || rawValue.length < 4) return;

  const first4Chars = rawValue.substring(0, 4);
  const fullMap = getKodeUnitMap();
  const keys = Object.keys(fullMap);

  let matchedType = null;

  // 1. Check exact 4-character prefix match
  for (const key of keys) {
    const cleanKey = String(key).trim().toUpperCase();
    if (cleanKey.substring(0, 4) === first4Chars) {
      matchedType = fullMap[key];
      break;
    }
  }

  // 2. Check if rawValue starts with key (if key is 4+ chars)
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
  if (container.children.length === 0) tambahRow();
}

function kompresiFoto(file, maxDimension = 360, quality = 0.25) {
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
  document.getElementById('foto').click();
}

async function uploadPhotoToDriveCloud(file) {
  try {
    const compressedBase64 = await kompresiFoto(file, 480, 0.45);
    if (!compressedBase64) return '';

    const payload = {
      action: 'uploadPhoto',
      base64: compressedBase64,
      fileName: `FOTO_${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`
    };

    const targetUrl = GOOGLE_SHEET_WEBAPP_URL || PUBLIC_CLOUD_DB_URL;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && data.url) {
        return data.url;
      }
    }
    return await kompresiFoto(file, 200, 0.2);
  } catch (err) {
    console.warn('Upload Drive Error, fallback tiny base64:', err);
    return await kompresiFoto(file, 200, 0.2);
  }
}

async function previewFoto(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  if (currentPhotos.length + files.length > 5) {
    showNotif('MAKSIMAL FOTO DIBATASI HINGGA 5 FOTO!', 'warning');
    return;
  }

  const previewText = document.getElementById('previewText');
  const originalText = previewText ? previewText.innerHTML : 'TAP / DRAG FOTO DI SINI (MAKSIMAL 5 FOTO)';
  if (previewText) {
    previewText.innerHTML = `<span class="material-symbols-rounded" style="font-size:22px; vertical-align:middle; display:inline-block; animation:spin 0.8s linear infinite; color:var(--primary);">sync</span>`;
  }

  for (let i = 0; i < files.length; i++) {
    if (currentPhotos.length < 5) {
      try {
        const driveUrl = await uploadPhotoToDriveCloud(files[i]);
        if (driveUrl) {
          currentPhotos.push(driveUrl);
        }
        if (i < files.length - 1) {
          await new Promise(r => setTimeout(r, 350));
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
  grid.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-card';
    div.title = "KLIK UNTUK BUKA FOTO DI GOOGLE DRIVE / TAB BARU";
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

  // Re-create 1 fresh blank row
  tambahRow();

  // Sweep and wipe ALL input and textarea elements inside #inputPage
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

  if (!valid) {
    showNotif('DETAIL BARANG & ALASAN WAJIB DIISI DENGAN LENGKAP!', 'warning');
    return;
  }

  // SERIAL DUPLICATE CHECK IN DATABASE
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
  showLoading('MENYIMPAN DATA...');
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
        bersihkanForm();
        showNotif(`PERMINTAAN #${editNoSurat} BERHASIL DIPERBARUI!`, 'info');
      }
    } else {
      const now = new Date();
      const codeYear = String(now.getFullYear()).slice(-2);
      const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
      const codeDay = String(now.getDate()).padStart(2, '0');

      const allStores = getStoresFromDB();
      const matchedStore = allStores.find(s => s.fullName.toUpperCase() === toko.toUpperCase());
      let storeCode = matchedStore ? (matchedStore.storeCode || generateStoreCode(matchedStore.fullName)) : generateStoreCode(toko);

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
      bersihkanForm();
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DISIMPAN!`, 'info');

      // WA AUTOMATION TRIGGER 1: NEW REQUEST CREATED -> NOTIFY SERVICE IN AREA
      tambahNotifikasiSistem(['SERVICE'], currentUser.area, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`, noSurat);
      const allUsers = getUsersFromDB();
      const serviceUsers = allUsers.filter(u => u.category === 'SERVICE' && u.area === currentUser.area);
      serviceUsers.forEach(srv => {
        if (srv.phone) {
          kirimNotifikasiWA(srv.phone, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`);
        }
      });
    }

    pindahHalaman('riwayatPage');
  }, 400);
}

// MAIN HISTORY TABLE
function bukaMenuRiwayat() {
  filterStatusRiwayat = '';
  document.getElementById('searchRiwayat').value = '';
  showPage('riwayatPage');
}

function bukaRiwayat(status) {
  filterStatusRiwayat = status;
  document.getElementById('searchRiwayat').value = '';
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
      r.noSurat.toLowerCase().includes(search) ||
      r.toko.toLowerCase().includes(search) ||
      r.items.some(i => i.type.toLowerCase().includes(search) || i.seri.toLowerCase().includes(search) || i.barang.toLowerCase().includes(search))
    );
  }

  const thead = document.querySelector('.historyTable thead');
  const tbody = document.getElementById('riwayatData');
  const role = currentUser.category;

  thead.innerHTML = `
    <tr>
      <th>AKSI</th>
      <th>TGL</th>
      <th>NO SURAT</th>
      <th>TOKO</th>
      <th>STATUS</th>
      <th>CATATAN</th>
    </tr>
  `;

  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">BELUM ADA DATA PERMINTAAN.</td></tr>`;
    return;
  }

  data.forEach(r => {
    let aksi = '';

    if (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')) {
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

    aksi += `
      <button class="btnIcon btnInfo" onclick="lihatDetail('${r.noSurat}')" title="LIHAT DETAIL"><span class="material-symbols-rounded">visibility</span></button>
    `;

    const isPhotoHidden = (r.status === 'APPROVE' || r.status === 'DONE' || r.status === 'REJECT');
    if (r.photos && r.photos.length > 0 && !isPhotoHidden) {
      aksi += `
        <button class="btnIcon btnView" onclick="lihatFotoByNoSurat('${r.noSurat}')" title="LIHAT FOTO"><span class="material-symbols-rounded">image</span></button>
      `;
    }

    const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
    const isPdfVisible = (r.status === 'APPROVE' || r.status === 'DONE' || (isAdminUser && r.status !== 'REJECT'));
    if (isPdfVisible) {
      aksi += `
        <button class="btnIcon btnPdf" onclick="bukaPdfModal('${r.noSurat}')" title="CETAK PDF"><span class="material-symbols-rounded">picture_as_pdf</span></button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div style="display:flex; gap:4px; align-items:center;">${aksi}</div></td>
      <td style="white-space:nowrap;">${r.tanggal}</td>
      <td>${r.noSurat}</td>
      <td>${r.toko} <div style="font-size:11px; color:var(--primary);">${r.area}</div></td>
      <td>${getBadgeStatus(r.status)}</td>
      <td style="word-break:break-word; white-space:normal; color:var(--text-main);">${r.catatan || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function lihatFotoByNoSurat(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (req && req.photos && req.photos.length > 0) {
    zoomFoto(req.photos[0]);
  }
}

// APPROVAL ACTIONS WITH WA AUTOMATION TRIGGERS
function approveService(noSurat) {
  showConfirm(`APPROVE PERMINTAAN?`, () => {
    showLoading('MEMPROSES...');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      if (idx !== -1) {
        requests[idx].serviceApprove = true;
        requests[idx].serviceUserName = currentUser.fullName;

        // Auto attach Service User's Digital Signature from profile
        const ttdMap = JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}');
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
        showNotif(`APPROVE SERVICE BERHASIL UNTUK #${noSurat}!`, 'info');

        // WA AUTOMATION TRIGGER 2: SERVICE APPROVE -> NOTIFY DM PUSAT
        tambahNotifikasiSistem(['DM'], 'ALL', `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI SERVICE (${currentUser.fullName}). MOHON APPROVAL DM.`, noSurat);
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
  showConfirm(`APPROVE PERMINTAAN?`, () => {
    showLoading('MEMPROSES...');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      if (idx !== -1) {
        requests[idx].status = 'APPROVE';
        requests[idx].dmUserName = currentUser.fullName;

        // Auto attach DM User's Digital Signature from profile
        const ttdMap = JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}');
        const sig = ttdMap[currentUser.id] || ttdMap[currentUser.username] || ttdMap['DM'] || '';
        if (sig) {
          requests[idx].dmTTD = sig;
        }

        if (!requests[idx].log) requests[idx].log = [];
        requests[idx].log.push({
          action: 'APPROVE_DM',
          user: currentUser.fullName,
          notes: 'DISETUJUI DM PUSAT',
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });
        saveRequestsToDB(requests);
        showNotif(`APPROVE DM PUSAT BERHASIL UNTUK #${noSurat}!`, 'info');

        // WA AUTOMATION TRIGGER 3: DM APPROVE -> NOTIFY SERVICE IN AREA & TOKO
        tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM PUSAT. SILAKAN DIPROSES.`, noSurat);
        const users = getUsersFromDB();
        const serviceUsers = users.filter(u => u.category === 'SERVICE' && u.area === requests[idx].area);
        serviceUsers.forEach(srv => {
          if (srv.phone) {
            kirimNotifikasiWA(srv.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM PUSAT. SILAKAN DIPROSES.`);
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
    showLoading('MEMPROSES...');
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

        // WA AUTOMATION TRIGGER 4: SERVICE SETS DONE -> NOTIFY CREATOR (TOKO/SALES)
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
  document.getElementById('rejectNoSurat').value = noSurat;
  document.getElementById('rejectRoleType').value = roleType;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectTitle').textContent = `TOLAK PERMINTAAN`;
  document.getElementById('rejectOverlay').style.display = 'flex';
}

function closeReject() {
  document.getElementById('rejectOverlay').style.display = 'none';
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
  showLoading('MEMPROSES PENOLAKAN...');
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
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DITOLAK.`, 'info');

      const users = getUsersFromDB();
      const creator = users.find(u => u.id === requests[idx].userId || u.fullName === requests[idx].createdBy);

      if (roleType === 'SERVICE') {
        // WA AUTOMATION TRIGGER 5: SERVICE REJECTS -> NOTIFY CREATOR
        tambahNotifikasiSistem(['TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DITOLAK SERVICE. CATATAN: ${alasan}`, noSurat);
        if (creator && creator.phone) {
          kirimNotifikasiWA(creator.phone, `PERMINTAAN #${noSurat} DITOLAK SERVICE. CATATAN: ${alasan}`);
        }
      } else if (roleType === 'DM') {
        // WA AUTOMATION TRIGGER 6: DM REJECTS -> NOTIFY SERVICE IN AREA & CREATOR
        tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK DM PUSAT. CATATAN: ${alasan}`, noSurat);
        if (creator && creator.phone) {
          kirimNotifikasiWA(creator.phone, `PERMINTAAN #${noSurat} DITOLAK DM PUSAT. CATATAN: ${alasan}`);
        }
        const serviceUsers = users.filter(u => u.category === 'SERVICE' && u.area === requests[idx].area);
        serviceUsers.forEach(srv => {
          if (srv.phone) {
            kirimNotifikasiWA(srv.phone, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK DM PUSAT. CATATAN: ${alasan}`);
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

  modeEdit = true;
  editNoSurat = req.noSurat;

  pindahHalaman('inputPage');

  document.getElementById('toko').value = req.toko;
  document.getElementById('jenisPermintaan').value = req.jenis;
  document.getElementById('catatan').value = req.catatan || '';

  gantiJenis();

  const container = document.getElementById('detailContainer');
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

  currentPhotos = [...(req.photos || [])];
  renderPhotoGrid();

  document.getElementById('btnSimpan').textContent = 'SIMPAN PERUBAHAN';
}

function hapusData(noSurat) {
  showConfirm(`HAPUS PERMANEN DATA PERMINTAAN #${noSurat}?`, () => {
    showLoading('MENGHAPUS...');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB().filter(r => r.noSurat !== noSurat);
      
      const delReqs = JSON.parse(localStorage.getItem(DELETED_REQUESTS_KEY) || '[]');
      if (!delReqs.includes(noSurat)) delReqs.push(noSurat);
      localStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(delReqs));

      saveRequestsToDB(requests);
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DIHAPUS.`, 'info');
      loadRiwayat();
      loadDashboard();
      if (currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
    }, 300);
  });
}

// LIHAT DETAIL POPUP MODAL (SHOW ALL ACTION BUTTONS AT BOTTOM WHEN CLICKED FROM DASHBOARD)
function lihatDetail(noSurat, fromDashboard = false) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  document.getElementById('popupTitle').textContent = 'DETAIL PERMINTAAN';
  const msgBox = document.getElementById('popupMessage');

  let headerInfoHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-color); padding-bottom:10px; margin-bottom:14px; font-size:13px; color:var(--text-main);">
      <div style="text-align:left;">NO SURAT : <span style="color:var(--primary);">${req.noSurat}</span></div>
      <div style="text-align:right;">TOKO : <span>${req.toko}</span></div>
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

  if (fromDashboard) {
    let actionButtons = [];
    const role = currentUser.category;

    if (role === 'SERVICE') {
      if (req.status === 'PENDING' && !req.serviceApprove) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnApprove" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); approveService('${req.noSurat}');">
            <span class="material-symbols-rounded">check_circle</span> APPROVE SERVICE
          </button>
        `);
        actionButtons.push(`
          <button type="button" class="btnIcon btnReject" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); tolakServiceModal('${req.noSurat}', 'SERVICE');">
            <span class="material-symbols-rounded">cancel</span> REJECT SERVICE
          </button>
        `);
      } else if (req.status === 'APPROVE') {
        actionButtons.push(`
          <button type="button" class="btnIcon btnDone" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); doneService('${req.noSurat}');">
            <span class="material-symbols-rounded">task_alt</span> SET DONE
          </button>
        `);
      }
    } else if (role === 'DM') {
      if (req.status === 'PENDING' && req.serviceApprove) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnApprove" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); approveDM('${req.noSurat}');">
            <span class="material-symbols-rounded">check_circle</span> APPROVE DM
          </button>
        `);
        actionButtons.push(`
          <button type="button" class="btnIcon btnReject" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); tolakServiceModal('${req.noSurat}', 'DM');">
            <span class="material-symbols-rounded">cancel</span> REJECT DM
          </button>
        `);
      }
    }

    const isPhotoHidden = (req.status === 'APPROVE' || req.status === 'DONE' || req.status === 'REJECT');
    if (req.photos && req.photos.length > 0 && !isPhotoHidden) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnView" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="lihatFotoByNoSurat('${req.noSurat}');">
          <span class="material-symbols-rounded">image</span> FOTO
        </button>
      `);
    }

    const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
    if (req.status === 'APPROVE' || req.status === 'DONE' || (isAdminUser && req.status !== 'REJECT')) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnPdf" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="bukaPdfModal('${req.noSurat}');">
          <span class="material-symbols-rounded">picture_as_pdf</span> CETAK PDF
        </button>
      `);
    }

    const isCreator = (req.userId === currentUser.id || req.createdBy === currentUser.fullName);
    const canEditDelete = (!req.serviceApprove && req.status === 'PENDING') && (isCreator || currentUser.category === 'SERVICE');

    if (canEditDelete) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnEdit" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); editPermintaan('${req.noSurat}');">
          <span class="material-symbols-rounded">edit</span> EDIT
        </button>
      `);
      actionButtons.push(`
        <button type="button" class="btnIcon btnDelete" style="width:auto; padding:8px 16px; border-radius:8px;" onclick="closeDetail(); hapusData('${req.noSurat}');">
          <span class="material-symbols-rounded">delete</span> HAPUS
        </button>
      `);
    }

    if (actionButtons.length > 0) {
      bottomActionsHtml = `
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; border-top:1px solid var(--border-color); padding-top:14px; justify-content:center; align-items:center;">
          ${actionButtons.join('')}
        </div>
      `;
    }
  } else {
    const isCreator = (req.userId === currentUser.id || req.createdBy === currentUser.fullName);
    const canEditDelete = (!req.serviceApprove && req.status === 'PENDING') && (isCreator || currentUser.category === 'SERVICE');

    if (canEditDelete) {
      bottomActionsHtml = `
        <div style="display:flex; gap:12px; margin-top:16px; border-top:1px solid var(--border-color); padding-top:14px; justify-content:center; align-items:center;">
          <button type="button" class="btnIcon btnEdit" style="width:auto; padding:8px 18px; border-radius:8px;" onclick="closeDetail(); editPermintaan('${req.noSurat}');">
            <span class="material-symbols-rounded">edit</span> EDIT PERMINTAAN
          </button>
          <button type="button" class="btnIcon btnDelete" style="width:auto; padding:8px 18px; border-radius:8px;" onclick="closeDetail(); hapusData('${req.noSurat}');">
            <span class="material-symbols-rounded">delete</span> HAPUS PERMINTAAN
          </button>
        </div>
      `;
    }
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

  document.getElementById('popupDetail').style.display = 'flex';
}

function closeDetail() {
  document.getElementById('popupDetail').style.display = 'none';
}

// PDF DOCUMENT GENERATOR & PRINT
function bukaPdfModal(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  const pdfContainer = document.getElementById('pdfDocumentContent');
  if (!pdfContainer) return;

  let itemRowsHtml = req.items.map((i, idx) => `
    <tr>
      <td style="text-align:center; padding:6px 8px; border:1px solid #cbd5e1;">${idx + 1}</td>
      <td style="padding:6px 8px; border:1px solid #cbd5e1;">${i.type}</td>
      <td style="padding:6px 8px; border:1px solid #cbd5e1;">${i.seri}</td>
      ${req.jenis === 'DUS' ? `<td style="padding:6px 8px; border:1px solid #cbd5e1; color:#d97706;">${i.dus || '-'}</td>` : ''}
      <td style="padding:6px 8px; border:1px solid #cbd5e1;">${i.barang}</td>
      <td style="padding:6px 8px; border:1px solid #cbd5e1;">${i.alasan}</td>
      <td style="text-align:center; padding:6px 8px; border:1px solid #cbd5e1;">${i.qty}</td>
    </tr>
  `).join('');

  const users = getUsersFromDB();
  const serviceUser = users.find(u => u.category === 'SERVICE' && u.area === req.area) || users.find(u => u.category === 'SERVICE');
  const dmUser = users.find(u => u.category === 'DM') || users.find(u => u.username === 'ADMIN');
  const serviceName = req.serviceUserName || (serviceUser ? serviceUser.fullName : 'SERVICE SUPERVISOR');
  const dmName = req.dmUserName || (dmUser ? dmUser.fullName : 'FERRY EDIYANTO');

  const ttdMap = JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}');
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
    dmTTD = ttdMap['DM'] || ttdMap['DM_PUSAT'] || '';
  }

  const nowPrint = new Date();
  const pDay = String(nowPrint.getDate()).padStart(2, '0');
  const pMonth = String(nowPrint.getMonth() + 1).padStart(2, '0');
  const pYear = nowPrint.getFullYear();
  const pHour = String(nowPrint.getHours()).padStart(2, '0');
  const pMin = String(nowPrint.getMinutes()).padStart(2, '0');
  const pSec = String(nowPrint.getSeconds()).padStart(2, '0');
  const timestampStr = `DI CETAK PADA ${pDay}/${pMonth}/${pYear} Pukul ${pHour}:${pMin}:${pSec}`;

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

  pdfContainer.innerHTML = `
    <div class="pdf-paper" style="min-height: 680px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px; color: #0f172a; background: #ffffff; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
      <div>
        <!-- HEADER DOCUMENT -->
        <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 14px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
          PERMINTAAN TOKO
        </div>

        <!-- 4 KETERANGAN UTAMA (NO SURAT, TOKO, TANGGAL, JENIS) -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; border: 1px solid #cbd5e1; background: #f8fafc;">
          <tr>
            <td style="padding: 7px 10px; width: 14%; font-weight: bold; border-bottom: 1px solid #e2e8f0;">NO SURAT</td>
            <td style="padding: 7px 4px; width: 2%; border-bottom: 1px solid #e2e8f0;">:</td>
            <td style="padding: 7px 10px; width: 34%; font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0;">${req.noSurat}</td>
            <td style="padding: 7px 10px; width: 14%; font-weight: bold; border-bottom: 1px solid #e2e8f0;">TANGGAL</td>
            <td style="padding: 7px 4px; width: 2%; border-bottom: 1px solid #e2e8f0;">:</td>
            <td style="padding: 7px 10px; width: 34%; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${req.tanggal}</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; font-weight: bold;">TOKO</td>
            <td style="padding: 7px 4px;">:</td>
            <td style="padding: 7px 10px; font-weight: 700;">${req.toko}</td>
            <td style="padding: 7px 10px; font-weight: bold;">JENIS</td>
            <td style="padding: 7px 4px;">:</td>
            <td style="padding: 7px 10px; font-weight: 700; color: #16a34a;">${req.jenis}</td>
          </tr>
        </table>

        <!-- DETAIL PERMINTAAN TABLE -->
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #0f172a;">DETAIL PERMINTAAN:</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0284c7; color: #ffffff;">
              <th style="width: 32px; text-align:center; padding:6px 8px; border:1px solid #0284c7;">NO</th>
              <th style="padding:6px 8px; border:1px solid #0284c7;">TIPE BARANG</th>
              <th style="padding:6px 8px; border:1px solid #0284c7;">NO. SERI</th>
              ${req.jenis === 'DUS' ? '<th style="padding:6px 8px; border:1px solid #0284c7;">NO. SERI DUS</th>' : ''}
              <th style="padding:6px 8px; border:1px solid #0284c7;">PERMINTAAN BARANG</th>
              <th style="padding:6px 8px; border:1px solid #0284c7;">ALASAN PERMINTAAN</th>
              <th style="width: 45px; text-align:center; padding:6px 8px; border:1px solid #0284c7;">QTY</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>

        <!-- FOTO BARANG PENDUKUNG (SAMA KOTAKNYA JIKA ADA FOTO) -->
        ${photoSection}

        <!-- CATATAN -->
        <div style="margin-top: 8px; margin-bottom: 16px; font-size: 11.5px; background: #ffffff; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
          <strong>CATATAN:</strong> ${req.catatan || 'STOK TOKO'}
        </div>
      </div>

      <div>
        <!-- TTD 3 KOLOM SEJAJAR: KIRI = PEMOHON (SELALU KOSONG), TENGAH = DIPERIKSA, KANAN = DISETUJUI -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; text-align: center; font-size: 11px;">
          <!-- KIRI: PEMOHON (LANGSUNG TERISI NAMA TOKO) -->
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 120px;">
            <div style="font-weight: bold;">PEMOHON</div>
            <div style="height: 50px;"></div>
            <div style="border-top: 1px solid #000; padding-top: 4px;">
              <div style="font-weight: bold;">${req.toko}</div>
            </div>
          </div>

          <!-- TENGAH: DIPERIKSA (SERVICE SUPERVISOR AREA) -->
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 120px;">
            <div style="font-weight: bold;">DIPERIKSA</div>
            <div style="height: 50px; display: flex; align-items: center; justify-content: center;">${serviceTTD ? `<img src="${serviceTTD}" style="height: 48px; max-width: 100%; object-fit: contain;">` : ''}</div>
            <div style="border-top: 1px solid #000; padding-top: 4px;">
              <div style="font-weight: bold;">${serviceName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">${hodsAreaTitle}</div>
            </div>
          </div>

          <!-- KANAN: DISETUJUI (FERRY EDIYANTO - DISTRICT MANAGER) -->
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 120px;">
            <div style="font-weight: bold;">DISETUJUI</div>
            <div style="height: 50px; display: flex; align-items: center; justify-content: center;">${dmTTD ? `<img src="${dmTTD}" style="height: 48px; max-width: 100%; object-fit: contain;">` : ''}</div>
            <div style="border-top: 1px solid #000; padding-top: 4px;">
              <div style="font-weight: bold;">FERRY EDIYANTO</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">DISTRICT MANAGER</div>
            </div>
          </div>
        </div>

        <!-- PRINT TIMESTAMP AT BOTTOM RIGHT (SMALLER FONT & FARTHER SPACING FROM TTD) -->
        <div style="margin-top: 36px; text-align: right; font-size: 8px; font-style: italic; color: #64748b; opacity: 0.85; letter-spacing: 0.2px;">
          ${timestampStr}
        </div>
      </div>
    </div>
  `;

  document.getElementById('pdfModal').style.display = 'flex';
}

function tutupPdfModal() {
  document.getElementById('pdfModal').style.display = 'none';
}

function cetakDokumenPdf() {
  window.print();
}

// DIGITAL SIGNATURE (TTD) CANVAS ENGINE
function bukaTTD() {
  if (currentUser.category !== 'SERVICE' && currentUser.category !== 'DM') {
    showNotif('TANDA TANGAN DIGITAL KHUSUS UNTUK SERVICE & DM!', 'warning');
    return;
  }
  document.getElementById('popupTTD').classList.add('show');
  setTimeout(() => {
    initCanvasTTD();
    loadTTD();
  }, 100);
}

function tutupTTD() {
  document.getElementById('popupTTD').classList.remove('show');
}

function initCanvasTTD() {
  canvasTTD = document.getElementById('canvasTTD');
  if (!canvasTTD) return;
  ctxTTD = canvasTTD.getContext('2d');

  ctxTTD.lineWidth = 2.8;
  ctxTTD.lineCap = 'round';
  ctxTTD.lineJoin = 'round';
  ctxTTD.strokeStyle = '#000000';

  ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);

  canvasTTD.onmousedown = startDraw;
  canvasTTD.onmousemove = draw;
  canvasTTD.onmouseup = stopDraw;
  canvasTTD.onmouseleave = stopDraw;

  canvasTTD.ontouchstart = startDrawTouch;
  canvasTTD.ontouchmove = drawTouch;
  canvasTTD.ontouchend = stopDraw;
}

function startDraw(e) {
  isDrawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
  ctxTTD.beginPath();
  ctxTTD.moveTo(lastX, lastY);
}

function draw(e) {
  if (!isDrawing) return;
  const x = e.offsetX;
  const y = e.offsetY;
  const mx = (lastX + x) / 2;
  const my = (lastY + y) / 2;
  ctxTTD.quadraticCurveTo(lastX, lastY, mx, my);
  ctxTTD.stroke();
  lastX = x;
  lastY = y;
}

function startDrawTouch(e) {
  e.preventDefault();
  const rect = canvasTTD.getBoundingClientRect();
  lastX = e.touches[0].clientX - rect.left;
  lastY = e.touches[0].clientY - rect.top;
  isDrawing = true;
  ctxTTD.beginPath();
  ctxTTD.moveTo(lastX, lastY);
}

function drawTouch(e) {
  e.preventDefault();
  if (!isDrawing) return;
  const rect = canvasTTD.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;
  const mx = (lastX + x) / 2;
  const my = (lastY + y) / 2;
  ctxTTD.quadraticCurveTo(lastX, lastY, mx, my);
  ctxTTD.stroke();
  lastX = x;
  lastY = y;
}

function stopDraw() { isDrawing = false; }

function hapusTTD() {
  if (ctxTTD) ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
}

function simpanTTD() {
  showConfirm('SIMPAN TANDA TANGAN DIGITAL INI?', () => {
    const png = canvasTTD.toDataURL('image/png');
    const ttdMap = JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}');
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
    localStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
    pushCentralCloudDB();
    showNotif('TANDA TANGAN DIGITAL BERHASIL DISIMPAN!', 'info');
    tutupTTD();
  });
}

function loadTTD() {
  const ttdMap = JSON.parse(localStorage.getItem(TTD_DB_KEY) || '{}');
  const data = ttdMap[currentUser.fullName];
  if (data && ctxTTD) {
    const img = new Image();
    img.onload = () => {
      ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
      ctxTTD.drawImage(img, 0, 0, canvasTTD.width, canvasTTD.height);
    };
    img.src = data;
  }
}

let fastChatInterval = null;

// LIVE CHAT WIDGET
function bukaBantuan() {
  document.getElementById('helpButton').style.display = 'none';
  document.getElementById('popupBantuan').classList.add('show');

  // Activate 300ms Sub-second Fast Chat Sync
  pullCentralCloudDB();
  if (!fastChatInterval) {
    fastChatInterval = setInterval(pullCentralCloudDB, 300);
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
    if (headerTitle) headerTitle.innerText = 'DAFTAR PESAN MASUK';
    loadDaftarChatAdmin();
  } else {
    if (chatList) chatList.style.display = 'none';
    if (chatBody) chatBody.style.display = 'block';
    if (chatFooter) chatFooter.style.display = 'flex';
    if (btnBack) btnBack.style.display = 'none';
    if (headerTitle) headerTitle.innerText = 'ADMIN SUPPORT';
    loadChatUser();
  }
}

function tutupBantuan() {
  document.getElementById('popupBantuan').classList.remove('show');
  document.getElementById('helpButton').style.display = 'flex';
  if (fastChatInterval) {
    clearInterval(fastChatInterval);
    fastChatInterval = null;
  }
  cekUnreadNotif();
}

function loadDaftarChatAdmin() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;
  const rooms = JSON.parse(localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  chatList.innerHTML = '';

  if (rooms.length === 0) {
    chatList.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">BELUM ADA PESAN MASUK.</div>`;
    return;
  }

  rooms.forEach(r => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:12px; border-bottom:1px solid var(--border-color); cursor:pointer;';
    item.innerHTML = `
      <div style="font-size:13px;">
        ${r.user} ${r.unreadAdmin > 0 ? `<span style="background:#ef4444; color:#fff; border-radius:10px; padding:2px 6px; font-size:10px;">${r.unreadAdmin}</span>` : ''}
      </div>
      <div style="color:var(--text-muted); font-size:11px; margin-top:2px;">${r.last}</div>
    `;
    item.onclick = () => bukaRoomAdmin(r.room, r.user);
    chatList.appendChild(item);
  });
}

function bukaRoomAdmin(room, user) {
  currentRoom = room;
  currentChatUser = user;

  const rooms = JSON.parse(localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  const rIdx = rooms.findIndex(x => x.room === room);
  if (rIdx !== -1) {
    rooms[rIdx].unreadAdmin = 0;
    localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    pushCentralCloudDB();
  }

  document.getElementById('chatList').style.display = 'none';
  document.getElementById('chatBody').style.display = 'block';
  document.getElementById('chatFooter').style.display = 'flex';
  document.getElementById('btnBackAdmin').style.display = 'inline-block';
  document.getElementById('chatHeaderTitle').innerText = 'CHAT WITH ' + user;
  loadChatAdmin(room);
}

function loadChatAdmin(room) {
  const allChats = JSON.parse(localStorage.getItem(CHAT_DB_KEY) || '[]');
  const roomChats = allChats.filter(c => c.room === room);
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '';

  roomChats.forEach(c => {
    const isSelf = (c.pengirim === 'ADMIN');
    const div = document.createElement('div');
    div.className = isSelf ? 'chatUser' : 'chatAdmin';
    div.innerHTML = `
      <div class="chatText">${c.pesan}</div>
      <div class="chatTime">${c.tanggal}</div>
    `;
    body.appendChild(div);
  });

  body.scrollTop = body.scrollHeight;
}

function loadChatUser() {
  const allChats = JSON.parse(localStorage.getItem(CHAT_DB_KEY) || '[]');
  const userChats = allChats.filter(c => c.user === currentUser.username);
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '';

  if (userChats.length === 0) {
    body.innerHTML = `<div class="chatAdmin"><div class="chatText">HALO 👋<br>ADA YANG BISA KAMI BANTU?</div></div>`;
    return;
  }

  userChats.forEach(c => {
    const isSelf = (c.pengirim === 'USER');
    const div = document.createElement('div');
    div.className = isSelf ? 'chatUser' : 'chatAdmin';
    div.innerHTML = `
      <div class="chatText">${c.pesan}</div>
      <div class="chatTime">${c.tanggal}</div>
    `;
    body.appendChild(div);
  });

  body.scrollTop = body.scrollHeight;
}

function kirimPesanChat() {
  const txt = document.getElementById('chatPesan');
  if (!txt) return;
  const pesan = txt.value.trim().toUpperCase();
  if (!pesan) return;

  const allChats = JSON.parse(localStorage.getItem(CHAT_DB_KEY) || '[]');
  const rooms = JSON.parse(localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

  if (isAdminChat) {
    allChats.push({
      room: currentRoom,
      user: currentChatUser,
      pengirim: 'ADMIN',
      pesan,
      tanggal: getFormattedDateDDMMYYYY() + ' ' + new Date().toLocaleTimeString('id-ID')
    });
    localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
    localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    pushCentralCloudDB();

    txt.value = '';
    loadChatAdmin(currentRoom);
  } else {
    const room = 'ROOM_' + currentUser.username;
    allChats.push({
      room,
      user: currentUser.username,
      pengirim: 'USER',
      pesan,
      tanggal: getFormattedDateDDMMYYYY() + ' ' + new Date().toLocaleTimeString('id-ID')
    });
    localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));

    const rIdx = rooms.findIndex(x => x.room === room);
    if (rIdx !== -1) {
      rooms[rIdx].last = pesan;
      rooms[rIdx].unreadAdmin = (rooms[rIdx].unreadAdmin || 0) + 1;
    } else {
      rooms.push({ room, user: currentUser.username, last: pesan, unreadAdmin: 1 });
    }
    localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    pushCentralCloudDB();

    txt.value = '';
    loadChatUser();
  }
}

function kembaliKeDaftarAdmin() {
  document.getElementById('chatBody').style.display = 'none';
  document.getElementById('chatFooter').style.display = 'none';
  document.getElementById('chatList').style.display = 'block';
  document.getElementById('btnBackAdmin').style.display = 'none';
  document.getElementById('chatHeaderTitle').innerText = 'DAFTAR PESAN MASUK';
  loadDaftarChatAdmin();
}

function cekUnreadNotif() {
  if (!currentUser) return;
  const badge = document.getElementById('unreadBadge');
  if (!badge) return;

  if (isAdminChat) {
    const rooms = JSON.parse(localStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
    const total = rooms.reduce((acc, curr) => acc + (curr.unreadAdmin || 0), 0);
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : total;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } else {
    badge.style.display = 'none';
  }
}

// USER MANAGEMENT ENGINE
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
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color:var(--text-main);">${u.username}</td>
      <td style="font-family:monospace; color:var(--text-muted);">${u.password}</td>
      <td>${u.fullName}</td>
      <td><strong style="color:var(--primary);">${u.storeCode || '-'}</strong></td>
      <td>${u.phone || '-'}</td>
      <td><span class="badgeStatus badge-pending" style="font-weight:600;">${u.category}</span></td>
      <td><span style="color:var(--primary); font-weight:600;">${u.area}</span></td>
      <td style="text-align: right; white-space:nowrap;">
        <button class="btnIcon btnEdit" onclick="bukaUserModal('${u.id}')" title="EDIT USER"><span class="material-symbols-rounded">edit</span></button>
        <button class="btnIcon btnDelete" onclick="hapusUser('${u.id}')" title="HAPUS USER"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function bukaUserModal(userId = null) {
  document.getElementById('editUserId').value = userId || '';
  const title = document.getElementById('userFormTitle');

  if (userId) {
    const u = getUsersFromDB().find(x => x.id === userId);
    if (!u) return;
    document.getElementById('uFormUsername').value = u.username;
    document.getElementById('uFormPassword').value = u.password;
    document.getElementById('uFormFullName').value = u.fullName;
    document.getElementById('uFormStoreCode').value = u.storeCode || '';
    document.getElementById('uFormPhone').value = u.phone;
    document.getElementById('uFormCategory').value = u.category;
    document.getElementById('uFormArea').value = u.area;
    title.textContent = `EDIT USER: ${u.username}`;
  } else {
    document.getElementById('uFormUsername').value = '';
    document.getElementById('uFormPassword').value = '';
    document.getElementById('uFormFullName').value = '';
    document.getElementById('uFormStoreCode').value = '';
    document.getElementById('uFormPhone').value = '';
    title.textContent = 'TAMBAH USER BARU';
  }

  document.getElementById('popupUserForm').style.display = 'flex';
}

function tutupUserModal() {
  document.getElementById('popupUserForm').style.display = 'none';
}

function simpanUserData() {
  const editId = document.getElementById('editUserId').value;
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
    const idx = users.findIndex(u => u.id === editId);
    if (idx !== -1) {
      users[idx].username = username;
      users[idx].password = password;
      users[idx].fullName = fullName;
      users[idx].storeCode = storeCode;
      users[idx].phone = phone;
      users[idx].category = category;
      users[idx].area = area;
      saveUsersToDB(users);
      showNotif(`USER ${username} DIPERBARUI!`, 'info');
    }
  } else {
    if (users.some(u => u.username.toUpperCase() === username)) {
      showNotif(`USERNAME '${username}' SUDAH TERDAFTAR!`, 'error');
      return;
    }
    const newUser = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
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
    showNotif(`USER BARU ${username} BERHASIL DITAMBAHKAN!`, 'info');
  }

  tutupUserModal();
  loadUsersManagement();
}

function hapusUser(userId) {
  const users = getUsersFromDB();
  const u = users.find(x => x.id === userId);
  if (!u) return;

  if (u.username.toUpperCase() === currentUser.username.toUpperCase()) {
    showNotif('TIDAK DAPAT MENGHAPUS AKUN AKTIF ANDA!', 'error');
    return;
  }

  showConfirm(`HAPUS USER '${u.fullName}' (${u.username})?`, () => {
    const delUsers = JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]');
    if (!delUsers.includes(userId)) delUsers.push(userId);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));

    saveUsersToDB(users.filter(x => x.id !== userId));
    showNotif(`USER ${u.username} DIHAPUS.`, 'info');
    loadUsersManagement();
  });
}

// MASTER DATABASE PERMINTAAN FOR ADMIN (SERVICE TSM)
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
    let itemsDetailText = r.items.map((i, idx) => `${idx + 1}. ${i.type} | SN:${i.seri} | Item:${i.barang} | Alasan:${i.alasan} (Qty:${i.qty})`).join('<br>');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color:var(--primary);">${r.noSurat}</td>
      <td style="white-space:nowrap;">${r.tanggal}</td>
      <td>${r.toko} <div style="font-size:11px; color:var(--text-muted);">By: ${r.createdBy}</div></td>
      <td><span style="color:var(--primary);">${r.area}</span></td>
      <td>${r.jenis}</td>
      <td style="font-size:12px; max-width:320px; word-break:break-word;">${itemsDetailText}</td>
      <td>${getBadgeStatus(r.status)}</td>
      <td style="word-break:break-word; max-width:200px;">${r.catatan || '-'}</td>
      <td style="text-align:center;">
        <button class="btnIcon btnDelete" onclick="hapusDataMaster('${r.noSurat}')" title="HAPUS PERMANEN"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function hapusDataMaster(noSurat) {
  showConfirm(`ADMIN: HAPUS PERMANEN DATA PERMINTAAN #${noSurat} DARI MASTER DATABASE?`, () => {
    showLoading('MENGHAPUS DATA MASTER...');
    setTimeout(() => {
      hideLoading();
      const requests = getRequestsFromDB().filter(r => r.noSurat !== noSurat);
      saveRequestsToDB(requests);
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DIHAPUS DARI MASTER DATABASE!`, 'info');
      loadMasterDbTable();
      loadRiwayat();
      loadDashboard();
    }, 300);
  });
}

// GENUINE .XLSX EXPORT ENGINE FOR ADMIN MASTER DATABASE
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

// UPLOAD & PARSE DYNAMIC 2-COLUMN EXCEL LOOKUP FILE (BEBAS COPAS: KOLOM A = KODE/PREFIX SERI, KOLOM B = TYPE/NAMA BARANG)
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

          // Skip header row if contains KODE, TYPE, SERI, BARANG, NAMA
          if (idx === 0 && (colA.includes('KODE') || colB.includes('TYPE') || colA.includes('SERI') || colB.includes('BARANG') || colB.includes('NAMA'))) return;

          if (colA && colB) {
            newLookup[colA] = colB;
            count++;
          }
        }
      });

      if (count > 0) {
        const existingMap = JSON.parse(localStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
        const updatedMap = { ...existingMap, ...newLookup };
        localStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(updatedMap));

        // PUSH UPDATED EXCEL LOOKUP MAPPING TO GLOBAL CLOUD DATABASE WORLDWIDE
        pushCentralCloudDB();

        hideLoading();
        showNotif(`BERHASIL MEMPERBARUI ${count} KODE SERI BARANG!`, 'info');
        const statusEl = document.getElementById('lookupUploadStatus');
        if (statusEl) statusEl.textContent = `✓ ${count} KODE SERI BERHASIL DITAMBAHKAN!`;
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

// PROFILE MODAL
function bukaAkun() {
  if (!currentUser) return;
  document.getElementById('akunNama').value = currentUser.fullName;
  document.getElementById('akunHP').value = currentUser.phone || '-';
  document.getElementById('akunArea').value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;
  document.getElementById('akunKategori').value = currentUser.category;
  document.getElementById('akunPassword').value = '';

  const menuTTD = document.getElementById('menuTTD');
  if (menuTTD) {
    menuTTD.style.display = (currentUser.category === 'SERVICE' || currentUser.category === 'DM') ? 'block' : 'none';
  }

  document.getElementById('popupAkun').classList.add('show');
}

function tutupAkun() {
  document.getElementById('popupAkun').classList.remove('show');
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
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));

      showNotif('PROFIL AKUN BERHASIL DIPERBARUI!', 'info');
      tutupAkun();
      loadDashboard();
      if (document.getElementById('userTableBody')) {
        loadUsersManagement();
      }
    }
  });
}

// MODAL TAMBAH TOKO ENGINE FOR ALL USERS
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

  // Remove from DELETED_STORES_KEY blacklist if previously deleted
  const storeKey = `${namaToko}_${currentUser.area}`;
  let deletedStoreKeys = JSON.parse(localStorage.getItem(DELETED_STORES_KEY) || '[]');
  if (deletedStoreKeys.includes(storeKey)) {
    deletedStoreKeys = deletedStoreKeys.filter(k => k !== storeKey);
    localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
  }

  const generatedCode = generateStoreCode(namaToko);
  const newId = `STK-${Date.now()}`;

  // 1. Add to STORES_DB_KEY
  const localStores = JSON.parse(localStorage.getItem(STORES_DB_KEY) || '[]');
  const newStore = {
    id: newId,
    fullName: namaToko,
    area: currentUser.area,
    storeCode: generatedCode,
    createdBy: currentUser.fullName
  };
  localStores.push(newStore);
  localStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));

  // 2. Add directly into USERS_DB_KEY (Database Admin)
  const users = getUsersFromDB();
  const safeUsername = namaToko.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
  if (!users.some(u => u.username.toUpperCase() === safeUsername)) {
    const newUserAcc = {
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

  showNotif(`BERHASIL DITAMBAHKAN!`, 'info');
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
    // 1. Remove from STORES_DB_KEY
    const localStores = JSON.parse(localStorage.getItem(STORES_DB_KEY) || '[]');
    const updatedLocal = localStores.filter(s => s.id !== id && s.fullName.toUpperCase() !== name.toUpperCase());
    localStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedLocal));

    // 2. Add to DELETED_STORES_KEY blacklist
    const deletedStoreKeys = JSON.parse(localStorage.getItem(DELETED_STORES_KEY) || '[]');
    const storeKey = `${name.toUpperCase()}_${storeArea}`;
    if (!deletedStoreKeys.includes(storeKey)) {
      deletedStoreKeys.push(storeKey);
      localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
    }

    // 3. Remove directly from USERS_DB_KEY (Database Admin)
    const users = getUsersFromDB();
    const updatedUsers = users.filter(u => u.id !== id && !(u.category === 'TOKO' && u.fullName.toUpperCase() === name.toUpperCase()));
    saveUsersToDB(updatedUsers);

    showNotif(`BERHASIL DIHAPUS!`, 'info');
    loadDaftarTokoModal();
    loadForm();
    if (document.getElementById('userTableBody')) {
      loadUsersManagement();
    }
  });
}

// GENUINE .XLSX EXPORT ENGINE FOR ACCESSIBLE REQUESTS WITH ITEM DETAILS
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

// UTILITY DIALOGS & OVERLAYS
function showConfirm(msg, callback) {
  document.getElementById('confirmMessage').innerHTML = msg;
  confirmCallback = callback;
  document.getElementById('confirmOverlay').style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirmOverlay').style.display = 'none';
  confirmCallback = null;
}

function confirmYes() {
  if (typeof confirmCallback === 'function') {
    confirmCallback();
  }
  closeConfirm();
}

function showNotif(msg, type = 'info') {
  document.getElementById('popupNotifMessage').textContent = msg;
  document.getElementById('popupNotifTitle').textContent = type.toUpperCase();
  document.getElementById('popupNotif').style.display = 'flex';
}

function closePopup() {
  document.getElementById('popupNotif').style.display = 'none';
}

function showLoading(text) {
  const textEl = document.getElementById('loadingText');
  if (textEl) textEl.textContent = text || 'MEMPROSES...';
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function zoomFoto(src) {
  document.getElementById('viewerImage').src = src;
  document.getElementById('imageViewer').style.display = 'flex';
}

/* ======================================================
   UNIVERSAL DRAGGABLE FLOATING BUTTON ENGINE (HP TOUCH & MOUSE)
   ====================================================== */
function initDraggableElement(element, storageKey) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;

  el.classList.add('draggable-btn');

  // Restore saved position if exists
  const savedPos = localStorage.getItem(storageKey);
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
      let newTop = initialTop + deltaY;

      const maxX = window.innerWidth - (el.offsetWidth || 48);
      const maxY = window.innerHeight - (el.offsetHeight || 48);

      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

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
      localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top }));

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
  setTimeout(() => {
    initDraggableElement('helpButton', 'POS_HELP_BUTTON_V5');
    initDraggableElement(document.querySelector('.theme-toggle-btn'), 'POS_THEME_BUTTON_V5');
    initDraggableElement('notifBellBtn', 'POS_NOTIF_BELL_BUTTON_V5');
  }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  initAllDraggableButtons();
});
