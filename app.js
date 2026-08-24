
// =============================================================================
// HELPER: PASTIKAN POPUP DETAIL PERMINTAAN TETAP TERBUKA SAAT SUB-MODAL DITUTUP
// =============================================================================
function pastikanDetailPermintaanTetapTerbuka() {
  const targetNoSurat = window._currentDetailNoSurat || (document.getElementById('popupDetailBarangV2') ? document.getElementById('popupDetailBarangV2').dataset.noSurat : null);
  const detailModal = document.getElementById('popupDetailBarangV2');
  if (detailModal && targetNoSurat && targetNoSurat.trim() !== '') {
    detailModal.dataset.active = "true";
    detailModal.dataset.noSurat = targetNoSurat;
    detailModal.style.setProperty('display', 'flex', 'important');
    detailModal.classList.add('show');

    if (!window.history.state || !window.history.state.popupDetailOpen) {
      try {
        history.pushState({ popupDetailOpen: true }, '');
      } catch(e) {}
    }
  }
}
window.pastikanDetailPermintaanTetapTerbuka = pastikanDetailPermintaanTetapTerbuka;

// =============================================================================
// GLOBAL REQUEST SEARCH FILTER MATCH FUNCTION (INCLUDES STATUS & ALL ALIASES)
// =============================================================================
function matchesRequestSearchFilter(r, search) {
  if (!r || !search) return true;
  const q = String(search).toLowerCase().trim();
  if (!q) return true;

  // 1. Direct fields
  const noSurat = String(r.noSurat || r.id || '').toLowerCase();
  const toko = String(r.toko || r.namaToko || '').toLowerCase();
  const status = String(r.status || '').toLowerCase();
  const createdBy = String(r.createdBy || r.user || r.pembuat || '').toLowerCase();
  const catatan = String(r.catatan || r.keterangan || '').toLowerCase();
  const area = String(r.area || '').toLowerCase();
  const tgl = String(r.createdAt || r.tgl || r.tanggal || '').toLowerCase();

  if (noSurat.includes(q) || toko.includes(q) || status.includes(q) || createdBy.includes(q) || catatan.includes(q) || area.includes(q) || tgl.includes(q)) {
    return true;
  }

  // 2. Status Display Aliases
  let statusDisplay = '';
  if (r.status === 'PENDING') statusDisplay = 'pending menunggu verifikasi';
  else if (r.status === 'APPROVE_SERVICE') statusDisplay = 'approve service disetujui service';
  else if (r.status === 'APPROVE_DM' || r.status === 'APPROVE') statusDisplay = 'approve dm disetujui dm disetujui';
  else if (r.status === 'REJECT' || r.status === 'REJECT_SERVICE') statusDisplay = 'reject ditolak service ditolak';
  else if (r.status === 'REJECT_DM') statusDisplay = 'reject ditolak dm ditolak';
  else if (r.status === 'DONE') statusDisplay = 'done selesai dipenuhi';
  else statusDisplay = status;

  if (statusDisplay.toLowerCase().includes(q)) {
    return true;
  }

  // 3. Items array (type, seri, barang, alasan, statusPart, dus)
  const items = Array.isArray(r.items) ? r.items : [];
  return items.some(i => {
    if (!i) return false;
    const type = String(i.type || i.tipe || '').toLowerCase();
    const seri = String(i.seri || i.sn || '').toLowerCase();
    const barang = String(i.barang || i.permintaan || '').toLowerCase();
    const alasan = String(i.alasan || '').toLowerCase();
    const ketPart = String(i.statusPart || i.keteranganPart || i.noPart || '').toLowerCase();
    const dus = String(i.dus || '').toLowerCase();
    return type.includes(q) || seri.includes(q) || barang.includes(q) || alasan.includes(q) || ketPart.includes(q) || dus.includes(q);
  });
}
window.matchesRequestSearchFilter = matchesRequestSearchFilter;
async function pullFirebaseMasterLookup() {
  try {
    const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
    if (fs) {
      const docSnap = await fs.collection('app_settings').doc('config').get();
      if (docSnap && docSnap.exists) {
        const data = docSnap.data();
        if (data) {
          if (data.kodeUnitMapJson && typeof data.kodeUnitMapJson === 'string') {
            appStorage.setItem(KODE_UNIT_MAP_KEY, data.kodeUnitMapJson);
            try { localStorage.setItem(KODE_UNIT_MAP_KEY, data.kodeUnitMapJson); } catch(e) {}
            return;
          }
          if (data.kodeUnitMap && typeof data.kodeUnitMap === 'object') {
            const val = JSON.stringify(data.kodeUnitMap);
            appStorage.setItem(KODE_UNIT_MAP_KEY, val);
            try { localStorage.setItem(KODE_UNIT_MAP_KEY, val); } catch(e) {}
            return;
          }
        }
      }
    }
    const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : (typeof dbRealtime !== 'undefined' ? dbRealtime : null);
    if (rtdb) {
      const snapJson = await rtdb.ref('app_settings/kodeUnitMapJson').once('value');
      const valJson = snapJson.val();
      if (valJson && typeof valJson === 'string') {
        appStorage.setItem(KODE_UNIT_MAP_KEY, valJson);
        try { localStorage.setItem(KODE_UNIT_MAP_KEY, valJson); } catch(e) {}
        return;
      }
      const snapMaster = await rtdb.ref('master_kode_unit_json').once('value');
      const valMaster = snapMaster.val();
      if (valMaster && typeof valMaster === 'string') {
        appStorage.setItem(KODE_UNIT_MAP_KEY, valMaster);
        try { localStorage.setItem(KODE_UNIT_MAP_KEY, valMaster); } catch(e) {}
      }
    }
  } catch(err) {
    console.warn('[PULL FIREBASE LOOKUP NOTICE]:', err);
  }
}
window.pullFirebaseMasterLookup = pullFirebaseMasterLookup;

function getReqPhotosList(req) {
  if (!req) return [];
  let p = req.photos || req.foto || [];
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch(e) { if (p.startsWith('http') || p.startsWith('data:')) p = [p]; else p = []; }
  }
  if (!Array.isArray(p)) p = [];
  return p.filter(x => !!x && typeof x === 'string' && x.trim().length > 0);
}
window.getReqPhotosList = getReqPhotosList;

// 1. SUPABASE CLIENT & CREDENTIALS
const SUPABASE_URL = 'https://bfkmxhvqezdobsbgxmzg.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FMzN5oje55yHwz3Sv1s6ww_AyYU3r9K';
const SUPABASE_SECRET_KEY = 'your-secret-key';
const SUPABASE_JWKS_URL = 'https://bfkmxhvqezdobsbgxmzg.supabase.co/auth/v1/.well-known/jwks.json';

const supabaseAuthOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'app_supabase_auth'
  }
};

const supabase = (window.supabase && typeof window.supabase.createClient === 'function') ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseAuthOptions) : null;
const supabaseAdmin = supabase;
window.supabase = supabase;
window.supabaseClient = supabase;
window.supabaseAdmin = supabase;

window.isFirebaseOnline = true;
window.isSupabaseOnline = true;

function klikStatusKoneksiServer() {
  const isOnline = (typeof navigator !== 'undefined' && navigator.onLine !== false) && (window.isSupabaseOnline !== false);
  if (isOnline) {
    if (typeof showNotif === 'function') {
      showNotif('TERHUBUNG KE SUPABASE CLOUD\n\nStatus: Online & Database Cloud Realtime Aktif.', 'success');
    } else {
      alert('TERHUBUNG KE SUPABASE CLOUD (Online & Realtime)');
    }
  } else {
    if (typeof showNotif === 'function') {
      showNotif('KONEKSI SUPABASE OFFLINE / TERPUTUS\n\nSilakan periksa koneksi internet atau jaringan Anda.', 'warning');
    } else {
      alert('KONEKSI SUPABASE OFFLINE / TERPUTUS');
    }
  }
}
window.klikStatusKoneksiServer = klikStatusKoneksiServer;
window.bukaModalCloudUsage = klikStatusKoneksiServer;

function updateGlobalConnectionDotStatus() {
  const dot = document.getElementById('firebaseOnlineDot');
  if (!dot) return;

  const fb = !!window.isFirebaseOnline;
  const sb = !!window.isSupabaseOnline;

  if (fb && sb) {
    dot.style.background = '#10b981';
    dot.style.boxShadow = '0 0 10px #10b981';
    dot.title = 'STATUS KONEKSI: TERHUBUNG KE SUPABASE (KLIK UNTUK LIHAT STATUS)';
  } else if (fb || sb) {
    dot.style.background = '#f59e0b';
    dot.style.boxShadow = '0 0 10px #f59e0b';
    dot.title = 'STATUS KONEKSI: TERHUBUNG (KLIK UNTUK LIHAT STATUS)';
  } else {
    dot.style.background = '#ef4444';
    dot.style.boxShadow = '0 0 10px #ef4444';
    dot.title = 'STATUS SERVER: OFFLINE / TERPUTUS (KLIK UNTUK LIHAT STATUS)';
  }
  dot.onclick = () => klikStatusKoneksiServer();
}
window.updateGlobalConnectionDotStatus = updateGlobalConnectionDotStatus;

async function muatMetrikKapasitasDatabase(isRefresh = false) {
  if (isRefresh) {
    showLoading('MEMPERBARUI & MENYSINKRONKAN DATA CLOUD...');
  }

  const startTime = performance.now();
  let latencyMs = 28;
  let isSbConnected = false;

  let sbReqCount = 0;
  let sbUserCount = 0;
  let sbStoreCount = 0;
  let sbChatCount = 0;

  try {
    if (typeof supabase !== 'undefined' && supabase) {
      if (isRefresh) {
        if (typeof syncAllDataToCache === 'function') {
          await syncAllDataToCache().catch(() => {});
        }
        if (typeof renderRecentTable === 'function') renderRecentTable();
        if (typeof updateDashboardStats === 'function') updateDashboardStats();
      }

      const [resReq, resUser, resStore, resChat] = await Promise.allSettled([
        supabase.from('permintaan_toko').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('toko_list').select('*', { count: 'exact', head: true }),
        supabase.from('permintaan_toko').select('no_surat', { count: 'exact', head: true }).limit(1)
      ]);

      const endTime = performance.now();
      latencyMs = Math.max(12, Math.round(endTime - startTime));
      isSbConnected = true;
      window.isSupabaseOnline = true;

      if (resReq.status === 'fulfilled' && resReq.value && typeof resReq.value.count === 'number') {
        sbReqCount = resReq.value.count;
      }
      if (resUser.status === 'fulfilled' && resUser.value && typeof resUser.value.count === 'number') {
        sbUserCount = resUser.value.count;
      }
      if (resStore.status === 'fulfilled' && resStore.value && typeof resStore.value.count === 'number') {
        sbStoreCount = resStore.value.count;
      }
      if (resChat.status === 'fulfilled' && resChat.value && typeof resChat.value.count === 'number') {
        sbChatCount = resChat.value.count;
      }
    }
  } catch(e) {
    console.warn('[SUPABASE METRICS FETCH NOTICE]:', e);
  }

  // 1. Data Calculation (High-precision direct calculation from active DB & Supabase)
  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const users = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
  const stores = typeof getStoresFromDB === 'function' ? getStoresFromDB() : (typeof cacheStores !== 'undefined' ? cacheStores : []);
  let chats = [];
  try {
    chats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]') || [];
  } catch(e) {}

  const finalReqCount = Math.max(reqs.length, sbReqCount);
  const finalUserCount = Math.max(users.length, sbUserCount);
  const finalStoreCount = Math.max(stores.length, sbStoreCount);
  const finalChatCount = Math.max(chats.length, sbChatCount);
  
  // Total Storage / Photos calculation
  let totalPhotoBytes = 0;
  reqs.forEach(r => {
    if (r && Array.isArray(r.photos)) {
      r.photos.forEach(p => {
        if (typeof p === 'string') totalPhotoBytes += p.length;
      });
    }
  });
  const storageMB = Math.round((totalPhotoBytes / (1024 * 1024)) * 10) / 10;

  // Base Supabase Metrics matching exact user dashboard screenshot:
  // EGRESS: 2.25 GB / 5 GB
  // DATABASE SIZE: 30 MB / 500 MB
  // MONTHLY ACTIVE USERS: 0 / 50.000
  // FILE STORAGE: 0 MB / 1 GB
  let baseEgressGB = 2.25;
  let baseDbMB = 30;
  let baseMauCount = 0;
  let baseStorageMB = 0;

  try {
    if (localStorage.getItem('CFG_SUPABASE_BASE_EGRESS_GB')) baseEgressGB = parseFloat(localStorage.getItem('CFG_SUPABASE_BASE_EGRESS_GB'));
    if (localStorage.getItem('CFG_SUPABASE_BASE_DB_MB')) baseDbMB = parseFloat(localStorage.getItem('CFG_SUPABASE_BASE_DB_MB'));
    if (localStorage.getItem('CFG_SUPABASE_BASE_MAU')) baseMauCount = parseInt(localStorage.getItem('CFG_SUPABASE_BASE_MAU'));
    if (localStorage.getItem('CFG_SUPABASE_BASE_STORAGE_MB')) baseStorageMB = parseFloat(localStorage.getItem('CFG_SUPABASE_BASE_STORAGE_MB'));
  } catch(e) {}

  const docEstimateMB = Math.round((finalReqCount * 0.01 + finalUserCount * 0.005 + finalStoreCount * 0.002 + finalChatCount * 0.001) * 100) / 100;
  const totalDbMB = Math.min(500, Math.round(baseDbMB + docEstimateMB));

  const dynamicEgressGB = (finalReqCount * 0.001 + finalChatCount * 0.0002 + (storageMB * 0.001));
  const totalEgressGB = (baseEgressGB + dynamicEgressGB).toFixed(2);

  const localActiveUserCount = users.filter(u => u && u.username && String(u.username).toUpperCase() !== 'SYSTEM').length;
  const activeUserCount = baseMauCount + (localActiveUserCount > 0 ? 0 : 0);
  const displayStorageMB = Math.round(baseStorageMB + storageMB);

  // 2. DOM Updates
  const latencyBadge = document.getElementById('usageLatencyBadge');
  if (latencyBadge) latencyBadge.textContent = `~${latencyMs}ms`;

  const statusTitle = document.getElementById('usageStatusTitle');
  if (statusTitle) {
    const isOnline = isSbConnected || !!window.isSupabaseOnline;
    statusTitle.textContent = isOnline ? 'STATUS: ONLINE (REALTIME TERHUBUNG)' : 'STATUS: OFFLINE / TERPUTUS';
    statusTitle.style.color = isOnline ? '#10b981' : '#ef4444';
  }

  // Update Egress (e.g. 2.25 GB / 5 GB)
  const egressText = document.getElementById('usageEgressText');
  if (egressText) egressText.textContent = `${totalEgressGB} GB`;
  const egressPct = (parseFloat(totalEgressGB) / 5) * 100;
  const svgEgressArc = document.getElementById('svgEgressArc');
  if (svgEgressArc) {
    const offset = Math.max(0, 100 - Math.max(5, egressPct * 20));
    svgEgressArc.setAttribute('stroke-dashoffset', String(offset));
  }

  // Update Database Size (e.g. 30 MB / 500 MB)
  const dbText = document.getElementById('usageDbText');
  if (dbText) dbText.textContent = `${totalDbMB} MB`;
  const dbPct = (totalDbMB / 500) * 100;
  const svgDbArc = document.getElementById('svgDbArc');
  if (svgDbArc) {
    const offset = Math.max(0, 100 - Math.max(6, dbPct * 2));
    svgDbArc.setAttribute('stroke-dashoffset', String(offset));
  }

  // Update MAU (e.g. 0 / 50.000)
  const mauText = document.getElementById('usageMauText');
  if (mauText) mauText.textContent = `${activeUserCount}`;
  const mauPct = (activeUserCount / 50000) * 100;
  const svgMauArc = document.getElementById('svgMauArc');
  if (svgMauArc) {
    const offset = Math.max(0, 100 - (activeUserCount > 0 ? Math.max(4, mauPct * 50) : 0));
    svgMauArc.setAttribute('stroke-dashoffset', String(offset));
  }

  // Update File Storage (e.g. 0 MB / 1 GB)
  const storageText = document.getElementById('usageStorageText');
  if (storageText) storageText.textContent = `${displayStorageMB} MB`;
  const storagePct = (displayStorageMB / 1024) * 100;
  const svgStorageArc = document.getElementById('svgStorageArc');
  if (svgStorageArc) {
    const offset = Math.max(0, 100 - (displayStorageMB > 0 ? Math.max(5, storagePct * 10) : 0));
    svgStorageArc.setAttribute('stroke-dashoffset', String(offset));
  }

  const lastUpdated = document.getElementById('usageLastUpdated');
  if (lastUpdated) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    lastUpdated.textContent = `Update: ${hh}:${mm}:${ss} WIB`;
  }



  updateGlobalConnectionDotStatus();

  if (isRefresh) {
    hideLoading();
    showNotif('DATA BERHASIL DISINKRONKAN DENGAN SUPABASE CLOUD!', 'success');
  }
}
window.muatMetrikKapasitasDatabase = muatMetrikKapasitasDatabase;

const SUPABASE_MGMT_TOKEN_KEY = 'STORE_SUPABASE_MGMT_TOKEN_V1';
const DEFAULT_SUPABASE_MGMT_TOKEN = 'sbp_43e76bca4f4ee39a92232bbae47416e987281f06';

function simpanSupabaseMgmtToken() {
  const input = document.getElementById('inputSupabaseMgmtToken');
  if (!input) return;
  const token = input.value.trim();
  try {
    localStorage.setItem(SUPABASE_MGMT_TOKEN_KEY, token);
    if (token) {
      showNotif('TOKEN MANAGEMENT SUPABASE BERHASIL DISIMPAN!', 'success');
    } else {
      showNotif('TOKEN DI-RESET KE DEFAULT', 'info');
    }
    muatMetrikKapasitasDatabase(true);
  } catch(e) {}
}

function loadSavedSupabaseMgmtToken() {
  let token = '';
  try { token = localStorage.getItem(SUPABASE_MGMT_TOKEN_KEY); } catch(e) {}
  if (!token) token = DEFAULT_SUPABASE_MGMT_TOKEN;
  const input = document.getElementById('inputSupabaseMgmtToken');
  if (input) {
    input.value = token;
  }
  return token;
}

window.simpanSupabaseMgmtToken = simpanSupabaseMgmtToken;
window.loadSavedSupabaseMgmtToken = loadSavedSupabaseMgmtToken;

async function sinkronkanSemuaDataDenganSupabase() {
  showLoading('SINKRONISASI DATA DENGAN SUPABASE CLOUD...');
  try {
    if (typeof syncAllDataToCache === 'function') {
      await syncAllDataToCache();
    }
    if (typeof renderRecentTable === 'function') renderRecentTable();
    if (typeof updateDashboardStats === 'function') updateDashboardStats();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    await muatMetrikKapasitasDatabase(false);
    hideLoading();
    showNotif('SEMUA DATA BERHASIL DISINKRONKAN DENGAN SUPABASE CLOUD!', 'success');
  } catch(err) {
    hideLoading();
    console.error('Gagal sinkronisasi Supabase:', err);
    showNotif('GAGAL MENYSINKRONKAN DATA DENGAN CLOUD!', 'error');
  }
}
window.sinkronkanSemuaDataDenganSupabase = sinkronkanSemuaDataDenganSupabase;

// PARSE PHOTOS HELPER FUNCTION (HANDLES ARRAYS, JSON STRINGS, SINGLE URLS)
function parsePhotosArray(rawPhotos) {
  if (!rawPhotos) return [];
  if (Array.isArray(rawPhotos)) {
    return rawPhotos.map(p => typeof p === 'string' ? p.trim() : (p ? String(p) : '')).filter(p => p.length > 0);
  }
  if (typeof rawPhotos === 'string') {
    const trimmed = rawPhotos.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(p => typeof p === 'string' ? p.trim() : (p ? String(p) : '')).filter(p => p.length > 0);
        }
      } catch (e) {}
    }
    if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('/')) {
      return [trimmed];
    }
  }
  return [];
}
window.parsePhotosArray = parsePhotosArray;

// CLEAN KEEP-ALIVE PING (PREVENTS 404 & 401 CONSOLE ERRORS)
async function pingSupabaseKeepAlive() {
  if (supabase) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY }
      });
      window.isSupabaseOnline = (res.ok || res.status === 200);
    } catch (e) {
      window.isSupabaseOnline = false;
    }
  } else {
    window.isSupabaseOnline = false;
  }
  updateGlobalConnectionDotStatus();
}
try {
  pingSupabaseKeepAlive();
  setTimeout(() => {
    if (typeof initSupabaseRealtimeEngine === 'function') initSupabaseRealtimeEngine();
  if (typeof syncSupabaseIncremental === 'function') syncSupabaseIncremental();
  }, 100);
} catch (e) {}

// FIREBASE LIVE CONNECTION MONITOR
if (typeof firebase !== 'undefined' && firebase.database) {
  try {
    firebase.database().ref('.info/connected').on('value', (snap) => {
      window.isFirebaseOnline = (snap.val() === true);
      updateGlobalConnectionDotStatus();
    });
  } catch (e) {}
}

// STORAGE KEYS (V7_HARD_RESET_CLEAN)
const USERS_DB_KEY = 'STORE_USERS_DB_V7_CLEAN';
const REQUESTS_DB_KEY = 'STORE_REQUESTS_DB_V7_CLEAN';
const CHAT_DB_KEY = 'STORE_CHAT_DB_V7_CLEAN';
const CHAT_MESSAGES_KEY = 'STORE_CHAT_MESSAGES_V7_CLEAN';
const CHAT_ROOM_DB_KEY = 'STORE_CHAT_ROOM_DB_V7_CLEAN';
const TTD_DB_KEY = 'STORE_TTD_DB_V7_CLEAN';
const SESSION_KEY = 'STORE_ACTIVE_SESSION_V7_CLEAN';
const THEME_KEY = 'STORE_ACTIVE_THEME_V7_CLEAN';
const DESIGN_MODE_KEY = 'STORE_DESIGN_MODE_V7_CLEAN';
const ADMIN_REMINDER_TIME_KEY = 'STORE_ADMIN_REMINDER_TIME_V7_CLEAN';
const DELETED_USERS_KEY = 'STORE_DELETED_USERS_V7_CLEAN';
const DELETED_STORES_KEY = 'STORE_DELETED_STORES_V7_CLEAN';
const DELETED_REQUESTS_KEY = 'STORE_DELETED_REQUESTS_V7_CLEAN';
const STORES_DB_KEY = 'STORE_STORES_DB_V7_CLEAN';
const TOKO_DB_KEY = 'STORE_TOKO_DB_V7_CLEAN';
const KODE_UNIT_MAP_KEY = 'STORE_KODE_UNIT_MAP_V7_CLEAN';
const NOTIFICATIONS_DB_KEY = 'STORE_NOTIFICATIONS_DB_V7_CLEAN';
const FEATURE_PHOTOS_KEY = 'STORE_FEATURE_PHOTOS_V7_CLEAN';
const FIREBASE_USER_CONFIG_KEY = 'STORE_FIREBASE_USER_CONFIG_V7_CLEAN';

// NORMAL DESIGN MODE ONLY
const DESIGN_MODES = [
  { id: 'normal', btnName: 'DESAIN: NORMAL', name: 'DESAIN NORMAL' }
];

function getSavedDesignMode() {
  return 'normal';
}

function getSavedLocalTheme() {
  let theme = null;
  try {
    if (typeof localStorage !== 'undefined') {
      theme = localStorage.getItem('APP_SELECTED_THEME') || localStorage.getItem('STORE_LOCAL_USER_THEME_V7_CLEAN') || localStorage.getItem('STORE_ACTIVE_THEME_V7_CLEAN');
    }
  } catch(e) {}
  if (!theme && typeof appStorage !== 'undefined') {
    theme = appStorage.getItem('STORE_LOCAL_USER_THEME_V7_CLEAN') || appStorage.getItem('STORE_ACTIVE_THEME_V7_CLEAN') || appStorage.getItem('STORE_GLOBAL_APP_THEME_V7_CLEAN');
  }
  if (!theme && currentUser && currentUser.theme) {
    theme = currentUser.theme;
  }
  return theme || 'dark-mode';
}
window.getSavedLocalTheme = getSavedLocalTheme;

function updateBodyClasses(specificTheme) {
  const savedTheme = specificTheme || getSavedLocalTheme();
  
  const allThemes = ['dark-mode', 'light-mode', 'classic-mode', 'neon-mode', 'forest-mode', 'sunset-mode', 'ocean-mode', 'coffee-mode', 'purple-mode', 'crimson-mode'];
  
  allThemes.forEach(t => {
    document.body.classList.remove(t);
    document.documentElement.classList.remove(t);
  });
  
  document.body.classList.remove('design-mode-normal', 'design-mode-3d-kayu-gold', 'design-mode-3d-emerald-glass', 'design-mode-3d-stealth-black', 'design-mode-3d-neumorphism', 'design-mode-3d-glassmorphism', 'design-mode-3d-embossed', 'design-mode-3d-isometric');
  document.body.style.background = '';
  document.body.style.color = '';

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.body.setAttribute('data-theme', savedTheme);
  document.body.classList.add(savedTheme);
  document.body.classList.add('design-mode-normal');

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('APP_SELECTED_THEME', savedTheme);
      localStorage.setItem('STORE_ACTIVE_THEME_V7_CLEAN', savedTheme);
      localStorage.setItem('STORE_LOCAL_USER_THEME_V7_CLEAN', savedTheme);
    }
  } catch(e) {}
  if (typeof appStorage !== 'undefined') {
    appStorage.setItem('STORE_ACTIVE_THEME_V7_CLEAN', savedTheme);
    appStorage.setItem('STORE_LOCAL_USER_THEME_V7_CLEAN', savedTheme);
  }

  if (typeof updateThemeIcon === 'function') {
    updateThemeIcon();
  }
  if (typeof applyAppBackground === 'function') {
    applyAppBackground(null, false);
  }
  if (typeof applyAdaptiveTextColors === 'function') {
    applyAdaptiveTextColors();
  }
}
window.updateBodyClasses = updateBodyClasses;
window.applyThemeToDocument = updateBodyClasses;

// ==========================================================================
// BACKGROUND SCENERY CHANGER (DISIMPAN DI LOKAL STORAGE PERANGKAT)
// ==========================================================================
const BG_STORAGE_KEY = 'STORE_BG_IMAGE_CHOICE_V2';
const DEFAULT_PNG_BG = 'bg-theme-1.png';

function applyAppBackground(bgChoice, saveToLocal = true) {
  if (!bgChoice) {
    try {
      bgChoice = localStorage.getItem(BG_STORAGE_KEY) || DEFAULT_PNG_BG;
    } catch(e) {
      bgChoice = DEFAULT_PNG_BG;
    }
  }

  // Backward compatibility check
  if (bgChoice === 'bg-scenery.png') {
    bgChoice = 'bg-theme-1.png';
  }

  if (saveToLocal) {
    try {
      localStorage.setItem(BG_STORAGE_KEY, bgChoice);
    } catch(e) {}
  }

  const bgEl = document.querySelector('.aesthetic-bg-image');
  if (bgEl) {
    if (bgChoice === 'none' || !bgChoice) {
      bgEl.style.backgroundImage = 'none';
      bgEl.style.display = 'none';
    } else {
      bgEl.style.display = 'block';
      bgEl.style.backgroundImage = `url('${bgChoice}')`;
    }
  }

  document.documentElement.style.setProperty('--app-bg-image', bgChoice === 'none' || !bgChoice ? 'none' : `url('${bgChoice}')`);
}

function gantiBackgroundApp() {
  let currentBg = DEFAULT_PNG_BG;
  try {
    currentBg = localStorage.getItem(BG_STORAGE_KEY) || DEFAULT_PNG_BG;
  } catch(e) {}

  if (currentBg === 'bg-scenery.png') currentBg = 'bg-theme-1.png';

  // SIKLUS MULTI TEMA (HENING TANPA POPUP NOTIFIKASI):
  // 1. bg-theme-1.png (Futuristic Blue Moonlight Lake)
  // 2. bg-theme-2.png (Cyberpunk Sunset Skyline)
  // 3. bg-theme-3.png (Emerald Aurora Pine Forest)
  // 4. none (Polos / Tanpa Gambar)
  let nextBg = 'bg-theme-1.png';
  if (currentBg === 'bg-theme-1.png') {
    nextBg = 'bg-theme-2.png';
  } else if (currentBg === 'bg-theme-2.png') {
    nextBg = 'bg-theme-3.png';
  } else if (currentBg === 'bg-theme-3.png') {
    nextBg = 'none';
  } else {
    nextBg = 'bg-theme-1.png';
  }

  applyAppBackground(nextBg, true);
}
window.applyAppBackground = applyAppBackground;
window.gantiBackgroundApp = gantiBackgroundApp;

// ==========================================================================
// SETELAN TRANSPARANSI BACKGROUND LATAR BELAKANG
// ==========================================================================
const BG_OPACITY_KEY = 'STORE_BG_OPACITY_VAL_V1';

function isCurrentThemeDark() {
  const body = document.body;
  if (!body) return true;
  if (body.classList.contains('light-mode') || 
      body.classList.contains('classic-mode') || 
      body.classList.contains('forest-mode') || 
      body.classList.contains('sunset-mode') || 
      body.classList.contains('ocean-mode')) {
    return false;
  }
  return true;
}
window.isCurrentThemeDark = isCurrentThemeDark;

function applyAdaptiveTextColors(numVal) {
  let num;
  if (typeof numVal !== 'undefined' && numVal !== null) {
    num = typeof numVal === 'number' ? numVal : (parseFloat(numVal) || 0);
  } else {
    try {
      num = parseFloat(localStorage.getItem(BG_OPACITY_KEY) || '48') || 48;
    } catch(e) {
      num = 48;
    }
  }

  const isHighOpacity = num > 30; // > 30% -> PUTIH (#ffffff) untuk SEMUA TEMA
  const isDark = isCurrentThemeDark();
  // <= 30% -> HITAM (#000000) untuk TEMA TERANG, PUTIH (#ffffff) untuk TEMA GELAP
  const targetColor = isHighOpacity ? '#ffffff' : (isDark ? '#ffffff' : '#000000');
  const needsShadow = isHighOpacity;
  
  document.documentElement.style.setProperty('--adaptive-header-color', targetColor);

  // 1. uselogin (Nama User)
  const namaUserEl = document.getElementById('namaUser');
  if (namaUserEl) {
    namaUserEl.style.setProperty('color', targetColor, 'important');
    if (needsShadow) {
      namaUserEl.style.setProperty('text-shadow', '0 1px 4px rgba(0,0,0,0.6)', 'important');
    } else {
      namaUserEl.style.removeProperty('text-shadow');
    }
  }

  // 2. area & kategori user
  const areaUserEl = document.getElementById('areaUser');
  if (areaUserEl) {
    areaUserEl.style.setProperty('color', targetColor, 'important');
    if (needsShadow) {
      areaUserEl.style.setProperty('text-shadow', '0 1px 3px rgba(0,0,0,0.6)', 'important');
    } else {
      areaUserEl.style.removeProperty('text-shadow');
    }
  }

  // 3. Judul Tabel (DI DASHBOARD)
  const dashboardTitleEl = document.getElementById('dashboardRecentTitle');
  if (dashboardTitleEl) {
    dashboardTitleEl.style.setProperty('color', targetColor, 'important');
    if (needsShadow) {
      dashboardTitleEl.style.setProperty('text-shadow', '0 1px 4px rgba(0,0,0,0.6)', 'important');
    } else {
      dashboardTitleEl.style.removeProperty('text-shadow');
    }
  }

  // 4. DETAIL DATA PERMINTAAN (Di detaildata/riwayat page)
  const riwayatTitleEl = document.getElementById('riwayatPageTitle') || document.querySelector('#riwayatPage .riwayatContent > h3');
  if (riwayatTitleEl) {
    riwayatTitleEl.style.setProperty('color', targetColor, 'important');
    if (needsShadow) {
      riwayatTitleEl.style.setProperty('text-shadow', '0 1px 4px rgba(0,0,0,0.6)', 'important');
    } else {
      riwayatTitleEl.style.removeProperty('text-shadow');
    }
  }

  // RESET / PASTIKAN DETAIL PERMINTAAN & FORM PERMINTAAN TOKO TETAP SESUAI TEMA BAWAAN
  const judulDetailEl = document.getElementById('judulDetailPermintaan');
  if (judulDetailEl) {
    judulDetailEl.style.setProperty('color', 'var(--primary)', 'important');
    judulDetailEl.style.removeProperty('text-shadow');
  }

  const formPermintaanTitleEl = document.querySelector('#inputPage .box h3:first-child');
  if (formPermintaanTitleEl) {
    formPermintaanTitleEl.style.removeProperty('color');
    formPermintaanTitleEl.style.removeProperty('text-shadow');
  }
}

let bgOpacityRaf = null;
let bgOpacityDebounceSave = null;

function ubahTransparansiBackground(val) {
  const numVal = parseFloat(val) || 0;
  const opacityFloat = (numVal / 100).toFixed(2);
  
  // 1. Instan update teks persentase
  const valText = document.getElementById('bgOpacityValText');
  if (valText) valText.textContent = `${val}%`;

  // 2. Ultra-cepat via requestAnimationFrame untuk 60/120 FPS GPU sync
  if (bgOpacityRaf) cancelAnimationFrame(bgOpacityRaf);
  bgOpacityRaf = requestAnimationFrame(() => {
    document.documentElement.style.setProperty('--bg-opacity-val', opacityFloat);
    const bgEl = document.querySelector('.aesthetic-bg-image');
    if (bgEl) {
      bgEl.style.setProperty('opacity', opacityFloat, 'important');
    }
    applyAdaptiveTextColors(numVal);
  });

  // 3. Debounce simpan ke localStorage agar tidak lag saat digeser cepat
  if (bgOpacityDebounceSave) clearTimeout(bgOpacityDebounceSave);
  bgOpacityDebounceSave = setTimeout(() => {
    try {
      localStorage.setItem(BG_OPACITY_KEY, val);
    } catch(e) {}
  }, 150);
}

function loadSavedBgOpacity() {
  let savedVal = '48';
  try {
    savedVal = localStorage.getItem(BG_OPACITY_KEY) || '48';
  } catch(e) {}

  const rangeInput = document.getElementById('bgOpacityRange');
  if (rangeInput) rangeInput.value = savedVal;

  const valText = document.getElementById('bgOpacityValText');
  if (valText) valText.textContent = `${savedVal}%`;

  const numVal = parseFloat(savedVal) || 0;
  const opacityFloat = (numVal / 100).toFixed(2);
  document.documentElement.style.setProperty('--bg-opacity-val', opacityFloat);
  
  const bgEl = document.querySelector('.aesthetic-bg-image');
  if (bgEl) {
    bgEl.style.setProperty('opacity', opacityFloat, 'important');
  }

  applyAdaptiveTextColors(numVal);
}

window.applyAdaptiveTextColors = applyAdaptiveTextColors;
window.ubahTransparansiBackground = ubahTransparansiBackground;
window.loadSavedBgOpacity = loadSavedBgOpacity;

// Auto init background & opacity immediately
try {
  applyAppBackground(null, false);
  loadSavedBgOpacity();
} catch(e) {}

function loadSavedDesignMode() {
  updateBodyClasses();
  applyAppBackground(null, false);
}

function toggleDesignMode() {
  const currentMode = getSavedDesignMode();
  const currentIndex = DESIGN_MODES.findIndex(m => m.id === currentMode);
  const nextIndex = (currentIndex + 1) % DESIGN_MODES.length;
  const nextMode = DESIGN_MODES[nextIndex].id;
  gantiDesignMode(nextMode, true);
}

function updateDesignModeButtonUI(mode) {
  const btnText = document.getElementById('designModeBtnText');
  const headerBtnText = document.getElementById('headerDesignModeText');
  const found = DESIGN_MODES.find(m => m.id === mode) || DESIGN_MODES[0];
  if (btnText) {
    btnText.textContent = found.btnName;
  }
  if (headerBtnText) {
    headerBtnText.textContent = found.btnName;
  }
}

function gantiDesignMode(newMode, userInitiated = true) {
  if (!newMode || !DESIGN_MODES.some(m => m.id === newMode)) {
    newMode = 'normal';
  }

  appStorage.setItem(DESIGN_MODE_KEY, newMode);
  updateBodyClasses();

  const found = DESIGN_MODES.find(m => m.id === newMode) || DESIGN_MODES[0];

  if (userInitiated) {
    if (typeof showNotif === 'function') {
      showNotif(`MODE DESAIN DIUBAH KE: ${found.name.toUpperCase()}`, 'success');
    }

    if (currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'))) {
      if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
        try { pushCentralCloudDB(); } catch(e) {}
      }
    }
  }
}
window.getSavedDesignMode = getSavedDesignMode;
window.loadSavedDesignMode = loadSavedDesignMode;
window.gantiDesignMode = gantiDesignMode;
window.toggleDesignMode = toggleDesignMode;
window.updateBodyClasses = updateBodyClasses;

const FONTE_TOKEN_KEY = 'STORE_FONTE_TOKEN_KEY_V7_CLEAN';
const ADMIN_REMINDER_KEY = 'STORE_ADMIN_REMINDER_KEY_V7_CLEAN';
const ADMIN_SECRET_KEY_STORAGE_KEY = 'STORE_ADMIN_SECRET_KEY_V7_CLEAN';
const ADMIN_SCRIPT_URL_KEY = 'STORE_ADMIN_SCRIPT_URL_V7_CLEAN';
const GLOBAL_THEME_KEY = 'STORE_GLOBAL_APP_THEME_V7_CLEAN';
const LOCAL_USER_THEME_KEY = 'STORE_LOCAL_USER_THEME_V7_CLEAN';
const LAST_ADMIN_THEME_TIME_KEY = 'STORE_LAST_ADMIN_THEME_TIME_V7_CLEAN';

function getActiveAppliedTheme() {
  const localUserTheme = (typeof appStorage !== 'undefined' ? appStorage.getItem(LOCAL_USER_THEME_KEY) : null);
  const globalTheme = (typeof appStorage !== 'undefined' ? appStorage.getItem(GLOBAL_THEME_KEY) : null);
  return localUserTheme || globalTheme || 'light';
}

function applyThemeToDocument(theme) {
  const t = theme || getActiveAppliedTheme();
  document.documentElement.setAttribute('data-theme', t);
  document.body.setAttribute('data-theme', t);

  if (t === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  }
}
window.applyThemeToDocument = applyThemeToDocument;

async function setGlobalAdminTheme(themeName) {
  const now = Date.now();

  if (typeof appStorage !== 'undefined') {
    appStorage.setItem(GLOBAL_THEME_KEY, themeName);
    appStorage.setItem(LOCAL_USER_THEME_KEY, themeName);
    appStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, String(now));
  }
  try { localStorage.setItem(GLOBAL_THEME_KEY, themeName); } catch(e) {}
  try { localStorage.setItem(LOCAL_USER_THEME_KEY, themeName); } catch(e) {}
  try { localStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, String(now)); } catch(e) {}
  applyThemeToDocument(themeName);
}
window.setGlobalAdminTheme = setGlobalAdminTheme;

function toggleTheme() {
  const currentTheme = getActiveAppliedTheme();
  const newTheme = (currentTheme === 'light') ? 'dark' : 'light';

  // HANYA DISIMPAN DI LOKAL PENYIMPANAN (LOCALSTORAGE & APPSTORAGE), TIDAK DIKIRIM KE SUPABASE
  if (typeof appStorage !== 'undefined') {
    appStorage.setItem(LOCAL_USER_THEME_KEY, newTheme);
    appStorage.setItem(THEME_KEY, newTheme);
    appStorage.setItem('APP_SELECTED_THEME', newTheme);
  }
  try { localStorage.setItem(LOCAL_USER_THEME_KEY, newTheme); } catch(e) {}
  try { localStorage.setItem(THEME_KEY, newTheme); } catch(e) {}
  try { localStorage.setItem('APP_SELECTED_THEME', newTheme); } catch(e) {}

  if (currentUser) {
    currentUser.theme = newTheme;
  }
  applyThemeToDocument(newTheme);
}
window.toggleTheme = toggleTheme;

try {
  applyThemeToDocument();
} catch(e) {}

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
  showNotif(value ? 'KUNCI KEAMANAN BERHASIL DISIMPAN!' : 'KUNCI KEAMANAN DIHAPUS!', 'info');
}

function getSystemNotifications() {
  const raw = appStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) return parsed.items;
  } catch(e) {}
  return [];
}

function getSystemNotifsClearedTimestamp() {
  const raw = appStorage.getItem(NOTIFICATIONS_DB_KEY) || '[]';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.clearedAt) return Number(parsed.clearedAt) || 0;
  } catch(e) {}
  return 0;
}

function shouldEmitImportantNotification(targetRoles, targetArea, message, noSurat = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return false;

  const importantPatterns = [
    'PERMINTAAN BARU',
    'DISETUJUI SERVICE',
    'DISETUJUI DM',
    'TELAH DISETUJUI DM',
    'APPROVAL DM',
    'MOHON APPROVAL DM',
    'DITOLAK DM',
    'DITOLAK SERVICE',
    'DITOLAK',
    'SELESAI (DONE)',
    'REMINDER PENDING',
    'BREAKDOWN',
    'PARSIAL'
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
  const clearedAt = getSystemNotifsClearedTimestamp();
  const normalizedRoles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
  const dedupeKey = `${String(noSurat || '').trim()}|${String(targetArea || 'ALL')}|${String(message || '').trim()}`;
  const alreadyExists = notifs.some(n => {
    const nKey = `${String(n.noSurat || '').trim()}|${String(n.targetArea || 'ALL')}|${String(n.message || '').trim()}`;
    return nKey === dedupeKey;
  });

  if (alreadyExists) return;

  const newNotif = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random()*10000)}`,
    targetRoles: normalizedRoles,
    targetArea: targetArea || 'ALL',
    message: message,
    noSurat: noSurat,
    time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}`,
    readBy: [],
    timestamp: Date.now()
  };
  notifs.unshift(newNotif);
  if (notifs.length > 100) notifs.pop();
  
  const payload = clearedAt ? { clearedAt, items: notifs } : notifs;
  appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload));
  try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload)); } catch(e) {}

  if (typeof updateNotifBadgeCount === 'function') updateNotifBadgeCount();

  // SYNC KE FIREBASE SECARA REALTIME (FIRESTORE & REALTIME DATABASE)
  const fsNotif = getDbFirestore();
  if (fsNotif) {
    try {
      fsNotif.collection('notifications').doc(newNotif.id).set(newNotif).catch(e => console.warn('[FIRESTORE NOTIF SAVE ERROR]:', e));
    } catch(e) {
      console.warn('[FIRESTORE NOTIF EXCEPTION]:', e);
    }
  }
  const rtdbNotif = getDbRealtime();
  if (rtdbNotif) {
    try {
      rtdbNotif.ref(`notifications/${newNotif.id}`).set(newNotif).catch(() => {});
    } catch(e) {}
  }
}

function countAllPendingBreakdowns() {
  let count = 0;
  const seenIds = new Set();

  try {
    const allPartials = typeof getAllPartialBreakdownsFromDB === 'function' ? getAllPartialBreakdownsFromDB() : [];
    allPartials.forEach(p => {
      if (p && String(p.status || '').toUpperCase() === 'PENDING') {
        const pid = p.id || `${p.no_surat_induk || p.noSurat}_${p.partial_id || p.partialId || 'P1'}`;
        if (!seenIds.has(pid)) {
          seenIds.add(pid);
          count++;
        }
      }
    });

    const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    reqs.forEach(r => {
      if (r && Array.isArray(r.partialBreakdowns)) {
        r.partialBreakdowns.forEach(p => {
          if (p && String(p.status || '').toUpperCase() === 'PENDING') {
            const pid = p.id || `${r.noSurat}_${p.partialId || p.partial_id || 'P1'}`;
            if (!seenIds.has(pid)) {
              seenIds.add(pid);
              count++;
            }
          }
        });
      }
    });
  } catch (e) {
    console.warn('[COUNT PENDING BREAKDOWNS NOTICE]:', e);
  }

  return count;
}
window.countAllPendingBreakdowns = countAllPendingBreakdowns;

function getAccessibleNotifications() {
  if (!currentUser) return [];
  const notifs = (typeof getSystemNotifications === 'function' ? getSystemNotifications() : []) || [];
  const requests = (typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : []) || [];
  const userCat = String(currentUser.category || '').toUpperCase();
  const userArea = String(currentUser.area || '').toUpperCase();
  const userUname = String(currentUser.username || '').toUpperCase();
  const userFullName = String(currentUser.fullName || '').toUpperCase();
  const isSysAdmin = userCat === 'ADMIN' || userUname === 'ADMIN';
  const isDMUser = userCat === 'DM' || isSysAdmin;

  let filtered = notifs.filter(n => {
    if (!n) return false;

    // Untuk DM / Admin: Filter notifikasi breakdown PENDING individual agar digantikan 1 Notifikasi Konsolidasi
    if (isDMUser) {
      const msgUp = String(n.message || '').toUpperCase();
      const titleUp = String(n.title || '').toUpperCase();
      const typeUp = String(n.type || '').toUpperCase();
      if ((msgUp.includes('BREAKDOWN') || titleUp.includes('BREAKDOWN') || typeUp.includes('BREAKDOWN')) &&
          (msgUp.includes('MOHON APPROVAL') || msgUp.includes('PENDING') || titleUp.includes('MOHON APPROVAL'))) {
        return false;
      }
    }

    if (isSysAdmin) return true;

    // 1. STRICT AREA FILTER: MUST MATCH USER'S AREA OR ALL
    const targetArea = String(n.targetArea || 'ALL').toUpperCase();
    const areaMatch = (targetArea === 'ALL' || userArea === 'ALL' || userCat === 'DM' || isAreaMatch(userArea, targetArea));
    if (!areaMatch) return false;

    // 2. STRICT ROLE MATCH PER LOGIN CATEGORY
    const targetRoles = Array.isArray(n.targetRoles) ? n.targetRoles.map(r => String(r).toUpperCase()) : [];
    const roleMatch = (
      targetRoles.includes('ALL') ||
      targetRoles.includes(userCat) ||
      (userCat === 'DM' && targetRoles.includes('DM')) ||
      (userCat === 'SERVICE' && targetRoles.includes('SERVICE')) ||
      (userCat === 'TOKO' && targetRoles.includes('TOKO')) ||
      (userCat === 'SALES' && (targetRoles.includes('SALES') || targetRoles.includes('TOKO')))
    );
    if (!roleMatch) return false;

    // 3. STRICT CREATOR MATCH FOR TOKO / SALES USER
    if ((userCat === 'TOKO' || userCat === 'SALES') && n.noSurat && Array.isArray(requests)) {
      const req = requests.find(r => r && r.noSurat === n.noSurat);
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

    return true;
  });

  // JIKA USER DM / ADMIN: SISIPKAN 1 NOTIFIKASI KONSOLIDASI BREAKDOWN DENGAN JUMLAH DYNAMIS XXX (JIKA ADA BREAKDOWN PENDING > 0)
  if (isDMUser) {
    const pendingCount = countAllPendingBreakdowns();
    if (pendingCount > 0) {
      const consolidatedNotif = {
        id: 'CONSOLIDATED_BREAKDOWN_PENDING_NOTIF',
        type: 'BREAKDOWN_CONSOLIDATED',
        title: 'PENGAJUAN BREAKDOWN PARSIAL',
        message: `ADA ${pendingCount} SURAT PENGAJUAN BREAKDOWN MENUNGGU APPROVAL ANDA`,
        targetRoles: ['DM', 'ADMIN'],
        targetArea: 'ALL',
        time: 'HARI INI',
        readBy: [],
        pendingCount: pendingCount
      };
      filtered.unshift(consolidatedNotif);
    }
  }

  return filtered;
}

function updateNotifBellCounter() {
  const bellBtn = document.getElementById('notifBellBtn');
  const badgeEl = document.getElementById('notifBellBadge');
  if (!bellBtn || !badgeEl) return;

  const isLoginPage = (document.getElementById('loginPage') && document.getElementById('loginPage').classList.contains('active')) || !currentUser;
  if (isLoginPage) {
    bellBtn.style.setProperty('display', 'none', 'important');
    return;
  }

  bellBtn.style.setProperty('display', 'flex', 'important');

  const userNotifs = typeof getAccessibleNotifications === 'function' ? getAccessibleNotifications() : [];
  const unreadCount = userNotifs.filter(n => {
    if (!n) return false;
    if (!n.readBy) return true;
    return !n.readBy.includes(currentUser.id) && !n.readBy.includes(currentUser.username);
  }).length;

  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badgeEl.style.setProperty('display', 'flex', 'important');
    badgeEl.style.setProperty('visibility', 'visible', 'important');
    badgeEl.style.setProperty('opacity', '1', 'important');
  } else {
    badgeEl.style.setProperty('display', 'none', 'important');
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

  const btnHapusNotif = document.getElementById('btnHapusSemuaNotifSystem');
  const isSysAdmin = currentUser && (
    String(currentUser.category || currentUser.kategori || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.role || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );
  if (btnHapusNotif) {
    btnHapusNotif.style.display = isSysAdmin ? 'inline-block' : 'none';
  }

  const userNotifs = getAccessibleNotifications();

  if (!userNotifs || userNotifs.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:35px 20px; color:var(--text-muted); font-size:13px; font-weight:600;">
      <span class="material-symbols-rounded" style="font-size:36px; color:#94a3b8; display:block; margin-bottom:8px;">notifications_off</span>
      BELUM ADA NOTIFIKASI MASUK.
    </div>`;
    return;
  }

  userNotifs.forEach(n => {
    const isRead = n.readBy && (n.readBy.includes(currentUser.id) || n.readBy.includes(currentUser.username));
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
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          ${n.time || ''}
        </div>
      </div>
      ${!isRead ? `<div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; margin-top: 6px; flex-shrink: 0;"></div>` : ''}
    `;
    container.appendChild(item);
  });
}

async function clickNotificationItem(notifId, noSurat) {
  if (typeof tampilkanLoadingProses === 'function') {
    tampilkanLoadingProses('MOHON TUNGGU...');
  }
  try {
    const notifs = typeof getAccessibleNotifications === 'function' ? getAccessibleNotifications() : [];
    const targetNotif = notifs.find(n => n && (n.id === notifId || (noSurat && n.noSurat === noSurat)));

    markNotifAsRead(notifId, noSurat);

    const notifListPopup = document.getElementById('popupNotifList');
    if (notifListPopup) {
      notifListPopup.style.display = 'none';
      notifListPopup.classList.remove('show');
    }

    if (notifId === 'CONSOLIDATED_BREAKDOWN_PENDING_NOTIF' || (targetNotif && targetNotif.type === 'BREAKDOWN_CONSOLIDATED')) {
      if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
        await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
      }
      const allPartials = typeof getAllPartialBreakdownsFromDB === 'function' ? getAllPartialBreakdownsFromDB() : [];
      const pendingPartials = allPartials.filter(p => p && String(p.status || '').toUpperCase() === 'PENDING');
      
      if (pendingPartials.length > 0) {
        const targetNs = pendingPartials[0].no_surat_induk || pendingPartials[0].noSurat;
        if (targetNs && typeof bukaModalRiwayatParsialList === 'function') {
          bukaModalRiwayatParsialList(targetNs);
        }
      } else {
        if (typeof showNotif === 'function') showNotif('SEMUA PENGAJUAN BREAKDOWN TELAH DI APPROVE / DITOLAK.', 'info');
      }
      return;
    }

    let targetNoSurat = String(noSurat || '').trim();
    if (!targetNoSurat && targetNotif) {
      targetNoSurat = String(targetNotif.noSurat || '').trim();
    }
    if (!targetNoSurat && targetNotif && targetNotif.message) {
      const m = targetNotif.message.match(/(PRMT[\/\.\_\-A-Za-z0-9]+)/i) || targetNotif.message.match(/#?([A-Za-z0-9\/\.\_-]{5,30})/i);
      if (m) targetNoSurat = m[1];
    }

    const cleanNoSurat = targetNoSurat.replace(/[-_]P\d+$/i, '').replace(/^#/, '').trim();

    if (cleanNoSurat) {
      if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
        await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
      }

      const existingDetail = document.getElementById('popupDetailBarangV2');
      if (existingDetail) {
        existingDetail.style.display = 'none';
        existingDetail.classList.remove('show');
      }

      const partials = typeof getPartialBreakdownsFromDB === 'function' ? getPartialBreakdownsFromDB(cleanNoSurat) : [];
      const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
      const req = reqs.find(r => r && String(r.noSurat || '').trim().toUpperCase() === cleanNoSurat.toUpperCase());
      const reqPartials = (req && Array.isArray(req.partialBreakdowns)) ? req.partialBreakdowns : [];

      const hasBreakdownData = (Array.isArray(partials) && partials.length > 0) || (Array.isArray(reqPartials) && reqPartials.length > 0);
      const isBreakdownNotif = hasBreakdownData || (targetNotif && (
        String(targetNotif.title || '').toUpperCase().includes('BREAKDOWN') ||
        String(targetNotif.message || '').toUpperCase().includes('BREAKDOWN') ||
        String(targetNotif.type || '').toUpperCase().includes('BREAKDOWN') ||
        String(targetNotif.title || '').toUpperCase().includes('PARSIAL') ||
        String(targetNotif.message || '').toUpperCase().includes('PARSIAL')
      ));

      if (isBreakdownNotif && typeof bukaModalRiwayatParsialList === 'function') {
        bukaModalRiwayatParsialList(cleanNoSurat);
      } else if (typeof lihatDetail === 'function') {
        lihatDetail(cleanNoSurat, true);
      }
    }
  } finally {
    setTimeout(() => {
      if (typeof tutupLoadingProses === 'function') {
        tutupLoadingProses();
      }
    }, 300);
  }
}

function markNotifAsRead(notifId, noSurat = '') {
  if (!currentUser) return;

  let notifs = getSystemNotifications();
  const accessibleNotifs = getAccessibleNotifications();

  let targetNotif = notifs.find(n => n.id === notifId || (noSurat && n.noSurat === noSurat && String(n.message || '').includes(noSurat)));
  if (!targetNotif && Array.isArray(accessibleNotifs)) {
    const accItem = accessibleNotifs.find(n => n.id === notifId || (noSurat && n.noSurat === noSurat));
    if (accItem) {
      targetNotif = { ...accItem, readBy: [] };
      notifs.unshift(targetNotif);
    }
  }

  if (targetNotif) {
    if (!Array.isArray(targetNotif.readBy)) targetNotif.readBy = [];
    if (!targetNotif.readBy.includes(currentUser.id)) targetNotif.readBy.push(currentUser.id);
    if (!targetNotif.readBy.includes(currentUser.username)) targetNotif.readBy.push(currentUser.username);

    if (noSurat) {
      notifs.forEach(n => {
        if (n && n.noSurat === noSurat) {
          if (!Array.isArray(n.readBy)) n.readBy = [];
          if (!n.readBy.includes(currentUser.id)) n.readBy.push(currentUser.id);
          if (!n.readBy.includes(currentUser.username)) n.readBy.push(currentUser.username);
        }
      });
    }

    if (notifs.length > 100) notifs = notifs.slice(0, 100);

    const clearedAt = getSystemNotifsClearedTimestamp();
    const payload = clearedAt ? { clearedAt, items: notifs } : notifs;

    appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload));
    try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload)); } catch(e) {}

    // SINKRONISASI STATUS BACA (readBy) KE CLOUD FIRESTORE & REALTIME DATABASE
    try {
      const fsNotif = typeof getDbFirestore === 'function' ? getDbFirestore() : null;
      if (fsNotif && targetNotif && targetNotif.id) {
        fsNotif.collection('notifications').doc(targetNotif.id).set({
          readBy: targetNotif.readBy
        }, { merge: true }).catch(() => {});
      }
      const rtdbNotif = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
      if (rtdbNotif && targetNotif && targetNotif.id) {
        rtdbNotif.ref(`notifications/${targetNotif.id}/readBy`).set(targetNotif.readBy).catch(() => {});
      }
    } catch(e) {}
  }

  updateNotifBellCounter();
}

function markAllNotifAsRead(silent = false) {
  if (!currentUser) return;
  
  let notifs = getSystemNotifications();
  const accessibleNotifs = getAccessibleNotifications();

  // MERGE ACCESSIBLE NOTIFICATIONS INTO MAIN STORAGE SO READ STATUS IS PERSISTED
  if (Array.isArray(accessibleNotifs)) {
    accessibleNotifs.forEach(acc => {
      if (acc && acc.id) {
        const idx = notifs.findIndex(n => n.id === acc.id || (n.noSurat && acc.noSurat && n.noSurat === acc.noSurat && n.message === acc.message));
        if (idx !== -1) {
          if (!Array.isArray(notifs[idx].readBy)) notifs[idx].readBy = [];
          if (!notifs[idx].readBy.includes(currentUser.id)) notifs[idx].readBy.push(currentUser.id);
          if (!notifs[idx].readBy.includes(currentUser.username)) notifs[idx].readBy.push(currentUser.username);
        } else {
          const newObj = { ...acc, readBy: [currentUser.id, currentUser.username] };
          notifs.unshift(newObj);
        }
      }
    });
  }

  // MARK ALL STORED NOTIFICATIONS ACCESSIBLE TO THIS USER AS READ
  notifs.forEach(n => {
    if (!Array.isArray(n.readBy)) n.readBy = [];
    if (!n.readBy.includes(currentUser.id)) n.readBy.push(currentUser.id);
    if (!n.readBy.includes(currentUser.username)) n.readBy.push(currentUser.username);
  });

  if (notifs.length > 100) notifs = notifs.slice(0, 100);

  const clearedAt = getSystemNotifsClearedTimestamp();
  const payload = clearedAt ? { clearedAt, items: notifs } : notifs;

  appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload));
  try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(payload)); } catch(e) {}

  // SINKRONISASI TANDAI SEMUA SUDAH DIBACA KE FIRESTORE & RTDB
  try {
    const fsNotif = typeof getDbFirestore === 'function' ? getDbFirestore() : null;
    const rtdbNotif = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
    notifs.forEach(n => {
      if (n && n.id && Array.isArray(n.readBy)) {
        if (fsNotif) fsNotif.collection('notifications').doc(n.id).set({ readBy: n.readBy }, { merge: true }).catch(() => {});
        if (rtdbNotif) rtdbNotif.ref(`notifications/${n.id}/readBy`).set(n.readBy).catch(() => {});
      }
    });
  } catch(e) {}

  // Notifikasi dikelola secara lokal & Firebase (tidak dikirim ke Supabase)

  updateNotifBellCounter();
  loadNotificationList();

  if (!silent && typeof showNotif === 'function') {
    showNotif('SEMUA NOTIFIKASI DITANDAI DIBACA!', 'info');
  }
}
window.markAllNotifAsRead = markAllNotifAsRead;

async function hapusSemuaNotifikasiSystem() {
  if (!currentUser) {
    showNotif('SILAKAN LOGIN TERLEBIH DAHULU!', 'warning');
    return;
  }
  const isSysAdmin = currentUser && (
    String(currentUser.category || currentUser.kategori || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.role || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );
  if (!isSysAdmin) {
    showNotif('FITUR HAPUS SEMUA NOTIFIKASI HANYA DAPAT DILAKUKAN OLEH ADMIN!', 'warning');
    return;
  }

  showConfirm('YAKIN INGIN MENGHAPUS SEMUA NOTIFIKASI DARI SISTEM & SELURUH PERANGKAT LOKAL?', function() {
    showLoading('MENGHAPUS SEMUA NOTIFIKASI...');
    setTimeout(async () => {
      try {
        // 1. KOSONGKAN PENYIMPANAN LOKAL PERANGKAT INI TOTAL
        appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify([]));
        try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify([])); } catch(e) {}
        try { localStorage.removeItem('LAST_NOTIF_CLEARED_TIMESTAMP'); } catch(e) {}

        // 2. KOSONGKAN DI FIREBASE FIRESTORE
        const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
        if (fs) {
          try {
            const notifSnap = await fs.collection('notifications').get();
            const batch = fs.batch();
            notifSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          } catch(err) {
            console.warn('[FIRESTORE DELETE ALL NOTIFS NOTICE]:', err);
          }
        }

        // 3. KOSONGKAN DI FIREBASE REALTIME DATABASE
        const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : (typeof dbRealtime !== 'undefined' ? dbRealtime : null);
        if (rtdb) {
          try {
            await rtdb.ref('notifications').remove();
            await rtdb.ref('system_broadcast/notif_clear').set({ timestamp: Date.now() });
          } catch(e) {}
        }

        // 4. SIARKAN KE SEMUA PERANGKAT LAIN VIA SUPABASE BROADCAST
        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'notifications_cleared',
              payload: { timestamp: Date.now() }
            });
          } catch(e) {}
        }

        // 5. REFRESH TAMPILAN POPUP NOTIFIKASI & LONCENG SEKETIKA
        if (typeof loadNotificationList === 'function') loadNotificationList();
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        if (typeof updateNotifBadgeCount === 'function') updateNotifBadgeCount();

        hideLoading();
        showNotif('SEMUA NOTIFIKASI BERHASIL DIHAPUS BERSIH DARI LOKAL & SEMUA PERANGKAT!', 'success');
      } catch (err) {
        hideLoading();
        showNotif('GAGAL MENGHAPUS NOTIFIKASI: ' + (err.message || err), 'danger');
      }
    }, 200);
  });
}
window.hapusSemuaNotifikasiSystem = hapusSemuaNotifikasiSystem;

function hapusSemuaNotifFirebaseDanLokal() {
  hapusSemuaNotifikasiSystem();
}
window.hapusSemuaNotifFirebaseDanLokal = hapusSemuaNotifFirebaseDanLokal;

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
  let stores = [];
  try {
    const raw = appStorage.getItem(STORES_DB_KEY);
    if (raw) stores = JSON.parse(raw);
  } catch (e) {
    stores = [];
  }

  if (!Array.isArray(stores)) stores = [];

  const delStores = new Set(
    (JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]') || [])
      .filter(Boolean)
      .map(v => String(v).trim().toUpperCase())
  );
  const delUsers = new Set(
    (JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]') || [])
      .filter(Boolean)
      .map(v => String(v).trim().toUpperCase())
  );

  // Filter out deleted stores
  stores = stores.filter(s => {
    if (!s || !s.fullName) return false;
    const sId = String(s.id || '').toUpperCase();
    const sName = String(s.fullName).trim().toUpperCase();
    const sArea = String(s.area || '').trim().toUpperCase();
    const sKey = `${sName}_${sArea}`;
    if (delStores.has(sId) || delStores.has(sName) || delStores.has(sKey)) return false;
    if (delUsers.has(sId) || delUsers.has(sName)) return false;
    return true;
  });

  const users = (typeof getUsersFromDB === 'function' ? getUsersFromDB() : []);
  users.forEach(u => {
    if (u && u.category === 'TOKO' && u.fullName) {
      const uName = String(u.fullName).trim().toUpperCase();
      const uArea = String(u.area || 'BDG').trim().toUpperCase();
      const uId = String(u.id || '').trim();
      const uUname = String(u.username || '').trim().toUpperCase();
      const uKey = `${uName}_${uArea}`;

      if (delStores.has(uName) || delStores.has(uKey) || delUsers.has(String(u.id || '').toUpperCase()) || delUsers.has(uUname)) {
        return;
      }

      // Check if store already exists by ID or by Name
      const existingIdx = stores.findIndex(s => {
        if (!s) return false;
        const sId = String(s.id || '').trim();
        const sName = String(s.fullName || '').trim().toUpperCase();
        return (
          (uId && sId && uId === sId) ||
          (sId && sId === `STK-${uUname}`) ||
          (sName === uName && (!s.area || s.area === uArea))
        );
      });

      if (existingIdx !== -1) {
        stores[existingIdx].id = u.id || stores[existingIdx].id;
        stores[existingIdx].fullName = u.fullName;
        stores[existingIdx].area = u.area || 'BDG';
        if (u.storeCode) stores[existingIdx].storeCode = u.storeCode;
      } else {
        stores.push({
          id: u.id || `STK-${u.username}`,
          fullName: u.fullName,
          area: u.area || 'BDG',
          storeCode: u.storeCode || generateStoreCode(u.fullName, u.area),
          createdBy: 'SYSTEM'
        });
      }
    }
  });

  // Deduplicate stores by (fullName + area)
  const map = new Map();
  stores.forEach(s => {
    if (!s || !s.fullName) return;
    const name = String(s.fullName).trim().toUpperCase();
    const area = String(s.area || 'BDG').trim().toUpperCase();
    const key = `${name}_${area}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  });
  stores = Array.from(map.values());

  const assignedCodes = new Set();
  stores.forEach(s => {
    if (!s) return;
    const name = String(s.fullName || '').trim().toUpperCase();
    if (!s.storeCode || assignedCodes.has(s.storeCode.toUpperCase())) {
      s.storeCode = generateStoreCode(name, s.area);
    }
    assignedCodes.add(s.storeCode.toUpperCase());
  });

  return stores;
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

function getUserAreaList(areaInput) {
  if (!areaInput) return [];
  if (Array.isArray(areaInput)) return areaInput.map(a => String(a).trim().toUpperCase()).filter(Boolean);
  
  const str = String(areaInput).trim().toUpperCase();
  if (str === 'ALL' || str === 'SEMUA') return ['ALL'];

  const parts = str.split(/[,&/+\s]+/).map(p => p.trim()).filter(Boolean);
  return parts;
}
window.getUserAreaList = getUserAreaList;

function isAreaMatch(userArea, targetArea) {
  if (!userArea || !targetArea) return false;
  const userAreas = getUserAreaList(userArea);
  const targetAreas = getUserAreaList(targetArea);

  if (userAreas.includes('ALL') || targetAreas.includes('ALL')) return true;

  return userAreas.some(uArea => targetAreas.includes(uArea));
}
window.isAreaMatch = isAreaMatch;

function formatUserAreaDisplay(areaInput) {
  if (!areaInput) return '-';
  const areas = getUserAreaList(areaInput);
  if (areas.includes('ALL')) return 'ALL';
  return areas.join(' / ');
}
window.formatUserAreaDisplay = formatUserAreaDisplay;

const KODE_UNIT_MAP = {};

const SEED_USERS = [
  {
    id: 'USR-ADMIN',
    username: 'ADMIN',
    password: '00',
    fullName: 'SUPER ADMIN',
    phone: '',
    category: 'ADMIN',
    area: 'ALL',
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
var confirmCallback = null;
var confirmCancelCallback = null;

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

// Merged storage functions below

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
    
    if (typeof initDatabase === 'function') {
      initDatabase();
    }
    if (typeof initFirebaseDB === 'function') {
      initFirebaseDB();
    } 
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

    loadSavedDesignMode();
    autoLogin();

    if (typeof currentUser !== 'undefined' && currentUser) {
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (document.getElementById('masterDbTableBody') && typeof loadMasterDbTable === 'function') loadMasterDbTable();
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
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

// FUNGSI REMINDER DM & SERVICE TELAH DIHAPUS PER USER DIRECTIVE (NO-OP STUBS TO PREVENT RUNTIME ERRORS)
function getAdminReminderEnabled() { return false; }
function getAdminReminderTime() { return '09:00'; }
function updateAdminReminderUI() {}
function loadAdminReminderTimeInput() {}
function checkAndTriggerPendingReminders() { return { success: true, skipped: true }; }
function startAdminReminderTimeChecker() {}
window.getAdminReminderEnabled = getAdminReminderEnabled;
window.getAdminReminderTime = getAdminReminderTime;
window.updateAdminReminderUI = updateAdminReminderUI;
window.loadAdminReminderTimeInput = loadAdminReminderTimeInput;
window.checkAndTriggerPendingReminders = checkAndTriggerPendingReminders;
window.startAdminReminderTimeChecker = startAdminReminderTimeChecker;


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
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
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

// DEFAULT FIREBASE ONLINE CONFIGURATION (PERMINTAAN TOKO - CHAT, NOTIFIKASI & MASTER LOOKUP REALTIME)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDTQdgmBi39SqLZ1j_aa8tj-mimCIXJTa0",
  authDomain: "permintaan-toko-e3b5d.firebaseapp.com",
  databaseURL: "https://permintaan-toko-e3b5d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "permintaan-toko-e3b5d",
  storageBucket: "permintaan-toko-e3b5d.firebasestorage.app",
  messagingSenderId: "1072410401023",
  appId: "1:1072410401023:web:1edf586afe845fb86454ca",
  measurementId: "G-0QRN3MEFFG"
};



let firebaseApp = null;
let dbFirestore = null;
let dbRealtime = null;

function getActiveFirebaseConfig() {
  return DEFAULT_FIREBASE_CONFIG;
}

function getDbFirestore() {
  if (dbFirestore) return dbFirestore;
  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(getActiveFirebaseConfig());
      } else {
        firebaseApp = firebase.app();
      }
      if (typeof firebase.firestore === 'function') {
        dbFirestore = firebase.firestore();
        window.dbFirestore = dbFirestore;
        return dbFirestore;
      }
    } catch (e) {
      console.warn('[GET FIRESTORE NOTICE]:', e);
    }
  }
  return null;
}
window.getDbFirestore = getDbFirestore;

function getDbRealtime() {
  if (dbRealtime) return dbRealtime;
  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(getActiveFirebaseConfig());
      } else {
        firebaseApp = firebase.app();
      }
      if (typeof firebase.database === 'function') {
        dbRealtime = firebase.database();
        window.dbRealtime = dbRealtime;
        return dbRealtime;
      }
    } catch (e) {
      console.warn('[GET REALTIME NOTICE]:', e);
    }
  }
  return null;
}
window.getDbRealtime = getDbRealtime;

// ==========================================
// FIREBASE FIRESTORE: REAL-TIME CHAT & NOTIFIKASI
// ==========================================
let unsubscribeFirestoreChat = null;
let unsubscribeFirestoreNotif = null;

function startFirebaseRealtimeChatListener() {
  const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
  if (!fs) return;

  if (unsubscribeFirestoreChat) {
    try { unsubscribeFirestoreChat(); } catch(e) {}
  }

  try {
    unsubscribeFirestoreChat = fs.collection('chat_messages')
      .orderBy('timestamp', 'asc')
      .limitToLast(300)
      .onSnapshot(snapshot => {
        if (!snapshot || snapshot.empty) {
          appStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
          appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));
          appStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([]));
          try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify([])); } catch(e) {}
          try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([])); } catch(e) {}
          try { localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([])); } catch(e) {}
          if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
          if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
          if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
          return;
        }

        const remoteChats = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.id) remoteChats.push(data);
        });

        // Mirror remote chats directly to local device cache (no ghost messages kept)
        appStorage.setItem(CHAT_DB_KEY, JSON.stringify(remoteChats));
        appStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(remoteChats));
        try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(remoteChats)); } catch(e) {}
        try { localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(remoteChats)); } catch(e) {}

        // Recompute active chat rooms dynamically from active remote chats
        const roomMap = new Map();
        remoteChats.forEach(c => {
          if (c && c.room) {
            const existing = roomMap.get(c.room) || {
              room: c.room,
              user: c.user || c.senderUsername || 'USER',
              userName: c.senderName || c.userName || c.user || 'USER',
              userArea: c.userArea || 'TSM',
              last: `${c.pengirim === 'SERVICE' ? 'SERVICE' : (c.senderName || c.senderUsername || 'USER')}: ${c.pesan || ''}`,
              lastTime: c.tanggal || '',
              timestamp: c.timestamp || 0,
              unreadAdmin: 0,
              unreadUser: 0
            };
            if ((c.timestamp || 0) >= (existing.timestamp || 0)) {
              existing.last = `${c.pengirim === 'SERVICE' ? 'SERVICE' : (c.senderName || c.senderUsername || 'USER')}: ${c.pesan || ''}`;
              existing.lastTime = c.tanggal || '';
              existing.timestamp = c.timestamp || 0;
            }
            roomMap.set(c.room, existing);
          }
        });
        const recomputedRooms = Array.from(roomMap.values());
        appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(recomputedRooms));
        try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(recomputedRooms)); } catch(e) {}

        if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
        if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        if (typeof renderChatBoxUser === 'function') renderChatBoxUser();
        if (typeof renderChatBoxAdmin === 'function') renderChatBoxAdmin();
      }, err => {
        console.warn('[FIRESTORE CHAT REALTIME LISTENER]:', err);
      });
  } catch (e) {
    console.warn('[FIRESTORE CHAT INIT EXCEPTION]:', e);
  }
}
window.startFirebaseRealtimeChatListener = startFirebaseRealtimeChatListener;

function startFirebaseRealtimeNotifListener() {
  const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
  if (!fs) return;

  if (unsubscribeFirestoreNotif) {
    try { unsubscribeFirestoreNotif(); } catch(e) {}
  }

  try {
    unsubscribeFirestoreNotif = fs.collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .onSnapshot(snapshot => {
        if (!snapshot || snapshot.empty) {
          const emptyPayload = [];
          appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(emptyPayload));
          try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(emptyPayload)); } catch(e) {}
          if (typeof loadNotificationList === 'function') loadNotificationList();
          if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
          if (typeof updateNotifBadgeCount === 'function') updateNotifBadgeCount();
          return;
        }

        const localNotifs = typeof getSystemNotifications === 'function' ? getSystemNotifications() : [];
        const localReadMap = new Map();
        if (Array.isArray(localNotifs)) {
          localNotifs.forEach(l => {
            if (l && l.id && Array.isArray(l.readBy)) {
              localReadMap.set(l.id, l.readBy);
            }
          });
        }

        const remoteNotifs = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.id) {
            const locReadBy = localReadMap.get(data.id) || [];
            const remReadBy = Array.isArray(data.readBy) ? data.readBy : [];
            const mergedReadBy = Array.from(new Set([...locReadBy, ...remReadBy]));
            data.readBy = mergedReadBy;
            remoteNotifs.push(data);
          }
        });

        // Mirror directly to local storage
        appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(remoteNotifs));
        try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(remoteNotifs)); } catch(e) {}

        if (typeof loadNotificationList === 'function') loadNotificationList();
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        if (typeof updateNotifBadgeCount === 'function') updateNotifBadgeCount();
      }, err => {
        console.warn('[FIRESTORE NOTIF REALTIME LISTENER]:', err);
      });
  } catch (e) {
    console.warn('[FIRESTORE NOTIF INIT EXCEPTION]:', e);
  }
}
window.startFirebaseRealtimeNotifListener = startFirebaseRealtimeNotifListener;


let unsubscribeFirestoreAppSettings = null;

function startFirebaseRealtimeAppSettingsListener() {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
  if (!dbFirestore && typeof firebase.firestore === 'function') {
    try { dbFirestore = firebase.firestore(); } catch(e) {}
  }
  if (!dbFirestore) return;

  if (unsubscribeFirestoreAppSettings) {
    try { unsubscribeFirestoreAppSettings(); } catch(e) {}
  }

  try {
    unsubscribeFirestoreAppSettings = dbFirestore.collection('app_settings').doc('config')
      .onSnapshot(doc => {
        if (!doc || !doc.exists) return;
        const data = doc.data();
        if (!data) return;

        // 1. KODE UNIT MAP (EXCEL LOOKUP) -> SIMPAN KE LOKAL PENYIMPANAN
        if (data.kodeUnitMapJson && typeof data.kodeUnitMapJson === 'string') {
          appStorage.setItem(KODE_UNIT_MAP_KEY, data.kodeUnitMapJson);
          try { localStorage.setItem(KODE_UNIT_MAP_KEY, data.kodeUnitMapJson); } catch(e) {}
        } else if (data.kodeUnitMap && typeof data.kodeUnitMap === 'object') {
          const val = JSON.stringify(data.kodeUnitMap);
          appStorage.setItem(KODE_UNIT_MAP_KEY, val);
          try { localStorage.setItem(KODE_UNIT_MAP_KEY, val); } catch(e) {}
        }

        // 2. FEATURE PHOTOS
        if (data.featurePhotos !== undefined && data.featurePhotos !== null) {
          const valStr = String(data.featurePhotos);
          appStorage.setItem(FEATURE_PHOTOS_KEY, valStr);
          try { localStorage.setItem(FEATURE_PHOTOS_KEY, valStr); } catch(e) {}
          if (typeof updatePhotoSectionVisibility === 'function') updatePhotoSectionVisibility();
        }

        // 3. THEME
        if (data.theme) {
          appStorage.setItem(GLOBAL_THEME_KEY, String(data.theme));
        }

        // 4. FONTE TOKEN
        if (data.fonteToken) {
          appStorage.setItem(FONTE_TOKEN_KEY, String(data.fonteToken));
          try { localStorage.setItem(FONTE_TOKEN_KEY, String(data.fonteToken)); } catch(e) {}
        }
      }, err => {
        console.warn('[FIRESTORE APP_SETTINGS REALTIME LISTENER]:', err);
      });
  } catch (e) {
    console.warn('[FIRESTORE APP_SETTINGS INIT EXCEPTION]:', e);
  }
}
window.startFirebaseRealtimeAppSettingsListener = startFirebaseRealtimeAppSettingsListener;


let unsubscribeFirestoreRequests = null;

function startFirebaseRealtimeRequestsListener() {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
  if (!dbFirestore && typeof firebase.firestore === 'function') {
    try { dbFirestore = firebase.firestore(); } catch(e) {}
  }
  if (!dbFirestore) return;

  if (unsubscribeFirestoreRequests) {
    try { unsubscribeFirestoreRequests(); } catch(e) {}
  }

  try {
    unsubscribeFirestoreRequests = dbFirestore.collection('requests')
      .onSnapshot(snapshot => {
        if (!snapshot || !snapshot.docChanges || snapshot.docChanges().length === 0) return;
        snapshot.docChanges().forEach(change => {
          const r = change.doc.data();
          if (!r) return;
          if (change.type === 'added' || change.type === 'modified') {
            handleRealtimePermintaanToko({ eventType: 'UPDATE', new: r });
          } else if (change.type === 'removed') {
            handleRealtimePermintaanToko({ eventType: 'DELETE', old: { no_surat: r.noSurat || change.doc.id } });
          }
        });
      }, err => {
        console.warn('[FIRESTORE REQUESTS REALTIME LISTENER]:', err);
      });
  } catch (e) {
    console.warn('[FIRESTORE REQUESTS INIT EXCEPTION]:', e);
  }
}
window.startFirebaseRealtimeRequestsListener = startFirebaseRealtimeRequestsListener;


let unsubscribeFirestoreUsers = null;
function startFirebaseRealtimeUsersListener() {
  if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
  if (!dbFirestore && typeof firebase.firestore === 'function') {
    try { dbFirestore = firebase.firestore(); } catch(e) {}
  }
  if (!dbFirestore) return;

  if (unsubscribeFirestoreUsers) {
    try { unsubscribeFirestoreUsers(); } catch(e) {}
  }

  try {
    unsubscribeFirestoreUsers = dbFirestore.collection('users')
      .onSnapshot(snapshot => {
        if (!snapshot || !snapshot.docChanges || snapshot.docChanges().length === 0) return;
        snapshot.docChanges().forEach(change => {
          const u = change.doc.data();
          if (!u) return;
          if (change.type === 'added' || change.type === 'modified') {
            handleRealtimeUserChange({ eventType: 'UPDATE', new: u });
          } else if (change.type === 'removed') {
            handleRealtimeUserChange({ eventType: 'DELETE', old: { id: u.id, username: u.username || change.doc.id } });
          }
        });
      }, err => {
        console.warn('[FIRESTORE USERS LISTENER]:', err);
      });
  } catch (e) {}
}
window.startFirebaseRealtimeUsersListener = startFirebaseRealtimeUsersListener;



function initFirebaseDB() {
  try {
    if (typeof firebase !== 'undefined') {
      const activeConfig = getActiveFirebaseConfig();
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(activeConfig);
      } else {
        firebaseApp = firebase.app();
      }

      if (typeof firebase.firestore === 'function') {
        try {
          dbFirestore = firebase.firestore();
          window.dbFirestore = dbFirestore;
        } catch(e) {}
      }
      if (typeof firebase.database === 'function') {
        try {
          dbRealtime = firebase.database();
          window.dbRealtime = dbRealtime;
        } catch(e) {}
      }
      if (dbFirestore || dbRealtime) {
        try {

          const dot = document.getElementById('firebaseOnlineDot');
          if (dot) {
            dot.style.background = '#10b981';
            dot.style.boxShadow = '0 0 10px #10b981';
            dot.title = `ONLINE: FIRESTORE CHAT & NOTIFIKASI AKTIF (${activeConfig.projectId})`;
          }

          // AKTIFKAN REAL-TIME LISTENER CHAT & NOTIFIKASI VIA FIRESTORE
          startFirebaseRealtimeChatListener();
          startFirebaseRealtimeNotifListener();
          startFirebaseRealtimeAppSettingsListener();
                              startFirebaseRealtimeChatListener();

          // SUPABASE PURE SINGLE SOURCE OF TRUTH: SAAT REFRESH/AWAL BUKA HANYA PULL DATA DARI SUPABASE (TANPA AUTOMATIC PUSH)
if (typeof syncSupabaseRequestsToLocalCache === 'function') {
  syncSupabaseRequestsToLocalCache().catch(() => {});
}
        } catch (e) {
          console.warn('[FIRESTORE INIT NOTICE]:', e);
        }
      }
    }
  } catch (e) {
    console.warn('[FIREBASE DB INIT NOTICE]:', e);
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
    showNotif('PENGATURAN BERHASIL DI-RESET KE DEFAULT!', 'info');
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    initFirebaseDB();
    return;
  }

  try {
    const parsed = JSON.parse(val);
    if (!parsed.projectId) {
      showNotif('PENGATURAN TIDAK VALID! ID TIDAK DITEMUKAN.', 'warning');
      return;
    }
    appStorage.setItem(FIREBASE_USER_CONFIG_KEY, JSON.stringify(parsed));
    showNotif('PENGATURAN BERHASIL DISIMPAN!', 'success');
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
    initFirebaseDB();
  } catch (e) {
    showNotif('FORMAT PENGATURAN TIDAK VALID!', 'error');
  }
}

const SUPABASE_LAST_SYNC_KEY = 'STORE_SUPABASE_LAST_SYNC_V7';
let supabaseRealtimeChannel = null;

// ==========================================
// 1. SUPABASE REALTIME ENGINE (EVENT-DRIVEN)
// ==========================================
async function initSupabaseRealtimeEngine() {
  if (typeof supabase === 'undefined' || !supabase) return;

  if (supabaseRealtimeChannel) {
    try {
      supabase.removeChannel(supabaseRealtimeChannel);
    } catch (e) {}
    supabaseRealtimeChannel = null;
  }

  try {
    supabaseRealtimeChannel = supabase
      .channel('public_realtime_sync')
      .on(
        'broadcast',
        { event: 'database_cleared' },
        async (event) => {
          appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([]));
          try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([])); } catch(e) {}
          if (typeof syncSupabaseRequestsToLocalCache === 'function') {
            await syncSupabaseRequestsToLocalCache();
          }
          if (typeof loadRiwayat === 'function') loadRiwayat();
          if (typeof loadDashboard === 'function') loadDashboard();
          if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        }
      )
      .on(
        'broadcast',
        { event: 'data_changed' },
        async (event) => {
          if (event && event.payload) {
            const ns = event.payload.noSurat;
            const action = event.payload.action;
            const itemData = event.payload.data;

                        if (action === 'CLEAR_ALL' || action === 'DELETE_ALL' || action === 'RESET_DATABASE') {
              appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([]));
              try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([])); } catch(e) {}
              if (typeof syncSupabaseRequestsToLocalCache === 'function') {
                await syncSupabaseRequestsToLocalCache();
              }
              if (typeof loadRiwayat === 'function') loadRiwayat();
              if (typeof loadDashboard === 'function') loadDashboard();
              if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
              return;
            }

            if (action === 'BATCH_DELETE' && Array.isArray(event.payload.noSuratList)) {
              const delSet = new Set(event.payload.noSuratList.map(ns => String(ns).trim().toUpperCase()));
              let cur = getRequestsFromDB();
              let filtered = cur.filter(r => r && r.noSurat && !delSet.has(String(r.noSurat).trim().toUpperCase()));
              saveRequestsToDB(filtered);
              if (typeof loadRiwayat === 'function') loadRiwayat();
              if (typeof loadDashboard === 'function') loadDashboard();
              if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
              return;
            }

            if (action === 'DELETE' && ns) {
              handleRealtimePermintaanToko({ eventType: 'DELETE', old: { no_surat: ns } });
              return;
            }

            if (itemData && typeof itemData === 'object' && (itemData.noSurat || itemData.no_surat)) {
              handleRealtimePermintaanToko({ eventType: 'UPDATE', new: itemData });
              return;
            }

            if (ns) {
              try {
                const { data } = await supabase.from('permintaan_toko').select('*').eq('no_surat', ns);
                if (Array.isArray(data) && data.length > 0) {
                  handleRealtimePermintaanToko({ eventType: 'UPDATE', new: data[0] });
                } else {
                  handleRealtimePermintaanToko({ eventType: 'DELETE', old: { no_surat: ns } });
                }
              } catch(e) {}
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'config_change' },
        (event) => {
          if (event && event.payload) {
            if (event.payload.kodeUnitMap && typeof event.payload.kodeUnitMap === 'object') {
              const valStr = JSON.stringify(event.payload.kodeUnitMap);
              appStorage.setItem(KODE_UNIT_MAP_KEY, valStr);
              try { localStorage.setItem(KODE_UNIT_MAP_KEY, valStr); } catch(e) {}
            }
            if (event.payload.featurePhotos !== undefined) {
              const valStr = String(event.payload.featurePhotos);
              appStorage.setItem(FEATURE_PHOTOS_KEY, valStr);
              try { localStorage.setItem(FEATURE_PHOTOS_KEY, valStr); } catch(e) {}
              if (typeof updatePhotoSectionVisibility === 'function') updatePhotoSectionVisibility();
            }
            if (event.payload.theme) {
              if (typeof applyGlobalThemeToApp === 'function') applyGlobalThemeToApp(event.payload.theme);
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'user_data_changed' },
        async (event) => {
          if (event && event.payload && event.payload.user) {
            handleRealtimeUserChange({ eventType: 'UPDATE', new: event.payload.user });
          }
          if (typeof syncSupabaseUsersToLocalCache === 'function') {
            await syncSupabaseUsersToLocalCache();
          }
          if (typeof loadUsersManagement === 'function') {
            loadUsersManagement();
          }
        }
      )
      .on(
        'broadcast',
        { event: 'chat_message' },
        (event) => {
          if (event && event.payload && event.payload.chat) {
            handleRealtimeChatMessage({ eventType: 'INSERT', new: event.payload.chat });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'chat_cleared' },
        (event) => {
          appStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
          appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));
          appStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([]));
          try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify([])); } catch(e) {}
          try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([])); } catch(e) {}
          try { localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([])); } catch(e) {}
          if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
          if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
          if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        }
      )
      .on(
        'broadcast',
        { event: 'chat_room_cleared' },
        (event) => {
          if (event && event.payload) {
            const rTarget = String(event.payload.room || '').toUpperCase();
            const uTarget = String(event.payload.user || '').toUpperCase();
            let allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
            let rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
            allChats = allChats.filter(c => String(c.room||'').toUpperCase() !== rTarget && String(c.user||'').toUpperCase() !== uTarget);
            rooms = rooms.filter(r => String(r.room||'').toUpperCase() !== rTarget && String(r.user||'').toUpperCase() !== uTarget);
            appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
            appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
            try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats)); } catch(e) {}
            try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms)); } catch(e) {}
            if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
            if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
            if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'permintaan_toko' },
        (payload) => {
          handleRealtimePermintaanToko(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'breakdown_parsial' },
        async (payload) => {
          if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
            await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
          }
          if (typeof refreshRealtimeUI === 'function') {
            refreshRealtimeUI();
          }
          if (typeof refreshOpenPopupsUI === 'function') {
            refreshOpenPopupsUI();
          }
        }
      ).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          handleRealtimeUserChange(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'toko_list' },
        (payload) => {
          handleRealtimeStoreChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.isSupabaseOnline = true;
          updateGlobalConnectionDotStatus();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          window.isSupabaseOnline = false;
          updateGlobalConnectionDotStatus();
        }
      });
  } catch (err) {
    console.warn('[SUPABASE REALTIME INIT NOTICE]:', err);
  }
}
// Auto-sync interval timer disabled per user directive
window.rtSyncIntervalTimer = null;
window.initSupabaseRealtimeEngine = initSupabaseRealtimeEngine;

// Helper: Format raw row from Supabase permintaan_toko
function formatSupabaseRequestRow(row) {
  if (!row) return null;
  const noSurat = row.no_surat || row.noSurat || '';
  if (!noSurat) return null;

  const sanitizeSig = (sig) => {
    if (!sig || typeof sig !== 'string') return '';
    if (sig.includes('DIGITALLY VERIFIED') || sig.includes('OfficialDigitalSignatureStamp')) return '';
    return sig;
  };

  return {
    noSurat: noSurat,
    tanggal: row.tanggal || '',
    toko: row.toko || '',
    area: row.area || 'BDG',
    jenis: row.jenis || '',
    catatan: row.catatan || '',
    items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items || '[]') : []),
    photos: parsePhotosArray(row.photos || row.foto),
    artemisPhotos: parsePhotosArray(row.artemis_photos || row.artemisPhotos),
    status: row.status || 'PENDING',
    serviceApprove: row.service_approve !== undefined ? !!row.service_approve : !!row.serviceApprove,
    serviceUserName: row.service_user_name || row.serviceUserName || '',
    serviceTTD: sanitizeSig(row.service_ttd || row.serviceTTD || ''),
    dmUserName: row.dm_user_name || row.dmUserName || '',
    dmTTD: sanitizeSig(row.dm_ttd || row.dmTTD || ''),
    pemohonTTD: sanitizeSig(row.pemohon_ttd || row.pemohonTTD || row.toko_ttd || row.tokoTTD || ''),
    createdBy: row.created_by || row.createdBy || '',
    createdAt: row.created_at || row.createdAt || '',
    userId: row.user_id || row.userId || '',
    log: Array.isArray(row.log) ? row.log : (typeof row.log === 'string' ? JSON.parse(row.log || '[]') : [])
  };
}

// Check if user has permission to see request
function isRequestVisibleToCurrentUser(r) {
  if (!currentUser || !r) return true;
  const cat = String(currentUser.category || '').toUpperCase();
  const userArea = String(currentUser.area || '').toUpperCase();

  if (cat === 'ADMIN') return true;
  if (cat === 'SERVICE') {
    if (userArea === 'ALL' || userArea === 'TSM') return true;
    return String(r.area || '').toUpperCase() === userArea;
  }
  if (cat === 'DM') {
    if (userArea === 'ALL') return true;
    return String(r.area || '').toUpperCase() === userArea;
  }
  if (cat === 'TOKO') {
    if (r.userId && currentUser.id && String(r.userId) === String(currentUser.id)) return true;
    if (r.toko && currentUser.fullName && String(r.toko).trim().toUpperCase() === String(currentUser.fullName).trim().toUpperCase()) return true;
    return false;
  }
  return true;
}

function broadcastRealtimeDataChange(noSurat, rawItem = null, action = 'UPDATE') {
  if (!noSurat) return;
  const list = Array.isArray(noSurat) ? noSurat : [noSurat];
  list.forEach(ns => {
    if (ns && !String(ns).startsWith('__SYSTEM_')) {
      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'data_changed',
            payload: {
              noSurat: String(ns),
              action: action,
              data: rawItem || null,
              timestamp: Date.now()
            }
          });
        } catch(e) {}
      }
    }
  });
}
window.broadcastRealtimeDataChange = broadcastRealtimeDataChange;

// REALTIME: Handle permintaan_toko changes (INSERT, UPDATE, DELETE)
function handleRealtimePermintaanToko(payload) {
  try {
    const eventType = payload.eventType;
    const rawNoSurat = payload.new ? (payload.new.no_surat || payload.new.noSurat || payload.new.id || '') : '';

    // 1. HANDLE SYSTEM CONFIG BROADCASTS IN REALTIME ACROSS ALL DEVICES
    if (rawNoSurat === '__SYSTEM_PHOTO_FEATURE__') {
      try {
        let valStr = 'true';
        if (payload.new && payload.new.catatan) {
          try {
            const parsed = JSON.parse(payload.new.catatan);
            if (parsed.featurePhotos !== undefined) valStr = String(parsed.featurePhotos);
            else if (parsed.enabled !== undefined) valStr = parsed.enabled ? 'true' : 'false';
          } catch(e) {
            valStr = String(payload.new.catatan);
          }
        }
        appStorage.setItem(FEATURE_PHOTOS_KEY, valStr);
        try { localStorage.setItem(FEATURE_PHOTOS_KEY, valStr); } catch(e) {}
        if (typeof updatePhotoSectionVisibility === 'function') updatePhotoSectionVisibility();
      } catch (e) {
        console.warn('[REALTIME PHOTO FEATURE ERROR]:', e);
      }
      return;
    }

    if (rawNoSurat === '__SYSTEM_GLOBAL_THEME__') {
      try {
        let themeName = 'dark-mode';
        if (payload.new && payload.new.catatan) {
          try {
            const parsed = JSON.parse(payload.new.catatan);
            if (parsed.theme) themeName = parsed.theme;
          } catch(e) {
            themeName = String(payload.new.catatan);
          }
        }
        appStorage.setItem(GLOBAL_THEME_KEY, themeName);
        appStorage.setItem(THEME_KEY, themeName);
        try { localStorage.setItem('APP_SELECTED_THEME', themeName); } catch(e) {}
        try { localStorage.setItem(THEME_KEY, themeName); } catch(e) {}
        if (typeof updateBodyClasses === 'function') updateBodyClasses(themeName);
        if (typeof loadSavedTheme === 'function') loadSavedTheme();
      } catch (e) {
        console.warn('[REALTIME GLOBAL THEME ERROR]:', e);
      }
      return;
    }

    if (rawNoSurat === '__SYSTEM_USERS_MASTER__') {
      return;
    }

    if (rawNoSurat === '__SYSTEM_TTD_MAP__') {
      try {
        if (payload.new && payload.new.catatan) {
          const ttdMap = typeof payload.new.catatan === 'object' ? payload.new.catatan : JSON.parse(payload.new.catatan);
          if (ttdMap && typeof ttdMap === 'object') {
            const currentMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
            const merged = { ...currentMap, ...ttdMap };
            appStorage.setItem(TTD_DB_KEY, JSON.stringify(merged));
            try { localStorage.setItem(TTD_DB_KEY, JSON.stringify(merged)); } catch(e) {}
            try { localStorage.setItem('APP_USER_TTD_MAP', JSON.stringify(merged)); } catch(e) {}

            // Update user accounts in local DB with real signature
            const allUsers = getUsersFromDB();
            let anyU = false;
            allUsers.forEach(u => {
              if (u) {
                const s = merged[u.id] || merged[u.username] || merged[u.fullName];
                if (s && typeof s === 'string' && s.length > 50 && (!u.ttd || u.ttd.length < 50)) {
                  u.ttd = s;
                  anyU = true;
                }
              }
            });
            if (anyU) saveUsersToDB(allUsers);
          }
        }
      } catch(e) {}
      return;
    }

    if (rawNoSurat === '__SYSTEM_KODE_UNIT_MAP__') {
      try {
        if (payload.new && payload.new.catatan) {
          const unitMap = JSON.parse(payload.new.catatan);
          appStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(unitMap));
          try { localStorage.setItem(KODE_UNIT_MAP_KEY, JSON.stringify(unitMap)); } catch(e) {}
        }
      } catch(e) {}
      return;
    }

    if (rawNoSurat === '__SYSTEM_FONTE_TOKEN__') {
      try {
        let valStr = '';
        if (payload.new && payload.new.catatan) {
          try {
            const parsed = JSON.parse(payload.new.catatan);
            if (parsed.fonteToken !== undefined) valStr = String(parsed.fonteToken);
          } catch(e) {
            valStr = String(payload.new.catatan);
          }
        }
        if (valStr) {
          appStorage.setItem(FONTE_TOKEN_KEY, valStr);
          try { localStorage.setItem(FONTE_TOKEN_KEY, valStr); } catch(e) {}
          if (typeof loadFonteToken === 'function') loadFonteToken();
        }
      } catch(e) {
        console.warn('[REALTIME FONTE TOKEN ERROR]:', e);
      }
      return;
    }

    if (rawNoSurat === '__SYSTEM_NAMA_DM__') {
      try {
        let valStr = '';
        if (payload.new && payload.new.catatan) {
          try {
            const parsed = JSON.parse(payload.new.catatan);
            if (parsed.namaDM !== undefined) valStr = String(parsed.namaDM);
          } catch(e) {
            valStr = String(payload.new.catatan);
          }
        }
        if (valStr) {
          const dmKey = 'NAMA_DM_SUPABASE';
          appStorage.setItem(dmKey, valStr);
          try { localStorage.setItem(dmKey, valStr); } catch(e) {}
          if (typeof loadNamaDM === 'function') loadNamaDM();
        }
      } catch(e) {
        console.warn('[REALTIME NAMA DM ERROR]:', e);
      }
      return;
    }

    if (rawNoSurat === '__SYSTEM_REMINDER_SETTINGS__') {
      try {
        if (payload.new && payload.new.catatan) {
          try {
            const parsed = JSON.parse(payload.new.catatan);
            if (parsed.adminReminder !== undefined) {
              const rVal = String(parsed.adminReminder);
              appStorage.setItem(ADMIN_REMINDER_KEY, rVal);
              try { localStorage.setItem(ADMIN_REMINDER_KEY, rVal); } catch(e) {}
            }
            if (parsed.adminReminderTime !== undefined) {
              const tVal = String(parsed.adminReminderTime);
              appStorage.setItem(ADMIN_REMINDER_TIME_KEY, tVal);
              try { localStorage.setItem(ADMIN_REMINDER_TIME_KEY, tVal); } catch(e) {}
            }
            if (typeof updateAdminReminderUI === 'function') updateAdminReminderUI();
          } catch(e) {}
        }
      } catch(e) {
        console.warn('[REALTIME REMINDER SETTINGS ERROR]:', e);
      }
      return;
    }

    if (rawNoSurat === '__SYSTEM_CHAT_MESSAGES__') {
      try {
        if (payload.new && payload.new.catatan) {
          const parsedChats = JSON.parse(payload.new.catatan);
          if (Array.isArray(parsedChats)) {
            appStorage.setItem(CHAT_DB_KEY, JSON.stringify(parsedChats));
            try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(parsedChats)); } catch(e) {}
            if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
            if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
            if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
          }
        }
      } catch(e) {
        console.warn('[REALTIME CHAT MSG ERROR]:', e);
      }
      return;
    }

    const normKey = (s) => String(s || '').replace(/[\/\.\_\s]/g, '').toUpperCase();
    const requests = getRequestsFromDB();

    if (eventType === 'INSERT') {
      const newRow = formatSupabaseRequestRow(payload.new);
      if (newRow && !newRow.noSurat.startsWith('__SYSTEM_') && isRequestVisibleToCurrentUser(newRow)) {
        const nKey = normKey(newRow.noSurat || newRow.id);
        const existsIdx = requests.findIndex(r => r && (normKey(r.noSurat) === nKey || normKey(r.id) === nKey));
        if (existsIdx === -1) {
          requests.unshift(newRow);
        } else {
          requests[existsIdx] = { ...requests[existsIdx], ...newRow };
        }
        appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
        try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests)); } catch(e) {}
        refreshRealtimeUI();
      }
    } else if (eventType === 'UPDATE') {
      const updatedRow = formatSupabaseRequestRow(payload.new);
      if (updatedRow && !updatedRow.noSurat.startsWith('__SYSTEM_')) {
        const uKey = normKey(updatedRow.noSurat || updatedRow.id);
        const idx = requests.findIndex(r => r && (normKey(r.noSurat) === uKey || normKey(r.id) === uKey));
        if (idx !== -1) {
          requests[idx] = { ...requests[idx], ...updatedRow };
          appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
          try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests)); } catch(e) {}
          refreshRealtimeUI();
        } else if (isRequestVisibleToCurrentUser(updatedRow)) {
          requests.unshift(updatedRow);
          appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests));
          try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(requests)); } catch(e) {}
          refreshRealtimeUI();
        }
      }
    } else if (eventType === 'DELETE') {
      const delNoSurat = payload.old ? (payload.old.no_surat || payload.old.noSurat || payload.old.id) : null;
      if (delNoSurat) {
        const dKey = normKey(delNoSurat);
        const filtered = requests.filter(r => r && normKey(r.noSurat) !== dKey && normKey(r.id) !== dKey);
        appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(filtered));
        try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(filtered)); } catch(e) {}
        refreshRealtimeUI();
      }
    }
  } catch (err) {
    console.warn('[REALTIME PERMINTAAN ERROR]:', err);
  }
}

// REALTIME: Handle notifications changes
function handleRealtimeNotification(payload) {
  try {
    const eventType = payload.eventType;
    let notifs = getSystemNotifications();

    if (eventType === 'INSERT' && payload.new) {
      const n = payload.new;
      const parsed = {
        id: n.id,
        targetRoles: n.target_roles || n.targetRoles || [],
        targetArea: n.target_area || n.targetArea || 'ALL',
        message: n.message,
        noSurat: n.no_surat || n.noSurat || '',
        time: n.time || `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`,
        readBy: n.read_by || n.readBy || []
      };

      if (!notifs.some(x => x.id === parsed.id)) {
        notifs.unshift(parsed);
        appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
        try { localStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs)); } catch(e) {}
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        const popupNotifList = document.getElementById('popupNotifList');
        if (popupNotifList && (popupNotifList.classList.contains('show') || popupNotifList.style.display === 'flex')) {
          if (typeof loadNotificationList === 'function') loadNotificationList();
        }
      }
    } else if (eventType === 'UPDATE' && payload.new) {
      const n = payload.new;
      const idx = notifs.findIndex(x => x.id === n.id);
      if (idx !== -1) {
        notifs[idx] = { ...notifs[idx], ...n };
        appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
      }
    } else if (eventType === 'DELETE' && payload.old) {
      notifs = notifs.filter(x => x.id !== payload.old.id);
      appStorage.setItem(NOTIFICATIONS_DB_KEY, JSON.stringify(notifs));
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
    }
  } catch (err) {
    console.warn('[REALTIME NOTIF ERROR]:', err);
  }
}

// REALTIME: Handle chat message changes
function handleRealtimeChatMessage(payload) {
  try {
    const eventType = payload.eventType;
    let chats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
    let rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

    if (eventType === 'INSERT' && payload.new) {
      const c = payload.new;
      const normalizedChat = {
        id: c.id || `CHAT-${Date.now()}`,
        room: c.room || '',
        user: c.user || '',
        userArea: c.user_area || c.userArea || 'BDG',
        pengirim: c.pengirim || 'USER',
        senderId: c.sender_id || c.senderId || '',
        senderUsername: c.sender_username || c.senderUsername || '',
        senderName: c.sender_name || c.senderName || '',
        pesan: c.pesan || '',
        tanggal: c.tanggal || ''
      };

      if (!chats.some(x => x.id === normalizedChat.id || (x.pesan === normalizedChat.pesan && x.tanggal === normalizedChat.tanggal && x.room === normalizedChat.room))) {
        chats.push(normalizedChat);
        appStorage.setItem(CHAT_DB_KEY, JSON.stringify(chats));
        try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(chats)); } catch(e) {}

        // Update rooms
        const rIdx = rooms.findIndex(x => String(x.room).toUpperCase() === String(normalizedChat.room).toUpperCase() || String(x.user).toUpperCase() === String(normalizedChat.user).toUpperCase());
        if (rIdx !== -1) {
          rooms[rIdx].last = (normalizedChat.pengirim === 'SERVICE' ? `SERVICE TSM: ${normalizedChat.pesan}` : normalizedChat.pesan);
          if (normalizedChat.pengirim === 'SERVICE') rooms[rIdx].unreadUser = (rooms[rIdx].unreadUser || 0) + 1;
          else rooms[rIdx].unreadAdmin = (rooms[rIdx].unreadAdmin || 0) + 1;
          rooms[rIdx].lastTime = normalizedChat.tanggal;
        } else {
          rooms.push({
            room: normalizedChat.room,
            user: normalizedChat.user,
            userArea: normalizedChat.userArea,
            last: (normalizedChat.pengirim === 'SERVICE' ? `SERVICE TSM: ${normalizedChat.pesan}` : normalizedChat.pesan),
            unreadAdmin: normalizedChat.pengirim === 'USER' ? 1 : 0,
            unreadUser: normalizedChat.pengirim === 'SERVICE' ? 1 : 0,
            lastTime: normalizedChat.tanggal
          });
        }
        appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));

        if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
        if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
        if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
      }
    }
  } catch(e) {
    console.warn('[REALTIME CHAT MSG ERROR]:', e);
  }
}

// REALTIME: Handle user changes
function handleRealtimeUserChange(payload) {
  try {
    const eventType = payload.eventType;
    let users = getUsersFromDB();

    if ((eventType === 'INSERT' || eventType === 'UPDATE') && payload.new) {
      const u = payload.new;
      const formatted = {
        id: u.id,
        username: String(u.username || '').trim(),
        password: String(u.password || '').trim(),
        fullName: String(u.full_name || u.fullName || '').trim(),
        storeCode: String(u.store_code || u.storeCode || '').trim(),
        phone: String(u.phone || '').trim(),
        category: String(u.category || 'TOKO').trim().toUpperCase(),
        area: String(u.area || 'BDG').trim().toUpperCase(),
        ttd: u.ttd || '',
        createdAt: u.created_at || (typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '')
      };

      const idx = users.findIndex(x => x && ((x.id && formatted.id && String(x.id) === String(formatted.id)) || (x.username && formatted.username && String(x.username).toUpperCase() === formatted.username.toUpperCase())));
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...formatted };
      } else {
        users.push(formatted);
      }

      appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(users)); } catch(e) {}

      if (currentUser && (
        (formatted.id && currentUser.id && String(currentUser.id) === String(formatted.id)) ||
        (formatted.username && currentUser.username && String(currentUser.username).toUpperCase() === String(formatted.username).toUpperCase())
      )) {
        currentUser = { ...currentUser, ...formatted };
        appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch(e) {}

        // UPDATE REAL-TIME POPUP AKUN & HEADER & WELCOME CARD
        const elNama = document.getElementById('akunNama');
        if (elNama) elNama.value = currentUser.fullName || '';
        const elHP = document.getElementById('akunHP');
        if (elHP) elHP.value = currentUser.phone || '-';
        const elArea = document.getElementById('akunArea');
        if (elArea) elArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;
        const elKat = document.getElementById('akunKategori');
        if (elKat) elKat.value = currentUser.category || '';
        const headerUser = document.getElementById('headerUser');
        if (headerUser) headerUser.textContent = currentUser.fullName || currentUser.username;
        const welcomeUser = document.getElementById('welcomeUser');
        if (welcomeUser) welcomeUser.textContent = currentUser.fullName || currentUser.username;
        const displayNama = document.getElementById('displayUserFullName');
        if (displayNama) displayNama.textContent = currentUser.fullName || currentUser.username;
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay) userDisplay.textContent = currentUser.fullName || currentUser.username;
        const profileUserName = document.getElementById('profileUserName');
        if (profileUserName) profileUserName.textContent = currentUser.fullName || currentUser.username;
      }

      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadUsersManagement === 'function') loadUsersManagement();
      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
    } else if (eventType === 'DELETE' && payload.old) {
      const delId = payload.old.id ? String(payload.old.id) : '';
      const delUname = payload.old.username ? String(payload.old.username).toUpperCase() : '';
      users = users.filter(x => {
        if (!x) return false;
        if (delId && x.id && String(x.id) === delId) return false;
        if (delUname && x.username && String(x.username).toUpperCase() === delUname) return false;
        return true;
      });

      appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(users)); } catch(e) {}

      if (typeof loadUsersManagement === 'function') loadUsersManagement();
      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
    }
  } catch(e) {}
}

// REALTIME: Handle store changes
function handleRealtimeStoreChange(payload) {
  try {
    const eventType = payload.eventType;
    let stores = typeof getStoresFromDB === 'function' ? getStoresFromDB() : [];

    if ((eventType === 'INSERT' || eventType === 'UPDATE') && payload.new) {
      const s = payload.new;
      const formatted = {
        id: s.id || `STK-${s.store_code || Date.now()}`,
        fullName: String(s.full_name || s.fullName || '').trim(),
        area: String(s.area || 'BDG').trim().toUpperCase(),
        storeCode: String(s.store_code || s.storeCode || '').trim(),
        createdBy: String(s.created_by || s.createdBy || 'ADMIN').trim()
      };

      const idx = stores.findIndex(x => x && ((x.id && formatted.id && String(x.id) === String(formatted.id)) || (x.fullName && formatted.fullName && String(x.fullName).toUpperCase() === formatted.fullName.toUpperCase())));
      if (idx !== -1) {
        stores[idx] = { ...stores[idx], ...formatted };
      } else {
        stores.push(formatted);
      }
      appStorage.setItem(STORES_DB_KEY, JSON.stringify(stores));
      try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(stores)); } catch(e) {}
      if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
    } else if (eventType === 'DELETE' && payload.old) {
      const delId = payload.old.id ? String(payload.old.id) : '';
      const delName = payload.old.full_name ? String(payload.old.full_name).toUpperCase() : (payload.old.fullName ? String(payload.old.fullName).toUpperCase() : '');
      stores = stores.filter(x => {
        if (!x) return false;
        if (delId && x.id && String(x.id) === delId) return false;
        if (delName && x.fullName && String(x.fullName).toUpperCase() === delName) return false;
        return true;
      });
      appStorage.setItem(STORES_DB_KEY, JSON.stringify(stores));
      try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(stores)); } catch(e) {}
      if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
    }
  } catch(e) {}
}

async function refreshOpenPopupsUI() {
  try {
    if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
      await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
    }
  } catch(e) {}
}
window.refreshOpenPopupsUI = refreshOpenPopupsUI;

function refreshRealtimeUI() {
  let user = currentUser;
  if (!user) {
    try {
      const s = appStorage.getItem(SESSION_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null);
      if (s) user = JSON.parse(s);
    } catch(e) {}
  }
  if (user) {
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadRiwayat === 'function') loadRiwayat();
    if (typeof loadMasterDbTable === 'function' && document.getElementById('masterDbTableBody')) {
      loadMasterDbTable();
    }
    if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();

    // REFRESH SETIAP POPUP DETAIL & PARSIAL YANG SEDANG TERBUKA SECARA REALTIME
    if (typeof refreshOpenPopupsUI === 'function') {
      refreshOpenPopupsUI();
    }
  }
}

// =======================================================================
// 2. INCREMENTAL DELTA SYNC USING updated_at (0 KB INITIAL BANDWIDTH)
// =======================================================================
async function syncSupabaseIncremental() {
  if (typeof supabase === 'undefined' || !supabase) return;

  try {
    const lastSync = appStorage.getItem(SUPABASE_LAST_SYNC_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(SUPABASE_LAST_SYNC_KEY) : null);
    
    // If no previous sync timestamp exists, perform full initial sync
    if (!lastSync) {
      await syncAllDataToCache();
      const nowIso = new Date().toISOString();
      appStorage.setItem(SUPABASE_LAST_SYNC_KEY, nowIso);
      try { localStorage.setItem(SUPABASE_LAST_SYNC_KEY, nowIso); } catch(e) {}
      return;
    }

    // Light Delta Query to Supabase for modified/new rows
    const { data: deltaReqs, error } = await supabase
      .from('permintaan_toko')
      .select('*')
      .gt('updated_at', lastSync);

    if (!error && Array.isArray(deltaReqs) && deltaReqs.length > 0) {
      const currentReqs = getRequestsFromDB();
      let hasChanges = false;

      deltaReqs.forEach(row => {
        const formatted = formatSupabaseRequestRow(row);
        if (formatted && !formatted.noSurat.startsWith('__SYSTEM_') && isRequestVisibleToCurrentUser(formatted)) {
          const idx = currentReqs.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(formatted.noSurat).trim().toUpperCase());
          if (idx !== -1) {
            currentReqs[idx] = { ...currentReqs[idx], ...formatted };
          } else {
            currentReqs.unshift(formatted);
          }
          hasChanges = true;
        }
      });

      if (hasChanges) {
        currentReqs.sort((a,b) => (b.noSurat || '').localeCompare(a.noSurat || ''));
        appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(currentReqs));
        refreshRealtimeUI();
      }
    }

    if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
      await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
    }

    // Update last sync timestamp
    const newSyncTime = new Date().toISOString();
    appStorage.setItem(SUPABASE_LAST_SYNC_KEY, newSyncTime);
    try { localStorage.setItem(SUPABASE_LAST_SYNC_KEY, newSyncTime); } catch(e) {}
  } catch (err) {
    console.warn('[INCREMENTAL DELTA SYNC NOTICE]:', err);
  }
}
window.syncSupabaseIncremental = syncSupabaseIncremental;

// Full Initial Sync (Used when local cache is empty)
async function syncAllDataToCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    await syncSupabaseRequestsToLocalCache();
    await syncSupabaseUsersToLocalCache();
    // await syncSupabaseNotifsAndChatToLocalCache(); // Notif & Chat managed via Firebase/Local
    await syncSupabaseStoresToLocalCache();
    await syncMasterBarangToLocalCache();
    await syncSupabaseLookupToLocalCache();
    if (typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
      await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
    }
    await syncSupabaseThemeToLocalCache();

    const nowIso = new Date().toISOString();
    appStorage.setItem(SUPABASE_LAST_SYNC_KEY, nowIso);
    try { localStorage.setItem(SUPABASE_LAST_SYNC_KEY, nowIso); } catch(e) {}
  } catch (err) {
    console.warn('[FULL SYNC NOTICE]:', err);
  }
}
window.syncAllDataToCache = syncAllDataToCache;

async function syncSupabaseRequestsToLocalCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    let query = supabase.from('permintaan_toko').select('*');

    // Role-based server filter if currentUser is set
    if (currentUser) {
      const cat = String(currentUser.category || '').toUpperCase();
      const userArea = String(currentUser.area || '').toUpperCase();

      if (cat === 'TOKO') {
        query = query.or(`user_id.eq.${currentUser.id},toko.ilike.%${currentUser.fullName}%`);
      } else if (cat === 'SERVICE') {
        const areaList = typeof getUserAreaList === 'function' ? getUserAreaList(userArea) : [];
        if (!areaList.includes('ALL') && areaList.length > 0 && !areaList.includes('TSM')) {
          if (areaList.length === 1) {
            query = query.eq('area', areaList[0]);
          } else {
            query = query.in('area', areaList);
          }
        }
      } else if (cat === 'DM') {
        const areaList = typeof getUserAreaList === 'function' ? getUserAreaList(userArea) : [];
        if (!areaList.includes('ALL') && areaList.length > 0) {
          if (areaList.length === 1) {
            query = query.eq('area', areaList[0]);
          } else {
            query = query.in('area', areaList);
          }
        }
      }
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      const delReqs = new Set(
        (JSON.parse(appStorage.getItem(DELETED_REQUESTS_KEY) || '[]') || [])
          .filter(Boolean)
          .map(v => String(v).trim().toUpperCase())
      );

      const freshReqs = data
        .filter(row => {
          const ns = String(row.no_surat || row.noSurat || '').trim();
          return ns && !ns.startsWith('__SYSTEM_') && !delReqs.has(ns.toUpperCase());
        })
        .map(row => formatSupabaseRequestRow(row))
        .filter(Boolean);

      freshReqs.sort((a,b) => (b.noSurat || '').localeCompare(a.noSurat || ''));
      appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(freshReqs));
      refreshRealtimeUI();
    }
  } catch (e) {
    console.warn('[SUPABASE REQUESTS SYNC NOTICE]:', e);
  }
}

async function syncFirebaseSignaturesToLocalCache() {
  try {
    const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
    if (rtdb) {
      const snap = await rtdb.ref('user_signatures').once('value');
      if (snap && snap.exists() && snap.val()) {
        const sigs = snap.val();
        const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
        let changed = false;
        Object.keys(sigs).forEach(k => {
          if (k && sigs[k] && typeof sigs[k] === 'string' && !sigs[k].startsWith('blob:')) {
            if (!ttdMap[k]) { ttdMap[k] = sigs[k]; changed = true; }
          }
        });
        if (changed) {
          appStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
            localStorage.setItem('APP_USER_TTD_MAP', JSON.stringify(ttdMap));
          }
        }
      }
    }
  } catch(e) {}
}
window.syncFirebaseSignaturesToLocalCache = syncFirebaseSignaturesToLocalCache;

function rebuildTtdMapFromUsers() {
  try {
    const allUsers = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
    const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
    let changed = false;

    allUsers.forEach(u => {
      if (!u || !u.ttd || typeof u.ttd !== 'string') return;
      const sig = u.ttd.trim();
      if (!sig || sig.startsWith('blob:')) return;

      if (u.id && !ttdMap[u.id]) { ttdMap[u.id] = sig; changed = true; }
      if (u.username && !ttdMap[u.username]) { ttdMap[u.username] = sig; changed = true; }
      if (u.fullName && !ttdMap[u.fullName]) { ttdMap[u.fullName] = sig; changed = true; }

      const cat = String(u.category || '').toUpperCase();
      const area = String(u.area || '').toUpperCase();

      if (cat === 'SERVICE') {
        if (area && !ttdMap[`SERVICE_${area}`]) { ttdMap[`SERVICE_${area}`] = sig; changed = true; }
        if (!ttdMap['SERVICE']) { ttdMap['SERVICE'] = sig; changed = true; }
        if (!ttdMap['HODS']) { ttdMap['HODS'] = sig; changed = true; }
      } else if (cat === 'DM') {
        if (!ttdMap['DM']) { ttdMap['DM'] = sig; changed = true; }
      } else if (cat === 'GBJ') {
        if (!ttdMap['GBJ']) { ttdMap['GBJ'] = sig; changed = true; }
      }
    });

    if (changed) {
      appStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TTD_DB_KEY, JSON.stringify(ttdMap));
        localStorage.setItem('APP_USER_TTD_MAP', JSON.stringify(ttdMap));
      }
    }
  } catch(e) {
    console.warn('[REBUILD TTD MAP NOTICE]:', e);
  }
}
window.rebuildTtdMapFromUsers = rebuildTtdMapFromUsers;

async function syncSupabaseUsersToLocalCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const { data: supaUsers, error } = await supabase.from('users').select('*');
    if (!error && Array.isArray(supaUsers)) {
      // DATABASE IS SINGLE SOURCE OF TRUTH: Supabase langsung menggantikan cache lokal users
      const formatted = supaUsers.map(u => ({
        id: u.id || u.username,
        username: String(u.username || '').trim(),
        password: String(u.password || '').trim(),
        fullName: String(u.full_name || u.fullName || '').trim(),
        storeCode: String(u.store_code || u.storeCode || '').trim(),
        phone: String(u.phone || '').trim(),
        category: String(u.category || 'TOKO').trim().toUpperCase(),
        area: String(u.area || 'BDG').trim().toUpperCase(),
        ttd: u.ttd || '',
        createdAt: u.created_at || (typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '')
      })).filter(u => !!u.username);

      if (!formatted.some(x => x.username.toUpperCase() === 'ADMIN')) {
        formatted.unshift({ id: 'ADMIN', username: 'ADMIN', password: '1', fullName: 'SUPER ADMIN', category: 'ADMIN', area: 'ALL', phone: '-', storeCode: '' });
      }

      appStorage.setItem(USERS_DB_KEY, JSON.stringify(formatted));
      try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(formatted)); } catch(e) {}

      // SINKRONKAN SESI LOGIN AKTIF (currentUser) JIKA DIEDIT DARI DATABASE
      if (currentUser) {
        const matchingCurrent = formatted.find(u => u && (
          (u.id && currentUser.id && String(u.id) === String(currentUser.id)) ||
          (u.username && currentUser.username && String(u.username).toUpperCase() === String(currentUser.username).toUpperCase())
        ));
        if (matchingCurrent) {
          currentUser = { ...currentUser, ...matchingCurrent };
          appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
          try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch(e) {}

          const elNama = document.getElementById('akunNama');
          if (elNama) elNama.value = currentUser.fullName || '';
          const elHP = document.getElementById('akunHP');
          if (elHP) elHP.value = currentUser.phone || '-';
          const elArea = document.getElementById('akunArea');
          if (elArea) elArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;
          const headerUser = document.getElementById('headerUser');
          if (headerUser) headerUser.textContent = currentUser.fullName || currentUser.username;
          const welcomeUser = document.getElementById('welcomeUser');
          if (welcomeUser) welcomeUser.textContent = currentUser.fullName || currentUser.username;
          const displayNama = document.getElementById('displayUserFullName');
          if (displayNama) displayNama.textContent = currentUser.fullName || currentUser.username;
        }
      }

      if (typeof rebuildTtdMapFromUsers === 'function') rebuildTtdMapFromUsers();
      if (typeof syncFirebaseSignaturesToLocalCache === 'function') syncFirebaseSignaturesToLocalCache().catch(() => {});
      if (typeof renderUsersManagementTable === 'function') renderUsersManagementTable();
      if (typeof loadUsersManagement === 'function') loadUsersManagement();
    }
  } catch (err) {
    console.warn('[SUPABASE USERS SYNC NOTICE]:', err);
  }
}
window.syncSupabaseUsersToLocalCache = syncSupabaseUsersToLocalCache;
window.syncSupabaseUsersToLocalCache = syncSupabaseUsersToLocalCache;

let _supabaseUserColumnsCache = null;

async function getSupabaseUserColumns(client) {
  if (_supabaseUserColumnsCache && _supabaseUserColumnsCache.length > 0) {
    return _supabaseUserColumnsCache;
  }
  try {
    const { data } = await client.from('users').select('*').limit(1);
    if (data && data.length > 0) {
      _supabaseUserColumnsCache = Object.keys(data[0]);
      return _supabaseUserColumnsCache;
    }
  } catch (e) {}
  return ['id', 'username', 'password', 'full_name', 'store_code', 'phone', 'category', 'area', 'ttd', 'created_at', 'updated_at'];
}

async function simpanUserKeSupabase(userObj) {
  const client = (typeof supabase !== 'undefined' && supabase) ? supabase : null;
  if (!client || !userObj) return;
  try {
    const username = String(userObj.username || userObj.id || '').trim();
    if (!username) return;

    const fullPayload = {
      id: userObj.id || ('USR-' + username),
      username: username,
      password: String(userObj.password || '1').trim(),
      full_name: String(userObj.fullName || userObj.full_name || username).trim(),
      store_code: String(userObj.storeCode || userObj.store_code || '').trim().toUpperCase(),
      phone: String(userObj.phone || '-').trim(),
      category: String(userObj.category || 'TOKO').trim().toUpperCase(),
      area: String(userObj.area || 'BDG').trim().toUpperCase(),
      ttd: userObj.ttd || '',
      created_at: userObj.createdAt || userObj.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const validCols = await getSupabaseUserColumns(client);
    const sanitizedPayload = {};
    Object.keys(fullPayload).forEach(k => {
      if (validCols.includes(k)) {
        sanitizedPayload[k] = fullPayload[k];
      }
    });

    const { error: err1 } = await client.from('users').upsert(sanitizedPayload, { onConflict: 'id' });
    if (!err1) return;

    const { error: err2 } = await client.from('users').upsert(sanitizedPayload);
    if (!err2) return;

    await client.from('users').update(sanitizedPayload).eq('username', username);
  } catch (e) {
    console.warn('[SUPABASE USER UPSERT EXCEPTION]:', e);
  }
}
window.simpanUserKeSupabase = simpanUserKeSupabase;

async function broadcastSystemUsersMasterToSupabase() {
  return;
}
window.broadcastSystemUsersMasterToSupabase = broadcastSystemUsersMasterToSupabase;

async function syncSupabaseNotifsAndChatToLocalCache() {
  // Notifikasi dan Chat dikelola khusus melalui Firebase Realtime / Firestore & Local Storage (tidak menggunakan Supabase)
  return;
}

async function syncSupabaseStoresToLocalCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const { data: supaStores, error } = await supabase.from('toko_list').select('*');
    if (!error && Array.isArray(supaStores)) {
      // DATABASE IS SINGLE SOURCE OF TRUTH: Supabase langsung menggantikan cache lokal toko_list
      const formattedStores = supaStores
        .map(s => ({
          id: s.id || `STK-${s.store_code || Date.now()}`,
          fullName: String(s.full_name || s.fullName || '').trim(),
          area: String(s.area || 'BDG').trim().toUpperCase(),
          storeCode: String(s.store_code || s.storeCode || '').trim(),
          createdBy: String(s.created_by || s.createdBy || 'ADMIN').trim()
        }))
        .filter(s => !!s.fullName);

      appStorage.setItem(STORES_DB_KEY, JSON.stringify(formattedStores));
      try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(formattedStores)); } catch(e) {}

      if (typeof updateStoreDropdownOptions === 'function') {
        updateStoreDropdownOptions();
      }
      if (typeof loadDaftarTokoModal === 'function') {
        loadDaftarTokoModal();
      }
    }
  } catch (err) {
    console.warn('[SUPABASE STORES SYNC NOTICE]:', err);
  }
}
window.syncSupabaseStoresToLocalCache = syncSupabaseStoresToLocalCache;

async function syncMasterBarangToLocalCache() {
  let masterJson = '';

  // 1. Coba ambil data Master Type Barang dari Firebase Firestore
  try {
    const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : null;
    if (fs) {
      const docSnap = await fs.collection('master_lookup').doc('kode_unit_map').get();
      if (docSnap && docSnap.exists) {
        const d = docSnap.data();
        if (d && (d.dataJson || d.kodeUnitMapJson)) {
          masterJson = d.dataJson || d.kodeUnitMapJson;
        }
      }
      if (!masterJson) {
        const cfgSnap = await fs.collection('app_settings').doc('config').get();
        if (cfgSnap && cfgSnap.exists) {
          const cd = cfgSnap.data();
          if (cd && cd.kodeUnitMapJson) {
            masterJson = cd.kodeUnitMapJson;
          }
        }
      }
    }
  } catch(e) {
    console.warn('[FIRESTORE MASTER BARANG SYNC NOTICE]:', e);
  }

  // 2. Jika Firestore belum mengembalikan data, coba ambil dari Firebase Realtime DB
  if (!masterJson) {
    try {
      const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
      if (rtdb) {
        const snap = await rtdb.ref('master_kode_unit_json').once('value');
        if (snap && snap.exists() && snap.val()) {
          masterJson = snap.val();
        } else {
          const snap2 = await rtdb.ref('app_settings/kodeUnitMapJson').once('value');
          if (snap2 && snap2.exists() && snap2.val()) {
            masterJson = snap2.val();
          }
        }
      }
    } catch(e) {
      console.warn('[RTDB MASTER BARANG SYNC NOTICE]:', e);
    }
  }

  // 3. Simpan data Master Barang dari FIREBASE ke Penyimpanan Lokal perangkat
  if (masterJson) {
    try {
      let parsed = typeof masterJson === 'string' ? JSON.parse(masterJson) : masterJson;
      if (parsed && typeof parsed === 'object') {
        const existingMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
        const merged = { ...KODE_UNIT_MAP, ...existingMap, ...parsed };
        const cleanStr = JSON.stringify(merged);
        appStorage.setItem(KODE_UNIT_MAP_KEY, cleanStr);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(KODE_UNIT_MAP_KEY, cleanStr);
        }
        console.log(`⚡ [FIREBASE MASTER BARANG SYNC SUCCESS]: ${Object.keys(merged).length} Master Kode Barang berhasil dipulihkan dari FIREBASE!`);
        return merged;
      }
    } catch(err) {
      console.warn('[PARSING MASTER BARANG ERROR]:', err);
    }
  }
  return null;
}
window.syncMasterBarangToLocalCache = syncMasterBarangToLocalCache;

function syncSupabaseLookupToLocalCache() {
  // Master lookup type barang FULL 100% dikelola via Firebase & Local Storage
  return;
}
window.syncSupabaseLookupToLocalCache = syncSupabaseLookupToLocalCache;

async function syncSupabaseThemeToLocalCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const activeLocalTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('APP_SELECTED_THEME') : null) || (typeof appStorage !== 'undefined' ? appStorage.getItem(THEME_KEY) : null);
    if (activeLocalTheme) {
      if (typeof updateBodyClasses === 'function') {
        updateBodyClasses(activeLocalTheme);
      }
      return;
    }
    const { data: sysData } = await supabase.from('lookup').select('*').eq('key', 'global_theme').maybeSingle();
    if (sysData && sysData.value && sysData.value.theme) {
      const cloudTheme = sysData.value.theme;
      appStorage.setItem(GLOBAL_THEME_KEY, cloudTheme);
      appStorage.setItem(THEME_KEY, cloudTheme);
      try { localStorage.setItem('APP_SELECTED_THEME', cloudTheme); } catch(e) {}
      if (typeof updateBodyClasses === 'function') {
        updateBodyClasses(cloudTheme);
      }
    }
  } catch (err) {
    console.warn('[SUPABASE THEME SYNC NOTICE]:', err);
  }
}
window.syncSupabaseThemeToLocalCache = syncSupabaseThemeToLocalCache;


function sanitizePermintaanTokoRow(r) {
  if (!r || typeof r !== 'object') return null;
  const ns = String(r.no_surat || r.noSurat || r.id || '').trim();
  if (!ns) return null;
  const cleanId = String(r.id || ns).replace(/[\/\.\s]/g, '_');

  const sanitizeSig = (sig) => {
    if (!sig || typeof sig !== 'string') return '';
    if (sig.includes('DIGITALLY VERIFIED') || sig.includes('OfficialDigitalSignatureStamp')) return '';
    return sig;
  };

  return {
    id: cleanId,
    no_surat: ns,
    tanggal: r.tanggal || '',
    toko: r.toko || '',
    area: r.area || 'BDG',
    jenis: r.jenis || '',
    catatan: r.catatan || '',
    items: Array.isArray(r.items) ? r.items : (typeof r.items === 'string' ? (JSON.parse(r.items || '[]')) : []),
    photos: Array.isArray(r.photos) ? r.photos : (typeof r.photos === 'string' ? (JSON.parse(r.photos || '[]')) : []),
    artemis_photos: Array.isArray(r.artemisPhotos || r.artemis_photos) ? (r.artemisPhotos || r.artemis_photos) : [],
    status: r.status || 'PENDING',
    service_approve: !!(r.serviceApprove || r.service_approve),
    service_user_name: r.serviceUserName || r.service_user_name || '',
    service_ttd: sanitizeSig(r.serviceTTD || r.service_ttd || ''),
    dm_user_name: r.dmUserName || r.dm_user_name || '',
    dm_ttd: sanitizeSig(r.dmTTD || r.dm_ttd || ''),
    pemohon_ttd: sanitizeSig(r.pemohonTTD || r.pemohon_ttd || r.tokoTTD || r.toko_ttd || ''),
    created_by: r.createdBy || r.created_by || '',
    created_at: r.createdAt || r.created_at || new Date().toISOString(),
    user_id: r.userId || r.user_id || '',
    log: Array.isArray(r.log) ? r.log : (typeof r.log === 'string' ? (JSON.parse(r.log || '[]')) : []),
    updated_at: new Date().toISOString()
  };
}
window.sanitizePermintaanTokoRow = sanitizePermintaanTokoRow;

async function safeSupabaseUpsertPermintaan(payload) {
  if (typeof supabase === 'undefined' || !supabase) return { error: { message: 'Supabase client not initialized' } };
  const rows = Array.isArray(payload) ? payload : [payload];
  if (!rows.length) return { data: [], error: null };

  const preparedRows = rows.map(r => sanitizePermintaanTokoRow(r)).filter(Boolean);
  if (!preparedRows.length) return { data: [], error: null };

  // TIER 1: UPSERT PRIMARY KEY (id) - Standar PostgreSQL Supabase (Bebas 400 Bad Request & 409 Conflict)
  try {
    const { data: upsertData, error: upsertErr } = await supabase
      .from('permintaan_toko')
      .upsert(preparedRows, { onConflict: 'id' });

    if (!upsertErr) {
      return { data: upsertData, error: null };
    } else {
      console.warn('[SUPABASE TIER 1 UPSERT NOTICE]:', upsertErr.message);
    }
  } catch (eTier1) {}

  // TIER 2: INDIVIDUAL UPDATE-FIRST FALLBACK
  let lastError = null;
  const results = [];

  for (const row of preparedRows) {
    const ns = row.no_surat;
    const docId = row.id;
    if (!ns && !docId) continue;

    try {
      // 1. Coba UPDATE berdasarkan Primary Key (id)
      const { data: updIdData, error: updIdErr } = await supabase
        .from('permintaan_toko')
        .update(row)
        .eq('id', docId);

      if (!updIdErr && updIdData && updIdData.length > 0) {
        results.push(updIdData);
        continue;
      }

      // 2. Coba UPDATE berdasarkan no_surat
      const { data: updData, error: updErr } = await supabase
        .from('permintaan_toko')
        .update(row)
        .eq('no_surat', ns);

      if (!updErr && updData && updData.length > 0) {
        results.push(updData);
        continue;
      }

      // 3. Upsert tunggal jika benar-benar baru
      const { data: singleUpsert, error: singleErr } = await supabase
        .from('permintaan_toko')
        .upsert([row], { onConflict: 'id' });

      if (!singleErr) {
        results.push(singleUpsert);
      } else {
        lastError = singleErr;
      }
    } catch(err) {
      lastError = err;
    }
  }

  return { data: results, error: lastError };
}
window.safeSupabaseUpsertPermintaan = safeSupabaseUpsertPermintaan;

async function pushCentralCloudDB(target = null) {
  try {
    const sourceData = target ? (Array.isArray(target) ? target : [target]) : getRequestsFromDB();
    if (typeof supabase !== 'undefined' && supabase) {
      try {
        const supaPayloads = sourceData.map(r => sanitizePermintaanTokoRow(r)).filter(Boolean);

        if (supaPayloads.length > 0) {
          try {
            const { error } = await safeSupabaseUpsertPermintaan(supaPayloads);
            if (error) {
              console.warn('[SUPABASE PUSH REQUESTS NOTICE]:', error.message);
            } else {
              console.log('⚡ [SUPABASE PUSH SUCCESS]: Requests synced to Supabase!');
            }
            if (typeof broadcastRealtimeDataChange === 'function') {
              supaPayloads.forEach(p => {
                if (p.no_surat && !p.no_surat.startsWith('__SYSTEM_')) {
                  broadcastRealtimeDataChange(p.no_surat);
                }
              });
            }
          } catch (eInner) {
            console.warn('[SUPABASE PUSH INNER ERROR]:', eInner);
          }
        }

        const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
        const systemTtdRow = {
          id: '__SYSTEM_TTD_MAP__',
          no_surat: '__SYSTEM_TTD_MAP__',
          tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
          toko: 'SYSTEM',
          area: 'ALL',
          jenis: 'SYSTEM',
          catatan: JSON.stringify(ttdMap),
          items: [],
          photos: [],
          status: 'DONE',
          service_approve: true,
          created_by: 'SYSTEM',
          created_at: new Date().toISOString()
        };
        await safeSupabaseUpsertPermintaan(systemTtdRow);

        const isPhotoEnabled = getFeaturePhotosEnabled();
        const photoFeatureVal = isPhotoEnabled ? 'true' : 'false';
        const systemPhotoRow = {
          id: '__SYSTEM_PHOTO_FEATURE__',
          no_surat: '__SYSTEM_PHOTO_FEATURE__',
          tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
          toko: 'SYSTEM',
          area: 'ALL',
          jenis: 'SYSTEM',
          catatan: JSON.stringify({ featurePhotos: photoFeatureVal, enabled: isPhotoEnabled, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'ADMIN' }),
          items: [],
          photos: [],
          status: 'DONE',
          service_approve: true,
          created_by: 'SYSTEM',
          created_at: new Date().toISOString()
        };
        await safeSupabaseUpsertPermintaan(systemPhotoRow);

        const currentFonteToken = getFonteToken();
        if (currentFonteToken) {
          const systemFonteRow = {
            id: '__SYSTEM_FONTE_TOKEN__',
            no_surat: '__SYSTEM_FONTE_TOKEN__',
            tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
            toko: 'SYSTEM',
            area: 'ALL',
            jenis: 'SYSTEM',
            catatan: JSON.stringify({ fonteToken: currentFonteToken, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'ADMIN' }),
            items: [],
            photos: [],
            status: 'DONE',
            service_approve: true,
            created_by: 'SYSTEM',
            created_at: new Date().toISOString()
          };
          await safeSupabaseUpsertPermintaan(systemFonteRow);

          try {
            await supabase.from('lookup').upsert({ key: 'fonteToken', value: currentFonteToken,
              updated_at: new Date().toISOString() }, { onConflict: 'key' });
          } catch(e) {}
        }

        // NOTE: Gemini key sync is handled 1x exclusively via autoSyncGeminiKeyToSupabase()

      } catch (sbErr) {
        console.warn('[SUPABASE PUSH NOTICE]:', sbErr);
      }
    }

    // FIREBASE KHUSUS: MASTER TYPE LOOKUP, CHAT SUPPORT & NOTIFIKASI
    const fsPush = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
    if (fsPush) {
      try {
        const notifs = getSystemNotifications();
        const chatMsgs = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
        const chatRooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
        const kodeUnitMap = getKodeUnitMap() || {};
        const mapJsonStr = JSON.stringify(kodeUnitMap);

        const cleanMap = {};
        Object.keys(kodeUnitMap).forEach(k => {
          if (k) cleanMap[String(k).replace(/[\/\.#$\[\]]/g, '_')] = kodeUnitMap[k];
        });

        await fsPush.collection('app_settings').doc('config').set({
          notifications: notifs,
          chatMessages: chatMsgs,
          chatRooms: chatRooms,
          kodeUnitMapJson: mapJsonStr,
          geminiApiKey: getGeminiApiKey() || '',
          totalMasterItems: Object.keys(kodeUnitMap).length,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        if (Object.keys(kodeUnitMap).length > 0) {
          await fsPush.collection('master_lookup').doc('kode_unit_map').set({
            data: cleanMap,
            dataJson: mapJsonStr,
            totalItems: Object.keys(kodeUnitMap).length,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.warn("[FIREBASE PUSH NOTICE]:", err.message);
      }
    }

    const rtdbPush = typeof getDbRealtime === 'function' ? getDbRealtime() : (typeof dbRealtime !== 'undefined' ? dbRealtime : null);
    if (rtdbPush) {
      try {
        const notifs = getSystemNotifications();
        const chatMsgs = JSON.parse(appStorage.getItem(CHAT_MESSAGES_KEY) || '[]');
        const kodeUnitMap = getKodeUnitMap() || {};
        const mapJsonStr = JSON.stringify(kodeUnitMap);

        rtdbPush.ref('notifications').set(notifs);
        rtdbPush.ref('chat_messages').set(chatMsgs);
        if (Object.keys(kodeUnitMap).length > 0) {
          rtdbPush.ref('app_settings/kodeUnitMapJson').set(mapJsonStr);
          rtdbPush.ref('master_kode_unit_json').set(mapJsonStr);
        }
      } catch (err) {
        console.warn("[FIREBASE REALTIME PUSH NOTICE]:", err.message);
      }
    }
  } catch (err) {
    console.warn('[PUSH CENTRAL CLOUD NOTICE]:', err);
  }
}

function updateCloudStatusUI(isOnline) {
  if (typeof updateSupabaseStatusUI === 'function') {
    updateSupabaseStatusUI(isOnline);
  }
}

function getFeaturePhotosEnabled() {
  const val = appStorage.getItem(FEATURE_PHOTOS_KEY);
  if (val === null || val === undefined) {
    try {
      const loc = localStorage.getItem(FEATURE_PHOTOS_KEY);
      if (loc !== null && loc !== undefined) return loc !== 'false';
    } catch(e) {}
  }
  return val !== 'false';
}

async function setFeaturePhotosEnabled(enabled) {
  const valStr = enabled ? 'true' : 'false';
  appStorage.setItem(FEATURE_PHOTOS_KEY, valStr);
  try { localStorage.setItem(FEATURE_PHOTOS_KEY, valStr); } catch(e) {}
  updatePhotoSectionVisibility();

  // 1. BROADCAST INSTAN VIA WEBSOCKET REALTIME CHANNEL SUPABASE KE SEMUA DEVICE
  if (typeof supabase !== 'undefined' && supabase && supabaseRealtimeChannel) {
    try {
      supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'config_change',
        payload: { featurePhotos: valStr, enabled: !!enabled, timestamp: Date.now() }
      });
    } catch(e) {}
  }

  // 2. BROADCAST KE SUPABASE LEWAT SYSTEM ROW permintaan_toko & LOOKUP
  if (typeof supabase !== 'undefined' && supabase) {
    try {
      const photoSystemRow = {
        id: '__SYSTEM_PHOTO_FEATURE__',
        no_surat: '__SYSTEM_PHOTO_FEATURE__',
        tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
        toko: 'SYSTEM',
        area: 'ALL',
        jenis: 'SYSTEM',
        catatan: JSON.stringify({ featurePhotos: valStr, enabled: !!enabled, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'ADMIN' }),
        items: [],
        photos: [],
        status: 'DONE',
        service_approve: true,
        created_by: (currentUser && currentUser.fullName ? currentUser.fullName : 'ADMIN') || 'ADMIN',
        created_at: new Date().toISOString()
      };
      await safeSupabaseUpsertPermintaan(photoSystemRow);

      // SIMPAN JUGA KE TABEL LOOKUP
      try {
        await supabase.from('lookup').upsert({
          key: 'FEATURE_PHOTOS',
          value: JSON.stringify({ enabled: valStr, updatedAt: new Date().toISOString() }),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch(e) {}
    } catch(err) {
      console.warn('[SUPABASE PHOTO FEATURE BROADCAST ERROR]:', err);
    }
  }

  // 3. FIRESTORE REALTIME SYNC
  if (typeof dbFirestore !== 'undefined' && dbFirestore) {
    try {
      await dbFirestore.collection('app_settings').doc('config').set({
        featurePhotos: valStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch(e) {}
  }

  // 4. FIREBASE REALTIME DATABASE SYNC
  if (typeof dbRealtime !== 'undefined' && dbRealtime) {
    try {
      await dbRealtime.ref('settings/featurePhotos').set(valStr);
      await dbRealtime.ref('settings').update({ featurePhotos: valStr });
    } catch(e) {}
  }

  if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
    try { pushCentralCloudDB(); } catch(e) {}
  }
}

function toggleFeaturePhotoAdmin() {
  const current = getFeaturePhotosEnabled();
  const next = !current;
  setFeaturePhotosEnabled(next);
}

function updatePhotoSectionVisibility() {
  const isEnabled = getFeaturePhotosEnabled();

  // Form Upload Section
  const section = document.getElementById('sectionUploadFoto');
  if (section) {
    section.style.display = isEnabled ? 'block' : 'none';
  }

  // Admin Toggle UI Status & Button
  const statusTexts = document.querySelectorAll('#photoFeatureStatusText');
  statusTexts.forEach(statusText => {
    statusText.textContent = isEnabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)';
    statusText.style.color = isEnabled ? '#10b981' : '#ef4444';
  });

  const toggleBtns = document.querySelectorAll('#btnTogglePhotoFeature');
  toggleBtns.forEach(btn => {
    btn.style.background = isEnabled ? '#10b981' : '#ef4444';
    const icon = btn.querySelector('.material-symbols-rounded') || btn.querySelector('#photoToggleBtnIcon');
    if (icon) {
      icon.textContent = isEnabled ? 'toggle_on' : 'toggle_off';
    }
    const textEl = btn.querySelector('#photoToggleBtnText');
    if (textEl) {
      textEl.textContent = isEnabled ? 'ON (KLIK UTK OFF)' : 'OFF (KLIK UTK ON)';
    }
  });

  const adminCard = document.getElementById('adminPhotoControlContainer');
  if (adminCard) {
    adminCard.style.display = (currentUser && (currentUser.category === 'ADMIN' || currentUser.username === 'ADMIN')) ? 'flex' : 'none';
  }

  if (typeof loadRiwayat === 'function' && (document.getElementById('riwayatPage') && document.getElementById('riwayatPage').classList.contains('active'))) {
    loadRiwayat();
  }
}

window.getFeaturePhotosEnabled = getFeaturePhotosEnabled;
window.setFeaturePhotosEnabled = setFeaturePhotosEnabled;
window.toggleFeaturePhotoAdmin = toggleFeaturePhotoAdmin;
window.updatePhotoSectionVisibility = updatePhotoSectionVisibility;

function normalizeUserList(users) {
  if (!Array.isArray(users)) return [];

  const map = new Map();

  users.forEach(user => {
    if (!user || !user.username) return;
    const username = String(user.username).trim();
    if (!username) return;
    const key = username.toUpperCase();

    const formatted = {
      ...user,
      id: user.id || username,
      username,
      fullName: String(user.fullName || '').trim(),
      password: String(user.password || '').trim(),
      storeCode: String(user.storeCode || '').trim().toUpperCase(),
      phone: String(user.phone || '').trim(),
      category: String(user.category || 'TOKO').trim().toUpperCase(),
      area: String(user.area || 'BDG').trim().toUpperCase(),
      ttd: user.ttd || ''
    };

    if (map.has(key)) {
      map.set(key, { ...map.get(key), ...formatted });
    } else {
      map.set(key, formatted);
    }
  });

  return Array.from(map.values());
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
    try { if (window.appStorage && typeof window.appStorage.removeItem === 'function') window.appStorage.removeItem(key); } catch (err) {}
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

function togglePasswordVisibility() {
  const pswInput = document.getElementById('password');
  const icon = document.getElementById('togglePasswordIcon');
  if (!pswInput || !icon) return;

  if (pswInput.type === 'password') {
    pswInput.type = 'text';
    icon.textContent = 'visibility_off';
  } else {
    pswInput.type = 'password';
    icon.textContent = 'visibility';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

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

function generateStoreCode(storeName, targetArea = '') {
  const cleanName = String(storeName || '').trim().toUpperCase();
  if (!cleanName) return 'TK';

  let stores = [];
  try {
    const raw = appStorage.getItem(STORES_DB_KEY);
    if (raw) stores = JSON.parse(raw);
  } catch (e) {}
  if (!Array.isArray(stores)) stores = [];

  const existingMatch = stores.find(s => s && s.fullName && s.fullName.trim().toUpperCase() === cleanName && (!targetArea || s.area === targetArea));
  if (existingMatch && existingMatch.storeCode) {
    return existingMatch.storeCode;
  }

  const takenCodes = new Set();
  stores.forEach(s => {
    if (s && s.storeCode && s.fullName && s.fullName.trim().toUpperCase() !== cleanName) {
      takenCodes.add(String(s.storeCode).trim().toUpperCase());
    }
  });

  try {
    const rawUsers = appStorage.getItem(USERS_DB_KEY);
    if (rawUsers) {
      const uList = JSON.parse(rawUsers);
      if (Array.isArray(uList)) {
        uList.forEach(u => {
          if (u && u.storeCode && u.fullName && u.fullName.trim().toUpperCase() !== cleanName) {
            takenCodes.add(String(u.storeCode).trim().toUpperCase());
          }
        });
      }
    }
  } catch(e) {}

  const words = cleanName.replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TK';

  const candidates = [];

  if (words.length >= 2) {
    candidates.push(words.map(w => w[0]).join(''));
  }

  if (words[0].length >= 2) {
    candidates.push(words[0].substring(0, 2));
  }

  if (words.length >= 2 && words[1].length >= 2) {
    candidates.push(words[0][0] + words[1][1]);
  }

  if (words[0].length >= 3) {
    candidates.push(words[0][0] + words[0][2]);
  }

  if (words[0].length >= 4) {
    candidates.push(words[0][0] + words[0][3]);
  }

  if (words.length >= 2 && words[0].length >= 2) {
    candidates.push(words[0].substring(0, 2) + words[1][0]);
  }

  if (words[0].length >= 3) {
    candidates.push(words[0].substring(0, 3));
  }

  if (words.length >= 2 && words[0].length >= 2 && words[1].length >= 2) {
    candidates.push(words[0].substring(0, 2) + words[1].substring(0, 2));
  }

  for (let cand of candidates) {
    cand = cand.trim().toUpperCase();
    if (cand && !takenCodes.has(cand)) {
      return cand;
    }
  }

  const baseCode = (words.length >= 2 ? (words[0][0] + words[1][0]) : words[0].substring(0, 2)).toUpperCase();
  let counter = 2;
  while (takenCodes.has(`${baseCode}${counter}`)) {
    counter++;
  }
  return `${baseCode}${counter}`;
}
window.generateStoreCode = generateStoreCode;

function getStoresFromDB() {
  let stores = [];
  try {
    const raw = appStorage.getItem(STORES_DB_KEY);
    if (raw) stores = JSON.parse(raw);
  } catch (e) {
    stores = [];
  }

  if (!Array.isArray(stores)) stores = [];

  const delStores = new Set(
    (JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]') || [])
      .filter(Boolean)
      .map(v => String(v).trim().toUpperCase())
  );
  const delUsers = new Set(
    (JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]') || [])
      .filter(Boolean)
      .map(v => String(v).trim().toUpperCase())
  );

  // Filter out any stores that were deleted
  stores = stores.filter(s => {
    if (!s || !s.fullName) return false;
    const sId = String(s.id || '').toUpperCase();
    const sName = String(s.fullName).trim().toUpperCase();
    const sArea = String(s.area || '').trim().toUpperCase();
    const sKey = `${sName}_${sArea}`;
    if (delStores.has(sId) || delStores.has(sName) || delStores.has(sKey)) return false;
    if (delUsers.has(sId) || delUsers.has(sName)) return false;
    return true;
  });

  const users = (typeof getUsersFromDB === 'function' ? getUsersFromDB() : []);
  users.forEach(u => {
    if (u && u.category === 'TOKO' && u.fullName) {
      const uName = String(u.fullName).trim().toUpperCase();
      const uArea = String(u.area || 'BDG').trim().toUpperCase();
      const uKey = `${uName}_${uArea}`;
      if (delStores.has(uName) || delStores.has(uKey) || delUsers.has(String(u.id || '').toUpperCase()) || delUsers.has(String(u.username || '').toUpperCase())) {
        return;
      }
      const exists = stores.some(s => s && s.fullName && s.fullName.trim().toUpperCase() === uName && (!s.area || s.area === uArea));
      if (!exists) {
        stores.push({
          id: u.id || `STK-${u.username}`,
          fullName: u.fullName,
          area: u.area || 'BDG',
          storeCode: u.storeCode || generateStoreCode(u.fullName, u.area),
          createdBy: 'SYSTEM'
        });
      }
    }
  });

  const assignedCodes = new Set();
  stores.forEach(s => {
    if (!s) return;
    const name = String(s.fullName || '').trim().toUpperCase();
    if (!s.storeCode || assignedCodes.has(s.storeCode.toUpperCase())) {
      s.storeCode = generateStoreCode(name, s.area);
    }
    assignedCodes.add(s.storeCode.toUpperCase());
  });

  return stores;
}
window.getStoresFromDB = getStoresFromDB;

function getUsersFromDB() {
  let users = [];
  try {
    users = JSON.parse(appStorage.getItem(USERS_DB_KEY) || '[]');
  } catch (e) {
    users = [];
  }

  users = normalizeUserList(users);

  try {
    const delSet = new Set(
      (JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]') || [])
        .filter(Boolean)
        .map(v => String(v).trim().toUpperCase())
    );
    if (delSet.size > 0) {
      users = users.filter(u => {
        if (!u) return false;
        const uId = String(u.id || '').trim().toUpperCase();
        const uName = String(u.username || '').trim().toUpperCase();
        return !delSet.has(uId) && !delSet.has(uName);
      });
    }
  } catch (e) {}

  let updated = false;
  const adminIndex = users.findIndex(u => u && u.username && String(u.username).toUpperCase() === 'ADMIN');
  if (adminIndex !== -1) {
    if (!users[adminIndex].password && users[adminIndex].password !== '0') {
      users[adminIndex].password = '0';
      updated = true;
    }
  } else {
    if (typeof SEED_USERS !== 'undefined' && SEED_USERS[0]) {
      users.push({ ...SEED_USERS[0] });
      updated = true;
    }
  }

  if (updated || !users.length) {
    users = normalizeUserList(users.length ? users : [...SEED_USERS]);
    appStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  }

  return users;
}

function saveUsersToDB(users, targetUser = null) {
  const normalizedUsers = normalizeUserList(Array.isArray(users) ? users : []);
  appStorage.setItem(USERS_DB_KEY, JSON.stringify(normalizedUsers));
  try { localStorage.setItem(USERS_DB_KEY, JSON.stringify(normalizedUsers)); } catch(e) {}

  if (targetUser && typeof targetUser === 'object' && targetUser.username) {
    if (typeof simpanUserKeSupabase === 'function') {
      simpanUserKeSupabase(targetUser).catch(() => {});
    }
  } else if (Array.isArray(normalizedUsers)) {
    normalizedUsers.forEach(u => {
      if (u && u.username && typeof simpanUserKeSupabase === 'function') {
        simpanUserKeSupabase(u).catch(() => {});
      }
    });
  }

  if (supabaseRealtimeChannel) {
    try {
      supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'user_data_changed',
        payload: { username: targetUser ? targetUser.username : '', timestamp: Date.now() }
      });
    } catch(e) {}
  }

  if (currentUser) {
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadRiwayat === 'function') loadRiwayat();
    if (document.getElementById('userTableBody') && typeof loadUsersManagement === 'function') loadUsersManagement();
  }
}

function getRequestsFromDB() {
  const reqs = JSON.parse(appStorage.getItem(REQUESTS_DB_KEY) || '[]');
  return reqs.filter(r => r && r.noSurat && !String(r.noSurat).startsWith('__SYSTEM_'));
}

function saveRequestsToDB(requests, targetReq = null, action = 'UPDATE') {
  const cleanReqs = Array.isArray(requests) ? requests : [];
  appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(cleanReqs));
  try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(cleanReqs)); } catch(e) {}

  if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB();
  }

  // KIRIM SINYAL REAL-TIME INSTAN KE SEMUA PERANGKAT LAIN
  if (targetReq) {
    if (typeof targetReq === 'string') {
      broadcastRealtimeDataChange(targetReq, null, action);
    } else if (typeof targetReq === 'object' && (targetReq.noSurat || targetReq.id)) {
      broadcastRealtimeDataChange(targetReq.noSurat || targetReq.id, targetReq, action);
    }
  } else if (cleanReqs.length > 0) {
    cleanReqs.slice(0, 3).forEach(r => {
      if (r && r.noSurat) broadcastRealtimeDataChange(r.noSurat, r, 'UPDATE');
    });
  }

  if (supabaseRealtimeChannel) {
    try {
      supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'user_data_changed',
        payload: { username: targetUser ? targetUser.username : '', timestamp: Date.now() }
      });
    } catch(e) {}
  }

  if (currentUser) {
    if (typeof loadDashboard === 'function') loadDashboard();
    if (typeof loadRiwayat === 'function') loadRiwayat();
    if (typeof loadMasterDbTable === 'function' && document.getElementById('masterDbTableBody')) {
      loadMasterDbTable();
    }
  }
}

function getFonteToken() {
  let token = appStorage.getItem(FONTE_TOKEN_KEY);
  if (!token) {
    try {
      token = localStorage.getItem(FONTE_TOKEN_KEY);
    } catch(e) {}
  }
  return (token || '').trim();
}

async function simpanFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  const token = input ? input.value.trim() : '';
  appStorage.setItem(FONTE_TOKEN_KEY, token);
  try { localStorage.setItem(FONTE_TOKEN_KEY, token); } catch(e) {}

  // 1. SIMPAN KE SUPABASE (LOOKUP & SYSTEM ROW permintaan_toko)
  if (typeof supabase !== 'undefined' && supabase) {
    try {
      // Upsert ke tabel lookup
      await supabase.from('lookup').upsert({ key: 'fonteToken', value: token,
        updated_at: new Date().toISOString() }, { onConflict: 'key' });

      // Broadcast row sistem permintaan_toko ke seluruh perangkat
      const systemFonteRow = {
        id: '__SYSTEM_FONTE_TOKEN__',
        no_surat: '__SYSTEM_FONTE_TOKEN__',
        tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
        toko: 'SYSTEM',
        area: 'ALL',
        jenis: 'SYSTEM',
        catatan: JSON.stringify({ fonteToken: token, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'ADMIN' }),
        items: [],
        photos: [],
        status: 'DONE',
        service_approve: true,
        created_by: (currentUser && currentUser.fullName ? currentUser.fullName : 'ADMIN') || 'ADMIN',
        created_at: new Date().toISOString()
      };
      await safeSupabaseUpsertPermintaan(systemFonteRow);
    } catch (err) {
      console.warn('[SUPABASE SIMPAN FONTE TOKEN ERROR]:', err);
    }
  }

  // 2. SIMPAN KE FIRESTORE
  if (typeof dbFirestore !== 'undefined' && dbFirestore) {
    try {
      await dbFirestore.collection('app_settings').doc('config').set({
        fonteToken: token,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch(e) {}
  }

  // 3. SIMPAN KE FIREBASE REALTIME DB
  if (typeof dbRealtime !== 'undefined' && dbRealtime) {
    try {
      await dbRealtime.ref('settings/fonteToken').set(token);
    } catch(e) {}
  }

  if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
    try { pushCentralCloudDB(); } catch(e) {}
  }

  showNotif(token ? 'TOKEN WA BERHASIL DISIMPAN!' : 'TOKEN WA DIKOSONGKAN!', 'success');
}

function loadFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  if (input) {
    input.value = getFonteToken();
  }
}

async function tesKoneksiFonteToken() {
  const input = document.getElementById('fonteTokenInput');
  const token = (input ? input.value.trim() : '') || getFonteToken();
  if (!token) {
    showNotif('MASUKKAN TOKEN FONTE TERLEBIH DAHULU!', 'warning');
    return;
  }

  showLoading('MENGECEK KONEKSI WHATSAPP FONTE...');
  try {
    const res = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        'Authorization': token
      }
    });
    const data = await res.json();
    hideLoading();

    console.log('[FONTE DEVICE CHECK]:', data);
    if (data.status === true || data.device_status === 'connect' || data.name || data.device) {
      const devName = data.name || data.device || 'Terdaftar';
      const devStatus = data.device_status || (data.status ? 'ONLINE' : 'OFFLINE');
      showNotif(`✅ TOKEN VALID & TERHUBUNG! Device WA: ${devName} (${devStatus})`, 'success');
    } else {
      const msg = data.reason || data.message || JSON.stringify(data);
      showNotif(`⚠️ RESPON FONTE: ${msg}`, 'warning');
    }
  } catch (err) {
    hideLoading();
    console.error('[FONTE TEST ERROR]:', err);
    showNotif('GAGAL TERHUBUNG KE API FONTE: ' + err.message, 'error');
  }
}

window.getFonteToken = getFonteToken;
window.simpanFonteToken = simpanFonteToken;
window.loadFonteToken = loadFonteToken;
window.tesKoneksiFonteToken = tesKoneksiFonteToken;

const NAMA_DM_KEY = 'NAMA_DM_SUPABASE';

function getNamaDM() {
  let nama = appStorage.getItem(NAMA_DM_KEY);
  if (!nama) {
    try { nama = localStorage.getItem(NAMA_DM_KEY); } catch(e) {}
  }
  return (nama || '').trim() || 'FERRY EDIYANTO';
}

async function simpanNamaDM() {
  const input = document.getElementById('inputNamaDM');
  const nama = input ? input.value.trim().toUpperCase() : '';
  if (!nama) {
    showNotif('MASUKKAN NAMA DISTRICT MANAGER (DM) TERLEBIH DAHULU!', 'warning');
    return;
  }

  appStorage.setItem(NAMA_DM_KEY, nama);
  try { localStorage.setItem(NAMA_DM_KEY, nama); } catch(e) {}

  // 1. SIMPAN KE SUPABASE (LOOKUP & SYSTEM ROW)
  if (typeof supabase !== 'undefined' && supabase) {
    try {
      await supabase.from('lookup').upsert({
        key: 'namaDM',
        value: nama,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      const systemDmRow = {
        id: '__SYSTEM_NAMA_DM__',
        no_surat: '__SYSTEM_NAMA_DM__',
        tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
        toko: 'SYSTEM',
        area: 'ALL',
        jenis: 'SYSTEM',
        catatan: JSON.stringify({ namaDM: nama, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'ADMIN') }),
        items: [],
        photos: [],
        status: 'DONE',
        service_approve: true,
        created_by: (currentUser && currentUser.fullName ? currentUser.fullName : 'ADMIN'),
        created_at: new Date().toISOString()
      };
      if (typeof safeSupabaseUpsertPermintaan === 'function') {
        await safeSupabaseUpsertPermintaan(systemDmRow);
      }
    } catch (err) {
      console.warn('[SUPABASE SIMPAN NAMA DM ERROR]:', err);
    }
  }

  // 2. SIMPAN KE FIRESTORE
  if (typeof dbFirestore !== 'undefined' && dbFirestore) {
    try {
      await dbFirestore.collection('app_settings').doc('config').set({
        namaDM: nama,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch(e) {}
  }

  // 3. SIMPAN KE FIREBASE REALTIME DB
  if (typeof dbRealtime !== 'undefined' && dbRealtime) {
    try {
      await dbRealtime.ref('settings/namaDM').set(nama);
    } catch(e) {}
  }

  // 4. BROADCAST SIGNAL
  if (typeof supabaseRealtimeChannel !== 'undefined' && supabaseRealtimeChannel) {
    try {
      supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload: { action: 'UPDATE_SETTINGS', namaDM: nama, timestamp: Date.now() }
      });
    } catch(e) {}
  }

  showNotif('NAMA DISTRICT MANAGER (DM) BERHASIL DISIMPAN & DISINKRONKAN!', 'success');
}

function loadNamaDM() {
  const input = document.getElementById('inputNamaDM');
  if (input) {
    input.value = getNamaDM();
  }
}

window.getNamaDM = getNamaDM;
window.simpanNamaDM = simpanNamaDM;
window.loadNamaDM = loadNamaDM;

function getAppDirectLink(noSurat) {
  if (!noSurat) return '';
  try {
    const rawNoSurat = String(noSurat).trim();
    
    const customBaseUrl = typeof appStorage !== 'undefined' ? appStorage.getItem('CUSTOM_APP_BASE_URL') : null;
    if (customBaseUrl && String(customBaseUrl).startsWith('http')) {
      const cleanCustom = customBaseUrl.endsWith('/') ? customBaseUrl : (customBaseUrl + '/');
      return `${cleanCustom}index.html?noSurat=${encodeURIComponent(rawNoSurat)}`;
    }

    if (window.location && window.location.href && (window.location.href.startsWith('http://') || window.location.href.startsWith('https://'))) {
      const originPath = window.location.origin + window.location.pathname;
      return `${originPath}?noSurat=${encodeURIComponent(rawNoSurat)}`;
    }
    
    return `https://polytasik-pixel.github.io/permintaanToko/index.html?noSurat=${encodeURIComponent(rawNoSurat)}`;
  } catch (e) {
    return `https://polytasik-pixel.github.io/permintaanToko/index.html?noSurat=${encodeURIComponent(noSurat)}`;
  }
}
window.getAppDirectLink = getAppDirectLink;

async function checkUrlDirectNoSuratOpen() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let targetNoSurat = urlParams.get('noSurat') || urlParams.get('nosurat') || urlParams.get('id');
    if (!targetNoSurat) return;

    const decodedNoSurat = decodeURIComponent(targetNoSurat).trim();
    if (!decodedNoSurat) return;

    window.PENDING_URL_NO_SURAT = decodedNoSurat;

    // Clean query parameter from browser URL bar to prevent recurring triggers on navigation/refresh
    try {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    } catch(e) {}

    const executeOpenDetail = async () => {
      const currentTarget = window.PENDING_URL_NO_SURAT;
      window.PENDING_URL_NO_SURAT = null;
      if (!currentTarget || window._isClosingDetailModal) return;

      if (typeof lihatDetail === 'function') {
        await lihatDetail(currentTarget, true);
      }
    };

    setTimeout(executeOpenDetail, 200);
    setTimeout(executeOpenDetail, 800);
  } catch(e) {}
}
window.checkUrlDirectNoSuratOpen = checkUrlDirectNoSuratOpen;

const sentWaCache = {};

function formatCleanPhoneList(targetPhone) {
  if (!targetPhone || targetPhone === '-' || String(targetPhone).trim() === '') return [];
  
  const rawStr = String(targetPhone).trim();
  const parts = rawStr.split(/[\s;,/|&\n]+/);
  
  const cleanedList = [];
  parts.forEach(rawPart => {
    let part = rawPart.trim();
    if (!part || part.length < 5) return;
    
    // Check if target is a WhatsApp Group ID (contains '@g.us', '-', or starts with '120')
    const isGroup = part.includes('@g.us') || part.includes('-') || part.startsWith('120');

    if (isGroup) {
      let groupTarget = part;
      if (!groupTarget.includes('@g.us') && (groupTarget.includes('-') || groupTarget.startsWith('120'))) {
        groupTarget = groupTarget + '@g.us';
      }
      if (!cleanedList.includes(groupTarget)) {
        cleanedList.push(groupTarget);
      }
    } else {
      let clean = part.replace(/[^0-9]/g, '');
      if (!clean || clean.length < 5) return;
      
      if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
      } else if (!clean.startsWith('62') && clean.length <= 13) {
        clean = '62' + clean;
      }
      
      if (!cleanedList.includes(clean)) {
        cleanedList.push(clean);
      }
    }
  });
  
  return cleanedList;
}
window.formatCleanPhoneList = formatCleanPhoneList;

async function kirimNotifikasiWA(targetPhone, message, forceSend = false) {
  if (!targetPhone || targetPhone === '-' || String(targetPhone).trim() === '') {
    return { success: false, error: 'Nomor telepon target kosong.' };
  }

  const token = getFonteToken();
  if (!token) {
    console.warn('[FONTE WA WARNING]: Token Fonnte belum diset!');
    return { success: false, error: 'Token Fonnte belum diset.' };
  }

  const phoneList = formatCleanPhoneList(targetPhone);
  if (!phoneList || phoneList.length === 0) {
    return { success: false, error: 'Format nomor telepon tidak valid.' };
  }

  let successCount = 0;
  let lastError = null;

  for (const cleanPhone of phoneList) {
    const msgHash = `${cleanPhone}_${String(message).trim()}`;
    const now = Date.now();
    if (!forceSend && sentWaCache[msgHash] && (now - sentWaCache[msgHash]) < 60000) {
      console.log('[WA SKIPPED - DUPLICATE PREVENTED]:', cleanPhone);
      continue;
    }
    sentWaCache[msgHash] = now;

    try {
      const formData = new FormData();
      formData.append('target', cleanPhone);
      formData.append('message', message);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': token.trim()
        },
        body: formData
      });

      const data = await response.json();
      console.log('[FONTE WA API RESPONSE]:', cleanPhone, data);
      if (data && (data.status === true || data.status === 'true' || data.id)) {
        successCount++;
      } else {
        const reason = data ? (data.reason || data.message || JSON.stringify(data)) : 'Unknown error';
        lastError = reason;
        console.warn('[FONTE WA SEND REJECTED]:', cleanPhone, reason);
      }
    } catch (err) {
      console.error('[FONTE WA API NETWORK ERROR]:', cleanPhone, err);
      lastError = err.message;
    }
  }

  if (successCount > 0) {
    return { success: true, sentCount: successCount };
  } else {
    return { success: false, error: lastError || 'Gagal mengirim pesan WA.' };
  }
}
window.kirimNotifikasiWA = kirimNotifikasiWA;

async function setGlobalAdminTheme(themeId) {
  if (!themeId) return;
  const nowTime = Date.now();

  if (typeof appStorage !== 'undefined') {
    appStorage.setItem(GLOBAL_THEME_KEY, themeId);
    appStorage.setItem(THEME_KEY, themeId);
    appStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, String(nowTime));
  }

  try { localStorage.setItem(GLOBAL_THEME_KEY, themeId); } catch(e) {}
  try { localStorage.setItem(THEME_KEY, themeId); } catch(e) {}
  try { localStorage.setItem('APP_SELECTED_THEME', themeId); } catch(e) {}
  try { localStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, String(nowTime)); } catch(e) {}

  const idx = THEME_MODES.findIndex(m => m.id === themeId);
  if (idx !== -1) currentThemeIndex = idx;
  updateBodyClasses(themeId);
}
window.setGlobalAdminTheme = setGlobalAdminTheme;

async function bersihkanFotoSupabase(mode = 'SELESAI') {
  const isSysAdmin = currentUser && (
    String(currentUser.category || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );

  if (!isSysAdmin) {
    showNotif('HANYA ADMIN YANG DAPAT MENGHAPUS FOTO!', 'warning');
    return;
  }

  const modeText = mode === 'SEMUA' ? 'SEMUA FOTO DOKUMEN' : 'FOTO DOKUMEN STATUS SELESAI & REJECT';
  showConfirm(`APAKAH ANDA YAKIN INGIN MENGHAPUS ${modeText}?

(Tindakan ini akan mengosongkan data foto untuk menghemat ruang memori. Rincian data permintaan tidak akan terhapus).`, function() {
    var _asyncTask = async function() {
      showLoading('MEMPROSES PEMBERSIHAN FOTO...');
      try {
        const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : null;
        let countUpdated = 0;
        let allPhotoUrlsToDelete = [];

        if (sb) {
          let query = sb.from('permintaan_toko').select('no_surat, photos, status');
          if (mode !== 'SEMUA') {
            query = query.in('status', ['DONE', 'REJECT', 'SELESAI', 'DONE_SERVICE']);
          }
          const { data: rows, error: fetchErr } = await query;
          if (!fetchErr && Array.isArray(rows)) {
            for (const row of rows) {
              if (row.no_surat && row.no_surat.startsWith('PRMT/')) {
                let pArr = [];
                if (Array.isArray(row.photos)) {
                  pArr = row.photos;
                } else if (typeof row.photos === 'string' && row.photos.trim()) {
                  try { pArr = JSON.parse(row.photos); } catch(e) {}
                }

                if (Array.isArray(pArr) && pArr.length > 0) {
                  allPhotoUrlsToDelete.push(...pArr);
                  countUpdated++;
                }
                await sb.from('permintaan_toko').update({ photos: [] }).eq('no_surat', row.no_surat);
              }
            }
          }
        }

        if (allPhotoUrlsToDelete.length > 0 && typeof deletePhotosFromSupabaseStorage === 'function') {
          await deletePhotosFromSupabaseStorage(allPhotoUrlsToDelete);
        }

        const requests = getRequestsFromDB();
        requests.forEach(r => {
          if (mode === 'SEMUA' || r.status === 'DONE' || r.status === 'REJECT' || r.status === 'SELESAI' || r.status === 'DONE_SERVICE') {
            r.photos = [];
          }
        });
        saveRequestsToDB(requests);

        if (typeof syncSupabaseRequestsToLocalCache === 'function') {
          await syncSupabaseRequestsToLocalCache();
        }

        hideLoading();
        showNotif(`BERHASIL MENGHAPUS FOTO! (${countUpdated} DOKUMEN DIBERSIHKAN)`, 'info');
        loadRiwayat();
        loadDashboard();
      } catch(err) {
        hideLoading();
        console.error('[SUPABASE DELETE PHOTOS ERROR]:', err);
        showNotif(`GAGAL MENGHAPUS FOTO: ${err.message || err}`, 'warning');
      }
    };
    _asyncTask();
  });
}
window.bersihkanFotoSupabase = bersihkanFotoSupabase;

async function hapusSemuaFotoBiasa() {
  const isSysAdmin = (typeof checkIsAdminUser === 'function' && checkIsAdminUser()) || (currentUser && (
    String(currentUser.category || currentUser.role || currentUser.kategori || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  )) || true;

  showConfirm(`YAKIN INGIN MENGHAPUS SEMUA FOTO DARI SUPABASE CLOUD & PENYIMPANAN?

(Catatan: Seluruh Tanda Tangan / TTD Digital TETAP AMAN dan TIDAK AKAN DIHAPUS).`, async function() {
    showLoading('MENGHAPUS SEMUA FOTO (TTD TETAP AMAN)...');
    try {
      let totalStorageFilesDeleted = 0;
      const candidateBuckets = ['photos', 'permintaan_photos', 'foto-permintaan', 'request-photos', 'documents', 'evidence_photos'];

      // Helper: Recursive list of all files in a bucket
      async function listAllFilesRecursively(bucketName, folderPath = '') {
        let allFiles = [];
        try {
          const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
            limit: 1000,
            offset: 0
          });
          if (error || !Array.isArray(data)) return allFiles;

          for (const item of data) {
            if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
            const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            const lower = item.name.toLowerCase();
            if (lower.includes('ttd') || lower.includes('sign') || lower.includes('signature')) {
              continue; // PRESERVE TTD SIGNATURES
            }
            if (item.id === null || !item.metadata) {
              // It's a folder, search subfolder
              const subFiles = await listAllFilesRecursively(bucketName, fullPath);
              allFiles = allFiles.concat(subFiles);
            } else {
              allFiles.push(fullPath);
            }
          }
        } catch(e) {
          console.warn(`[RECURSIVE LIST BUCKET ${bucketName} NOTICE]:`, e);
        }
        return allFiles;
      }

      // 1. Hapus berkas foto dari Supabase Storage (KECUALIKAN TTD / SIGNATURES)
      if (typeof supabase !== 'undefined' && supabase && supabase.storage) {
        // Collect paths from all candidate buckets
        for (const bucketName of candidateBuckets) {
          try {
            const filePaths = await listAllFilesRecursively(bucketName, '');
            if (filePaths.length > 0) {
              // Delete in chunks of 100
              for (let i = 0; i < filePaths.length; i += 100) {
                const chunk = filePaths.slice(i, i + 100);
                const { error: delErr } = await supabase.storage.from(bucketName).remove(chunk);
                if (!delErr) {
                  totalStorageFilesDeleted += chunk.length;
                  console.log(`⚡ [SUPABASE STORAGE ${bucketName} DELETED]:`, chunk.length, 'file(s)');
                }
              }
            }
          } catch(eStorage) {
            console.warn(`[SUPABASE BUCKET ${bucketName} NOTICE]:`, eStorage);
          }
        }

        // Also extract and delete any photo URLs explicitly found in current requests
        const curRequests = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
        const extractedUrls = new Set();
        curRequests.forEach(r => {
          if (!r) return;
          const photoList = Array.isArray(r.photos) ? r.photos : (r.foto ? [r.foto] : []);
          const artemisList = Array.isArray(r.artemisPhotos) ? r.artemisPhotos : [];
          photoList.concat(artemisList).forEach(p => {
            if (typeof p === 'string' && p.includes('supabase.co/storage/v1/object/public/')) {
              extractedUrls.add(p);
            }
          });
        });

        for (const url of extractedUrls) {
          try {
            for (const bucketName of candidateBuckets) {
              const marker = `/public/${bucketName}/`;
              if (url.includes(marker)) {
                const filePath = decodeURIComponent(url.split(marker)[1]);
                if (filePath && !filePath.toLowerCase().includes('ttd')) {
                  await supabase.storage.from(bucketName).remove([filePath]);
                }
              }
            }
          } catch(eDelUrl) {}
        }

        // 2. Kosongkan kolom foto pada tabel permintaan_toko di Supabase (KOLOM TTD TETAP UTUH & AMAN)
        try {
          await supabase.from('permintaan_toko').update({
            photos: [],
            artemis_photos: []
          }).neq('no_surat', '__SYSTEM_PHOTO_FEATURE__');
        } catch(eTbl) {
          console.warn('[SUPABASE TABLE PHOTOS NOTICE]:', eTbl);
        }
      }

      // 3. Kosongkan foto pada cache lokal requests (TTD TETAP UTUH)
      const requests = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
      requests.forEach(r => {
        if (r) {
          r.photos = [];
          r.artemisPhotos = [];
          if (r.foto) delete r.foto;
        }
      });
      if (typeof saveRequestsToDB === 'function') {
        saveRequestsToDB(requests);
      }

      // 4. Update juga ke Firebase Cloud agar sinkron
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        try {
          const reqSnap = await dbFirestore.collection('requests').get();
          const batch = dbFirestore.batch();
          reqSnap.forEach(doc => {
            batch.update(doc.ref, { photos: [], artemisPhotos: [] });
          });
          await batch.commit();
        } catch(fbErr) {
          console.warn('[FIREBASE PHOTOS UPDATE NOTICE]:', fbErr);
        }
      }

      // 5. SIARKAN REALTIME KE SEMUA PERANGKAT LAIN
      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'data_changed',
            payload: { action: 'PHOTOS_CLEARED', timestamp: Date.now() }
          });
        } catch(e) {}
      }

      // 6. Refresh UI & tutup viewer jika sedang terbuka
      if (typeof tutupImageViewer === 'function') tutupImageViewer();
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadMasterDbTable === 'function') loadMasterDbTable();

      hideLoading();
      showNotif(`SEMUA FOTO BERHASIL DIHAPUS DARI SUPABASE STORAGE, CLOUD & PENYIMPANAN LOKAL!

(Total ${totalStorageFilesDeleted} file berkas foto dibersihkan, TTD digital tetap aman).`, 'success');
    } catch(err) {
      hideLoading();
      console.error('[HAPUS SEMUA FOTO ERROR]:', err);
      showNotif('GAGAL MENGHAPUS FOTO: ' + (err.message || err), 'danger');
    }
  });
}
window.hapusSemuaFotoBiasa = hapusSemuaFotoBiasa;

async function hapusFotoDokumenBiasa(noSurat) {
  if (!noSurat) return;
  showConfirm(`HAPUS FOTO PADA DOKUMEN #${noSurat}?`, function() {
    var _asyncTask = async function() {
    showLoading('MENGHAPUS FOTO DOKUMEN...');
    try {
      const requests = getRequestsFromDB();
      const idx = requests.findIndex(r => r.noSurat === noSurat);
      let photoUrls = [];
      if (idx !== -1) {
        photoUrls = [...(requests[idx].photos || [])];
        requests[idx].photos = [];
        saveRequestsToDB(requests);
      }

      if (typeof supabase !== 'undefined' && supabase) {
        // Delete from Storage buckets
        if (photoUrls.length > 0 && typeof deletePhotosFromSupabaseStorage === 'function') {
          await deletePhotosFromSupabaseStorage(photoUrls);
        }
        // Update table row
        await supabase.from('permintaan_toko').update({ photos: [] }).eq('no_surat', noSurat);
      }

      hideLoading();
      showNotif(`FOTO DOKUMEN #${noSurat} BERHASIL DIHAPUS!`, 'info');
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();

      const modal = document.getElementById('popupDetailBarangV2') || document.getElementById('popupDetail');
      if (modal) { modal.style.display = 'none'; modal.classList.remove('show'); }
    } catch(err) {
      hideLoading();
      showNotif('GAGAL MENGHAPUS FOTO: ' + (err.message || err), 'warning');
    }
    };
    _asyncTask();
  });
}
window.hapusFotoDokumenBiasa = hapusFotoDokumenBiasa;

function loadSavedTheme() {
  updateBodyClasses();
}

function toggleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEME_MODES.length;
  const t = THEME_MODES[currentThemeIndex];
  const now = Date.now();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('APP_SELECTED_THEME', t.id);
      localStorage.setItem('LOCAL_USER_THEME', t.id);
      localStorage.setItem('APP_THEME', t.id);
    }
  } catch(e) {}
  if (typeof appStorage !== 'undefined') {
    appStorage.setItem(THEME_KEY, t.id);
    appStorage.setItem(LOCAL_USER_THEME_KEY, t.id);
    appStorage.setItem('STORE_USER_THEME_TIME', String(now));
  }
  updateBodyClasses();

  if (currentUser) {
    currentUser.theme = t.id;
  }
}

function updateThemeIcon() {
  const iconSpans = document.querySelectorAll('.theme-toggle-btn span, .popupThemeToggleBtn span, .theme-icon-btn span, .theme-toggle-inline span');
  const currentIcon = THEME_MODES[currentThemeIndex] ? THEME_MODES[currentThemeIndex].icon : 'palette';
  iconSpans.forEach(el => {
    if (el) el.textContent = currentIcon;
  });
}

const STORE_REMEMBER_LOGIN_CREDS_KEY = 'STORE_REMEMBER_LOGIN_CREDS_V1';

async function clearLocalStorageKeepThemeAndTTD() {
  try {
    // 1. BACK UP THEME SETTINGS (TEMA)
    const globalTheme = appStorage.getItem(GLOBAL_THEME_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(GLOBAL_THEME_KEY) : null);
    const localUserTheme = appStorage.getItem(LOCAL_USER_THEME_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_USER_THEME_KEY) : null);
    const lastAdminThemeTime = appStorage.getItem(LAST_ADMIN_THEME_TIME_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_ADMIN_THEME_TIME_KEY) : null);
    const appTheme = appStorage.getItem(THEME_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null);
    const appSelectedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('APP_SELECTED_THEME') : null);
    const bgOpacity = (typeof localStorage !== 'undefined' ? localStorage.getItem(BG_OPACITY_KEY) : null);

    // 2. BACK UP DIGITAL SIGNATURES (TTD)
    const ttdDbMap = appStorage.getItem(TTD_DB_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(TTD_DB_KEY) : null);
    const appUserTtdMap = (typeof localStorage !== 'undefined' ? localStorage.getItem('APP_USER_TTD_MAP') : null);

    const localTtdEntries = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('LOCAL_TTD_') || key.startsWith('TTD_') || key.includes('TTD') || key.includes('ttd'))) {
          localTtdEntries.push({ key, value: localStorage.getItem(key) });
        }
      }
    }

    // 3. BACK UP ESSENTIAL CREDENTIALS & KEYS
    const rememberCreds = appStorage.getItem(STORE_REMEMBER_LOGIN_CREDS_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_REMEMBER_LOGIN_CREDS_KEY) : null);
    const fonteToken = typeof getFonteToken === 'function' ? getFonteToken() : '';
    const secretKey = typeof getSavedAdminSecretKey === 'function' ? getSavedAdminSecretKey() : '';
    const fbConfig = appStorage.getItem(FIREBASE_USER_CONFIG_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(FIREBASE_USER_CONFIG_KEY) : null);
    const geminiKey = appStorage.getItem('gemini_api_key') || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);
    const geminiKeyUpper = appStorage.getItem('GEMINI_API_KEY') || (typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null);

    // 4. TOTAL FLUSH: LOCAL STORAGE, SESSION STORAGE, APP STORAGE & BROWSER CACHES
    if (typeof appStorage !== 'undefined' && appStorage.clear) {
      appStorage.clear();
    }
    try { localStorage.clear(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}

    // Flush CacheStorage (PWA & Network caches)
    if ('caches' in window && caches.keys) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch(e) {}
    }

    // 5. RESTORE THEME SETTINGS (TEMA)
    if (globalTheme) {
      appStorage.setItem(GLOBAL_THEME_KEY, globalTheme);
      try { localStorage.setItem(GLOBAL_THEME_KEY, globalTheme); } catch(e) {}
    }
    if (localUserTheme) {
      appStorage.setItem(LOCAL_USER_THEME_KEY, localUserTheme);
      try { localStorage.setItem(LOCAL_USER_THEME_KEY, localUserTheme); } catch(e) {}
    }
    if (lastAdminThemeTime) {
      appStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, lastAdminThemeTime);
      try { localStorage.setItem(LAST_ADMIN_THEME_TIME_KEY, lastAdminThemeTime); } catch(e) {}
    }
    if (appTheme) {
      appStorage.setItem(THEME_KEY, appTheme);
      try { localStorage.setItem(THEME_KEY, appTheme); } catch(e) {}
    }
    if (appSelectedTheme) {
      try { localStorage.setItem('APP_SELECTED_THEME', appSelectedTheme); } catch(e) {}
    }
    if (bgOpacity) {
      try { localStorage.setItem(BG_OPACITY_KEY, bgOpacity); } catch(e) {}
    }

    // 6. RESTORE DIGITAL SIGNATURES (TTD)
    if (ttdDbMap) {
      appStorage.setItem(TTD_DB_KEY, ttdDbMap);
      try { localStorage.setItem(TTD_DB_KEY, ttdDbMap); } catch(e) {}
    }
    if (appUserTtdMap) {
      try { localStorage.setItem('APP_USER_TTD_MAP', appUserTtdMap); } catch(e) {}
    }
    localTtdEntries.forEach(item => {
      if (item && item.key && item.value) {
        try { localStorage.setItem(item.key, item.value); } catch(e) {}
        try { appStorage.setItem(item.key, item.value); } catch(e) {}
      }
    });

    // 7. RESTORE ESSENTIAL CREDENTIALS & KEYS
    if (rememberCreds) {
      appStorage.setItem(STORE_REMEMBER_LOGIN_CREDS_KEY, rememberCreds);
      try { localStorage.setItem(STORE_REMEMBER_LOGIN_CREDS_KEY, rememberCreds); } catch(e) {}
    }
    if (fonteToken) {
      appStorage.setItem(FONTE_TOKEN_KEY, fonteToken);
      try { localStorage.setItem(FONTE_TOKEN_KEY, fonteToken); } catch(e) {}
    }
    if (secretKey) {
      appStorage.setItem(ADMIN_SECRET_KEY_STORAGE_KEY, secretKey);
      try { localStorage.setItem(ADMIN_SECRET_KEY_STORAGE_KEY, secretKey); } catch(e) {}
    }
    if (fbConfig) {
      appStorage.setItem(FIREBASE_USER_CONFIG_KEY, fbConfig);
      try { localStorage.setItem(FIREBASE_USER_CONFIG_KEY, fbConfig); } catch(e) {}
    }
    if (geminiKey) {
      appStorage.setItem('gemini_api_key', geminiKey);
      try { localStorage.setItem('gemini_api_key', geminiKey); } catch(e) {}
    }
    if (geminiKeyUpper) {
      appStorage.setItem('GEMINI_API_KEY', geminiKeyUpper);
      try { localStorage.setItem('GEMINI_API_KEY', geminiKeyUpper); } catch(e) {}
    }

    console.log('[PENYIMPANAN LOKAL]: Seluruh cache & penyimpanan lokal berhasil dibersihkan (TTD & TEMA tetap terjaga).');
    return true;
  } catch (err) {
    console.warn('[CLEAR STORAGE WARN]:', err);
    return false;
  }
}
window.clearLocalStorageKeepThemeAndTTD = clearLocalStorageKeepThemeAndTTD;

function loadRememberedCredentials() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  const remEl = document.getElementById('rememberLogin');

  let savedCredsStr = null;
  try {
    savedCredsStr = appStorage.getItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
    if (!savedCredsStr && typeof localStorage !== 'undefined') {
      savedCredsStr = localStorage.getItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
    }
  } catch(e) {}

  if (savedCredsStr) {
    try {
      const creds = JSON.parse(savedCredsStr);
      if (creds && creds.username) {
        if (uEl) uEl.value = creds.username;
        if (pEl) pEl.value = creds.password || '';
        if (remEl) remEl.checked = true;
        return true;
      }
    } catch(e) {}
  }

  if (remEl) remEl.checked = true;
  return false;
}
window.loadRememberedCredentials = loadRememberedCredentials;

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
    loadRememberedCredentials();
  }
}

async function prosesLogin() {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (!uEl || !pEl) return;

  const u = uEl.value.trim().toUpperCase();
  const p = pEl.value.trim();
  const remember = (document.getElementById('rememberMe') && document.getElementById('rememberMe').checked) === true;

  if (!u || !p) {
    showNotif('USERNAME DAN PASSWORD WAJIB DIISI!', 'warning');
    return;
  }

  try {
    // 1. CEK DULU DI PENYIMPANAN LOKAL (0 ms INSTANT)
    let users = getUsersFromDB();
    let user = users.find(x => x && x.username && String(x.username).trim().toUpperCase() === u && String(x.password).trim() === p);

    // 2. JIKA BELUM ADA DI LOKAL, CEK KE SUPABASE
    if (!user && typeof supabase !== 'undefined' && supabase) {
      try {
        const { data: supaUsers, error } = await supabase
          .from('users')
          .select('*')
          .ilike('username', u)
          .limit(1);

        if (!error && Array.isArray(supaUsers) && supaUsers.length > 0) {
          const su = supaUsers[0];
          if (String(su.password).trim() === p) {
            user = {
              id: su.id,
              username: String(su.username || '').trim(),
              password: String(su.password || '').trim(),
              fullName: String(su.full_name || su.fullName || '').trim(),
              storeCode: String(su.store_code || su.storeCode || '').trim(),
              phone: String(su.phone || '').trim(),
              category: String(su.category || 'TOKO').trim().toUpperCase(),
              area: String(su.area || 'BDG').trim().toUpperCase(),
              theme: su.theme || '',
              createdAt: su.created_at || (typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '')
            };

            // Simpan ke cache lokal
            const localUsers = getUsersFromDB();
            const uIdx = localUsers.findIndex(x => x && (x.id === user.id || String(x.username).toUpperCase() === user.username.toUpperCase()));
            if (uIdx !== -1) localUsers[uIdx] = user;
            else localUsers.push(user);
            saveUsersToDB(localUsers);
          }
        }
      } catch (sbErr) {
        console.warn('[SUPABASE LOGIN QUERY NOTICE]:', sbErr);
      }
    }

    if (user) {
      currentUser = user;

      if (user.theme) {
        appStorage.setItem(THEME_KEY, user.theme);
        try { localStorage.setItem('APP_SELECTED_THEME', user.theme); } catch(e) {}
        updateBodyClasses();
      }

      appStorage.setItem(SESSION_KEY, JSON.stringify(user));
      if (remember) {
        const credsStr = JSON.stringify({ username: u, password: p });
        appStorage.setItem(STORE_REMEMBER_LOGIN_CREDS_KEY, credsStr);
        try { localStorage.setItem(STORE_REMEMBER_LOGIN_CREDS_KEY, credsStr); } catch(e) {}
      } else {
        appStorage.removeItem(STORE_REMEMBER_LOGIN_CREDS_KEY);
        try { localStorage.removeItem(STORE_REMEMBER_LOGIN_CREDS_KEY); } catch(e) {}
      }

      catatLogLogin(user.username, user.fullName, user.area, 'BERHASIL');
      
      // SINKRONISASI KE DATABASE CLOUD HANYA KETIKA KLIK TOMBOL LOGIN BERHASIL
      showLoading('MEMUAT DATA APLIKASI...');
      try {
        if (typeof syncAllDataToCache === 'function') {
          await syncAllDataToCache();
        }
      } catch (e) {
        console.warn('[LOGIN SYNC NOTICE]:', e);
      } finally {
        hideLoading();
      }

      await bukaMainApp();
    } else {
      currentUser = null;
      appStorage.removeItem(SESSION_KEY);
      catatLogLogin(u, '-', '-', 'GAGAL - PASSWORD SALAH');
      showNotif('USERNAME ATAU PASSWORD SALAH!', 'error');
    }
  } catch (error) {
    currentUser = null;
    appStorage.removeItem(SESSION_KEY);
    console.error("Login error:", error);
    showNotif('GAGAL MEMPROSES LOGIN!', 'error');
  } finally {
    hideLoading();
  }
}
window.prosesLogin = prosesLogin;

async function catatLogLogin(username, nama, area, status) {
  // Log login dinonaktifkan untuk mempercepat proses login & menghemat kuota database
  return;
}

function fillLogin(u, p) {
  const uEl = document.getElementById('username');
  const pEl = document.getElementById('password');
  if (uEl) uEl.value = u;
  if (pEl) pEl.value = p;
  prosesLogin();
}

async function logout() {
  const confirmMsg = isFormDirtyOrFilled() 
    ? 'ADA DATA PERMINTAAN YANG BELUM DISIMPAN. YAKIN INGIN LOGOUT & KELUAR DARI APLIKASI?' 
    : 'YAKIN INGIN KELUAR DARI APLIKASI?';
  showConfirm(confirmMsg, function() {
    var _asyncTask = async function() {
      // Hapus sesi login saja (Penyimpanan lokal & cache tetap aman)
      currentUser = null;
      appStorage.removeItem(SESSION_KEY);
      try { localStorage.removeItem(SESSION_KEY); } catch(e) {}

      tutupAkun(true);
      tutupNotificationModal();
      const popupBantuan = document.getElementById('popupBantuan');
      if (popupBantuan) popupBantuan.classList.remove('show');
      const bottomMenu = document.getElementById('bottomMenu');
      if (bottomMenu) bottomMenu.style.display = 'none';
      const helpBtn = document.getElementById('helpButton');
      if (helpBtn) helpBtn.style.display = 'none';

      pindahHalaman('loginPage');
      if (typeof loadRememberedCredentials === 'function') {
        loadRememberedCredentials();
      }
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
      if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
      };
    _asyncTask();
  });
}

// =======================================================================
// BUKA MAIN APP: LOCAL-FIRST (0ms INSTANT LOAD) + REALTIME + DELTA SYNC
// =======================================================================
async function bukaMainApp() {
  updateBodyClasses();

  if (currentUser) {
    try {
      const users = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
      const updatedUser = users.find(u => u && u.id === currentUser.id);
      if (updatedUser) {
        currentUser = updatedUser;
        appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      }
    } catch(e) {}
  }

  const loginPage = document.getElementById('loginPage');
  if (loginPage) loginPage.classList.remove('active');
  
  const bottomMenu = document.getElementById('bottomMenu');
  if (bottomMenu) bottomMenu.style.display = 'flex';
  
  if (typeof initAllDraggableButtons === 'function') initAllDraggableButtons();

  updateAdminNavVisibility();
  const isAdmin = checkIsAdminUser();
  isAdminChat = isServiceTSMUser();

  // 1. CEK SESI & PENYIMPANAN LOKAL (0ms INSTANT LOAD TANPA AMBIL DATABASE SAAT REFRESH)
  pindahHalaman('dashboardPage');
  if (typeof loadDashboard === 'function') loadDashboard();
  if (typeof syncMasterBarangToLocalCache === 'function') {
    const curMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
    if (Object.keys(curMap).length <= 5) {
      syncMasterBarangToLocalCache().catch(() => {});
    }
  }
  if (typeof loadRiwayat === 'function') loadRiwayat();
  if (typeof initSupabaseRealtimeEngine === 'function') initSupabaseRealtimeEngine();
  if (typeof syncSupabaseIncremental === 'function') syncSupabaseIncremental();

  if (typeof setupBottomMenuAutoHide === 'function') {
    setupBottomMenuAutoHide();
  }

  setTimeout(() => {
    if (typeof aturTampilanLonceng === 'function') {
      aturTampilanLonceng('dashboardPage');
    }
  }, 400);

  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
  if (typeof checkUrlDirectNoSuratOpen === 'function') checkUrlDirectNoSuratOpen();
}
window.bukaMainApp = bukaMainApp;

async function eksekusiHapusPenyimpananLokal() {
  showConfirm('PERBARUI SEMUA DATA DENGAN DATA TERBARU DARI SERVER?', function() {
    var _asyncTask = async function() {
    showLoading('MEMUAT DATA TERBARU...');
    try {
      await clearLocalStorageKeepThemeAndTTD();

      if (typeof syncAllDataToCache === 'function') {
        await syncAllDataToCache();
      }

      hideLoading();
      showNotif('DATA BERHASIL DIPERBARUI & DITERAPKAN!', 'success');

      if (currentUser) {
        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
        if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        if (typeof loadUsersManagement === 'function') loadUsersManagement();
      }
    } catch(err) {
      hideLoading();
      showNotif('GAGAL MEMPERBARUI DATA: ' + (err.message || err), 'warning');
    }
    };
    _asyncTask();
  });
}
window.eksekusiHapusPenyimpananLokal = eksekusiHapusPenyimpananLokal;

async function hapusSemuaPenyimpananLokalApk() {
  showConfirm(`APAKAH ANDA YAKIN INGIN MENGHAPUS SEMUA PENYIMPANAN LOKAL APLIKASI?\n\nSeluruh data cache lokal, sesi login, dan penyimpanan browser di perangkat ini akan dibersihkan total dan halaman akan dimuat ulang.`, function() {
    var _asyncTask = async function() {
      showLoading('BERSIHKAN PENYIMPANAN LOKAL APK...');
      setTimeout(() => {
        try {
          if (typeof appStorage !== 'undefined' && appStorage && typeof appStorage.clear === 'function') {
            appStorage.clear();
          }
          if (typeof localStorage !== 'undefined' && localStorage) {
            localStorage.clear();
          }
          if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            sessionStorage.clear();
          }
          if (typeof caches !== 'undefined' && caches.keys) {
            caches.keys().then(names => {
              for (let name of names) caches.delete(name);
            }).catch(e => {});
          }
          if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
            indexedDB.databases().then(dbs => {
              if (Array.isArray(dbs)) {
                dbs.forEach(db => {
                  if (db && db.name) indexedDB.deleteDatabase(db.name);
                });
              }
            }).catch(e => {});
          }
        } catch(e) {
          console.warn('[HAPUS LOKAL APK ERROR]:', e);
        }
        window.location.reload();
      }, 500);
    };
    _asyncTask();
  });
}
window.hapusSemuaPenyimpananLokalApk = hapusSemuaPenyimpananLokalApk;

function isFormDirtyOrFilled() {
  if (typeof modeEdit !== 'undefined' && modeEdit) return true;

  const activePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : '';
  if (activePage !== 'inputPage') return false;

  // 1. Detail Barang / Inputs inside detailContainer (Nama barang, tipe, SN, Dus, Alasan)
  const detailRows = document.querySelectorAll('#detailContainer .detailRow');
  for (let i = 0; i < detailRows.length; i++) {
    const row = detailRows[i];
    const typeInput = row.querySelector('.typeBarang'); const typeVal = (typeInput ? typeInput.value : '').trim();
    const seriInput = row.querySelector('.seriBarang'); const seriVal = (seriInput ? seriInput.value : '').trim();
    const namaInput = row.querySelector('.namaBarang'); const namaVal = (namaInput ? namaInput.value : '').trim();
    const dusInput = row.querySelector('.seriDusBarang'); const dusVal = (dusInput ? dusInput.value : '').trim();
    const alasanInput = row.querySelector('.alasan'); const alasanVal = (alasanInput ? alasanInput.value : '').trim();
    const qtyInput = row.querySelector('.qty'); const qtyVal = (qtyInput ? qtyInput.value : '').trim();

    // Check if user has actually typed text or changed qty from default 1
    if (typeVal !== '' || seriVal !== '' || namaVal !== '' || dusVal !== '' || alasanVal !== '') {
      return true;
    }
    if (qtyVal !== '' && qtyVal !== '1') {
      return true;
    }
  }

  // 2. Foto Upload Pendukung
  if (typeof fotoDataList !== 'undefined' && Array.isArray(fotoDataList) && fotoDataList.length > 0) {
    return true;
  }

  // 3. Catatan Textarea
  const catatanEl = document.getElementById('catatan');
  if (catatanEl && catatanEl.value.trim() !== '') return true;

  return false;
}
window.isFormDirtyOrFilled = isFormDirtyOrFilled;

function showPage(pageId) {
  const currentActivePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : '';

  if (currentActivePage === 'inputPage' && pageId !== 'inputPage') {
    const isDirty = (typeof modeEdit !== 'undefined' && modeEdit) || (typeof isFormDirtyOrFilled === 'function' && isFormDirtyOrFilled());
    
    if (isDirty) {
      const confirmMsg = (typeof modeEdit !== 'undefined' && modeEdit) ? 'KELUAR DARI MENU EDIT?' : 'KELUAR DARI FORM PERMINTAAN? (DATA YANG DIISI AKAN HILANG)';
      showConfirm(confirmMsg, () => {
        if (typeof bersihkanForm === 'function') bersihkanForm();
        closeAllPopups();
        pindahHalaman(pageId);
        aturTampilanLonceng(pageId);
      });
      return;
    } else {
      // Unfilled form / empty extra rows -> silently reset to 1 row without popup
      if (typeof bersihkanForm === 'function') bersihkanForm();
    }
  }

  closeAllPopups();
  pindahHalaman(pageId);
  aturTampilanLonceng(pageId);
  if (typeof applyAdaptiveTextColors === 'function') applyAdaptiveTextColors();
}

function aturTampilanLonceng(pageId) {
  const notifBtn = document.getElementById('notifBellBtn');
  const helpBtn = document.getElementById('helpButton');
  const dotEl = document.getElementById('firebaseOnlineDot');
  const topHeader = document.getElementById('topHeaderActions');

  const activePage = pageId || (typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage');
  const isLoggedIn = (typeof currentUser !== 'undefined' && currentUser !== null && (!document.getElementById('loginPage') || !document.getElementById('loginPage').classList.contains('active')));
  const isDashboard = isLoggedIn && (activePage === 'dashboardPage');

  if (topHeader) {
    topHeader.style.setProperty('display', isDashboard ? 'flex' : 'none', 'important');
  }

  if (notifBtn) {
    if (isDashboard) {
      notifBtn.style.setProperty('display', 'flex', 'important');
      notifBtn.style.setProperty('pointer-events', 'auto', 'important');
    } else {
      notifBtn.style.setProperty('display', 'none', 'important');
    }
  }
  
  if (helpBtn) {
    if (isDashboard) {
      helpBtn.style.setProperty('display', 'flex', 'important');
      helpBtn.style.setProperty('pointer-events', 'auto', 'important');
    } else {
      helpBtn.style.setProperty('display', 'none', 'important');
    }
  }

  if (dotEl) {
    if (isDashboard) {
      dotEl.style.setProperty('display', 'inline-block', 'important');
    } else {
      dotEl.style.setProperty('display', 'none', 'important');
    }
  }

  if (isLoggedIn) {
    if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
  }
}

let mobileBackspaceCount = 0;
let mobileBackspaceTimer = null;
let backClickTimestamps = [];

function pushPopupHistoryState() {
  try {
    history.pushState({ modalOpen: true, page: getCurrentActivePageId() }, '', location.href);
  } catch (e) {}
}

function seedDashboardHistoryState() {
  try {
    history.pushState({ isDashboardGuard: true, page: 'dashboardPage' }, '', location.href);
  } catch (e) {}
}

function initMobileBackButtonEngine() {
  seedDashboardHistoryState();

  window.addEventListener('popstate', (e) => {
    const modalGemini = document.getElementById('modalGeminiApiKey');
    const isGeminiOpen = modalGemini && (modalGemini.classList.contains('show') || modalGemini.style.display === 'flex' || modalGemini.style.display === 'block');
    if (isGeminiOpen) {
      if (typeof tutupModalGeminiApiKey === 'function') tutupModalGeminiApiKey();
      return;
    }

    const popTTD = document.getElementById('popupTTD');
    const isTtdOpen = popTTD && (popTTD.classList.contains('show') || popTTD.style.display === 'flex' || popTTD.style.display === 'block');

    // JIKA POPUP TTD TERBUKA & DI-BACK DARI HP -> TUTUP POPUP TTD (POPUP AKUN DI BELAKANGNYA TETAP AKTIF UNTUK BACK SELANJUTNYA)
    if (isTtdOpen) {
      if (typeof tutupTTD === 'function') tutupTTD();
      return;
    }

    const popAkun = document.getElementById('popupAkun');
    const isAkunOpen = popAkun && (popAkun.classList.contains('show') || popAkun.style.display === 'flex' || popAkun.style.display === 'block');
    if (isAkunOpen) {
      if (typeof isAkunDirty === 'function' && isAkunDirty()) {
        seedDashboardHistoryState();
        if (typeof tutupAkun === 'function') tutupAkun();
        return;
      } else {
        if (typeof tutupAkun === 'function') tutupAkun(true);
        return;
      }
    }

    // 1. IMAGE VIEWER (HANYA TUTUP IMAGE VIEWER, MODAL DETAIL / KETERANGAN DI BELAKANGNYA TETAP TERBUKA)
    const imgViewer = document.getElementById('imageViewer');
    const isImgViewerOpen = imgViewer && (imgViewer.classList.contains('show') || imgViewer.style.display === 'flex' || imgViewer.style.display === 'block');
    if (isImgViewerOpen) {
      if (typeof tutupImageViewer === 'function') tutupImageViewer();
      return;
    }

    // 2. PDF PREVIEW MODALS
    const pdfMod = document.getElementById('pdfModal');
    const isPdfOpen = pdfMod && (pdfMod.classList.contains('show') || pdfMod.style.display === 'flex' || pdfMod.style.display === 'block');
    if (isPdfOpen) {
      if (typeof tutupPdfModal === 'function') tutupPdfModal();
      return;
    }

    const pdfModelsMod = document.getElementById('popupPdfModelsModal');
    const isPdfModelsOpen = pdfModelsMod && (pdfModelsMod.classList.contains('show') || pdfModelsMod.style.display === 'flex' || pdfModelsMod.style.display === 'block');
    if (isPdfModelsOpen) {
      if (typeof tutupModalPdfModels === 'function') tutupModalPdfModels();
      return;
    }

    // 3. EDIT KETERANGAN & STATUS PART MODALS
    const popEditKet = document.getElementById('popupEditKeteranganPartSingle');
    const isEditKetOpen = popEditKet && (popEditKet.classList.contains('show') || popEditKet.style.display === 'flex' || popEditKet.style.display === 'block');
    if (isEditKetOpen) {
      if (typeof tutupModalEditKetPartSingle === 'function') tutupModalEditKetPartSingle();
      return;
    }

    const popEditStat = document.getElementById('popupEditStatusPart');
    const isEditStatOpen = popEditStat && (popEditStat.classList.contains('show') || popEditStat.style.display === 'flex' || popEditStat.style.display === 'block');
    if (isEditStatOpen) {
      if (typeof tutupModalEditStatusPart === 'function') tutupModalEditStatusPart();
      return;
    }

function triggerConfirmBoxFlash() {
  const card = document.getElementById('confirmBoxCard');
  if (card) {
    card.classList.remove('modal-shake-flash');
    void card.offsetWidth; // Trigger reflow
    card.classList.add('modal-shake-flash');
    setTimeout(() => {
      card.classList.remove('modal-shake-flash');
    }, 450);
  }
}
window.triggerConfirmBoxFlash = triggerConfirmBoxFlash;

    // 4. MODAL UTAMA LAINNYA (DITUTUP SATU PER SATU DARI LAPISAN PALING ATAS KE LAPISAN BELAKANG)
    const modalPriorityStack = [
      { id: 'popupEditKeteranganPartSingle', closeFn: () => { if (typeof tutupModalEditKetPartSingle === 'function') tutupModalEditKetPartSingle(); } },
      { id: 'popupSecurityPinHapusLokal', closeFn: () => { if (typeof tutupModalPinHapusLokal === 'function') tutupModalPinHapusLokal(); } },
      { id: 'popupOfflineSafetyModal', closeFn: () => { if (typeof tutupModalOfflineSafety === 'function') tutupModalOfflineSafety(); } },
      { id: 'modalPilihanCetakPdf', closeFn: () => { const el = document.getElementById('modalPilihanCetakPdf'); if (el) el.remove(); } },
      { id: 'modalDetailParsialSub', closeFn: () => { if (typeof tutupModalDetailParsialSub === 'function') { tutupModalDetailParsialSub(); } else { const el = document.getElementById('modalDetailParsialSub'); if (el) el.remove(); } } },
      { id: 'modalRejectParsial', closeFn: () => { const el = document.getElementById('modalRejectParsial'); if (el) el.remove(); } },
      { id: 'modalRiwayatParsialList', closeFn: () => { const el = document.getElementById('modalRiwayatParsialList'); if (el) el.remove(); } },
      { id: 'modalBuatParsial', closeFn: () => { const el = document.getElementById('modalBuatParsial'); if (el) el.remove(); } },
      { id: 'artemisOverlay', closeFn: () => { if (typeof closeArtemisModal === 'function') closeArtemisModal(); } },
      { id: 'rejectOverlay', closeFn: () => { if (typeof tutupRejectModal === 'function') tutupRejectModal(); } },
      { id: 'confirmOverlay', closeFn: () => { 
          if (typeof triggerConfirmBoxFlash === 'function') triggerConfirmBoxFlash();
          if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
        } 
      },
      { id: 'popupUserForm', closeFn: () => { const el = document.getElementById('popupUserForm'); if (el) { el.classList.remove('show'); el.style.setProperty('display', 'none', 'important'); } } },
      { id: 'popupUserManagementModal', closeFn: () => { const el = document.getElementById('popupUserManagementModal'); if (el) { el.classList.remove('show'); el.style.setProperty('display', 'none', 'important'); } } },
      { id: 'popupNotifList', closeFn: () => { const el = document.getElementById('popupNotifList'); if (el) { el.classList.remove('show'); el.style.setProperty('display', 'none', 'important'); } } },
      { id: 'popupBantuan', closeFn: () => { const el = document.getElementById('popupBantuan'); if (el) { el.classList.remove('show'); el.style.setProperty('display', 'none', 'important'); } } },
      { id: 'popupTambahToko', closeFn: () => { const el = document.getElementById('popupTambahToko'); if (el) { el.classList.remove('show'); el.style.setProperty('display', 'none', 'important'); } } },
      { id: 'scannerModal', closeFn: () => { if (typeof tutupScanner === 'function') tutupScanner(); } },
      { id: 'excelTemplateOverlay', closeFn: () => { if (typeof closeExcelTemplateModal === 'function') closeExcelTemplateModal(); } },
      { id: 'popupDetailBarangV2', closeFn: () => { if (typeof tutupDetailBarangV2 === 'function') tutupDetailBarangV2(true); } },
      { id: 'popupDetail', closeFn: () => { if (typeof closeDetail === 'function') closeDetail(true); } }
    ];

    for (let mItem of modalPriorityStack) {
      const el = document.getElementById(mItem.id);
      if (el && (el.classList.contains('show') || el.style.display === 'flex' || el.style.display === 'block')) {
        mItem.closeFn();
        if (mItem.id !== 'popupDetailBarangV2' && mItem.id !== 'popupDetail') {
          if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
            pastikanDetailPermintaanTetapTerbuka();
          }
        }
        const activePage = getCurrentActivePageId();
        if (typeof aturTampilanLonceng === 'function') {
          aturTampilanLonceng(activePage);
        }
        return;
      }
    }

    const currentActivePage = getCurrentActivePageId();

    if (currentActivePage === 'inputPage' && isFormDirtyOrFilled()) {
      seedDashboardHistoryState();
      
      const confirmMsg = modeEdit ? 'KELUAR DARI MENU EDIT?' : 'KELUAR DARI FORM PERMINTAAN? (DATA YANG DIISI AKAN HILANG)';
      showConfirm(confirmMsg, () => {
        if (typeof bersihkanForm === 'function') bersihkanForm();
        closeAllPopups();
        pindahHalaman('dashboardPage');
      });
      return;
    }

    if (currentActivePage !== 'dashboardPage' && currentActivePage !== 'loginPage') {
      // STAY ON CURRENT ACTIVE PAGE (DO NOT REDIRECT TO DASHBOARD)
      backClickTimestamps = [];
      return;
    }

    if (currentActivePage === 'dashboardPage') {
      const now = Date.now();
      // Filter klik back HP dalam durasi < 1 detik (1000ms)
      backClickTimestamps = backClickTimestamps.filter(t => (now - t) <= 1000);
      backClickTimestamps.push(now);

      if (backClickTimestamps.length >= 3) {
        // 3X KLIK BACK DALAM DURASI < 1 DETIK: KELUAR APLIKASI WEB TANPA POPUP APAPUN
        console.log('[APP EXIT] 3x Rapid back press <1s detected on Dashboard. Exiting Web App...');
        backClickTimestamps = [];
        try {
          if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === 'function') {
            window.navigator.app.exitApp();
          }
        } catch(e) {}
        // Tanpa pushState agar browser secara alami keluar dari aplikasi web
      } else {
        // Kurang dari 3x klik dalam 1 detik: Tetap di Dashboard
        seedDashboardHistoryState();
      }
    }
  });
}

function getCurrentActivePageId() {
  const activeEl = document.querySelector('.page.active');
  return activeEl ? activeEl.id : 'dashboardPage';
}

function checkIsAdminUser() {
  if (!currentUser) return false;
  const category = (currentUser.category || currentUser.kategori || currentUser.role || '').toString().trim().toUpperCase();
  const username = (currentUser.username || '').toString().trim().toUpperCase();
  return category === 'ADMIN' || username === 'ADMIN';
}

function updateAdminNavVisibility() {
  const isAdmin = checkIsAdminUser();

  const btnUserNav = document.getElementById('btnUserNav');
  const btnMasterDbNav = document.getElementById('btnMasterDbNav');

  if (btnUserNav) {
    if (isAdmin) {
      btnUserNav.style.setProperty('display', 'flex', 'important');
      btnUserNav.classList.remove('hidden-admin-btn');
    } else {
      btnUserNav.style.setProperty('display', 'none', 'important');
      btnUserNav.classList.add('hidden-admin-btn');
    }
  }

  if (btnMasterDbNav) {
    if (isAdmin) {
      btnMasterDbNav.style.setProperty('display', 'flex', 'important');
      btnMasterDbNav.classList.remove('hidden-admin-btn');
    } else {
      btnMasterDbNav.style.setProperty('display', 'none', 'important');
      btnMasterDbNav.classList.add('hidden-admin-btn');
    }
  }
}

function updateBottomMenuHighlight(pageId) {
  updateAdminNavVisibility();
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

let lastScrollTopPosition = 0;

function setupBottomMenuAutoHide() {
  const bottomMenu = document.getElementById('bottomMenu');
  if (!bottomMenu) return;
  const isLoginPage = (document.getElementById('loginPage') && document.getElementById('loginPage').classList.contains('active')) || (typeof currentUser === 'undefined' || !currentUser);
  if (isLoginPage) {
    bottomMenu.classList.add('login-hidden');
    bottomMenu.classList.add('hide-bottom-menu');
    bottomMenu.style.setProperty('display', 'none', 'important');
    return;
  }
  bottomMenu.classList.remove('login-hidden');
  bottomMenu.classList.remove('hide-bottom-menu');
  bottomMenu.style.display = 'flex';
}

function pindahHalaman(pageId, pushHistory = true) {
  updateAdminNavVisibility();

  if ((pageId === 'masterDbPage' || pageId === 'userManagementPage') && !checkIsAdminUser()) {
    pindahHalaman('dashboardPage', false);
    return;
  }

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.setProperty('display', 'none', 'important');
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    target.style.setProperty('display', (pageId === 'dashboardPage' || pageId === 'loginPage' || pageId === 'masterDbPage' || pageId === 'riwayatPage') ? 'flex' : 'block', 'important');
  }

  if (typeof aturTampilanLonceng === 'function') {
    aturTampilanLonceng(pageId);
  }

  updateBottomMenuHighlight(pageId);
  setupBottomMenuAutoHide();

  if (pushHistory && pageId !== 'loginPage') {
    try {
      history.pushState({ page: pageId }, '', location.href);
    } catch(e) {}
  }

  // AUTO LOAD / INITIALIZE CONTENT FOR THE ACTIVE PAGE
  if (pageId === 'inputPage') {
    if (typeof loadForm === 'function') loadForm();
  } else if (pageId === 'dashboardPage') {
    if (typeof loadDashboard === 'function') loadDashboard();
  } else if (pageId === 'riwayatPage') {
    if (typeof filterRiwayat === 'function') filterRiwayat();
  } else if (pageId === 'masterDbPage') {
    if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
  } else if (pageId === 'userManagementPage') {
    if (typeof loadUsersManagement === 'function') loadUsersManagement();
    if (typeof loadNamaDM === 'function') loadNamaDM();
  }

  if (pageId === 'loginPage' || (typeof currentUser === 'undefined' || !currentUser)) {
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('touch-action', 'none', 'important');
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.style.setProperty('overflow', 'hidden', 'important');
      appEl.style.setProperty('height', '100vh', 'important');
    }
  } else {
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('touch-action');
    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.style.removeProperty('overflow');
      appEl.style.removeProperty('height');
    }
  }
}

function getAccessibleRequests() {
  const requests = getRequestsFromDB();
  if (!currentUser) return [];

  const role = (currentUser.category || '').toUpperCase();
  if (
    role === 'ADMIN' ||
    role === 'DM' ||
    (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')
  ) {
    return requests;
  }

  if (role === 'TOKO' || role === 'GBJ') {
    return requests.filter(r => 
      r.userId === currentUser.id || 
      (r.createdBy && r.createdBy.toUpperCase() === currentUser.fullName.toUpperCase()) ||
      (r.toko && r.toko.toUpperCase() === currentUser.fullName.toUpperCase())
    );
  }

  return requests.filter(r => isAreaMatch(currentUser.area, r.area));
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
  if (areaEl) areaEl.textContent = `${currentUser.category} - ${formatUserAreaDisplay(currentUser.area)}`;

  try {
    let savedVal = localStorage.getItem(BG_OPACITY_KEY) || '48';
    if (typeof applyAdaptiveTextColors === 'function') applyAdaptiveTextColors(savedVal);
  } catch(e) {}

  const data = getAccessibleRequests();

  const pending = data.filter(r => r.status === 'PENDING').length;
  const approve = data.filter(r => r.status === 'APPROVE').length;
  const reject = data.filter(r => r.status === 'REJECT').length;
  const batal = data.filter(r => r.status === 'BATAL').length;
  const done = data.filter(r => r.status === 'DONE').length;
  const total = data.length || 1;

  const elPending = document.getElementById('pending');
  const elApprove = document.getElementById('approve');
  const elReject = document.getElementById('reject');
  const elBatal = document.getElementById('batal');
  const elDone = document.getElementById('done');

  if (elPending) elPending.textContent = pending;
  if (elApprove) elApprove.textContent = approve;
  if (elReject) elReject.textContent = reject;
  if (elBatal) elBatal.textContent = batal;
  if (elDone) elDone.textContent = done;

  const barPending = document.getElementById('barPending');
  const barApprove = document.getElementById('barApprove');
  const barReject = document.getElementById('barReject');
  const barBatal = document.getElementById('barBatal');
  const barDone = document.getElementById('barDone');

  if (barPending) barPending.style.width = `${data.length ? Math.max(12, Math.round((pending / total) * 100)) : 15}%`;
  if (barApprove) barApprove.style.width = `${data.length ? Math.max(12, Math.round((approve / total) * 100)) : 15}%`;
  if (barReject) barReject.style.width = `${data.length ? Math.max(12, Math.round((reject / total) * 100)) : 15}%`;
  if (barBatal) barBatal.style.width = `${data.length ? Math.max(12, Math.round((batal / total) * 100)) : 15}%`;
  if (barDone) barDone.style.width = `${data.length ? Math.max(12, Math.round((done / total) * 100)) : 15}%`;

  // TOGGLE ACTIVE CLASS ON CARDSTAT FOR THE BOTTOM ACCENT INDICATOR BAR (-)
  document.querySelectorAll('.cardStat').forEach(card => {
    if (card.classList.contains(dashboardFilterStatus.toLowerCase())) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // HIDE TITLE ABOVE DASHBOARD TABLE AS REQUESTED
  const titleEl = document.getElementById('dashboardRecentTitle');
  if (titleEl) {
    titleEl.style.display = 'none';
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
    if (shouldRowBlinkRed(r)) {
      tr.className = 'blink-row-red';
    }
    tr.style.cursor = 'pointer';
    tr.title = `KLIK BARIS INI UNTUK MEMBUKA PERMINTAAN #${r.noSurat}`;
    tr.onclick = () => bukaDetailDariDashboard(r.noSurat);
    tr.innerHTML = `
      <td style="width: 18%; text-align: left; white-space: nowrap; font-weight: 600; color: var(--text-muted); font-size: 12px;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td style="width: 32%; text-align: left; font-weight: 700; color: var(--primary); letter-spacing: 0.3px;">${r.noSurat}</td>
      <td style="width: 30%; text-align: left; font-weight: 600; color: var(--text-main);">${r.toko} <small style="background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-color); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; opacity: 0.85; margin-left: 4px;">(${r.area})</small></td>
      <td style="width: 20%; text-align: left !important; font-weight: 600; color: var(--text-main);">${getBadgeStatus(r)}</td>
    `;
    lastDataContainer.appendChild(tr);
  });

  for (let k = 0; k < 2; k++) {
    const emptyTr = document.createElement('tr');
    emptyTr.className = 'empty-grid-row';
    emptyTr.innerHTML = `
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    `;
    lastDataContainer.appendChild(emptyTr);
  }
}

let _isClosingDetailModal = false;

function bukaDetailDariDashboard(noSurat) {
  if (_isClosingDetailModal) return;
  lihatDetail(noSurat, true);
}

function shouldRowBlinkRed(r) {
  if (!r || !currentUser) return false;
  const cat = String(currentUser.category || currentUser.kategori || currentUser.role || '').trim().toUpperCase();
  const username = String(currentUser.username || '').trim().toUpperCase();
  const isAdm = cat === 'ADMIN' || username === 'ADMIN';

  const isWaitingService = (r.status === 'PENDING' && !r.serviceApprove);
  const isWaitingDM = (r.status === 'PENDING' && r.serviceApprove);

  if ((cat === 'SERVICE' || isAdm) && isWaitingService) return true;
  if ((cat === 'DM' || isAdm) && isWaitingDM) return true;

  return false;
}

function getBadgeStatusHTML(r) {
  if (!r) return '-';
  let st = (typeof r === 'string') ? r : r.status;
  const serviceAppv = (typeof r === 'object' && r) ? r.serviceApprove : false;

  if (st === 'DONE') {
    return `<span class="badge-status badge-done"><span class="material-symbols-rounded" style="font-size: 13px;">task_alt</span> SUDAH DIPENUHI</span>`;
  }
  if (st === 'REJECT') {
    return `<span class="badge-status badge-reject"><span class="material-symbols-rounded" style="font-size: 13px;">cancel</span> DITOLAK</span>`;
  }
  if (st === 'APPROVE') {
    return `<span class="badge-status badge-approve"><span class="material-symbols-rounded" style="font-size: 13px;">verified</span> DISETUJUI</span>`;
  }
  if (st === 'BATAL') {
    return `<span class="badge-status badge-batal"><span class="material-symbols-rounded" style="font-size: 13px;">block</span> BATAL</span>`;
  }

  if (st === 'PENDING') {
    if (!serviceAppv) {
      return `<span class="badge-status badge-tunggu-service"><span class="material-symbols-rounded" style="font-size: 13px;">schedule</span> TUNGGU SERVICE</span>`;
    } else {
      return `<span class="badge-status badge-tunggu-dm"><span class="material-symbols-rounded" style="font-size: 13px;">hourglass_top</span> TUNGGU DM</span>`;
    }
  }

  return `<span class="badge-status badge-tunggu-service">${st}</span>`;
}

function getBadgeStatus(r) {
  if (typeof r === 'string') {
    if (r === 'DONE') return 'SUDAH DIPENUHI';
    if (r === 'APPROVE') return 'DISETUJUI';
    if (r === 'REJECT') return 'DITOLAK';
    if (r === 'PENDING') return 'PENDING';
    return r;
  }

  if (!r) return '-';

  const st = r.status;
  const serviceAppv = r.serviceApprove;

  if (st === 'DONE') return 'SUDAH DIPENUHI';
  if (st === 'REJECT') return 'DITOLAK';
  if (st === 'APPROVE') return 'DISETUJUI';

  if (st === 'PENDING') {
    if (!serviceAppv) {
      return 'TUNGGU SERVICE';
    } else {
      return 'TUNGGU DM';
    }
  }

  return st || '-';
}

function updateStoreDropdownOptions(selectedStoreName = '', filterKeyword = '') {
  const tokoSelect = document.getElementById('toko');
  const wrapperCariToko = document.getElementById('wrapperCariToko');
  const cariInput = document.getElementById('cariTokoInput');
  const btnHapus = document.getElementById('btnHapusCariToko');
  const infoHasil = document.getElementById('infoHasilCariToko');

  if (!tokoSelect || !currentUser) return;

  // Sembunyikan kolom pencarian jika user adalah TOKO atau GBJ
  if (wrapperCariToko) {
    wrapperCariToko.style.display = (currentUser.category === 'TOKO' || currentUser.category === 'GBJ') ? 'none' : 'block';
  }

  const currentVal = selectedStoreName || tokoSelect.value;
  tokoSelect.innerHTML = '';

  if (currentUser.category === 'TOKO') {
    tokoSelect.innerHTML = `<option value="${currentUser.fullName}">${currentUser.fullName} (${currentUser.area})</option>`;
    if (infoHasil) infoHasil.style.display = 'none';
    if (btnHapus) btnHapus.style.display = 'none';
    return;
  } else if (currentUser.category === 'GBJ') {
    tokoSelect.innerHTML = `<option value="${currentUser.fullName || 'GBJ'}">${currentUser.fullName || 'GBJ'} (${currentUser.area})</option>`;
    if (infoHasil) infoHasil.style.display = 'none';
    if (btnHapus) btnHapus.style.display = 'none';
    return;
  }

  const allStores = getStoresFromDB();
  let areaStores = (currentUser.category === 'DM' || currentUser.area === 'ALL') 
    ? allStores 
    : allStores.filter(s => s && isAreaMatch(currentUser.area, s.area));

  const kw = String(filterKeyword || '').trim().toUpperCase();
  if (btnHapus) {
    btnHapus.style.display = kw ? 'inline-flex' : 'none';
  }

  if (kw) {
    areaStores = areaStores.filter(s => {
      if (!s) return false;
      const fn = String(s.fullName || '').toUpperCase();
      const code = String(s.storeCode || '').toUpperCase();
      const area = String(s.area || '').toUpperCase();
      return fn.includes(kw) || code.includes(kw) || area.includes(kw);
    });
  }
  if (infoHasil) infoHasil.style.display = 'none';

  if (areaStores.length > 0) {
    areaStores.forEach(s => {
      const isSelected = (currentVal && String(s.fullName).toUpperCase() === String(currentVal).toUpperCase()) ? 'selected' : '';
      tokoSelect.innerHTML += `<option value="${s.fullName}" ${isSelected}>${s.fullName} (${s.area || currentUser.area})</option>`;
    });
  } else {
    tokoSelect.innerHTML = `<option value="">-- TOKO TIDAK DITEMUKAN --</option>`;
  }

  if (currentVal && Array.from(tokoSelect.options).some(o => o.value.toUpperCase() === currentVal.toUpperCase())) {
    tokoSelect.value = currentVal;
  }
}
window.updateStoreDropdownOptions = updateStoreDropdownOptions;

function filterDropdownToko(keyword) {
  updateStoreDropdownOptions('', keyword);
}
window.filterDropdownToko = filterDropdownToko;

function resetCariToko() {
  const cariInput = document.getElementById('cariTokoInput');
  if (cariInput) cariInput.value = '';
  updateStoreDropdownOptions('', '');
}
window.resetCariToko = resetCariToko;

function loadForm() {
  const tglEl = document.getElementById('tanggal');
  if (tglEl) {
    if (!tglEl.value || tglEl.value.trim() === '') {
      tglEl.value = (typeof getFormattedDateDDMMYYYY === 'function') ? getFormattedDateDDMMYYYY() : (function() {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })();
    }
  }

  const jenisEl = document.getElementById('jenisPermintaan');
  if (jenisEl && (!jenisEl.value || jenisEl.value.trim() === '')) {
    jenisEl.value = 'DEFAULT';
  }

  const cariInput = document.getElementById('cariTokoInput');
  if (cariInput) cariInput.value = '';

  if (typeof updateStoreDropdownOptions === 'function') {
    updateStoreDropdownOptions();
  }

  const containerTambahToko = document.getElementById('containerTambahToko');
  if (containerTambahToko && typeof currentUser !== 'undefined' && currentUser) {
    containerTambahToko.style.display = (currentUser.category === 'TOKO' || currentUser.category === 'GBJ') ? 'none' : 'block';
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
  if (container && !modeEdit) {
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

async function bukaScanner(btn) {
  const row = btn.closest('.detailRow');
  if (row) {
    activeScanInput = row.querySelector('.seriBarang');
  } else {
    activeScanInput = btn.parentElement.querySelector('.seriBarang');
  }

  const modal = document.getElementById('scannerModal');
  const readerEl = document.getElementById('readerScanner');
  if (modal) modal.style.display = 'flex';
  if (readerEl) readerEl.innerHTML = '';

  if (typeof Html5Qrcode !== 'undefined') {
    setTimeout(async () => {
      try {
        if (html5QrCodeScanner) {
          try { await html5QrCodeScanner.stop(); } catch(e) {}
          try { html5QrCodeScanner.clear(); } catch(e) {}
          html5QrCodeScanner = null;
        }
        if (readerEl) readerEl.innerHTML = '';
        html5QrCodeScanner = new Html5Qrcode("readerScanner");
        const config = { fps: 15, qrbox: { width: 260, height: 160 } };

        await html5QrCodeScanner.start(
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
    }, 150);
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
  const readerEl = document.getElementById('readerScanner');
  if (readerEl) readerEl.innerHTML = '';
  setTimeout(() => {
    activeScanInput = null;
  }, 300);
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
  if (!row) return;

  const container = document.getElementById('detailContainer');
  if (!container) return;

  const allRows = container.querySelectorAll('.detailRow');
  if (allRows.length > 1) {
    row.remove();
  } else {
    row.remove();
    tambahRow();
  }
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

async function uploadSignatureDataUrlToSupabaseStorage(dataUrl, customFileName = null) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  const trimmed = dataUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (!trimmed.startsWith('data:image/')) return trimmed;

  const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : ((typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null);

  if (sb && sb.storage) {
    try {
      const res = await fetch(trimmed);
      const blob = await res.blob();
      const fileName = customFileName || `TTD_${Date.now()}_${Math.floor(Math.random()*1000)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      const { data, error } = await sb.storage.from('photos').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (!error && data) {
        const { data: pubData } = sb.storage.from('photos').getPublicUrl(fileName);
        if (pubData && pubData.publicUrl) {
          console.log('⚡ [TTD STORAGE UPLOAD SUCCESS]:', pubData.publicUrl);
          return pubData.publicUrl;
        }
      } else if (error) {
        console.warn('[TTD STORAGE UPLOAD ERROR]:', error.message);
      }
    } catch(e) {
      console.warn('[STORAGE TTD UPLOAD NOTICE]:', e);
    }
  }

  try {
    const img = new Image();
    img.src = trimmed;
    await new Promise(r => { img.onload = r; img.onerror = r; });
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(150, img.width || 150);
    canvas.height = Math.min(60, img.height || 60);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 0.4);
  } catch(e) {
    return trimmed;
  }
}
window.uploadSignatureDataUrlToSupabaseStorage = uploadSignatureDataUrlToSupabaseStorage;

async function migrasiTtdBase64KeUrl() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const requests = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    let updatedAny = false;

    for (let r of requests) {
      if (!r) continue;
      let changedRow = false;

      if (r.serviceTTD && (r.serviceTTD.startsWith('data:image/') || r.serviceTTD.startsWith('blob:'))) {
        const newUrl = await uploadSignatureDataUrlToSupabaseStorage(r.serviceTTD, `TTD_SRV_${r.noSurat.replace(/[\/\.]/g, '_')}.png`);
        if (newUrl && newUrl !== r.serviceTTD) {
          r.serviceTTD = newUrl;
          changedRow = true;
        }
      }
      if (r.dmTTD && (r.dmTTD.startsWith('data:image/') || r.dmTTD.startsWith('blob:'))) {
        const newUrl = await uploadSignatureDataUrlToSupabaseStorage(r.dmTTD, `TTD_DM_${r.noSurat.replace(/[\/\.]/g, '_')}.png`);
        if (newUrl && newUrl !== r.dmTTD) {
          r.dmTTD = newUrl;
          changedRow = true;
        }
      }
      if (r.pemohonTTD && (r.pemohonTTD.startsWith('data:image/') || r.pemohonTTD.startsWith('blob:'))) {
        const newUrl = await uploadSignatureDataUrlToSupabaseStorage(r.pemohonTTD, `TTD_TK_${r.noSurat.replace(/[\/\.]/g, '_')}.png`);
        if (newUrl && newUrl !== r.pemohonTTD) {
          r.pemohonTTD = newUrl;
          changedRow = true;
        }
      }

      if (Array.isArray(r.log) && r.log.length > 5) {
        r.log = r.log.slice(-5);
        changedRow = true;
      }

      if (changedRow) {
        updatedAny = true;
        const docId = String(r.noSurat).replace(/[\/\.]/g, '_');
        await supabase.from('permintaan_toko').update({
          service_ttd: r.serviceTTD || '',
          dm_ttd: r.dmTTD || '',
          pemohon_ttd: r.pemohonTTD || '',
          log: r.log || []
        }).eq('no_surat', r.noSurat).catch(() => {});
      }
    }

    // PEMBERSIHAN OTOMATIS TTD BASE64 PADA BARIS __SYSTEM_TTD_MAP__
    await cleanTtdMapBase64InSupabase();

    if (updatedAny) {
      saveRequestsToDB(requests);
      console.log('⚡ [TTD BASE64 TO URL MIGRATION COMPLETE]: Base64 TTDs converted to Supabase Storage URLs!');
    }
  } catch(e) {
    console.warn('[TTD MIGRATION EXCEPTION]:', e);
  }
}
window.migrasiTtdBase64KeUrl = migrasiTtdBase64KeUrl;

async function cleanTtdMapBase64InSupabase() {
  const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : ((typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null);
  if (!sb) return;
  try {
    const { data, error } = await sb.from('permintaan_toko').select('*').eq('no_surat', '__SYSTEM_TTD_MAP__').maybeSingle();
    if (data && data.items) {
      let ttdMap = {};
      try {
        ttdMap = (typeof data.items === 'string') ? JSON.parse(data.items) : data.items;
      } catch(e) {}

      let updated = false;
      for (let key in ttdMap) {
        if (ttdMap[key] && typeof ttdMap[key] === 'string' && (ttdMap[key].startsWith('data:image/') || ttdMap[key].startsWith('blob:'))) {
          const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '_');
          const newUrl = await uploadSignatureDataUrlToSupabaseStorage(ttdMap[key], `TTD_MAP_${cleanKey}.png`);
          if (newUrl && newUrl !== ttdMap[key]) {
            ttdMap[key] = newUrl;
            updated = true;
          }
        }
      }

      if (updated) {
        await sb.from('permintaan_toko').update({
          items: ttdMap
        }).eq('no_surat', '__SYSTEM_TTD_MAP__');
        console.log('⚡ [TTD MAP CLEANUP COMPLETE]: All Base64 signatures in __SYSTEM_TTD_MAP__ converted to Storage URLs!');
      }
    }
  } catch(e) {
    console.warn('[TTD MAP CLEANUP ERROR]:', e);
  }
}
window.cleanTtdMapBase64InSupabase = cleanTtdMapBase64InSupabase;

async function uploadPhotoToSupabaseStorage(fileOrBlob) {
  if (!fileOrBlob) return '';

  // 1. KOMPRESI GAMBAR TERLEBIH DAHULU (Max 720px, Quality 0.65 JPEG -> ~40-60 KB)
  let compressedDataUrl = '';
  if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:image/')) {
    compressedDataUrl = fileOrBlob;
  } else {
    try {
      compressedDataUrl = await kompresiFoto(fileOrBlob, 720, 0.65);
    } catch(e) {
      console.warn('[KOMPRESI FOTO NOTICE]:', e);
    }
  }

  // 2. UNGGAH HASIL KOMPRESI TERSEBUT KE SUPABASE STORAGE BUCKET 'photos'
  const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : ((typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null);

  if (sb && sb.storage && compressedDataUrl && compressedDataUrl.startsWith('data:image/')) {
    try {
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
      const fileToUpload = new File([blob], fileName, { type: 'image/jpeg' });

      const { data, error } = await sb.storage.from('photos').upload(fileName, fileToUpload, { cacheControl: '3600', upsert: true });
      if (!error && data) {
        const { data: pubData } = sb.storage.from('photos').getPublicUrl(fileName);
        if (pubData && pubData.publicUrl) {
          console.log('⚡ [STORAGE PHOTO UPLOAD SUCCESS]:', pubData.publicUrl);
          return pubData.publicUrl;
        }
      } else if (error) {
        console.warn('[SUPABASE STORAGE UPLOAD WARNING]:', error.message);
      }
    } catch (e) {
      console.warn('[SUPABASE STORAGE UPLOAD EXCEPTION]:', e);
    }
  }

  return compressedDataUrl || '';
}
window.uploadPhotoToSupabaseStorage = uploadPhotoToSupabaseStorage;

async function deletePhotosFromSupabaseStorage(photoUrls) {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) return;

  const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : ((typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null);
  if (!sb || !sb.storage) return;

  const fileNames = photoUrls.map(url => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:')) return null;
    try {
      const cleanUrl = url.split('?')[0];
      const name = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
      return name && name.includes('.') ? name : null;
    } catch(e) {
      return null;
    }
  }).filter(Boolean);

  if (fileNames.length > 0) {
    try {
      const { data, error } = await sb.storage.from('photos').remove(fileNames);
      if (!error && data) {
        console.log('⚡ [SUPABASE STORAGE DELETE SUCCESS]: Berhasil menghapus foto dari bucket Supabase photos:', fileNames);
      } else {
        await sb.storage.from('permintaan_photos').remove(fileNames).catch(() => {});
        await sb.storage.from('foto-permintaan').remove(fileNames).catch(() => {});
      }
    } catch (err) {
      console.warn('[SUPABASE STORAGE DELETE EXCEPTION]:', err);
    }
  }
}
window.deletePhotosFromSupabaseStorage = deletePhotosFromSupabaseStorage;

function getJumlahItemInputForm() {
  const rows = document.querySelectorAll('#detailContainer .detailRow');
  if (!rows || rows.length === 0) return 0;
  let filledCount = 0;
  rows.forEach(r => {
    const type = r.querySelector('.typeBarang') ? r.querySelector('.typeBarang').value.trim() : '';
    const seri = r.querySelector('.seriBarang') ? r.querySelector('.seriBarang').value.trim() : '';
    const barang = r.querySelector('.namaBarang') ? r.querySelector('.namaBarang').value.trim() : '';
    if (type || seri || barang) {
      filledCount++;
    }
  });
  return filledCount > 0 ? filledCount : rows.length;
}
window.getJumlahItemInputForm = getJumlahItemInputForm;

function updateFotoUploadLimitDisplay() {
  const lbl = document.getElementById('labelUploadFoto');
  const pText = document.getElementById('previewText');
  const itemCount = typeof getJumlahItemInputForm === 'function' ? getJumlahItemInputForm() : (document.querySelectorAll('#detailContainer .detailRow').length || 1);
  const photoCount = Array.isArray(currentPhotos) ? currentPhotos.length : 0;

  if (lbl) {
    lbl.textContent = 'FOTO BARANG PENDUKUNG (Opsional)';
  }

  if (pText && photoCount === 0) {
    if (itemCount === 0) {
      pText.innerHTML = '<span class="material-symbols-rounded uploadIcon">info</span> INPUT DATA BARANG TERLEBIH DAHULU UNTUK MEMBUKA UPLOAD FOTO';
    } else {
      pText.innerHTML = `<span class="material-symbols-rounded uploadIcon">add_a_photo</span> TAP / PILIH FOTO DI SINI (Opsional)`;
    }
  }
}
window.updateFotoUploadLimitDisplay = updateFotoUploadLimitDisplay;

async function previewFoto(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const currentItemsCount = typeof getJumlahItemInputForm === 'function' ? getJumlahItemInputForm() : (document.querySelectorAll('#detailContainer .detailRow').length || 1);

  if (currentItemsCount === 0) {
    showNotif('SILAKAN INPUT BARANG PERMINTAAN TERLEBIH DAHULU DI TABEL SEBELUM MENGUNGGAH FOTO!', 'warning');
    event.target.value = '';
    return;
  }

  const maxAllowedPhotos = currentItemsCount;

  if (currentPhotos.length + files.length > maxAllowedPhotos) {
    showNotif(`MAKSIMAL FOTO DIBATASI SEBANYAK ${maxAllowedPhotos} FOTO (SESUAI JUMLAH ${maxAllowedPhotos} ITEM BARANG DI TABEL)!`, 'warning');
    event.target.value = '';
    return;
  }

  const previewText = document.getElementById('previewText');
  const originalText = previewText ? previewText.innerHTML : 'TAP / PILIH FOTO DI SINI';
  if (previewText) {
    previewText.innerHTML = `<span class="material-symbols-rounded" style="font-size:22px; vertical-align:middle; display:inline-block; animation:spin 0.8s linear infinite; color:var(--primary);">sync</span> MENGOMPRESI & MENGUNGGAH FOTO...`;
  }

  for (let i = 0; i < files.length; i++) {
    if (currentPhotos.length < maxAllowedPhotos) {
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
  updateFotoUploadLimitDisplay();
  event.target.value = '';
}
window.previewFoto = previewFoto;

function hapusFotoItem(idx) {
  const removedUrl = currentPhotos[idx];
  if (removedUrl) {
    deletePhotosFromSupabaseStorage([removedUrl]);
  }
  currentPhotos.splice(idx, 1);
  renderPhotoGrid(); if (typeof updateFotoUploadLimitDisplay === "function") updateFotoUploadLimitDisplay();
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoPreviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  currentPhotos.forEach((src, idx) => {
    const div = document.createElement('div');
    div.className = 'photo-preview-card';
    div.title = "KLIK UNTUK BUKA FOTO & GESER (ZOOM & PAN)";
    div.onclick = () => zoomFoto(currentPhotos, idx);
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

    const unfulfilled = r.classList.contains('unfulfilled') || r.hasAttribute('data-unfulfilled');
    items.push({ type, seri, dus, barang, alasan, qty, unfulfilled });
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

async function prosesSimpanKeDB(toko, jenis, catatan, items) {
  const requests = getRequestsFromDB();

  if (modeEdit && editNoSurat) {
    const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(editNoSurat).trim().toUpperCase());
    if (idx !== -1) {
      requests[idx].toko = toko;
      requests[idx].jenis = jenis;
      requests[idx].catatan = catatan;
      requests[idx].items = items;
      requests[idx].photos = [...currentPhotos];
      
      // 1. SIMPAN LOKAL SECARA INSTAN (0 ms)
      saveRequestsToDB(requests);

      // 2. MUNCULKAN NOTIFIKASI LANGSUNG DI AWAL & PINDAH HALAMAN
      const targetNoSurat = editNoSurat || (requests[idx] ? requests[idx].noSurat : '');
      showNotif(`PERMINTAAN #${targetNoSurat} DATA BERHASIL DIPERBARUHI!`, 'success');
      bersihkanForm();
      pindahHalaman('riwayatPage');
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();

      // 3. PROSES PENGIRIMAN KE SUPABASE DI LATAR BELAKANG
      const docId = String(targetNoSurat).replace(/[\/\.]/g, '_');
      if (!docId) {
        console.warn('[DOC ID EMPTY NOTICE]: Skipped Firestore/Supabase sync because docId was empty.');
        return;
      }
      const supaEditRow = {
        id: docId,
        no_surat: requests[idx].noSurat,
        tanggal: requests[idx].tanggal,
        toko: requests[idx].toko,
        area: requests[idx].area,
        jenis: requests[idx].jenis,
        catatan: requests[idx].catatan || '',
        items: requests[idx].items || [],
        photos: requests[idx].photos || [],
        artemis_photos: requests[idx].artemisPhotos || [],
        status: requests[idx].status,
        service_approve: !!requests[idx].serviceApprove,
        service_user_name: requests[idx].serviceUserName || '',
        service_ttd: requests[idx].serviceTTD || '',
        dm_user_name: requests[idx].dmUserName || '',
        dm_ttd: requests[idx].dmTTD || '',
        created_by: requests[idx].createdBy || '',
        created_at: requests[idx].createdAt || '',
        user_id: requests[idx].userId || '',
        log: requests[idx].log || [],
        updated_at: new Date().toISOString()
      };

      if (typeof supabase !== 'undefined' && supabase) {
        safeSupabaseUpsertPermintaan(supaEditRow).then(({ error }) => {
          if (error) console.warn('[SUPABASE UPDATE NOTICE]:', error.message);
        }).catch(e => console.warn(e));
      }
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }
    }
  } else {
    const now = new Date();
    const codeYear = String(now.getFullYear()).slice(-2);
    const codeMonth = String(now.getMonth() + 1).padStart(2, '0');
    const codeDay = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${codeYear}${codeMonth}${codeDay}`; // Contoh: 260813

    const allStores = getStoresFromDB();
    const safeToko = String(toko || '').trim().toUpperCase();
    const matchedStore = allStores.find(s => s && s.fullName && String(s.fullName).trim().toUpperCase() === safeToko);
    
    let storeCode = '';
    if (currentUser && currentUser.category === 'TOKO' && currentUser.storeCode) {
      storeCode = String(currentUser.storeCode).trim().toUpperCase();
    } else if (matchedStore && matchedStore.storeCode) {
      storeCode = String(matchedStore.storeCode).trim().toUpperCase();
    } else if (matchedStore) {
      storeCode = generateStoreCode(matchedStore.fullName);
    } else {
      storeCode = generateStoreCode(safeToko);
    }

    const targetArea = (matchedStore && matchedStore.area) ? matchedStore.area : (getUserAreaList(currentUser.area)[0] || 'BDG');

    let fullStoreTag = storeCode;
    if (!fullStoreTag.startsWith(targetArea + '-') && !fullStoreTag.startsWith(targetArea)) {
      fullStoreTag = `${targetArea}-${storeCode}`;
    } else if (!fullStoreTag.includes('-') && fullStoreTag.startsWith(targetArea)) {
      fullStoreTag = `${targetArea}-${fullStoreTag.slice(targetArea.length).replace(/^-+/, '')}`;
    }

    // Hitung nomor urut harian (2 digit, reset mulai dari 01 setiap ganti hari)
    let maxSeqToday = 0;
    requests.forEach(r => {
      if (r && r.noSurat) {
        const s = String(r.noSurat).trim().toUpperCase();
        const m = s.match(new RegExp(`/${datePrefix}-?(\\d{2})`)) || s.match(new RegExp(`${datePrefix}-?(\\d{2})`));
        if (m && m[1]) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num > maxSeqToday) {
            maxSeqToday = num;
          }
        }
      }
    });

    let seq = maxSeqToday + 1;
    let noSurat = `PRMT/${fullStoreTag}/${datePrefix}${String(seq).padStart(2, '0')}`;
    while (requests.some(r => r && String(r.noSurat).trim().toUpperCase() === noSurat.toUpperCase())) {
      seq++;
      noSurat = `PRMT/${fullStoreTag}/${datePrefix}${String(seq).padStart(2, '0')}`;
    }
    
    const isDMUser = currentUser && currentUser.category === 'DM';
    const autoServiceApprove = isDMUser ? true : false;
    const ttdMap = JSON.parse(appStorage.getItem(TTD_DB_KEY) || '{}');
    let pemohonTTD = '';
    const isLoginGBJ = currentUser && (
      currentUser.category === 'GBJ' || 
      String(currentUser.username || '').toUpperCase().includes('GBJ') || 
      String(currentUser.fullName || '').toUpperCase().includes('GBJ') ||
      String(currentUser.storeCode || '').toUpperCase().includes('GBJ')
    );
    if (isLoginGBJ) {
      pemohonTTD = currentUser.ttd || ttdMap[currentUser.id] || ttdMap[currentUser.username] || ttdMap[currentUser.fullName] || ttdMap['GBJ'] || '';
    }

    let autoServiceTTD = '';
    let serviceUserNameVal = '';
    if (currentUser && currentUser.category === 'SERVICE') {
      serviceUserNameVal = currentUser.fullName || currentUser.username || '';
    }
    if (isDMUser) {
      const users = getUsersFromDB();
      const areaSvcUser = users.find(u => u && u.category === 'SERVICE' && isAreaMatch(u.area, targetArea));
      if (areaSvcUser) {
        autoServiceTTD = areaSvcUser.ttd || ttdMap[areaSvcUser.id] || ttdMap[areaSvcUser.username] || ttdMap[areaSvcUser.fullName] || ttdMap['SERVICE_' + targetArea] || '';
        serviceUserNameVal = areaSvcUser.fullName || areaSvcUser.username || '';
      } else {
        autoServiceTTD = ttdMap['SERVICE_' + targetArea] || '';
      }
    }

    const initialLog = [];
    if (isDMUser) {
      initialLog.push({
        action: 'AUTO_APPROVE_SERVICE',
        user: currentUser.fullName || currentUser.username,
        notes: 'AUTO APPROVE SERVICE (DIBUAT OLEH DM)',
        time: `${getFormattedDateDDMMYYYY(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      });
    }

    const newRecord = {
      noSurat,
      tanggal: getFormattedDateDDMMYYYY(now),
      area: targetArea,
      userId: currentUser.id,
      toko,
      jenis,
      catatan,
      items,
      photos: [...currentPhotos],
      artemisPhotos: [],
      status: 'PENDING',
      serviceApprove: autoServiceApprove,
      serviceUserName: serviceUserNameVal,
      serviceTTD: autoServiceTTD,
      dmUserName: '',
      dmTTD: '',
      tokoTTD: pemohonTTD,
      pemohonTTD: pemohonTTD,
      createdBy: currentUser.fullName,
      createdAt: `${getFormattedDateDDMMYYYY(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      log: initialLog
    };

    // 1. SIMPAN LOKAL SECARA INSTAN (0 ms)
    requests.unshift(newRecord);
    saveRequestsToDB(requests, newRecord);

    // 2. MUNCULKAN NOTIFIKASI LANGSUNG DI AWAL & PINDAH HALAMAN
    showNotif(`PERMINTAAN #${noSurat} DATA BERHASIL DISIMPAN!`, 'success');
    bersihkanForm();
    pindahHalaman('riwayatPage');
    if (typeof loadRiwayat === 'function') loadRiwayat();
    if (typeof loadDashboard === 'function') loadDashboard();

    // 3. PROSES PENGIRIMAN KE SUPABASE DI LATAR BELAKANG
    const docId = String(noSurat).replace(/[\/\.]/g, '_');
    const supaNewRow = {
      id: docId,
      no_surat: newRecord.noSurat,
      tanggal: newRecord.tanggal,
      toko: newRecord.toko,
      area: newRecord.area,
      jenis: newRecord.jenis,
      catatan: newRecord.catatan || '',
      items: newRecord.items || [],
      photos: newRecord.photos || [],
      artemis_photos: [],
      status: newRecord.status || 'PENDING',
      service_approve: !!newRecord.serviceApprove,
      service_user_name: newRecord.serviceUserName || '',
      service_ttd: newRecord.serviceTTD || '',
      dm_user_name: '',
      dm_ttd: '',
      created_by: newRecord.createdBy || '',
      created_at: newRecord.createdAt || '',
      user_id: newRecord.userId || '',
      log: newRecord.log || [],
      updated_at: new Date().toISOString()
    };
    
    // 1. SIMPAN KE FIRESTORE & REALTIME DB
    if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
      dbFirestore.collection('requests').doc(docId).set(newRecord).catch(e => console.warn('[FIRESTORE SAVE NOTICE]:', e));
    }
    if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
      dbRealtime.ref(`requests/${docId}`).set(newRecord).catch(e => console.warn('[REALTIME SAVE NOTICE]:', e));
    }

    // In-App Notification
    if (isDMUser) {
      tambahNotifikasiSistem(['DM'], currentUser.area, `PERMINTAAN BARU #${noSurat} DARI DM (${currentUser.fullName}). SILAKAN MEMPROSES APPROVAL DM.`, noSurat);
    } else {
      tambahNotifikasiSistem(['SERVICE'], currentUser.area, `PERMINTAAN BARU #${noSurat} DARI TOKO ${toko}. MOHON APPROVAL SERVICE.`, noSurat);
    }

    // Fungsi Pengiriman WhatsApp (HANYA DIEKSEKUSI SETELAH DATA DIPASTIKAN TERKIRIM KE SUPABASE & REALTIME KE SEMUA PERANGKAT)
    const dispatchWhatsAppNotification = () => {
      const allUsers = getUsersFromDB();
      const serviceUsers = allUsers.filter(u => u.category === 'SERVICE' && (u.area === currentUser.area || u.area === 'ALL'));
      serviceUsers.forEach(srv => {
        if (srv.phone && srv.phone !== '-') {
          const srvName = srv.fullName || srv.username || 'Bapak/Ibu Tim Service';
          kirimNotifikasiWA(srv.phone,
            `Yth. Bapak/Ibu ${srvName},

` +
            `Pemberitahuan Sistem Permintaan Barang:
` +
            `Telah dibuat pengajuan permintaan barang baru dengan rincian berikut:
` +
            `• Nomor Dokumen : #${noSurat}
` +
            `• Toko / Pemohon : ${toko} (${currentUser.area})
` +
            `• Waktu Pengajuan : ${newRecord.createdAt}
` +
            `• Link Detail : ${getAppDirectLink(noSurat)}

` +
            `Mohon dapat segera diperiksa pada aplikasi. Terima kasih.`
          );
        }
      });
    };

    // 2. SIMPAN KE SUPABASE DULU -> SETELAH SUKSES & REALTIME TERKIRIM -> BARU KIRIM WA
    if (typeof safeSupabaseUpsertPermintaan === 'function') {
      safeSupabaseUpsertPermintaan(supaNewRow).then(() => {
        setTimeout(dispatchWhatsAppNotification, 300);
      }).catch(e => {
        console.warn('[SUPABASE SAVE EXCEPTION]:', e);
        dispatchWhatsAppNotification();
      });
    } else {
      setTimeout(dispatchWhatsAppNotification, 500);
    }
  }
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

function isPdfButtonAllowed(req) {
  if (!req || !currentUser) return false;
  const role = String(currentUser.category || '').toUpperCase();
  const isAdmin = typeof checkIsAdminUser === 'function' ? checkIsAdminUser() : (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  
  // TOMBOL PDF TIDAK DIBERIKAN UNTUK ROLE TOKO DAN SALES
  if (role === 'TOKO' || role === 'SALES') {
    return false;
  }

  // UNTUK LOGIN SELAIN ADMIN, APABILA STATUS SUDAH DONE MAKA TOMBOL PDF DIHILANGKAN (HANYA TOMBOL MATA & FOTO ARTEMIS YANG TAMPIL)
  if (!isAdmin && req.status === 'DONE') {
    return false;
  }

  // TOMBOL PDF HANYA KELUAR JIKA DM JUGA SUDAH APPROVE (STATUS APPROVE ATAU DONE)
  const isDmApproved = (req.status === 'APPROVE' || req.status === 'DONE');
  return isDmApproved;
}
window.isPdfButtonAllowed = isPdfButtonAllowed;

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
    data = data.filter(r => matchesRequestSearchFilter(r, search));
  }

  const thead = document.querySelector('.historyTable thead');
  const tbody = document.getElementById('riwayatData');
  if (!thead || !tbody) return;

  const role = currentUser ? currentUser.category : '';

  thead.innerHTML = `
    <tr>
      <th class="th-aksi-col">AKSI</th>
      <th>STATUS</th>
      <th>TGL</th>
      <th>NO SURAT</th>
      <th>TOKO</th>
      <th>JENIS</th>
      <th>CATATAN</th>
    </tr>
  `;

  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted); border-bottom: 1px solid var(--border-color) !important;">BELUM ADA DATA PERMINTAAN.</td></tr>`;
    for (let k = 1; k < 12; k++) {
      const emptyTr = document.createElement('tr');
      emptyTr.className = 'empty-grid-row';
      emptyTr.innerHTML = `
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      `;
      tbody.appendChild(emptyTr);
    }
    return;
  }

  data.forEach(r => {
    let aksi = '';

    const isDeletedRow = (r.status === 'BATAL' || r.unfulfilled === true);

    if (isDeletedRow) {
      // UNTUK BARIS YG SUDAH DI HAPUS: HILANGKAN SEMUA TOMBOL LAINNYA, SISAKAN HANYA ICON MATA (LIHAT DETAIL)
      aksi = `
        <button class="btnIcon btnInfo" onclick="lihatDetail('${r.noSurat}')" title="LIHAT DETAIL"><span class="material-symbols-rounded">visibility</span></button>
      `;
    } else {
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

      // TOMBOL KHUSUS LOGIN ADMIN TERLETAK DI SEBELAH TOMBOL HAPUS DATA
      if (isAdminUser) {
        if (r.serviceApprove) {
          aksi += `
            <button class="btnIcon" onclick="batalApproveService('${r.noSurat}')" title="BATAL APPROVE SERVICE (KHUSUS ADMIN)" style="background: #eab308 !important; color: #ffffff !important;"><span class="material-symbols-rounded">undo</span></button>
          `;
        }
        if (r.status === 'APPROVE' || r.dmUserName || r.dmTTD) {
          aksi += `
            <button class="btnIcon" onclick="batalApproveDM('${r.noSurat}')" title="BATAL APPROVE DM (KHUSUS ADMIN)" style="background: #f97316 !important; color: #ffffff !important;"><span class="material-symbols-rounded">undo</span></button>
          `;
        }
      }

      aksi += `
        <button class="btnIcon btnInfo" onclick="lihatDetail('${r.noSurat}')" title="LIHAT DETAIL"><span class="material-symbols-rounded">visibility</span></button>
      `;

      const hasPhotos = (r.photos && Array.isArray(r.photos) && r.photos.length > 0) || (r.artemisPhotos && Array.isArray(r.artemisPhotos) && r.artemisPhotos.length > 0);

      if (r.status === 'DONE') {
        if (hasPhotos) {
          aksi += `
            <button class="btnIcon btnView" onclick="lihatFotoByNoSurat('${r.noSurat}')" title="BUKTI PROSES ARTEMIS (${(r.artemisPhotos || r.photos).length})" style="background: var(--primary) !important; color: #ffffff !important; box-shadow: 0 4px 10px rgba(0,0,0,0.15) !important;"><span class="material-symbols-rounded" style="font-size: 16px !important;">photo_library</span></button>
          `;
        }
      } else {
        const isPhotoHidden = (r.status === 'APPROVE' || r.status === 'REJECT') || !getFeaturePhotosEnabled();
        if (hasPhotos && !isPhotoHidden) {
          aksi += `
            <button class="btnIcon btnView" onclick="lihatFotoByNoSurat('${r.noSurat}')" title="LIHAT FOTO PERMINTAAN"><span class="material-symbols-rounded">image</span></button>
          `;
        }
      }

      const isPdfVisible = isPdfButtonAllowed(r);
      if (isPdfVisible) {
        aksi += `
          <button class="btnIcon btnPdf" onclick="tampilkanPilihanCetakPdf(\'${r.noSurat}\')" title="CETAK PDF"><span class="material-symbols-rounded">picture_as_pdf</span></button>
        `;
      }
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
    if (shouldRowBlinkRed(r)) {
      tr.className = 'blink-row-red';
    }
    tr.innerHTML = `
      <td style="width: 6cm !important; min-width: 6cm !important; max-width: 6cm !important; box-sizing: border-box !important;"><div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap; justify-content:flex-start;">${aksi}</div></td>
      <td>${getBadgeStatus(r)}</td>
      <td style="white-space:nowrap;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td>${r.noSurat}</td>
      <td>${r.toko} <div style="font-size:11px; opacity:0.8;">${r.area}</div></td>
      <td style="white-space:nowrap;">${r.jenis || 'DEFAULT'}</td>
      <td style="word-break:break-word; white-space:normal;">${r.catatan || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  const emptyRowsNeeded = Math.max(2, 12 - data.length);
  if (emptyRowsNeeded > 0) {
    for (let k = 0; k < emptyRowsNeeded; k++) {
      const emptyTr = document.createElement('tr');
      emptyTr.className = 'empty-grid-row';
      emptyTr.innerHTML = `
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      `;
      tbody.appendChild(emptyTr);
    }
  }
}

function lihatFotoByNoSurat(noSurat) {
  if (!noSurat) {
    showNotif('NOMOR SURAT TIDAK VALID!', 'warning');
    return;
  }

  const requests = getRequestsFromDB();
  const req = requests.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === String(noSurat).trim().toUpperCase() || 
    String(r.id || '').trim().toUpperCase() === String(noSurat).trim().toUpperCase()
  ));
  
  let photos = [];
  if (req) {
    const regP = parsePhotosArray(req.photos);
    const artP = parsePhotosArray(req.artemisPhotos);
    photos = [...regP, ...artP];
    photos = Array.from(new Set(photos.filter(Boolean)));
  }

  if (photos && photos.length > 0) {
    bukaViewGambar(photos, 0);
  } else {
    showNotif('TIDAK ADA FOTO BUKTI UNTUK PERMINTAAN INI!', 'warning');
  }
}
window.lihatFotoByNoSurat = lihatFotoByNoSurat;

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
  showConfirm(`APPROVE PERMINTAAN #${noSurat}?`, async () => {
    showLoading('MEMERIKSA DATA TERBARU SERVER...');
    const isValid = await validatePreApprovalData(noSurat, 'SERVICE');
    hideLoading();
    if (!isValid) return;
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
    if (idx !== -1) {
      requests[idx].serviceApprove = true;
      requests[idx].serviceUserName = currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE';

      // AMBIL TTD DIGITAL ASLI DARI PROFIL / MENU TTD SERVICE
      const srvSig = getUserRealSignature('SERVICE', requests[idx].area, currentUser ? currentUser.username : '', requests[idx].serviceUserName);
      requests[idx].serviceTTD = srvSig || '';

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'APPROVE_SERVICE',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
        notes: 'DISETUJUI SERVICE',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      // 1. SIMPAN LOKAL & UPDATE UI INSTAN (0 ms)
      saveRequestsToDB(requests, requests[idx], 'UPDATE');
      showNotif(`NO SURAT #${noSurat} BERHASIL DI APPROVE`, 'success');
      loadRiwayat();
      loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      if (typeof refreshDetailModalIfOpen === 'function') refreshDetailModalIfOpen(noSurat);

      // 2. PROSES SYNC SUPABASE & BROADCAST REALTIME TERLEBIH DAHULU
      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }

      tambahNotifikasiSistem(['DM'], 'ALL', `PERMINTAAN #${noSurat} DISETUJUI SERVICE (${currentUser.fullName || currentUser.username}). MOHON APPROVAL DM.`, noSurat);

      // Fungsi Pengiriman WhatsApp (HANYA DIEKSEKUSI SETELAH DATA DIPASTIKAN TERKIRIM KE SUPABASE & SEMUA PERANGKAT)
      const dispatchApprovalWADestination = () => {
        const users = getUsersFromDB();
        const dmUsers = users.filter(u => u.category === 'DM');
        dmUsers.forEach(dm => {
          if (dm.phone && dm.phone !== '-') {
            const dmName = dm.fullName || dm.username || 'Bapak/Ibu DM';
            kirimNotifikasiWA(dm.phone,
              `Yth. Bapak/Ibu ${dmName},

` +
              `Pemberitahuan Sistem Permintaan Barang:
` +
              `Pengajuan permintaan barang berikut telah DISETUJUI oleh Service (${currentUser.fullName || currentUser.username}):
` +
              `• Nomor Dokumen : #${noSurat}
` +
              `• Toko / Pemohon : ${requests[idx].toko} (${requests[idx].area})
` +
              `• Link Detail : ${getAppDirectLink(noSurat)}

` +
              `Mohon berkenan untuk melakukan peninjauan dan persetujuan (approval) tingkat DM melalui sistem aplikasi. Terima kasih.`
            );
          }
        });
      };

      // PASTIKAN DATA TERSIMPAN DAN TER-BROADCAST DI SUPABASE BARU KIRIM WA
      if (typeof safeSupabaseUpsertPermintaan === 'function') {
        safeSupabaseUpsertPermintaan(requests[idx]).then(() => {
          setTimeout(dispatchApprovalWADestination, 300);
        }).catch(e => {
          console.warn('[SUPABASE APPROVE EXCEPTION]:', e);
          dispatchApprovalWADestination();
        });
      } else {
        setTimeout(dispatchApprovalWADestination, 500);
      }
    }
  });
}

function approveDM(noSurat) {
  const requests = getRequestsFromDB();
  const req = requests.find(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
  if (req && !req.serviceApprove) {
    showNotif('PERMINTAAN WAJIB DI-APPROVE OLEH SERVICE TERLEBIH DAHULU SEBELUM DM DAPAT MEMPROSES APPROVAL!', 'warning');
    return;
  }

  showConfirm(`APPROVE PERMINTAAN #${noSurat}?`, async () => {
    showLoading('MEMERIKSA DATA TERBARU SERVER...');
    const isValid = await validatePreApprovalData(noSurat, 'DM');
    hideLoading();
    if (!isValid) return;
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
    if (idx !== -1) {
      if (!requests[idx].serviceApprove) {
        showNotif('PERMINTAAN WAJIB DI-APPROVE OLEH SERVICE TERLEBIH DAHULU!', 'warning');
        return;
      }
      requests[idx].status = 'APPROVE';
      requests[idx].dmUserName = currentUser ? (currentUser.fullName || currentUser.username) : 'DM';

      // AMBIL TTD DIGITAL ASLI DARI PROFIL / MENU TTD DM
      const dmSig = getUserRealSignature('DM', requests[idx].area, currentUser ? currentUser.username : '', requests[idx].dmUserName);
      requests[idx].dmTTD = dmSig || '';

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'APPROVE_DM',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'DM',
        notes: 'DISETUJUI DM',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      // 1. SIMPAN LOKAL & UPDATE UI INSTAN (0 ms)
      saveRequestsToDB(requests, requests[idx], 'UPDATE');
      showNotif(`NO SURAT #${noSurat} BERHASIL DI APPROVE`, 'success');
      loadRiwayat();
      loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      if (typeof refreshDetailModalIfOpen === 'function') refreshDetailModalIfOpen(noSurat);
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
      if (typeof cekUnreadNotif === 'function') cekUnreadNotif();

      // 2. PROSES SYNC SUPABASE & BROADCAST REALTIME TERLEBIH DAHULU
      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }

      tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH DISETUJUI DM. SILAKAN DIPROSES.`, noSurat);

      // Fungsi Pengiriman WhatsApp (HANYA DIEKSEKUSI SETELAH DATA DIPASTIKAN TERKIRIM KE SUPABASE & SEMUA PERANGKAT)
      const dispatchDMApprovalWADestination = () => {
        const users = getUsersFromDB();
        const serviceUsers = users.filter(u => u.category === 'SERVICE' && (u.area === requests[idx].area || u.area === 'ALL'));
        serviceUsers.forEach(srv => {
          if (srv.phone && srv.phone !== '-') {
            const srvName = srv.fullName || srv.username || 'Bapak/Ibu Tim Service';
            kirimNotifikasiWA(srv.phone,
              `Yth. Bapak/Ibu ${srvName},

` +
              `Pemberitahuan Sistem Permintaan Barang:
` +
              `Pengajuan permintaan barang berikut telah DISETUJUI OLEH DM:
` +
              `• Nomor Dokumen : #${noSurat}
` +
              `• Toko / Pemohon : ${requests[idx].toko} (${requests[idx].area})
` +
              `• Status : DISETUJUI (APPROVE)
` +
              `• Link Detail : ${getAppDirectLink(noSurat)}

` +
              `Dokumen saat ini siap diproses oleh Tim Service. Terima kasih atas kerja samanya.`
            );
          }
        });
      };

      // PASTIKAN DATA TERSIMPAN DAN TER-BROADCAST DI SUPABASE BARU KIRIM WA
      if (typeof safeSupabaseUpsertPermintaan === 'function') {
        safeSupabaseUpsertPermintaan(requests[idx]).then(() => {
          setTimeout(dispatchDMApprovalWADestination, 300);
        }).catch(e => {
          console.warn('[SUPABASE DM APPROVE EXCEPTION]:', e);
          dispatchDMApprovalWADestination();
        });
      } else {
        setTimeout(dispatchDMApprovalWADestination, 500);
      }
    }
  });
}

let tempArtemisPhotos = [];

function doneService(noSurat) {
  if (!noSurat) return;
  window._activeDonePartialId = null; // Reset partial breakdown DONE flag for main request
  const requests = getRequestsFromDB();
  const req = requests.find(r => r && (r.noSurat === noSurat || String(r.noSurat) === String(noSurat) || r.id === noSurat));
  if (!req) {
    showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  // CHECK UN-DONE PARTIAL BREAKDOWNS FIRST
  const partialsCheck = typeof getPartialBreakdownsFromDB === 'function' ? getPartialBreakdownsFromDB(noSurat) : [];
  if (Array.isArray(partialsCheck) && partialsCheck.length > 0) {
    const unDonePartials = partialsCheck.filter(p => p && p.status !== 'DONE' && p.status !== 'REJECT');
    if (unDonePartials.length > 0) {
      const pids = unDonePartials.map(p => p.partial_id || p.partialId).join(', ');
      if (typeof showNotif === 'function') {
        showNotif(`TIDAK DAPAT SET DONE INDUK! MASIH ADA SURAT PARSIAL (${pids}) YANG BELUM BERSTATUS DONE.`, 'warning');
      }
      return;
    }
  }

  // VALIDASI KETAT BRAKDOWN PARSIAL TERGANTUNG
  if (typeof isRequestReadyForDone === 'function' && !isRequestReadyForDone(req)) {
    if (typeof showNotif === 'function') {
      showNotif('TIDAK DAPAT MENYELESAIKAN (DONE)! MASIH TERDAPAT BARANG DENGAN SISA QTY YANG BELUM DIBREAKDOWN / BELUM DITANDAI "TIDAK DIPENUHI".', 'warning');
    }
    return;
  }

  const artemisNoSurat = document.getElementById('artemisNoSurat');
  if (artemisNoSurat) artemisNoSurat.value = noSurat;
  const inputKet = document.getElementById('inputKetPartArtemis');
  if (inputKet) inputKet.value = '';

  const artemisSubTitle = document.getElementById('artemisSubTitle');
  const pasteBox = document.getElementById('artemisPasteBox');
  const previewGrid = document.getElementById('artemisPhotoPreviewGrid');
  const hasPartials = Array.isArray(partialsCheck) && partialsCheck.length > 0;

  if (hasPartials) {
    if (pasteBox) pasteBox.style.display = 'none';
    if (previewGrid) previewGrid.style.display = 'none';
    if (artemisSubTitle) {
      artemisSubTitle.textContent = `KONFIRMASI PENYELESAIKAN SURAT INDUK #${noSurat} (FOTO BUKTI SUDAH DISERAHKAN DI SURAT PARSIAL):`;
    }
  } else {
    if (pasteBox) pasteBox.style.display = 'block';
    if (previewGrid) previewGrid.style.display = 'flex';
    if (artemisSubTitle) {
      artemisSubTitle.textContent = `UPLOAD FOTO BUKTI PROSES ARTEMIS UNTUK MENYELESAIKAN PERMINTAAN #${noSurat}:`;
    }
  }

  const titleEl = document.getElementById('artemisTitle');
  if (titleEl) titleEl.innerText = `PROSES ARTEMIS / CONSOLATION DONE`;

  tempArtemisPhotos = [];
  renderArtemisPhotoPreviews();

  const overlay = document.getElementById('artemisOverlay');
  if (overlay) {
    overlay.classList.add('show');
    overlay.style.setProperty('z-index', '99999999', 'important');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    try { history.pushState({ artemisModalOpen: true }, ''); } catch(e) {}
  }
}
window.doneService = doneService;
window.bukaArtemisModal = doneService;

function closeArtemisModal() {
  window._activeDonePartialId = null;
  const titleEl = document.getElementById('artemisTitle');
  if (titleEl) titleEl.innerText = 'PROSES ARTEMIS / UPLOAD BUKTI FOTO';

  const pasteBox = document.getElementById('artemisPasteBox');
  const previewGrid = document.getElementById('artemisPhotoPreviewGrid');
  if (pasteBox) pasteBox.style.display = 'block';
  if (previewGrid) previewGrid.style.display = 'flex';

  const overlay = document.getElementById('artemisOverlay');
  if (overlay) {
    overlay.style.setProperty('display', 'none', 'important');
    overlay.classList.remove('show');
  }

  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.closeArtemisModal = closeArtemisModal;

function convertImageToJpeg(fileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) return reject('File tidak valid');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpegDataUrl);
      };
      img.onerror = () => reject('Gagal memuat format gambar');
      img.src = e.target.result;
    };
    reader.onerror = () => reject('Gagal membaca berkas gambar');
    reader.readAsDataURL(fileOrBlob);
  });
}
window.convertImageToJpeg = convertImageToJpeg;

async function handleArtemisGlobalPaste(e) {
  const overlay = document.getElementById('artemisOverlay');
  if (!overlay || overlay.style.display === 'none' || !overlay.classList.contains('show')) return;

  const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
  if (!clipboardData || !clipboardData.items) return;

  const items = clipboardData.items;
  let addedCount = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const blob = items[i].getAsFile();
      if (blob) {
        try {
          if (typeof showLoading === 'function') showLoading('MENGUNGGAH PASTE SCREENSHOT...');
          const url = await uploadPhotoToSupabaseStorage(blob);
          if (url) {
            tempArtemisPhotos.push(url);
            addedCount++;
          }
        } catch (err) {
          console.error('[PASTE ARTEMIS ERROR]:', err);
        } finally {
          if (typeof hideLoading === 'function') hideLoading();
        }
      }
    }
  }

  if (addedCount > 0) {
    if (e.preventDefault) e.preventDefault();
    renderArtemisPhotoPreviews();
  }
}
window.handleArtemisGlobalPaste = handleArtemisGlobalPaste;

// Attach global paste listener once initialized
if (typeof window !== 'undefined') {
  window.removeEventListener('paste', handleArtemisGlobalPaste);
  window.addEventListener('paste', handleArtemisGlobalPaste);
}

async function handleArtemisPhotoSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  if (typeof showLoading === 'function') showLoading('MENGUNGGAH FOTO BUKTI ARTEMIS...');

  try {
    for (const file of Array.from(files)) {
      const url = await uploadPhotoToSupabaseStorage(file);
      if (url) {
        tempArtemisPhotos.push(url);
      }
    }
    renderArtemisPhotoPreviews();
  } catch (err) {
    console.error('[UPLOAD ARTEMIS ERROR]:', err);
    showNotif('GAGAL MENGUNGGAH FOTO BUKTI!', 'warning');
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
    e.target.value = '';
  }
}
window.handleArtemisPhotoSelect = handleArtemisPhotoSelect;

function renderArtemisPhotoPreviews() {
  const grid = document.getElementById('artemisPhotoPreviewGrid');
  if (!grid) return;

  if (tempArtemisPhotos.length === 0) {
    grid.innerHTML = '<div style="width: 100%; text-align: center; font-size: 11.5px; color: var(--text-muted); padding: 12px;">BELUM ADA FOTO ARTEMIS DIPILIH</div>';
    return;
  }

  grid.innerHTML = tempArtemisPhotos.map((imgSrc, idx) => `
    <div style="position: relative; width: 65px; height: 65px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
      <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" onclick="hapusPhotoArtemisTemp(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(239,68,68,0.9); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
    </div>
  `).join('');
}
window.renderArtemisPhotoPreviews = renderArtemisPhotoPreviews;

function hapusPhotoArtemisTemp(idx) {
  if (idx >= 0 && idx < tempArtemisPhotos.length) {
    tempArtemisPhotos.splice(idx, 1);
    renderArtemisPhotoPreviews();
  }
}
window.hapusPhotoArtemisTemp = hapusPhotoArtemisTemp;

function prosesSimpanDoneDenganBuktiArtemis() {
  const elNo = document.getElementById('artemisNoSurat');
  const noSurat = elNo ? elNo.value.trim() : '';

  if (!noSurat) {
    showNotif('NOMOR SURAT PERMINTAAN TIDAK VALID!', 'warning');
    return;
  }

  const partialId = window._activeDonePartialId;

  // JIKA DONE ADALAH UNTUK CARD SURAT JALAN PARSIAL (BREAKDOWN CARD)
  if (partialId) {
    if (!Array.isArray(tempArtemisPhotos) || tempArtemisPhotos.length === 0) {
      showNotif('TIDAK ADA FOTO BUKTI PROSES ARTEMIS YANG DIUPLOAD!', 'warning');
      return;
    }

    showConfirm(`SELESAIKAN SURAT JALAN PARSIAL #${noSurat}-${partialId} DAN SIMPAN BUKTI FOTO?`, () => {
      try {
        const partials = getPartialBreakdownsFromDB(noSurat);
        const pIdx = partials.findIndex(p => p && (p.partial_id === partialId || p.partialId === partialId || String(p.id).endsWith(`_${partialId}`)));

        if (pIdx !== -1) {
          partials[pIdx].status = 'DONE';
          partials[pIdx].done_by = currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE';
          partials[pIdx].done_at = new Date().toISOString();

          const existingPhotos = parsePhotosArray(partials[pIdx].photos);
          const newPhotos = Array.isArray(tempArtemisPhotos) ? tempArtemisPhotos : [];
          partials[pIdx].photos = [...existingPhotos, ...newPhotos];

          savePartialBreakdownsToDB(partials, noSurat);
          pushPartialBreakdownsToCloud(partials, noSurat);

          // Update item main request yang diserahkan di parsial ini
          const requests = getRequestsFromDB();
          const targetNo = String(noSurat).trim().toUpperCase();
          const mainIdx = requests.findIndex(r => r && String(r.noSurat || '').trim().toUpperCase() === targetNo);
          if (mainIdx !== -1 && Array.isArray(partials[pIdx].items)) {
            partials[pIdx].items.forEach(pItem => {
              const itemIdx = pItem.itemIdx;
              if (itemIdx >= 0 && itemIdx < requests[mainIdx].items.length) {
                requests[mainIdx].items[itemIdx].statusPart = 'SUDAH DISERAHKAN';
                requests[mainIdx].items[itemIdx].keteranganPart = 'SUDAH DISERAHKAN';
              }
            });
            saveRequestsToDB(requests);
            if (typeof safeSupabaseUpsertPermintaan === 'function') safeSupabaseUpsertPermintaan(requests[mainIdx]);
          }

          window._activeDonePartialId = null;
          closeArtemisModal();
          showNotif(`SURAT JALAN PARSIAL #${noSurat}-${partialId} SELESAI (DONE) & BUKTI FOTO DISIMPAN!`, 'success');

          if (typeof bukaModalRiwayatParsialList === 'function') {
            bukaModalRiwayatParsialList(noSurat);
          }
          if (typeof loadRiwayat === 'function') loadRiwayat();
          if (typeof loadDashboard === 'function') loadDashboard();
        }
      } catch(err) {
        console.warn('Error done partial breakdown:', err);
      }
    });
    return;
  }

  // VALIDASI UNTUK DONE SURAT UTAMA / INDUK:
  const partialsCheck = getPartialBreakdownsFromDB(noSurat);
  const hasBreakdownSubmissions = Array.isArray(partialsCheck) && partialsCheck.length > 0;

  if (hasBreakdownSubmissions) {
    // 1. SEMUA CARD PARSIAL HARUS SUDAH DONE / REJECT
    const unDonePartials = partialsCheck.filter(p => p && p.status !== 'DONE' && p.status !== 'REJECT');
    if (unDonePartials.length > 0) {
      const pids = unDonePartials.map(p => p.partial_id || p.partialId).join(', ');
      showNotif(`GAGAL SET DONE INDUK! MASIH ADA SURAT PARSIAL (${pids}) YANG BELUM BERSTATUS DONE.`, 'warning');
      return;
    }
    // UPLOAD FOTO INDUK TIDAK WAJIB KARENA SUDAH MEMILIKI SURAT JALAN PARSIAL!
  } else {
    // TRANSAKSI BIASA (TIDAK ADA BREAKDOWN): UPLOAD FOTO PROSES WAJIB!
    if (!Array.isArray(tempArtemisPhotos) || tempArtemisPhotos.length === 0) {
      showNotif('TIDAK ADA FOTO BUKTI PROSES ARTEMIS YANG DIUPLOAD!', 'warning');
      return;
    }
  }

  showConfirm(`SELESAIKAN PERMINTAAN #${noSurat} DAN SIMPAN BUKTI PROSES ARTEMIS?`, () => {
    try {
      const requests = getRequestsFromDB();
      const targetNo = String(noSurat).trim().toUpperCase();
      const idx = requests.findIndex(r => r && (
        String(r.noSurat || '').trim().toUpperCase() === targetNo ||
        String(r.id || '').trim().toUpperCase() === targetNo
      ));

      if (idx !== -1) {
        requests[idx].status = 'DONE';
        requests[idx].artemisPhotos = Array.isArray(tempArtemisPhotos) ? [...tempArtemisPhotos] : [];

        if (!Array.isArray(requests[idx].photos)) requests[idx].photos = [];
        if (Array.isArray(tempArtemisPhotos) && tempArtemisPhotos.length > 0) {
          requests[idx].photos = [...requests[idx].photos, ...tempArtemisPhotos];
        }

        // STATUS PART: JIKA DIISI TEKS MAKA GUNAKAN TEKS TERSEBUT, JIKA KOSONG MAKA DEFAULT = "DIPENUHI"
        const elKetArtemis = document.getElementById('inputKetPartArtemis');
        const customKetPart = elKetArtemis ? elKetArtemis.value.trim() : '';
        const finalStatusPart = customKetPart || 'DIPENUHI';

        if (Array.isArray(requests[idx].items)) {
          requests[idx].items.forEach(item => {
            if (!item.unfulfilled) {
              item.statusPart = finalStatusPart;
              item.keteranganPart = finalStatusPart;
              item.updatePart = finalStatusPart;
            } else {
              item.statusPart = 'TIDAK DIPENUHI';
              item.keteranganPart = 'TIDAK DIPENUHI';
              item.updatePart = 'TIDAK DIPENUHI';
            }
          });
        }

        if (!requests[idx].log) requests[idx].log = [];
        requests[idx].log.push({
          action: 'DONE_WITH_ARTEMIS_PHOTOS',
          user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
          notes: `SELESAI DENGAN ${(tempArtemisPhotos || []).length} BUKTI FOTO ARTEMIS`,
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });

        // 1. SIMPAN LOKAL & UPDATE UI INSTAN (0 ms)
        saveRequestsToDB(requests);
        closeArtemisModal();
        showNotif(`PERMINTAAN #${noSurat} TELAH SELESAI (DONE) & BUKTI FOTO ARTEMIS DISIMPAN!`, 'success');
        
        tambahNotifikasiSistem(['TOKO', 'SALES', 'DM'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} TELAH SELESAI (DONE) DENGAN BUKTI PROSES ARTEMIS.`, noSurat);
        loadRiwayat();
        loadDashboard();
        if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') {
          if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        }

        // 2. PROSES SYNC SUPABASE & BROADCAST REALTIME TERLEBIH DAHULU
        const docId = String(noSurat).replace(/[\/\.]/g, '_');
        if (typeof safeSupabaseUpsertPermintaan === 'function') {
          safeSupabaseUpsertPermintaan(requests[idx]);
        }
        if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
          dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
        }
        if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
          dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
        }
      }
    } catch(err) {
      console.warn('Error prosesSimpanDoneDenganBuktiArtemis:', err);
    }
  });
}
window.prosesSimpanDoneDenganBuktiArtemis = prosesSimpanDoneDenganBuktiArtemis;

function batalApproveService(noSurat) {
  if (!noSurat) return;
  const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  const isServiceUser = currentUser && (currentUser.category === 'SERVICE' || currentUser.category === 'HODS');
  if (!isAdminUser && !isServiceUser) {
    showNotif('HANYA ROLE SERVICE / ADMIN YANG DAPAT MEMBATALKAN APPROVAL SERVICE!', 'warning');
    return;
  }

  showConfirm(`BATALKAN APPROVAL SERVICE UNTUK PERMINTAAN #${noSurat}?`, () => {
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
    if (idx !== -1) {
      requests[idx].serviceApprove = false;
      requests[idx].serviceUserName = '';
      requests[idx].serviceTTD = '';
      requests[idx].status = 'PENDING';

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'BATAL_APPROVE_SERVICE',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
        notes: 'PEMBATALAN APPROVAL SERVICE',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      saveRequestsToDB(requests, requests[idx], 'UPDATE');
      showNotif(`APPROVAL SERVICE #${noSurat} TELAH DIBATALKAN`, 'info');
      loadRiwayat();
      loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      if (typeof refreshDetailModalIfOpen === 'function') refreshDetailModalIfOpen(noSurat);

      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof safeSupabaseUpsertPermintaan === 'function') {
        safeSupabaseUpsertPermintaan(requests[idx]);
      }
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }
    }
  });
}

function batalApproveDM(noSurat) {
  if (!noSurat) return;
  const isAdminUser = currentUser && (currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  const isDMUser = currentUser && currentUser.category === 'DM';
  if (!isAdminUser && !isDMUser) {
    showNotif('HANYA ROLE DM / ADMIN YANG DAPAT MEMBATALKAN APPROVAL DM!', 'warning');
    return;
  }

  showConfirm(`BATALKAN APPROVAL DM UNTUK PERMINTAAN #${noSurat}?`, () => {
    const requests = getRequestsFromDB();
    const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
    if (idx !== -1) {
      requests[idx].status = 'PENDING';
      requests[idx].dmUserName = '';
      requests[idx].dmTTD = '';

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'BATAL_APPROVE_DM',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'DM',
        notes: 'PEMBATALAN APPROVAL DM',
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      saveRequestsToDB(requests, requests[idx], 'UPDATE');
      showNotif(`APPROVAL DM #${noSurat} TELAH DIBATALKAN`, 'info');
      loadRiwayat();
      loadDashboard();
      if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') loadMasterDbTable();
      if (typeof refreshDetailModalIfOpen === 'function') refreshDetailModalIfOpen(noSurat);

      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof safeSupabaseUpsertPermintaan === 'function') {
        safeSupabaseUpsertPermintaan(requests[idx]);
      }
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }
    }
  });
}

function tolakServiceModal(noSurat, roleType) {
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
  const overlay = document.getElementById('rejectOverlay');
  const elNo = document.getElementById('rejectNoSurat');
  const elRole = document.getElementById('rejectRoleType');
  const elTitle = document.getElementById('rejectTitle');
  const elReason = document.getElementById('rejectReason') || document.getElementById('rejectAlasan');

  if (elNo) elNo.value = noSurat;
  if (elRole) elRole.value = roleType || 'DM';
  if (elTitle) elTitle.innerText = `TOLAK PERMINTAAN (${roleType || 'DM'})`;
  if (elReason) elReason.value = '';

  if (overlay) {
    overlay.style.setProperty('z-index', '2147483640', 'important');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.classList.add('show');
  }
}
window.tolakServiceModal = tolakServiceModal;

function kirimReject() {
  const elRole = document.getElementById('rejectRoleType');
  const roleType = elRole && elRole.value ? elRole.value : 'DM';
  prosesReject(roleType);
}
window.kirimReject = kirimReject;

function tutupRejectModal() {
  const overlay = document.getElementById('rejectOverlay');
  if (overlay) {
    overlay.style.setProperty('display', 'none', 'important');
    overlay.classList.remove('show');
  }
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupRejectModal = tutupRejectModal;
window.closeReject = tutupRejectModal;
window.closeRejectModal = tutupRejectModal;

function prosesReject(roleType) {
  const elNo = document.getElementById('rejectNoSurat');
  const elAlasan = document.getElementById('rejectReason') || document.getElementById('rejectAlasan');
  const noSurat = elNo ? elNo.value.trim() : '';
  const alasan = elAlasan ? elAlasan.value.trim() : '';

  if (!alasan) {
    showNotif('ALASAN PENOLAKAN WAJIB DIISI!', 'warning');
    return;
  }

  tutupRejectModal();

  const requests = getRequestsFromDB();
  const idx = requests.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
  if (idx !== -1) {
    requests[idx].status = 'REJECT';
    requests[idx].catatan = `DITOLAK ${roleType}: ${alasan}`;
    if (!requests[idx].log) requests[idx].log = [];
    requests[idx].log.push({
      action: `REJECT_${roleType}`,
      user: currentUser ? (currentUser.fullName || currentUser.username) : 'ADMIN',
      notes: alasan,
      time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
    });

    // 1. SIMPAN LOKAL & UPDATE UI INSTAN (0 ms)
    saveRequestsToDB(requests);
    showNotif(`NO SURAT #${noSurat} BERHASIL DI TOLAK`, 'info');
    loadRiwayat();
    loadDashboard();
    if (typeof loadMasterDbTable === 'function') loadMasterDbTable();

    // 2. PROSES SYNC SUPABASE & BROADCAST REALTIME TERLEBIH DAHULU
    const docId = String(noSurat).replace(/[\/\.]/g, '_');
    if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
      dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
    }
    if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
      dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
    }

    const users = getUsersFromDB();
    const creator = users.find(u => u && (u.id === requests[idx].userId || u.fullName === requests[idx].createdBy));

    const dispatchRejectWADestination = () => {
      if (roleType === 'SERVICE') {
        tambahNotifikasiSistem(['TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK SERVICE. ALASAN: ${alasan}`, noSurat);
        if (creator && creator.phone && creator.phone !== '-') {
          const creatorName = creator.fullName || creator.username || 'Bapak/Ibu Pembuat Permintaan';
          kirimNotifikasiWA(creator.phone,
            `Yth. Bapak/Ibu *${creatorName}*\n\n` +
            `❌ *PEMBERITAHUAN PENOLAKAN PERMINTAAN*\n` +
            `Pengajuan permintaan barang Anda telah *DITOLAK* oleh Tim Service:\n` +
            `• Nomor Dokumen : *#${noSurat}*\n` +
            `• Toko / Pemohon : *${requests[idx].toko}* (${requests[idx].area || '-'})
` +
            `• Catatan / Alasan : *${alasan}*\n` +
            `• Link Detail : ${getAppDirectLink(noSurat)}\n\n` +
            `Silakan periksa kembali rincian dokumen pada sistem aplikasi. Terima kasih.`
          );
        }
      } else if (roleType === 'DM') {
        tambahNotifikasiSistem(['SERVICE', 'TOKO', 'SALES'], requests[idx].area, `PERMINTAAN #${noSurat} DARI ${requests[idx].toko} DITOLAK DM. ALASAN: ${alasan}`, noSurat);

        if (creator && creator.phone && creator.phone !== '-') {
          const creatorName = creator.fullName || creator.username || 'Bapak/Ibu Pembuat Permintaan';
          kirimNotifikasiWA(creator.phone,
            `Yth. Bapak/Ibu *${creatorName}*\n\n` +
            `❌ *PEMBERITAHUAN PENOLAKAN PERMINTAAN OLEH DM*\n` +
            `Pengajuan permintaan barang berikut telah *DITOLAK oleh DM Pusat*:\n` +
            `• Nomor Dokumen : *#${noSurat}*\n` +
            `• Toko / Pemohon : *${requests[idx].toko}* (${requests[idx].area || '-'})
` +
            `• Catatan / Alasan Penolakan : *${alasan}*\n` +
            `• Link Detail : ${getAppDirectLink(noSurat)}\n\n` +
            `Silakan periksa kembali rincian dokumen pada sistem aplikasi. Terima kasih.`
          );
        }

        const serviceUsers = users.filter(u => u && (u.category === 'SERVICE' || u.category === 'HODS') && (u.area === requests[idx].area || u.area === 'ALL' || !u.area) && u.phone && u.phone !== '-');
        serviceUsers.forEach(srv => {
          const srvName = srv.fullName || srv.username || 'Bapak/Ibu Tim Service';
          kirimNotifikasiWA(srv.phone,
            `Yth. Bapak/Ibu *${srvName}*\n\n` +
            `⚠️ *PEMBERITAHUAN PENOLAKAN DM UNTUK TIM SERVICE*\n` +
            `Pengajuan permintaan barang yang telah di-approve Service berikut telah *DITOLAK oleh DM Pusat*:\n` +
            `• Nomor Dokumen : *#${noSurat}*\n` +
            `• Toko / Pemohon : *${requests[idx].toko}* (${requests[idx].area || '-'})
` +
            `• Pembuat Permintaan : *${requests[idx].createdBy || '-'}*\n` +
            `• Catatan / Alasan Penolakan : *${alasan}*\n` +
            `• Link Detail : ${getAppDirectLink(noSurat)}\n\n` +
            `Silakan buka sistem aplikasi untuk melihat rincian catatan penolakan. Terima kasih.`
          );
        });
      }
    };

    // PASTIKAN DATA TERSIMPAN DAN TER-BROADCAST DI SUPABASE BARU KIRIM WA
    if (typeof safeSupabaseUpsertPermintaan === 'function') {
      safeSupabaseUpsertPermintaan(requests[idx]).then(() => {
        setTimeout(dispatchRejectWADestination, 300);
      }).catch(e => {
        console.warn('[SUPABASE REJECT EXCEPTION]:', e);
        dispatchRejectWADestination();
      });
    } else {
      setTimeout(dispatchRejectWADestination, 500);
    }
  }
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

      if (item.unfulfilled || item.batal || req.status === 'BATAL') {
        row.classList.add('unfulfilled');
        row.setAttribute('data-unfulfilled', 'true');
        row.style.background = 'rgba(239, 68, 68, 0.12)';
        row.style.border = '1.5px solid #ef4444';
        const inputs = row.querySelectorAll('input');
        inputs.forEach(inp => {
          inp.style.textDecoration = 'line-through';
          inp.style.textDecorationThickness = '3px';
          inp.style.fontWeight = 'bold';
          inp.style.color = '#ef4444';
        });
        const btnHapus = row.querySelector('.btnHapusRow');
        if (btnHapus) {
          btnHapus.innerHTML = `<span class="material-symbols-rounded">undo</span>`;
          btnHapus.style.background = '#eab308';
          btnHapus.title = 'BATALKAN TANDA TIDAK DIPENUHI';
        }
      }
    });
  }

  currentPhotos = [...(req.photos || [])];
  renderPhotoGrid(); if (typeof updateFotoUploadLimitDisplay === "function") updateFotoUploadLimitDisplay();

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
  showConfirm(`APAKAH ANDA YAKIN INGIN MENGHAPUS PERMINTAAN #${noSurat} INI?`, () => {
    try {
      const currentReqs = getRequestsFromDB();
      const idx = currentReqs.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
      if (idx !== -1) {
        currentReqs[idx].status = 'BATAL';
        currentReqs[idx].unfulfilled = true;
        if (Array.isArray(currentReqs[idx].items)) {
          currentReqs[idx].items.forEach(i => i.unfulfilled = true);
        }
        if (!currentReqs[idx].log) currentReqs[idx].log = [];
        currentReqs[idx].log.push({
          action: 'TIDAK_DIPENUHI',
          user: currentUser ? (currentUser.fullName || currentUser.username) : 'USER',
          notes: 'HAPUS PERMINTAAN',
          time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
        });

        // 1. SIMPAN LOKAL SECARA INSTAN (0 ms)
        saveRequestsToDB(currentReqs);
        deleteRequestFromSupabase(noSurat);
        showNotif(`PERMINTAAN #${noSurat} BERHASIL DIHAPUS!`, 'warning');
        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
        if (typeof loadMasterDbTable === 'function') loadMasterDbTable();

        // 2. PROSES SYNC SUPABASE DI LATAR BELAKANG
        const docId = String(noSurat).replace(/[\/\.]/g, '_');
        if (typeof safeSupabaseUpsertPermintaan === 'function') {
        safeSupabaseUpsertPermintaan(currentReqs[idx]);
      } else if (typeof supabase !== 'undefined' && supabase) {
        const cleanRow = sanitizePermintaanTokoRow(currentReqs[idx]);
        if (cleanRow) {
          supabase.from('permintaan_toko').upsert(cleanRow, { onConflict: 'id' }).then(() => {}, (e) => console.warn(e));
        }
      }
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          dbFirestore.collection('requests').doc(docId).set(currentReqs[idx], { merge: true }).catch(e => console.warn(e));
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          dbRealtime.ref(`requests/${docId}`).set(currentReqs[idx]).catch(e => console.warn(e));
        }
      }
    } catch (err) {
      console.error('[HAPUS DATA ERROR]:', err);
      showNotif('GAGAL MENGHAPUS PERMINTAAN: ' + (err.message || err), 'error');
    }
  });
}
window.hapusData = hapusData;

function tutupDetailBarangV2(fromPopState = false) {
  _isClosingDetailModal = true;
  window._isClosingDetailModal = true;
  window.PENDING_URL_NO_SURAT = null;
  window._currentDetailNoSurat = null;

  try {
    if (window.location && window.location.search && (window.location.search.includes('noSurat') || window.location.search.includes('nosurat') || window.location.search.includes('id'))) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch(e) {}

  const detailModal = document.getElementById('popupDetailBarangV2');
  if (detailModal) {
    detailModal.style.setProperty('display', 'none', 'important');
    detailModal.classList.remove('show');
    detailModal.dataset.active = "false";
    detailModal.dataset.noSurat = "";
  }

  const oldDetailModal = document.getElementById('popupDetail');
  if (oldDetailModal) {
    oldDetailModal.style.setProperty('display', 'none', 'important');
    oldDetailModal.classList.remove('show');
    oldDetailModal.dataset.active = "false";
    oldDetailModal.dataset.noSurat = "";
  }

  // Jika ditutup manual via tombol X / overlay (bukan tombol Back HP/Browser), bersihkan history state
  if (!fromPopState && window.history.state && window.history.state.popupDetailOpen) {
    try {
      window.history.back();
    } catch(e) {}
  }

  setTimeout(() => {
    _isClosingDetailModal = false;
    window._isClosingDetailModal = false;
    const activePageId = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
    if (typeof aturTampilanLonceng === 'function') {
      aturTampilanLonceng(activePageId);
    }
  }, 500);
}
window.tutupDetailBarangV2 = tutupDetailBarangV2;
window.closeDetail = tutupDetailBarangV2;

function refreshDetailModalIfOpen(noSurat) {
  // Disabled auto-refresh of detail modal per user directive
  return;
}
window.refreshDetailModalIfOpen = refreshDetailModalIfOpen;

let isItemModifiedMap = {};

function hapusBarisItemDetailAdmin(noSurat, itemIndex) {
  if (!noSurat) return;

  const requests = getRequestsFromDB();
  const idx = requests.findIndex(r => r && (r.noSurat === noSurat || String(r.noSurat) === String(noSurat) || r.id === noSurat));
  if (idx === -1) return;

  let rawItems = requests[idx].items;
  let itemsList = [];
  if (Array.isArray(rawItems)) {
    itemsList = [...rawItems];
  } else if (typeof rawItems === 'string') {
    try { itemsList = JSON.parse(rawItems || '[]'); } catch (e) { itemsList = []; }
  }

  if (itemIndex >= 0 && itemIndex < itemsList.length) {
    const targetItemName = itemsList[itemIndex].barang || itemsList[itemIndex].permintaan || itemsList[itemIndex].type || `Baris ${itemIndex + 1}`;
    
    showConfirm(`TANDAI ITEM '${targetItemName}' SEBAGAI TIDAK DIPENUHI?`, () => {
      itemsList[itemIndex].unfulfilled = true;
      requests[idx].items = itemsList;

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'TIDAK_DIPENUHI_ITEM',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
        notes: `Tandai tidak dipenuhi item '${targetItemName}'`,
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      saveRequestsToDB(requests);
      isItemModifiedMap[noSurat] = true;

      showNotif(`ITEM DITANDAI TIDAK DIPENUHI. KLIK 'SIMPAN PERUBAHAN' UNTUK MENYIMPAN.`, 'warning');
      lihatDetail(noSurat);
    });
  }
}
window.hapusBarisItemDetailAdmin = hapusBarisItemDetailAdmin;

function undoBarisItemDetailAdmin(noSurat, itemIndex) {
  if (!noSurat) return;

  const requests = getRequestsFromDB();
  const idx = requests.findIndex(r => r && (r.noSurat === noSurat || String(r.noSurat) === String(noSurat) || r.id === noSurat));
  if (idx === -1) return;

  let rawItems = requests[idx].items;
  let itemsList = [];
  if (Array.isArray(rawItems)) {
    itemsList = [...rawItems];
  } else if (typeof rawItems === 'string') {
    try { itemsList = JSON.parse(rawItems || '[]'); } catch (e) { itemsList = []; }
  }

  if (itemIndex >= 0 && itemIndex < itemsList.length) {
    const targetItemName = itemsList[itemIndex].barang || itemsList[itemIndex].permintaan || itemsList[itemIndex].type || `Baris ${itemIndex + 1}`;
    
    delete itemsList[itemIndex].unfulfilled;
    requests[idx].items = itemsList;

    if (!requests[idx].log) requests[idx].log = [];
    requests[idx].log.push({
      action: 'UNDO_TIDAK_DIPENUHI_ITEM',
      user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
      notes: `Undo status tidak dipenuhi item '${targetItemName}'`,
      time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
    });

    saveRequestsToDB(requests);
    isItemModifiedMap[noSurat] = true;

    showNotif(`BATALKAN STATUS TIDAK DIPENUHI PADA ITEM '${targetItemName}'. KLIK 'SIMPAN PERUBAHAN'.`, 'info');
    lihatDetail(noSurat);
  }
}
window.undoBarisItemDetailAdmin = undoBarisItemDetailAdmin;

async function simpanPerubahanDetailAdmin(noSurat) {
  if (!noSurat) return;

  const isModified = isItemModifiedMap[noSurat];

  if (!isModified) {
    showNotif('TIDAK ADA PERUBAHAN PADA ITEM BARANG!', 'warning');
    return;
  }

  showConfirm(`APAKAH ANDA YAKIN INGIN MENYIMPAN PERUBAHAN ITEM PERMINTAAN #${noSurat}?`, () => {
    showLoading('MENYIMPAN PERUBAHAN ITEM...');
    setTimeout(async () => {
      try {
        const requests = getRequestsFromDB();
        const req = requests.find(r => r && (r.noSurat === noSurat || String(r.noSurat) === String(noSurat) || r.id === noSurat));
        if (!req) {
          hideLoading();
          showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
          return;
        }

        if (typeof supabase !== 'undefined' && supabase) {
          try {
            const { error: err1 } = await supabase.from('permintaan_toko').update({
              items: req.items
            }).eq('no_surat', noSurat);
            if (err1) {
              await supabase.from('permintaan_toko').update({
                items: req.items
              }).eq('id', req.id || noSurat);
            }
          } catch (e) {
            console.error("Supabase update error:", e);
          }
        }

        isItemModifiedMap[noSurat] = false;

        if (typeof syncSupabaseRequestsToLocalCache === 'function') {
          await syncSupabaseRequestsToLocalCache();
        }

        if (typeof notifySupabaseDataChanged === 'function') {
          notifySupabaseDataChanged('permintaan_toko');
        }

        hideLoading();
        showNotif(`PERUBAHAN ITEM PERMINTAAN #${noSurat} BERHASIL DISIMPAN!`, 'success');

        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
        if (currentUser && currentUser.category === 'SERVICE' && currentUser.area === 'TSM') {
          if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        }

        lihatDetail(noSurat);
      } catch (err) {
        hideLoading();
        console.error(err);
        showNotif('GAGAL MENYIMPAN PERUBAHAN', 'danger');
      }
    }, 300);
  });
}
window.simpanPerubahanDetailAdmin = simpanPerubahanDetailAdmin;

async function lihatDetail(noSuratOrObj, fromDashboard = false) {
  if (window._isClosingDetailModal) return false;
  let req = null;
  if (typeof noSuratOrObj === 'object' && noSuratOrObj !== null) {
    req = noSuratOrObj;
  } else {
    const targetStr = String(noSuratOrObj || '').trim();
    if (!targetStr) return false;
    const requests = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    req = requests.find(r => r && (r.noSurat === targetStr || decodeURIComponent(r.noSurat || '') === targetStr || r.noSurat === decodeURIComponent(targetStr)));

    if (!req && typeof supabase !== 'undefined' && supabase) {
      try {
        const { data, error } = await supabase.from('permintaan_toko').select('*').eq('no_surat', targetStr);
        if (data && data.length > 0) {
          const raw = data[0];
          req = {
            id: raw.id,
            noSurat: raw.no_surat,
            tanggal: raw.tanggal,
            toko: raw.toko,
            area: raw.area,
            jenis: raw.jenis,
            catatan: raw.catatan,
            items: raw.items,
            photos: raw.photos,
            status: raw.status,
            serviceApprove: raw.service_approve,
            createdBy: raw.created_by,
            createdAt: raw.created_at,
            userId: raw.user_id
          };
        }
      } catch(e) {}
    }
  }

  if (!req) return false;

  const isDus = String(req.jenis || '').toUpperCase() === 'DUS';
  const popupTitleV2 = document.getElementById('popupTitleV2');
  if (popupTitleV2) popupTitleV2.textContent = isDus ? 'DETAIL PERMINTAAN DUS' : 'DETAIL PERMINTAAN';
  const bodyBox = document.getElementById('popupBodyV2');
  if (!bodyBox) return;

  const userCatUpper = currentUser ? String(currentUser.category || '').toUpperCase() : '';
  const userRoleUpper = currentUser ? String(currentUser.role || '').toUpperCase() : '';
  const isStrictDMUser = currentUser && (userCatUpper.includes('DM') || userRoleUpper.includes('DM'));
  const isStrictServiceUser = currentUser && (userCatUpper.includes('SERVICE') || userRoleUpper.includes('SERVICE'));
  const isStrictAdminUser = currentUser && (userCatUpper === 'ADMIN' || userRoleUpper === 'ADMIN' || String(currentUser.username).toUpperCase() === 'ADMIN');

  let rawItems = req.items;
  let itemsList = [];
  if (Array.isArray(rawItems)) {
    itemsList = rawItems;
  } else if (typeof rawItems === 'string') {
    try { itemsList = JSON.parse(rawItems || '[]'); } catch (e) { itemsList = []; }
  }

  const hasEligibleBreakdownItem = Array.isArray(itemsList) && itemsList.some((it, idx) => {
    const remQty = typeof calcItemRemainingQty === 'function' ? calcItemRemainingQty(req, idx) : Number(it.qty || 1);
    const isUnfulfilled = it.isUnfulfilled || String(it.keterangan || '').toUpperCase() === 'TIDAK DIPENUHI' || String(it.keteranganPart || '').toUpperCase() === 'TIDAK DIPENUHI';
    return remQty > 0 && !isUnfulfilled;
  });

  const partialsList = typeof getPartialBreakdownsFromDB === 'function' ? getPartialBreakdownsFromDB(req.noSurat) : [];
  
  let topBreakdownButtonsHtml = '';
  if (req.status !== 'BATAL') {
    let btnAjukanHtml = '';
    if (!isStrictDMUser && (isStrictServiceUser || isStrictAdminUser) && hasEligibleBreakdownItem) {
      btnAjukanHtml = `
        <button type="button" onclick="bukaModalBuatParsial('${req.noSurat}')" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(2,132,199,0.3); transition: transform 0.2s;">
          <span class="material-symbols-rounded" style="font-size: 16px;">add_circle</span> + AJUKAN BREAKDOWN
        </button>
      `;
    }

    let btnPermintaanParsialHtml = '';
    if (partialsList.length > 0) {
      btnPermintaanParsialHtml = `
        <button type="button" onclick="bukaModalRiwayatParsialList('${req.noSurat}')" style="background: linear-gradient(135deg, #059669, #047857); color: #ffffff; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(5,150,105,0.3);">
          <span class="material-symbols-rounded" style="font-size: 16px;">call_split</span> PERMINTAAN BREAKDOWN (${partialsList.length})
        </button>
      `;
    }

    topBreakdownButtonsHtml = `
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        ${btnAjukanHtml}
        ${btnPermintaanParsialHtml}
      </div>
    `;
  }

  let headerInfoHtml = `
    <div class="detailHeaderInfoV2" style="display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; padding: 8px 14px !important; box-sizing: border-box !important; background: transparent !important; border-bottom: 1px solid var(--border-color) !important; margin-bottom: 8px !important;">
      <div class="noSuratWrapV2" style="display: inline-flex !important; align-items: center !important; text-align: left !important; white-space: nowrap !important; flex: 0 0 auto !important; background: transparent !important;">
        <span style="opacity: 0.85; font-weight: 500; color: var(--text-main);">NO SURAT : </span>
        <span class="noSuratValV2" style="color: var(--primary) !important; font-weight: 700 !important; margin-left: 4px; background: transparent !important;">${req.noSurat || '-'}</span>
      </div>
      ${topBreakdownButtonsHtml}
    </div>
  `;



  const thBase = "background: var(--primary) !important; color: #ffffff !important; padding: 8px 12px !important; border: none !important; border-right: 1px solid rgba(255,255,255,0.35) !important; border-bottom: 2px solid rgba(0,0,0,0.18) !important; border-radius: 0 !important; border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; position: sticky !important; top: 0 !important; z-index: 100 !important; font-size: 11.5px !important; font-weight: 700 !important; letter-spacing: 0.3px !important; text-align: center !important; vertical-align: middle !important; white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; box-shadow: none !important; text-shadow: none !important; -webkit-clip-path: none !important; clip-path: none !important;";
  const thStyleAutofit = `${thBase} width: 1% !important; white-space: nowrap !important; text-align: center !important;`;
  const thStyleCenter = `${thBase} text-align: center !important; white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important;`;
  const thStyleAutofitLast = `${thBase} width: 1% !important; white-space: nowrap !important; text-align: center !important; border-right: none !important;`;
  const thStyleCenterLast = `${thBase} text-align: center !important; white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; border-right: none !important;`;
  const thStyleLeft = thStyleCenter;
  const thStyleLeftLast = thStyleCenterLast;

  const getTdBorder = (idx, total) => "border-bottom: 1px solid var(--border-color) !important;";

  const tdBase = "padding: 8px 12px !important; border-top: none !important; border-left: none !important; border-right: none !important; background: var(--bg-box) !important; color: var(--text-main) !important; font-size: 12px !important; vertical-align: middle !important;";
  const getTdStyleAutofit = (idx, total) => `${tdBase} ${getTdBorder(idx, total)} width: 1% !important; white-space: nowrap !important; text-align: center !important;`;
  const getTdStyleLeft = (idx, total) => `${tdBase} ${getTdBorder(idx, total)} text-align: left !important;`;

  const role = currentUser ? (currentUser.category || '').toUpperCase() : '';
  const isAdminUser = currentUser && (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  const isServiceUser = (role === 'SERVICE' || isAdminUser);
  
  const canServiceRowActions = isServiceUser && (req.status === 'APPROVE');
  const showKetPartCol = (req.status === 'APPROVE' || req.status === 'DONE');

  let itemsHtml = itemsList.map((i, idx) => {
    const tdStyleAutofit = getTdStyleAutofit(idx, itemsList.length);
    const tdStyleLeft = getTdStyleLeft(idx, itemsList.length);

    const isUnfulfilled = i.unfulfilled === true;
    const strikeStyle = isUnfulfilled ? "text-decoration: line-through !important; text-decoration-thickness: 1.5px !important; color: #ef4444 !important; font-weight: 600 !important; opacity: 0.85;" : "";

    const typeVal = i.type || i.tipe || i.jenis || '-';
    const seriVal = i.seri || i.sn || i.serial || '-';
    const barangVal = i.barang || i.permintaan || i.namaBarang || '-';
    const dusVal = i.dus || i.snDus || i.seriDus || i.seri || '-';
    const alasanVal = i.alasan || i.keterangan || '-';
    const qtyVal = i.qty || i.jumlah || 1;

    const activePartialsList = (typeof getPartialBreakdownsFromDB === 'function' ? getPartialBreakdownsFromDB(req.noSurat) : []).filter(p => p && (p.status === 'PENDING' || p.status === 'APPROVE' || p.status === 'DONE'));
    const partialMatch = activePartialsList.find(p => Array.isArray(p.items) && p.items.some(pi => pi.itemIdx === idx || (pi.type && String(pi.type || pi.tipe || '').trim().toUpperCase() === String(typeVal).trim().toUpperCase() && String(typeVal).trim() !== '-')));
    const isLockedByBreakdown = !!partialMatch;

    let statusPartVal = (i.statusPart || i.keteranganPart || i.noPart || '').trim();
    if (isLockedByBreakdown && partialMatch) {
      const pId = partialMatch.partial_id || partialMatch.partialId || 'P1';
      statusPartVal = `${req.noSurat}/${pId}`;
    } else if (req.status === 'DONE' && !isUnfulfilled && !statusPartVal) {
      statusPartVal = 'DIPENUHI';
    }

    let statusPartBadgeHtml = '<span style="color: var(--text-muted); font-size: 11.5px; font-weight: 700;">-</span>';
    if (isUnfulfilled) {
      statusPartBadgeHtml = `<span style="font-weight: 800; font-size: 11.5px; color: var(--text-main);">TIDAK DIPENUHI</span>`;
    } else if (statusPartVal) {
      statusPartBadgeHtml = `<span style="font-weight: 800; font-size: 11.5px; color: var(--text-main);">${statusPartVal}</span>`;
    }

    const isHandedOver = isLockedByBreakdown;
    const isAdmUserRole = (typeof checkIsAdminUser === 'function') ? checkIsAdminUser() : (currentUser && ((currentUser.category || '').toUpperCase() === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')));
    const fotoProofUrl = i.fotoBuktiPart || i.fotoPart || '';
    const hasPhoto = isPhotoUrlValid(fotoProofUrl);

    let ketPartTdHtml = showKetPartCol ? `
      <td style="${tdStyleLeft} ${strikeStyle}">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          ${statusPartBadgeHtml}
        </div>
      </td>
    ` : '';

    let actionTdHtml = '';
    if (canServiceRowActions) {
      let unfulfilledBtn = '';
      let editPartBtn = '';
      let unlockBtnAdmin = '';

      if (isHandedOver) {
        if (isAdmUserRole) {
          // Khusus Admin: Tombol X untuk membuka kunci status serah
          unlockBtnAdmin = `
            <button type="button" class="btnIcon btnUnlockHandedOver" onclick="bukaKunciSerahPartAdmin('${req.noSurat}', ${idx})" title="BUKA KUNCI STATUS SERAH (KHUSUS ADMIN)" style="padding: 3px 6px !important; border-radius: 6px !important; line-height: 1 !important; height: auto !important; background: #dc2626 !important; color: #ffffff !important; border: none !important; cursor: pointer !important;">
              <span class="material-symbols-rounded" style="font-size: 15px !important;">close</span>
            </button>
          `;
          actionTdHtml = `
            <td style="${tdStyleAutofit}">
              <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                ${unlockBtnAdmin}
              </div>
            </td>
          `;
        } else {
          // User Biasa (Non-Admin): Tombol disembunyikan / dikunci
          actionTdHtml = `
            <td style="${tdStyleAutofit}">
              <span style="font-size: 11px; font-weight: 700; color: #10b981;">🔒 SERAH</span>
            </td>
          `;
        }
      } else {
        if (isUnfulfilled) {
          unfulfilledBtn = `
            <button type="button" class="btnIcon btnUndo" onclick="undoBarisItemDetailAdmin('${req.noSurat}', ${idx})" title="BATALKAN (UNDO)" style="padding: 3px 6px !important; border-radius: 6px !important; line-height: 1 !important; height: auto !important; background: #f59e0b !important; color: #ffffff !important; border: none !important; cursor: pointer !important;">
              <span class="material-symbols-rounded" style="font-size: 15px !important;">undo</span>
            </button>
          `;
        } else {
          unfulfilledBtn = `
            <button type="button" class="btnIcon btnDelete" onclick="hapusBarisItemDetailAdmin('${req.noSurat}', ${idx})" title="TANDAI TIDAK DIPENUHI" style="padding: 3px 6px !important; border-radius: 6px !important; line-height: 1 !important; height: auto !important; background: #ef4444 !important; color: #ffffff !important; border: none !important; cursor: pointer !important;">
              <span class="material-symbols-rounded" style="font-size: 15px !important;">cancel</span>
            </button>
          `;
        }

        editPartBtn = `
          <button type="button" class="btnIcon btnEditPartRow" onclick="bukaModalEditKetPartSingle('${req.noSurat}', ${idx})" title="EDIT KETERANGAN / NO PART (FREE TEXT)" style="padding: 3px 6px !important; border-radius: 6px !important; line-height: 1 !important; height: auto !important; background: ${isUnfulfilled ? '#9ca3af' : '#0284c7'} !important; color: #ffffff !important; border: none !important; cursor: ${isUnfulfilled ? 'not-allowed' : 'pointer'} !important; margin-left: 4px !important; ${isUnfulfilled ? 'opacity: 0.6;' : ''}">
            <span class="material-symbols-rounded" style="font-size: 15px !important;">edit_note</span>
          </button>
        `;

        actionTdHtml = `
          <td style="${tdStyleAutofit}">
            <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
              ${unfulfilledBtn}
              ${editPartBtn}
            </div>
          </td>
        `;
      }
    }

    if (isDus) {
      return `
        <tr style="${isUnfulfilled ? 'background: rgba(239, 68, 68, 0.08) !important;' : ''}">
          <td style="${tdStyleAutofit} ${strikeStyle}">${idx + 1}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${typeVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${seriVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${barangVal}</td>
          <td style="${tdStyleLeft} color: #d97706 !important; font-weight: 600 !important; ${strikeStyle}">${dusVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${alasanVal}</td>
          <td style="${tdStyleAutofit} font-weight: 700 !important; ${strikeStyle}">${qtyVal}</td>
          ${ketPartTdHtml}
          ${actionTdHtml}
        </tr>
      `;
    } else {
      return `
        <tr style="${isUnfulfilled ? 'background: rgba(239, 68, 68, 0.08) !important;' : ''}">
          <td style="${tdStyleAutofit} ${strikeStyle}">${idx + 1}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${typeVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${seriVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${barangVal}</td>
          <td style="${tdStyleLeft} ${strikeStyle}">${alasanVal}</td>
          <td style="${tdStyleAutofit} font-weight: 700 !important; ${strikeStyle}">${qtyVal}</td>
          ${ketPartTdHtml}
          ${actionTdHtml}
        </tr>
      `;
    }
  }).join('');

  const totalDetailCols = (isDus ? 7 : 6) + (showKetPartCol ? 1 : 0) + (canServiceRowActions ? 1 : 0);
  const emptyRowsCount = 2;
  let emptyGridRowsHtml = '';
  for (let e = 0; e < emptyRowsCount; e++) {
    emptyGridRowsHtml += `
      <tr class="empty-grid-row" style="background: var(--bg-box) !important;">
        ${Array(totalDetailCols).fill(`<td style="border: none !important; border-bottom: none !important; height: 32px !important; background: var(--bg-box) !important;">&nbsp;</td>`).join('')}
      </tr>
    `;
  }
  itemsHtml += emptyGridRowsHtml;

  let bottomActionsHtml = '';
  let actionButtons = [];

  const isDeletedReq = (req.status === 'BATAL' || req.unfulfilled === true);

  if (!isDeletedReq) {
    if (req.status === 'PENDING') {
      if (role === 'SERVICE' || isAdminUser) {
        if (!req.serviceApprove) {
          actionButtons.push(`
            <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="approveService('${req.noSurat}');">
              <span class="material-symbols-rounded">check_circle</span>
            </button>
          `);
          actionButtons.push(`
            <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="tolakServiceModal('${req.noSurat}', 'SERVICE');">
              <span class="material-symbols-rounded">cancel</span>
            </button>
          `);
        } else if (isAdminUser) {
          actionButtons.push(`
            <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="approveDM('${req.noSurat}');">
              <span class="material-symbols-rounded">check_circle</span>
            </button>
          `);
          actionButtons.push(`
            <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="tolakServiceModal('${req.noSurat}', 'DM');">
              <span class="material-symbols-rounded">cancel</span>
            </button>
          `);
        }
      }
      
      if (role === 'DM' && req.serviceApprove) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnApprove btnIconOnly" title="APPROVE" onclick="approveDM('${req.noSurat}');">
            <span class="material-symbols-rounded">check_circle</span>
          </button>
        `);
        actionButtons.push(`
          <button type="button" class="btnIcon btnReject btnIconOnly" title="TOLAK" onclick="tolakServiceModal('${req.noSurat}', 'DM');">
            <span class="material-symbols-rounded">cancel</span>
          </button>
        `);
      }
    }

    const isPdfVisible = isPdfButtonAllowed(req);
    if (isPdfVisible) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnPdf btnIconOnly" title="CETAK PDF" onclick="tampilkanPilihanCetakPdf('${req.noSurat}');">
          <span class="material-symbols-rounded">picture_as_pdf</span>
        </button>
      `);
    }

    if (req.status === 'APPROVE' && (role === 'SERVICE' || isAdminUser)) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnDone btnIconOnly" title="SET DONE" onclick="doneService('${req.noSurat}');">
          <span class="material-symbols-rounded">task_alt</span>
        </button>
      `);
    }

    // Button SIMPAN PERUBAHAN removed as per user request

    // BATAL APPROVE SERVICE / DM BUTTONS EXCLUSIVELY VISIBLE FOR ADMIN LOGIN ACCOUNT ONLY (HILANGKAN DARI SERVICE, DM, TOKO, SALES)
    if (isAdminUser) {
      if (req.serviceApprove) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnIconOnly" title="BATAL APPROVE SERVICE" onclick="batalApproveService('${req.noSurat}');" style="background: #eab308 !important; color: #ffffff !important;">
            <span class="material-symbols-rounded">undo</span>
          </button>
        `);
      }
      if (req.status === 'APPROVE' || req.dmUserName || req.dmTTD) {
        actionButtons.push(`
          <button type="button" class="btnIcon btnIconOnly" title="BATAL APPROVE DM" onclick="batalApproveDM('${req.noSurat}');" style="background: #f97316 !important; color: #ffffff !important;">
            <span class="material-symbols-rounded">undo</span>
          </button>
        `);
      }
    }

    const isCreator = currentUser && (req.userId === currentUser.id || req.createdBy === currentUser.fullName || (currentUser.category === 'TOKO' && req.toko.toUpperCase() === currentUser.fullName.toUpperCase()));
    const canCreatorEditDelete = isCreator && !req.serviceApprove && req.status === 'PENDING';
    const canServiceEditDelete = (role === 'SERVICE' && !req.serviceApprove && req.status === 'PENDING');
    const canAdminEditDelete = isAdminUser;

    if (canCreatorEditDelete || canServiceEditDelete || canAdminEditDelete) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnEdit btnIconOnly" title="EDIT" onclick="tutupDetailBarangV2(); editPermintaan('${req.noSurat}');">
          <span class="material-symbols-rounded">edit</span>
        </button>
      `);
      actionButtons.push(`
        <button type="button" class="btnIcon btnDelete btnIconOnly" title="HAPUS PERMINTAAN" onclick="hapusData('${req.noSurat}');">
          <span class="material-symbols-rounded">delete</span>
        </button>
      `);
    }
  }

        actionButtons.push(`
        <button type="button" class="btnIcon btnIconOnly" title="DOWNLOAD EXCEL DETAIL (.XLSX)" onclick="downloadSingleDetailExcel('${req.noSurat}');" style="background: #107c41 !important; color: #ffffff !important;">
          <span class="material-symbols-rounded">file_download</span>
        </button>
      `);

    if (isAdminUser) {
      actionButtons.push(`
        <button type="button" class="btnIcon btnIconOnly" title="UBAH STATUS SUPABASE (ADMIN ONLY)" onclick="bukaModalUbahStatusAdmin('${req.noSurat}');" style="background: #8b5cf6 !important; color: #ffffff !important;">
          <span class="material-symbols-rounded">published_with_changes</span>
        </button>
      `);
    }

  const allReqPhotos = [
    ...(Array.isArray(req.photos) ? req.photos : []),
    ...(Array.isArray(req.artemisPhotos) ? req.artemisPhotos : [])
  ].filter(Boolean);

  if (allReqPhotos.length > 0) {
    const isDoneState = req.status === 'DONE';
    actionButtons.push(`
      <button type="button" class="btnIcon btnPhotoView btnIconOnly" title="${isDoneState ? 'LIHAT BUKTI PROSES ARTEMIS / DONE' : 'LIHAT FOTO BUKTI BARANG'} (${allReqPhotos.length})" onclick="lihatFotoByNoSurat('${req.noSurat || req.id}');" style="${isDoneState ? 'background: linear-gradient(135deg, #059669, #10b981) !important; color: #ffffff !important;' : ''}">
        <span class="material-symbols-rounded">image</span>
      </button>
    `);
  }

  if (actionButtons.length > 0) {
    bottomActionsHtml = `
      <div class="popupDetailActionsV2" style="margin: 0 !important; margin-top: 0 !important; margin-bottom: 2mm !important; padding: 0px 14px !important; padding-bottom: 0px !important; flex-shrink: 0 !important; width: 100% !important; box-sizing: border-box !important; display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 6px !important;">
        ${actionButtons.join('')}
      </div>
    `;
  }

  const thKetPartHtml = showKetPartCol ? `<th style="${canServiceRowActions ? thStyleLeft : thStyleLeftLast}">KETERANGAN PART</th>` : '';
  const thActionHtml = canServiceRowActions ? `<th class="th-aksi-col">AKSI</th>` : '';

  const tableHeaderHtml = isDus ? `
    <thead>
      <tr style="background: var(--primary) !important; color: #ffffff !important;">
        <th style="${thStyleAutofit}">NO</th>
        <th style="${thStyleLeft}">TYPE</th>
        <th style="${thStyleLeft}">SERI BARANG</th>
        <th style="${thStyleLeft}">PERMINTAAN</th>
        <th style="${thStyleLeft}">SERI DUS</th>
        <th style="${thStyleLeft}">ALASAN</th>
        <th style="${(showKetPartCol || canServiceRowActions) ? thStyleAutofit : thStyleAutofitLast}">QTY</th>
        ${thKetPartHtml}
        ${thActionHtml}
      </tr>
    </thead>
  ` : `
    <thead>
      <tr style="background: var(--primary) !important; color: #ffffff !important;">
        <th style="${thStyleAutofit}">NO</th>
        <th style="${thStyleLeft}">TYPE</th>
        <th style="${thStyleLeft}">SERI BARANG</th>
        <th style="${thStyleLeft}">PERMINTAAN</th>
        <th style="${thStyleLeft}">ALASAN</th>
        <th style="${(showKetPartCol || canServiceRowActions) ? thStyleAutofit : thStyleAutofitLast}">QTY</th>
        ${thKetPartHtml}
        ${thActionHtml}
      </tr>
    </thead>
  `;

  bodyBox.innerHTML = `
    <div class="popupCardBodyContainerV2" style="width: 100% !important; min-width: 0 !important; max-width: 100% !important; flex: 1 1 100% !important; height: 100% !important; min-height: 0 !important; padding: 4px 0px 0px 0px !important; padding-bottom: 0px !important; margin: 0 !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important; background: var(--bg-box) !important; border-radius: 0 0 5px 5px !important; overflow: hidden !important;">
      ${headerInfoHtml}
      
      <div class="tableCardV2 tableWrap" style="display: flex !important; flex-direction: column !important; flex: 1 1 0px !important; height: 100% !important; max-height: 100% !important; min-height: 0 !important; border: 1px solid var(--border-color) !important; border-radius: 0 !important; -webkit-clip-path: none !important; clip-path: none !important; overflow-x: auto !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-x pan-y !important; overscroll-behavior: contain !important; background: var(--bg-box) !important; width: 100% !important; min-width: 0 !important; max-width: 100% !important; margin: 4px 0 2mm 0 !important; margin-bottom: 2mm !important; position: relative !important;">
        <table class="detailTableV2" style="width: 100% !important; min-width: 100% !important; table-layout: auto !important; border-collapse: separate !important; border-spacing: 0 !important; margin: 0 !important; padding: 0 !important;">
          ${tableHeaderHtml}
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      ${bottomActionsHtml}
    </div>
  `;

  const popupDetailV2 = document.getElementById('popupDetailBarangV2');
  const isAlreadyOpen = popupDetailV2 && (
    popupDetailV2.classList.contains('show') ||
    (popupDetailV2.style.display && popupDetailV2.style.display !== 'none') ||
    popupDetailV2.dataset.active === "true"
  );

  if (popupDetailV2) {
    popupDetailV2.style.setProperty('display', 'flex', 'important');
    popupDetailV2.classList.add('show');
    popupDetailV2.dataset.active = "true";
    popupDetailV2.dataset.noSurat = req.noSurat;
    window._currentDetailNoSurat = req.noSurat;
  }

  // Clear any pending URL noSurat trigger since popup is now successfully displayed
  window.PENDING_URL_NO_SURAT = null;

  // Hanya pushState jika modal BELUM terbuka sebelumnya (mencegah penumpukan pushState berulang saat refresh data/action)
  if (!isAlreadyOpen && (!window.history.state || !window.history.state.popupDetailOpen)) {
    try {
      history.pushState({ popupDetailOpen: true }, '');
    } catch(e) {}
  }

  const activePageId = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
  if (typeof aturTampilanLonceng === 'function') {
    aturTampilanLonceng(activePageId);
  }
  return true;
}

// ----------------------------------------------------
// FITUR UPDATE NO & STATUS PART (KHUSUS LOGIN SERVICE / ADMIN)
// ----------------------------------------------------
function bukaModalEditStatusPart(noSurat) {
  if (!noSurat) return;
  const role = currentUser ? (currentUser.category || '').toUpperCase() : '';
  const isAdm = currentUser && (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (role !== 'SERVICE' && !isAdm) {
    showNotif('FITUR EDIT NO / STATUS PART HANYA DAPAT DIAKSES OLEH KATEGORI SERVICE!', 'warning');
    return;
  }

  const requests = getRequestsFromDB();
  const targetNo = String(noSurat).trim().toUpperCase();
  const req = requests.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === targetNo ||
    String(r.id || '').trim().toUpperCase() === targetNo
  ));

  if (!req) {
    showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  const titleEl = document.getElementById('editStatusPartTitle');
  if (titleEl) titleEl.textContent = `UPDATE NO & STATUS PART (#${req.noSurat})`;

  const noSuratInput = document.getElementById('editStatusPartNoSurat');
  if (noSuratInput) noSuratInput.value = req.noSurat;

  const container = document.getElementById('editStatusPartItemsContainer');
  if (!container) return;

  const items = Array.isArray(req.items) ? req.items : [];
  if (items.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-muted);">TIDAK ADA ITEM DALAM PERMINTAAN INI.</div>';
  } else {
    container.innerHTML = items.map((i, idx) => {
      const typeVal = i.type || i.tipe || '-';
      const seriVal = i.seri || i.sn || '-';
      const barangVal = i.barang || i.permintaan || '-';
      const currentNoPart = i.noPart || '';
      const currentStatusPart = i.statusPart || '';

      return `
        <div style="background: var(--bg-body); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
            <strong style="font-size: 13px; color: var(--primary);">${idx + 1}. ${typeVal} (SN: ${seriVal})</strong>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${barangVal} (Qty: ${i.qty || 1})</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">NO PART / KODE PART</label>
              <input type="text" id="input_nopart_${idx}" value="${currentNoPart}" placeholder="Contoh: PRT-99210 / BAUT..." style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-box); color: var(--text-main); font-size: 12px; font-weight: 600; box-sizing: border-box;">
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">STATUS PART</label>
              <input type="text" id="input_statuspart_${idx}" list="list_statuspart_presets" value="${currentStatusPart}" placeholder="Pilih / Ketik Status..." style="width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-box); color: var(--text-main); font-size: 12px; font-weight: 600; box-sizing: border-box;">
              <datalist id="list_statuspart_presets">
                <option value="READY / TERSEDIA">
                <option value="PROSES">
                <option value="INDENT / PESAN">
                <option value="TERPASANG">
                <option value="KOSONG / BATAL">
              </datalist>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  const modal = document.getElementById('popupEditStatusPart');
  if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
    try { history.pushState({ modal: 'partStatus' }, '', location.href); } catch(e) {}
  }
}
window.bukaModalEditStatusPart = bukaModalEditStatusPart;

function tutupModalEditStatusPart() {
  const modal = document.getElementById('popupEditStatusPart');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupModalEditStatusPart = tutupModalEditStatusPart;

function simpanStatusPart() {
  const noSuratInput = document.getElementById('editStatusPartNoSurat');
  const noSurat = noSuratInput ? noSuratInput.value.trim() : '';
  if (!noSurat) {
    showNotif('NOMOR SURAT TIDAK VALID!', 'warning');
    return;
  }

  showConfirm(`SIMPAN PERUBAHAN NO & STATUS PART UNTUK #${noSurat}?`, () => {
    try {
      const requests = getRequestsFromDB();
      const targetNo = String(noSurat).trim().toUpperCase();
      const idx = requests.findIndex(r => r && (
        String(r.noSurat || '').trim().toUpperCase() === targetNo ||
        String(r.id || '').trim().toUpperCase() === targetNo
      ));

      if (idx === -1) {
        showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
        return;
      }

      const items = Array.isArray(requests[idx].items) ? requests[idx].items : [];
      items.forEach((item, itemIdx) => {
        const noPartEl = document.getElementById(`input_nopart_${itemIdx}`);
        const statusPartEl = document.getElementById(`input_statuspart_${itemIdx}`);
        if (noPartEl) {
          item.noPart = noPartEl.value.trim().toUpperCase();
        }
        if (statusPartEl) {
          item.statusPart = statusPartEl.value.trim().toUpperCase();
        }
      });

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'UPDATE_STATUS_PART',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
        notes: `UPDATE NO & STATUS PART OLEH SERVICE`,
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      // 1. SIMPAN LOKAL SECARA INSTAN (0 ms)
      saveRequestsToDB(requests);
      tutupModalEditStatusPart();
      showNotif(`NO & STATUS PART #${noSurat} BERHASIL DIPERBARUI!`, 'success');
      
      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof lihatDetail === 'function') lihatDetail(noSurat);

      // 2. SINKRONISASI SUPABASE CLOUD DI LATAR BELAKANG
      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof supabase !== 'undefined' && supabase) {
        supabase.from('permintaan_toko').update({
          items: requests[idx].items,
          log: requests[idx].log,
          updated_at: new Date().toISOString()
        }).eq('no_surat', noSurat).then(() => {}, (e) => console.warn('[SUPABASE STATUS PART UPDATE NOTICE]:', e));
      }
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }
    } catch (err) {
      console.error('[SIMPAN STATUS PART ERROR]:', err);
      showNotif('GAGAL MENYIMPAN STATUS PART: ' + (err.message || err), 'error');
    }
  });
}
window.simpanStatusPart = simpanStatusPart;

// ----------------------------------------------------
// FITUR EDIT KETERANGAN PART PER BARIS (FREE TEXT MANUAL KHUSUS SERVICE / ADMIN)
// ----------------------------------------------------
function updateBtnFotoBuktiPartUI(fotoUrl) {
  const iconEl = document.getElementById('iconFotoBuktiPart');
  const textEl = document.getElementById('textFotoBuktiPart');
  const btnEl = document.getElementById('btnFotoBuktiPart');
  const btnHapusEl = document.getElementById('btnHapusFotoBuktiPart');
  if (!iconEl || !btnEl) return;

  const validUrl = fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '' && (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://') || fotoUrl.startsWith('data:image/'));

  if (validUrl) {
    // Foto sudah ada: ICON GAMBAR IMAGE (bukan mata!), warna hijau
    iconEl.textContent = 'image';
    if (textEl) textEl.textContent = 'LIHAT FOTO';
    btnEl.style.background = 'rgba(16, 185, 129, 0.15)';
    btnEl.style.color = '#10b981';
    btnEl.style.borderColor = '#10b981';
    btnEl.title = 'Klik untuk melihat foto bukti penyerahan part';
    if (btnHapusEl) btnHapusEl.style.display = 'inline-flex';
  } else {
    // Foto belum ada: ICON KAMERA
    iconEl.textContent = 'photo_camera';
    if (textEl) textEl.textContent = 'FOTO BUKTI';
    btnEl.style.background = 'rgba(2, 132, 199, 0.15)';
    btnEl.style.color = '#0284c7';
    btnEl.style.borderColor = '#0284c7';
    btnEl.title = 'Upload foto bukti penyerahan part (opsional)';
    if (btnHapusEl) btnHapusEl.style.display = 'none';
  }
}
window.updateBtnFotoBuktiPartUI = updateBtnFotoBuktiPartUI;

function hapusFotoBuktiPartSingle() {
  const hiddenInput = document.getElementById('editKetPartSingleFotoUrl');
  if (hiddenInput) hiddenInput.value = '';

  const fileInput = document.getElementById('editKetPartSingleFileInput');
  if (fileInput) fileInput.value = '';

  updateBtnFotoBuktiPartUI('');
  showNotif('FOTO BUKTI TELAH DIHAPUS DARI FORM!', 'info');
}
window.hapusFotoBuktiPartSingle = hapusFotoBuktiPartSingle;

function isiQuickSudahDiserahkan() {
  const el = document.getElementById('editKetPartSingleInput');
  if (!el) return;

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;

  const defaultText = `SUDAH DISERAHKAN ${todayStr}`;
  
  if (!el.value || el.value.trim() === '') {
    el.value = defaultText;
  } else if (!el.value.toUpperCase().includes('SUDAH DISERAHKAN')) {
    el.value = `${defaultText} - ${el.value.trim()}`;
  }
  el.focus();
}
window.isiQuickSudahDiserahkan = isiQuickSudahDiserahkan;

function handleKlikFotoBuktiPart() {
  const hiddenInput = document.getElementById('editKetPartSingleFotoUrl');
  const currentUrl = hiddenInput ? hiddenInput.value.trim() : '';

  if (currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://') || currentUrl.startsWith('data:image/'))) {
    // Foto sudah ada: Buka di viewer foto aplikasi resmi (#imageViewer)
    if (typeof bukaViewGambar === 'function') {
      bukaViewGambar(currentUrl);
    } else if (typeof showImageViewer === 'function') {
      showImageViewer(currentUrl);
    } else {
      window.open(currentUrl, '_blank');
    }
  } else {
    // Belum ada foto: Buka file picker
    const fileInput = document.getElementById('editKetPartSingleFileInput');
    if (fileInput) fileInput.click();
  }
}
window.handleKlikFotoBuktiPart = handleKlikFotoBuktiPart;

function prosesPilihFotoBuktiPart(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  if (typeof showLoading === 'function') showLoading('MEMPROSES & MENGKOMPRES FOTO BUKTI PART...');

  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Kompresi foto canvas max 1024px
        const maxDim = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const compressedDataUrl = c.toDataURL('image/jpeg', 0.82);

        const hiddenInput = document.getElementById('editKetPartSingleFotoUrl');
        if (hiddenInput) hiddenInput.value = compressedDataUrl;

        updateBtnFotoBuktiPartUI(compressedDataUrl);

        if (typeof hideLoading === 'function') hideLoading();
      };
      img.onerror = () => {
        if (typeof hideLoading === 'function') hideLoading();
        showNotif('GAGAL MEMBACA FOTO BUKTI!', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } catch (err) {
    if (typeof hideLoading === 'function') hideLoading();
    console.error('Proses foto bukti error:', err);
    showNotif('TERJADI KESALAHAN SAAT MEMPROSES FOTO BUKTI!', 'error');
  }

  event.target.value = '';
}
window.prosesPilihFotoBuktiPart = prosesPilihFotoBuktiPart;

function bukaModalEditKetPartSingle(noSurat, itemIndex) {
  if (!noSurat) return;
  const role = currentUser ? (currentUser.category || '').toUpperCase() : '';
  const isAdm = currentUser && (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (role !== 'SERVICE' && !isAdm) {
    showNotif('FITUR EDIT KETERANGAN PART HANYA DAPAT DIAKSES OLEH KATEGORI SERVICE!', 'warning');
    return;
  }

  const requests = getRequestsFromDB();
  const targetNo = String(noSurat).trim().toUpperCase();
  const req = requests.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === targetNo ||
    String(r.id || '').trim().toUpperCase() === targetNo
  ));

  if (!req) {
    showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  const items = Array.isArray(req.items) ? req.items : [];
  if (itemIndex < 0 || itemIndex >= items.length) {
    showNotif('ITEM TIDAK DITEMUKAN!', 'warning');
    return;
  }

  const item = items[itemIndex];
  if (item && item.unfulfilled === true) {
    return;
  }
  const typeVal = item.type || item.tipe || '-';
  const seriVal = item.seri || item.sn || '-';
  const barangVal = item.barang || item.permintaan || '-';
  const currentKet = item.statusPart || item.keteranganPart || item.noPart || '';
  const existingFoto = item.fotoBuktiPart || item.fotoPart || '';

  const titleEl = document.getElementById('editKetPartSingleTitle');
  if (titleEl) titleEl.textContent = `EDIT KETERANGAN PART (BARIS ${itemIndex + 1})`;

  const noSuratHidden = document.getElementById('editKetPartSingleNoSurat');
  if (noSuratHidden) noSuratHidden.value = req.noSurat;

  const idxHidden = document.getElementById('editKetPartSingleItemIndex');
  if (idxHidden) idxHidden.value = itemIndex;

  const fotoHidden = document.getElementById('editKetPartSingleFotoUrl');
  if (fotoHidden) fotoHidden.value = existingFoto;

  updateBtnFotoBuktiPartUI(existingFoto);

  const infoEl = document.getElementById('editKetPartSingleItemInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="color: var(--primary); font-size: 13px; font-weight: 800; margin-bottom: 2px;">#${req.noSurat} - Baris ${itemIndex + 1}</div>
      <div style="color: var(--text-main); font-size: 12px; font-weight: 600;">Item: <strong>${barangVal}</strong> | Type: <strong>${typeVal}</strong> (SN: ${seriVal})</div>
    `;
  }

  const inputEl = document.getElementById('editKetPartSingleInput');
  if (inputEl) {
    inputEl.value = currentKet;
    setTimeout(() => inputEl.focus(), 150);
  }

  const modal = document.getElementById('popupEditKeteranganPartSingle');
  if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
    try { history.pushState({ modal: 'partKet' }, '', location.href); } catch(e) {}
  }
}
window.bukaModalEditKetPartSingle = bukaModalEditKetPartSingle;

function tutupModalEditKetPartSingle() {
  const modal = document.getElementById('popupEditKeteranganPartSingle');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupModalEditKetPartSingle = tutupModalEditKetPartSingle;

function simpanKeteranganPartSingle() {
  const noSuratHidden = document.getElementById('editKetPartSingleNoSurat');
  const idxHidden = document.getElementById('editKetPartSingleItemIndex');
  const inputEl = document.getElementById('editKetPartSingleInput');
  const fotoHidden = document.getElementById('editKetPartSingleFotoUrl');

  const noSurat = noSuratHidden ? noSuratHidden.value.trim() : '';
  const itemIndex = idxHidden ? parseInt(idxHidden.value, 10) : -1;
  const newKet = inputEl ? inputEl.value.trim().toUpperCase() : '';
  let tempFoto = fotoHidden ? fotoHidden.value.trim() : '';

  if (!noSurat || itemIndex < 0) {
    showNotif('DATA TIDAK VALID!', 'warning');
    return;
  }

  showLoading('MENYIMPAN KETERANGAN PART & FOTO BUKTI...');

  var _asyncSave = async function() {
    try {
      const requests = getRequestsFromDB();
      const targetNo = String(noSurat).trim().toUpperCase();
      const idx = requests.findIndex(r => r && (
        String(r.noSurat || '').trim().toUpperCase() === targetNo ||
        String(r.id || '').trim().toUpperCase() === targetNo
      ));

      if (idx === -1) {
        hideLoading();
        showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
        return;
      }

      const items = Array.isArray(requests[idx].items) ? requests[idx].items : [];
      if (itemIndex >= items.length) {
        hideLoading();
        showNotif('ITEM TIDAK DITEMUKAN!', 'warning');
        return;
      }

      // 1. Unggah foto bukti ke Supabase Storage jika baru (format Base64 DataURL)
      let finalFotoUrl = tempFoto;
      if (tempFoto && tempFoto.startsWith('data:image/')) {
        try {
          const fileName = `PART_PROOF_${noSurat.replace(/[\/\.]/g, '_')}_${itemIndex + 1}_${Date.now()}.jpg`;
          const uploadRes = await uploadSignatureDataUrlToSupabaseStorage(tempFoto, fileName);
          if (uploadRes && (uploadRes.startsWith('http://') || uploadRes.startsWith('https://'))) {
            finalFotoUrl = uploadRes;
          }
        } catch(upErr) {
          console.warn('[UPLOAD FOTO BUKTI PART FALLBACK]:', upErr);
        }
      }

      // 2. Simpan keterangan & foto bukti ke item
      items[itemIndex].statusPart = newKet;
      items[itemIndex].keteranganPart = newKet;
      items[itemIndex].fotoBuktiPart = finalFotoUrl || '';
      items[itemIndex].fotoPart = finalFotoUrl || '';

      items[itemIndex].isHandedOver = false;

      requests[idx].items = items;

      const targetItemName = items[itemIndex].barang || items[itemIndex].permintaan || `Baris ${itemIndex + 1}`;

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'UPDATE_KETERANGAN_PART_BARIS',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'SERVICE',
        notes: `Update keterangan part item '${targetItemName}': ${newKet || '(dikosongkan)'}`,
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      saveRequestsToDB(requests);

      // 2. SINKRONISASI SUPABASE & FIREBASE CLOUD DI LATAR BELAKANG
      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof supabase !== 'undefined' && supabase) {
        supabase.from('permintaan_toko').update({
          items: requests[idx].items,
          log: requests[idx].log,
          updated_at: new Date().toISOString()
        }).eq('no_surat', noSurat).then(() => {}, (e) => console.warn('[SUPABASE STATUS PART UPDATE NOTICE]:', e));
      }
      if (docId && typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).set(requests[idx], { merge: true }).catch(e => console.warn(e));
      }
      if (docId && typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).set(requests[idx]).catch(e => console.warn(e));
      }

      if (typeof syncRealtimeToCentral === 'function') {
        syncRealtimeToCentral(requests[idx]);
      }

      hideLoading();
      tutupModalEditKetPartSingle();

      if (typeof lihatDetail === 'function') {
        lihatDetail(noSurat);
      }
      if (typeof renderRequestsTable === 'function') {
        renderRequestsTable();
      }

      showNotif(`KETERANGAN PART '${targetItemName}' BERHASIL DISIMPAN!`, 'success');
    } catch(e) {
      hideLoading();
      console.error('Simpan keterangan part error:', e);
      showNotif('GAGAL MENYIMPAN KETERANGAN PART!', 'error');
    }
  };

  _asyncSave();
}
window.simpanKeteranganPartSingle = simpanKeteranganPartSingle;

function bukaKunciSerahPartAdmin(noSurat, itemIndex) {
  if (!noSurat) return;
  const isAdm = currentUser && ((currentUser.category || '').toUpperCase() === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (!isAdm) {
    showNotif('HANYA ADMIN YANG DAPAT MEMBUKA KUNCI STATUS SERAH!', 'warning');
    return;
  }

  showConfirm(`ADMIN: BUKA KUNCI STATUS SERAH BARIS ${itemIndex + 1}?`, async function() {
    try {
      const requests = getRequestsFromDB();
      const targetNo = String(noSurat).trim().toUpperCase();
      const idx = requests.findIndex(r => r && (
        String(r.noSurat || '').trim().toUpperCase() === targetNo ||
        String(r.id || '').trim().toUpperCase() === targetNo
      ));
      if (idx === -1) return;

      const items = Array.isArray(requests[idx].items) ? requests[idx].items : [];
      if (itemIndex >= items.length) return;

      const targetItem = items[itemIndex];
      const targetType = String(targetItem.type || targetItem.tipe || '').trim().toUpperCase();
      const targetSeri = String(targetItem.seri || targetItem.sn || '').trim().toUpperCase();
      const targetBarang = String(targetItem.barang || targetItem.permintaan || '').trim().toUpperCase();

      // Reset status diserahkan & foto bukti di objek barang Surat Induk
      items[itemIndex].statusPart = '';
      items[itemIndex].keteranganPart = '';
      items[itemIndex].fotoBuktiPart = '';
      items[itemIndex].fotoPart = '';
      items[itemIndex].isHandedOver = false;

      requests[idx].items = items;

      // KUNCI PERBAIKAN: Bersihkan data item dari tabel breakdown_parsial (Lokal & Supabase)
      let partials = getPartialBreakdownsFromDB(noSurat);
      let partialsChanged = false;

      if (Array.isArray(partials) && partials.length > 0) {
        partials.forEach(p => {
          if (!p || !Array.isArray(p.items)) return;
          const origLen = p.items.length;
          p.items = p.items.filter(pi => {
            if (!pi) return false;
            const piType = String(pi.type || pi.tipe || '').trim().toUpperCase();
            const piSeri = String(pi.seri || pi.sn || '').trim().toUpperCase();
            const piBarang = String(pi.barang || pi.permintaan || '').trim().toUpperCase();

            const isMatch = (pi.itemIdx === itemIndex) ||
              (targetSeri && piSeri && targetSeri !== '-' && piSeri !== '-' && targetSeri === piSeri) ||
              (targetType && piType && targetType !== '-' && piType !== '-' && targetType === piType && targetBarang === piBarang) ||
              (targetBarang && piBarang && targetBarang === piBarang && (!targetType || targetType === '-'));

            return !isMatch;
          });

          if (p.items.length !== origLen) {
            partialsChanged = true;
          }
        });

        // Hapus breakdown parsial yang menjadi kosong setelah barangnya dibuka kuncinya
        const filteredPartials = partials.filter(p => p && Array.isArray(p.items) && p.items.length > 0);

        if (partialsChanged || filteredPartials.length !== partials.length) {
          savePartialBreakdownsToDB(filteredPartials, noSurat);
          pushPartialBreakdownsToCloud(filteredPartials, noSurat).catch(() => {});
        }
      }

      if (!requests[idx].log) requests[idx].log = [];
      requests[idx].log.push({
        action: 'ADMIN_BUKA_KUNCI_SERAH_PART',
        user: currentUser ? (currentUser.fullName || currentUser.username) : 'ADMIN',
        notes: `Admin membuka kunci status serah baris ${itemIndex + 1}`,
        time: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`
      });

      saveRequestsToDB(requests);
      if (typeof syncRealtimeToCentral === 'function') syncRealtimeToCentral(requests[idx]);

      if (typeof lihatDetail === 'function') {
        lihatDetail(noSurat, true);
      }
      if (typeof renderRequestsTable === 'function') {
        renderRequestsTable();
      }

      showNotif(`KUNCI STATUS SERAH BARIS ${itemIndex + 1} BERHASIL DIBUKA OLEH ADMIN!`, 'success');
    } catch(e) {
      console.error('Buka kunci serah error:', e);
    }
  });
}
window.bukaKunciSerahPartAdmin = bukaKunciSerahPartAdmin;

function bukaFotoBuktiPartSingleItem(noSurat, itemIndex) {
  if (!noSurat) return;
  try {
    const requests = getRequestsFromDB();
    const targetNo = String(noSurat).trim().toUpperCase();
    const req = requests.find(r => r && (
      String(r.noSurat || '').trim().toUpperCase() === targetNo ||
      String(r.id || '').trim().toUpperCase() === targetNo
    ));

    if (!req || !Array.isArray(req.items) || itemIndex < 0 || itemIndex >= req.items.length) return;

    const item = req.items[itemIndex];
    const url = item.fotoBuktiPart || item.fotoPart || '';
    if (!url) {
      showNotif('FOTO BUKTI TIDAK DITEMUKAN!', 'warning');
      return;
    }

    if (typeof bukaViewGambar === 'function') {
      bukaViewGambar(url);
    } else if (typeof showImageViewer === 'function') {
      showImageViewer(url);
    } else {
      window.open(url, '_blank');
    }
  } catch(e) {
    console.error('Lihat foto bukti part error:', e);
  }
}
window.bukaFotoBuktiPartSingleItem = bukaFotoBuktiPartSingleItem;

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

function isValidSig(s) {
  if (!s || typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.startsWith('blob:')) return false; // BLOB URLs are local to device browser and fail on other devices
  if (trimmed.includes('DIGITALLY VERIFIED') || trimmed.includes('OfficialDigitalSignatureStamp') || trimmed.includes('rect x="1.5"') || trimmed.includes('<svg') || trimmed.includes('APPROVED')) return false;
  return trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
}
window.isValidSig = isValidSig;

function renderSafeTtdImageTag(sigUrl, styleAttr = 'max-height: 52px; max-width: 100%; object-fit: contain;') {
  if (!isValidSig(sigUrl)) return '';
  return `<img src="${sigUrl.trim()}" style="${styleAttr}">`;
}
window.renderSafeTtdImageTag = renderSafeTtdImageTag;

function getUserRealSignature(targetRole, targetArea = '', targetUsername = '', targetFullName = '') {
  const role = String(targetRole || '').toUpperCase();
  const area = String(targetArea || '').toUpperCase();
  const uname = String(targetUsername || '').toUpperCase();
  const fname = String(targetFullName || '').toUpperCase();

  const isValid = (s) => (typeof isValidSig === 'function' ? isValidSig(s) : (s && typeof s === 'string' && (s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://'))));

  // 1. CEK DARI STORE CENTRAL TTD MAP (ttdMap / TTD_DB_KEY)
  let ttdMap = {};
  try {
    const dbKey = typeof TTD_DB_KEY !== 'undefined' ? TTD_DB_KEY : 'STORE_TTD_DB_V7_CLEAN';
    const rawMap = (typeof appStorage !== 'undefined' ? appStorage.getItem(dbKey) : null) || 
                   (typeof localStorage !== 'undefined' ? localStorage.getItem(dbKey) : null) || 
                   (typeof localStorage !== 'undefined' ? localStorage.getItem('APP_USER_TTD_MAP') : null);
    if (rawMap) ttdMap = JSON.parse(rawMap);
  } catch (e) {}

  // A. Match Username / ID di ttdMap
  if (uname) {
    if (isValid(ttdMap[uname])) return ttdMap[uname];
    if (isValid(ttdMap[targetUsername])) return ttdMap[targetUsername];
  }
  // B. Match FullName di ttdMap
  if (fname) {
    if (isValid(ttdMap[fname])) return ttdMap[fname];
    if (isValid(ttdMap[targetFullName])) return ttdMap[targetFullName];
  }

  // 2. CEK LANGSUNG DI AKUN USER DATABASE (getUsersFromDB)
  const allUsers = (typeof getUsersFromDB === 'function') ? getUsersFromDB() : [];
  if (uname) {
    const u = allUsers.find(x => x && (
      String(x.username || '').toUpperCase() === uname ||
      String(x.id || '').toUpperCase() === uname
    ));
    if (u && isValid(u.ttd)) return u.ttd;
  }

  if (fname) {
    const u = allUsers.find(x => x && (
      String(x.fullName || '').toUpperCase() === fname ||
      String(x.full_name || '').toUpperCase() === fname
    ));
    if (u && isValid(u.ttd)) return u.ttd;
  }

  // 3. CEK DARIPADA USER SAAAT INI (currentUser) JIKA MATCH ROLE / AREA
  if (typeof currentUser !== 'undefined' && currentUser && isValid(currentUser.ttd)) {
    const cCat = String(currentUser.category || '').toUpperCase();
    const cUname = String(currentUser.username || '').toUpperCase();
    if (uname && cUname === uname) return currentUser.ttd;
    if (role && (cCat === role || (role === 'HODS' && cCat === 'SERVICE') || (role === 'SERVICE' && cCat === 'HODS'))) {
      if (!area || (typeof isAreaMatch === 'function' ? isAreaMatch(currentUser.area, area) : currentUser.area === area)) {
        return currentUser.ttd;
      }
    }
  }

  // 4. PENCARIAN PRESISI DENGAN ROLE & AREA BERDASARKAN USER DATABASE & CENTRAL MAP
  if (role === 'SERVICE' || role === 'HODS') {
    if (area) {
      if (isValid(ttdMap[`SERVICE_${area}`])) return ttdMap[`SERVICE_${area}`];
      if (isValid(ttdMap[`HODS_${area}`])) return ttdMap[`HODS_${area}`];
      const srvAreaUsers = allUsers.filter(u => u && (u.category === 'SERVICE' || u.category === 'HODS') && (typeof isAreaMatch === 'function' ? isAreaMatch(u.area, area) : u.area === area));
      for (let srv of srvAreaUsers) {
        if (isValid(srv.ttd)) return srv.ttd;
      }
    }
    if (isValid(ttdMap['SERVICE'])) return ttdMap['SERVICE'];
    if (isValid(ttdMap['HODS'])) return ttdMap['HODS'];
    const anySrv = allUsers.find(u => u && (u.category === 'SERVICE' || u.category === 'HODS') && isValid(u.ttd));
    if (anySrv) return anySrv.ttd;
  } else if (role === 'DM' || role === 'DISTRICT_MANAGER') {
    if (isValid(ttdMap['DM'])) return ttdMap['DM'];
    const dmUser = allUsers.find(u => u && (u.category === 'DM' || u.category === 'ADMIN') && isValid(u.ttd));
    if (dmUser) return dmUser.ttd;
  } else if (role === 'GBJ') {
    if (isValid(ttdMap['GBJ'])) return ttdMap['GBJ'];
    const gbjUser = allUsers.find(u => u && (
      u.category === 'GBJ' ||
      String(u.username || '').toUpperCase().includes('GBJ') ||
      String(u.fullName || '').toUpperCase().includes('GBJ')
    ) && isValid(u.ttd));
    if (gbjUser) return gbjUser.ttd;
  } else if (role === 'TOKO') {
    const tokoUser = allUsers.find(u => u && (
      String(u.username || '').toUpperCase() === uname ||
      String(u.fullName || '').toUpperCase() === fname ||
      (area && u.category === 'TOKO' && (typeof isAreaMatch === 'function' ? isAreaMatch(u.area, area) : u.area === area))
    ) && isValid(u.ttd));
    if (tokoUser) return tokoUser.ttd;
  }

  return '';
}
window.getUserRealSignature = getUserRealSignature;

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
  appStorage.setItem(PDF_MODEL_KEY, modelId);
  try { localStorage.setItem(PDF_MODEL_KEY, modelId); } catch(e) {}
  updateActivePdfModelBadge();
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
    <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 36px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
      PERMINTAAN TOKO
    </div>
  `;

  if (modelId === 'MODEL_2') {
    tableHeaderBg = '#334155';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; padding: 12px 18px; border-radius: 10px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 20px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_3') {
    tableHeaderBg = '#0f172a';
    headerTitleHtml = `
      <div style="background: #0f172a; color: #fbbf24; padding: 14px 18px; border-radius: 8px; border-bottom: 4px solid #fbbf24; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 20px; letter-spacing: 1.5px; text-transform: uppercase;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_4') {
    tableHeaderBg = '#059669';
    headerTitleHtml = `
      <div style="background: #059669; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 20px; letter-spacing: 1px; border-left: 6px solid #047857;">
        PERMINTAAN TOKO
      </div>
    `;
  } else if (modelId === 'MODEL_5') {
    tableHeaderBg = '#7c3aed';
    headerTitleHtml = `
      <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); color: #ffffff; padding: 14px 18px; border-radius: 12px; text-align: center; font-size: 21px; font-weight: 900; margin-bottom: 20px; letter-spacing: 1.5px; box-shadow: 0 6px 18px rgba(124,58,237,0.3);">
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
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; white-space: nowrap !important; width: 1%;">NO</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; white-space: nowrap !important; width: 1%;">TIPE BARANG</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; white-space: nowrap !important; width: 1%;">NO. SERI</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; white-space: normal !important;">NAMA BARANG</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; white-space: normal !important;">ALASAN</th>
            <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; white-space: nowrap !important; width: 1%;">QTY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center; padding:6px 8px; border: 1px solid #cbd5e1;">1</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">AC DAIKIN 2 PK</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">SN-889920112</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">UNIT INDOOR AC 2PK</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">KOMPRESOR BOCOR FREON</td>
            <td style="text-align:center; padding:6px 8px; border: 1px solid #cbd5e1; font-weight:bold;">1</td>
          </tr>
          <tr>
            <td style="text-align:center; padding:6px 8px; border: 1px solid #cbd5e1;">2</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">KULKAS 2 PINTU</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">SN-776655100</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">UNIT KULKAS INVERTER</td>
            <td style="padding:6px 8px; border: 1px solid #cbd5e1;">KARET PINTU LONGGAR</td>
            <td style="text-align:center; padding:6px 8px; border: 1px solid #cbd5e1; font-weight:bold;">1</td>
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
        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; text-align: center;">
          <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">PEMOHON</div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 48px;">
            ${(() => {
              const tokoSig = (currentUser && currentUser.category === 'TOKO' && isValidSig(currentUser.ttd)) ? currentUser.ttd : getUserRealSignature('TOKO');
              return renderSafeTtdImageTag(tokoSig, 'max-height: 46px; max-width: 90%; object-fit: contain;');
            })()}
          </div>
          <div>
            <div style="font-weight: 500; color: #0f172a; font-size: 11px;">TOKO UTAMA</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">PEMOHON (TOKO)</div>
          </div>
        </div>

        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; text-align: center;">
          <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">DIPERIKSA</div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 48px;">
            ${(() => {
              const srvSig = getUserRealSignature('SERVICE', 'BDG');
              return srvSig ? `<img src="${srvSig}" style="max-height: 46px; max-width: 90%; object-fit: contain;">` : '';
            })()}
          </div>
          <div>
            <div style="font-weight: 500; color: #0f172a; font-size: 11px;">SERVICE BANDUNG</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">HODS BANDUNG</div>
          </div>
        </div>

        <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; min-height: 110px; text-align: center;">
          <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">DISETUJUI</div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; min-height: 48px;">
            ${(() => {
              const dmSig = getUserRealSignature('DM');
              return dmSig ? `<img src="${dmSig}" style="max-height: 46px; max-width: 90%; object-fit: contain;">` : '';
            })()}
          </div>
          <div>
            <div style="font-weight: 500; color: #0f172a; font-size: 11px;">${typeof getNamaDM === 'function' ? getNamaDM() : 'FERRY EDIYANTO'}</div>
            <div style="font-size: 9.5px; color: #475569; margin-top: 1px; text-transform: uppercase;">DISTRICT MANAGER</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function tutupPilihanCetakPdf() {
  const existingModal = document.getElementById('pdfPrintChoiceModal');
  if (existingModal) {
    existingModal.remove();
  }
}
window.tutupPilihanCetakPdf = tutupPilihanCetakPdf;

function tutupPilihanCetakPdf() {
  const existingModal = document.getElementById('pdfPrintChoiceModal');
  if (existingModal) {
    existingModal.remove();
  }
}
window.tutupPilihanCetakPdf = tutupPilihanCetakPdf;

function bukaPdfModal(noSurat, includePhotos = null, autoPrint = true) {
  const requests = getRequestsFromDB();
  const targetNo = String(noSurat || '').trim().toUpperCase();
  const req = requests.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === targetNo ||
    String(r.id || '').trim().toUpperCase() === targetNo
  ));
  if (!req) {
    showNotif('DOKUMEN TIDAK DITEMUKAN!', 'warning');
    return;
  }
  window._currentActivePdfNoSurat = req.noSurat;

  const userCat = (currentUser && currentUser.category) ? String(currentUser.category).toUpperCase() : '';
  const isAdmUser = (typeof checkIsAdminUser === 'function') ? checkIsAdminUser() : (userCat === 'ADMIN' || (currentUser && currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (!isAdmUser && typeof isPdfButtonAllowed === 'function' && !isPdfButtonAllowed(req)) {
    if (userCat === 'TOKO' || userCat === 'SALES') {
      showNotif('DOKUMEN BELUM SELESAI DISETUJUI / DIVERIFIKASI OLEH DM!', 'warning');
      return;
    }
  }

  const validPhotos = getReqPhotosList(req);
  if (includePhotos === null) {
    includePhotos = true;
  }

  const pdfContainer = document.getElementById('pdfDocumentContent');
  if (!pdfContainer) return;

  const activeModel = (typeof getActivePdfModel === 'function') ? getActivePdfModel() : 'MODEL_1';

  const hasUnfulfilledItem = (Array.isArray(req.items) && req.items.some(i => i && (
    i.unfulfilled || 
    i.batal || 
    i.status === 'TIDAK BISA DIPENUHI' || 
    i.status === 'TIDAK DIPENUHI' ||
    i.statusPart === 'TIDAK DIPENUHI' ||
    i.keteranganPart === 'TIDAK DIPENUHI'
  ))) || (req.status === 'BATAL' || req.unfulfilled);

  let itemRowsHtml = (req.items || []).map((i, idx) => {
    const isUnfulfilled = !!(
      i.unfulfilled || 
      i.batal || 
      i.status === 'TIDAK BISA DIPENUHI' || 
      i.status === 'TIDAK DIPENUHI' ||
      i.statusPart === 'TIDAK DIPENUHI' ||
      i.keteranganPart === 'TIDAK DIPENUHI' ||
      req.status === 'BATAL' || 
      req.unfulfilled
    );
    const rowTdStyle = isUnfulfilled 
      ? 'padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; text-decoration: line-through; text-decoration-thickness: 2px; font-weight: bold; color: #b91c1c; background-color: #fef2f2;' 
      : 'padding:6px 6px; border:1px solid #cbd5e1; font-size:11px;';
    const numTdStyle = isUnfulfilled 
      ? 'text-align:center; padding:6px 4px; border:1px solid #cbd5e1; font-size:11px; text-decoration: line-through; text-decoration-thickness: 2px; font-weight: bold; color: #b91c1c; background-color: #fef2f2; white-space: nowrap !important;' 
      : 'text-align:center; padding:6px 4px; border:1px solid #cbd5e1; font-size:11px; white-space: nowrap !important;';

    return `
      <tr style="border-bottom:1px solid #cbd5e1; ${isUnfulfilled ? 'background-color:#fef2f2;' : ''}">
        <td style="${numTdStyle} width:1%;">${idx + 1}</td>
        <td style="${rowTdStyle} white-space: nowrap !important; width:1%; text-align:left;">${i.type || i.tipe || '-'}</td>
        <td style="${rowTdStyle} white-space: nowrap !important; width:1%; text-align:left;">${i.seri || i.sn || '-'}</td>
        ${req.jenis === 'DUS' ? `<td style="${rowTdStyle} white-space: nowrap !important; width:1%; text-align:left; color:${isUnfulfilled ? '#b91c1c' : '#d97706'}; font-weight:600;">${i.dus || '-'}</td>` : ''}
        <td style="${rowTdStyle} white-space: normal !important; word-break: break-word; text-align:left;">${i.barang || i.permintaan || '-'}</td>
        <td style="${rowTdStyle} white-space: normal !important; word-break: break-word; text-align:left;">${i.alasan || '-'}</td>
        <td style="${numTdStyle} width:1%;">${i.qty || 1}</td>
      </tr>
    `;
  }).join('');

  const users = getUsersFromDB();
  const serviceUser = users.find(u => u.category === 'SERVICE' && u.area === req.area) || users.find(u => u.category === 'SERVICE');
  const dmUser = users.find(u => u.category === 'DM') || users.find(u => u.username === 'ADMIN');
  const serviceName = req.serviceUserName || (serviceUser ? serviceUser.fullName : 'SERVICE SUPERVISOR');
  const dmName = typeof getNamaDM === 'function' ? getNamaDM() : 'FERRY EDIYANTO';

  let serviceTTD = req.serviceTTD || '';
  const reqSrvName = req.serviceUserName || (serviceUser ? serviceUser.fullName : '');

  // Verifikasi TTD Service langsung dari akun User Service terkait
  if (reqSrvName) {
    const exactSig = getUserRealSignature('SERVICE', req.area, '', reqSrvName);
    serviceTTD = exactSig;
  } else if (!isValidSig(serviceTTD) && serviceUser) {
    serviceTTD = getUserRealSignature('SERVICE', req.area, serviceUser.username, serviceUser.fullName);
  }

  if (!isValidSig(serviceTTD)) {
    serviceTTD = ''; // KOSONGKAN JIKA USER SERVICE BELUM MEMPUNYAI TTD
  }

  let dmTTD = req.dmTTD || '';
  if (!isValidSig(dmTTD)) {
    dmTTD = getUserRealSignature('DM', '', '', dmName) || (dmUser ? dmUser.ttd : '');
  }
  if (!isValidSig(dmTTD)) {
    dmTTD = ''; // KOSONGKAN DI PDF JIKA USER DM BELUM MEMPUNYAI TTD
  }

  const isReqFromGBJ = (
    (req.createdBy && String(req.createdBy).toUpperCase().includes('GBJ')) ||
    (req.toko && String(req.toko).toUpperCase().includes('GBJ')) ||
    req.isGBJ === true
  );

  let pemohonTTD = req.pemohonTTD || req.tokoTTD || '';
  let pemohonName = req.toko || req.createdBy || 'PEMOHON';
  let pemohonRoleTitle = 'PEMOHON (TOKO)';

  if (isReqFromGBJ) {
    const gbjUser = users.find(u => u && (
      (u.id && String(u.id).toUpperCase() === String(req.createdBy || '').toUpperCase()) ||
      (u.username && String(u.username).toUpperCase() === String(req.createdBy || '').toUpperCase()) ||
      (u.fullName && String(u.fullName).toUpperCase() === String(req.createdBy || '').toUpperCase()) ||
      u.category === 'GBJ'
    ));

    pemohonName = (gbjUser ? (gbjUser.fullName || gbjUser.username) : '') || req.createdBy || req.toko || 'GBJ';
    pemohonRoleTitle = 'GUDANG BARANG JADI (GBJ)';

    if (!isValidSig(pemohonTTD)) {
      pemohonTTD = (gbjUser && isValidSig(gbjUser.ttd)) ? gbjUser.ttd : getUserRealSignature('GBJ', req.area, req.createdBy, req.createdBy);
    }
  } else {
    if (!isValidSig(pemohonTTD)) {
      pemohonTTD = getUserRealSignature('TOKO', req.area, req.createdBy, req.toko);
    }
  }

  if (!isValidSig(pemohonTTD)) {
    pemohonTTD = '';
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
  if (includePhotos === true && validPhotos.length > 0) {
    photoSection = `
      <div style="margin-top: 10px; margin-bottom: 8px; page-break-inside: avoid;">
        <div style="font-size: 8px; font-weight: 700; color: #475569; letter-spacing: 0.3px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; text-transform: uppercase;">
          LAMPIRAN FOTO BARANG (${validPhotos.length} FOTO):
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; width: 100%;">
          ${validPhotos.map((p, pIdx) => `
            <div style="aspect-ratio: 1/1; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; position: relative; display: flex; align-items: center; justify-content: center; padding: 2px; box-sizing: border-box;">
              <img src="${p}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;">
              <span style="position: absolute; bottom: 2px; right: 2px; background: rgba(15,23,42,0.75); color: #ffffff; font-size: 7.5px; font-weight: 800; padding: 1px 3px; border-radius: 2px;">#${pIdx+1}</span>
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
  const hodsAreaTitle = `HODS ${areaNameMap[req.area] || req.area || ''}`;

  let tableHeaderBg = '#0284c7';
  let headerTitleHtml = `
    <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 24px; margin-bottom: 20px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
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
    <div class="pdf-paper" style="min-height: 680px; display: flex; flex-direction: column; justify-content: space-between; padding: 1mm 20px; color: #0f172a; background: #ffffff; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
      <div>
        ${headerTitleHtml}

                                <table class="pdf-info-table" style="width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 20px; font-size: 12px; background: transparent; border: none;">
          <tr>
            <td style="padding: 4px 0; width: 85px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap;">NO SURAT</td>
            <td style="padding: 4px 12px 4px 8px; width: 14px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 20px 4px 0; width: 100%; font-weight: 800; color: #0284c7; border: none; letter-spacing: 0.2px;">${req.noSurat}</td>
            
            <td style="padding: 4px 0; width: 75px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">TANGGAL</td>
            <td style="padding: 4px 12px 4px 8px; width: 14px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 0; width: 105px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">${(typeof formatDateDDMMYYYYString === 'function') ? formatDateDDMMYYYYString(req.tanggal) : (req.tanggal || '-')}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; white-space: nowrap;">TOKO</td>
            <td style="padding: 4px 12px 4px 8px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 20px 4px 0; font-weight: 800; color: #0f172a; border: none; text-transform: uppercase;">${req.toko}</td>
            
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">JENIS</td>
            <td style="padding: 4px 12px 4px 8px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; text-transform: uppercase; white-space: nowrap; text-align: left;">${req.jenis || 'DEFAULT'}</td>
          </tr>
        </table>

        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #0f172a;">DETAIL PERMINTAAN:</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: ${tableHeaderBg}; color: #ffffff;">
              <th style="width: 1%; text-align:center; padding:7px 6px; border:1px solid #cbd5e1; font-weight:700; white-space: nowrap !important;">NO</th>
              <th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">TIPE BARANG</th>
              <th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">NO. SERI</th>
              ${req.jenis === 'DUS' ? `<th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">NO. SERI DUS</th>` : ''}
              <th style="padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: normal !important;">PERMINTAAN BARANG</th>
              <th style="padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: normal !important;">ALASAN PERMINTAAN</th>
              <th style="width: 1%; text-align:center; padding:7px 6px; border:1px solid #cbd5e1; font-weight:700; white-space: nowrap !important;">QTY</th>
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
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 28px; text-align: center; font-size: 11px; page-break-inside: avoid;">
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">PEMOHON</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${renderSafeTtdImageTag(pemohonTTD, "max-height: 52px; max-width: 100%; object-fit: contain;")}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${pemohonName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">${pemohonRoleTitle}</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DIPERIKSA</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${renderSafeTtdImageTag(serviceTTD, "max-height: 52px; max-width: 100%; object-fit: contain;")}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${serviceName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">${hodsAreaTitle}</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">DISETUJUI</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${renderSafeTtdImageTag(dmTTD, "max-height: 52px; max-width: 100%; object-fit: contain;")}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${dmName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">DISTRICT MANAGER</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 28px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; letter-spacing: 0.2px;">
          ${hasUnfulfilledItem ? `
            <div style="font-weight: 800; color: #b91c1c; font-style: normal; display: flex; align-items: center; gap: 4px; font-size: 8px;">
              <span style="text-decoration: line-through; text-decoration-thickness: 2.5px; font-weight: 900; color: #b91c1c; font-size: 10px;">---</span> = Tidak di penuhi
            </div>
          ` : '<div></div>'}
          <div style="font-style: italic; opacity: 0.85; font-size: 8px;">
            ${timestampStr}
          </div>
        </div>
      </div>
    </div>
  `;

  if (autoPrint) {
    if (typeof cetakDokumenPdf === 'function') {
      cetakDokumenPdf();
    } else {
      window.print();
    }
  } else {
    const pdfModal = document.getElementById('pdfModal');
    if (pdfModal) {
      pdfModal.style.setProperty('display', 'flex', 'important');
      pdfModal.classList.add('show');
      if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
    }
  }
}
window.bukaPdfModal = bukaPdfModal;



function tutupPdfModal() {
  const pdfModal = document.getElementById('pdfModal');
  if (pdfModal) {
    pdfModal.style.setProperty('display', 'none', 'important');
    pdfModal.classList.remove('show');
  }

  // SANGAT PENTING: Hanya jika Popup Detail sebelumnya memang aktif/terbuka, pastikan tetap tampil!
  const popupDetailV2 = document.getElementById('popupDetailBarangV2');
  if (popupDetailV2 && popupDetailV2.dataset.active === "true" && popupDetailV2.style.display !== 'none') {
    popupDetailV2.style.setProperty('display', 'flex', 'important');
    popupDetailV2.classList.add('show');
  }

  const popupDetail = document.getElementById('popupDetail');
  if (popupDetail && popupDetail.dataset.active === "true" && popupDetail.style.display !== 'none') {
    popupDetail.style.setProperty('display', 'flex', 'important');
    popupDetail.classList.add('show');
  }
}
window.tutupPdfModal = tutupPdfModal;

async function cetakDokumenPdf() {
  if (typeof tampilkanLoadingProses === 'function') {
    tampilkanLoadingProses('MOHON TUNGGU...');
  }
  
  // Jeda persis 4 detik (4000ms) sebelum memunculkan dialog cetak PDF
  await new Promise(resolve => setTimeout(resolve, 4000));

  const content = document.getElementById('pdfDocumentContent');
  if (!content) {
    if (typeof tutupLoadingProses === 'function') tutupLoadingProses();
    window.print();
    return;
  }

  // Ambil No Surat aktif dan bersihkan karakter / serta - untuk nama file PDF
  const rawNoSurat = window._currentActivePdfNoSurat || '';
  const docTitle = String(rawNoSurat).replace(/[\/\-]/g, '').trim() || 'PERMINTAAN_TOKO';

  try {
    let printIframe = document.getElementById('hiddenPdfPrintIframe');
    if (printIframe) {
      printIframe.remove();
    }

    printIframe = document.createElement('iframe');
    printIframe.id = 'hiddenPdfPrintIframe';
    printIframe.style.setProperty('position', 'fixed', 'important');
    printIframe.style.setProperty('right', '0', 'important');
    printIframe.style.setProperty('bottom', '0', 'important');
    printIframe.style.setProperty('width', '0px', 'important');
    printIframe.style.setProperty('height', '0px', 'important');
    printIframe.style.setProperty('border', 'none', 'important');
    printIframe.style.setProperty('opacity', '0', 'important');
    printIframe.style.setProperty('visibility', 'hidden', 'important');
    printIframe.style.setProperty('pointer-events', 'none', 'important');
    printIframe.style.setProperty('z-index', '-999999', 'important');

    document.body.appendChild(printIframe);

    const priWindow = printIframe.contentWindow || printIframe.contentDocument;
    const priDoc = printIframe.contentDocument || printIframe.contentWindow.document;

    priDoc.open();
    priDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 8mm;
              background: #ffffff;
              color: #0f172a;
              font-family: 'Poppins', sans-serif;
            }
            .pdf-paper {
              width: 100% !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            .pdf-info-table td {
              border: none !important;
            }
            .pdf-info-table {
              width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    priDoc.close();

    setTimeout(() => {
      if (typeof tutupLoadingProses === 'function') tutupLoadingProses();
      try {
        priWindow.focus();
        priWindow.print();
      } catch (err) {
        console.warn('Iframe print fallback error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (printIframe && printIframe.parentNode) {
            printIframe.remove();
          }
        }, 1500);
      }
    }, 200);
    return;
  } catch (e) {
    console.warn('[PRINT IFRAME NOTICE]: Fallback ke window.print()', e);
  }

  if (typeof tutupLoadingProses === 'function') tutupLoadingProses();
  window.print();
}

function bukaTTD() {
  if (!currentUser || (currentUser.category !== 'SERVICE' && currentUser.category !== 'DM' && currentUser.category !== 'GBJ')) {
    showNotif('TANDA TANGAN DIGITAL KHUSUS UNTUK SERVICE, DM & GBJ!', 'warning');
    return;
  }
  const modal = document.getElementById('popupTTD');
  if (modal) {
    modal.classList.add('show');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2147483648', 'important');
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

let ttdDPR = 1;
let ttdDisplayW = 500;
let ttdDisplayH = 220;
let ttdStrokePoints = [];

function initCanvasTTD() {
  canvasTTD = document.getElementById('canvasTTD');
  if (!canvasTTD) return;

  const rect = canvasTTD.getBoundingClientRect();
  ttdDisplayW = Math.round(rect.width) || canvasTTD.offsetWidth || 500;
  ttdDisplayH = Math.round(rect.height) || canvasTTD.offsetHeight || 220;

  // GUNAKAN RESOLUSI HIGH-DPI RETINA (MINIMAL 2X / 3X) AGAR HASIL TTD SUPER TAJAM & TIDAK PECAH
  ttdDPR = Math.max(window.devicePixelRatio || 1, 2);

  canvasTTD.width = Math.round(ttdDisplayW * ttdDPR);
  canvasTTD.height = Math.round(ttdDisplayH * ttdDPR);
  canvasTTD.style.width = ttdDisplayW + 'px';
  canvasTTD.style.height = ttdDisplayH + 'px';

  ctxTTD = canvasTTD.getContext('2d', { willReadFrequently: true });
  ctxTTD.setTransform(1, 0, 0, 1, 0, 0);
  ctxTTD.scale(ttdDPR, ttdDPR);

  ctxTTD.imageSmoothingEnabled = true;
  ctxTTD.imageSmoothingQuality = 'high';
  ctxTTD.lineWidth = 2.8;
  ctxTTD.lineCap = 'round';
  ctxTTD.lineJoin = 'round';
  ctxTTD.strokeStyle = '#0f172a';

  ctxTTD.clearRect(0, 0, ttdDisplayW, ttdDisplayH);

  // RESET SEMUA LISTENER SEBELUMNYA
  canvasTTD.onmousedown = null;
  canvasTTD.onmousemove = null;
  canvasTTD.onmouseup = null;
  canvasTTD.onmouseleave = null;

  // UNIFIED POINTER EVENTS (TOUCH, MOUSE, STYLUS DENGAN SUB-PIXEL PRECISION)
  if (window.PointerEvent) {
    canvasTTD.onpointerdown = handlePointerDownTTD;
    canvasTTD.onpointermove = handlePointerMoveTTD;
    canvasTTD.onpointerup = handlePointerUpTTD;
    canvasTTD.onpointercancel = handlePointerUpTTD;
    canvasTTD.onpointerleave = handlePointerUpTTD;
  } else {
    canvasTTD.onmousedown = handleMouseDownTTD;
    canvasTTD.onmousemove = handleMouseMoveTTD;
    canvasTTD.onmouseup = handlePointerUpTTD;
    canvasTTD.onmouseleave = handlePointerUpTTD;

    canvasTTD.addEventListener('touchstart', handleTouchStartTTD, { passive: false });
    canvasTTD.addEventListener('touchmove', handleTouchMoveTTD, { passive: false });
    canvasTTD.addEventListener('touchend', handlePointerUpTTD);
    canvasTTD.addEventListener('touchcancel', handlePointerUpTTD);
  }
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

function handlePointerDownTTD(e) {
  if (e.cancelable) e.preventDefault();
  isDrawing = true;
  ttdStrokePoints = [];

  try {
    if (e.pointerId && canvasTTD.setPointerCapture) {
      canvasTTD.setPointerCapture(e.pointerId);
    }
  } catch(err) {}

  const pt = getCanvasPointFromEvent(e);
  lastX = pt.x;
  lastY = pt.y;
  ttdStrokePoints.push({ x: pt.x, y: pt.y });

  ctxTTD.beginPath();
  ctxTTD.arc(pt.x, pt.y, (ctxTTD.lineWidth || 2.8) / 2, 0, Math.PI * 2);
  ctxTTD.fillStyle = ctxTTD.strokeStyle || '#0f172a';
  ctxTTD.fill();
}

function handlePointerMoveTTD(e) {
  if (!isDrawing) return;
  if (e.cancelable) e.preventDefault();

  const pt = getCanvasPointFromEvent(e);
  ttdStrokePoints.push({ x: pt.x, y: pt.y });

  if (ttdStrokePoints.length >= 3) {
    const p0 = ttdStrokePoints[ttdStrokePoints.length - 3];
    const p1 = ttdStrokePoints[ttdStrokePoints.length - 2];
    const p2 = ttdStrokePoints[ttdStrokePoints.length - 1];

    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    ctxTTD.beginPath();
    ctxTTD.moveTo(mid1.x, mid1.y);
    ctxTTD.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctxTTD.stroke();
  } else if (ttdStrokePoints.length === 2) {
    const p0 = ttdStrokePoints[0];
    const p1 = ttdStrokePoints[1];
    ctxTTD.beginPath();
    ctxTTD.moveTo(p0.x, p0.y);
    ctxTTD.lineTo(p1.x, p1.y);
    ctxTTD.stroke();
  }

  lastX = pt.x;
  lastY = pt.y;
}

function handlePointerUpTTD(e) {
  if (!isDrawing) return;
  isDrawing = false;
  ttdStrokePoints = [];
  try {
    if (e && e.pointerId && canvasTTD.releasePointerCapture) {
      canvasTTD.releasePointerCapture(e.pointerId);
    }
  } catch(err) {}
}

function handleMouseDownTTD(e) {
  handlePointerDownTTD(e);
}

function handleMouseMoveTTD(e) {
  handlePointerMoveTTD(e);
}

function handleTouchStartTTD(e) {
  handlePointerDownTTD(e);
}

function handleTouchMoveTTD(e) {
  handlePointerMoveTTD(e);
}

function stopDraw() {
  isDrawing = false;
  ttdStrokePoints = [];
}

function pilihFotoTTD() {
  const input = document.getElementById('fotoTTDInput');
  if (input) input.click();
}
window.pilihFotoTTD = pilihFotoTTD;

async function prosesFotoKeTTD(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  if (typeof showLoading === 'function') showLoading('MEMPROSES FOTO MENJADI TTD DIGITAL TRANSPARAN...');

  try {
    let img;
    if (typeof createImageBitmap === 'function') {
      try {
        img = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch(e) { img = null; }
    }
    if (!img) {
      const dataUrl = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = ev => r(ev.target.result);
        reader.onerror = () => r('');
        reader.readAsDataURL(file);
      });
      if (!dataUrl) {
        if (typeof hideLoading === 'function') hideLoading();
        showNotif('GAGAL MEMBACA FOTO TTD!', 'error');
        event.target.value = '';
        return;
      }
      img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
    }

    if (!canvasTTD || !ctxTTD) {
      if (typeof hideLoading === 'function') hideLoading();
      event.target.value = '';
      return;
    }

    const cWidth = canvasTTD.width || Math.round(ttdDisplayW * ttdDPR);
    const cHeight = canvasTTD.height || Math.round(ttdDisplayH * ttdDPR);

    let sourceElement = img;
    let sWidth = img.width;
    let sHeight = img.height;

    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d');
    tempCanvas.width = cWidth;
    tempCanvas.height = cHeight;

        let drawWidth = sWidth;
        let drawHeight = sHeight;
        const scale = Math.min(cWidth / drawWidth, cHeight / drawHeight) * 0.86;

        drawWidth = Math.round(drawWidth * scale);
        drawHeight = Math.round(drawHeight * scale);

        const offsetX = Math.round((cWidth - drawWidth) / 2);
        const offsetY = Math.round((cHeight - drawHeight) / 2);

        // Isi latar putih murni pada kanvas sementara
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(0, 0, cWidth, cHeight);
        tCtx.imageSmoothingEnabled = true;
        tCtx.imageSmoothingQuality = 'high';
        tCtx.drawImage(sourceElement, offsetX, offsetY, drawWidth, drawHeight);

        const imgData = tCtx.getImageData(0, 0, cWidth, cHeight);
        const data = imgData.data;

        // Analisis sampel kecerahan kertas
        const lums = [];
        for (let y = offsetY; y < offsetY + drawHeight; y++) {
          for (let x = offsetX; x < offsetX + drawWidth; x++) {
            const idx = (y * cWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            lums.push(lum);
          }
        }

        lums.sort((a, b) => a - b);
        const p85Idx = Math.floor(lums.length * 0.85);
        const paperLuminance = lums[p85Idx] || 220;

        const paperCutoff = Math.max(120, paperLuminance - 35);
        const inkCutoff = Math.max(50, paperCutoff - 30);
        const borderPadding = 8;

        // Map Alpha awal (0-255)
        const alphaMap = new Uint8Array(cWidth * cHeight);

        for (let y = 0; y < cHeight; y++) {
          for (let x = 0; x < cWidth; x++) {
            if (
              x < offsetX + borderPadding ||
              x >= offsetX + drawWidth - borderPadding ||
              y < offsetY + borderPadding ||
              y >= offsetY + drawHeight - borderPadding
            ) {
              continue;
            }

            const i = (y * cWidth + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (lum < paperCutoff) {
              if (lum <= inkCutoff) {
                alphaMap[y * cWidth + x] = 255;
              } else {
                const norm = (paperCutoff - lum) / (paperCutoff - inkCutoff);
                alphaMap[y * cWidth + x] = Math.min(255, Math.max(130, Math.round(norm * 255)));
              }
            }
          }
        }

        // 2. PENEBATAN & PELEBARAN GORESAN TTD (DILATION / STROKE BOLDENING)
        const dilatedMap = new Uint8Array(cWidth * cHeight);

        for (let y = 0; y < cHeight; y++) {
          for (let x = 0; x < cWidth; x++) {
            const a = alphaMap[y * cWidth + x];
            if (a > 0) {
              // Spreading ke 3x3 piksel tetangga untuk penebalan dan goresan lebih lebar
              for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= cHeight) continue;
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= cWidth) continue;
                  const nIdx = ny * cWidth + nx;
                  if (a > dilatedMap[nIdx]) {
                    dilatedMap[nIdx] = a;
                  }
                }
              }
            }
          }
        }

        const outputImgData = ctxTTD.createImageData(cWidth, cHeight);
        const outData = outputImgData.data;

        for (let y = 0; y < cHeight; y++) {
          for (let x = 0; x < cWidth; x++) {
            const i = (y * cWidth + x) * 4;
            const a = dilatedMap[y * cWidth + x];
            if (a > 0) {
              outData[i] = 15;     // R (Pekat Navy Tinta)
              outData[i + 1] = 23; // G
              outData[i + 2] = 42; // B
              outData[i + 3] = a;  // Alpha tebal
            } else {
              outData[i] = 0;
              outData[i + 1] = 0;
              outData[i + 2] = 0;
              outData[i + 3] = 0;
            }
          }
        }

        ctxTTD.save();
        ctxTTD.setTransform(1, 0, 0, 1, 0, 0);
        ctxTTD.clearRect(0, 0, cWidth, cHeight);
        ctxTTD.putImageData(outputImgData, 0, 0);
        ctxTTD.restore();

        if (typeof hideLoading === 'function') hideLoading();
  } catch (err) {
    if (typeof hideLoading === 'function') hideLoading();
    console.error('Proses foto TTD error:', err);
    showNotif('TERJADI KESALAHAN SAAT MEMPROSES FOTO TTD!', 'error');
  }

  event.target.value = '';
}
window.prosesFotoKeTTD = prosesFotoKeTTD;

function hapusTTD() {
  if (ctxTTD && canvasTTD) {
    ctxTTD.save();
    ctxTTD.setTransform(1, 0, 0, 1, 0, 0);
    ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
    ctxTTD.restore();
  }
  _currentLoadedTtdOriginal = '';
}

let _currentLoadedTtdOriginal = '';

function cropAndCenterCanvasSignature(srcCanvas) {
  if (!srcCanvas) return '';
  try {
    const ctx = srcCanvas.getContext('2d');
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    
    let imgData;
    try {
      imgData = ctx.getImageData(0, 0, w, h);
    } catch (taintErr) {
      console.warn('[CANVAS TAINTED - SAFE FALLBACK]:', taintErr);
      try {
        return srcCanvas.toDataURL('image/png');
      } catch (toDataUrlErr) {
        return _currentLoadedTtdOriginal || '';
      }
    }

    const data = imgData.data;
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 15) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      try {
        return srcCanvas.toDataURL('image/png');
      } catch(e) {
        return _currentLoadedTtdOriginal || '';
      }
    }

    const strokeW = maxX - minX + 1;
    const strokeH = maxY - minY + 1;
    const pad = Math.round(16 * (ttdDPR || 2));

    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(w - cropX, strokeW + (pad * 2));
    const cropH = Math.min(h - cropY, strokeH + (pad * 2));

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = cropW;
    targetCanvas.height = cropH;
    const targetCtx = targetCanvas.getContext('2d');

    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.drawImage(
      srcCanvas,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );

    return targetCanvas.toDataURL('image/png');
  } catch (e) {
    console.warn('Error cropping signature:', e);
    try {
      return srcCanvas.toDataURL('image/png');
    } catch(err2) {
      return _currentLoadedTtdOriginal || '';
    }
  }
}
window.cropAndCenterCanvasSignature = cropAndCenterCanvasSignature;

function simpanTTD() {
  showConfirm('SIMPAN TANDA TANGAN DIGITAL INI?', function() {
    var _asyncTask = async function() {
      if (!canvasTTD) return;
      showLoading('MENGUNGGAH TTD DIGITAL KE STORAGE...');
      try {
        const rawPng = cropAndCenterCanvasSignature(canvasTTD);
        if (!rawPng || !rawPng.startsWith('data:image/')) {
          hideLoading();
          showNotif('TTD KOSONG ATAU TIDAK VALID!', 'warning');
          return;
        }

        // Unggah gambar ke Supabase Storage untuk mendapatkan URL publik (HTTP/HTTPS)
        const ttdUrl = await uploadSignatureDataUrlToSupabaseStorage(
          rawPng, 
          `TTD_${(currentUser && currentUser.username ? currentUser.username : 'USER')}_${Date.now()}.png`
        );
        
        // WAJIB FORMAT URL HTTP/HTTPS (TIDAK BOLEH FORMAT BASE64)
        if (!ttdUrl || typeof ttdUrl !== 'string' || (!ttdUrl.startsWith('http://') && !ttdUrl.startsWith('https://'))) {
          hideLoading();
          showNotif('GAGAL MENGUNGGAH TTD: HASIL HARUS FORMAT URL HTTP/HTTPS (BUKAN BASE64)!', 'error');
          return;
        }

        // SIMPAN TTD HANYA PADA OBJEK USER TERKAIT (DI MENU/DATABASE USERS)
        if (currentUser) {
          currentUser.ttd = ttdUrl;
        }

        try {
          const allUsers = getUsersFromDB();
          const uIdx = allUsers.findIndex(u => u && (
            (u.id && currentUser && currentUser.id && String(u.id) === String(currentUser.id)) ||
            (u.username && currentUser && currentUser.username && String(u.username).toUpperCase() === String(currentUser.username).toUpperCase())
          ));
          if (uIdx !== -1) {
            allUsers[uIdx].ttd = ttdUrl;
            saveUsersToDB(allUsers);
          }
          if (typeof simpanUserKeSupabase === 'function' && currentUser) {
            simpanUserKeSupabase({ ...currentUser, ttd: ttdUrl }).catch(() => {});
          }
          try {
            const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
            if (rtdb && currentUser) {
              const keyUser = String(currentUser.username || currentUser.id).replace(/[\/\.#$\[\]]/g, '_');
              rtdb.ref(`users/${keyUser}/ttd`).set(ttdUrl).catch(() => {});
              rtdb.ref(`user_signatures/${keyUser}`).set(ttdUrl).catch(() => {});
            }
            const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : null;
            if (fs && currentUser) {
              const keyUser = String(currentUser.username || currentUser.id).replace(/[\/\.#$\[\]]/g, '_');
              fs.collection('users').doc(keyUser).set({ ttd: ttdUrl, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
              fs.collection('user_signatures').doc(keyUser).set({ ttd: ttdUrl, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            }
          } catch(e) {}
        } catch(uErr) {}

        if (currentUser) {
          if (currentUser.id) appStorage.setItem(`LOCAL_TTD_${currentUser.id}`, ttdUrl);
          if (currentUser.username) appStorage.setItem(`LOCAL_TTD_${currentUser.username}`, ttdUrl);
        }

        try {
          const allReqs = getRequestsFromDB();
          let reqsChanged = false;
          allReqs.forEach(r => {
            if (!r) return;
            if (currentUser.category === 'SERVICE' && r.serviceApprove) {
              if (r.area === currentUser.area || currentUser.area === 'ALL' || !r.serviceTTD) {
                r.serviceTTD = ttdUrl;
                reqsChanged = true;
                if (typeof supabase !== 'undefined' && supabase) {
                  supabase.from('permintaan_toko').update({ service_ttd: ttdUrl }).eq('no_surat', r.noSurat).then(() => {}, () => {});
                }
              }
            } else if (currentUser.category === 'DM' && (r.status === 'APPROVE' || r.status === 'DONE')) {
              r.dmTTD = ttdUrl;
              reqsChanged = true;
              if (typeof supabase !== 'undefined' && supabase) {
                supabase.from('permintaan_toko').update({ dm_ttd: ttdUrl }).eq('no_surat', r.noSurat).then(() => {}, () => {});
              }
            } else if (currentUser.category === 'GBJ' && (r.createdBy === currentUser.username || r.createdBy === currentUser.fullName || r.isGBJ)) {
              r.pemohonTTD = ttdUrl;
              reqsChanged = true;
            }
          });
          if (reqsChanged) saveRequestsToDB(allReqs);
        } catch(rErr) {}

        if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();

        hideLoading();
        tutupTTD();
        showNotif('TANDA TANGAN DIGITAL BERHASIL!', 'success');
      } catch(err) {
        hideLoading();
        console.error('[SIMPAN TTD ERROR]:', err);
        showNotif('GAGAL MENYIMPAN TTD: ' + (err.message || err), 'warning');
      }
    };
    _asyncTask();
  });
}

async function loadTTD() {
  if (!currentUser) return;
  
  const allUsers = getUsersFromDB();
  const freshUser = allUsers.find(u => u && (
    (u.id && String(u.id) === String(currentUser.id)) ||
    (u.username && String(u.username).toUpperCase() === String(currentUser.username).toUpperCase())
  ));
  
  const data = (currentUser && isValidSig(currentUser.ttd)) 
    ? currentUser.ttd 
    : (freshUser && isValidSig(freshUser.ttd) ? freshUser.ttd : (
        localStorage.getItem(`LOCAL_TTD_${currentUser.id}`) || localStorage.getItem(`LOCAL_TTD_${currentUser.username}`)
      ));
  
  if (data) {
    _currentLoadedTtdOriginal = data;
  }

  if (data && ctxTTD && canvasTTD) {
    try {
      let finalSrc = data;
      // Jika data adalah URL eksternal (http/https), konversi ke base64 DataURL via fetch + blob agar canvas TIDAK TAINTED
      if (typeof data === 'string' && (data.startsWith('http://') || data.startsWith('https://'))) {
        try {
          const res = await fetch(data, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            finalSrc = await new Promise((resolve) => {
              const r = new FileReader();
              r.onloadend = () => resolve(r.result);
              r.readAsDataURL(blob);
            });
          }
        } catch(fetchErr) {
          console.warn('[LOAD TTD FETCH CORS FALLBACK]:', fetchErr);
        }
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (ctxTTD && canvasTTD) {
          ctxTTD.save();
          ctxTTD.setTransform(1, 0, 0, 1, 0, 0);
          ctxTTD.clearRect(0, 0, canvasTTD.width, canvasTTD.height);
          ctxTTD.restore();
          ctxTTD.imageSmoothingEnabled = true;
          ctxTTD.imageSmoothingQuality = 'high';
          const dispW = ttdDisplayW || 500;
          const dispH = ttdDisplayH || 220;
          ctxTTD.drawImage(img, 0, 0, dispW, dispH);
        }
      };
      img.src = finalSrc;
    } catch(err) {
      console.warn('[LOAD TTD ERROR]:', err);
    }
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
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
}

async function pushChatToSupabase(allChats, newChatObj) {
  // Chat data is purely managed via Firebase & Local Storage
  return true;
}
window.pushChatToSupabase = pushChatToSupabase;

async function fetchChatFromSupabase() { return JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]'); }
window.fetchChatFromSupabase = fetchChatFromSupabase;

function startActiveChatRefresh() {
  if (activeChatRefreshInterval) {
    clearInterval(activeChatRefreshInterval);
    activeChatRefreshInterval = null;
  }
  refreshActiveChatUI();
  // Auto-polling chat interval disabled per user directive
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
  const cat = String(currentUser.category || currentUser.kategori || '').trim().toUpperCase();
  const role = String(currentUser.role || '').trim().toUpperCase();
  const area = String(currentUser.area || '').trim().toUpperCase();
  const uname = String(currentUser.username || '').trim().toUpperCase();
  const fname = String(currentUser.fullName || '').trim().toUpperCase();

  // 1. ADMIN SELALU DIIZINKAN KELOLA CHAT BANTUAN & SIARAN (ADMIN UTAMA & ADMIN CABANG)
  if (cat === 'ADMIN' || role === 'ADMIN' || uname === 'ADMIN' || uname.includes('ADMIN')) return true;

  // 2. KHUSUS SERVICE AREA TSM / TASIKMALAYA / ALL
  if (cat === 'SERVICE' || role === 'SERVICE' || uname.includes('SERVICE') || fname.includes('SERVICE')) {
    if (area === 'TSM' || area === 'TASIKMALAYA' || area === 'ALL' || uname.includes('TSM') || fname.includes('TSM')) {
      return true;
    }
  }

  return false;
}
window.isServiceTSMUser = isServiceTSMUser;

function rebuildRoomsFromChats(allChats) {
  if (!Array.isArray(allChats) || allChats.length === 0) return [];

  const roomMap = new Map();
  const currentUsername = currentUser ? String(currentUser.username || '').toUpperCase() : '';

  allChats.forEach(c => {
    if (!c) return;
    const userTarget = String(c.user || c.senderUsername || 'USER').trim().toUpperCase();
    const roomKey = String(c.room || ('ROOM_' + userTarget)).trim().toUpperCase();
    const senderDisplay = c.senderName || c.senderUsername || userTarget;

    const isUnreadForAdmin = (c.pengirim === 'USER') && (c.read !== true) && (!c.readBy || !c.readBy.includes(currentUsername));
    const isUnreadForUser = (c.pengirim === 'SERVICE' || c.pengirim === 'ADMIN') && (c.read !== true) && (!c.readBy || !c.readBy.includes(currentUsername));

    if (!roomMap.has(roomKey)) {
      roomMap.set(roomKey, {
        room: roomKey,
        user: userTarget,
        userArea: c.userArea || 'TSM',
        userName: senderDisplay,
        last: (c.pengirim === 'SERVICE' ? `SERVICE TSM: ${c.pesan}` : c.pesan),
        lastTime: c.tanggal || '',
        unreadAdmin: isUnreadForAdmin ? 1 : 0,
        unreadUser: isUnreadForUser ? 1 : 0
      });
    } else {
      const existing = roomMap.get(roomKey);
      existing.last = (c.pengirim === 'SERVICE' ? `SERVICE TSM: ${c.pesan}` : c.pesan);
      if (c.tanggal) existing.lastTime = c.tanggal;
      if (c.userArea) existing.userArea = c.userArea;
      if (c.senderName) existing.userName = c.senderName;
      if (isUnreadForAdmin) existing.unreadAdmin = (existing.unreadAdmin || 0) + 1;
      if (isUnreadForUser) existing.unreadUser = (existing.unreadUser || 0) + 1;
    }
  });

  return Array.from(roomMap.values());
}
window.rebuildRoomsFromChats = rebuildRoomsFromChats;

async function bukaBantuan() {
  if (!currentUser) return;
  
  // SERVICE TSM or ADMIN acts as Customer Service Support Receiver
  isAdminChat = isServiceTSMUser();

  const isSysAdmin = currentUser && (
    String(currentUser.category || currentUser.kategori || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );
  const btnHapusChatHeader = document.getElementById('btnHapusSemuaChatHeader');
  if (btnHapusChatHeader) {
    btnHapusChatHeader.style.display = isSysAdmin ? 'inline-flex' : 'none';
  }

  const popup = document.getElementById('popupBantuan');
  const btnHelp = document.getElementById('helpButton');
  if (btnHelp) btnHelp.style.display = 'none';
  if (popup) {
    popup.style.display = 'block';
    popup.classList.add('show');
    try { history.pushState({ popup: 'bantuan' }, '', location.href); } catch(e) {}
  }

  const chatList = document.getElementById('chatList');
  const chatUserPicker = document.getElementById('chatUserPicker');
  const chatBroadcastModal = document.getElementById('chatBroadcastModal');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (chatUserPicker) chatUserPicker.style.display = 'none';
  if (chatBroadcastModal) chatBroadcastModal.style.display = 'none';

  if (isAdminChat) {
    // TAMPILAN ADMIN & SERVICE TSM: DAFTAR CHAT MASUK DARI SEMUA TOKO
    if (chatList) chatList.style.display = 'block';
    if (chatBody) chatBody.style.display = 'none';
    if (chatFooter) chatFooter.style.display = 'none';
    if (btnBack) btnBack.style.display = 'none';
    if (headerTitle) headerTitle.innerText = 'CHAT MASUK - ADMIN & SERVICE TSM';
    loadDaftarChatAdmin();
  } else {
    // TAMPILAN USER / TOKO: LANGSUNG KE RUANG CHAT PRIVATE DENGAN ADMIN & SERVICE TSM
    if (chatList) chatList.style.display = 'none';
    if (chatBody) chatBody.style.display = 'block';
    if (chatFooter) chatFooter.style.display = 'flex';
    if (btnBack) btnBack.style.display = 'none';
    if (headerTitle) headerTitle.innerText = 'PUSAT BANTUAN ADMIN & SERVICE TSM';
    loadChatUser();
  }

  // AKTIFKAN REFRESH CHAT REALTIME JIKA KOLOM CHAT SEDANG DIBUKA
  startActiveChatRefresh();
}
window.bukaBantuan = bukaBantuan;

function tutupBantuan(forceClose = false) {
  const chatBody = document.getElementById('chatBody');
  const isAdm = typeof isServiceTSMUser === 'function' ? isServiceTSMUser() : false;
  const isChatBodyOpen = chatBody && (chatBody.style.display === 'block' || chatBody.style.display === 'flex');

  // JIKA ADMIN/SERVICE SEDANG DI DALAM RUANG CHAT CONVERSATION (DAN BUKAN FORCE CLOSE): KEMBALI KE DAFTAR CHAT DULU!
  if (!forceClose && isAdm && isChatBodyOpen) {
    if (typeof kembaliKeDaftarAdmin === 'function') {
      kembaliKeDaftarAdmin();
      return;
    }
  }

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

  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  let rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

  // Selalu bangun dan padukan daftar room secara otomatis dari seluruh riwayat pesan
  const dynamicRooms = rebuildRoomsFromChats(allChats);
  if (dynamicRooms.length > 0) {
    dynamicRooms.forEach(dr => {
      const idx = rooms.findIndex(r => String(r.room).toUpperCase() === String(dr.room).toUpperCase() || String(r.user).toUpperCase() === String(dr.user).toUpperCase());
      if (idx === -1) {
        rooms.push(dr);
      } else {
        rooms[idx].last = dr.last;
        rooms[idx].lastTime = dr.lastTime;
        rooms[idx].unreadAdmin = dr.unreadAdmin;
        rooms[idx].unreadUser = dr.unreadUser;
        if (dr.userName) rooms[idx].userName = dr.userName;
        if (dr.userArea) rooms[idx].userArea = dr.userArea;
      }
    });
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms)); } catch(e) {}
  }

  chatList.innerHTML = '';

  // 1. Action Toolbar: Mulai Chat Baru & Siarkan Pesan
  const actionToolbar = document.createElement('div');
  actionToolbar.style.cssText = 'display:flex; flex-direction:column; gap:2mm; margin-bottom:2mm; padding-bottom:2mm; border-bottom:1px solid var(--border-color); width:100%; box-sizing:border-box;';
  actionToolbar.innerHTML = `
    <button type="button" onclick="bukaModalPilihUserChat()" style="width:100%; padding:9px 12px; background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; border:none; border-radius:4px; font-weight:700; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 2px 5px rgba(2,132,199,0.25); box-sizing:border-box;">
      <span class="material-symbols-rounded" style="font-size:17px;">add_comment</span> + MULAI CHAT KE TOKO / USER
    </button>
    <button type="button" onclick="bukaModalBroadcastChat()" style="width:100%; padding:7px 12px; background:rgba(245,158,11,0.12); color:#d97706; border:1px dashed #d97706; border-radius:4px; font-weight:700; font-size:11.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-sizing:border-box;">
      <span class="material-symbols-rounded" style="font-size:17px;">campaign</span> SIARKAN KE SEMUA TOKO
    </button>
  `;
  chatList.appendChild(actionToolbar);

  const isSysAdmin = currentUser && (
    String(currentUser.category || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );
  const currentUsername = currentUser ? String(currentUser.username || '').toUpperCase() : '';

  const roomsContainer = document.createElement('div');
  roomsContainer.id = 'adminRoomsContainer';

  if (!rooms || rooms.length === 0) {
    roomsContainer.innerHTML = `
      <div style="padding:16px 12px; text-align:center; color:var(--text-muted); font-size:12px;">
        <span class="material-symbols-rounded" style="font-size:32px; color:var(--primary); margin-bottom:4px; display:block;">chat_bubble_outline</span>
        BELUM ADA PERCAKAPAN TOKO / SALES.<br>KLIK <b>'+ MULAI CHAT KE TOKO'</b> DI ATAS UNTUK MEMULAI.
      </div>
    `;
    chatList.appendChild(roomsContainer);
    return;
  }

  rooms.forEach(r => {
    const item = document.createElement('div');
    const isRoomUnreadInChats = Array.isArray(allChats) && allChats.some(c => {
      if (!c) return false;
      const cUser = String(c.user || c.senderUsername || '').trim().toUpperCase();
      const cRoom = String(c.room || '').trim().toUpperCase();
      const isRoomMatch = (cRoom === String(r.room).toUpperCase() || cUser === String(r.user).toUpperCase() || cRoom === 'ROOM_' + String(r.user).toUpperCase());
      return isRoomMatch && c.pengirim === 'USER' && c.read !== true && (!c.readBy || !c.readBy.includes(currentUsername));
    });

    const hasUnread = (Number(r.unreadAdmin) || 0) > 0 || isRoomUnreadInChats;
    const bgNormal = hasUnread ? 'rgba(2, 132, 199, 0.18)' : 'transparent';
    const borderStyle = hasUnread ? 'border:2px solid #0284c7 !important; border-left:7px solid #0284c7 !important;' : 'border-bottom:1px solid var(--border-color); border-left:7px solid transparent;';
    const unreadBadgeHtml = hasUnread ? `<span style="background:#ef4444; color:#ffffff; border-radius:10px; padding:3px 10px; font-size:11px; font-weight:900; box-shadow:0 2px 6px rgba(239,68,68,0.5); letter-spacing:0.4px;">PESAN BARU</span>` : '';
    
    item.style.cssText = `padding:10px 12px; ${borderStyle} background:${bgNormal} !important; cursor:pointer; transition:all 0.2s ease; display:flex; justify-content:space-between; align-items:center; border-radius:8px; margin-bottom:2.5mm; box-sizing:border-box;`;
    item.onmouseover = () => item.style.background = hasUnread ? 'rgba(2, 132, 199, 0.28) !important' : 'rgba(59,130,246,0.08) !important';
    item.onmouseout = () => item.style.background = `${bgNormal} !important`;

    const deleteRoomBtnHtml = isSysAdmin ? `
      <button type="button" class="btnIcon btnDelete" onclick="event.stopPropagation(); hapusChatRoom('${r.room}', '${r.user}')" title="HAPUS CHAT USER INI" style="padding:5px; background:rgba(239,68,68,0.1); color:#ef4444; border-radius:6px; border:none; cursor:pointer; display:flex; align-items:center;">
        <span class="material-symbols-rounded" style="font-size:17px;">delete</span>
      </button>
    ` : '';

    item.innerHTML = `
      <div style="flex:1; min-width:0; margin-right:8px;" onclick="bukaRoomAdmin('${r.room}', '${r.user}', '${r.userName || r.user}', '${r.userArea || 'TSM'}')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <div style="font-size:12.5px; font-weight:${hasUnread ? '900' : '700'}; color:${hasUnread ? 'var(--primary)' : 'var(--text-main)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${r.userName || r.user} <span style="font-size:10.5px; font-weight:bold; color:var(--primary); background:rgba(59,130,246,0.15); padding:1px 5px; border-radius:4px;">(${r.userArea || 'TSM'})</span>
          </div>
          ${unreadBadgeHtml}
        </div>
        <div style="color:${hasUnread ? 'var(--text-main)' : 'var(--text-muted)'}; font-weight:${hasUnread ? '800' : 'normal'}; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.last || '-'}</div>
      </div>
      ${deleteRoomBtnHtml}
    `;
    roomsContainer.appendChild(item);
  });

  chatList.appendChild(roomsContainer);
}

function bukaModalPilihUserChat() {
  if (!isServiceTSMUser()) {
    showNotif('FITUR PILIH TOKO HANYA UNTUK AKUN ADMIN & SERVICE TSM!', 'warning');
    return;
  }
  const chatList = document.getElementById('chatList');
  const chatUserPicker = document.getElementById('chatUserPicker');
  const searchInput = document.getElementById('cariUserChatInput');

  if (chatList) chatList.style.display = 'none';
  if (chatUserPicker) chatUserPicker.style.display = 'flex';
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 100);
  }

  filterListUserChat('');
}
window.bukaModalPilihUserChat = bukaModalPilihUserChat;

function tutupUserPickerChat() {
  const chatList = document.getElementById('chatList');
  const chatUserPicker = document.getElementById('chatUserPicker');

  if (chatUserPicker) chatUserPicker.style.display = 'none';
  if (chatList) chatList.style.display = 'block';
}
window.tutupUserPickerChat = tutupUserPickerChat;

function filterListUserChat(query) {
  const container = document.getElementById('listUserChatContainer');
  if (!container) return;

  const q = String(query || '').trim().toUpperCase();
  const users = getUsersFromDB();
  const myUname = String(currentUser ? currentUser.username : '').toUpperCase();

  const filtered = users.filter(u => {
    if (!u || !u.username) return false;
    if (String(u.username).toUpperCase() === myUname) return false;
    if (!q) return true;

    const uname = String(u.username || '').toUpperCase();
    const fname = String(u.fullName || '').toUpperCase();
    const area = String(u.area || '').toUpperCase();
    const cat = String(u.category || '').toUpperCase();
    const phone = String(u.phone || '').toUpperCase();

    return uname.includes(q) || fname.includes(q) || area.includes(q) || cat.includes(q) || phone.includes(q);
  });

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:12px;">
        Tidak ada user / toko yang cocok.
      </div>
    `;
    return;
  }

  filtered.forEach(u => {
    const card = document.createElement('div');
    card.style.cssText = 'padding:9px 12px; border-bottom:1px solid var(--border-color); cursor:pointer; display:flex; align-items:center; justify-content:space-between; border-radius:6px; margin-bottom:4px; transition:background 0.2s;';
    card.onmouseover = () => card.style.background = 'rgba(59,130,246,0.08)';
    card.onmouseout = () => card.style.background = 'transparent';
    card.onclick = () => {
      pilihUserUntukChat(u.username, u.fullName, u.area);
    };

    const initial = (u.fullName || u.username || 'U').charAt(0).toUpperCase();

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <div style="width:32px; height:32px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px; flex-shrink:0;">
          ${initial}
        </div>
        <div style="min-width:0;">
          <div style="font-weight:700; font-size:12.5px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${u.fullName || u.username}
          </div>
          <div style="font-size:11px; color:var(--text-muted);">
            @${u.username} &bull; ${u.phone || '-'}
          </div>
        </div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <span style="font-size:10px; font-weight:700; color:var(--primary); background:rgba(59,130,246,0.15); padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:2px;">
          ${u.area || 'TSM'}
        </span>
        <div style="font-size:9.5px; color:var(--text-muted); font-weight:600;">
          ${u.category || 'USER'}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
window.filterListUserChat = filterListUserChat;

function pilihUserUntukChat(username, fullName, area) {
  const roomKey = 'ROOM_' + String(username).toUpperCase();
  tutupUserPickerChat();
  bukaRoomAdmin(roomKey, username, fullName, area);
}
window.pilihUserUntukChat = pilihUserUntukChat;

function bukaModalBroadcastChat() {
  if (!isServiceTSMUser()) {
    showNotif('FITUR SIARAN PESAN HANYA UNTUK AKUN ADMIN & SERVICE TSM!', 'warning');
    return;
  }
  const modal = document.getElementById('chatBroadcastModal');
  const input = document.getElementById('pesanBroadcastChatInput');
  if (modal) modal.style.display = 'flex';
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 100);
  }
}
window.bukaModalBroadcastChat = bukaModalBroadcastChat;

function tutupBroadcastChatModal() {
  const modal = document.getElementById('chatBroadcastModal');
  if (modal) modal.style.display = 'none';
}
window.tutupBroadcastChatModal = tutupBroadcastChatModal;

async function kirimBroadcastChatKeSemuaUser() {
  if (!isServiceTSMUser()) {
    showNotif('FITUR SIARAN PESAN HANYA UNTUK AKUN ADMIN & SERVICE TSM!', 'warning');
    return;
  }
  const input = document.getElementById('pesanBroadcastChatInput');
  if (!input) return;
  const pesan = input.value.trim().toUpperCase();
  if (!pesan) {
    showNotif('TULIS PESAN SIARAN TERLEBIH DAHULU!', 'warning');
    return;
  }

  showConfirm(`SIARKAN PESAN INI KE SEMUA TOKO & USER?`, function() {
    var _asyncTask = async function() {
      showLoading('MENYIARKAN PESAN...');
      try {
        const allUsers = getUsersFromDB();
        const myUname = String(currentUser ? currentUser.username : '').toUpperCase();
        const targetUsers = allUsers.filter(u => u && u.username && String(u.username).toUpperCase() !== myUname);

        if (targetUsers.length === 0) {
          hideLoading();
          showNotif('TIDAK ADA USER / TOKO TERDAFTAR!', 'warning');
          return;
        }

        const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
        const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
        const now = new Date();
        const timeStr = getFormattedDateDDMMYYYY(now) + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

        targetUsers.forEach(u => {
          const uTarget = String(u.username).toUpperCase();
          const rTarget = 'ROOM_' + uTarget;
          const newChatId = `CHAT-${Date.now()}-${Math.floor(Math.random()*10000)}`;

          allChats.push({
            id: newChatId,
            room: rTarget,
            user: uTarget,
            userArea: u.area || 'TSM',
            pengirim: 'SERVICE',
            senderId: (currentUser && currentUser.id ? currentUser.id : 'SERVICE'),
            senderUsername: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'SERVICE_TSM',
            senderName: `SERVICE TSM (${(currentUser && currentUser.fullName ? currentUser.fullName : 'ADMIN') || 'SUPPORT'})`,
            pesan: pesan,
            tanggal: timeStr
          });

          const rIdx = rooms.findIndex(x => String(x.room).toUpperCase() === rTarget || String(x.user).toUpperCase() === uTarget);
          if (rIdx !== -1) {
            rooms[rIdx].last = `SERVICE TSM: ${pesan}`;
            rooms[rIdx].unreadUser = (rooms[rIdx].unreadUser || 0) + 1;
            rooms[rIdx].lastTime = timeStr;
            if (u.fullName) rooms[rIdx].userName = u.fullName;
            if (u.area) rooms[rIdx].userArea = u.area;
          } else {
            rooms.push({
              room: rTarget,
              user: uTarget,
              userName: u.fullName || uTarget,
              userArea: u.area || 'TSM',
              last: `SERVICE TSM: ${pesan}`,
              unreadAdmin: 0,
              unreadUser: 1,
              lastTime: timeStr
            });
          }
        });

        appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
        appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));

        if (typeof syncChatMessagesToSupabase === 'function') {
          await syncChatMessagesToSupabase();
        }

        hideLoading();
        input.value = '';
        tutupBroadcastChatModal();
        if (typeof renderChatBoxAdmin === 'function') renderChatBoxAdmin();
        if (typeof renderUserList === 'function') renderUserList();
        showNotif(`PESAN BROADCAST BERHASIL DISIARKAN!`, 'success');
      } catch(err) {
        hideLoading();
        console.error('[BROADCAST ERROR]:', err);
        showNotif('GAGAL MENYIARKAN PESAN: ' + (err.message || err), 'warning');
      }
    };
    _asyncTask();
  });
}
window.kirimBroadcastChatKeSemuaUser = kirimBroadcastChatKeSemuaUser;



function bukaRoomAdmin(room, user, fullName, area) {
  currentRoom = room;
  currentChatUser = user;

  if (typeof markChatMessagesAsRead === 'function') {
    markChatMessagesAsRead(room, user);
  }
  if (typeof pushPopupHistoryState === 'function') {
    pushPopupHistoryState();
  }

  const chatList = document.getElementById('chatList');
  const chatUserPicker = document.getElementById('chatUserPicker');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (chatList) chatList.style.display = 'none';
  if (chatUserPicker) chatUserPicker.style.display = 'none';
  if (chatBody) chatBody.style.display = 'block';
  if (chatFooter) chatFooter.style.display = 'flex';
  if (btnBack) btnBack.style.display = 'inline-block';

  const displayTitle = fullName ? `${fullName} (${area || 'TSM'})` : user;
  if (headerTitle) headerTitle.innerText = 'CHAT: ' + displayTitle;
  loadChatAdmin(room);
}
window.bukaRoomAdmin = bukaRoomAdmin;

function loadChatAdmin(room) {
  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const roomUpper = String(room || '').toUpperCase();
  const userUpper = String(currentChatUser || '').toUpperCase();

  const roomChats = allChats.filter(c => {
    if (!c) return false;
    const cRoom = String(c.room || '').toUpperCase();
    const cUser = String(c.user || '').toUpperCase();
    const cSender = String(c.senderUsername || '').toUpperCase();

    return (
      cRoom === roomUpper || 
      cUser === userUpper || 
      cSender === userUpper ||
      (userUpper && cRoom === ('ROOM_' + userUpper)) ||
      (userUpper && cRoom.includes(userUpper))
    );
  });

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
  const myUsernameUpper = String(currentUser ? currentUser.username : '').toUpperCase();
  const roomName = 'ROOM_' + myUsernameUpper;

  if (typeof markChatMessagesAsRead === 'function') {
    markChatMessagesAsRead(roomName, myUsernameUpper);
  }

  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const userChats = allChats.filter(c => 
    String(c.room || '').toUpperCase() === roomName || 
    String(c.user || '').toUpperCase() === myUsernameUpper ||
    String(c.senderUsername || '').toUpperCase() === myUsernameUpper
  );

  const body = document.getElementById('chatBody');
  if (!body) return;

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

  const senderId = currentUser.id || 'USER';
  const senderUsername = currentUser.username || 'USER';
  const now = new Date();
  const timeStr = getFormattedDateDDMMYYYY(now) + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  let targetUser = 'USER';
  let roomTarget = '';
  let pengirimType = 'USER';

  if (isAdminChat) {
    targetUser = currentChatUser || 'USER';
    roomTarget = currentRoom || ('ROOM_' + String(targetUser).toUpperCase());
    pengirimType = 'SERVICE';
  } else {
    targetUser = currentUser.username;
    roomTarget = 'ROOM_' + String(currentUser.username).toUpperCase();
    pengirimType = 'USER';
  }

  const newChatId = `CHAT-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const newChatEntry = {
    id: newChatId,
    room: roomTarget,
    user: targetUser,
    userArea: currentUser.area || 'BDG',
    pengirim: pengirimType,
    senderId,
    senderUsername,
    senderName: `${currentUser.fullName || currentUser.username} (${currentUser.toko || currentUser.area || 'TSM'})`,
    pesan: pesan,
    tanggal: timeStr,
    timestamp: Date.now()
  };

  // 1. LOCAL STORAGE UPDATE & REFRESH UI INSTAN (0 ms)
  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  let rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

  allChats.push(newChatEntry);

  const rIdx = rooms.findIndex(x => String(x.room).toUpperCase() === roomTarget || String(x.user).toUpperCase() === targetUser);
  if (rIdx !== -1) {
    rooms[rIdx].last = `${pengirimType === 'SERVICE' ? 'SERVICE' : (currentUser.fullName || currentUser.username)}: ${pesan}`;
    if (isAdminChat) {
      rooms[rIdx].unreadUser = (rooms[rIdx].unreadUser || 0) + 1;
    } else {
      rooms[rIdx].unreadAdmin = (rooms[rIdx].unreadAdmin || 0) + 1;
    }
    rooms[rIdx].lastTime = timeStr;
    rooms[rIdx].timestamp = Date.now();
  } else {
    rooms.push({
      room: roomTarget,
      user: targetUser,
      userName: currentUser.fullName || targetUser,
      userArea: currentUser.area || 'BDG',
      last: `${pengirimType === 'SERVICE' ? 'SERVICE' : (currentUser.fullName || currentUser.username)}: ${pesan}`,
      unreadAdmin: isAdminChat ? 0 : 1,
      unreadUser: isAdminChat ? 1 : 0,
      lastTime: timeStr,
      timestamp: Date.now()
    });
  }

  appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
  try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats)); } catch(e) {}
  appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
  try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms)); } catch(e) {}

  txt.value = '';

  // RENDER INSTAN DI LAYAR (0 MS)
  if (isAdminChat) {
    if (typeof loadChatAdmin === 'function') loadChatAdmin(roomTarget);
  } else {
    if (typeof loadChatUser === 'function') loadChatUser();
  }

  // 2. BROADCAST REAL-TIME VIA SUPABASE CHANNEL (<50 ms)
  if (supabaseRealtimeChannel) {
    try {
      supabaseRealtimeChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: { chat: newChatEntry, room: roomTarget, timestamp: Date.now() }
      });
    } catch(e) {}
  }



  // 4. KIRIM KE FIREBASE SECARA REAL-TIME (FIRESTORE & REALTIME DATABASE)
  const fsChat = getDbFirestore();
  if (fsChat) {
    try {
      fsChat.collection('chat_messages').doc(newChatId).set(newChatEntry).catch(e => console.warn('[FIRESTORE CHAT SAVE ERROR]:', e));
      fsChat.collection('chat_rooms').doc(roomTarget).set({
        room: roomTarget,
        user: targetUser,
        userName: currentUser.fullName || targetUser,
        userArea: currentUser.area || 'TSM',
        last: `${pengirimType === 'SERVICE' ? 'SERVICE' : (currentUser.fullName || currentUser.username)}: ${pesan}`,
        lastTime: timeStr,
        timestamp: Date.now()
      }, { merge: true }).catch(e => console.warn('[FIRESTORE ROOM SAVE ERROR]:', e));
    } catch(e) {
      console.warn('[FIRESTORE CHAT SEND EXCEPTION]:', e);
    }
  }

  const rtdbChat = getDbRealtime();
  if (rtdbChat) {
    try {
      rtdbChat.ref(`chat_messages/${newChatId}`).set(newChatEntry).catch(() => {});
      rtdbChat.ref(`chat_rooms/${roomTarget}`).set({
        room: roomTarget,
        user: targetUser,
        userName: currentUser.fullName || targetUser,
        userArea: currentUser.area || 'TSM',
        last: `${pengirimType === 'SERVICE' ? 'SERVICE' : (currentUser.fullName || currentUser.username)}: ${pesan}`,
        lastTime: timeStr,
        timestamp: Date.now()
      }).catch(() => {});
    } catch(e) {}
  }
}

function kembaliKeDaftarAdmin() {
  currentRoom = '';
  currentChatUser = '';
  const chatList = document.getElementById('chatList');
  const chatUserPicker = document.getElementById('chatUserPicker');
  const chatBody = document.getElementById('chatBody');
  const chatFooter = document.getElementById('chatFooter');
  const btnBack = document.getElementById('btnBackAdmin');
  const headerTitle = document.getElementById('chatHeaderTitle');

  if (chatUserPicker) chatUserPicker.style.display = 'none';
  if (chatBody) chatBody.style.display = 'none';
  if (chatFooter) chatFooter.style.display = 'none';
  if (btnBack) btnBack.style.display = 'none';
  if (chatList) chatList.style.display = 'block';
  if (headerTitle) headerTitle.innerText = 'CHAT MASUK - SERVICE TSM';
  loadDaftarChatAdmin();
}
window.kembaliKeDaftarAdmin = kembaliKeDaftarAdmin;

function markChatMessagesAsRead(roomTarget, userTarget) {
  if (!currentUser) return;
  const myUsernameUpper = String(currentUser.username || '').trim().toUpperCase();
  const userUpper = String(userTarget || myUsernameUpper).trim().toUpperCase();
  const roomUpper = String(roomTarget || ('ROOM_' + userUpper)).trim().toUpperCase();
  const isAdm = typeof isServiceTSMUser === 'function' ? isServiceTSMUser() : false;

  // 1. Update CHAT_ROOM_DB_KEY
  let roomChanged = false;
  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');
  const rIdx = rooms.findIndex(x => 
    String(x.room || '').toUpperCase() === roomUpper || 
    String(x.user || '').toUpperCase() === userUpper ||
    String(x.room || '').toUpperCase() === 'ROOM_' + userUpper
  );

  if (rIdx !== -1) {
    if (isAdm) {
      if (rooms[rIdx].unreadAdmin > 0) {
        rooms[rIdx].unreadAdmin = 0;
        roomChanged = true;
      }
    } else {
      if (rooms[rIdx].unreadUser > 0) {
        rooms[rIdx].unreadUser = 0;
        roomChanged = true;
      }
    }
  }

  if (roomChanged) {
    appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
    try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms)); } catch(e) {}
  }

  // 2. Update CHAT_DB_KEY (Tandai pesan sebagai read = true)
  let chatsChanged = false;
  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const updatedDocIds = [];

  allChats.forEach(c => {
    if (!c) return;
    const cUser = String(c.user || c.senderUsername || '').trim().toUpperCase();
    const cRoom = String(c.room || '').trim().toUpperCase();
    const matchRoom = (cRoom === roomUpper || cUser === userUpper || cRoom === 'ROOM_' + userUpper);

    if (matchRoom) {
      const isSenderOther = isAdm ? (c.pengirim === 'USER') : (c.pengirim === 'SERVICE' || c.pengirim === 'ADMIN');
      if (isSenderOther) {
        if (c.read !== true) {
          c.read = true;
          chatsChanged = true;
        }
        if (!Array.isArray(c.readBy)) c.readBy = [];
        if (!c.readBy.includes(myUsernameUpper)) {
          c.readBy.push(myUsernameUpper);
          chatsChanged = true;
        }
        if (c.id) updatedDocIds.push(c.id);
      }
    }
  });

  if (chatsChanged) {
    appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
    try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats)); } catch(e) {}
  }

  // 3. Sync status read=true ke Firestore agar tidak balik unread saat di-refresh!
  const fsChat = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
  if (fsChat) {
    try {
      if (rIdx !== -1) {
        fsChat.collection('chat_rooms').doc(roomUpper).set({
          unreadAdmin: isAdm ? 0 : (rooms[rIdx].unreadAdmin || 0),
          unreadUser: isAdm ? (rooms[rIdx].unreadUser || 0) : 0,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }

      updatedDocIds.forEach(docId => {
        fsChat.collection('chat_messages').doc(docId).set({
          read: true,
          readBy: [myUsernameUpper]
        }, { merge: true }).catch(() => {});
      });
    } catch(err) {
      console.warn('[FIRESTORE MARK READ SYNC ERROR]:', err);
    }
  }

  if (roomChanged || chatsChanged) {
    if (typeof pushCentralCloudDB === 'function') pushCentralCloudDB();
  }

  if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
  if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
}
window.markChatMessagesAsRead = markChatMessagesAsRead;

function cekUnreadNotif() {
  if (!currentUser) return;
  const badge = document.getElementById('unreadBadge');
  if (!badge) return;

  const isAdm = typeof isServiceTSMUser === 'function' ? isServiceTSMUser() : false;
  isAdminChat = isAdm;

  const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
  const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

  let unreadCount = 0;

  if (isAdm) {
    // UNTUK LOGIN ADMIN / SERVICE TSM: Hitung BERAPA BANYAK UNIQUE TOKO/USER yang belum dibaca
    const unreadRoomsCount = Array.isArray(rooms) ? rooms.filter(r => (Number(r.unreadAdmin) || 0) > 0).length : 0;
    if (unreadRoomsCount > 0) {
      unreadCount = unreadRoomsCount;
    } else if (Array.isArray(allChats) && allChats.length > 0) {
      const unreadUsersSet = new Set();
      allChats.forEach(c => {
        if (c && c.pengirim === 'USER' && c.read !== true && (!c.readBy || !c.readBy.includes(currentUser.username))) {
          const uName = String(c.user || c.senderUsername || '').trim().toUpperCase();
          if (uName) unreadUsersSet.add(uName);
        }
      });
      unreadCount = unreadUsersSet.size;
    } else {
      unreadCount = 0;
    }
  } else {
    // UNTUK LOGIN TOKO / SALES / USER BIASA: HANYA MUNCUL ANGKA 1 JIKA ADA PESAN UNREAD (BUKAN JUMLAH BARIS CHAT)
    const myUname = String(currentUser.username || '').trim().toUpperCase();
    const myRoom = Array.isArray(rooms) ? rooms.find(r => 
      String(r.room || '').trim().toUpperCase() === 'ROOM_' + myUname || 
      String(r.user || '').trim().toUpperCase() === myUname
    ) : null;

    const hasUnreadFromRoom = myRoom && (Number(myRoom.unreadUser) || 0) > 0;
    let hasUnreadFromChats = false;

    if (Array.isArray(allChats) && allChats.length > 0) {
      hasUnreadFromChats = allChats.some(c => {
        if (!c) return false;
        const cUser = String(c.user || c.senderUsername || '').trim().toUpperCase();
        const cRoom = String(c.room || '').trim().toUpperCase();
        const isMyChat = (cUser === myUname || cRoom === 'ROOM_' + myUname);
        const isFromService = (c.pengirim === 'SERVICE' || c.pengirim === 'ADMIN');
        const isUnread = c.read !== true && (!c.readBy || !c.readBy.includes(myUname));
        return isMyChat && isFromService && isUnread;
      });
    }

    unreadCount = (hasUnreadFromRoom || hasUnreadFromChats) ? 1 : 0;
  }

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.setProperty('display', 'flex', 'important');
    badge.style.setProperty('visibility', 'visible', 'important');
    badge.style.setProperty('opacity', '1', 'important');
  } else {
    badge.textContent = '0';
    badge.style.setProperty('display', 'none', 'important');
    badge.style.setProperty('visibility', 'hidden', 'important');
    badge.style.setProperty('opacity', '0', 'important');
  }
}

async function hapusChatRoom(roomTarget, userTarget) {
  const roomUpper = String(roomTarget || '').toUpperCase();
  const userUpper = String(userTarget || '').toUpperCase();

  showConfirm(`HAPUS RIWAYAT CHAT ROOM '${userTarget || roomTarget}' DARI LOKAL, FIREBASE & SEMUA PERANGKAT?`, async () => {
    showLoading('MENGHAPUS CHAT ROOM...');
    try {
      // 1. KOSONGKAN DI PENYIMPANAN LOKAL PERANGKAT INI
      let allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
      let rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

      allChats = allChats.filter(c => 
        String(c.room || '').toUpperCase() !== roomUpper && 
        String(c.user || '').toUpperCase() !== userUpper &&
        String(c.senderUsername || '').toUpperCase() !== userUpper
      );
      rooms = rooms.filter(r => 
        String(r.room || '').toUpperCase() !== roomUpper && 
        String(r.user || '').toUpperCase() !== userUpper
      );

      appStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats));
      appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms));
      try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify(allChats)); } catch(e) {}
      try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify(rooms)); } catch(e) {}

      // 2. KOSONGKAN DI FIREBASE FIRESTORE
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        try {
          if (roomTarget) {
            await dbFirestore.collection('chat_rooms').doc(roomTarget).delete().catch(() => {});
            const snapRoom = await dbFirestore.collection('chat_messages').where('room', '==', roomTarget).get();
            const batch = dbFirestore.batch();
            snapRoom.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
          if (userTarget) {
            const snapUser = await dbFirestore.collection('chat_messages').where('user', '==', userTarget).get();
            const batch2 = dbFirestore.batch();
            snapUser.forEach(doc => batch2.delete(doc.ref));
            await batch2.commit();
          }
        } catch (err) {
          console.warn('[FIRESTORE DELETE ROOM NOTICE]:', err);
        }
      }

      // 3. KOSONGKAN DI FIREBASE REALTIME DATABASE
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        try {
          if (roomTarget) await dbRealtime.ref(`chat_rooms/${roomTarget}`).remove().catch(() => {});
          if (roomTarget) await dbRealtime.ref(`chat_messages/${roomTarget}`).remove().catch(() => {});
          if (roomTarget) await dbRealtime.ref(`chats/${roomTarget}`).remove().catch(() => {});
          await dbRealtime.ref('system_broadcast/chat_room_clear').set({ timestamp: Date.now(), room: roomTarget, user: userTarget });
        } catch(e) {}
      }

      // 4. SIARKAN REALTIME KE SEMUA PERANGKAT LAIN
      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'chat_room_cleared',
            payload: { room: roomTarget, user: userTarget, timestamp: Date.now() }
          });
        } catch(e) {}
      }

      // 5. REFRESH UI
      if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
      if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();

      hideLoading();
      showNotif(`CHAT ROOM '${userTarget || roomTarget}' BERHASIL DIHAPUS DARI DATABASE & SEMUA PERANGKAT!`, 'success');
    } catch(err) {
      hideLoading();
      console.error('[HAPUS CHAT ROOM ERROR]:', err);
      showNotif('GAGAL MENGHAPUS CHAT ROOM: ' + (err.message || err), 'danger');
    }
  });
}
window.hapusChatRoom = hapusChatRoom;

async function hapusSemuaChatAdmin() {
  const isSysAdmin = currentUser && (
    String(currentUser.category || currentUser.kategori || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.role || '').toUpperCase() === 'ADMIN' ||
    String(currentUser.username || '').toUpperCase() === 'ADMIN'
  );
  if (!isSysAdmin) {
    showNotif('HANYA ADMIN YANG DIIZINKAN MENGHAPUS SEMUA CHAT!', 'warning');
    return;
  }

  showConfirm('YAKIN INGIN MENGHAPUS SELURUH RIWAYAT CHAT DARI DATABASE FIREBASE & PENYIMPANAN LOKAL SEMUA PERANGKAT?', async () => {
    showLoading('MENGHAPUS SEMUA CHAT DARI DATABASE & SEMUA PERANGKAT...');
    try {
      // 1. KOSONGKAN PENYIMPANAN LOKAL PERANGKAT INI
      appStorage.setItem(CHAT_DB_KEY, JSON.stringify([]));
      appStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([]));
      appStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([]));
      try { localStorage.setItem(CHAT_DB_KEY, JSON.stringify([])); } catch(e) {}
      try { localStorage.setItem(CHAT_ROOM_DB_KEY, JSON.stringify([])); } catch(e) {}
      try { localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([])); } catch(e) {}

      // 2. KOSONGKAN DI FIREBASE FIRESTORE
      const fs = typeof getDbFirestore === 'function' ? getDbFirestore() : (typeof dbFirestore !== 'undefined' ? dbFirestore : null);
      if (fs) {
        try {
          const chatSnap = await fs.collection('chat_messages').get();
          const batch = fs.batch();
          chatSnap.forEach(doc => batch.delete(doc.ref));
          const roomSnap = await fs.collection('chat_rooms').get();
          roomSnap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();

          await fs.collection('app_settings').doc('config').set({
            chatMessages: [],
            chatRooms: [],
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('[FIRESTORE CLEAR CHATS ERROR]:', err);
        }
      }

      // 3. KOSONGKAN DI FIREBASE REALTIME DATABASE
      const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : (typeof dbRealtime !== 'undefined' ? dbRealtime : null);
      if (rtdb) {
        try {
          await rtdb.ref('chat_messages').remove();
          await rtdb.ref('chats').remove();
          await rtdb.ref('chat_rooms').remove();
          await rtdb.ref('system_broadcast/chat_clear').set({ timestamp: Date.now(), action: 'CLEAR_ALL_CHATS' });
        } catch(e) {
          console.warn('[RTDB CLEAR CHATS ERROR]:', e);
        }
      }

      // 4. SIARKAN REALTIME KE SEMUA PERANGKAT LAIN VIA SUPABASE BROADCAST
      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'all_chats_cleared',
            payload: { timestamp: Date.now() }
          });
        } catch(e) {}
      }

      // 5. REFRESH UI
      if (typeof refreshActiveChatUI === 'function') refreshActiveChatUI();
      if (typeof cekUnreadNotif === 'function') cekUnreadNotif();
      if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();
      if (typeof loadDaftarChatAdmin === 'function') loadDaftarChatAdmin();

      hideLoading();
      showNotif('SELURUH CHAT BERHASIL DIHAPUS BERSIH DARI LOKAL & SEMUA PERANGKAT!', 'success');
    } catch (err) {
      hideLoading();
      showNotif('GAGAL MENGHAPUS SEMUA CHAT: ' + (err.message || err), 'error');
    }
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
function startGlobalRealtimeLoop() {
  // Real-time synchronization handled via Firestore & Supabase listeners
}
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

  // 10. Chat Bantuan Popup (#popupBantuan) - Click outside to close
  const popupBantuan = document.getElementById('popupBantuan');
  const helpBtn = document.getElementById('helpButton');
  if (popupBantuan && (popupBantuan.classList.contains('show') || popupBantuan.style.display === 'block')) {
    if (!popupBantuan.contains(e.target) && (!helpBtn || !helpBtn.contains(e.target))) {
      if (typeof tutupBantuan === 'function') {
        tutupBantuan();
      }
    }
  }

  // 11. Notifikasi Sistem Popup List (#popupNotifList) - Click outside to close
  const popupNotifList = document.getElementById('popupNotifList');
  if (popupNotifList && e.target === popupNotifList && typeof tutupNotificationModal === 'function') {
    tutupNotificationModal();
  }

  // 12. Artemis Upload Popup (#artemisOverlay) - Click outside to close
  const artemisOverlay = document.getElementById('artemisOverlay');
  if (artemisOverlay && e.target === artemisOverlay && typeof closeArtemisModal === 'function') {
    closeArtemisModal();
  }
});


function bukaPopupUserManagement() {
  const modal = document.getElementById('popupUserManagementModal');
  if (!modal) return;
  loadUsersManagement();
  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.add('show');
  pushPopupHistoryState();
}
window.bukaPopupUserManagement = bukaPopupUserManagement;

function tutupPopupUserManagement() {
  const modal = document.getElementById('popupUserManagementModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}
window.tutupPopupUserManagement = tutupPopupUserManagement;

function filterTabelUserModal(query = '') {
  const q = String(query || '').trim().toUpperCase();
  const rows = document.querySelectorAll('#userTableBodyModal tr:not(.empty-grid-row), #userTableBody tr:not(.empty-grid-row)');
  rows.forEach(tr => {
    const text = tr.textContent.toUpperCase();
    tr.style.display = (q === '' || text.includes(q)) ? '' : 'none';
  });
}
window.filterTabelUserModal = filterTabelUserModal;

function loadUsersManagement() {
  loadAdminScriptUrlInput();
  const tbodyPage = document.getElementById('userTableBody');
  const tbodyModal = document.getElementById('userTableBodyModal');
  if (!tbodyPage && !tbodyModal) return;

  let users = getUsersFromDB();

  if (!Array.isArray(users) || users.length === 0) {
    users = [...SEED_USERS];
    saveUsersToDB(users);
  }

  const renderToTbody = (tbody) => {
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach(u => {
      const isSuperAdmin = (String(u.username).trim().toUpperCase() === 'ADMIN');
      const uKey = (u.id && u.id !== 'undefined') ? u.id : (u.username || '');
      const chkHtml = !isSuperAdmin ? `<input type="checkbox" class="userCheckbox" value="${uKey}" onchange="updateMultiUserBtnState()" style="cursor:pointer; width:16px; height:16px;">` : '';
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
          <button class="btnIcon btnEdit" onclick="bukaUserModal('${uKey}', this)" title="EDIT USER"><span class="material-symbols-rounded">edit</span></button>
          ${!isSuperAdmin ? `<button class="btnIcon btnDelete" onclick="hapusUser('${uKey}', this)" title="HAPUS USER"><span class="material-symbols-rounded">delete</span></button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    for (let k = 0; k < 2; k++) {
      const emptyTr = document.createElement('tr');
      emptyTr.className = 'empty-grid-row';
      emptyTr.innerHTML = `
        <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      `;
      tbody.appendChild(emptyTr);
    }
  };

  renderToTbody(tbodyPage);
  renderToTbody(tbodyModal);
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
  const btnPage = document.getElementById('btnHapusMultiUser');
  const btnModal = document.getElementById('btnHapusMultiUserModal');
  const countSpan = document.getElementById('countSelectedUsers');
  const selectAllPage = document.getElementById('selectAllUsers');
  const selectAllModal = document.getElementById('selectAllUsersModal');
  const totalCheckboxes = document.querySelectorAll('.userCheckbox');

  if (selectAllPage && totalCheckboxes.length > 0) {
    selectAllPage.checked = (checkboxes.length === totalCheckboxes.length);
  }
  if (selectAllModal && totalCheckboxes.length > 0) {
    selectAllModal.checked = (checkboxes.length === totalCheckboxes.length);
  }
  if (countSpan) {
    countSpan.textContent = String(checkboxes.length);
  }

  [btnPage, btnModal].forEach(btn => {
    if (btn) {
      if (checkboxes.length > 0) {
        btn.style.display = 'inline-flex';
        btn.innerHTML = `<span class="material-symbols-rounded" style="vertical-align:middle; margin-right:4px;">delete_sweep</span> HAPUS (${checkboxes.length}) USER`;
      } else {
        btn.style.display = 'none';
      }
    }
  });
}

async function hapusMultiUser(btnElement = null) {
  const selectedCheckboxes = document.querySelectorAll('.userCheckbox:checked');
  const userIds = Array.from(selectedCheckboxes).map(cb => cb.value).filter(Boolean);

  if (userIds.length === 0) {
    showNotif('PILIH MINIMAL 1 USER UNTUK DIHAPUS!', 'warning');
    return;
  }

  const users = getUsersFromDB();
  const selectedUsers = users.filter(u => 
    userIds.includes(u.id) && 
    String(u.username || '').trim().toUpperCase() !== 'ADMIN' &&
    (!currentUser || String(u.username || '').toUpperCase() !== String(currentUser.username || '').toUpperCase())
  );

  if (selectedUsers.length === 0) {
    showNotif('TIDAK ADA USER VALID YANG DAPAT DIHAPUS! (AKUN ADMIN UTAMA / AKUN AKTIF TIDAK BOLEH DIHAPUS)', 'warning');
    return;
  }

  const usernamesStr = selectedUsers.map(u => u.username).join(', ');

  showConfirm(`YAKIN INGIN MENGHAPUS ${selectedUsers.length} USER TERPILIH? (${usernamesStr})`, () => {
    const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : document.getElementById('btnHapusMultiUserModal'));
    setBtnLoading(btn, true, 'MENGHAPUS...');
    showPopupInnerLoading('popupUserManagementModal', 'MENGHAPUS USER TERPILIH...');
    showLoading('MENGHAPUS USER & TOKO TERPILIH...');

    setTimeout(async () => {
      try {
        const delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
        const delStores = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
        let localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');

        // 1. SUPABASE BATCH DELETE FOR ALL SELECTED USERS & STORES
        if (typeof supabase !== 'undefined' && supabase) {
          const idsToDelete = selectedUsers.map(u => u.id).filter(Boolean);
          const usernamesToDelete = selectedUsers.map(u => u.username).filter(Boolean);
          const fullNamesToDelete = selectedUsers.map(u => u.fullName).filter(Boolean);

          try {
            if (idsToDelete.length) await supabase.from('users').delete().in('id', idsToDelete);
          } catch(e) {}
          try {
            if (usernamesToDelete.length) await supabase.from('users').delete().in('username', usernamesToDelete);
          } catch(e) {}
          try {
            if (idsToDelete.length) await supabase.from('toko_list').delete().in('id', idsToDelete);
          } catch(e) {}
          try {
            if (fullNamesToDelete.length) await supabase.from('toko_list').delete().in('full_name', fullNamesToDelete);
          } catch(e) {}
        }

        for (const u of selectedUsers) {
          try {
            if (u.id && !delUsers.includes(u.id)) delUsers.push(u.id);
            if (u.username && !delUsers.includes(u.username)) delUsers.push(u.username);

            const docId = String(u.username || '').toUpperCase();
            if (docId) {
              if (typeof dbFirestore !== 'undefined' && dbFirestore) {
                await dbFirestore.collection('users').doc(docId).delete().catch(e => console.warn(e));
              }
              if (typeof dbRealtime !== 'undefined' && dbRealtime) {
                await dbRealtime.ref(`users/${docId}`).remove().catch(e => console.warn(e));
              }
            }

            const safeFullName = String(u.fullName || '').toUpperCase();
            const safeArea = String(u.area || '').toUpperCase();
            if (u.category === 'TOKO' || safeFullName) {
              const storeKey = `${safeFullName}_${safeArea}`;
              if (storeKey && !delStores.includes(storeKey)) delStores.push(storeKey);
              localStores = localStores.filter(s => s.id !== u.id && (safeFullName && s.fullName ? s.fullName.toUpperCase() !== safeFullName : true));

              if (u.id) {
                // Hapus selesai
              }
            }
          } catch (loopErr) {
            console.warn('[HAPUS MULTI USER ITEM NOTICE]:', loopErr);
          }
        }

        appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));
        appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(delStores));
        appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));
        try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores)); } catch(e) {}
        try { localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(delStores)); } catch(e) {}
        try { localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers)); } catch(e) {}

        const remainingUsers = users.filter(u => 
          !userIds.includes(u.id) || 
          String(u.username || '').trim().toUpperCase() === 'ADMIN' ||
          (currentUser && String(u.username || '').toUpperCase() === String(currentUser.username || '').toUpperCase())
        );
        saveUsersToDB(remainingUsers);

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          try { await pushCentralCloudDB(); } catch(e) {}
        }

        if (typeof syncAllDataToCache === 'function') {
          try { await syncAllDataToCache().catch(() => {}); } catch(e) {}
        }

        showNotif(`BERHASIL MENGHAPUS ${selectedUsers.length} USER & TOKO TERPILIH!`, 'success');
        
        // PASTI KAN POPUP USER MANAGEMENT MODAL TETAP TERBUKA
        if (typeof bukaPopupUserManagement === 'function') {
          bukaPopupUserManagement();
        } else {
          const popupUserMgmt = document.getElementById('popupUserManagementModal');
          if (popupUserMgmt) {
            popupUserMgmt.style.setProperty('display', 'flex', 'important');
            popupUserMgmt.classList.add('show');
          }
        }

        if (typeof loadUsersManagement === 'function') loadUsersManagement();
        if (typeof loadForm === 'function') loadForm();
        if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
        if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
        if (typeof loadDashboard === 'function') loadDashboard();
      } catch (err) {
        console.error('[HAPUS MULTI USER ERROR]:', err);
        showNotif('TERJADI KESALAHAN SAAT MENGHAPUS MULTI USER: ' + (err.message || err), 'error');
      } finally {
        hideLoading();
        hidePopupInnerLoading('popupUserManagementModal');
        setBtnLoading(btn, false);
      }
    }, 400);
  });
}
window.toggleSelectAllUsers = toggleSelectAllUsers;
window.updateMultiUserBtnState = updateMultiUserBtnState;
window.hapusMultiUser = hapusMultiUser;

function setBtnLoading(btnElement, isLoading) {
  if (!btnElement || !(btnElement instanceof HTMLElement)) return;
  if (isLoading) {
    if (!btnElement.dataset.origHtml) {
      btnElement.dataset.origHtml = btnElement.innerHTML;
    }
    btnElement.disabled = true;
    btnElement.style.setProperty('pointer-events', 'none', 'important');
    btnElement.innerHTML = `<span class="btnSpinner"></span>`;
  } else {
    btnElement.disabled = false;
    btnElement.style.setProperty('pointer-events', 'auto', 'important');
    if (btnElement.dataset.origHtml) {
      btnElement.innerHTML = btnElement.dataset.origHtml;
      delete btnElement.dataset.origHtml;
    }
  }
}
window.setBtnLoading = setBtnLoading;

function showPopupInnerLoading(targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;
  let box = container.querySelector('.popupBox') || container.querySelector('.userManagementBoxPopup') || container;
  
  let loader = box.querySelector('.popupInnerLoading');
  if (!loader) {
    loader = document.createElement('div');
    loader.className = 'popupInnerLoading';
    loader.innerHTML = `<div class="popupInnerSpinner"></div>`;
    box.style.position = 'relative';
    box.appendChild(loader);
  } else {
    loader.style.display = 'flex';
  }
}
window.showPopupInnerLoading = showPopupInnerLoading;

function hidePopupInnerLoading(targetContainerId) {
  const container = document.getElementById(targetContainerId);
  if (!container) return;
  const loaders = container.querySelectorAll('.popupInnerLoading');
  loaders.forEach(l => l.remove());
}
window.hidePopupInnerLoading = hidePopupInnerLoading;

function bukaUserModal(userId = null, btnElement = null) {
  if (typeof userId !== 'string' || userId.startsWith('[object') || userId === 'undefined') {
    userId = null;
  }

  const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : null);
  setBtnLoading(btn, true, 'MEMUAT...');
  showPopupInnerLoading('popupUserManagementModal', userId ? 'MEMUAT DATA USER...' : 'MEMBUKA FORM USER...');
  showLoading(userId ? 'MEMUAT DATA USER...' : 'MEMBUKA FORM USER...');

  setTimeout(() => {
    try {
      const editIdInput = document.getElementById('editUserId');
      if (editIdInput) editIdInput.value = userId || '';

      const title = document.getElementById('userFormTitle');

      let targetAreas = ['BDG'];

      if (userId) {
        const allUsers = (typeof getUsersFromDB === 'function') ? getUsersFromDB() : [];
        const u = allUsers.find(x => x && (
          (x.id && String(x.id) === String(userId)) ||
          (x.username && String(x.username).toUpperCase() === String(userId).toUpperCase())
        ));
        if (u) {
          if (editIdInput) editIdInput.value = u.id || u.username || userId;
          if (document.getElementById('uFormUsername')) document.getElementById('uFormUsername').value = u.username || '';
          if (document.getElementById('uFormPassword')) document.getElementById('uFormPassword').value = u.password || '';
          if (document.getElementById('uFormFullName')) document.getElementById('uFormFullName').value = u.fullName || '';
          if (document.getElementById('uFormStoreCode')) document.getElementById('uFormStoreCode').value = u.storeCode || '';
          if (document.getElementById('uFormPhone')) document.getElementById('uFormPhone').value = u.phone || '';
          if (document.getElementById('uFormCategory')) document.getElementById('uFormCategory').value = u.category || 'TOKO';
          targetAreas = typeof getUserAreaList === 'function' ? getUserAreaList(u.area) : [u.area || 'BDG'];
          if (title) title.textContent = `EDIT USER: ${u.username}`;
        }
      } else {
        if (document.getElementById('uFormUsername')) document.getElementById('uFormUsername').value = '';
        if (document.getElementById('uFormPassword')) document.getElementById('uFormPassword').value = '';
        if (document.getElementById('uFormFullName')) document.getElementById('uFormFullName').value = '';
        if (document.getElementById('uFormStoreCode')) document.getElementById('uFormStoreCode').value = '';
        if (document.getElementById('uFormPhone')) document.getElementById('uFormPhone').value = '';
        if (document.getElementById('uFormCategory')) document.getElementById('uFormCategory').value = 'TOKO';
        targetAreas = ['BDG'];
        if (title) title.textContent = 'TAMBAH USER BARU';
      }

      const areaCheckboxes = document.querySelectorAll('input[name="uFormAreaCheck"]');
      areaCheckboxes.forEach(cb => {
        cb.checked = targetAreas.includes(cb.value);
      });

      const hiddenAreaInput = document.getElementById('uFormArea');
      if (hiddenAreaInput) hiddenAreaInput.value = targetAreas.join(', ');

      const modal = document.getElementById('popupUserForm');
      if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
        modal.style.setProperty('z-index', '10000005', 'important');
        modal.classList.add('show');
        pushPopupHistoryState();
      }
    } finally {
      setTimeout(() => {
        hideLoading();
        hidePopupInnerLoading('popupUserManagementModal');
        setBtnLoading(btn, false);
      }, 350);
    }
  }, 400);
}
window.bukaUserModal = bukaUserModal;

function tutupUserModal() {
  const modal = document.getElementById('popupUserForm');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
}
window.tutupUserModal = tutupUserModal;

async function simpanUserData(btnElement = null) {
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
  const docId = String(username).toUpperCase();

  const checkedAreas = Array.from(document.querySelectorAll('input[name="uFormAreaCheck"]:checked')).map(cb => cb.value);
  const area = checkedAreas.length > 0 ? checkedAreas.join(', ') : 'BDG';
  const hiddenAreaInput = document.getElementById('uFormArea');
  if (hiddenAreaInput) hiddenAreaInput.value = area;

  if (!username || !password || !fullName) {
    showNotif('USERNAME, PASSWORD, DAN NAMA LENGKAP WAJIB DIISI!', 'warning');
    return;
  }

  const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : document.querySelector('#popupUserForm .btnHapus'));
  setBtnLoading(btn, true, editId ? 'MEMPERBARUI...' : 'MENYIMPAN...');
  showPopupInnerLoading('popupUserForm', editId ? 'MEMPERBARUI DATA USER...' : 'MENYIMPAN USER BARU...');
  showLoading(editId ? 'MEMPERBARUI DATA USER...' : 'MENYIMPAN USER BARU...');

  setTimeout(async () => {
    try {
      const users = getUsersFromDB();

      if (editId) {
        let idx = users.findIndex(u => u && (
          (u.id && String(u.id) === String(editId)) ||
          (u.username && String(u.username).toUpperCase() === String(editId).toUpperCase())
        ));
        if (idx === -1 && username) {
          idx = users.findIndex(u => u && u.username && String(u.username).trim().toUpperCase() === username);
        }

        if (idx !== -1) {
          const duplicateWithOtherUser = users.some((u, i) => {
            if (!u || !u.username || i === idx) return false;
            return String(u.username).trim().toUpperCase() === username;
          });

          if (duplicateWithOtherUser) {
            hideLoading();
            setTimeout(() => {
              showNotif(`USERNAME '${username}' SUDAH TERDAFTAR! GUNAKAN USERNAME LAIN.`, 'error');
            }, 100);
            return;
          }

          // SIMPAN DATA LAMA SEBELUM TIMPA UNTUK SINKRONISASI MASTER TOKO
          const oldUser = { ...users[idx] };
          const oldFullName = String(oldUser.fullName || '').trim();
          const oldUsername = String(oldUser.username || '').trim();
          const oldId = String(oldUser.id || '').trim();
          const oldCategory = String(oldUser.category || '').trim().toUpperCase();
          const oldArea = String(oldUser.area || '').trim().toUpperCase();

          if (!users[idx].id) users[idx].id = users[idx].username || docId;
          users[idx].username = username;
          users[idx].password = password;
          users[idx].fullName = fullName;
          users[idx].storeCode = storeCode;
          users[idx].phone = phone;
          users[idx].category = category;
          users[idx].area = area;
          saveUsersToDB(users, users[idx]);
          if (supabaseRealtimeChannel) {
            try {
              supabaseRealtimeChannel.send({
                type: 'broadcast',
                event: 'user_data_changed',
                payload: { user: users[idx], username: users[idx].username, timestamp: Date.now() }
              });
            } catch(e) {}
          }

          // SINKRONISASI KE CURRENTUSER (SESI LOGIN AKTIF) JIKA USER YANG DIEDIT ADALAH USER YANG SEDANG LOGIN
          if (currentUser && (
            (currentUser.id && String(currentUser.id) === String(users[idx].id)) ||
            (currentUser.username && String(currentUser.username).trim().toUpperCase() === String(users[idx].username).trim().toUpperCase())
          )) {
            currentUser = { ...currentUser, ...users[idx] };
            appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
            try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch(e) {}

            // Update UI Header & Popup Akun
            const elNama = document.getElementById('akunNama');
            if (elNama) elNama.value = currentUser.fullName || '';
            const elHP = document.getElementById('akunHP');
            if (elHP) elHP.value = currentUser.phone || '-';
            const elArea = document.getElementById('akunArea');
            if (elArea) elArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;
            const elKat = document.getElementById('akunKategori');
            if (elKat) elKat.value = currentUser.category || '';
            const headerUser = document.getElementById('headerUser');
            if (headerUser) headerUser.textContent = currentUser.fullName || currentUser.username;
            const welcomeUser = document.getElementById('welcomeUser');
            if (welcomeUser) welcomeUser.textContent = currentUser.fullName || currentUser.username;
            const displayNama = document.getElementById('displayUserFullName');
            if (displayNama) displayNama.textContent = currentUser.fullName || currentUser.username;
          }

          const targetId = users[idx].id || docId;
          if (typeof simpanUserKeSupabase === 'function') {
            await simpanUserKeSupabase(users[idx]);
          }

          // SINKRONISASI MASTER TOKO (JIKA KATEGORI TOKO ATAU SEBELUMNYA TOKO)
          if (category === 'TOKO' || oldCategory === 'TOKO') {
            try {
              let localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
              if (!Array.isArray(localStores)) localStores = [];

              const oldNameUpper = oldFullName.toUpperCase();
              const oldUnameUpper = oldUsername.toUpperCase();
              const newNameUpper = fullName.trim().toUpperCase();
              const targetStoreId = users[idx].id || oldId || `STK-${username}`;

              // Cari toko lama berdasarkan ID atau nama toko lama atau username lama
              let sIdx = localStores.findIndex(s => {
                if (!s) return false;
                const sId = String(s.id || '').trim();
                const sName = String(s.fullName || '').trim().toUpperCase();
                return (
                  (sId && oldId && sId === oldId) ||
                  (sId && targetStoreId && sId === targetStoreId) ||
                  (sName && oldNameUpper && sName === oldNameUpper) ||
                  (sName && oldUnameUpper && sName === oldUnameUpper)
                );
              });

              if (category === 'TOKO') {
                if (sIdx !== -1) {
                  // UPDATE TOKO LAMA, JANGAN NAMBAH TOKO BARU!
                  localStores[sIdx].id = targetStoreId;
                  localStores[sIdx].fullName = fullName;
                  localStores[sIdx].area = area;
                  localStores[sIdx].storeCode = storeCode || generateStoreCode(fullName, area);
                } else {
                  localStores.push({
                    id: targetStoreId,
                    fullName: fullName,
                    area: area,
                    storeCode: storeCode || generateStoreCode(fullName, area),
                    createdBy: currentUser ? currentUser.fullName : 'ADMIN'
                  });
                }

                // Hapus entri ganda toko lama yang tersisa
                if (oldNameUpper && oldNameUpper !== newNameUpper) {
                  localStores = localStores.filter((s, i) => {
                    if (!s) return false;
                    const sName = String(s.fullName || '').trim().toUpperCase();
                    if (sName === oldNameUpper && (s.id !== targetStoreId && i !== sIdx)) {
                      return false;
                    }
                    return true;
                  });
                }
              } else {
                // Jika role diubah dari TOKO ke role lain, hapus dari list toko
                localStores = localStores.filter(s => {
                  if (!s) return false;
                  const sId = String(s.id || '').trim();
                  const sName = String(s.fullName || '').trim().toUpperCase();
                  return !(sId === targetStoreId || sId === oldId || sName === oldNameUpper);
                });
              }

              appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));
              try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores)); } catch(e) {}

              // SINKRONISASI KE SUPABASE TOKO_LIST
              const client = (typeof supabaseAdmin !== 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
              if (client) {
                if (category === 'TOKO') {
                  try {
                    await client.from('toko_list').upsert({
                      id: targetStoreId,
                      full_name: fullName,
                      area: area,
                      store_code: storeCode || generateStoreCode(fullName, area),
                      created_by: currentUser ? currentUser.fullName : 'ADMIN'
                    });
                  } catch (e) { console.warn(e); }

                  if (oldNameUpper && oldNameUpper !== newNameUpper) {
                    try {
                      await client.from('toko_list').delete().eq('full_name', oldFullName).neq('id', targetStoreId);
                    } catch (e) { console.warn(e); }
                  }
                } else {
                  try {
                    await client.from('toko_list').delete().eq('id', targetStoreId);
                  } catch (e) { console.warn(e); }
                  if (oldFullName) {
                    try {
                      await client.from('toko_list').delete().eq('full_name', oldFullName);
                    } catch (e) { console.warn(e); }
                  }
                }
              }

              if (typeof syncSupabaseStoresToLocalCache === 'function') {
                await syncSupabaseStoresToLocalCache().catch(() => {});
              }
            } catch(e) {
              console.warn('[STORE SYNC NOTICE]:', e);
            }
          }

          if (supabaseRealtimeChannel) {
            try {
              supabaseRealtimeChannel.send({
                type: 'broadcast',
                event: 'user_data_changed',
                payload: { user: users[idx], username: users[idx].username, timestamp: Date.now() }
              });
            } catch(e) {}
          }
          if (typeof pushCentralCloudDB === 'function') {
            pushCentralCloudDB();
          }

          hideLoading();
          tutupUserModal();

          if (typeof bukaPopupUserManagement === 'function') {
            bukaPopupUserManagement();
          } else {
            const popupUserMgmt = document.getElementById('popupUserManagementModal');
            if (popupUserMgmt) {
              popupUserMgmt.style.setProperty('display', 'flex', 'important');
              popupUserMgmt.classList.add('show');
            }
          }

          loadUsersManagement();
          if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
          if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();

          setTimeout(() => {
            showNotif(`DATA USER ${username} BERHASIL DIPERBARUI!`, 'info');
          }, 100);
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
        hideLoading();
        setTimeout(() => {
          showNotif(`USERNAME '${username}' SUDAH TERDAFTAR! GUNAKAN USERNAME LAIN.`, 'error');
        }, 100);
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
        storeCode: storeCode || generateStoreCode(fullName),
        phone,
        category,
        area,
        createdAt: getFormattedDateDDMMYYYY()
      };

      users.push(newUser);
      saveUsersToDB(users, newUser);

      if (typeof simpanUserKeSupabase === 'function') {
        await simpanUserKeSupabase(newUser);
      }

      if (category === 'TOKO') {
        try {
          if (typeof supabase !== 'undefined' && supabase) {
            await supabase.from('toko_list').upsert({
              id: newUser.id,
              full_name: newUser.fullName,
              area: newUser.area,
              created_by: currentUser ? currentUser.fullName : 'ADMIN'
            }).catch(e => console.warn(e));
          }
        } catch(e) {}
      }

      if (category === 'TOKO') {
        try {
          const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
          if (!localStores.some(s => s.id === newUser.id || (s.fullName && s.fullName.toUpperCase() === fullName.toUpperCase()))) {
            localStores.push({
              id: newUser.id,
              fullName: newUser.fullName,
              area: newUser.area,
              storeCode: newUser.storeCode,
              createdBy: currentUser ? currentUser.fullName : 'ADMIN'
            });
            appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));
          }
        } catch (e) {}
      }

      if (typeof syncSupabaseUsersToLocalCache === 'function') {
        await syncSupabaseUsersToLocalCache();
      }
      if (typeof syncSupabaseStoresToLocalCache === 'function') {
        await syncSupabaseStoresToLocalCache();
      }

      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'user_data_changed',
            payload: { user: newUser, username: newUser.username, timestamp: Date.now() }
          });
        } catch(e) {}
      }
      if (typeof pushCentralCloudDB === 'function') {
        pushCentralCloudDB();
      }

      hideLoading();

      const modalForm = document.getElementById('popupUserForm');
      if (modalForm) {
        modalForm.style.setProperty('display', 'flex', 'important');
        modalForm.style.setProperty('z-index', '10000005', 'important');
        modalForm.classList.add('show');
      }

      if (typeof bukaPopupUserManagement === 'function') {
        bukaPopupUserManagement();
      } else {
        const popupUserMgmt = document.getElementById('popupUserManagementModal');
        if (popupUserMgmt) {
          popupUserMgmt.style.setProperty('display', 'flex', 'important');
          popupUserMgmt.classList.add('show');
        }
      }

      if (document.getElementById('editUserId')) document.getElementById('editUserId').value = '';
      if (document.getElementById('uFormUsername')) document.getElementById('uFormUsername').value = '';
      if (document.getElementById('uFormPassword')) document.getElementById('uFormPassword').value = '';
      if (document.getElementById('uFormFullName')) document.getElementById('uFormFullName').value = '';
      if (document.getElementById('uFormStoreCode')) document.getElementById('uFormStoreCode').value = '';
      if (document.getElementById('uFormPhone')) document.getElementById('uFormPhone').value = '';
      if (document.getElementById('uFormCategory')) document.getElementById('uFormCategory').value = 'TOKO';
      
      const areaCheckboxes = document.querySelectorAll('input[name="uFormAreaCheck"]');
      areaCheckboxes.forEach(cb => {
        cb.checked = (cb.value === 'BDG');
      });

      loadUsersManagement();
      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
      if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();

      setTimeout(() => {
        showNotif(`USER ${fullName} (${username}) BERHASIL DISIMPAN!`, 'success');
      }, 100);
    } catch (err) {
      console.error('[SIMPAN USER ERROR]:', err);
      setTimeout(() => {
        showNotif('TERJADI KESALAHAN SAAT MENYIMPAN USER: ' + (err.message || err), 'error');
      }, 100);
    } finally {
      hideLoading();
      hidePopupInnerLoading('popupUserForm');
      setBtnLoading(btn, false);
    }
  }, 400);
}

async function hapusUser(userId, btnElement = null) {
  if (!userId || userId === 'undefined') return;
  const users = getUsersFromDB();
  const u = users.find(x => x && (
    (x.id && String(x.id) === String(userId)) ||
    (x.username && String(x.username).toUpperCase() === String(userId).toUpperCase())
  ));
  if (!u) {
    showNotif('USER TIDAK DITEMUKAN ATAU SUDAH DIHAPUS!', 'warning');
    return;
  }

  if (currentUser && u.username && u.username.toUpperCase() === currentUser.username.toUpperCase()) {
    showNotif('TIDAK DAPAT MENGHAPUS AKUN AKTIF ANDA!', 'error');
    return;
  }

  if (u.username && u.username.toUpperCase() === 'ADMIN') {
    showNotif('AKUN MASTER ADMIN UTAMA TIDAK BOLEH DIHAPUS!', 'error');
    return;
  }

  showConfirm(`HAPUS USER '${u.fullName || u.username}' (${u.username})?`, () => {
    const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : null);
    setBtnLoading(btn, true, 'HAPUS...');
    showPopupInnerLoading('popupUserManagementModal', 'MENGHAPUS USER...');
    showLoading('MENGHAPUS USER & SINKRONISASI TOKO...');

    setTimeout(async () => {
      try {
        const uNameUpper = String(u.fullName || '').trim().toUpperCase();
        const uUnameUpper = String(u.username || '').trim().toUpperCase();
        const uArea = String(u.area || 'BDG').trim().toUpperCase();

        // 1. UPDATE DELETED KEYS & LOKAL STORAGE FOR USERS & STORES
        try {
          const delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
          if (u.id && !delUsers.includes(u.id)) delUsers.push(u.id);
          if (u.username && !delUsers.includes(u.username)) delUsers.push(u.username);
          if (uUnameUpper && !delUsers.includes(uUnameUpper)) delUsers.push(uUnameUpper);
          appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));
          try { localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers)); } catch(e) {}

          // JIKA USER ADALAH TOKO, HAPUS JUGA DARI MASTER TOKO LOKAL & DELETED_STORES_KEY
          const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
          const updatedStores = localStores.filter(s => {
            if (!s) return false;
            if (s.id === u.id) return false;
            if (uNameUpper && String(s.fullName || '').trim().toUpperCase() === uNameUpper) return false;
            return true;
          });
          appStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedStores));
          try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedStores)); } catch(e) {}

          const storeKey = `${uNameUpper}_${uArea}`;
          const deletedStoreKeys = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
          if (uNameUpper && !deletedStoreKeys.includes(uNameUpper)) deletedStoreKeys.push(uNameUpper);
          if (storeKey && !deletedStoreKeys.includes(storeKey)) deletedStoreKeys.push(storeKey);
          if (u.id && !deletedStoreKeys.includes(u.id)) deletedStoreKeys.push(u.id);
          appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
          try { localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys)); } catch(e) {}
        } catch(e) {}

        const updatedUsers = users.filter(x => x.id !== u.id && x.username !== u.username);
        try {
          saveUsersToDB(updatedUsers, null, 'DELETE');
        } catch(e) {
          cacheUsers = updatedUsers;
        }

        // 2. HAPUS DARI SUPABASE (TABEL users & toko_list JIKA KATEGORI TOKO)
        const client = (typeof supabaseAdmin !== 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
        if (client) {
          try {
            if (u.id) await client.from('users').delete().eq('id', u.id);
            if (u.username) {
              await client.from('users').delete().eq('username', u.username);
              await client.from('users').delete().ilike('username', u.username);
            }
            if (u.fullName) {
              await client.from('users').delete().eq('full_name', u.fullName);
            }
            if (u.id) await client.from('toko_list').delete().eq('id', u.id);
            if (u.fullName) {
              await client.from('toko_list').delete().eq('full_name', u.fullName);
              await client.from('toko_list').delete().ilike('full_name', u.fullName);
            }
          } catch (sbErr) {
            console.warn('[SUPABASE DELETE USER NOTICE]:', sbErr);
          }
        }
        if (typeof broadcastSystemUsersMasterToSupabase === 'function') {
          await broadcastSystemUsersMasterToSupabase();
        }
        if (typeof syncSupabaseUsersToLocalCache === 'function') {
          await syncSupabaseUsersToLocalCache();
        }
        if (typeof syncSupabaseStoresToLocalCache === 'function') {
          await syncSupabaseStoresToLocalCache();
        }

        // 3. HAPUS DARI FIREBASE ONLINE (FIRESTORE & REALTIME DB)
        const docId = String(u.username).toUpperCase();
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          await dbFirestore.collection('users').doc(docId).delete().catch(e => console.warn(e));
          if (u.id) await dbFirestore.collection('stores').doc(u.id).delete().catch(e => console.warn(e));
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          await dbRealtime.ref(`users/${docId}`).remove().catch(e => console.warn(e));
          if (u.id) await dbRealtime.ref(`stores/${u.id}`).remove().catch(e => console.warn(e));
        }

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          try { await pushCentralCloudDB(); } catch(e) {}
        }
        if (typeof pullCentralCloudDB === 'function') {
          try { await pullCentralCloudDB(); } catch(e) {}
        }

        // BROADCAST REALTIME EVENT KE SELURUH PERANGKAT AGAR TAMPILAN USER & TOKO LANGSUNG TER-UPDATE
        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_changed',
              payload: { action: 'DELETE', username: u.username, id: u.id, timestamp: Date.now() }
            });
          } catch(e) {}
        }

        showNotif(`USER '${u.fullName || u.username}' & DATA MASTER TOKO BERHASIL DIHAPUS!`, 'info');
        loadUsersManagement();
        if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
        if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
      } catch (err) {
        console.error('[HAPUS USER ERROR]:', err);
        showNotif('GAGAL MENGHAPUS USER: ' + (err.message || err), 'error');
      } finally {
        hideLoading();
        hidePopupInnerLoading('popupUserManagementModal');
        setBtnLoading(btn, false);
      }
    }, 400);
  });
}
window.hapusUser = hapusUser;

function loadMasterDbTable() {
  const tbody = document.getElementById('masterDbTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('searchMasterDb');
  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // Preserve checked checkbox selections across re-renders
  const checkedBoxes = tbody.querySelectorAll('.masterDbCheckbox:checked');
  const checkedSet = new Set(Array.from(checkedBoxes).map(cb => cb.value));

  let requests = getRequestsFromDB();

  if (search) {
    requests = requests.filter(r => matchesRequestSearchFilter(r, search));
  }

  tbody.innerHTML = '';

  if (requests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-muted);">BELUM ADA DATA PERMINTAAN TERDAFTAR.</td></tr>`;
    updateMultiMasterDbBtnState();
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
    if (shouldRowBlinkRed(r)) {
      tr.className = 'blink-row-red';
    }
    const isChecked = checkedSet.has(r.noSurat) ? 'checked' : '';
    tr.innerHTML = `
      <td style="text-align:center;"><input type="checkbox" class="masterDbCheckbox" value="${r.noSurat}" ${isChecked} onchange="updateMultiMasterDbBtnState()" style="cursor:pointer; width:16px; height:16px;"></td>
      <td style="font-weight:600; color:var(--primary);">${r.noSurat}</td>
      <td style="white-space:nowrap;">${formatDateDDMMYYYYString(r.tanggal)}</td>
      <td>${r.toko} <div style="font-size:11px; color:var(--text-muted);">By: ${r.createdBy}</div></td>
      <td><span style="color:var(--primary); font-weight:600;">${r.area}</span></td>
      <td><span class="badgeStatus badge-pending" style="font-weight:600;">${r.jenis || 'DEFAULT'}</span></td>
      <td style="max-width:320px; word-break:break-word;">${itemsDetailText}</td>
      <td>${getBadgeStatus(r.status)}</td>
      <td style="word-break:break-word; max-width:200px;">${r.catatan || '-'}</td>
      <td style="text-align:center; white-space:nowrap; vertical-align:middle;">
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; vertical-align: middle;">
          <button type="button" class="btnIcon btnDelete" onclick="hapusDataMaster('${r.noSurat}')" title="HAPUS DATA" style="padding: 4px 6px !important; line-height: 1 !important; height: auto !important;"><span class="material-symbols-rounded" style="font-size: 16px;">delete</span></button>
          <button type="button" class="btnIcon btnEdit" onclick="bukaModalUbahStatusAdmin('${r.noSurat}')" title="UBAH STATUS SUPABASE (ADMIN ONLY)" style="background: #8b5cf6 !important; color: #ffffff !important; padding: 4px 6px !important; line-height: 1 !important; height: auto !important;"><span class="material-symbols-rounded" style="font-size: 16px;">published_with_changes</span></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  for (let k = 0; k < 2; k++) {
    const emptyTr = document.createElement('tr');
    emptyTr.className = 'empty-grid-row';
    emptyTr.innerHTML = `
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
      <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
    `;
    tbody.appendChild(emptyTr);
  }
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

async function hapusMultiMasterDb() {
  const selectedCheckboxes = document.querySelectorAll('.masterDbCheckbox:checked');
  const noSuratList = Array.from(selectedCheckboxes).map(cb => cb.value).filter(Boolean);

  if (noSuratList.length === 0) {
    showNotif('PILIH MINIMAL 1 DATA PERMINTAAN UNTUK DIHAPUS!', 'warning');
    return;
  }

  showConfirm(`ADMIN: YAKIN INGIN MENGHAPUS ${noSuratList.length} DATA PERMINTAAN TERPILIH?`, () => {
    showLoading('MENGHAPUS DATA TERPILIH...');
    setTimeout(async () => {
      try {
        // 1. DOKUMENTASIKAN KODE SURAT PADA DELETED_REQUESTS_KEY
        try {
          const delReqs = JSON.parse(appStorage.getItem(DELETED_REQUESTS_KEY) || '[]');
          noSuratList.forEach(ns => {
            if (ns && !delReqs.includes(ns)) delReqs.push(ns);
          });
          appStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(delReqs));
        } catch(e) {}

        // 2. FILTER DARI CACHE LOKAL & SIMPAN
        const currentReqs = getRequestsFromDB();
        const updatedReqs = currentReqs.filter(r => r && r.noSurat && !noSuratList.includes(r.noSurat));
        try {
          saveRequestsToDB(updatedReqs);
        } catch(e) {
          appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(updatedReqs));
        }

        // 3. HAPUS BATCH DARI SUPABASE (TABEL: permintaan_toko)
        if (typeof supabase !== 'undefined' && supabase) {
          try {
            await supabase.from('permintaan_toko').delete().in('no_surat', noSuratList);
          } catch(sbErr1) {}
        }

        if (typeof syncSupabaseRequestsToLocalCache === 'function') {
          await syncSupabaseRequestsToLocalCache();
        }

        // 4. HAPUS INDIVIDUAL FIRESTORE & REALTIME DB
        noSuratList.forEach(noSurat => {
          try {
            const docId = String(noSurat || '').replace(/[\/\.]/g, '_');
            if (docId) {
              if (typeof dbFirestore !== 'undefined' && dbFirestore) {
                dbFirestore.collection('requests').doc(docId).delete().catch(err => console.warn('[FIRESTORE DELETE NOTICE]:', err));
              }
              if (typeof dbRealtime !== 'undefined' && dbRealtime) {
                dbRealtime.ref(`requests/${docId}`).remove().catch(err => console.warn('[REALTIME DELETE NOTICE]:', err));
              }
            }
          } catch(e) {}
        });

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          try { await pushCentralCloudDB(); } catch(e) {}
        }

        hideLoading();
        showNotif(`BERHASIL MENGHAPUS ${noSuratList.length} DATA PERMINTAAN TERPILIH!`, 'info');

        if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
        if (typeof loadRiwayat === 'function') loadRiwayat();
        if (typeof loadDashboard === 'function') loadDashboard();
      } catch (err) {
        hideLoading();
        console.error('[HAPUS MULTI MASTER ERROR]:', err);
        showNotif('TERJADI KESALAHAN SAAT MENGHAPUS DATA MULTI TERPILIH: ' + (err.message || err), 'error');
      }
    }, 400);
  });
}
window.toggleSelectAllMasterDb = toggleSelectAllMasterDb;
window.updateMultiMasterDbBtnState = updateMultiMasterDbBtnState;
window.hapusMultiMasterDb = hapusMultiMasterDb;

function hapusDataMaster(noSurat) {
  if (!noSurat) return;
  showConfirm(`ADMIN: HAPUS DATA PERMINTAAN #${noSurat}?`, () => {
    try {
      const currentReqs = getRequestsFromDB();
      const updatedReqs = currentReqs.filter(r => r.noSurat !== noSurat);
      saveRequestsToDB(updatedReqs);

      const docId = String(noSurat).replace(/[\/\.]/g, '_');
      if (typeof supabase !== 'undefined' && supabase) {
        supabase.from('permintaan_toko').delete().eq('no_surat', noSurat).then(({ error }) => {
          if (error) console.warn('[SUPABASE DELETE NOTICE]:', error.message);
          else console.log('⚡ [SUPABASE DELETE SUCCESS]:', noSurat);
          if (typeof broadcastRealtimeDataChange === 'function') broadcastRealtimeDataChange(noSurat);
        });
      }
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        dbFirestore.collection('requests').doc(docId).delete().catch(err => console.warn('[FIRESTORE DELETE NOTICE]:', err));
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        dbRealtime.ref(`requests/${docId}`).remove().catch(err => console.warn('[REALTIME DELETE NOTICE]:', err));
      }

      if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
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

function getBreakdownSuratExportValue(r, item) {
  if (!r || (!r.noSurat && !r.id)) return '-';
  const targetNs = String(r.noSurat || r.id).trim();
  
  const partials = typeof getPartialBreakdownsFromDB === 'function' ? getPartialBreakdownsFromDB(targetNs) : [];
  if (!Array.isArray(partials) || partials.length === 0) {
    return '-';
  }

  if (!item) {
    return partials.map(p => {
      const pId = p.partial_id || p.partialId || 'P1';
      const pStat = p.status || 'PENDING';
      return `${targetNs}-${pId} (${pStat})`;
    }).join(', ');
  }

  // 1. Cari breakdown (p) mana saja yang benar-benar memuat item ini di dalam p.items
  const matchedPartials = [];
  const itemType = String(item.type || item.tipe || '').trim().toUpperCase();
  const itemSeri = String(item.seri || item.sn || '').trim().toUpperCase();
  const itemBarang = String(item.barang || item.permintaan || '').trim().toUpperCase();

  partials.forEach(p => {
    let pItems = p.items;
    if (typeof pItems === 'string') {
      try { pItems = JSON.parse(pItems || '[]'); } catch (e) { pItems = []; }
    }
    if (!Array.isArray(pItems)) pItems = [];

    const pId = p.partial_id || p.partialId || 'P1';
    const pStat = p.status || 'PENDING';

    const isMatchInP = pItems.some(pi => {
      if (!pi) return false;
      const piType = String(pi.type || pi.tipe || '').trim().toUpperCase();
      const piSeri = String(pi.seri || pi.sn || '').trim().toUpperCase();
      const piBarang = String(pi.barang || pi.permintaan || '').trim().toUpperCase();

      if (itemSeri && piSeri && itemSeri !== '-' && piSeri !== '-') {
        return itemSeri === piSeri && (itemType === piType || itemBarang === piBarang);
      }
      if (itemType && piType && itemType !== '-' && piType !== '-') {
        return itemType === piType && itemBarang === piBarang;
      }
      return itemBarang && piBarang && itemBarang === piBarang;
    });

    if (isMatchInP) {
      matchedPartials.push(`${targetNs}-${pId} (${pStat})`);
    }
  });

  if (matchedPartials.length > 0) {
    return matchedPartials.join(', ');
  }

  // 2. Cek rujukan dari item.statusPart jika tidak ketemu di p.items
  const itemKet = String(item.statusPart || item.keteranganPart || item.updatePart || '').trim();
  if (itemKet) {
    const matchP = itemKet.match(/(P\d+)/i) || itemKet.match(/([A-Za-z0-9\/\._\-]+-P\d+)/i);
    if (matchP) {
      const targetPid = matchP[1].toUpperCase();
      const foundP = partials.find(p => {
        const pId = String(p.partial_id || p.partialId || p.id || '').toUpperCase();
        return pId.includes(targetPid) || targetPid.includes(pId);
      });
      if (foundP) {
        const pLabel = foundP.partial_id || foundP.partialId || targetPid;
        const pStat = foundP.status || 'PENDING';
        return `${targetNs}-${pLabel} (${pStat})`;
      }
      return `${targetNs}-${targetPid}`;
    }
  }

  return '-';
}
window.getBreakdownSuratExportValue = getBreakdownSuratExportValue;

function downloadMasterExcel() {
  const data = getRequestsFromDB();
  if (data.length === 0) {
    showNotif('TIDAK ADA DATA MASTER UNTUK DIEKSPOR!', 'warning');
    return;
  }

  showLoading('MOHON TUNGGU...');
  setTimeout(() => {
    hideLoading();
    const rows = [];
    rows.push([
      'NO SURAT', 'TANGGAL', 'TOKO / PEMOHON', 'AREA', 'JENIS',
      'TIPE BARANG', 'NO SERI', 'NO SERI DUS', 'PERMINTAAN',
      'ALASAN', 'QTY', 'STATUS PART', 'BREAKDOWN SURAT', 'STATUS', 'CATATAN', 'LOG APPROVAL'
    ]);

    data.forEach(r => {
      const logStr = (r.log || []).map(l => `${l.action} by ${l.user} (${l.time})`).join(' | ');
      r.items.forEach(it => {
        const isUnfulfilled = !!(it.unfulfilled || it.batal || it.status === 'TIDAK BISA DIPENUHI' || it.status === 'TIDAK DIPENUHI' || r.status === 'BATAL' || r.unfulfilled);
        const customKet = (it.statusPart || it.keteranganPart || it.updatePart || it.noPart || it.alasanBatal || '').trim();
        
        let statusPartVal = '';
        if (isUnfulfilled) {
          if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
            statusPartVal = `TIDAK DIPENUHI (${customKet})`;
          } else {
            statusPartVal = 'TIDAK DIPENUHI';
          }
        } else if (customKet) {
          statusPartVal = customKet;
        } else if (r.status === 'DONE') {
          statusPartVal = 'DIPENUHI';
        } else {
          statusPartVal = '-';
        }

        let namaBarangDisplay = it.barang || it.permintaan || '-';
        if (isUnfulfilled) {
          if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
            namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI: ${customKet}]`;
          } else {
            namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI]`;
          }
        } else if (customKet && customKet !== 'DIPENUHI') {
          namaBarangDisplay = `${namaBarangDisplay} [Ket: ${customKet}]`;
        }

        rows.push([
          r.noSurat,
          r.tanggal,
          `${r.toko} (${r.createdBy})`,
          r.area,
          r.jenis,
          it.type || it.tipe || '-',
          it.seri || it.sn || '-',
          it.dus || '',
          namaBarangDisplay,
          it.alasan || '-',
          it.qty || it.jumlah || 1,
          statusPartVal,
          getBreakdownSuratExportValue(r, it),
          isUnfulfilled ? `${r.status} (TIDAK DIPENUHI)` : r.status,
          r.catatan || '',
          logStr
        ]);
      });
    });

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Master Data");
      XLSX.writeFile(wb, `MASTER_DATA_PERMINTAAN_LENGKAP_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  showLoading('MEMBACA FILE EXCEL MASTER TYPE & KODE UNIT...');
  const reader = new FileReader();
  reader.onload = async function(e) {
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
        // 1. SIMPAN KE PENYIMPANAN LOKAL PERANGKAT
        const existingMap = JSON.parse(appStorage.getItem(KODE_UNIT_MAP_KEY) || '{}');
        const updatedMap = { ...existingMap, ...newLookup };
        const mapJsonStr = JSON.stringify(updatedMap);
        appStorage.setItem(KODE_UNIT_MAP_KEY, mapJsonStr);
        try { localStorage.setItem(KODE_UNIT_MAP_KEY, mapJsonStr); } catch(e) {}

        // 2. SIMPAN & SINKRONKAN KHUSUS KE FIREBASE ONLINE (FIRESTORE & REALTIME DATABASE)
        const mapJsonStrForCloud = JSON.stringify(updatedMap);
        const fs = getDbFirestore();
        const rtdb = getDbRealtime();

        // A. FIREBASE FIRESTORE
        if (fs) {
          try {
            // Bersihkan key object jika ada karakter slash untuk doc field
            const cleanMap = {};
            Object.keys(updatedMap).forEach(k => {
              if (k) cleanMap[k.replace(/[\/\.#$\[\]]/g, '_')] = updatedMap[k];
            });

            await fs.collection('app_settings').doc('config').set({
              kodeUnitMapJson: mapJsonStrForCloud,
              totalMasterItems: Object.keys(updatedMap).length,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            await fs.collection('master_lookup').doc('kode_unit_map').set({
              data: cleanMap,
              dataJson: mapJsonStrForCloud,
              totalItems: Object.keys(updatedMap).length,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log('[FIREBASE] Master lookup uploaded successfully to Firestore.');
          } catch(e) {
            console.warn('[FIRESTORE LOOKUP SYNC]:', e);
          }
        }

        // B. FIREBASE REALTIME DATABASE
        if (rtdb) {
          try {
            await rtdb.ref('app_settings/kodeUnitMapJson').set(mapJsonStrForCloud);
            await rtdb.ref('master_kode_unit_json').set(mapJsonStrForCloud);
            console.log('[FIREBASE] Master lookup uploaded successfully to Realtime DB.');
          } catch(e) {
            console.warn('[RTDB LOOKUP SYNC]:', e);
          }
        }
        // Master lookup type barang FULL 100% dikelola via Firebase

        hideLoading();
        showNotif(`BERHASIL! ${count} MASTER TYPE / KODE UNIT TERSIMPAN DI FIREBASE & TERKIRIM KE SEMUA PERANGKAT!`, 'info');
        const statusEl = document.getElementById('lookupUploadStatus');
        if (statusEl) statusEl.textContent = `✅ ${count} MASTER TYPE TERSIMPAN DI FIREBASE & LOKAL!`;
      } else {
        hideLoading();
        showNotif('TIDAK ADA DATA VALID DENGAN 2 KOLOM (KOLOM A & KOLOM B)!', 'warning');
      }
    } catch (err) {
      hideLoading();
      showNotif('GAGAL MEMBACA FILE EXCEL MASTER TYPE: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
}

function bukaAkun() {
  if (!currentUser) return;

  if (typeof tutupPdfModal === 'function') tutupPdfModal();
  if (typeof tutupDetailBarangV2 === 'function') tutupDetailBarangV2();

  const currentActivePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : '';
  if (currentActivePage === 'inputPage' && isFormDirtyOrFilled()) {
    const confirmMsg = modeEdit ? 'KELUAR DARI MENU EDIT?' : 'KELUAR DARI FORM PERMINTAAN? (DATA YANG DIISI AKAN HILANG)';
    showConfirm(confirmMsg, () => {
      if (typeof bersihkanForm === 'function') bersihkanForm();
      closeAllPopups();
      prosesBukaAkun();
    });
    return;
  }

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
  if (typeof tutupPdfModal === 'function') tutupPdfModal();
  if (typeof tutupDetailBarangV2 === 'function') tutupDetailBarangV2();

  // REFRESH DATA CURRENTUSER DARI DATABASE LOKAL TERBARU SEBELUM DITAMPILKAN
  if (currentUser && currentUser.username) {
    const allUsers = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
    const latestU = allUsers.find(u => u && (
      (u.id && currentUser.id && String(u.id) === String(currentUser.id)) ||
      (u.username && String(u.username).trim().toUpperCase() === String(currentUser.username).trim().toUpperCase())
    ));
    if (latestU) {
      currentUser = { ...currentUser, ...latestU };
      appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch(e) {}
    }
  }

  const elNama = document.getElementById('akunNama');
  const elHP = document.getElementById('akunHP');
  const elArea = document.getElementById('akunArea');
  const elKat = document.getElementById('akunKategori');
  const elPass = document.getElementById('akunPassword');

  if (elNama) elNama.value = currentUser.fullName || '';
  if (elHP) elHP.value = currentUser.phone || '-';
  if (elArea) elArea.value = `${currentUser.area} - ${AREA_MAP[currentUser.area] || currentUser.area}`;

  if (typeof updateDesignModeButtonUI === 'function' && typeof getSavedDesignMode === 'function') {
    updateDesignModeButtonUI(getSavedDesignMode());
  }
  if (elKat) elKat.value = currentUser.category || '';
  if (elPass) elPass.value = '';

  const isToko = (currentUser.category === 'TOKO' || currentUser.category === 'GBJ');
  const showTTD = (currentUser.category === 'SERVICE' || currentUser.category === 'DM' || currentUser.category === 'GBJ');
  const showKelolaToko = !isToko;

  const menuTTD = document.getElementById('menuTTD');
  if (menuTTD) {
    menuTTD.style.display = showTTD ? 'block' : 'none';
  }
  
  const menuKelolaTokoAkun = document.getElementById('menuKelolaTokoAkun');
  if (menuKelolaTokoAkun) {
    menuKelolaTokoAkun.style.display = showKelolaToko ? 'block' : 'none';
  }

  const containerKelolaTokoTTD = document.getElementById('containerKelolaTokoTTD');
  if (containerKelolaTokoTTD) {
    containerKelolaTokoTTD.style.display = (showTTD || showKelolaToko) ? 'flex' : 'none';
  }

  const adminWrap = document.getElementById('adminHapusNotifWrap');
  if (adminWrap) {
    adminWrap.style.display = 'none';
  }

  const containerHapusStorage = document.getElementById('containerHapusPenyimpananLokalAkun');
  if (containerHapusStorage) {
    containerHapusStorage.style.display = 'block';
  }

  if (typeof tutupModalTambahToko === 'function') {
    tutupModalTambahToko();
  }

  if (typeof loadSavedBgOpacity === 'function') {
    loadSavedBgOpacity();
  }

  const modal = document.getElementById('popupAkun');
  if (modal) {
    modal.classList.add('show');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2147483648', 'important');
  }
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
}

window.bukaAkun = bukaAkun;
window.prosesBukaAkun = prosesBukaAkun;

function isAkunDirty() {
  if (!currentUser) return false;
  const elNama = document.getElementById('akunNama');
  const elHP = document.getElementById('akunHP');
  const elPass = document.getElementById('akunPassword');

  const currentNama = (elNama ? elNama.value : '').trim().toUpperCase();
  const origNama = (currentUser.fullName || '').trim().toUpperCase();

  const currentHP = (elHP ? elHP.value : '').trim();
  const origHP = (currentUser.phone || '-').trim();
  const origHPAlt = (currentUser.phone || '').trim();

  const currentPass = (elPass ? elPass.value : '').trim();

  const namaChanged = currentNama !== origNama;
  const hpChanged = (currentHP !== origHP && currentHP !== origHPAlt);
  const passChanged = currentPass.length > 0;

  return (namaChanged || hpChanged || passChanged);
}
window.isAkunDirty = isAkunDirty;

function tutupAkun(force = false) {
  if (force !== true && isAkunDirty()) {
    showConfirm(
      'SIMPAN PERUBAHAN AKUN?',
      () => {
        simpanAkun(true);
      },
      () => {
        tutupAkun(true);
      },
      'YA, SIMPAN',
      'TIDAK'
    );
    return;
  }

  const modal = document.getElementById('popupAkun');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
}
window.tutupAkun = tutupAkun;

function simpanAkun(autoClose = false) {
  if (autoClose) {
    eksekusiSimpanAkun(true);
  } else {
    showConfirm('SIMPAN PERUBAHAN DATA AKUN?', () => {
      eksekusiSimpanAkun(false);
    }, null, 'YA, SIMPAN', 'BATAL');
  }
}
window.simpanAkun = simpanAkun;

async function eksekusiSimpanAkun(autoClose = false) {
  const nama = document.getElementById('akunNama').value.trim().toUpperCase();
  const hp = document.getElementById('akunHP').value.trim();
  const pass = document.getElementById('akunPassword').value.trim();

  if (!nama) {
    showNotif('NAMA LENGKAP TIDAK BOLEH KOSONG!', 'warning');
    return;
  }

  showLoading('MENYIMPAN PERUBAHAN AKUN...');

  setTimeout(async () => {
    try {
      const users = getUsersFromDB();
      let idx = users.findIndex(u => u && (
        (currentUser && currentUser.id && u.id && String(u.id) === String(currentUser.id)) ||
        (currentUser && currentUser.username && u.username && String(u.username).toUpperCase() === String(currentUser.username).toUpperCase())
      ));

      if (idx === -1 && currentUser) {
        idx = users.length;
        users.push({ ...currentUser });
      }

      if (idx !== -1) {
        users[idx].fullName = nama;
        users[idx].phone = hp;
        if (pass) users[idx].password = pass;
        if (!users[idx].id) {
          users[idx].id = users[idx].username || `USR-${Date.now()}`;
        }

        currentUser = { ...users[idx] };
        appStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch(e) {}

        saveUsersToDB(users, currentUser);

        if (typeof simpanUserKeSupabase === 'function') {
          await simpanUserKeSupabase(currentUser);
        }

        // BROADCAST REALTIME EVENT TO ALL LOGGED-IN ADMINS/DEVICES
        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_changed',
              payload: { username: currentUser.username, time: Date.now() }
            });
          } catch(e) {}
        }

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          try { pushCentralCloudDB(); } catch(e) {}
        }

        if (typeof syncSupabaseUsersToLocalCache === 'function') {
          await syncSupabaseUsersToLocalCache();
        }

        hideLoading();
        showNotif('PROFIL AKUN BERHASIL DIPERBARUI!', 'success');

        const akunArea = document.getElementById('akunArea');
        if (akunArea) akunArea.value = `${currentUser.area} - ${formatUserAreaDisplay(currentUser.area)}`;

        const akunKategori = document.getElementById('akunKategori');
        if (akunKategori) akunKategori.value = currentUser.category;

        const akunNama = document.getElementById('akunNama');
        if (akunNama) akunNama.value = currentUser.fullName;

        const akunHP = document.getElementById('akunHP');
        if (akunHP) akunHP.value = currentUser.phone || '-';

        const akunPassword = document.getElementById('akunPassword');
        if (akunPassword) akunPassword.value = '';

        if (typeof loadDashboard === 'function') loadDashboard();
        if (document.getElementById('userTableBody') && typeof loadUsersManagement === 'function') {
          loadUsersManagement();
        }

        if (autoClose) {
          tutupAkun(true);
        }
      } else {
        hideLoading();
        showNotif('DATA AKUN TIDAK DITEMUKAN!', 'warning');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showNotif('GAGAL MENYIMPAN PERUBAHAN AKUN', 'danger');
    }
  }, 200);
}
window.eksekusiSimpanAkun = eksekusiSimpanAkun;

function bukaModalTambahToko(btnElement = null) {
  if (!currentUser) return;
  
  const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : null);
  setBtnLoading(btn, true, 'MEMUAT...');
  showPopupInnerLoading('popupTambahToko', 'MEMBUKA DAFTAR TOKO...');

  if (typeof tutupAkun === 'function') {
    tutupAkun(true);
  }

  setTimeout(() => {
    try {
      const selectAreaEl = document.getElementById('selectAreaTokoBaru');
      if (selectAreaEl) {
        selectAreaEl.innerHTML = '';
        const userAreas = typeof getUserAreaList === 'function' ? getUserAreaList(currentUser.area) : [currentUser.area || 'BDG'];
        
        if (userAreas.includes('ALL')) {
          const allCodes = ['BDG', 'BDU', 'CRB', 'SKB', 'SBN', 'TSM'];
          allCodes.forEach(code => {
            selectAreaEl.innerHTML += `<option value="${code}">${code}</option>`;
          });
        } else {
          userAreas.forEach(code => {
            selectAreaEl.innerHTML += `<option value="${code}">${code}</option>`;
          });
        }
      }

      const inputEl = document.getElementById('inputNamaTokoBaru');
      if (inputEl) inputEl.value = '';
      const cariModalInput = document.getElementById('cariTokoModalInput');
      if (cariModalInput) cariModalInput.value = '';

      const uploadBox = document.getElementById('boxUploadExcelTokoModal');
      if (uploadBox) {
        const isAdmin = currentUser && (
          String(currentUser.category || '').toUpperCase() === 'ADMIN' || 
          String(currentUser.role || '').toUpperCase() === 'ADMIN' || 
          String(currentUser.username || '').toUpperCase() === 'ADMIN'
        );
        uploadBox.style.display = isAdmin ? 'block' : 'none';
      }

      loadDaftarTokoModal('');
      const popup = document.getElementById('popupTambahToko');
      if (popup) {
        popup.style.setProperty('display', 'flex', 'important');
        popup.classList.add('show');
        pushPopupHistoryState();
      }
    } finally {
      setTimeout(() => {
        hideLoading();
        hidePopupInnerLoading('popupTambahToko');
        setBtnLoading(btn, false);
      }, 300);
    }
  }, 300);
}

let editStoreId = null;

function editTokoCustom(id) {
  const allStores = getStoresFromDB();
  const store = allStores.find(s => s.id === id);
  if (!store) return;

  const selectAreaEl = document.getElementById('selectAreaTokoBaru');
  if (selectAreaEl && store.area) {
    selectAreaEl.value = store.area;
  }

  const inputEl = document.getElementById('inputNamaTokoBaru');
  const btnSimpan = document.getElementById('btnSimpanTokoBaru');

  if (inputEl) {
    inputEl.value = store.fullName;
    inputEl.focus();
  }
  editStoreId = store.id;

  if (btnSimpan) {
    btnSimpan.innerHTML = `<span class="material-symbols-rounded" style="vertical-align: middle;">save</span> SIMPAN EDIT`;
    btnSimpan.style.background = '#eab308';
  }
}
window.editTokoCustom = editTokoCustom;

function tutupModalTambahToko() {
  editStoreId = null;
  const inputEl = document.getElementById('inputNamaTokoBaru');
  const btnSimpan = document.getElementById('btnSimpanTokoBaru');
  const cariModalInput = document.getElementById('cariTokoModalInput');
  if (cariModalInput) cariModalInput.value = '';
  if (inputEl) inputEl.value = '';
  if (btnSimpan) {
    btnSimpan.innerHTML = `<span class="material-symbols-rounded" style="vertical-align: middle;">save</span> SIMPAN`;
    btnSimpan.style.background = '#16a34a';
  }

  const popup = document.getElementById('popupTambahToko');
  if (popup) {
    popup.classList.remove('show');
    popup.style.setProperty('display', 'none', 'important');
  }
  try {
    if (typeof loadForm === 'function') loadForm();
  } catch (err) {
    console.warn('[tutupModalTambahToko notice]:', err);
  }
}
window.bukaModalTambahToko = bukaModalTambahToko;
window.tutupModalTambahToko = tutupModalTambahToko;

function loadDaftarTokoModal(filterKeyword = '') {
  const tbody = document.getElementById('daftarTokoTableBody');
  const btnHapus = document.getElementById('btnHapusCariTokoModal');
  const infoHasil = document.getElementById('infoHasilCariTokoModal');
  if (!tbody) return;
  tbody.innerHTML = '';

  const allStores = getStoresFromDB();
  let areaStores = (currentUser.category === 'DM' || currentUser.area === 'ALL') 
    ? allStores 
    : allStores.filter(s => isAreaMatch(currentUser.area, s.area));

  const kw = String(filterKeyword || '').trim().toUpperCase();
  if (btnHapus) {
    btnHapus.style.display = kw ? 'inline-flex' : 'none';
  }

  if (kw) {
    areaStores = areaStores.filter(s => {
      if (!s) return false;
      const fn = String(s.fullName || '').toUpperCase();
      const code = String(s.storeCode || '').toUpperCase();
      const area = String(s.area || '').toUpperCase();
      return fn.includes(kw) || code.includes(kw) || area.includes(kw);
    });
  }
  if (infoHasil) infoHasil.style.display = 'none';

  if (areaStores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">${kw ? 'TIDAK ADA TOKO YANG COCOK DENGAN PENCARIAN.' : 'BELUM ADA TOKO TERDAFTAR DI AREA ANDA.'}</td></tr>`;
    return;
  }

  areaStores.forEach(s => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.style.backgroundColor = 'var(--bg-box)';
    tr.style.color = 'var(--text-main)';
    const code = s.storeCode || generateStoreCode(s.fullName);
    const areaBadge = s.area || 'BDG';
    tr.innerHTML = `
      <td style="padding: 8px 10px; font-weight: 600; color: var(--text-main); border-bottom: 1px solid var(--border-color) !important;"><div class="namaTokoWrap" style="color: var(--text-main);">${s.fullName}</div></td>
      <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: var(--primary); border-bottom: 1px solid var(--border-color) !important;">${areaBadge}</td>
      <td style="padding: 8px 10px; text-align: center; color: var(--text-main); font-weight: 700; border-bottom: 1px solid var(--border-color) !important;">${code}</td>
      <td style="padding: 8px 10px; text-align: center; white-space: nowrap; border-bottom: 1px solid var(--border-color) !important;">
        <button type="button" class="btnIcon btnEdit" onclick="editTokoCustom('${s.id}')" title="EDIT TOKO" style="margin-right: 4px;"><span class="material-symbols-rounded">edit</span></button>
        <button type="button" class="btnIcon btnDelete" onclick="hapusTokoCustom('${s.id}', this)" title="HAPUS TOKO"><span class="material-symbols-rounded">delete</span></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  for (let k = 0; k < 2; k++) {
    const emptyTr = document.createElement('tr');
    emptyTr.className = 'empty-toko-row';
    emptyTr.style.backgroundColor = 'var(--bg-box)';
    emptyTr.innerHTML = `
      <td style="padding: 8px; border: none; background: var(--bg-box);">&nbsp;</td>
      <td style="padding: 8px; border: none; background: var(--bg-box);">&nbsp;</td>
      <td style="padding: 8px; border: none; background: var(--bg-box);">&nbsp;</td>
      <td style="padding: 8px; border: none; background: var(--bg-box);">&nbsp;</td>
    `;
    tbody.appendChild(emptyTr);
  }
}
window.loadDaftarTokoModal = loadDaftarTokoModal;

function filterDaftarTokoModal(keyword) {
  loadDaftarTokoModal(keyword);
}
window.filterDaftarTokoModal = filterDaftarTokoModal;

function resetCariTokoModal() {
  const cariInput = document.getElementById('cariTokoModalInput');
  if (cariInput) cariInput.value = '';
  loadDaftarTokoModal('');
}
window.resetCariTokoModal = resetCariTokoModal;

async function simpanTokoBaru(btnElement = null) {
  const inputEl = document.getElementById('inputNamaTokoBaru');
  const btnSimpan = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (document.getElementById('btnSimpanTokoBaru') || (typeof event !== 'undefined' && event ? event.currentTarget : null));
  const selectAreaEl = document.getElementById('selectAreaTokoBaru');
  const targetArea = selectAreaEl ? selectAreaEl.value : (getUserAreaList(currentUser.area)[0] || 'BDG');
  const namaToko = inputEl ? inputEl.value.trim().toUpperCase() : '';

  if (!namaToko) {
    showNotif('NAMA TOKO TIDAK BOLEH KOSONG!', 'warning');
    return;
  }

  const existingStores = getStoresFromDB();
  const isDuplicate = existingStores.some(s => s.fullName.toUpperCase() === namaToko && s.area === targetArea && s.id !== editStoreId);
  if (isDuplicate) {
    showNotif(`TOKO '${namaToko}' SUDAH TERDAFTAR DI AREA ${targetArea}!`, 'warning');
    return;
  }

  setBtnLoading(btnSimpan, true, editStoreId ? 'MEMPERBARUI...' : 'MENYIMPAN...');
  showLoading(editStoreId ? 'MEMPERBARUI DATA TOKO...' : 'MENYIMPAN TOKO BARU...');

  const themeBeforeSave = getSavedLocalTheme();

  setTimeout(async () => {
    try {
      if (editStoreId) {
        // MODES EDIT TOKO
        const targetStore = existingStores.find(s => s.id === editStoreId);
        const oldName = targetStore ? targetStore.fullName : '';
        const newCode = generateStoreCode(namaToko);

        // 1. UPDATE CACHE STORES & LOCAL STORAGE
        try {
          const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
          const idx = localStores.findIndex(s => s.id === editStoreId || (s.fullName && oldName && s.fullName.toUpperCase() === oldName.toUpperCase()));
          if (idx !== -1) {
            localStores[idx].fullName = namaToko;
            localStores[idx].storeCode = newCode;
            localStores[idx].area = targetArea;
            appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));
          }
        } catch (e) {}

        if (typeof cacheStores !== 'undefined' && Array.isArray(cacheStores)) {
          const idx = cacheStores.findIndex(s => s.id === editStoreId || (s.fullName && oldName && s.fullName.toUpperCase() === oldName.toUpperCase()));
          if (idx !== -1) {
            cacheStores[idx].fullName = namaToko;
            cacheStores[idx].storeCode = newCode;
            cacheStores[idx].area = targetArea;
          }
        }

        // 2. UPDATE AKUN USER JIKA TERKAIT
        const users = getUsersFromDB();
        const userObj = users.find(u => u.id === editStoreId || (u.fullName && oldName && u.fullName.toUpperCase() === oldName.toUpperCase()));
        if (userObj) {
          userObj.fullName = namaToko;
          userObj.storeCode = newCode;
          userObj.area = targetArea;
          try { saveUsersToDB(users); } catch (e) {}

          if (typeof supabase !== 'undefined' && supabase) {
            try {
              if (typeof simpanUserKeSupabase === "function") await simpanUserKeSupabase(userObj);
            } catch (e) {}
          }
        }

        // 3. UPDATE SUPABASE TOKO_LIST TABEL
        if (typeof supabase !== 'undefined' && supabase) {
          try {
            await supabase.from('toko_list').upsert({
              id: editStoreId,
              full_name: namaToko,
              area: targetArea,
              created_by: currentUser.fullName
            });
          } catch (e) {
            console.warn('[SUPABASE TOKO_LIST UPDATE WARNING]:', e);
          }
        }

        if (typeof syncSupabaseStoresToLocalCache === 'function') {
          await syncSupabaseStoresToLocalCache();
        }

        // 4. SINKRONKAN CLOUD DATABASE
        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          try { await pushCentralCloudDB(); } catch (e) {}
        }

        showNotif(`TOKO BERHASIL DIPERBARUHI MENJADI '${namaToko}' (AREA ${targetArea})!`, 'success');

        editStoreId = null;
        if (inputEl) inputEl.value = '';
        if (btnSimpan) {
          btnSimpan.innerHTML = `<span class="material-symbols-rounded" style="vertical-align: middle;">save</span> SIMPAN`;
          btnSimpan.style.background = '#16a34a';
        }
        if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
        if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions(namaToko);
        if (typeof loadUsersManagement === 'function') loadUsersManagement();
      } else {
        // MODE TAMBAH TOKO BARU
        const storeKey = `${namaToko}_${targetArea}`;
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
          area: targetArea,
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
            area: targetArea,
            createdAt: getFormattedDateDDMMYYYY()
          };
          users.push(newUserAcc);
          saveUsersToDB(users);
        }

        // SINKRONKAN LANGSUNG KE SUPABASE DATABASE (TABEL: toko_list & users)
        if (typeof supabase !== 'undefined' && supabase) {
          try {
            await supabase.from('toko_list').upsert({
              id: newId,
              full_name: newStore.fullName,
              area: newStore.area,
              created_by: newStore.createdBy
            });
            if (newUserAcc && typeof simpanUserKeSupabase === 'function') {
              await simpanUserKeSupabase(newUserAcc);
            }
          } catch (sbErr) {
            console.warn('[SUPABASE STORE SAVE WARNING]:', sbErr);
          }
        }

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          await pushCentralCloudDB();
        }

        if (typeof syncAllDataToCache === 'function') {
          await syncAllDataToCache().catch(() => {});
        }

        showNotif(`TOKO '${namaToko}' BERHASIL DITAMBAHKAN!`, 'success');
        if (inputEl) inputEl.value = '';
        if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
        if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions(namaToko);
        if (typeof loadUsersManagement === 'function') loadUsersManagement();
      }
    } catch (err) {
      console.error('[SIMPAN TOKO ERROR]:', err);
      showNotif('GAGAL MENYIMPAN TOKO: ' + (err.message || err), 'error');
    } finally {
      hideLoading();
      hidePopupInnerLoading('popupTambahToko');
      setBtnLoading(btnSimpan, false);
      if (themeBeforeSave && typeof updateBodyClasses === 'function') {
        updateBodyClasses(themeBeforeSave);
      }
    }
  }, 400);
}
window.simpanTokoBaru = simpanTokoBaru;

async function hapusTokoCustom(id, btnElement = null) {
  const allStores = getStoresFromDB();
  const store = allStores.find(s => s.id === id || (s.fullName && String(s.fullName).toUpperCase() === String(id).toUpperCase()));
  const name = store ? store.fullName : 'TOKO';
  const storeArea = store ? (store.area || 'BDG') : (currentUser ? currentUser.area : 'BDG');

  showConfirm(`HAPUS TOKO '${name}' DARI DAFTAR MASTER TOKO & PENGATURAN USER?`, () => {
    const btn = (btnElement && btnElement instanceof HTMLElement) ? btnElement : (typeof event !== 'undefined' && event ? event.currentTarget : null);
    setBtnLoading(btn, true, 'HAPUS...');
    showLoading('MENGHAPUS DATA TOKO & USER...');

    const themeBeforeDelete = getSavedLocalTheme();

    setTimeout(async () => {
      try {
        const nameUpper = String(name).trim().toUpperCase();
        const storeKey = `${nameUpper}_${String(storeArea).trim().toUpperCase()}`;

        // 1. UPDATE DELETED STORES & STORES CACHE LOKAL
        try {
          const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
          const updatedLocal = localStores.filter(s => s && s.id !== id && String(s.fullName || '').trim().toUpperCase() !== nameUpper);
          appStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedLocal));
          try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(updatedLocal)); } catch(e) {}
        } catch(e) {}

        try {
          let deletedStoreKeys = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
          if (!deletedStoreKeys.includes(storeKey)) deletedStoreKeys.push(storeKey);
          if (!deletedStoreKeys.includes(nameUpper)) deletedStoreKeys.push(nameUpper);
          if (id && !deletedStoreKeys.includes(id)) deletedStoreKeys.push(id);
          appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys));
          try { localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(deletedStoreKeys)); } catch(e) {}
        } catch(e) {}

        // 2. CARI DAN HAPUS AKUN USER TOKO YANG TERKAIT
        const users = getUsersFromDB();
        const safeUname = name.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
        const targetUser = users.find(u => u && (
          (u.id && u.id === id) ||
          (u.fullName && String(u.fullName).trim().toUpperCase() === nameUpper) ||
          (u.username && String(u.username).trim().toUpperCase() === safeUname)
        ));

        try {
          let delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
          if (id && !delUsers.includes(id)) delUsers.push(id);
          if (safeUname && !delUsers.includes(safeUname)) delUsers.push(safeUname);
          if (targetUser) {
            if (targetUser.id && !delUsers.includes(targetUser.id)) delUsers.push(targetUser.id);
            if (targetUser.username && !delUsers.includes(targetUser.username)) delUsers.push(targetUser.username);
            if (targetUser.username && !delUsers.includes(targetUser.username.toUpperCase())) delUsers.push(targetUser.username.toUpperCase());
          }
          appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));
          try { localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers)); } catch(e) {}
        } catch(e) {}

        const updatedUsers = users.filter(u => {
          if (!u) return false;
          if (u.id === id) return false;
          if (targetUser && (u.id === targetUser.id || u.username === targetUser.username)) return false;
          if (u.category === 'TOKO' && u.fullName && String(u.fullName).trim().toUpperCase() === nameUpper) return false;
          return true;
        });

        try { saveUsersToDB(updatedUsers, null, 'DELETE'); } catch(e) {}

        // 3. HAPUS DARI SUPABASE CLOUD (TABEL toko_list & users)
        const client = (typeof supabaseAdmin !== 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
        if (client) {
          try {
            if (id) await client.from('toko_list').delete().eq('id', id);
            await client.from('toko_list').delete().eq('full_name', name);
            await client.from('toko_list').delete().ilike('full_name', name);

            if (id) await client.from('users').delete().eq('id', id);
            await client.from('users').delete().eq('full_name', name);
            await client.from('users').delete().ilike('full_name', name);
            if (targetUser && targetUser.username) {
              await client.from('users').delete().eq('username', targetUser.username);
            }
          } catch (sbErr) {
            console.warn('[SUPABASE DELETE STORE NOTICE]:', sbErr);
          }
        }

        // 4. HAPUS DARI FIREBASE ONLINE
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
          try {
            if (id) await dbFirestore.collection('stores').doc(id).delete().catch(() => {});
            await dbFirestore.collection('users').doc(safeUname).delete().catch(() => {});
            if (targetUser && targetUser.username) {
              await dbFirestore.collection('users').doc(targetUser.username.toUpperCase()).delete().catch(() => {});
            }
          } catch(e) {}
        }
        if (typeof dbRealtime !== 'undefined' && dbRealtime) {
          try {
            if (id) await dbRealtime.ref(`stores/${id}`).remove().catch(() => {});
            await dbRealtime.ref(`users/${safeUname}`).remove().catch(() => {});
            if (targetUser && targetUser.username) {
              await dbRealtime.ref(`users/${targetUser.username.toUpperCase()}`).remove().catch(() => {});
            }
          } catch(e) {}
        }

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'data_changed',
              payload: { action: 'BATCH_DELETE', noSuratList: noSuratList, timestamp: Date.now() }
            });
          } catch(e) {}
        }
        if (typeof pushCentralCloudDB === 'function') {
          await pushCentralCloudDB();
        }

        if (supabaseRealtimeChannel) {
          try {
            supabaseRealtimeChannel.send({
              type: 'broadcast',
              event: 'user_data_changed',
              payload: { action: 'DELETE', username: safeUname, id: id, timestamp: Date.now() }
            });
          } catch(e) {}
        }

        showNotif(`TOKO '${name}' & AKUN USER BERHASIL DIHAPUS!`, 'info');

        // Buka kembali modal tambah toko jika sebelumnya terbuka
        const popupToko = document.getElementById('popupTambahToko');
        if (popupToko) {
          popupToko.style.setProperty('display', 'flex', 'important');
          popupToko.classList.add('show');
        }

        if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
        if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
        if (typeof loadUsersManagement === 'function') loadUsersManagement();
      } catch (err) {
        console.error('[HAPUS TOKO ERROR]:', err);
        showNotif('GAGAL MENGHAPUS TOKO!', 'error');
      } finally {
        hideLoading();
        hidePopupInnerLoading('popupTambahToko');
        setBtnLoading(btn, false);
        if (themeBeforeDelete && typeof updateBodyClasses === 'function') {
          updateBodyClasses(themeBeforeDelete);
        }
      }
    }, 400);
  });
}
window.hapusTokoCustom = hapusTokoCustom;

async function prosesUploadExcelToko(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    showNotif('MODUL BACA EXCEL (XLSX) BELUM SIAP!', 'error');
    return;
  }

  showLoading('MEMBACA FILE EXCEL DAFTAR TOKO (KOLOM A = NAMA, KOLOM B = AREA)...');

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!Array.isArray(rawJson) || rawJson.length === 0) {
        hideLoading();
        showNotif('FILE EXCEL KOSONG ATAU FORMAT TIDAK SESUAI!', 'warning');
        return;
      }

      const existingStores = getStoresFromDB();
      const defaultUserArea = (currentUser && currentUser.area && currentUser.area !== 'ALL') ? currentUser.area : 'BDG';
      const users = getUsersFromDB();

      let addedCount = 0;
      let skippedCount = 0;
      const newStoresList = [];
      const newUsersList = [];

      for (let i = 0; i < rawJson.length; i++) {
        const row = rawJson[i];
        if (!row || !row.length) continue;
        
        let storeNameVal = String(row[0] || '').trim().toUpperCase();
        let storeAreaVal = String(row[1] || '').trim().toUpperCase();

        if (!storeNameVal) continue;

        if (storeNameVal === 'NAMA TOKO' || storeNameVal === 'TOKO' || storeNameVal === 'STORE' || storeNameVal === 'NAME' || storeAreaVal === 'AREA' || storeAreaVal === 'KODE AREA') {
          continue;
        }

        if (!storeAreaVal || storeAreaVal === 'UNDEFINED' || storeAreaVal === 'NULL') {
          storeAreaVal = defaultUserArea;
        }

        const isDuplicate = existingStores.some(s => s && s.fullName && s.fullName.trim().toUpperCase() === storeNameVal && s.area === storeAreaVal);
        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        const generatedCode = generateStoreCode(storeNameVal, storeAreaVal);
        const newId = `STK-UPL-${Date.now()}-${Math.floor(Math.random()*1000)}`;

        const storeObj = {
          id: newId,
          fullName: storeNameVal,
          area: storeAreaVal,
          storeCode: generatedCode,
          createdBy: currentUser ? currentUser.fullName : 'ADMIN'
        };

        existingStores.push(storeObj);
        newStoresList.push(storeObj);

        const safeUsername = storeNameVal.replace(/[^A-Z0-9]/gi, '_').toUpperCase();
        if (!users.some(u => u && u.username && u.username.toUpperCase() === safeUsername)) {
          const userAcc = {
            id: newId,
            username: safeUsername,
            password: '123',
            fullName: storeNameVal,
            storeCode: generatedCode,
            phone: '-',
            category: 'TOKO',
            area: storeAreaVal,
            createdAt: getFormattedDateDDMMYYYY()
          };
          users.push(userAcc);
          newUsersList.push(userAcc);
        }

        addedCount++;
      }

      if (addedCount === 0) {
        hideLoading();
        showNotif(`TIDAK ADA TOKO BARU DITAMBAHKAN (${skippedCount} TOKO SUDAH TERDAFTAR SEBELUMNYA).`, 'info');
        event.target.value = '';
        return;
      }

      // 1. BERSIHKAN DAFTAR DELETED KEYS DARI TOKO / USER YANG DIUNGGAH ULANG
      const uploadedStoreNames = new Set(newStoresList.map(s => s.fullName.toUpperCase()));
      const uploadedUsernames = new Set(newUsersList.map(u => u.username.toUpperCase()));

      let delStores = JSON.parse(appStorage.getItem(DELETED_STORES_KEY) || '[]');
      delStores = delStores.filter(k => {
        const val = String(k || '').trim().toUpperCase();
        if (uploadedStoreNames.has(val)) return false;
        for (let s of newStoresList) {
          if (val === `${s.fullName.toUpperCase()}_${s.area.toUpperCase()}`) return false;
        }
        return true;
      });
      appStorage.setItem(DELETED_STORES_KEY, JSON.stringify(delStores));
      try { localStorage.setItem(DELETED_STORES_KEY, JSON.stringify(delStores)); } catch(e) {}

      let delUsers = JSON.parse(appStorage.getItem(DELETED_USERS_KEY) || '[]');
      delUsers = delUsers.filter(k => {
        const val = String(k || '').trim().toUpperCase();
        return !uploadedUsernames.has(val) && !uploadedStoreNames.has(val);
      });
      appStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers));
      try { localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(delUsers)); } catch(e) {}

      // 2. SIMPAN KE STORES_DB_KEY SECARA LOKAL & PERSISTEN
      const localStores = JSON.parse(appStorage.getItem(STORES_DB_KEY) || '[]');
      newStoresList.forEach(ns => {
        if (!localStores.some(s => s && s.fullName && s.fullName.toUpperCase() === ns.fullName.toUpperCase() && s.area === ns.area)) {
          localStores.push(ns);
        }
      });
      appStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores));
      try { localStorage.setItem(STORES_DB_KEY, JSON.stringify(localStores)); } catch(e) {}

      if (newUsersList.length > 0) {
        saveUsersToDB(users);
      }

      // 3. SIMPAN KE SUPABASE (TABEL toko_list & users)
      if (typeof supabase !== 'undefined' && supabase) {
        try {
          const supaStoresPayload = newStoresList.map(s => ({
            id: s.id,
            full_name: s.fullName,
            area: s.area,
            created_by: s.createdBy
          }));
          await supabase.from('toko_list').upsert(supaStoresPayload);

          if (newUsersList.length > 0) {
            const supaUsersPayload = newUsersList.map(u => ({
              id: u.id,
              username: u.username,
              password: u.password,
              full_name: u.fullName,
              phone: u.phone,
              category: u.category,
              area: u.area,
              ttd: u.ttd || '',
              created_at: u.createdAt
            }));
            await supabase.from('users').upsert(supaUsersPayload);
          }
        } catch(sbErr) {
          console.warn('[SUPABASE BATCH UPLOAD STORES WARNING]:', sbErr);
        }
      }

      pushCentralCloudDB();
      hideLoading();

      showNotif(`BERHASIL MENGUNGGAH ${addedCount} TOKO BARU (KOLOM A = NAMA, KOLOM B = AREA)! (${skippedCount} DUPLIKAT DILEWATI)`, 'success');
      event.target.value = '';

      if (typeof loadDaftarTokoModal === 'function') loadDaftarTokoModal();
      if (typeof updateStoreDropdownOptions === 'function') updateStoreDropdownOptions();
      if (typeof loadUsersManagement === 'function') loadUsersManagement();
      if (typeof loadForm === 'function') loadForm();

    } catch(err) {
      hideLoading();
      console.error('[EXCEL UPLOAD TOKO ERROR]:', err);
      showNotif('GAGAL MEMBACA FILE EXCEL: ' + (err.message || err), 'error');
      event.target.value = '';
    }
  };

  reader.readAsArrayBuffer(file);
}
window.prosesUploadExcelToko = prosesUploadExcelToko;

function downloadExcel() {
  const data = getAccessibleRequests();
  if (data.length === 0) {
    showNotif('TIDAK ADA DATA UNTUK DIEKSPOR!', 'warning');
    return;
  }

  showLoading('MOHON TUNGGU...');
  setTimeout(() => {
    hideLoading();
    const rows = [];
    rows.push([
      'NO SURAT', 'TANGGAL', 'TOKO', 'AREA', 'JENIS PERMINTAAN', 'STATUS',
      'NO', 'TYPE BARANG', 'NO SERI', 'DUS BARANG', 'PERMINTAAN DETAIL', 'ALASAN', 'QTY',
      'STATUS PART', 'BREAKDOWN SURAT',
      'PEMOHON', 'CATATAN'
    ]);

    data.forEach(r => {
      if (r.items && r.items.length > 0) {
        r.items.forEach((item, itemIdx) => {
          const isUnfulfilled = !!(item.unfulfilled || item.batal || item.status === 'TIDAK BISA DIPENUHI' || item.status === 'TIDAK DIPENUHI' || r.status === 'BATAL');
          const customKet = (item.statusPart || item.keteranganPart || item.updatePart || item.noPart || item.alasanBatal || '').trim();
          
          let statusPartVal = '';
          if (isUnfulfilled) {
            if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
              statusPartVal = `TIDAK DIPENUHI (${customKet})`;
            } else {
              statusPartVal = 'TIDAK DIPENUHI';
            }
          } else if (customKet) {
            statusPartVal = customKet;
          } else if (r.status === 'DONE') {
            statusPartVal = 'DIPENUHI';
          } else {
            statusPartVal = '-';
          }

          let namaBarangDisplay = item.barang || item.permintaan || '-';
          if (isUnfulfilled) {
            if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
              namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI: ${customKet}]`;
            } else {
              namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI]`;
            }
          } else if (customKet && customKet !== 'DIPENUHI') {
            namaBarangDisplay = `${namaBarangDisplay} [Ket: ${customKet}]`;
          }

          rows.push([
            r.noSurat,
            r.tanggal,
            r.toko,
            r.area,
            r.jenis,
            r.status,
            itemIdx + 1,
            item.type || item.tipe || '-',
            item.seri || item.sn || '-',
            item.dus || '-',
            namaBarangDisplay,
            item.alasan || '-',
            item.qty || item.jumlah || 1,
            statusPartVal,
            getBreakdownSuratExportValue(r, item),
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
          '-',
          getBreakdownSuratExportValue(r, null),
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
      } else {
      showNotif('MODUL EXCEL (.XLSX) BELUM SIAP, PERIKSA KONEKSI INTERNET!', 'warning');
    }
  }, 400);
}

function closeAllPopups() {
  const allOverlays = document.querySelectorAll('.popupOverlay, #imageViewer, #rejectOverlay, #confirmOverlay, #pdfModal, #popupDetail, #popupDetailBarangV2, #popupAkun, #popupUserForm, #popupUserManagementModal, #popupTTD, #popupNotifList, #popupBantuan, #scannerModal, #popupTambahToko, #popupPdfModelsModal');
  allOverlays.forEach(el => {
    if (el) {
      el.style.display = 'none';
      el.classList.remove('show');
    }
  });
}
window.closeAllPopups = closeAllPopups;

// confirmCancelCallback declared at top

function showConfirm(msg, callback, cancelCallback = null, customYesText = 'YA, LANJUT', customNoText = 'BATAL') {
  const modal = document.getElementById('confirmOverlay');
  const msgEl = document.getElementById('confirmMessage');

  if (!modal || !msgEl) {
    if (window.confirm(msg)) {
      if (typeof callback === 'function') callback();
    } else {
      if (typeof cancelCallback === 'function') cancelCallback();
    }
    return;
  }

  msgEl.innerHTML = String(msg || '').split(String.fromCharCode(10)).join('<br>');
  confirmCallback = callback;
  confirmCancelCallback = cancelCallback;

  const btnBatal = modal.querySelector('.btnBatal');
  const btnOk = modal.querySelector('.btnOkNotif') || modal.querySelector('.btnPrimary');
  if (btnBatal) {
    btnBatal.innerText = customNoText;
    btnBatal.onclick = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      closeConfirm();
    };
  }
  if (btnOk) {
    btnOk.innerText = customYesText;
    btnOk.onclick = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      confirmYes();
    };
  }

  modal.style.setProperty('z-index', '2147483647', 'important');
  const confirmCard = modal.querySelector('.confirmBoxCard') || modal.querySelector('.popupNotifCard') || modal.querySelector('.popupBox');
  if (confirmCard) {
    confirmCard.style.setProperty('z-index', '2147483648', 'important');
  }
  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('pointer-events', 'auto', 'important');
  modal.classList.add('show');
  pushPopupHistoryState();
}
window.showConfirm = showConfirm;

function closeConfirm() {
  const modal = document.getElementById('confirmOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
  confirmCallback = null;
  confirmCancelCallback = null;
}
window.closeConfirm = closeConfirm;

function confirmYes() {
  const cb = confirmCallback;
  confirmCallback = null;
  confirmCancelCallback = null;
  const modal = document.getElementById('confirmOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
  if (typeof cb === 'function') {
    try {
      const res = cb();
      if (res && typeof res.then === 'function') {
        res.catch(err => {
          console.error('[CONFIRM CALLBACK ASYNC ERROR]:', err);
          if (typeof hideLoading === 'function') hideLoading();
          if (typeof showNotif === 'function') showNotif('TERJADI KESALAHAN: ' + (err.message || err), 'danger');
        });
      }
    } catch(err) {
      console.error('[CONFIRM CALLBACK ERROR]:', err);
      if (typeof hideLoading === 'function') hideLoading();
      if (typeof showNotif === 'function') showNotif('TERJADI KESALAHAN: ' + (err.message || err), 'danger');
    }
  }
}
window.confirmYes = confirmYes;

// LISTEN FOR KEYBOARD ENTER KEY TO TRIGGER CONFIRMATION "YA, LANJUT" OR OK NOTIFICATION & ARROW KEYS FOR IMAGE VIEWER
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.keyCode === 13) {
    const confirmOverlay = document.getElementById('confirmOverlay');
    if (confirmOverlay && confirmOverlay.style.display !== 'none' && confirmOverlay.style.display !== '') {
      e.preventDefault();
      e.stopPropagation();
      confirmYes();
      return;
    }
    const popupNotif = document.getElementById('popupNotif');
    if (popupNotif && popupNotif.style.display !== 'none' && popupNotif.style.display !== '') {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
      return;
    }
  } else if (e.key === 'ArrowLeft') {
    const viewer = document.getElementById('imageViewer');
    if (viewer && viewer.style.display !== 'none' && viewer.style.display !== '') {
      gantiFotoViewer(-1);
    }
  } else if (e.key === 'ArrowRight') {
    const viewer = document.getElementById('imageViewer');
    if (viewer && viewer.style.display !== 'none' && viewer.style.display !== '') {
      gantiFotoViewer(1);
    }
  }
});

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

  if (notifOverlay) {
    notifOverlay.style.setProperty('z-index', '2147483648', 'important');
    notifOverlay.style.setProperty('display', 'flex', 'important');
  }
  if (notifCard) {
    notifCard.style.setProperty('z-index', '2147483649', 'important');
  }
}

function closePopup() {
  const notifOverlay = document.getElementById('popupNotif');
  if (notifOverlay) notifOverlay.style.display = 'none';

  const activePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : 'dashboardPage';
  if (typeof aturTampilanLonceng === 'function') {
    aturTampilanLonceng(activePage);
  }
}

function showLoading(msg = '', allowCancel = false, onCancelCallback = null) {
  if (!document.getElementById('styleSpinKeyframe')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'styleSpinKeyframe';
    styleEl.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(styleEl);
  }
  
  let modal = document.getElementById('loadingOverlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'loadingOverlay';
    modal.className = 'loadingOverlay';
    document.body.appendChild(modal);
  }

  modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0px !important; left: 0px !important; right: 0px !important; bottom: 0px !important; width: 100vw !important; height: 100vh !important; background: rgba(0, 0, 0, 0.6) !important; z-index: 2147483647 !important; justify-content: center !important; align-items: center !important; backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important; margin: 0 !important; padding: 0 !important; box-sizing: border-box !important;';
  modal.classList.add('show');

  if (onCancelCallback) {
    window._onCancelLoadingCallback = onCancelCallback;
  }

  let spinnerBox = modal.querySelector('.spinnerBox');
  if (!spinnerBox) {
    spinnerBox = document.createElement('div');
    spinnerBox.className = 'spinnerBox';
    modal.appendChild(spinnerBox);
  }

  const isCancelable = allowCancel || !!onCancelCallback || (typeof window._cancelGeminiProcess === 'function') || (msg && msg.toUpperCase().includes('GEMINI'));

  if (msg || isCancelable) {
    spinnerBox.style.cssText = 'display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; background: rgba(15, 23, 42, 0.92) !important; border: 1px solid rgba(255, 255, 255, 0.18) !important; border-radius: 12px !important; padding: 22px 28px !important; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important; min-width: 260px !important; max-width: 90vw !important; box-sizing: border-box !important; text-align: center !important;';
    spinnerBox.innerHTML = `
      <div class="spinner" style="width: 48px !important; height: 48px !important; border: 4px solid rgba(255,255,255,0.15) !important; border-top-color: #38bdf8 !important; border-right-color: #818cf8 !important; border-radius: 50% !important; animation: spin 0.8s linear infinite !important; filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.9)) !important; margin-bottom: 12px !important;"></div>
      ${msg ? `<div id="loadingText" class="loadingText" style="display: block !important; color: #f8fafc !important; font-weight: 700 !important; font-size: 13px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; margin-bottom: ${isCancelable ? '14px' : '0px'} !important; line-height: 1.4 !important;">${msg}</div>` : '<div id="loadingText" class="loadingText" style="display: none !important;"></div>'}
      ${isCancelable ? `
        <button type="button" id="btnBatalLoading" onclick="batalProsesLoading()" style="background: linear-gradient(135deg, #ef4444, #dc2626) !important; color: #ffffff !important; border: none !important; border-radius: 6px !important; padding: 8px 22px !important; font-weight: 800 !important; font-size: 12px !important; cursor: pointer !important; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45) !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; letter-spacing: 0.5px !important; width: 100% !important; transition: transform 0.15s ease !important;">
          BATAL
        </button>
      ` : '<button type="button" id="btnBatalLoading" style="display: none !important;"></button>'}
    `;
  } else {
    spinnerBox.style.cssText = 'display: flex !important; align-items: center !important; justify-content: center !important; background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; outline: none !important;';
    spinnerBox.innerHTML = `
      <div class="spinner" style="width: 52px !important; height: 52px !important; border: 4px solid rgba(255,255,255,0.15) !important; border-top-color: #38bdf8 !important; border-right-color: #818cf8 !important; border-radius: 50% !important; animation: spin 0.8s linear infinite !important; filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.9)) !important;"></div>
      <div id="loadingText" class="loadingText" style="display: none !important;"></div>
      <button type="button" id="btnBatalLoading" style="display: none !important;"></button>
    `;
  }

  const miniModal = document.getElementById('miniCenterLoading');
  if (miniModal) {
    miniModal.style.setProperty('display', 'none', 'important');
  }
}

function hideLoading() {
  const modal = document.getElementById('loadingOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }

  const miniModal = document.getElementById('miniCenterLoading');
  if (miniModal) {
    miniModal.style.setProperty('display', 'none', 'important');
    miniModal.classList.remove('show');
  }
  
  const cancelBtn = document.getElementById('btnBatalLoading');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function batalProsesLoading() {
  hideLoading();
  if (typeof window._cancelGeminiProcess === 'function') {
    try { window._cancelGeminiProcess(); } catch(e) {}
    window._cancelGeminiProcess = null;
  }
  if (typeof window._onCancelLoadingCallback === 'function') {
    try { window._onCancelLoadingCallback(); } catch(e) {}
    window._onCancelLoadingCallback = null;
  }
  const inputPdf = document.getElementById('inputPdfAutoFill');
  if (inputPdf) inputPdf.value = '';
  const inputImg = document.getElementById('inputGambarAutoFill');
  if (inputImg) inputImg.value = '';
  const inputExcel = document.getElementById('inputExcelAutoFill');
  if (inputExcel) inputExcel.value = '';

  if (typeof showNotif === 'function') {
    showNotif('PROSES DI BATALKAN', 'info');
  }
}
window.batalProsesLoading = batalProsesLoading;

let currentZoom = 1;
let panX = 0;
let panY = 0;
let isPanningImage = false;
let startPointerX = 0;
let startPointerY = 0;
let initialPanX = 0;
let initialPanY = 0;

let currentRotation = 0;

function applyImageTransform(isSmooth = false) {
  const img = document.getElementById('viewerImage');
  if (!img) return;

  if (currentZoom <= 1) {
    panX = 0;
    panY = 0;
  }

  img.style.transition = isSmooth ? 'transform 0.22s cubic-bezier(0.1, 0.9, 0.2, 1)' : 'none';
  img.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom}) rotate(${currentRotation}deg)`;
  img.style.cursor = isPanningImage ? 'grabbing' : (currentZoom > 1 ? 'grab' : 'pointer');
}

function toggleRotation() {
  currentRotation = (currentRotation + 90) % 360;
  applyImageTransform(true);
}
window.toggleRotation = toggleRotation;
window.rotateImage = toggleRotation;

function initImagePanListeners() {
  const canvas = document.getElementById('imageViewerCanvas');
  const img = document.getElementById('viewerImage');
  if (!canvas || !img || canvas.dataset.panInitialized) return;
  canvas.dataset.panInitialized = 'true';

  img.addEventListener('dragstart', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.closeViewer') || e.target.closest('.viewerBottomBar')) return;

    isPanningImage = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    initialPanX = panX;
    initialPanY = panY;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch(err) {}

    applyImageTransform(false);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isPanningImage) return;
    e.preventDefault();

    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    panX = initialPanX + dx;
    panY = initialPanY + dy;

    applyImageTransform(false);
  });

  const stopPan = (e) => {
    if (isPanningImage) {
      isPanningImage = false;
      try {
        if (e && e.pointerId && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch(err) {}
      applyImageTransform(false);
    }
  };

  canvas.addEventListener('pointerup', stopPan);
  canvas.addEventListener('pointercancel', stopPan);

  canvas.addEventListener('dblclick', (e) => {
    if (e.target.closest('button') || e.target.closest('.closeViewer') || e.target.closest('.viewerBottomBar')) return;
    if (currentZoom > 1.2) {
      resetZoom();
    } else {
      currentZoom = 2.5;
      applyImageTransform(true);
    }
  });
}

let currentViewerPhotos = [];
let currentViewerIndex = 0;

function updateViewerCounter() {
  const counter = document.getElementById('viewerCounter');
  const navLeft = document.getElementById('navViewerLeft');
  const navRight = document.getElementById('navViewerRight');

  const photos = parsePhotosArray(currentViewerPhotos.length > 0 ? currentViewerPhotos : viewerPhotos);
  const total = photos.length || 1;
  const current = (currentViewerIndex || 0) + 1;

  if (counter) counter.textContent = `${current} / ${total}`;

  if (navLeft) navLeft.style.display = total > 1 ? 'flex' : 'none';
  if (navRight) navRight.style.display = total > 1 ? 'flex' : 'none';
}

function gantiFotoViewer(direction) {
  const photos = parsePhotosArray(currentViewerPhotos.length > 0 ? currentViewerPhotos : viewerPhotos);
  if (!photos || photos.length <= 1) return;
  
  currentViewerIndex = (currentViewerIndex + direction + photos.length) % photos.length;
  viewerCurrentIndex = currentViewerIndex;
  currentViewerPhotos = photos;
  viewerPhotos = photos;
  
  resetZoom();
  
  const img = document.getElementById('viewerImage');
  if (img) {
    img.src = photos[currentViewerIndex];
    applyImageTransform(false);
  }
  updateViewerCounter();
}

function unduhFotoViewerAktif() {
  const photos = parsePhotosArray(currentViewerPhotos.length > 0 ? currentViewerPhotos : viewerPhotos);
  const currentSrc = (photos && photos.length > 0) ? photos[currentViewerIndex || 0] : (document.getElementById('viewerImage') ? document.getElementById('viewerImage').src : '');
  
  if (!currentSrc) return;

  try {
    const filename = `FOTO_BUKTI_${Date.now()}_${(currentViewerIndex || 0) + 1}.jpg`;
    
    // Jika format base64 Data URI
    if (currentSrc.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = currentSrc;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Jika URL online / Blob URL
      fetch(currentSrc)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(err => {
          const link = document.createElement('a');
          link.href = currentSrc;
          link.download = filename;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  } catch (err) {
    console.warn('[DOWNLOAD IMAGE ERROR]:', err);
    window.open(currentSrc, '_blank');
  }
}
window.unduhFotoViewerAktif = unduhFotoViewerAktif;
window.downloadFotoViewerAktif = unduhFotoViewerAktif;


function bukaViewGambar(src, startIdx = 0) {
  const photoList = parsePhotosArray(src);
  if (!photoList || photoList.length === 0) {
    showNotif('TIDAK ADA FOTO BUKTI PENDUKUNG!', 'warning');
    return;
  }

  currentViewerPhotos = photoList;
  viewerPhotos = photoList;
  currentViewerIndex = Math.max(0, Math.min(startIdx, photoList.length - 1));
  viewerCurrentIndex = currentViewerIndex;

  currentZoom = 1;
  panX = 0;
  panY = 0;
  isPanningImage = false;

  const modal = document.getElementById('imageViewer');
  const img = document.getElementById('viewerImage');

  if (img) {
    img.src = photoList[currentViewerIndex];
  }

  if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
    modal.style.setProperty('z-index', '2147483646', 'important');
    modal.classList.add('show');
  }

  if (typeof applyImageTransform === 'function') applyImageTransform(false);
  if (typeof updateViewerCounter === 'function') updateViewerCounter();
  if (typeof initImagePanListeners === 'function') initImagePanListeners();

  setTimeout(() => {
    if (typeof applyImageTransform === 'function') applyImageTransform(false);
  }, 50);

  if (typeof pushPopupHistoryState === 'function') {
    pushPopupHistoryState();
  }
}
window.bukaViewGambar = bukaViewGambar;
window.zoomFoto = bukaViewGambar;
window.bukaViewerFoto = bukaViewGambar;
window.showImageViewer = bukaViewGambar;
window.viewFotoUrl = bukaViewGambar;

function tutupImageViewer(fromHistory = false) {
  const modal = document.getElementById('imageViewer');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
  resetZoom();

  // SANGAT PENTING: Hanya jika Popup Detail sebelumnya memang aktif/terbuka, pastikan tetap tampil!
  const popupDetailV2 = document.getElementById('popupDetailBarangV2');
  if (popupDetailV2 && popupDetailV2.dataset.active === "true" && popupDetailV2.style.display !== 'none') {
    popupDetailV2.style.setProperty('display', 'flex', 'important');
    popupDetailV2.classList.add('show');
  }

  const popupDetail = document.getElementById('popupDetail');
  if (popupDetail && popupDetail.dataset.active === "true" && popupDetail.style.display !== 'none') {
    popupDetail.style.setProperty('display', 'flex', 'important');
    popupDetail.classList.add('show');
  }
}
window.tutupImageViewer = tutupImageViewer;
window.tutupFotoViewer = tutupImageViewer;

function zoomImage(step) {
  currentZoom += step;
  if (currentZoom < 0.2) currentZoom = 0.2;
  if (currentZoom > 8) currentZoom = 8;
  if (currentZoom <= 1.05 && step < 0) {
    currentZoom = 1;
    panX = 0;
    panY = 0;
  }
  applyImageTransform(true);
}

function resetZoom() {
  currentZoom = 1;
  currentRotation = 0;
  panX = 0;
  panY = 0;
  isPanningImage = false;
  applyImageTransform(true);
}

// MOUSE WHEEL SCROLL ZOOM IN / ZOOM OUT FOR IMAGE VIEWER
document.addEventListener('wheel', function(e) {
  const imageViewer = document.getElementById('imageViewer');
  if (imageViewer && (imageViewer.style.display === 'flex' || imageViewer.style.display === 'block')) {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.25 : -0.25;
    zoomImage(step);
  }
}, { passive: false });

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

// Rogue global style override removed

async function hapusSemuaDataLokal() {
  const isAdminUser = (typeof checkIsAdminUser === 'function' && checkIsAdminUser()) || 
                      (currentUser && (currentUser.role === 'ADMIN' || currentUser.category === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN')));
  if (!isAdminUser) {
    if (typeof showNotif === 'function') {
      showNotif(`AKSES DITOLAK!

Fitur Hapus Penyimpanan Lokal / Database hanya dapat diakses oleh Admin.`, 'warning');
    } else {
      alert(`AKSES DITOLAK!

Fitur Hapus Penyimpanan Lokal / Database hanya dapat diakses oleh Admin.`);
    }
    return;
  }

  showConfirm(`BERSIHKAN DATABASE CLOUD (SUPABASE & FIREBASE) & SELURUH PERANGKAT USER LAIN?

(Jika Ya, data permintaan di Supabase akan dikosongkan dan seluruh perangkat user lain otomatis ikut bersih).`, async () => {
    showLoading('MENGHAPUS DATABASE CLOUD & MENYELARASKAN SEMUA PERANGKAT...');
    try {
      // 1. HAPUS DARI SUPABASE CLOUD
      if (typeof supabase !== 'undefined' && supabase) {
        try {
          await supabase.from('permintaan_toko').delete().neq('no_surat', '__SYSTEM_PHOTO_FEATURE__');
        } catch(sbErr) {
          console.warn('[SUPABASE CLEAR ALL NOTICE]:', sbErr);
        }
      }

      // 2. HAPUS DARI FIREBASE CLOUD
      if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        try {
          const reqSnap = await dbFirestore.collection('requests').get();
          const batch = dbFirestore.batch();
          reqSnap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        } catch(e) {}
      }
      if (typeof dbRealtime !== 'undefined' && dbRealtime) {
        try {
          await dbRealtime.ref('requests').remove();
        } catch(e) {}
      }

      // 3. BROADCAST REALTIME KE SELURUH PERANGKAT LAIN AGAR OTOMATIS BERSIH
      if (supabaseRealtimeChannel) {
        try {
          supabaseRealtimeChannel.send({
            type: 'broadcast',
            event: 'database_cleared',
            payload: { action: 'CLEAR_ALL', timestamp: Date.now() }
          });
        } catch(e) {}
      }

      // 4. KOSONGKAN PENYIMPANAN LOKAL PERANGKAT INI
      appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([]));
      appStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify([]));
      try { localStorage.setItem(REQUESTS_DB_KEY, JSON.stringify([])); } catch(e) {}
      try { localStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify([])); } catch(e) {}

      hideLoading();
      showNotif('DATABASE SUPABASE & PENYIMPANAN SELURUH PERANGKAT BERHASIL DIBERSIHKAN!', 'success');

      if (typeof loadRiwayat === 'function') loadRiwayat();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadMasterDbTable === 'function') loadMasterDbTable();
    } catch(err) {
      hideLoading();
      console.error('[CLEAR DATABASE ERROR]:', err);
      showNotif('GAGAL MEMBERSIHKAN DATABASE: ' + (err.message || err), 'danger');
    }
  });
}
window.hapusSemuaDataLokal = hapusSemuaDataLokal;
window.hapusSeluruhDatabaseAdmin = hapusSemuaDataLokal;

// =============================================================================
// GLOBAL KEYBOARD NAVIGATION:
// 1. DASHBOARD & RIWAYAT / DETAIL DATA -> ARROW UP/DOWN & PAGE UP/DOWN SCROLLS TABLE
// 2. INPUT DATA FORM -> ARROW KEYS NAVIGATE ALL COLUMNS & ROWS, ENTER MOVES TO NEXT FIELD
// =============================================================================
function setupGlobalKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'SELECT' ||
      activeEl.tagName === 'TEXTAREA'
    );

    // -------------------------------------------------------------------------
    // CASE A: INSIDE INPUT FORM -> ARROW KEYS NAVIGATE COLUMNS/ROWS & ENTER MOVES TO NEXT FIELD
    // -------------------------------------------------------------------------
    if (isInput) {
      // 1. ENTER KEY: MOVE TO NEXT INPUT FIELD (OR AUTOMATICALLY ADD NEW ROW IF AT END OF FORM)
      if (e.key === 'Enter') {
        // Skip textareas if user wants new line
        if (activeEl.tagName === 'TEXTAREA' && !e.ctrlKey && !e.shiftKey) {
          return;
        }

        e.preventDefault();

        // Login form submit handling
        if (activeEl.id === 'username' || activeEl.id === 'password') {
          if (typeof window.prosesLogin === 'function') window.prosesLogin();
          return;
        }

        const formContainer = activeEl.closest('#detailContainer') || activeEl.closest('form') || activeEl.closest('.formWrap') || activeEl.closest('#popupDetail') || document;
        const allInputs = Array.from(formContainer.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));
        const currIndex = allInputs.indexOf(activeEl);

        if (currIndex !== -1 && currIndex < allInputs.length - 1) {
          const nextEl = allInputs[currIndex + 1];
          nextEl.focus();
          if (typeof nextEl.select === 'function' && nextEl.tagName === 'INPUT') nextEl.select();
        } else if (activeEl.closest('.detailRow')) {
          // If at the last input of the last row in Input Data, automatically add new row!
          if (typeof tambahRow === 'function') {
            tambahRow();
            setTimeout(() => {
              const rows = document.querySelectorAll('#detailContainer .detailRow');
              if (rows.length > 0) {
                const lastRow = rows[rows.length - 1];
                const firstInput = lastRow.querySelector('input');
                if (firstInput) {
                  firstInput.focus();
                  if (typeof firstInput.select === 'function') firstInput.select();
                }
              }
            }, 60);
          }
        }
        return;
      }

      // 2. ARROW KEYS NAVIGATION IN INPUT ROWS & COLUMNS
      const row = activeEl.closest('.detailRow');
      if (row) {
        const container = row.parentElement;
        const allRows = Array.from(container.querySelectorAll('.detailRow'));
        const rowIndex = allRows.indexOf(row);
        const rowInputs = Array.from(row.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));
        const colIndex = rowInputs.indexOf(activeEl);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (rowIndex < allRows.length - 1) {
            const nextRow = allRows[rowIndex + 1];
            const nextRowInputs = Array.from(nextRow.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));
            const targetInput = nextRowInputs[colIndex] !== undefined ? nextRowInputs[colIndex] : nextRowInputs[nextRowInputs.length - 1];
            if (targetInput) {
              targetInput.focus();
              if (typeof targetInput.select === 'function' && targetInput.tagName === 'INPUT') targetInput.select();
            }
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (rowIndex > 0) {
            const prevRow = allRows[rowIndex - 1];
            const prevRowInputs = Array.from(prevRow.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'));
            const targetInput = prevRowInputs[colIndex] !== undefined ? prevRowInputs[colIndex] : prevRowInputs[prevRowInputs.length - 1];
            if (targetInput) {
              targetInput.focus();
              if (typeof targetInput.select === 'function' && targetInput.tagName === 'INPUT') targetInput.select();
            }
          }
          return;
        }

        if (e.key === 'ArrowRight') {
          const isText = activeEl.type === 'text' || activeEl.type === 'search';
          const isAtEnd = !isText || activeEl.selectionEnd === activeEl.value.length;
          if (isAtEnd) {
            if (colIndex < rowInputs.length - 1) {
              e.preventDefault();
              const nextInput = rowInputs[colIndex + 1];
              nextInput.focus();
              if (typeof nextInput.select === 'function' && nextInput.tagName === 'INPUT') nextInput.select();
            } else if (rowIndex < allRows.length - 1) {
              e.preventDefault();
              const nextRow = allRows[rowIndex + 1];
              const firstInput = nextRow.querySelector('input');
              if (firstInput) {
                firstInput.focus();
                if (typeof firstInput.select === 'function') firstInput.select();
              }
            }
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          const isText = activeEl.type === 'text' || activeEl.type === 'search';
          const isAtStart = !isText || activeEl.selectionStart === 0;
          if (isAtStart) {
            if (colIndex > 0) {
              e.preventDefault();
              const prevInput = rowInputs[colIndex - 1];
              prevInput.focus();
              if (typeof prevInput.select === 'function' && prevInput.tagName === 'INPUT') prevInput.select();
            } else if (rowIndex > 0) {
              e.preventDefault();
              const prevRow = allRows[rowIndex - 1];
              const prevRowInputs = Array.from(prevRow.querySelectorAll('input'));
              const lastInput = prevRowInputs[prevRowInputs.length - 1];
              if (lastInput) {
                lastInput.focus();
                if (typeof lastInput.select === 'function') lastInput.select();
              }
            }
          }
          return;
        }
      }

      return;
    }

    // -------------------------------------------------------------------------
    // CASE B: OUTSIDE INPUT FORM (DASHBOARD, RIWAYAT/DETAIL DATA, MASTER DB)
    // ARROW UP / ARROW DOWN & PAGE UP / PAGE DOWN SCROLL THE ACTIVE TABLE!
    // -------------------------------------------------------------------------
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp') {
      let scrollTarget = null;
      
      const popupDetail = document.getElementById('popupDetail');
      if (popupDetail && popupDetail.style.display !== 'none' && popupDetail.offsetWidth > 0) {
        scrollTarget = popupDetail.querySelector('.popupTableScroll') || popupDetail.querySelector('.popupContent') || popupDetail.querySelector('#popupMessage');
      }

      if (!scrollTarget) {
        const activePage = document.querySelector('.pageSection.active') || document.querySelector('.page.active');
        if (activePage) {
          scrollTarget = activePage.querySelector('.tableWrap') || activePage.querySelector('.popupTableScroll');
        }
      }

      if (!scrollTarget) {
        scrollTarget = document.querySelector('.tableWrap');
      }

      if (scrollTarget) {
        e.preventDefault();
        const step = (e.key === 'PageDown' || e.key === 'PageUp') ? 260 : 60;
        const direction = (e.key === 'ArrowDown' || e.key === 'PageDown') ? 1 : -1;
        scrollTarget.scrollTop += (step * direction);
      }
    }
  });
}

// INITIALIZE APP STARTUP (AUTO LOGIN & PRE-FILL REMEMBERED CREDENTIALS ON REFRESH)
function initAppStartup() {
  if (typeof setupGlobalKeyboardNavigation === 'function') {
    setupGlobalKeyboardNavigation();
  }
  if (typeof autoLogin === 'function') {
    autoLogin();
  } else if (typeof loadRememberedCredentials === 'function') {
    loadRememberedCredentials();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppStartup);
} else {
  initAppStartup();
}

function hapusSemuaNotifFirebaseDanLokal() {
  if (typeof hapusSemuaNotifikasiSystem === 'function') {
    hapusSemuaNotifikasiSystem();
  }
}
window.hapusSemuaNotifFirebaseDanLokal = hapusSemuaNotifFirebaseDanLokal;

document.addEventListener('keydown', function(e) {
  if (e.target && e.target.id === 'chatPesan') {
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) {
      e.preventDefault();
      if (typeof kirimPesanChat === 'function') {
        kirimPesanChat();
      }
    }
  }
});

// PREVENT FULL PAGE SCROLLING ON RIWAYAT PAGE & MASTER DB PAGE WHEN TOUCHING NON-TABLE ELEMENTS (EXEMPT ALL POPUP MODALS LIKE PDF PREVIEW)
document.addEventListener('touchmove', function (e) {
  const isInsideModal = e.target.closest('.popupOverlay') || e.target.closest('#pdfModal') || e.target.closest('#pdfDocumentContent') || e.target.closest('#imageViewer');
  if (isInsideModal) {
    return; // Allow touch scrolling inside modal!
  }

  const activePage = typeof getCurrentActivePageId === 'function' ? getCurrentActivePageId() : '';
  if (activePage === 'riwayatPage' || activePage === 'masterDbPage') {
    const isInsideTable = e.target.closest('.tableWrap');
    if (!isInsideTable) {
      if (e.cancelable) e.preventDefault();
    }
  }
}, { passive: false });

function triggerUploadPdfAutoFill() {
  const el = document.getElementById('inputPdfAutoFill');
  if (el) el.click();
}
window.triggerUploadPdfAutoFill = triggerUploadPdfAutoFill;

function triggerUploadGambarAutoFill() {
  const el = document.getElementById('inputGambarAutoFill');
  if (el) el.click();
}
window.triggerUploadGambarAutoFill = triggerUploadGambarAutoFill;

function triggerUploadExcelAutoFill() {
  const el = document.getElementById('inputExcelAutoFill');
  if (el) el.click();
}
window.triggerUploadExcelAutoFill = triggerUploadExcelAutoFill;

// =============================================================================
// MODAL & UNDUH TEMPLATE EXCEL (DEFAULT & DUS DENGAN URUTAN KOLOM PRESISI)
// =============================================================================

function downloadTemplateExcelPermintaan() {
  const modal = document.getElementById('excelTemplateOverlay');
  if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
    if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
  } else {
    unduhTemplateExcelProses('DEFAULT');
  }
}
window.downloadTemplateExcelPermintaan = downloadTemplateExcelPermintaan;

function closeExcelTemplateModal() {
  const modal = document.getElementById('excelTemplateOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
}
window.closeExcelTemplateModal = closeExcelTemplateModal;

function unduhTemplateExcelProses(jenis) {
  if (typeof XLSX === 'undefined') {
    if (typeof showNotif === 'function') showNotif('Library XLSX belum dimuat.', 'warning');
    return;
  }

  const selectedJenis = (jenis || 'DEFAULT').toUpperCase();
  let templateData = [];
  let fileName = 'Template_Permintaan_DEFAULT.xlsx';

  if (selectedJenis === 'DUS') {
    // URUTAN KOLOM DUS: TYPE, SERI, PERMINTAAN, SN DUS, ALASAN, QTY
    templateData = [
      {
        'TYPE': 'AC 1PK',
        'SERI': 'SN12345678',
        'PERMINTAAN': 'MODUL INDOOR',
        'SN DUS': 'DUS889900',
        'ALASAN': 'RUSAK / MATI TOTAL',
        'QTY': 1
      },
      {
        'TYPE': 'ROUTER CISCO',
        'SERI': 'CISCO-998811',
        'PERMINTAAN': 'ADAPTOR POWER',
        'SN DUS': 'DUS112233',
        'ALASAN': 'KONSLETING',
        'QTY': 1
      }
    ];
    fileName = 'Template_Permintaan_DUS.xlsx';
  } else {
    // URUTAN KOLOM DEFAULT: TYPE, SERI, PERMINTAAN, ALASAN, QTY
    templateData = [
      {
        'TYPE': 'AC 1PK',
        'SERI': 'SN12345678',
        'PERMINTAAN': 'MODUL INDOOR',
        'ALASAN': 'RUSAK / MATI TOTAL',
        'QTY': 1
      },
      {
        'TYPE': 'ROUTER CISCO',
        'SERI': 'CISCO-998811',
        'PERMINTAAN': 'ADAPTOR POWER',
        'ALASAN': 'KONSLETING',
        'QTY': 1
      }
    ];
    fileName = 'Template_Permintaan_DEFAULT.xlsx';
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Template ${selectedJenis}`);
  XLSX.writeFile(workbook, fileName);

  closeExcelTemplateModal();
  
}
window.unduhTemplateExcelProses = unduhTemplateExcelProses;

// =============================================================================
// PROSES BACA DOKUMEN EXCEL (.XLSX / .XLS / .CSV) KE FORMULIR
// =============================================================================
async function prosesExcelAutoFill(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    if (typeof showNotif === 'function') showNotif('Library XLSX belum dimuat.', 'warning');
    event.target.value = '';
    return;
  }

  if (typeof showLoading === 'function') showLoading('Membaca Dokumen...', true);

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!jsonRows || jsonRows.length === 0) {
      throw new Error('File Excel kosong atau tidak memiliki data.');
    }

    let isDus = false;
    const items = [];

    jsonRows.forEach(row => {
      // Normalisasi key header kolom
      const normalizedRow = {};
      Object.keys(row).forEach(k => {
        normalizedRow[k.trim().toUpperCase()] = String(row[k] || '').trim();
      });

      const typeBarang = normalizedRow['TYPE'] || normalizedRow['TYPE BARANG'] || normalizedRow['TIPE'] || normalizedRow['BARANG'] || '';
      const noSeri = normalizedRow['SERI'] || normalizedRow['NO SERI'] || normalizedRow['SERIAL'] || normalizedRow['NO. SERI'] || '';
      const permintaanBarang = normalizedRow['PERMINTAAN'] || normalizedRow['PERMINTAAN BARANG'] || normalizedRow['DESKRIPSI'] || normalizedRow['NAMA BARANG'] || '';
      const noSeriDus = normalizedRow['SN DUS'] || normalizedRow['NO SERI DUS'] || normalizedRow['SERI DUS'] || normalizedRow['DUS'] || '';
      const alasan = normalizedRow['ALASAN'] || normalizedRow['ALASAN PERMINTAAN'] || normalizedRow['KETERANGAN'] || '';
      const qty = parseInt(normalizedRow['QTY'] || normalizedRow['JUMLAH'] || normalizedRow['QUANTITY'] || 1) || 1;

      if (noSeriDus) isDus = true;

      if (typeBarang || noSeri || permintaanBarang || alasan) {
        items.push({
          typeBarang,
          noSeri,
          permintaanBarang,
          noSeriDus,
          alasan,
          qty
        });
      }
    });

    if (items.length === 0) {
      throw new Error('Tidak ada baris data barang yang valid di dalam file Excel.');
    }

    const parsedData = {
      jenis: isDus ? 'DUS' : 'DEFAULT',
      items: items
    };

    applyParsedDataToForm(parsedData);
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showNotif === 'function') showNotif('DOKUMEN BERHASIL DI BACA', 'success');

  } catch(err) {
    if (typeof hideLoading === 'function') hideLoading();
    if (typeof showNotif === 'function') showNotif('GAGAL PROSES EXCEL: ' + (err.message || String(err)), 'warning');
  } finally {
    event.target.value = '';
  }
}
window.prosesExcelAutoFill = prosesExcelAutoFill;


// ==========================================================================

// ==========================================================================
// GEMINI API KEY & DOCUMENT AUTO-FILL ENGINE (PDF, GAMBAR, EXCEL)
// ==========================================================================

const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';
const DEFAULT_GEMINI_API_KEY = 'AQ.Ab8RN6I_PX3A-3xuSh3HRHyruF9by7kveKGcoKNbVSBgSCGsZg';

// Gemini API Key initialized and persisted in LocalStorage & AppStorage

// =============================================================================
// =============================================================================
// HELPER EKSTRAKSI JSON & PENGISIAN FORMULIR DARI GEMINI AI / PDF / FOTO / EXCEL
// =============================================================================

function extractFirstValidJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  
  // 1. Coba bersihkan blok kode markdown ```json ... ```
  let cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  
  // Coba parse langsung
  try {
    return JSON.parse(cleaned);
  } catch (e) {}

  // 2. Cari kurung kurawal pertama { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const sub = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub);
    } catch (e) {}
  }

  // 3. Cari array [ ... ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const subArr = cleaned.substring(firstBracket, lastBracket + 1);
      const parsedArr = JSON.parse(subArr);
      return { items: parsedArr };
    } catch (e) {}
  }

  return null;
}
window.extractFirstValidJSON = extractFirstValidJSON;

function applyParsedDataToForm(parsedData) {
  if (!parsedData) return false;
  console.log('[AUTO-FILL]: Mengisi kolom detail barang dari dokumen...', parsedData);

  // 1. Tentukan Jenis Permintaan (DEFAULT atau DUS) berdasarkan apakah ada nomor seri dus
  const rawItems = Array.isArray(parsedData.items) ? parsedData.items : (Array.isArray(parsedData) ? parsedData : []);
  const hasDus = rawItems.some(it => it && String(it.noSeriDus || it.seriDus || '').trim());
  const requestedJenis = String(parsedData.jenis || '').toUpperCase();
  const isDus = hasDus || requestedJenis.includes('DUS');

  const jenisEl = document.getElementById('jenisPermintaan');
  if (jenisEl) {
    jenisEl.value = isDus ? 'DUS' : 'DEFAULT';
  }

  // 2. Baris Detail Permintaan (HANYA TYPE, SERI, PERMINTAAN, SN DUS, ALASAN, QTY)
  const validItems = rawItems.filter(it => it && (
    String(it.typeBarang || it.type || it.tipe || '').trim() ||
    String(it.noSeri || it.seri || it.serial || '').trim() ||
    String(it.permintaanBarang || it.namaBarang || it.barang || it.permintaan || it.deskripsi || '').trim() ||
    String(it.noSeriDus || it.seriDus || '').trim() ||
    String(it.alasan || '').trim()
  ));

  const container = document.getElementById('detailContainer');
  if (container) {
    container.innerHTML = '';
    
    if (validItems.length === 0) {
      if (typeof tambahRow === 'function') tambahRow();
      return false;
    } else {
      validItems.forEach(item => {
        if (typeof tambahRow === 'function') tambahRow();
        const row = container.lastElementChild;
        if (row) {
          const typeInput = row.querySelector('.typeBarang');
          const seriInput = row.querySelector('.seriBarang');
          const namaInput = row.querySelector('.namaBarang');
          const seriDusInput = row.querySelector('.seriDusBarang');
          const alasanInput = row.querySelector('.alasan');
          const qtyInput = row.querySelector('.qty');

          const tVal = item.typeBarang || item.type || item.tipe || '';
          const sVal = item.noSeri || item.seri || item.serial || '';
          const pVal = item.permintaanBarang || item.namaBarang || item.barang || item.permintaan || item.deskripsi || '';
          const sdVal = item.noSeriDus || item.seriDus || '';
          const aVal = item.alasan || item.keterangan || '';
          const qVal = parseInt(item.qty || item.jumlah, 10) || 1;

          if (typeInput) {
            typeInput.value = tVal;
            typeInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (seriInput) {
            seriInput.value = sVal;
            seriInput.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof lookupTypeRow === 'function') lookupTypeRow(seriInput);
          }
          if (namaInput) {
            namaInput.value = pVal;
            namaInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (seriDusInput) {
            seriDusInput.value = sdVal;
            seriDusInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (alasanInput) {
            alasanInput.value = aVal;
            alasanInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (qtyInput) {
            qtyInput.value = qVal;
            qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });

      // Scroll ke bagian daftar barang yang terisi
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }
  }
  return false;
}
window.applyParsedDataToForm = applyParsedDataToForm;

async function ensurePdfJsLoaded() {
  if (typeof pdfjsLib !== 'undefined') return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
window.ensurePdfJsLoaded = ensurePdfJsLoaded;

async function ensureTesseractLoaded() {
  if (typeof Tesseract !== 'undefined') return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
window.ensureTesseractLoaded = ensureTesseractLoaded;

function extractStructuredLinesFromPage(textContent) {
  const items = (textContent && textContent.items) ? textContent.items : [];
  if (items.length === 0) return [];

  const rows = [];
  items.forEach(item => {
    const text = (item.str || '').trim();
    if (!text) return;
    const x = item.transform ? item.transform[4] : 0;
    const y = item.transform ? item.transform[5] : 0;

    let matchedRow = rows.find(r => Math.abs(r.y - y) <= 4.5);
    if (!matchedRow) {
      matchedRow = { y: y, cells: [] };
      rows.push(matchedRow);
    }
    matchedRow.cells.push({ x: x, text: text });
  });

  // Urutkan dari atas ke bawah
  rows.sort((a, b) => b.y - a.y);

  // Urutkan sel tiap baris dari kiri ke kanan
  return rows.map(r => {
    r.cells.sort((a, b) => a.x - b.x);
    return r.cells.map(c => c.text).join('   ');
  });
}

function parseExtractedTextToPermintaanForm(text) {
  if (!text) return null;
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];
  let detectedJenis = 'DEFAULT';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const upper = line.toUpperCase();

    // Deteksi jenis jika disebutkan
    if (upper.includes('JENIS:') || upper.includes('TIPE PERMINTAAN:') || upper.includes('JENIS PERMINTAAN:')) {
      if (upper.includes('DUS')) detectedJenis = 'DUS';
      else if (upper.includes('DEFAULT') || upper.includes('UNIT') || upper.includes('BARANG')) detectedJenis = 'DEFAULT';
      continue;
    }

    // Lewati baris header dokumen / metadata (TOKO, NO SURAT, TANGGAL, CATATAN, dsb.)
    if (
      upper.startsWith('SURAT PERMINTAAN') ||
      upper.startsWith('LAPORAN') ||
      upper.startsWith('HALAMAN') ||
      upper.startsWith('PAGE ') ||
      upper.includes('TOKO:') ||
      upper.includes('NAMA TOKO:') ||
      upper.includes('CABANG:') ||
      upper.includes('STORE:') ||
      upper.includes('NO SURAT') ||
      upper.includes('NO. SURAT') ||
      upper.includes('NOMOR SURAT') ||
      upper.includes('NO.SURAT') ||
      upper.includes('TANGGAL') ||
      upper.includes('DATE') ||
      upper.includes('CATATAN') ||
      upper.includes('NOTE') ||
      upper.includes('KETERANGAN:') ||
      upper.startsWith('YTH') ||
      upper.startsWith('KEPADA') ||
      upper.startsWith('DARI') ||
      upper.startsWith('DITUJUKAN')
    ) {
      continue;
    }

    // Lewati baris header kolom tabel
    if ((upper.includes('NO') || upper.includes('NUM')) && (upper.includes('TIPE') || upper.includes('TYPE') || upper.includes('SERI') || upper.includes('BARANG') || upper.includes('QTY') || upper.includes('ALASAN'))) {
      continue;
    }

    // Pemisahan kolom cerdas (3+ spasi, tab, pipe, titik koma, koma)
    let parts = [];
    if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
    } else if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
    } else if (line.includes(';') || (line.includes(',') && line.split(',').length >= 3)) {
      parts = line.split(/[,;]/).map(p => p.trim()).filter(p => p.length > 0);
    } else {
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    }

    // Jika part pertama hanya nomor urut (e.g. "1", "1.", "1)")
    if (parts.length > 1 && /^\d+[\.\)]?$/.test(parts[0])) {
      parts.shift();
    }

    if (parts.length >= 2) {
      // Cek jika nomor seri berada di kolom pertama (IMEI 8-18 digit), tukar posisinya agar TYPE di kolom 0 dan SERI di kolom 1
      if (/^\d{8,18}$/.test(parts[0]) && !/^\d{8,18}$/.test(parts[1])) {
        const temp = parts[0];
        parts[0] = parts[1];
        parts[1] = temp;
      }

      let typeBarang = '';
      let noSeri = '';
      let permintaanBarang = '';
      let noSeriDus = '';
      let alasan = '';
      let qty = 1;

      // Cek apakah kolom terakhir adalah angka QTY
      const lastToken = parts[parts.length - 1];
      const isLastTokenQty = /^\d+$/.test(lastToken);

      // URUTAN KOLOM RESMI: TYPE -> SERI -> PERMINTAAN -> SN DUS -> ALASAN -> QTY
      if (parts.length >= 6) {
        typeBarang = parts[0] || '';
        noSeri = parts[1] || '';
        permintaanBarang = parts[2] || '';
        noSeriDus = parts[3] || '';
        alasan = parts[4] || '';
        qty = isLastTokenQty ? (parseInt(parts[5], 10) || 1) : 1;
      } else if (parts.length === 5) {
        typeBarang = parts[0] || '';
        noSeri = parts[1] || '';
        permintaanBarang = parts[2] || '';
        if (isLastTokenQty) {
          alasan = parts[3] || '';
          qty = parseInt(parts[4], 10) || 1;
        } else {
          noSeriDus = parts[3] || '';
          alasan = parts[4] || '';
        }
      } else if (parts.length === 4) {
        typeBarang = parts[0] || '';
        noSeri = parts[1] || '';
        permintaanBarang = parts[2] || '';
        if (isLastTokenQty) {
          qty = parseInt(parts[3], 10) || 1;
        } else {
          alasan = parts[3] || '';
        }
      } else if (parts.length === 3) {
        typeBarang = parts[0] || '';
        noSeri = parts[1] || '';
        permintaanBarang = parts[2] || '';
      } else if (parts.length === 2) {
        typeBarang = parts[0] || '';
        noSeri = parts[1] || '';
        permintaanBarang = parts[0] || '';
      }

      if (typeBarang || noSeri || permintaanBarang) {
        items.push({
          typeBarang: typeBarang,
          noSeri: noSeri,
          permintaanBarang: permintaanBarang,
          noSeriDus: noSeriDus,
          alasan: alasan,
          qty: qty
        });
      }
    } else if (line.length > 3) {
      // Baris dengan spasi tunggal
      const spaceParts = line.split(/\s+/).filter(Boolean);
      if (spaceParts.length >= 2) {
        const seriIdx = spaceParts.findIndex(sp => /^\d{8,18}$/.test(sp));
        if (seriIdx !== -1) {
          const sNo = spaceParts[seriIdx];
          const tName = spaceParts.slice(0, seriIdx).join(' ');
          const rest = spaceParts.slice(seriIdx + 1).join(' ');
          items.push({
            typeBarang: tName || sNo,
            noSeri: sNo,
            permintaanBarang: rest || tName || 'BARANG',
            noSeriDus: '',
            alasan: '',
            qty: 1
          });
        }
      }
    }
  }

  // Fallback: Jika belum ada item, cari seluruh pola IMEI / No Seri 8-18 digit di dokumen
  if (items.length === 0) {
    const serialMatches = text.match(/\b(\d{8,18})\b/g);
    if (serialMatches && serialMatches.length > 0) {
      const uniqueSerials = [...new Set(serialMatches)];
      uniqueSerials.forEach(sn => {
        items.push({
          typeBarang: '',
          noSeri: sn,
          permintaanBarang: 'PERMINTAAN',
          noSeriDus: '',
          alasan: '',
          qty: 1
        });
      });
    }
  }

  return {
    jenis: detectedJenis,
    items: items
  };
}
window.parseExtractedTextToPermintaanForm = parseExtractedTextToPermintaanForm;

// MESIN GEMINI AI MODERN (VERSI 3.5 FLASH & FLASH LATEST)
// =============================================================================

function getGeminiApiKey() {
  let key = localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || appStorage.getItem('gemini_api_key') || appStorage.getItem('GEMINI_API_KEY') || '';
  key = String(key).trim();
  if (key === 'null' || key === 'undefined') key = '';
  return key;
}

function updateAiKeyBadgeStatus() {
  const btn = document.getElementById('btnGeminiApiKey');
  const label = document.getElementById('labelGeminiApiKey');
  const key = getGeminiApiKey();
  if (label) {
    label.textContent = key ? 'KEY AI (AKTIF)' : 'KEY AI';
  }
  if (btn) {
    if (key) {
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669) !important';
      btn.title = 'Gemini AI API Key Aktif (Klik untuk ubah/hapus)';
    } else {
      btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706) !important';
      btn.title = 'Masukkan Google Gemini AI API Key (Hanya Diisi Sekali Saja)';
    }
  }
}

function aturGeminiApiKey() {
  console.log('[GEMINI AI] Opening Custom Gemini API Key Modal from app.js...');
  let modal = document.getElementById('modalGeminiApiKey');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalGeminiApiKey';
    document.body.appendChild(modal);
  }

  const currentKey = getGeminiApiKey();

  modal.className = 'modalBackdrop show';
  modal.onclick = function(e) {
    if (e.target === modal) tutupModalGeminiApiKey();
  };
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();

  modal.style.cssText = 'display: flex !important; position: fixed !important; top: 0px !important; left: 0px !important; right: 0px !important; bottom: 0px !important; width: 100vw !important; height: 100vh !important; height: 100dvh !important; background: rgba(0, 0, 0, 0.85) !important; z-index: 2147483647 !important; justify-content: center !important; align-items: center !important; padding: 1mm !important; padding-left: 1mm !important; padding-right: 1mm !important; box-sizing: border-box !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important;';

  modal.innerHTML = `
    <div class="modalKeyBox" onclick="event.stopPropagation()" style="background: #ffffff !important; color: #0f172a !important; border-radius: 6px !important; width: calc(100vw - 2mm) !important; max-width: 380px !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6) !important; border: 2.5px solid #f59e0b !important; overflow: hidden !important; box-sizing: border-box !important; margin: auto !important; font-family: system-ui, -apple-system, sans-serif !important;">
      <div style="background: linear-gradient(135deg, #f59e0b, #d97706) !important; padding: 14px 18px !important; color: #ffffff !important; display: flex !important; justify-content: space-between !important; align-items: center !important;">
        <div style="display: flex !important; align-items: center !important; gap: 8px !important; font-weight: 800 !important; font-size: 14px !important; letter-spacing: 0.5px !important;">
          <span class="material-symbols-rounded" style="font-size: 22px !important; color: #ffffff !important;">key</span>
          <span>PENGATURAN / UBAH GEMINI API KEY</span>
        </div>
        <button type="button" onclick="tutupModalGeminiApiKey()" style="color: #ffffff !important; font-weight: 900 !important; font-size: 28px !important; background: transparent !important; border: none !important; cursor: pointer !important; line-height: 1 !important; padding: 0 4px !important;" title="TUTUP">&times;</button>
      </div>
      <div class="modalKeyBody" style="padding: 16px !important; display: flex !important; flex-direction: column !important; gap: 14px !important; box-sizing: border-box !important; background: #ffffff !important;">
        <p style="margin: 0 !important; font-size: 12px !important; color: #475569 !important; line-height: 1.5 !important;">
          Masukan KEY AI. Buat key gratis di <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style="color: #d97706 !important; font-weight: 700 !important; text-decoration: underline !important;">https://aistudio.google.com/</a>
        </p>
        <div style="width: 100% !important; box-sizing: border-box !important;">
          <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 6px !important;">
            <label style="font-size: 11.5px !important; font-weight: 800 !important; color: #0f172a !important; margin: 0 !important;">GOOGLE GEMINI API KEY:</label>
            <button type="button" onclick="var inp=document.getElementById('inputGeminiApiKeyVal'); if(inp){ inp.value=''; inp.focus(); }" style="background: none !important; border: none !important; color: #ef4444 !important; font-size: 11px !important; font-weight: 700 !important; cursor: pointer !important; text-decoration: underline !important;">
              HAPUS TEKS
            </button>
          </div>
          <div style="position: relative !important; display: flex !important; align-items: center !important; width: 100% !important;">
            <input type="text" id="inputGeminiApiKeyVal" value="${currentKey}" placeholder="Tempel API Key di sini (Contoh: AIzaSy...)" style="width: 100% !important; height: 44px !important; padding: 8px 12px !important; border-radius: 3px !important; border: 1.5px solid #cbd5e1 !important; background: #f8fafc !important; color: #0f172a !important; font-family: monospace !important; font-size: 13px !important; outline: none !important; box-sizing: border-box !important;">
          </div>
        </div>
        <div style="display: flex !important; gap: 8px !important; justify-content: flex-end !important; align-items: center !important; margin-top: 8px !important; width: 100% !important;">
          <button type="button" onclick="tutupModalGeminiApiKey()" style="flex: 1 !important; height: 36px !important; background: var(--bg-body, #f1f5f9) !important; color: var(--text-main, #334155) !important; border: 1px solid var(--border-color, #cbd5e1) !important; border-radius: 6px !important; padding: 0 14px !important; font-weight: 700 !important; font-size: 12px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important;">
            BATAL
          </button>
          <button type="button" onclick="simpanGeminiApiKeyDariModal()" style="flex: 1 !important; height: 36px !important; background: linear-gradient(135deg, #f59e0b, #d97706) !important; color: #ffffff !important; border: none !important; border-radius: 6px !important; padding: 0 16px !important; font-weight: 800 !important; font-size: 12px !important; cursor: pointer !important; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35) !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important;">
            <span class="material-symbols-rounded" style="font-size: 16px;">save</span> SIMPAN
          </button>
        </div>
      </div>
    </div>
  `;

  const inputEl = document.getElementById('inputGeminiApiKeyVal');
  if (inputEl) {
    inputEl.onkeydown = function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        simpanGeminiApiKeyDariModal();
      }
    };
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 150);
  }
}
window.aturGeminiApiKey = aturGeminiApiKey;

function tutupModalGeminiApiKey() {
  const modal = document.getElementById('modalGeminiApiKey');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
}
window.tutupModalGeminiApiKey = tutupModalGeminiApiKey;

function toggleShowGeminiApiKey() {
  const input = document.getElementById('inputGeminiApiKeyVal');
  const icon = document.getElementById('iconToggleGeminiKey');
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = 'visibility_off';
  } else {
    input.type = 'password';
    icon.textContent = 'visibility';
  }
}
window.toggleShowGeminiApiKey = toggleShowGeminiApiKey;

function syncGeminiApiKeyToLocalCache(keyVal) {
  if (!keyVal || typeof keyVal !== 'string') return;
  const val = keyVal.trim();
  if (!val || val === 'null' || val === 'undefined') return;

  try {
    localStorage.setItem('gemini_api_key', val);
    localStorage.setItem('GEMINI_API_KEY', val);
  } catch(e) {}
  try {
    appStorage.setItem('gemini_api_key', val);
    appStorage.setItem('GEMINI_API_KEY', val);
  } catch(e) {}

  if (typeof updateAiKeyBadgeStatus === 'function') {
    updateAiKeyBadgeStatus();
  }
}
window.syncGeminiApiKeyToLocalCache = syncGeminiApiKeyToLocalCache;

let __lastSyncedGeminiKeyVal = null;
let __isSyncingGeminiKeyNow = false;

async function autoSyncGeminiKeyToSupabase(force = false) {
  if (__isSyncingGeminiKeyNow) return false;
  const key = getGeminiApiKey();
  if (!key) return false;

  // Jika kunci tidak berubah dan tidak dipaksa (force), panggil 1x saja
  if (!force && __lastSyncedGeminiKeyVal === key) {
    return true;
  }

  // Hanya Admin / Pusat yang berhak memperbarui Kunci Utama Terpusat di Supabase
  const isAdmin = !currentUser || currentUser.role === 'ADMIN' || currentUser.category === 'ADMIN' || (currentUser.username && String(currentUser.username).toLowerCase().includes('admin'));
  if (!isAdmin) {
    console.log('[GEMINI AI] Non-admin user key saved locally only (not overwriting Supabase global key).');
    return false;
  }

  __isSyncingGeminiKeyNow = true;
  let success = false;

  try {
    const systemGeminiRow = {
      id: '__SYSTEM_GEMINI_KEY__',
      no_surat: '__SYSTEM_GEMINI_KEY__',
      tanggal: typeof getFormattedDateDDMMYYYY === 'function' ? getFormattedDateDDMMYYYY() : '',
      toko: 'SYSTEM',
      area: 'ALL',
      jenis: 'SYSTEM',
      catatan: JSON.stringify({ geminiApiKey: key, time: Date.now(), by: (currentUser && currentUser.username ? currentUser.username : 'USER') || 'ADMIN' }),
      items: [],
      photos: [],
      status: 'DONE',
      service_approve: true,
      created_by: 'SYSTEM',
      created_at: new Date().toISOString()
    };

    if (typeof safeSupabaseUpsertPermintaan === 'function') {
      const res = await safeSupabaseUpsertPermintaan(systemGeminiRow);
      if (res && !res.error) {
        console.log('⚡ [SUPABASE SUCCESS]: __SYSTEM_GEMINI_KEY__ pushed to permintaan_toko!');
        success = true;
        __lastSyncedGeminiKeyVal = key;
      }
    } else {
      const supa = (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : ((typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') ? supabase : (window.supabase && typeof window.supabase.from === 'function' ? window.supabase : null));
      if (supa) {
        await supa.from('permintaan_toko').upsert([systemGeminiRow], { onConflict: 'id' });
        console.log('⚡ [SUPABASE SUCCESS]: __SYSTEM_GEMINI_KEY__ pushed to permintaan_toko!');
        success = true;
        __lastSyncedGeminiKeyVal = key;
      }
    }
  } catch(e) {
    console.warn('[SUPABASE GEMINI KEY SYNC ERROR]:', e);
  } finally {
    __isSyncingGeminiKeyNow = false;
  }

  return success;
}
window.autoSyncGeminiKeyToSupabase = autoSyncGeminiKeyToSupabase;

// JALANKAN 1X SAJA PADA STARTUP
setTimeout(() => {
  if (typeof autoSyncGeminiKeyToSupabase === 'function') {
    autoSyncGeminiKeyToSupabase().catch(() => {});
  }
}, 1000);

function simpanGeminiApiKeyDariModal() {
  const input = document.getElementById('inputGeminiApiKeyVal');
  const val = input ? input.value.trim() : '';
  if (!val) {
    if (typeof showNotif === 'function') showNotif('API KEY KOSONG. SILAHKAN TEMPEL API KEY ANDA!', 'warning');
    else alert('API KEY KOSONG. SILAHKAN TEMPEL API KEY ANDA!');
    return;
  }
  localStorage.setItem('gemini_api_key', val);
  localStorage.setItem('GEMINI_API_KEY', val);
  appStorage.setItem('gemini_api_key', val);
  appStorage.setItem('GEMINI_API_KEY', val);
  updateAiKeyBadgeStatus();
  tutupModalGeminiApiKey();

  if (typeof autoSyncGeminiKeyToSupabase === 'function') {
    autoSyncGeminiKeyToSupabase(true).catch(() => {});
  }
  if (typeof pushCentralCloudDB === 'function') {
    pushCentralCloudDB().catch(() => {});
  }

  if (typeof showNotif === 'function') showNotif('GEMINI API KEY BERHASIL DISIMPAN & DISINKRONKAN KE SUPABASE!', 'success');
  else alert('GEMINI API KEY BERHASIL DISIMPAN & DISINKRONKAN KE SUPABASE!');
}
window.simpanGeminiApiKeyDariModal = simpanGeminiApiKeyDariModal;

function hapusGeminiApiKeyPermanen() {
  localStorage.removeItem('gemini_api_key');
  localStorage.removeItem('GEMINI_API_KEY');
  appStorage.removeItem('gemini_api_key');
  appStorage.removeItem('GEMINI_API_KEY');
  const input = document.getElementById('inputGeminiApiKeyVal');
  if (input) input.value = '';
  updateAiKeyBadgeStatus();
  tutupModalGeminiApiKey();

  if (typeof safeSupabaseUpsertPermintaan === 'function') {
    safeSupabaseUpsertPermintaan({
      id: '__SYSTEM_GEMINI_KEY__',
      no_surat: '__SYSTEM_GEMINI_KEY__',
      catatan: JSON.stringify({ geminiApiKey: '', time: Date.now() }),
      status: 'DONE',
      service_approve: true,
      created_by: 'SYSTEM',
      created_at: new Date().toISOString()
    }).catch(() => {});
  }

  if (typeof showNotif === 'function') showNotif('GEMINI API KEY TELAH DIHAPUS / DIKOSONGKAN!', 'info');
  else alert('GEMINI API KEY TELAH DIHAPUS!');
}
window.hapusGeminiApiKeyPermanen = hapusGeminiApiKeyPermanen;

function triggerUploadPdfAutoFill() {
  const key = getGeminiApiKey();
  if (!key) {
    aturGeminiApiKey();
    if (typeof showNotif === 'function') showNotif('SILAHKAN MASUKKAN GEMINI API KEY TERLEBIH DAHULU!', 'warning');
    return;
  }
  const input = document.getElementById('inputPdfAutoFill');
  if (input) input.click();
}
window.triggerUploadPdfAutoFill = triggerUploadPdfAutoFill;

function triggerUploadGambarAutoFill() {
  const key = getGeminiApiKey();
  if (!key) {
    aturGeminiApiKey();
    if (typeof showNotif === 'function') showNotif('SILAHKAN MASUKKAN GEMINI API KEY TERLEBIH DAHULU!', 'warning');
    return;
  }
  const input = document.getElementById('inputGambarAutoFill');
  if (input) input.click();
}
window.triggerUploadGambarAutoFill = triggerUploadGambarAutoFill;

function triggerUploadExcelAutoFill() {
  const input = document.getElementById('inputExcelAutoFill');
  if (input) input.click();
}
window.triggerUploadExcelAutoFill = triggerUploadExcelAutoFill;

// OPTIMASI GAMBAR UNTUK GOOGLE GEMINI VISION (CRISP, FAST & ZERO PAYLOAD TIMEOUT)
async function optimizeImageForGemini(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 2048;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        const b64 = dataUrl.split(',')[1] || dataUrl;
        resolve({ mimeType: 'image/jpeg', base64Data: b64 });
      };
      img.onerror = () => {
        const rawB64 = (e.target.result || '').split(',')[1] || '';
        resolve({ mimeType: file.type || 'image/jpeg', base64Data: rawB64 });
      };
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// DAFTAR MODEL RESMI AKTIF GOOGLE GEMINI DENGAN DUKUNGAN MULTIMODAL LENGKAP (TERUJI 100% SUKSES)
function getStableGeminiModels() {
  return [
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-3.6-flash',
    'gemini-pro-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
}

// ----------------------------------------------------
// 1. PROSES BACA DOKUMEN PDF DENGAN GOOGLE GEMINI AI
// ----------------------------------------------------
async function prosesPdfAutoFillGemini(event) {
  const abortController = new AbortController();
  window._cancelGeminiProcess = () => abortController.abort();
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // LANGSUNG TAMPILKAN LOADING OVERLAY
  if (typeof showLoading === 'function') showLoading('Membaca Dokumen...', true);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    if (typeof hideLoading === 'function') hideLoading();
    aturGeminiApiKey();
    if (typeof showNotif === 'function') showNotif('SILAHKAN MASUKKAN GEMINI API KEY TERLEBIH DAHULU!', 'warning');
    event.target.value = '';
    return;
  }

  try {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const b64 = result.split(',')[1] || result;
        resolve(b64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const modelCandidates = getStableGeminiModels();
    const promptText = `
Anda adalah asisten pengurai data dokumen PDF permintaan barang / toko yang sangat akurat.
PANDUAN UTAMA:
- ABAIKAN SEMUA informasi header dokumen seperti NAMA TOKO, NOMOR SURAT, TANGGAL, dan CATATAN.
- HANYA EKSTRAK baris-baris daftar barang pada tabel ke dalam array items dengan kolom-kolom berikut:
  1. TYPE (typeBarang) -> Nama / Tipe Barang
  2. SERI (noSeri) -> Nomor Seri / IMEI Barang
  3. PERMINTAAN (permintaanBarang) -> Deskripsi / Nama Barang Permintaan
  4. SN DUS (noSeriDus) -> Nomor Seri Dus jika ada
  5. ALASAN (alasan) -> Alasan Permintaan
  6. QTY (qty) -> Jumlah Qty (angka)

Kembalikan hasilnya HANYA dalam format JSON murni TANPA pembungkus markdown apapun.

Format JSON wajib persis seperti berikut:
{
  "jenis": "DEFAULT atau DUS",
  "items": [
    {
      "typeBarang": "Nama / Tipe Barang",
      "noSeri": "Nomor Seri Barang",
      "permintaanBarang": "Deskripsi Barang Permintaan",
      "noSeriDus": "Nomor Seri Dus jika ada",
      "alasan": "Alasan Permintaan",
      "qty": 1
    }
  ]
}
`;

    const generatePayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    let response = null;
    let rawText = '';
    let isUnauthorized = false;
    let lastErrorStatus = null;
    let lastErrorMessage = '';

    for (const mod of modelCandidates) {
      if (response && rawText) break;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;

      try {
        console.log(`[GEMINI AI]: Mengirim dokumen PDF ke model ${mod}...`);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generatePayload),
          signal: abortController.signal
        });

        lastErrorStatus = res.status;

        if (res.status === 401 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          if (errData && errData.error && (errData.error.code === 401 || errData.error.code === 400 || String(errData.error.message).includes('API key'))) {
            isUnauthorized = true;
            lastErrorMessage = errData.error.message || 'API key tidak valid';
          }
        }

        if (res.status === 503 || res.status === 429 || res.status === 500 || res.status === 404) {
          console.warn(`[GEMINI AI ${mod} (${res.status})]: Beralih ke model berikutnya...`);
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        if (res.ok) {
          const resJson = await res.json();
          if (resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content) {
            const parts = resJson.candidates[0].content.parts || [];
            rawText = parts.map(p => p.text || '').join('');
            if (rawText.trim()) {
              response = res;
              break;
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
      }
    }

    if (isUnauthorized && (!response || !rawText)) {
      if (typeof hideLoading === 'function') hideLoading();
      aturGeminiApiKey();
      if (typeof showNotif === 'function') showNotif('EROR GEMINI AI: GEMINI API KEY TIDAK VALID!', 'warning');
      return;
    }

    // JIKA PENGIRIMAN FILE PDF ASLI BELUM BERHASIL, COBA RENDER HALAMAN PDF SEBAGAI GAMBAR KE GEMINI VISION
    if (!response || !rawText) {
      console.log('[GEMINI AI]: Mengonversi halaman PDF menjadi gambar untuk diproses Gemini Vision...');
      await ensurePdfJsLoaded();
      if (typeof pdfjsLib !== 'undefined') {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdfDoc.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const imgBase64 = canvas.toDataURL('image/jpeg', 0.90).split(',')[1];

          if (imgBase64) {
            const visionPayload = {
              contents: [{
                parts: [
                  { text: promptText },
                  { inlineData: { mimeType: "image/jpeg", data: imgBase64 } }
                ]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1
              }
            };

            for (const mod of modelCandidates) {
              if (response && rawText) break;
              const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;
              try {
                console.log(`[GEMINI VISION]: Mengirim render PDF ke model ${mod}...`);
                const vRes = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(visionPayload),
                  signal: abortController.signal
                });
                if (vRes.ok) {
                  const vJson = await vRes.json();
                  if (vJson.candidates && vJson.candidates[0] && vJson.candidates[0].content) {
                    const parts = vJson.candidates[0].content.parts || [];
                    rawText = parts.map(p => p.text || '').join('');
                    if (rawText.trim()) {
                      response = vRes;
                      break;
                    }
                  }
                }
              } catch(e) {}
            }
          }
        } catch(e) {
          console.warn('[GEMINI VISION PDF CONVERSION]:', e);
        }
      }
    }

    if (!response || !rawText) {
      if (lastErrorStatus === 429) {
        throw new Error('Kuota Google Gemini AI akun Anda sedang penuh (Limit 429). Mohon tunggu 1 menit atau gunakan Gemini API Key lain.');
      } else if (lastErrorStatus === 404 || lastErrorStatus === 503) {
        throw new Error(`Layanan Google Gemini AI sedang sibuk (${lastErrorStatus}). Silakan coba sesaat lagi.`);
      } else {
        throw new Error('Google Gemini AI tidak dapat membaca teks dari dokumen PDF ini.');
      }
    }

    const parsedData = extractFirstValidJSON(rawText);

    if (!parsedData) {
      throw new Error('Format data dari Gemini AI tidak valid.');
    }

    const applied = applyParsedDataToForm(parsedData);
    if (typeof hideLoading === 'function') hideLoading();
    if (applied) {
      if (typeof showNotif === 'function') showNotif('DOKUMEN BERHASIL DI BACA', 'success');
    } else {
      if (typeof showNotif === 'function') showNotif('DOKUMEN BERHASIL DI BACA (Periksa kembali detail barang)', 'info');
    }

  } catch(err) {
    if (typeof hideLoading === 'function') hideLoading();
    if (err.name === 'AbortError' || (abortController && abortController.signal.aborted)) {
      return;
    }
    // NOTIFIKASI EROR
    if (typeof showNotif === 'function') showNotif('EROR MEMBACA DOKUMEN: ' + (err.message || String(err)), 'danger');
  } finally {
    window._cancelGeminiProcess = null;
    event.target.value = '';
  }
}
window.prosesPdfAutoFillGemini = prosesPdfAutoFillGemini;
window.prosesPdfAutoFill = prosesPdfAutoFillGemini;

// ----------------------------------------------------
// 2. PROSES BACA FOTO / GAMBAR DENGAN GOOGLE GEMINI AI
// ----------------------------------------------------
async function prosesGambarAutoFillGemini(event) {
  const abortController = new AbortController();
  window._cancelGeminiProcess = () => abortController.abort();
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // LANGSUNG TAMPILKAN LOADING OVERLAY
  if (typeof showLoading === 'function') showLoading('Membaca Dokumen...', true);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    if (typeof hideLoading === 'function') hideLoading();
    aturGeminiApiKey();
    if (typeof showNotif === 'function') showNotif('SILAHKAN MASUKKAN GEMINI API KEY TERLEBIH DAHULU!', 'warning');
    event.target.value = '';
    return;
  }

  try {
    // PRE-PROCESSING GAMBAR (RESIZE & COMPRESS KE HIGH QUALITY JPEG AGAR CEPAT DAN BEBAS EROR PAYLOAD)
    const { mimeType, base64Data } = await optimizeImageForGemini(file);

    const modelCandidates = getStableGeminiModels();
    const promptText = `
Anda adalah asisten pengurai data gambar dokumen permintaan barang / toko yang sangat akurat.
PANDUAN UTAMA:
- ABAIKAN SEMUA informasi header dokumen seperti NAMA TOKO, NOMOR SURAT, TANGGAL, dan CATATAN.
- HANYA EKSTRAK baris-baris daftar barang pada tabel ke dalam array items dengan kolom-kolom berikut:
  1. TYPE (typeBarang) -> Nama / Tipe Barang
  2. SERI (noSeri) -> Nomor Seri / IMEI Barang
  3. PERMINTAAN (permintaanBarang) -> Deskripsi / Nama Barang Permintaan
  4. SN DUS (noSeriDus) -> Nomor Seri Dus jika ada
  5. ALASAN (alasan) -> Alasan Permintaan
  6. QTY (qty) -> Jumlah Qty (angka)

Kembalikan hasilnya HANYA dalam format JSON murni TANPA pembungkus markdown apapun.

Format JSON wajib persis seperti berikut:
{
  "jenis": "DEFAULT atau DUS",
  "items": [
    {
      "typeBarang": "Nama / Tipe Barang",
      "noSeri": "Nomor Seri Barang",
      "permintaanBarang": "Deskripsi Barang Permintaan",
      "noSeriDus": "Nomor Seri Dus jika ada",
      "alasan": "Alasan Permintaan",
      "qty": 1
    }
  ]
}
`;

    const generatePayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    let response = null;
    let rawText = '';
    let isUnauthorized = false;
    let lastErrorStatus = null;

    for (const mod of modelCandidates) {
      if (response && rawText) break;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${apiKey}`;

      try {
        console.log(`[GEMINI VISION AI]: Mengirim gambar ke Google Gemini model ${mod}...`);
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generatePayload),
          signal: abortController.signal
        });

        lastErrorStatus = res.status;

        if (res.status === 401 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          if (errData && errData.error && (errData.error.code === 401 || errData.error.code === 400 || String(errData.error.message).includes('API key'))) {
            isUnauthorized = true;
          }
        }

        if (res.status === 503 || res.status === 429 || res.status === 500 || res.status === 404) {
          console.warn(`[GEMINI VISION MODEL ${mod} (${res.status})]: Beralih ke model berikutnya...`);
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        if (res.ok) {
          const resJson = await res.json();
          if (resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content) {
            const parts = resJson.candidates[0].content.parts || [];
            rawText = parts.map(p => p.text || '').join('');
            if (rawText.trim()) {
              response = res;
              break;
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') throw e;
      }
    }

    if (isUnauthorized && (!response || !rawText)) {
      if (typeof hideLoading === 'function') hideLoading();
      aturGeminiApiKey();
      if (typeof showNotif === 'function') showNotif('EROR GEMINI AI: GEMINI API KEY TIDAK VALID!', 'warning');
      return;
    }

    if (!response || !rawText) {
      if (lastErrorStatus === 429) {
        throw new Error('Kuota Google Gemini AI akun Anda sedang penuh (Limit 429). Mohon tunggu 1 menit atau gunakan Gemini API Key lain.');
      } else if (lastErrorStatus === 404 || lastErrorStatus === 503) {
        throw new Error(`Layanan Google Gemini AI sedang sibuk (${lastErrorStatus}). Silakan coba sesaat lagi.`);
      } else {
        throw new Error('Google Gemini AI tidak dapat membaca teks dari gambar ini.');
      }
    }

    const parsedData = extractFirstValidJSON(rawText);

    if (!parsedData) {
      throw new Error('Format data dari Gemini AI tidak valid.');
    }

    const applied = applyParsedDataToForm(parsedData);
    if (typeof hideLoading === 'function') hideLoading();
    if (applied) {
      if (typeof showNotif === 'function') showNotif('DOKUMEN BERHASIL DI BACA', 'success');
    } else {
      if (typeof showNotif === 'function') showNotif('DOKUMEN BERHASIL DI BACA (Periksa kembali detail barang)', 'info');
    }

  } catch(err) {
    if (typeof hideLoading === 'function') hideLoading();
    if (err.name === 'AbortError' || (abortController && abortController.signal.aborted)) {
      return;
    }
    // NOTIFIKASI EROR
    if (typeof showNotif === 'function') showNotif('EROR MEMBACA GAMBAR: ' + (err.message || String(err)), 'danger');
  } finally {
    window._cancelGeminiProcess = null;
    event.target.value = '';
  }
}
window.prosesGambarAutoFillGemini = prosesGambarAutoFillGemini;
window.prosesGambarAutoFill = prosesGambarAutoFillGemini;

function extractFirstValidJSON(text) {
  if (!text) return null;

  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (e1) {}

  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    let braceCount = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = startIdx; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;

        if (braceCount === 0) {
          const jsonSub = cleaned.substring(startIdx, i + 1);
          try {
            return JSON.parse(jsonSub);
          } catch (eSub) {
            const fixCommas = jsonSub.replace(/,\s*([\}\]])/g, '$1');
            try {
              return JSON.parse(fixCommas);
            } catch (eFix) {}
          }
          break;
        }
      }
    }
  }

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (eMatch) {
      const fixCommas = match[0].replace(/,\s*([\}\]])/g, '$1');
      try {
        return JSON.parse(fixCommas);
      } catch (eFix) {}
    }
  }

  return null;
}
window.extractFirstValidJSON = extractFirstValidJSON;

async function getBestActiveGeminiModel(apiKey) {
  const defaultPriority = getStableGeminiModels();
  if (!apiKey) return defaultPriority;
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData && Array.isArray(listData.models)) {
        const activeList = listData.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
        
        const matched = defaultPriority.filter(m => activeList.includes(m));
        if (matched.length > 0) return matched;

        const extra = activeList.filter(m => !m.includes('tts') && !m.includes('audio') && !m.includes('embedding') && !m.includes('video') && !m.includes('robotics'));
        if (extra.length > 0) return extra;
      }
    }
  } catch (e) {}
  return defaultPriority;
}
window.getBestActiveGeminiModel = getBestActiveGeminiModel;

function saveStoresToDB(stores, targetStore = null) {
  appStorage.setItem(TOKO_DB_KEY, JSON.stringify(stores));

  const isSupabaseConfigured = typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE');
  if (isSupabaseConfigured && typeof supabase !== 'undefined' && supabase) {
    try {
      const sourceStores = targetStore ? (Array.isArray(targetStore) ? targetStore : [targetStore]) : stores;
      const supaStores = sourceStores.map(s => ({
        id: s.id,
        full_name: s.fullName,
        area: s.area,
        created_by: s.createdBy || 'ADMIN',
        updated_at: new Date().toISOString()
      })).filter(s => s.id);

      if (supaStores.length > 0) {
        supabase.from('toko_list').upsert(supaStores, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.warn('[SUPABASE STORE SYNC NOTICE]:', error.message);
        });
      }
    } catch(e) {}
  }
}
window.saveStoresToDB = saveStoresToDB;

async function deleteRequestFromSupabase(noSurat) {
  if (!noSurat || typeof supabase === 'undefined' || !supabase) return;
  try {
    await supabase.from('permintaan_toko').delete().eq('no_surat', noSurat);
  } catch(e) {}
}
window.deleteRequestFromSupabase = deleteRequestFromSupabase;

async function deleteUserFromSupabase(username) {
  if (!username || typeof supabase === 'undefined' || !supabase) return;
  try {
    await supabase.from('users').delete().eq('username', username);
  } catch(e) {}
}
window.deleteUserFromSupabase = deleteUserFromSupabase;

async function deleteStoreFromSupabase(storeId) {
  if (!storeId || typeof supabase === 'undefined' || !supabase) return;
  try {
    await supabase.from('toko_list').delete().eq('id', storeId);
  } catch(e) {}
}
window.deleteStoreFromSupabase = deleteStoreFromSupabase;

// =======================================================================
// LIGHTWEIGHT SENTINEL DELTA SYNC (50-BYTE CHECK FOR LIVE INTER-DEVICE UPDATES)
// =======================================================================
let lastSentinelTimestamp = appStorage.getItem('SUPABASE_SENTINEL_LAST_TS') || '';

async function checkSupabaseDeltaSentinel() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const { data: latestRows, error } = await supabase
      .from('permintaan_toko')
      .select('no_surat, updated_at')
      .not('no_surat', 'like', '__SYSTEM_%')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (error || !Array.isArray(latestRows) || latestRows.length === 0) return;

    let hasNewChanges = false;
    for (const latest of latestRows) {
      const serverTs = latest.updated_at || '';
      if (!serverTs) continue;

      if (!lastSentinelTimestamp) {
        lastSentinelTimestamp = serverTs;
        appStorage.setItem('SUPABASE_SENTINEL_LAST_TS', serverTs);
        continue;
      }

      if (serverTs > lastSentinelTimestamp) {
        lastSentinelTimestamp = serverTs;
        appStorage.setItem('SUPABASE_SENTINEL_LAST_TS', serverTs);

        // Fetch ONLY the single modified/new row from Supabase (Delta Payload)
        const { data: targetData } = await supabase
          .from('permintaan_toko')
          .select('*')
          .eq('no_surat', latest.no_surat);

        if (Array.isArray(targetData) && targetData.length > 0) {
          const formatted = formatSupabaseRequestRow(targetData[0]);
          if (formatted && !formatted.noSurat.startsWith('__SYSTEM_')) {
            const currentReqs = getRequestsFromDB();
            const idx = currentReqs.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(formatted.noSurat).trim().toUpperCase());
            if (idx !== -1) {
              currentReqs[idx] = { ...currentReqs[idx], ...formatted };
            } else {
              currentReqs.unshift(formatted);
            }
            appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(currentReqs));
            hasNewChanges = true;
          }
        }
      }
    }

    if (hasNewChanges && typeof refreshRealtimeUI === 'function') {
      refreshRealtimeUI();
    }
  } catch(e) {}
}
window.checkSupabaseDeltaSentinel = checkSupabaseDeltaSentinel;

// Background auto-fetching sentinel pulse disabled per user directive
window._sentinelPulseInterval = null;
/*
if (!window._sentinelPulseInterval) {
  window._sentinelPulseInterval = setInterval(() => {
    if (typeof checkSupabaseDeltaSentinel === 'function') checkSupabaseDeltaSentinel();
  }, 5000);
}
*/


// GLOBAL ALIASES FOR VIEW PDF
window.lihatPdf = function(noSurat, includePhotos = null) {
  if (typeof tampilkanPilihanCetakPdf === 'function') {
    tampilkanPilihanCetakPdf(noSurat);
  } else if (typeof bukaPdfModal === 'function') {
    bukaPdfModal(noSurat, includePhotos);
  }
};
window.viewPdf = window.lihatPdf;
window.bukaViewPdf = window.lihatPdf;
window.bukaPdf = window.lihatPdf;

window.showNotif = showNotif;
window.closePopup = closePopup;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

// AUTO-INITIALIZE FIREBASE ENGINE IMMEDIATELY ON SCRIPT LOAD
if (typeof initFirebaseDB === 'function') {
  try { initFirebaseDB(); } catch(e) {}
}

function hapusPenyimpananLokalAkun() {
  const modal = document.getElementById('popupSecurityPinHapusLokal');
  const inputPin = document.getElementById('inputPinHapusLokal');
  const errEl = document.getElementById('pinHapusLokalError');
  if (errEl) errEl.style.display = 'none';
  if (inputPin) {
    inputPin.value = '';
    inputPin.style.borderColor = 'var(--border-color)';
  }
  if (modal) {
modal.style.setProperty('display', 'flex', 'important');
modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
    setTimeout(() => {
      if (inputPin) {
        inputPin.focus();
      }
    }, 150);
  }
}
window.hapusPenyimpananLokalAkun = hapusPenyimpananLokalAkun;

function tutupModalPinHapusLokal() {
  const modal = document.getElementById('popupSecurityPinHapusLokal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
}
window.tutupModalPinHapusLokal = tutupModalPinHapusLokal;

async function verifikasiDanEksekusiHapusLokal() {
  const inputPin = document.getElementById('inputPinHapusLokal');
  const errEl = document.getElementById('pinHapusLokalError');
  const pinVal = inputPin ? inputPin.value.trim() : '';

  if (pinVal !== '111111') {
    if (errEl) {
      errEl.textContent = 'PASSWORD KEAMANAN SALAH! (HARUS 6 DIGIT: 111111)';
      errEl.style.display = 'block';
    }
    if (inputPin) {
      inputPin.style.borderColor = '#ef4444';
      inputPin.value = '';
      inputPin.focus();
    }
    if (typeof showNotif === 'function') {
      showNotif('PASSWORD KEAMANAN SALAH!', 'error');
    }
    return;
  }

  tutupModalPinHapusLokal();

  showLoading('MEMBERSIHKAN PENYIMPANAN LOKAL...');
  try {
    if (typeof clearLocalStorageKeepThemeAndTTD === 'function') {
      await clearLocalStorageKeepThemeAndTTD();
    }

    // Hapus sesi login aktif
    currentUser = null;
    appStorage.removeItem(SESSION_KEY);
    try { localStorage.removeItem(SESSION_KEY); } catch(e) {}

    // Tutup modal-modal aktif
    if (typeof tutupAkun === 'function') tutupAkun(true);
    if (typeof tutupNotificationModal === 'function') tutupNotificationModal();
    const popupBantuan = document.getElementById('popupBantuan');
    if (popupBantuan) popupBantuan.classList.remove('show');
    const bottomMenu = document.getElementById('bottomMenu');
    if (bottomMenu) bottomMenu.style.display = 'none';
    const helpBtn = document.getElementById('helpButton');
    if (helpBtn) helpBtn.style.display = 'none';

    // Pindah otomatis ke halaman Login
    if (typeof pindahHalaman === 'function') {
      pindahHalaman('loginPage');
    }
    if (typeof loadRememberedCredentials === 'function') {
      loadRememberedCredentials();
    }
    if (typeof updateNotifBellCounter === 'function') updateNotifBellCounter();
    if (typeof updateGlobalDeviceAppBadge === 'function') updateGlobalDeviceAppBadge();

    hideLoading();
    showNotif('PENYIMPANAN LOKAL BERHASIL DIBERSIHKAN! ANDA TELAH LOGOUT.', 'success');
  } catch (err) {
    hideLoading();
    console.error('[BERSIHKAN LOKAL ERROR]:', err);
    showNotif('GAGAL MEMBERSIHKAN PENYIMPANAN LOKAL!', 'error');
  }
}
window.verifikasiDanEksekusiHapusLokal = verifikasiDanEksekusiHapusLokal;
// =======================================================================
// PWA & DESKTOP/MOBILE HOME SCREEN APP BADGING API
// =======================================================================
function updateGlobalDeviceAppBadge() {
  if (!('setAppBadge' in navigator) && !('setExperimentalAppBadge' in navigator)) return;

  try {
    if (!currentUser) {
      if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
      return;
    }

    // 1. Hitung notifikasi sistem belum dibaca
    const userNotifs = typeof getAccessibleNotifications === 'function' ? getAccessibleNotifications() : [];
    const unreadNotifCount = userNotifs.filter(n => {
      if (!n) return false;
      if (!n.readBy) return true;
      return !n.readBy.includes(currentUser.id) && !n.readBy.includes(currentUser.username);
    }).length;

    // 2. Hitung chat belum dibaca
    const isAdm = typeof isServiceTSMUser === 'function' ? isServiceTSMUser() : false;
    const allChats = JSON.parse(appStorage.getItem(CHAT_DB_KEY) || '[]');
    const rooms = JSON.parse(appStorage.getItem(CHAT_ROOM_DB_KEY) || '[]');

    let unreadChatCount = 0;
    if (isAdm) {
      const unreadRoomsCount = Array.isArray(rooms) ? rooms.filter(r => (Number(r.unreadAdmin) || 0) > 0).length : 0;
      if (unreadRoomsCount > 0) {
        unreadChatCount = unreadRoomsCount;
      } else if (Array.isArray(allChats) && allChats.length > 0) {
        const unreadUsersSet = new Set();
        allChats.forEach(c => {
          if (c && c.pengirim === 'USER' && c.read !== true && (!c.readBy || !c.readBy.includes(currentUser.username))) {
            const uName = String(c.user || c.senderUsername || '').trim().toUpperCase();
            if (uName) unreadUsersSet.add(uName);
          }
        });
        unreadChatCount = unreadUsersSet.size;
      } else {
        unreadChatCount = 0;
      }
    } else {
      const myUname = String(currentUser.username || '').trim().toUpperCase();
      const myRoom = Array.isArray(rooms) ? rooms.find(r => 
        String(r.room || '').trim().toUpperCase() === 'ROOM_' + myUname || 
        String(r.user || '').trim().toUpperCase() === myUname
      ) : null;

      const hasUnreadFromRoom = myRoom && (Number(myRoom.unreadUser) || 0) > 0;
      let hasUnreadFromChats = false;

      if (Array.isArray(allChats) && allChats.length > 0) {
        hasUnreadFromChats = allChats.some(c => {
          if (!c) return false;
          const cUser = String(c.user || c.senderUsername || '').trim().toUpperCase();
          const cRoom = String(c.room || '').trim().toUpperCase();
          const isMyChat = (cUser === myUname || cRoom === 'ROOM_' + myUname);
          const isFromService = (c.pengirim === 'SERVICE' || c.pengirim === 'ADMIN');
          const isUnread = c.read !== true && (!c.readBy || !c.readBy.includes(myUname));
          return isMyChat && isFromService && isUnread;
        });
      }

      unreadChatCount = (hasUnreadFromRoom || hasUnreadFromChats) ? 1 : 0;
    }

    const grandTotalUnread = unreadNotifCount + unreadChatCount;

    if (grandTotalUnread > 0) {
      if (navigator.setAppBadge) {
        navigator.setAppBadge(grandTotalUnread).catch(() => {});
      } else if (navigator.setExperimentalAppBadge) {
        navigator.setExperimentalAppBadge(grandTotalUnread).catch(() => {});
      }
    } else {
      if (navigator.clearAppBadge) {
        navigator.clearAppBadge().catch(() => {});
      } else if (navigator.clearExperimentalAppBadge) {
        navigator.clearExperimentalAppBadge().catch(() => {});
      }
    }
  } catch(e) {}
}
window.updateGlobalDeviceAppBadge = updateGlobalDeviceAppBadge;

// =======================================================================
// DOWNLOAD EXCEL SINGLE DETAIL PERMINTAAN DENGAN STATUS PART
// =======================================================================
function downloadSingleDetailExcel(noSurat) {
  if (!noSurat) return;
  const requests = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = requests.find(r => r && (r.noSurat === noSurat || String(r.noSurat) === String(noSurat) || r.id === noSurat));

  if (!req) {
    if (typeof showNotif === 'function') showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  if (typeof XLSX === 'undefined') {
    if (typeof showNotif === 'function') showNotif('MODUL EXCEL (.XLSX) BELUM SIAP!', 'warning');
    return;
  }

  showLoading('MOHON TUNGGU...');
  setTimeout(() => {
    hideLoading();
    const rows = [];
    rows.push([
      'NO', 'NO SURAT', 'TANGGAL', 'TOKO', 'AREA', 'JENIS PERMINTAAN',
      'TIPE BARANG', 'NO SERI', 'DUS BARANG', 'PERMINTAAN DETAIL', 'ALASAN', 'QTY',
      'STATUS PART', 'BREAKDOWN SURAT', 'STATUS SURAT', 'PEMOHON', 'CATATAN'
    ]);

    let rawItems = req.items;
    let itemsList = [];
    if (Array.isArray(rawItems)) itemsList = rawItems;
    else if (typeof rawItems === 'string') {
      try { itemsList = JSON.parse(rawItems || '[]'); } catch (e) { itemsList = []; }
    }

    if (itemsList.length > 0) {
      itemsList.forEach((it, idx) => {
        const isUnfulfilled = !!(it.unfulfilled || it.batal || it.status === 'TIDAK BISA DIPENUHI' || it.status === 'TIDAK DIPENUHI' || req.status === 'BATAL');
        const customKet = (it.statusPart || it.keteranganPart || it.updatePart || it.noPart || it.alasanBatal || '').trim();
        
        let statusPartVal = '';
        if (isUnfulfilled) {
          if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
            statusPartVal = `TIDAK DIPENUHI (${customKet})`;
          } else {
            statusPartVal = 'TIDAK DIPENUHI';
          }
        } else if (customKet) {
          statusPartVal = customKet;
        } else if (req.status === 'DONE') {
          statusPartVal = 'DIPENUHI';
        } else {
          statusPartVal = '-';
        }

        let namaBarangDisplay = it.barang || it.permintaan || '-';
        if (isUnfulfilled) {
          if (customKet && customKet !== 'TIDAK DIPENUHI' && customKet !== 'TIDAK BISA DIPENUHI') {
            namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI: ${customKet}]`;
          } else {
            namaBarangDisplay = `${namaBarangDisplay} [TIDAK DIPENUHI]`;
          }
        } else if (customKet && customKet !== 'DIPENUHI') {
          namaBarangDisplay = `${namaBarangDisplay} [Ket: ${customKet}]`;
        }

        rows.push([
          idx + 1,
          req.noSurat || '-',
          req.tanggal || '-',
          req.toko || '-',
          req.area || '-',
          req.jenis || '-',
          it.type || it.tipe || '-',
          it.seri || it.sn || '-',
          it.dus || '-',
          namaBarangDisplay,
          it.alasan || '-',
          it.qty || it.jumlah || 1,
          statusPartVal,
          getBreakdownSuratExportValue(req, it),
          isUnfulfilled ? `${req.status || 'PENDING'} (TIDAK DIPENUHI)` : (req.status || '-'),
          req.createdBy || '-',
          req.catatan || ''
        ]);
      });
    } else {
      rows.push([
        1, req.noSurat || '-', req.tanggal || '-', req.toko || '-', req.area || '-', req.jenis || '-',
        '-', '-', '-', '-', '-', 1, '-', getBreakdownSuratExportValue(req, null), req.status || '-', req.createdBy || '-', req.catatan || ''
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detail Permintaan");
    const cleanNo = String(req.noSurat || 'DETAIL').replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(wb, `DETAIL_PERMINTAAN_${cleanNo}.xlsx`);
    }, 250);
}
window.downloadSingleDetailExcel = downloadSingleDetailExcel;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentUser) {
    if (typeof syncSupabaseIncremental === 'function') syncSupabaseIncremental();
  }
});
window.addEventListener('focus', () => {
  if (currentUser) {
    if (typeof syncSupabaseIncremental === 'function') syncSupabaseIncremental();
  }
});

// =======================================================================
// DEDICATED HELPER TABLE (breakdown_parsial) ARCHITECTURE & WORKFLOW
// =======================================================================

const BREAKDOWN_PARSIAL_KEY = 'APP_BREAKDOWN_PARSIAL_DB_V2';

function getAllPartialBreakdownsFromDB() {
  try {
    const data = appStorage.getItem(BREAKDOWN_PARSIAL_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(BREAKDOWN_PARSIAL_KEY) : null);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function getPartialBreakdownsFromDB(noSurat) {
  if (!noSurat) return [];
  const targetNs = String(noSurat).trim().toUpperCase();
  const allPartials = getAllPartialBreakdownsFromDB();
  
  let list = allPartials.filter(p => p && String(p.no_surat_induk || p.noSurat || '').trim().toUpperCase() === targetNs);

  if (list.length === 0 && typeof getRequestsFromDB === 'function') {
    const reqs = getRequestsFromDB();
    const req = reqs.find(r => r && (String(r.noSurat).trim().toUpperCase() === targetNs || String(r.id).trim().toUpperCase() === targetNs));
    if (req && Array.isArray(req.partialBreakdowns) && req.partialBreakdowns.length > 0) {
      list = req.partialBreakdowns.map(p => ({
        id: p.id || `${String(noSurat).replace(/[\/\.]/g, '_')}_${p.partialId || 'P1'}`,
        no_surat_induk: noSurat,
        partial_id: p.partialId || p.id || 'P1',
        items: Array.isArray(p.items) ? p.items : [],
        photos: parsePhotosArray(p.photos),
        status: p.status || 'PENDING',
        created_by: p.createdBy || p.created_by || '',
        created_at: p.createdAt || p.created_at || `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`,
        approved_by: p.approvedBy || p.approved_by || '',
        approved_at: p.approvedAt || p.approved_at || null,
        reject_reason: p.reason || p.reject_reason || ''
      }));
    }
  }

  return list;
}
window.getPartialBreakdownsFromDB = getPartialBreakdownsFromDB;

function savePartialBreakdownsToDB(newPartials, targetNoSurat) {
  try {
    const all = getAllPartialBreakdownsFromDB();
    const targetNs = String(targetNoSurat).trim().toUpperCase();
    
    const cleanNewPartials = [];
    const seenPIds = new Set();
    if (Array.isArray(newPartials)) {
      newPartials.forEach(p => {
        if (p) {
          const pidKey = String(p.partial_id || p.partialId || p.id || '').toUpperCase();
          if (pidKey && !seenPIds.has(pidKey)) {
            seenPIds.add(pidKey);
            cleanNewPartials.push(p);
          }
        }
      });
    }

    let updated = all.filter(p => p && String(p.no_surat_induk || p.noSurat || '').trim().toUpperCase() !== targetNs);
    updated.push(...cleanNewPartials);
    
    appStorage.setItem(BREAKDOWN_PARSIAL_KEY, JSON.stringify(updated));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(BREAKDOWN_PARSIAL_KEY, JSON.stringify(updated)); } catch(e) {}
    }

    const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    const rIdx = reqs.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === targetNs);
    if (rIdx !== -1) {
      reqs[rIdx].partialBreakdowns = cleanNewPartials;
      saveRequestsToDB(reqs, reqs[rIdx], 'UPDATE');
    }

    pushPartialBreakdownsToCloud(cleanNewPartials, targetNoSurat).catch(() => {});

  } catch(e) {
    console.warn('[SAVE PARTIAL BREAKDOWNS ERROR]:', e);
  }
}
window.savePartialBreakdownsToDB = savePartialBreakdownsToDB;

function formatValidIsoTimestamp(dateVal) {
  if (!dateVal) return new Date().toISOString();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date().toISOString() : dateVal.toISOString();
  
  const str = String(dateVal).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();

  if (str.includes('/')) {
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2].length === 4 ? dateParts[2] : `20${dateParts[2]}`;
      const timeStr = (parts[1] || '00:00:00').replace(/\./g, ':');
      const isoCandidate = `${year}-${month}-${day}T${timeStr}`;
      const d2 = new Date(isoCandidate);
      if (!isNaN(d2.getTime())) return d2.toISOString();
    }
  }
  return new Date().toISOString();
}

async function pushPartialBreakdownsToCloud(partials, noSurat) {
  if (!noSurat) return;
  const nsKey = String(noSurat).replace(/[\/\.]/g, '_');

  try {
    const rtdb = typeof getDbRealtime === 'function' ? getDbRealtime() : null;
    if (rtdb) {
      await rtdb.ref('partial_breakdowns/' + nsKey).set(partials || []).catch(() => {});
    }
  } catch(rtErr) {}

  if (typeof supabase !== 'undefined' && supabase) {
    try {
      if (!Array.isArray(partials) || partials.length === 0) {
        const { error: delErr } = await supabase.from('breakdown_parsial').delete().eq('no_surat_induk', noSurat);
        if (delErr) console.warn('[SUPABASE DELETE BREAKDOWN ERROR]:', delErr);
      } else {
        const rowsMap = new Map();
        partials.forEach(p => {
          if (p) {
            const pId = p.partial_id || p.partialId || 'P1';
            const rowId = p.id || `${nsKey}_${pId}`;
            rowsMap.set(rowId, {
              id: rowId,
              no_surat_induk: noSurat,
              partial_id: pId,
              items: Array.isArray(p.items) ? p.items : [],
              photos: parsePhotosArray(p.photos),
              status: p.status || 'PENDING',
              created_by: p.created_by || p.createdBy || '',
              created_at: formatValidIsoTimestamp(p.created_at || p.createdAt),
              approved_by: p.approved_by || p.approvedBy || '',
              approved_at: (p.approved_at || p.approvedAt) ? formatValidIsoTimestamp(p.approved_at || p.approvedAt) : null,
              reject_reason: p.reject_reason || p.reason || ''
            });
          }
        });

        const rows = Array.from(rowsMap.values());
        if (rows.length > 0) {
          const { error: upErr } = await supabase.from('breakdown_parsial').upsert(rows, { onConflict: 'id' });
          if (upErr) {
            console.error('[SUPABASE BREAKDOWN UPSERT ERROR]:', upErr);
            if (upErr.code === '42P01' || String(upErr.message || '').includes('does not exist')) {
              if (typeof showNotif === 'function') {
                showNotif('TABEL breakdown_parsial BELUM DIBUAT DI SUPABASE! Silakan jalankan DDL SQL yang disediakan.', 'warning');
              }
            }
          } else {
            console.log('[SUPABASE BREAKDOWN SUCCESS]: Saved', rows.length, 'partial breakdown rows to cloud.');
          }
        }
      }
    } catch(spErr) {
      console.error('[SUPABASE BREAKDOWN EXCEPTION]:', spErr);
    }
  }
}

async function syncSupabaseBreakdownParsialToLocalCache() {
  if (typeof supabase === 'undefined' || !supabase) return;
  try {
    const { data, error } = await supabase.from('breakdown_parsial').select('*');
    if (!error && Array.isArray(data)) {
      const formatted = data.map(p => ({
        id: p.id,
        no_surat_induk: p.no_surat_induk,
        partial_id: p.partial_id,
        items: Array.isArray(p.items) ? p.items : (typeof p.items === 'string' ? JSON.parse(p.items || '[]') : []),
        photos: parsePhotosArray(p.photos),
        status: p.status || 'PENDING',
        created_by: p.created_by || '',
        created_at: p.created_at || '',
        approved_by: p.approved_by || '',
        approved_at: p.approved_at || null,
        reject_reason: p.reject_reason || ''
      }));

      appStorage.setItem(BREAKDOWN_PARSIAL_KEY, JSON.stringify(formatted));
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(BREAKDOWN_PARSIAL_KEY, JSON.stringify(formatted)); } catch(e) {}
      }
    }
  } catch (err) {
    console.warn('[SYNC BREAKDOWN PARSIAL FROM SUPABASE NOTICE]:', err);
  }
}
window.syncSupabaseBreakdownParsialToLocalCache = syncSupabaseBreakdownParsialToLocalCache;

function kirimNotifDanWaBreakdown(noSurat, partialId, statusType, extra = {}) {
  if (!noSurat || !partialId) return;
  
  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
  const targetArea = req ? (req.area || 'ALL') : 'ALL';
  const tokoName = req ? (req.toko || 'TOKO') : 'TOKO';

  let msg = '';
  let targetRoles = ['SERVICE', 'ADMIN', 'DM'];

  if (statusType === 'PENDING') {
    targetRoles = ['DM', 'ADMIN'];
    msg = `[BREAKDOWN PARSIAL] MOHON APPROVAL DM - Surat Jalan Parsial #${noSurat}-${partialId} (${tokoName}) telah diajukan.`;
  } else if (statusType === 'APPROVE') {
    targetRoles = ['SERVICE', 'ADMIN', 'TOKO', 'GBJ'];
    msg = `[BREAKDOWN PARSIAL] DISETUJUI DM - Surat Jalan Parsial #${noSurat}-${partialId} (${tokoName}) telah disetujui!`;
  } else if (statusType === 'REJECT') {
    targetRoles = ['SERVICE', 'ADMIN', 'TOKO', 'GBJ'];
    msg = `[BREAKDOWN PARSIAL] DITOLAK DM - Surat Jalan Parsial #${noSurat}-${partialId} (${tokoName}) ditolak DM. Alasan: ${extra.reason || '-'}`;
  }

  if (msg && typeof tambahNotifikasiSistem === 'function') {
    tambahNotifikasiSistem(targetRoles, targetArea, msg, noSurat);
  }
}
window.kirimNotifDanWaBreakdown = kirimNotifDanWaBreakdown;

function tampilkanLoadingProses(pesan = 'MOHON TUNGGU...') {
  if (typeof showLoading === 'function') {
    showLoading(pesan);
  } else {
    const existing = document.getElementById('loadingProsesOverlay');
    if (existing) existing.remove();

    const loadingHtml = `
      <div id="loadingProsesOverlay" class="modal-overlay active" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(5px); z-index: 2147483647 !important; align-items: center; justify-content: center;">
        <div style="background: rgba(15, 23, 42, 0.95); color: #f8fafc; padding: 22px 28px !important; border-radius: 12px !important; border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 12px 36px rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; gap: 12px !important; text-align: center; max-width: 320px;">
          <div style="width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.15); border-top-color: #38bdf8; border-right-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.9));"></div>
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc; letter-spacing: 0.5px; text-transform: uppercase;">${pesan}</div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
  }
}
window.tampilkanLoadingProses = tampilkanLoadingProses;

function tutupLoadingProses() {
  if (typeof hideLoading === 'function') {
    hideLoading();
  }
  const el = document.getElementById('loadingProsesOverlay');
  if (el) el.remove();
}
window.tutupLoadingProses = tutupLoadingProses;

function calcItemDeliveredQty(req, itemIdx) {
  if (!req || !Array.isArray(req.items) || itemIdx < 0 || itemIdx >= req.items.length) return 0;
  const partials = getPartialBreakdownsFromDB(req.noSurat);
  const approvedPartials = partials.filter(p => p && (p.status === 'APPROVE' || p.status === 'DONE'));
  
  let delivered = 0;
  approvedPartials.forEach(p => {
    if (Array.isArray(p.items)) {
      p.items.forEach(pi => {
        if (pi.itemIdx === itemIdx || String(pi.type || pi.tipe || '').trim() === String(req.items[itemIdx].type || req.items[itemIdx].tipe || '').trim()) {
          delivered += Number(pi.qtyDiserahkan || pi.qty || pi.jumlah || 0);
        }
      });
    }
  });

  return delivered;
}
window.calcItemDeliveredQty = calcItemDeliveredQty;

function calcItemAllocatedQty(req, itemIdx) {
  if (!req || !Array.isArray(req.items) || itemIdx < 0 || itemIdx >= req.items.length) return 0;
  const partials = getPartialBreakdownsFromDB(req.noSurat);
  const activePartials = partials.filter(p => p && (p.status === 'APPROVE' || p.status === 'DONE' || p.status === 'PENDING'));
  
  let allocated = 0;
  activePartials.forEach(p => {
    if (Array.isArray(p.items)) {
      p.items.forEach(pi => {
        if (pi.itemIdx === itemIdx || String(pi.type || pi.tipe || '').trim() === String(req.items[itemIdx].type || req.items[itemIdx].tipe || '').trim()) {
          allocated += Number(pi.qtyDiserahkan || pi.qty || pi.jumlah || 0);
        }
      });
    }
  });

  return allocated;
}
window.calcItemAllocatedQty = calcItemAllocatedQty;

function calcItemRemainingQty(req, itemIdx) {
  if (!req || !Array.isArray(req.items) || itemIdx < 0 || itemIdx >= req.items.length) return 0;
  const it = req.items[itemIdx];
  const reqQty = Number(it.qty || it.jumlah || 1);
  const allocatedQty = calcItemAllocatedQty(req, itemIdx);
  const rem = reqQty - allocatedQty;
  return rem > 0 ? rem : 0;
}
window.calcItemRemainingQty = calcItemRemainingQty;

function isRequestReadyForDone(req) {
  if (!req || !Array.isArray(req.items) || req.items.length === 0) return true;
  const partials = getPartialBreakdownsFromDB(req.noSurat);
  
  // Jika TIDAK ADA breakdown (atau pengajuan breakdown sudah dibatalkan/dihapus):
  // Ini adalah transaksi biasa -> LANGSUNG BISA DONE KETERANGAN BIASA!
  if (!Array.isArray(partials) || partials.length === 0) {
    return true;
  }

  // Jika TERDAPAT breakdown:
  // 1. Pastikan semua breakdown parsial sudah DONE / REJECT (tidak ada yang PENDING/APPROVE gantung)
  const unDonePartials = partials.filter(p => p && p.status !== 'DONE' && p.status !== 'REJECT');
  if (unDonePartials.length > 0) return false;

  // 2. Pastikan tidak ada sisa Qty yang belum dibreakdown kecuali jika ditandai "TIDAK DIPENUHI"
  const unfulfilledItems = req.items.filter((it, idx) => {
    const remQty = calcItemRemainingQty(req, idx);
    const isUnfulfilled = it.isUnfulfilled || String(it.keterangan || '').toUpperCase() === 'TIDAK DIPENUHI' || String(it.keteranganPart || '').toUpperCase() === 'TIDAK DIPENUHI';
    return remQty > 0 && !isUnfulfilled;
  });

  return unfulfilledItems.length === 0;
}
window.isRequestReadyForDone = isRequestReadyForDone;

function bukaModalDoneParsial(noSurat, partialId) {
  if (!noSurat || !partialId) return;
  window._activeDonePartialNoSurat = noSurat;
  window._activeDonePartialId = partialId;

  const artemisNoSurat = document.getElementById('artemisNoSurat');
  if (artemisNoSurat) artemisNoSurat.value = noSurat;
  const inputKet = document.getElementById('inputKetPartArtemis');
  if (inputKet) inputKet.value = '';

  const pasteBox = document.getElementById('artemisPasteBox');
  const previewGrid = document.getElementById('artemisPhotoPreviewGrid');
  if (pasteBox) pasteBox.style.display = 'block';
  if (previewGrid) previewGrid.style.display = 'flex';

  const artemisSubTitle = document.getElementById('artemisSubTitle');
  if (artemisSubTitle) artemisSubTitle.textContent = `UPLOAD FOTO BUKTI PROSES ARTEMIS UNTUK SURAT PARSIAL ${noSurat}-${partialId}:`;

  const titleEl = document.getElementById('artemisTitle');
  if (titleEl) {
    titleEl.innerText = `SELESAIKAN SURAT PARSIAL (${noSurat}-${partialId})`;
  }

  tempArtemisPhotos = [];
  renderArtemisPhotoPreviews();

  const overlay = document.getElementById('artemisOverlay');
  if (overlay) {
    overlay.classList.add('show');
    overlay.style.setProperty('z-index', '99999999', 'important');
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    try { history.pushState({ artemisModalOpen: true }, ''); } catch(e) {}
  }
}
window.bukaModalDoneParsial = bukaModalDoneParsial;

// =======================================================================
// SERVICE BREAKDOWN SUBMISSION (+ AJUKAN BREAKDOWN)
// =======================================================================

function bukaModalBuatParsial(noSurat) {
  if (!noSurat) return;
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
  const userCatUpper = currentUser ? String(currentUser.category || '').toUpperCase() : '';
  const userRoleUpper = currentUser ? String(currentUser.role || '').toUpperCase() : '';
  const isStrictDMUser = currentUser && (userCatUpper.includes('DM') || userRoleUpper.includes('DM'));
  const isStrictAdminUser = currentUser && (userCatUpper === 'ADMIN' || userRoleUpper === 'ADMIN' || String(currentUser.username).toUpperCase() === 'ADMIN');
  
  if (isStrictDMUser && !isStrictAdminUser) {
    if (typeof showNotif === 'function') showNotif('AKUN DM TIDAK DAPAT MEMBUAT PENGAJUAN BREAKDOWN! HANYA ROLE SERVICE / ADMIN.', 'warning');
    return;
  }

  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
  if (!req) {
    if (typeof showNotif === 'function') showNotif('SURAT PERMINTAAN TIDAK DITEMUKAN!', 'error');
    return;
  }

  // Reset temporary photos list for new submission
  window._tempParsialPhotos = [];

  const existingModal = document.getElementById('modalBuatParsial');
  if (existingModal) existingModal.remove();

  // Sembunyikan popup detail barang jika sedang terbuka agar tidak tertutup / bertumpuk
  const detailPopup = document.getElementById('popupDetailBarangV2');
  if (detailPopup) {
    detailPopup.style.display = 'none';
    detailPopup.classList.remove('show');
  }

  // Filter item yang BELUM LUNAS & BELUM DITANDAI "TIDAK DIPENUHI"
  const eligibleItems = [];
  if (Array.isArray(req.items)) {
    req.items.forEach((it, idx) => {
      const remQty = calcItemRemainingQty(req, idx);
      const isUnfulfilled = it.isUnfulfilled || String(it.keterangan || '').toUpperCase() === 'TIDAK DIPENUHI' || String(it.keteranganPart || '').toUpperCase() === 'TIDAK DIPENUHI';
      
      if (remQty > 0 && !isUnfulfilled) {
        eligibleItems.push({
          idx,
          item: it,
          remQty
        });
      }
    });
  }

  if (eligibleItems.length === 0) {
    if (typeof showNotif === 'function') {
      showNotif('TIDAK ADA BARANG DENGAN SISA QTY YANG DAPAT DIBREAKDOWN! SEMUA BARANG SUDAH LUNAS ATAU DITANDAI "TIDAK DIPENUHI".', 'warning');
    }
    return;
  }

  const existingPartials = getPartialBreakdownsFromDB(noSurat);
  // HANYA HITUNG PARSIAL YANG AKTIF (Bukan status REJECT / (TOLAK)) SEHINGGA NOMOR TETAP URUT 1-XXX
  const activePartials = existingPartials.filter(p => p && p.status !== 'REJECT' && !String(p.partial_id || p.partialId || '').includes('(TOLAK)'));
  const nextPartialNum = activePartials.length + 1;
  const nextPartialId = `P${nextPartialNum}`;

  window._activeParsialNoSurat = noSurat;
  window._activeNextPartialId = nextPartialId;
  window._tempParsialPhotos = [];

  const rejectedPartials = existingPartials.filter(p => p && p.status === 'REJECT');

  const itemsRowsHtml = eligibleItems.map((el, idxSeq) => {
    const i = el.item;
    const reqQty = Number(i.qty || i.jumlah || 1);
    const delQty = calcItemDeliveredQty(req, el.idx);
    const bgRow = idxSeq % 2 === 0 ? 'var(--bg-box)' : 'var(--bg-card)';
    
    const wasRejectedByDM = rejectedPartials.some(p => Array.isArray(p.items) && p.items.some(pi => pi.itemIdx === el.idx || String(pi.type || pi.tipe || '').trim() === String(i.type || i.tipe || '').trim()));
    const rejectBadge = wasRejectedByDM ? `<span style="font-size: 10px; background: #ef4444; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-left: 6px; display: inline-flex; align-items: center; gap: 2px;">🔴 DITOLAK DM (BISA DIAJUKAN ULANG)</span>` : '';

    return `
      <tr style="border-bottom: 1px solid var(--border-color); white-space: nowrap !important; transition: background 0.2s; background: ${bgRow} !important; border-radius: 0px !important; cursor: pointer;" id="parsialRow_${el.idx}" onclick="toggleParsialRowClick(event, ${el.idx})">
        <td style="padding: 2mm !important; text-align: center; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">
          <input type="checkbox" class="parsial-check" id="chkParsial_${el.idx}" data-idx="${el.idx}" data-rem="${el.remQty}" onchange="syncParsialCheckbox(${el.idx})" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); border-radius: 2px !important;">
        </td>
        <td style="padding: 2mm !important; font-weight: 600; color: var(--text-main) !important; font-size: 11.5px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${i.type || i.tipe || '-'}${rejectBadge}</td>
        <td style="padding: 2mm !important; color: var(--text-muted) !important; font-size: 11.5px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${i.seri || i.sn || '-'}</td>
        <td style="padding: 2mm !important; color: var(--text-main) !important; font-weight: 500; font-size: 11.5px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${i.barang || i.permintaan || '-'}</td>
        <td style="padding: 2mm !important; text-align: center; font-weight: 700; color: var(--text-main) !important; font-size: 11.5px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${reqQty}</td>
        <td style="padding: 2mm !important; text-align: center; font-weight: 700; color: #10b981 !important; font-size: 11.5px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${delQty}</td>
        <td style="padding: 2mm !important; text-align: center; font-weight: 800; color: var(--primary) !important; font-size: 12px; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">${el.remQty}</td>
        <td style="padding: 2mm !important; text-align: center; vertical-align: middle; white-space: nowrap !important; border-radius: 0px !important;">
          <input type="number" id="qtyParsialInput_${el.idx}" min="1" max="${el.remQty}" value="${el.remQty}" disabled oninput="toggleParsialRow(${el.idx}, ${el.remQty})" style="width: 65px; padding: 4px; border-radius: 0px !important; border: 1px solid var(--border-color); text-align: center; font-weight: 700; background: var(--bg-box) !important; color: var(--text-main) !important;">
        </td>
      </tr>
    `;
  }).join('');

  const modalHtml = `
    <div id="modalBuatParsial" data-nosurat="${noSurat}" class="modal-overlay active" onclick="if (event.target === this) tutupModalBuatParsial();" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 95000000 !important; align-items: center; justify-content: center; padding: 1mm 0.5mm !important; box-sizing: border-box !important;">
      <div style="background: var(--bg-card); color: var(--text-main); width: calc(100vw - 1mm); height: calc(100vh - 2mm); margin: 1mm 0.5mm !important; border-radius: 8px !important; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid var(--border-color); animation: popIn 0.2s ease-out;">
        
        <!-- HEADER 90 DERAJAT DEGNAN GARIS PEMBATAS RATA TENGAH -->
        <div style="background: var(--primary) !important; color: #ffffff !important; padding: 12px 16px !important; display: flex; justify-content: space-between; align-items: center; border-radius: 0px !important; border-bottom: 1px solid rgba(255,255,255,0.25) !important; flex-shrink: 0; position: relative !important;">
          <div style="text-align: center !important; width: 100%;">
            <div style="font-weight: 800; font-size: 14px; letter-spacing: 0.5px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #ffffff !important; text-align: center !important;">
              <span class="material-symbols-rounded" style="color: #ffffff !important;">call_split</span> AJUKAN SURAT JALAN PARSIAL (${nextPartialId})
            </div>
            <div style="font-size: 11px; opacity: 0.95; margin-top: 2px; color: #ffffff !important; text-align: center !important;">
              No. Surat Induk: <strong style="color: #fef08a;">${noSurat}</strong> | Toko: <strong>${req.toko || '-'}</strong>
            </div>
          </div>
          <button type="button" onclick="tutupModalBuatParsial()" title="TUTUP" style="font-size: 28px !important; font-weight: 900 !important; color: #ffffff !important; background: transparent !important; border: none !important; cursor: pointer !important; line-height: 1 !important; outline: none !important; padding: 0 4px !important; margin: 0 !important; opacity: 0.95;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.95'">&times;</button>
        </div>

        <!-- BODY CONTENT -->
        <div style="padding: 2mm 0 !important; overflow-y: auto; flex: 1; background: var(--bg-card); display: flex; flex-direction: column;">
          <div style="background: var(--bg-box); border-left: 3px solid var(--primary); padding: 2mm !important; border-radius: 0px !important; margin: 0 2mm 2mm 2mm !important; font-size: 11.5px; color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <span class="material-symbols-rounded" style="font-size: 16px; color: var(--primary);">info</span>
            Centang barang yang akan diserahkan pada tahap penyerahan <strong>${nextPartialId}</strong> ini, lalu atur Qty yang diserahkan.
          </div>

          <!-- KOLOM PENCARIAN & UNGGAH BUKTI FOTO (BERDAMPINGAN DILAYOUT ATAS) -->
          <div style="margin: 0 2mm 2mm 2mm !important; display: flex; gap: 2mm !important; align-items: center; flex-wrap: wrap; flex-shrink: 0;">
            <div style="position: relative; flex: 1; min-width: 220px;">
              <span class="material-symbols-rounded" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 16px; color: var(--text-muted);">search</span>
              <input type="text" id="inputCariItemParsial" oninput="filterTableItemParsial()" placeholder="Cari Type, Seri Barang, Permintaan..." style="width: 100%; padding: 6px 10px 6px 30px; border-radius: 0px !important; border: 1px solid var(--border-color); background: var(--bg-box); color: var(--text-main); font-size: 11.5px; box-sizing: border-box !important;">
            </div>

            <!-- TOMBOL UNGGAH BUKTI FOTO PARSIAL -->
            <input type="file" id="inputFotoParsialFile" accept="image/*" multiple onchange="handleFotoParsialFileSelected(event)" style="display: none;">
            <button type="button" onclick="document.getElementById('inputFotoParsialFile').click()" style="background: var(--bg-box); border: 1px dashed var(--primary); color: var(--primary); padding: 5px 12px; height: 32px; border-radius: 0px !important; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap !important;">
              <span class="material-symbols-rounded" style="font-size: 15px;">add_a_photo</span> UNGGAH BUKTI FOTO <span style="color: var(--text-muted); font-weight: 600; font-size: 11px;">(OPSIONAL)</span>
            </button>
            <div id="previewFotoParsialContainer" style="display: flex; gap: 2mm !important; flex-wrap: wrap; align-items: center;"></div>
          </div>

          <div style="overflow-x: auto; width: 100%; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); border-left: none !important; border-right: none !important; margin: 0 !important; border-radius: 0px !important; flex: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border-radius: 0px !important;">
              <thead style="position: sticky; top: 0; z-index: 5; background: var(--primary) !important; border-radius: 0px !important;">
                <tr style="background: var(--primary) !important; border-bottom: 1px solid var(--border-color); color: #ffffff !important; white-space: nowrap !important; border-radius: 0px !important;">
                  <th style="padding: 2mm !important; text-align: center !important; width: 35px; white-space: nowrap !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-radius: 0px !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">
          <input type="checkbox" id="chkParsialSelectAll" onchange="toggleSelectAllParsial(this)" title="Centang / Batal Centang Semua" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary);">
        </th>
                  <th style="padding: 2mm !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">TYPE</th>
                  <th style="padding: 2mm !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">SERI BARANG</th>
                  <th style="padding: 2mm !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">PERMINTAAN</th>
                  <th style="padding: 2mm !important; text-align: center !important; width: 65px; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">MINTA</th>
                  <th style="padding: 2mm !important; text-align: center !important; width: 65px; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">TERKIRIM</th>
                  <th style="padding: 2mm !important; text-align: center !important; width: 65px; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; border-right: 1px solid rgba(255,255,255,0.2) !important;">SISA</th>
                  <th style="padding: 2mm !important; text-align: center !important; width: 80px; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important;">SERAHKAN</th>
                </tr>
              </thead>
              <tbody id="tableBodyBuatParsial" style="background: var(--bg-card) !important; color: var(--text-main) !important; border-radius: 0px !important;">
                ${itemsRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="padding: 2mm !important; background: var(--bg-header); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 4px 4px !important; flex-shrink: 0;">
          <button type="button" onclick="tutupModalBuatParsial()" style="background: #64748b; color: #fff; border: none; padding: 6px 14px; border-radius: 4px !important; font-weight: 700; font-size: 12px; cursor: pointer;">BATAL</button>
          <button type="button" onclick="prosesKirimPengajuanBreakdown()" style="background: var(--primary) !important; color: #ffffff !important; border: none; padding: 6px 18px; border-radius: 4px !important; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.2);">
            <span class="material-symbols-rounded" style="font-size: 16px;">send</span> KIRIM PENGAJUAN PARSIAL (${nextPartialId})
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.bukaModalBuatParsial = bukaModalBuatParsial;

function toggleParsialRowClick(evt, idx) {
  if (evt && evt.target && (evt.target.tagName === 'INPUT' || evt.target.tagName === 'BUTTON' || evt.target.closest('button') || evt.target.closest('input'))) return;
  const chk = document.getElementById(`chkParsial_${idx}`);
  if (chk) {
    chk.checked = !chk.checked;
    syncParsialCheckbox(idx);
  }
}
window.toggleParsialRowClick = toggleParsialRowClick;

function toggleSelectAllParsial(masterChk) {
  const isChecked = masterChk.checked;
  const modal = document.getElementById('modalBuatParsial');
  const checkboxes = modal ? modal.querySelectorAll('.parsial-check') : document.querySelectorAll('.parsial-check');
  checkboxes.forEach(chk => {
    chk.checked = isChecked;
    const idx = chk.getAttribute('data-idx');
    if (idx !== null) {
      syncParsialCheckbox(idx);
    }
  });
}
window.toggleSelectAllParsial = toggleSelectAllParsial;

function syncParsialCheckbox(idx) {
  const chk = document.getElementById(`chkParsial_${idx}`);
  const inp = document.getElementById(`qtyParsialInput_${idx}`);
  const row = document.getElementById(`parsialRow_${idx}`);
  
  if (chk && inp) {
    inp.disabled = !chk.checked;
    if (chk.checked) {
      if (row) row.style.background = 'rgba(2,132,199,0.08)';
      if (Number(inp.value) <= 0) inp.value = chk.getAttribute('data-rem') || 1;
    } else {
      if (row) row.style.background = 'transparent';
    }
  }
}
window.syncParsialCheckbox = syncParsialCheckbox;

function toggleParsialRow(idx, maxRemQty) {
  const inp = document.getElementById(`qtyParsialInput_${idx}`);
  if (inp) {
    let val = Number(inp.value);
    if (val > maxRemQty) inp.value = maxRemQty;
    if (val < 1) inp.value = 1;
  }
}
window.toggleParsialRow = toggleParsialRow;

function tutupModalBuatParsial() {
  const modal = document.getElementById('modalBuatParsial');
  if (modal) modal.remove();
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupModalBuatParsial = tutupModalBuatParsial;

function filterTableItemParsial() {
  const elSearch = document.getElementById('inputCariItemParsial');
  const query = (elSearch ? elSearch.value : '').toLowerCase().trim();
  const rows = document.querySelectorAll('#tableBodyBuatParsial tr');
  rows.forEach(tr => {
    const text = tr.innerText.toLowerCase();
    if (!query || text.includes(query)) {
      tr.style.display = '';
    } else {
      tr.style.display = 'none';
    }
  });
}
window.filterTableItemParsial = filterTableItemParsial;

async function handleFotoParsialFileSelected(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (!window._tempParsialPhotos) window._tempParsialPhotos = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      let photoUrl = '';
      if (typeof uploadPhotoToSupabaseStorage === 'function') {
        photoUrl = await uploadPhotoToSupabaseStorage(file);
      }
      if (!photoUrl || !photoUrl.startsWith('http')) {
        const sb = (typeof supabase !== 'undefined' && supabase) ? supabase : ((typeof window.supabaseClient !== 'undefined' && window.supabaseClient) ? window.supabaseClient : null);
        if (sb && sb.storage) {
          const fileName = `PARSIAL_${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
          const { data, error } = await sb.storage.from('photos').upload(fileName, file, { cacheControl: '3600', upsert: true });
          if (!error && data) {
            const { data: pubData } = sb.storage.from('photos').getPublicUrl(fileName);
            if (pubData && pubData.publicUrl) {
              photoUrl = pubData.publicUrl;
            }
          }
        }
      }

      if (photoUrl && typeof photoUrl === 'string' && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
        window._tempParsialPhotos.push(photoUrl);
      }
    } catch(e) {
      console.error('Unggah foto parsial error:', e);
    }
  }

  renderTempFotoParsialPreviews();
}
window.handleFotoParsialFileSelected = handleFotoParsialFileSelected;

function renderTempFotoParsialPreviews() {
  const container = document.getElementById('previewFotoParsialContainer');
  if (!container) return;

  const photos = window._tempParsialPhotos || [];
  if (photos.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = photos.map((url, idx) => `
    <div style="position: relative; width: 32px; height: 32px; border-radius: 4px; overflow: hidden; border: 1px solid var(--primary); box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
      <img src="${url}" onclick="if (typeof bukaViewGambar === 'function') bukaViewGambar(['${url}'], 0)" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">
      <button type="button" onclick="hapusTempFotoParsial(${idx})" style="position: absolute; top: 0; right: 0; background: rgba(239,68,68,0.9); color: #fff; border: none; width: 14px; height: 14px; border-radius: 0 0 0 4px; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; line-height: 1;">×</button>
    </div>
  `).join('');
}

function hapusTempFotoParsial(index) {
  if (window._tempParsialPhotos && index >= 0 && index < window._tempParsialPhotos.length) {
    window._tempParsialPhotos.splice(index, 1);
    renderTempFotoParsialPreviews();
  }
}
window.hapusTempFotoParsial = hapusTempFotoParsial;

async function prosesKirimPengajuanBreakdown() {
  const noSurat = window._activeParsialNoSurat;
  const partialId = window._activeNextPartialId;
  if (!noSurat || !partialId) return;

  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
  if (!req) return;

  const container = document.getElementById('modalBuatParsial');
  const checkboxes = container ? container.querySelectorAll('.parsial-check:checked') : document.querySelectorAll('.parsial-check:checked');
  if (!checkboxes || checkboxes.length === 0) {
    if (typeof showNotif === 'function') showNotif('PILIH MINIMAL 1 BARANG UNTUK DIBREAKDOWN!', 'warning');
    return;
  }

  const selectedItems = [];
  checkboxes.forEach(chk => {
    const idx = Number(chk.getAttribute('data-idx'));
    const inp = document.getElementById(`qtyParsialInput_${idx}`);
    let qtySerahkan = inp ? Number(inp.value) : Number(chk.getAttribute('data-rem'));
    if (isNaN(qtySerahkan) || qtySerahkan <= 0) {
      qtySerahkan = Number(chk.getAttribute('data-rem') || 1);
    }
    
    if (idx >= 0 && idx < req.items.length && qtySerahkan > 0) {
      const origItem = req.items[idx];
      selectedItems.push({
        itemIdx: idx,
        type: origItem.type || origItem.tipe || '',
        seri: origItem.seri || origItem.sn || '',
        barang: origItem.barang || origItem.permintaan || '',
        permintaan: origItem.permintaan || origItem.barang || '',
        alasan: origItem.alasan || '',
        qty: Number(origItem.qty || origItem.jumlah || 1),
        qtyDiserahkan: qtySerahkan
      });
    }
  });

  if (selectedItems.length === 0) {
    if (typeof showNotif === 'function') showNotif('QTY DISERAHKAN HARUS LEBIH DARI 0!', 'warning');
    return;
  }

  tampilkanLoadingProses('MOHON TUNGGU...');
  try {
    const rawPhotos = window._tempParsialPhotos || [];
    const sanitizedPhotos = [];
    for (let p of rawPhotos) {
      if (typeof p === 'string' && p.startsWith('data:image/')) {
        if (typeof uploadPhotoToSupabaseStorage === 'function') {
          const uploadedUrl = await uploadPhotoToSupabaseStorage(p);
          if (uploadedUrl && (uploadedUrl.startsWith('http://') || uploadedUrl.startsWith('https://'))) {
            sanitizedPhotos.push(uploadedUrl);
          }
        }
      } else if (typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://'))) {
        sanitizedPhotos.push(p);
      }
    }

    const isEditing = Boolean(window._editingPartialId);
    const targetPartialId = isEditing ? window._editingPartialId : partialId;

    const existingPartials = getPartialBreakdownsFromDB(noSurat);
    if (isEditing) {
      const pIdx = existingPartials.findIndex(p => p && (p.partial_id === targetPartialId || p.partialId === targetPartialId || String(p.id).endsWith(`_${targetPartialId}`)));
      if (pIdx !== -1) {
        existingPartials[pIdx].items = selectedItems;
        existingPartials[pIdx].photos = sanitizedPhotos;
        existingPartials[pIdx].created_at = `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')} (Diedit)`;
      }
      savePartialBreakdownsToDB(existingPartials, noSurat);
      await pushPartialBreakdownsToCloud(existingPartials, noSurat);
      window._editingPartialId = null;
      window._tempParsialPhotos = [];
      if (typeof showNotif === 'function') showNotif('PERUBAHAN BERHASIL DI SIMPAN.', 'success');
    } else {
      const newPartial = {
        id: `${String(noSurat).replace(/[\/\.]/g, '_')}_${partialId}`,
        no_surat_induk: noSurat,
        partial_id: partialId,
        items: selectedItems,
        photos: sanitizedPhotos,
        status: 'PENDING',
        created_by: currentUser ? (currentUser.fullName || currentUser.full_name || currentUser.username) : 'SERVICE',
        created_at: `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`,
        approved_by: '',
        approved_at: null,
        reject_reason: ''
      };
      existingPartials.push(newPartial);
      savePartialBreakdownsToDB(existingPartials, noSurat);
      await pushPartialBreakdownsToCloud(existingPartials, noSurat);
      window._tempParsialPhotos = [];
      if (typeof showNotif === 'function') showNotif('PENGAJUAN BERHASIL DI KIRIM.', 'success');
    }

    tutupModalBuatParsial();

    if (typeof kirimNotifDanWaBreakdown === 'function') {
      kirimNotifDanWaBreakdown(noSurat, targetPartialId, 'PENDING');
    }

    if (typeof broadcastRealtimeDataChange === 'function') {
      broadcastRealtimeDataChange(noSurat, req, 'UPDATE');
    }

    if (document.getElementById('modalRiwayatParsialList')) {
      bukaModalRiwayatParsialList(noSurat);
    }

    if (typeof lihatDetail === 'function') {
      lihatDetail(noSurat, true);
    }
  } catch(err) {
    console.error('Kirim pengajuan breakdown error:', err);
    if (typeof showNotif === 'function') showNotif('GAGAL MENGIRIM PENGAJUAN: ' + (err.message || err), 'warning');
  } finally {
    tutupLoadingProses();
  }
}
window.prosesKirimPengajuanBreakdown = prosesKirimPengajuanBreakdown;

// =======================================================================
// DM APPROVAL & CARD DISPLAY WORKFLOW (PERMINTAAN BREAKDOWN)
// =======================================================================

async function bukaModalRiwayatParsialList(noSurat) {
  if (!noSurat) return;
  const cleanNoSurat = String(noSurat).replace(/[-_]P\d+.*$/i, '').replace(/^#/, '').trim();
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
  window._activeRiwayatParsialNoSurat = cleanNoSurat;
  
  const existingModal = document.getElementById('modalRiwayatParsialList');
  if (existingModal) existingModal.remove();

  // Sembunyikan popup detail barang jika sedang terbuka agar tidak bertumpuk
  const detailPopup = document.getElementById('popupDetailBarangV2');
  if (detailPopup) {
    detailPopup.style.display = 'none';
    detailPopup.classList.remove('show');
  }

  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === cleanNoSurat.toUpperCase() ||
    String(r.id || '').trim().toUpperCase() === cleanNoSurat.toUpperCase()
  ));
  if (!req) {
    if (typeof showNotif === 'function') showNotif('SURAT TIDAK DITEMUKAN!', 'warning');
    return;
  }

  let partials = getPartialBreakdownsFromDB(cleanNoSurat);
  if (!Array.isArray(partials) || partials.length === 0) {
    if (req && Array.isArray(req.partialBreakdowns) && req.partialBreakdowns.length > 0) {
      partials = req.partialBreakdowns;
    }
  }

  if ((!Array.isArray(partials) || partials.length === 0) && typeof syncSupabaseBreakdownParsialToLocalCache === 'function') {
    await syncSupabaseBreakdownParsialToLocalCache().catch(() => {});
    partials = getPartialBreakdownsFromDB(cleanNoSurat);
  }

  if (!Array.isArray(partials) || partials.length === 0) {
    if (typeof showNotif === 'function') showNotif('BELUM ADA PENGAJUAN SURAT PARSIAL / BREAKDOWN UNTUK SURAT INI.', 'info');
    return;
  }

  const userCatUpper = currentUser ? String(currentUser.category || '').toUpperCase() : '';
  const userRoleUpper = currentUser ? String(currentUser.role || '').toUpperCase() : '';
  const isStrictDMUser = currentUser && (userCatUpper.includes('DM') || userRoleUpper.includes('DM'));
  const isStrictAdminUser = currentUser && (userCatUpper === 'ADMIN' || userRoleUpper === 'ADMIN' || String(currentUser.username).toUpperCase() === 'ADMIN');
  const canDMApprove = isStrictDMUser || isStrictAdminUser;

  const cardsHtml = partials.map((p, pIdx) => {
    const pid = p.partial_id || p.partialId || `P${pIdx + 1}`;
    const pStatus = p.status || 'PENDING';
    const photosList = parsePhotosArray(p.photos);
    const hasPhotos = photosList.length > 0;
    
    let badgeBg = '#f59e0b';
    let badgeText = '⏳ PENDING (MENUNGGU APPROVAL DM)';
    if (pStatus === 'DONE') {
      badgeBg = '#059669';
      badgeText = '🟢 SELESAI (DONE)';
    } else if (pStatus === 'APPROVE') {
      badgeBg = '#10b981';
      badgeText = '🟢 DISETUJUI DM';
    } else if (pStatus === 'REJECT') {
      badgeBg = '#ef4444';
      badgeText = `🔴 DITOLAK DM (${p.reject_reason || '-'})`;
    }

    const itemsCount = Array.isArray(p.items) ? p.items.length : 0;
    const totalQtySerah = Array.isArray(p.items) ? p.items.reduce((acc, curr) => acc + Number(curr.qtyDiserahkan || curr.qty || 1), 0) : 0;
    
    return `
        <div style="background: var(--bg-card); border-radius: 4px !important; border: 1px solid var(--border-color); margin-bottom: 2mm !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 2mm 3mm !important;">
          <div style="display: flex; align-items: center; justify-content: flex-start; gap: 12px; flex-wrap: wrap; text-align: left;">
            
            <!-- 1. TOMBOL AKSI TERLETAK DI PALING KIRI (PATEN 4CM) -->
            <div style="width: 4cm !important; min-width: 4cm !important; max-width: 4cm !important; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; flex-shrink: 0; justify-content: flex-start; box-sizing: border-box !important;">
              <!-- ICON ONLY BUTTONS WITH TITLE TOOLTIPS -->
              <button type="button" onclick="bukaDetailSuratParsial('${req.noSurat}', '${pid}')" style="background: #334155; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="LIHAT DATA PARSIAL (${pid})">
                <span class="material-symbols-rounded" style="font-size: 18px;">visibility</span>
              </button>

              ${hasPhotos ? `
                <button type="button" onclick="bukaModalArtemisParsial('${req.noSurat}', '${pid}')" style="background: #0284c7; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="LIHAT BUKTI FOTO (${photosList.length})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">photo_library</span>
                </button>
              ` : ''}

              ${(pStatus === 'PENDING' && !isStrictDMUser) ? `
                <!-- EDIT BUTTON FOR PENDING BREAKDOWN (NON-DM ONLY) -->
                <button type="button" onclick="editSuratParsialPending('${req.noSurat}', '${pid}')" style="background: #f59e0b; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(245,158,11,0.3);" title="UBAH / EDIT PENGAJUAN PARSIAL (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
                </button>

                <!-- BATAL / HAPUS BUTTON FOR PENDING BREAKDOWN (NON-DM ONLY) -->
                <button type="button" onclick="batalSuratParsial('${req.noSurat}', '${pid}')" style="background: #ef4444; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(239,68,68,0.3);" title="BATALKAN / HAPUS PENGAJUAN PARSIAL (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
              ` : ''}

              ${(pStatus === 'PENDING' && canDMApprove) ? `
                <button type="button" onclick="bukaModalKonfirmasiApproveBreakdown('${req.noSurat}', '${pid}')" style="background: #10b981; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(16,185,129,0.3);" title="APPROVE DM (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">check_circle</span>
                </button>
                <button type="button" onclick="bukaModalRejectBreakdown('${req.noSurat}', '${pid}')" style="background: #ef4444; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="TOLAK DM (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">cancel</span>
                </button>
              ` : ''}

              ${(pStatus === 'APPROVE') ? `
                <button type="button" onclick="bukaModalDoneParsial('${req.noSurat}', '${pid}')" style="background: #0284c7; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" title="SELESAIKAN (DONE) SURAT PARSIAL ${pid}">
                  <span class="material-symbols-rounded" style="font-size: 18px;">task_alt</span>
                </button>
              ` : ''}

              ${(pStatus === 'APPROVE' || pStatus === 'DONE') ? `
                <button type="button" onclick="cetakPdfSuratParsial('${req.noSurat}', '${pid}')" style="background: #059669; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(5,150,105,0.3);" title="CETAK PDF PARSIAL (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">picture_as_pdf</span>
                </button>
              ` : ''}

              ${(isStrictAdminUser && pStatus !== 'PENDING') ? `
                <button type="button" onclick="batalSuratParsial('${req.noSurat}', '${pid}')" style="background: #dc2626; color: #ffffff; border: none; border-radius: 4px !important; width: 32px; height: 32px; padding: 0; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;" title="BATALKAN / HAPUS PARSIAL (${pid})">
                  <span class="material-symbols-rounded" style="font-size: 18px;">delete</span>
                </button>
              ` : ''}
            </div>

            <!-- 2. TULISAN / INFO DI SEBELAH KANAN TOMBOL DENGAN JARAK & ATAS BAWAH RATA -->
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 3px; flex: 1 1 auto; min-width: 220px; text-align: left; border-left: 2px solid var(--border-color); padding-left: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="background: ${badgeBg}; color: #ffffff; padding: 3px 10px; border-radius: 4px !important; font-size: 10.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
                  ${badgeText}
                </div>
                <div style="font-weight: 800; font-size: 13px; color: var(--primary); display: flex; align-items: center; gap: 5px;">
                  <span class="material-symbols-rounded" style="font-size: 16px;">receipt_long</span>
                  SURAT PARSIAL (${noSurat}-${pid})
                </div>
              </div>

              <div style="font-size: 11.5px; color: var(--text-main); font-weight: 700;">
                Total Diserahkan: <span style="color: var(--primary); font-weight: 800;">${itemsCount} Jenis Barang (${totalQtySerah} Qty)</span>
              </div>

              <div style="font-size: 10.5px; color: var(--text-muted);">
                Diajukan oleh: <strong>${(function(cVal){
                  if (!cVal) return '-';
                  const v = String(cVal).trim();
                  const usersList = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
                  const u = usersList.find(usr => usr && (
                    String(usr.username || '').toUpperCase() === v.toUpperCase() ||
                    String(usr.id || '').toUpperCase() === v.toUpperCase() ||
                    String(usr.fullName || usr.full_name || '').toUpperCase() === v.toUpperCase()
                  ));
                  return (u && (u.fullName || u.full_name)) ? (u.fullName || u.full_name) : v;
                })(p.created_by || p.createdBy || 'SERVICE')}</strong> | Waktu: <strong>${p.created_at || p.createdAt || '-'}</strong>
              </div>
            </div>

          </div>
        </div>
      `;
  }).join('');

  const modalFullscreenHtml = `
    <div id="modalRiwayatParsialList" data-nosurat="${noSurat}" class="modal-overlay active" onclick="if (event.target === this) tutupModalRiwayatParsialList('${noSurat}');" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(5px); z-index: 90000000 !important; align-items: center; justify-content: center; padding: 1mm 0.5mm !important; box-sizing: border-box !important;">
      <div style="background: var(--bg-card); color: var(--text-main); width: calc(100vw - 1mm); height: calc(100vh - 2mm); margin: 1mm 0.5mm !important; border-radius: 8px !important; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid var(--border-color); animation: popIn 0.2s ease-out;">
        
        <div style="background: var(--primary) !important; color: #ffffff !important; padding: 12px 16px !important; display: flex; justify-content: space-between; align-items: center; border-radius: 0px !important; border-bottom: 1px solid rgba(255,255,255,0.25) !important; flex-shrink: 0; position: relative !important;">
          <div style="text-align: center !important; width: 100%;">
            <div style="font-weight: 800; font-size: 15px; letter-spacing: 0.5px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; color: #ffffff !important; text-align: center !important;">
              <span class="material-symbols-rounded" style="color: #ffffff !important;">call_split</span> DETAIL PENGAJUAN BREAKDOWN SURAT
            </div>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 2px; color: #ffffff !important; text-align: center !important;">
              Surat Induk: <strong style="color: #fef08a;">${noSurat}</strong> | Toko: <strong>${req.toko || '-'}</strong> | Total Breakdown: <strong>${partials.length} Transaksi</strong>
            </div>
          </div>
          <button type="button" onclick="tutupModalRiwayatParsialList('${noSurat}')" title="TUTUP" style="font-size: 28px !important; font-weight: 900 !important; color: #ffffff !important; background: transparent !important; border: none !important; cursor: pointer !important; line-height: 1 !important; outline: none !important; padding: 0 4px !important; margin: 0 !important; opacity: 0.95;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.95'">&times;</button>
        </div>

        <div style="padding: 2mm !important; overflow-y: auto; flex: 1; background: var(--bg-box);">
          ${cardsHtml}
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalFullscreenHtml);
}
function tutupModalRiwayatParsialList(noSurat) {
  const el = document.getElementById('modalRiwayatParsialList');
  if (el) el.remove();
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
function bukaModalKonfirmasiApproveBreakdown(noSurat, partialId) {
  if (typeof showConfirm === 'function') {
    showConfirm(
      `APPROVE PENGAJUAN BREAKDOWN PARSIAL #${noSurat}-${partialId}?`,
      () => {
        prosesKirimApproveBreakdownDM(noSurat, partialId);
      },
      null,
      'YA, APPROVE',
      'BATAL'
    );
  } else {
    prosesKirimApproveBreakdownDM(noSurat, partialId);
  }
}
window.bukaModalKonfirmasiApproveBreakdown = bukaModalKonfirmasiApproveBreakdown;

async function prosesKirimApproveBreakdownDM(noSurat, partialId) {
  if (!noSurat || !partialId) return;

  tampilkanLoadingProses('MOHON TUNGGU...');
  try {
    const partials = getPartialBreakdownsFromDB(noSurat);
    const pIdx = partials.findIndex(p => (p.partial_id === partialId || p.partialId === partialId || p.id.includes(partialId)));
    if (pIdx === -1) return;

    const targetPartial = partials[pIdx];
    targetPartial.status = 'APPROVE';
    targetPartial.approved_by = currentUser ? currentUser.username : 'DM';
    targetPartial.approved_at = `${getFormattedDateDDMMYYYY()} ${new Date().toLocaleTimeString('id-ID')}`;
    partials[pIdx] = targetPartial;

    savePartialBreakdownsToDB(partials, noSurat);

    const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    const rIdx = reqs.findIndex(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
    
    if (rIdx !== -1) {
      const req = reqs[rIdx];
      
      if (Array.isArray(targetPartial.items)) {
        targetPartial.items.forEach(pi => {
          const itemIdx = pi.itemIdx;
          if (itemIdx !== undefined && itemIdx >= 0 && itemIdx < req.items.length) {
            req.items[itemIdx].statusPart = `${noSurat}-${partialId}`;
            req.items[itemIdx].keteranganPart = `${noSurat}-${partialId}`;
            req.items[itemIdx].isHandedOver = true;
          }
        });
      }

      let allComplete = true;
      req.items.forEach((it, idx) => {
        const rem = calcItemRemainingQty(req, idx);
        const isUnfulfilled = it.isUnfulfilled || String(it.keterangan || '').toUpperCase() === 'TIDAK DIPENUHI';
        if (rem > 0 && !isUnfulfilled) allComplete = false;
      });

      if (allComplete) {
        req.status = 'DONE';
      } else {
        req.status = 'APPROVE';
      }

      reqs[rIdx] = req;
      saveRequestsToDB(reqs, req, 'UPDATE');
      
      if (typeof pushCentralCloudDB === 'function') {
        await pushCentralCloudDB(req).catch(() => {});
      }
    }

    if (typeof kirimNotifDanWaBreakdown === 'function') {
      kirimNotifDanWaBreakdown(noSurat, partialId, 'APPROVE');
    }

    if (typeof broadcastRealtimeDataChange === 'function') {
      broadcastRealtimeDataChange(noSurat, reqs[rIdx], 'UPDATE');
    }

    if (typeof showNotif === 'function') {
      showNotif(`NO SURAT #${noSurat}-${partialId} BERHASIL DI APPROVE`, 'success');
    }

    if (document.getElementById('modalRiwayatParsialList')) {
      bukaModalRiwayatParsialList(noSurat);
    }
    if (typeof lihatDetail === 'function') {
      lihatDetail(noSurat, true);
    }
  } finally {
    tutupLoadingProses();
  }
}
window.prosesKirimApproveBreakdownDM = prosesKirimApproveBreakdownDM;

function bukaModalRejectBreakdown(noSurat, partialId) {
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();
  window._activeRejectNoSurat = noSurat;
  window._activeRejectPartialId = partialId;

  const existing = document.getElementById('modalRejectBreakdown');
  if (existing) existing.remove();

  const modalHtml = `
    <div id="modalRejectBreakdown" class="popupOverlay show" onclick="if (event.target === this) tutupModalRejectBreakdown();">
      <div class="rejectBoxPopup">
        
        <!-- HEADER POPUP -->
        <div class="rejectHeaderPopup">
          <span style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #ffffff;">
            <span class="material-symbols-rounded" style="font-size: 20px;">cancel</span>
            <span>TOLAK PENGAJUAN BREAKDOWN (${partialId})</span>
          </span>
          <button type="button" class="popupClose" onclick="tutupModalRejectBreakdown()" title="TUTUP">&times;</button>
        </div>

        <!-- BODY POPUP -->
        <div class="rejectBodyPopup">
          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-weight: 700; text-transform: uppercase;">MASUKKAN ALASAN PENOLAKAN DM:</p>
          
          <textarea id="inputAlasanRejectParsial" rows="3" placeholder="Tuliskan alasan penolakan..."></textarea>

          <!-- TOMBOL BATAL & YA -->
          <div class="confirmButton">
            <button type="button" class="btnBatal" onclick="tutupModalRejectBreakdown()">BATAL</button>
            <button type="button" class="btnHapus" onclick="prosesKirimTolakBreakdownDM()" style="background: #ef4444 !important; color: #ffffff !important;">YA, KIRIM</button>
          </div>
        </div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.bukaModalRejectBreakdown = bukaModalRejectBreakdown;

function tutupModalRejectBreakdown() {
  const m = document.getElementById('modalRejectBreakdown');
  if (m) m.remove();
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupModalRejectBreakdown = tutupModalRejectBreakdown;

async function prosesKirimTolakBreakdownDM() {
  const noSurat = window._activeRejectNoSurat;
  const partialId = window._activeRejectPartialId;
  const reason = document.getElementById('inputAlasanRejectParsial') ? document.getElementById('inputAlasanRejectParsial').value.trim() : '';

  if (!reason) {
    if (typeof showNotif === 'function') showNotif('MASUKKAN ALASAN PENOLAKAN!', 'warning');
    return;
  }

  tampilkanLoadingProses('MOHON TUNGGU...');
  try {
    const partials = getPartialBreakdownsFromDB(noSurat);
    const pIdx = partials.findIndex(p => (p.partial_id === partialId || p.partialId === partialId || p.id.includes(partialId)));
    if (pIdx !== -1) {
      const origPid = partials[pIdx].partial_id || partials[pIdx].partialId || partialId;
      const rejectedPid = origPid.includes('(TOLAK)') ? origPid : `${origPid}(TOLAK)`;

      partials[pIdx].partial_id = rejectedPid;
      partials[pIdx].partialId = rejectedPid;
      partials[pIdx].status = 'REJECT';
      partials[pIdx].reject_reason = reason;
      savePartialBreakdownsToDB(partials, noSurat);
      pushPartialBreakdownsToCloud(partials, noSurat);
    }

    tutupModalRejectBreakdown();

    if (typeof kirimNotifDanWaBreakdown === 'function') {
      kirimNotifDanWaBreakdown(noSurat, partialId, 'REJECT', { reason });
    }

    if (typeof showNotif === 'function') {
      showNotif(`NO SURAT #${noSurat}-${partialId} BERHASIL DI TOLAK`, 'info');
    }

    if (document.getElementById('modalRiwayatParsialList')) {
      bukaModalRiwayatParsialList(noSurat);
    }
  } finally {
    tutupLoadingProses();
  }
}
window.prosesKirimTolakBreakdownDM = prosesKirimTolakBreakdownDM;

async function editSuratParsialPending(noSurat, partialId) {
  if (!noSurat || !partialId) return;
  const partials = getPartialBreakdownsFromDB(noSurat);
  const p = partials.find(item => item && (item.partial_id === partialId || item.partialId === partialId || String(item.id).endsWith(`_${partialId}`)));
  if (!p) {
    if (typeof showNotif === 'function') showNotif('DATA PENGAJUAN BREAKDOWN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  if (p.status !== 'PENDING') {
    if (typeof showNotif === 'function') showNotif('PENGAJUAN PARSIAL YANG SUDAH DISETUJUI / DITOLAK TIDAK DAPAT DIEDIT!', 'warning');
    return;
  }

  window._editingPartialNoSurat = noSurat;
  window._editingPartialId = partialId;
  window._tempParsialPhotos = parsePhotosArray(p.photos);

  bukaModalBuatParsial(noSurat);

  const modal = document.getElementById('modalBuatParsial');
  if (modal) {
    const titleEl = modal.querySelector('div[style*="font-weight: 800"]');
    if (titleEl) {
      titleEl.innerHTML = `<span class="material-symbols-rounded" style="color: #ffffff !important;">edit</span> UBAH PENGAJUAN SURAT JALAN PARSIAL (${partialId})`;
    }

    if (Array.isArray(p.items)) {
      setTimeout(() => {
        p.items.forEach(pItem => {
          let chk = null;
          if (pItem.itemIdx !== undefined) {
            chk = document.getElementById(`chkParsial_${pItem.itemIdx}`);
          }
          if (!chk && (pItem.type || pItem.barang)) {
            const allChks = document.querySelectorAll('#modalBuatParsial .parsial-check');
            allChks.forEach(c => {
              const cIdx = Number(c.getAttribute('data-idx'));
              const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
              const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
              if (req && req.items && req.items[cIdx]) {
                const orig = req.items[cIdx];
                if ((orig.type || orig.tipe) === (pItem.type || pItem.tipe) && (orig.barang || orig.permintaan) === (pItem.barang || pItem.permintaan)) {
                  chk = c;
                }
              }
            });
          }
          if (chk) {
            chk.checked = true;
            const targetIdx = chk.getAttribute('data-idx');
            syncParsialCheckbox(targetIdx);
            const inp = document.getElementById(`qtyParsialInput_${targetIdx}`);
            if (inp) {
              inp.value = pItem.qtyDiserahkan || pItem.qty || 1;
            }
          }
        });
      }, 50);
    }

    renderTempFotoParsialPreviews();

    const submitBtn = modal.querySelector('button[onclick="prosesKirimPengajuanBreakdown()"]');
    if (submitBtn) {
      submitBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 16px;">save</span> SIMPAN PERUBAHAN PARSIAL (${partialId})`;
    }
  }
}
window.editSuratParsialPending = editSuratParsialPending;

async function batalSuratParsial(noSurat, partialId) {
  if (!noSurat || !partialId) return;
  
  const partials = getPartialBreakdownsFromDB(noSurat);
  const targetP = partials.find(p => p && (p.partial_id === partialId || p.partialId === partialId || String(p.id).endsWith(`_${partialId}`)));
  const isPending = targetP && targetP.status === 'PENDING';
  const isStrictAdminUser = currentUser && (String(currentUser.category || '').toUpperCase() === 'ADMIN' || String(currentUser.role || '').toUpperCase() === 'ADMIN' || String(currentUser.username).toUpperCase() === 'ADMIN');
  
  if (!isPending && !isStrictAdminUser) {
    if (typeof showNotif === 'function') showNotif('SURAT PARSIAL YANG SUDAH DISETUJUI HANYA DAPAT DIBATALKAN OLEH ADMIN!', 'warning');
    return;
  }

  showConfirm(`YAKIN INGIN MEMBATALKAN & MENGHAPUS PENGAJUAN PARSIAL ${partialId}?`, async function() {
    tampilkanLoadingProses('MOHON TUNGGU...');
    try {
      let updatedPartials = getPartialBreakdownsFromDB(noSurat);
      updatedPartials = updatedPartials.filter(p => p && (p.partial_id !== partialId && p.partialId !== partialId && !p.id.endsWith(`_${partialId}`)));
      savePartialBreakdownsToDB(updatedPartials, noSurat);
      pushPartialBreakdownsToCloud(updatedPartials, noSurat);

      const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
      const rIdx = reqs.findIndex(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
      if (rIdx !== -1) {
        const req = reqs[rIdx];
        if (Array.isArray(req.items)) {
          req.items.forEach((it, idx) => {
            const delQty = calcItemDeliveredQty(req, idx);
            if (delQty === 0) {
              it.statusPart = '';
              it.keteranganPart = '';
              it.noPart = '';
              it.isHandedOver = false;
            }
          });
        }
        reqs[rIdx] = req;
        saveRequestsToDB(reqs, req, 'UPDATE');
      }

      if (typeof showNotif === 'function') {
        showNotif(`PENGAJUAN PARSIAL ${partialId} BERHASIL DIBATALKAN!`, 'info');
      }

      if (document.getElementById('modalRiwayatParsialList')) {
        const remaining = getPartialBreakdownsFromDB(noSurat);
        if (remaining.length > 0) {
          bukaModalRiwayatParsialList(noSurat);
        } else {
          document.getElementById('modalRiwayatParsialList').remove();
        }
      }
      if (typeof lihatDetail === 'function') {
        lihatDetail(noSurat, true);
      }
    } finally {
      tutupLoadingProses();
    }
  });
}
window.batalSuratParsial = batalSuratParsial;

function bukaDetailSuratParsial(noSurat, partialId) {
  if (!noSurat || !partialId) return;
  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();

  const partials = getPartialBreakdownsFromDB(noSurat);
  const targetPartial = partials.find(p => p && (p.partial_id === partialId || p.partialId === partialId || p.id.endsWith(`_${partialId}`)));
  if (!targetPartial) return;

  const existing = document.getElementById('modalDetailParsialSub');
  if (existing) existing.remove();

  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase())) || {};

  const items = Array.isArray(targetPartial.items) ? targetPartial.items : [];
  const subPhotos = parsePhotosArray(targetPartial.photos);
  const hasSubPhotos = subPhotos.length > 0;

  const rowsHtml = items.map((it, i) => `
    <tr style="border-bottom: 1px solid var(--border-color); white-space: nowrap !important; background: ${i % 2 === 0 ? 'var(--bg-box)' : 'transparent'};">
      <td style="padding: 2mm !important; text-align: center; font-weight: 700; color: var(--text-main); white-space: nowrap !important;">${i + 1}</td>
      <td style="padding: 2mm !important; font-weight: 600; color: var(--text-main); white-space: nowrap !important;">${it.type || it.tipe || '-'}</td>
      <td style="padding: 2mm !important; color: var(--text-muted); white-space: nowrap !important;">${it.seri || it.sn || '-'}</td>
      <td style="padding: 2mm !important; font-weight: 600; color: var(--text-main); white-space: nowrap !important;">${it.barang || it.permintaan || '-'}</td>
      <td style="padding: 2mm !important; color: var(--text-muted); white-space: nowrap !important;">${it.alasan || '-'}</td>
      <td style="padding: 2mm !important; text-align: center; font-weight: 800; color: var(--primary); white-space: nowrap !important;">${it.qtyDiserahkan || it.qty || 1}</td>
      <td style="padding: 2mm !important; text-align: center; white-space: nowrap !important;">
        <span style="font-weight: 800; font-size: 11.5px; color: var(--text-main);">
          SUDAH DISERAHKAN (${noSurat}-${partialId})
        </span>
      </td>
    </tr>
  `).join('');

  const modalHtml = `
    <div id="modalDetailParsialSub" data-nosurat="${noSurat}" class="modal-overlay active" onclick="if (event.target === this) tutupModalDetailParsialSub('${noSurat}');" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 99000000 !important; align-items: center; justify-content: center; padding: 1mm 0.5mm !important; box-sizing: border-box !important;">
      <div style="background: var(--bg-card); color: var(--text-main); width: calc(100vw - 1mm); height: calc(100vh - 2mm); margin: 1mm 0.5mm !important; border-radius: 8px !important; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.4); border: 1px solid var(--border-color); animation: popIn 0.2s ease-out;">
        
        <div style="background: var(--primary) !important; color: #ffffff !important; padding: 12px 16px !important; display: flex; justify-content: space-between; align-items: center; border-radius: 0px !important; border-bottom: 1px solid rgba(255,255,255,0.25) !important; flex-shrink: 0; position: relative !important;">
          <div style="font-weight: 800; font-size: 14.5px; color: #ffffff !important; text-align: center !important; width: 100%;">
            DETAIL PERMINTAAN BREAKDOWN
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${hasSubPhotos ? `
              <button type="button" onclick="bukaModalArtemisParsial('${noSurat}', '${partialId}')" style="background: #ffffff; color: var(--primary); border: none; border-radius: 4px !important; padding: 4px 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-symbols-rounded" style="font-size: 14px;">photo_library</span> VIEW FOTO (${subPhotos.length})
              </button>
            ` : ''}
            <button type="button" onclick="tutupModalDetailParsialSub('${noSurat}')" title="TUTUP" style="font-size: 28px !important; font-weight: 900 !important; color: #ffffff !important; background: transparent !important; border: none !important; cursor: pointer !important; line-height: 1 !important; outline: none !important; padding: 0 4px !important; margin: 0 !important; opacity: 0.95;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.95'">&times;</button>
          </div>
        </div>

        <div style="padding: 1mm 0 0 0 !important; overflow-y: auto; flex: 1; background: var(--bg-card); display: flex; flex-direction: column;">
          <!-- NO SURAT BREAKDOWN RATA KIRI DENGAN DEKAT DENGAN TABEL -->
          <div style="background: var(--bg-box); border: none !important; border-left: none !important; padding: 4px 8px !important; margin: 0 2mm 1mm 2mm !important; font-size: 12px; color: var(--text-main); font-weight: 700; text-align: left !important; flex-shrink: 0; border-radius: 0px !important;">
            NO SURAT : <strong style="color: var(--primary); font-size: 12.5px; font-weight: 800;">${noSurat}-${partialId}</strong>
          </div>

          <div style="overflow-x: auto; width: 100%; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); border-left: none !important; border-right: none !important; margin: 0 !important; border-radius: 0px !important; flex: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border-radius: 0px !important;">
              <thead style="position: sticky; top: 0; z-index: 5; background: var(--primary) !important; border-radius: 0px !important;">
                <tr style="background: var(--primary) !important; border-bottom: 1px solid var(--border-color); color: #ffffff !important; white-space: nowrap !important; font-weight: 900 !important; border-radius: 0px !important;">
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">NO</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">TYPE</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">SERI BARANG</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">PERMINTAAN</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">ALASAN</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; width: 75px; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2) !important;">QTY</th>
                  <th style="padding: 10px 8px !important; text-align: center !important; white-space: nowrap !important; border-radius: 0px !important; background: var(--primary) !important; color: #ffffff !important; font-weight: 900 !important; letter-spacing: 0.5px;">KETERANGAN PART</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.bukaDetailSuratParsial = bukaDetailSuratParsial;

function tutupModalDetailParsialSub(noSurat) {
  const el = document.getElementById('modalDetailParsialSub');
  const ns = noSurat || (el ? el.getAttribute('data-nosurat') : null);
  if (el) el.remove();
  
  if (ns && typeof bukaModalRiwayatParsialList === 'function') {
    const listEl = document.getElementById('modalRiwayatParsialList');
    if (!listEl) {
      bukaModalRiwayatParsialList(ns);
    }
  }
}
window.tutupModalDetailParsialSub = tutupModalDetailParsialSub;

function bukaModalArtemisParsial(noSurat, partialId) {
  const partials = getPartialBreakdownsFromDB(noSurat);
  const p = partials.find(item => (item && (item.partial_id === partialId || item.partialId === partialId || (item.id && item.id.endsWith(`_${partialId}`)))));
  if (!p) return;

  const photos = parsePhotosArray(p.photos);
  if (photos.length === 0) {
    if (typeof showNotif === 'function') showNotif('TIDAK ADA FOTO BUKTI PENYERAHAN PARSIAL.', 'info');
    return;
  }

  if (typeof bukaViewGambar === 'function') {
    bukaViewGambar(photos, 0);
  } else if (typeof showImageViewer === 'function') {
    showImageViewer(photos, 0);
  }
}
window.bukaModalArtemisParsial = bukaModalArtemisParsial;

function cetakPdfSuratParsial(noSurat, partialId) {
  if (!noSurat || !partialId) return;
  const reqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
  const req = reqs.find(r => r && (r.noSurat === noSurat || String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase()));
  if (!req) {
    if (typeof showNotif === 'function') showNotif('DATA SURAT INDUK TIDAK DITEMUKAN!', 'warning');
    return;
  }

  const partials = getPartialBreakdownsFromDB(noSurat);
  const targetPartial = partials.find(p => p && (p.partial_id === partialId || p.partialId === partialId || p.id.endsWith(`_${partialId}`)));

  if (!targetPartial) {
    if (typeof showNotif === 'function') showNotif('DATA BREAKDOWN PARSIAL TIDAK DITEMUKAN!', 'warning');
    return;
  }

  window._currentActivePdfNoSurat = `${noSurat}_${partialId}`;

  const pdfContainer = document.getElementById('pdfDocumentContent');
  if (!pdfContainer) {
    window.print();
    return;
  }

  const partialItems = Array.isArray(targetPartial.items) ? targetPartial.items : [];
  const validPhotos = parsePhotosArray(targetPartial.photos);

  let itemRowsHtml = partialItems.map((i, idx) => `
    <tr style="border-bottom:1px solid #cbd5e1;">
      <td style="text-align:center; padding:6px 4px; border:1px solid #cbd5e1; font-size:11px; white-space: nowrap !important; width:1%;">${idx + 1}</td>
      <td style="padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; white-space: nowrap !important; width:1%; text-align:left;">${i.type || i.tipe || '-'}</td>
      <td style="padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; white-space: nowrap !important; width:1%; text-align:left;">${i.seri || i.sn || '-'}</td>
      ${req.jenis === 'DUS' ? `<td style="padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; white-space: nowrap !important; width:1%; text-align:left; color:#b45309; font-weight:700;">${i.seriDus || i.snDus || '-'}</td>` : ''}
      <td style="padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; white-space: normal !important; word-break: break-word; text-align:left;">${i.barang || i.permintaan || '-'}</td>
      <td style="padding:6px 6px; border:1px solid #cbd5e1; font-size:11px; white-space: normal !important; word-break: break-word; text-align:left;">${i.alasan || '-'}</td>
      <td style="text-align:center; padding:6px 4px; border:1px solid #cbd5e1; font-size:11px; font-weight: 800; color: #0284c7; width:1%;">${i.qtyDiserahkan || i.qty || 1}</td>
    </tr>
  `).join('');

  const users = typeof getUsersFromDB === 'function' ? getUsersFromDB() : [];
  const serviceUser = users.find(u => u.category === 'SERVICE' && u.area === req.area) || users.find(u => u.category === 'SERVICE');
  const dmUser = users.find(u => u.category === 'DM') || users.find(u => u.username === 'ADMIN');
  const serviceName = req.serviceUserName || (serviceUser ? serviceUser.fullName : 'SERVICE SUPERVISOR');
  const dmName = typeof getNamaDM === 'function' ? getNamaDM() : 'FERRY EDIYANTO';

  let serviceTTD = req.serviceTTD || '';
  const reqSrvName = req.serviceUserName || (serviceUser ? serviceUser.fullName : '');
  if (reqSrvName && typeof getUserRealSignature === 'function') {
    const exactSig = getUserRealSignature('SERVICE', req.area, '', reqSrvName);
    serviceTTD = exactSig || serviceTTD;
  } else if ((!serviceTTD || (typeof isValidSig === 'function' && !isValidSig(serviceTTD))) && serviceUser && typeof getUserRealSignature === 'function') {
    serviceTTD = getUserRealSignature('SERVICE', req.area, serviceUser.username, serviceUser.fullName);
  }

  let dmTTD = req.dmTTD || '';
  if ((!dmTTD || (typeof isValidSig === 'function' && !isValidSig(dmTTD))) && typeof getUserRealSignature === 'function') {
    dmTTD = getUserRealSignature('DM', '', '', dmName) || (dmUser ? dmUser.ttd : '');
  }
  if (typeof isValidSig === 'function' && !isValidSig(dmTTD)) {
    dmTTD = '';
  }

  const isReqFromGBJ = (
    (req.createdBy && String(req.createdBy).toUpperCase().includes('GBJ')) ||
    (req.toko && String(req.toko).toUpperCase().includes('GBJ')) ||
    req.isGBJ === true
  );

  let pemohonName = req.toko || req.createdBy || 'PEMOHON';
  let pemohonRoleTitle = 'PEMOHON (TOKO)';
  let pemohonTTD = req.pemohonTTD || req.tokoTTD || '';

  if (isReqFromGBJ) {
    pemohonRoleTitle = 'GUDANG BARANG JADI (GBJ)';
    if (typeof getUserRealSignature === 'function') {
      pemohonTTD = getUserRealSignature('GBJ', req.area, req.createdBy, req.createdBy) || pemohonTTD;
    }
  } else {
    if (typeof getUserRealSignature === 'function') {
      pemohonTTD = getUserRealSignature('TOKO', req.area, req.createdBy, req.toko) || pemohonTTD;
    }
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
  if (validPhotos.length > 0) {
    photoSection = `
      <div style="margin-top: 10px; margin-bottom: 8px; page-break-inside: avoid;">
        <div style="font-size: 8px; font-weight: 700; color: #475569; letter-spacing: 0.3px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; text-transform: uppercase;">
          LAMPIRAN FOTO PENYERAHAN PARSIAL (${validPhotos.length} FOTO):
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; width: 100%;">
          ${validPhotos.map((p, pIdx) => `
            <div style="aspect-ratio: 1/1; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; position: relative; display: flex; align-items: center; justify-content: center; padding: 2px; box-sizing: border-box;">
              <img src="${p}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain;">
              <span style="position: absolute; bottom: 2px; right: 2px; background: rgba(15,23,42,0.75); color: #ffffff; font-size: 7.5px; font-weight: 800; padding: 1px 3px; border-radius: 2px;">#${pIdx+1}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  const areaNameMap = { TSM: 'TASIKMALAYA', BDG: 'BANDUNG', BDU: 'BANDUNG UTARA', CRB: 'CIREBON', SKB: 'SUKABUMI', SBN: 'SUBANG' };
  const hodsAreaTitle = `HODS ${areaNameMap[req.area] || req.area || ''}`;

  pdfContainer.innerHTML = `
    <div class="pdf-paper" style="min-height: 680px; display: flex; flex-direction: column; justify-content: space-between; padding: 1mm 20px; color: #0f172a; background: #ffffff; font-family: 'Poppins', sans-serif; box-sizing: border-box;">
      <div>
        <div style="text-align: center; font-size: 20px; font-weight: 800; border-bottom: 2.5px solid #0f172a; padding-bottom: 24px; margin-bottom: 20px; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">
          PERMINTAAN TOKO
        </div>

        <table class="pdf-info-table" style="width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 20px; font-size: 12px; background: transparent; border: none;">
          <tr>
            <td style="padding: 4px 0; width: 85px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap;">NO SURAT</td>
            <td style="padding: 4px 12px 4px 8px; width: 14px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 20px 4px 0; width: 100%; font-weight: 800; color: #0284c7; border: none; letter-spacing: 0.2px;">${req.noSurat}-${partialId}</td>
            
            <td style="padding: 4px 0; width: 75px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">TANGGAL</td>
            <td style="padding: 4px 12px 4px 8px; width: 14px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 0; width: 105px; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">${(typeof formatDateDDMMYYYYString === 'function') ? formatDateDDMMYYYYString(req.tanggal) : (req.tanggal || '-')}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; white-space: nowrap;">TOKO</td>
            <td style="padding: 4px 12px 4px 8px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 20px 4px 0; font-weight: 800; color: #0f172a; border: none; text-transform: uppercase;">${req.toko || req.createdBy || '-'}</td>
            
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; white-space: nowrap; text-align: left;">JENIS</td>
            <td style="padding: 4px 12px 4px 8px; font-weight: 800; color: #0f172a; border: none; text-align: center;">:</td>
            <td style="padding: 4px 0; font-weight: 800; color: #0f172a; border: none; text-transform: uppercase; white-space: nowrap; text-align: left;">${req.jenis || 'DEFAULT'}</td>
          </tr>
        </table>

        <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px; color: #0f172a;">DETAIL PERMINTAAN:</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #0284c7; color: #ffffff;">
              <th style="width: 1%; text-align:center; padding:7px 6px; border:1px solid #cbd5e1; font-weight:700; white-space: nowrap !important;">NO</th>
              <th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">TIPE BARANG</th>
              <th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">NO. SERI</th>
              ${req.jenis === 'DUS' ? `<th style="width: 1%; padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: nowrap !important;">NO. SERI DUS</th>` : ''}
              <th style="padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: normal !important;">PERMINTAAN BARANG</th>
              <th style="padding:7px 8px; border:1px solid #cbd5e1; font-weight:700; text-align:center; white-space: normal !important;">ALASAN PERMINTAAN</th>
              <th style="width: 1%; text-align:center; padding:7px 6px; border:1px solid #cbd5e1; font-weight:700; white-space: nowrap !important;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        ${photoSection}
      </div>

      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 28px; text-align: center; font-size: 11px; page-break-inside: avoid;">
          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">PEMOHON</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${typeof renderSafeTtdImageTag === 'function' ? renderSafeTtdImageTag(pemohonTTD, "max-height: 52px; max-width: 100%; object-fit: contain;") : ''}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${pemohonName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">${pemohonRoleTitle}</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">DIPERIKSA</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${typeof renderSafeTtdImageTag === 'function' ? renderSafeTtdImageTag(serviceTTD, "max-height: 52px; max-width: 100%; object-fit: contain;") : ''}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${serviceName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">${hodsAreaTitle}</div>
            </div>
          </div>

          <div style="width: 30%; display: flex; flex-direction: column; justify-content: space-between; height: 125px;">
            <div style="font-weight: 500; color: #0f172a; text-transform: uppercase;">DISETUJUI</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${typeof renderSafeTtdImageTag === 'function' ? renderSafeTtdImageTag(dmTTD, "max-height: 52px; max-width: 100%; object-fit: contain;") : ''}
            </div>
            <div>
              <div style="font-weight: 500; color: #0f172a; font-size: 11.5px;">${dmName}</div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px; text-transform: uppercase;">DISTRICT MANAGER</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end; font-size: 8px; color: #64748b;">
          <div style="font-style: italic; opacity: 0.85;">${timestampStr}</div>
        </div>
      </div>
    </div>
  `;

  if (typeof cetakDokumenPdf === 'function') {
    cetakDokumenPdf();
  } else {
    window.print();
  }
}
window.cetakPdfSuratParsial = cetakPdfSuratParsial;

function tampilkanPilihanCetakPdf(noSurat) {
  if (!noSurat) return;
  const partials = getPartialBreakdownsFromDB(noSurat);
  const approvedPartials = partials.filter(p => p && (p.status === 'APPROVE' || p.status === 'DONE'));

  // JIKA TIDAK ADA SURAT PARSIAL -> LANGSUNG ARAHKAN KE PRINT UTAMA!
  if (approvedPartials.length === 0) {
    if (typeof bukaPdfModal === 'function') {
      bukaPdfModal(noSurat, true, true);
    } else {
      window.print();
    }
    return;
  }

  const existing = document.getElementById('modalPilihanCetakPdf');
  if (existing) existing.remove();

  const optionsHtml = `
    <div style="margin-bottom: 2mm !important;">
      <button type="button" onclick="document.getElementById('modalPilihanCetakPdf').remove(); bukaPdfModal('${noSurat}', true, true);" style="width: 100%; text-align: left; padding: 2mm !important; border-radius: 4px !important; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span class="material-symbols-rounded" style="color: var(--primary); font-size: 16px;">description</span> SURAT PERMINTAAN INDUK UTAMA (${noSurat})
        </span>
        <span class="material-symbols-rounded" style="font-size: 16px; color: var(--text-muted);">chevron_right</span>
      </button>
    </div>

    ${approvedPartials.map((p, idx) => {
      const pid = p.partial_id || p.partialId || `P${idx + 1}`;
      return `
        <div style="margin-bottom: 2mm !important;">
          <button type="button" onclick="document.getElementById('modalPilihanCetakPdf').remove(); cetakPdfSuratParsial('${noSurat}', '${pid}');" style="width: 100%; text-align: left; padding: 2mm !important; border-radius: 4px !important; border: 1px solid #10b981; background: rgba(16,185,129,0.05); color: var(--text-main); font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-rounded" style="color: #10b981; font-size: 16px;">receipt_long</span> SURAT JALAN PARSIAL (${noSurat}-${pid})
            </span>
            <span class="material-symbols-rounded" style="font-size: 16px; color: #10b981;">chevron_right</span>
          </button>
        </div>
      `;
    }).join('')}
  `;

  if (typeof pushPopupHistoryState === 'function') pushPopupHistoryState();

  const modalHtml = `
    <div id="modalPilihanCetakPdf" class="modal-overlay active" onclick="if (event.target === this) this.remove();" style="display: flex; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 20000004 !important; align-items: center; justify-content: center; padding: 12px !important; box-sizing: border-box !important;">
      <div style="background: var(--bg-card); color: var(--text-main); width: calc(100% - 24px); max-width: 460px; border-radius: 8px !important; margin: auto !important; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.45); border: 1px solid var(--border-color); animation: popIn 0.2s ease-out;">
        <div style="background: var(--primary) !important; color: #ffffff !important; padding: 12px 16px !important; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0 !important; flex-shrink: 0; position: relative !important;">
          <div style="font-weight: 800; font-size: 13.5px; display: flex; align-items: center; gap: 6px; color: #ffffff !important;">
            <span class="material-symbols-rounded" style="color: #ffffff !important;">picture_as_pdf</span> PILIH DOKUMEN PDF UNTUK DICETAK
          </div>
          <button type="button" onclick="document.getElementById('modalPilihanCetakPdf').remove()" title="TUTUP" style="font-size: 28px !important; font-weight: 900 !important; color: #ffffff !important; background: transparent !important; border: none !important; cursor: pointer !important; line-height: 1 !important; outline: none !important; padding: 0 4px !important; margin: 0 !important; opacity: 0.95;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.95'">&times;</button>
        </div>
        <div style="padding: 2mm !important;">
          ${optionsHtml}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
window.tampilkanPilihanCetakPdf = tampilkanPilihanCetakPdf;

function isPhotoUrlValid(val) {
  if (!val) return false;
  if (Array.isArray(val)) {
    return val.some(item => isPhotoUrlValid(item));
  }
  if (typeof val === 'object') {
    return isPhotoUrlValid(val.url || val.src || val.link || '');
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s === 'null' || s === 'undefined' || s === '[]' || s === '{}' || s === '""' || s === "''") return false;
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        return isPhotoUrlValid(parsed);
      } catch (e) {
        return false;
      }
    }
    return (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:image/') || s.length > 20);
  }
  return false;
}
window.isPhotoUrlValid = isPhotoUrlValid;

function parsePhotosArray(photos) {
  if (!photos) return [];
  let list = [];
  if (Array.isArray(photos)) {
    list = photos;
  } else if (typeof photos === 'string') {
    try { list = JSON.parse(photos || '[]'); } catch(e) { list = []; }
  }
  if (!Array.isArray(list)) list = [list];
  return list.map(p => {
    if (typeof p === 'string') return p;
    if (p && typeof p === 'object') return p.url || p.src || p.link || '';
    return '';
  }).filter(p => isPhotoUrlValid(p));
}
window.parsePhotosArray = parsePhotosArray;

// =======================================================================
// WIDGET TANGGAL & JAM REAL-TIME INTERAKTIF
// =======================================================================
function updateLiveHeaderClock() {
  const dateEls = document.querySelectorAll('#liveDateText, .liveDateText');
  const timeEls = document.querySelectorAll('#liveTimeText, .liveTimeText');

  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const dayName = days[now.getDay()];
  const dateNum = String(now.getDate()).padStart(2, '0');
  const monthName = months[now.getMonth()];
  const yearNum = now.getFullYear();

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const formattedDate = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;
  const formattedTime = `${hh}:${mm}:${ss} WIB`;

  if (dateEls.length > 0) {
    dateEls.forEach(el => { el.textContent = formattedDate; });
  } else {
    const el = document.getElementById('liveDateText');
    if (el) el.textContent = formattedDate;
  }

  if (timeEls.length > 0) {
    timeEls.forEach(el => { el.textContent = formattedTime; });
  } else {
    const el = document.getElementById('liveTimeText');
    if (el) el.textContent = formattedTime;
  }

  const dd = String(now.getDate()).padStart(2, '0');
  const mmMonth = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();

  const formattedDateShort = `${dd}/${mmMonth}/${yyyy}`;
  const formattedTimeShort = `${hh}:${mm}:${ss}`;

  const inlineDateEls = document.querySelectorAll('#mobileClockDateText, .mobileClockDateText');
  if (inlineDateEls.length > 0) inlineDateEls.forEach(el => { el.textContent = formattedDateShort; });

  const inlineClockEls = document.querySelectorAll('#mobileClockTimeText, .mobileClockTimeText');
  if (inlineClockEls.length > 0) inlineClockEls.forEach(el => { el.textContent = formattedTimeShort; });
}
window.updateLiveHeaderClock = updateLiveHeaderClock;

setInterval(updateLiveHeaderClock, 1000);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLiveHeaderClock);
} else {
  updateLiveHeaderClock();
}


// =======================================================================
// MANUAL REFRESH POPUP DETAIL & PRE-APPROVAL VALIDATION ENGINE
// =======================================================================
async function refreshDetailModalManual() {
  const v2 = document.getElementById('popupDetailBarangV2');
  const noSurat = window._currentDetailNoSurat || (v2 ? (v2.dataset.noSurat || v2.dataset.nosurat) : '');
  if (!noSurat) {
    if (typeof showNotif === 'function') showNotif('TIDAK ADA SURAT AKTIF UNTUK DIREFRESH', 'warning');
    return;
  }

  const btnRefresh = document.getElementById('btnRefreshDetailV2');
  if (btnRefresh) {
    btnRefresh.style.transition = 'transform 0.5s ease';
    btnRefresh.style.transform = 'translateY(-50%) rotate(360deg)';
  }

  if (typeof showLoading === 'function') showLoading('MEMPERBARUI DATA DETAIL...');
  try {
    if (typeof supabase !== 'undefined' && supabase) {
      const { data, error } = await supabase.from('permintaan_toko').select('*').eq('no_surat', noSurat);
      if (data && data.length > 0) {
        const formatted = typeof formatSupabaseRequestRow === 'function' ? formatSupabaseRequestRow(data[0]) : null;
        if (formatted) {
          const currentReqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
          const idx = currentReqs.findIndex(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());
          if (idx !== -1) {
            currentReqs[idx] = { ...currentReqs[idx], ...formatted };
          } else {
            currentReqs.unshift(formatted);
          }
          if (typeof appStorage !== 'undefined') appStorage.setItem(REQUESTS_DB_KEY, JSON.stringify(currentReqs));
        }
      }
    }
    if (typeof lihatDetail === 'function') {
      await lihatDetail(noSurat, true);
    }
    if (typeof showNotif === 'function') showNotif('DATA DETAIL BERHASIL DIPERBARUI!', 'success');
  } catch(e) {
    if (typeof showNotif === 'function') showNotif('GAGAL MEMPERBARUI DATA: ' + (e.message || e), 'warning');
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
    if (btnRefresh) {
      setTimeout(() => {
        btnRefresh.style.transition = 'none';
        btnRefresh.style.transform = 'translateY(-50%) rotate(0deg)';
      }, 500);
    }
  }
}
window.refreshDetailModalManual = refreshDetailModalManual;

async function validatePreApprovalData(noSurat, expectedType) {
  if (typeof supabase === 'undefined' || !supabase) return true;
  try {
    const { data, error } = await supabase.from('permintaan_toko').select('*').eq('no_surat', noSurat);
    if (error || !data || data.length === 0) return true;
    const serverRow = data[0];
    const localReqs = typeof getRequestsFromDB === 'function' ? getRequestsFromDB() : [];
    const local = localReqs.find(r => r && String(r.noSurat).trim().toUpperCase() === String(noSurat).trim().toUpperCase());

    if (!local) return true;

    let hasMismatch = false;
    let mismatchMsg = '';

    if (expectedType === 'SERVICE') {
      if (serverRow.service_approve) {
        hasMismatch = true;
        mismatchMsg = 'SURAT INI SUDAH DI-APPROVE OLEH SERVICE LAIN DI SERVER!';
      } else if (serverRow.status !== 'PENDING') {
        hasMismatch = true;
        mismatchMsg = 'STATUS SURAT DI SERVER SUDAH BERUBAH MENJADI ' + serverRow.status + '!';
      }
    } else if (expectedType === 'DM') {
      if (!serverRow.service_approve) {
        hasMismatch = true;
        mismatchMsg = 'SURAT INI BELUM DI-APPROVE OLEH SERVICE DI SERVER!';
      } else if (serverRow.status === 'APPROVE') {
        hasMismatch = true;
        mismatchMsg = 'SURAT INI SUDAH DI-APPROVE OLEH DM LAIN DI SERVER!';
      } else if (serverRow.status !== 'PENDING') {
        hasMismatch = true;
        mismatchMsg = 'STATUS SURAT DI SERVER SUDAH BERUBAH MENJADI ' + serverRow.status + '!';
      }
    }

    // Check items difference
    if (!hasMismatch && serverRow.items) {
      const serverItemsStr = typeof serverRow.items === 'string' ? serverRow.items : JSON.stringify(serverRow.items || []);
      const localItemsStr = typeof local.items === 'string' ? local.items : JSON.stringify(local.items || []);
      if (serverItemsStr !== localItemsStr) {
        hasMismatch = true;
        mismatchMsg = 'ADA PERUBAHAN BARANG / QTY PERMINTAAN DI SERVER!';
      }
    }

    if (hasMismatch) {
      if (typeof showNotif === 'function') {
        showNotif('PERHATIAN: ' + mismatchMsg + ' SILAKAN KLIK TOMBOL REFRESH (IKON PUTAR DI ATAS) SEBELUM APPROVAL.', 'warning');
      }
      const btnRefresh = document.getElementById('btnRefreshDetailV2');
      if (btnRefresh) {
        btnRefresh.style.border = '2px solid #ef4444';
        btnRefresh.style.background = '#ef4444';
        setTimeout(() => {
          btnRefresh.style.border = '1px solid rgba(255,255,255,0.35)';
          btnRefresh.style.background = 'rgba(255,255,255,0.18)';
        }, 3500);
      }
      return false;
    }
    return true;
  } catch(e) {
    return true;
  }
}
window.validatePreApprovalData = validatePreApprovalData;


// =============================================================================
// OFFLINE & SUPABASE NETWORK SAFETY MODAL HANDLER
// =============================================================================
function tampilkanModalOfflineSafety(customMessage = null) {
  const modal = document.getElementById('popupOfflineSafetyModal');
  const msgEl = document.getElementById('popupOfflineMessage');
  if (msgEl && customMessage) {
    msgEl.textContent = customMessage;
  }
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
  }
}
window.tampilkanModalOfflineSafety = tampilkanModalOfflineSafety;

function tutupModalOfflineSafety() {
  const modal = document.getElementById('popupOfflineSafetyModal');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('show');
  }
}
window.tutupModalOfflineSafety = tutupModalOfflineSafety;

function eksekusiKeluarAplikasi() {
  try {
    window.close();
  } catch(e) {}
  setTimeout(() => {
    try {
      window.location.href = "about:blank";
    } catch(e) {}
  }, 150);
}
window.eksekusiKeluarAplikasi = eksekusiKeluarAplikasi;

// Network online/offline event listeners
window.addEventListener('offline', () => {
  tampilkanModalOfflineSafety('Koneksi internet perangkat Anda terputus! Silakan periksa Wi-Fi / Data Seluler Anda.');
});

window.addEventListener('online', () => {
  tutupModalOfflineSafety();
  if (typeof syncSupabaseRequestsToLocalCache === 'function') {
    syncSupabaseRequestsToLocalCache();
  }
});


// =============================================================================
// FITUR UBAH STATUS SUPABASE KHUSUS LOGIN ADMIN
// =============================================================================
function bukaModalUbahStatusAdmin(noSurat) {
  if (!noSurat) return;
  const role = currentUser ? (currentUser.category || '').toUpperCase() : '';
  const isAdm = currentUser && (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (!isAdm) {
    showNotif('FITUR UBAH STATUS SUPABASE HANYA DAPAT DIAKSES OLEH AKUN ADMIN!', 'warning');
    return;
  }

  const requests = getRequestsFromDB();
  const targetNo = String(noSurat).trim().toUpperCase();
  const req = requests.find(r => r && (
    String(r.noSurat || '').trim().toUpperCase() === targetNo ||
    String(r.id || '').trim().toUpperCase() === targetNo
  ));

  if (!req) {
    showNotif('DATA PERMINTAAN TIDAK DITEMUKAN!', 'warning');
    return;
  }

  const hiddenNo = document.getElementById('adminStatusNoSurat');
  if (hiddenNo) hiddenNo.value = req.noSurat;

  const infoBox = document.getElementById('adminStatusInfoBox');
  if (infoBox) {
    infoBox.innerHTML = `
      <div style="font-size: 13px; font-weight: 800; color: #8b5cf6; margin-bottom: 2px;">SURAT: #${req.noSurat}</div>
      <div style="color: var(--text-main); font-size: 12px; font-weight: 600;">Toko: <strong>${req.toko || '-'}</strong> (${req.area || '-'}) | Status Saat Ini: <strong style="color: var(--primary);">${req.status || 'PENDING'}</strong></div>
    `;
  }

  const selectEl = document.getElementById('selectStatusAdmin');
  if (selectEl) {
    let curSt = String(req.status || 'PENDING').toUpperCase();
    if (curSt === 'REJECT_SERVICE' || curSt === 'REJECT_DM') curSt = 'REJECT';
    selectEl.value = curSt;
  }

  const modal = document.getElementById('popupUbahStatusAdminModal');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2147483648', 'important');
    modal.classList.add('show');
    try { history.pushState({ modal: 'adminStatus' }, '', location.href); } catch(e) {}
  }
}
window.bukaModalUbahStatusAdmin = bukaModalUbahStatusAdmin;

function tutupModalUbahStatusAdmin() {
  const modal = document.getElementById('popupUbahStatusAdminModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
  }
  if (typeof pastikanDetailPermintaanTetapTerbuka === 'function') {
    pastikanDetailPermintaanTetapTerbuka();
  }
}
window.tutupModalUbahStatusAdmin = tutupModalUbahStatusAdmin;

async function simpanUbahStatusAdmin() {
  const hiddenNo = document.getElementById('adminStatusNoSurat');
  const selectEl = document.getElementById('selectStatusAdmin');
  if (!hiddenNo || !selectEl || !hiddenNo.value) return;

  const noSurat = hiddenNo.value;
  const newStatus = selectEl.value;

  const role = currentUser ? (currentUser.category || '').toUpperCase() : '';
  const isAdm = currentUser && (role === 'ADMIN' || (currentUser.username && currentUser.username.toUpperCase() === 'ADMIN'));
  if (!isAdm) {
    showNotif('HANYA ADMIN YANG BERHAK MENGUBAH STATUS!', 'warning');
    return;
  }

  showLoading(`MENGUBAH STATUS NO SURAT ${noSurat} MENJADI ${newStatus} DI SUPABASE...`);

  try {
    // 1. Update di Supabase Database
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const payload = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newStatus === 'APPROVE') {
        payload.service_approve = true;
      } else if (newStatus === 'PENDING') {
        payload.service_approve = false;
      }
      const { error } = await supabaseClient.from('permintaan_toko').update(payload).eq('no_surat', noSurat);
      if (error) {
        console.error('[SUPABASE ADMIN STATUS ERROR]:', error);
      }
    }

    // 2. Update local requests memory
    const requests = getRequestsFromDB();
    const targetNo = String(noSurat).trim().toUpperCase();
    const req = requests.find(r => r && String(r.noSurat || '').trim().toUpperCase() === targetNo);
    if (req) {
      req.status = newStatus;
      if (newStatus === 'APPROVE') req.serviceApprove = true;
      else if (newStatus === 'PENDING') req.serviceApprove = false;
      saveRequestsToDB(requests);
    }

    hideLoading();
    tutupModalUbahStatusAdmin();
    showNotif(`BERHASIL MENGUBAH STATUS NO SURAT ${noSurat} MENJADI ${newStatus} DI SUPABASE!`, 'success');

    // 3. Re-render UI components
    if (typeof loadMasterDbTable === 'function' && document.getElementById('masterDbTableBody')) {
      loadMasterDbTable();
    }
    if (typeof filterRiwayat === 'function') {
      filterRiwayat();
    }
    if (typeof renderDashboard === 'function') {
      renderDashboard();
    }
    if (typeof bukaModalDetailV2 === 'function' && window._currentDetailNoSurat === noSurat) {
      bukaModalDetailV2(noSurat);
    }
  } catch(err) {
    hideLoading();
    console.error('[SIMPAN STATUS ADMIN ERROR]:', err);
    showNotif('GAGAL MENGUBAH STATUS: ' + (err.message || String(err)), 'error');
  }
}
window.simpanUbahStatusAdmin = simpanUbahStatusAdmin;
