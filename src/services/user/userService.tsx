import { api } from '../api';
import {
    UserDTO,
    UserStatusEnum,
    AccountType,
    Language,
    AdminUserStats,
    UserActivitySummary,
    ActivityLogItem,
    AdminNote,
    UserLoginStatsDto
} from '../../types/users/userModel';
import { PageResponseDto } from '../../types/common/pageResponse';
import { AddressDTO } from '../../types/businesses/addressModel';
import {
    AdminUserGamificationRewardDetailDto,
    AdminUserGamificationRewardsPage,
    AdminUserGamificationRewardsQuery,
} from '../../types/gamification/adminUserGamification';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    statusCode: number;
    statusMessage: string;
}

export const userService = {
    // Get current authenticated user
    getCurrentUser: async () => {
        const response = await api.get<ApiResponse<UserDTO>>('/auth/me');
        return response.data;
    },

    // Get all users
    getAllUsers: async (params?: {
        page?: number;
        size?: number;
        keyword?: string;
        status?: UserStatusEnum;
        accountType?: AccountType;
        countryCode?: string;
        currentCity?: string;
        currentDistrict?: string;
        hometownCity?: string;
        hometownVillage?: string;
        language?: Language;
        birthDateFrom?: string; // Format: yyyy-MM-dd
        birthDateTo?: string; // Format: yyyy-MM-dd
    }) => {
        const response = await api.get<ApiResponse<PageResponseDto<UserDTO>>>('/auth/all-users', {
            params: {
                ...params,
                accountType: params?.accountType || undefined,
                status: params?.status || undefined,
                language: params?.language || undefined
            }
        });
        return response.data;
    },

    // Update user role
    updateUserRole: async (userId: string, roles: string[]) => {
        const response = await api.put<ApiResponse<UserDTO>>(`/auth/users/${userId}/role`, { roles });
        return response.data;
    },

    // Toggle user status
    toggleUserStatus: async (userId: string, status: UserStatusEnum) => {
        const response = await api.put<ApiResponse<UserDTO>>(`/auth/users/${userId}/status`, { status });
        return response.data;
    },

    // Get user activity logs
    getUserActivityLogs: async (userId: string, page = 0, size = 10) => {
        const response = await api.get<ApiResponse<PageResponseDto<UserActivity>>>(`/auth/users/${userId}/activity`, {
            params: { page, size }
        });
        return response.data;
    },

    // Delete user account
    deleteAccountById: async (userId: string) => {
        const response = await api.delete<ApiResponse<void>>(`/auth/delete-account/${userId}`);
        return response.data;
    },

    // Update user
    updateUser: async (userId: string, userData: Partial<UserDTO>) => {
        const response = await api.put<ApiResponse<UserDTO>>(`/auth/users/user/${userId}`, userData);
        return response.data;
    },

    // Get user by ID
    getUserById: async (userId: string) => {
        const response = await api.get<ApiResponse<UserDTO>>(`/auth/users/${userId}`);
        return response.data;
    },

    // Get user by ID for admin panel (includes all fields)
    getUserAdmin: async (userId: string) => {
        const response = await api.get<ApiResponse<UserDTO>>(`/auth/user/${userId}`);
        return response.data;
    },

    // Update user for admin panel (updates both DB and Keycloak)
    updateUserAdmin: async (userId: string, userData: UserDTO) => {
        const response = await api.put<ApiResponse<UserDTO>>(`/auth/user/${userId}`, userData);
        return response.data;
    },

    // Admin - User gamification rewards list
    getUserGamificationRewards: async (userId: string, params?: AdminUserGamificationRewardsQuery) => {
        const response = await api.get<ApiResponse<AdminUserGamificationRewardsPage>>(
            `/auth/admin/users/${userId}/gamification-rewards`,
            { params }
        );
        return response.data;
    },

    // Admin - User gamification reward detail
    getUserGamificationRewardDetail: async (userId: string, rewardId: string) => {
        const response = await api.get<ApiResponse<AdminUserGamificationRewardDetailDto>>(
            `/auth/admin/users/${userId}/gamification-rewards/${rewardId}`
        );
        return response.data;
    },

    // Admin - Revert a user gamification reward
    deleteUserGamificationReward: async (userId: string, rewardId: string) => {
        const response = await api.delete<ApiResponse<void>>(
            `/auth/admin/users/${userId}/gamification-rewards/${rewardId}`
        );
        return response.data;
    },

    // Admin - Get user stats for dashboard
    getUserStats: async () => {
        const response = await api.get<ApiResponse<AdminUserStats>>('/auth/admin/login-stats/users/stats');
        return response.data;
    },

    // Admin - Get user activity summary
    getActivitySummary: async (userId: string) => {
        const response = await api.get<ApiResponse<UserActivitySummary>>(`/auth/admin/login-stats/users/${userId}/activity-summary`);
        return response.data;
    },

    // Admin - Get user activity log (legacy list endpoint)
    getActivityLog: async (userId: string, limit = 100) => {
        const response = await api.get<ApiResponse<ActivityLogItem[]>>(`/auth/admin/login-stats/users/${userId}/activity-log`, {
            params: { limit }
        });
        return response.data;
    },

    // Admin - Get user activity log paginated with filters
    getActivityLogPaged: async (
        userId: string,
        params?: {
            startDate?: string;
            endDate?: string;
            status?: string;
            page?: number;
            size?: number;
        }
    ) => {
        const response = await api.get<ApiResponse<PageResponseDto<ActivityLogItem>>>(
            `/auth/admin/login-stats/users/${userId}/activity-log`,
            { params }
        );
        return response.data;
    },

    // Admin - Get per-user login statistics
    getUserLoginStats: async (
        userId: string,
        params?: { startDate?: string; endDate?: string; sourceLimit?: number }
    ) => {
        const response = await api.get<ApiResponse<UserLoginStatsDto>>(
            `/auth/admin/login-stats/users/${userId}`,
            { params }
        );
        return response.data;
    },

    // Admin - Send password reset email to user
    sendPasswordReset: async (userId: string) => {
        const response = await api.post<ApiResponse<void>>(`/auth/admin/users/${userId}/password-reset`);
        return response.data;
    },

    // Admin - Get admin notes for user
    getAdminNotes: async (userId: string) => {
        const response = await api.get<ApiResponse<AdminNote[]>>(`/auth/admin/users/${userId}/notes`);
        return response.data;
    },

    // Admin - Add admin note for user
    addAdminNote: async (userId: string, content: string) => {
        const response = await api.post<ApiResponse<AdminNote>>(`/auth/admin/users/${userId}/notes`, { content });
        return response.data;
    },

    // Admin - Delete admin note
    deleteAdminNote: async (noteId: string) => {
        const response = await api.delete<ApiResponse<void>>(`/auth/admin/users/notes/${noteId}`);
        return response.data;
    },
};
