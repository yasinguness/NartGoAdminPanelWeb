export interface StoryDto {
    id: string;
    mediaId?: string;
    mediaUrl?: string;
    url?: string; // Sometimes response uses 'url'
    mediaType?: 'IMAGE' | 'VIDEO' | string;
    type?: string;
    createdAt: string;
    expiresAt?: string;
    viewCount?: number;
    likeCount?: number;
}

export interface StoryFeedDto {
    userId: string;
    userEmail?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    profileImageUrl?: string;
    stories: StoryDto[];
}

export type StoryModerationStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';

export type StoryReportReason =
    | 'SPAM'
    | 'HARASSMENT'
    | 'HATE_SPEECH'
    | 'VIOLENCE'
    | 'NUDITY'
    | 'FALSE_INFORMATION'
    | 'COPYRIGHT'
    | 'OTHER';

export type StoryReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

/// Admin-only story view; carries metrics & moderation state in addition to
/// the basic public fields.
export interface AdminStoryDto {
    id: string;
    userId: string;
    mediaId?: string;
    mediaUrl?: string;
    type?: 'IMAGE' | 'VIDEO' | string;
    duration?: number;
    createdAt?: string;
    expiresAt?: string;
    mediaVersion?: number;
    moderationStatus: StoryModerationStatus;
    rejectionReason?: string | null;
    viewCount: number;
    reportCount: number;
}

export interface AdminStoryReportItem {
    id: number;
    reporterEmail: string;
    reason: StoryReportReason;
    description?: string | null;
    status: StoryReportStatus;
    createdAt: string;
}

export interface AdminStoryReportDto {
    story: AdminStoryDto;
    reports: AdminStoryReportItem[];
}

export interface AdminStoryListFilters {
    userId?: string;
    status?: StoryModerationStatus;
    from?: string; // ISO datetime
    to?: string;
}
