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
let reconnectTimer = null; // Timer untuk auto-reconnect

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

async function initSupabaseDB(secretKey = null) {
  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library belum dimuat!');
    updateSupabaseStatusUI(false);
    return false;
  }

  const apiKey = (secretKey && secretKey.trim()) ? secretKey.trim() : APP_SUPABASE_PUBLISHABLE_KEY;

  try {
    if (!supabaseClient) {
      supabaseClient = supabase.createClient(APP_SUPABASE_URL, apiKey, {
        realtime: {
          params: { eventsPerSecond: 10 },
          timeout: 20000 // Timeout wajar 20 detik
        }
      });
    }

    await loadAllFromSupabase();
    setupRealtimeSubscription();
    
    isSupabaseReady = true;
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
    startSupabaseKeepalive(); 
    return true;
  } catch (err) {
    console.error('SUPABASE GAGAL TERHUBUNG:', err.message);
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  }
}

async function loadAllFromSupabase() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('app_storage').select('key, value');
  if (error) throw error;

  if (Array.isArray(data)) {
    data.forEach(row => {
      memoryCache.set(row.key, serializeForCache(row.value));
    });
  }
}

function setupRealtimeSubscription() {
  if (!supabaseClient) return;

  try {
    // 1. Bersihkan channel lama yang mungkin sudah mati/zombie
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    // 2. Buat channel baru dengan nama unik agar tidak bentrok
    realtimeChannel = supabaseClient.channel('app_storage_changes_' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_storage' }, payload => {
        const row = payload.new || payload.old;
        if (!row || !row.key) return;

        if (payload.eventType === 'DELETE') {
          memoryCache.delete(row.key);
        } else {
          memoryCache.set(row.key, serializeForCache(row.value));
        }

        if (typeof onDataChangeCallback === 'function') {
          onDataChangeCallback(row.key);
        }
      })
      .subscribe((status) => {
        console.log('Realtime Status:', status);
        
        if (status === 'SUBSCRIBED') {
          isSupabaseOnline = true;
          updateSupabaseStatusUI(true);
        }

        // Jika koneksi terputus/error, coba sambung ulang
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSupabaseOnline = false;
          updateSupabaseStatusUI(false);
          
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            console.log('Mencoba menyambung kembali ke Supabase Realtime...');
            setupRealtimeSubscription();
          }, 3000); // Coba reconnect setelah 3 detik
        }
      });
  } catch (err) {
    console.warn('Realtime subscription error:', err.message);
  }
}

// ==============================================================
// FITUR BARU: SENSOR LAYAR HP NYALA (WAKE-UP) & INTERNET KONEK
// ==============================================================
document.addEventListener('visibilitychange', () => {
  // Jika tab kembali aktif / layar HP menyala
  if (document.visibilityState === 'visible') {
    console.log('Layar aktif kembali. Menyegarkan koneksi Supabase...');
    if (isSupabaseReady) {
      pullFromSupabase(); // Tarik data terbaru yg terlewat saat HP mati
      setupRealtimeSubscription(); // Reset paksa socket realtime
    }
  }
});

window.addEventListener('online', () => {
  console.log('Internet terhubung kembali. Reconnecting...');
  if (isSupabaseReady) {
    pullFromSupabase();
    setupRealtimeSubscription();
  }
});

window.addEventListener('offline', () => {
  console.log('Internet terputus!');
  isSupabaseOnline = false;
  updateSupabaseStatusUI(false);
});
// ==============================================================

function schedulePersist(key, parsedValue) {
  pendingWrites.set(key, parsedValue);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushPendingWrites, 300);
}

function scheduleDelete(key) {
  pendingWrites.set(key, { __DELETE__: true });
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushPendingWrites, 300);
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
          key,
          value: val,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }
    } catch (err) {
      console.warn('Supabase write error:', err.message);
      isSupabaseOnline = false;
      updateSupabaseStatusUI(false);
    }
  }

  isSupabaseOnline = true;
  updateSupabaseStatusUI(true);
}

async function pushToSupabaseNow() {
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  await flushPendingWrites();
}

async function pullFromSupabase() {
  if (!supabaseClient) return false;
  try {
    await loadAllFromSupabase();
    isSupabaseOnline = true;
    updateSupabaseStatusUI(true);
    return true;
  } catch (err) {
    console.warn('Supabase pull error:', err.message);
    isSupabaseOnline = false;
    updateSupabaseStatusUI(false);
    return false;
  }
}

let supabaseKeepaliveTimer = null;

function startSupabaseKeepalive() {
  if (supabaseKeepaliveTimer) clearInterval(supabaseKeepaliveTimer);
  
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
  }, 45000); // Ping dimajukan jadi setiap 45 detik
}

// =========================================================================
// 3. FIX: KOMPRESI FOTO AGAR JERNIH TAPI MEMORI KECIL (HD 1024px, 80%)
// =========================================================================
async function uploadPhotoToSupabaseStorage(file) {
  if (!supabaseClient) return null;
  try {
    // 1. Kompres foto dulu (Resolusi max 1024px, Kualitas 80% / 0.8)
    const base64Data = await kompresiFoto(file, 1024, 0.8); 
    if (!base64Data) return null;

    // 2. Ubah hasil kompresi (base64) kembali menjadi File/Blob untuk Supabase
    const res = await fetch(base64Data);
    const blob = await res.blob();
    
    const fileName = `FOTO_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`; // Paksa format JPG agar ringan
    
    // 3. Upload file yang sudah ringan ke Supabase
    const { error } = await supabaseClient.storage.from('photos').upload(fileName, blob, { 
      contentType: 'image/jpeg', 
      cacheControl: '3600', 
      upsert: false 
    });
    
    if (error) throw error;
    
    const { data } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn('Supabase Storage upload error:', err.message);
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
