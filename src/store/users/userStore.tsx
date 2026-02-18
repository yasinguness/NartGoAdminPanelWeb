import { create } from 'zustand';
import { UserDTO, UserStatusEnum } from '../../types/users/userModel';
import { userService } from '../../services/user/userService';

interface UserStore {
    users: UserDTO[];
    currentUser: UserDTO | null;
    loading: boolean;
    error: string | null;
    setUsers: (users: UserDTO[]) => void;
    setCurrentUser: (user: UserDTO | null) => void;
    fetchUsers: (params?: any) => Promise<void>;
    updateUserRole: (userId: string, roles: string[]) => Promise<UserDTO>;
    toggleUserStatus: (userId: string, status: UserStatusEnum) => Promise<UserDTO>;
    getUserActivityLogs: (userId: string, page?: number, size?: number) => Promise<any>;
    deleteAccountById: (userId: string) => Promise<void>;
    updateUser: (userId: string, userData: Partial<UserDTO>) => Promise<UserDTO>;
    getUserById: (userId: string) => Promise<UserDTO>;
}

export const useUserStore = create<UserStore>((set, get) => ({
    users: [],
    currentUser: null,
    loading: false,
    error: null,
    
    setUsers: (users: UserDTO[]) => {
        set({ users });
    },
    
    setCurrentUser: (user: UserDTO | null) => {
        set({ currentUser: user });
    },
    
    fetchUsers: async (params) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.getAllUsers(params);
            set({ users: response.data.content });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch users' });
        } finally {
            set({ loading: false });
        }
    },
    
    updateUserRole: async (userId, roles) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.updateUserRole(userId, roles);
            set((state) => ({
                users: state.users.map((user) =>
                    user.id === userId ? response.data : user
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update user role' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    
    toggleUserStatus: async (userId, status) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.toggleUserStatus(userId, status);
            set((state) => ({
                users: state.users.map((user) =>
                    user.id === userId ? response.data : user
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to toggle user status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    
    getUserActivityLogs: async (userId, page = 0, size = 10) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.getUserActivityLogs(userId, page, size);
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch user activity logs' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    
    deleteAccountById: async (userId: string) => {
        try {
            set({ loading: true, error: null });
            await userService.deleteAccountById(userId);
            set((state) => ({
                users: state.users.filter((user) => user.id !== userId),
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete account' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    
    updateUser: async (userId: string, userData: Partial<UserDTO>) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.updateUser(userId, userData);
            set((state) => ({
                users: state.users.map((user) =>
                    user.id === userId ? response.data : user
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update user' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
    
    getUserById: async (userId: string) => {
        try {
            set({ loading: true, error: null });
            const response = await userService.getUserById(userId);
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to get user' });
            throw error;
        } finally {
            set({ loading: false });
        }
    }
})); 
