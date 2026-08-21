"use client";

// Client-side persistence for the bulk-upload page's "unsorted tray" — the
// files someone has picked but not yet sorted into a room/work-type bin.
// This state used to live only in React memory, so a page refresh, browser
// restart, or navigating away and back (or this dev environment's preview
// server restarting mid-session) silently discarded every not-yet-sorted
// file, forcing a re-pick from the camera roll. IndexedDB survives all of
// that — it's local browser storage, entirely independent of whether any
// server is running — and unlike localStorage it can store File/Blob
// objects directly, not just strings.
const DB_NAME = "dgwh-upload-tray";
const DB_VERSION = 1;
const STORE_NAME = "files";

export type StoredTrayFile = {
  id: string;
  file: File;
  confirmedFor: Array<{ roomId: string; workTypeId: string }>;
  addedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTrayFile(entry: StoredTrayFile): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTrayFile(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllTrayFiles(): Promise<StoredTrayFile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredTrayFile[]);
    request.onerror = () => reject(request.error);
  });
}
