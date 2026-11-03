import { api } from '../api';
import { businessService } from './businessService';
import { businessClaimService } from './businessClaimService';
import type { BusinessDto } from '../../types/businesses/businessModel';
import type { BusinessClaimResponse } from '../../types/businesses/businessClaimModel';

/**
 * Öne çıkarma uygunluk eksiklerini yerinde gidermek için ince bir katman.
 *
 * Sunucu `missing()` ile beş eksik döndürüyor (PHOTO, CATEGORY, CITY,
 * INACTIVE, OWNERSHIP) ama bunları düzeltmenin tek bir ucu yok; her biri
 * farklı yerden çözülüyor. Admin'i beş ayrı sayfaya göndermemek için
 * hepsini burada topluyoruz.
 *
 * Dikkat: işletme güncellemenin tek yolu `PUT /businesses/{id}` ve
 * **multipart**. `PATCH /businesses/{id}` sunucuda yok (controller'da yalnız
 * `/{id}/status`, `/{id}/verify`, `/{id}/featured` var), bu yüzden
 * `businessService.updateBusinessFields` bu uca 405 alır — kullanılmamalı.
 * Doğru akış: işletmeyi oku, alanı değiştir, tamamını geri gönder.
 */

export interface SimpleCategory { id: string; name: string }

const unwrap = <T,>(body: unknown): T => {
  const b = body as { data?: T } | T;
  return (b && typeof b === 'object' && 'data' in (b as object) ? (b as { data: T }).data : b) as T;
};

export const eligibilityFixService = {
  /** Kategori listesi (yalnız aktif olanlar). */
  async categories(): Promise<SimpleCategory[]> {
    const res = await api.get('/businesses/categories', { params: { language: 'tr' } });
    const list = unwrap<Array<{ id: string; name: string; active?: boolean }>>(res.data) ?? [];
    return list.filter((c) => c.active !== false).map((c) => ({ id: c.id, name: c.name }));
  },

  /**
   * Bir alanı değiştirip işletmeyi geri yazar.
   *
   * Tam DTO gönderilir: sunucu `@Valid BusinessDto` bekliyor, kısmi gövde
   * doğrulamadan geçmez. Görsel alanları `undefined` bırakılır ki mevcut
   * görseller silinmesin.
   */
  async patchBusiness(businessId: string, patch: Partial<BusinessDto>, profileImage?: File): Promise<BusinessDto> {
    const current = unwrap<BusinessDto>((await businessService.getBusinessById(businessId)) as unknown);
    const merged: BusinessDto = { ...current, ...patch };

    const form = new FormData();
    // `business` parçası Blob olarak ve application/json tipiyle gidiyor:
    // sunucu tarafı `@RequestPart("business") BusinessDto` bekliyor, düz metin
    // parçayı dönüştüremez.
    form.append('business', new Blob([JSON.stringify(merged)], { type: 'application/json' }));
    if (profileImage) form.append('profileImage', profileImage);

    // Content-Type'ı burada ezmek şart: `api` örneğinin varsayılanı
    // application/json ve axios o başlıkla FormData'yı JSON'a çeviriyor —
    // gövde `{"business":{}}` olarak gidiyor, dosya ve alanlar kayboluyordu.
    const res = await api.put(`/businesses/${businessId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<BusinessDto>(res.data);
  },

  /** Kategori ata. */
  categorize(businessId: string, categoryId: string) {
    return this.patchBusiness(businessId, { categoryId });
  },

  /** Adresteki ili düzelt (sunucu ili bu metinden çözüyor). */
  async setCity(businessId: string, city: string): Promise<BusinessDto> {
    const current = unwrap<BusinessDto>((await businessService.getBusinessById(businessId)) as unknown);
    return this.patchBusiness(businessId, {
      address: { ...current.address, city, country: current.address?.country || 'Türkiye', countryCode: 'TR' },
    } as Partial<BusinessDto>);
  },

  /** Profil görseli yükle (PHOTO eksiği için yeterli). */
  uploadPhoto(businessId: string, file: File) {
    return this.patchBusiness(businessId, {}, file);
  },

  /**
   * Yayına al. Uç bir anahtar (`toggle`) olduğu için yalnız kapalıyken
   * çağrılmalı; açıkken çağrılırsa işletmeyi kapatır.
   */
  async activate(businessId: string): Promise<BusinessDto> {
    const res = await api.patch(`/businesses/${businessId}/status`);
    return unwrap<BusinessDto>(res.data);
  },

  /**
   * Bu işletme için bekleyen sahiplenme talebi. Sunucuda işletmeye göre
   * filtre yok, bu yüzden bekleyenlerin ilk sayfalarında arıyoruz.
   */
  async pendingClaim(businessId: string): Promise<BusinessClaimResponse | null> {
    for (let page = 0; page < 5; page += 1) {
      const res = await businessClaimService.getClaims({ status: 'PENDING', page, size: 100 });
      const items = res?.content ?? [];
      const hit = items.find((c) => c.businessId === businessId);
      if (hit) return hit;
      if (items.length < 100) break;
    }
    return null;
  },


  /**
   * İşletmenin beyan edilen sahibi (varsa) ve kim olduğu.
   *
   * `ownerId` ile `claimStatus` farklı şeyler: ilki işletmeyi ekleyen kişinin
   * kendini sahip ilan etmesi, ikincisi admin'in bunu doğrulaması. Sunucunun
   * uygunluk kontrolü (2026-11-03) bilerek ikincisini arıyor, ama panel
   * "doğrulanmamış"ı "sahibi yok" gibi okutmamalı. Liste ucu ownerId
   * döndürmediği için tam kayıt okunuyor.
   */
  async declaredOwner(businessId: string): Promise<{ id: string; label: string } | null> {
    const b = unwrap<BusinessDto>((await businessService.getBusinessById(businessId)) as unknown);
    const ownerId = b?.ownerId;
    if (!ownerId) return null;
    try {
      const res = await api.get(`/auth/users/${ownerId}`);
      const u = unwrap<{ email?: string; firstName?: string; lastName?: string }>(res.data);
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      return { id: ownerId, label: name || u?.email || ownerId };
    } catch {
      return { id: ownerId, label: ownerId };
    }
  },

  /** Sahiplenme talebini onayla — OWNERSHIP eksiğini kapatan tek yol. */
  approveClaim(claimId: string, note: string) {
    return businessClaimService.reviewClaim(claimId, {
      decision: 'APPROVE',
      verificationNotes: note,
    } as Parameters<typeof businessClaimService.reviewClaim>[1]);
  },
};
