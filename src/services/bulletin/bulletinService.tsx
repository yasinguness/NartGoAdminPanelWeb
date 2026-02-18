import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
    BulletinCreateRequest,
    BulletinDto,
    BulletinQueryParams,
    BulletinStatusUpdateRequest,
    BulletinUpdateRequest
} from '../../types/bulletin/bulletinModel';

export const bulletinService = {
    getBulletins: async (params: BulletinQueryParams = {}) => {
        const response = await api.get<ApiResponse<PageResponseDto<BulletinDto> | BulletinDto[]>>('/content/admin/bulletins', {
            params: {
                ...params,
                page: params.page ?? 0,
                size: params.size ?? 10
            }
        });
        return response.data;
    },

    getBulletinById: async (id: string) => {
        const response = await api.get<ApiResponse<BulletinDto>>(`/content/admin/bulletins/${id}`);
        return response.data;
    },

    createBulletin: async (payload: BulletinCreateRequest, publisherEmail: string) => {
        const response = await api.post<ApiResponse<BulletinDto>>(
            '/content/admin/bulletins',
            payload,
            { params: { publisherEmail } }
        );
        return response.data;
    },

    updateBulletin: async (id: string, payload: BulletinUpdateRequest) => {
        const response = await api.put<ApiResponse<BulletinDto>>(`/content/admin/bulletins/${id}`, payload);
        return response.data;
    },

    updateBulletinStatus: async (id: string, payload: BulletinStatusUpdateRequest) => {
        const response = await api.put<ApiResponse<BulletinDto>>(`/content/admin/bulletins/${id}/status`, payload);
        return response.data;
    },

    deleteBulletin: async (id: string) => {
        const response = await api.delete<ApiResponse<void>>(`/content/admin/bulletins/${id}`);
        return response.data;
    }
};
