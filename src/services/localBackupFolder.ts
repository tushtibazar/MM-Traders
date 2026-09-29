// Local Folder Auto-Save Service using File System Access API & IndexedDB
const DB_NAME = 'mm_traders_local_backup_db';
const STORE_NAME = 'folder_handles';
const KEY = 'backup_folder_handle';
const FOLDER_NAME_KEY = 'backup_folder_name';

function getIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Check if the browser supports the File System Access API (Chromium: Chrome, Edge, Brave) */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof (window as any).showDirectoryPicker === 'function'
  );
}

/** Store a directory handle and folder name in IndexedDB */
export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  folderName: string
): Promise<void> {
  const db = await getIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(handle, KEY);
    store.put(folderName, FOLDER_NAME_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve the stored directory handle from IndexedDB */
export async function getDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve directory handle from IDB:', err);
    return null;
  }
}

/** Retrieve the stored folder name from IndexedDB */
export async function getStoredFolderName(): Promise<string | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(FOLDER_NAME_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    return null;
  }
}

/** Remove the stored directory handle and folder name */
export async function removeDirectoryHandle(): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY);
      store.delete(FOLDER_NAME_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to remove directory handle from IDB:', err);
  }
}

/**
 * Verify if readwrite permission is still granted for the directory handle.
 * If prompt=true, requests permission from the user if not currently granted.
 */
export async function verifyFolderPermission(
  dirHandle: FileSystemDirectoryHandle,
  promptUser: boolean = true
): Promise<boolean> {
  try {
    const mode = 'readwrite';
    if (typeof (dirHandle as any).queryPermission === 'function') {
      const status = await (dirHandle as any).queryPermission({ mode });
      if (status === 'granted') {
        return true;
      }
      if (promptUser && typeof (dirHandle as any).requestPermission === 'function') {
        const reqStatus = await (dirHandle as any).requestPermission({ mode });
        return reqStatus === 'granted';
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Permission query/request failed:', err);
    return false;
  }
}

/**
 * Writes the backup JSON file directly into the user's selected local folder
 * without triggering the standard browser "Save As" file dialog.
 */
export async function writeBackupToFolder(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
}
