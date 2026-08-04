/* ======================================================
   SUPABASE DATABASE ENGINE (CLOUD & RAM ONLY)
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
let reconnectTimer = null; 
let supabaseKeepaliveTimer = null;
let pullRunning = false;

// PENTING: Penyimpanan murni di RAM untuk Database. 
const memoryCache = new Map();

// Daftar key UI/Pengaturan alat yang boleh disimpan di LocalStorage perangkat
const LOCAL_SETTINGS_KEYS = [
  'STORE_ACTIVE_THEME_V7_CLEAN',
  'STORE_FONTE_TOKEN_KEY_V7_CLEAN',
  'STORE_ADMIN_REMINDER_KEY_V7_CLEAN',
  'STORE_ADMIN_REMINDER_TIME_KEY_V7',
  'STORE_ADMIN_SECRET_KEY_V7_CLEAN',
  'STORE_ADMIN_SCRIPT_URL_V7_CLEAN',
  'STORE_FEATURE_PHOTOS_V7_CLEAN'
];

const appStorage = {
  getItem(key) {
    if (LOCAL_SETTINGS_KEYS.includes(key) && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (!memoryCache.has(key)) return null;
    const val = memoryCache.get(key);
    return typeof val === 'string' ? val : JSON.stringify(val);
  },
  setItem(key, value) {
    const strVal = String(value);
    if (LOCAL_SETTINGS_KEYS.includes(key) && window.localStorage) {
      window.localStorage.setItem(key, strVal);
      return;
    }
    // Database murni disimpan di RAM & Kirim ke Supabase
    memoryCache.set(key, strVal);
    schedulePersist(key, parseStorageValue(strVal));
  },
  removeItem(key) {
    if (LOCAL_SETTINGS_KEYS.includes(key) && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    memoryCache.delete(key);
    scheduleDelete(key);
  },
  clear() {
    memoryCache.clear();
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
    updateSupabaseStatusUI(false);
    return false;
  }
  const apiKey = (secretKey && secretKey.trim()) ? secretKey.trim() : APP_SUPABASE_PUBLISHABLE_KEY;
  try {
    if (!supabaseClient) {
      supabaseClient = supabase.createClient(APP_SUPABASE_URL, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 20 } }
      });
    }
    await loadAllFromSupabase();
    await setupRealtimeSubscription();

    isSupabaseReady = true;
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
    startSupabaseKeepalive();
    
    return true;
  } catch(err) {
    isSupabaseReady = false;
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  }
}

async function loadAllFromSupabase() {
  return await pullFromSupabase(true);
}

async function setupRealtimeSubscription() {
  if (!supabaseClient) return;
  try {
    if (realtimeChannel) {
      try { await supabaseClient.removeChannel(realtimeChannel); } catch (e) {}
      realtimeChannel = null;
    }
    realtimeChannel = supabaseClient
      .channel('app_storage_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_storage' }, payload => {
        try {
          if (payload.eventType === 'DELETE') {
            const key = payload.old?.key;
            if (key) {
              memoryCache.delete(key);
              if (typeof onDataChangeCallback === 'function') onDataChangeCallback(key);
            }
            return;
          }
          const row = payload.new;
          if (!row || !row.key) return;
          memoryCache.set(row.key, serializeForCache(row.value));
          if (typeof onDataChangeCallback === 'function') onDataChangeCallback(row.key);
        } catch(err) {}
      })
      .subscribe((status) => {
        switch(status) {
          case "SUBSCRIBED":
            isSupabaseOnline = true;
            updateSupabaseStatusUI(true);
            break;
          case "CHANNEL_ERROR":
          case "TIMED_OUT":
          case "CLOSED":
            isSupabaseOnline = false;
            updateSupabaseStatusUI(false);
            reconnectRealtime();
            break;
        }
      });
  } catch(err) { reconnectRealtime(); }
}

function reconnectRealtime() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(async () => {
    if(!supabaseClient) return;
    await pullFromSupabase();
    await setupRealtimeSubscription();
  }, 2500);
}

function schedulePersist(key, value) {
  pendingWrites.set(key, value);
  if(writeTimer) return;
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    await flushPendingWrites();
  }, 250);
}

function scheduleDelete(key) {
  pendingWrites.set(key, { __DELETE__: true });
  if(writeTimer) return;
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    await flushPendingWrites();
  }, 250);
}

async function flushPendingWrites() {
  if (!supabaseClient || pendingWrites.size === 0) return;

  const batch = [...pendingWrites.entries()];
  const upsertRows = [];
  const deleteKeys = [];

  batch.forEach(([key, value]) => {
    if (value && value.__DELETE__) {
      deleteKeys.push(key);
    } else {
      upsertRows.push({ key: key, value: value, updated_at: new Date().toISOString() });
    }
  });

  try {
    if (deleteKeys.length > 0) {
      const { error } = await supabaseClient.from('app_storage').delete().in('key', deleteKeys);
      if (error) throw error;
    }
    if (upsertRows.length > 0) {
      const { error } = await supabaseClient.from('app_storage').upsert(upsertRows, { onConflict: 'key' });
      if (error) throw error;
    }
    batch.forEach(([key]) => pendingWrites.delete(key));
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
  } catch(err) {
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    if(writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => flushPendingWrites(), 3000);
  }
}

async function pushToSupabaseNow() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await flushPendingWrites();
}

async function pullFromSupabase(force = false) {
  if (!supabaseClient) return false;
  if (pullRunning && !force) return true;
  pullRunning = true;
  try {
    const { data, error } = await supabaseClient.from("app_storage").select("key,value");
    if (error) throw error;
    if (Array.isArray(data)) {
      for (const row of data) {
        memoryCache.set(row.key, serializeForCache(row.value));
      }
    }
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
    return true;
  } catch(err) {
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  } finally {
    pullRunning = false;
  }
}

function startSupabaseKeepalive() {
  if (supabaseKeepaliveTimer) clearInterval(supabaseKeepaliveTimer);
  supabaseKeepaliveTimer = setInterval(async () => {
    if(!supabaseClient) return;
    try {
      const { error } = await supabaseClient.from('app_storage').select('key').limit(1);
      if (error) throw error;
      isSupabaseOnline = true;
      updateSupabaseStatusUI(true);
    } catch(e) {
      isSupabaseOnline = false;
      updateSupabaseStatusUI(false);
      reconnectRealtime();
    }
  }, 60000);
}

async function uploadPhotoToSupabaseStorage(file) {
  if (!supabaseClient) return null;
  try {
    const ext = (file.name && file.name.split('.').pop()) || 'jpg';
    const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    const { error } = await supabaseClient.storage.from('photos').upload(fileName, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (err) {
    return null;
  }
}

function updateSupabaseStatusUI(isOnline) {
  const badge = document.getElementById('cloudStatusBadge');
  if (!badge) return;
  if (isOnline) {
    badge.style.background = 'rgba(16, 185, 129, 0.18)';
    badge.style.color = '#10b981';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    badge.innerHTML = '<span class="material-symbols-rounded" style="font-size: 15px;">cloud_done</span> SUPABASE ONLINE';
  } else {
    badge.style.background = 'rgba(239, 68, 68, 0.18)';
    badge.style.color = '#ef4444';
    badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    badge.innerHTML = '<span class="material-symbols-rounded" style="font-size: 15px;">cloud_off</span> RECONNECTING...';
  }
}

window.initSupabaseDB = initSupabaseDB;
window.pushToSupabaseNow = pushToSupabaseNow;
window.pullFromSupabase = pullFromSupabase;
window.startSupabaseKeepalive = startSupabaseKeepalive;
window.uploadPhotoToSupabaseStorage = uploadPhotoToSupabaseStorage;
window.setOnDataChangeCallback = setOnDataChangeCallback;
window.appStorage = appStorage;
