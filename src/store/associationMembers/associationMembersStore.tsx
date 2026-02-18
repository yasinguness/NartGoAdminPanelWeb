import { create } from 'zustand';
import { AssociationMemberDto } from '../../types/associationMember/associationMemberDto';
import { associationMemberService } from '../../services/associationMember/associationMemberService';

interface AssociationMembersState {
  members: AssociationMemberDto[];
  isLoading: boolean;
  error: string | null;
  fetchMembers: (associationId: string, page?: number, size?: number) => Promise<void>;
  setMembers: (members: AssociationMemberDto[]) => void;
}

export const useAssociationMembersStore = create<AssociationMembersState>((set) => ({
  members: [],
  isLoading: false,
  error: null,
  fetchMembers: async (associationId, page = 0, size = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await associationMemberService.getAssociationMembers(associationId, page, size);
      set({ members: response.data.content, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch members', isLoading: false });
    }
  },
  setMembers: (members) => set({ members }),
})); 