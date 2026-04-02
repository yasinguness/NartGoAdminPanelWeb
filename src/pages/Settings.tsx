import { useState } from 'react';
import {
    Box, Button, Card, Chip, Divider, Grid, Stack,
    Switch, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import {
    Info as InfoIcon,
    Security as SecurityIcon,
    Notifications as NotificationsIcon,
    Storage as StorageIcon,
    Language as LanguageIcon,
    Build as BuildIcon,
    CheckCircle as CheckIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { PageContainer, PageHeader } from '../components/Page';

// ─── Config types ─────────────────────────────────────────────────────────────
interface SettingsState {
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    maxUploadMb: number;
    sessionTimeoutMin: number;
    supportEmail: string;
    appVersion: string;
    apiBaseUrl: string;
}

const INITIAL: SettingsState = {
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    pushNotifications: true,
    maxUploadMb: 10,
    sessionTimeoutMin: 60,
    supportEmail: 'destek@nartgo.com',
    appVersion: '2.4.1',
    apiBaseUrl: '',
};

// ─── Section card ─────────────────────────────────────────────────────────────
function SettingCard({
    icon, title, description, children, accent,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
    accent?: string;
}) {
    const theme = useTheme();
    const color = accent || theme.palette.primary.main;
    return (
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            <Box sx={{
                px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(color, 0.03),
            }}>
                <Box sx={{
                    width: 40, height: 40, borderRadius: 2.5,
                    bgcolor: alpha(color, 0.1), color: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
                    <Typography variant="caption" color="text.secondary">{description}</Typography>
                </Box>
            </Box>
            <Box sx={{ px: 3, py: 2.5 }}>{children}</Box>
        </Card>
    );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({
    label, description, checked, onChange, danger,
}: {
    label: string; description: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center"
            sx={{ py: 1.5, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
            <Box>
                <Typography variant="body2" fontWeight={600}
                    color={danger && checked ? 'error.main' : 'text.primary'}>
                    {label}
                </Typography>
                <Typography variant="caption" color="text.secondary">{description}</Typography>
            </Box>
            <Switch checked={checked} onChange={e => onChange(e.target.checked)}
                color={danger ? 'error' : 'primary'} />
        </Stack>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Settings() {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const [settings, setSettings] = useState<SettingsState>(INITIAL);
    const [dirty, setDirty] = useState(false);

    const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings(p => ({ ...p, [key]: value }));
        setDirty(true);
    };

    const handleSave = () => {
        // In production, call settings API
        enqueueSnackbar('Ayarlar kaydedildi', { variant: 'success' });
        setDirty(false);
    };

    const handleReset = () => {
        setSettings(INITIAL);
        setDirty(false);
    };

    const services: { label: string; status: 'up' | 'down' | 'degraded'; latency?: string }[] = [
        { label: 'API Gateway', status: 'up', latency: '12ms' },
        { label: 'Auth Service', status: 'up', latency: '8ms' },
        { label: 'Content Service', status: 'up', latency: '24ms' },
        { label: 'Event Service', status: 'up', latency: '19ms' },
        { label: 'Notification Service', status: 'up', latency: '31ms' },
        { label: 'Media Service', status: 'degraded', latency: '890ms' },
        { label: 'Payment Service', status: 'up', latency: '45ms' },
    ];

    const statusColor: Record<string, string> = {
        up: '#10B981', down: '#EF4444', degraded: '#F59E0B',
    };
    const statusLabel: Record<string, string> = {
        up: 'Çalışıyor', down: 'Hata', degraded: 'Yavaş',
    };

    return (
        <PageContainer>
            <PageHeader
                title="Sistem Ayarları"
                subtitle="Uygulama yapılandırması, özellik bayrakları ve servis durumu"
                breadcrumbs={[
                    { label: 'Kontrol Paneli', href: '/dashboard' },
                    { label: 'Sistem Ayarları' },
                ]}
                actions={
                    <Stack direction="row" spacing={1}>
                        {dirty && (
                            <Button variant="outlined" onClick={handleReset}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                Sıfırla
                            </Button>
                        )}
                        <Button variant="contained" onClick={handleSave} disabled={!dirty}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                            Kaydet
                        </Button>
                    </Stack>
                }
            />

            <Grid container spacing={3}>
                {/* Left column */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={3}>
                        {/* Platform */}
                        <SettingCard
                            icon={<BuildIcon />} accent={theme.palette.primary.main}
                            title="Platform Ayarları"
                            description="Genel uygulama davranışını ve kullanıcı erişimini yapılandırın"
                        >
                            <ToggleRow
                                label="Bakım Modu"
                                description="Aktif olduğunda kullanıcılar uygulamaya erişemez, sadece adminler girebilir"
                                checked={settings.maintenanceMode}
                                onChange={v => update('maintenanceMode', v)}
                                danger
                            />
                            <ToggleRow
                                label="Yeni Kayıt"
                                description="Yeni kullanıcıların platforma kayıt olmasına izin ver"
                                checked={settings.registrationEnabled}
                                onChange={v => update('registrationEnabled', v)}
                            />
                        </SettingCard>

                        {/* Notifications */}
                        <SettingCard
                            icon={<NotificationsIcon />} accent="#3B82F6"
                            title="Bildirim Ayarları"
                            description="Hangi kanallar üzerinden bildirim gönderileceğini yönetin"
                        >
                            <ToggleRow
                                label="Push Bildirimleri"
                                description="FCM/APNs üzerinden mobil push bildirimleri gönder"
                                checked={settings.pushNotifications}
                                onChange={v => update('pushNotifications', v)}
                            />
                            <ToggleRow
                                label="E-posta Bildirimleri"
                                description="Sistem olayları için e-posta bildirimleri gönder"
                                checked={settings.emailNotifications}
                                onChange={v => update('emailNotifications', v)}
                            />
                            <Box sx={{ pt: 2 }}>
                                <TextField
                                    label="Destek E-postası" value={settings.supportEmail} fullWidth size="small"
                                    onChange={e => update('supportEmail', e.target.value)}
                                    helperText="Kullanıcılara gönderilen e-postalarda 'yanıtla' adresi olarak kullanılır"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Box>
                        </SettingCard>

                        {/* Storage */}
                        <SettingCard
                            icon={<StorageIcon />} accent="#8B5CF6"
                            title="Medya & Depolama"
                            description="Dosya yükleme limitleri ve medya işleme ayarları"
                        >
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Maksimum Yükleme Boyutu (MB)" type="number"
                                        value={settings.maxUploadMb} fullWidth size="small"
                                        onChange={e => update('maxUploadMb', Number(e.target.value))}
                                        inputProps={{ min: 1, max: 100 }}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                        helperText="Görsel ve dosya yüklemeleri için maksimum boyut"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Oturum Zaman Aşımı (dk)" type="number"
                                        value={settings.sessionTimeoutMin} fullWidth size="small"
                                        onChange={e => update('sessionTimeoutMin', Number(e.target.value))}
                                        inputProps={{ min: 15, max: 480 }}
                                        InputProps={{ sx: { borderRadius: 2 } }}
                                        helperText="Pasif oturumun ne kadar süre sonra kapatılacağı"
                                    />
                                </Grid>
                            </Grid>
                        </SettingCard>

                        {/* Localization */}
                        <SettingCard
                            icon={<LanguageIcon />} accent="#F59E0B"
                            title="Yerelleştirme"
                            description="Dil, zaman dilimi ve bölge ayarları"
                        >
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Varsayılan Dil', value: 'Türkçe (tr-TR)' },
                                    { label: 'Zaman Dilimi', value: 'Europe/Istanbul (UTC+3)' },
                                    { label: 'Para Birimi', value: 'Türk Lirası (TRY)' },
                                    { label: 'Tarih Formatı', value: 'GG.AA.YYYY' },
                                ].map(item => (
                                    <Grid item xs={12} sm={6} key={item.label}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}
                                                sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600} mt={0.5}>{item.value}</Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha('#F59E0B', 0.06), border: `1px solid ${alpha('#F59E0B', 0.15)}` }}>
                                <Typography variant="caption" color="text.secondary">
                                    Yerelleştirme ayarlarını değiştirmek için sistem yöneticinizle iletişime geçin.
                                </Typography>
                            </Box>
                        </SettingCard>

                        {/* Security */}
                        <SettingCard
                            icon={<SecurityIcon />} accent="#EF4444"
                            title="Güvenlik"
                            description="Kimlik doğrulama ve erişim kontrol ayarları"
                        >
                            {[
                                { label: 'JWT Token Süresi', value: '24 saat' },
                                { label: 'Refresh Token Süresi', value: '30 gün' },
                                { label: 'Maksimum Giriş Denemesi', value: '5 deneme' },
                                { label: 'IP Kısıtlaması', value: 'Devre Dışı' },
                            ].map(item => (
                                <Stack key={item.label} direction="row" justifyContent="space-between"
                                    sx={{ py: 1.25, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                                </Stack>
                            ))}
                            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha('#EF4444', 0.04), border: `1px solid ${alpha('#EF4444', 0.12)}` }}>
                                <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 600 }}>
                                    Güvenlik ayarları Keycloak üzerinden yönetilir.
                                </Typography>
                            </Box>
                        </SettingCard>
                    </Stack>
                </Grid>

                {/* Right column */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={3} sx={{ position: 'sticky', top: 72 }}>
                        {/* System info */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <InfoIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight={800}>Sistem Bilgisi</Typography>
                                </Stack>
                            </Box>
                            <Box sx={{ px: 3, py: 2 }}>
                                {[
                                    { label: 'Uygulama Versiyonu', value: 'v2.4.1' },
                                    { label: 'Admin Panel', value: 'v1.8.0' },
                                    { label: 'Ortam', value: 'Production' },
                                    { label: 'Node', value: '20.11.0 LTS' },
                                    { label: 'Son Güncelleme', value: '02.04.2026' },
                                ].map(item => (
                                    <Stack key={item.label} direction="row" justifyContent="space-between"
                                        sx={{ py: 1.25, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                        <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{item.value}</Typography>
                                    </Stack>
                                ))}
                            </Box>
                        </Card>

                        {/* Service health */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                                    <Typography variant="subtitle2" fontWeight={800}>Servis Durumu</Typography>
                                </Stack>
                                <Chip label="6/7 Aktif" size="small"
                                    sx={{ fontWeight: 700, fontSize: 11, bgcolor: alpha('#10B981', 0.1), color: '#10B981' }} />
                            </Box>
                            <Box sx={{ px: 3, py: 2 }}>
                                {services.map(svc => (
                                    <Stack key={svc.label} direction="row" justifyContent="space-between" alignItems="center"
                                        sx={{ py: 1.25, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {svc.status === 'up'
                                                ? <CheckIcon sx={{ fontSize: 14, color: '#10B981' }} />
                                                : <WarningIcon sx={{ fontSize: 14, color: statusColor[svc.status] }} />}
                                            <Typography variant="caption" fontWeight={600}>{svc.label}</Typography>
                                        </Stack>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {svc.latency && (
                                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                                                    {svc.latency}
                                                </Typography>
                                            )}
                                            <Chip label={statusLabel[svc.status]} size="small" sx={{
                                                height: 18, fontSize: 10, fontWeight: 700,
                                                bgcolor: alpha(statusColor[svc.status], 0.1),
                                                color: statusColor[svc.status],
                                            }} />
                                        </Stack>
                                    </Stack>
                                ))}
                            </Box>
                        </Card>

                        {/* Danger zone */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha('#EF4444', 0.3)}`, bgcolor: alpha('#EF4444', 0.02) }}>
                            <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha('#EF4444', 0.2)}` }}>
                                <Typography variant="subtitle2" fontWeight={800} color="error">Tehlikeli Bölge</Typography>
                            </Box>
                            <Box sx={{ px: 3, py: 2.5 }}>
                                <Stack spacing={1.5}>
                                    <Button fullWidth variant="outlined" color="error" size="small"
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                        Önbelleği Temizle
                                    </Button>
                                    <Button fullWidth variant="outlined" color="error" size="small"
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                        Aktif Oturumları Sonlandır
                                    </Button>
                                    <Divider />
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, textAlign: 'center' }}>
                                        Bu işlemler geri alınamaz. Dikkatli kullanın.
                                    </Typography>
                                </Stack>
                            </Box>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        </PageContainer>
    );
}
