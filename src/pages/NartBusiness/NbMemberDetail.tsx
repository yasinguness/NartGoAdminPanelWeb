import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import LockResetIcon from '@mui/icons-material/LockReset';
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
import type { NbUserSearchResult, NbResendTemplate, NbMemberViewStats } from '../../services/nartbusiness/nbAdminService';
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
import { NbSectionPaper, NbStatusBadge, useNbMobile } from '../../components/nartbusiness';
import NbMemberActionDialog from './NbMemberActionDialog';
import NbEditBusinessDialog from './NbEditBusinessDialog';

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
  const fullScreen = useNbMobile();

  const [member, setMember] = useState<NbMember | null>(null);
  const [viewStats, setViewStats] = useState<NbMemberViewStats | null>(null);
  const [user, setUser] = useState<NbUserSearchResult | null>(null);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<NbPeriodView[]>([]);
  const [verificationCase, setVerificationCase] = useState<VerificationCase | null>(null);
  const [caseTimeline, setCaseTimeline] = useState<CaseTimelineEntry[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  // "Şifrenizi belirleyin" — Keycloak UPDATE_PASSWORD + VERIFY_EMAIL action maili.
  // manual-email Thymeleaf akışından ayrıdır: link Keycloak token'ı taşır, 72 saat geçerli.
  const handleSendSetPassword = async () => {
    if (!member) return;
    const target = user?.email ? ` (${user.email})` : '';
    if (
      !window.confirm(
        `Bu üyeye "şifrenizi belirleyin" e-postası gönderilsin mi?${target}\n\n` +
          'Keycloak üzerinden 72 saat geçerli, gerçek bir şifre-belirleme + e-posta ' +
          'doğrulama linki gönderilir. Şifresini hiç belirlememiş ya da onboarding ' +
          'maili ulaşmamış üye için kullanın.',
      )
    )
      return;
    setPwBusy(true);
    try {
      const r = await nbAdminService.sendSetPasswordEmail(member.memberId);
      alert(`Şifre belirleme e-postası gönderildi${r.to ? `: ${r.to}` : '.'}`);
    } catch (e: any) {
      alert(
        e?.response?.data?.error?.message ??
          e?.message ??
          'Şifre belirleme e-postası gönderilemedi.',
      );
    } finally {
      setPwBusy(false);
    }
  };

  const handleTrial = async (kind: 'grant' | 'extend' | 'revoke') => {
    if (!member) return;

    // Süre üyeye göre belirlenebilir: verirken ve uzatırken gün sorulur.
    let days: number | undefined;
    if (kind === 'grant' || kind === 'extend') {
      const label =
        kind === 'grant'
          ? 'Deneme süresi kaç gün olsun? (örn. 30, 60, 90)'
          : 'Deneme kaç gün uzatılsın?';
      const raw = window.prompt(label, kind === 'grant' ? '30' : '7');
      if (raw === null) return; // vazgeçti
      days = parseInt(raw, 10);
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        alert('Geçerli bir gün sayısı gir (1-365).');
        return;
      }
    } else if (!window.confirm('Deneme şimdi sonlandırılsın mı? (üye ödeme bekleyene döner)')) {
      return;
    }

    setTrialBusy(true);
    try {
      if (kind === 'grant') await nbAdminService.grantTrial(member.memberId, days);
      else if (kind === 'extend') await nbAdminService.extendTrial(member.memberId, days ?? 7);
      else await nbAdminService.revokeTrial(member.memberId);
      const m = await nbAdminService.getMember(member.memberId);
      setMember(m);
    } catch (e: any) {
      alert(e?.response?.data?.error?.message ?? e?.message ?? 'Deneme işlemi başarısız');
    } finally {
      setTrialBusy(false);
    }
  };
  const [editOpen, setEditOpen] = useState(false);
  // Manuel ödeme onayı (havale/EFT veya elle tahsilat) — status =
  // APPROVED_PENDING_PAYMENT olan her üyede gösterilir; üyeyi ACTIVE'e taşır.
  const [bankConfirmOpen, setBankConfirmOpen] = useState(false);
  const [bankConfirmRef, setBankConfirmRef] = useState('');
  const [bankConfirmNote, setBankConfirmNote] = useState('');
  const [bankConfirming, setBankConfirming] = useState(false);
  const [bankConfirmError, setBankConfirmError] = useState<string | null>(null);

  // Hazır e-posta template'ini elle yeniden gönderme.
  const [resendOpen, setResendOpen] = useState(false);
  const [resendTemplate, setResendTemplate] = useState<NbResendTemplate>('APPROVED');
  const [resendEmailOverride, setResendEmailOverride] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Admin iletişim: üyeye tekil push (in-app kaydı + FCM; NB tercih kapılı).
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Tanıştır — iki üyeye bildirim + e-posta; kayıt "Tanıştırmalar"a düşer.
  const [introOpen, setIntroOpen] = useState(false);
  const [introOptions, setIntroOptions] = useState<NbMember[]>([]);
  const [introLoading, setIntroLoading] = useState(false);
  const [introTarget, setIntroTarget] = useState<NbMember | null>(null);
  const [introReason, setIntroReason] = useState('');
  const [introBusy, setIntroBusy] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);

  // Tanıştırılabilir üyeler: aktif + deneme (kendisi hariç).
  const openIntroDialog = async () => {
    setIntroTarget(null);
    setIntroReason('');
    setIntroError(null);
    setIntroOpen(true);
    setIntroLoading(true);
    try {
      const [active, trial] = await Promise.all([
        nbAdminService.listMembers({ status: 'ACTIVE', page: 0, size: 200 }),
        nbAdminService.listMembers({ status: 'TRIAL', page: 0, size: 200 }),
      ]);
      const all = [...(active?.content ?? []), ...(trial?.content ?? [])].filter(
        (m) => m.memberId !== memberId,
      );
      setIntroOptions(all);
    } catch {
      setIntroOptions([]);
    } finally {
      setIntroLoading(false);
    }
  };
  const [resendOk, setResendOk] = useState<string | null>(null);

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
      // İşletme görüntülenme sayıları (mobil/web) — best-effort.
      nbAdminService.memberViewStats(memberId).then(setViewStats).catch(() => setViewStats(null));
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
            {member.status === 'APPROVED_PENDING_PAYMENT' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => {
                  setBankConfirmRef('');
                  setBankConfirmNote('');
                  setBankConfirmError(null);
                  setBankConfirmOpen(true);
                }}
              >
                Ödemeyi Onayla
              </Button>
            )}
            {member.status === 'APPROVED_PENDING_PAYMENT' && !member.trialUsed && (
              <Button
                variant="outlined"
                color="info"
                disabled={trialBusy}
                onClick={() => handleTrial('grant')}
              >
                Deneme Ver…
              </Button>
            )}
            {member.status === 'TRIAL' && (
              <>
                <Button
                  variant="outlined"
                  color="info"
                  disabled={trialBusy}
                  onClick={() => handleTrial('extend')}
                >
                  Süre Uzat…
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  disabled={trialBusy}
                  onClick={() => handleTrial('revoke')}
                >
                  Denemeyi Sonlandır
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setEditOpen(true)}
            >
              İşletmeyi Düzenle
            </Button>
            <Button
              variant="outlined"
              startIcon={<EmailOutlinedIcon />}
              onClick={() => {
                setResendEmailOverride('');
                setResendError(null);
                setResendOk(null);
                setResendTemplate(
                  member.status === 'NEEDS_INFO'
                    ? 'NEEDS_INFO'
                    : member.status === 'SUBMITTED'
                    ? 'RECEIVED'
                    : 'APPROVED',
                );
                setResendOpen(true);
              }}
            >
              Mail Gönder
            </Button>
            <Button
              variant="outlined"
              startIcon={<NotificationsActiveOutlinedIcon />}
              onClick={() => {
                setPushTitle('');
                setPushMessage('');
                setPushError(null);
                setPushOpen(true);
              }}
            >
              Push Gönder
            </Button>
            <Button
              variant="outlined"
              startIcon={<HandshakeOutlinedIcon />}
              onClick={openIntroDialog}
            >
              Tanıştır
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<LockResetIcon />}
              disabled={pwBusy}
              onClick={handleSendSetPassword}
            >
              {pwBusy ? 'Gönderiliyor…' : 'Şifre Belirleme E-postası'}
            </Button>
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

        {/* Görüntülenme — bu işletme profiline mobil/web'den kaç kez girildi */}
        <NbSectionPaper title="Görüntülenme — İşletme Profili">
          <Stack direction="row" spacing={4} flexWrap="wrap">
            {[
              ['Toplam', viewStats?.total ?? 0],
              ['Mobil', viewStats?.mobile ?? 0],
              ['Web', viewStats?.web ?? 0],
              ...(viewStats && viewStats.unknown > 0 ? [['Diğer', viewStats.unknown] as const] : []),
            ].map(([label, value]) => (
              <Stack key={label as string} alignItems="flex-start" sx={{ minWidth: 72 }}>
                <Typography variant="h5" fontWeight={700}>{value as number}</Typography>
                <Typography variant="caption" color="text.secondary">{label as string}</Typography>
              </Stack>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Aynı kişinin 6 saat içindeki tekrar ziyaretleri tek sayılır.
          </Typography>
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
                        {/*
                          Ödeme durumu, period.status'a göre belirlenir —
                          paymentId varlığı yanıltıcıydı (İyzico checkout
                          başlatıldığında paymentId set olur ama kullanıcı
                          ödemeyi tamamlamamış olabilir → status hâlâ
                          PAYMENT_PENDING). Tek doğru sinyal: status.
                        */}
                        {p.fee === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            Ücretsiz
                          </Typography>
                        ) : p.status === 'ACTIVE' ||
                          p.status === 'EXPIRED' ? (
                          <Tooltip
                            title={
                              p.paymentId
                                ? `Ref: ${p.paymentId}`
                                : 'Ödeme alındı'
                            }
                            arrow
                          >
                            <Typography
                              variant="caption"
                              color="success.main"
                            >
                              ✓ Ödendi
                            </Typography>
                          </Tooltip>
                        ) : p.status === 'PAYMENT_PENDING' ? (
                          <Typography
                            variant="caption"
                            color="warning.main"
                          >
                            Bekliyor
                          </Typography>
                        ) : p.status === 'REFUNDED' ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            İade edildi
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            —
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

      <NbEditBusinessDialog
        open={editOpen}
        member={member}
        onClose={() => setEditOpen(false)}
        onSaved={load}
      />

      {/* Manuel ödeme onay dialogu (havale/EFT veya elle tahsilat) */}
      <Dialog
        open={bankConfirmOpen}
        onClose={() => !bankConfirming && setBankConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>Ödemeyi Onayla</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <strong>{member.companyName ?? '—'}</strong> üyesinin ödemesinin
            alındığını onaylıyorsun (havale/EFT veya manuel tahsilat).
            Onaylarsan üyelik <strong> ACTIVE</strong>'e geçer ve çevrimiçi
            ödeme (İyzico) akışı atlanır.
          </DialogContentText>
          <TextField
            fullWidth
            label="Dekont / Referans No (opsiyonel)"
            placeholder="Örn: TR99-... veya WhatsApp dekont no"
            value={bankConfirmRef}
            onChange={(e) => setBankConfirmRef(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
            disabled={bankConfirming}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Admin notu (opsiyonel)"
            placeholder="Örn: 26.05.2026 Ziraat Bankası ₺15.000"
            value={bankConfirmNote}
            onChange={(e) => setBankConfirmNote(e.target.value)}
            size="small"
            disabled={bankConfirming}
          />
          {bankConfirmError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {bankConfirmError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBankConfirmOpen(false)}
            disabled={bankConfirming}
          >
            Vazgeç
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={bankConfirming}
            onClick={async () => {
              if (!memberId) return;
              setBankConfirming(true);
              setBankConfirmError(null);
              try {
                await nbAdminService.confirmBankTransfer(memberId, {
                  paymentReference: bankConfirmRef.trim() || undefined,
                  adminNote: bankConfirmNote.trim() || undefined,
                });
                setBankConfirmOpen(false);
                await load();
              } catch (e: any) {
                setBankConfirmError(
                  e?.response?.data?.error?.message ??
                    e?.message ??
                    'Onaylama başarısız.',
                );
              } finally {
                setBankConfirming(false);
              }
            }}
          >
            {bankConfirming ? 'Onaylanıyor…' : 'Ödemeyi Onayla'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hazır e-posta template'ini elle yeniden gönder */}
      <Dialog
        open={resendOpen}
        onClose={() => !resendBusy && setResendOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>Hazır E-posta Gönder</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Hazır başvuru e-postalarından birini bu üyeye yeniden gönderir. İçerik
            kayıttan otomatik oluşturulur. Adres yanlış girilmişse aşağıya doğru
            adresi yazabilirsin; boş bırakırsan hesaptaki güncel adrese gider.
          </DialogContentText>
          <TextField
            select
            fullWidth
            label="Template"
            value={resendTemplate}
            onChange={(e) => setResendTemplate(e.target.value as NbResendTemplate)}
            size="small"
            sx={{ mb: 2 }}
            disabled={resendBusy}
          >
            <MenuItem value="RECEIVED">Başvuru Alındı</MenuItem>
            <MenuItem value="APPROVED">Başvuru Onaylandı (ödeme/aktivasyon)</MenuItem>
            <MenuItem value="NEEDS_INFO">Ek Bilgi Gerekli</MenuItem>
          </TextField>
          <TextField
            fullWidth
            type="email"
            label="Gönderilecek adres (opsiyonel)"
            placeholder={user?.email ? `Boş = ${user.email}` : 'Boş = hesaptaki adres'}
            value={resendEmailOverride}
            onChange={(e) => setResendEmailOverride(e.target.value)}
            size="small"
            disabled={resendBusy}
            helperText="Yanlış adrese gitmişse, düzeltilmiş adresi buraya yaz."
          />
          {resendError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {resendError}
            </Alert>
          )}
          {resendOk && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {resendOk}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResendOpen(false)} disabled={resendBusy}>
            Kapat
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailOutlinedIcon />}
            disabled={resendBusy}
            onClick={async () => {
              if (!member) return;
              setResendBusy(true);
              setResendError(null);
              setResendOk(null);
              try {
                const r = await nbAdminService.resendEmail(
                  member.memberId,
                  resendTemplate,
                  resendEmailOverride,
                );
                setResendOk(`E-posta kuyruğa alındı: ${r.to}`);
              } catch (e: any) {
                setResendError(
                  e?.response?.data?.error?.message ??
                    e?.message ??
                    'E-posta gönderilemedi.',
                );
              } finally {
                setResendBusy(false);
              }
            }}
          >
            {resendBusy ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Push bildirimi — üyeye tekil (in-app + FCM) */}
      <Dialog open={pushOpen} onClose={() => !pushBusy && setPushOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Push Bildirimi Gönder</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {pushError && <Alert severity="error">{pushError}</Alert>}
            <Alert severity="info">
              Bildirim üyenin uygulamasına anlık gider ve bildirim listesine kaydedilir.
              Üye NB bildirimlerini kapattıysa yalnız listeye düşer.
            </Alert>
            <TextField
              label="Başlık"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              disabled={pushBusy}
              fullWidth
              inputProps={{ maxLength: 80 }}
            />
            <TextField
              label="Mesaj"
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              disabled={pushBusy}
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 400 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPushOpen(false)} disabled={pushBusy}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            disabled={pushBusy || !pushTitle.trim() || !pushMessage.trim()}
            onClick={async () => {
              if (!member) return;
              setPushBusy(true);
              setPushError(null);
              try {
                await nbAdminService.sendPush(member.memberId, {
                  title: pushTitle.trim(),
                  message: pushMessage.trim(),
                });
                setPushOpen(false);
                alert('Bildirim gönderildi.');
              } catch (e: any) {
                setPushError(
                  e?.response?.data?.error?.message ?? e?.message ?? 'Bildirim gönderilemedi.',
                );
              } finally {
                setPushBusy(false);
              }
            }}
          >
            {pushBusy ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tanıştır — iki üyeye bildirim + e-posta, kayıt Tanıştırmalar'a düşer */}
      <Dialog open={introOpen} onClose={() => !introBusy && setIntroOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Üye Tanıştır
          <Typography variant="body2" color="text.secondary">
            {member?.companyName} ↔ seçeceğiniz üye — iki tarafa da bildirim ve e-posta gider.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {introError && <Alert severity="error">{introError}</Alert>}
            <Autocomplete
              options={introOptions}
              loading={introLoading}
              value={introTarget}
              onChange={(_, v) => setIntroTarget(v)}
              getOptionLabel={(o) => o.companyName ?? o.memberId}
              isOptionEqualToValue={(o, v) => o.memberId === v.memberId}
              renderInput={(params) => (
                <TextField {...params} label="Tanıştırılacak üye" placeholder="Şirket adıyla ara…" />
              )}
              disabled={introBusy}
            />
            <TextField
              label="Tanıştırma sebebi"
              placeholder='Örn. "Taşeronluk iş birliği potansiyeli — ikisi de inşaat sektöründe."'
              value={introReason}
              onChange={(e) => setIntroReason(e.target.value)}
              disabled={introBusy}
              fullWidth
              multiline
              minRows={3}
              helperText="Bu metin iki tarafa da aynen gösterilir."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIntroOpen(false)} disabled={introBusy}>
            Vazgeç
          </Button>
          <Button
            variant="contained"
            disabled={introBusy || !introTarget || !introReason.trim()}
            onClick={async () => {
              if (!member || !introTarget) return;
              setIntroBusy(true);
              setIntroError(null);
              try {
                await nbAdminService.createIntroduction({
                  memberAId: member.memberId,
                  memberBId: introTarget.memberId,
                  reason: introReason.trim(),
                });
                setIntroOpen(false);
                alert(
                  'Tanıştırma iletildi — iki tarafa bildirim ve e-posta gönderildi. ' +
                    'Takip için: NartBusiness > Tanıştırmalar.',
                );
              } catch (e: any) {
                setIntroError(
                  e?.response?.data?.error?.message ?? e?.message ?? 'Tanıştırma gönderilemedi.',
                );
              } finally {
                setIntroBusy(false);
              }
            }}
          >
            {introBusy ? 'Gönderiliyor…' : 'Tanıştır'}
          </Button>
        </DialogActions>
      </Dialog>
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
  // Kullanıcı yanıtı kategorileri
  DOC_PROVIDED: 'Belge Eklendi',
  CLARIFICATION: 'Açıklama',
  CORRECTION: 'Düzeltme',
  DISPUTE: 'İtiraz',
  OTHER: 'Diğer',
  // Komite oyu — onay
  COMPANY_VERIFIED: 'Şirket teyit edildi',
  CULTURAL_VERIFIED: 'Kimlik teyit edildi',
  BOTH_VERIFIED: 'Şirket + kimlik teyit',
  TENURE_TRUSTED: 'NartGo kıdemi yeterli',
  OTHER_APPROVE: 'Diğer (onay)',
  // Komite oyu — ek bilgi
  MISSING_DOC: 'Belge eksik',
  UNCLEAR_DOC: 'Belge okunaksız/şüpheli',
  COMPANY_UNCLEAR: 'Şirket bilgisi net değil',
  CULTURAL_UNCLEAR: 'Kimlik net değil',
  SOCIAL_PROOF_WEAK: 'Sosyal kanıt yetersiz',
  OTHER_NEEDS_INFO: 'Diğer (ek bilgi)',
  // Komite oyu — red
  INSUFFICIENT_PROOF: 'Yetersiz kanıt',
  FAKE_SUSPECT: 'Sahtelik şüphesi',
  CULTURAL_MISMATCH: 'Kimlik teyit edilemedi',
  POLICY_VIOLATION: 'Politika ihlali',
  OTHER_REJECT: 'Diğer (red)',
};

/** Komite oy kodu → Türkçe etiket. */
const VOTE_LABEL: Record<string, string> = {
  APPROVE: 'Onayla',
  REJECT: 'Reddet',
  NEEDS_INFO: 'Ek bilgi iste',
};

/**
 * Backend'in ürettiği timeline açıklamasındaki ham enum/sürüm token'larını
 * temizler: "oyu: APPROVE" → "oyu: Onayla", "KVKK MEMBERSHIP_v1" → "KVKK onayı".
 */
function humanizeDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  return desc
    .replace(/\b(APPROVE|REJECT|NEEDS_INFO)\b/g, (m) => VOTE_LABEL[m] ?? m)
    .replace(/KVKK\s+\S*_v\d+/gi, 'KVKK onayı')
    .trim();
}

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
          <b>Son tur.</b> Komite bir daha ek bilgi isterse başvuru otomatik reddedilir.
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

  // [KATEGORI: X] prefix'ini TÜM entry'lerden ayır (komite oyları dahil) ki
  // ham enum body'de görünmesin; kategori ayrı, etiketli chip olur.
  const { category, body } = entry.detail
    ? parseUserResponse(entry.detail)
    : { category: null, body: '' };

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
                {humanizeDescription(entry.description)}
              </Typography>
              {category && (
                <Chip
                  size="small"
                  label={CATEGORY_LABEL[category] ?? category}
                  color={isUserResponse ? 'primary' : 'default'}
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

/** mediaUrl path'ten dosya uzantısı + tam dosya adı çıkarır.
 *  Backend formatı: `nb/verification/{caseId}/{docType}-{uuid}.{ext}` */
function parseDocFile(mediaUrl: string | undefined): {
  ext: string;
  fileName: string;
  isPdf: boolean;
} {
  if (!mediaUrl) return { ext: '', fileName: '', isPdf: false };
  const clean = mediaUrl.split('?')[0]; // query string at
  const fileName = clean.split('/').pop() ?? '';
  const dot = fileName.lastIndexOf('.');
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
  return { ext, fileName, isPdf: ext === 'pdf' };
}

function fileTypeLabel(ext: string): string {
  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'jpg':
    case 'jpeg':
      return 'JPEG';
    case 'png':
      return 'PNG';
    case '':
      return 'Dosya';
    default:
      return ext.toUpperCase();
  }
}

function DocumentCard({ doc }: { doc: VerificationDocument }) {
  const { ext, fileName, isPdf } = parseDocFile(doc.mediaUrl);
  const typeLabel = DOC_TYPE_LABEL[doc.type] ?? doc.type;
  const fileBadge = fileTypeLabel(ext);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 200,
        maxWidth: 280,
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
          {typeLabel}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ mt: 0.25 }}
        >
          <Chip
            size="small"
            label={fileBadge}
            sx={{
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              '.MuiChip-label': { px: 0.75 },
            }}
            color={isPdf ? 'error' : 'primary'}
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" noWrap>
            • {relativeDate(doc.uploadedAt)}
          </Typography>
        </Stack>
        {fileName && (
          <Tooltip title={fileName} arrow>
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              noWrap
              sx={{ fontSize: 10, mt: 0.25 }}
            >
              {fileName}
            </Typography>
          </Tooltip>
        )}
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
