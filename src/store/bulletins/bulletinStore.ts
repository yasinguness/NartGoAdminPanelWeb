import { create } from 'zustand';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
    BulletinCreateRequest,
    BulletinDto,
    BulletinQueryParams,
    BulletinStatus,
    BulletinStatusUpdateRequest,
    BulletinUpdateRequest
} from '../../types/bulletin/bulletinModel';
import { bulletinService } from '../../services/bulletin/bulletinService';

interface BulletinStore {
    bulletins: BulletinDto[];
    loading: boolean;
    error: string | null;
    totalElements: number;
    totalPages: number;
    currentPage: number;

    fetchBulletins: (params?: BulletinQueryParams) => Promise<void>;
    getBulletinById: (id: string) => Promise<BulletinDto>;
    createBulletin: (payload: BulletinCreateRequest, publisherEmail: string) => Promise<BulletinDto>;
    updateBulletin: (id: string, payload: BulletinUpdateRequest) => Promise<BulletinDto>;
    updateBulletinStatus: (id: string, payload: BulletinStatusUpdateRequest) => Promise<BulletinDto>;
    deleteBulletin: (id: string) => Promise<void>;
}

const normalizeBulletinList = (data: PageResponseDto<BulletinDto> | BulletinDto[]) => {
    if (Array.isArray(data)) {
        return {
            bulletins: data,
            totalElements: data.length,
            totalPages: data.length > 0 ? 1 : 0,
            currentPage: 0
        };
    }

    return {
        bulletins: data.content,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        currentPage: data.number
    };
};

export const useBulletinStore = create<BulletinStore>((set) => ({
    bulletins: [],
    loading: false,
    error: null,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,

    fetchBulletins: async (params = {}) => {
        try {
            set({ loading: true, error: null });
            const response = await bulletinService.getBulletins(params);
            set(normalizeBulletinList(response.data));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch bulletins' });
        } finally {
            set({ loading: false });
        }
    },

    getBulletinById: async (id) => {
        try {
            set({ loading: true, error: null });
            const response = await bulletinService.getBulletinById(id);
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch bulletin' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    createBulletin: async (payload, publisherEmail) => {
        try {
            set({ loading: true, error: null });
            const response = await bulletinService.createBulletin(payload, publisherEmail);
            set((state) => ({ bulletins: [response.data, ...state.bulletins] }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create bulletin' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateBulletin: async (id, payload) => {
        try {
            set({ loading: true, error: null });
            const response = await bulletinService.updateBulletin(id, payload);
            set((state) => ({
                bulletins: state.bulletins.map((bulletin) => (bulletin.id === id ? response.data : bulletin))
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update bulletin' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateBulletinStatus: async (id, payload) => {
        try {
            set({ loading: true, error: null });
            const response = await bulletinService.updateBulletinStatus(id, payload);
            set((state) => ({
                bulletins: state.bulletins.map((bulletin) => (bulletin.id === id ? response.data : bulletin))
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update bulletin status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteBulletin: async (id) => {
        try {
            set({ loading: true, error: null });
            await bulletinService.deleteBulletin(id);
            set((state) => ({
                bulletins: state.bulletins.filter((bulletin) => bulletin.id !== id)
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete bulletin' });
            throw error;
        } finally {
            set({ loading: false });
        }
    }
}));

export { BulletinStatus };
