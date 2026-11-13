/* Salvataggio sul telefono: un archivio chiave/valore in IndexedDB. */
const NOME = "foresterie-in-tasca", ARCHIVIO = "kv";
let aperto = null;
function apri(){
  return aperto ??= new Promise((ok, ko) => {
    const r = indexedDB.open(NOME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ARCHIVIO);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}
export async function leggi(chiave){
  const db = await apri();
  return new Promise((ok, ko) => {
    const q = db.transaction(ARCHIVIO).objectStore(ARCHIVIO).get(chiave);
    q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error);
  });
}
export async function scrivi(chiave, valore){
  const db = await apri();
  return new Promise((ok, ko) => {
    const t = db.transaction(ARCHIVIO, "readwrite");
    t.objectStore(ARCHIVIO).put(valore, chiave);
    t.oncomplete = () => ok(); t.onerror = () => ko(t.error);
  });
}
export async function chiediPersistenza(){
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
