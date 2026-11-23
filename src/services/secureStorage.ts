/**
 * FoodBridge - Secure Storage Service (Milestone 2 - Deliverable 1)
 * Menggunakan expo-secure-store untuk enkripsi hardware-backed (Android Keystore / iOS Keychain)
 * Menangani token autentikasi kurir dan data sensitif NIK penerima manfaat.
 */

import * as SecureStore from 'expo-secure-store';

// Key Constants
export const SECURE_KEYS = {
  AUTH_TOKEN: 'foodbridge_auth_token',
  COURIER_ID: 'foodbridge_courier_id',
  RECIPIENT_NIK_PREFIX: 'foodbridge_verified_nik_',
};

/**
 * Helper untuk melakukan masking NIK 16 digit demi perlindungan data pribadi (UU PDP).
 * Format: 6 digit wilayah + 8 digit bintang + 2 digit terakhir.
 * Contoh: 3573012345670004 -> 357301********04
 */
export function maskNik(nik: string): string {
  if (!nik) return '-';
  const clean = nik.replace(/\D/g, '');
  if (clean.length !== 16) {
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 2)}****${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 6)}********${clean.slice(14, 16)}`;
}

/**
 * Validasi format NIK Republik Indonesia (tepat 16 digit angka)
 */
export function isValidNik(nik: string): boolean {
  const clean = nik.replace(/\D/g, '');
  return clean.length === 16;
}

// ================= AUTH TOKEN & KREDENSIAL KURIR =================

/**
 * Menyimpan Auth Token kurir/relawan ke dalam SecureStore terenkripsi
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.AUTH_TOKEN, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error('FoodBridge SecureStore: Gagal menyimpan auth token:', error);
    throw new Error('Gagal mengamankan token autentikasi di Keystore.');
  }
}

/**
 * Mengambil Auth Token kurir dari SecureStore
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('FoodBridge SecureStore: Gagal membaca auth token:', error);
    return null;
  }
}

/**
 * Menghapus Auth Token kurir (Logout)
 */
export async function deleteAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('FoodBridge SecureStore: Gagal menghapus auth token:', error);
  }
}

// ================= DATA SENSITIF NIK PENERIMA MANFAAT =================

export interface VerifiedRecipientNikData {
  recipientId: string;
  rawNik: string;
  maskedNik: string;
  picName: string;
  organizationName: string;
  verifiedAt: string;
}

/**
 * Menyimpan data NIK penerima manfaat secara terenkripsi di Hardware Keystore/Keychain
 */
export async function saveRecipientNik(
  recipientId: string,
  rawNik: string,
  metadata: { picName: string; organizationName: string }
): Promise<VerifiedRecipientNikData> {
  if (!isValidNik(rawNik)) {
    throw new Error('Format NIK tidak valid. NIK harus terdiri dari 16 digit angka.');
  }

  const key = `${SECURE_KEYS.RECIPIENT_NIK_PREFIX}${recipientId}`;
  const payload: VerifiedRecipientNikData = {
    recipientId,
    rawNik: rawNik.trim(),
    maskedNik: maskNik(rawNik),
    picName: metadata.picName,
    organizationName: metadata.organizationName,
    verifiedAt: new Date().toISOString(),
  };

  try {
    // Enkripsi JSON string di dalam SecureStore
    await SecureStore.setItemAsync(key, JSON.stringify(payload), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return payload;
  } catch (error) {
    console.error(`FoodBridge SecureStore: Gagal mengenkripsi NIK [${key}]:`, error);
    throw new Error('Gagal menyimpan NIK terenkripsi ke hardware storage.');
  }
}

/**
 * Membaca data NIK penerima manfaat yang terenkripsi dan mendekripsinya
 */
export async function getRecipientNik(recipientId: string): Promise<VerifiedRecipientNikData | null> {
  const key = `${SECURE_KEYS.RECIPIENT_NIK_PREFIX}${recipientId}`;
  try {
    const rawData = await SecureStore.getItemAsync(key);
    if (!rawData) return null;
    return JSON.parse(rawData) as VerifiedRecipientNikData;
  } catch (error) {
    console.error(`FoodBridge SecureStore: Gagal membaca NIK [${key}]:`, error);
    return null;
  }
}

/**
 * Menghapus data NIK terenkripsi
 */
export async function deleteRecipientNik(recipientId: string): Promise<void> {
  const key = `${SECURE_KEYS.RECIPIENT_NIK_PREFIX}${recipientId}`;
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`FoodBridge SecureStore: Gagal menghapus NIK [${key}]:`, error);
  }
}

/**
 * Memeriksa ketersediaan hardware Keystore pada perangkat saat ini
 */
export async function isHardwareKeystoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}
