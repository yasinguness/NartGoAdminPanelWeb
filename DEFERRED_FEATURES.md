# Ertelenen Ozellikler

Suanlik NartGo'nun olcegine uygun olmayan, ileride ihtiyac duyuldugunda aktive edilebilecek ozellikler.

---

## Gise (Box Office)

**Sayfa:** `/box-office` → `src/pages/BoxOffice/BoxOffice.tsx`
**Backend:** `BoxOfficeController` → `/api/v1/tickets/box-office/*`
**Sidebar'dan kaldirildi:** 2026-04-12

### Ne yapiyor?
Fiziksel gise noktasinda gorevlinin ekrandan bilet satmasi.

### Neden ertelendi?
NartGo etkinliklerinde kapida gise terminali gerekmiyor. Tum satis mobil uygulama uzerinden.

### Tekrar aktive etmek icin:
1. `Layout.tsx` navSections'a ekle: `{ text: 'Gise', icon: <PointOfSaleIcon />, path: '/box-office' }`
2. Route ve backend zaten mevcut.

---

## Mekan Envanteri (Venue Inventory)

**Sayfa:** `/venue-inventory` → `src/pages/VenueInventoryManager/VenueInventoryManager.tsx`
**Backend:** `VenueInventoryController` → `/api/v1/venue-inventory/*`
**Sidebar'dan kaldirildi:** 2026-04-12

### Ne yapiyor?
Etkinlik mekanlarini sablon olarak kaydedip tekrar kullanma.

### Neden ertelendi?
NartGo etkinlikleri farkli mekanlarda, dusuk frekansli. Koltuk duzeni etkinlik bazinda yonetiliyor.

### Tekrar aktive etmek icin:
1. `Layout.tsx` navSections'a ekle: `{ text: 'Mekan Envanteri', icon: <HomeWork />, path: '/venue-inventory' }`
2. Route ve backend zaten mevcut.

---

## Kapi Operasyonlari (Gate Ops)

**Sayfa:** `/gate-ops` → `src/pages/GateOpsLiveBoard/GateOpsLiveBoard.tsx`
**Backend:** `GateOpsController` → `/api/v1/gate-ops/*`
**Sidebar'dan kaldirildi:** 2026-04-12

### Ne yapiyor?
Birden fazla giris kapisi olan buyuk mekanlarda kapi bazli yonetim.

### Neden ertelendi?
NartGo etkinliklerinde tek giris noktasi var. Check-in zaten EventDetail Denetim sekmesinde.

### Tekrar aktive etmek icin:
1. `Layout.tsx` navSections'a ekle: `{ text: 'Kapi Operasyonlari', icon: <SensorsIcon />, path: '/gate-ops' }`
2. Route ve backend zaten mevcut.

---

## Organizator Onboarding (Self-Service Basvuru)

**Mevcut durum:** EVENT_ORGANIZATOR rolu Keycloak uzerinden admin tarafindan manuel ataniyor.
**Erteleme tarihi:** 2026-04-12

### Ileride yapilmasi planlanan:
1. Admin panelde "Organizator Basvurusu" sayfasi
   - Kullanici formu doldurur: dernek/kurum adi, aciklama, iletisim bilgileri
   - Dosya yukleme: vergi levhasi, dernek belgesi
2. Admin onay mekanizmasi
   - Basvuru listesi (bekleyen/onaylanan/reddedilen)
   - Onay → Keycloak'a EVENT_ORGANIZATOR rolu otomatik atanir
   - Red → kullaniciya bildirim
3. Mobil uygulamada basvuru formu (opsiyonel)

### Neden ertelendi?
Su an organizator sayisi az ve bilinen kisiler. Manuel atama yeterli.

### Mevcut manuel atama sureci:
1. Keycloak Admin Console → Users → kullaniciyi bul
2. Role Mappings → Client Roles → EVENT_ORGANIZATOR ekle
3. Kullanici admin panele giris yapabilir ve etkinlik olusturabilir
