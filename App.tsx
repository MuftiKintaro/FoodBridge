/**
 * FoodBridge - Zero-Waste Food Rescue Mobile App
 * Judul Proyek: FoodBridge: Aplikasi Mobile Zero-Waste Food Rescue Berbasis Algoritma Haversine dan Tracking Real-Time
 * Milestone 1: Modul LBS & Interactive Mapping Engine
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FoodBridgeMap } from './src/components/map/FoodBridgeMap';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FoodBridgeMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
