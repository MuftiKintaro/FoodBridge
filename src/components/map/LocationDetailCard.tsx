/**
 * FoodBridge - Kartu Detail Lokasi Interaktif (Bottom Card)
 * Menampilkan rincian surplus makanan/kebutuhan pangan dan kalkulasi jarak Haversine real-time
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodLocation } from '../../types/foodRescue';
import { estimateCourierTravelTime } from '../../utils/haversine';

interface LocationDetailCardProps {
  location: FoodLocation;
  isCurrentTarget: boolean;
  onSetAsTarget: (location: FoodLocation) => void;
  onClearTarget: () => void;
  onClose: () => void;
}

export const LocationDetailCard: React.FC<LocationDetailCardProps> = ({
  location,
  isCurrentTarget,
  onSetAsTarget,
  onClearTarget,
  onClose,
}) => {
  const isDonor = location.type === 'DONOR';
  const travelEstimate = estimateCourierTravelTime(location.distanceInKm || 0);

  const handleContactPress = () => {
    Alert.alert(
      'Kontak Lokasi',
      `Hubungi ${location.contactPerson} (${location.phone})?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Panggil', onPress: () => console.log('Dialing:', location.phone) },
      ]
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* Handle Bar */}
      <View style={styles.handleBar} />

      {/* Header Baris 1: Kategori Badge & Jarak Haversine */}
      <View style={styles.headerRow}>
        <View style={styles.typeBadgeContainer}>
          <View
            style={[
              styles.typeBadge,
              isDonor ? styles.donorTypeBadge : styles.recipientTypeBadge,
            ]}
          >
            <MaterialCommunityIcons
              name={isDonor ? 'food-apple' : 'hand-heart'}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.typeBadgeText}>
              {isDonor ? 'DONATUR SURPLUS' : 'PENERIMA MANFAAT'}
            </Text>
          </View>
          <Text style={styles.categorySubLabel}>{location.categoryLabel}</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Nama & Alamat Lokasi */}
      <Text style={styles.locationTitle}>{location.name}</Text>
      <View style={styles.addressRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />
        <Text style={styles.addressText} numberOfLines={1}>
          {location.address}
        </Text>
      </View>

      {/* Box Komputasi Spasial Haversine & Estimasi Tempuh */}
      <View style={styles.haversineBox}>
        <View style={styles.haversineCol}>
          <Text style={styles.haversineLabel}>Jarak Haversine</Text>
          <View style={styles.haversineValueRow}>
            <MaterialCommunityIcons name="map-marker-distance" size={16} color="#059669" />
            <Text style={styles.haversineDistance}>
              {location.formattedDistance || 'Menghitung...'}
            </Text>
          </View>
        </View>

        <View style={styles.haversineDivider} />

        <View style={styles.haversineCol}>
          <Text style={styles.haversineLabel}>Estimasi Kurir Motor</Text>
          <View style={styles.haversineValueRow}>
            <MaterialCommunityIcons name="motorbike" size={16} color="#0284C7" />
            <Text style={styles.haversineTravelTime}>{travelEstimate.formatted}</Text>
          </View>
        </View>

        <View style={styles.haversineDivider} />

        <View style={styles.haversineCol}>
          <Text style={styles.haversineLabel}>Kecamatan</Text>
          <Text style={styles.haversineDistrict}>{location.district}</Text>
        </View>
      </View>

      {/* Content Scrollable (Surplus Items atau Kebutuhan Panti) */}
      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {isDonor && location.surplusDetails && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Surplus Makanan ({location.surplusDetails.totalPortions} Porsi)
              </Text>
              <View style={styles.timeWindowBadge}>
                <MaterialCommunityIcons name="clock-outline" size={12} color="#047857" />
                <Text style={styles.timeWindowText}>{location.surplusDetails.pickupWindow}</Text>
              </View>
            </View>

            {location.surplusDetails.items.map((item, idx) => (
              <View key={idx} style={styles.foodItemCard}>
                <View style={styles.foodItemHeader}>
                  <Text style={styles.foodItemName}>{item.name}</Text>
                  <Text style={styles.foodItemPortion}>
                    {item.portions} {item.unit}
                  </Text>
                </View>
                <Text style={styles.foodItemDesc}>{item.description}</Text>
                <View style={styles.foodItemFooter}>
                  <View style={styles.expiryBadge}>
                    <MaterialCommunityIcons name="timer-sand" size={12} color="#B45309" />
                    <Text style={styles.expiryText}>Batas: {item.expiryTime}</Text>
                  </View>
                  <Text style={styles.safeUntilText}>Sisa: {item.safeUntilHours} jam</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isDonor && location.recipientDetails && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Kebutuhan: {location.recipientDetails.neededPortions} Porsi
              </Text>
              <View
                style={[
                  styles.urgencyBadge,
                  location.recipientDetails.urgency === 'HIGH'
                    ? styles.urgencyHigh
                    : styles.urgencyMedium,
                ]}
              >
                <Text style={styles.urgencyText}>
                  Urgensi: {location.recipientDetails.urgency === 'HIGH' ? 'TINGGI' : 'SEDANG'}
                </Text>
              </View>
            </View>

            <View style={styles.recipientInfoBox}>
              <Text style={styles.beneficiaryTitle}>Penerima Manfaat:</Text>
              <Text style={styles.beneficiaryDesc}>
                {location.recipientDetails.targetAudience}
              </Text>
              <Text style={styles.notesTitle}>Catatan Penyaluran:</Text>
              <Text style={styles.notesText}>{location.recipientDetails.notes}</Text>
            </View>
          </View>
        )}

        {/* Informasi Kontak Penanggung Jawab */}
        <View style={styles.contactRow}>
          <MaterialCommunityIcons name="account-circle-outline" size={18} color="#475569" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{location.contactPerson}</Text>
            <Text style={styles.contactPhone}>{location.phone}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleContactPress}>
            <MaterialCommunityIcons name="phone" size={16} color="#059669" />
            <Text style={styles.callButtonText}>Hubungi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Tombol Aksi Utama: Set Target Adaptive */}
      <View style={styles.actionRow}>
        {isCurrentTarget ? (
          <TouchableOpacity
            style={styles.clearTargetBtn}
            onPress={onClearTarget}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="target-variant" size={18} color="#DC2626" />
            <Text style={styles.clearTargetBtnText}>Batalkan Titik Target</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.setTargetBtn, isDonor ? styles.setTargetDonor : styles.setTargetRecipient]}
            onPress={() => onSetAsTarget(location)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="navigation" size={18} color="#FFFFFF" />
            <Text style={styles.setTargetBtnText}>
              Jadikan Titik Tujuan (Memicu High Accuracy)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  donorTypeBadge: {
    backgroundColor: '#059669',
  },
  recipientTypeBadge: {
    backgroundColor: '#EA580C',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categorySubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  locationTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  haversineBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  haversineCol: {
    flex: 1,
    alignItems: 'center',
  },
  haversineLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  haversineValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  haversineDistance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  haversineTravelTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  haversineDistrict: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  haversineDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
  },
  scrollArea: {
    maxHeight: 160,
    marginBottom: 10,
  },
  contentSection: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  timeWindowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeWindowText: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '600',
  },
  foodItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  foodItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  foodItemPortion: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
  },
  foodItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  foodItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  expiryText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  safeUntilText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgencyHigh: {
    backgroundColor: '#FEE2E2',
  },
  urgencyMedium: {
    backgroundColor: '#FFEDD5',
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  recipientInfoBox: {
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EA580C',
  },
  beneficiaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
  beneficiaryDesc: {
    fontSize: 11,
    color: '#431407',
    marginBottom: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
  },
  notesText: {
    fontSize: 11,
    color: '#431407',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  contactName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  contactPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  actionRow: {
    marginTop: 6,
  },
  setTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  setTargetDonor: {
    backgroundColor: '#059669',
  },
  setTargetRecipient: {
    backgroundColor: '#EA580C',
  },
  setTargetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  clearTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  clearTargetBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
});
