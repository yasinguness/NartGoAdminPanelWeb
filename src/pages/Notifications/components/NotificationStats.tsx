import { Grid } from '@mui/material';
import {
    People as PeopleIcon,
    Settings as SettingsIcon,
    Notifications as NotificationsIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { AdminNotificationStats } from '../../../types/notifications/adminNotificationStats';
import { StatCard } from '../../../components/Data';

interface NotificationStatsProps {
    stats: AdminNotificationStats | undefined;
    loading: boolean;
}

export default function NotificationStats({ stats, loading }: NotificationStatsProps) {
    const successRateValue = stats?.totalNotifications && stats.totalNotifications > 0
        ? Math.round(((stats.totalNotifications - (stats.unreadNotifications || 0)) / stats.totalNotifications) * 100)
        : 100;

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Toplam Hedef Kitle"
                    value={stats?.totalUsers?.toLocaleString() || '0'}
                    icon={<PeopleIcon />}
                    color="primary"
                    loading={loading}
                    subtitle={`${stats?.registeredUsers || 0} Kayıtlı / ${stats?.anonymousUsers || 0} Misafir`}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Erişilebilirlik"
                    value={stats?.totalDevices?.toLocaleString() || '0'}
                    icon={<SettingsIcon />}
                    color="info"
                    loading={loading}
                    subtitle={`${stats?.activeDevices || 0} Aktif Uç Nokta`}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Hacim (24s)"
                    value={stats?.notificationsLast24Hours?.toLocaleString() || '0'}
                    icon={<NotificationsIcon />}
                    color="warning"
                    loading={loading}
                    subtitle={`${stats?.unreadNotifications || 0} Okunmamış`}
                    trend={12}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Teslimat Sağlığı"
                    value={`${successRateValue}%`}
                    icon={<CheckCircleIcon />}
                    color="success"
                    loading={loading}
                    subtitle="Sistem geneli başarı oranı"
                    trend={2.5}
                />
            </Grid>
        </Grid>
    );
}
