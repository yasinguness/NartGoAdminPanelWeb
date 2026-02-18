import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { associationService } from '../../services/association/associationService';
import { AssociationCreateRequest } from '../../types/association/associationCreateRequest';
import { AssociationUpdateRequest } from '../../types/association/associationUpdateRequest';
import { AssociationDto } from '../../types/association/associationDto';
import { AssociationStatsDto } from '../../types/association/associationStatsDto';
import { AssociationEventSummary } from '../../types/association/associationEventSummary';
import { eventService } from '../../services/event/eventService';
import { AssociationSummaryResponse } from '../../types/association/associationSummaryResponse';

interface UseAssociationsOptions {
  searchTerm?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const useAssociations = ({ searchTerm, page = 0, size = 10, sort = 'createdAt,desc' }: UseAssociationsOptions = {}) => {
  return useQuery<{ content: AssociationSummaryResponse[]; totalPages: number; totalElements: number }, Error>({
    queryKey: ['associations', searchTerm, page, size, sort],
    queryFn: async () => {
      const res = await associationService.getAllAssociations(searchTerm, page, size, sort);
      return {
        content: res.data.content,
        totalPages: res.data.totalPages,
        totalElements: res.data.totalElements,
      };
    },
  });
};

export const useAssociationById = (associationId: string | undefined) => {
  return useQuery<AssociationDto, Error>({
    queryKey: ['association', associationId],
    queryFn: async () => {
      if (!associationId) {
        throw new Error("Association ID is required for fetching.");
      }
      const response = await associationService.getAssociationById(associationId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch association details');
    },
    enabled: !!associationId,
  });
};

export const useAssociationEvents = (associationId: string | undefined) => {
  return useQuery<AssociationEventSummary, Error>({
    queryKey: ['association-events', associationId],
    queryFn: async () => {
      if (!associationId) {
        throw new Error("Association ID is required for fetching.");
      }
      const response = await eventService.getEventsByOrganizerId(associationId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch association events');
    },
    enabled: !!associationId,
  });
};

export const useAssociationStats = (associationId: string | undefined) => {
  return useQuery<AssociationStatsDto, Error>({
    queryKey: ['association-stats', associationId],
    queryFn: async () => {
      if (!associationId) {
        throw new Error("Association ID is required for fetching.");
      }
      const response = await associationService.getAssociationStatistics(associationId);
      if (response.success && response.data) {
        return response.data;
      } 
      throw new Error(response.message || 'Failed to fetch association stats');
    },
    enabled: !!associationId,
  });
};



export const useCreateAssociation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: AssociationCreateRequest) => associationService.createAssociation(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
};

export const useUpdateAssociation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: AssociationUpdateRequest }) =>
      associationService.updateAssociation(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
};

export const useDeleteAssociation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => associationService.deleteAssociation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
  });
}; 