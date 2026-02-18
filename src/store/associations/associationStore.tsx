import { create } from 'zustand';
import { AssociationDto } from '../../types/association/associationDto';
import { AssociationCreateRequest } from '../../types/association/associationCreateRequest';
import { AssociationUpdateRequest } from '../../types/association/associationUpdateRequest';
import { associationService } from '../../services/association/associationService';
import { PageResponseDto } from '../../types/common/pageResponse';

interface AssociationState {
  associations: AssociationDto[];
  selectedAssociation: AssociationDto | null;
  isLoading: boolean;
  error: string | null;
  fetchAssociations: (page?: number, size?: number, sort?: string) => Promise<void>;
  createAssociation: (request: AssociationCreateRequest) => Promise<void>;
  updateAssociation: (id: string, request: AssociationUpdateRequest) => Promise<void>;
  deleteAssociation: (id: string) => Promise<void>;
  setSelectedAssociation: (association: AssociationDto | null) => void;
  getAssociationById: (id: string) => Promise<AssociationDto | null>;
}

export const useAssociationStore = create<AssociationState>((set, get) => ({
  associations: [],
  selectedAssociation: null,
  isLoading: false,
  error: null,

  fetchAssociations: async (page = 0, size = 10, sort = 'createdAt,desc') => {
    set({ isLoading: true, error: null });
    try {
      const response = await associationService.getAllAssociations(undefined, page, size, sort);
      set({ associations: response.data.content, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch associations', isLoading: false });
    }
  },
  getAssociationById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await associationService.getAssociationById(id);
      set({ selectedAssociation: response.data, isLoading: false });
      return response.data;
    } catch (error) { 
      set({ error: 'Failed to fetch association', isLoading: false });
      return null;
    }
  },

  createAssociation: async (request: AssociationCreateRequest) => {
    set({ isLoading: true, error: null });
    try {
      await associationService.createAssociation(request);
      await get().fetchAssociations();
    } catch (error) {
      set({ error: 'Failed to create association', isLoading: false });
    }
  },

  updateAssociation: async (id: string, request: AssociationUpdateRequest) => {
    set({ isLoading: true, error: null });
    try {
      await associationService.updateAssociation(id, request);
      await get().fetchAssociations();
    } catch (error) {
      set({ error: 'Failed to update association', isLoading: false });
    }
  },

  deleteAssociation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await associationService.deleteAssociation(id);
      await get().fetchAssociations();
    } catch (error) {
      set({ error: 'Failed to delete association', isLoading: false });
    }
  },

  setSelectedAssociation: (association: AssociationDto | null) => {
    set({ selectedAssociation: association });
  },
})); 