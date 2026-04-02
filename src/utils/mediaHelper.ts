import type { CoverMediaDto, MediaVariantKind } from '../types/article/articleModel';

/**
 * Returns the URL for the requested variant of a cover media object.
 * Falls back to originalUrl if the variant is not found.
 * Safe to call with null/undefined — returns empty string.
 */
export function getArticleImage(
  media: CoverMediaDto | null | undefined,
  variant: MediaVariantKind,
): string {
  if (!media?.originalUrl) return '';
  const found = media.variants?.find(v => v.kind === variant);
  return found?.url ?? media.originalUrl;
}

/**
 * Returns the aspect ratio CSS string for a given variant.
 * e.g. getAspectRatio('card') => '4/3'
 */
export function getVariantAspectRatio(variant: MediaVariantKind): string {
  const map: Record<MediaVariantKind, string> = {
    thumbnail:   '4/3',
    card:        '4/3',
    mobileHero:  '4/5',
    desktopHero: '16/9',
    fullscreen:  '16/9',
  };
  return map[variant];
}

/**
 * Returns CSS object-position string from focal point coords.
 * focalPointX/Y are 0.0–1.0 normalized.
 */
export function getFocalObjectPosition(media: CoverMediaDto | null | undefined): string {
  if (!media) return 'center center';
  const x = Math.round((media.focalPointX ?? 0.5) * 100);
  const y = Math.round((media.focalPointY ?? 0.33) * 100);
  return `${x}% ${y}%`;
}
