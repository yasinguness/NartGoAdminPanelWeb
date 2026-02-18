import React from 'react';
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
        : 0;

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers?.toLocaleString() || '0'}
                    icon={<PeopleIcon />}
                    color="primary"
                    loading={loading}
                    subtitle={`${stats?.registeredUsers || 0} registered, ${stats?.anonymousUsers || 0} anonymous`}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Total Devices"
                    value={stats?.totalDevices?.toLocaleString() || '0'}
                    icon={<SettingsIcon />}
                    color="info"
                    loading={loading}
                    subtitle={`${stats?.activeDevices || 0} active devices`}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Last 24 Hours"
                    value={stats?.notificationsLast24Hours?.toLocaleString() || '0'}
                    icon={<NotificationsIcon />}
                    color="warning"
                    loading={loading}
                    subtitle={`${stats?.unreadNotifications || 0} unread notifications`}
                    trend={{ value: 12, isUp: true }}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    title="Success Rate"
                    value={`${successRateValue}%`}
                    icon={<CheckCircleIcon />}
                    color="success"
                    loading={loading}
                    subtitle="Delivery success rate"
                    trend={{ value: 2.5, isUp: true }}
                />
            </Grid>
        </Grid>
    );
}
