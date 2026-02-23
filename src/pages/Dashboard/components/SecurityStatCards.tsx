import React from 'react';
import { Grid, Box, Typography, Tooltip } from '@mui/material';
import { 
    ShieldCheck, 
    ShieldAlert, 
    Activity, 
    Zap,
    TrendingUp,
    TrendingDown,
    Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SecurityStats } from '../../../types/security/securityModel';
import { StatCard } from '../../../components/Data';
import { alpha } from '@mui/material/styles';

interface SecurityStatCardsProps {
    stats: SecurityStats | null;
    loading: boolean;
}

export default function SecurityStatCards({ stats, loading }: SecurityStatCardsProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <Grid container spacing={3} sx={{ mb: 4 }} component={motion.div} variants={container} initial="hidden" animate="show">
            <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                <StatCard
                    title="Login Success Rate"
                    value={`${stats ? (100 - stats.failureRate).toFixed(1) : 0}%`}
                    icon={<ShieldCheck size={24} />}
                    color="success"
                    loading={loading}
                    subtitle="Successful authentication ratio"
                    trend={0.5}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                <StatCard
                    title="Suspicious Activity"
                    value={stats?.suspiciousActivityCount?.toLocaleString() || '0'}
                    icon={<ShieldAlert size={24} />}
                    color="error"
                    loading={loading}
                    subtitle="Risk detections (24h)"
                    trend={stats?.suspiciousActivityCount && stats.suspiciousActivityCount > 0 ? 5.2 : 0}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                <StatCard
                    title="Unique IP Access"
                    value={stats?.uniqueIps?.toLocaleString() || '0'}
                    icon={<Activity size={24} />}
                    color="info"
                    loading={loading}
                    subtitle="Distinct source addresses"
                    trend={-2.4}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3} component={motion.div} variants={item}>
                <StatCard
                    title="Total Attempts"
                    value={stats?.totalAttempts?.toLocaleString() || '0'}
                    icon={<Lock size={24} />}
                    color="warning"
                    loading={loading}
                    subtitle="Platform entry requests"
                    trend={12.8}
                />
            </Grid>

            {/* Premium Mini Charts Row (Optional/Concept) */}
            <Grid item xs={12} component={motion.div} variants={item}>
                <Box sx={{ 
                    p: 2, 
                    borderRadius: 3, 
                    background: alpha('#fff', 0.5), 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ 
                            p: 1, 
                            borderRadius: 2, 
                            bgcolor: alpha('#2dd4bf', 0.1), 
                            color: '#0d9488',
                            display: 'flex'
                        }}>
                           <Zap size={20} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                            System Security Status: <Box component="span" sx={{ color: 'success.main', ml: 1 }}>All Systems Operational</Box>
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={3}>
                         <Box textAlign="right">
                            <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', fontWeight: 800 }}>Threat Level</Typography>
                            <Typography variant="body2" fontWeight={700} color="success.main">Low</Typography>
                        </Box>
                        <Box textAlign="right">
                            <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', fontWeight: 800 }}>Uptime</Typography>
                            <Typography variant="body2" fontWeight={700}>99.98%</Typography>
                        </Box>
                    </Stack>
                </Box>
            </Grid>
        </Grid>
    );
}

// Inter-component dependencies
import { Stack } from '@mui/material';
