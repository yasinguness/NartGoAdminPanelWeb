import { api } from '../api';
import { AssociationMemberDto } from '../../types/associationMember/associationMemberDto';
import { AssociationMemberUpdateRequest } from '../../types/associationMember/associationMemberUpdateRequest';
import { CardStatusUpdateRequest } from '../../types/associationMember/cardStatusUpdateRequest';
import { MemberCardDto } from '../../types/associationMember/memberCardDto';
import { MemberCardRequest } from '../../types/associationMember/memberCardRequest';
import { MemberBenefitDto } from '../../types/memberBenefit/memberBenefitDto';
import { PageResponseDto } from '../../types/common/pageResponse';
import { AssociationMemberCreateRequest } from '../../types/associationMember/AssociationMemberCreateRequest';
import { MembershipStatusUpdateRequest } from '../../types/associationMember/membershipStatusUpdateRequest';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export const associationMemberService = {
  // Basic CRUD Operations
  createMember: async (request: AssociationMemberCreateRequest) => {
    const response = await api.post<ApiResponse<AssociationMemberDto>>('/businesses/association-members', request);
    return response.data;
  },

  updateMember: async (id: string, request: AssociationMemberUpdateRequest) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(`/businesses/association-members/${id}`, request);
    return response.data;
  },

  getMember: async (id: string) => {
    const response = await api.get<ApiResponse<AssociationMemberDto>>(`/businesses/association-members/member/${id}`);
    return response.data;
  },

  // Association Members
  getAssociationMembers: async (associationId: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationMemberDto>>>(
      `/businesses/association-members/association/${associationId}/members`,
      { params: { page, size } }
    );
    return response.data;
  },

  // Card Status Operations
  updateCardStatus: async (id: string, request: CardStatusUpdateRequest) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(
      `/businesses/association-members/${id}/card-status`,
      request
    );
    return response.data;
  },

  // Membership Status Operations
  updateMembershipStatus: async (id: string, request: MembershipStatusUpdateRequest) => {
    const response = await api.put<ApiResponse<AssociationMemberDto>>(
      `/businesses/association-members/${id}/membership-status`,
      request
    );
    return response.data;
  },

  // Active Members
  getActiveAssociationMembers: async (associationId: string, page: number = 0, size: number = 10) => {
    const response = await api.get<ApiResponse<PageResponseDto<AssociationMemberDto>>>(
      `/businesses/association-members/association/${associationId}/active`,
      { params: { page, size } }
    );
    return response.data;
  },

  // Member Removal Operations
  removeMember: async (id: string) => {
    const response = await api.delete<ApiResponse<AssociationMemberDto>>(`/businesses/association-members/${id}`);
    return response.data;
  },

  removeMemberFromAssociation: async (memberId: string, associationId: string) => {
    const response = await api.delete<ApiResponse<AssociationMemberDto>>(
      `/businesses/association-members/member/${memberId}/association/${associationId}`
    );
    return response.data;
  },

  // Membership Card Operations
  createMembershipCard: async (id: string, request: MemberCardRequest) => {
    const response = await api.post<ApiResponse<MemberCardDto>>(
      `/businesses/association-members/${id}/card`,
      request
    );
    return response.data;
  },

  getMembershipCard: async (id: string) => {
    const response = await api.get<ApiResponse<MemberCardDto>>(`/businesses/association-members/${id}/card`);
    return response.data;
  },

  // Member Benefits Operations
  getAllMemberBenefits: async (memberId: string) => {
    const response = await api.get<ApiResponse<MemberBenefitDto[]>>(
      `/businesses/association-members/${memberId}/benefits`
    );
    return response.data;
  },

  getAllMemberBenefitsForUser: async (userId: string) => {
    const response = await api.get<ApiResponse<MemberBenefitDto[]>>(
      `/businesses/association-members/user/${userId}/benefits`
    );
    return response.data;
  },

  // User Association Operations
  getUserAssociationIds: async (userId: string) => {
    const response = await api.get<string[]>(`/businesses/association-members/user/${userId}/association-ids`);
    return response.data;
  },

  getMembersByFederationId: async (federationId: number): Promise<AssociationMemberDto[]> => {
    const response = await api.get<AssociationMemberDto[]>(`/association-members/federation/${federationId}`);
    return response.data;
  }
}; 