import { ApiResponse } from '../types/api';

export class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    protected async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
        });
        return this.handleResponse<T>(response);
    }

    protected async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        console.log(response);
        return this.handleResponse<T>(response);
    }

    protected async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse<T>(response);
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        let data: any;
        const responseText = await response.text();

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // If response is not JSON (e.g. 500 HTML page), use text
            if (!response.ok) {
                throw new Error(responseText || `HTTP error! status: ${response.status}`);
            }
            // If it was supposed to be success but no JSON, that's weird for this API
            console.error('Failed to parse JSON response:', responseText);
            throw new Error('Invalid response format');
        }

        console.log('API Response:', data);

        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        if (data.hasOwnProperty('success') && !data.success) {
             throw new Error(data.message || 'Operation failed');
        }

        return data as ApiResponse<T>;
    }
} 