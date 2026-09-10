import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { notificationCampaignService } from '../services/notification/notificationCampaignService';
import type { CreateCampaignRequest, TargetingConfig } from '../types/notification.types';

const KEYS = {
  campaigns: ['notification-campaigns'] as const,
  campaign: (id: string) => ['notification-campaign', id] as const,
  analytics: (range: string) => ['notification-analytics', range] as const,
  logs: (id: string) => ['campaign-logs', id] as const,
};

export const useCampaigns = (params?: { status?: string; page?: number; size?: number; search?: string }) =>
  useQuery({
    queryKey: [...KEYS.campaigns, params],
    queryFn: () => notificationCampaignService.getCampaigns(params),
    staleTime: 60_000,
  });

export const useCampaign = (id: string) =>
  useQuery({
    queryKey: KEYS.campaign(id),
    queryFn: () => notificationCampaignService.getCampaign(id),
    enabled: !!id,
  });

export const useNotificationAnalytics = (timeRange = '30d') =>
  useQuery({
    queryKey: KEYS.analytics(timeRange),
    queryFn: () => notificationCampaignService.getAnalytics(timeRange),
    staleTime: 2 * 60_000,
  });

export const useCampaignLogs = (id: string, params?: { status?: string; page?: number }) =>
  useQuery({
    queryKey: [...KEYS.logs(id), params],
    queryFn: () => notificationCampaignService.getCampaignLogs(id, params),
    enabled: !!id,
  });

export const useEstimateReach = () => {
  return useMutation({
    mutationFn: (targeting: TargetingConfig) => notificationCampaignService.estimateReach(targeting),
  });
};

export const useCreateCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => notificationCampaignService.createCampaign(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya başarıyla oluşturuldu', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Kampanya oluşturulamadı', { variant: 'error' }),
  });
};

export const useUpdateCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCampaignRequest> }) =>
      notificationCampaignService.updateCampaign(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya güncellendi', { variant: 'success' });
    },
  });
};

export const usePublishCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id: string) => notificationCampaignService.publishCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar(`Kampanya gönderilmeye başlandı`, { variant: 'success' });
    },
  });
};

export const useScheduleCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      notificationCampaignService.scheduleCampaign(id, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya planlandı', { variant: 'info' });
    },
  });
};

export const useCancelCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id: string) => notificationCampaignService.cancelCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya iptal edildi', { variant: 'warning' });
    },
  });
};

export const useDeleteCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id: string) => notificationCampaignService.deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya silindi', { variant: 'info' });
    },
  });
};

export const useDuplicateCampaign = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  return useMutation({
    mutationFn: (id: string) => notificationCampaignService.duplicateCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.campaigns });
      enqueueSnackbar('Kampanya kopyalandı', { variant: 'success' });
    },
  });
};
