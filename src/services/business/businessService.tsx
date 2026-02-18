import { api } from '../api';
import { BusinessDto, BusinessStatus } from '../../types/businesses/businessModel';
import { PageResponseDto } from '../../types/common/pageResponse';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export interface GetAllBusinessesParams {
    keyword?: string;
    status?: BusinessStatus;
    includeUnverified?: boolean;
    includeInactive?: boolean;
    categoryId?: string;
    countryCode?: string;
    city?: string;
    featuredOnly?: boolean;
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    sortBy?: 'distance' | 'name' | 'recently_added';
    page?: number;
    size?: number;
}

export const businessService = {
    // Get single business by id
    getBusinessById: async (businessId: string) => {
        const response = await api.get<ApiResponse<BusinessDto>>(`/businesses/${businessId}`)
        return response.data
    },
    // User Business Management
    getUserBusinesses: async (userId: string, page: number = 0, size: number = 10) => {
        const response = await api.get<ApiResponse<PageResponseDto<BusinessDto>>>(
            `/businesses/users/${userId}`,
            {
                params: { page, size }
            }
        );
        return response.data;
    },

    updateUserBusiness: async (
        userId: string,
        businessId: string,
        businessData: Partial<BusinessDto>,
        profileImage?: File,
        coverImage?: File,
        galleryImages?: File[]
    ) => {
        const formData = new FormData();
        formData.append('business', JSON.stringify(businessData));
        if (profileImage) formData.append('profileImage', profileImage);
        if (coverImage) formData.append('coverImage', coverImage);
        if (galleryImages) {
            galleryImages.forEach((image) => {
                formData.append('galleryImages', image);
            });
        }

        const response = await api.put<ApiResponse<BusinessDto>>(
            `/businesses/${businessId}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    // Update specific business fields without file uploads
    updateBusinessFields: async (businessId: string, businessData: Partial<BusinessDto>) => {
        // Ensure we're sending a complete business object with all fields
        const response = await api.patch<ApiResponse<BusinessDto>>(
            `/businesses/${businessId}`,
            businessData,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    },

    deleteUserBusiness: async (userId: string, businessId: string) => {
        const response = await api.delete<ApiResponse<void>>(
            `/businesses/users/${userId}/${businessId}`
        );
        return response.data;
    },

    verifyBusiness: async (businessId: string) => {
        const response = await api.patch<ApiResponse<BusinessDto>>(`/businesses/${businessId}/verify`);
        return response.data;
    },

    toggleUserBusinessStatus: async (userId: string, businessId: string) => {
        const response = await api.patch<ApiResponse<BusinessDto>>(
            `/businesses/users/${userId}/${businessId}/toggle-status`
        );
        return response.data;
    },

    // Featured Business Endpoints
    setBusinessAsGloballyFeatured: async (userId: string, businessId: string, durationInDays: number) => {
        const response = await api.patch<ApiResponse<BusinessDto>>(
            `/businesses/users/${userId}/businesses/${businessId}/featured/global`,
            null,
            {
                params: { durationInDays }
            }
        );
        return response.data;
    },

    setBusinessAsLocallyFeatured: async (
        userId: string,
        businessId: string,
        durationInDays: number,
        radiusInKm: number
    ) => {
        const response = await api.patch<ApiResponse<BusinessDto>>(
            `/businesses/users/${userId}/businesses/${businessId}/featured/local`,
            null,
            {
                params: { durationInDays, radiusInKm }
            }
        );
        return response.data;
    },

    removeFeaturedStatus: async (businessId: string) => {
        const response = await api.patch<ApiResponse<BusinessDto>>(
            `/businesses/${businessId}/featured/remove`
        );
        return response.data;
    },

    // Get all businesses with filters
    getAllBusinesses: async (params: GetAllBusinessesParams) => {
        const response = await api.get<ApiResponse<PageResponseDto<BusinessDto>>>('/businesses', {
            params: {
                keyword: params.keyword,
                includeUnverified: params.includeUnverified || true,
                includeInactive: params.includeInactive || true,
                categoryId: params.categoryId,
                countryCode: params.countryCode,
                city: params.city,
                featuredOnly: params.featuredOnly,
                latitude: params.latitude,
                longitude: params.longitude,
                radiusInKm: params.radiusInKm,
                sortBy: params.sortBy,
                page: params.page || 0,
                size: params.size || 10
            }
        });
        return response.data;
    },

    // Hard delete business
    hardDeleteBusiness: async (businessId: string) => {
        const response = await api.delete<ApiResponse<void>>(
            `/businesses/${businessId}/hard`
        );
        return response.data;
    }
};
