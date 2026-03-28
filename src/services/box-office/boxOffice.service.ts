import { api } from '../api';

class BoxOfficeService {
    async getAvailableCategories(eventId: string): Promise<any[]> {
        const response = await api.get(`/box-office/events/${eventId}/categories`);
        return response.data;
    }

    async holdTickets(eventId: string, categoryId: string, quantity: number, customerToken: string): Promise<any> {
        const response = await api.post(`/box-office/events/${eventId}/hold`, { categoryId, quantity, customerToken });
        return response.data;
    }

    async processSale(payload: any): Promise<any> {
        const response = await api.post(`/box-office/checkout`, payload);
        return response.data;
    }

    async saveReservation(payload: any): Promise<any> {
        const response = await api.post(`/box-office/reservations`, payload);
        return response.data;
    }

    async applyComplimentaryDiscount(orderId: string, promoCode: string, reason: string): Promise<any> {
        const response = await api.post(`/box-office/orders/${orderId}/complimentary`, { promoCode, reason });
        return response.data;
    }

    async printTickets(orderId: string): Promise<Blob> {
        const response = await api.post(`/box-office/orders/${orderId}/print`, null, { responseType: 'blob' });
        return response.data;
    }
}

export const boxOfficeService = new BoxOfficeService();
