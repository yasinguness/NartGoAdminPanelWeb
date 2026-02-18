import { create } from 'zustand';
import { federationService } from '../../services/federation/federationService';
import { FederationDto } from '../../types/federation/federationDto';
import { FederationCreateRequest } from '../../types/federation/federationCreateRequest';
import { FederationUpdateRequest } from '../../types/federation/federationUpdateRequest';

interface FederationStore {
  federations: FederationDto[];
  loading: boolean;
  error: string | null;
  fetchFederations: (searchTerm?: string, page?: number, size?: number) => Promise<void>;
  createFederation: (request: FederationCreateRequest, logoImage?: File, coverImage?: File) => Promise<FederationDto>;
  updateFederation: (id: string, request: FederationUpdateRequest, logoImage?: File) => Promise<FederationDto>;
  deleteFederation: (id: string) => Promise<void>;
}

export const useFederationStore = create<FederationStore>((set, get) => ({
  federations: [],
  loading: false,
  error: null,

  fetchFederations: async (searchTerm, page = 0, size = 10) => {
    try {
      set({ loading: true, error: null });
      const response = await federationService.getAllFederations(searchTerm, page, size);
      set({ federations: response.data.content });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch federations' });
    } finally {
      set({ loading: false });
    }
  },

  createFederation: async (request, logoImage, coverImage) => {
    try {
      set({ loading: true, error: null });
      const response = await federationService.createFederation(request, logoImage, coverImage);
      set((state) => ({ federations: [response.data, ...state.federations] }));
      return response.data;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create federation' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateFederation: async (id, request, logoImage) => {
    try {
      set({ loading: true, error: null });
      const response = await federationService.updateFederation(id, request, logoImage);
      set((state) => ({
        federations: state.federations.map((fed) =>
          fed.id === id ? response.data : fed
        ),
      }));
      return response.data;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update federation' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteFederation: async (id) => {
    try {
      set({ loading: true, error: null });
      await federationService.deleteFederation(id);
      set((state) => ({ federations: state.federations.filter((fed) => fed.id !== id) }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete federation' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
