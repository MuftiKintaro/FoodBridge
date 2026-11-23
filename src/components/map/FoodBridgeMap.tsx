/**
 * FoodBridge - Interactive Mapping Engine (Milestone 1)
 * Mengintegrasikan react-native-maps, komputasi spasial Haversine,
 * adaptive location tracking, serta pemetaan custom markers.
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Platform,
  Alert,
  TouchableOpacity,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useLocationTracking } from '../../hooks/useLocationTracking';
import { MOCK_FOOD_LOCATIONS } from '../../data/mockFoodLocations';
import { FoodLocation, MarkerFilterCategory } from '../../types/foodRescue';
import { GeoCoordinates, TrackingMode } from '../../types/location';
import { sortLocationsByDistance } from '../../utils/haversine';

import { CustomUserMarker } from './CustomUserMarker';
import { FoodLocationMarker } from './FoodLocationMarker';
import { TrackingStatusBar } from './TrackingStatusBar';
import { FilterPills } from './FilterPills';
import { LocationDetailCard } from './LocationDetailCard';
import { MapControls } from './MapControls';
import { VerificationRescueModal } from '../verification/VerificationRescueModal';

export const FoodBridgeMap: React.FC = () => {
  const mapRef = useRef<MapView | null>(null);

  // Filter kategori marker (ALL, DONOR, RECIPIENT)
  const [filterCategory, setFilterCategory] = useState<MarkerFilterCategory>('ALL');

  // Lokasi yang sedang dipilih untuk melihat bottom card
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | null>(null);

  // Status modal verifikasi & offline vault (Milestone 2)
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState<boolean>(false);
  const [verificationLocation, setVerificationLocation] = useState<FoodLocation | null>(null);

  // Status simulasi kecepatan kurir (untuk demonstrasi uji coba dosen)
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);

  // Custom hook pelacakan lokasi adaptif
  const {
    userLocation,
    isRealLocation,
    isLoading: isLocationLoading,
    error: locationError,
    trackingMode,
    distanceInterval,
    timeInterval,
    currentSpeedKmH,
    isMoving,
    targetLocation,
    manualOverrideMode,
    setTargetLocation,
    setManualOverrideMode,
    recenterToMalangDefault,
    requestPermissionAndStart,
  } = useLocationTracking({
    autoStart: true,
  });

  // Tampilkan peringatan jika terjadi error GPS
  useEffect(() => {
    if (locationError) {
      Alert.alert('Info Lokasi FoodBridge', locationError, [
        { text: 'Gunakan Koordinat Malang', onPress: recenterToMalangDefault },
        { text: 'Coba Lagi', onPress: requestPermissionAndStart },
      ]);
    }
  }, [locationError, recenterToMalangDefault, requestPermissionAndStart]);

  // Efek simulasi gerakan berkendara kurir (> 7 km/h) untuk demo adaptive mode
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSimulatingMovement) {
      // Saat simulasi gerak kurir aktif: set manual override ke HIGH_ACCURACY
      setManualOverrideMode('HIGH_ACCURACY');
    } else {
      setManualOverrideMode(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulatingMovement, setManualOverrideMode]);

  // Hitung jarak Haversine dari posisi kurir ke seluruh lokasi mock dan urutkan
  const sortedLocations = useMemo(() => {
    return sortLocationsByDistance(userLocation, MOCK_FOOD_LOCATIONS);
  }, [userLocation]);

  // Hitung jumlah donatur dan penerima
  const donorCount = useMemo(
    () => MOCK_FOOD_LOCATIONS.filter((l) => l.type === 'DONOR').length,
    []
  );
  const recipientCount = useMemo(
    () => MOCK_FOOD_LOCATIONS.filter((l) => l.type === 'RECIPIENT').length,
    []
  );

  // Filter lokasi berdasarkan kategori yang aktif
  const displayedLocations = useMemo(() => {
    if (filterCategory === 'DONOR') {
      return sortedLocations.filter((l) => l.type === 'DONOR');
    }
    if (filterCategory === 'RECIPIENT') {
      return sortedLocations.filter((l) => l.type === 'RECIPIENT');
    }
    return sortedLocations;
  }, [sortedLocations, filterCategory]);

  // Menemukan jarak terdekat ke target tujuan terpilih jika ada
  const nearestTargetDistanceFormatted = useMemo(() => {
    if (!targetLocation) return undefined;
    const targetMatch = sortedLocations.find(
      (loc) =>
        loc.coordinate.latitude === targetLocation.latitude &&
        loc.coordinate.longitude === targetLocation.longitude
    );
    return targetMatch?.formattedDistance;
  }, [targetLocation, sortedLocations]);

  // Handler Recenter kamera ke posisi kurir
  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      const region: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      };
      mapRef.current.animateToRegion(region, 800);
    }
  };

  // Handler klik marker
  const handleMarkerPress = (location: FoodLocation) => {
    setSelectedLocation(location);

    // Pusatkan peta sedikit di bawah marker agar ada ruang untuk bottom card
    if (mapRef.current) {
      const region: Region = {
        latitude: location.coordinate.latitude - 0.005,
        longitude: location.coordinate.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      mapRef.current.animateToRegion(region, 600);
    }
  };

  // Handler tetapkan target navigasi
  const handleSetTarget = (location: FoodLocation) => {
    setTargetLocation(location.coordinate);
    Alert.alert(
      'Target Tujuan Ditetapkan',
      `Menuju ke "${location.name}". Jarak Haversine: ${location.formattedDistance}. Sistem otomatis mengaktifkan High Accuracy Tracking saat mendekat (< 500m).`,
      [{ text: 'Siap' }]
    );
  };

  // Handler batalkan target navigasi
  const handleClearTarget = () => {
    setTargetLocation(null);
  };

  // Handler buka verifikasi serah-terima & offline vault (Milestone 2)
  const handleOpenVerification = (loc: FoodLocation) => {
    setVerificationLocation(loc);
    setIsVerificationModalVisible(true);
  };

  // Shortcut buka modal verifikasi untuk lokasi terdekat pertama
  const handleOpenGeneralVault = () => {
    const targetLoc = selectedLocation || sortedLocations[0] || MOCK_FOOD_LOCATIONS[0];
    setVerificationLocation(targetLoc);
    setIsVerificationModalVisible(true);
  };

  // Handler toggle demo mode switcher (Auto -> High Accuracy -> Battery Saver -> Auto)
  const handleToggleDemoMode = () => {
    if (!manualOverrideMode) {
      setManualOverrideMode('HIGH_ACCURACY');
    } else if (manualOverrideMode === 'HIGH_ACCURACY') {
      setManualOverrideMode('BATTERY_SAVER');
    } else {
      setManualOverrideMode(null);
    }
  };

  // Titik region awal (Malang)
  const initialRegion: Region = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Header Aplikasi FoodBridge */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <View style={styles.logoIcon}>
            <MaterialCommunityIcons name="recycle-variant" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.appTitle}>FoodBridge</Text>
            <Text style={styles.appSubtitle}>Food Rescue Map • Zero-Waste SDG 12</Text>
          </View>
        </View>

        {/* Right Header: Shortcut Offline Vault & Badge Kota */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.vaultShortcutBtn}
            onPress={handleOpenGeneralVault}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="shield-lock-outline" size={14} color="#0284C7" />
            <Text style={styles.vaultShortcutText}>Offline Vault</Text>
          </TouchableOpacity>

          <View style={styles.locationCityBadge}>
            <MaterialCommunityIcons name="map-marker-radius" size={13} color="#059669" />
            <Text style={styles.locationCityText}>Malang</Text>
          </View>
        </View>
      </View>

      {/* Komponen Peta Interaktif */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {/* Marker Posisi Kurir / Pengguna */}
          <CustomUserMarker
            coordinate={userLocation}
            currentSpeedKmH={isSimulatingMovement ? 28.5 : currentSpeedKmH}
            isMoving={isSimulatingMovement || isMoving}
            trackingMode={trackingMode}
            isRealLocation={isRealLocation}
            onPress={handleRecenter}
          />

          {/* Marker Donatur Surplus & Penerima Manfaat */}
          {displayedLocations.map((loc) => {
            const isSelected = selectedLocation?.id === loc.id;
            const isTarget =
              targetLocation?.latitude === loc.coordinate.latitude &&
              targetLocation?.longitude === loc.coordinate.longitude;

            return (
              <FoodLocationMarker
                key={loc.id}
                location={loc}
                isSelected={isSelected}
                isTarget={isTarget}
                onPress={handleMarkerPress}
              />
            );
          })}
        </MapView>

        {/* Floating Top Section: Status Bar & Kategori Filter */}
        <View style={styles.floatingTopSection}>
          <TrackingStatusBar
            trackingMode={trackingMode}
            distanceInterval={distanceInterval}
            timeInterval={timeInterval}
            currentSpeedKmH={isSimulatingMovement ? 28.5 : currentSpeedKmH}
            isRealLocation={isRealLocation}
            manualOverrideMode={manualOverrideMode}
            nearestTargetDistanceFormatted={nearestTargetDistanceFormatted}
            onToggleDemoMode={handleToggleDemoMode}
          />

          <FilterPills
            activeFilter={filterCategory}
            onSelectFilter={setFilterCategory}
            donorCount={donorCount}
            recipientCount={recipientCount}
          />
        </View>

        {/* Floating Action Controls (Recenter & Demo Speed Simulator) */}
        {!selectedLocation && (
          <MapControls
            onRecenter={handleRecenter}
            onSimulateMovementToggle={() => setIsSimulatingMovement(!isSimulatingMovement)}
            isSimulatingMovement={isSimulatingMovement}
          />
        )}

        {/* Bottom Card Detail Lokasi saat marker diklik */}
        {selectedLocation && (
          <View style={styles.bottomCardWrapper}>
            <LocationDetailCard
              location={
                sortedLocations.find((l) => l.id === selectedLocation.id) || selectedLocation
              }
              isCurrentTarget={
                targetLocation?.latitude === selectedLocation.coordinate.latitude &&
                targetLocation?.longitude === selectedLocation.coordinate.longitude
              }
              onSetAsTarget={handleSetTarget}
              onClearTarget={handleClearTarget}
              onClose={() => setSelectedLocation(null)}
              onOpenVerification={handleOpenVerification}
            />
          </View>
        )}

        {/* Modal Verifikasi Serah-Terima & Offline Vault (Milestone 2) */}
        <VerificationRescueModal
          visible={isVerificationModalVisible}
          location={verificationLocation}
          onClose={() => setIsVerificationModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  locationCityBadge: {
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  vaultShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  locationCityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingTopSection: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    gap: 8,
  },
  bottomCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
