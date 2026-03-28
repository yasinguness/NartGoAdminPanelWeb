import { api } from '../api';
import type { SettlementBatch, SettlementKpi, LedgerEntry } from '../../pages/SettlementFinance/SettlementFinance';

class SettlementService {
    async getSettlements(params?: any): Promise<SettlementBatch[]> {
        const response = await api.get<SettlementBatch[]>('/finance/settlements', { params });
        return response.data;
    }

    async getSettlementById(batchId: string): Promise<SettlementBatch> {
        const response = await api.get<SettlementBatch>(`/finance/settlements/${batchId}`);
        return response.data;
    }

    async getLedger(batchId: string): Promise<LedgerEntry[]> {
        const response = await api.get<LedgerEntry[]>(`/finance/settlements/${batchId}/ledger`);
        return response.data;
    }

    async getRefunds(batchId: string): Promise<any> {
        const response = await api.get(`/finance/settlements/${batchId}/refunds`);
        return response.data;
    }

    async getPayoutDetails(batchId: string): Promise<any> {
        const response = await api.get(`/finance/settlements/${batchId}/payout`);
        return response.data;
    }

    async approve(batchId: string): Promise<SettlementBatch> {
        const response = await api.post<SettlementBatch>(`/finance/settlements/${batchId}/approve`);
        return response.data;
    }

    async hold(batchId: string, reason: string): Promise<SettlementBatch> {
        const response = await api.post<SettlementBatch>(`/finance/settlements/${batchId}/hold`, { reason });
        return response.data;
    }

    async retryPayout(batchId: string): Promise<any> {
        const response = await api.post(`/finance/settlements/${batchId}/retry-payout`);
        return response.data;
    }

    async addAdjustment(batchId: string, payload: any): Promise<any> {
        const response = await api.post(`/finance/settlements/${batchId}/adjustments`, payload);
        return response.data;
    }

    async getKpis(): Promise<SettlementKpi> {
        const response = await api.get<SettlementKpi>('/finance/kpis');
        return response.data;
    }

    async exportSettlements(params?: any): Promise<Blob> {
        const response = await api.get('/finance/settlements/export', { 
            params,
            responseType: 'blob' 
        });
        return response.data;
    }
}

export const settlementService = new SettlementService();
