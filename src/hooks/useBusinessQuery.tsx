import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService } from '../services/business/businessService';
import { useBusinessStore } from '../store/businesses/businessStore';
import { BusinessDto, BusinessStatus } from '../types/businesses/businessModel';
import { PageResponseDto } from '../types/common/pageResponse';
import { useEffect, useCallback } from 'react';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

interface BusinessQueryParams {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: string;
  status?: BusinessStatus;
  city?: string;
  countryCode?: string;
  featuredOnly?: boolean;
  latitude?: number;
  longitude?: number;
  radiusInKm?: number;
  sortBy?: 'distance' | 'name' | 'recently_added';
  includeUnverified?: boolean;
  includeInactive?: boolean;
}

export const useBusinessQuery = (params: BusinessQueryParams = {}) => {
  const businessStore = useBusinessStore();

  const { isLoading, isError, error, data, status, refetch } = useQuery<ApiResponse<PageResponseDto<BusinessDto>>>({
    queryKey: ['businesses', params],
    queryFn: () => businessService.getAllBusinesses({
      page: params.page || 0,
      size: params.size || 10,
      keyword: params.keyword,
      categoryId: params.categoryId,
      status: params.status,
      city: params.city,
      countryCode: params.countryCode,
      featuredOnly: params.featuredOnly,
      latitude: params.latitude,
      longitude: params.longitude,
      radiusInKm: params.radiusInKm,
      sortBy: params.sortBy,
      includeUnverified: params.includeUnverified !== undefined ? params.includeUnverified : true,
      includeInactive: params.includeInactive !== undefined ? params.includeInactive : true
    })
  });

  return {
    data: data?.data?.content,
    isLoading,
    isError,
    error,
    status,
    refetch,
    totalPages: data?.data?.totalPages,
    totalElements: data?.data?.totalElements
  };
};

/* export const useGloballyFeaturedBusinesses = () => {
  const { isLoading, isError, error, data, status, refetch } = useQuery<ApiResponse<BusinessDto[]>>({
    queryKey: ['globallyFeaturedBusinesses'],
    queryFn: () => businessService.getGloballyFeaturedBusinesses()
  });

  return {
    data: data?.data,
    isLoading,
    isError,
    error,
    status,
    refetch
  };
};

export const useLocallyFeaturedBusinesses = (params: GetLocallyFeaturedParams) => {
  const { isLoading, isError, error, data, status, refetch } = useQuery<ApiResponse<BusinessDto[]>>({
    queryKey: ['locallyFeaturedBusinesses', params],
    queryFn: () => businessService.getLocallyFeaturedBusinesses(params),
    enabled: !!params.latitude && !!params.longitude
  });

  return {
    data: data?.data,
    isLoading,
    isError,
    error,
    status,
    refetch
  };
}; */

/* export const useUpdatedFeaturedBusinesses = () => {
  const { data: businesses, isLoading, isError, error, status, refetch } = useBusinessQuery();
 
  const { data: updatedBusinesses, isLoading: updatedLoading, isError: updatedError, error: updatedError, status: updatedStatus, refetch: updatedRefetch } = useQuery<ApiResponse<PageResponseDto<BusinessDto>>>({
    queryKey: ['businesses'],
    queryFn: () => businessService.getAllBusinesses({ page: 0, size: 10 })
  });

  return { businesses, isLoading, isError, error, status, refetch };
}; */