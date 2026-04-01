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
}

export enum ArticleType {
  ARTICLE = 'ARTICLE',
  NEWS = 'NEWS',
  GALLERY = 'GALLERY',
}

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  [ArticleCategory.NEWS]: 'Haber',
  [ArticleCategory.CULTURE]: 'Kultur',
  [ArticleCategory.HISTORY]: 'Tarih',
  [ArticleCategory.TRAVEL]: 'Seyahat',
  [ArticleCategory.FOOD]: 'Mutfak',
  [ArticleCategory.COMMUNITY]: 'Topluluk',
  [ArticleCategory.MYTHOLOGY]: 'Mitoloji',
};

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  [ArticleStatus.DRAFT]: 'Taslak',
  [ArticleStatus.PUBLISHED]: 'Yayinda',
  [ArticleStatus.ARCHIVED]: 'Arsiv',
};

export const TYPE_LABELS: Record<ArticleType, string> = {
  [ArticleType.ARTICLE]: 'Makale',
  [ArticleType.NEWS]: 'Kisa Haber',
  [ArticleType.GALLERY]: 'Galeri',
};

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
  coverImageUrl?: string;
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
  coverImageUrl?: string;
  author?: string;
  tags?: string[];
  featured?: boolean;
  breakingNews?: boolean;
}
