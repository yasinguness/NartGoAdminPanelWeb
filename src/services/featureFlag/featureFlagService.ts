import { api } from '../api';

export interface FeatureFlag {
  id: string;
  flagKey: string;
  enabled: boolean;
  description?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFlagUpsert {
  flagKey: string;
  enabled: boolean;
  description?: string;
  category?: string;
}

interface Envelope<T> {
  data: T;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private readonly baseUrl = '/businesses/feature-flags';

  private constructor() {}

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  async list(): Promise<FeatureFlag[]> {
    const response = await api.get<Envelope<FeatureFlag[]>>(this.baseUrl);
    return response.data.data ?? [];
  }

  async create(payload: FeatureFlagUpsert): Promise<FeatureFlag> {
    const response = await api.post<Envelope<FeatureFlag>>(this.baseUrl, payload);
    return response.data.data;
  }

  async update(id: string, payload: FeatureFlagUpsert): Promise<FeatureFlag> {
    const response = await api.put<Envelope<FeatureFlag>>(`${this.baseUrl}/${id}`, payload);
    return response.data.data;
  }

  async toggle(id: string, enabled: boolean): Promise<FeatureFlag> {
    const response = await api.patch<Envelope<FeatureFlag>>(
      `${this.baseUrl}/${id}/toggle?enabled=${enabled}`,
    );
    return response.data.data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}
