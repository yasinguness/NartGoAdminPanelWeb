import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
    FeedCreateRequest,
    FeedDto,
    InstagramImportRequest,
    InstagramImportResponse,
    FeedQueryParams,
    FeedStatusUpdateRequest,
    FeedUpdateRequest
} from '../../types/feed/feedModel';

const INSTAGRAM_IMPORT_ENDPOINT =
    import.meta.env.VITE_INSTAGRAM_IMPORT_ENDPOINT || '/media/import/instagram';

const normalizeVideoId = (id: string) => {
    const trimmed = id?.trim();
    if (!trimmed) {
        throw new Error('Invalid videoId: expected a single path segment (UUID-like id).');
    }

    let candidate = trimmed;
    try {
        candidate = decodeURIComponent(candidate);
    } catch {
        // Keep original value when decode fails
    }

    if (candidate.includes('/')) {
        candidate = candidate.split('/').pop() || '';
    }

    candidate = candidate.split('?')[0].split('#')[0].replace(/\.[^./]+$/, '').trim();

    if (!candidate || candidate.includes('/')) {
        throw new Error('Invalid videoId: expected a single path segment (UUID-like id).');
    }

    return candidate;
};

const buildCandidateVideoIds = (ids: string[]) => {
    const normalized = ids
        .map((value) => {
            try {
                return normalizeVideoId(value);
            } catch {
                return '';
            }
        })
        .filter(Boolean);

    return Array.from(new Set(normalized));
};

export const feedService = {
    getFeeds: async (params: FeedQueryParams = {}) => {
        const response = await api.get<ApiResponse<PageResponseDto<FeedDto> | FeedDto[]>>('/content/admin/feed/videos', {
            params: {
                ...params,
                page: params.page ?? 0,
                size: params.size ?? 10
            }
        });
        return response.data;
    },

    getFeedById: async (id: string) => {
        const videoId = normalizeVideoId(id);
        const response = await api.get<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${videoId}`);
        return response.data;
    },

    createFeed: async (payload: FeedCreateRequest, creatorEmail: string) => {
        const response = await api.post<ApiResponse<FeedDto>>(
            '/content/admin/feed/videos',
            payload,
            { params: { creatorEmail } }
        );
        return response.data;
    },

    importFromInstagram: async (payload: InstagramImportRequest) => {
        const response = await api.post<ApiResponse<InstagramImportResponse>>(
            INSTAGRAM_IMPORT_ENDPOINT,
            payload
        );
        return response.data;
    },

    updateFeed: async (id: string, payload: FeedUpdateRequest) => {
        const videoId = normalizeVideoId(id);
        const response = await api.put<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${videoId}`, payload);
        return response.data;
    },

    updateFeedStatus: async (id: string, payload: FeedStatusUpdateRequest) => {
        const videoId = normalizeVideoId(id);
        const response = await api.put<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${videoId}/status`, payload);
        return response.data;
    },
    
    deleteFeed: async (id: string, fallbackIds: string[] = []) => {
        const candidateIds = buildCandidateVideoIds([id, ...fallbackIds]);
        let lastNotFoundError: unknown;

        for (const videoId of candidateIds) {
            try {
                const response = await api.delete<ApiResponse<void>>(`/content/admin/feed/videos/${videoId}`);
                return response.data;
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    lastNotFoundError = error;
                    continue;
                }
                throw error;
            }
        }

        if (lastNotFoundError) {
            throw lastNotFoundError;
        }
        throw new Error('Invalid videoId: no deletable candidate could be derived.');
    }
};
