/**
 * FoodBridge - Custom Hook Just-In-Time (JIT) Runtime Permission (Milestone 2 - Deliverable 3)
 * Mengelola izin Kamera dan Galeri secara Just-In-Time dengan modal edukasi (Rationale)
 * sebelum izin sistem diminta, serta penanganan kondisi permanently denied via openSettings().
 */

import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PermissionType = 'CAMERA' | 'MEDIA_LIBRARY';
export type JITPermissionStatus = 'UNDETERMINED' | 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED';

export interface RationaleContent {
  title: string;
  description: string;
  icon: string;
  permissionType: PermissionType;
}

const DEFAULT_RATIONALES: Record<PermissionType, RationaleContent> = {
  CAMERA: {
    title: 'Akses Kamera untuk Bukti Serah-Terima',
    description:
      'FoodBridge membutuhkan akses kamera untuk mendokumentasikan serah-terima surplus makanan dan memverifikasi identitas penerima. Seluruh foto disimpan di Sandbox Terisolasi yang tidak dapat diakses galeri publik.',
    icon: 'camera-outline',
    permissionType: 'CAMERA',
  },
  MEDIA_LIBRARY: {
    title: 'Akses Dokumen & Galeri',
    description:
      'Akses galeri diperlukan jika Anda ingin melampirkan berkas bukti atau foto identitas penerima dari penyimpanan perangkat.',
    icon: 'image-outline',
    permissionType: 'MEDIA_LIBRARY',
  },
};

export interface UseJustInTimePermissionReturn {
  isRationaleVisible: boolean;
  activeRationale: RationaleContent | null;
  isPermanentlyDenied: boolean;
  isRequesting: boolean;
  requestCameraWithJIT: () => Promise<boolean>;
  requestMediaWithJIT: () => Promise<boolean>;
  confirmRationaleAndRequest: () => Promise<boolean>;
  dismissRationale: () => void;
  openDeviceSettings: () => void;
  capturePhotoWithJIT: () => Promise<string | null>;
  pickImageFromLibraryWithJIT: () => Promise<string | null>;
}

export function useJustInTimePermission(): UseJustInTimePermissionReturn {
  const [isRationaleVisible, setIsRationaleVisible] = useState<boolean>(false);
  const [activeRationale, setActiveRationale] = useState<RationaleContent | null>(null);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  // Menyimpan callback sementara yang dieksekusi setelah pengguna menyetujui rationale modal
  const [pendingAction, setPendingAction] = useState<(() => Promise<boolean>) | null>(null);

  /**
   * Membuka halaman pengaturan aplikasi di OS (Android/iOS)
   */
  const openDeviceSettings = useCallback(() => {
    Linking.openSettings().catch((err) => {
      console.warn('FoodBridge: Tidak dapat membuka pengaturan perangkat:', err);
    });
  }, []);

  /**
   * Menutup modal Rationale
   */
  const dismissRationale = useCallback(() => {
    setIsRationaleVisible(false);
    setActiveRationale(null);
    setIsPermanentlyDenied(false);
    setPendingAction(null);
  }, []);

  /**
   * Meminta izin kamera dengan pola Just-In-Time
   */
  const requestCameraWithJIT = useCallback(async (): Promise<boolean> => {
    try {
      setIsRequesting(true);
      // 1. Cek status izin saat ini tanpa memicu pop-up OS
      const current = await ImagePicker.getCameraPermissionsAsync();

      if (current.granted) {
        setIsPermanentlyDenied(false);
        return true;
      }

      // Jika permanently denied (tidak bisa minta lagi langsung via dialog)
      if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
        setIsPermanentlyDenied(true);
        setActiveRationale(DEFAULT_RATIONALES.CAMERA);
        setIsRationaleVisible(true);
        return false;
      }

      // Tampilkan Custom Rationale Modal terlebih dahulu sebelum sistem memicu pop-up
      setActiveRationale(DEFAULT_RATIONALES.CAMERA);
      setIsPermanentlyDenied(false);
      setIsRationaleVisible(true);

      return new Promise<boolean>((resolve) => {
        setPendingAction(() => async () => {
          const req = await ImagePicker.requestCameraPermissionsAsync();
          if (req.granted) {
            resolve(true);
            return true;
          }
          if (!req.canAskAgain) {
            setIsPermanentlyDenied(true);
          }
          resolve(false);
          return false;
        });
      });
    } catch (error) {
      console.error('FoodBridge JIT Camera Permission Error:', error);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  /**
   * Meminta izin media/galeri dengan pola Just-In-Time
   */
  const requestMediaWithJIT = useCallback(async (): Promise<boolean> => {
    try {
      setIsRequesting(true);
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (current.granted) {
        setIsPermanentlyDenied(false);
        return true;
      }

      if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
        setIsPermanentlyDenied(true);
        setActiveRationale(DEFAULT_RATIONALES.MEDIA_LIBRARY);
        setIsRationaleVisible(true);
        return false;
      }

      setActiveRationale(DEFAULT_RATIONALES.MEDIA_LIBRARY);
      setIsPermanentlyDenied(false);
      setIsRationaleVisible(true);

      return new Promise<boolean>((resolve) => {
        setPendingAction(() => async () => {
          const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (req.granted) {
            resolve(true);
            return true;
          }
          if (!req.canAskAgain) {
            setIsPermanentlyDenied(true);
          }
          resolve(false);
          return false;
        });
      });
    } catch (error) {
      console.error('FoodBridge JIT Media Permission Error:', error);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  /**
   * Dijalankan saat pengguna menekan tombol "Lanjutkan & Berikan Izin" pada Rationale Modal
   */
  const confirmRationaleAndRequest = useCallback(async (): Promise<boolean> => {
    if (isPermanentlyDenied) {
      openDeviceSettings();
      dismissRationale();
      return false;
    }

    if (pendingAction) {
      setIsRationaleVisible(false);
      const result = await pendingAction();
      setPendingAction(null);
      return result;
    }

    setIsRationaleVisible(false);
    return false;
  }, [isPermanentlyDenied, openDeviceSettings, dismissRationale, pendingAction]);

  /**
   * Alur lengkap: Meminta izin JIT lalu membuka kamera untuk mengambil foto
   */
  const capturePhotoWithJIT = useCallback(async (): Promise<string | null> => {
    const granted = await requestCameraWithJIT();
    if (!granted) {
      // Jika izin belum granted saat dipanggil pertama kali, tunggu user merespons rationale
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } catch (err) {
      console.warn('FoodBridge: Kamera fisik tidak tersedia (mungkin di simulator), membuka fallback galeri:', err);
      // Fallback ramah jika running di emulator PC yang tidak memiliki web-camera virtual
      return pickImageFromLibraryWithJIT();
    }
  }, [requestCameraWithJIT]);

  /**
   * Membuka pemilih gambar dari penyimpanan perangkat dengan JIT
   */
  const pickImageFromLibraryWithJIT = useCallback(async (): Promise<string | null> => {
    const granted = await requestMediaWithJIT();
    if (!granted) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } catch (err) {
      console.error('FoodBridge ImagePicker Error:', err);
      return null;
    }
  }, [requestMediaWithJIT]);

  return {
    isRationaleVisible,
    activeRationale,
    isPermanentlyDenied,
    isRequesting,
    requestCameraWithJIT,
    requestMediaWithJIT,
    confirmRationaleAndRequest,
    dismissRationale,
    openDeviceSettings,
    capturePhotoWithJIT,
    pickImageFromLibraryWithJIT,
  };
}
