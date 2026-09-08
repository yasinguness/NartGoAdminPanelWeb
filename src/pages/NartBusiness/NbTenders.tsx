import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Checkbox,
  IconButton,
  Link,
  List,
  ListItemButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  nbAdminService,
  NB_TENDER_STATUS_LABEL,
  NB_TENDER_REFERRAL_STATUS_LABEL,
  type NbConsortiumCandidate,
  type NbTenderDetail,
  type NbTenderListItem,
  type NbTenderMatch,
  type NbTenderChannel,
  type NbTenderReferralStatus,
  type NbTenderStatus,
} from '../../services/nartbusiness/nbAdminService';
import { relativeDate } from '../../utils/nbDisplay';
import { NbTitleBlock } from '../../components/nartbusiness/ui';

/**
 * İhaleler — EKAP'tan çekilen ihaleler ve her birinin altında eşleşen üyeler.
 *
 * Çekirdek prensip (bkz. docs/NartBusiness_Ihale_Modulu_Spec.docx):
 * **sistem önerir, insan karar verir.** Buradaki skorlar yalnızca aday
 * üretir; toplu otomatik bildirim yok. Yönlendirmeyi admin tek tek seçer.
 *
 * İki kanal var:
 * - **Uygulama bildirimi** — üyeye anında düşer, kaydı burada tutulur.
 * - **WhatsApp** — sistem taslak üretir, mesajı admin kendi gönderir.
 *
 * **Ödeme duvarı (docs/plan/nb-ihale-modulu.md v1.2):** ödemesi bekleyen ya
 * da denemesi bitmiş üyeler de eşleşme listesinde çıkar ve "ödeme bekliyor"
 * rozetiyle işaretlenir. Onlara yönlendirme yapmak kasıtlıdır: bildirim
 * ulaşır, ihalenin başlığı/idaresi/EKAP bağlantısı ulaşmaz. Üye ihaleyi
 * görmek için üyeliğini aktifleştirmek zorunda kalır.
 */

/** Skor renk kodu — spec A.5: yeşil >75, sarı 40-75. */
function scoreColor(score: number): 'success' | 'warning' {
  return score > 75 ? 'success' : 'warning';
}

function formatDeadline(iso?: string | null): string {
  if (!iso) return 'belirtilmemiş';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function NbTenders() {
  const [statusFilter, setStatusFilter] = useState<NbTenderStatus>('NEW');
  const [tenders, setTenders] = useState<NbTenderListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NbTenderDetail | null>(null);

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Yönlendirme diyaloğu
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftMemberId, setDraftMemberId] = useState<string | null>(null);
  const [draftPartnerIds, setDraftPartnerIds] = useState<string[]>([]);
  const [draftNote, setDraftNote] = useState('');
  const [draftSaving, setDraftSaving] = useState(false);
  // Varsayılan uygulama bildirimi: ödemesiz üyeye ulaşan ve kilidi doğru
  // uygulayan tek kanal bu. WhatsApp'ta mesajı admin yazdığı için ihale
  // detayı yanlışlıkla sızabilir.
  const [draftChannel, setDraftChannel] = useState<NbTenderChannel>('IN_APP');
  const [draftPaywalled, setDraftPaywalled] = useState(false);

  // Konsorsiyum diyaloğu
  const [consortiumOpen, setConsortiumOpen] = useState(false);
  const [consortium, setConsortium] = useState<NbConsortiumCandidate[]>([]);
  const [consortiumPicked, setConsortiumPicked] = useState<string[]>([]);

  const loadList = useCallback(
    async (status: NbTenderStatus, keepSelection = false) => {
      // SWR: liste zaten doluyken spinner'a kurban etme.
      setListLoading(tenders.length === 0);
      setError(null);
      try {
        const [page, c] = await Promise.all([
          nbAdminService.listTenders({ status, page: 0, size: 50 }),
          nbAdminService.getTenderCounts(),
        ]);
        setTenders(page.content);
        setCounts(c);
        if (!keepSelection) {
          setSelectedId(page.content.length > 0 ? page.content[0].id : null);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'İhaleler yüklenemedi.');
      } finally {
        setListLoading(false);
      }
    },
    [tenders.length],
  );

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await nbAdminService.getTenderDetail(id);
      setDetail(d);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'İhale detayı yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const referredIds = useMemo(
    () => new Set((detail?.referrals ?? []).map((r) => r.memberId)),
    [detail],
  );

  // ── Eylemler ────────────────────────────────────────────────

  async function openDraft(match: NbTenderMatch, partnerIds: string[] = []) {
    if (!detail) return;
    setDraftMemberId(match.memberId);
    setDraftPartnerIds(partnerIds);
    setDraftNote('');
    setDraftPaywalled(match.paywalled);
    try {
      const text = await nbAdminService.getTenderDraft(
        detail.id,
        match.memberId,
        partnerIds.length > 0 ? partnerIds : undefined,
      );
      setDraftText(text);
      setDraftOpen(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Taslak üretilemedi.');
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draftText);
      setToast('Mesaj panoya kopyalandı — WhatsApp\'a yapıştırabilirsin.');
    } catch {
      setToast('Kopyalanamadı, metni elle seçebilirsin.');
    }
  }

  /** Kaydet = "bu yönlendirmeyi yaptım" izi. Mesajı admin kendisi gönderir. */
  async function saveReferral() {
    if (!detail || !draftMemberId) return;
    setDraftSaving(true);
    try {
      await nbAdminService.referTender(detail.id, {
        memberId: draftMemberId,
        channel: draftChannel,
        consortiumIds: draftPartnerIds.length > 0 ? draftPartnerIds : undefined,
        note: draftNote.trim() || undefined,
      });
      setDraftOpen(false);
      setToast(
        draftChannel === 'IN_APP'
          ? 'Yönlendirme kaydedildi, bildirim gönderildi.'
          : 'Yönlendirme kaydedildi.',
      );
      await loadDetail(detail.id);
      await loadList(statusFilter, true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Yönlendirme kaydedilemedi.');
    } finally {
      setDraftSaving(false);
    }
  }

  async function changeStatus(status: NbTenderStatus) {
    if (!detail) return;
    try {
      await nbAdminService.updateTenderStatus(detail.id, status);
      setToast(`İhale "${NB_TENDER_STATUS_LABEL[status]}" olarak işaretlendi.`);
      await loadList(statusFilter, true);
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Durum güncellenemedi.');
    }
  }

  async function rematch() {
    if (!detail) return;
    try {
      const n = await nbAdminService.rematchTender(detail.id);
      setToast(`${n} eşleşme bulundu.`);
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Yeniden eşleştirme başarısız.');
    }
  }

  async function openConsortium() {
    if (!detail) return;
    try {
      const list = await nbAdminService.suggestConsortium(detail.id);
      setConsortium(list);
      // Skoru yüksek ilk üçü ön-seçili gelir; son karar insanın.
      setConsortiumPicked(list.slice(0, 3).map((c) => c.memberId));
      setConsortiumOpen(true);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Konsorsiyum önerisi alınamadı.');
    }
  }

  /** Seçili gruptaki ilk üyeye, diğerlerini "ortak" olarak anlatan taslak. */
  async function draftFromConsortium() {
    if (!detail || consortiumPicked.length === 0) return;
    const leadId = consortiumPicked[0];
    const partners = consortiumPicked.slice(1);
    const lead = detail.matches.find((m) => m.memberId === leadId);
    if (!lead) return;
    setConsortiumOpen(false);
    await openDraft(lead, partners);
  }

  async function updateReferralStatus(referralId: string, status: NbTenderReferralStatus) {
    if (!detail) return;
    try {
      await nbAdminService.updateTenderReferral(referralId, { status });
      setToast('Yönlendirme durumu güncellendi.');
      await loadDetail(detail.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Durum güncellenemedi.');
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <NbTitleBlock title="İhaleler" />
          <Typography variant="body2" color="text.secondary">
            Sistem eşleşme önerir; yönlendirme kararını sen verirsin. Otomatik bildirim gitmez.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => void loadList(statusFilter, true)}
          disabled={listLoading}
        >
          Yenile
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {toast && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast}
        </Alert>
      )}

      <ToggleButtonGroup
        size="small"
        exclusive
        value={statusFilter}
        onChange={(_, v) => v && setStatusFilter(v as NbTenderStatus)}
        sx={{ mb: 2 }}
      >
        {(['NEW', 'REVIEWED', 'ARCHIVED'] as NbTenderStatus[]).map((s) => (
          <ToggleButton key={s} value={s}>
            {NB_TENDER_STATUS_LABEL[s]} ({counts[s] ?? 0})
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        {/* Sol: ihale listesi */}
        <Paper sx={{ width: { xs: '100%', md: 340 }, flexShrink: 0, maxHeight: '75vh', overflow: 'auto' }}>
          {listLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : tenders.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Bu filtrede ihale yok.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {tenders.map((t) => (
                <ListItemButton
                  key={t.id}
                  selected={t.id === selectedId}
                  onClick={() => setSelectedId(t.id)}
                  sx={{ display: 'block', py: 1.5 }}
                >
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {t.title}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {[t.province, relativeDate(t.createdAt)].filter(Boolean).join(' · ')}
                    </Typography>
                    {t.matchCount > 0 && (
                      <Chip size="small" label={`${t.matchCount} eşleşme`} color="primary" variant="outlined" />
                    )}
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        {/* Sağ: detay + eşleşen üyeler */}
        <Paper sx={{ flex: 1, p: 2.5, minHeight: 300, width: '100%' }}>
          {detailLoading && !detail ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : !detail ? (
            <Typography variant="body2" color="text.secondary">
              Soldan bir ihale seç.
            </Typography>
          ) : (
            <>
              <Typography variant="h6" fontWeight={700}>
                {detail.title}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  İKN: {detail.externalId} · Kaynak: {detail.source}
                </Typography>
                {detail.authority && (
                  <Typography variant="body2" color="text.secondary">
                    İdare: {detail.authority}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Son teklif: {formatDeadline(detail.deadline)}
                  {detail.province ? ` · ${detail.province}` : ''}
                  {detail.tenderType ? ` · ${detail.tenderType}` : ''}
                </Typography>
                {detail.sourceUrl && (
                  <Link
                    href={detail.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    Kaynakta gör <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                )}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => void changeStatus('REVIEWED')}>
                  İncelendi işaretle
                </Button>
                <Button size="small" variant="outlined" onClick={() => void changeStatus('ARCHIVED')}>
                  Arşivle
                </Button>
                <Button size="small" onClick={() => void rematch()}>
                  Yeniden eşleştir
                </Button>
                {detail.matches.length > 1 && (
                  <Button
                    size="small"
                    startIcon={<GroupsOutlinedIcon />}
                    onClick={() => void openConsortium()}
                  >
                    Konsorsiyum öner
                  </Button>
                )}
              </Stack>

              {detail.description && (
                <>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                    {detail.description.length > 600
                      ? `${detail.description.slice(0, 600)}…`
                      : detail.description}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                EŞLEŞEN ÜYELER ({detail.matches.length})
              </Typography>
              {detail.matches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Eşleşen üye yok. Üye profillerindeki sektör/uzmanlık alanları boşsa eşleştirme
                  sinyal bulamaz.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {detail.matches.map((m) => (
                    <Paper key={m.memberId} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          size="small"
                          color={scoreColor(m.score)}
                          label={`%${Math.round(m.score)}`}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                          {m.memberName}
                        </Typography>
                        {m.paywalled && (
                          <Tooltip title="Bildirim ulaşır, ihale kilitli kalır. Üye detayı görmek için üyeliğini aktifleştirmek zorunda.">
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
                              label="ödeme bekliyor"
                            />
                          </Tooltip>
                        )}
                        {referredIds.has(m.memberId) && (
                          <Chip size="small" variant="outlined" label="yönlendirildi" />
                        )}
                        <Button size="small" variant="contained" onClick={() => void openDraft(m)}>
                          Yönlendir
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {[m.city, ...(m.matchedOn ?? [])].filter(Boolean).join(' · ')}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}

              {detail.referrals.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    YÖNLENDİRMELER
                  </Typography>
                  <Stack spacing={1}>
                    {detail.referrals.map((r) => (
                      <Stack
                        key={r.id}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ flexWrap: 'wrap' }}
                        useFlexGap
                      >
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
                          {r.memberName}
                          {r.consortiumIds.length > 0 && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {' '}· konsorsiyum ({r.consortiumIds.length + 1} üye)
                            </Typography>
                          )}
                        </Typography>
                        <TextField
                          select
                          size="small"
                          value={r.status}
                          onChange={(e) =>
                            void updateReferralStatus(r.id, e.target.value as NbTenderReferralStatus)
                          }
                          sx={{ minWidth: 150 }}
                        >
                          {(
                            ['SENT', 'INTERESTED', 'DECLINED', 'WON'] as NbTenderReferralStatus[]
                          ).map((s) => (
                            <MenuItem key={s} value={s}>
                              {NB_TENDER_REFERRAL_STATUS_LABEL[s]}
                            </MenuItem>
                          ))}
                        </TextField>
                        <Typography variant="caption" color="text.secondary">
                          {relativeDate(r.createdAt)}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ flexBasis: '100%' }}>
                          {r.channel === 'IN_APP' && !r.notifiedAt && (
                            <Chip
                              size="small"
                              color="error"
                              variant="outlined"
                              label="bildirim gitmedi"
                            />
                          )}
                          {r.lockedOnSend && !r.unlockedAt && (
                            <Chip size="small" variant="outlined" label="kilitli gönderildi" />
                          )}
                          {r.unlockedAt && (
                            <Tooltip title="Kilitli gitti, üye ödedikten sonra ihaleyi açtı — ödeme duvarının getirisi.">
                              <Chip size="small" color="success" label="ödemeye dönüştü" />
                            </Tooltip>
                          )}
                          {r.viewedAt ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`açtı · ${relativeDate(r.viewedAt)}`}
                            />
                          ) : (
                            <Chip size="small" variant="outlined" label="henüz açmadı" />
                          )}
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
            </>
          )}
        </Paper>
      </Stack>

      {/* Yönlendirme taslağı */}
      <Dialog open={draftOpen} onClose={() => setDraftOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Yönlendirme mesajı
          {draftPartnerIds.length > 0 && ' (konsorsiyum)'}
        </DialogTitle>
        <DialogContent>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={draftChannel}
            onChange={(_, v) => v && setDraftChannel(v as NbTenderChannel)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="IN_APP">Uygulama bildirimi</ToggleButton>
            <ToggleButton value="WHATSAPP">WhatsApp</ToggleButton>
          </ToggleButtonGroup>

          {draftChannel === 'IN_APP' ? (
            <Alert severity={draftPaywalled ? 'warning' : 'info'} sx={{ mb: 2 }}>
              {draftPaywalled ? (
                <>
                  Bu üyenin ödemesi bekliyor. Bildirim <b>ulaşacak</b> ama ihalenin başlığı,
                  idaresi ve EKAP bağlantısı <b>gösterilmeyecek</b> — yalnızca il, iş türü ve
                  kalan gün görünür. İhaleyi görmek için üyeliğini aktifleştirmesi gerekir.
                  Aşağıdaki taslak yalnız senin notun; üyeye gitmez.
                </>
              ) : (
                <>
                  Bildirim üyeye anında gider ve ihale detayı açık görünür. Aşağıdaki taslak
                  yalnız senin notun; üyeye gitmez.
                </>
              )}
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Taslağı gözden geçir, kişiselleştir, kopyala ve WhatsApp'tan kendin gönder. "Kaydet"
              yalnızca izi tutar — bu kanalda sistem mesaj göndermez.
              {draftPaywalled && (
                <>
                  {' '}
                  <b>Dikkat:</b> bu üyenin ödemesi bekliyor. WhatsApp'tan ihale başlığını
                  yazarsan üye ihaleyi EKAP'ta bedava bulur; ödeme duvarı yalnız uygulama
                  bildiriminde korunur.
                </>
              )}
            </Alert>
          )}

          <TextField
            multiline
            minRows={10}
            fullWidth
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <TextField
            fullWidth
            size="small"
            label="Not (opsiyonel)"
            placeholder="Örn. telefonla da aradım"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Tooltip title="Panoya kopyala">
            <IconButton onClick={() => void copyDraft()}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setDraftOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={() => void saveReferral()} disabled={draftSaving}>
            {draftSaving
              ? 'Gönderiliyor…'
              : draftChannel === 'IN_APP'
                ? 'Bildirimi gönder'
                : 'Gönderdim, kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Konsorsiyum önerisi */}
      <Dialog open={consortiumOpen} onClose={() => setConsortiumOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Konsorsiyum önerisi</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Sistem <b>farklı</b> sektörlerden en yüksek skorlu üyeleri getirdi — aynı sektörden iki
            üye rekabet yaratır, farklı sektörler tamamlayıcılık. Kimin kiminle çalışabileceğini
            sen bilirsin; seçimi düzenle.
          </Alert>
          <Stack>
            {consortium.map((c) => (
              <FormControlLabel
                key={c.memberId}
                control={
                  <Checkbox
                    checked={consortiumPicked.includes(c.memberId)}
                    onChange={(e) =>
                      setConsortiumPicked((prev) =>
                        e.target.checked
                          ? [...prev, c.memberId]
                          : prev.filter((id) => id !== c.memberId),
                      )
                    }
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{c.memberName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.sector}
                    </Typography>
                    <Chip size="small" color={scoreColor(c.score)} label={`%${Math.round(c.score)}`} />
                  </Stack>
                }
              />
            ))}
          </Stack>
          {consortiumPicked.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Taslak, listedeki ilk seçili üyeye yazılır; diğerleri "ortak" olarak anlatılır.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsortiumOpen(false)}>Vazgeç</Button>
          <Button
            variant="contained"
            onClick={() => void draftFromConsortium()}
            disabled={consortiumPicked.length < 2}
          >
            Taslağı gör
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
