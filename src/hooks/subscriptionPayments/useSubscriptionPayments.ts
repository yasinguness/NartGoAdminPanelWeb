import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { subscriptionPaymentService } from '../../services/subscriptionPayments/subscriptionPaymentService';
import { SubscriptionPaymentFilterDto } from '../../types/subscriptionPayment';

export const useAssociationTransactions = (
  associationId: string,
  filter: SubscriptionPaymentFilterDto,
  page: number,
  size: number,
  sort: string = 'purchaseDate,desc'
) => {
  return useQuery({
    queryKey: ['associationTransactions', associationId, filter, page, size, sort],
    queryFn: () =>
      subscriptionPaymentService.getAssociationTransactions(associationId, filter, page, size, sort),
    enabled: !!associationId,
    placeholderData: keepPreviousData,
  });
}; 