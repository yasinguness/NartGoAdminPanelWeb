import {
  Alert,
  Box,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import GavelIcon from '@mui/icons-material/Gavel';
import ReplyIcon from '@mui/icons-material/Reply';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import type {
  CaseTimelineEntry,
  CaseTimelineEntryType,
  NbRace,
  VerificationCaseStatus,
} from '../../services/nartbusiness/nbTypes';

/**
 * Doğrulama akışı UI bileşenleri arasında ortak kullanılan etiketler ve görseller.
 * Queue + Decide dialog her ikisi de bu modülden okur.
 */

export const STATUS_LABELS: Record<VerificationCaseStatus, string> = {
  SUBMITTED: 'Yeni',
  IN_REVIEW: 'İncelemede',
  NEEDS_INFO: 'Ek Bilgi Gerekli',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

export const STATUS_COLORS: Record<
  VerificationCaseStatus,
  'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'
> = {
  SUBMITTED: 'primary',
  IN_REVIEW: 'info',
  NEEDS_INFO: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const RACE_LABELS: Record<NbRace, string> = {
  adige: 'Adige',
  abhaz: 'Abhaz',
  cecen: 'Çeçen',
  karacay: 'Karaçay',
  dagistan: 'Dağıstan',
  oset: 'Oset',
  other: 'Diğer',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  VERGI_LEVHASI: 'Vergi Levhası',
  TICARET_SICIL: 'Ticaret Sicil',
  IMZA_SIRKULERI: 'İmza Sirküleri',
  KIMLIK: 'Kimlik',
  KULTUREL_BEYAN: 'Kültürel Beyan',
};

const RESPONSE_CATEGORY_LABELS: Record<string, string> = {
  DOC_PROVIDED: 'Belge sağlandı',
  CLARIFICATION: 'Açıklama',
  CORRECTION: 'Düzeltme',
  DISPUTE: 'İtiraz',
  OTHER: 'Diğer',
};

/** `[KATEGORI: X] mesaj` formatını parse eder. */
export function parseResponseDetail(raw: string | null | undefined): {
  category: string | null;
  message: string;
} {
  if (!raw) return { category: null, message: '' };
  const m = raw.match(/^\[KATEGORI:\s*([A-Z_]+)\]\s*([\s\S]*)$/);
  if (!m) return { category: null, message: raw };
  return {
    category: RESPONSE_CATEGORY_LABELS[m[1]] ?? m[1],
    message: m[2].trim(),
  };
}

export function Row({
  label,
  value,
  monospace,
}: {
  label: string;
  value?: string | null;
  monospace?: boolean;
}) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontFamily={monospace ? 'monospace' : undefined}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}

export function LinkRow({ label, url }: { label: string; url?: string }) {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
        {label}
      </Typography>
      {url ? (
        <Link href={url} target="_blank" rel="noreferrer" variant="body2">
          {url}
        </Link>
      ) : (
        <Typography variant="body2">—</Typography>
      )}
    </Stack>
  );
}

export function CaseTimelineList({
  entries,
  loading,
}: {
  entries: CaseTimelineEntry[] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={1}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (!entries || entries.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Henüz aksiyon yok.
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ pl: 0.5 }}>
      {entries.map((e, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
          {timelineIcon(e.type)}
          <Stack flex={1}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="body2" fontWeight={600}>
                {e.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(e.at).toLocaleString('tr-TR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </Typography>
            </Stack>
            {(e.actorDisplayName || e.actorUserId) && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontFamily={e.actorDisplayName ? undefined : 'monospace'}
              >
                {e.actorDisplayName ?? `${e.actorUserId?.substring(0, 8)}…`}
              </Typography>
            )}
            {e.detail && (() => {
              if (e.type === 'USER_RESPONSE') {
                const { category, message } = parseResponseDetail(e.detail);
                return (
                  <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                    {category && (
                      <Typography variant="caption" color="text.secondary">
                        Kategori: <b>{category}</b>
                      </Typography>
                    )}
                    {message && (
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message}
                      </Typography>
                    )}
                  </Stack>
                );
              }
              return (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}
                >
                  {e.detail}
                </Typography>
              );
            })()}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function timelineIcon(type: CaseTimelineEntryType) {
  const props = { fontSize: 'small' as const, sx: { mt: 0.25 } };
  switch (type) {
    case 'SUBMITTED':
      return <ReplyIcon color="primary" {...props} />;
    case 'VOTE':
      return <GavelIcon color="info" {...props} />;
    case 'NEEDS_INFO':
      return <AssignmentLateIcon color="warning" {...props} />;
    case 'USER_RESPONSE':
      return <ReplyIcon color="primary" {...props} />;
    case 'APPROVED':
      return <CheckCircleIcon color="success" {...props} />;
    case 'REJECTED':
      return <CancelIcon color="error" {...props} />;
    default:
      return <HistoryIcon {...props} />;
  }
}

/**
 * Komite oy verirken NEEDS_INFO sayısının 3'e ulaşacağı durumda gösterilecek uyarı.
 * Backend VerificationService.decide() bu durumda otomatik REJECTED'a alır.
 */
export function thirdNeedsInfoWarning(currentCount: number | undefined): JSX.Element | null {
  if ((currentCount ?? 0) < 2) return null;
  return (
    <Alert severity="error" variant="filled" sx={{ mt: 1 }}>
      ⚠ Bu vakanın <b>NEEDS_INFO sayısı zaten {currentCount ?? 0}/2</b>. Üçüncü ek
      bilgi turu otomatik <b>REJECTED</b>'a çevirir — karar terminal olur.
    </Alert>
  );
}
