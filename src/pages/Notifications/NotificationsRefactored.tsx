import React, { useState, useEffect } from 'react';
import {
    Tabs, Tab, Box, Typography, Stack, Button,
    Paper, alpha, Grid, Card, CardContent, Divider,
    Badge, TextField, InputAdornment, useTheme,
} from '@mui/material';
import {
    Campaign as CampaignIcon,
    Notifications as InboxIcon,
    Analytics as AnalyticsIcon,
    Groups as AudienceIcon,
    Settings as SettingsIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Add as AddIcon,
    TrendingUp as TrendingUpIcon,
    Send as SendIcon,
    DoneAll as DeliveredIcon,
} from '@mui/icons-material';

// Components
import { PageContainer } from '../../components/Page';
import CampaignManager from './components/CampaignManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AudienceBuilder from './components/AudienceBuilder';
import RateLimitSettings from './components/RateLimitSettings';
import NotificationList from './components/NotificationList';

// Hooks
import { useNotificationQueries } from '../../hooks/notifications/useNotificationQueries';
import { useAnalyticsDashboard } from '../../hooks/notifications/useCampaignQueries';
import { useAuthStore } from '../../store/authStore';
import { SegmentFilter } from '../../types/notifications/audience';
import { AnalyticsTimeframe } from '../../types/notifications/analytics';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`nav-tabpanel-${index}`} {...other}>
            {value === index && <Box sx={{ pt: 4 }}>{children}</Box>}
        </div>
    );
}

const StatWidget = ({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode, color: string }) => (
    <Card sx={{
        height: '100%',
        borderRadius: 4,
        bgcolor: alpha(color, 0.04),
        border: '1px solid',
        borderColor: alpha(color, 0.1),
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 16px ${alpha(color, 0.1)}` }
    }}>
        <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: alpha(color, 0.1),
                    color: color,
                    display: 'flex'
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {label}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="text.primary">
                        {value}
                    </Typography>
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

export default function NotificationsRefactored() {
    const theme = useTheme();
    const [tab, setTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [audienceFilters, setAudienceFilters] = useState<SegmentFilter[]>([]);
    const [reach, setReach] = useState(0);

    const user = useAuthStore((state) => state.user);
    const { notifications, unreadCount, loading, getUserNotificationsPageable, getUnreadCount } = useNotificationQueries();
    const { data: analytics } = useAnalyticsDashboard(AnalyticsTimeframe.LAST_7D);

    useEffect(() => {
        if (user?.id) {
            getUserNotificationsPageable(user.id);
            getUnreadCount(user.id);
        }
    }, [user?.id]);

    return (
        <PageContainer>
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight={900} sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: -1
                        }}>
                            Büyüme Motoru (Growth Engine)
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                            Bildirim kampanyaları, kitle analizi ve büyüme metriklerinizi buradan yönetin.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined" sx={{ borderRadius: 3, px: 3, py: 1, textTransform: 'none', fontWeight: 700 }}>
                            Hızlı Gönderi
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 3, px: 3, py: 1, textTransform: 'none', fontWeight: 700, boxShadow: theme.shadows[4] }}>
                            Yeni Kampanya
                        </Button>
                    </Stack>
                </Stack>

                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget label="Toplam Gönderim" value={analytics?.totalSent.toLocaleString() || '0'} icon={<SendIcon />} color={theme.palette.primary.main} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget label="Teslim Oranı" value={analytics ? `%${((analytics.totalDelivered / analytics.totalSent) * 100).toFixed(1)}` : '—'} icon={<DeliveredIcon />} color="#10b981" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget label="Tıklama Oranı (CTR)" value={analytics ? `%${analytics.averageCtr}` : '—'} icon={<TrendingUpIcon />} color="#f59e0b" />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatWidget label="Gelen Kutusu" value={unreadCount} icon={<InboxIcon />} color="#8b5cf6" />
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ width: '100%' }}>
                <Box sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(8px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRadius: '16px 16px 0 0',
                    px: 3,
                }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 700,
                                minHeight: 72,
                                fontSize: '1rem',
                                color: 'text.secondary',
                                px: 3,
                                '&.Mui-selected': { color: 'primary.main' }
                            },
                        }}
                    >
                        <Tab icon={<CampaignIcon />} iconPosition="start" label="Kampanyalar" />
                        <Tab
                            icon={<Badge badgeContent={unreadCount} color="error" variant="standard"><InboxIcon /></Badge>}
                            iconPosition="start"
                            label="Gelen Kutusu"
                        />
                        <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Analitik" />
                        <Tab icon={<AudienceIcon />} iconPosition="start" label="Hedef Kitle" />
                        <Tab icon={<SettingsIcon />} iconPosition="start" label="Ayarlar" />
                    </Tabs>
                </Box>

                <Box sx={{ minHeight: '600px' }}>
                    {/* Kampanyalar */}
                    <TabPanel value={tab} index={0}>
                        <CampaignManager />
                    </TabPanel>

                    {/* Gelen Kutusu */}
                    <TabPanel value={tab} index={1}>
                        <Stack spacing={3}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Paper elevation={0} sx={{
                                    flex: 1,
                                    p: 0,
                                    borderRadius: 3,
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 2
                                }}>
                                    <SearchIcon sx={{ color: 'text.disabled', mr: 1.5 }} />
                                    <TextField
                                        fullWidth
                                        variant="standard"
                                        placeholder="Bildirimlerde ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{ disableUnderline: true }}
                                        sx={{ py: 1.5 }}
                                    />
                                </Paper>
                                <Button variant="outlined" startIcon={<FilterIcon />} sx={{ borderRadius: 3, height: 56, px: 3, borderColor: 'divider' }}>Filtrele</Button>
                            </Stack>

                            <NotificationList
                                notifications={notifications || []}
                                loading={loading}
                                viewMode="cards"
                                searchTerm={searchTerm}
                                filterPriority="all"
                                onOpenDialog={() => { }}
                                onMarkAsRead={async () => { }}
                            />
                        </Stack>
                    </TabPanel>

                    {/* Analitik */}
                    <TabPanel value={tab} index={2}>
                        <AnalyticsDashboard />
                    </TabPanel>

                    {/* Hedef Kitle */}
                    <TabPanel value={tab} index={3}>
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>🎯 Hedef Kitle Segmentasyonu</Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Kullanıcılarınızı özelliklerine ve davranışlarına göre gruplandırın.</Typography>
                                </Box>
                                <Stack direction="row" spacing={2}>
                                    <Box sx={{ textAlign: 'right', mr: 2 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>TAHMİNİ ERİŞİM</Typography>
                                        <Typography variant="h6" fontWeight={900} color="primary.main">{reach.toLocaleString()}</Typography>
                                    </Box>
                                    <Button variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 3, px: 3 }}>Yeni Segment Kaydet</Button>
                                </Stack>
                            </Stack>
                            <AudienceBuilder
                                filters={audienceFilters}
                                onFiltersChange={setAudienceFilters}
                                onReachChange={setReach}
                            />
                        </Paper>
                    </TabPanel>

                    {/* Ayarlar */}
                    <TabPanel value={tab} index={4}>
                        <RateLimitSettings />
                    </TabPanel>
                </Box>
            </Box>
        </PageContainer>
    );
}
