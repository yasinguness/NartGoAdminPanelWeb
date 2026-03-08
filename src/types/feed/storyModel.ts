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
