import { api } from "../api";
import { SubscriptionPaymentDto } from "../../types/subscriptionPayment/subscriptionPaymentDto";
import { SubscriptionPaymentFilterDto } from "../../types/subscriptionPayment/subscriptionPaymentFilterDto";
import { AssociationRevenueDto } from "../../types/subscriptionPayment/associationRevenueDto";
import { AssociationAnalyticsDto } from "../../types/subscriptionPayment/associationAnalyticsDto";
import { ApiResponse } from "../../types/api";
import { AdminSubscriptionPaymentDto } from "../../types/subscriptionPayment/adminSubscriptionPaymentDto";
import { PageResponseDto } from "../../types/common/pageResponse";



export const subscriptionPaymentService = {
  // Association-specific operations
  getAssociationTransactions: async (
    associationId: string,
    filter: SubscriptionPaymentFilterDto,
    page: number = 0,
    size: number = 10,
    sort: string = 'purchaseDate,desc'
  ) => {
    const response = await api.get<ApiResponse<PageResponseDto<AdminSubscriptionPaymentDto>>>(
      `/businesses/subscription-payments/${associationId}/transactions`,
      {
        params: {
          ...filter,
          page,
          size,
          sort
        }
      }
    );
    return response.data;
  },

  getAssociationAnalytics: async (
    associationId: string,
    startDate?: string,
    endDate?: string
  ) => {
    const response = await api.get<ApiResponse<AssociationAnalyticsDto>>(
      `/businesses/subscription-payments/${associationId}/analytics`,
      {
        params: { startDate, endDate }
      }
    );
    return response.data;
  },

  getSubscriptionPaymentDetails: async (
    associationId: string,
    paymentId: string
  ) => {
    const response = await api.get<ApiResponse<SubscriptionPaymentDto>>(
      `/businesses/subscription-payments/${associationId}/transactions/${paymentId}`
    );
    return response.data;
  },
};