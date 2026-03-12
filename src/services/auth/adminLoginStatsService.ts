import { api } from '../api';
import { ApiResponse } from '../../types/api';
import {
  ActiveAlertDto,
  AnomalySpikeDto,
  AnomalySpikesQuery,
  AuditTimelineEventDto,
  AuditTimelineQuery,
  DailyLoginStatsDto,
  DeviceSummaryDto,
  FailureReasonStatsDto,
  FailureReasonStatsQuery,
  GeoSummaryDto,
  LatencySummaryDto,
  LoginStatsDateRangeQuery,
  LoginStatsOverviewDto,
  RecentLoginLogDto,
  RecentLoginStatsQuery,
  RecentLoggedInUserDto,
  RiskListQuery,
  RiskOverviewDto,
  RiskTopIpDto,
  RiskTopUserDto,
  SessionQualityDto,
  UserLoginStatsDto,
  UserLoginStatsQuery,
  EngagementOverviewDto,
  TopLoginUserDto,
  WeeklyActiveStatsDto,
  TopWeeklyUsersQuery,
} from '../../types/security/loginStats';
import { PageResponseDto } from '../../types/common/pageResponse';

const LOGIN_STATS_BASE_PATH = '/auth/admin/login-stats';
const MAX_RANGE_DAYS = 365;

const parseDateOnly = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const validateDateRange = (query?: LoginStatsDateRangeQuery): LoginStatsDateRangeQuery => {
  if (!query) {
    return {};
  }

  const { startDate, endDate } = query;

  if (!startDate || !endDate) {
    return { startDate, endDate };
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('startDate and endDate must be in yyyy-MM-dd format.');
  }

  if (start > end) {
    throw new Error('startDate cannot be greater than endDate.');
  }

  const diffInDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (diffInDays > MAX_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`);
  }

  return { startDate, endDate };
};

const validateNonNegative = (name: string, value?: number): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be an integer greater than or equal to 0.`);
  }

  return value;
};

const validatePositiveLimit = (name: string, value?: number): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be an integer greater than or equal to 1.`);
  }

  return value;
};

export const adminLoginStatsService = {
  getOverview: async (query?: LoginStatsDateRangeQuery): Promise<LoginStatsOverviewDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<LoginStatsOverviewDto>>(`${LOGIN_STATS_BASE_PATH}/overview`, { params });
    return response.data.data;
  },

  getDailyTrend: async (query?: LoginStatsDateRangeQuery): Promise<DailyLoginStatsDto[]> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<DailyLoginStatsDto[]>>(`${LOGIN_STATS_BASE_PATH}/daily`, { params });
    return response.data.data;
  },

  getFailureReasons: async (query?: FailureReasonStatsQuery): Promise<FailureReasonStatsDto[]> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
    };

    const response = await api.get<ApiResponse<FailureReasonStatsDto[]>>(`${LOGIN_STATS_BASE_PATH}/failure-reasons`, { params });
    return response.data.data;
  },

  getUserLoginStats: async (userId: string, query?: UserLoginStatsQuery): Promise<UserLoginStatsDto> => {
    if (!userId) {
      throw new Error('userId is required.');
    }

    const params = {
      ...validateDateRange(query),
      sourceLimit: validatePositiveLimit('sourceLimit', query?.sourceLimit),
    };

    const response = await api.get<ApiResponse<UserLoginStatsDto>>(`${LOGIN_STATS_BASE_PATH}/users/${userId}`, { params });
    return response.data.data;
  },

  getRecentLogs: async (query?: RecentLoginStatsQuery): Promise<RecentLoginLogDto[]> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
    };

    const response = await api.get<ApiResponse<RecentLoginLogDto[]>>(`${LOGIN_STATS_BASE_PATH}/recent`, { params });
    return response.data.data;
  },

  getRecentUsers: async (query?: RecentLoginStatsQuery): Promise<PageResponseDto<RecentLoggedInUserDto>> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
      page: validateNonNegative('page', query?.page),
      size: validatePositiveLimit('size', query?.size),
      sort: query?.sort,
      search: query?.search,
    };

    const response = await api.get<ApiResponse<PageResponseDto<RecentLoggedInUserDto>>>(`${LOGIN_STATS_BASE_PATH}/recent-users`, { params });
    return response.data.data;
  },

  getSessionQuality: async (query?: LoginStatsDateRangeQuery): Promise<SessionQualityDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<SessionQualityDto>>(`${LOGIN_STATS_BASE_PATH}/session-quality`, { params });
    return response.data.data;
  },

  getRiskOverview: async (query?: LoginStatsDateRangeQuery): Promise<RiskOverviewDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<RiskOverviewDto>>(`${LOGIN_STATS_BASE_PATH}/risk/overview`, { params });
    return response.data.data;
  },

  getRiskTopUsers: async (query?: RiskListQuery): Promise<RiskTopUserDto[]> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
    };

    const response = await api.get<ApiResponse<RiskTopUserDto[]>>(`${LOGIN_STATS_BASE_PATH}/risk/top-users`, { params });
    return response.data.data;
  },

  getRiskTopIps: async (query?: RiskListQuery): Promise<RiskTopIpDto[]> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
    };

    const response = await api.get<ApiResponse<RiskTopIpDto[]>>(`${LOGIN_STATS_BASE_PATH}/risk/top-ips`, { params });
    return response.data.data;
  },

  getGeoSummary: async (query?: LoginStatsDateRangeQuery): Promise<GeoSummaryDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<GeoSummaryDto>>(`${LOGIN_STATS_BASE_PATH}/geo/summary`, { params });
    return response.data.data;
  },

  getDeviceSummary: async (query?: LoginStatsDateRangeQuery): Promise<DeviceSummaryDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<DeviceSummaryDto>>(`${LOGIN_STATS_BASE_PATH}/devices/summary`, { params });
    return response.data.data;
  },

  getAnomalySpikes: async (query?: AnomalySpikesQuery): Promise<AnomalySpikeDto[]> => {
    const params = {
      ...validateDateRange(query),
      window: query?.window,
    };

    const response = await api.get<ApiResponse<AnomalySpikeDto[]>>(`${LOGIN_STATS_BASE_PATH}/anomaly/spikes`, { params });
    return response.data.data;
  },

  getLatencySummary: async (query?: LoginStatsDateRangeQuery): Promise<LatencySummaryDto> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<LatencySummaryDto>>(`${LOGIN_STATS_BASE_PATH}/latency/summary`, { params });
    return response.data.data;
  },

  getActiveAlerts: async (query?: LoginStatsDateRangeQuery): Promise<ActiveAlertDto[]> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<ActiveAlertDto[]>>(`${LOGIN_STATS_BASE_PATH}/alerts/active`, { params });
    return response.data.data;
  },

  getAuditTimeline: async (query?: AuditTimelineQuery): Promise<AuditTimelineEventDto[]> => {
    const params = {
      ...validateDateRange(query),
      userId: query?.userId,
      limit: validatePositiveLimit('limit', query?.limit),
    };

    const response = await api.get<ApiResponse<AuditTimelineEventDto[]>>(`${LOGIN_STATS_BASE_PATH}/audit/timeline`, { params });
    return response.data.data;
  },

  getEngagementOverview: async (): Promise<EngagementOverviewDto> => {
    const response = await api.get<ApiResponse<EngagementOverviewDto>>(`${LOGIN_STATS_BASE_PATH}/engagement/overview`);
    return response.data.data;
  },

  getTopWeeklyUsers: async (query?: TopWeeklyUsersQuery): Promise<TopLoginUserDto[]> => {
    const params = {
      ...validateDateRange(query),
      limit: validatePositiveLimit('limit', query?.limit),
    };
    const response = await api.get<ApiResponse<TopLoginUserDto[]>>(`${LOGIN_STATS_BASE_PATH}/engagement/top-weekly-users`, { params });
    return response.data.data;
  },

  getWeeklyEngagement: async (query?: LoginStatsDateRangeQuery): Promise<WeeklyActiveStatsDto[]> => {
    const params = validateDateRange(query);
    const response = await api.get<ApiResponse<WeeklyActiveStatsDto[]>>(`${LOGIN_STATS_BASE_PATH}/engagement/weekly`, { params });
    return response.data.data;
  },
};
