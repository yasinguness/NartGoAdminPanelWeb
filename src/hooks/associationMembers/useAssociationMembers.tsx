import { useEffect } from 'react';
import { useAssociationMembersStore } from '../../store/associationMembers/associationMembersStore';

export const useAssociationMembers = (associationId: string, page = 0, size = 10) => {
  const { members, isLoading, error, fetchMembers } = useAssociationMembersStore();

  useEffect(() => {
    if (associationId) {
      fetchMembers(associationId, page, size);
    }
  }, [associationId, page, size, fetchMembers]);

  return {
    members,
    isLoading,
    error,
    refetch: () => fetchMembers(associationId, page, size),
  };
}; 