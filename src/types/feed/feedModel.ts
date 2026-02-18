export enum FeedStatus {
    DRAFT = 'DRAFT',
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED'
}

export interface FeedDto {
    id: string;
    title: string;
    summary?: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    status: FeedStatus;
    pinned?: boolean;
    rejectionReason?: string;
    moderatedBy?: string;
    moderatedAt?: string;
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FeedCreateRequest {
    title: string;
    summary?: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    status?: FeedStatus;
    pinned?: boolean;
}

export interface FeedUpdateRequest extends Partial<FeedCreateRequest> {}

export interface FeedStatusUpdateRequest {
    status: FeedStatus;
    rejectionReason?: string;
}

export interface FeedQueryParams {
    keyword?: string;
    status?: FeedStatus;
    pinned?: boolean;
    page?: number;
    size?: number;
}
