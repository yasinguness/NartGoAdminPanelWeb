/**
 * Üye detayı "Fırsatlar" — bu üyeye şimdi ne iletilebilir, tek yerde:
 *
 *  1. Önerilen ihaleler (haftalık kısa listeyle aynı kaynak) + geçmiş yönlendirmeler
 *  2. Önerilen işbirlikleri / tanıştırmalar (eşleştirme motoru)
 *  3. İş yönlendirmeleri: üyeye uygun açık talepler, üyenin kendi talepleri,
 *     üyeden üyeye müşteri yönlendirmeleri
 *
 * Her bölüm ayrı yüklenir: biri yanıt vermezse diğerleri çalışır. WhatsApp
 * mesajı otomatik gitmez — panel metni ve wa.me bağlantısını hazırlar, admin
 * gönderir ve "Gönderildi" ile kaydeder.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  nbOpsService,
  type NbMemberOpportunities,
  type NbMemberShortlist,
} from '../../services/nartbusiness/nbOpsService';
import {
  nbAdminService,
  type NbConsortiumCandidate,
  type NbListingRow,
  type NbMatchSuggestion,
  type NbDismissedSuggestion,
} from '../../services/nartbusiness/nbAdminService';
import ListingReferralDialog from './ListingReferralDialog';
import { nbWhatsAppLink } from '../../services/nartbusiness/nbPhone';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { relativeDate } from '../../utils/nbDisplay';
import { nbPill } from './ui';
import { NbSectionPaper } from '.';
import NbMemberTenderHistory from './NbMemberTenderHistory';
import { useRole } from '../../hooks/useRole';
import { nb } from '../../theme/nbBrand';

const REFERRAL_STATUS: Record<string, string> = {
  SENT: 'gönderildi',
  INTERESTED: 'ilgilendi',
  BID: 'teklif verdi',
  WON: 'kazandı',
  DECLINED: 'ilgilenmedi',
  PROPOSED: 'önerildi',
  ACCEPTED: 'kabul',
  REJECTED: 'red',
  CLOSED: 'kapandı',
};

function fmtDay(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

/** Metni düzenlenebilir WhatsApp diyaloğu; "Gönderildi" kaydı çağırana bırakılır. */
interface WaDraft {
  title: string;
  text: string;
  phone?: string | null;
  onSent: () => Promise<boolean>;
}

function Section({ title, children, loading, error, onRetry }: { onRetry: () => void; title: string; children: React.ReactNode; loading: boolean; error?: string | null }) {
  return (
    <NbSectionPaper title={title}>
      {error ? (
        <Alert severity="warning" action={<Button onClick={onRetry}>Tekrar dene</Button>}>{error}</Alert>
      ) : loading ? (
        <CircularProgress size={20} />
      ) : (
        children
      )}
    </NbSectionPaper>
  );
}

const sub = { fontSize: 11.5, color: nb.textMuted } as const;
const faint = { fontSize: 11, color: nb.textFaint } as const;
const label = { fontSize: 10, letterSpacing: '0.12em', color: nb.textFaint, fontWeight: 600, mt: 2, mb: 0.5 } as const;

export default function NbMemberOpportunities({
  memberId,
  companyName,
  phone,
  onIntroduce,
  onToast,
}: {
  memberId: string;
  companyName?: string | null;
  phone?: string | null;
  /** Tanıştırma çekmecesini öneri seçili açar (üye detayındaki çekmece). */
  onIntroduce: (partner: NbMatchSuggestion) => void;
  onToast: (message: string) => void;
}) {
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useRole();
  const canManage = isAdmin || hasRole('NB_ADMIN');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [dismissed, setDismissed] = useState<NbDismissedSuggestion[]>([]);
  const [hideTarget, setHideTarget] = useState<NbMatchSuggestion | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [hideError, setHideError] = useState<string | null>(null);

  // 1. İhaleler
  const [shortlist, setShortlist] = useState<NbMemberShortlist | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [tLoading, setTLoading] = useState(true);
  const [tError, setTError] = useState<string | null>(null);

  // 2. Tanıştırma önerileri
  const [suggestions, setSuggestions] = useState<NbMatchSuggestion[]>([]);
  const [anchorState, setAnchorState] = useState<string | null>(null);
  const [iLoading, setILoading] = useState(true);
  const [iError, setIError] = useState<string | null>(null);

  // 3. İlanlar / yönlendirmeler
  const [opps, setOpps] = useState<NbMemberOpportunities | null>(null);
  const [lLoading, setLLoading] = useState(true);
  const [lError, setLError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState<WaDraft | null>(null);
  /** Ortak ihale: seçilen ihale için tamamlayıcı sektörlerden ortak adayları. */
  const [consortium, setConsortium] = useState<{ tenderId: string; title: string; candidates: NbConsortiumCandidate[]; picked: Set<string> } | null>(null);
  /** Üyenin kendi ilanı için tedarikçi aday diyaloğu (İlanlar ekranındakiyle aynı). */
  const [supplierFor, setSupplierFor] = useState<NbListingRow | null>(null);

  const loadTenders = useCallback(async () => {
    setTLoading(true);
    try {
      const lists = await nbOpsService.shortlist([memberId]);
      const mine = lists.find((l) => l.memberId === memberId) ?? null;
      setShortlist(mine);
      setPicked(new Set(mine?.items.slice(0, mine.remaining).map((i) => i.tenderId) ?? []));
      setHistoryRefresh((v) => v + 1);
      setTError(null);
    } catch (e) {
      setTError(nbErrorMessage(e, 'İhale önerileri şu an alınamıyor.'));
    } finally {
      setTLoading(false);
    }
  }, [memberId]);

  const loadIntros = useCallback(async () => {
    setILoading(true);
    try {
      const r = await nbAdminService.introductionSuggestions(memberId, 8);
      setSuggestions(r.items ?? []);
      setDismissed(r.dismissed ?? []);
      setAnchorState(r.anchorState);
      setIError(null);
    } catch (e) {
      setIError(nbErrorMessage(e, 'Tanıştırma önerileri şu an alınamıyor.'));
    } finally {
      setILoading(false);
    }
  }, [memberId]);

  const loadListings = useCallback(async () => {
    setLLoading(true);
    try {
      setOpps(await nbOpsService.memberOpportunities(memberId, 10));
      setLError(null);
    } catch (e) {
      setLError(nbErrorMessage(e, 'İlan fırsatları şu an alınamıyor.'));
    } finally {
      setLLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadTenders();
    void loadIntros();
    void loadListings();
  }, [loadTenders, loadIntros, loadListings]);

  // ── İhale eylemleri ─────────────────────────────────────────────────────
  const selectedTenders = shortlist?.items.filter((i) => picked.has(i.tenderId)) ?? [];

  const referTenders = async (channel: 'IN_APP' | 'WHATSAPP', ids: string[]) => {
    setBusy(true);
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await nbAdminService.referTender(id, { memberId, channel });
      } catch (e) {
        failed.push(nbErrorMessage(e, 'gönderilemedi'));
      }
    }
    if (failed.length) setError(`${ids.length - failed.length} gönderildi, ${failed.length} gönderilemedi: ${failed.join(' · ')}`);
    else onToast(`${ids.length} ihale ${channel === 'IN_APP' ? 'bildirim ve e-posta ile iletildi' : 'WhatsApp ile iletildi olarak kaydedildi'}`);
    await loadTenders();
    setBusy(false);
    return failed.length === 0;
  };

  const tenderWhatsApp = async () => {
    const ids = selectedTenders.map((i) => i.tenderId);
    if (!ids.length) return;
    try {
      const text = await nbOpsService.shortlistDraft(memberId, ids);
      setWa({ title: 'İhale bilgilendirmesi', text, phone, onSent: () => referTenders('WHATSAPP', ids) });
    } catch (e) {
      setError(nbErrorMessage(e, 'Taslak hazırlanamadı.'));
    }
  };

  const notRelevant = async (tenderId: string) => {
    setBusy(true);
    try {
      await nbAdminService.reportTenderMismatch(tenderId, memberId);
      onToast('Eşleşme kaldırıldı. Bu ihale üyeye tekrar önerilmeyecek.');
      await loadTenders();
    } catch (e) {
      setError(nbErrorMessage(e, 'Kaydedilemedi.'));
    } finally { setBusy(false); }
  };

  const openConsortium = async (tenderId: string, title: string) => {
    try {
      const candidates = (await nbAdminService.suggestConsortium(tenderId)).filter((c) => c.memberId !== memberId);
      setConsortium({ tenderId, title, candidates, picked: new Set(candidates.slice(0, 2).map((c) => c.memberId)) });
    } catch (e) {
      setError(nbErrorMessage(e, 'Ortak firma önerileri alınamadı.'));
    }
  };

  /** Konsorsiyum taslağı: "tek başına büyük gelebilir, ağımızdaki X ve Y ile birlikte…" */
  const consortiumDraft = async () => {
    if (!consortium) return;
    const c = consortium;
    const partnerIds = [...c.picked];
    try {
      const text = await nbAdminService.getTenderDraft(c.tenderId, memberId, partnerIds);
      setConsortium(null);
      setWa({
        title: `Ortak teklif önerisi: ${c.title}`,
        text,
        phone,
        onSent: async () => {
          setBusy(true);
          try {
            await nbAdminService.referTender(c.tenderId, { memberId, channel: 'WHATSAPP', consortiumIds: partnerIds });
            onToast('Ortak teklif önerisi kaydedildi. Firmaları Tanıştırmalar ekranından birbiriyle tanıştırabilirsiniz.');
            await loadTenders();
            return true;
          } catch (e) {
            setError(nbErrorMessage(e, 'Kaydedilemedi.'));
            return false;
          } finally {
            setBusy(false);
          }
        },
      });
    } catch (e) {
      setError(nbErrorMessage(e, 'Taslak hazırlanamadı.'));
    }
  };

  // ── İlan eylemleri ──────────────────────────────────────────────────────
  const referListing = async (listingId: string, channel: 'IN_APP' | 'WHATSAPP') => {
    setBusy(true);
    try {
      await nbAdminService.referListing(listingId, { memberId, channel });
      onToast(channel === 'IN_APP' ? 'Talep bildirim ve e-posta ile iletildi' : 'WhatsApp ile iletildi olarak kaydedildi');
      await loadListings();
      return true;
    } catch (e) {
      setError(nbErrorMessage(e, 'Yönlendirilemedi.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const listingWhatsApp = async (listingId: string, title: string) => {
    try {
      const text = await nbAdminService.listingReferralDraft(listingId, memberId);
      setWa({ title, text, phone, onSent: () => referListing(listingId, 'WHATSAPP') });
    } catch (e) {
      setError(nbErrorMessage(e, 'Taslak hazırlanamadı.'));
    }
  };

  const waLink = wa ? nbWhatsAppLink(wa.phone, wa.text) : null;

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── 1. İhaleler ─────────────────────────────────────────────── */}
      <Section onRetry={() => void loadTenders()} title="Önerilen ihaleler" loading={tLoading && !shortlist} error={tError}>
        {shortlist && (
          <Typography sx={{ ...faint, mb: 1 }}>
            Bu hafta iletilen ihale: {shortlist.sentThisWeek}/{shortlist.weeklyLimit}
            {shortlist.locked ? ' · Üyelik etkin olmadığından ihale başlıkları gizli iletilir' : ''}
          </Typography>
        )}
        {!shortlist || shortlist.items.length === 0 ? (
          <Typography sx={sub}>
            {shortlist && shortlist.remaining === 0
              ? 'Haftalık sınıra ulaşıldı.'
              : 'İletilmeyi bekleyen uygun ihale bulunmuyor.'}
          </Typography>
        ) : (
          <>
            {shortlist.items.map((it) => (
              <Box key={it.tenderId} sx={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', gap: 1, alignItems: 'start', py: 1.25, borderTop: `1px solid ${nb.divider}` }}>
                <Checkbox
                  size="small"
                  sx={{ p: 0.5 }}
                  inputProps={{ 'aria-label': `${it.title} seç` }}
                  disabled={!canManage || busy || (!picked.has(it.tenderId) && picked.size >= shortlist.remaining)}
                  checked={picked.has(it.tenderId)}
                  onChange={() =>
                    setPicked((p) => {
                      const n = new Set(p);
                      if (n.has(it.tenderId)) n.delete(it.tenderId);
                      else n.add(it.tenderId);
                      return n;
                    })
                  }
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                    {it.sourceUrl ? (
                      <Link href={it.sourceUrl} target="_blank" rel="noopener" underline="hover" color="inherit">
                        {it.title}
                      </Link>
                    ) : (
                      it.title
                    )}
                  </Typography>
                  <Typography sx={sub}>
                    {[it.authority, it.province].filter(Boolean).join(' · ')} · son teklif {fmtDay(it.deadline)}
                  </Typography>
                  {it.reasons.length > 0 && <Typography sx={faint}>Eşleşme: {it.reasons.join(', ')}</Typography>}
                </Box>
                <Box sx={nbPill(it.score >= 60 ? 'good' : 'info')}>{Math.round(it.score)}</Box>
                <Stack direction="row" spacing={1} sx={{ gridColumn: '2 / -1', flexWrap: 'wrap' }}>
                <Tooltip title="Ağdaki tamamlayıcı firmalarla ortak teklif verilmesini önerin">
                  <Button disabled={!canManage || busy} size="small" sx={{ minWidth: 0, fontSize: 11 }} onClick={() => openConsortium(it.tenderId, it.title)}>
                    Ortak bul
                  </Button>
                </Tooltip>
                <Tooltip title="Eşleşmeyi kaldırır; ihale bu üyeye tekrar önerilmez">
                  <Button disabled={!canManage || busy} size="small" sx={{ minWidth: 0, fontSize: 11 }} onClick={() => notRelevant(it.tenderId)}>
                    Uygun değil
                  </Button>
                </Tooltip>
                </Stack>
              </Box>
            ))}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
              <Button size="small" variant="contained" disabled={!canManage || busy || !selectedTenders.length} onClick={() => referTenders('IN_APP', selectedTenders.map((i) => i.tenderId))}>
                Bildirim ve e-posta ile ilet ({selectedTenders.length})
              </Button>
              <Button size="small" variant="outlined" disabled={!canManage || busy || !selectedTenders.length} onClick={tenderWhatsApp}>
                WhatsApp mesajı hazırla
              </Button>
            </Stack>
          </>
        )}

      </Section>

      <NbMemberTenderHistory memberId={memberId} refreshKey={historyRefresh} />

      {/* ── 2. Tanıştırmalar ─────────────────────────────────────────── */}
      <Section onRetry={() => void loadIntros()} title="İş birliği ve tanıştırma önerileri" loading={iLoading} error={iError}>
        {suggestions.length === 0 ? (
          <Typography sx={sub}>
            {anchorState === 'NO_PROFILE' || anchorState === 'NO_EMBEDDING'
              ? 'Öneri oluşturmak için profil bilgileri yetersiz. Firma açıklaması, sektör ve uzmanlık alanları tamamlandığında öneriler görüntülenecektir.'
              : 'Şu an için öneri bulunmuyor. Tanıştırma ekranından firma arayarak seçim yapabilirsiniz.'}
          </Typography>
        ) : (
          suggestions.map((s) => (
            <Stack key={s.memberId} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 0.75, borderTop: `1px solid ${nb.divider}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Button onClick={() => navigate(`/nartbusiness/members/${s.memberId}`)} sx={{ p: 0, textTransform: 'none', textAlign: 'left' }}>{s.companyName || s.displayName || 'Üye'}</Button>
                <Typography sx={sub}>
                  {[s.city, s.sectorCode].filter(Boolean).join(' · ')}
                  {s.sameCity ? ' · aynı şehir' : ''}
                  {s.valueChainWeight ? ' · tedarik zinciri ilişkisi' : ''}
                </Typography>
                {s.verifiedBusiness && <Typography sx={faint}>Doğrulanmış işletme</Typography>}
                {s.summary && <Typography sx={faint}>{s.summary}</Typography>}
              </Box>
              <Button disabled={!canManage || busy} size="small" variant="outlined" onClick={() => onIntroduce(s)}>
                Tanıştır
              </Button>
              <Button disabled={!canManage || busy} size="small" onClick={() => { setHideTarget(s); setHideReason(''); setHideError(null); }}>Uygun değil</Button>
            </Stack>
          ))
        )}
      </Section>

      {dismissed.length > 0 && <NbSectionPaper collapsible defaultCollapsed title={`Gizlenen iş birliği önerileri (${dismissed.length})`}>
        <Typography variant="body2" color="text.secondary">Bu işletme için tekrar önerilmez. Geri aldığınızda uygunluğu yeniden değerlendirilir.</Typography>
        {dismissed.map((item) => <Stack key={item.memberId} direction="row" spacing={1} alignItems="center">
          <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2">{item.companyName}</Typography>{item.reason && <Typography variant="caption">{item.reason}</Typography>}</Box>
          <Button disabled={!canManage || busy} onClick={async () => {
            setBusy(true);
            try { await nbAdminService.restoreIntroductionSuggestion(memberId, item.memberId); await loadIntros(); }
            catch (e) { setError(nbErrorMessage(e, 'Öneri geri alınamadı.')); }
            finally { setBusy(false); }
          }}>Geri al</Button>
        </Stack>)}
      </NbSectionPaper>}
      <Dialog open={!!hideTarget} onClose={() => { if (!busy) setHideTarget(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Öneriyi gizle</DialogTitle>
        <DialogContent><Typography sx={{ mb: 2 }}>{hideTarget?.companyName || hideTarget?.displayName} bu işletmeye tekrar önerilmez. İşlemi geri alabilirsiniz.</Typography>
          {hideError && <Alert severity="error" sx={{ mb: 2 }}>{hideError}</Alert>}
          <TextField autoFocus fullWidth multiline label="Gerekçe (isteğe bağlı)" inputProps={{ maxLength: 500 }} value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
        </DialogContent>
        <DialogActions><Button disabled={busy} onClick={() => setHideTarget(null)}>Vazgeç</Button><Button variant="contained" disabled={busy || !canManage} onClick={async () => {
          if (!hideTarget) return;
          setBusy(true); setHideError(null);
          try { await nbAdminService.dismissIntroductionSuggestion(memberId, hideTarget.memberId, hideReason.trim()); setHideTarget(null); await loadIntros(); }
          catch (e) { setHideError(nbErrorMessage(e, 'Öneri gizlenemedi.')); }
          finally { setBusy(false); }
        }}>Gizle</Button></DialogActions>
      </Dialog>

      {/* ── 3. İş yönlendirmeleri ────────────────────────────────────── */}
      <Section onRetry={() => void loadListings()} title="İş yönlendirmeleri" loading={lLoading} error={lError}>
        {opps && (
          <>
            <Typography sx={{ ...label, mt: 0 }}>ÜYEYE UYGUN AÇIK TALEPLER</Typography>
            {!opps.suggestionsAvailable && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Eşleştirme servisine ulaşılamadı; liste eksik görüntüleniyor olabilir.
              </Alert>
            )}
            {opps.suggested.length === 0 && opps.suggestionsAvailable && (
              <Typography sx={sub}>Üyenin sektörüyle eşleşen, henüz iletilmemiş açık talep bulunmuyor.</Typography>
            )}
            {opps.suggested.map((l) => (
              <Stack key={l.listingId} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 0.75, borderTop: `1px solid ${nb.divider}` }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                    <Box component="span" sx={{ ...nbPill(l.type === 'REQUEST' ? 'info' : 'neutral'), mr: 0.75 }}>
                      {l.type === 'REQUEST' ? 'talep' : 'arz'}
                    </Box>
                    {l.title}
                  </Typography>
                  <Typography sx={sub}>
                    {[l.ownerCompanyName, l.city].filter(Boolean).join(' · ')}
                    {l.expiresAt ? ` · son gün ${fmtDay(l.expiresAt)}` : ''}
                  </Typography>
                  {l.matchedOn.length > 0 && <Typography sx={faint}>Eşleşme: {l.matchedOn.join(', ')}</Typography>}
                </Box>
                <Box sx={nbPill(l.score >= 60 ? 'good' : 'info')}>{l.score}</Box>
                <Button size="small" variant="contained" disabled={!canManage || busy} onClick={() => referListing(l.listingId, 'IN_APP')}>
                  Yönlendir
                </Button>
                <Button size="small" disabled={!canManage || busy} onClick={() => listingWhatsApp(l.listingId, l.title)}>
                  WhatsApp
                </Button>
              </Stack>
            ))}

            <Typography sx={label}>ÜYENİN AÇIK TALEPLERİ</Typography>
            {opps.own.length === 0 ? (
              <Typography sx={sub}>Üyenin açık talebi bulunmuyor. İhtiyaçlarını görüşerek üye adına talep oluşturabilirsiniz.</Typography>
            ) : (
              opps.own.map((l) => (
                <Stack key={l.listingId} direction="row" spacing={1} alignItems="center" sx={{ py: 0.6, borderTop: `1px solid ${nb.divider}` }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{l.title}</Typography>
                    <Typography sx={sub}>
                      {l.quotes} teklif · {l.interests} ilgi · {l.referralsSent} tedarikçiye yönlendirildi
                      {l.expiresAt ? ` · son gün ${fmtDay(l.expiresAt)}` : ''}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setSupplierFor({
                        id: l.listingId,
                        ownerMemberId: memberId,
                        ownerCompanyName: companyName,
                        type: l.type,
                        title: l.title,
                        city: l.city,
                        sectorCode: l.sectorCode,
                        status: 'ACTIVE',
                        expiresAt: l.expiresAt,
                      } as NbListingRow)
                    }
                  >
                    Tedarikçi bul
                  </Button>
                </Stack>
              ))
            )}

            <Typography sx={label}>MÜŞTERİ YÖNLENDİRMELERİ</Typography>
            {opps.customerReferrals.length === 0 ? (
              <Typography sx={sub}>Üyeler arası müşteri yönlendirmesi bulunmuyor.</Typography>
            ) : (
              opps.customerReferrals.map((r) => (
                <Stack key={r.id} direction="row" justifyContent="space-between" spacing={1} sx={{ py: 0.4 }}>
                  <Typography sx={{ fontSize: 12 }}>
                    {r.direction === 'GIVEN' ? 'Yönlendirdi' : 'Yönlendirme aldı'}: {r.customerName}
                    {r.dealValueTry ? ` · ${r.dealValueTry.toLocaleString('tr-TR')} TL` : ''}
                  </Typography>
                  <Typography sx={{ ...faint, whiteSpace: 'nowrap' }}>
                    {REFERRAL_STATUS[r.status ?? ''] ?? r.status} · {relativeDate(r.createdAt)}
                  </Typography>
                </Stack>
              ))
            )}
          </>
        )}
      </Section>

      <Dialog open={!!consortium} onClose={() => setConsortium(null)} fullWidth maxWidth="sm">
        <DialogTitle>Ortak teklif: {consortium?.title}</DialogTitle>
        <DialogContent>
          <Typography sx={{ ...faint, mb: 1 }}>
            Bu ihaleyle eşleşen, tamamlayıcı sektörlerdeki üye firmalar. Seçtiğiniz firmalar mesajda olası iş ortakları olarak belirtilir.
          </Typography>
          {consortium && consortium.candidates.length === 0 && (
            <Typography sx={sub}>Bu ihale için tamamlayıcı sektörde uygun firma bulunmuyor.</Typography>
          )}
          {consortium?.candidates.map((c) => (
            <Stack key={c.memberId} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
              <Checkbox
                size="small"
                checked={consortium.picked.has(c.memberId)}
                onChange={() =>
                  setConsortium((prev) => {
                    if (!prev) return prev;
                    const n = new Set(prev.picked);
                    if (n.has(c.memberId)) n.delete(c.memberId);
                    else n.add(c.memberId);
                    return { ...prev, picked: n };
                  })
                }
              />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.memberName}</Typography>
                <Typography sx={faint}>
                  {c.sector} · uyum puanı {Math.round(c.score)}
                  {c.matchedOn.length ? ` · ${c.matchedOn.slice(0, 3).join(', ')}` : ''}
                </Typography>
              </Box>
            </Stack>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsortium(null)}>Vazgeç</Button>
          <Button variant="contained" disabled={!consortium || consortium.picked.size === 0} onClick={consortiumDraft}>
            WhatsApp mesajı hazırla
          </Button>
        </DialogActions>
      </Dialog>

      <ListingReferralDialog listing={supplierFor} onClose={() => setSupplierFor(null)} onSent={loadListings} />

      <Dialog open={!!wa} onClose={() => { if (!busy) setWa(null); }} fullWidth maxWidth="sm">
        <DialogTitle>WhatsApp mesajı: {companyName || 'Üye'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Typography sx={{ ...faint, mb: 1 }}>{wa?.title}. Metni düzenleyebilirsiniz; gönderim WhatsApp üzerinden yapılır.</Typography>
          <TextField label="WhatsApp mesajı" disabled={busy} multiline fullWidth minRows={9} value={wa?.text ?? ''} onChange={(e) => setWa((d) => (d ? { ...d, text: e.target.value } : d))} />
          {!waLink && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Kayıtlı telefon numarası bulunamadı. Metni kopyalayarak gönderebilirsiniz.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => wa && navigator.clipboard.writeText(wa.text)}>Kopyala</Button>
          <Button disabled={!waLink} component="a" href={waLink ?? undefined} target="_blank" rel="noopener">
            WhatsApp'ta aç
          </Button>
          <Button
            variant="contained"
            disabled={!canManage || busy}
            onClick={async () => {
              const d = wa;
              setError(null);
              if (d && await d.onSent()) setWa(null);
            }}
          >
            Gönderildi olarak işaretle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
