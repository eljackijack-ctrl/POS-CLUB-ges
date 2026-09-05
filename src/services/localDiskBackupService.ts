import { FullSystemBackupSnapshot, LocalDiskBackupConfig, DiskBackupFileInfo, LocalDiskStorageMode } from '../types';
import { isCapacitorNative } from '../utils/capacitorBridge';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const DB_NAME = 'clubpos_local_storage_db';
const STORE_NAME = 'directory_handles';
const HANDLE_KEY = 'backup_folder_handle';
const BACKUP_META_STORE = 'backup_files_metadata';
const BACKUP_CONTENT_STORE = 'backup_files_content';
const DEFAULT_FOLDER_NAME = 'ClubPOS_Sauvegardes_JSON';

export const DEFAULT_DISK_BACKUP_CONFIG: LocalDiskBackupConfig = {
  autoBackupEnabled: true,
  intervalMinutes: 1, // Enregistrement automatique chaque minute
  backupOnShiftClosing: true,
  backupBeforeReset: true,
  maxFilesToKeep: 120, // 120 fichiers max (2 heures de sauvegardes minute par minute)
  preferredDirectoryName: DEFAULT_FOLDER_NAME,
  storageMode: 'OPFS_STORAGE',
  autoRestoreOnStartup: true // Ouverture/Restauration automatique du dernier fichier .JSON à la réouverture de l'application
};

// Open IndexedDB helper
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BACKUP_META_STORE)) {
        db.createObjectStore(BACKUP_META_STORE, { keyPath: 'fileName' });
      }
      if (!db.objectStoreNames.contains(BACKUP_CONTENT_STORE)) {
        db.createObjectStore(BACKUP_CONTENT_STORE, { keyPath: 'fileName' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store / Retrieve DirectoryHandle from IndexedDB
async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Store / Retrieve file metadata in IndexedDB for fast indexing
async function saveFileMetadata(meta: DiskBackupFileInfo): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_META_STORE, 'readwrite');
      tx.objectStore(BACKUP_META_STORE).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore indexing error
  }
}

async function getAllFilesMetadata(): Promise<DiskBackupFileInfo[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BACKUP_META_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_META_STORE).getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as DiskBackupFileInfo[];
        list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function removeFileMetadata(fileName: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BACKUP_META_STORE, 'readwrite');
      tx.objectStore(BACKUP_META_STORE).delete(fileName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

// Store full JSON file content in IndexedDB
async function saveFileContent(fileName: string, jsonContent: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BACKUP_CONTENT_STORE, 'readwrite');
      tx.objectStore(BACKUP_CONTENT_STORE).put({ fileName, content: jsonContent, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore
  }
}

// Retrieve JSON file content from IndexedDB
async function getFileContent(fileName: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BACKUP_CONTENT_STORE, 'readonly');
      const req = tx.objectStore(BACKUP_CONTENT_STORE).get(fileName);
      req.onsuccess = () => resolve(req.result ? req.result.content : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Remove JSON file content from IndexedDB
async function removeFileContent(fileName: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BACKUP_CONTENT_STORE, 'readwrite');
      tx.objectStore(BACKUP_CONTENT_STORE).delete(fileName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export class LocalDiskBackupService {
  private static instance: LocalDiskBackupService;
  private customDirHandle: FileSystemDirectoryHandle | null = null;
  private customDirName: string | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): LocalDiskBackupService {
    if (!LocalDiskBackupService.instance) {
      LocalDiskBackupService.instance = new LocalDiskBackupService();
    }
    return LocalDiskBackupService.instance;
  }

  /**
   * Initialize service & restore directory handles if permission is granted
   */
  public async init(): Promise<{ mode: LocalDiskStorageMode; folderName: string }> {
    if (this.isInitialized) {
      return {
        mode: this.getEffectiveStorageMode(),
        folderName: this.getFolderName()
      };
    }

    if (isCapacitorNative()) {
      try {
        await Filesystem.mkdir({
          path: DEFAULT_FOLDER_NAME,
          directory: Directory.Documents,
          recursive: true
        });
      } catch {
        // Directory may already exist
      }
      this.isInitialized = true;
      return { mode: 'CAPACITOR_NATIVE', folderName: `Documents/${DEFAULT_FOLDER_NAME}` };
    }

    // Check if custom directory handle is stored in IndexedDB
    try {
      const handle = await getStoredDirectoryHandle();
      if (handle) {
        // Verify permission without asking immediately if possible
        const permission = await (handle as any).queryPermission?.({ mode: 'readwrite' });
        if (permission === 'granted') {
          this.customDirHandle = handle;
          this.customDirName = handle.name;
        }
      }
    } catch (e) {
      console.debug('[DiskBackup] Handle restore error:', e);
    }

    // Ensure OPFS root directory exists
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
        const root = await navigator.storage.getDirectory();
        await root.getDirectoryHandle(DEFAULT_FOLDER_NAME, { create: true });
      }
    } catch (e) {
      console.debug('[DiskBackup] OPFS init:', e);
    }

    this.isInitialized = true;
    return {
      mode: this.getEffectiveStorageMode(),
      folderName: this.getFolderName()
    };
  }

  public getEffectiveStorageMode(): LocalDiskStorageMode {
    if (isCapacitorNative()) return 'CAPACITOR_NATIVE';
    if (this.customDirHandle) return 'DIRECTORY_PICKER';
    if (typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory) return 'OPFS_STORAGE';
    return 'DOWNLOAD_FALLBACK';
  }

  public getFolderName(): string {
    if (isCapacitorNative()) return `Disque Local Android / Documents / ${DEFAULT_FOLDER_NAME}`;
    if (this.customDirHandle) return `Dossier Local : ${this.customDirName || this.customDirHandle.name}`;
    if (typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory) {
      return `Disque Local Sécurisé de l'Appareil / ${DEFAULT_FOLDER_NAME}`;
    }
    return `Dossier Téléchargements Local (Navigateur)`;
  }

  public hasCustomDirectoryPickerSupport(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  /**
   * Let user choose a real physical folder on their local disk
   * (e.g. C:\Sauvegardes_ClubPOS or USB key or Documents)
   */
  public async pickCustomDirectory(): Promise<{ success: boolean; folderName: string; error?: string }> {
    if (!this.hasCustomDirectoryPickerSupport()) {
      return {
        success: false,
        folderName: this.getFolderName(),
        error: "L'API de sélection de dossier direct n'est pas supportée par ce navigateur. Le stockage disque local sécurisé (OPFS) est actif."
      };
    }

    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        id: 'clubpos_backups_folder',
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Verify readwrite permission
      if ((dirHandle as any).requestPermission) {
        const status = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
        if (status !== 'granted') {
          return { success: false, folderName: this.getFolderName(), error: 'Permission refusée pour le dossier sélectionné.' };
        }
      }

      this.customDirHandle = dirHandle;
      this.customDirName = dirHandle.name;
      await saveDirectoryHandle(dirHandle);

      return {
        success: true,
        folderName: `Dossier Local : ${dirHandle.name}`
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, folderName: this.getFolderName(), error: 'Sélection de dossier annulée.' };
      }
      return { success: false, folderName: this.getFolderName(), error: err.message || 'Erreur de sélection' };
    }
  }

  /**
   * Save a full JSON backup file directly to the device's local disk folder
   */
  public async saveBackupFileToDisk(
    snapshot: FullSystemBackupSnapshot,
    backupType: 'AUTO_INTERVAL' | 'SHIFT_CLOSING' | 'MANUAL' | 'BEFORE_RESET' = 'MANUAL'
  ): Promise<{ success: boolean; fileName: string; sizeFormatted: string; location: string; error?: string }> {
    await this.init();

    const timestamp = new Date();
    const dateFormatted = timestamp.toISOString().slice(0, 10);
    const timeFormatted = `${String(timestamp.getHours()).padStart(2, '0')}h${String(timestamp.getMinutes()).padStart(2, '0')}m${String(timestamp.getSeconds()).padStart(2, '0')}`;
    const enterpriseCode = snapshot.data.companyProfile?.enterpriseCode || snapshot.data.companyProfile?.name?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 12) || 'CLUBPOS';
    
    const fileName = `backup_${enterpriseCode}_${dateFormatted}_${timeFormatted}_${backupType.toLowerCase()}.json`;
    const jsonString = JSON.stringify(snapshot, null, 2);
    const fileSizeBytes = new Blob([jsonString]).size;
    const sizeFormatted = fileSizeBytes < 1024 
      ? `${fileSizeBytes} B` 
      : `${(fileSizeBytes / 1024).toFixed(1)} Ko`;

    const metadata: DiskBackupFileInfo = {
      fileName,
      fileSizeBytes,
      formattedSize: sizeFormatted,
      savedAt: timestamp.toISOString(),
      enterpriseId: snapshot.data.companyProfile?.enterpriseId || 'default',
      enterpriseName: snapshot.data.companyProfile?.name || 'ClubPOS',
      totalRevenueFCFA: snapshot.summary.totalRevenueFCFA,
      ordersCount: snapshot.summary.totalOrdersCount,
      paymentsCount: snapshot.summary.paymentsCount,
      backupType,
      snapshotId: snapshot.id
    };

    let writeSucceeded = false;
    let savedLocation = '';

    // 1. Native Capacitor on Android/iOS
    if (isCapacitorNative()) {
      try {
        await Filesystem.writeFile({
          path: `${DEFAULT_FOLDER_NAME}/${fileName}`,
          data: jsonString,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true
        });
        writeSucceeded = true;
        savedLocation = `Disque Local / Documents / ${DEFAULT_FOLDER_NAME} / ${fileName}`;
      } catch (err) {
        console.warn('[DiskBackup] Capacitor write failed:', err);
      }
    }

    // 2. Custom directory chosen by user via File System Access API
    if (this.customDirHandle) {
      try {
        // Test / verify permission
        let hasPermission = true;
        if ((this.customDirHandle as any).queryPermission) {
          const status = await (this.customDirHandle as any).queryPermission({ mode: 'readwrite' });
          if (status !== 'granted') {
            hasPermission = false;
          }
        }

        if (hasPermission) {
          const fileHandle = await this.customDirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          writeSucceeded = true;
          savedLocation = `Dossier Local : ${this.customDirName || this.customDirHandle.name}/${fileName}`;
        }
      } catch (err) {
        console.warn('[DiskBackup] Custom directory write error:', err);
      }
    }

    // 3. OPFS (Origin Private File System) - Native browser local disk storage (Chrome, Safari, Firefox, Edge)
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        const subDir = await root.getDirectoryHandle(DEFAULT_FOLDER_NAME, { create: true });
        const fileHandle = await subDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        writeSucceeded = true;
        if (!savedLocation) {
          savedLocation = `Disque Local Sécurisé (OPFS) / ${DEFAULT_FOLDER_NAME} / ${fileName}`;
        }
      } catch (err) {
        console.warn('[DiskBackup] OPFS write error:', err);
      }
    }

    // 4. Save metadata and full content to IndexedDB for guaranteed persistent device storage
    await saveFileContent(fileName, jsonString);
    await saveFileMetadata(metadata);
    if (!savedLocation) {
      savedLocation = `Disque Local Sécurisé / ${DEFAULT_FOLDER_NAME} / ${fileName}`;
      writeSucceeded = true;
    }

    // 5. Automatic pruning of old files if exceeding max limit
    try {
      await this.pruneOldBackupFiles(DEFAULT_DISK_BACKUP_CONFIG.maxFilesToKeep || 120);
    } catch {
      // Ignore pruning error
    }

    // 6. Only trigger browser download if explicitly requested as MANUAL and nothing else was available
    if (!writeSucceeded && backupType === 'MANUAL') {
      this.triggerBrowserDownload(fileName, jsonString);
      savedLocation = `Dossier Téléchargements de l'appareil / ${fileName}`;
      writeSucceeded = true;
    }

    return {
      success: writeSucceeded,
      fileName,
      sizeFormatted,
      location: savedLocation
    };
  }

  /**
   * List all JSON backup files available on the local disk
   */
  public async listDiskBackupFiles(): Promise<DiskBackupFileInfo[]> {
    await this.init();
    const filesMap = new Map<string, DiskBackupFileInfo>();

    // 1. Get from indexed metadata
    const indexed = await getAllFilesMetadata();
    for (const item of indexed) {
      filesMap.set(item.fileName, item);
    }

    // 2. Scan Custom Directory if available
    if (this.customDirHandle) {
      try {
        const hasPermission = (await (this.customDirHandle as any).queryPermission?.({ mode: 'readonly' })) === 'granted';
        if (hasPermission) {
          for await (const [name, handle] of (this.customDirHandle as any).entries()) {
            if (name.endsWith('.json') && !filesMap.has(name)) {
              try {
                const file = await (handle as FileSystemFileHandle).getFile();
                filesMap.set(name, {
                  fileName: name,
                  fileSizeBytes: file.size,
                  formattedSize: `${(file.size / 1024).toFixed(1)} Ko`,
                  savedAt: new Date(file.lastModified).toISOString(),
                  enterpriseId: 'local',
                  enterpriseName: 'Sauvegarde Disque',
                  totalRevenueFCFA: 0,
                  ordersCount: 0,
                  paymentsCount: 0,
                  backupType: 'MANUAL',
                  snapshotId: name
                });
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Scan OPFS if available
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        const subDir = await root.getDirectoryHandle(DEFAULT_FOLDER_NAME, { create: false }).catch(() => null);
        if (subDir) {
          for await (const [name, handle] of (subDir as any).entries()) {
            if (name.endsWith('.json') && !filesMap.has(name)) {
              try {
                const file = await (handle as FileSystemFileHandle).getFile();
                filesMap.set(name, {
                  fileName: name,
                  fileSizeBytes: file.size,
                  formattedSize: `${(file.size / 1024).toFixed(1)} Ko`,
                  savedAt: new Date(file.lastModified).toISOString(),
                  enterpriseId: 'local',
                  enterpriseName: 'Sauvegarde Disque',
                  totalRevenueFCFA: 0,
                  ordersCount: 0,
                  paymentsCount: 0,
                  backupType: 'MANUAL',
                  snapshotId: name
                });
              } catch {
                // ignore
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // 4. Scan Capacitor native folder
    if (isCapacitorNative()) {
      try {
        const result = await Filesystem.readdir({
          path: DEFAULT_FOLDER_NAME,
          directory: Directory.Documents
        });
        for (const file of result.files) {
          const name = typeof file === 'string' ? file : file.name;
          if (name.endsWith('.json') && !filesMap.has(name)) {
            filesMap.set(name, {
              fileName: name,
              fileSizeBytes: 0,
              formattedSize: 'Disque Local',
              savedAt: new Date().toISOString(),
              enterpriseId: 'native',
              enterpriseName: 'Android Documents',
              totalRevenueFCFA: 0,
              ordersCount: 0,
              paymentsCount: 0,
              backupType: 'MANUAL',
              snapshotId: name
            });
          }
        }
      } catch {
        // ignore
      }
    }

    const result = Array.from(filesMap.values());
    result.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return result;
  }

  /**
   * Read the content of a specific backup file from the local disk
   */
  public async readBackupFileFromDisk(fileName: string): Promise<FullSystemBackupSnapshot | null> {
    await this.init();

    // 1. Try Custom Directory
    if (this.customDirHandle) {
      try {
        const fileHandle = await this.customDirHandle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
      } catch {
        // fallback
      }
    }

    // 2. Try OPFS
    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        const subDir = await root.getDirectoryHandle(DEFAULT_FOLDER_NAME, { create: false });
        const fileHandle = await subDir.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
      } catch {
        // fallback
      }
    }

    // 3. Try Native Capacitor
    if (isCapacitorNative()) {
      try {
        const res = await Filesystem.readFile({
          path: `${DEFAULT_FOLDER_NAME}/${fileName}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        return JSON.parse(typeof res.data === 'string' ? res.data : '');
      } catch {
        // fallback
      }
    }

    // 4. Try IndexedDB persistent device content store
    try {
      const storedJson = await getFileContent(fileName);
      if (storedJson) {
        return JSON.parse(storedJson);
      }
    } catch {
      // fallback
    }

    return null;
  }

  /**
   * Find and read the most recent backup file from the local disk
   */
  public async getLatestBackupFile(): Promise<{ fileName: string; snapshot: FullSystemBackupSnapshot; fileInfo: DiskBackupFileInfo } | null> {
    try {
      const files = await this.listDiskBackupFiles();
      if (!files || files.length === 0) {
        return null;
      }
      // files is sorted newest first
      const latestFile = files[0];
      const snapshot = await this.readBackupFileFromDisk(latestFile.fileName);
      if (!snapshot) {
        // If the first one failed to parse, try the next one if available
        for (let i = 1; i < Math.min(files.length, 3); i++) {
          const fallbackSnapshot = await this.readBackupFileFromDisk(files[i].fileName);
          if (fallbackSnapshot) {
            return { fileName: files[i].fileName, snapshot: fallbackSnapshot, fileInfo: files[i] };
          }
        }
        return null;
      }
      return { fileName: latestFile.fileName, snapshot, fileInfo: latestFile };
    } catch {
      return null;
    }
  }

  /**
   * Prune older backup files if count exceeds maxFilesToKeep
   */
  public async pruneOldBackupFiles(maxFilesToKeep: number): Promise<number> {
    if (maxFilesToKeep <= 0) return 0;
    try {
      const files = await this.listDiskBackupFiles();
      if (files.length <= maxFilesToKeep) return 0;
      
      const filesToDelete = files.slice(maxFilesToKeep);
      let deletedCount = 0;
      for (const file of filesToDelete) {
        await this.deleteBackupFile(file.fileName);
        deletedCount++;
      }
      return deletedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Delete a backup file from the local disk
   */
  public async deleteBackupFile(fileName: string): Promise<boolean> {
    await this.init();
    let deleted = false;

    if (this.customDirHandle) {
      try {
        await this.customDirHandle.removeEntry(fileName);
        deleted = true;
      } catch {
        // ignore
      }
    }

    if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
      try {
        const root = await navigator.storage.getDirectory();
        const subDir = await root.getDirectoryHandle(DEFAULT_FOLDER_NAME, { create: false });
        await subDir.removeEntry(fileName);
        deleted = true;
      } catch {
        // ignore
      }
    }

    if (isCapacitorNative()) {
      try {
        await Filesystem.deleteFile({
          path: `${DEFAULT_FOLDER_NAME}/${fileName}`,
          directory: Directory.Documents
        });
        deleted = true;
      } catch {
        // ignore
      }
    }

    await removeFileContent(fileName);
    await removeFileMetadata(fileName);
    return deleted;
  }

  /**
   * Trigger explicit download to browser download folder
   */
  public triggerBrowserDownload(fileName: string, content: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const localDiskBackup = LocalDiskBackupService.getInstance();
