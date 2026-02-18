import { api } from '../api';

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

export class BusinessCategoryService {
  private static instance: BusinessCategoryService;
  private readonly baseUrl = '/businesses/categories';

  private constructor() {}

  public static getInstance(): BusinessCategoryService {
    if (!BusinessCategoryService.instance) {
      BusinessCategoryService.instance = new BusinessCategoryService();
    }
    return BusinessCategoryService.instance;
  }

  async getAllCategories(includeInactive?: boolean): Promise<BusinessCategory[]> {
    try {
      const response = await api.get(
        `${this.baseUrl}${includeInactive ? `?includeInactive=${includeInactive}` : ''}`
      );
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to fetch categories');
    }
  }

  async getCategoryById(id: string): Promise<BusinessCategory> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to fetch category');
    }
  }

  async createCategory(category: Omit<BusinessCategory, 'id'>): Promise<BusinessCategory> {
    try {
      const response = await api.post(this.baseUrl, category);
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to create category');
    }
  }

  async updateCategory(id: string, category: Omit<BusinessCategory, 'id'>): Promise<BusinessCategory> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, category);
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to update category');
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      throw new Error('Failed to delete category');
    }
  }

  async updateActiveStatus(id: string, active: boolean): Promise<BusinessCategory> {
    try {
      const response = await api.patch(`${this.baseUrl}/${id}/active?active=${active}`);
      return response.data.data;
    } catch (error) {
      throw new Error('Failed to update category status');
    }
  }
} 