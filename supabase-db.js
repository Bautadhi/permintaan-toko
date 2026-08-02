/* ======================================================
   SUPABASE DATABASE ENGINE (FIXED WEBSOCKET & KEEPALIVE)
====================================================== */

let APP_SUPABASE_URL = 'https://ducrykojvabaoioigbgc.supabase.co';
let APP_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_H2w50rrXQWKqZM2fKZJXBw_sRsEpwNf';

let supabaseClient = null;
let isSupabaseReady = false;
let isSupabaseOnline = false;
let pendingWrites = new Map();
let writeTimer = null;
let realtimeChannel = null;
let onDataChangeCallback = null;

const memoryCache = new Map();
const sessionKey = window.SESSION_KEY || 'STORE_ACTIVE_SESSION_V7_CLEAN';
const themeKey = window.THEME_KEY || 'STORE_ACTIVE_THEME_V7_CLEAN';

const appStorage = {
  getItem(key) {
    if (window.localStorage) {
      const localValue = window.localStorage.getItem(key);
      if (localValue !== null) {
        memoryCache.set(key, localValue);
        return localValue;
      }
    }
    if (!memoryCache.has(key)) return null;
    const val = memoryCache.get(key);
    return typeof val === 'string' ? val : JSON.stringify(val);
  },
  setItem(key, value) {
    const strVal = String(value);
    memoryCache.set(key, strVal);
    if (window.localStorage) window.localStorage.setItem(key, strVal);
    schedulePersist(key, parseStorageValue(strVal));
  },
  removeItem(key) {
    memoryCache.delete(key);
    if (window.localStorage) window.localStorage.removeItem(key);
    scheduleDelete(key);
  },
  clear() {
    const keepKeys = new Set([sessionKey, themeKey]);
    [...memoryCache.keys()].forEach(k => { if (!keepKeys.has(k)) memoryCache.delete(k); });
    if (window.localStorage) {
      Object.keys(window.localStorage).forEach(k => {
        if (!keepKeys.has(k) && (k.startsWith('STORE_') || k.startsWith('FIREBASE_'))) {
          window.localStorage.removeItem(k);
        }
      });
    }
  }
};

function parseStorageValue(strVal) {
  try { return JSON.parse(strVal); } catch { return strVal; }
}

function serializeForCache(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function setOnDataChangeCallback(fn) { onDataChangeCallback = fn; }

async function initSupabaseDB(secretKey = null) {
  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library belum dimuat!');
    updateSupabaseStatusUI(false);
    return false;
  }

  // MENCEGAH MULTIPLE INSTANCES: Jika sudah terkoneksi, lewati pembuatan ulang klien.
  if (supabaseClient) {
    return true; 
  }

  const apiKey = (secretKey && secretKey.trim()) ? secretKey.trim() : APP_SUPABASE_PUBLISHABLE_KEY;
  
  try {
    supabaseClient = supabase.createClient(APP_SUPABASE_URL, apiKey, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    
    await loadAllFromSupabase();
    setupRealtimeSubscription();
    
    isSupabaseReady = true;
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
    startSupabaseKeepalive(); 
    return true;
  } catch (err) {
    console.error('SUPABASE GAGAL TERHUBUNG:', err.message);
    return false;
  }
}

async function loadAllFromSupabase() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('app_storage').select('key, value');
  if (error) throw error;
  if (Array.isArray(data)) {
    data.forEach(row => memoryCache.set(row.key, serializeForCache(row.value)));
  }
}

function setupRealtimeSubscription() {
  if (!supabaseClient) return;
  try {
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
    realtimeChannel = supabaseClient
      .channel('app_storage_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_storage' }, payload => {
        const row = payload.new || payload.old;
        if (!row || !row.key) return;
        if (payload.eventType === 'DELETE') memoryCache.delete(row.key);
        else memoryCache.set(row.key, serializeForCache(row.value));
        if (typeof onDataChangeCallback === 'function') onDataChangeCallback(row.key);
      })
      .subscribe((status) => {
        // FITUR RECONNECT OTOMATIS JIKA PUTUS
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('Supabase Realtime terputus, mencoba reconnect dalam 5 detik...');
          setTimeout(setupRealtimeSubscription, 5000);
        }
      });
  } catch (err) {
    console.warn('Realtime subscription error:', err.message);
  }
}

function schedulePersist(key, parsedValue) {
  pendingWrites.set(key, parsedValue);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushPendingWrites, 500);
}

function scheduleDelete(key) {
  pendingWrites.set(key, { __DELETE__: true });
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushPendingWrites, 500);
}

async function flushPendingWrites() {
  if (!supabaseClient || pendingWrites.size === 0) return;
  const batch = new Map(pendingWrites);
  pendingWrites.clear();
  for (const [key, val] of batch) {
    try {
      if (val && val.__DELETE__) {
        await supabaseClient.from('app_storage').delete().eq('key', key);
      } else {
        await supabaseClient.from('app_storage').upsert({
          key, value: val, updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }
    } catch (err) {
      console.warn('Supabase write error:', key, err.message);
      isSupabaseOnline = false;
      updateSupabaseStatusUI(false);
    }
  }
  isSupabaseOnline = true;
  updateSupabaseStatusUI(true);
}

let supabaseKeepaliveTimer = null;
function startSupabaseKeepalive() {
  if (supabaseKeepaliveTimer) clearInterval(supabaseKeepaliveTimer);
  // PING SETIAP 60 DETIK AGAR KONEKSI TIDAK PUTUS SETELAH 5 MENIT
  supabaseKeepaliveTimer = setInterval(async () => {
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from('app_storage').select('key').limit(1);
      if (!error) {
        isSupabaseOnline = true;
        updateSupabaseStatusUI(true);
      }
    } catch (err) {
      isSupabaseOnline = false;
      updateSupabaseStatusUI(false);
    }
  }, 60000);
}

function updateSupabaseStatusUI(isOnline) {
  const badge = document.getElementById('cloudStatusBadge');
  if (!badge) return;
  if (isOnline) {
    badge.innerHTML = 'SUPABASE ONLINE';
    badge.style.color = '#10b981';
  } else {
    badge.innerHTML = 'SUPABASE OFFLINE';
    badge.style.color = '#ef4444';
  }
}

window.initSupabaseDB = initSupabaseDB;
window.startSupabaseKeepalive = startSupabaseKeepalive;
window.setOnDataChangeCallback = setOnDataChangeCallback;
window.appStorage = appStorage;
