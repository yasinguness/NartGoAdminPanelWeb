/**
 * Kullanıcı Etkileşimi (Engagement) modül tipleri.
 * Backend endpoint'leri:
 *   GET /auth/admin/analytics/inactive-users
 *   GET /auth/admin/analytics/login-frequency
 *   POST /notifications/admin/push/bulk
 */

export type EngagementPlatform = 'MOBILE' | 'WEB' | 'ALL' | string;

export interface InactiveUserDto {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  lastLoginAt?: string | null;
  daysSinceLastLogin: number;
  platform?: EngagementPlatform;
}

export interface InactiveUsersPage {
  content: InactiveUserDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface LoginFrequencyDto {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  loginCount: number;
  lastLoginAt?: string | null;
  avgLoginsPerDay?: number;
  platform?: EngagementPlatform;
}

export interface BulkPushRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
}

export interface BulkPushErrorDto {
  userId: string;
  reason: string;
}

export interface BulkPushResponse {
  totalTargeted: number;
  queued: number;
  failed: number;
  errors: BulkPushErrorDto[];
}
