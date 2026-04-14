/**
 * Türkçe alfabe sıra etiketleri — Q, W, X dahil.
 * Salon koltuk sıraları bu listeden atanır.
 */
export const TR_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'Q', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'W', 'X',
  'Y', 'Z',
];

/** Verilen indeks için Türkçe alfabe harfini döndürür. Taşarsa AA, AB… üretir. */
export function trLetterAt(index: number): string {
  if (index < TR_ALPHABET.length) return TR_ALPHABET[index];
  return `${TR_ALPHABET[index % TR_ALPHABET.length]}${Math.floor(index / TR_ALPHABET.length)}`;
}

/** Kullanılmayan bir sonraki harfi bul */
export function getNextAvailableLetter(usedNames: string[]): string {
  const usedSet = new Set(usedNames.map(n => n.toUpperCase()));
  for (const letter of TR_ALPHABET) {
    if (!usedSet.has(letter)) return letter;
  }
  for (let i = 1; i <= 99; i++) {
    const name = `${TR_ALPHABET[i % TR_ALPHABET.length]}${i}`;
    if (!usedSet.has(name)) return name;
  }
  return `S${usedNames.length + 1}`;
}

/** Alfabe sırasındaki bir sonraki harfi bul (son sıradan sonra gelen, kullanılmayan) */
export function getNextLetterAfter(lastRowName: string, usedNames: string[]): string {
  const usedSet = new Set(usedNames.map(n => n.toUpperCase()));
  const upper = lastRowName.toUpperCase();
  const idx = TR_ALPHABET.indexOf(upper);

  if (idx >= 0) {
    for (let i = idx + 1; i < TR_ALPHABET.length; i++) {
      if (!usedSet.has(TR_ALPHABET[i])) return TR_ALPHABET[i];
    }
  }

  return getNextAvailableLetter(usedNames);
}

/**
 * İki Türkçe alfabe harfi arasındaki tüm harfleri döndürür (dahil).
 * Örn: trRange('C', 'F') → ['C', 'Ç', 'D', 'E', 'F']
 */
export function trRange(from: string, to: string): string[] {
  const fromIdx = TR_ALPHABET.indexOf(from.toUpperCase());
  const toIdx = TR_ALPHABET.indexOf(to.toUpperCase());
  if (fromIdx < 0 || toIdx < 0) return [];
  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  return TR_ALPHABET.slice(start, end + 1);
}
