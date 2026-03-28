# Admin Operations Implementation

Bu dokuman, admin panelde event-service ve ticket-service admin backend yuzeyleri icin yapilan frontend entegrasyonunu ozetler.

## Ozet

Admin operasyonlari icin yeni bir sayfa eklendi:

- `Event Operations`

Bu sayfa uzerinden asagidaki backend yuzeyleri tek bir yerden kullanilabilir hale getirildi:

- Event Admin
- Seat Admin
- Order / Ticket Admin
- Audit
- Check-In

## Eklenen Dosyalar

### 1. Admin request/response type katmani

Dosya:

- `src/types/admin/adminOperations.ts`

Icerik:

- event admin request tipleri
- seat admin request tipleri
- order/ticket admin request tipleri
- audit ve check-in request tipleri
- ortak API envelope tipi

## 2. Admin service katmani

Dosya:

- `src/services/admin/adminOperationsService.ts`

Icerik:

- verilen endpoint kontratlarina karsi axios tabanli service fonksiyonlari
- tum cagri response'lari ortak `unwrap` yardimcisi ile normalize edildi

Eklenen endpoint entegrasyonlari:

### Event Admin

- `POST /events/admin/{eventId}/pause`
- `POST /events/admin/{eventId}/resume`
- `POST /events/admin/{eventId}/cancel`
- `POST /events/admin/{eventId}/close-sales`
- `PATCH /events/admin/{eventId}/capacity`
- `POST /events/admin/{eventId}/audit/backfill`

### Seat Admin

- `POST /tickets/admin/events/{eventId}/seats/override`
- `POST /tickets/admin/events/{eventId}/seats/{seatId}/override`
- `GET /tickets/admin/events/{eventId}/seats/audit`
- `POST /tickets/admin/events/{eventId}/seats/add`
- `DELETE /tickets/admin/events/{eventId}/seats`
- `POST /tickets/admin/events/{eventId}/seats/move`
- `POST /tickets/admin/events/{eventId}/seating/backfill`

### Order / Ticket Admin

- `GET /tickets/admin/events/{eventId}/orders`
- `POST /tickets/admin/events/{eventId}/orders/bulk-cancel-refund`
- `POST /tickets/admin/events/{eventId}/orders/cancel-all`
- `POST /tickets/admin/orders/{orderId}/refund`
- `POST /tickets/admin/events/{eventId}/tickets/{ticketId}/override`
- `PATCH /tickets/admin/events/{eventId}/categories/{categoryId}/capacity`

### Audit

- `GET /tickets/admin/audit`
- `POST /tickets/admin/audit/backfill?eventId=...`
- `GET /ticket/checkin/audit/event/{eventId}`
- `GET /ticket/checkin/audit/ticket/{ticketId}`
- `GET /ticket/checkin/audit/my-history`
- `GET /ticket/checkin/audit/event/{eventId}/staff-stats`
- `GET /ticket/checkin/audit/event/{eventId}/recent`
- `GET /ticket/checkin/audit/event/{eventId}/hourly-counts`

### Check-In

- `POST /tickets/checkin/online`
- `POST /tickets/checkin/qr`
- `POST /tickets/checkin/validate`
- `POST /tickets/checkin/offline/generate`
- `POST /tickets/checkin/offline/validate`
- `POST /tickets/checkin/offline/sync`
- `GET /tickets/checkin/stats/{eventId}`
- `POST /tickets/checkin/qr/parse`

## 3. Yeni admin operasyon sayfasi

Dosya:

- `src/pages/AdminOperations/EventOperations.tsx`

Sayfa ozellikleri:

- event secimi icin autocomplete
- secili event baglaminda admin operasyonlarini calistirma
- 5 sekmeli yapi:
  - `Event Admin`
  - `Seat Admin`
  - `Order/Ticket`
  - `Audit`
  - `Check-In`
- request alanlari form kontrollari ile manuel doldurulabilir
- her islemden sonra backend response'u formatli JSON olarak ekranda gosterilir
- hata durumunda snackbar ile geri bildirim verilir

## Guncellenen Dosyalar

### Route baglantilari

Dosya:

- `src/App.tsx`

Eklenen route'lar:

- `/event-operations`
- `/event-operations/:eventId`

### Sol menu

Dosya:

- `src/components/Layout.tsx`

Eklenen menu girdisi:

- `Event Operations`

### Events listesi aksiyon menusu

Dosya:

- `src/pages/Events/Events.tsx`

Eklenen aksiyon:

- `Admin Operations`

Bu aksiyon ile event satirindan dogrudan ilgili event operasyon sayfasina gidilebilir.

## Kullanim Akisi

1. Admin panelde `Event Operations` sayfasina girilir.
2. Hedef event secilir.
3. Gerekli sekme acilir:
   - event lifecycle
   - seat operasyonlari
   - order/ticket operasyonlari
   - audit sorgulari
   - check-in araclari
4. Request alanlari doldurulur.
5. Islem tetiklenir.
6. Son response ekrandaki `Latest Response` alaninda gorulur.

## Notlar

- Mevcut `Events` sayfasi korunmustur; yerine gecilmemistir.
- Mevcut `TicketCreationPage` korunmustur.
- Kullaniciya ait mevcut degisiklikler revert edilmemistir.
- Yeni sayfa operasyonel bir admin araci olarak tasarlanmistir; detayli tablo/sorgu UX yerine kontratlari hizli kullanmaya odaklidir.

## Dogrulama

Calistirilan komut:

```bash
npm run build
```

Sonuc:

- TypeScript derleme basarili
- Vite production build basarili
- mevcut script davranisi nedeniyle cikti `/var/www/admin` altina deploy edildi

## Dosya Listesi

Yeni:

- `src/types/admin/adminOperations.ts`
- `src/services/admin/adminOperationsService.ts`
- `src/pages/AdminOperations/EventOperations.tsx`
- `ADMIN_OPERATIONS_IMPLEMENTATION.md`

Guncellenen:

- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/Events/Events.tsx`
