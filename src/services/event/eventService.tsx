import { api } from '../api';
import { EventResponseDTO, EventSearchDTO, EventCategoryDto, UpcomingEventDTO, EventStatus } from '../../types/events/eventModel';
import { PageResponseDto } from '../../types/common/pageResponse';
import { AssociationEventSummary } from '../../types/association/associationEventSummary';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    statusCode: number;
    statusMessage: string;
}

export interface EventHomeDTO {
    nearbyEvents: EventResponseDTO[];
    popularEvents: EventResponseDTO[];
}

export const eventService = {
    // Event Category Operations
    getAllCategories: async () => {
        const response = await api.get<ApiResponse<EventCategoryDto[]>>('/events/event-categories');
        return response.data;
    },

    getCategoryById: async (id: string) => {
        const response = await api.get<ApiResponse<EventCategoryDto>>(`/events/event-categories/${id}`);
        return response.data;
    },

    createCategory: async (category: EventCategoryDto) => {
        const response = await api.post<ApiResponse<EventCategoryDto>>('/events/event-categories', category);
        return response.data;
    },

    updateCategory: async (id: string, category: EventCategoryDto) => {
        const response = await api.put<ApiResponse<EventCategoryDto>>(`/events/event-categories/${id}`, category);
        return response.data;
    },

    deleteCategory: async (id: string) => {
        const response = await api.delete<ApiResponse<void>>(`/events/event-categories/${id}`);
        return response.data;
    },

    // Event Operations
    getEventById: async (id: string) => {
        const response = await api.get<ApiResponse<EventResponseDTO>>(`/events/${id}`);
        return response.data;
    },

    getEventsByCategory: async (categoryId: string) => {
        const response = await api.get<ApiResponse<EventResponseDTO[]>>(`/events/category/${categoryId}`);
        return response.data;
    },

    findNearbyEvents: async (searchDTO: EventSearchDTO, page: number = 0, size: number = 10) => {
        const response = await api.get<ApiResponse<PageResponseDto<EventResponseDTO>>>('/events/nearby/all', {
            params: {
                ...searchDTO,
                page,
                size,
                sort: 'distance,asc'
            }
        });
        return response.data;
    },

    getPopularEvents: async (searchDTO: EventSearchDTO, page: number = 0, size: number = 10) => {
        const response = await api.get<ApiResponse<PageResponseDto<EventResponseDTO>>>('/events/popular/all', {
            params: {
                ...searchDTO,
                page,
                size,
                sort: 'popularityScore,desc'
            }
        });
        return response.data;
    },

    getHomePageEvents: async (latitude?: number, longitude?: number, nearbyLimit: number = 5, popularLimit: number = 5) => {
        const response = await api.get<ApiResponse<EventHomeDTO>>('/events/home', {
            params: {
                latitude,
                longitude,
                nearbyLimit,
                popularLimit
            }
        });
        return response.data;
    },

    getUpcomingEvents: async () => {
        const response = await api.get<ApiResponse<UpcomingEventDTO[]>>('/events/upcoming-events');
        return response.data;
    },

    // Event Management Operations
    createEvent: async (event: Omit<EventResponseDTO, 'id'>) => {
        const response = await api.post<ApiResponse<EventResponseDTO>>('/events', event);
        return response.data;
    },

    updateEvent: async (id: string, event: Omit<EventResponseDTO, 'id'>) => {
        const response = await api.put<ApiResponse<EventResponseDTO>>(`/events/${id}`, event);
        return response.data;
    },

    deleteEvent: async (userId: string, eventId: string) => {
        const response = await api.delete<ApiResponse<void>>(`/events/users/${userId}/${eventId}/delete`);
        return response.data;
    },

    updateEventStatus: async (id: string, status: EventStatus) => {
        const response = await api.patch<ApiResponse<void>>(`/events/${id}/status`, { status });
        return response.data;
    },

    getEventsByOrganizerId: async (organizerId: string) => {
        const response = await api.get<ApiResponse<AssociationEventSummary>>(`/events/organizer/${organizerId}`);
        return response.data;
    }
};
