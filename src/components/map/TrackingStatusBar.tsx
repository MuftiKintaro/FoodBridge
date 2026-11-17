/**
 * FoodBridge - Status Bar Pelacakan Lokasi Adaptif
 * Menampilkan mode akurasi, kecepatan kurir, dan interval pembaruan GPS secara real-time.
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TrackingMode } from '../../types/location';

interface TrackingStatusBarProps {
  trackingMode: TrackingMode;
  distanceInterval: number;
  timeInterval: number;
  currentSpeedKmH: number;
  isRealLocation: boolean;
  manualOverrideMode: TrackingMode | null;
  nearestTargetDistanceFormatted?: string;
  onToggleDemoMode: () => void;
}

export const TrackingStatusBar: React.FC<TrackingStatusBarProps> = ({
  trackingMode,
  distanceInterval,
  timeInterval,
  currentSpeedKmH,
  isRealLocation,
  manualOverrideMode,
  nearestTargetDistanceFormatted,
  onToggleDemoMode,
}) => {
  const isHighAccuracy = trackingMode === 'HIGH_ACCURACY';

  return (
    <View style={styles.cardContainer}>
      {/* Baris Atas: Status Mode & Badge Demo */}
      <View style={styles.headerRow}>
        <View style={styles.modeContainer}>
          <View
            style={[
              styles.statusDot,
              isHighAccuracy ? styles.dotHighAccuracy : styles.dotBatterySaver,
            ]}
          />
          <Text style={styles.modeTitle}>
            {isHighAccuracy ? 'High Accuracy Tracking' : 'Battery Saver Mode'}
          </Text>
        </View>

        {/* Tombol Demo Switcher */}
        <TouchableOpacity
          style={styles.demoButton}
          onPress={onToggleDemoMode}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="tune-vertical" size={12} color="#047857" />
          <Text style={styles.demoButtonText}>
            {manualOverrideMode ? `Override: ${manualOverrideMode === 'HIGH_ACCURACY' ? 'HIGH' : 'SAVER'}` : 'Auto Adaptive'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Baris Bawah: Metrik Real-Time (Interval, Speed, GPS Source) */}
      <View style={styles.metricsRow}>
        {/* Metric 1: Distance Interval */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distance Interval</Text>
          <Text style={[styles.metricValue, isHighAccuracy ? styles.textHigh : styles.textSaver]}>
            {distanceInterval} m <Text style={styles.subInterval}>({timeInterval / 1000}s)</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 2: Courier Speed */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Kecepatan Kurir</Text>
          <Text style={styles.metricValue}>
            {currentSpeedKmH} <Text style={styles.subInterval}>km/h</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 3: Target Proximity or GPS status */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>
            {nearestTargetDistanceFormatted ? 'Jarak ke Target' : 'Sensor GPS'}
          </Text>
          <Text style={styles.metricValue}>
            {nearestTargetDistanceFormatted || (isRealLocation ? 'GPS Hardware' : 'Kota Malang')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotHighAccuracy: {
    backgroundColor: '#0284C7', // Biru
  },
  dotBatterySaver: {
    backgroundColor: '#059669', // Hijau
  },
  modeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  demoButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  subInterval: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94A3B8',
  },
  textHigh: {
    color: '#0284C7',
  },
  textSaver: {
    color: '#059669',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
});
