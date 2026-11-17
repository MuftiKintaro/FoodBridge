/**
 * FoodBridge - Custom Marker Posisi Kurir / Pengguna
 * Menampilkan avatar kurir/relawan dengan visual efek radar halo
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GeoCoordinates } from '../../types/location';

interface CustomUserMarkerProps {
  coordinate: GeoCoordinates;
  currentSpeedKmH: number;
  isMoving: boolean;
  trackingMode: 'HIGH_ACCURACY' | 'BATTERY_SAVER';
  isRealLocation: boolean;
  onPress?: () => void;
}

export const CustomUserMarker: React.FC<CustomUserMarkerProps> = ({
  coordinate,
  currentSpeedKmH,
  isMoving,
  trackingMode,
  isRealLocation,
  onPress,
}) => {
  const isHighAccuracy = trackingMode === 'HIGH_ACCURACY';

  return (
    <Marker
      coordinate={{
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={false}
      onPress={onPress}
      title="Posisi Kurir / Relawan FoodBridge"
      description={`Kecepatan: ${currentSpeedKmH} km/h • Mode: ${trackingMode}`}
    >
      <View style={styles.container}>
        {/* Halo radar efek pulse di belakang marker */}
        <View
          style={[
            styles.radarHalo,
            isHighAccuracy ? styles.radarHaloHigh : styles.radarHaloBattery,
            isMoving && styles.radarHaloMoving,
          ]}
        />

        {/* Lingkaran inti marker avatar kurir */}
        <View style={[styles.markerCore, isHighAccuracy && styles.markerCoreHigh]}>
          <MaterialCommunityIcons
            name={isMoving ? 'moped' : 'account-tie-hat'}
            size={18}
            color="#FFFFFF"
          />
        </View>

        {/* Speed tag jika sedang bergerak */}
        {currentSpeedKmH > 0 && (
          <View style={styles.speedBadge}>
            <Text style={styles.speedText}>{currentSpeedKmH} km/h</Text>
          </View>
        )}

        {/* Fallback label jika mock GPS */}
        {!isRealLocation && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>Sim GPS</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  radarHalo: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    opacity: 0.25,
  },
  radarHaloHigh: {
    backgroundColor: '#0284C7',
    transform: [{ scale: 1.2 }],
  },
  radarHaloBattery: {
    backgroundColor: '#059669',
  },
  radarHaloMoving: {
    opacity: 0.4,
    transform: [{ scale: 1.35 }],
  },
  markerCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerCoreHigh: {
    backgroundColor: '#2563EB',
    borderColor: '#E0F2FE',
  },
  speedBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  speedText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '700',
  },
  mockBadge: {
    position: 'absolute',
    top: -2,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mockBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
