/**
 * Haftalık ihale kısa listesi.
 *
 * Eşleştirme yüzlerce aday üretiyor; üyeye haftada birkaç güçlü ihale gitmeli.
 * Liste her üye için henüz gönderilmemiş, açık ihalelerden en yüksek puanlıları
 * gösterir; haftalık sınır (Ayarlar → İhale eşleştirme) uygulanmış gelir.
 *
 * Gönderim iki yoldan:
 *  - Uygulama + e-posta: seçilenler tek tıkla yönlendirilir (otomatik bildirim).
 *  - WhatsApp: seçilenler tek mesajda birleşir; panel metni ve wa.me bağlantısını
 *    hazırlar, mesajı admin atar, sonra "gönderildi" diye işaretler.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  nbOpsService,
  type NbMemberShortlist,
  type NbShortlistItem,
} from '../../services/nartbusiness/nbOpsService';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { NbFilterBar, NbKpi, NbPageHeader, NbUndoToast, nbCard, nbPill, type NbUndoState } from '../../components/nartbusiness/ui';
import { nb } from '../../theme/nbBrand';

function fmtDay(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

interface DraftState {
  member: NbMemberShortlist;
  tenderIds: string[];
  text: string;
}

export default function NbWeeklyShortlist() {
  const [params] = useSearchParams();
  const onlyMember = params.get('memberId');
  const [lists, setLists] = useState<NbMemberShortlist[]>([]);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [withItemsOnly, setWithItemsOnly] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [undo, setUndo] = useState<NbUndoState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nbOpsService.shortlist(onlyMember ? [onlyMember] : undefined);
      setLists(data);
      // Varsayılan: listedeki her ihale seçili — admin istemediğini çıkarır.
      setPicked(Object.fromEntries(data.map((m) => [m.memberId, new Set(m.items.map((i) => i.tenderId))])));
      setError(null);
    } catch (e) {
      setError(nbErrorMessage(e, 'İhale seçkisi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [onlyMember]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr');
    return lists.filter(
      (m) =>
        (!withItemsOnly || m.items.length > 0) &&
        (!q || (m.companyName ?? '').toLocaleLowerCase('tr').includes(q) || (m.city ?? '').toLocaleLowerCase('tr').includes(q)),
    );
  }, [lists, search, withItemsOnly]);

  const totals = useMemo(
    () => ({
      members: lists.filter((m) => m.items.length > 0).length,
      items: lists.reduce((s, m) => s + m.items.length, 0),
      atLimit: lists.filter((m) => m.remaining === 0).length,
    }),
    [lists],
  );

  const toggle = (memberId: string, tenderId: string) =>
    setPicked((p) => {
      const next = new Set(p[memberId] ?? []);
      if (next.has(tenderId)) next.delete(tenderId);
      else next.add(tenderId);
      return { ...p, [memberId]: next };
    });

  const selectedOf = (m: NbMemberShortlist) => m.items.filter((i) => picked[m.memberId]?.has(i.tenderId));

  /** Seçilenleri toplu olarak yönlendirir; tek bildirim ve tek e-posta ile iletir. */
  const refer = async (m: NbMemberShortlist, items: NbShortlistItem[], channel: 'IN_APP' | 'WHATSAPP') => {
    if (!items.length) return;
    setBusy(m.memberId);
    try {
      await nbAdminService.referTenderBatch({
        memberId: m.memberId,
        tenderIds: items.map((i) => i.tenderId),
        channel,
      });
      setUndo({
        message: `${m.companyName ?? 'Üye'}: ${items.length} ihale ${
          channel === 'IN_APP' ? 'tek bildirim ve e-posta ile iletildi' : 'WhatsApp ile iletildi olarak kaydedildi'
        }`,
      });
    } catch (e) {
      setError(nbErrorMessage(e, 'İhaleler iletilemedi'));
    } finally {
      setBusy(null);
      await load();
    }
  };

  const openDraft = async (m: NbMemberShortlist) => {
    const items = selectedOf(m);
    if (!items.length) return;
    setBusy(m.memberId);
    try {
      const text = await nbOpsService.shortlistDraft(m.memberId, items.map((i) => i.tenderId));
      setDraft({ member: m, tenderIds: items.map((i) => i.tenderId), text });
    } catch (e) {
      setError(nbErrorMessage(e, 'Mesaj hazırlanamadı.'));
    } finally {
      setBusy(null);
    }
  };

  const draftLink = draft ? nbWhatsAppLink(draft.member.phone, draft.text) : null;

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Ticaret & Fırsatlar"
        title="Haftalık İhale Seçkisi"
        subtitle="Her üye için henüz iletilmemiş, başvurusu açık ve uyum puanı en yüksek ihaleler. Haftalık gönderim sınırı uygulanır."
        kpis={
          <>
            <NbKpi label="SEÇKİSİ HAZIR ÜYE" value={totals.members} />
            <NbKpi label="ÖNERİLEN İHALE" value={totals.items} />
            <NbKpi label="HAFTALIK SINIRDA" value={totals.atLimit} hint="bu hafta yeter" tone={totals.atLimit ? 'warn' : 'neutral'} />
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ ...(nbCard as object), mb: 1.75 }}>
        <NbFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Firma ya da il…"
          chips={[
            {
              key: 'withItems',
              label: 'Yalnızca seçkisi hazır olanlar',
              active: withItemsOnly,
              onToggle: () => setWithItemsOnly((v) => !v),
            },
          ]}
          trailing={<Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>{visible.length} üye</Typography>}
        />
      </Box>

      {loading && lists.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={24} />
        </Box>
      ) : visible.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: nb.textFaint, p: 2 }}>
          Gösterilecek kısa liste yok. Eşleşme yoksa ihale eşleştirme eşiğini Ayarlar'dan kontrol et.
        </Typography>
      ) : (
        visible.map((m) => {
          const selected = selectedOf(m);
          return (
            <Box key={m.memberId} sx={{ ...(nbCard as object), p: 2, mb: 1.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{m.companyName || 'Firma adı girilmemiş'}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: nb.textFaint }}>
                    {[m.city, m.status].filter(Boolean).join(' · ')} · bu hafta iletilen: {m.sentThisWeek}/{m.weeklyLimit}
                    {m.locked ? ' · üyelik etkin değil, başlıklar gizli iletilir' : ''}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!selected.length || busy === m.memberId}
                    onClick={() => refer(m, selected, 'IN_APP')}
                  >
                    Uygulama + e-posta ({selected.length})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!selected.length || busy === m.memberId}
                    onClick={() => openDraft(m)}
                  >
                    WhatsApp mesajı hazırla
                  </Button>
                </Stack>
              </Stack>

              {m.items.length === 0 && (
                <Typography sx={{ fontSize: 12, color: nb.textFaint }}>
                  {m.remaining === 0 ? 'Haftalık sınıra ulaşıldı.' : 'İletilmeyi bekleyen uygun ihale bulunmuyor.'}
                </Typography>
              )}

              {m.items.map((it) => (
                <Stack key={it.tenderId} direction="row" spacing={1} alignItems="flex-start" sx={{ py: 0.75, borderTop: `1px solid ${nb.divider}` }}>
                  <Checkbox
                    size="small"
                    checked={!!picked[m.memberId]?.has(it.tenderId)}
                    onChange={() => toggle(m.memberId, it.tenderId)}
                    sx={{ p: 0.5 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>
                      {it.sourceUrl ? (
                        <Link href={it.sourceUrl} target="_blank" rel="noopener" underline="hover" color="inherit">
                          {it.title}
                        </Link>
                      ) : (
                        it.title
                      )}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>
                      {[it.authority, it.province, it.tenderType].filter(Boolean).join(' · ')} · son teklif {fmtDay(it.deadline)}
                    </Typography>
                    {it.reasons.length > 0 && (
                      <Typography sx={{ fontSize: 11, color: nb.textFaint }}>Neden: {it.reasons.join(', ')}</Typography>
                    )}
                  </Box>
                  <Box sx={nbPill(it.score >= 60 ? 'good' : it.score >= 40 ? 'info' : 'neutral')}>{Math.round(it.score)}</Box>
                </Stack>
              ))}
            </Box>
          );
        })
      )}

      <Dialog open={!!draft} onClose={() => setDraft(null)} fullWidth maxWidth="sm">
        <DialogTitle>WhatsApp mesajı: {draft?.member.companyName}</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: nb.textFaint, mb: 1 }}>
            Metni düzenleyebilirsiniz. Mesajı WhatsApp üzerinden gönderdikten sonra "Gönderildi olarak işaretle" ile kaydedin.
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={10}
            value={draft?.text ?? ''}
            onChange={(e) => setDraft((d) => (d ? { ...d, text: e.target.value } : d))}
          />
          {!draftLink && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Kayıtlı telefon numarası bulunamadı. Metni kopyalayarak gönderebilirsiniz.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => draft && navigator.clipboard.writeText(draft.text)}>Kopyala</Button>
          <Button disabled={!draftLink} component="a" href={draftLink ?? undefined} target="_blank" rel="noopener">
            WhatsApp'ta aç
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!draft) return;
              const m = draft.member;
              const items = m.items.filter((i) => draft.tenderIds.includes(i.tenderId));
              setDraft(null);
              await refer(m, items, 'WHATSAPP');
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
