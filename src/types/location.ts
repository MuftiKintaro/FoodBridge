/**
 * FoodBridge - Tipe Data Lokasi dan Komputasi Spasial
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null; // dalam meter per detik (m/s)
}

export type TrackingMode = 'HIGH_ACCURACY' | 'BATTERY_SAVER';

export interface TrackingAdaptiveConfig {
  mode: TrackingMode;
  distanceInterval: number; // dalam meter
  timeInterval: number;     // dalam milidetik
  description: string;
}

export interface LocationTrackingState {
  userLocation: GeoCoordinates | null;
  isUsingFallback: boolean;
  isLoading: boolean;
  error: string | null;
  trackingMode: TrackingMode;
  distanceInterval: number;
  timeInterval: number;
  currentSpeedKmH: number;
  isMoving: boolean;
  lastUpdated: Date | null;
}
