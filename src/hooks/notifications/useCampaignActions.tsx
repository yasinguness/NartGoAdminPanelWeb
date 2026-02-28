import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { RateLimitConfig } from '../../types/notifications/rateLimit';
import { useCampaignStore } from '../../store/notifications/campaignStore';
import { NotificationChannel } from '../../types/notifications/campaign';
import { NotificationPriority } from '../../types/notifications/notificationModel';
import { CampaignContent, CampaignType } from '../../types/notifications/campaign';
import { ScheduleConfig } from '../../types/notifications/scheduling';
import { SegmentFilter } from '../../types/notifications/audience';

interface CampaignCreateData {
    name: string;
    type: CampaignType;
    channels: NotificationChannel[];
    content: CampaignContent;
    filters?: SegmentFilter[];
    schedule?: ScheduleConfig;
    priority: NotificationPriority;
    tags?: string[];
}

export const useCampaignActions = () => {
    const { enqueueSnackbar } = useSnackbar();
    const queryClient = useQueryClient();
    const store = useCampaignStore();

    const createCampaign = useMutation({
        mutationFn: (data: CampaignCreateData) => store.createCampaign(data),
        onSuccess: () => {
            enqueueSnackbar('Kampanya başarıyla oluşturuldu', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Hata: ${error.message}`, { variant: 'error' });
        },
    });

    const updateCampaign = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CampaignCreateData> }) =>
            store.updateCampaign(id, data),
        onSuccess: () => {
            enqueueSnackbar('Kampanya güncellendi', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Hata: ${error.message}`, { variant: 'error' });
        },
    });

    const sendCampaign = useMutation({
        mutationFn: (id: string) => store.sendCampaign(id),
        onSuccess: () => {
            enqueueSnackbar('Kampanya gönderildi! 🚀', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Gönderim hatası: ${error.message}`, { variant: 'error' });
        },
    });

    const deleteCampaign = useMutation({
        mutationFn: (id: string) => store.deleteCampaign(id),
        onSuccess: () => {
            enqueueSnackbar('Kampanya silindi', { variant: 'success' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Hata: ${error.message}`, { variant: 'error' });
        },
    });

    const cancelCampaign = useMutation({
        mutationFn: (id: string) => store.cancelCampaign(id),
        onSuccess: () => {
            enqueueSnackbar('Kampanya iptal edildi', { variant: 'info' });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Hata: ${error.message}`, { variant: 'error' });
        },
    });

    const saveRateLimitConfig = useMutation({
        mutationFn: (config: RateLimitConfig) => store.saveRateLimitConfig(config),
        onSuccess: () => {
            enqueueSnackbar('Limit ayarları kaydedildi', { variant: 'success' });
        },
        onError: (error: Error) => {
            enqueueSnackbar(`Hata: ${error.message}`, { variant: 'error' });
        },
    });

    return {
        createCampaign,
        updateCampaign,
        sendCampaign,
        deleteCampaign,
        cancelCampaign,
        saveRateLimitConfig,
    };
};
