import { create } from 'zustand';
import { eventService } from '../../services/event/eventService';
import { EventResponseDTO, EventCategoryDto, EventSearchDTO, UpcomingEventDTO, EventStatus } from '../../types/events/eventModel';

interface EventStore {
    // State
    events: EventResponseDTO[];
    categories: EventCategoryDto[];
    upcomingEvents: UpcomingEventDTO[];
    loading: boolean;
    error: string | null;
    totalPages: number;
    currentPage: number;

    // Actions
    fetchEventsByCategory: (categoryId: string) => Promise<void>;
    findNearbyEvents: (searchDTO: EventSearchDTO, page?: number, size?: number) => Promise<void>;
    getPopularEvents: (searchDTO: EventSearchDTO, page?: number, size?: number) => Promise<void>;
    getHomePageEvents: (latitude?: number, longitude?: number, nearbyLimit?: number, popularLimit?: number) => Promise<void>;
    getUpcomingEvents: () => Promise<void>;

    // Event Management Actions
    createEvent: (event: Omit<EventResponseDTO, 'id'>) => Promise<EventResponseDTO>;
    createEventAsAdmin: (event: Omit<EventResponseDTO, 'id'>, organizerId: string, image?: File) => Promise<EventResponseDTO>;
    updateEvent: (id: string, event: Omit<EventResponseDTO, 'id'>) => Promise<EventResponseDTO>;
    deleteEvent: (userId: string, eventId: string) => Promise<void>;
    updateActiveStatus: (id: string, status: EventStatus) => Promise<void>;

    // Category Actions
    fetchCategories: () => Promise<void>;
    createCategory: (category: EventCategoryDto) => Promise<EventCategoryDto>;
    updateCategory: (id: string, category: EventCategoryDto) => Promise<EventCategoryDto>;
    deleteCategory: (id: string) => Promise<void>;
    getCategoryById: (id: string) => Promise<EventCategoryDto>;
}

export const useEventStore = create<EventStore>((set, get) => ({
    // Initial state
    events: [],
    categories: [],
    upcomingEvents: [],
    loading: false,
    error: null,
    totalPages: 0,
    currentPage: 0,

    // Event Actions
    fetchEventsByCategory: async (categoryId) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getEventsByCategory(categoryId);
            set({ events: response.data });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch events by category' });
        } finally {
            set({ loading: false });
        }
    },

    findNearbyEvents: async (searchDTO, page = 0, size = 10) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.findNearbyEvents(searchDTO, page, size);
            set({
                events: response.data.content,
                totalPages: response.data.totalPages,
                currentPage: response.data.number
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch nearby events' });
        } finally {
            set({ loading: false });
        }
    },

    getPopularEvents: async (searchDTO, page = 0, size = 10) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getPopularEvents(searchDTO, page, size);
            set({
                events: response.data.content,
                totalPages: response.data.totalPages,
                currentPage: response.data.number
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch popular events' });
        } finally {
            set({ loading: false });
        }
    },

    getHomePageEvents: async (latitude, longitude, nearbyLimit = 5, popularLimit = 5) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getHomePageEvents(latitude, longitude, nearbyLimit, popularLimit);
            set({ events: [...response.data.nearbyEvents, ...response.data.popularEvents] });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch home page events' });
        } finally {
            set({ loading: false });
        }
    },

    getUpcomingEvents: async () => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getUpcomingEvents();
            set({ upcomingEvents: response.data });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch upcoming events' });
        } finally {
            set({ loading: false });
        }
    },

    // Event Management Actions
    createEvent: async (event) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.createEvent(event);
            set((state) => ({
                events: [...state.events, response.data]
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create event' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    createEventAsAdmin: async (event, organizerId, image) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.createEventAsAdmin(event, organizerId, image);
            set((state) => ({
                events: [...state.events, response.data]
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create event as admin' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateEvent: async (id, event) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.updateEvent(id, event);
            set((state) => ({
                events: state.events.map((evt) =>
                    evt.id === id ? response.data : evt
                )
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update event' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteEvent: async (userId, eventId) => {
        try {
            set({ loading: true, error: null });
            await eventService.deleteEvent(userId, eventId);
            set((state) => ({
                events: state.events.filter((evt) => evt.id !== eventId)
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete event' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateActiveStatus: async (id, status) => {
        try {
            set({ loading: true, error: null });
            await eventService.updateEventStatus(id, status);
            set((state) => ({
                events: state.events.map((evt) =>
                    evt.id === id ? { ...evt, status } : evt
                )
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update event status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Category Actions
    fetchCategories: async () => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getAllCategories();
            set({ categories: response.data });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch categories' });
        } finally {
            set({ loading: false });
        }
    },

    createCategory: async (category) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.createCategory(category);
            set((state) => ({
                categories: [...state.categories, response.data]
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to create category' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateCategory: async (id, category) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.updateCategory(id, category);
            set((state) => ({
                categories: state.categories.map((cat) =>
                    cat.id === id ? response.data : cat
                )
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update category' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteCategory: async (id) => {
        try {
            set({ loading: true, error: null });
            await eventService.deleteCategory(id);
            set((state) => ({
                categories: state.categories.filter((cat) => cat.id !== id)
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete category' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    getCategoryById: async (id) => {
        try {
            set({ loading: true, error: null });
            const response = await eventService.getCategoryById(id);
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch category' });
            throw error;
        } finally {
            set({ loading: false });
        }
    }
})); 