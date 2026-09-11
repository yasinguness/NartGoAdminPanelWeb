/**
 * Eşleşme sinyallerini insan cümlesine çevirir.
 *
 * Eşleştirme motoru `matchedOn` içinde ham sinyaller döndürüyor: sektör
 * anahtar kelimeleri ("hafriyat", "asfalt"), `"uzmanlık: kaynak"` biçiminde
 * serbest metin isabetleri, `"aynı il"` / `"aynı bölge"` yakınlık etiketi ve
 * `"OKAS"` kodu örtüşmesi.
 *
 * Panelde bu dizinin kendisi gösteriliyordu: yan yana dizilmiş altı çip.
 * Skoru gören ama **neden** o skoru aldığını tek bakışta okuyamayan kişi,
 * algoritmaya ya körlemesine güvenir ya da hiç güvenmez. Bu dosya sinyalleri
 * tek bir cümleye indiriyor — çipler ayrıntı olarak yanında durmaya devam
 * edebilir, ama karar cümleden okunur.
 *
 * Cümle **abartmaz**: iki kelime isabet ettiyse "güçlü uyum" demez. Skorun
 * kendisi zaten yanında yazılı; cümlenin işi skoru tekrar etmek değil,
 * skorun nereden geldiğini söylemek.
 */

/** Yakınlık etiketleri — backend `TenderGeography.label` ile birebir. */
const PROXIMITY = ['aynı il', 'aynı bölge'];

const EXPERTISE_PREFIX = 'uzmanlık: ';

export interface NbMatchSignals {
    /** Sektör anahtar kelimesi isabetleri. */
    sector: string[];
    /** Üyenin serbest metin uzmanlığından gelen isabetler. */
    expertise: string[];
    /** "aynı il" / "aynı bölge" — yoksa null. */
    proximity: string | null;
    /** Resmî sınıflandırma kodu örtüşmesi. */
    okas: boolean;
}

export function parseSignals(matchedOn: string[] | undefined | null): NbMatchSignals {
    const signals: NbMatchSignals = { sector: [], expertise: [], proximity: null, okas: false };
    (matchedOn ?? []).forEach((raw) => {
        const s = raw.trim();
        if (!s) return;
        if (s === 'OKAS') signals.okas = true;
        else if (PROXIMITY.includes(s)) signals.proximity = s;
        else if (s.startsWith(EXPERTISE_PREFIX)) signals.expertise.push(s.slice(EXPERTISE_PREFIX.length));
        else signals.sector.push(s);
    });
    return signals;
}

/**
 * Tek cümlelik gerekçe.
 *
 * En fazla iki anahtar kelime sayılır; üçüncüsünden sonrası cümleyi
 * uzatıyor ama ayırt ediciliği artırmıyor. Kalanı "+2 kelime daha" diye
 * özetlenir, böylece sayı kaybolmaz.
 */
export function matchReason(matchedOn: string[] | undefined | null): string {
    const { sector, expertise, proximity, okas } = parseSignals(matchedOn);
    const parts: string[] = [];

    if (okas) parts.push('resmî iş kodu birebir tutuyor');

    const words = [...sector, ...expertise];
    if (words.length > 0) {
        const shown = words.slice(0, 2).map((w) => `"${w}"`).join(' ve ');
        const rest = words.length - 2;
        parts.push(rest > 0 ? `${shown} (+${rest} kelime daha) geçiyor` : `${shown} geçiyor`);
    }

    if (proximity) parts.push(proximity);

    // Sinyalsiz eşleşme kaydedilmiyor (eşik 40); yine de savunmacı davranıyoruz:
    // sebebi olmayan bir skoru gerekçesiz göstermektense açıkça söylemek yeğdir.
    if (parts.length === 0) return 'Gerekçe kaydedilmemiş — skoru tek başına okuma.';

    const sentence = parts.join(', ');
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

/**
 * İhale başındaki "sistem bu ihaleyi neden eşleştirdi" etiketleri.
 *
 * Tek tek üyelerin sebeplerinin **birleşimi**: ihalenin hangi eksenlerden
 * ağa dokunduğunu gösterir. Üye başına gerekçe aşağıda zaten var; buradaki
 * etiketler ihalenin kendisi hakkında.
 */
export function tenderMatchTags(matches: { matchedOn: string[] }[]): string[] {
    const sectors = new Set<string>();
    let sameProvince = 0;
    let okas = false;

    matches.forEach((m) => {
        const s = parseSignals(m.matchedOn);
        s.sector.forEach((w) => sectors.add(w));
        if (s.proximity === 'aynı il') sameProvince += 1;
        if (s.okas) okas = true;
    });

    const tags: string[] = [];
    if (okas) tags.push('resmî iş kodu eşleşmesi');
    // En sık geçen üç kelime yeterli: etiket şeridi bir kelime bulutu değil.
    [...sectors].slice(0, 3).forEach((w) => tags.push(w));
    if (sameProvince > 0) tags.push(`${sameProvince} üye aynı ilde`);
    return tags;
}
