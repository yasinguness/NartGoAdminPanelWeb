import { AddressDTO } from './addressModel';
export enum BusinessStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED'
}

export interface SocialMediaDto {
    platform: string;
    url: string;
}

export interface WorkingHoursDto {
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    closed: boolean;
}

export interface BusinessDto {
    id: string;
    name: string;
    description?: string;
    shortDescription?: string;

    // Category information
    categoryId: string;
    subCategoryId?: string;
    categoryName?: string;
    subCategoryName?: string;

    address: AddressDTO;

    // Media
    profileImageUrl?: string;
    coverImageUrl?: string;
    galleryImages?: string[];
    logoUrl?: string;

    // Contact
    phoneNumber?: string;
    whatsappNumber?: string;
    email?: string;
    website?: string;
    socialMedia?: SocialMediaDto[];

    // Business features
    hasSubscriptionSystem: boolean;
    priceRange?: string;

    // Working hours
    workingHours?: WorkingHoursDto[];
    openNow: boolean;
    nextOpeningTime?: string;

    // Reviews
    averageRating?: number;
    totalReviews?: number;

    // Management
    ownerId: string;
    ownerName?: string;
    establishedDate?: string;
    verified: boolean;
    priority?: number;

    // Featured Business Fields
    globallyFeatured: boolean;
    locallyFeatured: boolean;
    featuredRadiusKm?: number;
    featuredStartDate?: string;
    featuredEndDate?: string;
    featuredPaused: boolean;
    featuredPauseReason?: string;
    featuredPauseStartDate?: string;
    featuredPauseEndDate?: string;
    featuredViewsCount?: number;
    featuredClicksCount?: number;
    featuredConversionRate?: number;
    distance?: number;
    featuredStatus?: string;
    remainingFeaturedDays?: number;

    // Statistics
    viewCount?: number;
    favoriteCount?: number;
    orderCount?: number;
    reservationCount?: number;

    // Payment information
    acceptedPaymentMethods?: string[];
    hasOnlinePayment: boolean;

    // Reservation/Appointment
    hasAppointmentSystem: boolean;
    maxAdvanceBookingDays?: number;
    minAdvanceBookingHours?: number;

    status: BusinessStatus;
}
