import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Stack, Slider, Switch, FormControlLabel,
    TextField, Button, Divider, alpha, Grid, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    Speed as SpeedIcon, NightsStay as QuietIcon, Campaign as FreqIcon,
    Security as SpamIcon, Save as SaveIcon, RestartAlt as ResetIcon,
    Tune as TuneIcon,
} from '@mui/icons-material';
import { RateLimitConfig, createRateLimitConfig } from '../../../types/notifications/rateLimit';
import { COMMON_TIMEZONES } from '../../../types/notifications/scheduling';
import { useRateLimitConfig } from '../../../hooks/notifications/useCampaignQueries';
import { useCampaignActions } from '../../../hooks/notifications/useCampaignActions';

export default function RateLimitSettings() {
    const { data: savedConfig } = useRateLimitConfig();
    const { saveRateLimitConfig } = useCampaignActions();
    const [config, setConfig] = useState<RateLimitConfig>(createRateLimitConfig());
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (savedConfig) {
            setConfig(savedConfig);
            setHasChanges(false);
        }
    }, [savedConfig]);

    const update = (updates: Partial<RateLimitConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
        setHasChanges(true);
    };

    const handleSave = () => {
        saveRateLimitConfig.mutate(config);
        setHasChanges(false);
    };

    const handleReset = () => {
        setConfig(createRateLimitConfig());
        setHasChanges(true);
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <TuneIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Gönderim Ayarları & Korumalar</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<ResetIcon />} onClick={handleReset}
                        sx={{ textTransform: 'none' }}>Varsayılana Dön</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
                        disabled={!hasChanges || saveRateLimitConfig.isPending}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>Kaydet</Button>
                </Stack>
            </Stack>

            <Grid container spacing={3}>
                {/* Max Push Per User */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <SpeedIcon color="primary" />
                                <Typography fontWeight={700}>Kullanıcı Başına Günlük Max Push</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Bir kullanıcıya günde en fazla kaç push notification gönderilebilir?
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Slider value={config.maxPushPerUserPerDay} onChange={(_, v) => update({ maxPushPerUserPerDay: v as number })}
                                    min={1} max={20} step={1} marks valueLabelDisplay="auto"
                                    sx={{ flex: 1 }} />
                                <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ minWidth: 40, textAlign: 'center' }}>
                                    {config.maxPushPerUserPerDay}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Frequency Cap */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <FreqIcon color="warning" />
                                <Typography fontWeight={700}>Günlük Kampanya Limiti</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Günde en fazla kaç toplu kampanya gönderilebilir?
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Slider value={config.frequencyCap} onChange={(_, v) => update({ frequencyCap: v as number })}
                                    min={1} max={10} step={1} marks valueLabelDisplay="auto"
                                    color="warning" sx={{ flex: 1 }} />
                                <Typography variant="h5" fontWeight={800} color="warning.main" sx={{ minWidth: 40, textAlign: 'center' }}>
                                    {config.frequencyCap}
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Quiet Hours */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{
                        borderRadius: 2, height: '100%',
                        bgcolor: config.quietHours.enabled ? alpha('#6366f1', 0.03) : 'transparent',
                    }}>
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <QuietIcon sx={{ color: '#8b5cf6' }} />
                                    <Typography fontWeight={700}>Sessiz Saatler</Typography>
                                </Stack>
                                <FormControlLabel
                                    control={<Switch checked={config.quietHours.enabled} color="primary"
                                        onChange={(e) => update({ quietHours: { ...config.quietHours, enabled: e.target.checked } })} />}
                                    label={config.quietHours.enabled ? 'Aktif' : 'Pasif'}
                                    labelPlacement="start"
                                />
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Bu saatler arasında push notification gönderilmez.
                            </Typography>
                            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                <TextField type="number" size="small" label="Başlangıç (saat)" value={config.quietHours.startHour}
                                    onChange={(e) => update({ quietHours: { ...config.quietHours, startHour: Number(e.target.value) } })}
                                    inputProps={{ min: 0, max: 23 }} disabled={!config.quietHours.enabled} sx={{ flex: 1 }} />
                                <TextField type="number" size="small" label="Bitiş (saat)" value={config.quietHours.endHour}
                                    onChange={(e) => update({ quietHours: { ...config.quietHours, endHour: Number(e.target.value) } })}
                                    inputProps={{ min: 0, max: 23 }} disabled={!config.quietHours.enabled} sx={{ flex: 1 }} />
                            </Stack>
                            <FormControl size="small" fullWidth disabled={!config.quietHours.enabled}>
                                <InputLabel>Saat Dilimi</InputLabel>
                                <Select value={config.quietHours.timezone} label="Saat Dilimi"
                                    onChange={(e) => update({ quietHours: { ...config.quietHours, timezone: e.target.value } })}>
                                    {COMMON_TIMEZONES.map(tz => (
                                        <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {config.quietHours.enabled && (
                                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#8b5cf6', fontWeight: 600 }}>
                                    🌙 {config.quietHours.startHour}:00 – {config.quietHours.endHour}:00 arası sessiz
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Spam Detection */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                                <SpamIcon color="error" />
                                <Typography fontWeight={700}>Spam Koruma</Typography>
                            </Stack>
                            <FormControlLabel
                                control={<Switch checked={config.spamDetectionEnabled} color="error"
                                    onChange={(e) => update({ spamDetectionEnabled: e.target.checked })} />}
                                label="Spam Algılama"
                                sx={{ mb: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Benzer içerikli bildirimlerin kısa süre içinde tekrar gönderilmesini engeller.
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <FormControlLabel
                                control={<Switch checked={config.autoThrottleEnabled}
                                    onChange={(e) => update({ autoThrottleEnabled: e.target.checked })} />}
                                label="Otomatik Kısıtlama"
                            />
                            <Typography variant="body2" color="text.secondary">
                                Yüksek hacimli gönderimler otomatik olarak batch&apos;lere bölünür.
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
