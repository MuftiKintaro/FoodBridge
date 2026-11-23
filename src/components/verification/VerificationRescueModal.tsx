/**
 * FoodBridge - Layar Verifikasi Serah-Terima & Offline-First Vault (Milestone 2)
 * Mengintegrasikan:
 * 1. Enkripsi Hardware Keystore/Keychain via expo-secure-store (NIK & Token Kurir).
 * 2. Scoped Storage Sandbox via documentDirectory (Foto bukti terisolasi & Queue JSON offline).
 * 3. Just-In-Time Runtime Permission (Kamera/Media).
 * 4. Panel Security & Sandbox Inspector khusus untuk presentasi/demo dosen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FoodLocation } from '../../types/foodRescue';
import {
  saveRecipientNik,
  getRecipientNik,
  maskNik,
  isValidNik,
  saveAuthToken,
  getAuthToken,
  isHardwareKeystoreAvailable,
  VerifiedRecipientNikData,
} from '../../services/secureStorage';
import {
  savePhotoToSandbox,
  enqueueOfflineRescue,
  getOfflineRescueQueue,
  syncOfflineRescueQueue,
  getSandboxStorageStats,
  getSandboxFilesList,
  OfflineRescueRecord,
  SandboxStorageStats,
  SandboxFileInfo,
  SavedSandboxMedia,
} from '../../services/sandboxStorage';
import { useJustInTimePermission } from '../../hooks/useJustInTimePermission';
import { PermissionRationaleModal } from '../permissions/PermissionRationaleModal';

interface VerificationRescueModalProps {
  visible: boolean;
  location: FoodLocation | null;
  onClose: () => void;
  onSuccessRescue?: () => void;
}

export const VerificationRescueModal: React.FC<VerificationRescueModalProps> = ({
  visible,
  location,
  onClose,
  onSuccessRescue,
}) => {
  // Form State
  const [picName, setPicName] = useState<string>('');
  const [nikInput, setNikInput] = useState<string>('');
  const [portions, setPortions] = useState<string>('20');
  const [notes, setNotes] = useState<string>('');
  const [savedNikData, setSavedNikData] = useState<VerifiedRecipientNikData | null>(null);
  const [showRawNik, setShowRawNik] = useState<boolean>(false);

  // Media Bukti di Sandbox
  const [capturedPhoto, setCapturedPhoto] = useState<SavedSandboxMedia | null>(null);

  // Simulasi Jaringan (Online vs Minim Sinyal Offline)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inspector State (Untuk Demo Dosen)
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [isKeystoreReady, setIsKeystoreReady] = useState<boolean>(true);
  const [courierToken, setCourierToken] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<SandboxStorageStats | null>(null);
  const [sandboxFiles, setSandboxFiles] = useState<SandboxFileInfo[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineRescueRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // JIT Permission Hook
  const {
    isRationaleVisible,
    activeRationale,
    isPermanentlyDenied,
    capturePhotoWithJIT,
    pickImageFromLibraryWithJIT,
    confirmRationaleAndRequest,
    dismissRationale,
  } = useJustInTimePermission();

  // Inisialisasi data form saat lokasi berganti
  useEffect(() => {
    if (location) {
      setPicName(location.contactPerson || '');
      const defaultPortions = location.type === 'DONOR'
        ? location.surplusDetails?.totalPortions || 20
        : location.recipientDetails?.neededPortions || 25;
      setPortions(String(defaultPortions));
      loadSavedNik(location.id);
    }
  }, [location]);

  // Load status inspector saat modal dibuka
  useEffect(() => {
    if (visible) {
      refreshInspectorData();
    }
  }, [visible]);

  const loadSavedNik = async (locId: string) => {
    const data = await getRecipientNik(locId);
    if (data) {
      setSavedNikData(data);
      setNikInput(data.rawNik);
    } else {
      setSavedNikData(null);
      setNikInput('');
    }
  };

  const refreshInspectorData = async () => {
    try {
      const keystoreOk = await isHardwareKeystoreAvailable();
      setIsKeystoreReady(keystoreOk);

      // Cek atau inisialisasi dummy token kurir untuk demo
      let token = await getAuthToken();
      if (!token) {
        const demoToken = `fb_jwt_secure_${Date.now()}_courier_mlg_01`;
        await saveAuthToken(demoToken);
        token = demoToken;
      }
      setCourierToken(token);

      const stats = await getSandboxStorageStats();
      setStorageStats(stats);

      const files = await getSandboxFilesList();
      setSandboxFiles(files);

      const queue = await getOfflineRescueQueue();
      setOfflineQueue(queue);
    } catch (err) {
      console.warn('FoodBridge: Gagal memuat data inspector:', err);
    }
  };

  // Handler simpan NIK ke SecureStore
  const handleSaveNikSecurely = async () => {
    if (!location) return;
    if (!isValidNik(nikInput)) {
      Alert.alert(
        'Format NIK Salah',
        'NIK harus terdiri dari 16 digit angka sesuai KTP Republik Indonesia.'
      );
      return;
    }

    try {
      const result = await saveRecipientNik(location.id, nikInput, {
        picName: picName || location.contactPerson,
        organizationName: location.name,
      });
      setSavedNikData(result);
      Alert.alert(
        'NIK Berhasil Dienkripsi!',
        `NIK penerima (${result.maskedNik}) telah disimpan di Hardware Keystore. Aman dari pencurian data.`
      );
      refreshInspectorData();
    } catch (err) {
      Alert.alert('Gagal Enkripsi', String(err));
    }
  };

  // Handler ambil foto bukti (JIT Camera)
  const handleCapturePhoto = async () => {
    try {
      const tempUri = await capturePhotoWithJIT();
      if (tempUri && location) {
        // Pindahkan ke Scoped Storage Sandbox
        const savedMedia = await savePhotoToSandbox(tempUri, 'DELIVERY_PROOF', location.id);
        setCapturedPhoto(savedMedia);
        refreshInspectorData();
        Alert.alert(
          'Foto Diamankan di Sandbox',
          `Berkas tersimpan di Scoped Storage: ${savedMedia.fileName} (${(savedMedia.sizeBytes / 1024).toFixed(1)} KB). Foto tidak masuk galeri publik!`
        );
      }
    } catch (err) {
      Alert.alert('Gagal Mengambil Foto', String(err));
    }
  };

  // Handler pilih foto dari galeri (JIT Media Library)
  const handlePickFromLibrary = async () => {
    try {
      const tempUri = await pickImageFromLibraryWithJIT();
      if (tempUri && location) {
        const savedMedia = await savePhotoToSandbox(tempUri, 'DELIVERY_PROOF', location.id);
        setCapturedPhoto(savedMedia);
        refreshInspectorData();
        Alert.alert(
          'Foto Diimpor ke Sandbox',
          `Berkas berhasil diisolasi ke sandbox Scoped Storage: ${savedMedia.fileName}`
        );
      }
    } catch (err) {
      Alert.alert('Gagal Memilih Foto', String(err));
    }
  };

  // Handler Submit Penyelamatan Pangan (Offline-First)
  const handleSubmitRescue = async () => {
    if (!location) return;

    if (!nikInput || !isValidNik(nikInput)) {
      Alert.alert('Validasi NIK', 'Harap masukkan 16 digit NIK PIC untuk verifikasi serah-terima.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Pastikan NIK dienkripsi di Keystore
      if (!savedNikData) {
        await saveRecipientNik(location.id, nikInput, {
          picName: picName || location.contactPerson,
          organizationName: location.name,
        });
      }

      // 2. Buat record transaksi penyelamatan
      const recordId = `rescue_${Date.now()}`;
      const record: OfflineRescueRecord = {
        id: recordId,
        locationId: location.id,
        locationName: location.name,
        locationType: location.type,
        recipientPicName: picName || location.contactPerson,
        recipientNikMasked: maskNik(nikInput),
        hasEncryptedNikInSecureStore: true,
        portionsRescued: Number(portions) || 1,
        timestamp: new Date().toISOString(),
        photoSandboxUri: capturedPhoto ? capturedPhoto.sandboxUri : null,
        syncStatus: isOfflineMode ? 'PENDING_OFFLINE' : 'SYNCED',
        notes: notes || 'Penyelamatan pangan terverifikasi via FoodBridge.',
        syncedAt: isOfflineMode ? undefined : new Date().toISOString(),
      };

      // 3. Masukkan ke Antrean Offline-First Sandbox JSON
      await enqueueOfflineRescue(record);
      await refreshInspectorData();

      if (isOfflineMode) {
        Alert.alert(
          'Tersimpan di Offline Queue (Basement)',
          `Transaksi ${portions} porsi berhasil disimpan secara lokal di Sandbox JSON. Data akan otomatis disinkronkan saat kurir kembali online.`,
          [{ text: 'Selesai', onPress: () => { onClose(); onSuccessRescue?.(); } }]
        );
      } else {
        Alert.alert(
          'Serah-Terima Berhasil (Online Sync)',
          `Transaksi penyelamatan ${portions} porsi untuk ${location.name} telah diverifikasi dan disinkronkan ke server secara aman.`,
          [{ text: 'Mantap', onPress: () => { onClose(); onSuccessRescue?.(); } }]
        );
      }
    } catch (error) {
      Alert.alert('Gagal Menyimpan', String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Sinkronisasi Antrean Manual (Demo Dosen)
  const handleManualSyncQueue = async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineRescueQueue();
      await refreshInspectorData();
      Alert.alert(
        'Sinkronisasi Berhasil',
        `${result.syncedCount} transaksi offline di sandbox telah berhasil disinkronkan ke server pusat!`
      );
    } catch (err) {
      Alert.alert('Sinkronisasi Gagal', String(err));
    } finally {
      setIsSyncing(false);
    }
  };

  if (!location) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Modal */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Verifikasi Penyelamatan</Text>
            <Text style={styles.headerSubtitle}>Milestone 2 • Secure Storage & Sandbox</Text>
          </View>
          <TouchableOpacity
            style={[styles.inspectorToggleBtn, showInspector && styles.inspectorToggleActive]}
            onPress={() => setShowInspector(!showInspector)}
          >
            <MaterialCommunityIcons
              name="shield-bug-outline"
              size={20}
              color={showInspector ? '#FFFFFF' : '#059669'}
            />
          </TouchableOpacity>
        </View>

        {/* Network Simulation Bar (Online vs Basement Offline) */}
        <View style={[styles.networkBar, isOfflineMode ? styles.netOffline : styles.netOnline]}>
          <View style={styles.netInfo}>
            <MaterialCommunityIcons
              name={isOfflineMode ? 'wifi-off' : 'wifi-check'}
              size={18}
              color={isOfflineMode ? '#DC2626' : '#059669'}
            />
            <Text style={[styles.netText, isOfflineMode ? styles.netTextOffline : styles.netTextOnline]}>
              {isOfflineMode
                ? 'Mode Offline (Area Minim Sinyal / Basement)'
                : 'Mode Online (Terhubung Jaringan)'}
            </Text>
          </View>
          <View style={styles.switchWrap}>
            <Text style={styles.switchLabel}>{isOfflineMode ? 'Offline' : 'Online'}</Text>
            <Switch
              value={isOfflineMode}
              onValueChange={setIsOfflineMode}
              trackColor={{ false: '#A7F3D0', true: '#FECACA' }}
              thumbColor={isOfflineMode ? '#DC2626' : '#059669'}
            />
          </View>
        </View>

        <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {/* ================= PANEL SECURITY & SANDBOX INSPECTOR (DEMO DOSEN) ================= */}
          {showInspector && (
            <View style={styles.inspectorCard}>
              <View style={styles.inspectorHeader}>
                <MaterialCommunityIcons name="security" size={18} color="#0284C7" />
                <Text style={styles.inspectorTitle}>Hardware Keystore & Sandbox Inspector</Text>
              </View>
              <Text style={styles.inspectorNote}>
                Panel ini memverifikasi implementasi Sub-CPMK 8: Hardware Keystore & Scoped Storage Sandbox.
              </Text>

              {/* 1. Hardware Keystore / Keychain */}
              <View style={styles.inspectorSection}>
                <Text style={styles.sectionBadge}>1. EXPO-SECURE-STORE (ENKRIPSI HARDWARE)</Text>
                <View style={styles.inspectorRow}>
                  <Text style={styles.inspectorKey}>Status Keystore:</Text>
                  <Text style={styles.inspectorValSuccess}>
                    {isKeystoreReady ? 'ACTIVE (Hardware-Backed)' : 'EMULATED'}
                  </Text>
                </View>
                <View style={styles.inspectorRow}>
                  <Text style={styles.inspectorKey}>Courier Token:</Text>
                  <Text style={styles.inspectorValMono} numberOfLines={1}>
                    {courierToken || '-'}
                  </Text>
                </View>
                <View style={styles.inspectorRow}>
                  <Text style={styles.inspectorKey}>NIK Terenkripsi:</Text>
                  <Text style={styles.inspectorValMono}>
                    {savedNikData ? `${savedNikData.maskedNik} (Encrypted)` : 'Belum Tersimpan'}
                  </Text>
                </View>
              </View>

              {/* 2. Scoped Storage Sandbox */}
              <View style={styles.inspectorSection}>
                <Text style={styles.sectionBadge}>2. SCOPED STORAGE SANDBOX (documentDirectory)</Text>
                <Text style={styles.sandboxPathText} numberOfLines={2}>
                  {storageStats?.sandboxPath || '-'}
                </Text>
                <View style={styles.inspectorRow}>
                  <Text style={styles.inspectorKey}>Total Berkas Sandbox:</Text>
                  <Text style={styles.inspectorVal}>
                    {storageStats?.totalFiles || 0} file ({storageStats?.totalSizeFormatted || '0 B'})
                  </Text>
                </View>
                {sandboxFiles.slice(0, 3).map((f, i) => (
                  <Text key={i} style={styles.fileListItem} numberOfLines={1}>
                    • {f.name} ({f.sizeFormatted})
                  </Text>
                ))}
              </View>

              {/* 3. Offline Queue */}
              <View style={styles.inspectorSection}>
                <View style={styles.queueHeaderRow}>
                  <Text style={styles.sectionBadge}>3. OFFLINE-FIRST RESCUE QUEUE (JSON)</Text>
                  <TouchableOpacity
                    style={styles.syncNowButton}
                    onPress={handleManualSyncQueue}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="sync" size={12} color="#FFFFFF" />
                        <Text style={styles.syncNowText}>Sync Queue</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.inspectorVal}>
                  Antrean Pending Offline: {storageStats?.pendingOfflineCount || 0} transaksi
                </Text>
                <Text style={styles.inspectorVal}>
                  Tersinkronisasi ke Cloud: {storageStats?.syncedCount || 0} transaksi
                </Text>
              </View>
            </View>
          )}

          {/* Lokasi Info Card */}
          <View style={styles.locationSummaryCard}>
            <View style={styles.locationSummaryRow}>
              <View style={[styles.typePill, location.type === 'DONOR' ? styles.pillDonor : styles.pillRecipient]}>
                <Text style={styles.typePillText}>{location.type === 'DONOR' ? 'DONATUR' : 'PENERIMA'}</Text>
              </View>
              <Text style={styles.locationSummaryName} numberOfLines={1}>{location.name}</Text>
            </View>
            <Text style={styles.locationSummaryAddr}>{location.address}</Text>
          </View>

          {/* ================= FORM VERIFIKASI IDENTITAS & ENKRIPSI ================= */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#059669" />
              <Text style={styles.formSectionTitle}>Verifikasi Identitas PIC (NIK Terenkripsi)</Text>
            </View>
            <Text style={styles.fieldHint}>
              Data NIK akan dienkripsi secara hardware di Keystore dan dimask demi perlindungan privasi.
            </Text>

            {/* Nama PIC */}
            <Text style={styles.label}>Nama Penanggung Jawab (PIC)</Text>
            <TextInput
              style={styles.input}
              value={picName}
              onChangeText={setPicName}
              placeholder="Contoh: Ustadz Ahmad Farhan"
              placeholderTextColor="#94A3B8"
            />

            {/* Input NIK 16 Digit */}
            <View style={styles.nikLabelRow}>
              <Text style={styles.label}>Nomor Induk Kependudukan (NIK)</Text>
              {nikInput.length > 0 && (
                <TouchableOpacity onPress={() => setShowRawNik(!showRawNik)}>
                  <Text style={styles.toggleMaskText}>
                    {showRawNik ? 'Sembunyikan (Mask)' : 'Lihat Asli'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.nikInputWrap}>
              <TextInput
                style={styles.nikInput}
                value={showRawNik ? nikInput : maskNik(nikInput)}
                onChangeText={(text) => {
                  const numericOnly = text.replace(/\D/g, '').slice(0, 16);
                  setNikInput(numericOnly);
                }}
                keyboardType="numeric"
                maxLength={16}
                placeholder="16 Digit NIK KTP Penerima"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={styles.encryptButton}
                onPress={handleSaveNikSecurely}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
                <Text style={styles.encryptButtonText}>Enkripsi</Text>
              </TouchableOpacity>
            </View>

            {/* Status Enkripsi Keystore */}
            {savedNikData && (
              <View style={styles.encryptedStatusBox}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#059669" />
                <Text style={styles.encryptedStatusText}>
                  Terenkripsi di Keystore: <Text style={styles.boldText}>{savedNikData.maskedNik}</Text>
                </Text>
              </View>
            )}
          </View>

          {/* ================= DOKUMENTASI FOTO SANDBOX (JIT PERMISSION) ================= */}
          <View style={styles.formCard}>
            <View style={styles.formSectionHeader}>
              <MaterialCommunityIcons name="camera-iris" size={18} color="#0284C7" />
              <Text style={styles.formSectionTitle}>Dokumentasi Bukti Serah-Terima (Sandbox)</Text>
            </View>
            <Text style={styles.fieldHint}>
              Foto disimpan di Scoped Storage Sandbox aplikasi, terisolasi penuh dari galeri publik perangkat.
            </Text>

            {/* Tombol Ambil Foto via JIT Permission */}
            <View style={styles.mediaButtonRow}>
              <TouchableOpacity
                style={styles.cameraActionBtn}
                onPress={handleCapturePhoto}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.cameraActionBtnText}>Ambil Foto Bukti</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryActionBtn}
                onPress={handlePickFromLibrary}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="image" size={18} color="#0284C7" />
                <Text style={styles.galleryActionBtnText}>Pilih Galeri</Text>
              </TouchableOpacity>
            </View>

            {/* Preview Foto Tersimpan di Sandbox */}
            {capturedPhoto && (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: capturedPhoto.sandboxUri }} style={styles.previewImage} />
                <View style={styles.previewMeta}>
                  <View style={styles.secureTag}>
                    <MaterialCommunityIcons name="shield-check" size={12} color="#047857" />
                    <Text style={styles.secureTagText}>Scoped Storage Sandbox</Text>
                  </View>
                  <Text style={styles.previewFileName} numberOfLines={1}>{capturedPhoto.fileName}</Text>
                  <Text style={styles.previewFileSize}>
                    Ukuran: {(capturedPhoto.sizeBytes / 1024).toFixed(1)} KB • Persisten
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ================= JUMLAH PORSI & CATATAN ================= */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Jumlah Porsi Surplus yang Diserahterimakan</Text>
            <View style={styles.portionInputRow}>
              <TextInput
                style={styles.portionInput}
                value={portions}
                onChangeText={setPortions}
                keyboardType="numeric"
                placeholder="20"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.portionUnit}>Porsi Siap Santap</Text>
            </View>

            <Text style={styles.label}>Catatan Tambahan Penyelamatan</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan kondisi makanan, kemasan ramah lingkungan, dll."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Footer Action Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isOfflineMode ? styles.submitOffline : styles.submitOnline]}
            onPress={handleSubmitRescue}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={isOfflineMode ? 'tray-arrow-down' : 'cloud-check'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.submitButtonText}>
                  {isOfflineMode
                    ? 'Simpan ke Antrean Offline (Basement)'
                    : 'Verifikasi & Selesai (Online Sync)'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Custom Rationale Modal (Just-In-Time) */}
        <PermissionRationaleModal
          visible={isRationaleVisible}
          rationale={activeRationale}
          isPermanentlyDenied={isPermanentlyDenied}
          onConfirm={confirmRationaleAndRequest}
          onDismiss={dismissRationale}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  inspectorToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inspectorToggleActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  networkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  netOnline: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  netOffline: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FECACA',
  },
  netInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  netText: {
    fontSize: 11,
    fontWeight: '700',
  },
  netTextOnline: {
    color: '#047857',
  },
  netTextOffline: {
    color: '#B91C1C',
  },
  switchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  scrollBody: {
    flex: 1,
    padding: 16,
  },
  inspectorCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inspectorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
  },
  inspectorNote: {
    fontSize: 10,
    color: '#0284C7',
    marginBottom: 10,
  },
  inspectorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0284C7',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  inspectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  inspectorKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  inspectorVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  inspectorValSuccess: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  inspectorValMono: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#0284C7',
    fontWeight: '700',
    maxWidth: 200,
  },
  sandboxPathText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  fileListItem: {
    fontSize: 10,
    color: '#334155',
    marginLeft: 4,
    marginTop: 2,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncNowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillDonor: {
    backgroundColor: '#059669',
  },
  pillRecipient: {
    backgroundColor: '#EA580C',
  },
  typePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  locationSummaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  locationSummaryAddr: {
    fontSize: 11,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  nikLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleMaskText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  nikInputWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  nikInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  encryptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  encryptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  encryptedStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  encryptedStatusText: {
    fontSize: 11,
    color: '#065F46',
  },
  boldText: {
    fontWeight: '800',
  },
  mediaButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
  },
  cameraActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  galleryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 10,
  },
  galleryActionBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  photoPreviewCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 10,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
  },
  previewMeta: {
    flex: 1,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  secureTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  previewFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  previewFileSize: {
    fontSize: 10,
    color: '#64748B',
  },
  portionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  portionInput: {
    width: 80,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  portionUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitOnline: {
    backgroundColor: '#059669',
  },
  submitOffline: {
    backgroundColor: '#DC2626',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
