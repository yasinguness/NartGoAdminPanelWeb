import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserModel } from '../types/user';

interface AuthState {
    user: UserModel | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    loginStart: () => void;
    loginSuccess: (data: { user: UserModel; token: string }) => void;
    loginFailure: (error: string) => void;
    logout: () => void;
    updateUser: (user: UserModel) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            loginStart: () => {
                
                set({ loading: true, error: null });
            },
            loginSuccess: ({ user, token }) => {
                
                // removed debug log
                // removed debug log
                set({
                    loading: false,
                    isAuthenticated: true,
                    user,
                    token,
                    error: null,
                });
            },
            loginFailure: (error) => {
                
                // removed debug log
                set({
                    loading: false,
                    error,
                    isAuthenticated: false,
                    user: null,
                    token: null,
                });
            },
            logout: () => {
                
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    loading: false,
                    error: null,
                });
            },
            updateUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
        }
    )
);