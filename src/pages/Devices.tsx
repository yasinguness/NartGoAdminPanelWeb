import { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, Card, Chip, Dialog, DialogActions, DialogContent,
    DialogTitle, Divider, Grid, IconButton, InputAdornment, Stack,
    TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import {
    PhoneAndroid as AndroidIcon,
    Apple as AppleIcon,
    Devices as DevicesIcon,
    CheckCircle as ActiveIcon,
    Block as BlockIcon,
    Close as CloseIcon,
    Search as SearchIcon,
    ContentCopy as CopyIcon,
    SignalWifi4Bar as OnlineIcon,
    SignalWifiOff as OfflineIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { PageContainer, PageHeader } from '../components/Page';
import { DataTable, StatusChip } from '../components/Data';

interface Device {
    id: string;
    deviceId: string;
    deviceType: 'ios' | 'android' | string;
    deviceModel: string;
    fcmToken: string;
    active: boolean;
    lastActiveAt: string;
    email?: string;
    appVersion?: string;
    osVersion?: string;
}

function formatRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins} dk önce`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} sa önce`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} gün önce`;
    return new Date(iso).toLocaleDateString('tr-TR');
}

function PlatformIcon({ type }: { type: string }) {
    if (type === 'ios') return <AppleIcon sx={{ fontSize: 18 }} />;
    return <AndroidIcon sx={{ fontSize: 18 }} />;
}

export default function Devices() {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selected, setSelected] = useState<Device | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 600));
            setDevices([
                {
                    id: '1', deviceId: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
                    deviceType: 'ios', deviceModel: 'iPhone 15 Pro',
                    fcmToken: 'fDsR4xQzT3k:APA91bHPRgkFhjD4Xhg_KZW4xrHjuVGJpMtTXCHxlQerUCh9N4LxEPZ1F9b3ZkX8',
                    active: true, lastActiveAt: new Date(Date.now() - 120000).toISOString(),
                    email: 'ahmet.yilmaz@gmail.com', appVersion: '2.4.1', osVersion: 'iOS 17.2',
                },
                {
                    id: '2', deviceId: 'F0E1D2C3-B4A5-9687-FEDC-BA0987654321',
                    deviceType: 'android', deviceModel: 'Samsung Galaxy S23',
                    fcmToken: 'cRt7vBnM2p1:APA91bIFmJdKzXwQ3sH7yTgO9VNvLjReCuAi5ZmBkEaWd8PoFxG4YhUtNcb6',
                    active: true, lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
                    email: 'fatma.kaya@outlook.com', appVersion: '2.4.1', osVersion: 'Android 14',
                },
                {
                    id: '3', deviceId: '9A8B7C6D-5E4F-3210-ABCD-987654321098',
                    deviceType: 'android', deviceModel: 'Xiaomi 13',
                    fcmToken: 'gHiJ4kLmN5o:APA91bJoKrPsTuVwXyZa1BcDeFgH2IjKlM3NoPqR4StU5VwXyZ6AbCdEfGh',
                    active: false, lastActiveAt: new Date(Date.now() - 86400000 * 7).toISOString(),
                    email: 'mehmet.demir@hotmail.com', appVersion: '2.3.8', osVersion: 'Android 13',
                },
                {
                    id: '4', deviceId: '12345678-ABCD-EF01-2345-678901234567',
                    deviceType: 'ios', deviceModel: 'iPad Pro 12.9"',
                    fcmToken: 'pQrS6tUvW7x:APA91bLnOpQrStUvWxYzAb8CdEfGhIj9KlMnOpQr0StUvWxYzAbCdEfG',
                    active: false, lastActiveAt: new Date(Date.now() - 86400000 * 30).toISOString(),
                    email: undefined, appVersion: '2.2.0', osVersion: 'iPadOS 16.7',
                },
            ]);
            setLoading(false);
        };
        void load();
    }, []);

    const stats = useMemo(() => {
        const active = devices.filter(d => d.active).length;
        const ios = devices.filter(d => d.deviceType === 'ios').length;
        const android = devices.filter(d => d.deviceType === 'android').length;
        return [
            { label: 'Toplam Cihaz', value: devices.length, color: theme.palette.primary.main, icon: <DevicesIcon /> },
            { label: 'Aktif', value: active, color: '#10B981', icon: <ActiveIcon /> },
            { label: 'iOS', value: ios, color: '#374151', icon: <AppleIcon /> },
            { label: 'Android', value: android, color: '#10B981', icon: <AndroidIcon /> },
        ];
    }, [devices, theme]);

    const filtered = useMemo(() => devices.filter(d => {
        const q = search.toLowerCase();
        const matchSearch = !q || d.deviceId.toLowerCase().includes(q)
            || d.deviceModel.toLowerCase().includes(q)
            || (d.email || '').toLowerCase().includes(q);
        const matchType = !typeFilter || d.deviceType === typeFilter;
        const matchStatus = !statusFilter || (statusFilter === 'active' ? d.active : !d.active);
        return matchSearch && matchType && matchStatus;
    }), [devices, search, typeFilter, statusFilter]);

    const columns = [
        {
            id: 'device', label: 'Cihaz',
            render: (row: Device) => (
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                        width: 36, height: 36, borderRadius: 2,
                        bgcolor: row.deviceType === 'ios' ? alpha('#374151', 0.08) : alpha('#10B981', 0.08),
                        color: row.deviceType === 'ios' ? '#374151' : '#10B981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <PlatformIcon type={row.deviceType} />
                    </Box>
                    <Box>
                        <Typography variant="body2" fontWeight={700}>{row.deviceModel}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                            {row.deviceId.slice(0, 18)}…
                        </Typography>
                    </Box>
                </Stack>
            ),
        },
        {
            id: 'user', label: 'Kullanıcı', width: 220,
            render: (row: Device) => (
                <Typography variant="body2" color={row.email ? 'text.primary' : 'text.disabled'}>
                    {row.email || 'Anonim'}
                </Typography>
            ),
        },
        {
            id: 'version', label: 'Versiyon', width: 130,
            render: (row: Device) => (
                <Stack spacing={0.25}>
                    <Chip label={row.appVersion || '—'} size="small"
                        sx={{ fontSize: 10, fontWeight: 700, height: 18, bgcolor: alpha(theme.palette.primary.main, 0.06), color: theme.palette.primary.main }} />
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>{row.osVersion}</Typography>
                </Stack>
            ),
        },
        {
            id: 'status', label: 'Durum', width: 100,
            render: (row: Device) => (
                <StatusChip status={row.active ? 'active' : 'inactive'} label={row.active ? 'Aktif' : 'Pasif'} />
            ),
        },
        {
            id: 'lastActive', label: 'Son Aktivite', width: 140,
            render: (row: Device) => (
                <Stack direction="row" spacing={0.75} alignItems="center">
                    {Date.now() - new Date(row.lastActiveAt).getTime() < 300000
                        ? <OnlineIcon sx={{ fontSize: 12, color: '#10B981' }} />
                        : <OfflineIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                    <Typography variant="caption" color="text.secondary">
                        {formatRelative(row.lastActiveAt)}
                    </Typography>
                </Stack>
            ),
        },
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Cihazlar"
                subtitle="Kayıtlı kullanıcı cihazlarını izleyin ve push token yönetimi yapın"
                breadcrumbs={[
                    { label: 'Kontrol Paneli', href: '/dashboard' },
                    { label: 'Cihazlar' },
                ]}
            />

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                {stats.map(s => (
                    <Grid item xs={6} sm={3} key={s.label}>
                        <Card elevation={0} sx={{
                            p: 2.5, borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(s.color, 0.07)} 0%, ${alpha(s.color, 0.02)} 100%)`,
                            border: `1px solid ${alpha(s.color, 0.12)}`,
                        }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}
                                        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                                        {s.label}
                                    </Typography>
                                    <Typography variant="h4" fontWeight={800} sx={{ color: s.color, mt: 0.5 }}>
                                        {s.value}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    width: 44, height: 44, borderRadius: 2.5,
                                    bgcolor: alpha(s.color, 0.12), color: s.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {s.icon}
                                </Box>
                            </Stack>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filters */}
            <Card elevation={0} sx={{ p: 2, borderRadius: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                    <TextField size="small" placeholder="Cihaz, model veya kullanıcı ara..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}><CloseIcon sx={{ fontSize: 15 }} /></IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Stack direction="row" spacing={0.75}>
                        {[
                            { value: '', label: 'Tümü' },
                            { value: 'ios', label: 'iOS' },
                            { value: 'android', label: 'Android' },
                        ].map(opt => (
                            <Chip key={opt.value} label={opt.label} size="small" clickable
                                onClick={() => setTypeFilter(opt.value)}
                                sx={{
                                    fontWeight: 600, fontSize: 12,
                                    bgcolor: typeFilter === opt.value ? theme.palette.primary.main : 'transparent',
                                    color: typeFilter === opt.value ? 'white' : 'text.secondary',
                                    border: `1px solid ${typeFilter === opt.value ? theme.palette.primary.main : theme.palette.divider}`,
                                }}
                            />
                        ))}
                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                        {[
                            { value: '', label: 'Tümü' },
                            { value: 'active', label: 'Aktif' },
                            { value: 'inactive', label: 'Pasif' },
                        ].map(opt => (
                            <Chip key={opt.value} label={opt.label} size="small" clickable
                                onClick={() => setStatusFilter(opt.value)}
                                sx={{
                                    fontWeight: 600, fontSize: 12,
                                    bgcolor: statusFilter === opt.value ? theme.palette.primary.main : 'transparent',
                                    color: statusFilter === opt.value ? 'white' : 'text.secondary',
                                    border: `1px solid ${statusFilter === opt.value ? theme.palette.primary.main : theme.palette.divider}`,
                                }}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Card>

            <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                onRowClick={setSelected}
                renderRowActions={(device: Device) => (
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title={device.active ? 'Cihazı Engelle' : 'Engeli Kaldır'}>
                            <IconButton size="small"
                                sx={{ color: device.active ? 'error.main' : 'success.main' }}>
                                {device.active ? <BlockIcon fontSize="small" /> : <ActiveIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
            />

            {/* Detail Dialog */}
            <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}>
                {selected && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                        width: 44, height: 44, borderRadius: 2.5,
                                        bgcolor: selected.deviceType === 'ios' ? alpha('#374151', 0.08) : alpha('#10B981', 0.08),
                                        color: selected.deviceType === 'ios' ? '#374151' : '#10B981',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <PlatformIcon type={selected.deviceType} />
                                    </Box>
                                    <Box>
                                        <Typography fontWeight={800}>{selected.deviceModel}</Typography>
                                        <Typography variant="caption" color="text.secondary">{selected.osVersion}</Typography>
                                    </Box>
                                </Stack>
                                <IconButton size="small" onClick={() => setSelected(null)}>
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </DialogTitle>
                        <Divider />
                        <DialogContent sx={{ pt: 2.5 }}>
                            <Stack spacing={2}>
                                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>Cihaz Kimliği</Typography>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{selected.deviceId}</Typography>
                                        <Tooltip title="Kopyala">
                                            <IconButton size="small" onClick={() => {
                                                navigator.clipboard.writeText(selected.deviceId);
                                                enqueueSnackbar('Kopyalandı', { variant: 'info', autoHideDuration: 1500 });
                                            }}>
                                                <CopyIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>

                                <Grid container spacing={1.5}>
                                    {[
                                        { label: 'Kullanıcı', value: selected.email || 'Anonim' },
                                        { label: 'Uygulama Versiyonu', value: selected.appVersion || '—' },
                                        { label: 'İşletim Sistemi', value: selected.osVersion || '—' },
                                        { label: 'Son Aktivite', value: formatRelative(selected.lastActiveAt) },
                                        { label: 'Durum', value: selected.active ? 'Aktif' : 'Pasif' },
                                    ].map(item => (
                                        <Grid item xs={6} key={item.label}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600} mt={0.25}>{item.value}</Typography>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                                        FCM Push Token
                                    </Typography>
                                    <Box sx={{ p: 1.5, mt: 0.75, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', flex: 1, lineHeight: 1.6 }}>
                                            {selected.fcmToken}
                                        </Typography>
                                        <Tooltip title="Kopyala">
                                            <IconButton size="small" onClick={() => {
                                                navigator.clipboard.writeText(selected.fcmToken);
                                                enqueueSnackbar('Token kopyalandı', { variant: 'info', autoHideDuration: 1500 });
                                            }}>
                                                <CopyIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Stack>
                        </DialogContent>
                        <Divider />
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={() => setSelected(null)} color="inherit"
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Kapat</Button>
                            <Button variant="contained" color={selected.active ? 'error' : 'success'}
                                startIcon={selected.active ? <BlockIcon /> : <ActiveIcon />}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                                {selected.active ? 'Engelle' : 'Etkinleştir'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </PageContainer>
    );
}
