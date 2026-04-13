export enum UserRole {
    ADMIN = 'admin',
    ASSOCIATION = 'association',
    CHECK_IN_STAFF = 'CHECK_IN_STAFF',
    EDITOR = 'EDITOR',
    EVENT_ORGANIZATOR = 'EVENT_ORGANIZATOR',
    RAFFLE_MODERATOR = 'RAFFLE_MODERATOR',
    ROLE_BUSINESS = 'role_business',
    ROLE_RAFFLE_ADMIN = 'ROLE_RAFFLE_ADMIN',
    STORE_ADMIN = 'store_admin',
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
