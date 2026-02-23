import React from 'react';
import { 
    Box, 
    Typography, 
    Stack, 
    Tooltip, 
    alpha, 
    IconButton,
    Avatar
} from '@mui/material';
import { 
    Monitor, 
    Smartphone, 
    Tablet, 
    MapPin, 
    Clock, 
    ShieldCheck, 
    ShieldAlert, 
    ShieldX,
    ExternalLink,
    Info,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginLog, LoginStatus } from '../../../types/security/securityModel';
import { format } from 'date-fns';

interface RecentLoginsListProps {
    logs: LoginLog[];
    loading: boolean;
}

const getStatusStyles = (status: LoginStatus) => {
    switch (status) {
        case LoginStatus.SUCCESS:
            return { color: '#10b981', bgcolor: alpha('#10b981', 0.1), icon: <ShieldCheck size={16} /> };
        case LoginStatus.FAILED:
            return { color: '#ef4444', bgcolor: alpha('#ef4444', 0.1), icon: <ShieldX size={16} /> };
        case LoginStatus.BLOCKED:
            return { color: '#f59e0b', bgcolor: alpha('#f59e0b', 0.1), icon: <ShieldAlert size={16} /> };
        case LoginStatus.SUSPICIOUS:
            return { color: '#8b5cf6', bgcolor: alpha('#8b5cf6', 0.1), icon: <ShieldAlert size={16} /> };
        default:
            return { color: '#64748b', bgcolor: alpha('#64748b', 0.1), icon: <Info size={16} /> };
    }
};

const getDeviceIcon = (type: string) => {
    switch (type) {
        case 'mobile': return <Smartphone size={14} />;
        case 'tablet': return <Tablet size={14} />;
        default: return <Monitor size={14} />;
    }
};

export default function RecentLoginsList({ logs, loading }: RecentLoginsListProps) {
    if (loading && logs.length === 0) {
        return (
            <Stack spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Box key={i} sx={{ 
                        height: 72, 
                        bgcolor: alpha('#f1f5f9', 0.5), 
                        borderRadius: 3, 
                        animation: 'pulse 1.5s infinite ease-in-out' 
                    }} />
                ))}
            </Stack>
        );
    }

    return (
        <Box sx={{ position: 'relative' }}>
            <AnimatePresence mode="popLayout">
                {logs.map((log, index) => {
                    const statusStyle = getStatusStyles(log.status);
                    
                    return (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                p: 2,
                                mb: 1.5,
                                borderRadius: 3,
                                background: alpha('#fff', 0.7),
                                backdropFilter: 'blur(12px)',
                                border: '1px solid',
                                borderColor: alpha('#000', 0.04),
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: '#fff',
                                    borderColor: 'primary.light',
                                    boxShadow: '0 12px 24px -10px rgba(0,0,0,0.08)',
                                    transform: 'scale(1.01) translateX(4px)',
                                    '& .action-icon': { opacity: 1, transform: 'translateX(0)' }
                                }
                            }}>
                                {/* Status Indicator */}
                                <Avatar sx={{ 
                                    mr: 2, 
                                    bgcolor: statusStyle.bgcolor, 
                                    color: statusStyle.color,
                                    width: 44,
                                    height: 44,
                                    boxShadow: `0 8px 16px ${alpha(statusStyle.color, 0.15)}`
                                }}>
                                    {statusStyle.icon}
                                </Avatar>

                                {/* User & Auth Info */}
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                            {log.username}
                                        </Typography>
                                        <Box sx={{ 
                                            px: 1, 
                                            py: 0.25, 
                                            borderRadius: '6px', 
                                            bgcolor: alpha('#64748b', 0.05),
                                            color: 'text.secondary',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            {log.ipAddress}
                                        </Box>
                                    </Stack>
                                    
                                    <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                                            <MapPin size={12} strokeWidth={2.5} /> {log.location.city}, {log.location.country}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                                            {getDeviceIcon(log.device.type)} {log.device.os} • {log.device.browser}
                                        </Typography>
                                    </Stack>
                                </Box>

                                {/* Time & Status */}
                                <Box sx={{ textAlign: 'right', mr: 2, display: { xs: 'none', sm: 'block' } }}>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, color: 'text.disabled', fontWeight: 600 }}>
                                        <Clock size={12} /> {format(new Date(log.timestamp), 'HH:mm:ss')}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: statusStyle.color, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '1px', mt: 0.5, display: 'block' }}>
                                        {log.status}
                                    </Typography>
                                </Box>

                                {/* Hover Action */}
                                <Box className="action-icon" sx={{ 
                                    opacity: 0, 
                                    transform: 'translateX(-10px)', 
                                    transition: 'all 0.3s ease',
                                    color: 'primary.main'
                                }}>
                                    <ChevronRight size={20} />
                                </Box>
                            </Box>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            
            <style>
                {`
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}
            </style>
        </Box>
    );
}
