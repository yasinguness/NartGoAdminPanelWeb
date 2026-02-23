/**
 * Security Data Models
 */

export enum LoginStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    BLOCKED = 'BLOCKED',
    SUSPICIOUS = 'SUSPICIOUS'
}

export interface LoginLog {
    id: string;
    userId?: string;
    username: string;
    ipAddress: string;
    device: {
        browser: string;
        os: string;
        type: 'mobile' | 'desktop' | 'tablet';
    };
    location: {
        city: string;
        country: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };
    status: LoginStatus;
    timestamp: string; // ISO string
    failureReason?: string;
}

export interface SecurityStats {
    totalAttempts: number;
    successCount: number;
    failureCount: number;
    uniqueIps: number;
    suspiciousActivityCount: number;
    failureRate: number; // Percentage
    timeWindows: {
        hour: string;
        attempts: number;
    }[];
}
