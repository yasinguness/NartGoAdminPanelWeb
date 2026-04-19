/**
 * UserRole — config/roles.ts'deki ROLES ile uyumlu, UPPERCASE tutarlı.
 * Backend farklı case gönderebilir; normalizeRole() ile hizalama hooks/useRole.ts'de yapılır.
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    ASSOCIATION = 'ASSOCIATION',
    CHECK_IN_STAFF = 'CHECK_IN_STAFF',
    EDITOR = 'EDITOR',
    EVENT_ORGANIZATOR = 'EVENT_ORGANIZATOR',
    RAFFLE_MODERATOR = 'RAFFLE_MODERATOR',
    ROLE_BUSINESS = 'ROLE_BUSINESS',
    ROLE_RAFFLE_ADMIN = 'ROLE_RAFFLE_ADMIN',
    STORE_ADMIN = 'STORE_ADMIN',
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
    BLOCKED = 'BLOCKED',
}

export enum AccountType {
    INDIVIDUAL = 'INDIVIDUAL',
    CORPORATE = 'CORPORATE',
    BUSINESS = 'BUSINESS',
    ASSOCIATION = 'ASSOCIATION',
}
