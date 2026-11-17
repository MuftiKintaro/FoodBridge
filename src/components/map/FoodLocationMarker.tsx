/**
 * FoodBridge - Custom Marker Lokasi Donatur & Penerima Manfaat
 * Palet Warna Eco-friendly:
 * - Donatur: Hijau Emerald (#059669)
 * - Penerima: Oranye Hangat (#EA580C)
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodLocation } from '../../types/foodRescue';

interface FoodLocationMarkerProps {
  location: FoodLocation;
  isSelected: boolean;
  isTarget: boolean;
  onPress: (location: FoodLocation) => void;
}

export const FoodLocationMarker: React.FC<FoodLocationMarkerProps> = ({
  location,
  isSelected,
  isTarget,
  onPress,
}) => {
  const isDonor = location.type === 'DONOR';

  // Penentuan icon berdasarkan kategori
  const getIconName = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (location.category) {
      case 'HOTEL':
        return 'office-building';
      case 'RESTAURANT':
        return 'silverware-fork-knife';
      case 'BAKERY':
        return 'bread-slice';
      case 'GROCERY':
        return 'fruit-cherries';
      case 'CATERING':
        return 'pot-steam';
      case 'ORPHANAGE':
        return 'home-heart';
      case 'COMMUNITY':
        return 'account-group';
      case 'SHELTER':
        return 'home-city';
      default:
        return isDonor ? 'food' : 'hand-heart';
    }
  };

  const badgeCount = isDonor
    ? location.surplusDetails?.totalPortions || 0
    : location.recipientDetails?.neededPortions || 0;

  const badgeSuffix = isDonor ? 'prs' : 'bth';

  return (
    <Marker
      coordinate={{
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
      }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={() => onPress(location)}
      tracksViewChanges={false}
    >
      <View style={styles.markerWrapper}>
        {/* Indikator Titik Target Aktif */}
        {isTarget && (
          <View style={[styles.targetIndicator, isDonor ? styles.targetDonor : styles.targetRecipient]}>
            <Text style={styles.targetIndicatorText}>TARGET TUJUAN</Text>
          </View>
        )}

        {/* Pin Body */}
        <View
          style={[
            styles.pinContainer,
            isDonor ? styles.donorPin : styles.recipientPin,
            isSelected && styles.selectedPin,
          ]}
        >
          <MaterialCommunityIcons
            name={getIconName()}
            size={18}
            color="#FFFFFF"
          />

          {/* Badge Jumlah Porsi */}
          <View
            style={[
              styles.portionBadge,
              isDonor ? styles.donorBadge : styles.recipientBadge,
            ]}
          >
            <Text style={styles.portionText}>
              {badgeCount} {badgeSuffix}
            </Text>
          </View>
        </View>

        {/* Segitiga Bawah Pin */}
        <View
          style={[
            styles.pinTip,
            isDonor ? styles.donorTip : styles.recipientTip,
            isSelected && styles.selectedTip,
          ]}
        />

        {/* Bayangan Pin */}
        <View style={styles.pinShadow} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  targetIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  targetDonor: {
    backgroundColor: '#047857',
  },
  targetRecipient: {
    backgroundColor: '#C2410C',
  },
  targetIndicatorText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  donorPin: {
    backgroundColor: '#059669', // Emerald Green
  },
  recipientPin: {
    backgroundColor: '#EA580C', // Warm Orange
  },
  selectedPin: {
    transform: [{ scale: 1.15 }],
    borderColor: '#FEF08A',
    borderWidth: 2.5,
  },
  portionBadge: {
    marginLeft: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  donorBadge: {
    backgroundColor: '#064E3B',
  },
  recipientBadge: {
    backgroundColor: '#7C2D12',
  },
  portionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pinTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
  donorTip: {
    borderTopColor: '#059669',
  },
  recipientTip: {
    borderTopColor: '#EA580C',
  },
  selectedTip: {
    borderTopColor: '#FEF08A',
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 1,
  },
});
