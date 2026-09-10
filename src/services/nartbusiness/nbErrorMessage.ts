/**
 * Sunucudan gelen hata mesajını okur.
 *
 * NB servisleri hatayı `ErrorResponse` ile döndürüyor ve `message` **üst
 * seviyede** duruyor:
 *
 * ```json
 * { "errorId": "...", "status": 422, "code": "BUSINESS_RULE_VIOLATION",
 *   "message": "Ödeme penceresi yalnız süresi dolmuş ... üyede açılabilir" }
 * ```
 *
 * Panel bir süre `data.error.message` yolunu okudu (37 yerde). O yol hiçbir
 * zaman dolu gelmediği için her başarısız aksiyonda admin gerçek sebebi değil
 * axios'un genel metnini ("Request failed with status code 422") görüyordu.
 * Aksiyon "sebepsiz çalışmıyor" gibi görünüyordu.
 *
 * Her iki şekli de okur: eski `error.message` bir gün geri gelirse de çalışır.
 */
export function nbErrorMessage(e: unknown, fallback = 'İşlem başarısız'): string {
  const anyErr = e as {
    response?: { data?: { message?: string; error?: { message?: string }; details?: Record<string, string> } };
    message?: string;
  };
  const data = anyErr?.response?.data;

  const direct = data?.message?.trim();
  if (direct) {
    // Doğrulama hatalarında alan bazlı ayrıntı da varsa ekle; "Doğrulama
    // hatası" tek başına neyin yanlış olduğunu söylemiyor.
    const details = data?.details;
    if (details && Object.keys(details).length) {
      return `${direct}: ${Object.values(details).join(', ')}`;
    }
    return direct;
  }

  const nested = data?.error?.message?.trim();
  if (nested) return nested;

  return anyErr?.message?.trim() || fallback;
}

export default nbErrorMessage;
