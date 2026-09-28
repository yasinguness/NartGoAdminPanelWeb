/**
 * İlan Yönlendirmeleri — bir ilanı bir üyeye gönderdiğimizde ne oldu.
 *
 * İlan konsolu bir **kuyruk**: bugün hangi ilanı kime haber verelim. Bu sayfa
 * onun karşılığı — haber verdiklerimizden ne çıktı. İkisi ayrı ekran çünkü
 * ayrı sorular: biri "şimdi ne yapayım", diğeri "yaptıklarım işe yarıyor mu".
 *
 * <h3>Otomatik bildirimle karıştırılmamalı</h3>
 *
 * Talep ilanı yayımlandığında sektörü eşleşen üyelere kendiliğinden bildirim
 * gidiyor. Bu sayfada o bildirimler <b>yok</b>; yalnız bir insanın seçip
 * gönderdiği yönlendirmeler var. Sayılar bu yüzden küçük ve bu doğru: ölçülen
 * şey kaç bildirim attığımız değil, seçimlerimizin isabeti.
 *
 * <h3>Huni neden üç basamak</h3>
 *
 * İhale huntisinde "görüldü" ve "teklif verdi" basamakları var. Burada ikisi
 * de yok: ilan yönlendirmesinde okunma bilgisi tutulmuyor, teklif ise ürünün
 * kendi akışında (`need_quotes`) ve elle işaretlenmiyor. Olmayan basamağı
 * çizmek, boş bir kutuyu ölçüm gibi göstermek olurdu.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Pagination, Stack, Typography } from '@mui/material';
import {
  nbAdminService,
  NB_LISTING_REFERRAL_STATUS_LABEL,
  type NbListingReferral,
  type NbListingReferralStatus,
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

const ROW_GRID = 'minmax(0,1.8fr) minmax(0,1.8fr) minmax(0,1fr) 96px 108px 124px';

/** Hepsi sunucu tarafı durum süzgeci; "Açık takip" istemcide birleştirilir. */
const FILTERS: { key: NbListingReferralStatus | 'open'; label: string }[] = [
  { key: 'open', label: 'Açık takip' },
  { key: 'INTERESTED', label: 'İlgilendi' },
  { key: 'WON', label: 'İş bağlandı' },
  { key: 'DECLINED', label: 'İlgilenmedi' },
];

/** Satırda gösterilecek bir sonraki durum — takip tek tıkla ilerlesin. */
const NEXT_STATUS: Partial<Record<NbListingReferralStatus, {
  to: NbListingReferralStatus;
  label: string;
}>> = {
  SENT: { to: 'INTERESTED', label: 'İlgilendi' },
  INTERESTED: { to: 'WON', label: 'İş bağlandı' },
};

function toneOf(s: NbListingReferralStatus) {
  if (s === 'WON') return 'good' as const;
  if (s === 'INTERESTED') return 'warn' as const;
  if (s === 'DECLINED') return 'bad' as const;
  return 'info' as const;
}

/** Skoru olmayan satır: admin öneri listesi dışından seçmiş. */
function scoreLabel(score: number | null): string {
  return score === null ? 'elle' : `%${Math.round(score)}`;
}

export default function NbListingReferrals() {
  const [rows, setRows] = useState<NbListingReferral[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<NbListingReferralStatus | 'open' | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  /**
   * Huni tüm kayıtlar üzerinden hesaplanır, görünen sayfadan değil.
   *
   * Sayfa başına 25 kayıtla hesaplanan bir dönüşüm oranı, sayfa değiştikçe
   * değişirdi — yani bir oran değil, bir rastlantı olurdu.
   */
  const [all, setAll] = useState<NbListingReferral[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await nbAdminService.listListingReferrals({
        status: filter && filter !== 'open' ? filter : undefined,
        page,
        size: 25,
      });
      let content = res.content;
      // "Açık takip" sunucuda tek bir durum değil: henüz sonuçlanmamış olanlar.
      if (filter === 'open') {
        content = content.filter((r) => r.status === 'SENT' || r.status === 'INTERESTED');
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
      const res = await nbAdminService.listListingReferrals({ page: 0, size: 500 });
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
    const interested = all.filter((r) => ['INTERESTED', 'WON'].includes(r.status)).length;
    const won = all.filter((r) => r.status === 'WON').length;
    const manual = all.filter((r) => r.matchScore === null).length;
    // Uygulama kanalında bildirim ya da e-posta düşenler: adminin elle tekrar
    // denemesi gereken kayıtlar.
    const undelivered = all.filter(
      (r) => r.channel === 'IN_APP' && (!r.notifiedAt || !r.emailedAt),
    ).length;

    const pct = (n: number, base: number) => (base > 0 ? `%${Math.round((n / base) * 100)}` : '—');

    return {
      sent,
      manual,
      undelivered,
      steps: [
        { label: 'Gönderildi', value: sent, rate: '—' },
        { label: 'İlgilendi', value: interested, rate: pct(interested, sent) },
        { label: 'İş bağlandı', value: won, rate: pct(won, interested) },
      ],
      won,
      interestRate: sent > 0 ? Math.round((interested / sent) * 100) : null,
    };
  }, [all]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.memberName ?? '').toLowerCase().includes(q) ||
        (r.listingTitle ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const advance = async (row: NbListingReferral, to: NbListingReferralStatus) => {
    try {
      await nbAdminService.updateListingReferral(row.id, { status: to });
      setUndo({
        message: `${row.memberName ?? 'Üye'} → ${NB_LISTING_REFERRAL_STATUS_LABEL[to]}`,
        onUndo: async () => {
          await nbAdminService.updateListingReferral(row.id, { status: row.status });
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
        title="İlan Yönlendirmeleri"
        subtitle="Bir ilanı bir üyeye elle gönderdiğimizde ne oldu. Otomatik ilan bildirimleri bu listede yok."
        kpis={
          <>
            <NbKpi label="TOPLAM GÖNDERİM" value={funnel.sent} hint="son 500 kayıt" />
            <NbKpi
              label="İLGİYE DÖNÜŞ"
              value={funnel.interestRate == null ? '—' : `%${funnel.interestRate}`}
              hint="gönderim başına"
              tone="good"
              active={filter === 'INTERESTED'}
              onClick={() => setFilter((f) => (f === 'INTERESTED' ? null : 'INTERESTED'))}
            />
            <NbKpi
              label="BAĞLANAN İŞ"
              value={funnel.won}
              tone="good"
              active={filter === 'WON'}
              onClick={() => setFilter((f) => (f === 'WON' ? null : 'WON'))}
            />
            <NbKpi
              label="AÇIK TAKİP"
              value={all.filter((r) => ['SENT', 'INTERESTED'].includes(r.status)).length}
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

      {/* Teslim edilemeyen gönderimler sessiz kalmamalı: admin üyenin haberi
          olduğunu sanıp beklemeye başlar. */}
      {funnel.undelivered > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {funnel.undelivered} gönderimde bildirim ya da e-posta çıkmadı. O üyelere
          WhatsApp kanalıyla tekrar ulaşmak gerekebilir.
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
              Okunma basamağı yok: ilan yönlendirmesinde okunma bilgisi tutulmuyor.
              Teklif de burada sayılmıyor, çünkü teklif ürünün kendi akışında.
              {funnel.manual > 0 && ` ${funnel.manual} gönderim öneri listesi dışından seçildi.`}
            </Typography>
          </>
        )}
      </Box>

      {/* ── Kayıt tablosu ─────────────────────────────────────────────── */}
      <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
        <NbFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Üye ya da ilan adı…"
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
          <Box>İLAN</Box>
          <Box>KANAL / NOT</Box>
          <Box>SKOR</Box>
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
                    {r.memberName || `Üye ${r.memberId.slice(0, 8)}`}
                  </Typography>
                  <Typography sx={{ ...nbMono, fontSize: 10.5, color: nb.textFaint, mt: 0.25 }}>
                    {relativeDate(r.createdAt)}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, color: nb.textMuted }} noWrap>
                    {r.listingTitle || '(ilan silinmiş)'}
                  </Typography>
                  {r.matchedOn.length > 0 && (
                    <Typography sx={{ fontSize: 10.5, color: nb.textFaint, mt: 0.25 }} noWrap>
                      {r.matchedOn.join(' · ')}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
                    {r.channel === 'IN_APP' ? 'Uygulama' : 'WhatsApp'}
                  </Typography>
                  {/* Kanal uygulamayken gitmeyen bildirim yazılmak zorunda:
                      yoksa admin üyenin haberi olduğunu sanır. */}
                  {r.channel === 'IN_APP' && (!r.notifiedAt || !r.emailedAt) && (
                    <Typography sx={{ fontSize: 10.5, color: nb.amber, mt: 0.25 }}>
                      {!r.notifiedAt && !r.emailedAt
                        ? 'bildirim ve e-posta gitmedi'
                        : !r.notifiedAt
                          ? 'bildirim gitmedi'
                          : 'e-posta gitmedi'}
                    </Typography>
                  )}
                  {r.note && (
                    <Typography sx={{ fontSize: 10.5, color: nb.textFaint, mt: 0.25 }} noWrap>
                      {r.note}
                    </Typography>
                  )}
                </Box>

                <Typography sx={{ ...nbMono, fontSize: 11.5, color: nb.textFaint }}>
                  {scoreLabel(r.matchScore)}
                </Typography>

                <Box>
                  <Box component="span" sx={nbPill(toneOf(r.status))}>
                    {NB_LISTING_REFERRAL_STATUS_LABEL[r.status]}
                  </Box>
                </Box>

                <Box>
                  {/* Takip tek tıkla bir basamak ilerler; geri alma 10 sn'lik
                      kutuda. */}
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
