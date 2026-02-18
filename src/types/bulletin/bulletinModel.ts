export enum BulletinStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE'
}

export interface BulletinDto {
    id: string;
    title: string;
    content: string;
    summary?: string;
    status: BulletinStatus;
    pinned?: boolean;
    startAt?: string;
    endAt?: string;
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface BulletinCreateRequest {
    title: string;
    content: string;
    summary?: string;
    status?: BulletinStatus;
    pinned?: boolean;
    startAt?: string;
    endAt?: string;
}

export interface BulletinUpdateRequest extends Partial<BulletinCreateRequest> {}

export interface BulletinStatusUpdateRequest {
    status: BulletinStatus;
}

export interface BulletinQueryParams {
    keyword?: string;
    status?: BulletinStatus;
    pinned?: boolean;
    page?: number;
    size?: number;
}
