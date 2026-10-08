/**
 * Abonelik & Planlar — aylık/yıllık fiyat planları ve üye abonelikleri.
 *
 * Fiyat değişikliği: iyzico'da bir planın fiyatı değiştirilemez. "Yeni fiyat"
 * aynı paket ve aralıktaki eski genel planı emekliye ayırır, yeni plan açar;
 * eski planın aboneleri eski fiyattan devam eder (tablodaki "abone" sütunu).
 * Promosyon planı genel listede görünmez, yalnız teklif edilen üyeye çıkar
 * (Üye detayı → Üyelik & Ödeme → Plan teklif et).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  MenuItem,
  Pagination,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  NB_INTERVAL_LABEL,
  NB_SUBSCRIPTION_STATUS_LABEL,
  nbOpsService,
  type NbBillingInterval,
  type NbBillingPlan,
  type NbSubscription,
  type NbSubscriptionStatus,
  type NbSubscriptionSummary,
} from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import {
  NbFilterBar,
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbCard,
  nbDividerLine,
  nbGrid,
  nbHeadRow,
  nbPill,
  type NbUndoState,
} from '../../components/nartbusiness/ui';
import { nb } from '../../theme/nbBrand';

const PLAN_GRID = 'minmax(0,1.6fr) 90px 120px 120px 90px minmax(0,1.4fr)';
const SUB_GRID = 'minmax(0,1.6fr) minmax(0,1.3fr) 120px 130px 130px minmax(0,1.4fr)';

const money = (n?: number | null, c = 'TRY') =>
  n == null ? '—' : `${Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${c === 'TRY' ? 'TL' : c}`;
const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function statusTone(s: NbSubscriptionStatus) {
  if (s === 'ACTIVE') return 'good' as const;
  if (s === 'PAST_DUE') return 'bad' as const;
  if (s === 'PENDING') return 'warn' as const;
  return 'neutral' as const;
}

const SUB_FILTERS: { key: NbSubscriptionStatus; label: string }[] = [
  { key: 'ACTIVE', label: 'Aktif' },
  { key: 'PAST_DUE', label: 'Ödemesi gecikmiş' },
  { key: 'CANCELED', label: 'İptal' },
  { key: 'PENDING', label: 'Ödeme tamamlanmadı' },
  { key: 'EXPIRED', label: 'Sona erdi' },
];

interface NewPlanForm {
  tierId: string;
  interval: NbBillingInterval;
  price: string;
  name: string;
  promo: boolean;
}

export default function NbBilling() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<NbBillingPlan[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  const [summary, setSummary] = useState<NbSubscriptionSummary | null>(null);
  const [filter, setFilter] = useState<NbSubscriptionStatus | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NewPlanForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await nbOpsService.billingPlans());
    } catch (e) {
      setError(nbErrorMessage(e, 'Planlar yüklenemedi.'));
    }
  }, []);

  const loadSubs = useCallback(async () => {
    try {
      setSummary(await nbOpsService.subscriptions({ status: filter ?? undefined, page, size: 25 }));
    } catch (e) {
      setError(nbErrorMessage(e, 'Abonelikler yüklenemedi.'));
    }
  }, [filter, page]);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadPlans(), loadSubs()]).finally(() => setLoading(false));
  }, [loadPlans, loadSubs]);

  const tiers = useMemo(() => {
    const m = new Map<string, string>();
    plans.forEach((p) => m.set(p.tierId, p.tierName));
    return [...m.entries()];
  }, [plans]);

  const visiblePlans = plans.filter((p) => showRetired || p.active);

  const act = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true);
    try {
      await fn();
      setUndo({ message: ok });
      await Promise.all([loadPlans(), loadSubs()]);
    } catch (e) {
      setError(nbErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  };

  const savePlan = async () => {
    if (!form) return;
    const price = Number(form.price.replace(',', '.'));
    if (!form.tierId || !(price >= 1)) {
      setError('Paket ve geçerli bir fiyat girin.');
      return;
    }
    const f = form;
    setForm(null);
    await act(
      () => nbOpsService.createBillingPlan({ tierId: f.tierId, interval: f.interval, price, name: f.name || undefined, promo: f.promo }),
      f.promo ? 'Özel teklif planı oluşturuldu' : 'Yeni fiyat kaydedildi; önceki plan kullanımdan kaldırıldı',
      'Plan kaydedilemedi.',
    );
  };

  const rows = summary?.page.content ?? [];

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Üyelik"
        title="Abonelik & Planlar"
        subtitle="Aylık ve yıllık fiyatlar, iyzico eşitlemesi ve üye abonelikleri. Fiyat değiştiğinde mevcut aboneler önceki fiyattan devam eder."
        kpis={
          <>
            <NbKpi label="AYLIK TEKRARLAYAN GELİR" value={summary ? money(summary.monthlyRecurringRevenue) : '—'} hint="yıllık planlar 12 aya bölünür" tone="good" />
            <NbKpi
              label="AKTİF ABONE"
              value={summary?.active ?? '—'}
              active={filter === 'ACTIVE'}
              onClick={() => setFilter((f) => (f === 'ACTIVE' ? null : 'ACTIVE'))}
            />
            <NbKpi
              label="ÖDEMESİ GECİKEN"
              value={summary?.pastDue ?? '—'}
              tone={summary?.pastDue ? 'bad' : 'neutral'}
              active={filter === 'PAST_DUE'}
              onClick={() => setFilter((f) => (f === 'PAST_DUE' ? null : 'PAST_DUE'))}
            />
            <NbKpi label="BU AY İPTAL" value={summary?.canceledThisMonth ?? '—'} tone="warn" />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Planlar ───────────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), overflow: 'hidden', mb: 1.75 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Fiyat planları</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={<Switch size="small" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 12 }}>Eski planları göster</Typography>}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => setForm({ tierId: tiers[0]?.[0] ?? '', interval: 'MONTHLY', price: '', name: '', promo: false })}
            >
              Yeni fiyat / plan
            </Button>
          </Stack>
        </Stack>
        <Box sx={nbHeadRow(PLAN_GRID)}>
          <Box>PLAN</Box>
          <Box>ARALIK</Box>
          <Box>FİYAT</Box>
          <Box>iyzico</Box>
          <Box>ABONE</Box>
          <Box />
        </Box>
        {loading && plans.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          visiblePlans.map((p) => (
            <Box key={p.id} sx={{ ...(nbGrid(PLAN_GRID) as object), px: 2, py: 1.25, borderBottom: nbDividerLine, opacity: p.active ? 1 : 0.6 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                  {p.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: nb.textFaint }}>
                  {p.tierName}
                  {p.promo ? ' · özel teklif (yalnızca teklif edilen üyeye)' : ''}
                  {!p.active ? ` · emekli ${day(p.retiredAt)}` : ''}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12 }}>{NB_INTERVAL_LABEL[p.interval]}</Typography>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{money(p.price, p.currency)}</Typography>
                {p.savingsLabel && <Box sx={nbPill('good')}>{p.savingsLabel}</Box>}
              </Box>
              <Box>
                {p.synced ? (
                  <Box sx={nbPill('good')}>eşitlendi</Box>
                ) : (
                  <Tooltip title="Plan iyzico'da tanımlı değil; bu planla abonelik başlatılamaz. Lütfen eşitleme yapın.">
                    <Box sx={nbPill('warn')}>eşitlenmedi</Box>
                  </Tooltip>
                )}
              </Box>
              <Typography sx={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{p.liveSubscribers}</Typography>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                {!p.synced && p.active && (
                  <Button size="small" disabled={busy} onClick={() => act(() => nbOpsService.syncBillingPlan(p.id), 'Plan iyzico\'ya eşitlendi', 'Eşitlenemedi.')}>
                    iyzico'ya eşitle
                  </Button>
                )}
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() =>
                    act(
                      () => nbOpsService.setBillingPlanActive(p.id, !p.active),
                      p.active ? 'Plan devre dışı bırakıldı' : 'Plan etkinleştirildi',
                      'Plan güncellenemedi.',
                    )
                  }
                >
                  {p.active ? 'Devre dışı bırak' : 'Etkinleştir'}
                </Button>
              </Stack>
            </Box>
          ))
        )}
      </Box>

      {/* ── Abonelikler ───────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
        <NbFilterBar
          chips={SUB_FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            active: filter === f.key,
            onToggle: () => {
              setPage(0);
              setFilter((prev) => (prev === f.key ? null : f.key));
            },
          }))}
          trailing={<Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>{summary?.page.totalElements ?? 0} abonelik</Typography>}
        />
        <Box sx={nbHeadRow(SUB_GRID)}>
          <Box>ÜYE</Box>
          <Box>PLAN</Box>
          <Box>DURUM</Box>
          <Box>DÖNEM SONU</Box>
          <Box>EK SÜRE</Box>
          <Box />
        </Box>
        {rows.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: nb.textFaint, p: 3 }}>Bu filtrede abonelik yok.</Typography>
        ) : (
          rows.map((s: NbSubscription) => (
            <Box key={s.id} sx={{ ...(nbGrid(SUB_GRID) as object), px: 2, py: 1.25, borderBottom: nbDividerLine }}>
              <Link
                component="button"
                underline="hover"
                sx={{ fontSize: 12.5, fontWeight: 600, textAlign: 'left', color: nb.text }}
                onClick={() => navigate(`/nartbusiness/members/${s.memberId}?tab=membership`)}
              >
                {s.memberName || 'Üye'}
              </Link>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12 }} noWrap>
                  {s.planName}
                </Typography>
                <Typography sx={{ fontSize: 11, color: nb.textFaint }}>{money(s.price, s.currency)}</Typography>
              </Box>
              <Box>
                <Box sx={nbPill(statusTone(s.status))}>{NB_SUBSCRIPTION_STATUS_LABEL[s.status]}</Box>
                {s.cancelAtPeriodEnd && s.status === 'CANCELED' && (
                  <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>dönem sonunda sona erecek</Typography>
                )}
              </Box>
              <Typography sx={{ fontSize: 12 }}>{day(s.currentPeriodEnd)}</Typography>
              <Typography sx={{ fontSize: 12, color: s.graceUntil ? nb.red : nb.textFaint }}>{day(s.graceUntil)}</Typography>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                {s.status === 'PAST_DUE' && (
                  <>
                    <Button size="small" disabled={busy} onClick={() => act(() => nbOpsService.retrySubscription(s.id), 'Tahsilat yeniden denendi', 'Yeniden denenemedi.')}>
                      Tekrar dene
                    </Button>
                    <Button size="small" disabled={busy} onClick={() => act(() => nbOpsService.extendSubscriptionGrace(s.id, 7), 'Ek süre 7 gün uzatıldı', 'Uzatılamadı.')}>
                      +7 gün
                    </Button>
                  </>
                )}
                {(s.status === 'ACTIVE' || s.status === 'PAST_DUE') && (
                  <Button
                    size="small"
                    color="error"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`${s.memberName ?? 'Üye'} aboneliği iptal edilsin mi? Üye, ödenmiş dönemin sonuna kadar erişimini korur.`)) {
                        void act(() => nbOpsService.cancelSubscription(s.id), 'Abonelik iptal edildi', 'İptal edilemedi.');
                      }
                    }}
                  >
                    İptal
                  </Button>
                )}
              </Stack>
            </Box>
          ))
        )}
        {(summary?.page.totalPages ?? 1) > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
            <Pagination count={summary?.page.totalPages ?? 1} page={page + 1} onChange={(_, p) => setPage(p - 1)} size="small" />
          </Box>
        )}
      </Box>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Yeni fiyat / plan</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={1.75} sx={{ mt: 1 }}>
              <TextField select size="small" label="Paket" value={form.tierId} onChange={(e) => setForm({ ...form, tierId: e.target.value })}>
                {tiers.map(([id, name]) => (
                  <MenuItem key={id} value={id}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Ödeme dönemi" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as NbBillingInterval })}>
                <MenuItem value="MONTHLY">Aylık</MenuItem>
                <MenuItem value="YEARLY">Yıllık</MenuItem>
              </TextField>
              <TextField size="small" label="Fiyat (TL, KDV dahil)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputProps={{ inputMode: 'decimal' }} />
              <TextField size="small" label="Plan adı (boş bırakılırsa otomatik)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormControlLabel
                control={<Switch checked={form.promo} onChange={(e) => setForm({ ...form, promo: e.target.checked })} />}
                label={<Typography sx={{ fontSize: 13 }}>Özel teklif planı (yalnızca teklif edilen üyeye görünür)</Typography>}
              />
              <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                {form.promo
                  ? 'Genel fiyat değişmez. Üyeye teklif etmek için üye detayında Üyelik ve Ödeme sekmesini kullanın.'
                  : 'Bu paket ve ödeme dönemindeki mevcut plan kullanımdan kaldırılır; aboneleri önceki fiyattan devam eder. Yıllık fiyat paket fiyatı olarak da kaydedilir.'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>Vazgeç</Button>
          <Button variant="contained" onClick={savePlan}>
            Kaydet ve iyzico'ya eşitle
          </Button>
        </DialogActions>
      </Dialog>

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
