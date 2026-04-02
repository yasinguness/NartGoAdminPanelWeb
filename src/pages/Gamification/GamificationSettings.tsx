import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Grid, InputAdornment, Stack, Switch, TextField,
  Typography, useTheme, Avatar, LinearProgress, Tooltip, IconButton, Tabs, Tab,
  alpha, Divider,
} from '@mui/material';
import {
  Edit as EditIcon, Refresh as RefreshIcon, Save as SaveIcon,
  Star as StarIcon, EmojiEvents as TrophyIcon, AccessTime as TimeIcon,
  Block as BlockIcon, LooksOne as RankOneIcon, LooksTwo as RankTwoIcon,
  Looks3 as RankThreeIcon, Category as CategoryIcon, Delete as DeleteIcon,
  Add as AddIcon, Bolt as BoltIcon, Shield as ShieldIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import { PageContainer, PageHeader } from '../../components/Page';
import {
  GamificationActionAdminDto, GamificationConfigDto, GamificationDailySocialCapDto,
  GamificationMonthlyRewardsDto, MonthlyRewardItemDto, GamificationConfigRecordDto,
} from '../../types/gamification/gamificationAdmin';
import { gamificationAdminService } from '../../services/gamification/gamificationAdminService';

// ─── Helpers ────────────────────────────────────────────────────────────────
const colorRegex = /^[A-Fa-f0-9]{6}$/;
const resetTimeRegex = /^([01]\d|2[0-3]):[0-5]\d UTC$/;

const getErr = (e: unknown): string => {
  const ax = e as AxiosError<{ message?: string }>;
  return ax?.response?.data?.message || (e instanceof Error ? e.message : 'Bilinmeyen hata');
};

const validateCap = (c: GamificationDailySocialCapDto): string | null => {
  if (c.maxXp < 0) return 'Günlük maks sosyal puan 0+ olmalı.';
  if (!resetTimeRegex.test(c.resetTime)) return 'Sıfırlanma saati "HH:mm UTC" formatında olmalı.';
  if (!c.affectedCategories.length) return 'En az bir kategori seçilmeli.';
  return null;
};

const validateAction = (a: GamificationActionAdminDto, max: number): string | null => {
  if (a.xp < 0 || a.xp > 500) return `${a.label || a.reason}: puan 0-500 arası olmalı.`;
  if (a.xp > max) return `${a.label || a.reason}: genel barajı aşıyor.`;
  return null;
};

const validateRewards = (m: GamificationMonthlyRewardsDto): string | null => {
  const rewards = Array.isArray(m.rewards) ? m.rewards : [];
  if (rewards.length < 3) return 'İlk 3 derece tanımlanmalı.';
  for (const r of rewards) {
    if (!r.title.trim()) return `${r.rank}. derece başlığı zorunlu.`;
    if (!r.description.trim()) return `${r.rank}. derece açıklaması zorunlu.`;
    if (!colorRegex.test(r.color)) return `${r.rank}. derece renk kodu geçersiz.`;
  }
  return null;
};

const RANK_COLORS: Record<number, string> = { 1: '#f59e0b', 2: '#94a3b8', 3: '#cd7f32' };
const RANK_LABELS: Record<number, string> = { 1: 'Altın', 2: 'Gümüş', 3: 'Bronz' };
const RANK_ICONS: Record<number, React.ReactNode> = {
  1: <RankOneIcon sx={{ fontSize: 28 }} />,
  2: <RankTwoIcon sx={{ fontSize: 28 }} />,
  3: <RankThreeIcon sx={{ fontSize: 28 }} />,
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function GamificationSettings() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allConfigs, setAllConfigs] = useState<GamificationConfigRecordDto[]>([]);
  const [selectedKey, setSelectedKey] = useState('DEFAULT');
  const [config, setConfig] = useState<GamificationConfigDto | null>(null);
  const [editingAction, setEditingAction] = useState<GamificationActionAdminDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0: Actions, 1: Limits, 2: Rewards

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const records = await gamificationAdminService.getConfigs();
      setAllConfigs(records);
      const current = records.find(r => r.configKey === selectedKey) || records[0];
      if (current) { setSelectedKey(current.configKey); setConfig(current.config); }
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedKey, enqueueSnackbar]);

  useEffect(() => { loadAll(); }, []);

  const loadConfig = useCallback(async (key: string) => {
    try {
      setLoading(true);
      const data = await gamificationAdminService.getConfigByKey(key);
      setConfig(data.config);
      setSelectedKey(data.configKey);
    } catch (e) {
      enqueueSnackbar('Yüklenemedi: ' + getErr(e), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!config) return;
    if (config.maxXpPerAction < 0 || config.maxXpPerAction > 500) { enqueueSnackbar('Maks puan 0-500 arası olmalı.', { variant: 'error' }); return; }
    const capErr = validateCap(config.dailySocialCap);
    if (capErr) { enqueueSnackbar(capErr, { variant: 'error' }); return; }
    const rewErr = validateRewards(config.monthlyRewards);
    if (rewErr) { enqueueSnackbar(rewErr, { variant: 'error' }); return; }
    const actErr = config.actions.map(a => validateAction(a, config.maxXpPerAction)).find(Boolean);
    if (actErr) { enqueueSnackbar(actErr, { variant: 'error' }); return; }

    try {
      setSaving(true);
      await gamificationAdminService.updateConfigByKey(selectedKey, config);
      enqueueSnackbar(`${selectedKey} kaydedildi`, { variant: 'success' });
      loadAll();
    } catch (e) { enqueueSnackbar(getErr(e), { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newKey.trim() || !config) return;
    try {
      setSaving(true);
      const key = newKey.trim().toUpperCase();
      await gamificationAdminService.createConfig({ configKey: key, config });
      enqueueSnackbar('Oluşturuldu: ' + key, { variant: 'success' });
      setCreateOpen(false); setNewKey(''); setSelectedKey(key); loadAll();
    } catch (e) { enqueueSnackbar(getErr(e), { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (key: string) => {
    if (key === 'DEFAULT' || !window.confirm(`${key} silinecek?`)) return;
    try {
      setSaving(true);
      await gamificationAdminService.deleteConfig(key);
      enqueueSnackbar('Silindi: ' + key, { variant: 'success' });
      if (selectedKey === key) setSelectedKey('DEFAULT');
      loadAll();
    } catch (e) { enqueueSnackbar(getErr(e), { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleEditSave = () => {
    if (!config || !editingAction) return;
    const err = validateAction(editingAction, config.maxXpPerAction);
    if (err) { enqueueSnackbar(err, { variant: 'error' }); return; }
    setConfig(prev => prev ? { ...prev, actions: prev.actions.map(a => a.reason === editingAction.reason ? editingAction : a) } : prev);
    setEditingAction(null);
  };

  const updateReward = (rank: number, fn: (r: MonthlyRewardItemDto) => MonthlyRewardItemDto) => {
    setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, rewards: prev.monthlyRewards.rewards.map(r => r.rank === rank ? fn(r) : r) } } : prev);
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!config) return { totalActions: 0, avgXp: 0, maxXp: 0, categories: 0, dailyCapped: 0 };
    const xps = config.actions.map(a => a.xp);
    const cats = new Set(config.actions.map(a => a.category));
    return {
      totalActions: config.actions.length,
      avgXp: xps.length ? Math.round(xps.reduce((a, b) => a + b, 0) / xps.length) : 0,
      maxXp: Math.max(...xps, 0),
      categories: cats.size,
      dailyCapped: config.actions.filter(a => a.dailyCap).length,
    };
  }, [config]);

  if (loading && !config) {
    return (
      <PageContainer>
        <Box sx={{ py: 20, textAlign: 'center' }}>
          <LinearProgress sx={{ maxWidth: 300, mx: 'auto', mb: 2 }} />
          <Typography color="text.secondary">Oyunlaştırma ayarları yükleniyor...</Typography>
        </Box>
      </PageContainer>
    );
  }

  if (!config) return null;

  const sortedRewards = [...config.monthlyRewards.rewards].sort((a, b) => a.rank - b.rank);

  return (
    <PageContainer>
      {saving && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300, height: 3 }} />}

      <PageHeader
        title="Oyunlaştırma Ayarları"
        subtitle={`"${selectedKey}" konfigürasyonu üzerinde düzenleme yapıyorsunuz`}
        breadcrumbs={[{ label: 'Panel', href: '/dashboard' }, { label: 'Oyunlaştırma' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
              Yenile
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Kaydet
            </Button>
          </Stack>
        }
      />

      {/* ─── Summary Cards ─── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Toplam Aksiyon', value: stats.totalActions, color: theme.palette.primary.main, icon: <BoltIcon /> },
          { label: 'Ort. XP', value: stats.avgXp, color: '#f59e0b', icon: <StarIcon /> },
          { label: 'Maks XP / İşlem', value: config.maxXpPerAction, color: '#3b82f6', icon: <ShieldIcon /> },
          { label: 'Günlük Limit', value: `${config.dailySocialCap.maxXp} XP`, color: '#ef4444', icon: <BlockIcon /> },
          { label: 'Kalan Süre', value: `${config.monthlyRewards.daysRemaining || 0} gün`, color: '#8b5cf6', icon: <TimeIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2.4} key={i}>
            <Card elevation={0} sx={{
              p: 2, borderRadius: 3,
              background: `linear-gradient(135deg, ${alpha(s.color, 0.08)} 0%, ${alpha(s.color, 0.03)} 100%)`,
              border: `1px solid ${alpha(s.color, 0.12)}`,
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: s.color, mt: 0.5 }}>{s.value}</Typography>
                </Box>
                <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(s.color, 0.12), color: s.color, borderRadius: 2 }}>
                  {s.icon}
                </Avatar>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Config Selector + Tabs ─── */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 3 }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 0, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Config chips */}
          <Stack direction="row" spacing={0.75} sx={{ flex: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {allConfigs.map(r => (
              <Chip
                key={r.configKey}
                label={r.configKey}
                onClick={() => loadConfig(r.configKey)}
                onDelete={r.configKey !== 'DEFAULT' ? () => handleDelete(r.configKey) : undefined}
                color={selectedKey === r.configKey ? 'primary' : 'default'}
                variant={selectedKey === r.configKey ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, borderRadius: 2 }}
              />
            ))}
            <Chip
              icon={<AddIcon />}
              label="Yeni"
              onClick={() => setCreateOpen(true)}
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: 2, borderStyle: 'dashed' }}
            />
          </Stack>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2.5, borderBottom: `1px solid ${theme.palette.divider}`, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13 } }}
        >
          <Tab icon={<BoltIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Puan Aksiyonları" />
          <Tab icon={<ShieldIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Limitler & Sıfırlama" />
          <Tab icon={<TrophyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Aylık Ödüller" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ── TAB 0: Actions ── */}
          {activeTab === 0 && (
            <Stack spacing={1}>
              {config.actions.map((action) => {
                const maxXp = Math.max(...config.actions.map(a => a.xp), 1);
                const pct = (action.xp / maxXp) * 100;
                return (
                  <Box key={action.reason} sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.3), bgcolor: alpha(theme.palette.primary.main, 0.02) },
                  }}>
                    <Avatar sx={{
                      width: 36, height: 36, borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', fontSize: 14,
                    }}>
                      <StarIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>{action.label || action.reason}</Typography>
                        <Chip label={action.category} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
                        {action.dailyCap && (
                          <Chip label="Günlük Limit" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 600 }} />
                        )}
                      </Stack>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>{action.description || action.reason}</Typography>
                    </Box>
                    <Box sx={{ width: 120, mr: 1 }}>
                      <Stack direction="row" justifyContent="space-between" mb={0.25}>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>XP</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'primary.main', fontFamily: 'monospace' }}>+{action.xp}</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={pct} sx={{
                        height: 4, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '& .MuiLinearProgress-bar': { borderRadius: 2, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})` },
                      }} />
                    </Box>
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => setEditingAction({ ...action })} sx={{ color: 'text.secondary' }}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* ── TAB 1: Limits ── */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha('#ef4444', 0.1), color: '#ef4444', borderRadius: 1.5 }}>
                      <BlockIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>Limit Değerleri</Typography>
                  </Stack>
                  <TextField type="number" label="Günlük Maks Sosyal Puan" size="small" fullWidth
                    value={config.dailySocialCap.maxXp}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, dailySocialCap: { ...prev.dailySocialCap, maxXp: Number(e.target.value) || 0 } } : prev)}
                    helperText="Sosyal etkileşimlerle günlük kazanılacak maks XP" />
                  <TextField type="number" label="Tek İşlemde Maks Puan" size="small" fullWidth
                    value={config.maxXpPerAction}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, maxXpPerAction: Number(e.target.value) || 0 } : prev)}
                    helperText="Herhangi bir aksiyonda alınabilecek limit" />
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6', borderRadius: 1.5 }}>
                      <TimeIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>Sıfırlanma</Typography>
                  </Stack>
                  <TextField label="Günlük Sıfırlanma Saati (UTC)" size="small" fullWidth
                    value={config.dailySocialCap.resetTime}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, dailySocialCap: { ...prev.dailySocialCap, resetTime: e.target.value } } : prev)}
                    helperText='Format: "HH:mm UTC" (Örn: 00:00 UTC)' />
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha('#8b5cf6', 0.1), color: '#8b5cf6', borderRadius: 1.5 }}>
                      <CategoryIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>Etkilenen Kategoriler</Typography>
                  </Stack>
                  <TextField label="Kategoriler (virgülle ayır)" size="small" fullWidth
                    value={config.dailySocialCap.affectedCategories.join(', ')}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, dailySocialCap: { ...prev.dailySocialCap, affectedCategories: e.target.value.split(',').map(v => v.trim()).filter(Boolean) } } : prev)}
                    helperText="Örn: social, community" />
                  {config.dailySocialCap.affectedCategories.length > 0 && (
                    <Stack direction="row" gap={0.75} flexWrap="wrap">
                      {config.dailySocialCap.affectedCategories.map((c, i) => (
                        <Chip key={i} label={c} size="small" color="primary" variant="outlined" sx={{ borderRadius: 1.5 }} />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 2: Rewards ── */}
          {activeTab === 2 && (
            <Stack spacing={3}>
              {/* Period info */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField label="Periyot Başlığı" size="small" fullWidth value={config.monthlyRewards.month || ''}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, month: e.target.value } } : prev)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField label="Kampanya Başlığı" size="small" fullWidth value={config.monthlyRewards.title || ''}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, title: e.target.value } } : prev)} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField type="number" label="Dönem (Gün)" size="small" fullWidth value={config.monthlyRewards.periodDays || 0}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, periodDays: Number(e.target.value) || 0 } } : prev)} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField type="number" label="Sıfırlama (Gün)" size="small" fullWidth value={config.monthlyRewards.resetEveryDays || 0}
                    onChange={(e) => setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, resetEveryDays: Number(e.target.value) || 0 } } : prev)} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField label="Kalan" size="small" fullWidth value={`${config.monthlyRewards.daysRemaining || 0} gün`} disabled />
                </Grid>
              </Grid>

              <TextField label="Kampanya Açıklaması" size="small" fullWidth multiline rows={2}
                value={config.monthlyRewards.description || ''}
                onChange={(e) => setConfig(prev => prev ? { ...prev, monthlyRewards: { ...prev.monthlyRewards, description: e.target.value } } : prev)} />

              <Divider />

              {/* Reward cards */}
              <Grid container spacing={2.5}>
                {sortedRewards.map((reward) => {
                  const rc = RANK_COLORS[reward.rank] || '#6b7280';
                  return (
                    <Grid item xs={12} md={4} key={reward.rank}>
                      <Card elevation={0} sx={{
                        height: '100%', borderRadius: 3,
                        border: `1px solid ${alpha(rc, 0.2)}`,
                        background: `linear-gradient(180deg, ${alpha(rc, 0.06)} 0%, transparent 40%)`,
                        overflow: 'visible',
                      }}>
                        {/* Medal header */}
                        <Box sx={{
                          px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                          borderBottom: `1px solid ${alpha(rc, 0.12)}`,
                        }}>
                          <Avatar sx={{
                            width: 44, height: 44, borderRadius: 2.5,
                            bgcolor: alpha(rc, 0.15), color: rc,
                          }}>
                            {RANK_ICONS[reward.rank] || <TrophyIcon />}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: 15, fontWeight: 800, color: rc }}>
                              {reward.rank}. Sıra — {RANK_LABELS[reward.rank] || 'Ödül'}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              Liderlik tablosu ödülü
                            </Typography>
                          </Box>
                        </Box>

                        <CardContent sx={{ p: 2.5 }}>
                          <Stack spacing={2}>
                            <TextField label="Ödül Başlığı" size="small" fullWidth value={reward.title} placeholder="200₺ Hediye Çeki"
                              onChange={(e) => updateReward(reward.rank, r => ({ ...r, title: e.target.value }))} />
                            <TextField label="Açıklama" size="small" fullWidth multiline rows={2} value={reward.description}
                              onChange={(e) => updateReward(reward.rank, r => ({ ...r, description: e.target.value }))} />
                            <Stack direction="row" spacing={1.5}>
                              <TextField label="İkon" size="small" fullWidth value={reward.icon} placeholder="local_activity"
                                onChange={(e) => updateReward(reward.rank, r => ({ ...r, icon: e.target.value }))} />
                              <TextField label="Renk (HEX)" size="small" fullWidth value={reward.color} placeholder="FFD700"
                                onChange={(e) => updateReward(reward.rank, r => ({ ...r, color: e.target.value.toUpperCase().replace(/^#/, '') }))}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <Box sx={{
                                        width: 20, height: 20, borderRadius: '50%',
                                        backgroundColor: colorRegex.test(reward.color) ? `#${reward.color}` : '#ddd',
                                        border: `1px solid ${theme.palette.divider}`,
                                      }} />
                                    </InputAdornment>
                                  ),
                                }} />
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Stack>
          )}
        </Box>
      </Card>

      {/* ─── Edit Action Dialog ─── */}
      <Dialog open={!!editingAction} onClose={() => setEditingAction(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Aksiyon Puanlamasını Düzenle</DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {editingAction && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Sistem Kodu" value={editingAction.reason} disabled fullWidth size="small" helperText="Değiştirilemez" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField type="number" label="Kazanılacak Puan (XP)" value={editingAction.xp} fullWidth size="small"
                  onChange={(e) => setEditingAction(prev => prev ? { ...prev, xp: Number(e.target.value) || 0 } : prev)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><StarIcon color="primary" sx={{ fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Kullanıcıya Gösterilecek Etiket" value={editingAction.label} fullWidth size="small"
                  onChange={(e) => setEditingAction(prev => prev ? { ...prev, label: e.target.value } : prev)} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Detaylı Açıklama" value={editingAction.description} fullWidth size="small" multiline rows={2}
                  onChange={(e) => setEditingAction(prev => prev ? { ...prev, description: e.target.value } : prev)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Kategori" value={editingAction.category} fullWidth size="small"
                  onChange={(e) => setEditingAction(prev => prev ? { ...prev, category: e.target.value } : prev)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="İkon" value={editingAction.icon} fullWidth size="small"
                  onChange={(e) => setEditingAction(prev => prev ? { ...prev, icon: e.target.value } : prev)} />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.default' }}>
                  <FormControlLabel
                    control={<Switch checked={!!editingAction.dailyCap} onChange={(e) => setEditingAction(prev => prev ? { ...prev, dailyCap: e.target.checked } : prev)} />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>Günlük Sosyal Limite Tabi</Typography>
                        <Typography variant="caption" color="text.secondary">Aktifse, günlük sosyal XP kotasından harcar</Typography>
                      </Box>
                    }
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditingAction(null)} sx={{ textTransform: 'none', borderRadius: 2 }}>İptal</Button>
          <Button variant="contained" onClick={handleEditSave} startIcon={<SaveIcon />} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Create Config Dialog ─── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Yeni Konfigürasyon</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField label="Konfigürasyon Anahtarı" placeholder="RAMAZAN_PAKETI" fullWidth size="small"
              value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase().trim())}
              helperText="Boşluk bırakmayın. Mevcut ayarlar kopyalanacak." />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', borderRadius: 2 }}>İptal</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newKey.trim() || saving} startIcon={<SaveIcon />}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>Oluştur</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
