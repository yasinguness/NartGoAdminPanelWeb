import { create } from 'zustand';
import { articleService } from '../../services/article/articleService';
import type { ArticleDto, ArticleCreateRequest, ArticleCategory, ArticleStatus } from '../../types/article/articleModel';

interface ArticleStore {
  articles: ArticleDto[];
  totalElements: number;
  loading: boolean;
  error: string | null;

  fetchArticles: (params?: {
    status?: ArticleStatus;
    category?: ArticleCategory;
    page?: number;
    size?: number;
    keyword?: string;
  }) => Promise<void>;
  createArticle: (payload: ArticleCreateRequest) => Promise<ArticleDto>;
  updateArticle: (id: string, payload: ArticleCreateRequest) => Promise<ArticleDto>;
  deleteArticle: (id: string) => Promise<void>;
  publishArticle: (id: string) => Promise<void>;
  archiveArticle: (id: string) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  toggleBreaking: (id: string) => Promise<void>;
}

export const useArticleStore = create<ArticleStore>((set) => ({
  articles: [],
  totalElements: 0,
  loading: false,
  error: null,

  fetchArticles: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      const response = await articleService.getArticles(params);
      set({
        articles: response.content ?? [],
        totalElements: response.totalElements ?? 0,
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createArticle: async (payload) => {
    try {
      set({ loading: true, error: null });
      const data = await articleService.createArticle(payload);
      set((state) => ({ articles: [data, ...state.articles] }));
      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateArticle: async (id, payload) => {
    try {
      set({ loading: true, error: null });
      const data = await articleService.updateArticle(id, payload);
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? data : a)),
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteArticle: async (id) => {
    try {
      set({ loading: true, error: null });
      await articleService.deleteArticle(id);
      set((state) => ({
        articles: state.articles.filter((a) => a.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  publishArticle: async (id) => {
    try {
      const data = await articleService.publishArticle(id);
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? data : a)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  archiveArticle: async (id) => {
    try {
      const data = await articleService.archiveArticle(id);
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? data : a)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  toggleFeatured: async (id) => {
    try {
      const data = await articleService.toggleFeatured(id);
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? data : a)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  toggleBreaking: async (id) => {
    try {
      const data = await articleService.toggleBreaking(id);
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? data : a)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
