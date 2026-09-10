import { api } from '../api';
import { ApiResponse } from '../../types/api';
import {
  AdminStoryDto,
  AdminStoryListFilters,
  AdminStoryReportDto,
  StoryFeedDto,
} from '../../types/feed/storyModel';

const STORY_BASE_PATH = '/content/stories';

interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const storyService = {
  getStoryFeed: async (): Promise<StoryFeedDto[]> => {
    const response = await api.get<ApiResponse<StoryFeedDto[]>>(`${STORY_BASE_PATH}/feed`);
    return response.data.data;
  },

  deleteStoryAdmin: async (storyId: string): Promise<void> => {
    await api.delete(`${STORY_BASE_PATH}/admin/${storyId}`);
  },

  /// Filtered, paginated story listing for the moderation grid.
  listStoriesAdmin: async (
    filters: AdminStoryListFilters = {},
    page = 0,
    size = 20,
  ): Promise<SpringPage<AdminStoryDto>> => {
    const params: Record<string, string | number> = { page, size };
    if (filters.userId) params.userId = filters.userId;
    if (filters.status) params.status = filters.status;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    const response = await api.get<ApiResponse<SpringPage<AdminStoryDto>>>(
      `${STORY_BASE_PATH}/admin/list`,
      { params },
    );
    return response.data.data;
  },

  /// Pending report queue — one entry per reported story with all reports
  /// folded in.
  getReportedStories: async (page = 0, size = 20): Promise<AdminStoryReportDto[]> => {
    const response = await api.get<ApiResponse<AdminStoryReportDto[]>>(
      `${STORY_BASE_PATH}/admin/reports`,
      { params: { page, size } },
    );
    return response.data.data;
  },

  approveStory: async (storyId: string): Promise<AdminStoryDto> => {
    const response = await api.post<ApiResponse<AdminStoryDto>>(
      `${STORY_BASE_PATH}/admin/${storyId}/approve`,
    );
    return response.data.data;
  },

  rejectStory: async (storyId: string, reason?: string): Promise<void> => {
    await api.post(`${STORY_BASE_PATH}/admin/${storyId}/reject`, reason ? { reason } : {});
  },

  /// Returns the IDs that were actually deleted (the backend silently skips
  /// any rows it couldn't remove and reports back the success set).
  batchDeleteStories: async (ids: string[]): Promise<string[]> => {
    const response = await api.post<ApiResponse<string[]>>(
      `${STORY_BASE_PATH}/admin/batch-delete`,
      { ids },
    );
    return response.data.data;
  },
};
