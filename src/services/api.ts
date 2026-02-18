import axios from 'axios';
import { AuthService } from './auth.service';

const BASE_URL = 'https://api.nartgo.net/api/v1'; // Direct API subdomain usage
const authService = new AuthService();

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // CORS için önemli
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
        if (error.response?.status === 401) {
            authService.logout();
            window.location.href = '/admin/login';
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