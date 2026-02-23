# Xeku Notification Service - Admin Panel Integration Guide

Bu döküman, Xeku bildirim servisinin (Notification Service) admin paneli üzerinden yönetilmesi ve entegrasyonu için hazırlanmış detaylı teknik analiz dökümanıdır. Üretim ortamına (Production-Ready) hazır, ölçeklenebilir ve çok kanallı bir yapı sunmaktadır.

---

## 1. Sistem Mimarisi ve Genel Bakış

Bildirim servisi, kullanıcılarla etkileşimi artırmak amacıyla tasarlanmış, **event-driven** (olay güdümlü) ve **multi-channel** (çok kanallı) bir mikroservistir.

### Desteklenen Kanallar:

- **WebSocket**: Gerçek zamanlı (real-time) uygulama içi bildirimler.
- **Mobile Push (FCM)**: Firebase Cloud Messaging üzerinden mobil cihazlara bildirim.
- **Email**: Dinamik şablonlarla e-posta gönderimi.
- **Telegram**: Telegram botları ve kanalları üzerinden kurumsal veya operasyonel bildirimler.

---

## 2. Veri Modelleri (Models)

### 2.1. Notification Entity

Tüm bildirimlerin temelini oluşturan ana nesne.

```json
{
  "id": "Long",
  "title": "String (Bildirim Başlığı)",
  "content": "String (Bildirim İçeriği)",
  "email": "String (Alıcı Email)",
  "type": "String (Bildirim Tipi)",
  "priority": "LOW | NORMAL | HIGH | URGENT",
  "isRead": "Boolean",
  "additionalData": "JSON Objects (Kanal bazlı özel veriler)",
  "createdAt": "Timestamp",
  "expiresAt": "Timestamp"
}
```

### 2.2. Notification Template

Tekrar eden bildirimler için dinamik şablon yapısıdır.

- **code**: Şablonun benzersiz kodu (örn: `WELCOME_EMAIL`).
- **titleTemplate**: Dinamik başlık (örn: `Hoş geldin {{name}}!`).
- **contentTemplate**: Dinamik içerik (HTML veya Plain Text).

---

## 3. Yönetim Paneli Endpoint Analizi (Admin Endpoints)

Admin paneli için `/api/v1/notifications/admin` altındaki yetkili endpointler kullanılmalıdır.

### 3.1. Toplu Bildirim Gönderme (Bulk Sending)

Sistem, alıcı tipine göre optimize edilmiş endpointler sunar:

| Endpoint                     | Açıklama                                                    |
| :--------------------------- | :---------------------------------------------------------- |
| `POST /bulk/send-all`        | Tüm sistem kullanıcılarına (kayıtlı + misafir) gönderir.    |
| `POST /bulk/send-registered` | Sadece hesabı olan kayıtlı kullanıcılara gönderir.          |
| `POST /bulk/send-anonymous`  | Sadece misafir/anonim kullanıcılara (cihaz bazlı) gönderir. |
| `POST /bulk/send-specific`   | Belirli bir e-posta listesine gönderir.                     |
| `POST /urgent/send-all`      | En yüksek öncelikle tüm kanallardan anlık basar.            |

#### Örnek İstek Gövdesi (Body):

```json
{
  "title": "Büyük İndirim Başladı!",
  "content": "Tüm ürünlerde %50 indirim fırsatını kaçırma.",
  "type": "PROMOTION",
  "priority": "HIGH",
  "sendPush": true,
  "sendWebSocket": true,
  "sendEmail": false,
  "sendTelegram": false,
  "emailList": ["user1@example.com"], // send-specific için kullanılır
  "additionalData": {
    "data": {
      "url": "https://xeku.com/offers",
      "image": "https://cdn.xeku.com/promo.jpg"
    }
  }
}
```

### 3.2. İstatistikler (Dashboard Analytics)

Admin panelindeki dashboard için `GET /stats` endpoint'i kullanılır.

- **Toplam Bildirim Sayısı**: Okunma oranları bazında.
- **Cihaz Dağılımı**: iOS vs Android vs Web.
- **Kullanıcı Dağılımı**: Kayıtlı vs Anonim.
- **Kanal Performansı**: Başarılı/Hatalı (Success Rate) gönderimler.

---

## 4. Gelişmiş Özellikler ve Mimari Prensipler

### 4.1. Akıllı Kanal Seçimi (Smart Channel Selection)

Sistem, kullanıcının o anki online durumuna göre karar verebilir:

- Eğer kullanıcı **WebSocket** üzerinden bağlıysa, öncelikle Web-Socket üzerinden iletir.
- Kullanıcı offline ise, **Push Notification** kanalını tetikler.
- Kritik durumlarda (URGENT) tüm kanalları eş zamanlı (simültane) kullanabilir.

### 4.2. Batch Processing & Rate Limiting

Milyonlarca kullanıcıya bildirim gönderirken sistem yükünü yönetmek için:

- **Batching**: Alıcılar 100'erli veya 500'erli paketler halinde işlenir.
- **Async Execution**: Gönderim işlemleri arka planda (Worker'lar ile) yapılır, admin paneli anında "İşlem Başlatıldı" yanıtı alır.
- **Delays**: Kanalların (FCM/SMTP) limitlerine takılmamak için paketler arası milisaniye düzeyinde gecikmeler uygulanır.

### 4.3. Bildirim Tipleri (Type Structure)

Admin panelinde şu tipler tanımlanabilir:

- `INFO`: Genel bilgilendirme.
- `PROMOTION`: Kampanya ve reklam.
- `ALERT`: Sistem uyarıları.
- `SOCIAL`: Takip, beğeni vb. etkileşimler.
- `TRANSACTIONAL`: Ödeme, bilet, davetiye onayları.

---

### 4.4. Yatay Ölçekleme (Horizontal Scaling)

Sistem, yüksek trafikte yatayda ölçeklenebilir şekilde tasarlanmıştır:

- **Redis WebSocket Session Manager**: WebSocket oturumları Redis üzerinden senkronize edilir, böylece kullanıcı hangi sunucu düğümüne bağlı olursa olsun bildirim alabilir.
- **Distributed Locking**: Aynı toplu işlemin birden fazla instance tarafından mükerrer işlenmesi engellenir.

### 4.5. Device Selection Strategies

Bildirim gönderilirken kullanıcının hangi cihazlarının hedefleneceği belirlenebilir:

- `LATEST_ACTIVE`: Sadece en son kullanılan aktif cihaz.
- `ALL_ACTIVE`: Kullanıcının tüm aktif cihazları.
- `PLATFORM_BASED`: Sadece iOS veya sadece Android cihazlar.

---

### 4.6. Onay Mekanizması (Approval Workflow)

Kritik veya toplu bildirimler için bir onay süreci işletilebilir:

- `approvalRequired: true` bayrağı ile gönderilen istekler `PENDING_APPROVAL` durumunda bekletilir.
- Üst düzey adminler `/api/v1/notifications/admin/jobs/{id}/approve` endpoint'i üzerinden onay vererek gönderimi başlatabilir.

### 4.7. Zamanlanmış Gönderimler (Scheduling)

Bildirimlerin ileri bir tarihte otomatik olarak gönderilmesi desteklenir:

- `scheduledAt` alanı ile gelecekteki bir tarih/saat belirlenebilir.
- Sistem arka planda çalışan bir scheduler (`BulkJobScheduler`) ile zamanı gelen işleri otomatik olarak işleme alır.

### 4.8. Politika ve Kısıtlamalar (Policy Management)

Sistem, kullanıcı deneyimini korumak için otomatik kısıtlamalar uygular:

- **Quiet Hours (Sessiz Saatler)**: Gece 23:00 ile sabah 08:00 arası (URGENT olmayan) bildirimler otomatik olarak engellenir.
- **Frequency Capping**: Bir kullanıcıya gün içinde gidebilecek maksimum bildirim sayısı sınırlandırılabilir (Spam koruması).

---

## 5. Uygulama ve Entegrasyon Notları (Senior-Level)

1.  **Idempotency**: Aynı bildirimin aynı kullanıcıya mükerrer gitmemesi için `senderId` veya `groupId` takibi yapılır.
2.  **Expiration (TTL)**: Bildirimlerin bir son kullanma tarihi (`expiresAt`) vardır. Süresi geçen bildirimler kullanıcıya gösterilmez ve veritabanı temizleme (Cleaning) servisi ile otomatik silinir.
3.  **Template Engine**: Bildirim içeriklerinde `Mustache` veya benzeri şablon dilleri kullanılarak `{{userName}}` gibi değişkenler dinamik olarak atanabilir.
4.  **Error Aggregation**: Toplu gönderim sonunda hangi kullanıcıların bildirim alamadığına dair detaylı bir `DeliveryError` raporu üretilir.

---

**Hazırlayan:** Antigravity AI Engineering Team
**Versiyon:** 1.0.0
**Tarih:** 2026-02-22
