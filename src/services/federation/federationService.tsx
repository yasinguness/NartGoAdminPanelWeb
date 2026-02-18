import { api } from '../api';
import { FederationCreateRequest } from '../../types/federation/federationCreateRequest';
import { FederationDto } from '../../types/federation/federationDto';
import { FederationUpdateRequest } from '../../types/federation/federationUpdateRequest';
import { AssociationDto } from '../../types/association/associationDto';
import { AssociationMemberDto } from '../../types/associationMember/associationMemberDto';
import { PageResponseDto } from '../../types/common/pageResponse';
import { FederationAnalyticsDto } from '../../types/federation/federationAnalyticsDto';
import { FederationBusinessAnalyticsDto } from '../../types/federation/federationBusinessAnalyticsDto';
import { FederationContentAnalyticsDto } from '../../types/federation/federationContentAnalyticsDto';
import { FederationEventAnalyticsDto } from '../../types/federation/federationEventAnalyticsDto';
import { BusinessAgreementDto } from '../../types/businessAgreement/businessAgreementDto';
import { BusinessAgreementStatusUpdateRequest } from '../../types/businessAgreement/businessAgreementStatusUpdateRequest';
import { FederationStatsDto } from '../../types/federation/federationStatsDto';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export const federationService = {
  // Basic CRUD Operations
  createFederation: async (request: FederationCreateRequest, logoImage?: File, coverImage?: File) => {
    const formData = new FormData();
    formData.append('federation', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (logoImage) formData.append('logoImageUrl', logoImage);
    if (coverImage) formData.append('coverImageUrl', coverImage);

    const response = await api.post<ApiResponse<FederationDto>>('/businesses/federations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateFederation: async (id: string, request: FederationUpdateRequest, logoImage?: File) => {
    const formData = new FormData();
    formData.append('federation', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (logoImage) formData.append('logoImage', logoImage);

    const response = await api.put<ApiResponse<FederationDto>>(`/businesses/federations/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getFederation: async (id: string) => {
    const response = await api.get<ApiResponse<FederationDto>>(`/businesses/federations/${id}`);
    return response.data;
  },

  getFederationByCode: async (code: string) => {
    const response = await api.get<ApiResponse<FederationDto>>(`/businesses/federations/code/${code}`);
    return response.data;
  },

  getAllFederations: async (searchTerm?: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<FederationDto>>>('/businesses/federations', {
      params: { searchTerm, page, size }
    });
    return response.data;
  },

  deleteFederation: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/businesses/federations/${id}`);
    return response.data;
  },

  // Federation Status Operations
  updateFederationStatus: async (id: string, status: string) => {
    const response = await api.put<ApiResponse<FederationDto>>(`/businesses/federations/${id}/status`, null, {
      params: { status }
    });
    return response.data;
  },

  // Federation Statistics
  getFederationStatistics: async (id: string) => {
    const response = await api.get<ApiResponse<FederationStatsDto>>(`/businesses/federations/${id}/statistics`);
    return response.data;
  },

  // Federation Associations
  getFederationAssociations: async (id: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationDto>>>(`/businesses/federations/${id}/associations`, {
      params: { page, size }
    });
    return response.data;
  },

  // Federation Members
  getFederationMembers: async (id: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationMemberDto>>>(`/businesses/federations/${id}/members`, {
      params: { page, size }
    });
    return response.data;
  },

  // Logo Operations
  uploadFederationLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<string>>(`/businesses/federations/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteFederationLogo: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/businesses/federations/${id}/logo`);
    return response.data;
  },

  // Federation Analytics
  getFederationAnalytics: async (id: string, startDate?: string, endDate?: string) => {
    const response = await api.get<ApiResponse<FederationAnalyticsDto>>(`/businesses/federations/${id}/analytics`, {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Business Agreement Operations
  getFederationAgreementById: async (federationId: string, agreementId: string) => {
    const response = await api.get<ApiResponse<BusinessAgreementDto>>(`/businesses/federations/${federationId}/agreements/${agreementId}`);
    return response.data;
  },

  updateFederationAgreementStatus: async (
    federationId: string,
    agreementId: string,
    statusUpdateRequest: BusinessAgreementStatusUpdateRequest
  ) => {
    const response = await api.put<ApiResponse<BusinessAgreementDto>>(
      `/businesses/federations/${federationId}/agreements/${agreementId}/status`,
      statusUpdateRequest
    );
    return response.data;
  },

  getFederationAgreementsByBusiness: async (
    federationId: string,
    businessId: string,
    page: number = 0,
    size: number = 10
  ) => {
    const response = await api.get<ApiResponse<PageResponseDto<BusinessAgreementDto>>>(
      `/businesses/federations/${federationId}/agreements/by-business/${businessId}`,
      {
        params: { page, size }
      }
    );
    return response.data;
  },

  // Updated Analytics Methods with Default Date Ranges
  getFederationBusinessAnalytics: async (id: string, startDate?: string, endDate?: string) => {
    const response = await api.get<ApiResponse<FederationBusinessAnalyticsDto>>(`/businesses/federations/${id}/analytics/businesses`, {
      params: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      }
    });
    return response.data;
  },

  getFederationEventAnalytics: async (id: string, startDate?: string, endDate?: string) => {
    const response = await api.get<ApiResponse<FederationEventAnalyticsDto>>(`/businesses/federations/${id}/analytics/events`, {
      params: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      }
    });
    return response.data;
  },

  getFederationContentAnalytics: async (id: string, startDate?: string, endDate?: string) => {
    const response = await api.get<ApiResponse<FederationContentAnalyticsDto>>(`/businesses/federations/${id}/analytics/content`, {
      params: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0]
      }
    });
    return response.data;
  },

  // Updated Count Methods with Additional Parameters
  getFederationBusinessCount: async (id: string, associationId?: string, category?: string) => {
    const response = await api.get<ApiResponse<number>>(`/businesses/federations/${id}/businesses/count`, {
      params: { associationId, category }
    });
    return response.data;
  },

  getFederationEventCount: async (
    id: string,
    associationId?: string,
    status?: string,
    startDate?: string,
    endDate?: string
  ) => {
    const response = await api.get<ApiResponse<number>>(`/businesses/federations/${id}/events/count`, {
      params: { associationId, status, startDate, endDate }
    });
    return response.data;
  },

  getFederationContentCount: async (id: string, associationId?: string, contentType?: string) => {
    const response = await api.get<ApiResponse<number>>(`/businesses/federations/${id}/content/count`, {
      params: { associationId, contentType }
    });
    return response.data;
  },

  // Federation Associations with Filters
  getFederationAssociationsWithFilters: async (
    id: string,
    page: number = 0,
    size: number = 10,
    status?: string,
    createdAfter?: string
  ) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationDto>>>(`/businesses/federations/${id}/associations`, {
      params: { page, size, status, createdAfter }
    });
    return response.data;
  }
};
