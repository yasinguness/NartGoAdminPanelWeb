import { api } from '../api';
import { 
  SeatMapResponse, 
  ReserveSeatsRequest, 
  ReserveSeatsResponse 
} from '../../types/tickets/ticketTypes';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  statusCode: number;
  statusMessage: string;
}

export const seatService = {
  // Koltuk Haritasını Getir
  getSeatMap: async (eventId: string) => {
    const response = await api.get<ApiResponse<SeatMapResponse>>(`/tickets/seats/events/${eventId}/map`);
    return response.data;
  },

  // Dolu Koltukları Getir
  getOccupiedSeats: async (eventId: string) => {
    const response = await api.get<ApiResponse<string[]>>(`/tickets/seats/events/${eventId}/occupied`);
    return response.data;
  },

  // Rezerve Koltukları Getir
  getReservedSeats: async (eventId: string) => {
    const response = await api.get<ApiResponse<string[]>>(`/tickets/seats/events/${eventId}/reserved`);
    return response.data;
  },

  // Koltuk Rezerve Et
  reserveSeats: async (eventId: string, request: ReserveSeatsRequest) => {
    const response = await api.post<ApiResponse<ReserveSeatsResponse>>(`/tickets/seats/events/${eventId}/reserve`, request);
    return response.data;
  },

  // Rezervasyonu Onayla
  confirmReservation: async (eventId: string, reservationId: string) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/seats/events/${eventId}/confirm/${reservationId}`);
    return response.data;
  },

  // Rezervasyonu İptal Et
  cancelReservation: async (eventId: string, reservationId: string) => {
    const response = await api.post<ApiResponse<void>>(`/tickets/seats/events/${eventId}/cancel/${reservationId}`);
    return response.data;
  },
};
