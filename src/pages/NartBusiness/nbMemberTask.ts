/**
 * Bir üyenin **tek** bekleyen işi.
 *
 * Üye listesi eskiden her satırda bir kebab menü taşıyordu: beş seçenek,
 * hepsi aynı ağırlıkta, hangisinin şu an gerektiğini satır söylemiyordu.
 * Oysa bir üyenin belirli bir anda yönetici açısından neredeyse her zaman
 * **tek** anlamlı işi olur — ödemesi onaylanacak, belgesi istenecek, komite
 * kararı verilecek. Menü o tek işi dört tıklama arkasına saklıyordu.
 *
 * Bu dosya "durum → sıradaki iş" eşlemesinin tek kaynağı. Liste satırındaki
 * buton, detay sayfasının birincil aksiyonu ve "aksiyon bekleyen" sayacı
 * üçü de buradan okur; üç yerde üç ayrı kural yazılsaydı sayaç ile satır
 * kaçınılmaz olarak birbirini tutmazdı.
 *
 * Sıra önemlidir: bir üye hem ödeme bekliyor hem profili eksik olabilir.
 * Para ve süre içeren iş her zaman önce gelir, çünkü geri döndürülmesi en
 * pahalı olan odur.
 */

import type { NbMember } from '../../services/nartbusiness/nbTypes';

/** Satırın açtığı akış. Butonun ne yapacağını çağıran taraf bu anahtardan bilir. */
export type NbTaskKind =
    | 'confirmPayment'   // Ödemeyi onayla — banka havalesi elle doğrulanır
    | 'reopenApproval'   // Onay süresi doldu, pencere yeniden açılır
    | 'committee'        // Komite kararı — doğrulama kuyruğuna gider
    | 'requestInfo'      // Ek bilgi / belge istenir
    | 'completeProfile'  // Eşleştirmeyi engelleyen alanlar eksik
    | 'trialEnding';     // Deneme bitiyor, üyeliğe geçirilecek

export interface NbMemberTask {
    kind: NbTaskKind;
    /** Satırdaki buton metni — emir kipinde, kısa. */
    label: string;
    /**
     * İşin aciliyeti. `due` para/süre kaybı doğuran işler içindir ve satırı
     * listenin başına taşır; `open` bekleyen ama saati işlemeyen iştir.
     */
    urgency: 'due' | 'open';
}

/** Eşleştirme motorunun çalışabilmesi için dolu olması gereken alanlar. */
const MATCHING_FIELDS: { key: keyof NbMember; label: string }[] = [
    { key: 'companyName', label: 'Resmî şirket adı' },
    { key: 'city', label: 'Şehir' },
];

/** Sektör iki alandan birinde tutuluyor; ikisi de boşsa sektör yok demektir. */
export function hasSector(m: NbMember): boolean {
    return Boolean(m.sectorCodes?.length) || Boolean(m.sectorCode);
}

/** Profili eşleştirmeye hazır olmayan üyenin eksik alanları, okunur adlarıyla. */
export function missingMatchingFields(m: NbMember): string[] {
    const missing = MATCHING_FIELDS.filter((f) => !m[f.key]).map((f) => f.label);
    if (!hasSector(m)) missing.push('Sektör');
    return missing;
}

/** Deneme bitişine kalan tam gün; deneme yoksa null. */
export function trialDaysLeft(trialEndsAt?: string): number | null {
    if (!trialEndsAt) return null;
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    return Math.ceil(ms / 86_400_000);
}

/** Denemesi bu kadar gün içinde bitiyorsa artık bir iştir, bilgi değil. */
export const TRIAL_ENDING_DAYS = 7;

/**
 * Üyenin sıradaki tek işi — yoksa `null`.
 *
 * `null` dönmesi "her şey yolunda" demektir ve satırda hiçbir buton
 * çizilmez. Aktif, ödemesi yapılmış, profili dolu bir üye için yapılacak
 * bir şey yoktur; oraya "Görüntüle" gibi bir buton koymak listeyi yine
 * her satırı eşit ağırlıkta bir tabloya çevirirdi.
 */
export function memberTask(m: NbMember): NbMemberTask | null {
    switch (m.status) {
        case 'APPROVED_PENDING_PAYMENT':
            return { kind: 'confirmPayment', label: 'Ödemeyi onayla', urgency: 'due' };

        case 'APPROVED_EXPIRED':
            return { kind: 'reopenApproval', label: 'Süreyi yeniden aç', urgency: 'due' };

        case 'EXPIRED':
            return { kind: 'reopenApproval', label: 'Dönemi yenile', urgency: 'due' };

        case 'SUBMITTED':
        case 'PENDING_VERIFICATION':
            return { kind: 'committee', label: 'Komite kararı', urgency: 'open' };

        case 'NEEDS_INFO':
            return { kind: 'requestInfo', label: 'Belge iste', urgency: 'open' };

        case 'TRIAL': {
            const left = trialDaysLeft(m.trialEndsAt);
            if (left != null && left <= TRIAL_ENDING_DAYS) {
                return { kind: 'trialEnding', label: 'Üyeliğe geçir', urgency: 'due' };
            }
            break;
        }

        default:
            break;
    }

    // Buraya düşen üye bir yaşam döngüsü işi beklemiyor; geriye yalnız
    // profilin eşleştirmeye hazır olup olmadığı kalır. Askıya alınmış ya da
    // iptal edilmiş üyede bunu sormak anlamsız — o üye zaten eşleşmiyor.
    const dormant = m.status === 'SUSPENDED' || m.status === 'CANCELLED' || m.status === 'REJECTED';
    if (!dormant && missingMatchingFields(m).length > 0) {
        return { kind: 'completeProfile', label: 'Eksik alanı iste', urgency: 'open' };
    }

    return null;
}

/** Aksiyon bekleyen üye sayısı — KPI kutusu ile satırlar aynı kuralı kullansın diye. */
export function countPendingTasks(members: NbMember[]): number {
    return members.filter((m) => memberTask(m) !== null).length;
}

/**
 * Listeyi işe göre sırala: bekleyen iş üstte, süre işleyenler en üstte.
 *
 * Sıralama istemcide yapılır ve **yalnız gelen sayfayı** kapsar; sunucu
 * tarafı aciliyet sıralaması eklenene kadar ikinci sayfadaki acil üye
 * birinci sayfada görünmez. Bu bilinen sınır, spec'te açık yazılı.
 */
export function sortByTask<T extends NbMember>(members: T[]): T[] {
    const weight = (m: NbMember) => {
        const t = memberTask(m);
        if (!t) return 2;
        return t.urgency === 'due' ? 0 : 1;
    };
    return [...members].sort((a, b) => weight(a) - weight(b));
}
