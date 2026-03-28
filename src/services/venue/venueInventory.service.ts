import { api } from '../api';

class VenueInventoryService {
    async getVenueTopology(venueId: string, eventId?: string): Promise<any[]> {
        const response = await api.get(`/venue-inventory/venues/${venueId}`, { params: { eventId } });
        return response.data;
    }

    async getBlockDetails(blockId: string): Promise<any> {
        const response = await api.get(`/venue-inventory/blocks/${blockId}`);
        return response.data;
    }

    async updateAllocation(entityId: string, payload: any): Promise<any> {
        const response = await api.patch(`/venue-inventory/allocations/${entityId}`, payload);
        return response.data;
    }

    async createBlackout(payload: any): Promise<any> {
        const response = await api.post(`/venue-inventory/blackout`, payload);
        return response.data;
    }

    async createSponsorAllotment(payload: any): Promise<any> {
        const response = await api.post(`/venue-inventory/allotment`, payload);
        return response.data;
    }

    async validateInventoryChanges(venueId: string): Promise<any> {
        const response = await api.post(`/venue-inventory/venues/${venueId}/validate`);
        return response.data;
    }
}

export const venueInventoryService = new VenueInventoryService();
