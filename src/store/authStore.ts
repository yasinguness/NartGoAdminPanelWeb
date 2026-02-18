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
                console.log('=== AUTH STORE: loginStart ===');
                set({ loading: true, error: null });
            },
            loginSuccess: ({ user, token }) => {
                console.log('=== AUTH STORE: loginSuccess ===');
                console.log('User stored:', user);
                console.log('Token stored length:', token?.length || 0);
                set({
                    loading: false,
                    isAuthenticated: true,
                    user,
                    token,
                    error: null,
                });
            },
            loginFailure: (error) => {
                console.log('=== AUTH STORE: loginFailure ===');
                console.log('Error stored:', error);
                set({
                    loading: false,
                    error,
                    isAuthenticated: false,
                    user: null,
                    token: null,
                });
            },
            logout: () => {
                console.log('=== AUTH STORE: logout ===');
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