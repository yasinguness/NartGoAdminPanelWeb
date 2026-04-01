import { api } from '../api';
import type { ArticleDto, ArticleCreateRequest, ArticleCategory, ArticleStatus } from '../../types/article/articleModel';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

interface ArticleQueryParams {
  status?: ArticleStatus;
  category?: ArticleCategory;
  page?: number;
  size?: number;
  keyword?: string;
}

export const articleService = {
  getArticles: async (params: ArticleQueryParams = {}) => {
    const response = await api.get<PageResponse<ArticleDto>>('/content/admin/articles', {
      params: { ...params, page: params.page ?? 0, size: params.size ?? 10 },
    });
    return response.data;
  },

  createArticle: async (payload: ArticleCreateRequest) => {
    const response = await api.post<ArticleDto>('/content/admin/articles', payload);
    return response.data;
  },

  updateArticle: async (id: string, payload: ArticleCreateRequest) => {
    const response = await api.put<ArticleDto>(`/content/admin/articles/${id}`, payload);
    return response.data;
  },

  deleteArticle: async (id: string) => {
    await api.delete(`/content/admin/articles/${id}`);
  },

  publishArticle: async (id: string) => {
    const response = await api.put<ArticleDto>(`/content/admin/articles/${id}/publish`);
    return response.data;
  },

  archiveArticle: async (id: string) => {
    const response = await api.put<ArticleDto>(`/content/admin/articles/${id}/archive`);
    return response.data;
  },

  toggleFeatured: async (id: string) => {
    const response = await api.put<ArticleDto>(`/content/admin/articles/${id}/feature`);
    return response.data;
  },

  toggleBreaking: async (id: string) => {
    const response = await api.put<ArticleDto>(`/content/admin/articles/${id}/breaking`);
    return response.data;
  },

  addMedia: async (articleId: string, mediaUrl: string, caption?: string) => {
    const response = await api.post(`/content/admin/articles/${articleId}/media`, { mediaUrl, caption });
    return response.data;
  },

  deleteMedia: async (articleId: string, mediaId: string) => {
    await api.delete(`/content/admin/articles/${articleId}/media/${mediaId}`);
  },
};
