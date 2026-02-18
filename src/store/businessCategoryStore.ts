import { create } from 'zustand';
import { BusinessCategoryService } from '../services/business/businessCategoryService';

export interface BusinessCategory {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  iconColor?: string;
  active: boolean;
  businessCount?: number;
  displayOrder?: number;
  parentId?: string;
  subcategories?: BusinessCategory[];
  createdAt?: string;
  updatedAt?: string;
}

interface BusinessCategoryStore {
  categories: BusinessCategory[];
  loading: boolean;
  error: string | null;
  fetchCategories: (includeInactive?: boolean) => Promise<void>;
  createCategory: (category: Omit<BusinessCategory, 'id'>) => Promise<BusinessCategory>;
  updateCategory: (id: string, category: Omit<BusinessCategory, 'id'>) => Promise<BusinessCategory>;
  deleteCategory: (id: string) => Promise<void>;
  updateActiveStatus: (id: string, active: boolean) => Promise<BusinessCategory>;
  getCategoryById: (id: string) => Promise<BusinessCategory>;
}

const categoryService = BusinessCategoryService.getInstance();

export const useBusinessCategoryStore = create<BusinessCategoryStore>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async (includeInactive?: boolean) => {
    try {
      set({ loading: true, error: null });
      const categories = await categoryService.getAllCategories(includeInactive);
      set({ categories });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch categories' });
    } finally {
      set({ loading: false });
    }
  },

  createCategory: async (category) => {
    try {
      set({ loading: true, error: null });
      const newCategory = await categoryService.createCategory(category);
      set((state) => ({
        categories: [...state.categories, newCategory],
      }));
      return newCategory;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create category' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateCategory: async (id, category) => {
    try {
      set({ loading: true, error: null });
      const updatedCategory = await categoryService.updateCategory(id, category);
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? updatedCategory : cat
        ),
      }));
      return updatedCategory;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update category' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteCategory: async (id) => {
    try {
      set({ loading: true, error: null });
      await categoryService.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete category' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateActiveStatus: async (id, active) => {
    try {
      set({ loading: true, error: null });
      const updatedCategory = await categoryService.updateActiveStatus(id, active);
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? updatedCategory : cat
        ),
      }));
      return updatedCategory;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update category status' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getCategoryById: async (id) => {
    try {
      set({ loading: true, error: null });
      return await categoryService.getCategoryById(id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch category' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
})); 