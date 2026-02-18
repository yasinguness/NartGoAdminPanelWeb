import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { federationService } from '../../services/federation/federationService';
import { useFederationStore } from '../../store/federations/federationStore';
import { FederationDto } from '../../types/federation/federationDto';
import { FederationCreateRequest } from '../../types/federation/federationCreateRequest';
import { FederationUpdateRequest } from '../../types/federation/federationUpdateRequest';
import { PageResponseDto } from '../../types/common/pageResponse';
import { FederationStatsDto } from '../../types/federation/federationStatsDto';
import { AssociationDto } from '../../types/association/associationDto';
import { AssociationMemberDto } from '../../types/associationMember/associationMemberDto';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

interface FederationQueryParams {
  searchTerm?: string;
  page?: number;
  size?: number;
}

export const useFederations = (params: FederationQueryParams = {}) => {
  // federationStore is not needed for query, only for mutations
  const {
    isLoading,
    isError,
    error,
    data,
    status,
    refetch
  } = useQuery<ApiResponse<PageResponseDto<FederationDto>>, Error>({
    queryKey: ['federations', params],
    queryFn: () => federationService.getAllFederations(params.searchTerm, params.page || 0, params.size || 10)
  });

  return {
    data: data?.data?.content,
    isLoading,
    isError,
    error,
    status,
    refetch,
    totalPages: data?.data?.totalPages
  };
};

export const useCreateFederation = () => {
  const federationStore = useFederationStore();
  const queryClient = useQueryClient();

  return useMutation<
    FederationDto,
    Error,
    { request: FederationCreateRequest; logoImage?: File; coverImage?: File }
  >({
    mutationFn: ({ request, logoImage, coverImage }) =>
      federationStore.createFederation(request, logoImage, coverImage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federations'] });
    },
    onError: (error) => {
      // handle error
    },
  });
};

export const useUpdateFederation = () => {
  const federationStore = useFederationStore();
  const queryClient = useQueryClient();

  return useMutation<
    FederationDto,
    Error,
    { id: string; request: FederationUpdateRequest; logoImage?: File }
  >({
    mutationFn: ({ id, request, logoImage }) =>
      federationStore.updateFederation(id, request, logoImage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federations'] });
    },
  });
};

export const useDeleteFederation = () => {
  const federationStore = useFederationStore();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    string
  >({
    mutationFn: (id: string) => federationStore.deleteFederation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['federations'] });
    },
  });

 
};

export const useFederationById = (id: string) => {
  return useQuery<FederationDto, Error>({
    queryKey: ['federation', id],
    queryFn: async () => {
      const response = await federationService.getFederation(id);
      return response.data;
    },
  });
};



export const useFederationAssociations = (id: string) => {
  return useQuery<PageResponseDto<AssociationDto>, Error>({
    queryKey: ['federation-associations', id],
    queryFn: async () => {
      const response = await federationService.getFederationAssociations(id);
      return response.data;
    },
  });
};  

export const useFederationStats = (id: string) => {
  return useQuery<FederationStatsDto, Error>({
    queryKey: ['federation-stats', id],
    queryFn: async () => {
      const response = await federationService.getFederationStatistics(id);
      return response.data;
    },
  });
};

export const useFederationMembers = (id: string) => {
  return useQuery<PageResponseDto<AssociationMemberDto>, Error>({
    queryKey: ['federation-members', id],
    queryFn: async () => {
      const response = await federationService.getFederationMembers(id);
      return response.data;
    },
  });
};

/* export const useFederationEvents = (id: string) => {
  return useQuery<FederationEventDto[], Error>({
    queryKey: ['federation-events', id],
    queryFn: () => federationService.getFederationEvents(id),
  });
}; */
