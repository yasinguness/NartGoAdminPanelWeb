/**
 * Üye detayı → Üyelik & Ödeme: abonelik kartı ve üyeye özel plan teklifi.
 *
 * Abonelik yoksa üyenin hangi planı seçebileceği ve (varsa) ona özel teklif
 * görünür. Teklif: promosyon planı ya da başka bir paketin planı, süreli.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  NB_INTERVAL_LABEL,
  NB_SUBSCRIPTION_STATUS_LABEL,
  nbOpsService,
  type NbBillingPlan,
  type NbSubscription,
} from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nbPill } from './ui';
import { nb } from '../../theme/nbBrand';

const money = (n?: number | null) => (n == null ? '—' : `${Number(n).toLocaleString('tr-TR')} TL`);
const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function NbMemberSubscriptionCard({
  memberId,
  onToast,
}: {
  memberId: string;
  onToast: (message: string) => void;
}) {
  const [sub, setSub] = useState<NbSubscription | null>(null);
  const [plans, setPlans] = useState<NbBillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerPlanId, setOfferPlanId] = useState('');
  const [offerDays, setOfferDays] = useState('7');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([nbOpsService.memberSubscription(memberId), nbOpsService.billingPlans()]);
      setSub(s);
      setPlans(p.filter((x) => x.active && x.synced));
      setError(null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Abonelik bilgisi alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      onToast(ok);
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, 'İşlem yapılamadı.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <CircularProgress size={20} />;

  const live = sub && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE');

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {sub ? (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{sub.planName}</Typography>
            <Box sx={nbPill(sub.status === 'ACTIVE' ? 'good' : sub.status === 'PAST_DUE' ? 'bad' : 'neutral')}>
              {NB_SUBSCRIPTION_STATUS_LABEL[sub.status]}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: nb.textMuted }}>
            {sub.interval ? NB_INTERVAL_LABEL[sub.interval] : ''} · {money(sub.price)}
            {sub.startedAt ? ` · başlangıç ${day(sub.startedAt)}` : ''}
          </Typography>
          {live && (
            <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
              {sub.status === 'PAST_DUE'
                ? `Son tahsilat başarısız (${day(sub.failedAt)}). Ek süre ${day(sub.graceUntil)} tarihinde bitiyor.`
                : `Sonraki tahsilat: ${day(sub.currentPeriodEnd)}`}
            </Typography>
          )}
          {sub.status === 'CANCELED' && (
            <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
              {day(sub.canceledAt)} tarihinde iptal edildi; üyelik {day(sub.currentPeriodEnd)} tarihine kadar sürer.
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            {sub.status === 'PAST_DUE' && (
              <>
                <Button size="small" variant="outlined" disabled={busy} onClick={() => run(() => nbOpsService.retrySubscription(sub.id), 'Tahsilat yeniden denendi')}>
                  Tahsilatı tekrar dene
                </Button>
                <Button size="small" disabled={busy} onClick={() => run(() => nbOpsService.extendSubscriptionGrace(sub.id, 7), 'Ek süre 7 gün uzatıldı')}>
                  Ek süre +7 gün
                </Button>
              </>
            )}
            {live && (
              <Button
                size="small"
                color="error"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Abonelik iptal edilsin mi? Üye, ödenmiş dönemin sonuna kadar erişimini korur.')) {
                    void run(() => nbOpsService.cancelSubscription(sub.id), 'Abonelik iptal edildi');
                  }
                }}
              >
                Aboneliği iptal et
              </Button>
            )}
          </Stack>
        </Box>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: nb.textMuted, mb: 2 }}>
          Bu üyenin aboneliği yok. Üye portalda aylık ya da yıllık planla abone olabilir.
        </Typography>
      )}

      <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600, mb: 0.75 }}>
        ÜYEYE ÖZEL PLAN TEKLİF ET
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mb: 1 }}>
        Seçilen plan üyenin portalında görünür (ör. süreli kurucu fiyatı). Başka paketin planıysa abone olunca üyenin paketi o pakete geçer.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField select size="small" label="Plan" value={offerPlanId} onChange={(e) => setOfferPlanId(e.target.value)} sx={{ minWidth: 260 }}>
          {plans.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} — {money(p.price)}
              {p.promo ? ' (promosyon)' : ''}
            </MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="Geçerlilik (gün)" value={offerDays} onChange={(e) => setOfferDays(e.target.value)} sx={{ width: 140 }} />
        <Button
          variant="contained"
          size="small"
          disabled={busy || !offerPlanId}
          onClick={() => run(() => nbOpsService.offerPlan(memberId, offerPlanId, Number(offerDays) || undefined), 'Plan üyeye teklif edildi')}
        >
          Teklif et
        </Button>
        <Button size="small" disabled={busy} onClick={() => run(() => nbOpsService.offerPlan(memberId, null), 'Teklif kaldırıldı')}>
          Teklifi kaldır
        </Button>
      </Stack>
    </Box>
  );
}
