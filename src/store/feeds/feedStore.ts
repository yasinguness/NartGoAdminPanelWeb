import { create } from 'zustand';
import { PageResponseDto } from '../../types/common/pageResponse';
import {
    FeedCreateRequest,
    FeedDto,
    FeedQueryParams,
    FeedStatus,
    FeedStatusUpdateRequest,
    FeedUpdateRequest
} from '../../types/feed/feedModel';
import { feedService } from '../../services/feed/feedService';

interface FeedStore {
    feeds: FeedDto[];
    loading: boolean;
    error: string | null;
    totalElements: number;
    totalPages: number;
    currentPage: number;

    fetchFeeds: (params?: FeedQueryParams) => Promise<void>;
    getFeedById: (id: string) => Promise<FeedDto>;
    createFeed: (payload: FeedCreateRequest, creatorEmail: string) => Promise<FeedDto>;
    updateFeed: (id: string, payload: FeedUpdateRequest) => Promise<FeedDto>;
    updateFeedStatus: (id: string, payload: FeedStatusUpdateRequest) => Promise<FeedDto>;
    deleteFeed: (id: string) => Promise<void>;
}

const normalizeFeed = (feed: any): FeedDto => {
    // Normalize ID: Backend might send videoId or id
    const id = feed.id || feed.videoId || feed.mediaId;
    
    return {
        ...feed,
        id,
        // Ensure URLs are mapped correctly from any potential backend field
        videoUrl: feed.videoUrl || feed.rawVideoUrl || feed.playlistUrl || feed.url || feed.mediaUrl,
        rawVideoUrl: feed.rawVideoUrl || feed.videoUrl || feed.url || feed.mediaUrl,
        playlistUrl: feed.playlistUrl || feed.videoUrl || feed.url || feed.mediaUrl,
        thumbnailUrl: feed.thumbnailUrl || feed.imageUrl || feed.thumbnail_url || feed.thumbnail,
        imageUrl: feed.imageUrl || feed.thumbnailUrl || feed.image_url || feed.image
    };
};

const normalizeFeedList = (data: PageResponseDto<FeedDto> | FeedDto[]) => {
    if (Array.isArray(data)) {
        const sorted = data.map(normalizeFeed);
        return {
            feeds: sorted,
            totalElements: sorted.length,
            totalPages: sorted.length > 0 ? 1 : 0,
            currentPage: 0
        };
    }

    const content = data.content.map(normalizeFeed);
    return {
        feeds: content,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
        currentPage: data.number
    };
};

export const useFeedStore = create<FeedStore>((set) => ({
    feeds: [],
    loading: false,
    error: null,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,

    fetchFeeds: async (params = {}) => {
        try {
            set({ loading: true, error: null });
            const response = await feedService.getFeeds(params);
            set(normalizeFeedList(response.data));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch feeds' });
        } finally {
            set({ loading: false });
        }
    },

    getFeedById: async (id) => {
        try {
            set({ loading: true, error: null });
            const response = await feedService.getFeedById(id);
            return normalizeFeed(response.data);
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch feed' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    createFeed: async (payload, creatorEmail) => {
        try {
            set({ loading: true, error: null });
            const response = await feedService.createFeed(payload, creatorEmail);
            const normalized = normalizeFeed(response.data);
            set((state) => ({ feeds: [normalized, ...state.feeds] }));
            return normalized;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create feed' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateFeed: async (id, payload) => {
        try {
            set({ loading: true, error: null });
            const response = await feedService.updateFeed(id, payload);
            const normalized = normalizeFeed(response.data);
            set((state) => ({
                feeds: state.feeds.map((feed) => (feed.id === id ? normalized : feed))
            }));
            return normalized;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update feed' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateFeedStatus: async (id, payload) => {
        try {
            set({ loading: true, error: null });
            const response = await feedService.updateFeedStatus(id, payload);
            const normalized = normalizeFeed(response.data);
            set((state) => ({
                feeds: state.feeds.map((feed) => (feed.id === id ? normalized : feed))
            }));
            return normalized;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update feed status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteFeed: async (id) => {
        try {
            set({ loading: true, error: null });
            await feedService.deleteFeed(id);
            set((state) => ({
                feeds: state.feeds.filter((feed) => feed.id !== id),
                totalElements: state.totalElements - 1
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete feed' });
            throw error;
        } finally {
            set({ loading: false });
        }
    }
}));

export { FeedStatus };
