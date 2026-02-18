import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user/userService';
import { useUserStore } from '../store/users/userStore';
import { UserDTO, UserStatusEnum, AccountType, Language } from '../types/users/userModel';
import { useState, useCallback, useEffect } from 'react';
import { PageResponseDto } from '../types/common/pageResponse';

interface UserQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  status?: UserStatusEnum;
  accountType?: AccountType;
  countryCode?: string;
  currentCity?: string;
  currentDistrict?: string;
  hometownCity?: string;
  hometownVillage?: string;
  language?: Language;
  birthDateFrom?: string; // Format: yyyy-MM-dd
  birthDateTo?: string; // Format: yyyy-MM-dd
}

export const useUsers = (params: UserQueryParams = {}) => {
    const userStore = useUserStore();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['users', params],
        queryFn: () => userService.getAllUsers(params),
        select: (response) => response.data,
    });

    useEffect(() => {
        if (data) {
            userStore.setUsers(data.content);
        }
    }, []);

    const updateUserRoleMutation = useMutation({
        mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) => 
            userService.updateUserRole(userId, roles),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const toggleUserStatusMutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string; status: UserStatusEnum }) => 
            userService.toggleUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: (userId: string) => userService.deleteAccountById(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ userId, userData }: { userId: string; userData: Partial<UserDTO> }) =>
            userService.updateUser(userId, userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const getUserByIdQuery = useCallback(
        (userId: string) => {
            return userService.getUserById(userId);
        },
        []
    );

    const getUserActivityLogs = useCallback(async (userId: string, page = 0, size = 10) => {
        return userStore.getUserActivityLogs(userId, page, size);
    }, [userStore]);

    const getUserAdminQuery = useQuery({
        queryKey: ['userAdmin'],
        queryFn: () => userService.getUserAdmin,
        enabled: false
    });

    const updateUserAdminMutation = useMutation({
        mutationFn: ({ userId, userData }: { userId: string; userData: UserDTO }) =>
            userService.updateUserAdmin(userId, userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['userAdmin'] });
        },
    });

    return {
        data,
        isLoading,
        isError,
        error,
        refetch,
        updateUserRole: updateUserRoleMutation.mutate,
        toggleUserStatus: toggleUserStatusMutation.mutate,
        deleteAccount: deleteAccountMutation.mutate,
        updateUser: updateUserMutation.mutate,
        getUserById: getUserByIdQuery,
        getUserActivityLogs,
        getUserAdmin: userService.getUserAdmin,
        updateUserAdmin: updateUserAdminMutation.mutate
    };
};
