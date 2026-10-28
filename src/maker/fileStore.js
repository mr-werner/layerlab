// Keeps the last remixed file in the browser (IndexedDB), so a reload or a
// trip to the Studio doesn't lose it. Fails quietly where storage is blocked.
const DB = "layerlab";
const STORE = "files";
const KEY = "remix";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveRemix(entry) {
  try {
    await run("readwrite", (s) => s.put(entry, KEY));
  } catch {
    /* the remix still works, it just won't survive a reload */
  }
}

export async function loadRemix() {
  try {
    return (await run("readonly", (s) => s.get(KEY))) || null;
  } catch {
    return null;
  }
}

export async function clearRemix() {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    /* nothing to clear */
  }
}
