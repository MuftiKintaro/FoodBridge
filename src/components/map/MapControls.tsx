/**
 * FoodBridge - Floating Action Controls Peta
 * Tombol Recenter posisi kurir dan simulator kecepatan pergerakan
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MapControlsProps {
  onRecenter: () => void;
  onSimulateMovementToggle: () => void;
  isSimulatingMovement: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onSimulateMovementToggle,
  isSimulatingMovement,
}) => {
  return (
    <View style={styles.container}>
      {/* Tombol Simulasi Gerak Kurir (Demo Kecepatan > 7 km/h) */}
      <TouchableOpacity
        style={[
          styles.fab,
          isSimulatingMovement ? styles.fabSimActive : styles.fabDefault,
        ]}
        onPress={onSimulateMovementToggle}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name={isSimulatingMovement ? 'speedometer' : 'speedometer-slow'}
          size={20}
          color={isSimulatingMovement ? '#FFFFFF' : '#0284C7'}
        />
        <Text style={[styles.fabBadgeText, isSimulatingMovement && styles.fabBadgeTextActive]}>
          {isSimulatingMovement ? 'Gerak' : 'Diam'}
        </Text>
      </TouchableOpacity>

      {/* Tombol Recenter GPS */}
      <TouchableOpacity
        style={[styles.fab, styles.fabDefault]}
        onPress={onRecenter}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#059669" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
  },
  fabDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  fabSimActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  fabBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: -2,
  },
  fabBadgeTextActive: {
    color: '#FFFFFF',
  },
});
