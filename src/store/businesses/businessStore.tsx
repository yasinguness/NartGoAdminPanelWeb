import { create } from 'zustand';
import { businessService } from '../../services/business/businessService';
import { BusinessDto } from '../../types/businesses/businessModel';

interface BusinessStore {
    businesses: BusinessDto[];
    loading: boolean;
    error: string | null;
    fetchBusinesses: (params?: any) => Promise<void>;
    setBusinessAsGloballyFeatured: (userId: string, businessId: string, durationInDays: number) => Promise<BusinessDto>;
    setBusinessAsLocallyFeatured: (userId: string, businessId: string, durationInDays: number, radiusInKm: number) => Promise<BusinessDto>;
    removeFeaturedStatus: (businessId: string) => Promise<BusinessDto>;
    getUserBusinesses: (userId: string, page?: number, size?: number) => Promise<void>;
    updateUserBusiness: (
        userId: string,
        businessId: string,
        businessData: Partial<BusinessDto>,
        profileImage?: File,
        coverImage?: File,
        galleryImages?: File[]
    ) => Promise<BusinessDto>;
    updateBusinessFields: (businessId: string, businessData: Partial<BusinessDto>) => Promise<BusinessDto>;
    deleteUserBusiness: (userId: string, businessId: string) => Promise<void>;
    hardDeleteBusiness: (businessId: string) => Promise<void>;
    toggleUserBusinessStatus: (userId: string, businessId: string) => Promise<BusinessDto>;
    verifyBusiness: (businessId: string) => Promise<BusinessDto>;
}

export const useBusinessStore = create<BusinessStore>((set, get) => ({
    businesses: [],
    loading: false,
    error: null,

    fetchBusinesses: async (params) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.getAllBusinesses(params);
            set({ businesses: response.data.content });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch businesses' });
        } finally {
            set({ loading: false });
        }
    },

    getUserBusinesses: async (userId, page = 0, size = 10) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.getUserBusinesses(userId, page, size);
            set({ businesses: response.data.content });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch user businesses' });
        } finally {
            set({ loading: false });
        }
    },

    updateUserBusiness: async (userId, businessId, businessData, profileImage, coverImage, galleryImages) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.updateUserBusiness(
                userId,
                businessId,
                businessData,
                profileImage,
                coverImage,
                galleryImages
            );
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update business' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    updateBusinessFields: async (businessId, businessData) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.updateBusinessFields(businessId, businessData);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to update business fields' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    deleteUserBusiness: async (userId, businessId) => {
        try {
            set({ loading: true, error: null });
            await businessService.deleteUserBusiness(userId, businessId);
            set((state) => ({
                businesses: state.businesses.filter((business) => business.id !== businessId),
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to delete business' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    toggleUserBusinessStatus: async (userId, businessId) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.toggleUserBusinessStatus(userId, businessId);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to toggle business status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    setBusinessAsGloballyFeatured: async (userId, businessId, durationInDays) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.setBusinessAsGloballyFeatured(userId, businessId, durationInDays);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to set business as globally featured' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    setBusinessAsLocallyFeatured: async (userId, businessId, durationInDays, radiusInKm) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.setBusinessAsLocallyFeatured(userId, businessId, durationInDays, radiusInKm);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to set business as locally featured' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    removeFeaturedStatus: async (businessId) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.removeFeaturedStatus(businessId);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to remove featured status' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    verifyBusiness: async (businessId: string) => {
        try {
            set({ loading: true, error: null });
            const response = await businessService.verifyBusiness(businessId);
            set((state) => ({
                businesses: state.businesses.map((business) =>
                    business.id === businessId ? response.data : business
                ),
            }));
            return response.data;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to verify business' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    hardDeleteBusiness: async (businessId: string) => {
        try {
            set({ loading: true, error: null });
            await businessService.hardDeleteBusiness(businessId);
            set((state) => ({
                businesses: state.businesses.filter((business) => business.id !== businessId),
            }));
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to hard delete business' });
            throw error;
        } finally {
            set({ loading: false });
        }
    },
})); 