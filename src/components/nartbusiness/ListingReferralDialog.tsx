import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  nbAdminService,
  NB_LISTING_REFERRAL_STATUS_LABEL,
  type NbListingCandidate,
  type NbListingReferral,
  type NbListingReferralChannel,
  type NbListingRow,
} from '../../services/nartbusiness/nbAdminService';
import type { NbMember } from '../../services/nartbusiness/nbTypes';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nb } from '../../theme/nbBrand';
import {
  nbChip,
  nbDividerLine,
  nbGoldBtn,
  nbLabel,
  nbMono,
  nbPill,
  nbSecondaryBtn,
} from './ui';

/**
 * İlanı belirli üyelere yönlendirme paneli.
 *
 * <h3>Otomatik bildirimin yerine geçmiyor</h3>
 *
 * Talep ilanı yayımlandığında sektörü eşleşen üyelere kendiliğinden bildirim
 * gidiyor. Buradan çıkan gönderim tek bir üyeye, adminin seçimiyle ve iz
 * bırakarak gidiyor; WhatsApp ve e-posta da bu yolda devreye giriyor.
 *
 * <h3>İki kanal, iki farklı iş</h3>
 *
 * Uygulama kanalı bildirimi ve e-postayı sunucudan yollar. WhatsApp kanalı
 * yalnız kayıt tutar ve taslak üretir; mesajı admin kendi gönderir. Bu yüzden
 * WhatsApp seçildiğinde gönderim sonrası taslak ekranda kalıyor — kapatıp
 * gitmek, kaydı oluşmuş ama mesajı gitmemiş bir yönlendirme bırakırdı.
 */

/** Yalnız erişimi açık üyeye yönlendirme yapılabiliyor (sunucu da doğruluyor). */
const ELIGIBLE_STATUSES = ['ACTIVE', 'TRIAL'];

type Selected = {
  memberId: string;
  name: string;
  phone?: string | null;
  /** null: öneri listesinde değil, admin elle seçti. */
  score: number | null;
};

function memberName(m: { companyName?: string | null; memberId: string }): string {
  return m.companyName?.trim() || `Üye ${m.memberId.slice(0, 8)}`;
}

function scoreLabel(score: number | null): string {
  // Elle eklenenin skoru yok; "%0" yazmak yanlış bilgi olur.
  return score === null ? 'elle' : `%${Math.round(score)}`;
}

function fmtWhen(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(s));
  } catch {
    return '—';
  }
}

export default function ListingReferralDialog({
  listing,
  onClose,
  onSent,
}: {
  listing: NbListingRow | null;
  onClose: () => void;
  /** Dış ekranın sayaçlarını yenilemesi için. */
  onSent?: () => void;
}) {
  const [candidates, setCandidates] = useState<NbListingCandidate[]>([]);
  const [sent, setSent] = useState<NbListingReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [queue, setQueue] = useState<Selected[]>([]);
  const [channel, setChannel] = useState<NbListingReferralChannel>('IN_APP');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  /** WhatsApp kanalında gönderim sonrası ekranda kalan taslaklar. */
  const [drafts, setDrafts] = useState<{ name: string; phone?: string | null; text: string }[]>([]);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<NbMember[]>([]);
  const [searching, setSearching] = useState(false);

  const listingId = listing?.id ?? null;

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      const [cands, refs] = await Promise.all([
        nbAdminService.listingCandidates(listingId, { limit: 25 }),
        nbAdminService.listingReferralsOf(listingId),
      ]);
      setCandidates(cands);
      setSent(refs);
    } catch (e) {
      setError(nbErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (!listingId) return;
    setQueue([]);
    setNote('');
    setResult(null);
    setDrafts([]);
    setSearch('');
    setSearchResults([]);
    void load();
  }, [listingId, load]);

  /* Üye arama — sunucuda. İstemcide filtrelemek yanlış olurdu: istemci yalnız
     açık olan sayfayı görür, aranan üye ikinci sayfadaysa "sonuç yok" çıkar. */
  useEffect(() => {
    const needle = search.trim();
    if (needle.length < 2) {
      setSearchResults([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      nbAdminService
        .listMembers({ q: needle, size: 8 })
        .then((res) => {
          if (!alive) return;
          setSearchResults(res?.content ?? []);
        })
        .catch(() => {
          if (alive) setSearchResults([]);
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search]);

  const referredIds = useMemo(() => new Set(sent.map((r) => r.memberId)), [sent]);
  const queuedIds = useMemo(() => new Set(queue.map((q) => q.memberId)), [queue]);

  const toggle = useCallback((s: Selected) => {
    setQueue((prev) =>
      prev.some((x) => x.memberId === s.memberId)
        ? prev.filter((x) => x.memberId !== s.memberId)
        : [...prev, s],
    );
  }, []);

  const send = useCallback(async () => {
    if (!listingId || queue.length === 0) return;
    setSending(true);
    setError(null);
    setResult(null);
    setDrafts([]);

    let ok = 0;
    const failed: string[] = [];
    const newDrafts: { name: string; phone?: string | null; text: string }[] = [];

    for (const q of queue) {
      try {
        await nbAdminService.referListing(listingId, {
          memberId: q.memberId,
          channel,
          note: note.trim() || undefined,
        });
        ok += 1;
        if (channel === 'WHATSAPP') {
          // Taslak kayıttan SONRA çekiliyor: kayıt düşerse gönderilecek bir
          // mesaj da yok.
          const text = await nbAdminService.listingReferralDraft(listingId, q.memberId);
          newDrafts.push({ name: q.name, phone: q.phone, text });
        }
      } catch (e) {
        failed.push(`${q.name}: ${nbErrorMessage(e)}`);
      }
    }

    setDrafts(newDrafts);
    setQueue([]);
    setSending(false);
    setResult(
      ok > 0
        ? `${ok} üyeye yönlendirme kaydedildi${
            channel === 'IN_APP' ? ', bildirim ve e-posta gönderildi' : '. Mesajları aşağıdan gönder'
          }.`
        : null,
    );
    if (failed.length) setError(failed.join(' · '));
    await load();
    onSent?.();
  }, [listingId, queue, channel, note, load, onSent]);

  const setStatus = useCallback(
    async (referralId: string, status: NbListingReferral['status']) => {
      try {
        await nbAdminService.updateListingReferral(referralId, { status });
        await load();
      } catch (e) {
        setError(nbErrorMessage(e));
      }
    },
    [load],
  );

  if (!listing) return null;

  const kind = listing.type === 'REQUEST' ? 'Talep' : 'Arz';
  const closed = listing.status !== 'ACTIVE';

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={nbLabel}>YÖNLENDİR · {kind.toUpperCase()}</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.5 }} noWrap>
              {listing.title}
            </Typography>
            <Typography sx={{ fontSize: 12, color: nb.textFaint, mt: 0.25 }}>
              {[listing.city, listing.district].filter(Boolean).join(', ') || 'Bölge belirtilmemiş'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Kapat">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {closed && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu ilan açık değil. Kapanmış ya da süresi dolmuş ilan yönlendirilemez.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {result && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResult(null)}>
            {result}
          </Alert>
        )}

        {/* WhatsApp taslakları — gönderim sonrası ekranda kalır */}
        {drafts.length > 0 && (
          <Box sx={{ mb: 2, border: nbDividerLine, borderRadius: 1.5, p: 1.75 }}>
            <Typography sx={nbLabel}>GÖNDERİLECEK MESAJLAR</Typography>
            <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mb: 1.25, mt: 0.5 }}>
              Kayıt oluştu, mesajı sen gönderiyorsun. Metin hazır gelir ama otomatik
              gönderilmez; yollamadan önce oku ve kişiselleştir.
            </Typography>
            <Stack spacing={1.25}>
              {drafts.map((d) => {
                const wa = nbWhatsAppLink(d.phone, d.text);
                return (
                  <Box key={d.name} sx={{ bgcolor: nb.inputBg, borderRadius: 1.25, p: 1.25 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }} noWrap>
                        {d.name}
                      </Typography>
                      <Tooltip title="Metni kopyala">
                        <IconButton
                          size="small"
                          onClick={() => void navigator.clipboard?.writeText(d.text)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {wa ? (
                        <Button
                          size="small"
                          startIcon={<WhatsAppIcon />}
                          component="a"
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          sx={nbSecondaryBtn}
                        >
                          WhatsApp'ta aç
                        </Button>
                      ) : (
                        // Numarası yok: bağlantı kuramayız. Buton çizip
                        // çalışmamasından iyidir.
                        <Typography sx={{ fontSize: 11, color: nb.amber }}>
                          Numarası kayıtlı değil
                        </Typography>
                      )}
                    </Stack>
                    <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap', color: nb.text }}>
                      {d.text}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <>
            {/* Öneri listesi */}
            <Typography sx={nbLabel}>ÖNERİLEN ÜYELER</Typography>
            <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.5, mb: 1 }}>
              Sektörü ilana uyan, üyeliği açık üyeler. Skorun yanında gerekçesi yazılı;
              son kararı sen veriyorsun.
            </Typography>

            {candidates.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: nb.textFaint, py: 1.5 }}>
                Bu ilanın sektöründe uygun üye bulunamadı. Aşağıdan elle arayabilirsin.
              </Typography>
            ) : (
              <Box sx={{ maxHeight: '28vh', overflowY: 'auto', border: nbDividerLine, borderRadius: 1.5 }}>
                {candidates.map((c) => {
                  const already = c.alreadyReferred || referredIds.has(c.memberId);
                  const name = memberName(c);
                  return (
                    <Stack
                      key={c.memberId}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ px: 1.5, py: 1.1, borderBottom: nbDividerLine, '&:last-of-type': { borderBottom: 0 } }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                          {name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: nb.textFaint }} noWrap>
                          {[c.city, ...(c.matchedOn ?? [])].filter(Boolean).join(' · ')}
                        </Typography>
                      </Box>
                      <Typography sx={{ ...nbMono, fontSize: 11, color: nb.textFaint }}>
                        {scoreLabel(c.score)}
                      </Typography>
                      {already ? (
                        <Chip size="small" label="Gönderildi" sx={nbPill('neutral')} />
                      ) : (
                        <Button
                          size="small"
                          disabled={closed}
                          onClick={() =>
                            toggle({ memberId: c.memberId, name, phone: c.phone, score: c.score })
                          }
                          sx={queuedIds.has(c.memberId) ? nbGoldBtn : nbSecondaryBtn}
                        >
                          {queuedIds.has(c.memberId) ? 'Kuyrukta' : 'Ekle'}
                        </Button>
                      )}
                    </Stack>
                  );
                })}
              </Box>
            )}

            {/* Elle arama */}
            <Box sx={{ mt: 2 }}>
              <Typography sx={nbLabel}>ELLE ÜYE ARA</Typography>
              <TextField
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Şirket adı, şehir, kişi adı…"
                sx={{ mt: 0.75 }}
              />
              {searching && <LinearProgress sx={{ mt: 0.75 }} />}
              {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
                <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 0.75 }}>
                  Sonuç yok.
                </Typography>
              )}
              {searchResults.map((m) => {
                const eligible = ELIGIBLE_STATUSES.includes(m.status);
                const already = referredIds.has(m.memberId);
                const name = memberName({ companyName: m.companyName, memberId: m.memberId });
                return (
                  <Stack
                    key={m.memberId}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ px: 0.5, py: 0.9, borderBottom: nbDividerLine }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 12.5 }} noWrap>
                        {name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: nb.textFaint }} noWrap>
                        {[m.city, m.status].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    {already ? (
                      <Chip size="small" label="Gönderildi" sx={nbPill('neutral')} />
                    ) : !eligible ? (
                      // Sebebi yazılı: "neden ekleyemiyorum" sorusunu sunucu
                      // hatasıyla öğrenmek kötü bir deneyim.
                      <Tooltip title="İlan yönlendirmesi yalnız üyeliği aktif ya da denemede olan üyelere gönderilir.">
                        <Chip size="small" label="Uygun değil" sx={nbPill('warn')} />
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        disabled={closed}
                        onClick={() =>
                          toggle({
                            memberId: m.memberId,
                            name,
                            phone: m.phoneNumber,
                            score: null,
                          })
                        }
                        sx={queuedIds.has(m.memberId) ? nbGoldBtn : nbSecondaryBtn}
                      >
                        {queuedIds.has(m.memberId) ? 'Kuyrukta' : 'Ekle'}
                      </Button>
                    )}
                  </Stack>
                );
              })}
            </Box>

            {/* Kuyruk + kanal + not */}
            <Box sx={{ mt: 2, border: nbDividerLine, borderRadius: 1.5, p: 1.75 }}>
              <Typography sx={nbLabel}>KUYRUK · {queue.length}</Typography>
              {queue.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: nb.textFaint, mt: 0.75 }}>
                  Yukarıdan üye ekle.
                </Typography>
              ) : (
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.75, mt: 0.75 }}>
                  {queue.map((q) => (
                    <Chip
                      key={q.memberId}
                      size="small"
                      label={`${q.name} · ${scoreLabel(q.score)}`}
                      onDelete={() =>
                        setQueue((prev) => prev.filter((x) => x.memberId !== q.memberId))
                      }
                    />
                  ))}
                </Stack>
              )}

              <Typography sx={{ ...nbLabel, mt: 2 }}>KANAL</Typography>
              <Stack direction="row" sx={{ gap: 0.75, mt: 0.75 }}>
                <Button disableElevation onClick={() => setChannel('IN_APP')} sx={nbChip(channel === 'IN_APP')}>
                  Uygulama
                </Button>
                <Button disableElevation onClick={() => setChannel('WHATSAPP')} sx={nbChip(channel === 'WHATSAPP')}>
                  WhatsApp
                </Button>
              </Stack>
              <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.75, lineHeight: 1.5 }}>
                {channel === 'IN_APP'
                  ? 'Bildirim üyeye anında düşer ve e-posta da gider. Kaydı burada tutulur.'
                  : 'Sistem taslak üretir, mesajı sen gönderirsin. Kayıt yine tutulur, bildirim çıkmaz.'}
              </Typography>

              <Typography sx={{ ...nbLabel, mt: 2 }}>NOT (OPSİYONEL)</Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kuyruktaki herkese aynı not gider."
                sx={{ mt: 0.75 }}
              />

              <Button
                fullWidth
                disableElevation
                disabled={closed || sending || queue.length === 0}
                onClick={() => void send()}
                sx={{ ...nbGoldBtn, mt: 1.75 }}
              >
                {sending ? 'Gönderiliyor…' : `${queue.length} üyeye yönlendir`}
              </Button>
            </Box>

            {/* Gönderilmiş */}
            {sent.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={nbLabel}>GÖNDERİLMİŞ · {sent.length}</Typography>
                <Box sx={{ mt: 0.75, border: nbDividerLine, borderRadius: 1.5 }}>
                  {sent.map((r) => (
                    <Stack
                      key={r.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ px: 1.5, py: 1.1, borderBottom: nbDividerLine, '&:last-of-type': { borderBottom: 0 } }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                          {r.memberName || `Üye ${r.memberId.slice(0, 8)}`}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: nb.textFaint }} noWrap>
                          {r.channel === 'DIGEST' ? 'Haftalık bülten' : r.channel === 'IN_APP' ? 'Uygulama' : 'WhatsApp'} · {fmtWhen(r.createdAt)}
                          {/* Kanal uygulamayken bildirim gitmediyse bunu
                              söylemek zorunlu: yoksa admin üyenin haberi
                              olduğunu sanır. */}
                          {r.channel === 'IN_APP' && !r.notifiedAt && ' · bildirim gitmedi'}
                          {r.channel === 'IN_APP' && !r.emailedAt && ' · e-posta gitmedi'}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={NB_LISTING_REFERRAL_STATUS_LABEL[r.status]}
                        sx={nbPill(
                          r.status === 'WON' ? 'good' : r.status === 'DECLINED' ? 'bad' : 'info',
                        )}
                      />
                      {r.status === 'SENT' && (
                        <>
                          <Button size="small" sx={nbSecondaryBtn} onClick={() => void setStatus(r.id, 'INTERESTED')}>
                            İlgilendi
                          </Button>
                          <Button size="small" sx={nbSecondaryBtn} onClick={() => void setStatus(r.id, 'DECLINED')}>
                            İlgilenmedi
                          </Button>
                        </>
                      )}
                      {r.status === 'INTERESTED' && (
                        <Button size="small" sx={nbGoldBtn} onClick={() => void setStatus(r.id, 'WON')}>
                          İş bağlandı
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
