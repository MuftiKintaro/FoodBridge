# 🌱 FoodBridge — Zero-Waste Food Redistribution Network (SDG 12)

**FoodBridge: Aplikasi Mobile Zero-Waste Food Rescue Berbasis Algoritma Haversine dan Tracking Real-Time**

FoodBridge adalah platform penyelamatan makanan (*food rescue*) berbasis mobile yang menghubungkan restoran, hotel, dan toko kelontong pemilik surplus makanan layak konsumsi dengan panti asuhan serta komunitas yang membutuhkan. Proyek ini dikembangkan untuk mendukung pencapaian **Sustainable Development Goals (SDG) 12: Responsible Consumption and Production**.

---

## 📋 Daftar Isi
- [Latar Belakang & Tujuan](#-latar-belakang--tujuan)
- [Fitur Utama](#-fitur-utama)
- [Progres Pengembangan (Milestones)](#-progres-pengembangan-milestones)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Direktori](#-struktur-direktori)
- [Instalasi & Menjalankan Aplikasi](#-instalasi--menjalankan-aplikasi)
- [Skenario Pengujian & Demo](#-skenario-pengujian--demo)
- [Informasi Akademik](#-informasi-akademik)

---

## 🎯 Latar Belakang & Tujuan
Setiap harinya, sektor perhotelan, restoran, dan ritel menghasilkan surplus makanan layak konsumsi yang berisiko terbuang menjadi limbah pangan (*food waste*). Di sisi lain, banyak panti asuhan dan komunitas rentan yang membutuhkan pasokan pangan bergizi. **FoodBridge** menjembatani kesenjangan distribusi ini dengan pencocokan lokasi terdekat secara presisi, pelacakan kurir *real-time*, serta verifikasi serah-terima yang aman dan dapat bekerja dalam kondisi minim koneksi internet (*offline-first*).

---

## ✨ Fitur Utama
1. **Interactive Food Rescue Map & Penjodohan Lokasi Terdekat:** Memetakan titik lokasi Donatur Makanan dan Penerima Manfaat secara interaktif dengan pengurutan jarak terdekat menggunakan **Formulasi Haversine**.
2. **Adaptive Real-Time Courier Tracking:** Pelacakan posisi kurir secara *real-time* dengan penyesuaian `distanceInterval` dinamis untuk menyeimbangkan akurasi navigasi dan efisiensi baterai.
3. **Offline-First & App Sandbox Vault:** Penyimpanan bukti foto serah-terima dan antrean log transaksi secara lokal di dalam *Scoped Storage* (`documentDirectory`) saat kurir berada di area minim sinyal.
4. **Hardware-Backed Credential & Identity Encryption:** Pengamanan token autentikasi dan Nomor Induk Kependudukan (NIK) penanggung jawab penerima manfaat menggunakan enkripsi perangkat keras (`expo-secure-store`).
5. **Just-In-Time (JIT) Runtime Permissions:** Manajemen hak akses kamera dan lokasi yang kontekstual dengan *Custom Rationale Modal* demi menjaga privasi pengguna.
6. **Manajemen Inventaris Surplus & Impact Analytics *(Roadmap)*:** Pengelolaan stok porsi makanan berbasis Zustand UDF dan kalkulasi dampak penghematan pangan.

---

## 🚀 Progres Pengembangan (Milestones)

### ✅ Milestone 1 (Pertemuan 9): Inisialisasi Modul LBS & Interactive Mapping Engine
*Capaian Pembelajaran: Integrasi layanan berbasis lokasi (LBS), pemetaan interaktif, dan komputasi spasial (Sub-CPMK 7).*
- **Konfigurasi Peta & Geolokasi:** Integrasi `react-native-maps` dan `expo-location` lengkap dengan konfigurasi izin lokasi pada `app.json`.
- **Custom Hook `useLocationTracking`:** Implementasi pelacakan koordinat *real-time* (`watchPositionAsync`) dengan **Adaptive `distanceInterval`**:
  - *High Accuracy Mode (`5m`)*: Aktif otomatis saat kurir bergerak cepat atau berada dalam radius `< 500m` dari titik penjemputan/pengantaran.
  - *Battery Saver Mode (`25–50m`)*: Aktif saat kurir diam atau berada jauh dari titik tujuan.
- **Komputasi Spasial Haversine (`src/utils/haversine.ts`):** Kalkulasi jarak lurus (*straight-line distance*) antar koordinat dalam satuan meter dan kilometer:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
- **Custom Markers & Filter Interaktif:** Penanda visual berbeda untuk Kurir, Donatur (Restoran/Hotel/Toko), dan Penerima (Panti Asuhan/Komunitas) dilengkapi *Bottom Card* detail surplus pangan dan tombol *Recenter*.

### ✅ Milestone 2 (Pertemuan 10): Offline-First Architecture & Secure Storage Integration
*Capaian Pembelajaran: Penyimpanan terenkripsi hardware-backed dan pengelolaan berkas lokal berbasis Scoped Storage (Sub-CPMK 8).*
- **Enkripsi Data Sensitif (`expo-secure-store`):** Menyimpan token kurir dan NIK penerima terenkripsi di Keystore/Keychain perangkat, dilengkapi fungsi *masking* tampilan NIK pada antarmuka (contoh: `357301********04`).
- **Scoped Storage & Offline Queue (`expo-file-system`):** Mengisolasi foto bukti serah-terima pangan dan scan identitas ke dalam direktori privat aplikasi (`documentDirectory/foodbridge_rescue_docs/`) agar tidak bocor ke galeri publik, serta mencatat antrean transaksi offline (`offline_rescue_queue.json`) yang tersinkronisasi otomatis saat kembali daring.
- **Just-In-Time (JIT) Runtime Permissions (`useJustInTimePermission`):** Meminta izin kamera/penyimpanan hanya saat aksi verifikasi dilakukan, didahului *Custom Rationale Modal* dalam Bahasa Indonesia serta penanganan penolakan permanen menuju pengaturan sistem (`Linking.openSettings()`).

---

## 🛠 Teknologi yang Digunakan
- **Framework:** React Native & Expo SDK (TypeScript)
- **Maps & Location:** `react-native-maps`, `expo-location`
- **Security & Storage:** `expo-secure-store`, `expo-file-system`, `expo-image-picker` / `expo-camera`
- **Architecture Pattern:** Modular Layered Architecture (`components`, `hooks`, `services`, `utils`, `data`)

---

## 📂 Struktur Direktori

```text
foodbridge/
├── app/ / src/
│   ├── components/
│   │   ├── map/             # Komponen MapView, Custom Markers, & Bottom Card Lokasi
│   │   └── verification/    # Modal Verifikasi Serah-Terima, Rationale Modal, & Sandbox Inspector
│   ├── data/
│   │   └── mockFoodLocations.ts # Dataset simulasi Donatur & Panti Asuhan
│   ├── hooks/
│   │   ├── useLocationTracking.ts       # Real-time GPS tracking & adaptive distanceInterval
│   │   └── useJustInTimePermission.ts   # Manajemen runtime permissions berbasis JIT
│   ├── services/
│   │   ├── secureStorage.ts # Enkripsi Token & NIK via expo-secure-store
│   │   └── sandboxStorage.ts# Manajemen file & antrean offline di documentDirectory
│   └── utils/
│       └── haversine.ts     # Fungsi komputasi jarak spasial & pengurutan lokasi terdekat
├── app.json                 # Konfigurasi identitas aplikasi & izin OS
├── package.json
└── README.md
