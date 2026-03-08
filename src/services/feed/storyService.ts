import { api } from '../api';
import { ApiResponse } from '../../types/api';
import { StoryFeedDto } from '../../types/feed/storyModel';

const STORY_BASE_PATH = '/content/stories';

export const storyService = {
  getStoryFeed: async (): Promise<StoryFeedDto[]> => {
    const response = await api.get<ApiResponse<StoryFeedDto[]>>(`${STORY_BASE_PATH}/feed`);
    return response.data.data;
  },

  deleteStoryAdmin: async (storyId: string): Promise<void> => {
    await api.delete(`${STORY_BASE_PATH}/admin/${storyId}`);
  }
};
