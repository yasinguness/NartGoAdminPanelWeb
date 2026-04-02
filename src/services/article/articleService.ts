import { api } from '../api';
import type { ApiResponse } from '../../types/api';
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
  contentType?: string;
}

function unwrapArticleResponse<T>(payload: T | ApiResponse<T>): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiResponse<T>)) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

async function findArticleViaListing(id: string): Promise<ArticleDto | null> {
  const firstPage = await articleService.getArticles({ page: 0, size: 100 });
  const firstMatch = firstPage.content?.find((article) => article.id === id);
  if (firstMatch) return firstMatch;

  const totalPages = Math.max(1, firstPage.totalPages ?? 1);
  for (let page = 1; page < totalPages; page += 1) {
    const nextPage = await articleService.getArticles({ page, size: 100 });
    const match = nextPage.content?.find((article) => article.id === id);
    if (match) return match;
  }

  return null;
}

export const articleService = {
  getArticles: async (params: ArticleQueryParams = {}) => {
    const response = await api.get<PageResponse<ArticleDto> | ApiResponse<PageResponse<ArticleDto>>>('/content/admin/articles', {
      params: { ...params, page: params.page ?? 0, size: params.size ?? 10 },
    });
    return unwrapArticleResponse(response.data);
  },

  getArticle: async (id: string) => {
    try {
      const response = await api.get<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}`);
      return unwrapArticleResponse(response.data);
    } catch (error: any) {
      if (error?.response?.status === 405 || error?.response?.status === 404) {
        const fallbackArticle = await findArticleViaListing(id);
        if (fallbackArticle) return fallbackArticle;
      }
      throw error;
    }
  },

  createArticle: async (payload: ArticleCreateRequest) => {
    const response = await api.post<ArticleDto | ApiResponse<ArticleDto>>('/content/admin/articles', payload);
    return unwrapArticleResponse(response.data);
  },

  updateArticle: async (id: string, payload: ArticleCreateRequest) => {
    const response = await api.put<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}`, payload);
    return unwrapArticleResponse(response.data);
  },

  deleteArticle: async (id: string) => {
    await api.delete(`/content/admin/articles/${id}`);
  },

  publishArticle: async (id: string) => {
    const response = await api.put<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}/publish`);
    return unwrapArticleResponse(response.data);
  },

  archiveArticle: async (id: string) => {
    const response = await api.put<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}/archive`);
    return unwrapArticleResponse(response.data);
  },

  toggleFeatured: async (id: string) => {
    const response = await api.put<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}/feature`);
    return unwrapArticleResponse(response.data);
  },

  toggleBreaking: async (id: string) => {
    const response = await api.put<ArticleDto | ApiResponse<ArticleDto>>(`/content/admin/articles/${id}/breaking`);
    return unwrapArticleResponse(response.data);
  },

  addMedia: async (articleId: string, mediaUrl: string, caption?: string) => {
    const response = await api.post(`/content/admin/articles/${articleId}/media`, { mediaUrl, caption });
    return response.data;
  },

  deleteMedia: async (articleId: string, mediaId: string) => {
    await api.delete(`/content/admin/articles/${articleId}/media/${mediaId}`);
  },
};
