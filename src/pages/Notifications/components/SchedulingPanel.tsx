import React from 'react';
import {
    Box, Typography, RadioGroup, Radio, FormControlLabel, TextField,
    Select, MenuItem, FormControl, InputLabel, Stack, Card, CardContent,
    Chip, alpha,
} from '@mui/material';
import {
    Send as SendIcon, Schedule as ScheduleIcon, Public as PublicIcon,
    AutoAwesome as AiIcon,
} from '@mui/icons-material';
import { ScheduleConfig, ScheduleType, COMMON_TIMEZONES } from '../../../types/notifications/scheduling';

interface SchedulingPanelProps {
    schedule: ScheduleConfig;
    onChange: (schedule: ScheduleConfig) => void;
}

export default function SchedulingPanel({ schedule, onChange }: SchedulingPanelProps) {
    const update = (updates: Partial<ScheduleConfig>) => {
        onChange({ ...schedule, ...updates });
    };

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Gönderim Zamanı</Typography>
            <RadioGroup value={schedule.type} onChange={(e) => update({ type: e.target.value as ScheduleType })}>
                {/* Immediate */}
                <Card variant="outlined" sx={{
                    mb: 1.5, borderRadius: 2, cursor: 'pointer',
                    borderColor: schedule.type === ScheduleType.IMMEDIATE ? 'primary.main' : 'divider',
                    bgcolor: schedule.type === ScheduleType.IMMEDIATE ? alpha('#6366f1', 0.04) : 'transparent',
                }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <FormControlLabel value={ScheduleType.IMMEDIATE} control={<Radio />}
                            label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <SendIcon fontSize="small" color="primary" />
                                    <Box>
                                        <Typography fontWeight={600}>Hemen Gönder</Typography>
                                        <Typography variant="caption" color="text.secondary">Bildirim anında tüm hedef kitleye ulaşır</Typography>
                                    </Box>
                                </Stack>
                            }
                        />
                    </CardContent>
                </Card>

                {/* Scheduled */}
                <Card variant="outlined" sx={{
                    mb: 1.5, borderRadius: 2, cursor: 'pointer',
                    borderColor: schedule.type === ScheduleType.SCHEDULED ? 'primary.main' : 'divider',
                    bgcolor: schedule.type === ScheduleType.SCHEDULED ? alpha('#6366f1', 0.04) : 'transparent',
                }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <FormControlLabel value={ScheduleType.SCHEDULED} control={<Radio />}
                            label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <ScheduleIcon fontSize="small" color="info" />
                                    <Box>
                                        <Typography fontWeight={600}>Tarih & Saat Planla</Typography>
                                        <Typography variant="caption" color="text.secondary">Belirlediğiniz tarih ve saatte gönderilir</Typography>
                                    </Box>
                                </Stack>
                            }
                        />
                        {schedule.type === ScheduleType.SCHEDULED && (
                            <Stack direction="row" spacing={2} sx={{ mt: 2, ml: 4 }}>
                                <TextField type="datetime-local" size="small" label="Gönderim Tarihi"
                                    InputLabelProps={{ shrink: true }}
                                    value={schedule.scheduledAt?.slice(0, 16) || ''}
                                    onChange={(e) => update({ scheduledAt: new Date(e.target.value).toISOString() })}
                                    sx={{ flex: 1 }}
                                />
                                <FormControl size="small" sx={{ minWidth: 200 }}>
                                    <InputLabel>Saat Dilimi</InputLabel>
                                    <Select value={schedule.timezone || 'Europe/Istanbul'} label="Saat Dilimi"
                                        onChange={(e) => update({ timezone: e.target.value })}>
                                        {COMMON_TIMEZONES.map(tz => (
                                            <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        )}
                    </CardContent>
                </Card>

                {/* User Timezone */}
                <Card variant="outlined" sx={{
                    mb: 1.5, borderRadius: 2, cursor: 'pointer',
                    borderColor: schedule.type === ScheduleType.USER_TIMEZONE ? 'primary.main' : 'divider',
                    bgcolor: schedule.type === ScheduleType.USER_TIMEZONE ? alpha('#6366f1', 0.04) : 'transparent',
                }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <FormControlLabel value={ScheduleType.USER_TIMEZONE} control={<Radio />}
                            label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <PublicIcon fontSize="small" color="success" />
                                    <Box>
                                        <Typography fontWeight={600}>Kullanıcının Yerel Saatine Göre</Typography>
                                        <Typography variant="caption" color="text.secondary">Her kullanıcı kendi saat diliminde belirlediğiniz saatte alır</Typography>
                                    </Box>
                                </Stack>
                            }
                        />
                        {schedule.type === ScheduleType.USER_TIMEZONE && (
                            <Stack direction="row" spacing={2} sx={{ mt: 2, ml: 4 }}>
                                <TextField type="time" size="small" label="Yerel Saat"
                                    InputLabelProps={{ shrink: true }}
                                    value={schedule.userLocalTime || '10:00'}
                                    onChange={(e) => update({ userLocalTime: e.target.value })}
                                />
                            </Stack>
                        )}
                    </CardContent>
                </Card>
            </RadioGroup>

            {/* AI Optimal Time (Future) */}
            <Card variant="outlined" sx={{ borderRadius: 2, borderStyle: 'dashed', opacity: 0.6 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AiIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography fontWeight={600}>Optimal Gönderim Zamanı (AI)</Typography>
                                <Chip size="small" label="Yakında" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#fef3c7', color: '#92400e' }} />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                AI, her kullanıcı için en optimal gönderim zamanını belirleyecek
                            </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
