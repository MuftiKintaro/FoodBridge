/**
 * FoodBridge - Tipe Data Manajemen Surplus Makanan & Penerima Manfaat
 */

import { GeoCoordinates } from './location';

export type FoodLocationType = 'DONOR' | 'RECIPIENT';

export type DonorCategory = 
  | 'RESTAURANT' 
  | 'HOTEL' 
  | 'GROCERY' 
  | 'BAKERY' 
  | 'CATERING';

export type RecipientCategory = 
  | 'ORPHANAGE' 
  | 'COMMUNITY' 
  | 'SHELTER' 
  | 'NURSING_HOME';

export type UrgencyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FoodSurplusItem {
  name: string;
  category: string;
  portions: number;
  unit: string;
  expiryTime: string; // contoh: "21:30 WIB Hari Ini"
  safeUntilHours: number; // sisa jam kelayakan
  description: string;
  storageCondition: 'ROOM_TEMP' | 'CHILLED' | 'FROZEN';
}

export interface FoodLocation {
  id: string;
  name: string;
  type: FoodLocationType;
  category: DonorCategory | RecipientCategory;
  categoryLabel: string;
  coordinate: GeoCoordinates;
  address: string;
  district: string; // Kecamatan di Malang
  contactPerson: string;
  phone: string;
  
  // Data spesifik Donatur
  surplusDetails?: {
    items: FoodSurplusItem[];
    totalPortions: number;
    pickupWindow: string; // contoh: "19:00 - 21:00 WIB"
  };

  // Data spesifik Penerima Manfaat
  recipientDetails?: {
    neededPortions: number;
    beneficiaryCount: number; // Jumlah anak asuh / orang
    targetAudience: string;   // contoh: "Anak Asuh Panti (Usia 6-17 tahun)"
    urgency: UrgencyLevel;
    notes: string;
  };

  // Kalkulasi jarak spasial
  distanceInMeters?: number;
  distanceInKm?: number;
  formattedDistance?: string;
}

export type MarkerFilterCategory = 'ALL' | 'DONOR' | 'RECIPIENT';
