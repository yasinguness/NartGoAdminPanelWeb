import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Stack, Select, MenuItem,
    FormControl, InputLabel, alpha, Chip, Paper, LinearProgress,
} from '@mui/material';
import {
    Send as SendIcon, DoneAll as DeliveredIcon, Visibility as OpenedIcon,
    TouchApp as ClickedIcon, TrendingUp as TrendingUpIcon,
    Unsubscribe as UnsubIcon, PhoneAndroid as AndroidIcon,
    PhoneIphone as IosIcon, Computer as WebIcon,
} from '@mui/icons-material';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { AnalyticsTimeframe } from '../../../types/notifications/analytics';
import { useAnalyticsDashboard } from '../../../hooks/notifications/useCampaignQueries';

const TIMEFRAME_LABELS: Record<AnalyticsTimeframe, string> = {
    [AnalyticsTimeframe.LAST_24H]: 'Son 24 Saat',
    [AnalyticsTimeframe.LAST_7D]: 'Son 7 Gün',
    [AnalyticsTimeframe.LAST_30D]: 'Son 30 Gün',
    [AnalyticsTimeframe.ALL_TIME]: 'Tüm Zamanlar',
};

const PIE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b'];

export default function AnalyticsDashboard() {
    const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>(AnalyticsTimeframe.LAST_7D);
    const { data, isLoading } = useAnalyticsDashboard(timeframe);

    if (isLoading) return <LinearProgress sx={{ mb: 2 }} />;
    if (!data) return <Typography color="text.secondary">Analitik verileri yüklenemedi.</Typography>;

    const statCards = [
        { label: 'Gönderildi', value: data.totalSent.toLocaleString(), icon: <SendIcon />, color: '#6366f1' },
        { label: 'Teslim Edildi', value: data.totalDelivered.toLocaleString(), icon: <DeliveredIcon />, color: '#22c55e' },
        { label: 'Açıldı', value: data.totalOpened.toLocaleString(), icon: <OpenedIcon />, color: '#3b82f6' },
        { label: 'Ort. CTR', value: `${data.averageCtr}%`, icon: <ClickedIcon />, color: '#f59e0b' },
        { label: 'Ort. Dönüşüm', value: `${data.averageConversion}%`, icon: <TrendingUpIcon />, color: '#10b981' },
        { label: 'Abonelik İptali', value: `${data.averageUnsubscribeRate}%`, icon: <UnsubIcon />, color: '#ef4444' },
    ];

    const pieData = [
        { name: 'Android', value: data.platformBreakdown.android, icon: <AndroidIcon fontSize="small" /> },
        { name: 'iOS', value: data.platformBreakdown.ios, icon: <IosIcon fontSize="small" /> },
        { name: 'Web', value: data.platformBreakdown.web, icon: <WebIcon fontSize="small" /> },
    ];

    return (
        <Box>
            {/* Timeframe Selector */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>📊 Analitik Dashboard</Typography>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value as AnalyticsTimeframe)}>
                        {Object.entries(TIMEFRAME_LABELS).map(([k, v]) => (
                            <MenuItem key={k} value={k}>{v}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            {/* Stat Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {statCards.map((s, i) => (
                    <Grid item xs={6} md={2} key={i}>
                        <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha(s.color, 0.04) }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Box sx={{ color: s.color }}>{s.icon}</Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={800} sx={{ color: s.color, lineHeight: 1 }}>
                                            {s.value}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Area Chart — Delivery Funnel */}
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Gönderim Trendi</Typography>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.dailyData}>
                                <defs>
                                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="url(#sentGrad)" name="Gönderildi" />
                                <Area type="monotone" dataKey="delivered" stroke="#3b82f6" fill="transparent" name="Teslim" />
                                <Area type="monotone" dataKey="opened" stroke="#22c55e" fill="url(#openedGrad)" name="Açıldı" />
                                <Area type="monotone" dataKey="clicked" stroke="#f59e0b" fill="transparent" name="Tıklandı" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Pie Chart — Platform Breakdown */}
                <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Platform Dağılımı</Typography>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                                    dataKey="value" paddingAngle={5}>
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={PIE_COLORS[idx]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <Stack spacing={1} sx={{ mt: 1 }}>
                            {pieData.map((p, i) => (
                                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                        <Typography variant="body2">{p.name}</Typography>
                                    </Stack>
                                    <Typography variant="body2" fontWeight={600}>{p.value.toLocaleString()}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
