/**
 * Yönlendirmeler — gönderilen her fırsat bildiriminin sonucu.
 *
 * İhale konsolu bir **kuyruk**: bugün kime haber verilecek. Bu sayfa onun
 * karşılığı — haber verdiklerimizden ne çıktı. İkisi ayrı ekran çünkü ayrı
 * sorular: biri "şimdi ne yapayım", diğeri "yaptıklarım işe yarıyor mu".
 *
 * **Amaç bildirim sayısı değil, teklife dönüşen oran.** Sayfanın üstündeki
 * huni tam olarak bunu okutuyor: her basamakta kaç kişi kaldı ve bir önceki
 * basamağa göre oran ne. Toplam gönderim sayısını büyük punto ile göstermek,
 * kolayca artırılabilen ama hiçbir şey ifade etmeyen bir sayıyı hedefe
 * çevirirdi.
 *
 * Huni basamakları kaydın kendisinden okunur, uydurulmaz:
 * `gönderildi → görüldü → ilgilendi → teklif verdi → kazandı`. "Görüldü"
 * yalnız uygulama bildiriminde ölçülebilir (`viewedAt`); WhatsApp'ta
 * okunma bilgisi bize ulaşmıyor ve o basamak bu yüzden yalnız uygulama
 * gönderimlerini sayar — altında bunu söyleyen bir not var.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Pagination, Stack, Typography } from '@mui/material';
import {
  nbAdminService,
  NB_TENDER_REFERRAL_STATUS_LABEL,
  type NbTenderReferral,
  type NbTenderReferralStatus,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate } from '../../utils/nbDisplay';
import {
  NbFilterBar,
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbCard,
  nbDividerLine,
  nbGrid,
  nbHeadRow,
  nbMono,
  nbPill,
  type NbUndoState,
} from '../../components/nartbusiness/ui';
import { nb, nbRadius } from '../../theme/nbBrand';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const ROW_GRID = 'minmax(0,2.4fr) minmax(0,1.2fr) 96px 108px 132px';

/** Kayıt tablosu filtreleri — hepsi sunucu tarafı durum süzgeci. */
const FILTERS: { key: NbTenderReferralStatus | 'open'; label: string }[] = [
  { key: 'open', label: 'Açık takip' },
  { key: 'INTERESTED', label: 'İlgilendi' },
  { key: 'BID', label: 'Teklif verdi' },
  { key: 'WON', label: 'Kazandı' },
  { key: 'DECLINED', label: 'İlgilenmedi' },
];

/** Satırda gösterilecek bir sonraki durum — takip tek tıkla ilerlesin. */
const NEXT_STATUS: Partial<Record<NbTenderReferralStatus, { to: NbTenderReferralStatus; label: string }>> = {
  SENT: { to: 'INTERESTED', label: 'İlgilendi' },
  INTERESTED: { to: 'BID', label: 'Teklif verdi' },
  BID: { to: 'WON', label: 'Kazandı' },
};

function toneOf(s: NbTenderReferralStatus) {
  if (s === 'WON' || s === 'BID') return 'good' as const;
  if (s === 'INTERESTED') return 'warn' as const;
  if (s === 'DECLINED') return 'bad' as const;
  return 'info' as const;
}

export default function NbTenderReferrals() {
  const [rows, setRows] = useState<NbTenderReferral[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<NbTenderReferralStatus | 'open' | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  /**
   * Huni tüm kayıtlar üzerinden hesaplanır, görünen sayfadan değil.
   *
   * Sayfa başına 25 kayıtla hesaplanan bir dönüşüm oranı, sayfa
   * değiştikçe değişirdi — yani bir oran değil, bir rastlantı olurdu.
   */
  const [all, setAll] = useState<NbTenderReferral[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await nbAdminService.listTenderReferrals({
        status: filter && filter !== 'open' ? filter : undefined,
        page,
        size: 25,
      });
      let content = res.content;
      // "Açık takip" sunucuda tek bir durum değil: henüz kapanmamış olanlar.
      if (filter === 'open') {
        content = content.filter((r) => r.status === 'SENT' || r.status === 'INTERESTED' || r.status === 'BID');
      }
      setRows(content);
      setTotalPages(res.totalPages || 1);
    } catch (e) {
      setError(nbErrorMessage(e, 'Yönlendirmeler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  const loadAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const res = await nbAdminService.listTenderReferrals({ page: 0, size: 500 });
      setAll(res.content);
    } catch {
      // Huni hesaplanamazsa sayfa yine çalışır; basamaklar "—" gösterir.
      setAll([]);
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const funnel = useMemo(() => {
    const sent = all.length;
    // Görülme yalnız uygulama bildiriminde ölçülebilir.
    const inApp = all.filter((r) => r.channel === 'IN_APP');
    const viewed = inApp.filter((r) => r.viewedAt).length;
    const interested = all.filter((r) => ['INTERESTED', 'BID', 'WON'].includes(r.status)).length;
    const bid = all.filter((r) => ['BID', 'WON'].includes(r.status)).length;
    const won = all.filter((r) => r.status === 'WON').length;

    const pct = (n: number, base: number) => (base > 0 ? `%${Math.round((n / base) * 100)}` : '—');

    return {
      sent,
      inAppCount: inApp.length,
      steps: [
        { label: 'Gönderildi', value: sent, rate: '—' },
        { label: 'Görüldü', value: viewed, rate: pct(viewed, inApp.length) },
        { label: 'İlgilendi', value: interested, rate: pct(interested, sent) },
        { label: 'Teklif verdi', value: bid, rate: pct(bid, interested) },
        { label: 'Kazandı', value: won, rate: pct(won, bid) },
      ],
      won,
      bidRate: sent > 0 ? Math.round((bid / sent) * 100) : null,
    };
  }, [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.memberName.toLowerCase().includes(q));
  }, [rows, search]);

  const advance = async (row: NbTenderReferral, to: NbTenderReferralStatus) => {
    try {
      await nbAdminService.updateTenderReferral(row.id, { status: to });
      setUndo({
        message: `${row.memberName} → ${NB_TENDER_REFERRAL_STATUS_LABEL[to]}`,
        onUndo: async () => {
          await nbAdminService.updateTenderReferral(row.id, { status: row.status });
          await load();
          await loadAll();
        },
      });
      await load();
      await loadAll();
    } catch (e) {
      setError(nbErrorMessage(e, 'Durum güncellenemedi.'));
    }
  };

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="Yönlendirmeler"
        subtitle="Gönderdiğin her bildirimin sonucu burada. Amaç bildirim sayısı değil, teklife dönüşen oran."
        kpis={
          <>
            <NbKpi label="TOPLAM GÖNDERİM" value={funnel.sent} hint="son 500 kayıt" />
            <NbKpi
              label="TEKLİFE DÖNÜŞ"
              value={funnel.bidRate == null ? '—' : `%${funnel.bidRate}`}
              hint="gönderim başına"
              tone="good"
              active={filter === 'BID'}
              onClick={() => setFilter((f) => (f === 'BID' ? null : 'BID'))}
            />
            <NbKpi
              label="KAZANILAN İŞ"
              value={funnel.won}
              tone="good"
              active={filter === 'WON'}
              onClick={() => setFilter((f) => (f === 'WON' ? null : 'WON'))}
            />
            <NbKpi
              label="AÇIK TAKİP"
              value={all.filter((r) => ['SENT', 'INTERESTED', 'BID'].includes(r.status)).length}
              hint="sonuçlanmadı"
              tone="warn"
              active={filter === 'open'}
              onClick={() => setFilter((f) => (f === 'open' ? null : 'open'))}
            />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Huni ──────────────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), p: 2.25, mb: 1.75 }}>
        <Typography sx={{ fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600 }}>
          YÖNLENDİRME HUNİSİ
        </Typography>

        {allLoading && all.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.25, mt: 1.5 }}>
              {funnel.steps.map((s, i) => {
                const last = i === funnel.steps.length - 1;
                return (
                  <Box
                    key={s.label}
                    sx={{
                      flex: '1 1 130px',
                      bgcolor: last ? nb.greenTint : '#f7f6f1',
                      border: `1px solid ${last ? '#bcd8ca' : nb.divider}`,
                      borderRadius: `${nbRadius.panel}px`,
                      px: 1.75,
                      py: 1.5,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, color: nb.textMuted }}>{s.label}</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 600, mt: 0.375, fontVariantNumeric: 'tabular-nums' }}>
                      {s.value}
                    </Typography>
                    {/* Oran bir önceki basamağa göre: mutlak sayı düşerken
                        oranın yükseldiği yer, elemenin gerçekten olduğu yerdir. */}
                    <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.25 }}>{s.rate}</Typography>
                  </Box>
                );
              })}
            </Stack>

            <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 1.25, lineHeight: 1.5 }}>
              "Görüldü" yalnız uygulama bildirimlerinde ölçülebiliyor ({funnel.inAppCount} kayıt);
              WhatsApp'ta okunma bilgisi bize ulaşmıyor. Oranlar bir önceki basamağa göre.
            </Typography>
          </>
        )}
      </Box>

      {/* ── Kayıt tablosu ─────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
        <NbFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Üye adı…"
          chips={FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            active: filter === f.key,
            onToggle: () => setFilter((prev) => (prev === f.key ? null : f.key)),
          }))}
          trailing={
            <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>{visible.length} kayıt</Typography>
          }
        />

        <Box sx={nbHeadRow(ROW_GRID)}>
          <Box>ÜYE</Box>
          <Box>KANAL / NOT</Box>
          <Box>GÖNDERİM</Box>
          <Box>SONUÇ</Box>
          <Box>TAKİP</Box>
        </Box>

        {loading && rows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          visible.map((r) => {
            const next = NEXT_STATUS[r.status];
            return (
              <Box
                key={r.id}
                sx={{ ...(nbGrid(ROW_GRID) as object), px: 2, py: 1.5, borderBottom: nbDividerLine }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>
                    {r.memberName}
                  </Typography>
                  {r.lockedOnSend && (
                    <Typography sx={{ fontSize: 10.5, color: nb.amber, mt: 0.25 }}>
                      {r.unlockedAt ? 'kilitli gitti, ödeme sonrası açıldı' : 'kilitli gitti'}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
                    {r.channel === 'IN_APP' ? 'Uygulama' : 'WhatsApp'}
                  </Typography>
                  {r.note && (
                    <Typography sx={{ fontSize: 10.5, color: nb.textFaint, mt: 0.25 }} noWrap>
                      {r.note}
                    </Typography>
                  )}
                </Box>

                <Typography sx={{ ...nbMono, fontSize: 11.5, color: nb.textFaint }}>
                  {relativeDate(r.createdAt)}
                </Typography>

                <Box>
                  <Box component="span" sx={nbPill(toneOf(r.status))}>
                    {NB_TENDER_REFERRAL_STATUS_LABEL[r.status]}
                  </Box>
                </Box>

                <Box>
                  {/* Takip tek tıkla bir basamak ilerler; geri alma 10 sn'lik
                      kutuda. Açılır menü, her satırda beş seçeneği eşit
                      ağırlıkta gösterip asıl adımı gizliyordu. */}
                  {next && (
                    <Button
                      disableElevation
                      onClick={() => advance(r, next.to)}
                      sx={{
                        border: `1px solid ${nb.inputBorder}`,
                        bgcolor: '#fff',
                        color: nb.textMuted,
                        borderRadius: `${nbRadius.controlSm}px`,
                        px: 1.25, py: 0.625, fontSize: 11.5, fontWeight: 500,
                        textTransform: 'none', whiteSpace: 'nowrap',
                        '&:hover': { bgcolor: nb.inputBg },
                      }}
                    >
                      {next.label}
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })
        )}

        {!loading && visible.length === 0 && (
          <Typography sx={{ p: 4, fontSize: 12.5, color: nb.textMuted, textAlign: 'center' }}>
            Bu filtreyle eşleşen yönlendirme yok.
          </Typography>
        )}
      </Box>

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} />
        </Stack>
      )}

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
