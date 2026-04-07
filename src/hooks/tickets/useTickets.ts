/**
 * useTickets — React Query hooks for ticket management
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketManagementService } from '../../services/ticket/ticketManagementService';

export const useEventTickets = (eventId: string | undefined) =>
  useQuery({
    queryKey: ['event-tickets', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const res = await ticketManagementService.getEventTickets(eventId);
      return res.data;
    },
    enabled: Boolean(eventId),
  });

export const useEventOrders = (eventId: string | undefined) =>
  useQuery({
    queryKey: ['event-orders', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const res = await ticketManagementService.getEventOrders(eventId);
      return res.data;
    },
    enabled: Boolean(eventId),
  });

export const useCheckInStats = (eventId: string | undefined) =>
  useQuery({
    queryKey: ['checkin-stats', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID required');
      const res = await ticketManagementService.getCheckInStats(eventId);
      return res.data;
    },
    enabled: Boolean(eventId),
  });

export const useCancelTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason?: string }) =>
      ticketManagementService.cancelTicket(ticketId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['event-orders'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-stats'] });
    },
  });
};

export const useRefundTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, reason }: { ticketId: string; reason?: string }) =>
      ticketManagementService.refundTicket(ticketId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['event-orders'] });
    },
  });
};
