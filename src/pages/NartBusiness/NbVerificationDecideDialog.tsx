import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Link,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  CaseTimelineEntry,
  CommitteeVoteType,
  Sector,
  VerificationCase,
} from '../../services/nartbusiness/nbTypes';
import {
  AuditNoteBlock,
  buildAuditNote,
  ConfirmationStep,
  isAuditNoteValid,
  RadioCardGroup,
  type AuditCategoryOption,
  type RadioCardOption,
} from '../../components/nartbusiness';
import {
  CaseTimelineList,
  DOC_TYPE_LABELS,
  RACE_LABELS,
  Row,
  STATUS_COLORS,
  STATUS_LABELS,
  thirdNeedsInfoWarning,
} from './verificationShared';
import { TIER_LABEL } from '../../utils/nbDisplay';
import { formatDateTime } from '../../utils/dateUtils';

interface Props {
  open: boolean;
  caseId: string | null;
  onClose: () => void;
  onDecided: () => void;
}

const STEPS = ['Vaka İncelemesi', 'Karar & Gerekçe', 'Onay'];

const VOTE_CATEGORIES: Record<CommitteeVoteType, AuditCategoryOption[]> = {
  APPROVE: [
    { value: 'COMPANY_VERIFIED', label: 'Şirket kanıtı yeterli (web/sosyal)' },
    { value: 'CULTURAL_VERIFIED', label: 'Kafkas kimliği teyit edildi' },
    { value: 'BOTH_VERIFIED', label: 'Hem şirket hem kimlik teyit edildi' },
    { value: 'TENURE_TRUSTED', label: 'NartGo kıdemi yeterli güven veriyor' },
    { value: 'OTHER_APPROVE', label: 'Diğer (notta açıkla)' },
  ],
  NEEDS_INFO: [
    { value: 'MISSING_DOC', label: 'Belge eksik (vergi/sicil/imza)' },
    { value: 'UNCLEAR_DOC', label: 'Belge okunaklı değil / şüpheli' },
    { value: 'COMPANY_UNCLEAR', label: 'Şirket bilgisi net değil' },
    { value: 'CULTURAL_UNCLEAR', label: 'Kafkas kimliği net değil' },
    { value: 'SOCIAL_PROOF_WEAK', label: 'Sosyal kanıt yetersiz' },
    { value: 'OTHER_NEEDS_INFO', label: 'Diğer (notta açıkla)' },
  ],
  REJECT: [
    { value: 'INSUFFICIENT_PROOF', label: 'Yetersiz kanıt — kabul kriterleri karşılanmıyor' },
    { value: 'FAKE_SUSPECT', label: 'Sahtelik / yanıltma şüphesi' },
    { value: 'CULTURAL_MISMATCH', label: 'Kafkas kimliği teyit edilemedi' },
    { value: 'POLICY_VIOLATION', label: 'Politika ihlali' },
    { value: 'OTHER_REJECT', label: 'Diğer (notta açıkla)' },
  ],
};

/** Kategori kodu → Türkçe etiket (tüm oy kategorilerinden düzleştirilmiş). */
const AUDIT_CATEGORY_LABEL: Record<string, string> = Object.values(VOTE_CATEGORIES)
  .flat()
  .reduce((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {} as Record<string, string>);

/**
 * Ham "[KATEGORI: MISSING_DOC] {gövde}" composed-note'unu admin önizlemesi için
 * okunur metne çevirir (enum görünmez). Backend'e giden not ham formatta kalır;
 * bu sadece görsel önizleme.
 */
function humanizeAuditNote(note: string): string {
  const m = note.match(/^\[KATEGORI:\s*([A-Z_]+)\]\s*([\s\S]*)$/);
  if (!m) return note;
  const label = AUDIT_CATEGORY_LABEL[m[1]] ?? m[1];
  return `Talep türü: ${label}\n${m[2].trim()}`;
}

const NEEDS_INFO_CHECKLIST = [
  { value: 'VERGI_LEVHASI', label: 'Vergi Levhası (güncel)' },
  { value: 'IMZA_SIRKULERI', label: 'İmza Sirküleri' },
  { value: 'TICARET_SICIL', label: 'Ticaret Sicil Gazetesi' },
  { value: 'FAALIYET_BELG', label: 'Faaliyet Belgesi' },
  { value: 'KIMLIK', label: 'Kimlik / Pasaport' },
  { value: 'WEBSITE_LINK', label: 'Kurumsal web sitesi linki' },
  { value: 'LINKEDIN_LINK', label: 'LinkedIn profil linki' },
  { value: 'CULTUREL_KAYNAC', label: 'Kafkas kimliğini destekleyen kaynak' },
];

/** "Bilmiyorum" vs boş alanlar için anlamsal ayrım. */
function IdentityRow({
  label,
  value,
  emptyLabel = 'Belirtilmedi',
}: {
  label: string;
  value?: string | null;
  emptyLabel?: string;
}) {
  const isBilmiyorum =
    value?.trim().toLowerCase() === 'bilmiyorum' ||
    value?.trim().toLowerCase() === 'bilinmiyor';
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      {isBilmiyorum ? (
        <Typography variant="body2" color="warning.main">
          ⚠ {value} (kullanıcı belirtti)
        </Typography>
      ) : value ? (
        <Typography variant="body2">{value}</Typography>
      ) : (
        <Typography variant="body2" color="text.disabled">
          ○ {emptyLabel}
        </Typography>
      )}
    </Stack>
  );
}

/** Sosyal kanıt satırı — dolu/boş görsel ayrımı + tıklanabilir link. */
function SocialRow({ label, url }: { label: string; url?: string | null }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography
        variant="body2"
        color={url ? 'success.main' : 'text.disabled'}
        sx={{ minWidth: 12 }}
      >
        {url ? '✓' : '○'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
        {label}
      </Typography>
      {url ? (
        <Link href={url} target="_blank" rel="noreferrer" variant="body2">
          {url.replace(/^https?:\/\//, '')}
        </Link>
      ) : (
        <Typography variant="body2" color="text.disabled">
          Girilmemiş
        </Typography>
      )}
    </Stack>
  );
}

export default function NbVerificationDecideDialog({
  open,
  caseId,
  onClose,
  onDecided,
}: Props) {
  const [step, setStep] = useState(0);
  const [reviewTab, setReviewTab] = useState(0);
  const [detail, setDetail] = useState<VerificationCase | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineEntry[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [voteResult, setVoteResult] = useState<VerificationCase | null>(null);
  const [vote, setVote] = useState<CommitteeVoteType | undefined>(undefined);
  const [auditCategory, setAuditCategory] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [needsInfoItems, setNeedsInfoItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nbAdminService.listSectors().then(setSectors).catch(() => {});
  }, []);

  // Vote tipi değişince kategori + ek bilgi seçimini sıfırla
  useEffect(() => {
    if (!vote) {
      setAuditCategory('');
      setNeedsInfoItems(new Set());
      return;
    }
    setAuditCategory(VOTE_CATEGORIES[vote][0].value);
    setNeedsInfoItems(new Set());
  }, [vote]);

  // Vaka detayı + timeline yükle
  useEffect(() => {
    if (!open || !caseId) return;
    setLoading(true);
    setStep(0);
    setReviewTab(0);
    setVote(undefined);
    setNoteBody('');
    setNeedsInfoItems(new Set());
    setError(null);
    setVoteResult(null);
    Promise.all([
      nbAdminService.getVerificationCase(caseId),
      nbAdminService.getCaseTimeline(caseId).catch(() => []),
    ])
      .then(([c, tl]) => {
        setDetail(c);
        setTimeline(tl);
      })
      .catch((e: any) => setError(e?.message ?? 'Vaka yüklenemedi'))
      .finally(() => setLoading(false));
  }, [open, caseId]);

  const sectorLabel = useMemo(() => {
    const codes = detail?.sectorCodes?.length ? detail.sectorCodes : detail?.sectorCode ? [detail.sectorCode] : [];
    if (!codes.length) return undefined;
    return codes.map((code) => { const s = sectors.find((x) => x.code === code); return s?.nameTr ?? code; }).join(', ');
  }, [detail?.sectorCodes, detail?.sectorCode, sectors]);

  const willAutoReject = useMemo(
    () => vote === 'NEEDS_INFO' && (detail?.needsInfoCount ?? 0) >= 2,
    [vote, detail?.needsInfoCount],
  );

  const noteValid = isAuditNoteValid(noteBody, 30);
  const decisionValid = !!vote && !!auditCategory && noteValid;

  const stepValid: Record<number, boolean> = {
    0: !!detail,
    1: decisionValid,
    2: true,
  };
  const canSubmit = !!vote && decisionValid && !!detail;

  const handleCloseRequest = () => {
    if (submitting) return;
    onClose();
  };

  const submit = async () => {
    if (!canSubmit || !detail || !vote) return;
    setSubmitting(true);
    setError(null);
    try {
      const composedNote = vote === 'NEEDS_INFO' && needsInfoItems.size > 0
        ? buildAuditNote(
            auditCategory,
            `İstenen: ${[...needsInfoItems]
              .map((v) => NEEDS_INFO_CHECKLIST.find((c) => c.value === v)?.label ?? v)
              .join(', ')}\n${noteBody}`,
          )
        : buildAuditNote(auditCategory, noteBody);
      await nbAdminService.submitCommitteeVote(detail.caseId, {
        vote,
        note: composedNote,
      });
      // Refetch to see if quorum triggered a status change
      try {
        const updated = await nbAdminService.getVerificationCase(detail.caseId);
        if (!updated || updated.status !== 'IN_REVIEW') {
          onDecided();
          onClose();
        } else {
          setVoteResult(updated);
        }
      } catch {
        // Fetch failed — assume quorum not met, show generic success
        setVoteResult(detail);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Oy gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const voteOptions: RadioCardOption<CommitteeVoteType>[] = useMemo(
    () => [
      {
        value: 'APPROVE',
        title: 'Onayla — Ödemeye Açar',
        description:
          'Vaka APPROVED olur, üye 7 gün içinde ödeme yapması beklenir. Süre dolarsa APPROVED_EXPIRED.',
        trailing: <Chip size="small" color="success" label="✓" />,
      },
      {
        value: 'NEEDS_INFO',
        title: 'Ek Bilgi İste',
        description:
          'Üyeden yeni belge / açıklama talep edilir. Toplam 2 turla sınırlı; 3. tur otomatik REJECTED.',
        trailing: (detail?.needsInfoCount ?? 0) >= 2 ? (
          <Chip size="small" color="error" variant="filled" label={`⚠ 3. tur = REJECTED`} />
        ) : (
          <Chip
            size="small"
            color="warning"
            label={`${detail?.needsInfoCount ?? 0}/2`}
          />
        ),
      },
      {
        value: 'REJECT',
        title: 'Reddet',
        description:
          'Terminal karar — vaka REJECTED olur. Üye dilerse yeni bir başvuru açabilir.',
        trailing: <Chip size="small" color="error" label="✗" />,
      },
    ],
    [detail?.needsInfoCount],
  );

  const renderReviewStep = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={6}>
          <Typography>Yükleniyor…</Typography>
        </Box>
      );
    }
    if (!detail) {
      return <Alert severity="error">Vaka bulunamadı.</Alert>;
    }

    const socialCount = [detail.linkedinUrl, detail.websiteUrl, detail.instagramUrl]
      .filter(Boolean).length;
    const committeeVotes = (timeline ?? []).filter((e) => e.type === 'VOTE');

    return (
      <Stack spacing={2}>
        {/* ── Başlık banner ── */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            borderLeft: 4,
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            {detail.companyName ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {[sectorLabel ?? detail.sectorCode, detail.city, detail.district]
              .filter(Boolean)
              .join(' · ')}
            {detail.nartgoTenureMonths != null &&
              ` · NartGo ${detail.nartgoTenureMonths} ay`}
          </Typography>
        </Box>

        {/* ── Durum şeridi — 3 ayrı kategori ── */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">Durum:</Typography>
            <Chip
              size="small"
              label={STATUS_LABELS[detail.status]}
              color={STATUS_COLORS[detail.status]}
            />
          </Stack>
          {detail.tier && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary">Kademe:</Typography>
              <Chip size="small" label={TIER_LABEL[detail.tier] ?? detail.tier} variant="outlined" />
            </Stack>
          )}
          {detail.needsInfoCount != null && detail.needsInfoCount > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary">Tur:</Typography>
              <Chip
                size="small"
                color={detail.needsInfoCount >= 2 ? 'error' : 'warning'}
                label={`Ek bilgi ${detail.needsInfoCount}/2`}
              />
            </Stack>
          )}
        </Stack>

        {/* ── Sekmeler ── */}
        <Box>
          <Tabs
            value={reviewTab}
            onChange={(_, v) => setReviewTab(v as number)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Bilgiler" />
            <Tab
              label={
                socialCount === 3
                  ? 'Sosyal Kanıt ✓'
                  : `Sosyal Kanıt ⚠ ${socialCount}/3`
              }
            />
            <Tab
              label={
                detail.documents.length > 0
                  ? `Belgeler (${detail.documents.length})`
                  : 'Belgeler'
              }
            />
            <Tab
              label={
                committeeVotes.length > 0
                  ? `Tarihçe · ${committeeVotes.length} oy`
                  : 'Tarihçe'
              }
            />
          </Tabs>

          {/* Sekme 0 — Bilgiler */}
          {reviewTab === 0 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Kafkas Kimliği
                </Typography>
                <Stack spacing={0.75}>
                  <Row
                    label="Halk"
                    value={detail.race ? RACE_LABELS[detail.race] : undefined}
                  />
                  <IdentityRow label="Sülale" value={detail.clanName} />
                  <IdentityRow label="Memleket" value={detail.hometownDetail} />
                  <IdentityRow
                    label="NartGo"
                    value={
                      detail.nartgoTenureMonths != null
                        ? `${detail.nartgoTenureMonths} ay`
                        : null
                    }
                    emptyLabel="Yok (ilk üyelik)"
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Şirket
                </Typography>
                <Stack spacing={0.5}>
                  <Row label="Şirket adı" value={detail.companyName} />
                  <Row label="Sektör" value={sectorLabel ?? detail.sectorCode} />
                  <Row label="Şehir" value={detail.city} />
                  {(detail.district || detail.country) && (
                    <Row
                      label="İlçe / Ülke"
                      value={[detail.district, detail.country]
                        .filter(Boolean)
                        .join(', ')}
                    />
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* UUID'ler — varsayılan kapalı */}
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  '&:before': { display: 'none' },
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                  <Typography variant="caption" color="text.secondary">
                    Sistem Bilgisi (Case ID, Üye ID…)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.75}>
                    {[
                      { label: 'Case ID', val: detail.caseId },
                      { label: 'Üye ID', val: detail.memberId },
                      { label: 'Kullanıcı ID', val: detail.userId },
                    ].map(({ label, val }) => (
                      <Stack
                        key={label}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ minWidth: 90 }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="caption" fontFamily="monospace">
                          {val}
                        </Typography>
                        <Tooltip title="Kopyala">
                          <IconButton
                            size="small"
                            onClick={() => navigator.clipboard.writeText(val)}
                          >
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}

          {/* Sekme 1 — Sosyal Kanıt */}
          {reviewTab === 1 && (
            <Stack spacing={1.5}>
              {socialCount < 3 && (
                <Alert
                  severity={socialCount === 0 ? 'error' : 'warning'}
                  variant="outlined"
                >
                  {socialCount === 0
                    ? 'Hiçbir sosyal kanıt girilmemiş.'
                    : `${socialCount}/3 sosyal kanıt doldurulmuş.`}
                  {socialCount <= 1 &&
                    ' Komite ek belge veya açıklama isteyebilir.'}
                </Alert>
              )}
              <SocialRow label="LinkedIn" url={detail.linkedinUrl} />
              <SocialRow label="Web sitesi" url={detail.websiteUrl} />
              <SocialRow label="Instagram" url={detail.instagramUrl} />
            </Stack>
          )}

          {/* Sekme 2 — Belgeler */}
          {reviewTab === 2 && (
            <Stack spacing={1.5}>
              {detail.documents.length === 0 ? (
                <Alert severity="info">
                  Belge yüklenmedi — hafif KYC akışında ön başvuru için belge
                  zorunlu değil. Komite ek belge isterse NEEDS_INFO ile talep
                  eder.
                </Alert>
              ) : (
                detail.documents.map((d) => (
                  <Stack
                    key={d.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2">
                      {DOC_TYPE_LABELS[d.type] ?? d.type}
                    </Typography>
                    <Link href={d.mediaUrl} target="_blank" rel="noreferrer" variant="body2">
                      Görüntüle ↗
                    </Link>
                  </Stack>
                ))
              )}
            </Stack>
          )}

          {/* Sekme 3 — Tarihçe */}
          {reviewTab === 3 && (
            <Stack spacing={2}>
              {committeeVotes.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Komite Oyları
                  </Typography>
                  <Stack spacing={1}>
                    {committeeVotes.map((v, i) => (
                      <Box
                        key={i}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {v.actorDisplayName ?? v.actorUserId?.substring(0, 8) + '…'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(v.at)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {v.description}
                        </Typography>
                        {v.detail && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ whiteSpace: 'pre-wrap', mt: 0.5, display: 'block' }}
                          >
                            {v.detail}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                  <Divider sx={{ mt: 2, mb: 1 }} />
                </Box>
              )}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <HistoryIcon fontSize="small" />
                  <Typography variant="subtitle2">Tüm Aksiyon Geçmişi</Typography>
                </Stack>
                <CaseTimelineList entries={timeline} loading={false} />
              </Box>
            </Stack>
          )}
        </Box>
      </Stack>
    );
  };

  const renderDecisionStep = () => (
    <Stack spacing={3}>
      <RadioCardGroup<CommitteeVoteType>
        label="Karar *"
        options={voteOptions}
        value={vote}
        onChange={setVote}
      />

      {thirdNeedsInfoWarning(
        vote === 'NEEDS_INFO' ? detail?.needsInfoCount : undefined,
      )}

      <Divider />

      {vote ? (
        <Stack spacing={2}>
          <AuditNoteBlock
            categories={VOTE_CATEGORIES[vote]}
            category={auditCategory}
            onCategoryChange={setAuditCategory}
            note={noteBody}
            onNoteChange={setNoteBody}
            placeholder={
              vote === 'APPROVE'
                ? "Onayın gerekçesini özetle (örn. 'LinkedIn + Ticaret Sicil teyitli; klan bilgisi NartGo profilinde de var')."
                : vote === 'NEEDS_INFO'
                ? "Adayın ne yapması gerektiğini net açıkla. (örn. 'Vergi levhası fotoğrafı okunaklı değil, güncel halini yeniden yükle')"
                : "Reddin gerekçesini açıkla (örn. 'Şirket web sitesi yok, sosyal hesaplar 1 hafta önce açılmış, sahtelik şüphesi')"
            }
          />
          {vote === 'NEEDS_INFO' && (
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <FormLabel
                component="legend"
                sx={{ fontSize: 13, mb: 1, display: 'block' }}
              >
                Hangi belge / bilgi gerekli? (opsiyonel — eklersen notta otomatik görünür)
              </FormLabel>
              <FormGroup row>
                {NEEDS_INFO_CHECKLIST.map((item) => (
                  <FormControlLabel
                    key={item.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={needsInfoItems.has(item.value)}
                        onChange={(e) => {
                          const next = new Set(needsInfoItems);
                          if (e.target.checked) next.add(item.value);
                          else next.delete(item.value);
                          setNeedsInfoItems(next);
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2">{item.label}</Typography>
                    }
                    sx={{ width: '50%', mr: 0 }}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </Stack>
      ) : (
        <Alert severity="info">
          Önce yukarıdan bir karar seç — gerekçe alanı karar tipine göre özelleşir.
        </Alert>
      )}
    </Stack>
  );

  const renderConfirmStep = () => {
    if (!detail || !vote) return null;
    const voteLabel = voteOptions.find((o) => o.value === vote)?.title;
    const selectedDocLabels =
      vote === 'NEEDS_INFO' && needsInfoItems.size > 0
        ? [...needsInfoItems]
            .map((v) => NEEDS_INFO_CHECKLIST.find((c) => c.value === v)?.label ?? v)
            .join(', ')
        : null;
    const composedNoteBody =
      selectedDocLabels ? `İstenen: ${selectedDocLabels}\n${noteBody}` : noteBody;
    const finalNote = buildAuditNote(auditCategory, composedNoteBody);
    const willTerminal = vote === 'REJECT' || willAutoReject;

    return (
      <ConfirmationStep
        sections={[
          {
            title: 'Vaka',
            rows: [
              { label: 'Şirket', value: detail.companyName },
              { label: 'Sektör', value: sectorLabel ?? detail.sectorCode },
              { label: 'Şehir', value: detail.city },
              {
                label: 'Halk · Sülale',
                value: detail.race
                  ? `${RACE_LABELS[detail.race]} · ${detail.clanName ?? '—'}`
                  : undefined,
              },
              {
                label: 'Ek bilgi geçmişi',
                value: `${detail.needsInfoCount ?? 0} / 2`,
              },
            ],
          },
          {
            title: 'Karar',
            rows: [
              { label: 'Oy', value: voteLabel },
              ...(selectedDocLabels
                ? [{ label: 'İstenen', value: selectedDocLabels }]
                : []),
              {
                label: 'Sonuç',
                value: willAutoReject
                  ? 'Başvuru otomatik reddedilecek (3. ek bilgi turu)'
                  : vote === 'APPROVE'
                  ? 'Başvuru onaylanır, ödeme penceresi açılır (7 gün)'
                  : vote === 'NEEDS_INFO'
                  ? 'Üyeye ek bilgi talebi gider'
                  : 'Başvuru kalıcı olarak reddedilir',
              },
            ],
            content: (
              <Box
                sx={{
                  backgroundColor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  mt: 1,
                }}
              >
                {humanizeAuditNote(finalNote)}
              </Box>
            ),
          },
        ]}
        warning={
          willTerminal ? (
            <>
              <b>Bu karar terminal olacak.</b> Vaka REJECTED'a düşer ve üye yeni bir
              başvuru açmadan ilerleyemez. Gerekçe audit log'a kalıcı yazılır.
            </>
          ) : vote === 'APPROVE' ? (
            "Üye 7 gün içinde ödeme yapmazsa APPROVED_EXPIRED'a düşer ve yeniden başvurması gerekir."
          ) : undefined
        }
      />
    );
  };

  const renderVoteResultStep = () => {
    if (!vote) return null;
    const voteLabel = voteOptions.find((o) => o.value === vote)?.title ?? vote;
    return (
      <Stack spacing={3} alignItems="center" py={2}>
        <Alert
          severity="success"
          sx={{ width: '100%' }}
        >
          <Typography variant="body2" fontWeight={600}>
            Oyunuz kaydedildi — {voteLabel}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Vaka hâlâ <b>İncelemede (IN_REVIEW)</b> durumunda. Komitenin diğer
            üyeleri de oy verdiğinde quorum sağlanır ve vaka otomatik ilerler.
            Bu diyaloğu kapatabilirsiniz.
          </Typography>
        </Alert>
        <Alert severity="info" sx={{ width: '100%' }}>
          Geliştirme ortamında tek adminle test ediyorsanız{' '}
          <code>NB_COMMITTEE_QUORUM=1</code> olarak ayarlandığından quorum
          anında sağlanmalı. Yine de IN_REVIEW görüyorsanız servis yeniden
          başlatıldı mı kontrol edin.
        </Alert>
      </Stack>
    );
  };

  const body = () => {
    if (voteResult) return renderVoteResultStep();
    switch (step) {
      case 0:
        return renderReviewStep();
      case 1:
        return renderDecisionStep();
      case 2:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleCloseRequest} maxWidth="lg" fullWidth>
      <DialogTitle>Başvuru Değerlendirmesi</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {!voteResult && (
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {body()}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseRequest} disabled={submitting}>
          Kapat
        </Button>
        {!voteResult && (
          <>
            <Box sx={{ flexGrow: 1 }} />
            {step > 0 && (
              <Button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={submitting}
              >
                Geri
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid[step] || submitting}
              >
                İleri
              </Button>
            ) : (
              <Button
                variant="contained"
                color={vote === 'REJECT' || willAutoReject ? 'error' : vote === 'APPROVE' ? 'success' : 'warning'}
                disabled={!canSubmit || submitting}
                onClick={submit}
              >
                {submitting
                  ? 'Gönderiliyor…'
                  : vote === 'APPROVE'
                  ? 'Onayı Gönder'
                  : vote === 'NEEDS_INFO'
                  ? willAutoReject
                    ? 'Reddet (otomatik)'
                    : 'Ek Bilgi İste'
                  : 'Reddet'}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
