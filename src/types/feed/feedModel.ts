export enum FeedStatus {
    UPLOADED_RAW = 'UPLOADED_RAW',
    PROCESSING_METADATA = 'PROCESSING_METADATA',
    READY_RAW = 'READY_RAW',
    PROCESSING_STREAM = 'PROCESSING_STREAM',
    READY_STREAM = 'READY_STREAM',
    PROCESSING = 'PROCESSING',
    PENDING_APPROVAL = 'PENDING_APPROVAL',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    FAILED = 'FAILED',
    REPORTED = 'REPORTED'
}

export interface FeedDto {
    id: string; // Database ID (Unified with videoId/mediaId where applicable)
    videoId?: string; // Content service video identifier (if provided)
    mediaId?: string; // Media Service ID
    videoPath?: string;
    mediaPath?: string;
    path?: string;
    storagePath?: string;
    title: string;
    summary?: string;
    description?: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string; // Legacy/Raw URL
    rawVideoUrl?: string; // MP4 URL for immediate playback
    playlistUrl?: string; // HLS URL
    thumbnailUrl?: string;
    hlsReady?: boolean;
    status: FeedStatus;
    
    // Creator Info
    creatorId?: string;
    creatorUsername?: string;
    creatorAvatarUrl?: string;
    
    // Stats
    likeCount?: number;
    viewCount?: number;
    shareCount?: number;
    commentCount?: number;
    
    // Video Metadata
    durationSeconds?: number;
    width?: number;
    height?: number;
    
    // Metadata
    pinned?: boolean;
    rejectionReason?: string;
    moderatedBy?: string;
    moderatedAt?: string;
    publishedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    hashtags?: string[];
    musicId?: string;
    musicTitle?: string;
    musicArtist?: string;
    allowComments?: boolean;
    taggedUserIds?: string[];
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

export interface InstagramImportRequest {
    instagramUrl: string;
    creatorEmail?: string;
    title?: string;
    description?: string;
    priority?: number;
}

export interface InstagramImportResponse {
    status: string;
    mediaId: string;
    url: string;
    message?: string;
}
