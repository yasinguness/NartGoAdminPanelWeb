import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { nbOpsService, type NbBillingPlan } from '../../services/nartbusiness/nbOpsService';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { useRole } from '../../hooks/useRole';

export default function NbMemberSubscriptionCard({ memberId, onToast }: { memberId: string; onToast: (message: string) => void }) {
  const { isAdmin, hasRole } = useRole(); const canManage = isAdmin || hasRole('NB_ADMIN');
  const [plans, setPlans] = useState<NbBillingPlan[]>([]);
  const [loading, setLoading] = useState(true); const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState(''); const [days, setDays] = useState('7');
  const [offeredName, setOfferedName] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true); setLoadFailed(false); setError('');
    try {
      const [all, member] = await Promise.all([nbOpsService.billingPlans(), nbAdminService.getMember(memberId)]);
      setPlans(all.filter(p => p.active && p.oneTime && p.tierId === member?.tier?.toLowerCase()));
      const offered = member as typeof member & { offeredPlanId?: string; offeredPlanUntil?: string };
      const plan = all.find(p => p.id === offered?.offeredPlanId);
      setOfferedName(plan ? `${plan.name}${offered?.offeredPlanUntil ? ` · son gün ${new Date(offered.offeredPlanUntil).toLocaleDateString('tr-TR')}` : ''}` : undefined);
    } catch (e) { setLoadFailed(true); setError(nbErrorMessage(e, 'Üyelik planları alınamadı.')); }
    finally { setLoading(false); }
  }, [memberId]);
  useEffect(() => { void load(); }, [load]);
  async function offer(id: string | null) {
    if (busy) return; setBusy(true); setError('');
    try { await nbOpsService.offerPlan(memberId, id, id ? Number(days) : undefined); onToast(id ? 'Süreli üyelik teklifi kaydedildi.' : 'Teklif kaldırıldı.'); await load(); }
    catch (e) { setError(nbErrorMessage(e, 'Teklif kaydedilemedi.')); }
    finally { setBusy(false); }
  }
  if (loading) return <CircularProgress size={22} />;
  if (loadFailed) return <Alert severity="error" action={<Button onClick={() => void load()}>Tekrar dene</Button>}>{error}</Alert>;
  const validDays = Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365;
  return <Box>
    <Typography fontWeight={600}>Süreli üyelik ve özel teklif</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>Üye 3, 6 veya 12 ay için tek sefer ödeme yapar. Erken uzatmada kalan süre korunur. Ödeme ve dönem geçmişi bu sayfada izlenir.</Typography>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {offeredName && <Alert severity="info" sx={{ mb: 2 }}>Kayıtlı teklif: {offeredName}</Alert>}
    {!plans.length && <Alert severity="info" sx={{ mb: 2 }}>Bu paket için plan yok. Üyelik Süreleri & Ödemeler ekranından plan oluşturun.</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
      <TextField select size="small" label="Teklif edilecek plan" value={planId} disabled={!canManage || busy} onChange={e => setPlanId(e.target.value)} sx={{ minWidth: 0, flex: 1, width: { xs: '100%', sm: 'auto' } }}>{plans.map(p => <MenuItem key={p.id} value={p.id}>{p.name} · {p.durationMonths} ay · {p.price.toLocaleString('tr-TR')} TL</MenuItem>)}</TextField>
      <TextField size="small" label="Teklif geçerliliği (gün)" type="number" value={days} disabled={!canManage || busy} error={!validDays} helperText={!validDays ? '1–365 arasında tam gün girin.' : 'Üyelik süresi değil, teklifi satın alma süresi.'} onChange={e => setDays(e.target.value)} sx={{ width: { xs: '100%', sm: 190 } }} />
      <Button variant="contained" disabled={!canManage || busy || !planId || !validDays} onClick={() => void offer(planId)}>Teklif et</Button>
      <Button disabled={!canManage || busy} onClick={() => void offer(null)}>Teklifi kaldır</Button>
    </Stack>
  </Box>;
}
