# Köy konumu inceleme paneli API sözleşmesi

Panel, aşağıdaki admin uçlarını `api` Axios istemcisiyle çağırır. İstemci her isteğe oturumdaki Bearer token'ını kendisi ekler. Yeni kuyruk ve karar uçları henüz yoksa kuyruk eski `GET /auth/heritage/admin/contributions?status=pending` ucuna; basit onay, konum düzeltme ve red de eski katkı inceleme ucuna geri düşer.

## Kuyruk

`GET /api/v1/auth/heritage/admin/locations/review-queue?status=pending`

Yanıt doğrudan dizi veya `{ "items": [...] }` olabilir. Panel, her kayıt için aşağıdaki alanları kullanır:

```json
{
  "id": "review-record-id",
  "contributionId": "contribution-id",
  "villageId": "village-id",
  "type": "location_review",
  "status": "pending",
  "province": "Adana",
  "district": "Ceyhan",
  "official_name": "Adapınar",
  "reason": ["DISTRICT_MISMATCH", "NEAR_DUPLICATE"],
  "location": { "latitude": 37.14, "longitude": 35.84 },
  "payload": {},
  "candidates": [],
  "nearbyVillages": [],
  "mergeCandidates": [],
  "duplicatePairs": [],
  "checks": [],
  "districtBoundary": { "type": "Feature", "geometry": {} },
  "pointDistrictBoundary": { "type": "Feature", "geometry": {} },
  "pointDistrict": { "province": "Adana", "district": "Yumurtalık" },
  "sources": [],
  "contributor": { "id": "member-id", "name": "Üye", "contributionCount": 4, "acceptanceRate": 0.75 }
}
```

`reason` değerleri `DISTRICT_MISMATCH`, `NEAR_DUPLICATE`, `BOUNDARY_OR_WATER`, `MEDIUM_CONFIDENCE`, `MERGE_SUGGESTION`, `MISSING_LOCATION`, `COMMUNITY_SUGGESTION` olabilir. `candidates` GeoNames, OSM veya topluluk kaynağını `source` alanında belirtir; her adayda `id` veya `osm_id`, `name`/`official_name`, koordinatlar ve varsa `distanceKm` bulunur. `checks` satırları `label`, `passed`, `reason` alanlarını taşır.

## Karar

`POST /api/v1/auth/heritage/admin/locations/{id}/decision`

Panel şu `decision` değerlerini gönderir: `APPROVE`, `MOVE_CANDIDATE_AND_APPROVE`, `MOVE_MANUAL_AND_APPROVE`, `CORRECT_DISTRICT_AND_APPROVE`, `MERGE`, `MARK_SEPARATE`, `REJECT`, `ASK_COMMUNITY`.

Genel gövde:

```json
{
  "decision": "CORRECT_DISTRICT_AND_APPROVE",
  "note": "İsteğe bağlı admin notu",
  "record": { "official_name": "Adapınar", "province": "Adana", "district": "Yumurtalık", "latitude": 37.14, "longitude": 35.84 },
  "district": "Yumurtalık",
  "previousDistrict": "Ceyhan",
  "previousName": "Adapınar",
  "preserveOldNameAsAlias": true
}
```

Karar ek alanları:

- `MOVE_CANDIDATE_AND_APPROVE`: `candidateId`
- `MOVE_MANUAL_AND_APPROVE`: `point: { latitude, longitude }`
- `CORRECT_DISTRICT_AND_APPROVE`: `district`, `previousDistrict`, `previousName`, `preserveOldNameAsAlias`.
- `MERGE`: `targetId`, `retainedName`, `alternativeNames: string[]`; sunucu ad, sülale ve kaynakları tek transaction içinde birleştirir.
- `MARK_SEPARATE`: `pairVillageId`
- `ASK_COMMUNITY`: `requestConfirmation: true`; `record.approximate` true olarak gönderilir.
- `REJECT`: boş olmayan `note` zorunludur.

Karar yanıtı `{ auditId, status, nextItem? }` döndürebilir. Başarılı yanıttan sonra panel mevcut kaydı kuyruktan çıkarıp sıradakini açar.

## Denetim geçmişi ve geri alma

- `GET /api/v1/auth/heritage/admin/locations/{id}/history` → audit satırları dizisi veya `{ items: [...] }`.
- `POST /api/v1/auth/heritage/admin/locations/{id}/undo` gövdesi `{ "auditId": "..." }`.

Audit satırı alanları: `id`, `action`, `createdAt`, `actorName`, `method`, `note`, `before`, `after`, `canUndo`. `before`/`after` içinde ad, ilçe, koordinat ve durum saklanmalıdır. Geri alma da yeni bir audit satırı üreterek önceki işlemin tersini kaydetmelidir.

## Harita kaynakları

Panel mevcut `GET /auth/heritage/locations/search` ve `POST /auth/heritage/locations/check` uçlarını kullanmaya devam eder. `check` yanıtında `pointDistrict` ve aday uzaklıkları bulunursa bunlar ilçe seçimini ve kanıt listesini doldurur. GeoJSON sınırları kuyruk öğesindeki `districtBoundary` ve `pointDistrictBoundary` alanlarından çizilir.

Uydu altlığı için ön yüz derleme ortamına lisanslı sağlayıcı adresi ve zorunlu atıf girilmelidir: `VITE_HERITAGE_SATELLITE_URL`, `VITE_HERITAGE_SATELLITE_ATTRIBUTION`. İkisi yoksa panel uydu seçeneğini kapalı gösterir.
