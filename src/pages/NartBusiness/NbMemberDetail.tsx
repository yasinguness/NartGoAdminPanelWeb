import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VerifiedIcon from '@mui/icons-material/Verified';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  CaseTimelineEntry,
  NbMember,
  NbPeriodView,
  Sector,
  VerificationCase,
  VerificationDocument,
} from '../../services/nartbusiness/nbTypes';
import type { NbUserSearchResult } from '../../services/nartbusiness/nbAdminService';
import {
  fullDate,
  monthsBetween,
  PERIOD_STATUS_LABEL,
  RACE_LABEL,
  relativeDate,
  shortDate,
  STATUS_LABEL,
  TIER_LABEL,
  formatMoney,
} from '../../utils/nbDisplay';
import { NbSectionPaper, NbStatusBadge } from '../../components/nartbusiness';
import NbMemberActionDialog from './NbMemberActionDialog';

/**
 * Sprint 24 — Üye detay sayfası. Liste tablosundan satıra tıklayınca açılır.
 *
 * Bölümler:
 *   1. Header — kullanıcı kimliği + durum + kademe + ana aksiyon
 *   2. Üyelik & Aktivasyon — current period özeti, NB tenure, verified rozet
 *   3. Şirket Bilgisi
 *   4. Kafkas Kimliği
 *   5. Sosyal Bağlantılar
 *   6. Dönem Geçmişi (periods table — fee, status, dates)
 *   7. İletişim & Hesap (NartGo hesap özeti — email, telefon, kayıt tarihi)
 */
export default function NbMemberDetail() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<NbMember | null>(null);
  const [user, setUser] = useState<NbUserSearchResult | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<NbPeriodView[]>([]);
  const [verificationCase, setVerificationCase] = useState<VerificationCase | null>(null);
  const [caseTimeline, setCaseTimeline] = useState<CaseTimelineEntry[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);

  const load = async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    setUserLoadError(null);
    setVerificationCase(null);
    setCaseTimeline([]);
    try {
      const m = await nbAdminService.getMember(memberId);
      setMember(m);
      if (m) {
        let userFetchError: string | null = null;
        const fetchPromises: [Promise<any>, Promise<any>, Promise<any>, Promise<any>] = [
          nbAdminService.getUserById(m.userId).catch((e) => {
            // Hata mesajını kaybetmemek için yakala — defansif UX uyarısı için.
            const status = e?.response?.status;
            userFetchError = status ? `HTTP ${status}` : (e?.message ?? 'bilinmeyen hata');
            return null;
          }),
          nbAdminService.listMemberPeriods(memberId).catch(() => []),
          m.verificationCaseId
            ? nbAdminService.getVerificationCase(m.verificationCaseId).catch(() => null)
            : Promise.resolve(null),
          m.verificationCaseId
            ? nbAdminService.getCaseTimeline(m.verificationCaseId).catch(() => [])
            : Promise.resolve([]),
        ];
        const [u, ps, vc, tl] = await Promise.all(fetchPromises);
        setUser(u ?? null);
        setPeriods(ps ?? []);
        setVerificationCase(vc ?? null);
        setCaseTimeline(tl ?? []);
        if (!u) {
          // 200 + null data senaryosu: bağlanılabildi ama backend null döndü
          // (NartGo hesabı silinmiş veya nb.internal-token boş olabilir).
          setUserLoadError(
            userFetchError ??
              'NartGo hesabı bulunamadı (orphan üye veya hesap silinmiş olabilir)'
          );
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Üye yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  // Sektör listesi — sectorCode'u Türkçe ada çevirmek için.
  useEffect(() => {
    nbAdminService.listSectors().then(setSectors).catch(() => setSectors([]));
  }, []);

  const sectorLabel = useMemo(() => {
    const codes = member?.sectorCodes?.length ? member.sectorCodes : member?.sectorCode ? [member.sectorCode] : [];
    if (!codes.length) return undefined;
    return codes.map((code) => { const s = sectors.find((x) => x.code === code); return s?.nameTr ?? code; }).join(', ');
  }, [member?.sectorCodes, member?.sectorCode, sectors]);

  const userName = useMemo(() => {
    if (!user) return null;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.displayName || user.email;
  }, [user]);

  const userInitial = useMemo(() => {
    const src = userName ?? member?.companyName ?? '?';
    return src.trim().charAt(0).toUpperCase();
  }, [userName, member?.companyName]);

  const currentPeriod = useMemo(() => {
    if (!member?.currentPeriodId) return null;
    return periods.find((p) => p.id === member.currentPeriodId) ?? null;
  }, [member?.currentPeriodId, periods]);

  if (loading) {
    return (
      <Box p={3} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !member) {
    return (
      <Box p={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/nartbusiness/members')}
        >
          Üye listesine dön
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error ?? 'Üye bulunamadı.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Geri ve breadcrumb */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/nartbusiness/members')}
          size="small"
        >
          Üyeler
        </Button>
        <Typography variant="body2" color="text.disabled">
          /
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {member.companyName ?? 'Şirket bilgisi eksik'}
        </Typography>
      </Stack>

      {/* Header kart */}
      <Paper variant="outlined" sx={{ p: 3, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            {userInitial}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
              <Typography variant="h5" fontWeight={600}>
                {member.companyName ?? (
                  <Typography component="span" variant="h5" color="warning.main">
                    Şirket bilgisi eksik
                  </Typography>
                )}
              </Typography>
              {member.verifiedBusiness && (
                <Chip
                  size="small"
                  color="info"
                  icon={<VerifiedIcon />}
                  label="Doğrulanmış İşletme"
                  variant="outlined"
                />
              )}
            </Stack>
            {userName && (
              <Typography variant="body2" color="text.secondary">
                {userName}
                {user?.email ? ` · ${user.email}` : ''}
              </Typography>
            )}
            <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
              <NbStatusBadge status={member.status} label={STATUS_LABEL[member.status]} />
              <Chip
                size="small"
                variant="outlined"
                label={TIER_LABEL[member.tier]}
                sx={{ fontWeight: 500 }}
              />
              <Tooltip title={fullDate(member.joinedAt)} arrow>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Katıldı: ${relativeDate(member.joinedAt)}`}
                />
              </Tooltip>
            </Stack>
          </Box>
          <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
            <Button variant="contained" onClick={() => setActionOpen(true)}>
              Yönet
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack spacing={2.5}>
        {/* Başvuru & Komite İncelemesi */}
        {verificationCase && (
          <VerificationCaseSection
            caseData={verificationCase}
            timeline={caseTimeline}
            memberStatus={member.status}
          />
        )}

        {/* Üyelik & Aktivasyon */}
        <NbSectionPaper
          title="Üyelik & Aktivasyon"
          hint="Mevcut dönem ve durumun özeti."
        >
          {currentPeriod ? (
            <Box>
              <Typography variant="body2">
                <b>{TIER_LABEL[currentPeriod.tier]} yıllık üyelik</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {shortDate(currentPeriod.startsAt)} – {shortDate(currentPeriod.endsAt)}
                {' · '}
                {monthsBetween(currentPeriod.startsAt, new Date().toISOString())} ay aktif
                {' · '}
                Kalan: {monthsBetween(new Date().toISOString(), currentPeriod.endsAt)} ay
              </Typography>
              <Typography variant="body2" mt={0.5}>
                Ücret: <b>{formatMoney(currentPeriod.fee, currentPeriod.currency)}</b>
                {' · '}
                Durum: <b>{PERIOD_STATUS_LABEL[currentPeriod.status]}</b>
                {currentPeriod.paymentId
                  ? ' · Ödeme alındı'
                  : currentPeriod.status === 'PAYMENT_PENDING'
                  ? ' · Ödeme bekleniyor'
                  : ' · Offline tahsil'}
              </Typography>
            </Box>
          ) : (
            <Alert severity="info" variant="outlined">
              Aktif dönem yok. Üye henüz ödeme yapmamış veya tüm dönemler kapanmış.
            </Alert>
          )}

          {member.status === 'APPROVED_PENDING_PAYMENT' && member.approvalExpiresAt && (
            <Alert severity="warning" variant="outlined">
              Komite onayı sona eriyor:{' '}
              <b>{shortDate(member.approvalExpiresAt)}</b> tarihine kadar üyenin ödemeyi
              tamamlaması gerekir.
            </Alert>
          )}

          {member.status === 'ACTIVE' && currentPeriod && (() => {
            const daysLeft = Math.floor(
              (new Date(currentPeriod.endsAt).getTime() - Date.now()) / 86_400_000
            );
            if (daysLeft > 30) return null;
            return (
              <Alert
                severity={daysLeft <= 7 ? 'error' : 'warning'}
                variant="outlined"
              >
                {daysLeft <= 0
                  ? 'Üyelik süresi bugün sona eriyor. Scheduler henüz çalışmamış olabilir.'
                  : daysLeft === 1
                  ? 'Üyelik süresi yarın sona eriyor.'
                  : `Üyelik süresi ${daysLeft} gün içinde sona eriyor.`}{' '}
                Bitiş: <b>{shortDate(currentPeriod.endsAt)}</b>.
                Üye yenileme yapmazsa sistem otomatik olarak erişimini kısıtlayacak.
              </Alert>
            );
          })()}

          {member.status === 'EXPIRED' && (
            <Alert severity="error" variant="outlined">
              Yıllık üyelik süresi doldu. Üye yenileme yapana kadar NartBusiness'a
              erişimi yoktur.
            </Alert>
          )}

          {member.nartgoTenureMonths != null && member.nartgoTenureMonths >= 0 && (
            <Typography variant="caption" color="text.secondary">
              NartGo kıdemi: <b>{member.nartgoTenureMonths} ay</b>
            </Typography>
          )}
        </NbSectionPaper>

        {/* Şirket Bilgisi */}
        <NbSectionPaper title="Şirket Bilgisi">
          <DetailRow
            label="Şirket adı"
            value={member.companyName}
            emptyLabel="Şirket adı eksik"
            warnOnEmpty
          />
          <DetailRow
            label="Sektör"
            value={sectorLabel}
            emptyLabel="Sektör seçilmedi"
          />
          <DetailRow label="Şehir" value={member.city} emptyLabel="Şehir girilmedi" />
        </NbSectionPaper>

        {/* Kafkas Kimliği */}
        <NbSectionPaper title="Kafkas Kimliği">
          <DetailRow
            label="Halk"
            value={member.race ? RACE_LABEL[member.race] : undefined}
            emptyLabel="Halk seçilmedi"
          />
          <DetailRow
            label="Sülale"
            value={member.clanName}
            emptyLabel="Sülale girilmedi"
          />
          <DetailRow
            label="Memleket"
            value={member.hometownDetail}
            emptyLabel="Memleket girilmedi"
            mutedEmpty
          />
        </NbSectionPaper>

        {/* Sosyal Bağlantılar */}
        <NbSectionPaper title="Sosyal Bağlantılar">
          <SocialRow label="LinkedIn" url={member.linkedinUrl} />
          <SocialRow label="Web sitesi" url={member.websiteUrl} />
          <SocialRow label="Instagram" url={member.instagramUrl} />
        </NbSectionPaper>

        {/* Dönem geçmişi */}
        <NbSectionPaper
          title="Dönem Geçmişi"
          hint={`Toplam ${periods.length} dönem kaydı (en yeni üstte).`}
        >
          {periods.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Bu üyenin henüz hiç dönem kaydı yok.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kademe</TableCell>
                    <TableCell>Başlangıç</TableCell>
                    <TableCell>Bitiş</TableCell>
                    <TableCell align="right">Ücret</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>Ödeme</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{TIER_LABEL[p.tier]}</TableCell>
                      <TableCell>
                        <Tooltip title={fullDate(p.startsAt)} arrow>
                          <span>{shortDate(p.startsAt)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={fullDate(p.endsAt)} arrow>
                          <span>{shortDate(p.endsAt)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        {formatMoney(p.fee, p.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant={p.status === 'ACTIVE' ? 'filled' : 'outlined'}
                          color={
                            p.status === 'ACTIVE'
                              ? 'success'
                              : p.status === 'PAYMENT_PENDING'
                              ? 'warning'
                              : 'default'
                          }
                          label={PERIOD_STATUS_LABEL[p.status]}
                        />
                      </TableCell>
                      <TableCell>
                        {p.paymentId ? (
                          <Tooltip title="Online ödeme alındı" arrow>
                            <Typography variant="caption" color="success.main">
                              ✓ Ödendi
                            </Typography>
                          </Tooltip>
                        ) : p.fee === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Ücretsiz
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Offline / yok
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </NbSectionPaper>

        {/* İletişim & Hesap — NartGo profil özeti, debug/destek için anlamlı veri */}
        <NbSectionPaper
          title="İletişim & Hesap"
          hint="Üyenin NartGo hesabıyla bağlantılı temel iletişim bilgileri."
        >
          {!user && userLoadError && (
            <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                NartGo hesap bilgileri çekilemedi
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userLoadError}
              </Typography>
            </Alert>
          )}
          <ContactRow
            label="Ad Soyad"
            value={userName ?? undefined}
            emptyLabel="Ad-soyad eksik"
          />
          <ContactRow
            label="Email"
            value={user?.email}
            emptyLabel="Email yok"
            href={user?.email ? `mailto:${user.email}` : undefined}
            copyable
          />
          <ContactRow
            label="Telefon"
            value={user?.phone ?? undefined}
            emptyLabel="Telefon kayıtlı değil"
            href={user?.phone ? `tel:${user.phone}` : undefined}
            copyable
          />
          {user?.createdAt && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.25 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 130, flexShrink: 0 }}
              >
                NartGo'ya kayıt
              </Typography>
              <Tooltip title={fullDate(user.createdAt)} arrow>
                <Typography variant="body2">{relativeDate(user.createdAt)}</Typography>
              </Tooltip>
            </Stack>
          )}
        </NbSectionPaper>
      </Stack>

      <NbMemberActionDialog
        open={actionOpen}
        member={member}
        onClose={() => setActionOpen(false)}
        onActionDone={() => {
          setActionOpen(false);
          load();
        }}
      />
    </Box>
  );
}

// ============================================================
// Helper components — sayfa-içi
// ============================================================

// ============================================================
// Verification case — sabitler & yardımcılar
// ============================================================

const DOC_TYPE_LABEL: Record<string, string> = {
  VERGI_LEVHASI: 'Vergi Levhası',
  TICARET_SICIL: 'Ticaret Sicil',
  IMZA_SIRKULERI: 'İmza Sirküleri',
  KIMLIK: 'Kimlik',
  KULTUREL_BEYAN: 'Kültürel Beyan',
};

const CASE_STATUS_COLOR: Record<string, 'default' | 'warning' | 'error' | 'success' | 'info'> = {
  SUBMITTED: 'info',
  IN_REVIEW: 'info',
  NEEDS_INFO: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

const CASE_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'İnceleme Bekliyor',
  IN_REVIEW: 'Komitede',
  NEEDS_INFO: 'Ek Bilgi Bekleniyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

/** [KATEGORI: X] prefix'ini soyar, kategoriyi ayrı döner. */
function parseUserResponse(raw: string): { category: string | null; body: string } {
  const m = raw.match(/^\[KATEGORI:\s*([^\]]+)\]\s*/);
  if (!m) return { category: null, body: raw };
  return { category: m[1].trim(), body: raw.slice(m[0].length) };
}

const CATEGORY_LABEL: Record<string, string> = {
  DOC_PROVIDED: 'Belge Eklendi',
  CLARIFICATION: 'Açıklama',
  CORRECTION: 'Düzeltme',
  DISPUTE: 'İtiraz',
  OTHER: 'Diğer',
};

// ============================================================
// VerificationCaseSection
// ============================================================

function VerificationCaseSection({
  caseData,
  timeline,
  memberStatus,
}: {
  caseData: VerificationCase;
  timeline: CaseTimelineEntry[];
  memberStatus: string;
}) {
  const isActionable = memberStatus === 'NEEDS_INFO' || memberStatus === 'SUBMITTED';
  const needsInfoRound = caseData.needsInfoCount ?? 0;
  const userResponses = timeline.filter((e) => e.type === 'USER_RESPONSE');
  const hasNewResponse = userResponses.length > 0 && memberStatus === 'SUBMITTED';

  return (
    <NbSectionPaper
      title="Başvuru & Komite İncelemesi"
      hint="Doğrulama vakası ve komite kararı özeti."
    >
      {/* Özet satırı */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={1.5}>
        <Chip
          size="small"
          variant="filled"
          color={CASE_STATUS_COLOR[caseData.status] ?? 'default'}
          label={CASE_STATUS_LABEL[caseData.status] ?? caseData.status}
        />
        {needsInfoRound > 0 && (
          <Chip
            size="small"
            variant="outlined"
            color={needsInfoRound >= 2 ? 'error' : 'warning'}
            icon={<HelpOutlineIcon />}
            label={`Ek Bilgi Turu ${needsInfoRound}/2`}
          />
        )}
        {hasNewResponse && (
          <Chip
            size="small"
            color="primary"
            variant="filled"
            icon={<ChatBubbleOutlineIcon />}
            label="Yeni yanıt var — incelenmeli"
          />
        )}
      </Stack>

      {/* Uyarı: komite kararı bekleniyor + son tur */}
      {isActionable && needsInfoRound >= 2 && (
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          <b>Son tur.</b> Komite bir daha NEEDS_INFO gönderirse başvuru otomatik reddedilir.
          Yanıtı dikkatlice değerlendirin.
        </Alert>
      )}
      {isActionable && hasNewResponse && needsInfoRound < 2 && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Üye ek bilgi talebine yanıt verdi. Aşağıdaki yanıtı ve belgeleri inceleyin.
        </Alert>
      )}

      {/* Belgeler */}
      {caseData.documents.length > 0 && (
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1} display="block">
            YÜKLENEN BELGELER ({caseData.documents.length})
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {caseData.documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} mb={1.5} display="block">
            BAŞVURU TAKVİMİ
          </Typography>
          <Box
            sx={{
              borderLeft: '2px solid',
              borderColor: 'divider',
              ml: 1.5,
              pl: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            {timeline.map((entry, i) => (
              <TimelineEntry key={i} entry={entry} />
            ))}
          </Box>
        </Box>
      )}

      {timeline.length === 0 && caseData.documents.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Henüz takvim kaydı yok.
        </Typography>
      )}
    </NbSectionPaper>
  );
}

// ============================================================
// TimelineEntry
// ============================================================

function TimelineEntry({ entry }: { entry: CaseTimelineEntry }) {
  const isUserResponse = entry.type === 'USER_RESPONSE';
  const isNeedsInfo = entry.type === 'NEEDS_INFO';
  const isDecision = entry.type === 'APPROVED' || entry.type === 'REJECTED';

  const { category, body } = isUserResponse && entry.detail
    ? parseUserResponse(entry.detail)
    : { category: null, body: entry.detail ?? '' };

  const icon = {
    SUBMITTED: <AssignmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
    VOTE: <HowToVoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
    NEEDS_INFO: <HelpOutlineIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
    USER_RESPONSE: <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: 'primary.main' }} />,
    APPROVED: <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />,
    REJECTED: <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />,
  }[entry.type] ?? <AssignmentIcon sx={{ fontSize: 16 }} />;

  return (
    <Box
      sx={{
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: -26,
          top: 10,
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: isUserResponse
            ? 'primary.main'
            : isNeedsInfo
            ? 'warning.main'
            : isDecision
            ? entry.type === 'APPROVED' ? 'success.main' : 'error.main'
            : 'divider',
          border: '2px solid',
          borderColor: 'background.paper',
          boxShadow: '0 0 0 2px',
          boxShadowColor: isUserResponse ? 'primary.main' : 'divider',
        },
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: isUserResponse
            ? 'primary.50'
            : isNeedsInfo
            ? 'warning.50'
            : 'background.paper',
          borderColor: isUserResponse
            ? 'primary.200'
            : isNeedsInfo
            ? 'warning.200'
            : 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Box sx={{ mt: 0.25, flexShrink: 0 }}>{icon}</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" fontWeight={700} color="text.primary">
                {entry.description}
              </Typography>
              {isUserResponse && category && (
                <Chip
                  size="small"
                  label={CATEGORY_LABEL[category] ?? category}
                  color="primary"
                  variant="outlined"
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                {entry.actorDisplayName ? `${entry.actorDisplayName} · ` : ''}
                {relativeDate(entry.at)}
              </Typography>
            </Stack>
            {body && (
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontStyle: isNeedsInfo ? 'italic' : 'normal',
                  color: isNeedsInfo ? 'warning.dark' : 'text.primary',
                  bgcolor: (isUserResponse || isNeedsInfo) ? 'transparent' : undefined,
                  p: 0,
                }}
              >
                {body}
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

// ============================================================
// DocumentCard
// ============================================================

function DocumentCard({ doc }: { doc: VerificationDocument }) {
  const isPdf = doc.mediaUrl?.toLowerCase().endsWith('.pdf') ||
    doc.mediaUrl?.toLowerCase().includes('pdf');

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 180,
        maxWidth: 260,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 2 },
      }}
      component="a"
      href={doc.mediaUrl}
      target="_blank"
      rel="noreferrer"
    >
      {isPdf ? (
        <PictureAsPdfIcon sx={{ color: 'error.main', fontSize: 28, flexShrink: 0 }} />
      ) : (
        <AttachFileIcon sx={{ color: 'primary.main', fontSize: 28, flexShrink: 0 }} />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={700} display="block" noWrap>
          {DOC_TYPE_LABEL[doc.type] ?? doc.type}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {relativeDate(doc.uploadedAt)}
        </Typography>
      </Box>
      <OpenInNewIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
    </Paper>
  );
}

function DetailRow({
  label,
  value,
  emptyLabel,
  warnOnEmpty,
  mutedEmpty,
}: {
  label: string;
  value?: string | null;
  emptyLabel: string;
  warnOnEmpty?: boolean;
  mutedEmpty?: boolean;
}) {
  const hasValue = !!value?.toString().trim();
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.25 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 130, flexShrink: 0 }}
      >
        {label}
      </Typography>
      {hasValue ? (
        <Typography variant="body2">{value}</Typography>
      ) : warnOnEmpty ? (
        <Chip size="small" color="warning" variant="outlined" label={emptyLabel} />
      ) : mutedEmpty ? (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          {emptyLabel}
        </Typography>
      ) : (
        <Chip size="small" variant="outlined" label={emptyLabel} />
      )}
    </Stack>
  );
}

function SocialRow({ label, url }: { label: string; url?: string }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.25 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 130, flexShrink: 0 }}
      >
        {label}
      </Typography>
      {url ? (
        <Link href={url} target="_blank" rel="noreferrer" variant="body2">
          {url}
        </Link>
      ) : (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          Eklenmemiş
        </Typography>
      )}
    </Stack>
  );
}

function ContactRow({
  label,
  value,
  emptyLabel,
  href,
  copyable,
}: {
  label: string;
  value?: string | null;
  emptyLabel: string;
  href?: string;
  copyable?: boolean;
}) {
  const trimmed = value?.toString().trim();
  const hasValue = !!trimmed;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.25 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 130, flexShrink: 0 }}
      >
        {label}
      </Typography>
      {hasValue ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
          {href ? (
            <Link
              href={href}
              variant="body2"
              underline="hover"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {trimmed}
            </Link>
          ) : (
            <Typography variant="body2">{trimmed}</Typography>
          )}
          {copyable && (
            <Tooltip title="Kopyala" arrow>
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard?.writeText(trimmed!).catch(() => {
                    /* yoksay */
                  });
                }}
              >
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">
          {emptyLabel}
        </Typography>
      )}
    </Stack>
  );
}
