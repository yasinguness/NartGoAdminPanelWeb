export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, string>;
    timestamp?: string;
    path?: string;
}

export interface QueryParams {
    page?: number;
    pageSize?: number;
    size?: number;
    search?: string;
    searchTerm?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    [key: string]: any;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    statusCode: number;
    statusMessage: string;
}

export interface ErrorState {
    error: string | null;
    loading: boolean;
}

export type SortOrder = 'asc' | 'desc';

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
