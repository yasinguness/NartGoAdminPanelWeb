import { api } from '../api';

class GateOpsService {
    async getLiveGatewayStatus(eventId: string): Promise<any[]> {
        const response = await api.get(`/tickets/gate-ops/live-status`, { params: { eventId } });
        return response.data;
    }

    async getGateDrillDown(gateId: string): Promise<any> {
        const response = await api.get(`/tickets/gate-ops/gates/${gateId}`);
        return response.data;
    }

    async getDeviceStatus(gateId: string): Promise<any[]> {
        const response = await api.get(`/tickets/gate-ops/gates/${gateId}/devices`);
        return response.data;
    }

    async getFraudAlarms(eventId: string, minutes: number = 60): Promise<any[]> {
        const response = await api.get(`/tickets/gate-ops/fraud-alarms`, { params: { eventId, minutes } });
        return response.data;
    }

    async broadcastMessage(gateId: string, message: string): Promise<any> {
        const response = await api.post(`/tickets/gate-ops/gates/${gateId}/broadcast`, { message });
        return response.data;
    }

    async resetGateCounter(gateId: string): Promise<any> {
        const response = await api.post(`/tickets/gate-ops/gates/${gateId}/reset`);
        return response.data;
    }
}

export const gateOpsService = new GateOpsService();
