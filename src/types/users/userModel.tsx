import { AddressDTO } from '../businesses/addressModel';
import { RaceEnum } from '../enums/raceEnum';
import { BusinessType } from '../enums/businessType';

export enum UserStatusEnum {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE',
    DELETED = 'DELETED',
    BLOCKED = 'BLOCKED'
}

export enum AccountType {
    INDIVIDUAL = 'INDIVIDUAL',
    BUSINESS = 'BUSINESS'
}

export enum Language {
    TR = 'tr',
    EN = 'en'
}

export const LanguageDisplayNames: Record<Language, string> = {
    [Language.TR]: 'Türkçe',
    [Language.EN]: 'English'
};

export interface UserDTO {
    id: string;
    displayName?: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string; // Optional because we don't want to expose password in responses
    currentAddress?: AddressDTO;
    hometownAddress?: AddressDTO;
    gsmNo?: string;
    phoneCode?: string;
    birthDate?: string; // Date as ISO string
    race?: RaceEnum;
    family?: string;
    imageUrl?: string;
    job?: string;
    role: string[];
    userStatus: UserStatusEnum;
    isFamilyNameMigrated?: boolean;
    companyName?: string;
    accountType: AccountType;
    businessType?: BusinessType;
    language: Language;
    createdAt?: string; // ISO datetime string
    currentCity?: string;
    currentDistrict?: string;
    hometownCity?: string;
    hometownVillage?: string;
    profileIncomplete?: boolean;
    activitySummary?: UserActivitySummary;
    activityLog?: ActivityLogItem[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    devices: any[];
    createdAt: string;
    lastLoginAt: string;
}

export interface AdminUserStats {
    total: number;
    active: number;
    pending: number;
    banned: number;
    sellers: number;
    premiums: number;
    newThisMonth: number;
}

export interface UserActivitySummary {
    totalOrders: number;
    totalSpent: number;
    gamificationPoints: number;
    badges: number;
    eventsJoined: number;
    totalLogins: number;
    lastLoginAt?: string;
    lastLoginIp?: string;
    lastLoginDevice?: string;
    profileCompletionPercent: number;
    lastSession?: UserSessionDto | null;
    sessionHistory?: UserSessionDto[];
}

export interface UserSessionLocationDto {
    city?: string | null;
    country?: string | null;
    raw?: string | null;
}

export interface UserSessionDto {
    sessionId: string;
    loginAt?: string | null;
    lastActivityAt?: string | null;
    logoutAt?: string | null;
    status: 'ACTIVE' | 'LOGGED_OUT' | 'EXPIRED' | string;
    ipAddress?: string | null;
    userAgent?: string | null;
    device?: string | null;
    browser?: string | null;
    os?: string | null;
    platform?: string | null;
    location?: UserSessionLocationDto | null;
}

export interface UserSessionAnalyticsDto {
    userId: string;
    email: string;
    fullName?: string | null;
    lastSession?: UserSessionDto | null;
    sessionHistory: UserSessionDto[];
}

export interface ActivityLogItem {
    eventId?: string;
    eventType?: string;
    userId?: string | null;
    userEmail?: string | null;
    status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'FAILED' | 'SUSPICIOUS' | string;
    failureReason?: string;
    ipAddress?: string | null;
    device?: string | null;
    city?: string | null;
    country?: string | null;
    location?: string | null;
    createdAt: string;
    source?: string | null;
}

export interface UserLoginStatsDto {
    userId: string;
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    lastLoginAt?: string | null;
    lastLoginIp?: string | null;
    lastLoginDevice?: string | null;
    topSources: { source: string; count: number }[];
}

export interface AdminNote {
    id: string;
    content: string;
    createdBy: string;
    createdAt: string;
}
