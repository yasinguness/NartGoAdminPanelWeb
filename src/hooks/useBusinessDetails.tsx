import { useQuery } from '@tanstack/react-query'
import { businessService } from '../services/business/businessService'
import { BusinessDto } from '../types/businesses/businessModel'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
  statusCode: number
  statusMessage: string
}

export function useBusinessDetails(businessId?: string) {
  const query = useQuery<ApiResponse<BusinessDto>>({
    queryKey: ['business', businessId],
    queryFn: () => businessService.getBusinessById(businessId as string),
    enabled: !!businessId,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    status: query.status,
  }
}


