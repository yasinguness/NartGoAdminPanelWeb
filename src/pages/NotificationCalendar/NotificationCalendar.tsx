import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, Chip, IconButton, Switch, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Stack, Grid, alpha, useTheme, Tooltip,
  CircularProgress, Divider, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Send as SendIcon, CalendarMonth as CalendarIcon,
  Notifications as NotifIcon, Schedule as ScheduleIcon,
  Event as EventIcon, Article as ArticleIcon,
  Groups as GroupsIcon, Store as StoreIcon,
  Celebration as CelebrationIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { notificationPlanService, NotificationPlan } from '../../services/notification/notificationPlanService';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Pazartesi', TUESDAY: 'Salı', WEDNESDAY: 'Çarşamba',
  THURSDAY: 'Perşembe', FRIDAY: 'Cuma', SATURDAY: 'Cumartesi', SUNDAY: 'Pazar',
};

const CATEGORIES: { value: string; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'ETKINLIK', label: 'Etkinlik', icon: <EventIcon sx={{ fontSize: 16 }} />, color: '#4CAF50' },
  { value: 'ICERIK', label: 'İçerik', icon: <ArticleIcon sx={{ fontSize: 16 }} />, color: '#2196F3' },
  { value: 'TOPLULUK', label: 'Topluluk', icon: <GroupsIcon sx={{ fontSize: 16 }} />, color: '#9C27B0' },
  { value: 'ISLETME', label: 'İşletme', icon: <StoreIcon sx={{ fontSize: 16 }} />, color: '#FF9800' },
  { value: 'KULTUR', label: 'Kültür', icon: <CelebrationIcon sx={{ fontSize: 16 }} />, color: '#E91E63' },
];

const getCategoryMeta = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

const PLAN_TYPES = [
  { value: 'RECURRING', label: 'Haftalık Tekrar' },
  { value: 'CULTURAL', label: 'Kültürel Gün' },
  { value: 'ONE_TIME', label: 'Tek Seferlik' },
];

const TOPICS = [
  { value: 'all_users', label: 'Tüm Kullanıcılar' },
  { value: 'registered_users', label: 'Kayıtlı Kullanıcılar' },
];

const emptyPlan: Partial<NotificationPlan> = {
  name: '', category: 'ETKINLIK', weekNumber: 0, dayOfWeek: 'MONDAY',
  sendTime: '10:00', title: '', body: '', targetTopic: 'all_users',
  priority: 'NORMAL', active: true, planType: 'RECURRING', sortOrder: 0,
};

export default function NotificationCalendar() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [plans, setPlans] = useState<NotificationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<NotificationPlan>>(emptyPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await notificationPlanService.list();
      setPlans(data || []);
    } catch { enqueueSnackbar('Planlar yüklenemedi', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  // Planları güne göre grupla
  const plansByDay = useMemo(() => {
    const map: Record<string, NotificationPlan[]> = {};
    DAYS.forEach(d => { map[d] = []; });
    plans.filter(p => p.planType === 'RECURRING').forEach(p => {
      if (map[p.dayOfWeek]) map[p.dayOfWeek].push(p);
    });
    return map;
  }, [plans]);

  const culturalPlans = useMemo(() => plans.filter(p => p.planType === 'CULTURAL'), [plans]);

  const openCreate = () => {
    setEditingId(null);
    setEditingPlan({ ...emptyPlan });
    setDialogOpen(true);
  };

  const openEdit = (plan: NotificationPlan) => {
    setEditingId(plan.id);
    setEditingPlan({ ...plan });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPlan.name || !editingPlan.title || !editingPlan.body) {
      enqueueSnackbar('Ad, başlık ve metin zorunludur', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await notificationPlanService.update(editingId, editingPlan);
        enqueueSnackbar('Plan güncellendi', { variant: 'success' });
      } else {
        await notificationPlanService.create(editingPlan);
        enqueueSnackbar('Plan oluşturuldu', { variant: 'success' });
      }
      setDialogOpen(false);
      fetchPlans();
    } catch { enqueueSnackbar('Kaydetme hatası', { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationPlanService.delete(id);
      enqueueSnackbar('Plan silindi', { variant: 'success' });
      fetchPlans();
    } catch { enqueueSnackbar('Silme hatası', { variant: 'error' }); }
  };

  const handleToggle = async (id: string) => {
    try {
      await notificationPlanService.toggleActive(id);
      fetchPlans();
    } catch { enqueueSnackbar('Durum değiştirme hatası', { variant: 'error' }); }
  };

  const handleSendNow = async (id: string) => {
    try {
      await notificationPlanService.sendNow(id);
      enqueueSnackbar('Bildirim gönderildi', { variant: 'success' });
      fetchPlans();
    } catch { enqueueSnackbar('Gönderim hatası', { variant: 'error' }); }
  };

  const [seeding, setSeeding] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const result = await notificationPlanService.seedDefaults();
      enqueueSnackbar(`${(result as any).count || 14} varsayılan plan oluşturuldu`, { variant: 'success' });
      setSeedConfirmOpen(false);
      fetchPlans();
    } catch { enqueueSnackbar('Varsayılan planlar yüklenemedi', { variant: 'error' }); }
    finally { setSeeding(false); }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Bildirim Takvimi</Typography>
          <Typography variant="body2" color="text.secondary">
            Haftalık tekrarlayan ve kültürel gün bildirimlerini yönetin
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {plans.length === 0 && (
            <Button variant="outlined" color="secondary" onClick={() => setSeedConfirmOpen(true)}
              startIcon={<ScheduleIcon />} sx={{ borderRadius: 2 }}>
              Varsayılan Planları Yükle
            </Button>
          )}
          {plans.length > 0 && (
            <Button variant="text" color="warning" size="small" onClick={() => setSeedConfirmOpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 12 }}>
              Planları Sıfırla
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ borderRadius: 2 }}>
            Yeni Plan
          </Button>
        </Stack>
      </Box>

      {/* Seed onay dialog */}
      <Dialog open={seedConfirmOpen} onClose={() => setSeedConfirmOpen(false)}>
        <DialogTitle>
          {plans.length === 0 ? 'Varsayılan Planları Yükle' : 'Planları Sıfırla'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {plans.length === 0
              ? '30 günlük bildirim planı (12 haftalık + 2 kültürel gün) otomatik oluşturulacak. Tüm planlar daha sonra düzenlenebilir.'
              : 'Mevcut tüm planlar silinecek ve varsayılan 14 plan yeniden oluşturulacak. Bu işlem geri alınamaz.'
            }
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Hafta 1-4 tekrarlayan planlar + Çerkes Sürgünü Anma Günü + Çerkes Bayrağı Günü
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedConfirmOpen(false)}>İptal</Button>
          <Button variant="contained" color={plans.length === 0 ? 'primary' : 'warning'}
            onClick={handleSeedDefaults} disabled={seeding}
            startIcon={seeding ? <CircularProgress size={16} /> : undefined}>
            {seeding ? 'Yükleniyor...' : plans.length === 0 ? 'Planları Oluştur' : 'Sıfırla ve Yeniden Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Özet kartlar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Toplam Plan', value: plans.length, color: 'primary' as const },
          { label: 'Aktif', value: plans.filter(p => p.active).length, color: 'success' as const },
          { label: 'Bu Hafta', value: plans.filter(p => p.planType === 'RECURRING' && p.active).length, color: 'info' as const },
          { label: 'Kültürel', value: culturalPlans.length, color: 'secondary' as const },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={800} color={`${s.color}.main`}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Haftalık takvim */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        <CalendarIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
        Haftalık Plan
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {DAYS.map(day => (
          <Grid item xs={12} sm={6} md={12 / 7} key={day}>
            <Paper variant="outlined" sx={{
              p: 1.5, borderRadius: 2, minHeight: 140,
              borderColor: plansByDay[day].length > 0 ? 'primary.main' : 'divider',
              bgcolor: plansByDay[day].length > 0 ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
            }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {DAY_LABELS[day]}
              </Typography>

              {plansByDay[day].length === 0 ? (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                  Bildirim yok
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {plansByDay[day].map(plan => {
                    const cat = getCategoryMeta(plan.category);
                    return (
                      <Tooltip key={plan.id} title={`${plan.title} — ${plan.sendTime}`} arrow>
                        <Paper
                          variant="outlined"
                          onClick={() => openEdit(plan)}
                          sx={{
                            p: 0.8, cursor: 'pointer', borderRadius: 1.5,
                            opacity: plan.active ? 1 : 0.4,
                            borderLeft: `3px solid ${cat.color}`,
                            '&:hover': { bgcolor: alpha(cat.color, 0.06) },
                          }}
                        >
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {cat.icon}
                            <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, fontSize: 10 }}>
                              {plan.name}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                              {plan.sendTime}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Tooltip>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Kültürel günler */}
      {culturalPlans.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            <CelebrationIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
            Kültürel Gün Bildirimleri
          </Typography>
          <Stack spacing={1} sx={{ mb: 4 }}>
            {culturalPlans.map(plan => (
              <Paper key={plan.id} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={plan.fixedDate || '—'} size="small" color="secondary" sx={{ fontWeight: 700, minWidth: 60 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{plan.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{plan.title}</Typography>
                </Box>
                <Switch checked={plan.active} onChange={() => handleToggle(plan.id)} size="small" />
                <IconButton size="small" onClick={() => openEdit(plan)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(plan.id)}><DeleteIcon fontSize="small" /></IconButton>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Tüm planlar listesi */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
        <NotifIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
        Tüm Planlar ({plans.length})
      </Typography>

      <Stack spacing={1}>
        {plans.map(plan => {
          const cat = getCategoryMeta(plan.category);
          return (
            <Paper key={plan.id} variant="outlined" sx={{
              p: 2, borderRadius: 2, opacity: plan.active ? 1 : 0.5,
              borderLeft: `4px solid ${cat.color}`,
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={700}>{plan.name}</Typography>
                    <Chip label={cat.label} size="small" icon={cat.icon as any}
                      sx={{ height: 22, fontSize: 10, bgcolor: alpha(cat.color, 0.1), color: cat.color }} />
                    <Chip label={plan.planType === 'RECURRING' ? `${DAY_LABELS[plan.dayOfWeek]} ${plan.sendTime}` : plan.fixedDate || '—'}
                      size="small" variant="outlined" sx={{ height: 22, fontSize: 10 }} />
                    <Chip label={plan.targetTopic === 'all_users' ? 'Tüm Kullanıcılar' : 'Kayıtlı'}
                      size="small" variant="outlined" sx={{ height: 20, fontSize: 9 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, display: 'block' }}>
                    {plan.title} — {plan.body.substring(0, 80)}{plan.body.length > 80 ? '...' : ''}
                  </Typography>
                  {plan.lastSentAt && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                      Son gönderim: {new Date(plan.lastSentAt).toLocaleString('tr-TR')} · Toplam: {plan.totalSentCount}
                    </Typography>
                  )}
                </Box>

                <Switch checked={plan.active} onChange={() => handleToggle(plan.id)} size="small" />
                <Tooltip title="Şimdi Gönder">
                  <IconButton size="small" color="primary" onClick={() => handleSendNow(plan.id)}>
                    <SendIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => openEdit(plan)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(plan.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Plan oluşturma/düzenleme dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingId ? 'Plan Düzenle' : 'Yeni Bildirim Planı'}
          <IconButton onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField fullWidth label="Plan Adı" value={editingPlan.name || ''}
              onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))}
              placeholder="Hafta 1 Pazartesi Etkinlik" />

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Kategori</InputLabel>
                <Select value={editingPlan.category || 'ETKINLIK'} label="Kategori"
                  onChange={e => setEditingPlan(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Plan Türü</InputLabel>
                <Select value={editingPlan.planType || 'RECURRING'} label="Plan Türü"
                  onChange={e => setEditingPlan(p => ({ ...p, planType: e.target.value }))}>
                  {PLAN_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            {editingPlan.planType === 'RECURRING' && (
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Gün</InputLabel>
                  <Select value={editingPlan.dayOfWeek || 'MONDAY'} label="Gün"
                    onChange={e => setEditingPlan(p => ({ ...p, dayOfWeek: e.target.value }))}>
                    {DAYS.map(d => <MenuItem key={d} value={d}>{DAY_LABELS[d]}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Hafta</InputLabel>
                  <Select value={editingPlan.weekNumber ?? 0} label="Hafta"
                    onChange={e => setEditingPlan(p => ({ ...p, weekNumber: Number(e.target.value) }))}>
                    <MenuItem value={0}>Her hafta</MenuItem>
                    <MenuItem value={1}>1. hafta</MenuItem>
                    <MenuItem value={2}>2. hafta</MenuItem>
                    <MenuItem value={3}>3. hafta</MenuItem>
                    <MenuItem value={4}>4. hafta</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            )}

            {editingPlan.planType === 'CULTURAL' && (
              <TextField fullWidth label="Tarih (AA-GG)" size="small" value={editingPlan.fixedDate || ''}
                onChange={e => setEditingPlan(p => ({ ...p, fixedDate: e.target.value }))}
                placeholder="05-21" helperText="Ay-Gün formatı (ör: 05-21 = 21 Mayıs)" />
            )}

            <TextField fullWidth label="Gönderim Saati" size="small" type="time" value={editingPlan.sendTime || '10:00'}
              onChange={e => setEditingPlan(p => ({ ...p, sendTime: e.target.value }))} />

            <Divider />

            <TextField fullWidth label="Bildirim Başlığı" value={editingPlan.title || ''}
              onChange={e => setEditingPlan(p => ({ ...p, title: e.target.value }))}
              placeholder="Bu hafta {şehir}'de {x} etkinlik var!" />

            <TextField fullWidth label="Bildirim Metni" multiline rows={3} value={editingPlan.body || ''}
              onChange={e => setEditingPlan(p => ({ ...p, body: e.target.value }))}
              placeholder="Hafta sonu planın hazır mı? Etkinlikleri keşfet" />

            <TextField fullWidth label="Deep Link (opsiyonel)" size="small" value={editingPlan.deepLink || ''}
              onChange={e => setEditingPlan(p => ({ ...p, deepLink: e.target.value }))}
              placeholder="nartgo://events" />

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Hedef</InputLabel>
                <Select value={editingPlan.targetTopic || 'all_users'} label="Hedef"
                  onChange={e => setEditingPlan(p => ({ ...p, targetTopic: e.target.value }))}>
                  {TOPICS.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Öncelik</InputLabel>
                <Select value={editingPlan.priority || 'NORMAL'} label="Öncelik"
                  onChange={e => setEditingPlan(p => ({ ...p, priority: e.target.value }))}>
                  <MenuItem value="LOW">Düşük</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="HIGH">Yüksek</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}>
            {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
