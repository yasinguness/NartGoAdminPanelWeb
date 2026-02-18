import { api } from '../api';
import { AssociationCreateRequest } from '../../types/association/associationCreateRequest';
import { AssociationDto } from '../../types/association/associationDto';
import { AssociationUpdateRequest } from '../../types/association/associationUpdateRequest';
import { AssociationMemberDto } from '../../types/associationMember/associationMemberDto';
import { MemberBenefitDto } from '../../types/memberBenefit/memberBenefitDto';
import { PageResponseDto } from '../../types/common/pageResponse';
import { MemberCardDto } from '../../types/associationMember/memberCardDto';
import { MemberCardRequest } from '../../types/associationMember/memberCardRequest';
import { CardStatusUpdateRequest } from '../../types/associationMember/cardStatusUpdateRequest';
import { SubscriptionPaymentDto } from '../../types/subscriptionPayment/subscriptionPaymentDto';
import { AssociationMemberCreateAdminRequestDto } from '../../types/associationMember/associationMemberCreateAdminRequestDto';
import { AssociationMemberUpdateAdminRequestDto } from '../../types/associationMember/associationMemberUpdateAdminRequestDto';
import { MembershipStatus } from '../../types/enums/membershipStatus';
import { CardStatus } from '../../types/enums/cardStatus';
import { AssociationBenefit, AssociationStats, AssociationTimeline, AssociationLocation, AssociationEvent } from './types';
import { AssociationStatsDto } from '../../types/association/associationStatsDto';
import { ApiResponse } from '../../types/api';
import { AssociationSummaryResponse } from '../../types/association/associationSummaryResponse';









export const associationService = {
  // Basic CRUD Operations
  createAssociation: async (
    request: AssociationCreateRequest,
    logoImage?: File,
    coverImage?: File,
    galleryImages?: File[]
  ) => {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (logoImage) formData.append('logoImage', logoImage);
    if (coverImage) formData.append('coverImage', coverImage);
    if (galleryImages) {
      galleryImages.forEach((image, index) => {
        formData.append(`galleryImages`, image);
      });
    }

    const response = await api.post<ApiResponse<AssociationDto>>('/businesses/associations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateAssociation: async (
    id: string,
    request: AssociationUpdateRequest,
    logoImage?: File,
    coverImage?: File,
    galleryImages?: File[]
  ) => {
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (logoImage) formData.append('logoImage', logoImage);
    if (coverImage) formData.append('coverImage', coverImage);
    if (galleryImages) {
      galleryImages.forEach((image, index) => {
        formData.append(`galleryImages`, image);
      });
    }

    const response = await api.put<ApiResponse<AssociationDto>>(`/businesses/associations/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  getAssociationById: async (id: string) => {
    const response = await api.get<ApiResponse<AssociationDto>>(`/businesses/associations/${id}`);
    return response.data;
  },

  getAssociationByCode: async (code: string) => {
    const response = await api.get<ApiResponse<AssociationDto>>(`/businesses/associations/code/${code}`);
    return response.data;
  },

  getAllAssociations: async (searchTerm?: string, page: number = 0, size: number = 10, sort: string = 'createdAt,desc') => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationSummaryResponse>>>('/businesses/associations', {
      params: { searchTerm, page, size, sort }
    });
    return response.data;
  },

  searchAssociations: async (searchTerm: string) => {
    const response = await api.get<ApiResponse<AssociationDto[]>>('/businesses/associations/search', {
      params: { searchTerm }
    });
    return response.data;
  },

  getFederationAssociations: async (federationId: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationDto>>>(`/businesses/associations/federation/${federationId}`, {
      params: { page, size }
    });
    return response.data;
  },

  deleteAssociation: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/businesses/associations/${id}`);
    return response.data;
  },

  // Association Status Operations
  updateAssociationStatus: async (id: string, status: string) => {
    const response = await api.put<ApiResponse<AssociationDto>>(`/businesses/associations/${id}/status`, null, {
      params: { status }
    });
    return response.data;
  },

  // Association Statistics
  getAssociationStatistics: async (id: string) => {
    const response = await api.get<ApiResponse<AssociationStatsDto>>(`/businesses/associations/${id}/statistics`);
    return response.data;
  },

  // Association Members
  getAssociationMembers: async (associationId: string): Promise<AssociationMemberDto[]> => {
    // TODO: Implement API call
    return dummyMembers;
  },

  getActiveMembers: async (id: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationMemberDto>>>(`/businesses/associations/${id}/members/active`, {
      params: { page, size }
    });
    return response.data;
  },

  // Member Benefits
  getAssociationsMemberBenefits: async (id: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<MemberBenefitDto>>>(`/businesses/associations/${id}/member-benefits`, {
      params: { page, size }
    });
    return response.data;
  },

  // Logo Operations
  uploadAssociationLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<string>>(`/businesses/associations/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteAssociationLogo: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/businesses/associations/${id}/logo`);
    return response.data;
  },

  // Admin Operations
  listAssociationMembersAdmin: async (
    associationId: string,
    status?: MembershipStatus,
    searchTerm?: string,
    page: number = 0,
    size: number = 10
  ) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationMemberDto>>>(`/businesses/associations/${associationId}/admin/members`, {
      params: { status, searchTerm, page, size }
    });
    return response.data;
  },

  getAssociationMemberDetailsAdmin: async (associationId: string, memberId: string) => {
    const response = await api.get<ApiResponse<AssociationMemberDto>>(`/businesses/associations/${associationId}/admin/members/${memberId}`);
    return response.data;
  },

  updateAssociationMemberStatusAdmin: async (associationId: string, memberId: string, status: string) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(
      `/businesses/associations/${associationId}/admin/members/${memberId}/status`,
      { status }
    );
    return response.data;
  },

  createAssociationMemberAdmin: async (associationId: string, createRequest: AssociationMemberCreateAdminRequestDto) => {
    const response = await api.post<ApiResponse<AssociationMemberDto>>(
      `/businesses/associations/${associationId}/admin/members`,
      createRequest
    );
    return response.data;
  },

  removeAssociationMemberAdmin: async (associationId: string, memberId: string) => {
    const response = await api.delete<ApiResponse<void>>(`/businesses/associations/${associationId}/admin/members/${memberId}`);
    return response.data;
  },

  updateAssociationMemberAdmin: async (
    associationId: string,
    memberId: string,
    updateRequest: AssociationMemberUpdateAdminRequestDto
  ) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(
      `/businesses/associations/${associationId}/admin/members/${memberId}`,
      updateRequest
    );
    return response.data;
  },

  // Membership Card Operations
  issueMembershipCardAdmin: async (memberId: string, cardRequest: MemberCardRequest) => {
    const response = await api.post<ApiResponse<MemberCardDto>>(
      `/businesses/associations/admin/members/${memberId}/card/issue`,
      cardRequest
    );
    return response.data;
  },

  updateMembershipCardStatusAdmin: async (memberId: string, cardStatusUpdateRequest: CardStatusUpdateRequest) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(
      `/businesses/associations/admin/members/${memberId}/card/status`,
      cardStatusUpdateRequest
    );
    return response.data;
  },

  getMembershipCardDetailsAdmin: async (memberId: string) => {
    const response = await api.get<ApiResponse<MemberCardDto>>(`/businesses/associations/admin/members/${memberId}/card`);
    return response.data;
  },

  // Payment History
  getMemberPaymentHistory: async (memberId: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<SubscriptionPaymentDto>>>(`/businesses/associations/admin/members/${memberId}/payments`, {
      params: { page, size }
    });
    return response.data;
  },

  getAssociationsByFederationId: async (federationId: number): Promise<AssociationDto[]> => {
    const response = await api.get<AssociationDto[]>(`/associations/federation/${federationId}`);
    return response.data;
  },
};




export const getAssociationBenefits = async (associationId: string): Promise<AssociationBenefit[]> => {
  const response = await api.get<ApiResponse<MemberBenefitDto[]>>(`/businesses/associations/${associationId}/member-benefits`);
  return response.data.data || [];
};

export const getAssociationStats = async (associationId: string): Promise<AssociationStatsDto> => {
  const response = await api.get<ApiResponse<AssociationStatsDto>>(`/businesses/associations/${associationId}/statistics`);
  return response.data.data;
};

export const getAssociationTimeline = async (associationId: string): Promise<any[]> => {
  const response = await api.get<ApiResponse<any[]>>(`/businesses/associations/${associationId}/timeline`);
  return response.data.data || [];
};

export const getAssociationLocation = async (associationId: string): Promise<any> => {
  const response = await api.get<ApiResponse<any>>(`/businesses/associations/${associationId}/location`);
  return response.data.data;
}; 