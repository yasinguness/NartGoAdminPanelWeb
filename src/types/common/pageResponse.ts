export interface PageResponseDto<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    empty: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
} 