import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, IconButton, Button, Menu, MenuItem, ListItemIcon, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, Stack,
    alpha, LinearProgress, Card, CardContent, Grid, InputAdornment,
    Divider, Pagination,
} from '@mui/material';
import {
    Add as AddIcon, MoreVert as MoreVertIcon, Send as SendIcon,
    Delete as DeleteIcon, Edit as EditIcon, Cancel as CancelIcon,
    Campaign as CampaignIcon,
    Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon,
    Error as ErrorIcon, Drafts as DraftsIcon,
    TrendingUp as TrendingUpIcon, Search as SearchIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
    Campaign, CampaignType, CampaignStatus, CampaignContent,
    NotificationChannel,
} from '../../../types/notifications/campaign';
import { NotificationPriority } from '../../../types/notifications/notificationModel';
import { SegmentFilter } from '../../../types/notifications/audience';
import { ScheduleConfig, ScheduleType } from '../../../types/notifications/scheduling';
import { useCampaigns } from '../../../hooks/notifications/useCampaignQueries';
import { useCampaignActions } from '../../../hooks/notifications/useCampaignActions';
import ContentEditor from './ContentEditor';
import AudienceBuilder from './AudienceBuilder';
import SchedulingPanel from './SchedulingPanel';

// ─── Constants ─────────────────────────────────────────────
const STATUS_CONFIG: Record<CampaignStatus, { color: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'; icon: React.ReactElement; label: string }> = {
    [CampaignStatus.DRAFT]: { color: 'default', icon: <DraftsIcon fontSize="small" />, label: 'Taslak' },
    [CampaignStatus.SCHEDULED]: { color: 'info', icon: <ScheduleIcon fontSize="small" />, label: 'Zamanlandı' },
    [CampaignStatus.SENDING]: { color: 'warning', icon: <SendIcon fontSize="small" />, label: 'Gönderiliyor' },
    [CampaignStatus.SENT]: { color: 'success', icon: <CheckCircleIcon fontSize="small" />, label: 'Gönderildi' },
    [CampaignStatus.FAILED]: { color: 'error', icon: <ErrorIcon fontSize="small" />, label: 'Başarısız' },
    [CampaignStatus.CANCELLED]: { color: 'default', icon: <CancelIcon fontSize="small" />, label: 'İptal' },
};

const CHANNEL_LABELS: Record<NotificationChannel, { label: string; color: string }> = {
    [NotificationChannel.PUSH]: { label: 'Push', color: '#6366f1' },
    [NotificationChannel.IN_APP]: { label: 'In-App', color: '#8b5cf6' },
    [NotificationChannel.EMAIL]: { label: 'Email', color: '#06b6d4' },
    [NotificationChannel.SMS]: { label: 'SMS', color: '#f59e0b' },
};

// ─── Campaign Dialog ───────────────────────────────────────
interface CampaignDialogProps { open: boolean; onClose: () => void; campaign?: Campaign | null; }

function CampaignDialog({ open, onClose, campaign }: CampaignDialogProps) {
    const { createCampaign, updateCampaign, sendCampaign } = useCampaignActions();
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [channels, setChannels] = useState<NotificationChannel[]>([NotificationChannel.PUSH]);
    const [priority, setPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);
    const [content, setContent] = useState<CampaignContent>({ title: '', body: '' });
    const [filters, setFilters] = useState<SegmentFilter[]>([]);
    const [schedule, setSchedule] = useState<ScheduleConfig>({ type: ScheduleType.IMMEDIATE });
    const [estimatedReach, setEstimatedReach] = useState(0);

    useEffect(() => {
        if (campaign) {
            setName(campaign.name);
            setChannels(campaign.channels);
            setPriority(campaign.priority);
            setContent(campaign.content);
            setFilters(campaign.audience?.filters || []);
            setSchedule(campaign.schedule || { type: ScheduleType.IMMEDIATE });
        } else {
            setName(''); setChannels([NotificationChannel.PUSH]); setPriority(NotificationPriority.NORMAL);
            setContent({ title: '', body: '' }); setFilters([]); setSchedule({ type: ScheduleType.IMMEDIATE });
        }
        setStep(0);
    }, [campaign, open]);

    const handleSave = async (andSend = false) => {
        const data = { name, type: CampaignType.CAMPAIGN, channels, content, filters, schedule, priority };
        try {
            if (campaign?.id) {
                await updateCampaign.mutateAsync({ id: campaign.id, data });
                if (andSend) await sendCampaign.mutateAsync(campaign.id);
            } else {
                const created = await createCampaign.mutateAsync(data);
                if (andSend) await sendCampaign.mutateAsync(created.id);
            }
            onClose();
        } catch { /* handled by hooks */ }
    };

    const steps = ['İçerik', 'Hedef Kitle', 'Zamanlama', 'Önizleme'];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '70vh' } }}>
            <DialogTitle sx={{ pb: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <CampaignIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>{campaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</Typography>
                </Stack>
                <Tabs value={step} onChange={(_, v) => setStep(v)} sx={{ mt: 2 }}>
                    {steps.map((label, i) => <Tab key={i} label={label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
                </Tabs>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
                {step === 0 && (
                    <Box>
                        <TextField fullWidth label="Kampanya Adı" value={name} onChange={e => setName(e.target.value)} sx={{ mb: 3 }} placeholder="Ör: Yeni Özellik Duyurusu" />
                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>Kanallar</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                            {Object.values(NotificationChannel).map(ch => (
                                <Chip key={ch} label={CHANNEL_LABELS[ch].label}
                                    onClick={() => setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
                                    color={channels.includes(ch) ? 'primary' : 'default'}
                                    variant={channels.includes(ch) ? 'filled' : 'outlined'} sx={{ fontWeight: 600 }} />
                            ))}
                        </Stack>
                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>Öncelik</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                            {Object.values(NotificationPriority).map(p => (
                                <Chip key={p} label={p} onClick={() => setPriority(p)}
                                    color={priority === p ? 'primary' : 'default'}
                                    variant={priority === p ? 'filled' : 'outlined'} size="small" />
                            ))}
                        </Stack>
                        <ContentEditor content={content} onChange={setContent} />
                    </Box>
                )}
                {step === 1 && <AudienceBuilder filters={filters} onFiltersChange={setFilters} onReachChange={setEstimatedReach} />}
                {step === 2 && <SchedulingPanel schedule={schedule} onChange={setSchedule} />}
                {step === 3 && (
                    <Box>
                        <Typography variant="h6" fontWeight={700} gutterBottom>📋 Kampanya Özeti</Typography>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Kampanya Adı</Typography><Typography fontWeight={600}>{name || '—'}</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Öncelik</Typography><Typography>{priority}</Typography></Grid>
                                    <Grid item xs={12}><Divider /></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Başlık</Typography><Typography fontWeight={600}>{content.title || '—'}</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Kanallar</Typography>
                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>{channels.map(ch => <Chip key={ch} size="small" label={CHANNEL_LABELS[ch].label} sx={{ bgcolor: alpha(CHANNEL_LABELS[ch].color, 0.15), color: CHANNEL_LABELS[ch].color, fontWeight: 600, fontSize: '0.7rem' }} />)}</Stack></Grid>
                                    <Grid item xs={12}><Typography variant="caption" color="text.secondary">Mesaj</Typography><Typography variant="body2">{content.body || '—'}</Typography></Grid>
                                    {content.deepLink && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Deep Link</Typography><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{content.deepLink}</Typography></Grid>}
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Hedef Kitle</Typography><Typography>{filters.length > 0 ? `${filters.length} filtre` : 'Tüm Kullanıcılar'}</Typography>
                                        <Typography variant="body2" color="text.secondary">~{estimatedReach.toLocaleString()} kişi</Typography></Grid>
                                    <Grid item xs={6}><Typography variant="caption" color="text.secondary">Zamanlama</Typography>
                                        <Typography>{schedule.type === ScheduleType.IMMEDIATE ? 'Hemen Gönder' : schedule.type === ScheduleType.SCHEDULED ? `Zamanlandı` : 'Kullanıcı Saat Dilimi'}</Typography></Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>İptal</Button>
                {step > 0 && <Button onClick={() => setStep(step - 1)}>Geri</Button>}
                {step < 3 && <Button variant="contained" onClick={() => setStep(step + 1)} disabled={!name || !content.title}>İleri</Button>}
                {step === 3 && <>
                    <Button variant="outlined" onClick={() => handleSave(false)} disabled={!name}>Taslak Kaydet</Button>
                    <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleSave(true)} disabled={!name || !content.title}>Gönder</Button>
                </>}
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Component ────────────────────────────────────────
export default function CampaignManager() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [typeFilter, setTypeFilter] = useState<CampaignType | undefined>();
    const { data, isLoading, refetch } = useCampaigns(typeFilter, page, search || undefined);

    const campaigns = data?.campaigns || [];
    const totalPages = data?.totalPages || 0;

    const { deleteCampaign, cancelCampaign, sendCampaign } = useCampaignActions();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuCampaign, setMenuCampaign] = useState<Campaign | null>(null);

    const handleEdit = (c: Campaign) => { setEditCampaign(c); setDialogOpen(true); setAnchorEl(null); };
    const handleCreate = () => { setEditCampaign(null); setDialogOpen(true); };

    return (
        <Box>
            {/* Toolbar */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField size="small" placeholder="Kampanya ara..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ minWidth: 260 }} />
                    <Stack direction="row" spacing={0.5}>
                        {[
                            { label: 'Tümü', value: undefined },
                            { label: 'Kampanya', value: CampaignType.CAMPAIGN },
                            { label: 'Transactional', value: CampaignType.TRANSACTIONAL },
                        ].map(t => (
                            <Chip key={t.label} label={t.label}
                                onClick={() => { setTypeFilter(t.value); setPage(0); }}
                                color={typeFilter === t.value ? 'primary' : 'default'}
                                variant={typeFilter === t.value ? 'filled' : 'outlined'}
                                size="small" sx={{ fontWeight: 600 }} />
                        ))}
                    </Stack>
                    <IconButton size="small" onClick={() => refetch()}><RefreshIcon fontSize="small" /></IconButton>
                </Stack>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}>
                    Yeni Kampanya
                </Button>
            </Stack>

            {/* Table */}
            {isLoading && <LinearProgress sx={{ mb: 2 }} />}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                            <TableCell>Kampanya</TableCell>
                            <TableCell>Durum</TableCell>
                            <TableCell>Kanallar</TableCell>
                            <TableCell align="right">Gönderim</TableCell>
                            <TableCell align="right">CTR</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {campaigns.map(c => {
                            const sc = STATUS_CONFIG[c.status];
                            return (
                                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleEdit(c)}>
                                    <TableCell>
                                        <Typography fontWeight={600} variant="body2">{c.name}</Typography>
                                        {c.tags && c.tags.length > 0 && (
                                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                {c.tags.map(t => <Chip key={t} size="small" label={t} sx={{ fontSize: '0.65rem', height: 20 }} />)}
                                            </Stack>
                                        )}
                                    </TableCell>
                                    <TableCell><Chip size="small" icon={sc.icon} label={sc.label} color={sc.color} variant="filled" /></TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            {c.channels.map(ch => <Chip key={ch} size="small" label={CHANNEL_LABELS[ch].label}
                                                sx={{ bgcolor: alpha(CHANNEL_LABELS[ch].color, 0.12), color: CHANNEL_LABELS[ch].color, fontWeight: 600, fontSize: '0.65rem', height: 22 }} />)}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right"><Typography variant="body2" fontWeight={600}>{c.analytics?.sent?.toLocaleString() || '—'}</Typography></TableCell>
                                    <TableCell align="right">
                                        {c.analytics?.ctr != null ? (
                                            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                                                <TrendingUpIcon fontSize="small" color="success" />
                                                <Typography variant="body2" fontWeight={600} color="success.main">{c.analytics.ctr}%</Typography>
                                            </Stack>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell onClick={e => e.stopPropagation()}>
                                        <IconButton size="small" onClick={e => { setAnchorEl(e.currentTarget); setMenuCampaign(c); }}>
                                            <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {campaigns.length === 0 && !isLoading && (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                <CampaignIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                <Typography color="text.secondary">Henüz kampanya yok</Typography>
                                <Button startIcon={<AddIcon />} onClick={handleCreate} sx={{ mt: 1 }}>İlk Kampanyanı Oluştur</Button>
                            </TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {totalPages > 1 && (
                <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                    <Pagination count={totalPages} page={page + 1} onChange={(_, v) => setPage(v - 1)} color="primary" shape="rounded" />
                </Box>
            )}

            {/* Context Menu */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { if (menuCampaign) handleEdit(menuCampaign); }}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Düzenle</MenuItem>
                {menuCampaign?.status === CampaignStatus.DRAFT && (
                    <MenuItem onClick={() => { if (menuCampaign) { sendCampaign.mutate(menuCampaign.id); setAnchorEl(null); } }}><ListItemIcon><SendIcon fontSize="small" /></ListItemIcon>Gönder</MenuItem>
                )}
                {menuCampaign?.status === CampaignStatus.SCHEDULED && (
                    <MenuItem onClick={() => { if (menuCampaign) { cancelCampaign.mutate(menuCampaign.id); setAnchorEl(null); } }}><ListItemIcon><CancelIcon fontSize="small" /></ListItemIcon>İptal Et</MenuItem>
                )}
                <MenuItem onClick={() => { if (menuCampaign) { deleteCampaign.mutate(menuCampaign.id); setAnchorEl(null); } }} sx={{ color: 'error.main' }}>
                    <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>Sil
                </MenuItem>
            </Menu>

            <CampaignDialog open={dialogOpen} onClose={() => setDialogOpen(false)} campaign={editCampaign} />
        </Box>
    );
}
