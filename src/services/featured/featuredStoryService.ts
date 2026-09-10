import { api } from '../api';

export type FeaturedStorySource = 'MANUAL' | 'PAID';
export type FeaturedStoryTargetType = 'BUSINESS' | 'EVENT' | 'REEL' | 'BULLETIN' | 'ARTICLE';

export interface FeaturedStoryPlacement {
  id: string;
  targetType: FeaturedStoryTargetType;
  targetId: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  // Convenience fields populated by the backend for BUSINESS targets
  businessId?: string;
  businessName?: string;
  businessLogoUrl?: string;
  businessCategoryName?: string;
  startDate: string; // ISO yyyy-MM-dd
  endDate: string;
  priority: number;
  source: FeaturedStorySource;
  countryCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeaturedStoryPlacementCreate {
  targetType: FeaturedStoryTargetType;
  targetId: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  priority?: number;
  source?: FeaturedStorySource;
  countryCode?: string;
}

export type FeaturedStoryPlacementUpdate = Partial<
  Pick<
    FeaturedStoryPlacementCreate,
    'title' | 'subtitle' | 'imageUrl' | 'startDate' | 'endDate' | 'priority' | 'source' | 'countryCode'
  >
>;

interface ApiEnvelope<T> {
  data: T;
}

export class FeaturedStoryService {
  private static instance: FeaturedStoryService;
  private readonly baseUrl = '/businesses/featured-stories';

  private constructor() {}

  public static getInstance(): FeaturedStoryService {
    if (!FeaturedStoryService.instance) {
      FeaturedStoryService.instance = new FeaturedStoryService();
    }
    return FeaturedStoryService.instance;
  }

  async list(): Promise<FeaturedStoryPlacement[]> {
    const response = await api.get<ApiEnvelope<FeaturedStoryPlacement[]>>(this.baseUrl);
    return response.data.data ?? [];
  }

  async create(payload: FeaturedStoryPlacementCreate): Promise<FeaturedStoryPlacement> {
    const response = await api.post<ApiEnvelope<FeaturedStoryPlacement>>(this.baseUrl, payload);
    return response.data.data;
  }

  async update(id: string, payload: FeaturedStoryPlacementUpdate): Promise<FeaturedStoryPlacement> {
    const response = await api.put<ApiEnvelope<FeaturedStoryPlacement>>(`${this.baseUrl}/${id}`, payload);
    return response.data.data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}
