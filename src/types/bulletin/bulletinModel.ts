export enum BulletinStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
    ACTIVE = 'ACTIVE',
    PASSIVE = 'PASSIVE'
}

export enum BulletinType {
    JOB = 'JOB',
    EDUCATION = 'EDUCATION',
    HOUSING = 'HOUSING',
    HELP = 'HELP',
}

export interface BulletinDto {
    id: string;
    title: string;
    content?: string;
    description?: string;
    type?: string;
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
    type: BulletinType;
    title: string;
    description: string;
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
