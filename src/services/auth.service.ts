import { ApiService } from './api.service';
import { LoginResponse, LoginResponseData } from '../types/auth';
import { User, UserModel } from '../types/user';
import { UserRole } from '../types/enums';
import { ApiResponse } from '../types/api';

export class AuthService extends ApiService {
    constructor() {
        super('https://api.nartgo.net/api/v1');
    }

    async login(email: string, password: string): Promise<LoginResponseData> {
        try {
            const response = await this.post<LoginResponseData>('/auth/login', {
                email,
                password,
            });
            console.log('Response:', response);
            if (response.success && response.data) {
                await this.saveToken(response.data.bearerToken);
                return response.data;
            }
            throw new AuthException(response.message || 'Login failed');
        } catch (e) {
            console.log('Error:', e);
            throw new AuthException(e instanceof Error ? e.message : 'Login failed');
        }
    }

    async getCurrentUser(): Promise<UserModel> {
        try {
            const response = await this.get<UserModel>('/auth/me');
            if (response.success && response.data) {
                return response.data;
            }
            throw new AuthException('Failed to get current user');
        } catch (e) {
            throw new AuthException('Failed to get current user');
        }
    }

    private async saveToken(token: string): Promise<void> {
        localStorage.setItem('token', token);
        const expirationTime = this.getTokenExpirationTime(token);
        if (expirationTime) {
            localStorage.setItem('tokenExpiration', expirationTime.toString());
        }
    }

    private getTokenExpirationTime(token: string): number | null {
        try {
            const [, payload] = token.split('.');
            if (!payload) return null;

            const decodedPayload = JSON.parse(atob(payload));
            return decodedPayload.exp * 1000;
        } catch (e) {
            console.error('Error parsing token:', e);
            return null;
        }
    }

    isTokenExpired(): boolean {
        const expirationTime = localStorage.getItem('tokenExpiration');
        if (!expirationTime) return true;

        const currentTime = new Date().getTime();
        return currentTime >= parseInt(expirationTime);
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiration');
    }

    getAccessToken(): string | null {
        const token = localStorage.getItem('token');
        if (!token) return null;

        if (this.isTokenExpired()) {
            this.logout();
            return null;
        }

        return token;
    }

    getCachedUser(): UserModel | null {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.error('Error parsing cached user data:', e);
                return null;
            }
        }
        return null;
    }

    isAuthenticated(): boolean {
        const token = this.getAccessToken();
        return !!token;
    }

    hasRole(role: UserRole): boolean {
        const user = this.getCachedUser();
        return user?.role?.has(role) ?? false;
    }

    async updateProfileImage(userId: string, imageUrl: string): Promise<UserModel> {
        try {
            const response = await this.put<UserModel>(`/${userId}/profile-image`, {
                imageUrl
            });
            return response.data!;
        } catch (e) {
            throw new AuthException('Failed to update profile image');
        }
    }

    async resetPassword(email: string): Promise<void> {
        try {
            await this.post('/reset-password', { email });
        } catch (e) {
            throw new AuthException('Failed to reset password');
        }
    }
}

export class AuthException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthException';
    }
} 