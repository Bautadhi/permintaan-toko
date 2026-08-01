/* ======================================================
   PERMINTAAN BARANG TOKO - MASTER APPLICATION LOGIC
   100% FULL SUPABASE ONLINE REALTIME DATABASE ENGINE
   (BAGIAN 1 / 3)
====================================================== */

// 1. SUPABASE CLIENT & CREDENTIALS
const SUPABASE_URL = 'https://ducrykojvabaoioigbgc.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_H2w50rrXQWKqZM2fKZJXBw_sRsEpwNf';
const SUPABASE_SECRET_KEY = 'sb_secret_Azj8ILdL27v7R5BgUkkgHw_4CwqObZa';
const SUPABASE_JWKS_URL = 'https://ducrykojvabaoioigbgc.supabase.co/auth/v1/.well-known/jwks.json';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

// STORAGE KEYS FOR SESSION & CACHE
const SESSION_KEY = 'STORE_ACTIVE_SESSION_V8_SUPABASE';
const THEME_KEY = 'STORE_ACTIVE_THEME_V8_SUPABASE';
const FONTE_TOKEN_KEY = 'STORE_FONTE_TOKEN_KEY_V8';
const ADMIN_REMINDER_KEY = 'STORE_ADMIN_REMINDER_KEY_V8';
const ADMIN_REMINDER_TIME_KEY = 'STORE_ADMIN_REMINDER_TIME_KEY_V8';
const FEATURE_PHOTOS_KEY = 'STORE_FEATURE_PHOTOS_KEY_V8';
const PDF_MODEL_KEY = 'SELECTED_PDF_MODEL_V8';

// 2. GLOBAL STATE VARIABLES
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
let mobileBackspaceCount = 0;
let mobileBackspaceTimer = null;

// IN-MEMORY DATA CACHE (SUPABASE ONLINE SOURCE OF TRUTH)
let cacheRequests = [];
let cacheUsers = [];
let cacheStores = [];
let cacheChat = [];
let cacheChatRooms = [];
let cacheNotifications = [];
let cacheTTD = {};
let cacheLookup = {};

// CONSTANTS & MAPS
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

const AREA_MAP = {
  BDG: 'BANDUNG (BDG)',
  BDU: 'BANDUNG UTARA (BDU)',
  CRB: 'CIREBON (CRB)',
  SKB: 'SUKABUMI (SKB)',
  SBN: 'SUBANG (SBN)',
  TSM: 'TASIKMALAYA (TSM)'
};

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

// 3. DATE & CODE FORMATTER UTILITIES
function getFormattedDateDDMMYYYY(dObj = new Date()) {
  const day = String(dObj.getDate()).padStart(2, '0');
  const month = String(dObj.getMonth() + 1).padStart(2, '0');
  const year = dObj.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateDDMMYYYYString(input) {
  if (!input) return '-';
  const str = String(input).trim();
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str.split(' ')[0];
  const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return str;
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

// 4. SUPABASE KEEP-ALIVE & REALTIME PEMANCING ENGINE (ANTI-SLEEP)
function startSupabaseKeepAliveEngine() {
  if (!supabase) return;

  // Realtime Channel Listener (Menjaga Koneksi WebSocket Tetap Hidup)
  supabase.channel('supabase_realtime_pinger')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => pullCentralCloudDB())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => pullCentralCloudDB())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat' }, () => pullCentralCloudDB())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => pullCentralCloudDB())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => pullCentralCloudDB())
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') updateCloudStatusUI(true);
    });

  // Pemancing Otomatis (Ping Query setiap 2 Menit ke Database Supabase)
  setInterval(async () => {
    try {
      const { data, error } = await supabase.from('requests').select('noSurat').limit(1);
      if (!error) updateCloudStatusUI(true);
      else updateCloudStatusUI(false);
    } catch (err) {
      updateCloudStatusUI(false);
    }
  }, 120000);
}

// 5. DATA FETCHING & SYNCHRONIZATION FROM SUPABASE
async function pullCentralCloudDB() {
  if (!supabase) return;

  try {
    // 1. Fetch Requests
    const { data: reqsData } = await supabase.from('requests').select('*').order('createdAt', { ascending: false });
    if (reqsData) cacheRequests = reqsData;

    // 2. Fetch Users
    const { data: usersData } = await supabase.from('users').select('*');
    if (usersData) cacheUsers = usersData;

    // 3. Fetch Stores
    const { data: storesData } = await supabase.from('stores').select('*');
    if (storesData) cacheStores = storesData;

    // 4. Fetch Chat
    const { data: chatData } = await supabase.from('chat').select('*').order('created_at', { ascending: true });
    if (chatData) cacheChat = chatData;

    // 5. Fetch Notifications
    const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (notifData) cacheNotifications = notifData;

    // 6. Fetch Lookup Map & TTD
    const { data: lookupData } = await supabase.from('lookup').select('*');
    if (lookupData && lookupData.length > 0) {
      const mapObj = {};
      lookupData.forEach(item => { mapObj[item.code] = item.type; });
      cacheLookup = mapObj;
    }

    updateCloudStatusUI(true);

    if (currentUser) {
      loadDashboard();
      loadRiwayat();
      if (document.getElementById('userTableBody')) loadUsersManagement();
      if (document.getElementById('masterDbTableBody')) loadMasterDbTable();
    }
  } catch (err) {
    updateCloudStatusUI(false);
  }
}

async function pushCentralCloudDB() {
  // Integrasi Supabase secara otomatis menangani simpanan per tabel via insert/upsert
  updateCloudStatusUI(true);
}

function updateCloudStatusUI(isOnline) {
  const badge = document.getElementById('cloudStatusBadge');
  if (badge) {
    if (isOnline) {
      badge.style.background = 'rgba(16, 185, 129, 0.18)';
      badge.style.color = '#10b981';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      badge.innerHTML = `<span class="material-symbols-rounded" style="font-size: 15px;">wifi</span> ONLINE (SUPABASE)`;
    } else {
      badge.style.background = 'rgba(239, 68, 68, 0.18)';
      badge.style.color = '#ef4444';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      badge.innerHTML = `<span class="material-symbols-rounded" style="font-size: 15px;">wifi_off</span> OFFLINE`;
    }
  }
}

// 6. ACCESSORS FOR IN-MEMORY DATA
function getUsersFromDB() {
  if (!cacheUsers || cacheUsers.length === 0) {
    return [...SEED_USERS];
  }
  return cacheUsers;
}

function getRequestsFromDB() {
  return cacheRequests || [];
}

function getStoresFromDB() {
  const map = new Map();
  const userStores = getUsersFromDB().filter(u => u && u.category === 'TOKO').map(u => ({
    id: u.id,
    fullName: u.fullName || 'TOKO',
    area: u.area || '',
    storeCode: u.storeCode || generateStoreCode(u.fullName || '')
  }));

  userStores.forEach(s => {
    if (s && s.fullName) {
      const key = `${String(s.fullName).toUpperCase()}_${String(s.area || '').toUpperCase()}`;
      map.set(key, s);
    }
  });

  if (Array.isArray(cacheStores)) {
    cacheStores.forEach(s => {
      if (s && s.fullName) {
        const key = `${String(s.fullName).toUpperCase()}_${String(s.area || '').toUpperCase()}`;
        map.set(key, s);
      }
    });
  }
  return Array.from(map.values());
}

async function saveRequestsToDB(requests) {
  cacheRequests = requests;
  if (requests.length > 0 && supabase) {
    await supabase.from('requests').upsert(requests[0]);
  }
  loadDashboard();
  loadRiwayat();
}

async function saveUsersToDB(users) {
  cacheUsers = users;
  if (users.length > 0 && supabase) {
    await supabase.from('users').upsert(users[users.length - 1]);
  }
  if (currentUser) {
    loadDashboard();
    loadRiwayat();
    if (document.getElementById('userTableBody')) loadUsersManagement();
  }
}

// 7. INITIALIZATION & AUTHENTICATION
document.addEventListener('DOMContentLoaded', async () => {
  startSupabaseKeepAliveEngine();
  await pullCentralCloudDB();
  loadSavedTheme();
  autoLogin();
  initMobileBackButtonEngine();
  initPullToRefresh();
  updateAdminReminderUI();
});

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
  const iconSpans = document.querySelectorAll('.theme-toggle-btn span, .popupThemeToggleBtn span');
  const currentIcon = THEME_MODES[currentThemeIndex] ? THEME_MODES[currentThemeIndex].icon : 'palette';
  iconSpans.forEach(el => { if (el) el.textContent = currentIcon; });
}

function autoLogin() {
  const sess = sessionStorage.getItem(SESSION_KEY);
  if (sess) {
    currentUser = JSON.parse(sess);
    bukaMainApp();
  } else {
    pindahHalaman('loginPage');
  }
}

async function prosesLogin() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (!uEl || !pEl) return;

  const u = uEl.value.trim().toUpperCase();
  const p = pEl.value.trim();

  if (!u || !p) {
    showNotif('USERNAME DAN PASSWORD WAJIB DIISI!', 'warning');
    return;
  }

  showLoading('MEMERIKSA LOGIN SUPABASE...');

  let user = null;
  if (supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('username', u).eq('password', p);
    if (!error && data && data.length > 0) user = data[0];
  }

  if (!user && u === 'ADMIN' && p === '1') {
    user = SEED_USERS[0];
  }

  hideLoading();

  if (user) {
    currentUser = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    bukaMainApp();
  } else {
    showNotif('USERNAME ATAU PASSWORD SALAH!', 'error');
  }
}

function logout() {
  showConfirm('YAKIN INGIN KELUAR DARI APLIKASI?', () => {
    sessionStorage.removeItem(SESSION_KEY);
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
  updateNotifBellCounter();
  updateAdminReminderUI();
}

function showPage(pageId) {
  if (modeEdit && pageId !== 'inputPage') {
    showConfirm('KELUAR DARI MENU EDIT?', () => {
      bersihkanForm();
      closeAllPopups();
      pindahHalaman(pageId);
    });
    return;
  }
  closeAllPopups();
  pindahHalaman(pageId);
}

function pindahHalaman(pageId, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  updateBottomMenuHighlight(pageId);

  if (pushHistory && pageId !== 'loginPage') {
    try { history.pushState({ page: pageId }, '', location.href); } catch(e) {}
  }

  if (pageId === 'dashboardPage') loadDashboard();
  else if (pageId === 'inputPage') loadForm();
  else if (pageId === 'riwayatPage') loadRiwayat();
  else if (pageId === 'masterDbPage') loadMasterDbTable();
  else if (pageId === 'userManagementPage') {
    loadFonteToken();
    loadUsersManagement();
    updateActivePdfModelBadge();
  }
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
/* ======================================================
   PERMINTAAN BARANG TOKO - MASTER APPLICATION LOGIC
   100% FULL SUPABASE ONLINE REALTIME DATABASE ENGINE
   (BAGIAN 2 / 3)
====================================================== */

// 8. DATA ACCESS & PERMISSION CONTROL
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
    return requests.filter(r => r.userId === currentUser.id || r.toko.toUpperCase() === currentUser.fullName.toUpperCase() || r.area === currentUser.area);
  }

  return requests.filter(r => r.area === currentUser.area);
}

// 9. DASHBOARD ENGINE & METRIC CARDS
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
  if (titleEl) {
    titleEl.textContent = `PERMINTAAN [ ${dashboardFilterStatus} ] (KLIK BARIS UNTUK LIHAT DETAIL)`;
  }

  const lastDataContainer = document.getElementById('lastData');
  if (!lastDataContainer) return;
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

function bukaDetailDariDashboard(noSurat) {
  lihatDetail(noSurat, true);
}

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
    if (!serviceAppv) {
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

// 10. MULTI-ROW INPUT FORM ENGINE
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
    const allStores = getStoresFromDB();
    if (allStores.length > 0) {
      allStores.forEach(s => {
        tokoSelect.innerHTML += `<option value="${s.fullName}">${s.fullName} (${s.area})</option>`;
      });
    } else {
      tokoSelect.innerHTML = `<option value="TOKO SINAR ABADI">TOKO SINAR ABADI (BDG)</option>`;
    }
  } else {
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

function hapusRow(btn) {
  const row = btn.closest('.detailRow');
  if (row) row.remove();
  const container = document.getElementById('detailContainer');
  if (container.children.length === 0) tambahRow();
}

function lookupTypeRow(el, isFromScanner = false) {
  if (!el) return;
  const rawValue = String(el.value || '').trim().toUpperCase();
  el.value = rawValue;

  if (!rawValue || rawValue.length < 4) return;

  const first4Chars = rawValue.substring(0, 4);
  let matchedType = cacheLookup[first4Chars] || null;

  if (matchedType) {
    const row = el.closest('.detailRow');
    if (row) {
      const typeInput = row.querySelector('.typeBarang');
      if (typeInput) typeInput.value = matchedType;

      if (isFromScanner) {
        const namaInput = row.querySelector('.namaBarang');
        if (namaInput) {
          setTimeout(() => namaInput.focus(), 150);
        }
      }
    }
  }
}

// 11. CAMERA BARCODE / QR SCANNER ENGINE
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

            tutupScanner();

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
      }).catch(() => {
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
      if (namaInput) setTimeout(() => namaInput.focus(), 200);
    }
  }
  activeScanInput = null;
}

// 12. IMAGE COMPRESSION & PHOTO ATTACHMENT ENGINE
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
  document.getElementById('foto').click();
}

async function previewFoto(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  if (currentPhotos.length + files.length > 5) {
    showNotif('MAKSIMAL FOTO DIBATASI HINGGA 5 FOTO!', 'warning');
    return;
  }

  showLoading('MENGOMPRES FOTO...');
  for (let i = 0; i < files.length; i++) {
    if (currentPhotos.length < 5) {
      try {
        const compressed = await kompresiFoto(files[i], 720, 0.65);
        if (compressed) currentPhotos.push(compressed);
      } catch (err) {
        console.warn('Foto Error:', err);
      }
    }
  }
  hideLoading();

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
    div.onclick = () => zoomFoto(src);
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

  const catatanEl = document.getElementById('catatan');
  if (catatanEl) catatanEl.value = '';

  const btnSimpan = document.getElementById('btnSimpan');
  if (btnSimpan) btnSimpan.textContent = 'SIMPAN PERMINTAAN';

  const container = document.getElementById('detailContainer');
  if (container) container.innerHTML = '';

  tambahRow();
}

// 13. SAVE PERMINTAAN TO SUPABASE ONLINE
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
      () => prosesSimpanKeSupabase(toko, jenis, catatan, items)
    );
  } else {
    prosesSimpanKeSupabase(toko, jenis, catatan, items);
  }
}

async function prosesSimpanKeSupabase(toko, jenis, catatan, items) {
  showLoading('MENYIMPAN KE SUPABASE ONLINE...');
  
  const now = new Date();
  const codeYear = String(now.getFullYear()).slice(-2);
  const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
  const codeDay = String(now.getDate()).padStart(2, '0');

  const allStores = getStoresFromDB();
  const safeToko = String(toko || '').trim().toUpperCase();
  const matchedStore = allStores.find(s => s && s.fullName && String(s.fullName).trim().toUpperCase() === safeToko);
  let storeCode = matchedStore ? (matchedStore.storeCode || generateStoreCode(matchedStore.fullName)) : generateStoreCode(safeToko);

  const requests = getRequestsFromDB();
  const seqNo = String(requests.length + 1).padStart(2, '0');
  const noSurat = modeEdit ? editNoSurat : `PRMT/${currentUser.area}-${storeCode}/${codeYear}${codeMonth}${codeDay}${seqNo}`;

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
    createdAt: now.toISOString(),
    log: []
  };

  if (supabase) {
    const { error } = await supabase.from('requests').upsert(newRecord);
    hideLoading();

    if (!error) {
      showNotif(`PERMINTAAN #${noSurat} BERHASIL DISIMPAN KE SUPABASE!`, 'success');
      await pullCentralCloudDB();
      bersihkanForm();
      tambahNotifikasiSistem(['SERVICE'], currentUser.area, `PERMINTAAN BARU #${noSurat} DARI ${toko} (${currentUser.area}). MOHON SEGERA DIPERIKSA DI APLIKASI.`, noSurat);
      pindahHalaman('inputPage');
    } else {
      showNotif('GAGAL SIMPAN SUPABASE: ' + error.message, 'error');
    }
  }
}

// 14. AUTOMATED WHATSAPP NOTIFICATION ENGINE (FONTE / FONNTE API)
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
  if (input) input.value = getFonteToken();
}

function kirimNotifikasiWA(targetPhone, message) {
  const token = getFonteToken();
  if (!token || !targetPhone || targetPhone === '-') return;

  let cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
  if (!cleanPhone) return;
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  else if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

  const formData = new FormData();
  formData.append('target', cleanPhone);
  formData.append('message', message);
  formData.append('countryCode', '62');

  fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': token },
    body: formData
  }).catch(err => console.error('[FONTE WA API ERROR]:', err));
}

// 15. APPROVAL WORKFLOW ENGINE
async function approveService(noSurat) {
  showConfirm(`APPROVE PERMINTAAN #${noSurat}?`, async () => {
    showLoading('MEMPROSES APPROVAL SERVICE...');
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r.noSurat === noSurat);
    if (idx !== -1) {
      requests[idx].serviceApprove = true;
      requests[idx].serviceUserName = currentUser.fullName;

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'APPROVE_SERVICE',
        user: currentUser.fullName,
        notes: 'DISETUJUI SERVICE',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      if (supabase) {
        await supabase.from('requests').upsert(requests[idx]);
        await pullCentralCloudDB();
      }

      hideLoading();
      showNotif(`APPROVE SERVICE BERHASIL UNTUK #${noSurat}!`, 'info');
      tambahNotifikasiSistem(['DM'], 'ALL', `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI SERVICE (${currentUser.fullName}). MOHON APPROVAL DM.`, noSurat);
      loadRiwayat();
      loadDashboard();
    }
  });
}

async function approveDM(noSurat) {
  showConfirm(`APPROVE DM PUSAT UNTUK #${noSurat}?`, async () => {
    showLoading('MEMPROSES APPROVAL DM...');
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r.noSurat === noSurat);
    if (idx !== -1) {
      requests[idx].status = 'APPROVE';
      requests[idx].dmUserName = currentUser.fullName;

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'APPROVE_DM',
        user: currentUser.fullName,
        notes: 'DISETUJUI DM PUSAT',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      if (supabase) {
        await supabase.from('requests').upsert(requests[idx]);
        await pullCentralCloudDB();
      }

      hideLoading();
      showNotif(`APPROVE DM PUSAT BERHASIL UNTUK #${noSurat}!`, 'info');
      tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM PUSAT. SILAKAN DIPROSES.`, noSurat);
      loadRiwayat();
      loadDashboard();
    }
  });
}

// 16. POPUP DETAIL MODAL
function lihatDetail(noSurat, fromDashboard = false) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r.noSurat === noSurat);
  if (!req) return;

  document.getElementById('popupTitle').textContent = 'DETAIL PERMINTAAN';
  const msgBox = document.getElementById('popupMessage');

  let headerInfoHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-color); padding-bottom:10px; margin-bottom:14px; font-size:13px; color:var(--text-main);">
      <div style="text-align:left;">NO SURAT : <span style="color:var(--primary); font-weight:bold;">${req.noSurat}</span></div>
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
  `;

  document.getElementById('popupDetail').style.display = 'flex';
}

function closeDetail() {
  document.getElementById('popupDetail').style.display = 'none';
}
/* ======================================================
   PERMINTAAN BARANG TOKO - MASTER APPLICATION LOGIC
   100% FULL SUPABASE ONLINE REALTIME DATABASE ENGINE
   (BAGIAN 3 / 3 - FINAL)
====================================================== */

// 17. PDF TEMPLATE SELECTION & GENERATOR ENGINE (5 MODEL)
function getActivePdfModel() {
  return localStorage.getItem(PDF_MODEL_KEY) || 'MODEL_1';
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
  document.getElementById('popupPdfModelsModal').style.display = 'flex';
}

function tutupModalPdfModels() {
  document.getElementById('popupPdfModelsModal').style.display = 'none';
}

function switchPdfPreviewModel(modelId) {
  currentlyPreviewedModel = modelId;
  renderFullPdfPreviewDocument(currentlyPreviewedModel);
  updatePdfModelSelectorButtons();
}

function konfirmasiGunakanModelPdf() {
  localStorage.setItem(PDF_MODEL_KEY, currentlyPreviewedModel);
  updateActivePdfModelBadge();
  showNotif(`BERHASIL MENYIMPAN & MENGAKTIFKAN TEMPLATE PDF ${currentlyPreviewedModel.replace('_', ' ')}!`, 'success');
  tutupModalPdfModels();
}

function updatePdfModelSelectorButtons() {
  PDF_MODELS_DATA.forEach(m => {
    const btn = document.getElementById(`btnPdf${m.id.replace('_', '')}`);
    if (btn) {
      if (m.id === currentlyPreviewedModel) {
        btn.style.background = m.color === '#0f172a' ? '#0f172a' : (m.color || '#7c3aed');
        btn.style.color = m.id === 'MODEL_3' ? '#fbbf24' : '#ffffff';
        btn.style.border = '2px solid #ffffff';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        btn.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; font-size:16px;">check_circle</span> ${m.title.split(':')[0]}`;
      } else {
        btn.style.background = 'var(--bg-header)';
        btn.style.color = 'var(--text-main)';
        btn.style.border = '1px solid var(--border-color)';
        btn.style.boxShadow = 'none';
        btn.innerHTML = `${m.title.split(':')[0]}`;
      }
    }
  });
}

function renderFullPdfPreviewDocument(modelId) {
  const container = document.getElementById('pdfModelFullPreviewArea');
  if (!container) return;

  const m = PDF_MODELS_DATA.find(x => x.id === modelId) || PDF_MODELS_DATA[0];
  let tableHeaderBg = m.color || '#0284c7';

  container.innerHTML = `
    <div style="background: #ffffff; color: #0f172a; width: 100%; max-width: 720px; margin: 0 auto; padding: 24px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-family: Arial, sans-serif; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; margin-bottom: 16px;">
        <span style="font-size: 12px; font-weight: 800; color: ${m.color};">
          <span class="material-symbols-rounded" style="vertical-align: middle; font-size: 16px;">style</span> ${m.title}
        </span>
        <span style="font-size: 11px; color: #64748b; font-weight: 600;">${m.desc}</span>
      </div>
      <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 14px; color: #0f172a; text-transform: uppercase;">
        PERMINTAAN TOKO
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px;">
        <div><b>NO SURAT:</b> <span style="color:${m.color}; font-weight:800;">PRM/2026/001</span></div>
        <div><b>TOKO:</b> TOKO UTAMA BANDUNG</div>
        <div><b>TANGGAL:</b> 01/08/2026</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px;">
        <thead>
          <tr style="background: ${tableHeaderBg}; color: #ffffff;">
            <th style="padding: 8px; border: 1px solid #cbd5e1;">NO</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">TIPE</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">SERI</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">PERMINTAAN</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">QTY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">1</td>
            <td style="padding:8px; border:1px solid #cbd5e1;">AC DANGIN 2 PK</td>
            <td style="padding:8px; border:1px solid #cbd5e1;">SN-889920112</td>
            <td style="padding:8px; border:1px solid #cbd5e1;">UNIT INDOOR AC 2PK</td>
            <td style="text-align:center; padding:8px; border:1px solid #cbd5e1; font-weight:bold;">1</td>
          </tr>
        </tbody>
      </table>
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
  const modelObj = PDF_MODELS_DATA.find(x => x.id === activeModel) || PDF_MODELS_DATA[0];

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

  pdfContainer.innerHTML = `
    <div class="pdf-paper" style="min-height: 680px; display: flex; flex-direction: column; justify-content: space-between; padding: 22px; color: #0f172a; background: #ffffff; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
      <div>
        <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase;">
          PERMINTAAN TOKO
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; border: 1px solid #cbd5e1; background: #f8fafc;">
          <tr>
            <td style="padding: 7px 10px; font-weight: bold;">NO SURAT</td>
            <td style="padding: 7px 10px; font-weight: 700; color: #0284c7;">${req.noSurat}</td>
            <td style="padding: 7px 10px; font-weight: bold;">TANGGAL</td>
            <td style="padding: 7px 10px;">${formatDateDDMMYYYYString(req.tanggal)}</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; font-weight: bold;">TOKO</td>
            <td style="padding: 7px 10px; font-weight: 700;">${req.toko}</td>
            <td style="padding: 7px 10px; font-weight: bold;">JENIS</td>
            <td style="padding: 7px 10px; font-weight: 700; color: #16a34a;">${req.jenis || 'DEFAULT'}</td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: ${modelObj.color}; color: #ffffff;">
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">NO</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">TIPE BARANG</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">NO. SERI</th>
              ${req.jenis === 'DUS' ? '<th style="padding:6px 8px; border:1px solid #cbd5e1;">NO. SERI DUS</th>' : ''}
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">PERMINTAAN</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">ALASAN</th>
              <th style="padding:6px 8px; border:1px solid #cbd5e1;">QTY</th>
            </tr>
          </thead>
          <tbody>${itemRowsHtml}</tbody>
        </table>
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

// 18. DIGITAL SIGNATURE (TTD) CANVAS ENGINE
function bukaTTD() {
  if (currentUser.category !== 'SERVICE' && currentUser.category !== 'DM') {
    showNotif('TANDA TANGAN DIGITAL KHUSUS UNTUK SERVICE & DM!', 'warning');
    return;
  }
  document.getElementById('popupTTD').classList.add('show');
  setTimeout(() => initCanvasTTD(), 100);
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
    cacheTTD[currentUser.fullName] = png;
    showNotif('TANDA TANGAN DIGITAL BERHASIL DISIMPAN!', 'info');
    tutupTTD();
  });
}

// 19. LIVE CHAT ENGINE (SUB-SECOND SUPABASE REALTIME CHAT)
function bukaBantuan() {
  if (currentUser) {
    isAdminChat = (currentUser.category === 'ADMIN' || currentUser.category === 'SERVICE' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  }
  const popup = document.getElementById('popupBantuan');
  if (popup) {
    popup.style.display = 'block';
    popup.classList.add('show');
  }

  if (isAdminChat) {
    loadDaftarChatAdmin();
  } else {
    loadChatUser();
  }
}

function tutupBantuan() {
  const popup = document.getElementById('popupBantuan');
  if (popup) {
    popup.style.display = 'none';
    popup.classList.remove('show');
  }
}

function loadChatUser() {
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '';

  const userChats = cacheChat.filter(c => c.user === currentUser.username);
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
      <div class="chatTime">${formatDateDDMMYYYYString(c.created_at)}</div>
    `;
    body.appendChild(div);
  });
  body.scrollTop = body.scrollHeight;
}

async function kirimPesanChat() {
  const txt = document.getElementById('chatPesan');
  if (!txt || !txt.value.trim()) return;

  const pesan = txt.value.trim().toUpperCase();
  const newChat = {
    room: 'ROOM_' + currentUser.username,
    user: currentUser.username,
    pengirim: isAdminChat ? 'ADMIN' : 'USER',
    pesan,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    await supabase.from('chat').insert([newChat]);
    await pullCentralCloudDB();
  }

  txt.value = '';
  if (isAdminChat) loadChatAdmin(currentRoom);
  else loadChatUser();
}

function loadDaftarChatAdmin() {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;
  chatList.innerHTML = '';

  const uniqueUsers = Array.from(new Set(cacheChat.map(c => c.user)));
  if (uniqueUsers.length === 0) {
    chatList.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">BELUM ADA PESAN MASUK.</div>`;
    return;
  }

  uniqueUsers.forEach(u => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:12px; border-bottom:1px solid var(--border-color); cursor:pointer;';
    item.innerHTML = `<div style="font-size:13px; font-weight:bold;">${u}</div>`;
    item.onclick = () => bukaRoomAdmin('ROOM_' + u, u);
    chatList.appendChild(item);
  });
}

function bukaRoomAdmin(room, user) {
  currentRoom = room;
  currentChatUser = user;
  document.getElementById('chatList').style.display = 'none';
  document.getElementById('chatBody').style.display = 'block';
  document.getElementById('chatFooter').style.display = 'flex';
  loadChatAdmin(room);
}

function loadChatAdmin(room) {
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '';

  const roomChats = cacheChat.filter(c => c.room === room);
  roomChats.forEach(c => {
    const isSelf = (c.pengirim === 'ADMIN');
    const div = document.createElement('div');
    div.className = isSelf ? 'chatUser' : 'chatAdmin';
    div.innerHTML = `
      <div class="chatText">${c.pesan}</div>
      <div class="chatTime">${formatDateDDMMYYYYString(c.created_at)}</div>
    `;
    body.appendChild(div);
  });
  body.scrollTop = body.scrollHeight;
}

// 20. EXCEL (.XLSX SHEETJS) EXPORT ENGINE
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
    rows.push(['NO SURAT', 'TANGGAL', 'TOKO', 'AREA', 'JENIS', 'STATUS', 'TIPE', 'SERI', 'PERMINTAAN', 'ALASAN', 'QTY']);

    data.forEach(r => {
      r.items.forEach(item => {
        rows.push([
          r.noSurat, r.tanggal, r.toko, r.area, r.jenis, r.status,
          item.type, item.seri, item.barang, item.alasan, item.qty
        ]);
      });
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Permintaan");
      XLSX.writeFile(wb, `PERMINTAAN_TOKO_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotif('FILE EXCEL BERHASIL DI-DOWNLOAD!', 'info');
    } else {
      showNotif('MODUL EXCEL BELUM SIAP!', 'warning');
    }
  }, 400);
}

// 21. UNIVERSAL DRAGGABLE FLOATING BUTTON ENGINE
function initDraggableElement(element, storageKey) {
  const el = typeof element === 'string' ? document.getElementById(element) : element;
  if (!el) return;

  el.classList.add('draggable-btn');
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0, isDragging = false;

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

    if (!isDragging && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      isDragging = true;
    }

    if (isDragging) {
      if (e.cancelable) e.preventDefault();
      let newLeft = Math.max(0, Math.min(initialLeft + deltaX, window.innerWidth - 48));
      let newTop = Math.max(0, Math.min(initialTop + deltaY, window.innerHeight - 48));

      el.style.position = 'fixed';
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }
  }

  function onPointerUp() {
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
  }

  el.addEventListener('mousedown', onPointerDown);
  el.addEventListener('touchstart', onPointerDown, { passive: true });
}

function initAllDraggableButtons() {
  setTimeout(() => {
    initDraggableElement('helpButton', 'POS_HELP_BUTTON_V8');
    initDraggableElement(document.querySelector('.theme-toggle-btn'), 'POS_THEME_BUTTON_V8');
    initDraggableElement('notifBellBtn', 'POS_NOTIF_BELL_BUTTON_V8');
  }, 100);
}

// 22. NOTIFICATION BELL COUNTER & SYSTEM SYSTEM NOTIF
function tambahNotifikasiSistem(targetRoles, targetArea, message, noSurat = '') {
  const newNotif = {
    id: `NTF-${Date.now()}`,
    targetRoles: Array.isArray(targetRoles) ? targetRoles : [targetRoles],
    targetArea: targetArea || 'ALL',
    message: message,
    noSurat: noSurat,
    created_at: new Date().toISOString()
  };
  cacheNotifications.unshift(newNotif);
  if (supabase) supabase.from('notifications').insert([newNotif]);
  updateNotifBellCounter();
}

function updateNotifBellCounter() {
  const badgeEl = document.getElementById('notifBellBadge');
  if (!badgeEl) return;

  const count = cacheNotifications.length;
  if (count > 0) {
    badgeEl.textContent = count > 99 ? '99+' : count;
    badgeEl.style.display = 'flex';
  } else {
    badgeEl.style.display = 'none';
  }
}

// 23. USER MANAGEMENT & PROFILE MODALS
function loadUsersManagement() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = getUsersFromDB();
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.password}</td>
      <td>${u.fullName}</td>
      <td>${u.storeCode || '-'}</td>
      <td>${u.phone || '-'}</td>
      <td>${u.category}</td>
      <td>${u.area}</td>
      <td>
        <button class="btnIcon btnDelete" onclick="hapusUser('${u.id}')"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function hapusUser(userId) {
  showConfirm('HAPUS USER INI DARI SUPABASE?', async () => {
    if (supabase) {
      await supabase.from('users').delete().eq('id', userId);
      await pullCentralCloudDB();
    }
  });
}

function bukaAkun() {
  if (!currentUser) return;
  document.getElementById('akunNama').value = currentUser.fullName;
  document.getElementById('akunHP').value = currentUser.phone || '-';
  document.getElementById('akunArea').value = currentUser.area;
  document.getElementById('akunKategori').value = currentUser.category;
  document.getElementById('popupAkun').classList.add('show');
}

function tutupAkun() {
  document.getElementById('popupAkun').classList.remove('show');
}

// 24. OVERLAY & DIALOG HELPERS
function closeAllPopups() {
  const overlays = document.querySelectorAll('.popupOverlay, #rejectOverlay, #confirmOverlay, #pdfModal, #popupDetail, #popupAkun, #popupTTD, #popupBantuan, #popupNotifList');
  overlays.forEach(el => {
    if (el) {
      el.style.display = 'none';
      el.classList.remove('show');
    }
  });
}

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
  const cb = confirmCallback;
  confirmCallback = null;
  closeConfirm();
  closeAllPopups();
  if (typeof cb === 'function') cb();
}

function showNotif(msg, type = 'info') {
  const notifOverlay = document.getElementById('popupNotif');
  const notifMessage = document.getElementById('popupNotifMessage');
  if (!notifOverlay) return;
  if (notifMessage) notifMessage.textContent = msg || 'INFORMASI SISTEM';
  notifOverlay.style.display = 'flex';
}

function closePopup() {
  const notifOverlay = document.getElementById('popupNotif');
  if (notifOverlay) notifOverlay.style.display = 'none';
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

function initPullToRefresh() {}
function initMobileBackButtonEngine() {}
function updateAdminReminderUI() {}
function updatePhotoSectionVisibility() {}
function bukaMenuRiwayat() { showPage('riwayatPage'); }
function bukaNotificationModal() {}
function tutupNotificationModal() {}
async function simpanUserData() {
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

  showLoading('MEMERIKSA DATABASE SUPABASE...');

  // 1. JIKA EDIT USER LAMA
  if (editId) {
    const userEditObj = {
      id: editId,
      username,
      password,
      fullName,
      storeCode,
      phone,
      category,
      area
    };

    if (supabase) {
      const { error } = await supabase.from('users').upsert(userEditObj);
      hideLoading();
      if (!error) {
        showNotif(`USER ${username} BERHASIL DIPERBARUI!`, 'info');
        await pullCentralCloudDB();
        tutupUserModal();
        loadUsersManagement();
      } else {
        showNotif('GAGAL UPDATE USER: ' + error.message, 'error');
      }
    }
    return;
  }

  // 2. JIKA TAMBAH USER BARU: CEK LANGSUNG KE DATABASE SUPABASE ONLINE
  if (supabase) {
    const { data: existingUsers, error: checkErr } = await supabase
      .from('users')
      .select('username')
      .eq('username', username);

    if (!checkErr && existingUsers && existingUsers.length > 0) {
      hideLoading();
      showNotif(`USERNAME '${username}' SUDAH TERDAFTAR DI DATABASE SUPABASE! GUNAKAN USERNAME LAIN.`, 'error');
      return;
    }
  }

  // 3. SIMPAN USER BARU KE SUPABASE
  const newUser = {
    id: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    username,
    password,
    fullName,
    storeCode,
    phone,
    category,
    area,
    createdAt: getFormattedDateDDMMYYYY()
  };

  if (supabase) {
    const { error: insertErr } = await supabase.from('users').insert([newUser]);
    hideLoading();

    if (!insertErr) {
      showNotif(`USER ${fullName} (${username}) BERHASIL DISIMPAN!`, 'success');
      await pullCentralCloudDB();
      tutupUserModal();
      loadUsersManagement();
    } else {
      showNotif('GAGAL MENAMBAH USER: ' + insertErr.message, 'error');
    }
  }
}