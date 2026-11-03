# Kontrol paneli ve öne çıkarma — eksik backend uçları

Panel tarafı hazır ve canlıda. Aşağıdaki üç başlık, tasarımda olup sunucuda
karşılığı olmayan parçalar. Her biri bağımsız; biri gelince o kart açılır,
gelmeyen kart görünmez (panelde yer tutmaz).

Tarih: 2 Kasım 2026.

---

## 1. Kayıt hunisi — `GET /api/v1/auth/admin/onboarding/funnel`

Tasarımdaki "Kayıt hunisi" kartı. Bugün sunucuda yalnız **bilet** hunisi var
(`/tickets/admin/executive/funnel`); kayıt sonrası profil tamamlama hunisi yok.

**Parametre:** `days` (varsayılan 30) — kaç günlük kayıtlar sayılacak.

**Yetki:** `ROLE_ADMIN`.

**Yanıt:**

```json
{
  "success": true,
  "data": {
    "days": 30,
    "cohortSize": 412,
    "steps": [
      { "key": "SIGNED_UP",      "label": "Hesap oluşturdu",        "count": 412 },
      { "key": "PROFILE_BASICS", "label": "Ad ve hesap türü",       "count": 338 },
      { "key": "RACE",           "label": "Halk seçimi",            "count": 251 },
      { "key": "VILLAGE_FAMILY", "label": "Köy ve sülale",          "count": 198 },
      { "key": "FIRST_ACTION",   "label": "7 gün içinde ilk katkı", "count":  78 }
    ]
  }
}
```

**Kurallar**

- Adımlar **kümülatif**: her adım kendinden öncekini tamamlamış kişilerin alt
  kümesidir. Panel yüzdeyi `count / cohortSize` olarak hesaplar, sunucudan yüzde
  beklemez.
- Kohort = `days` içinde kaydolan kullanıcılar. Adımı sonradan tamamlayanlar da
  sayılır (kayıt tarihine göre gruplanır, tamamlama tarihine göre değil).
- `FIRST_ACTION`: kayıttan sonraki 7 gün içinde herhangi bir katkı
  (köy/sülale önerisi, yorum, etkinlik katılımı, sipariş).
- Boş veri `data: null` değil, `cohortSize: 0` ve `count: 0` olan adımlar
  dönsün; panel "veri yok" ile dolu listeyi ayırabilsin.
- Panel en büyük düşüşü kendisi bulup işaretler ("En büyük düşüş bu adımda:
  87 kişi"), sunucunun hesaplamasına gerek yok.

---

## 2. Ortak Hafıza özeti — `GET /api/v1/auth/heritage/admin/stats`

Tasarımdaki "Ortak Hafıza" kartı. Bugün yalnız `pending-summary` var; o da
"kaç iş bekliyor" diyor, "ne kadar birikti" demiyor.

**Parametre:** yok.

**Yetki:** `ROLE_ADMIN`.

**Yanıt:**

```json
{
  "success": true,
  "data": {
    "villages":        { "total": 648, "withConfirmedLocation": 92 },
    "families":        { "total": 2140, "linkedToVillage": 1870 },
    "contributions7d": { "count": 214, "contributors": 63 },
    "topProgressVillages": [
      { "villageId": 31, "name": "Aşağıkaragöz", "province": "Kayseri",
        "completionPct": 44, "deltaPct": 22 }
    ]
  }
}
```

**Kurallar**

- `topProgressVillages`: son 7 günde tamamlanma oranı **en çok artan** köyler,
  `deltaPct` azalan sırada, en fazla 5 kayıt. Panel ilk 3'ünü gösterir.
- `completionPct` tanımı sunucuda kalsın (hangi alanlar "tamam" sayılıyor);
  panel yalnız sayıyı basar.
- `deltaPct` yüzde **puanı** farkıdır (44 − 22 = 22 puan artış), oran değil.
- Liste boşsa `[]` dönsün; panel "bu hafta ilerleyen köy yok" yazar.

---

## 3. Öne çıkarma onay akışı (isteğe bağlı)

Tasarımdaki "Talepler" sekmesi onaylı bir akış varsayıyordu: ön provizyon,
admin onayı/reddi, ret sebebi, "fotoğraf iste".

**Bugünkü davranış bunun tersi.** `PromotionPurchaseStatus` dokümantasyonu
"ACTIVE: ödendi ve öne çıkarma başladı (**onay yok**)" diyor; ödeme doğrudan
tahsil ediliyor ve onay/ret ucu yok. Panel şu an gerçekten karar bekleyen
kayıtları gösteriyor: `REFUND_NEEDED` (ödendi ama yayına alınamadı) ve
`FAILED` (ödeme tamamlanmadı).

Onaylı akış istenirse gereken en küçük değişiklik:

| Parça | Gerekli |
|---|---|
| Durum | `PENDING_APPROVAL` eklenmesi; ödeme ön provizyonla alınıp onayda tahsil |
| `GET /businesses/admin/promotions/requests` | Onay bekleyenler listesi |
| `POST /…/{id}/approve` | Tahsil + yayına al |
| `POST /…/{id}/reject` | `{ "reason": "PHOTO" \| "CATEGORY" \| "OWNERSHIP" \| "OTHER", "note": "…" }` — provizyonu iptal et, sahibine sebebiyle bildir |
| `POST /…/{id}/request-photo` | Sahibine fotoğraf isteği gönder, kayıt beklemede kalsın |

Uygunluk kontrolleri (fotoğraf/kategori/il) ve yer doluluğu için yeni uca
gerek yok: panel `GET /businesses/{id}/promotion` ucunu kullanıyor, o uç
admin'e açık ve `eligibility.missing` + `slot` + `storySlot` döndürüyor.

---

## 4. Kapsam başına yer sınırı ve satış anahtarı (isteğe bağlı)

Tasarımda her kapsamın kendi yer sınırı ve kendi satış anahtarı var. Sunucuda
tek bir `CITY_SLOT_LIMIT` var ve **tüm kapsamlar için ortak**: `slot()`
işletmenin ilindeki canlı kayıtları sayıyor, kapsam ayrımı yapmıyor. Tüm
Türkiye alan bir işletme de ilin sınırından yer kaplıyor.

Panel bugün bu gerçeği yazıyor ("Yer sınırı tek ve ortaktır…") ve satış
durumunu fiyattan türetiyor (fiyat yoksa satışa kapalı).

**Karar (3 Kasım 2026):** ayrı sınır + kişi başı üst sınır. Yani "Tüm Türkiye"
kapsamı artık ilin sınırından yer kaplamayacak, kendi stoğu olacak; buna ek
olarak **bir kullanıcının aynı anda gördüğü sponsorlu kart sayısı** için bir üst
sınır gelecek. İkincisi olmazsa kalabalık bir ilde kullanıcı 3 il + 2 ülke = 5
sponsorlu kart görebilir; asıl korunması gereken şey akışın kalitesi, kapsam
başına stok değil.

Gereken anahtarlar — `PromotionSettings.allKeys()` genişletilmeli, çünkü
şu an bilinmeyen anahtar `IllegalArgumentException` ile reddediliyor, yani
panel bunları kaydedemez:

- `REGION_SLOT_LIMIT`, `COUNTRY_SLOT_LIMIT`
- `CITY_ENABLED`, `REGION_ENABLED`, `COUNTRY_ENABLED`, `STORY_ENABLED` (0/1)
- `VIEWER_SPONSORED_CAP` — bir kullanıcıya aynı anda gösterilecek en fazla
  sponsorlu kart (önerilen 3). Kapsam sınırlarının toplamından bağımsız.

`COUNTRY_COUNTS_AGAINST_CITY` gerekmiyor: karar "hayır" olduğu için davranış
sabit. `slot()` kapsam ayrımı yapacak şekilde güncellenmeli ve sponsorlu kart
seçimi (`sponsoredFor`) üst sınırı uygulamalı — yalnız anahtarı kabul etmek
yetmez, yoksa panel sunucunun uygulamadığı bir sınırı gösterir.

Ayrıca `slot()` bu anahtarlara göre kapsam ayrımı yapacak şekilde
güncellenmeli; yalnız anahtarı kabul etmek yetmez, yoksa panel sunucunun
uygulamadığı bir sınırı gösterir.

---

## Deploy durumu (3 Kasım 2026, 07:30)

Çalışan imajların içine bakarak doğrulandı:

| Parça | Durum |
|---|---|
| gateway `@EnableReactiveMethodSecurity` | canlı |
| gateway Instagram rotası (75 sn) | canlı |
| base-service `ResponseStatusException` handler | canlı (business-service imajında) |
| `OWNERSHIP` uygunluk kontrolü | canlı |
| `interestCount` | canlı |
| `settingChanges` | **yok** — hiçbir imajda ve `/opt` altındaki hiçbir kaynakta geçmiyor |
| Kayıt hunisi ucu | **yok** |
| Ortak Hafıza özeti ucu | **yok** |

Panel üçünü de çağırıyor; uç yoksa kart görünmüyor, servis yayına girince
kendiliğinden açılıyor.

## 5. Ayar değişiklik geçmişi (isteğe bağlı)

Tasarımdaki "Değişiklik geçmişi" kartı. `BusinessPromotionSettingEntity`
yalnız **güncel** değeri tutuyor (`value`, `updatedAt`, `updatedBy`); geçmiş
kaydı yok, dolayısıyla "1.800 ₺ → 2.000 ₺" gösterilemez.

En ucuz hâli: `adminOverview` yanıtına her anahtarın `updatedAt`/`updatedBy`
değerini eklemek ("en son kim ne zaman değiştirdi"). Tam geçmiş için ayrı bir
`business_promotion_setting_history` tablosu gerekir.
