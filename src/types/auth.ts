import { ApiResponse } from './api';

export interface TokenInfo {
    tokenType: string;
    bearerToken: string;
    refreshToken: string;
    tokenExpirationDate: number;
    refreshTokenExpirationDate: number;
}

export interface LoginResponseData {
    tokenType: string;
    bearerToken: string;
    roles: string[] | null;
    tokenExpirationDate: number;
    refreshTokenExpirationDate: number;
    refreshToken: string;
}

export type LoginResponse = ApiResponse<LoginResponseData>; 