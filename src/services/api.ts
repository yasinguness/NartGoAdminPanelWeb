import axios from 'axios';
import { getValidToken } from './tokenStorage';
import { handleUnauthorized } from './authEvents';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nartgo.net/api/v1';

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: !import.meta.env.DEV,
});

// Request interceptor — geçerli token'ı ekle (tek kaynak: tokenStorage)
api.interceptors.request.use(
    (config) => {
        const token = getValidToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — 401'i tek-merkezden ele al
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const skipAuthRedirect = (error.config as any)?.skipAuthRedirect === true;

        if (status === 401 && !skipAuthRedirect) {
            handleUnauthorized();
        } else if ((status === 401 || status === 403) && import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(
                `[API ${status}] ${error.config?.method?.toUpperCase()} ${error.config?.url} — yetki reddedildi${skipAuthRedirect ? ' (skipAuthRedirect)' : ''}.`
            );
        }
        return Promise.reject(error);
    }
);

// Auth endpoints (kısa yol). Login'de 401 = hatalı şifre → global redirect tetikleme.
export const auth = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }, { skipAuthRedirect: true } as any),
    logout: () => api.post('/auth/logout'),
};

export default {
    auth,
};
