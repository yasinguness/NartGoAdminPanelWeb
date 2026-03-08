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

export interface UserStats {
    total: number;
    active: number;
    blocked: number;
    newToday: number;
    activeToday: number;
}

export interface UserActivity {
    id: string;
    userId: string;
    action: string;
    details: string;
    timestamp: string;
    ipAddress: string;
} 
