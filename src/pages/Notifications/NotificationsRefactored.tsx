import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Chip, Grid, TextField, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Drawer,
  Stepper, Step, StepLabel, Tab, Tabs, LinearProgress, Radio, RadioGroup,
  FormControlLabel, Divider, Pagination, Paper, CircularProgress, Tooltip, Skeleton,
  Avatar, Checkbox, List, ListItem, ListItemAvatar, ListItemText, ListItemSecondaryAction,
  InputAdornment,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Campaign as CampaignIcon, Add, Search, Send, Schedule, Cancel,
  ContentCopy, Delete, Edit, MoreVert, Notifications, TrendingUp,
  Visibility, TouchApp, Close, ArrowBack, ArrowForward, CheckCircle,
  Warning, PhoneAndroid, Mail, Sms, Inbox, Person as PersonIcon,
} from '@mui/icons-material';
import { userService } from '../../services/user/userService';
import type { UserDTO } from '../../types/users/userModel';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSnackbar } from 'notistack';

import { PageContainer } from '../../components/Page';
import {
  useCampaigns, useNotificationAnalytics, useCreateCampaign, usePublishCampaign,
  useScheduleCampaign, useCancelCampaign, useDeleteCampaign, useDuplicateCampaign,
  useEstimateReach,
} from '../../hooks/useNotificationCampaigns';
import type {
  Campaign, CampaignStatus, Priority, Channel, CreateCampaignRequest,
  TargetingConfig, ContentBlock,
} from '../../types/notification.types';
import { EMPTY_TARGETING, STATUS_COLORS, PRIORITY_COLORS, CHANNEL_LABELS } from '../../types/notification.types';
import RichContentEditor, { RichContentRenderer } from '../../components/RichContentEditor';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'Hepsi', value: '' },
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'Planlandı', value: 'SCHEDULED' },
  { label: 'Gönderildi', value: 'SENT' },
  { label: 'Başarısız', value: 'FAILED' },
];

const PRIORITY_LABELS: Record<Priority, string> = { LOW: 'Düşük', NORMAL: 'Normal', HIGH: 'Yüksek', URGENT: 'Acil' };
const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Taslak', SCHEDULED: 'Planlandı', SENDING: 'Gönderiliyor', SENT: 'Gönderildi', FAILED: 'Başarısız', CANCELLED: 'İptal Edildi',
};
const WIZARD_STEPS = ['İçerik', 'Kanal', 'Hedefleme', 'Zamanlama', 'Önizleme'];

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  PUSH: <PhoneAndroid />, IN_APP: <Inbox />, EMAIL: <Mail />, SMS: <Sms />,
};
const CHANNEL_DESC: Record<Channel, string> = {
  PUSH: 'Anlık push bildirimi', IN_APP: 'Uygulama içi mesaj', EMAIL: 'E-posta kampanyası', SMS: 'Kısa mesaj',
};

const COUNTRY_OPTIONS = ['Türkiye', 'Almanya', 'Fransa', 'ABD', 'Birleşik Krallık'];
const SEGMENT_OPTIONS = ['Yeni Kullanıcılar', 'Aktif Kullanıcılar', 'Premium', 'Pasif Kullanıcılar', 'VIP'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

const fmt = (n?: number) => (n ?? 0).toLocaleString('tr-TR');
const pct = (n?: number) => `%${(n ?? 0).toFixed(1)}`;

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{
      p: 2.5, borderRadius: 3,
      background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, ${alpha(color, 0.02)} 100%)`,
      border: `1px solid ${alpha(color, 0.12)}`,
      transition: 'all .2s ease',
      '&:hover': { transform: 'translateY(-2px)', borderColor: alpha(color, 0.25), boxShadow: `0 8px 24px ${alpha(color, 0.12)}` },
    }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: alpha(color, 0.12), color, display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: .5, fontSize: 11 }}>{label}</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Campaign Card ───────────────────────────────────────────────────────────
function CampaignCard({ c, onPublish, onSchedule, onCancel, onDelete, onDuplicate }: {
  c: Campaign;
  onPublish: (c: Campaign) => void;
  onSchedule: (c: Campaign) => void;
  onCancel: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
  onDuplicate: (id: string) => void;
}) {
  const theme = useTheme();
  const sc = STATUS_COLORS[c.status];
  const isSent = c.status === 'SENT';

  const targetLabel = c.targeting?.type === 'ALL' ? 'Tüm Kullanıcılar'
    : c.targeting?.type === 'SEGMENT' ? `Segment (${(c.targeting?.userSegments?.length || 0) + (c.targeting?.countries?.length || 0)} filtre)`
    : c.targeting?.type === 'INDIVIDUAL' ? 'Bireysel'
    : 'Tüm Kullanıcılar';

  return (
    <Paper elevation={0} sx={{
      p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
      transition: 'transform .2s, box-shadow .2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[4] },
    }}>
      {/* Top row */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: .5 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>{c.name}</Typography>
            <Chip label={STATUS_LABELS[c.status] || c.status} size="small" sx={{ bgcolor: sc.bg, color: sc.text, fontWeight: 700, fontSize: 11 }} />
            <Chip label={PRIORITY_LABELS[c.priority]} size="small" sx={{ bgcolor: alpha(PRIORITY_COLORS[c.priority], .1), color: PRIORITY_COLORS[c.priority], fontWeight: 700, fontSize: 11 }} />
          </Stack>
          <Stack direction="row" spacing={.5} sx={{ mb: 1 }}>
            {c.channels.map(ch => (
              <Chip key={ch} label={CHANNEL_LABELS[ch]} size="small" variant="outlined" sx={{ fontSize: 10, height: 22 }} />
            ))}
          </Stack>
        </Box>
        {/* Actions */}
        <Stack direction="row" spacing={.5}>
          {c.status === 'DRAFT' && (
            <>
              <Tooltip title="Yayınla"><IconButton size="small" color="success" onClick={() => onPublish(c)}><Send fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Planla"><IconButton size="small" color="info" onClick={() => onSchedule(c)}><Schedule fontSize="small" /></IconButton></Tooltip>
            </>
          )}
          {c.status === 'SCHEDULED' && (
            <Tooltip title="İptal Et"><IconButton size="small" color="warning" onClick={() => onCancel(c)}><Cancel fontSize="small" /></IconButton></Tooltip>
          )}
          <Tooltip title="Kopyala"><IconButton size="small" onClick={() => onDuplicate(c.id)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
          {(c.status === 'DRAFT' || c.status === 'CANCELLED') && (
            <Tooltip title="Sil"><IconButton size="small" color="error" onClick={() => onDelete(c)}><Delete fontSize="small" /></IconButton></Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Meta */}
      <Stack direction="row" spacing={2} sx={{ mb: isSent ? 2 : 0 }}>
        <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</Typography>
        <Typography variant="caption" color="text.secondary">{targetLabel}</Typography>
        {c.estimatedReach > 0 && <Typography variant="caption" color="text.secondary">~{fmt(c.estimatedReach)} kul.</Typography>}
        <Typography variant="caption" color="text.secondary">{c.createdBy}</Typography>
      </Stack>

      {/* Stats for SENT */}
      {isSent && c.stats && (
        <Grid container spacing={2}>
          {([
            { label: 'Teslim', value: c.stats?.deliveryRate || 0, color: '#10b981' },
            { label: 'Açılma', value: c.stats?.openRate || 0, color: '#3b82f6' },
            { label: 'Tıklama', value: c.stats?.ctr || 0, color: '#f59e0b' },
            { label: 'Çıkış', value: (c.stats?.optOut || 0) / Math.max(c.stats?.delivered || 1, 1) * 100, color: '#ef4444' },
          ] as const).map(s => (
            <Grid item xs={3} key={s.label}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
              <LinearProgress variant="determinate" value={Math.min(s.value, 100)} sx={{
                height: 6, borderRadius: 3, mt: .5, bgcolor: alpha(s.color, .12),
                '& .MuiLinearProgress-bar': { bgcolor: s.color, borderRadius: 3 },
              }} />
              <Typography variant="caption" fontWeight={700}>{pct(s.value)}</Typography>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NotificationsRefactored() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [mainTab, setMainTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [analyticsRange, setAnalyticsRange] = useState('30d');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'publish' | 'delete' | 'cancel'; campaign: Campaign } | null>(null);

  // Wizard form
  const [form, setForm] = useState<CreateCampaignRequest>({
    name: '', title: '', body: '', richContent: [], imageUrl: '', deepLink: '',
    priority: 'NORMAL', channels: ['PUSH'],
    targeting: { ...EMPTY_TARGETING },
  });
  const [scheduleType, setScheduleType] = useState<'now' | 'date' | 'recurring'>('now');
  const [scheduledDate, setScheduledDate] = useState('');

  // User picker for INDIVIDUAL targeting
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userPickerSearch, setUserPickerSearch] = useState('');
  const [userPickerResults, setUserPickerResults] = useState<UserDTO[]>([]);
  const [userPickerLoading, setUserPickerLoading] = useState(false);

  // Queries
  const { data: campaignsData, isLoading } = useCampaigns({ status: statusFilter || undefined, page: page - 1, size: 10, search: searchTerm || undefined });
  const { data: analytics } = useNotificationAnalytics(analyticsRange);

  // Mutations
  const createMut = useCreateCampaign();
  const publishMut = usePublishCampaign();
  const scheduleMut = useScheduleCampaign();
  const cancelMut = useCancelCampaign();
  const deleteMut = useDeleteCampaign();
  const duplicateMut = useDuplicateCampaign();
  const estimateMut = useEstimateReach();

  const campaigns = campaignsData?.content ?? [];
  const totalPages = campaignsData?.totalPages ?? 0;

  // Debounced reach estimate
  useEffect(() => {
    if (!drawerOpen || wizardStep !== 2) return;
    const t = setTimeout(() => { estimateMut.mutate(form.targeting); }, 600);
    return () => clearTimeout(t);
  }, [form.targeting, drawerOpen, wizardStep]);

  const estimatedReach = estimateMut.data ?? 0;

  // User picker search
  useEffect(() => {
    if (!userPickerOpen) return;
    const t = setTimeout(async () => {
      setUserPickerLoading(true);
      try {
        const res = await userService.getAllUsers({ keyword: userPickerSearch || undefined, page: 0, size: 30 });
        setUserPickerResults(res?.content ?? []);
      } catch {
        setUserPickerResults([]);
      } finally {
        setUserPickerLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [userPickerSearch, userPickerOpen]);

  const toggleUserSelection = (user: UserDTO) => {
    const ids = form.targeting.specificUserIds;
    const next = ids.includes(user.id)
      ? ids.filter(id => id !== user.id)
      : [...ids, user.id];
    setForm(p => ({ ...p, targeting: { ...p.targeting, specificUserIds: next } }));
  };

  const resetWizard = useCallback(() => {
    setWizardStep(0);
    setForm({ name: '', title: '', body: '', richContent: [], imageUrl: '', deepLink: '', priority: 'NORMAL', channels: ['PUSH'], targeting: { ...EMPTY_TARGETING } });
    setScheduleType('now');
    setScheduledDate('');
  }, []);

  const openWizard = useCallback(() => { resetWizard(); setDrawerOpen(true); }, [resetWizard]);

  const handleSaveDraft = useCallback(async () => {
    await createMut.mutateAsync(form);
    setDrawerOpen(false);
  }, [form, createMut]);

  const handlePublishNew = useCallback(async () => {
    const created = await createMut.mutateAsync(form);
    if (created?.id) await publishMut.mutateAsync(created.id);
    setDrawerOpen(false);
  }, [form, createMut, publishMut]);

  const handleScheduleNew = useCallback(async () => {
    if (!scheduledDate) { enqueueSnackbar('Lütfen bir tarih seçin', { variant: 'warning' }); return; }
    const created = await createMut.mutateAsync(form);
    if (created?.id) await scheduleMut.mutateAsync({ id: created.id, scheduledAt: new Date(scheduledDate).toISOString() });
    setDrawerOpen(false);
  }, [form, scheduledDate, createMut, scheduleMut, enqueueSnackbar]);

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog) return;
    const { type, campaign } = confirmDialog;
    if (type === 'publish') await publishMut.mutateAsync(campaign.id);
    if (type === 'delete') await deleteMut.mutateAsync(campaign.id);
    if (type === 'cancel') await cancelMut.mutateAsync(campaign.id);
    setConfirmDialog(null);
  }, [confirmDialog, publishMut, deleteMut, cancelMut]);

  const toggleChannel = (ch: Channel) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter(c => c !== ch) : [...prev.channels, ch],
    }));
  };

  const toggleChip = (field: 'countries' | 'userSegments', val: string) => {
    setForm(prev => {
      const arr = prev.targeting[field];
      return { ...prev, targeting: { ...prev.targeting, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] } };
    });
  };

  // Wizard content validation
  const canNext = useMemo(() => {
    if (wizardStep === 0) return form.name.trim().length > 0 && form.title.trim().length > 0 && form.body.trim().length > 0;
    if (wizardStep === 1) return form.channels.length > 0;
    return true;
  }, [wizardStep, form]);

  const confirmMessages: Record<string, { title: string; body: string }> = {
    publish: { title: 'Kampanyayı Yayınla', body: `Bu kampanyayı ~${fmt(confirmDialog?.campaign.estimatedReach)} kullanıcıya göndermek istediğinize emin misiniz?` },
    delete: { title: 'Kampanyayı Sil', body: 'Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.' },
    cancel: { title: 'Kampanyayı İptal Et', body: 'Planlanmış kampanyayı iptal etmek istediğinize emin misiniz?' },
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {/* Page Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -1,
          }}>
            Bildirim Merkezi
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: .5 }}>
            Kampanyalarınızı oluşturun, yönetin ve analiz edin.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openWizard} sx={{ borderRadius: 3, px: 3, py: 1.2, textTransform: 'none', fontWeight: 700, boxShadow: theme.shadows[4] }}>
          Yeni Kampanya
        </Button>
      </Stack>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Toplam Gönderim" value={fmt(analytics?.totalSent)} color={theme.palette.primary.main} icon={<Send />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Teslim Oranı" value={pct(analytics?.avgDeliveryRate)} color="#10b981" icon={<CheckCircle />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Açılma Oranı" value={pct(analytics?.avgOpenRate)} color="#3b82f6" icon={<Visibility />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Planlanmış" value={String(campaigns.filter(c => c.status === 'SCHEDULED').length)} color="#8b5cf6" icon={<Schedule />} />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{
        borderBottom: 1, borderColor: 'divider', mb: 0,
        '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '1rem' },
      }}>
        <Tab icon={<CampaignIcon />} iconPosition="start" label="Kampanyalar" />
        <Tab icon={<TrendingUp />} iconPosition="start" label="Analitik" />
      </Tabs>

      {/* ─── KAMPANYALAR TAB ──────────────────────────────────────────────── */}
      <TabPanel value={mainTab} index={0}>
        {/* Search + filter chips */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Paper elevation={0} sx={{
            flex: 1, display: 'flex', alignItems: 'center', px: 2, py: .5,
            borderRadius: 3, border: '1px solid', borderColor: 'divider',
          }}>
            <Search sx={{ color: 'text.disabled', mr: 1 }} />
            <TextField fullWidth variant="standard" placeholder="Kampanya ara..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              InputProps={{ disableUnderline: true }} sx={{ py: .5 }} />
          </Paper>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {STATUS_TABS.map(st => (
            <Chip key={st.value || 'all'} label={st.label} variant={statusFilter === st.value ? 'filled' : 'outlined'}
              color={statusFilter === st.value ? 'primary' : 'default'}
              onClick={() => { setStatusFilter(st.value); setPage(1); }}
              sx={{ fontWeight: 600, borderRadius: 2 }} />
          ))}
        </Stack>

        {/* Campaign list */}
        {isLoading ? (
          <Stack spacing={2}>
            {[0, 1, 2].map(i => (
              <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
            ))}
          </Stack>
        ) : campaigns.length === 0 ? (
          <Paper elevation={0} sx={{ p: 8, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Notifications sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="text.secondary">Henüz kampanya yok</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>Yeni bir kampanya oluşturarak başlayın.</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={openWizard} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}>
              İlk Kampanyayı Oluştur
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {campaigns.map(c => (
              <CampaignCard key={c.id} c={c}
                onPublish={camp => setConfirmDialog({ type: 'publish', campaign: camp })}
                onSchedule={camp => setConfirmDialog({ type: 'publish', campaign: camp })}
                onCancel={camp => setConfirmDialog({ type: 'cancel', campaign: camp })}
                onDelete={camp => setConfirmDialog({ type: 'delete', campaign: camp })}
                onDuplicate={id => duplicateMut.mutate(id)} />
            ))}
          </Stack>
        )}

        {totalPages > 1 && (
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} shape="rounded" color="primary" />
          </Stack>
        )}
      </TabPanel>

      {/* ─── ANALITIK TAB ─────────────────────────────────────────────────── */}
      <TabPanel value={mainTab} index={1}>
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          {[{ l: '7g', v: '7d' }, { l: '30g', v: '30d' }, { l: '90g', v: '90d' }].map(r => (
            <Chip key={r.v} label={r.l} variant={analyticsRange === r.v ? 'filled' : 'outlined'}
              color={analyticsRange === r.v ? 'primary' : 'default'}
              onClick={() => setAnalyticsRange(r.v)} sx={{ fontWeight: 600 }} />
          ))}
        </Stack>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Gönderim Trendi</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics?.dailyStats ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, .08)} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ReTooltip />
              <Area type="monotone" dataKey="sent" name="Gönderildi" stroke={theme.palette.primary.main} fill={alpha(theme.palette.primary.main, .15)} strokeWidth={2} />
              <Area type="monotone" dataKey="opened" name="Açıldı" stroke="#3b82f6" fill={alpha('#3b82f6', .1)} strokeWidth={2} />
              <Area type="monotone" dataKey="clicked" name="Tıklandı" stroke="#f59e0b" fill={alpha('#f59e0b', .08)} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>

        {/* Top 5 campaigns */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>En İyi 5 Kampanya</Typography>
          <Stack spacing={0}>
            <Stack direction="row" sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>Kampanya</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ width: 100, textAlign: 'right' }}>Gönderim</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ width: 80, textAlign: 'right' }}>CTR</Typography>
            </Stack>
            {(analytics?.topCampaigns ?? []).slice(0, 5).map((tc, i) => (
              <Stack key={tc.id} direction="row" alignItems="center" sx={{ py: 1.5, borderBottom: 1, borderColor: alpha(theme.palette.divider, .5) }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }} noWrap>{i + 1}. {tc.name}</Typography>
                <Typography variant="body2" sx={{ width: 100, textAlign: 'right' }}>{fmt(tc.sent)}</Typography>
                <Typography variant="body2" fontWeight={700} color="primary" sx={{ width: 80, textAlign: 'right' }}>{pct(tc.ctr)}</Typography>
              </Stack>
            ))}
            {(analytics?.topCampaigns ?? []).length === 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ py: 3, textAlign: 'center' }}>Henüz veri yok</Typography>
            )}
          </Stack>
        </Paper>
      </TabPanel>

      {/* ─── WIZARD DRAWER ────────────────────────────────────────────────── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 0 } }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={800}>Yeni Kampanya</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}><Close /></IconButton>
        </Stack>

        {/* Stepper */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stepper activeStep={wizardStep} alternativeLabel>
            {WIZARD_STEPS.map(label => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </Box>

        {/* Step Content */}
        <Box sx={{ px: 3, py: 2, flex: 1, overflow: 'auto' }}>
          {/* Step 0: Content — Blog-style editor */}
          {wizardStep === 0 && (
            <Stack spacing={3}>
              {/* Campaign name — admin only */}
              <TextField label="Kampanya Adı" fullWidth value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                helperText="Sadece admin panelde görünür, kullanıcılara gösterilmez" />

              <Divider />

              {/* Push notification fields */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Push Bildirim İçeriği
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <TextField label="Bildirim Başlığı" fullWidth value={form.title}
                      onChange={e => { if (e.target.value.length <= 65) setForm(p => ({ ...p, title: e.target.value })); }}
                      inputProps={{ maxLength: 65 }}
                      placeholder="Kullanıcının göreceği başlık..." />
                    <Typography variant="caption" color={form.title.length > 55 ? 'warning.main' : 'text.disabled'}
                      sx={{ mt: .5, display: 'block', textAlign: 'right' }}>
                      {form.title.length}/65
                    </Typography>
                  </Box>
                  <Box>
                    <TextField label="Kısa Açıklama" fullWidth multiline rows={2} value={form.body}
                      onChange={e => { if (e.target.value.length <= 200) setForm(p => ({ ...p, body: e.target.value })); }}
                      inputProps={{ maxLength: 200 }}
                      placeholder="Push bildiriminde görünecek kısa metin..." />
                    <Typography variant="caption" color={form.body.length > 180 ? 'warning.main' : 'text.disabled'}
                      sx={{ mt: .5, display: 'block', textAlign: 'right' }}>
                      {form.body.length}/200
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Rich content — blog-style editor */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Detaylı İçerik (Blog Görünümü)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uygulama içi bildirimde ve e-postada görünecek zengin içerik. Metin, görsel, alıntı ve bilgi kutuları ekleyebilirsiniz.
                    </Typography>
                  </Box>
                </Stack>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, minHeight: 200 }}>
                  <RichContentEditor
                    blocks={form.richContent || []}
                    onChange={(blocks) => setForm(p => ({ ...p, richContent: blocks }))}
                  />
                </Paper>
              </Box>

              <Divider />

              {/* Deep link */}
              <TextField label="Deep Link (opsiyonel)" fullWidth value={form.deepLink ?? ''}
                onChange={e => setForm(p => ({ ...p, deepLink: e.target.value }))}
                placeholder="nartgo://events/123 veya https://nartgo.net/..."
                helperText="Bildirime tıklanınca açılacak sayfa" />
            </Stack>
          )}

          {/* Step 1: Channel */}
          {wizardStep === 1 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" fontWeight={700}>Kanallar</Typography>
              <Grid container spacing={2}>
                {(['PUSH', 'IN_APP', 'EMAIL', 'SMS'] as Channel[]).map(ch => {
                  const selected = form.channels.includes(ch);
                  return (
                    <Grid item xs={6} key={ch}>
                      <Paper elevation={0} onClick={() => toggleChannel(ch)} sx={{
                        p: 2.5, borderRadius: 3, cursor: 'pointer', textAlign: 'center',
                        border: '2px solid', borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? alpha(theme.palette.primary.main, .04) : 'transparent',
                        transition: 'all .2s', '&:hover': { borderColor: 'primary.light' },
                      }}>
                        <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', mb: 1 }}>{CHANNEL_ICONS[ch]}</Box>
                        <Typography variant="subtitle2" fontWeight={700}>{CHANNEL_LABELS[ch]}</Typography>
                        <Typography variant="caption" color="text.secondary">{CHANNEL_DESC[ch]}</Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>Öncelik</Typography>
              <Stack direction="row" spacing={1}>
                {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as Priority[]).map(p => (
                  <Chip key={p} label={PRIORITY_LABELS[p]} variant={form.priority === p ? 'filled' : 'outlined'}
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    sx={{
                      fontWeight: 600,
                      ...(form.priority === p ? { bgcolor: alpha(PRIORITY_COLORS[p], .15), color: PRIORITY_COLORS[p] } : {}),
                    }} />
                ))}
              </Stack>
            </Stack>
          )}

          {/* Step 2: Targeting */}
          {wizardStep === 2 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" fontWeight={700}>Hedef Kitle</Typography>
              <RadioGroup value={form.targeting.type} onChange={e => setForm(p => ({ ...p, targeting: { ...p.targeting, type: e.target.value as any } }))}>
                <FormControlLabel value="ALL" control={<Radio />} label="Tüm Kullanıcılar" />
                <FormControlLabel value="SEGMENT" control={<Radio />} label="Segmente Göre" />
                <FormControlLabel value="INDIVIDUAL" control={<Radio />} label="Bireysel (Kullanıcı ID)" />
              </RadioGroup>

              {form.targeting.type === 'SEGMENT' && (
                <>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block' }}>Ülke</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {COUNTRY_OPTIONS.map(c => (
                        <Chip key={c} label={c} size="small"
                          variant={form.targeting.countries.includes(c) ? 'filled' : 'outlined'}
                          color={form.targeting.countries.includes(c) ? 'primary' : 'default'}
                          onClick={() => toggleChip('countries', c)} sx={{ fontWeight: 600 }} />
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={700} sx={{ mb: 1, display: 'block' }}>Segment</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {SEGMENT_OPTIONS.map(s => (
                        <Chip key={s} label={s} size="small"
                          variant={form.targeting.userSegments.includes(s) ? 'filled' : 'outlined'}
                          color={form.targeting.userSegments.includes(s) ? 'primary' : 'default'}
                          onClick={() => toggleChip('userSegments', s)} sx={{ fontWeight: 600 }} />
                      ))}
                    </Stack>
                  </Box>
                </>
              )}

              {form.targeting.type === 'INDIVIDUAL' && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption" fontWeight={700}>
                      Seçilen Kullanıcılar ({form.targeting.specificUserIds.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => { setUserPickerSearch(''); setUserPickerOpen(true); }}
                      sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12 }}>
                      Kullanıcı Seç
                    </Button>
                  </Stack>
                  {form.targeting.specificUserIds.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Henüz kullanıcı seçilmedi.</Typography>
                  ) : (
                    <Stack direction="row" flexWrap="wrap" spacing={0.5} useFlexGap>
                      {form.targeting.specificUserIds.map(uid => {
                        const u = userPickerResults.find(r => r.id === uid);
                        return (
                          <Chip key={uid} size="small" label={u ? (u.displayName || u.email) : uid}
                            onDelete={() => setForm(p => ({ ...p, targeting: { ...p.targeting, specificUserIds: p.targeting.specificUserIds.filter(i => i !== uid) } }))}
                            sx={{ fontWeight: 600 }} />
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              )}

              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, .06), border: '1px solid', borderColor: alpha(theme.palette.info.main, .15) }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">Tahmini Erişim</Typography>
                {estimateMut.isPending ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: .5 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">Hesaplanıyor...</Typography>
                  </Stack>
                ) : (
                  <Typography variant="h5" fontWeight={800} color="info.main">{fmt(estimatedReach)} kullanıcı</Typography>
                )}
              </Paper>
            </Stack>
          )}

          {/* Step 3: Schedule */}
          {wizardStep === 3 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" fontWeight={700}>Gönderim Zamanı</Typography>
              <RadioGroup value={scheduleType} onChange={e => setScheduleType(e.target.value as any)}>
                <FormControlLabel value="now" control={<Radio />} label="Hemen Gönder" />
                <FormControlLabel value="date" control={<Radio />} label="Tarih Seç" />
                <FormControlLabel value="recurring" control={<Radio />} label="Tekrarlayan (yakında)" disabled />
              </RadioGroup>
              {scheduleType === 'date' && (
                <TextField type="datetime-local" fullWidth label="Tarih ve Saat" value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              )}
            </Stack>
          )}

          {/* Step 4: Preview */}
          {wizardStep === 4 && (
            <Stack spacing={3}>
              <Typography variant="subtitle2" fontWeight={700}>Önizleme</Typography>

              {/* Summary */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1.5}>
                  <Box><Typography variant="caption" color="text.secondary">Kampanya</Typography><Typography fontWeight={700}>{form.name}</Typography></Box>
                  <Divider />
                  <Box><Typography variant="caption" color="text.secondary">Başlık</Typography><Typography fontWeight={600}>{form.title}</Typography></Box>
                  <Box><Typography variant="caption" color="text.secondary">Mesaj</Typography><Typography variant="body2">{form.body}</Typography></Box>
                  <Divider />
                  <Stack direction="row" spacing={1}>{form.channels.map(ch => <Chip key={ch} label={CHANNEL_LABELS[ch]} size="small" />)}</Stack>
                  <Typography variant="body2">Öncelik: <strong>{PRIORITY_LABELS[form.priority]}</strong></Typography>
                  <Typography variant="body2">Hedef: <strong>{form.targeting.type === 'ALL' ? 'Tüm Kullanıcılar' : form.targeting.type === 'SEGMENT' ? 'Segment' : 'Bireysel'}</strong></Typography>
                  <Typography variant="body2">Tahmini Erişim: <strong>{fmt(estimatedReach)}</strong></Typography>
                  <Typography variant="body2">Zamanlama: <strong>{scheduleType === 'now' ? 'Hemen' : scheduleType === 'date' ? scheduledDate : 'Tekrarlayan'}</strong></Typography>
                </Stack>
              </Paper>

              {/* Checklist */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, .04) }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Kontrol Listesi</Typography>
                {[
                  { ok: form.title.length > 0, t: 'Başlık girildi' },
                  { ok: form.body.length > 0, t: 'Mesaj içeriği girildi' },
                  { ok: form.channels.length > 0, t: 'En az bir kanal seçildi' },
                  { ok: estimatedReach > 0, t: 'Hedef kitle belirli' },
                ].map(item => (
                  <Stack key={item.t} direction="row" spacing={1} alignItems="center" sx={{ py: .5 }}>
                    {item.ok ? <CheckCircle fontSize="small" color="success" /> : <Warning fontSize="small" color="warning" />}
                    <Typography variant="body2" color={item.ok ? 'text.primary' : 'warning.main'}>{item.t}</Typography>
                  </Stack>
                ))}
              </Paper>

              {/* Mobile Preview */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Mobil Önizleme</Typography>

                {/* Push notification preview */}
                <Box sx={{ mx: 'auto', width: 280, borderRadius: 3, border: '2px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: '#1a1a1a', mb: 2 }}>
                  <Box sx={{ px: 2, py: 1, bgcolor: alpha('#fff', .08) }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneAndroid sx={{ fontSize: 14, color: '#888' }} />
                      <Typography variant="caption" sx={{ color: '#888', fontSize: 10, fontWeight: 600 }}>PUSH BİLDİRİM</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, .3), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: .25 }}>
                        <Typography sx={{ color: '#4ade80', fontSize: 12, fontWeight: 900 }}>N</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{form.title || 'Bildirim başlığı'}</Typography>
                        <Typography sx={{ color: '#999', fontSize: 12, mt: .3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{form.body || 'Bildirim içeriği burada görünecek...'}</Typography>
                        <Typography sx={{ color: '#555', fontSize: 10, mt: .5 }}>şimdi · NartGo</Typography>
                      </Box>
                      {form.imageUrl && <Box component="img" src={form.imageUrl} sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }} />}
                    </Stack>
                  </Box>
                </Box>

                {/* Rich content preview (blog view) */}
                {(form.richContent?.length ?? 0) > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                      UYGULAMA İÇİ GÖRÜNÜM
                    </Typography>
                    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, maxHeight: 300, overflow: 'auto' }}>
                      <RichContentRenderer blocks={form.richContent || []} mobile />
                    </Paper>
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </Box>

        {/* Drawer Footer */}
        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          {wizardStep < 4 ? (
            <Stack direction="row" justifyContent="space-between">
              <Button disabled={wizardStep === 0} startIcon={<ArrowBack />} onClick={() => setWizardStep(s => s - 1)}
                sx={{ textTransform: 'none', fontWeight: 600 }}>Geri</Button>
              <Button variant="contained" endIcon={<ArrowForward />} disabled={!canNext}
                onClick={() => setWizardStep(s => s + 1)} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                İleri
              </Button>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleSaveDraft} disabled={createMut.isPending}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                Taslak Kaydet
              </Button>
              {scheduleType === 'date' ? (
                <Button variant="contained" color="info" startIcon={<Schedule />} onClick={handleScheduleNew}
                  disabled={createMut.isPending || scheduleMut.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                  Planla
                </Button>
              ) : (
                <Button variant="contained" color="success" startIcon={<Send />} onClick={handlePublishNew}
                  disabled={createMut.isPending || publishMut.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                  Yayınla
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* ─── CONFIRM DIALOGS ──────────────────────────────────────────────── */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        {confirmDialog && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>{confirmMessages[confirmDialog.type].title}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary">
                {confirmMessages[confirmDialog.type].body}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setConfirmDialog(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>Vazgeç</Button>
              <Button variant="contained"
                color={confirmDialog.type === 'delete' ? 'error' : confirmDialog.type === 'cancel' ? 'warning' : 'success'}
                onClick={handleConfirm}
                disabled={publishMut.isPending || deleteMut.isPending || cancelMut.isPending}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                {confirmDialog.type === 'publish' ? 'Yayınla' : confirmDialog.type === 'delete' ? 'Sil' : 'İptal Et'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── User Picker Dialog ────────────────────────────────────── */}
      <Dialog open={userPickerOpen} onClose={() => setUserPickerOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Kullanıcı Seç
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {form.targeting.specificUserIds.length} kullanıcı seçildi
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ px: 2, pb: 1, pt: 0.5 }}>
            <TextField
              fullWidth size="small"
              placeholder="İsim veya e-posta ile ara..."
              value={userPickerSearch}
              onChange={e => setUserPickerSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {userPickerLoading ? <CircularProgress size={16} /> : <Search sx={{ fontSize: 18 }} />}
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
          <Divider />
          <List dense sx={{ maxHeight: 380, overflow: 'auto', py: 0 }}>
            {userPickerResults.length === 0 && !userPickerLoading && (
              <ListItem>
                <ListItemText primary={<Typography variant="body2" color="text.secondary">Kullanıcı bulunamadı</Typography>} />
              </ListItem>
            )}
            {userPickerResults.map(user => {
              const selected = form.targeting.specificUserIds.includes(user.id);
              const name = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
              return (
                <ListItem key={user.id} onClick={() => toggleUserSelection(user)}
                  sx={{ cursor: 'pointer', bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'transparent', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                  <ListItemAvatar>
                    <Avatar src={user.imageUrl} sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                      {user.firstName ? user.firstName[0] : <PersonIcon sx={{ fontSize: 18 }} />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={600}>{name}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{user.email}</Typography>}
                  />
                  <ListItemSecondaryAction>
                    <Checkbox checked={selected} color="primary" size="small" onChange={() => toggleUserSelection(user)} />
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setForm(p => ({ ...p, targeting: { ...p.targeting, specificUserIds: [] } }))}
            sx={{ textTransform: 'none', fontWeight: 600 }} color="error">
            Temizle
          </Button>
          <Button onClick={() => setUserPickerOpen(false)} variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Tamam ({form.targeting.specificUserIds.length} seçili)
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
