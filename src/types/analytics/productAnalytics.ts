/**
 * Ürün kullanım analitiği (mobile SDK → /analytics/events/track).
 * Admin panel sadece aggregate read endpoint'lerini kullanır.
 */

export interface TopEventDto {
  eventName: string;
  count: number;
}

export interface PlatformBreakdownDto {
  platform: string;
  userCount: number;
}

export interface DailyTrendPointDto {
  date: string; // ISO date (yyyy-MM-dd)
  count: number;
}

export interface FirstScreenDistributionDto {
  screenName: string;
  userCount: number;
  percentage: number;
}
