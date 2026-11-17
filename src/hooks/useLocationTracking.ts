/**
 * FoodBridge - Custom Hook Pelacakan Lokasi Real-Time dengan Adaptive Interval
 * 
 * Fitur Utama:
 * 1. Manajemen foreground location permissions (Android & iOS).
 * 2. Penanganan status loading, offline GPS, dan error handling ramah pengguna.
 * 3. Pemantauan posisi kurir/pengguna secara dinamis via `Location.watchPositionAsync`.
 * 4. Adaptive Tracking Engine: Menyesuaikan distanceInterval & timeInterval berdasarkan:
 *    - Kecepatan gerak (speed > 2 m/s / ~7.2 km/h) -> High Accuracy (5m)
 *    - Jarak ke titik target (radius < 500m) -> High Accuracy (5m)
 *    - Kondisi diam/jauh -> Battery Saver (30m)
 * 5. Fallback ke koordinat Kota Malang jika running di emulator tanpa mock GPS atau izin belum diberikan.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { GeoCoordinates, TrackingMode } from '../types/location';
import { calculateHaversineDistanceMeters } from '../utils/haversine';
import { DEFAULT_MALANG_COORDINATES } from '../data/mockFoodLocations';

interface UseLocationTrackingOptions {
  initialTarget?: GeoCoordinates | null;
  autoStart?: boolean;
}

export interface UseLocationTrackingReturn {
  userLocation: GeoCoordinates;
  isRealLocation: boolean; // false jika sedang memakai mock fallback
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  trackingMode: TrackingMode;
  distanceInterval: number; // dalam meter
  timeInterval: number;     // dalam ms
  currentSpeedKmH: number;
  isMoving: boolean;
  lastUpdated: Date | null;
  targetLocation: GeoCoordinates | null;
  manualOverrideMode: TrackingMode | null;
  setTargetLocation: (target: GeoCoordinates | null) => void;
  setManualOverrideMode: (mode: TrackingMode | null) => void;
  recenterToMalangDefault: () => void;
  requestPermissionAndStart: () => Promise<void>;
}

// Konfigurasi Interval Adaptive
const CONFIG_HIGH_ACCURACY = {
  distanceInterval: 5,     // 5 meter untuk presisi tinggi saat dekat tujuan atau bergerak cepat
  timeInterval: 2000,      // 2 detik
  accuracy: Location.Accuracy.High,
};

const CONFIG_BATTERY_SAVER = {
  distanceInterval: 30,    // 30 meter untuk menghemat daya baterai
  timeInterval: 10000,     // 10 detik
  accuracy: Location.Accuracy.Balanced,
};

const SPEED_THRESHOLD_MS = 2.0; // ~7.2 km/h (kecepatan jalan cepat / berkendara)
const TARGET_PROXIMITY_THRESHOLD_M = 500; // Radius 500 meter dari penjemputan/pengantaran

export function useLocationTracking(options: UseLocationTrackingOptions = {}): UseLocationTrackingReturn {
  const [userLocation, setUserLocation] = useState<GeoCoordinates>(DEFAULT_MALANG_COORDINATES);
  const [isRealLocation, setIsRealLocation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Status Adaptive Tracking
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('BATTERY_SAVER');
  const [distanceInterval, setDistanceInterval] = useState<number>(CONFIG_BATTERY_SAVER.distanceInterval);
  const [timeInterval, setTimeInterval] = useState<number>(CONFIG_BATTERY_SAVER.timeInterval);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number>(0);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Titik target tujuan (misal lokasi penjemputan surplus atau panti asuhan)
  const [targetLocation, setTargetLocation] = useState<GeoCoordinates | null>(options.initialTarget || null);

  // Override manual untuk kemudahan demonstrasi ke dosen
  const [manualOverrideMode, setManualOverrideMode] = useState<TrackingMode | null>(null);

  // Reference watcher subscription agar dapat dibersihkan dan di-restart saat interval berubah
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const activeConfigRef = useRef({ distanceInterval: 30, timeInterval: 10000 });

  /**
   * Menentukan mode pelacakan adaptif berdasarkan kecepatan dan kedekatan tujuan
   */
  const evaluateTrackingMode = useCallback(
    (currentSpeedMs: number, coords: GeoCoordinates): TrackingMode => {
      // Jika dosen / penguji ingin melihat mode tertentu melalui tombol demonstrasi
      if (manualOverrideMode) {
        return manualOverrideMode;
      }

      // Evaluasi kecepatan
      const isMovingFast = currentSpeedMs >= SPEED_THRESHOLD_MS;

      // Evaluasi kedekatan dengan target (radius < 500m)
      let isNearTarget = false;
      if (targetLocation) {
        const distanceToTarget = calculateHaversineDistanceMeters(coords, targetLocation);
        if (distanceToTarget <= TARGET_PROXIMITY_THRESHOLD_M) {
          isNearTarget = true;
        }
      }

      if (isMovingFast || isNearTarget) {
        return 'HIGH_ACCURACY';
      }

      return 'BATTERY_SAVER';
    },
    [manualOverrideMode, targetLocation]
  );

  /**
   * Mengatur watcher lokasi dengan parameter dinamis
   */
  const startWatching = useCallback(
    async (mode: TrackingMode) => {
      try {
        const config = mode === 'HIGH_ACCURACY' ? CONFIG_HIGH_ACCURACY : CONFIG_BATTERY_SAVER;

        // Bersihkan subscription lama jika ada
        if (subscriptionRef.current) {
          subscriptionRef.current.remove();
          subscriptionRef.current = null;
        }

        activeConfigRef.current = {
          distanceInterval: config.distanceInterval,
          timeInterval: config.timeInterval,
        };

        setDistanceInterval(config.distanceInterval);
        setTimeInterval(config.timeInterval);
        setTrackingMode(mode);

        const sub = await Location.watchPositionAsync(
          {
            accuracy: config.accuracy,
            distanceInterval: config.distanceInterval,
            timeInterval: config.timeInterval,
          },
          (loc) => {
            const rawSpeed = loc.coords.speed !== null && loc.coords.speed !== undefined ? Math.max(0, loc.coords.speed) : 0;
            const speedKmH = Number((rawSpeed * 3.6).toFixed(1));
            const moving = rawSpeed >= 0.8;

            const newCoords: GeoCoordinates = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              altitude: loc.coords.altitude,
              accuracy: loc.coords.accuracy,
              altitudeAccuracy: loc.coords.altitudeAccuracy,
              heading: loc.coords.heading,
              speed: rawSpeed,
            };

            setUserLocation(newCoords);
            setIsRealLocation(true);
            setCurrentSpeedKmH(speedKmH);
            setIsMoving(moving);
            setLastUpdated(new Date(loc.timestamp));
            setIsLoading(false);
            setError(null);

            // Re-evaluasi mode apakah perlu beralih ke High Accuracy atau Battery Saver
            const nextMode = evaluateTrackingMode(rawSpeed, newCoords);
            if (nextMode !== mode) {
              startWatching(nextMode);
            }
          }
        );

        subscriptionRef.current = sub;
      } catch (err) {
        console.warn('FoodBridge: Gagal memulai watchPositionAsync:', err);
        setError('Gagal membaca sensor lokasi real-time. Menggunakan koordinat cadangan.');
        setIsLoading(false);
      }
    },
    [evaluateTrackingMode]
  );

  /**
   * Meminta izin lokasi dan menginisialisasi pelacakan
   */
  const requestPermissionAndStart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Cek apakah layanan GPS aktif
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setError('Layanan GPS/Lokasi perangkat nonaktif. Aktifkan GPS untuk tracking akurat.');
        setUserLocation(DEFAULT_MALANG_COORDINATES);
        setIsRealLocation(false);
        setIsLoading(false);
        return;
      }

      // 2. Minta izin akses lokasi foreground
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setHasPermission(false);
        setError('Izin akses lokasi ditolak. FoodBridge membutuhkan izin lokasi untuk menghitung jarak surplus pangan.');
        setUserLocation(DEFAULT_MALANG_COORDINATES);
        setIsRealLocation(false);
        setIsLoading(false);
        return;
      }

      setHasPermission(true);

      // 3. Ambil posisi pertama kali
      try {
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const initialCoords: GeoCoordinates = {
          latitude: initialLoc.coords.latitude,
          longitude: initialLoc.coords.longitude,
          altitude: initialLoc.coords.altitude,
          accuracy: initialLoc.coords.accuracy,
          altitudeAccuracy: initialLoc.coords.altitudeAccuracy,
          heading: initialLoc.coords.heading,
          speed: initialLoc.coords.speed || 0,
        };

        setUserLocation(initialCoords);
        setIsRealLocation(true);
        setLastUpdated(new Date(initialLoc.timestamp));

        const initialMode = evaluateTrackingMode(initialLoc.coords.speed || 0, initialCoords);
        await startWatching(initialMode);
      } catch {
        // Jika getCurrentPositionAsync timeout (sering terjadi di emulator tanpa fake GPS), gunakan default aman
        console.warn('FoodBridge: getCurrentPosition timeout, menggunakan lokasi fallback Malang.');
        setUserLocation(DEFAULT_MALANG_COORDINATES);
        setIsRealLocation(false);
        await startWatching('BATTERY_SAVER');
      }
    } catch (err) {
      console.error('FoodBridge location error:', err);
      setError('Terjadi kendala saat membaca status GPS.');
      setUserLocation(DEFAULT_MALANG_COORDINATES);
      setIsRealLocation(false);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateTrackingMode, startWatching]);

  /**
   * Reset / Recenter paksa ke koordinat default Malang
   */
  const recenterToMalangDefault = useCallback(() => {
    setUserLocation(DEFAULT_MALANG_COORDINATES);
  }, []);

  // Re-start watcher jika targetLocation atau manualOverrideMode berubah
  useEffect(() => {
    if (hasPermission) {
      const mode = evaluateTrackingMode(userLocation.speed || 0, userLocation);
      if (mode !== trackingMode) {
        startWatching(mode);
      }
    }
  }, [targetLocation, manualOverrideMode, hasPermission, evaluateTrackingMode, userLocation, trackingMode, startWatching]);

  // Inisialisasi saat hook dimount
  useEffect(() => {
    if (options.autoStart !== false) {
      requestPermissionAndStart();
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [options.autoStart, requestPermissionAndStart]);

  return {
    userLocation,
    isRealLocation,
    isLoading,
    error,
    hasPermission,
    trackingMode,
    distanceInterval,
    timeInterval,
    currentSpeedKmH,
    isMoving,
    lastUpdated,
    targetLocation,
    manualOverrideMode,
    setTargetLocation,
    setManualOverrideMode,
    recenterToMalangDefault,
    requestPermissionAndStart,
  };
}
