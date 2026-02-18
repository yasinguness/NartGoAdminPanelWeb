import { useMutation, useQuery } from '@tanstack/react-query';
import { AuthService } from '../services/auth.service';
import { LoginResponseData } from '../types/auth';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { UserModel } from '../types/user';

const authService = new AuthService();

interface LoginCredentials {
    email: string;
    password: string;
}

export const useAuth = () => {
    const { loginStart, loginSuccess, loginFailure, logout: logoutStore } = useAuthStore();
    const navigate = useNavigate();

    const loginMutation = useMutation<{ data: LoginResponseData; user: UserModel }, Error, LoginCredentials>({
        mutationFn: async (credentials) => {
            loginStart();
            console.log('User:', credentials);
            const loginResponse = await authService.login(credentials.email, credentials.password);
            console.log('Login Response:', loginResponse);
            
            // Fetch user profile immediately to ensure we have both token and user data
            // Any error here (e.g. 500) will be caught by onError
            const user = await authService.getCurrentUser();
            console.log('User:', user);
            
            return { data: loginResponse, user };
        },
        onSuccess: (result) => {
            const { data, user } = result;
            console.log('Login Flow Complete:', result);
            loginSuccess({
                user: user,
                token: data.bearerToken,
            });
            navigate('/dashboard');
        },
        onError: (error) => {
            console.log('Error:', error);
            // Clear any partial state (e.g. token saved but user fetch failed)
            authService.logout();
            loginFailure(error.message);
            throw error;
        },
    });

    const currentUserQuery = useQuery<UserModel>({
        queryKey: ['currentUser'],
        queryFn: () => authService.getCurrentUser(),
        enabled: authService.isAuthenticated(),
    });

    const logout = () => {
        authService.logout();
        logoutStore();
        navigate('/login');
    };

    return {
        login: loginMutation.mutate,
        logout,
        isLoading: loginMutation.isPending,
        error: loginMutation.error,
        currentUser: currentUserQuery.data,
        isAuthenticated: authService.isAuthenticated(),
        //hasRole: (role: string) => authService.hasRole(role),
    };
}; 