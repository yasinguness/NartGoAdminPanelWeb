import { PageResponseDto } from '../common/pageResponse';

export interface LoginStatsDateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface FailureReasonStatsQuery extends LoginStatsDateRangeQuery {
  limit?: number;
}

export interface UserLoginStatsQuery extends LoginStatsDateRangeQuery {
  sourceLimit?: number;
}

export interface RecentLoginStatsQuery extends LoginStatsDateRangeQuery {
  limit?: number;
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
}

export interface RiskListQuery extends LoginStatsDateRangeQuery {
  limit?: number;
}

export interface AuditTimelineQuery extends LoginStatsDateRangeQuery {
  userId?: string;
  limit?: number;
}

export interface AnomalySpikesQuery extends LoginStatsDateRangeQuery {
  window?: string;
}

export interface LoginStatsOverviewDto {
  startDate: string;
  endDate: string;
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  failureRate: number;
  uniqueUsers: number;
  usersWithFailures: number;
  lastSuccessfulLoginAt: string | null;
  lastFailedLoginAt: string | null;
}

export interface DailyLoginStatsDto {
  date: string;
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
}

export interface FailureReasonStatsDto {
  reason: string;
  count: number;
  ratio: number;
}

export interface LoginSourceBreakdownDto {
  source: string;
  totalAttempts: number;
  failedAttempts: number;
  lastSeenAt: string;
}

export interface UserLoginStatsDto {
  userId: string;
  userEmail: string;
  startDate: string;
  endDate: string;
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  lastSuccessfulLoginAt: string | null;
  lastFailedLoginAt: string | null;
  lastLoginIp: string | null;
  lastLoginDevice: string | null;
  dailyTrend: DailyLoginStatsDto[];
  ipBreakdown: LoginSourceBreakdownDto[];
  deviceBreakdown: LoginSourceBreakdownDto[];
  failureReasons: FailureReasonStatsDto[];
}

export interface RecentLoginLogDto {
  id?: string;
  userId?: string | null;
  userEmail?: string | null;
  status?: string | null;
  failureReason?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  deviceInfo?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt?: string | null;
}

export interface RecentLoggedInUserDto {
  userId: string;
  userEmail: string;
  displayName?: string | null;
  lastSessionAt: string;
  lastLoginAt: string | null;
}

export interface SessionQualityDto {
  startDate: string;
  endDate: string;
  loginSuccessCount: number;
  refreshSuccessCount: number;
  refreshFailureCount: number;
  totalSessionEvents: number;
  sessionResumeRate: number;
  refreshSuccessRate: number;
  avgSessionGapMinutes: number;
  medianSessionGapMinutes: number;
}

export interface RiskOverviewDto {
  startDate: string;
  endDate: string;
  highRiskUsers: number;
  highRiskIps: number;
  averageUserRiskScore: number;
  p95UserRiskScore: number;
  suspiciousEvents: number;
}

export interface RiskTopUserDto {
  userId: string;
  userEmail: string;
  totalAttempts: number;
  failureCount: number;
  failureRate: number;
  uniqueIpCount: number;
  uniqueDeviceCount: number;
  riskScore: number;
  topSignals: string[];
  lastSeenAt: string;
}

export interface RiskTopIpDto {
  ip: string;
  totalAttempts: number;
  failureCount: number;
  failureRate: number;
  affectedUsers: number;
  riskScore: number;
  lastSeenAt: string;
}

export interface GeoBreakdownDto {
  name: string;
  count: number;
  ratio: number;
}

export interface GeoSummaryDto {
  countryBreakdown: GeoBreakdownDto[];
  cityBreakdown: GeoBreakdownDto[];
  newCountryLogins24h: number;
}

export interface DeviceSummaryItemDto {
  name: string;
  count: number;
  ratio: number;
}

export interface DeviceSummaryDto {
  osBreakdown: DeviceSummaryItemDto[];
  appVersionBreakdown: DeviceSummaryItemDto[];
  newDeviceRate: number;
}

export interface AnomalySpikeDto {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  bucketStart: string;
  actualCount: number;
  baselineCount: number;
  deviationRate: number;
  message: string;
}

export interface LatencySummaryDto {
  loginP50: number;
  loginP95: number;
  loginP99: number;
  refreshP50: number;
  refreshP95: number;
  refreshP99: number;
  dependencyErrors: Record<string, number>;
}

export interface ActiveAlertDto {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  title: string;
  description: string;
  createdAt: string;
  status: string;
  assignee?: string | null;
}

export interface AuditTimelineEventDto {
  eventId: string;
  eventType: string;
  status: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  device: string | null;
  failureReason: string | null;
  createdAt: string;
  source: string | null;
}

export interface EngagementOverviewDto {
  asOfDate: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  dailyLoginCount: number;
  weeklyLoginCount: number;
  monthlyLoginCount: number;
  dauWauRatio: number;
  wauMauRatio: number;
}

export interface TopLoginUserDto {
  userId: string;
  userEmail: string | null;
  displayName: string | null;
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  successRate: number;
  lastLoginAt: string | null;
}

export interface WeeklyActiveStatsDto {
  weekStartDate: string;
  weekEndDate: string;
  activeUsers: number;
  totalAttempts: number;
  successfulLogins: number;
  failedLogins: number;
}

export interface TopWeeklyUsersQuery extends LoginStatsDateRangeQuery {
  limit?: number;
}
