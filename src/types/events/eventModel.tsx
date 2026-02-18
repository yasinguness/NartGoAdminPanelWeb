import { AddressDTO } from '../businesses/addressModel';

export enum EventStatus {
    ACTIVE = 'ACTIVE',
    CANCELLED = 'CANCELLED',
    PASSIVE = 'PASSIVE',
    COMPLETED = 'COMPLETED'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED'
}

export enum JoinStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

export interface EventCategoryDto {
    id: string;
    name: string;
    description?: string;
}

export interface ImageDTO {
    id: string;
    fileName: string;
    originalFileName: string;
    contentType: string;
    size: number;
    path: string;
    url: string;
    thumbnailUrl: string;
    createdAt: string;
    updatedAt: string;
}

export interface ParticipationDTO {
    id: string;
    userId: string;
    eventId: string;
    ticketCode?: string;
    paymentStatus: PaymentStatus;
    status: JoinStatus;
    joinedAt: string;
    userName: string;
    userImage: string;
}

export interface EventResponseDTO {
    id: string;
    name: string;
    description: string;
    address: AddressDTO;
    eventTime: string;
    endTime: string;
    maxParticipants: number;
    currentParticipants: number;
    image: string;
    ticketPrice: number;
    category: EventCategoryDto;
    organizerId: string;
    isPaid: boolean;
    isFeatured: boolean;
    isPrivate: boolean;
    registrationDeadline: string;
    cancellationPolicy: string;
    additionalInfo: string;
    status: EventStatus;
    createdAt: string;
    updatedAt: string;
    isRegistrationOpen: boolean;
    images: ImageDTO[];
    participants: ParticipationDTO[];
}

export interface EventSearchDTO {
    keyword?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    minPrice?: number;
    maxPrice?: number;
    isPaid?: boolean;
    isFeatured?: boolean;
    isPrivate?: boolean;
    isUpcoming?: boolean;
    hasAvailableSpots?: boolean;
    location?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    sortBy?: string;
}

export interface UpcomingEventDTO {
    id: string;
    title: string;
    eventTime: string;
    address: AddressDTO;
    participations: ParticipationDTO[];
    maxParticipants: number;
    imageUrl: string;
} 