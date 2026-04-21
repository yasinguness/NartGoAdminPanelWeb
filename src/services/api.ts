import axios from 'axios';
import { AuthService } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nartgo.net/api/v1';
const authService = new AuthService();

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: !import.meta.env.DEV,
});

// Add request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = authService.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const skipAuthRedirect = (error.config as any)?.skipAuthRedirect === true;

        if (status === 401 && !skipAuthRedirect) {
            // Token gerçekten expire/invalid — logout.
            // skipAuthRedirect flag'li isteklerde (opsiyonel admin endpoint'leri vs.)
            // logout tetikleme, component kendisi handle etsin.
            authService.logout();
            window.location.href = '/admin/login';
        } else if ((status === 401 || status === 403) && import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[API ${status}] ${error.config?.method?.toUpperCase()} ${error.config?.url} — yetki reddedildi${skipAuthRedirect ? ' (skipAuthRedirect)' : ''}.`);
        }
        return Promise.reject(error);
    }
);

// Auth endpoints
export const auth = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    logout: () => api.post('/auth/logout'),
};

export default {
    auth,
}; 