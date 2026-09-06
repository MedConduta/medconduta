/**
 * MedConduta — camada de persistência local (IndexedDB com fallback em localStorage).
 * Guarda: estado de repetição espaçada (SM-2) por flashcard, preferências (tema),
 * progresso de temas lidos e histórico de respostas de questões.
 */

const DB_NAME = "medconduta";
const DB_VERSION = 1;
const STORES = ["srs", "prefs", "progresso", "respostas"];

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  if (!("indexedDB" in window)) {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

  return dbPromise;
}

function lsKey(store, id) {
  return `medconduta:${store}:${id}`;
}

/** Lê um registro por id em um "store" lógico. */
export async function getItem(store, id) {
  const db = await openDb();
  if (!db) {
    const raw = localStorage.getItem(lsKey(store, id));
    return raw ? JSON.parse(raw) : null;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

/** Grava um registro (precisa conter `id`). */
export async function setItem(store, value) {
  const db = await openDb();
  if (!db) {
    localStorage.setItem(lsKey(store, value.id), JSON.stringify(value));
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Retorna todos os registros de um store. */
export async function getAll(store) {
  const db = await openDb();
  if (!db) {
    const out = [];
    const prefix = `medconduta:${store}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        out.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return out;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function getPref(key, fallback = null) {
  const rec = await getItem("prefs", key);
  return rec ? rec.value : fallback;
}

export async function setPref(key, value) {
  await setItem("prefs", { id: key, value });
}
