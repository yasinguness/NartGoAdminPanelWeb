export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ArticleCategory {
  NEWS = 'NEWS',
  CULTURE = 'CULTURE',
  HISTORY = 'HISTORY',
  TRAVEL = 'TRAVEL',
  FOOD = 'FOOD',
  COMMUNITY = 'COMMUNITY',
  MYTHOLOGY = 'MYTHOLOGY',
  EDUCATION = 'EDUCATION',
  SPORTS = 'SPORTS',
  TECHNOLOGY = 'TECHNOLOGY',
  MUSIC = 'MUSIC',
  NATURE = 'NATURE',
  INTERVIEW = 'INTERVIEW',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum ArticleType {
  ARTICLE = 'ARTICLE',
  NEWS = 'NEWS',
  GALLERY = 'GALLERY',
  VIDEO = 'VIDEO',
  PODCAST = 'PODCAST',
  EVENT_RECAP = 'EVENT_RECAP',
  GUIDE = 'GUIDE',
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  [ArticleCategory.NEWS]: 'Haber & Gündem',
  [ArticleCategory.CULTURE]: 'Kültür & Sanat',
  [ArticleCategory.HISTORY]: 'Tarih & Miras',
  [ArticleCategory.TRAVEL]: 'Gezi & Keşif',
  [ArticleCategory.FOOD]: 'Mutfak & Lezzet',
  [ArticleCategory.COMMUNITY]: 'Topluluk & Dernek',
  [ArticleCategory.MYTHOLOGY]: 'Mitoloji & Efsaneler',
  [ArticleCategory.EDUCATION]: 'Eğitim & Bilgi',
  [ArticleCategory.SPORTS]: 'Spor & Aktif Yaşam',
  [ArticleCategory.TECHNOLOGY]: 'Teknoloji & Dijital',
  [ArticleCategory.MUSIC]: 'Müzik & Sahne',
  [ArticleCategory.NATURE]: 'Doğa & Çevre',
  [ArticleCategory.INTERVIEW]: 'Röportaj & Söyleşi',
  [ArticleCategory.ANNOUNCEMENT]: 'Duyuru & İlan',
};

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  [ArticleStatus.DRAFT]: 'Taslak',
  [ArticleStatus.PUBLISHED]: 'Yayında',
  [ArticleStatus.ARCHIVED]: 'Arşiv',
};

export const TYPE_LABELS: Record<ArticleType, string> = {
  [ArticleType.ARTICLE]: 'Makale',
  [ArticleType.NEWS]: 'Kısa Haber',
  [ArticleType.GALLERY]: 'Fotoğraf Galerisi',
  [ArticleType.VIDEO]: 'Video İçerik',
  [ArticleType.PODCAST]: 'Podcast',
  [ArticleType.EVENT_RECAP]: 'Etkinlik Özeti',
  [ArticleType.GUIDE]: 'Rehber',
};

export type MediaVariantKind = 'thumbnail' | 'card' | 'mobileHero' | 'desktopHero' | 'fullscreen';

export interface MediaVariantDto {
  kind: MediaVariantKind;
  url: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export interface CoverMediaDto {
  originalUrl: string;
  width?: number;
  height?: number;
  mimeType?: string;
  alt?: string;
  focalPointX: number;
  focalPointY: number;
  variants: MediaVariantDto[];
}

export interface CoverMediaRequest {
  originalUrl: string;
  width?: number;
  height?: number;
  mimeType?: string;
  alt?: string;
  focalPointX?: number;
  focalPointY?: number;
}

export interface ArticleMediaDto {
  id: string;
  mediaUrl: string;
  caption?: string;
  orderIndex: number;
}

export interface ArticleDto {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  body?: string;
  contentType: ArticleType;
  category: ArticleCategory;
  status: ArticleStatus;
  featured: boolean;
  breakingNews: boolean;
  coverMedia?: CoverMediaDto;
  readTimeMinutes: number;
  viewCount: number;
  author?: string;
  tags?: string[];
  media?: ArticleMediaDto[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleCreateRequest {
  title: string;
  slug?: string;
  summary?: string;
  body?: string;
  contentType?: ArticleType;
  category: ArticleCategory;
  coverMedia?: CoverMediaRequest;
  author?: string;
  tags?: string[];
  featured?: boolean;
  breakingNews?: boolean;
}
