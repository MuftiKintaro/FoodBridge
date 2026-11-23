/**
 * FoodBridge - Custom Rationale Modal (Just-In-Time Permissions)
 * Memberikan penjelasan ramah privasi dalam Bahasa Indonesia sebelum memicu dialog OS.
 */

import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RationaleContent } from '../../hooks/useJustInTimePermission';

interface PermissionRationaleModalProps {
  visible: boolean;
  rationale: RationaleContent | null;
  isPermanentlyDenied: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const PermissionRationaleModal: React.FC<PermissionRationaleModalProps> = ({
  visible,
  rationale,
  isPermanentlyDenied,
  onConfirm,
  onDismiss,
}) => {
  if (!rationale) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconWrapper,
              isPermanentlyDenied ? styles.iconDenied : styles.iconNormal,
            ]}
          >
            <MaterialCommunityIcons
              name={
                isPermanentlyDenied
                  ? 'shield-alert-outline'
                  : (rationale.icon as keyof typeof MaterialCommunityIcons.glyphMap) || 'camera-outline'
              }
              size={36}
              color={isPermanentlyDenied ? '#DC2626' : '#059669'}
            />
          </View>

          {/* Judul & Deskripsi Rationale */}
          <Text style={styles.title}>
            {isPermanentlyDenied
              ? 'Izin Diperlukan dari Pengaturan'
              : rationale.title}
          </Text>

          <Text style={styles.description}>
            {isPermanentlyDenied
              ? 'Anda sebelumnya telah menolak izin ini. Untuk mendokumentasikan serah-terima makanan, silakan aktifkan izin secara manual di Pengaturan Aplikasi perangkat Anda.'
              : rationale.description}
          </Text>

          {/* Privacy Box: Sandbox & Hardware Encryption Guarantee */}
          <View style={styles.privacyBox}>
            <MaterialCommunityIcons name="shield-lock" size={16} color="#047857" />
            <Text style={styles.privacyText}>
              Jaminan Privasi: Foto disimpan dalam Sandbox Terisolasi (tidak masuk galeri foto publik) dan identitas NIK dienkripsi di Keystore.
            </Text>
          </View>

          {/* Tombol Aksi */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isPermanentlyDenied ? styles.confirmDenied : styles.confirmNormal,
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={isPermanentlyDenied ? 'cog-outline' : 'check'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.confirmButtonText}>
                {isPermanentlyDenied ? 'Buka Pengaturan' : 'Lanjutkan & Izinkan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconNormal: {
    backgroundColor: '#ECFDF5',
  },
  iconDenied: {
    backgroundColor: '#FEE2E2',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
    gap: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  confirmNormal: {
    backgroundColor: '#059669',
  },
  confirmDenied: {
    backgroundColor: '#DC2626',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
