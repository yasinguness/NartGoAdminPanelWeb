/**
 * Tanıştırmalar — iki üyenin buluşturulmasından sonuca kadar tek akış.
 *
 * Kayıt bir tabloydu: her satırda kim-kimle, durum çipi ve bir "düzenle"
 * kalemi. Tablo "kaç tane var" sorusunu iyi cevaplıyordu ama asıl soru o
 * değil — **hangisi şu an sende bekliyor.** Bir tanıştırma zaman içinde
 * ilerleyen bir iş; durumu bir kolon değeri değil, bulunduğu aşama.
 *
 * Onun için dört aşamalı bir pano. Kart sürükleme **yok**: sürükleme,
 * aşamalar arası her geçişi mümkün gösterir ve yanlış sürükleme sessizce
 * kaydedilir. Bunun yerine her kartta **o aşamanın tek aksiyonu** duruyor;
 * aşama sırayla ilerler, geri alma ise not penceresinden yapılır.
 *
 * Kayıt oluşturma burada değil: iki üyeyi tanıştırmak üye detayındaki
 * "Tanıştır" akışıyla başlar, kayıt buraya düşer.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import {
  nbAdminService,
  NB_INTRODUCTION_STATUS_LABEL,
  type NbIntroduction,
  type NbIntroductionStatus,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate } from '../../utils/nbDisplay';
import {
  NbKpi,
  NbPageHeader,
  NbUndoToast,
  nbDividerLine,
  nbLabel,
  nbPrimaryBtn,
  nbQuietBtn,
  type NbUndoState,
} from '../../components/nartbusiness/ui';
import { nb, nbRadius } from '../../theme/nbBrand';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

/**
 * Dört aşama.
 *
 * Aşamalar veri modelindeki durumlardan türetiliyor, uydurulmuyor: son iki
 * durum (iş birliği / sonuçsuz) tek bir "Sonuçlandı" sütununda birleşiyor,
 * çünkü ikisi de **kapanmış** iştir ve yönetici için artık bir iş kuyruğu
 * değil, arşivdir. Kartın kendisi hangi sonuçla kapandığını söylüyor.
 */
type Stage = 'introduced' | 'pending' | 'met' | 'closed';

const STAGES: { key: Stage; label: string; statuses: NbIntroductionStatus[]; next?: { label: string; to: NbIntroductionStatus } }[] = [
  {
    key: 'introduced',
    label: 'Tanıştırıldı',
    statuses: ['INTRODUCED'],
    next: { label: 'Görüşme ayarlandı', to: 'MEETING_PENDING' },
  },
  {
    key: 'pending',
    label: 'Görüşme bekliyor',
    statuses: ['MEETING_PENDING'],
    next: { label: 'Görüştüler', to: 'MET' },
  },
  {
    key: 'met',
    label: 'Görüştüler',
    statuses: ['MET'],
    // Son adımda tek aksiyon yok: sonuç iki türlü olabilir ve hangisi olduğu
    // yöneticinin bildiği bir şey. Bu yüzden burada pencere açılır.
    next: { label: 'Sonucu gir', to: 'CLOSED_SUCCESS' },
  },
  {
    key: 'closed',
    label: 'Sonuçlandı',
    statuses: ['CLOSED_SUCCESS', 'CLOSED_NO_RESULT'],
  },
];

export default function NbIntroductions() {
  const [items, setItems] = useState<NbIntroduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  // Not / sonuç penceresi
  const [editTarget, setEditTarget] = useState<NbIntroduction | null>(null);
  const [editStatus, setEditStatus] = useState<NbIntroductionStatus>('INTRODUCED');
  const [editNote, setEditNote] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Pano tüm açık işi bir arada göstermek zorunda; sayfalama panoyu
      // bölerdi ve "hangisi bende bekliyor" sorusu yine cevapsız kalırdı.
      const r = await nbAdminService.listIntroductions({ page: 0, size: 200 });
      setItems(r.items);
    } catch (e) {
      setError(nbErrorMessage(e, 'Tanıştırmalar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        cards: items.filter((i) => s.statuses.includes(i.status)),
      })),
    [items],
  );

  const stats = useMemo(() => {
    const open = items.filter((i) => !i.status.startsWith('CLOSED')).length;
    const won = items.filter((i) => i.status === 'CLOSED_SUCCESS').length;
    const closed = items.filter((i) => i.status.startsWith('CLOSED')).length;
    const now = new Date();
    const thisMonth = items.filter((i) => {
      const d = new Date(i.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return {
      open,
      thisMonth,
      won,
      // Oran ancak kapanmış kayıtlar üzerinden anlamlı: henüz sonuçlanmamış
      // tanıştırmaları paydaya koymak oranı sürekli düşük gösterirdi.
      winRate: closed > 0 ? Math.round((won / closed) * 100) : null,
    };
  }, [items]);

  /** Aşamayı bir ileri taşı — kartın tek aksiyonu. */
  const advance = useCallback(
    async (row: NbIntroduction, to: NbIntroductionStatus) => {
      // "Sonucu gir" gerçekte iki sonuçtan birini seçtirir; tek tıkla
      // "iş birliği" yazmak olmadık bir başarı kaydı üretirdi.
      if (to === 'CLOSED_SUCCESS') {
        setEditTarget(row);
        setEditStatus('CLOSED_SUCCESS');
        setEditNote(row.adminNote ?? '');
        setEditError(null);
        return;
      }
      try {
        await nbAdminService.updateIntroduction(row.id, { status: to });
        setUndo({
          message: `${row.memberAName} ↔ ${row.memberBName} → ${NB_INTRODUCTION_STATUS_LABEL[to]}`,
          onUndo: async () => {
            await nbAdminService.updateIntroduction(row.id, { status: row.status });
            await load();
          },
        });
        await load();
      } catch (e) {
        setError(nbErrorMessage(e, 'Aşama güncellenemedi.'));
      }
    },
    [load],
  );

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await nbAdminService.updateIntroduction(editTarget.id, {
        status: editStatus,
        adminNote: editNote,
      });
      setEditTarget(null);
      setUndo({ message: 'Tanıştırma güncellendi.' });
      await load();
    } catch (e) {
      setEditError(nbErrorMessage(e, 'Güncellenemedi.'));
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="Tanıştırmalar"
        subtitle="İki üyeyi buluşturduğun andan sonuca kadar tek akış. Her kartta o aşamanın tek aksiyonu var."
        kpis={
          <>
            <NbKpi label="AÇIK TANIŞTIRMA" value={stats.open} hint="sonuçlanmadı" tone={stats.open ? 'warn' : 'neutral'} />
            <NbKpi label="BU AY BAŞLAYAN" value={stats.thisMonth} />
            <NbKpi label="İŞ BİRLİĞİNE DÖNEN" value={stats.won} tone="good" />
            <NbKpi
              label="SONUÇ ORANI"
              value={stats.winRate == null ? '—' : `%${stats.winRate}`}
              hint={stats.winRate == null ? 'kapanmış kayıt yok' : 'kapananlar içinde'}
            />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && items.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
          {columns.map((col) => (
            <Box
              key={col.key}
              sx={{
                flex: '1 1 250px',
                minWidth: 0,
                bgcolor: '#efeee8',
                border: `1px solid ${nb.border}`,
                borderRadius: `${nbRadius.card}px`,
                p: 1.375,
              }}
            >
              <Stack direction="row" alignItems="center" sx={{ px: 0.5, pb: 1.25 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{col.label}</Typography>
                <Typography sx={{ ml: 'auto', fontSize: 11, color: nb.textFaint, fontVariantNumeric: 'tabular-nums' }}>
                  {col.cards.length}
                </Typography>
              </Stack>

              <Stack sx={{ gap: 1.125 }}>
                {col.cards.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      bgcolor: nb.surface,
                      border: `1px solid ${nb.border}`,
                      borderRadius: `${nbRadius.panel}px`,
                      p: 1.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.875 }}>
                      <Link
                        component={RouterLink}
                        to={`/nartbusiness/members/${row.memberAId}`}
                        sx={{ fontSize: 12.5, fontWeight: 600, color: nb.text, textDecoration: 'none' }}
                      >
                        {row.memberAName}
                      </Link>
                      <Typography sx={{ color: nb.gold, fontSize: 13 }}>↔</Typography>
                      <Link
                        component={RouterLink}
                        to={`/nartbusiness/members/${row.memberBId}`}
                        sx={{ fontSize: 12.5, fontWeight: 600, color: nb.text, textDecoration: 'none' }}
                      >
                        {row.memberBName}
                      </Link>
                    </Stack>

                    <Typography sx={{ fontSize: 11.5, color: nb.textMuted, lineHeight: 1.5, mt: 0.875 }}>
                      {row.reason}
                    </Typography>

                    {row.adminNote && (
                      <Typography sx={{ fontSize: 11, color: nb.textFaint, lineHeight: 1.5, mt: 0.625 }}>
                        Not: {row.adminNote}
                      </Typography>
                    )}

                    <Stack direction="row" alignItems="center" sx={{ gap: 1, mt: 1.25 }}>
                      {col.key === 'closed' && (
                        <Box
                          component="span"
                          sx={{
                            bgcolor: row.status === 'CLOSED_SUCCESS' ? nb.greenTint : '#f2f1ec',
                            color: row.status === 'CLOSED_SUCCESS' ? nb.green : '#7b858c',
                            fontSize: 10.5, fontWeight: 600, borderRadius: '5px', px: 1, py: 0.375,
                          }}
                        >
                          {row.status === 'CLOSED_SUCCESS' ? 'iş birliği' : 'sonuçsuz'}
                        </Box>
                      )}
                      <Typography sx={{ ml: 'auto', fontSize: 10.5, color: nb.textFaint }}>
                        {relativeDate(row.createdAt)}
                      </Typography>
                    </Stack>

                    {/* Aşamanın tek aksiyonu. Sürükle-bırak yok: yanlış
                        sürükleme sessizce kaydedilirdi. */}
                    {col.next && (
                      <Button
                        disableElevation
                        fullWidth
                        onClick={() => advance(row, col.next!.to)}
                        sx={{ ...(nbQuietBtn as object), mt: 1.25 }}
                      >
                        {col.next.label}
                      </Button>
                    )}
                    {col.key === 'closed' && (
                      <Button
                        disableElevation
                        fullWidth
                        onClick={() => {
                          setEditTarget(row);
                          setEditStatus(row.status);
                          setEditNote(row.adminNote ?? '');
                          setEditError(null);
                        }}
                        sx={{ ...(nbQuietBtn as object), mt: 1.25 }}
                      >
                        Notu düzenle
                      </Button>
                    )}
                  </Box>
                ))}

                {col.cards.length === 0 && (
                  <Typography sx={{ px: 0.5, py: 2, fontSize: 11.5, color: nb.textFaint, textAlign: 'center' }}>
                    Bu aşamada kayıt yok.
                  </Typography>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Sonuç / not penceresi */}
      <Dialog
        open={!!editTarget}
        onClose={() => !editBusy && setEditTarget(null)}
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(520px, 100%)', bgcolor: nb.surface, borderRadius: '14px',
            boxShadow: '0 30px 70px rgba(14,27,38,.35)', m: 2.5,
          },
        }}
      >
        <Box sx={{ px: 2.75, pt: 2.25, pb: 1.75, borderBottom: nbDividerLine }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Görüşme sonucu</Typography>
          <Typography sx={{ fontSize: 12, color: nb.textMuted, mt: 0.375 }}>
            {editTarget?.memberAName} ↔ {editTarget?.memberBName}
          </Typography>
        </Box>

        <Box sx={{ px: 2.75, py: 2.25 }}>
          {editError && <Alert severity="error" sx={{ mb: 1.5 }}>{editError}</Alert>}

          <Typography sx={nbLabel}>SONUÇ</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as NbIntroductionStatus)}
            sx={{ mt: 0.875 }}
          >
            {(Object.keys(NB_INTRODUCTION_STATUS_LABEL) as NbIntroductionStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {NB_INTRODUCTION_STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>

          <Typography sx={{ ...(nbLabel as object), mt: 2 }}>NOT</Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Ne konuşuldu, ne çıktı? Sonraki adım var mı?"
            sx={{ mt: 0.875 }}
          />
        </Box>

        <Stack direction="row" alignItems="center" sx={{ px: 2.75, py: 1.75, borderTop: nbDividerLine }}>
          <Button
            onClick={() => setEditTarget(null)}
            disabled={editBusy}
            sx={{ color: nb.textMuted, fontSize: 13, textTransform: 'none', px: 0, minWidth: 0 }}
          >
            Vazgeç
          </Button>
          <Button
            disableElevation
            onClick={saveEdit}
            disabled={editBusy}
            sx={{ ...(nbPrimaryBtn as object), ml: 'auto' }}
          >
            {editBusy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </Stack>
      </Dialog>

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
