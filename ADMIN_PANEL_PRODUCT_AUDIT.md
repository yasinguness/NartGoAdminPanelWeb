# Admin Panel Product Audit

Bu dokuman, `/admin/dashboard` ekranindan baslayip menu sonundaki `Settings` seviyesine kadar mevcut admin panelin urun, bilgi mimarisi, UI/UX, operasyonel yeterlilik ve production readiness acisindan detayli analizini icerir.

Amac:

- mevcut panelin guclu ve zayif yonlerini netlestirmek
- duplicate ve kirik alanlari gostermek
- admin kullanicisinin gercek ihtiyaclarini eksiksiz tanimlamak
- eksik ama mutlaka olmasi gereken ekran, KPI, operasyon ve governance ihtiyaclarini listelemek
- senior seviyede, production-grade bir admin panel hedefi icin referans belge olusturmak

---

## 1. Executive Summary

Mevcut admin panel iki farkli evrenin birlesiminden olusuyor:

- klasik admin CRUD ve operasyon listeleri
- yeni nesil operasyon cockpit ekranlari

Bu ikinci katman dogru yonde:

- `Sales Command`
- `Gate Ops Live`
- `Customer Support`
- `Campaign Engine`
- `Settlement & Finance`
- `Event Operations`

Bunlar siradan tablo/form degil, karar vermeye yardimci operasyon yuzeyleri olmaya baslamis. Bu urun yonu cok dogru.

Ancak production-grade seviyede en buyuk problem tasarim eksikligi degil, standardizasyon eksikligi:

- veri erisim kaliplari tek degil
- route ve menu yapisi tam tutarli degil
- mock fallback oranlari yuksek
- duplicate ekranlar var
- bazi ekranlar cok buyuk ve tek dosyada asiri sorumluluk tasiyor
- role/permission ve audit governance katmani yeterince merkezi degil

Kisaca:

- urun vizyonu guclu
- teknik ve yapisal konsolidasyon gerekli

---

## 2. Ana Tespitler

### 2.1 Guclu Taraflar

- Admin panelde ortak page primitives mevcut:
  - `PageContainer`
  - `PageHeader`
  - `PageSection`
  - `DataTable`
- Yeni operasyon ekranlari belirli bir problemi cozmeye odakli
- Event, payment, support, gate, finance, campaign gibi kritik domainler artik panelde temsil ediliyor
- Sol menu zengin, urun kapsamı genis
- Theme sistemi ve ortak component klasorleri mevcut

### 2.2 Kritik Riskler

- `Settings` menu girdisi var ama route yok
- `Devices` route var ama menude yok
- `Notifications` ve `NotificationsRefactored` parallel durumda
- `Feeds` ve `FeedVideos` parallel durumda
- yeni operasyon ekranlarinin cogu backend failsafe olarak mock veriye donuyor
- cok buyuk monolitik sayfalar bakim maliyetini artiriyor
- route/permission matrix yok
- global audit ve destructive action policy standardize degil

### 2.3 En Yuksek Oncelikli Yapisal Problemler

1. Information architecture daginik
2. Mock fallback davranisi production algisini bozuyor
3. Veri erisim stratejisi standardize edilmemis
4. Bazi ana ekranlar asiri buyuk ve parcali degil
5. Analytics/KPI stratejisi ortak bir standarda baglanmamis

---

## 3. Mevcut Route ve Bilgi Mimarisi Analizi

Mevcut route listesi su domainleri kapsiyor:

- Dashboard
- Devices
- Notifications
- Feeds
- Bulletins
- Users
- Businesses
- Business Claims
- Business Categories
- Events
- Event Operations
- Sales Command
- Venue Inventory
- Box Office
- Settlement & Finance
- Gate Ops Live
- Customer Support
- Campaign Engine
- Federations
- Associations
- Event Categories
- Ticket Creation
- Gamification
- Sub Merchants

Bu kapsam guclu. Ancak bilgi mimarisi acisindan su anda duz bir liste halinde sunuluyor. Admin kullanicisi icin menu “feature inventory” gibi gorunuyor, “gorev odakli sistem” gibi degil.

### 3.1 Onerilen Sol Menu Gruplamasi

#### A. Executive & Monitoring

- Dashboard
- Sales Command
- Gate Ops Live
- Settlement & Finance

#### B. Event Operations

- Events
- Event Operations
- Venue Inventory
- Ticket Creator
- Box Office

#### C. Commerce & Revenue

- Campaign Engine
- Settlement & Finance
- Sub Merchants

#### D. Customer & Access

- Users
- Customer Support
- Devices

#### E. Organization Management

- Businesses
- Business Claims
- Business Categories
- Associations
- Federations
- Event Categories

#### F. Content & Communications

- Notifications
- Feeds
- Bulletins

#### G. Platform

- Gamification
- Settings

### 3.2 Broken / Inconsistent Navigation

- `Settings` menu item mevcut ama route tanimli degil
- `Devices` route tanimli ama menu item yok
- duplicate yuzeyler kullaniciyi sasirtabilecek durumda

Bu durumlar production readiness acisindan kabul edilmemeli.

---

## 4. Global UX ve Product Principles

Production-grade admin panelde asagidaki ilkeler zorunlu olmali.

### 4.1 Her Ekran Bir Sorun Cozmeli

Ekranlar entity odakli degil, is problemi odakli olmali.

Ornek:

- “Campaign kaydi duzenle” yerine:
  - “kampanya performansini yonet”
  - “eligibility debug et”
  - “abuse riskini kontrol et”

- “Ticket listesi” yerine:
  - “kapida neden okutulamadi”
  - “musteri neden support aradi”
  - “hangi kategori kritik dolulukta”

### 4.2 Her Kritik Domain Icin Uc Katman Olmali

Her domain icin asagidaki 3 katman olmasi idealdir:

1. overview / list
2. detail / drill-down
3. operation / action surface

Ornek:

- Event
  - Events list
  - Event detail
  - Event operations

- Customer
  - omni-search / list
  - 360 profile
  - support actions

- Finance
  - settlement queue
  - batch detail
  - ledger / adjustment / payout actions

### 4.3 Her Kritik Ekranda Bunlar Olmali

- loading state
- empty state
- error state
- refresh strategy
- last updated indicator
- filter reset
- export capability
- permissions awareness
- auditability

### 4.4 Production Admin Panelde Gorunmez Ama Zorunlu Ozellikler

Asagidaki ozellikler cogu zaman sonradan dusunulur ama basta tanimlanmalidir:

- role-based menu visibility
- action-level permissions
- confirmation patterns
- optimistic update policy
- pagination strategy
- saved filters / saved views
- column visibility chooser
- export strategy
- entity permalink / deep link
- URL-synced filters
- idempotency for dangerous actions
- activity / audit trail for mutations
- system-wide search

---

## 5. Dashboard Analizi ve Hedef Dashboard Tanimi

Dashboard su anda guclu ama domain olarak auth/security agirlikli. Uygulamanin ana paneli olarak dashboard daha genis kapsama sahip olmali.

### 5.1 Dashboard’da Mutlaka Olmasi Gerekenler

#### A. Daily Executive Summary

Her admin panelin ana dashboard’unda ilk bakista su gorunmeli:

- bugunku toplam aktif kullanici sayisi
- bugunku yeni kayit olan kullanici sayisi
- bugunku toplam siparis sayisi
- bugunku toplam ciro
- bugunku iade tutari
- bugunku check-in sayisi
- bugunku fraud / alarm sayisi
- bugunku aktif etkinlik sayisi

Bu KPI’lar temel seviyedir. Eksik olmamali.

#### B. Traffic & Activity KPIs

- DAU
- WAU
- MAU
- DAU/MAU ratio
- gunluk session sayisi
- ortalama session suresi
- login success rate
- login failure rate
- peak traffic time

#### C. Revenue KPIs

- gross sales today
- net sales today
- refund rate today
- average order value
- top selling event today
- category bazli satis dagilimi
- kanal bazli satis dagilimi

#### D. Operations KPIs

- bugun check-in edilen kisi sayisi
- aktif gate device sayisi
- offline device sayisi
- ortalama gate wait time
- open incident count
- event capacity risk alerts

#### E. Customer Health KPIs

- today support ticket / call count
- unresolved customer cases
- refund pending count
- suspicious customer flag count

#### F. Platform Health KPIs

- failed payment count
- webhook failure count
- notification send failure count
- API degraded services
- background job lag

### 5.2 Dashboard Layout Onerisi

#### Section 1. Hero KPI Strip

- 8 ana kart
- bugun / dun / degisim gostermeli

#### Section 2. Revenue & Sales

- gross/net sales trend
- sales by channel
- refunds trend
- top events by revenue

#### Section 3. Event Operations

- aktif etkinlikler
- occupancy risk
- gate ops alerts
- check-in throughput

#### Section 4. Customer & Support

- support queue
- refund queue
- suspicious user queue

#### Section 5. Security & Platform

- auth anomalies
- high-risk IPs
- failed webhooks
- integration alerts

#### Section 6. Recent Activity Feed

Tek timeline icinde:

- admin mutation
- campaign publish
- bulk refund
- gate fraud
- payout completed
- support escalation

### 5.3 Dashboard’da Gozden Kacmis Olabilecek Zorunlu Alanlar

Bunlar cogu projede unutulur ama admin icin kritik olabilir:

- “top failing API endpoints”
- “last successful payout run”
- “events approaching sell-out”
- “campaigns consuming quota too fast”
- “bulk action operations in progress”
- “jobs currently retrying”
- “manual review queue”
- “pending organizer approvals”
- “outlier orders”
- “top support reasons today”

---

## 6. Sayfa Bazli Analiz

Bu bolum her sayfayi urun amaci, mevcut yapi, riskler ve production-grade oneriler ile ele alir.

---

### 6.1 Dashboard

Amac:

- platform genel durumunu gostermek
- executive summary saglamak
- karar destek merkezi olmak

Mevcut gucler:

- analitik agirlikli
- sekmeli yapi mevcut
- auth/security tarafi kuvvetli

Eksikler:

- revenue / support / operational / finance boyutu eksik
- panelin “ana giris ekrani” olarak dengesi security tarafa kaymis

Production-grade oneriler:

- modular widget system
- role-specific dashboard variants
- refresh cadence per widget
- visible last refresh timestamp
- export and drill-down links on each card

---

### 6.2 Devices

Amac:

- kullanici cihazlarini izlemek
- guvenlik / block / trust operasyonlarini yapmak

Eksikler:

- menu ile hizali degil
- domainin owner’i belli degil
- mock agirligi fazla

Olmali:

- last login device
- device fingerprint summary
- suspicious device reuse
- geo mismatch alerts
- device trust state

---

### 6.3 Users

Amac:

- kullanici arama, filtreleme, moderasyon
- detay, status, guvenlik ve davranis analizi

Guclu:

- filtre derinligi iyi
- detay sayfasi kapsamli

Eksikler:

- detail ekrani section overload riski tasiyor
- user 360 view yok
- support ile support console ayrisimi net degil

Olmali:

- identity tab
- contact tab
- order/ticket tab
- support tab
- fraud/security tab
- gamification tab
- audit tab

---

### 6.4 Businesses

Amac:

- isletme onay / featured / dogrulama / icerik / iletisim yonetimi

Guclu:

- gerçek business moderation ihtiyaclarini kapsiyor

Eksikler:

- liste ekrani asiri fazla sorumluluk tasiyor
- import, moderation, featured, edit ayni yerde

Olmali:

- moderation queue
- feature inventory
- agreement/compliance state
- payment/sub-merchant relation summary
- business performance KPI

---

### 6.5 Business Claims

Amac:

- sahiplik taleplerini gozden gecirmek

Guclu:

- review queue mantigi var

Olmali:

- SLA age
- claim risk score
- supporting evidence preview
- conflict history
- review audit log

---

### 6.6 Events

Amac:

- event olusturma / duzenleme / listeleme

Guclu:

- organizer secimi
- place integration
- image support

Eksikler:

- liste ve edit akisi tek sayfada asiri buyuk

Olmali:

- event state machine
- sales state
- seating state
- support/incident state
- finance relation
- organizer permissions

---

### 6.7 Event Operations

Amac:

- event admin backend mutasyonlarini yonetmek

Guclu:

- tek yuzeyden cok sayida admin endpoint

Eksikler:

- tool-screen hissi hala baskin
- bazi alt bolumler operasyon cockpit seviyesine tam ulasmamis

Olmali:

- action history
- last operator
- action conflict warning
- dry-run where possible
- event status safety rules

---

### 6.8 Ticket Creator

Amac:

- kategori, fiyatlama, layout ve satis planini tanimlamak

Guclu:

- stepper / wizard mantigi dogru

Eksikler:

- dosya cok buyuk
- seat layout ve pricing mantigi ayni sayfada asiri gomulu

Olmali:

- draft autosave
- unsaved changes prompt
- layout validation
- capacity consistency checks
- sales window overlaps warnings

---

### 6.9 Venue Inventory

Amac:

- block/row/allotment/hold/blackout yonetimi

Guclu:

- split-view ve topology fikri dogru

Eksikler:

- mock agirligi yuksek
- tree-grid reusable degil

Olmali:

- row/block bulk action
- versioning / publish flow
- diff preview
- inventory snapshot history
- event override vs master topology ayrimi

---

### 6.10 Sales Command

Amac:

- satis operasyonlarini canli izlemek

Guclu:

- operasyon odakli
- order feed ve detail drawer mantigi cok dogru

Eksikler:

- revenue analytics daha derin olabilir
- channel breakdown ve risk paneli backend ile tam baglanmali

Olmali:

- sales velocity by minute
- top payment failures
- channel conversion
- top refunded events
- anomaly order detector
- hold expiration queue

---

### 6.11 Box Office

Amac:

- gişe satisi ve offline / assisted checkout

Guclu:

- gercek dunya operasyon ihtiyacina hitap ediyor

Eksikler:

- state flow daha net olmalı
- customer lookup / reservation / comp flow ayrismamış

Olmali:

- guest checkout
- customer lookup
- reservation hold
- comp / complimentary flow
- print / sms / email fulfilment
- operator session log

---

### 6.12 Settlement & Finance

Amac:

- settlement, refund, payout ve ledger gorunurlugu

Guclu:

- bilgi mimarisi dogru yone gitmis

Eksikler:

- su an finans domain gercekten ayrismis degil
- calculations ve ledger server-side authoritative olmali

Olmali:

- gross/net/refund summary
- payout queue
- failed payout retry
- manual adjustment audit
- export center
- tax / withholding breakdown
- chargeback center

---

### 6.13 Gate Ops Live

Amac:

- kapi operasyonu, cihaz sagligi ve fraud izleme

Guclu:

- control-room mantigi dogru
- operasyonel onemi yuksek

Eksikler:

- diger panellerden gorsel olarak cok kopuk
- olay yonetimi ile incident workflow baglanmali

Olmali:

- gate throughput trend
- scanner heartbeat
- offline sync queue
- replay attempts
- denied entries
- device battery and connectivity
- emergency broadcast

---

### 6.14 Customer Support Console

Amac:

- tek bakista musteri hikayesi
- support operator karar yardimcisi

Guclu:

- omni-search + unified timeline cok dogru

Eksikler:

- mock fallback sebebiyle gercek 360 hissi zayiflayabilir
- support actions backend contract standardina baglanmali

Olmali:

- customer 360 summary
- order/ticket timeline
- refund history
- check-in history
- fraud history
- support notes
- escalation status
- one-click resend / refund / reset / flag

---

### 6.15 Campaign & Promo Engine

Amac:

- campaign listesi, eligibility, kural yonetimi

Guclu:

- 3 panel architecture
- rule-builder fikri dogru

Eksikler:

- sayfa icinde domain type gomulu olmamali
- simulation backend authoritative olmalı

Olmali:

- campaign performance
- quota burn rate
- eligibility debug
- conflict resolution
- stacking rules
- fraud guard
- audience preview

---

### 6.16 Notifications

Amac:

- kullanici iletisim ve campaign/send surfaces

Risk:

- duplicate implementation mevcut
- kanonik ekran secilmeli

Olmali:

- send queue
- delivery analytics
- failure reasons
- channel health
- template governance
- campaign history

---

### 6.17 Feeds

Risk:

- duplicate surfaces var

Olmali:

- video moderation
- feed scheduling
- story lifecycle
- publish state
- media validation

---

### 6.18 Bulletins

Amac:

- bulletin creation ve publication

Olmali:

- preview
- scheduling
- pinning
- publication audit

---

### 6.19 Associations / Federations

Guclu:

- ortak primitives ile daha temiz bir domain

Eksikler:

- bazi aksiyonlar placeholder

Olmali:

- governance status
- member analytics
- payment and subscription relation
- event relation

---

### 6.20 Sub Merchants

Guclu:

- production-grade yaklasima en yakin alanlardan biri

Olmali:

- sync status
- iyzico request/response audit
- onboarding checklist
- settlement relation

---

### 6.21 Gamification

Amac:

- points/rewards/config yönetimi

Olmali:

- rule versioning
- reward issuance audit
- abuse monitoring

---

### 6.22 Settings

Mevcut durum:

- menu’de var
- route yok

Bu production’da kirik davranistir.

Gercek `Settings` modulu asagidakileri icermeli:

- admin roles & permissions
- feature flags
- integrations
- rate limits
- audit retention
- security policies
- notification defaults
- support macros
- finance/export settings
- environment diagnostics

---

## 7. Duplicate ve Konsolidasyon Listesi

Asagidaki duplicate / belirsiz alanlar temizlenmeli:

### Kesin Konsolidasyon Gerekli

- `Notifications.tsx` vs `NotificationsRefactored.tsx`
- `Feeds.tsx` vs `FeedVideos.tsx`
- admin surfaces ile klasik CRUD surfaces arasinda ownership belirsizlikleri

### Broken Navigation

- `Settings` route eksik
- `Devices` menu eksik

### Naming Standardi

Mevcut isimler karisik:

- `Event Operations`
- `Sales Command`
- `Campaign Engine`
- `Gate Ops Live`

Bu isimlendirme urun dilinde tek bir ton izlemeli:

- ya tamamen operasyonel
- ya tamamen fonksiyonel

Oneri:

- `Event Operations`
- `Sales Command Center`
- `Campaign & Promotions`
- `Gate Operations`
- `Customer Support`
- `Settlement & Finance`

---

## 8. UI / UX Standardization Onerileri

### 8.1 Standard Page Template

Her standart admin page icin:

1. `PageHeader`
2. KPI row optional
3. Filter bar
4. Data table / list
5. detail drawer veya detail page
6. empty / loading / error state

### 8.2 Standard Operations Cockpit Template

Her operasyon cockpit ekraninda:

1. sticky top KPI strip
2. left main grid or feed
3. right drill-down drawer
4. quick actions
5. timeline or audit stream
6. last updated / live state

### 8.3 Form Standardi

Tum formlarda su standard zorunlu olmali:

- validation timing
- inline field errors
- required field marking
- unsaved changes warning
- save / publish / cancel semantics
- success and failure feedback

### 8.4 Table Standardi

Tum tablolar icin:

- sorting
- server pagination
- sticky actions column
- saved filters
- column chooser
- export
- row selection
- row-level audit shortcut

---

## 9. Data ve Integration Standardi

Production-grade panelde veri standardi tek olmali.

### 9.1 Onerilen State/Data Stratejisi

- React Query:
  - server data
  - mutation invalidation
  - retries
  - cache lifecycle

- Zustand:
  - auth
  - global ui state
  - transient panel preferences

- page-local state:
  - sadece form ve local interactions

### 9.2 Mock Veri Politikasi

Production’da sessizce mock’a dusmek uygun degil.

Oneri:

- development mode mock kullanilabilir
- production’da backend fail olursa:
  - error state
  - retry
  - degraded mode banner

Ama “gercek veri gibi duran mock fallback” olmamali.

### 9.3 API Standardi

Tum servisler su kaliba gelmeli:

- normalized envelope handling
- typed responses
- typed errors
- auth and permission aware mutations
- pagination contract consistency

---

## 10. Permission ve Governance Gereksinimleri

Su anda panelde gorunur bir permission matrix yok.

Admin panelde mutlaka olmali:

- role-based menu visibility
- page-level access control
- action-level permission control
- dangerous action confirm dialogs
- destructive action reason required
- bulk action audit
- operator identity on mutation

Kritik alanlar:

- refund
- payout
- check-in reset
- status override
- campaign publish
- seating override

Bu aksiyonlar audit’siz birakilmamali.

---

## 11. Gozden Kacabilecek Ama Mutlaka Olmasi Gereken Admin Yetenekleri

Asagidakiler projelerde sik unutulur. Bu panelde de acikca planlanmali.

### 11.1 Global Search

Tek kutudan su entity’lere gidebilmeli:

- user
- order
- ticket
- event
- campaign
- payout batch
- support case

### 11.2 Audit Everywhere

Her detail ekraninda:

- last modified by
- last modified at
- recent actions
- linked audit entries

### 11.3 Saved Views

Ozellikle:

- users
- orders
- settlements
- campaign lists
- gate logs

icin kayitli filtreler olmalı.

### 11.4 Export Center

Tum export’lar daginik butonlar yerine tek strateji ile olmali:

- CSV
- XLSX
- queued export jobs
- audit trail

### 11.5 Incident Management

Asagidaki olaylar tek incident center’a dusmeli:

- fraud alert
- repeated QR scan
- failed payout
- mass refund
- gateway degradation
- campaign abuse spike
- gate device offline

### 11.6 Release Safety

Mutlaka olmali:

- feature flags
- role gated beta screens
- environment badge
- sandbox/test mode indicators

---

## 12. Production-Ready Hedef Yapi

### 12.1 Teknik Hedef

- tek veri erisim standardi
- typed domain services
- feature-folder architecture
- page-size reduction
- role-based routing
- URL-synced filters
- no silent mock fallback in production

### 12.2 Urun Hedefi

Admin panel sunlari ayni anda yapabilmeli:

- platformu izlemek
- operasyonu yonetmek
- musteri problemini cozmeyi hizlandirmak
- finansal karar almak
- riskleri erken gormek
- ekipler arasi bilgi kopuklugunu azaltmak

### 12.3 Tasarim Hedefi

- standart admin pages
- cockpit style ops pages
- tek color language
- tek spacing / typography sistemi
- dark-mode cockpit variant if needed

---

## 13. Oncelikli Refactor Yol Haritasi

### Faz 1. Kritikleri Kapat

- `Settings` route ekle
- `Devices` menu’ye ekle veya route’tan kaldir
- duplicate pages karari ver
- broken navigation temizle

### Faz 2. Data Standardization

- React Query standardini uygula
- mock fallback politikasini duzelt
- service typing ve envelope handling standardize et

### Faz 3. Big Page Refactor

Parcalanmasi gereken sayfalar:

- `Businesses`
- `Events`
- `TicketCreationPage`
- `Dashboard`

### Faz 4. Cockpit Consolidation

Tek operasyon dili olustur:

- `Sales Command`
- `Gate Ops`
- `Customer Support`
- `Campaign Engine`
- `Settlement & Finance`

### Faz 5. Governance

- role matrix
- action audit
- saved views
- export center
- incident center

---

## 14. Sonuc

Bu admin panelde en degerli sey su:

Yeni ekranlar artik “bir veriyi gosterme” degil, “bir operasyonel problemi cozdurme” mantigina gecmis durumda. Bu urun yonu dogru.

Ama enterprise seviyeye cikmak icin kalan isler sunlar:

- duplicate ve broken alanlari temizlemek
- navigation ve information architecture’i olgunlastirmak
- veri erisim ve fallback stratejisini standardize etmek
- mock/demonstration hissi veren ekranlari gercek operational data flow ile tamamlamak
- dashboard’u butun platformu kapsayan gercek executive cockpit’e donusturmek

Bu belgeye gore hareket edilirse panel:

- daha tutarli
- daha guvenilir
- daha hizli kullanilabilir
- daha az hata yapan
- daha iyi olceklenen

bir admin sisteme donusecektir.

---

## 15. Ek Kontrol Listesi

Release oncesi su maddeler tek tek cevaplanmali:

- tum menu item’larinin route’u var mi
- tum route’lar menu veya deep-link mantigina oturuyor mu
- production’da sessiz mock fallback var mi
- her kritik aksiyon audit ediliyor mu
- destructive action’larda reason zorunlu mu
- tum listelerde filter reset var mi
- tum ana tablolar export destekliyor mu
- loading/empty/error state standardi tek mi
- KPI kartlari kaynak/veri tazelik bilgisini gosteriyor mu
- permission matrix tanimli mi
- dashboard butun platformu kapsiyor mu
- support, finance, event ops ve security birbiriyle bagli mi

