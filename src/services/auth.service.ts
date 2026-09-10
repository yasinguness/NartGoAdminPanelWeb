import { api } from './api';
import { LoginResponseData } from '../types/auth';
import { UserModel } from '../types/user';
import { UserRole } from '../types/enums';
import { ApiResponse } from '../types/api';
import {
    saveToken,
    clearTokens,
    getValidToken,
    isTokenExpired as tokenExpired,
} from './tokenStorage';

/** Axios hatasından kullanıcıya gösterilebilir mesajı çıkar (backend `message`'ı öncelikli). */
function errMessage(e: unknown, fallback: string): string {
    const m = (e as any)?.response?.data?.message;
    if (typeof m === 'string' && m.trim()) return m;
    return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Tek HTTP client (axios `api`) üzerinden auth işlemleri. Token kalıcılığı
 * `tokenStorage`'da merkezî. (Eskiden fetch-tabanlı ayrı bir client'tı.)
 */
export class AuthService {
    async login(email: string, password: string): Promise<LoginResponseData> {
        try {
            // 401 = hatalı şifre → global redirect tetikleme, formu hata göstersin.
            const res = await api.post<ApiResponse<LoginResponseData>>(
                '/auth/login',
                { email, password },
                { skipAuthRedirect: true } as any
            );
            const body = res.data;
            if (body.success && body.data) {
                saveToken(body.data.bearerToken);
                return body.data;
            }
            throw new AuthException(body.message || 'Giriş başarısız');
        } catch (e) {
            if (e instanceof AuthException) throw e;
            throw new AuthException(errMessage(e, 'Giriş başarısız'));
        }
    }

    async getCurrentUser(): Promise<UserModel> {
        try {
            const res = await api.get<ApiResponse<UserModel>>('/auth/me', {
                skipAuthRedirect: true,
            } as any);
            const body = res.data;
            if (body.success && body.data) {
                return body.data;
            }
            throw new AuthException('Kullanıcı bilgisi alınamadı');
        } catch (e) {
            if (e instanceof AuthException) throw e;
            throw new AuthException(errMessage(e, 'Kullanıcı bilgisi alınamadı'));
        }
    }

    isTokenExpired(): boolean {
        return tokenExpired();
    }

    logout(): void {
        clearTokens();
    }

    getAccessToken(): string | null {
        return getValidToken();
    }

    getCachedUser(): UserModel | null {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch {
                return null;
            }
        }
        return null;
    }

    isAuthenticated(): boolean {
        return !!getValidToken();
    }

    hasRole(role: UserRole): boolean {
        const user = this.getCachedUser();
        return user?.role?.has(role) ?? false;
    }

    async updateProfileImage(userId: string, imageUrl: string): Promise<UserModel> {
        try {
            const res = await api.put<ApiResponse<UserModel>>(
                `/${userId}/profile-image`,
                { imageUrl }
            );
            return res.data.data;
        } catch (e) {
            throw new AuthException(errMessage(e, 'Profil resmi güncellenemedi'));
        }
    }

    async resetPassword(email: string): Promise<void> {
        try {
            await api.post('/reset-password', { email }, { skipAuthRedirect: true } as any);
        } catch (e) {
            throw new AuthException(errMessage(e, 'Şifre sıfırlanamadı'));
        }
    }
}

export class AuthException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthException';
    }
}
