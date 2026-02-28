import { api } from '../api';
import {
    AudienceSegment, SegmentFilter, AVAILABLE_FILTERS, FilterOption,
} from '../../types/notifications/audience';

// ─── DTOs ──────────────────────────────────────────────────
interface ApiResponse<T> {
    data: T;
    success: boolean;
}

interface AudienceEstimateResponse {
    totalEstimatedReach: number;
    deviceBasedReach: number;
    profileBasedReach: number;
    appliedFilters: number;
}

// ─── Service ───────────────────────────────────────────────
export const audienceService = {
    /**
     * Get available filter options (client-side metadata)
     */
    getAvailableFilters: async (): Promise<FilterOption[]> => {
        return AVAILABLE_FILTERS;
    },

    /**
     * Get preset segments from backend
     */
    getPresetSegments: async (): Promise<AudienceSegment[]> => {
        const response = await api.get<ApiResponse<AudienceSegment[]>>(
            '/notifications/admin/audience/presets'
        );
        return response.data.data;
    },

    /**
     * Estimate reach for a set of filters
     */
    estimateReach: async (filters: SegmentFilter[]): Promise<AudienceEstimateResponse> => {
        const requestFilters = filters.map(f => ({
            type: f.type,
            operator: f.operator,
            value: f.value,
        }));

        const response = await api.post<ApiResponse<AudienceEstimateResponse>>(
            '/notifications/admin/audience/estimate',
            { filters: requestFilters }
        );
        return response.data.data;
    },
};
