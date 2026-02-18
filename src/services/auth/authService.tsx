import { api } from '../api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    const { token, user } = response.data;
    
    // Store token and user info in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Set token in axios headers
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return response.data;
  },

  logout: async (): Promise<void> => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Remove token from axios headers
    delete api.defaults.headers.common['Authorization'];
    
    // Call logout endpoint if needed
    await api.post('/auth/logout');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
}; 