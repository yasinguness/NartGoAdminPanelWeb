/**
 * Haftalık Özet — her deneme/aktif üyeye haftada bir kişisel özet:
 * seçilmiş ihaleler ve uygun açık talepler, tek mesajda.
 *
 * E-posta: tek tıkla ya da Ayarlar'daki günde otomatik (Operasyon Ayarları →
 * Haftalık özet). WhatsApp: panel metni ve wa.me bağlantısını hazırlar, mesajı
 * admin atar ve "WhatsApp'la gönderildi" ile kaydeder. Özete giren ihaleler
 * yönlendirme olarak kaydedilir; haftalık sınır ve sonuç kartı aynı veriden.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { nbOpsService, type NbDigest, type NbDigestWeek } from '../../services/nartbusiness/nbOpsService';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
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

const GRID = 'minmax(0,1.8fr) 90px minmax(0,2.2fr) 150px 220px';
const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

type FilterKey = 'pending' | 'withItems' | 'sent';

export default function NbWeeklyDigest() {
  const [week, setWeek] = useState<NbDigestWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey | null>('pending');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ digest: NbDigest; text: string } | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWeek(await nbOpsService.digestWeek());
      setError(null);
    } catch (e) {
      setError(nbErrorMessage(e, 'Haftalık bülten yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return (week?.members ?? []).filter((d) => {
      if (q && !(d.companyName ?? '').toLocaleLowerCase('tr').includes(q)) return false;
      if (filter === 'pending') return !d.emailSent && !d.whatsappSent && d.tenders.length > 0;
      if (filter === 'withItems') return d.tenders.length > 0;
      if (filter === 'sent') return d.emailSent || d.whatsappSent;
      return true;
    });
  }, [week, filter, search]);

  const counts = useMemo(() => {
    const m = week?.members ?? [];
    return {
      withItems: m.filter((d) => d.tenders.length > 0).length,
      pending: m.filter((d) => !d.emailSent && !d.whatsappSent && d.tenders.length > 0).length,
      email: m.filter((d) => d.emailSent).length,
      whatsapp: m.filter((d) => d.whatsappSent).length,
    };
  }, [week]);

  const openPreview = async (d: NbDigest) => {
    setBusy(d.memberId);
    try {
      const p = await nbOpsService.digestPreview(d.memberId);
      setPreview({ digest: p.digest, text: p.whatsappText });
    } catch (e) {
      setError(nbErrorMessage(e, 'Önizleme hazırlanamadı.'));
    } finally {
      setBusy(null);
    }
  };

  const run = async (memberId: string, fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(memberId);
    try {
      await fn();
      setUndo({ message: ok });
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, fail));
    } finally {
      setBusy(null);
    }
  };

  const sendWeek = async () => {
    if (!window.confirm(`Bu hafta e-posta almamış ve ihalesi olan ${counts.withItems - counts.email} üyeye bülten e-postası gönderilsin mi?`)) return;
    setBusy('all');
    try {
      const r = await nbOpsService.digestSendWeek();
      setUndo({ message: `${r.sent} üyeye gönderildi${r.failed ? `, ${r.failed} gönderilemedi` : ''}` });
      await load();
    } catch (e) {
      setError(nbErrorMessage(e, 'Toplu gönderim yapılamadı.'));
    } finally {
      setBusy(null);
    }
  };

  const waLink = preview ? nbWhatsAppLink(preview.digest.phone, preview.text) : null;

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="Haftalık Bülten"
        subtitle={
          week
            ? `${new Date(week.weekStart).toLocaleDateString('tr-TR')} haftası. Otomatik e-posta: ${
                week.enabled ? `her ${WEEKDAYS[week.dayOfWeek - 1]} 09:00` : 'kapalı'
              } (Operasyon Ayarları).`
            : 'Her üyeye haftada bir kez gönderilen kişiselleştirilmiş bülten.'
        }
        kpis={
          <>
            <NbKpi label="BÜLTENİ HAZIR ÜYE" value={counts.withItems} />
            <NbKpi
              label="GÖNDERİLMEDİ"
              value={counts.pending}
              tone={counts.pending ? 'warn' : 'neutral'}
              active={filter === 'pending'}
              onClick={() => setFilter((f) => (f === 'pending' ? null : 'pending'))}
            />
            <NbKpi label="E-POSTA" value={counts.email} tone="good" />
            <NbKpi label="WHATSAPP" value={counts.whatsapp} tone="good" />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
        <NbFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Firma…"
          chips={[
            { key: 'pending', label: 'Gönderilmedi', active: filter === 'pending', onToggle: () => setFilter((f) => (f === 'pending' ? null : 'pending')) },
            { key: 'withItems', label: 'Bülteni hazır', active: filter === 'withItems', onToggle: () => setFilter((f) => (f === 'withItems' ? null : 'withItems')) },
            { key: 'sent', label: 'Gönderildi', active: filter === 'sent', onToggle: () => setFilter((f) => (f === 'sent' ? null : 'sent')) },
          ]}
          trailing={
            <Button size="small" variant="contained" disabled={busy === 'all' || counts.withItems === counts.email} onClick={sendWeek}>
              Haftanın e-postalarını gönder
            </Button>
          }
        />

        <Box sx={nbHeadRow(GRID)}>
          <Box>ÜYE</Box>
          <Box>İHALE</Box>
          <Box>İLK İHALE</Box>
          <Box>DURUM</Box>
          <Box />
        </Box>

        {loading && !week ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={24} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: nb.textFaint, p: 3 }}>Bu filtreye uyan üye bulunmuyor.</Typography>
        ) : (
          rows.map((d) => (
            <Box key={d.memberId} sx={{ ...(nbGrid(GRID) as object), px: 2, py: 1.25, borderBottom: nbDividerLine }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                  {d.companyName || 'Firma adı girilmemiş'}
                </Typography>
                <Typography sx={{ fontSize: 11, color: nb.textFaint }}>{[d.city, d.status].filter(Boolean).join(' · ')}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{d.tenders.length}</Typography>
              <Typography sx={{ fontSize: 12, color: nb.textMuted }} noWrap>
                {d.tenders[0]?.title ?? '—'}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {d.emailSent && <Box sx={nbPill('good')}>e-posta</Box>}
                {d.whatsappSent && <Box sx={nbPill('good')}>WhatsApp</Box>}
                {!d.emailSent && !d.whatsappSent && <Box sx={nbPill('neutral')}>gönderilmedi</Box>}
              </Stack>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Button size="small" disabled={busy === d.memberId} onClick={() => openPreview(d)}>
                  Önizle ve WhatsApp
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy === d.memberId || d.emailSent || d.tenders.length === 0}
                  onClick={() => run(d.memberId, () => nbOpsService.digestSendEmail(d.memberId), 'Bülten e-postası gönderildi', 'E-posta gönderilemedi.')}
                >
                  E-posta
                </Button>
              </Stack>
            </Box>
          ))
        )}
      </Box>

      <Dialog open={!!preview} onClose={() => setPreview(null)} fullWidth maxWidth="sm">
        <DialogTitle>Haftalık bülten: {preview?.digest.companyName}</DialogTitle>
        <DialogContent>
          {preview && (
            <>
              <Typography sx={{ fontSize: 12, color: nb.textFaint, mb: 1 }}>
                {preview.digest.tenders.length} ihale, {preview.digest.listings.length} talep
                {!preview.digest.listingsAvailable ? ' (talepler şu an alınamadı)' : ''}. Metni düzenleyebilirsiniz; gönderim WhatsApp üzerinden yapılır.
              </Typography>
              <TextField multiline fullWidth minRows={12} value={preview.text} onChange={(e) => setPreview((p) => (p ? { ...p, text: e.target.value } : p))} />
              {!waLink && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Kayıtlı telefon numarası bulunamadı. Metni kopyalayarak gönderebilirsiniz.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => preview && navigator.clipboard.writeText(preview.text)}>Kopyala</Button>
          <Button disabled={!waLink} component="a" href={waLink ?? undefined} target="_blank" rel="noopener">
            WhatsApp'ta aç
          </Button>
          <Button
            variant="contained"
            disabled={!preview || preview.digest.whatsappSent}
            onClick={async () => {
              const id = preview?.digest.memberId;
              setPreview(null);
              if (id) await run(id, () => nbOpsService.digestMarkWhatsapp(id), 'WhatsApp ile gönderildi olarak kaydedildi', 'Kaydedilemedi.');
            }}
          >
            Gönderildi olarak işaretle
          </Button>
        </DialogActions>
      </Dialog>

      <NbUndoToast state={undo} onClose={() => setUndo(null)} />
    </Box>
  );
}
