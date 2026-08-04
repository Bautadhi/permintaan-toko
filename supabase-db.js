/* ======================================================
   SUPABASE DATABASE ENGINE (CLOUD ONLY - AUTO RECONNECT FIX)
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
let supabaseKeepaliveTimer = null; // Dideklarasikan hanya 1 kali
let pullRunning = false;

// PENTING: Hanya menggunakan RAM (Memory), tidak ada Local Storage
const memoryCache = new Map();
const themeKey = window.THEME_KEY || 'STORE_ACTIVE_THEME_V7_CLEAN';

const appStorage = {
  getItem(key) {
    if (key === themeKey && window.localStorage) return window.localStorage.getItem(key);
    if (!memoryCache.has(key)) return null;
    const val = memoryCache.get(key);
    return typeof val === 'string' ? val : JSON.stringify(val);
  },
  setItem(key, value) {
    const strVal = String(value);
    memoryCache.set(key, strVal);
    if (key === themeKey && window.localStorage) {
      window.localStorage.setItem(key, strVal);
      return;
    }
    schedulePersist(key, parseStorageValue(strVal));
  },
  removeItem(key) {
    memoryCache.delete(key);
    if (key === themeKey && window.localStorage) window.localStorage.removeItem(key);
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

/* ======================================================
   INIT SUPABASE DATABASE
====================================================== */
async function initSupabaseDB(secretKey = null) {
  if (typeof supabase === 'undefined') {
    console.error('Supabase Library belum dimuat');
    updateSupabaseStatusUI(false);
    return false;
  }

  const apiKey = (secretKey && secretKey.trim()) ? secretKey.trim() : APP_SUPABASE_PUBLISHABLE_KEY;

  try {
    // BUAT CLIENT HANYA SEKALI
    if (!supabaseClient) {
      supabaseClient = supabase.createClient(APP_SUPABASE_URL, apiKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        realtime: {
          params: { eventsPerSecond: 20 }
        }
      });
    }

    // LOAD DATA CLOUD
    await loadAllFromSupabase();

    // REALTIME
    await setupRealtimeSubscription();

    // STATUS
    isSupabaseReady = true;
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);

    // START KEEPALIVE
    startSupabaseKeepalive();
    
    console.log('✅ SUPABASE READY');
    return true;

  } catch(err) {
    console.error(err);
    isSupabaseReady = false;
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  }
}

/* ======================================================
   LOAD ALL FROM SUPABASE
====================================================== */
async function loadAllFromSupabase() {
  return await pullFromSupabase(true);
}

/* ======================================================
   REALTIME SUBSCRIPTION ENGINE
====================================================== */
async function setupRealtimeSubscription() {
  if (!supabaseClient) return;

  try {
    // HAPUS CHANNEL LAMA
    if (realtimeChannel) {
      try { await supabaseClient.removeChannel(realtimeChannel); } catch (e) {}
      realtimeChannel = null;
    }

    // BUAT CHANNEL BARU
    realtimeChannel = supabaseClient
      .channel('app_storage_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_storage' }, payload => {
        try {
          // DELETE
          if (payload.eventType === 'DELETE') {
            const key = payload.old?.key;
            if (key) {
              memoryCache.delete(key);
              if (typeof onDataChangeCallback === 'function') onDataChangeCallback(key);
            }
            return;
          }

          // INSERT / UPDATE
          const row = payload.new;
          if (!row || !row.key) return;

          memoryCache.set(row.key, serializeForCache(row.value));
          if (typeof onDataChangeCallback === 'function') onDataChangeCallback(row.key);

        } catch(err) {
          console.error('Realtime Callback Error', err);
        }
      })
      .subscribe((status) => {
        console.log("Realtime Status:", status);
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
  } catch(err) {
    console.error(err);
    reconnectRealtime();
  }
}

/* ======================================================
   REALTIME RECONNECT
====================================================== */
function reconnectRealtime() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  
  reconnectTimer = setTimeout(async () => {
    if(!supabaseClient) return;
    console.log("Menyambung kembali ke Supabase Realtime...");
    await pullFromSupabase();
    await setupRealtimeSubscription();
  }, 2500);
}

/* ======================================================
   SAVE TO QUEUE
====================================================== */
function schedulePersist(key, value) {
  pendingWrites.set(key, value);
  if(writeTimer) return;
  
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    await flushPendingWrites();
  }, 250);
}

/* ======================================================
   DELETE QUEUE
====================================================== */
function scheduleDelete(key) {
  pendingWrites.set(key, { __DELETE__: true });
  if(writeTimer) return;
  
  writeTimer = setTimeout(async () => {
    writeTimer = null;
    await flushPendingWrites();
  }, 250);
}

/* ======================================================
   FLUSH PENDING WRITES (SAFE VERSION)
====================================================== */
async function flushPendingWrites() {
  if (!supabaseClient) return;
  if (pendingWrites.size === 0) return;

  // Salin data TANPA menghapus antrian dahulu
  const batch = [...pendingWrites.entries()];
  const upsertRows = [];
  const deleteKeys = [];

  batch.forEach(([key, value]) => {
    if (value && value.__DELETE__) {
      deleteKeys.push(key);
    } else {
      upsertRows.push({
        key: key,
        value: value,
        updated_at: new Date().toISOString()
      });
    }
  });

  try {
    // DELETE
    if (deleteKeys.length > 0) {
      const { error } = await supabaseClient.from('app_storage').delete().in('key', deleteKeys);
      if (error) throw error;
    }

    // UPSERT
    if (upsertRows.length > 0) {
      const { error } = await supabaseClient.from('app_storage').upsert(upsertRows, { onConflict: 'key' });
      if (error) throw error;
    }

    // BERHASIL
    batch.forEach(([key]) => pendingWrites.delete(key));
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);

  } catch(err) {
    console.warn('Flush Error :', err.message);
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    
    // COBA LAGI 3 DETIK
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

/* ======================================================
   PULL FROM SUPABASE
====================================================== */
async function pullFromSupabase(force = false) {
  if (!supabaseClient) return false;
  
  // jangan pull bersamaan
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
    console.warn("Pull Error :", err.message);
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  } finally {
    pullRunning = false;
  }
}

/* ======================================================
   KEEP ALIVE (DIPERBAIKI DENGAN QUERY RINGAN)
====================================================== */
function startSupabaseKeepalive() {
  if (supabaseKeepaliveTimer) clearInterval(supabaseKeepaliveTimer);

  supabaseKeepaliveTimer = setInterval(async () => {
    if(!supabaseClient) return;
    try {
      // Pakai select ringan ke DB agar tidak memunculkan error 404
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

/* ======================================================
   UPLOAD PHOTO MENTAH (TANPA KOMPRESI)
====================================================== */
async function uploadPhotoToSupabaseStorage(file) {
  if (!supabaseClient) return null;
  try {
    // Ambil ekstensi asli file (jpg, png, jpeg, dll)
    const ext = (file.name && file.name.split('.').pop()) || 'jpg';
    const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    
    // Langsung upload file asli ke bucket 'photos' di Supabase
    const { error } = await supabaseClient.storage.from('photos').upload(fileName, file, { 
      cacheControl: '3600', 
      upsert: false 
    });
    
    if (error) throw error;
    
    // Ambil URL publik file tersebut
    const { data } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('Supabase Storage upload error:', err.message);
    return null;
  }
}

/* ======================================================
   UPDATE UI STATUS
====================================================== */
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

// EKSPOR KE WINDOW/GLOBAL AGAR BISA DIPANGGIL APP.JS
window.initSupabaseDB = initSupabaseDB;
window.pushToSupabaseNow = pushToSupabaseNow;
window.pullFromSupabase = pullFromSupabase;
window.startSupabaseKeepalive = startSupabaseKeepalive;
window.uploadPhotoToSupabaseStorage = uploadPhotoToSupabaseStorage;
window.setOnDataChangeCallback = setOnDataChangeCallback;
window.appStorage = appStorage;
