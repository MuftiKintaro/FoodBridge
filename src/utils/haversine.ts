/**
 * FoodBridge - Modul Komputasi Spasial Haversine
 * 
 * Mengimplementasikan Formula Haversine murni untuk menghitung jarak lurus (great-circle distance)
 * antara dua titik koordinat bola bumi (lintang & bujur).
 * 
 * Formula:
 * a = sin²(Δlat / 2) + cos(lat1) * cos(lat2) * sin²(Δlon / 2)
 * c = 2 * atan2(√a, √(1 − a))
 * d = R * c
 * 
 * dengan R = 6371 km (Radius rata-rata bumi)
 */

import { GeoCoordinates } from '../types/location';

// Radius rata-rata bumi
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_METERS = 6371000;

/**
 * Mengonversi derajat sudut ke radian
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak lurus antara dua koordinat menggunakan Formulasi Haversine dalam satuan Kilometer (km).
 * 
 * @param coord1 Koordinat titik asal { latitude, longitude }
 * @param coord2 Koordinat titik tujuan { latitude, longitude }
 * @returns Jarak dalam kilometer (presisi desimal)
 */
export function calculateHaversineDistanceKm(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const lat1 = coord1.latitude;
  const lon1 = coord1.longitude;
  const lat2 = coord2.latitude;
  const lon2 = coord2.longitude;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Menghitung jarak lurus antara dua koordinat menggunakan Formulasi Haversine dalam satuan Meter (m).
 * 
 * @param coord1 Koordinat titik asal
 * @param coord2 Koordinat titik tujuan
 * @returns Jarak dalam meter
 */
export function calculateHaversineDistanceMeters(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const distanceKm = calculateHaversineDistanceKm(coord1, coord2);
  return distanceKm * 1000;
}

/**
 * Memformat jarak numerik menjadi teks yang ramah pengguna.
 * Contoh: 450 meter -> "450 m", 2340 meter -> "2.3 km"
 * 
 * @param distanceInMeters Jarak dalam meter
 * @returns String format jarak
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 0 || isNaN(distanceInMeters)) {
    return '0 m';
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  }

  const km = distanceInMeters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Menghitung estimasi waktu tempuh kurir motor (kecepatan rata-rata default 30 km/jam di area perkotaan).
 * 
 * @param distanceKm Jarak dalam kilometer
 * @param avgSpeedKmH Kecepatan rata-rata (default 30 km/h)
 * @returns Objek menit dan format string
 */
export function estimateCourierTravelTime(
  distanceKm: number,
  avgSpeedKmH: number = 30
): { minutes: number; formatted: string } {
  if (distanceKm <= 0 || isNaN(distanceKm)) {
    return { minutes: 0, formatted: '0 menit' };
  }

  const hours = distanceKm / avgSpeedKmH;
  const minutes = Math.max(1, Math.round(hours * 60));

  if (minutes < 60) {
    return { minutes, formatted: `~${minutes} mnt` };
  }

  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return {
    minutes,
    formatted: `~${hrs} jam ${remainingMins > 0 ? `${remainingMins} mnt` : ''}`.trim(),
  };
}

/**
 * Mengurutkan daftar lokasi dari yang terdekat berdasarkan posisi pengguna saat ini,
 * sekaligus menginjeksi properti kalkulasi jarak ke setiap elemen.
 * 
 * @param userLocation Posisi pengguna saat ini
 * @param locations Daftar entitas lokasi
 * @returns Array baru yang telah diurutkan berdasarkan jarak terdekat
 */
export function sortLocationsByDistance<T extends { coordinate: GeoCoordinates }>(
  userLocation: GeoCoordinates,
  locations: T[]
): (T & { distanceInMeters: number; distanceInKm: number; formattedDistance: string })[] {
  return locations
    .map((loc) => {
      const distanceInKm = calculateHaversineDistanceKm(userLocation, loc.coordinate);
      const distanceInMeters = distanceInKm * 1000;
      const formattedDistance = formatDistance(distanceInMeters);

      return {
        ...loc,
        distanceInMeters,
        distanceInKm,
        formattedDistance,
      };
    })
    .sort((a, b) => a.distanceInMeters - b.distanceInMeters);
}

/**
 * Menemukan lokasi terdekat dari kumpulan lokasi terhadap titik referensi pengguna.
 */
export function findNearestLocation<T extends { coordinate: GeoCoordinates }>(
  userLocation: GeoCoordinates,
  locations: T[]
): (T & { distanceInMeters: number; distanceInKm: number; formattedDistance: string }) | null {
  if (!locations || locations.length === 0) return null;
  const sorted = sortLocationsByDistance(userLocation, locations);
  return sorted[0] || null;
}
