import { api } from '../api';
import { ScheduleConfig, ScheduleType } from '../../types/notifications/scheduling';
import { RateLimitConfig, createRateLimitConfig } from '../../types/notifications/rateLimit';

// ─── DTOs ──────────────────────────────────────────────────
interface ApiResponse<T> {
    data: T;
    success: boolean;
}

// ─── Service ───────────────────────────────────────────────
export const schedulingService = {
    /**
     * Validate a schedule config (client-side)
     */
    validateSchedule: (config: ScheduleConfig): { valid: boolean; error?: string } => {
        if (config.type === ScheduleType.SCHEDULED) {
            if (!config.scheduledAt) {
                return { valid: false, error: 'Zamanlanan gönderim için tarih seçilmelidir.' };
            }
            const scheduledDate = new Date(config.scheduledAt);
            if (scheduledDate <= new Date()) {
                return { valid: false, error: 'Zamanlanan tarih gelecekte olmalıdır.' };
            }
        }
        if (config.type === ScheduleType.USER_TIMEZONE) {
            if (!config.userLocalTime) {
                return { valid: false, error: 'Kullanıcı saat dilimi gönderimi için saat seçilmelidir.' };
            }
        }
        return { valid: true };
    },

    /**
     * Get the current rate limit config from backend
     */
    getRateLimitConfig: async (): Promise<RateLimitConfig> => {
        try {
            const response = await api.get<ApiResponse<RateLimitConfig>>(
                '/notifications/admin/settings/rate-limit'
            );
            return response.data.data;
        } catch {
            return createRateLimitConfig();
        }
    },

    /**
     * Save rate limit config to backend
     */
    saveRateLimitConfig: async (config: RateLimitConfig): Promise<RateLimitConfig> => {
        const response = await api.put<ApiResponse<RateLimitConfig>>(
            '/notifications/admin/settings/rate-limit',
            config
        );
        return response.data.data;
    },
};
