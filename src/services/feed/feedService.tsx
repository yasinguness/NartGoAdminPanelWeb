import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
    FeedCreateRequest,
    FeedDto,
    FeedQueryParams,
    FeedStatusUpdateRequest,
    FeedUpdateRequest
} from '../../types/feed/feedModel';

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
        const response = await api.get<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${id}`);
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

    updateFeed: async (id: string, payload: FeedUpdateRequest) => {
        const response = await api.put<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${id}`, payload);
        return response.data;
    },

    updateFeedStatus: async (id: string, payload: FeedStatusUpdateRequest) => {
        const response = await api.put<ApiResponse<FeedDto>>(`/content/admin/feed/videos/${id}/status`, payload);
        return response.data;
    },
    
    deleteFeed: async (id: string) => {
        const response = await api.delete<ApiResponse<void>>(`/content/admin/feed/videos/${id}`);
        return response.data;
    }
};
