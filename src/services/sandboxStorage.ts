/**
 * FoodBridge - Sandbox Storage Service (Milestone 2 - Deliverable 2)
 * Mengelola berkas media dan antrean transaksi secara Offline-First di dalam
 * Scoped Storage / App Sandbox (documentDirectory) yang terisolasi dari galeri publik perangkat.
 */

import * as FileSystem from 'expo-file-system/legacy';

// Subdirektori khusus FoodBridge di dalam Sandbox
const SANDBOX_FOLDER_NAME = 'foodbridge_rescue_docs/';
const QUEUE_FILE_NAME = 'offline_rescue_queue.json';

/**
 * Mendapatkan base path direktori sandbox terisolasi
 */
export function getSandboxDirectoryUri(): string {
  const baseDir = FileSystem.documentDirectory || '';
  return `${baseDir}${SANDBOX_FOLDER_NAME}`;
}

/**
 * Mendapatkan path file antrean offline
 */
export function getOfflineQueueFileUri(): string {
  return `${getSandboxDirectoryUri()}${QUEUE_FILE_NAME}`;
}

/**
 * Memastikan direktori sandbox telah dibuat sebelum operasi file
 */
export async function ensureSandboxDirectoryExists(): Promise<string> {
  const dirUri = getSandboxDirectoryUri();
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirUri);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }
    return dirUri;
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal inisialisasi direktori sandbox:', error);
    throw new Error('Gagal membuat direktori Scoped Storage sandbox.');
  }
}

// ================= MEDIA & PHOTO MANAGEMENT (ISOLATED FROM PUBLIC GALLERY) =================

export interface SavedSandboxMedia {
  fileName: string;
  sandboxUri: string;
  sizeBytes: number;
  createdAt: string;
  mediaType: 'DELIVERY_PROOF' | 'ID_SCAN';
}

/**
 * Menyalin foto dari cache sementara kamera/picker ke dalam direktori Sandbox terisolasi.
 * Ini memastikan media tidak masuk ke galeri publik perangkat (menjaga privasi KTP/identitas).
 */
export async function savePhotoToSandbox(
  sourceTempUri: string,
  mediaType: 'DELIVERY_PROOF' | 'ID_SCAN',
  customIdentifier?: string
): Promise<SavedSandboxMedia> {
  await ensureSandboxDirectoryExists();

  const timestamp = Date.now();
  const idPrefix = customIdentifier ? `${customIdentifier}_` : '';
  const extension = sourceTempUri.split('.').pop() || 'jpg';
  const fileName = `${mediaType.toLowerCase()}_${idPrefix}${timestamp}.${extension}`;
  const destinationUri = `${getSandboxDirectoryUri()}${fileName}`;

  try {
    // Pindahkan (copy) file dari temp cache ke scoped document directory
    await FileSystem.copyAsync({
      from: sourceTempUri,
      to: destinationUri,
    });

    const fileInfo = await FileSystem.getInfoAsync(destinationUri);
    const sizeBytes = fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size : 0;

    return {
      fileName,
      sandboxUri: destinationUri,
      sizeBytes,
      createdAt: new Date().toISOString(),
      mediaType,
    };
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal menyimpan foto ke sandbox:', error);
    throw new Error('Gagal mengamankan foto ke sandbox terisolasi.');
  }
}

// ================= OFFLINE-FIRST RESCUE QUEUE =================

export type SyncStatus = 'PENDING_OFFLINE' | 'SYNCED' | 'FAILED';

export interface OfflineRescueRecord {
  id: string;
  locationId: string;
  locationName: string;
  locationType: 'DONOR' | 'RECIPIENT';
  recipientPicName: string;
  recipientNikMasked: string;
  hasEncryptedNikInSecureStore: boolean;
  portionsRescued: number;
  timestamp: string;
  photoSandboxUri: string | null;
  syncStatus: SyncStatus;
  notes: string;
  syncedAt?: string;
}

/**
 * Membaca seluruh antrean transaksi penyelamatan offline dari file JSON di documentDirectory
 */
export async function getOfflineRescueQueue(): Promise<OfflineRescueRecord[]> {
  await ensureSandboxDirectoryExists();
  const fileUri = getOfflineQueueFileUri();

  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return [];
    }

    const content = await FileSystem.readAsStringAsync(fileUri);
    if (!content.trim()) return [];

    return JSON.parse(content) as OfflineRescueRecord[];
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal membaca antrean offline:', error);
    return [];
  }
}

/**
 * Menambahkan transaksi penyelamatan baru ke dalam antrean offline JSON di Sandbox
 */
export async function enqueueOfflineRescue(record: OfflineRescueRecord): Promise<void> {
  await ensureSandboxDirectoryExists();
  const currentQueue = await getOfflineRescueQueue();

  // Tambahkan record baru di awal antrean
  const updatedQueue = [record, ...currentQueue.filter((item) => item.id !== record.id)];

  const fileUri = getOfflineQueueFileUri();
  try {
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedQueue, null, 2));
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal menulis antrean offline:', error);
    throw new Error('Gagal mencatat transaksi penyelamatan ke antrean offline.');
  }
}

/**
 * Mensimulasikan sinkronisasi antrean offline ke server saat koneksi internet aktif kembali
 */
export async function syncOfflineRescueQueue(): Promise<{
  syncedCount: number;
  failedCount: number;
  totalPending: number;
}> {
  const queue = await getOfflineRescueQueue();
  const pendingRecords = queue.filter((item) => item.syncStatus === 'PENDING_OFFLINE');

  if (pendingRecords.length === 0) {
    return { syncedCount: 0, failedCount: 0, totalPending: 0 };
  }

  // Simulasi sinkronisasi sukses
  const syncedTimestamp = new Date().toISOString();
  const updatedQueue: OfflineRescueRecord[] = queue.map((record) => {
    if (record.syncStatus === 'PENDING_OFFLINE') {
      return {
        ...record,
        syncStatus: 'SYNCED',
        syncedAt: syncedTimestamp,
      };
    }
    return record;
  });

  const fileUri = getOfflineQueueFileUri();
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(updatedQueue, null, 2));

  return {
    syncedCount: pendingRecords.length,
    failedCount: 0,
    totalPending: 0,
  };
}

/**
 * Menghapus transaksi yang telah sukses disinkronkan untuk merapikan antrean
 */
export async function clearSyncedRescueRecords(): Promise<void> {
  const queue = await getOfflineRescueQueue();
  const remaining = queue.filter((item) => item.syncStatus !== 'SYNCED');
  const fileUri = getOfflineQueueFileUri();
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(remaining, null, 2));
}

// ================= INSPECTOR & UTILITIES (DEMO KE DOSEN) =================

export interface SandboxFileInfo {
  name: string;
  uri: string;
  sizeBytes: number;
  sizeFormatted: string;
  isDirectory: boolean;
}

export interface SandboxStorageStats {
  sandboxPath: string;
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  pendingOfflineCount: number;
  syncedCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Mengambil daftar berkas yang ada di dalam Scoped Sandbox
 */
export async function getSandboxFilesList(): Promise<SandboxFileInfo[]> {
  await ensureSandboxDirectoryExists();
  const dirUri = getSandboxDirectoryUri();

  try {
    const fileNames = await FileSystem.readDirectoryAsync(dirUri);
    const details = await Promise.all(
      fileNames.map(async (name) => {
        const itemUri = `${dirUri}${name}`;
        const info = await FileSystem.getInfoAsync(itemUri);
        const sizeBytes = info.exists && !info.isDirectory ? info.size : 0;
        return {
          name,
          uri: itemUri,
          sizeBytes,
          sizeFormatted: formatBytes(sizeBytes),
          isDirectory: info.exists ? info.isDirectory : false,
        };
      })
    );
    return details;
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal membaca isi direktori:', error);
    return [];
  }
}

/**
 * Mengambil ringkasan statistik penggunaan penyimpanan sandbox
 */
export async function getSandboxStorageStats(): Promise<SandboxStorageStats> {
  const files = await getSandboxFilesList();
  const queue = await getOfflineRescueQueue();

  const totalSizeBytes = files.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const pendingOfflineCount = queue.filter((item) => item.syncStatus === 'PENDING_OFFLINE').length;
  const syncedCount = queue.filter((item) => item.syncStatus === 'SYNCED').length;

  return {
    sandboxPath: getSandboxDirectoryUri(),
    totalFiles: files.length,
    totalSizeBytes,
    totalSizeFormatted: formatBytes(totalSizeBytes),
    pendingOfflineCount,
    syncedCount,
  };
}

/**
 * Menghapus file tertentu di dalam Sandbox
 */
export async function deleteSandboxFile(fileUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (error) {
    console.error('FoodBridge Sandbox: Gagal menghapus file:', error);
  }
}
