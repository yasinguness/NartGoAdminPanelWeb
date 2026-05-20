import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type {
  NbMemberStatus,
  VerificationCaseStatus,
} from '../../services/nartbusiness/nbTypes';

/**
 * NB durum çipi — üye / verification case durumlarını standart renkler + sembollerle gösterir.
 *
 * "Conflict" modu (örn. zaten aktif NB üyesi olan kullanıcıyı arama sonucunda
 * gösterirken) warning rengini zorlar; aksi halde duruma göre renk seçilir.
 */

type AnyNbStatus = NbMemberStatus | VerificationCaseStatus | string;

interface StatusMeta {
  label: string;
  color: ChipProps['color'];
  /** Conflict statüleri — bu durumdaki kullanıcıya yeni manuel üyelik açılamaz. */
  conflict: boolean;
}

const META: Record<string, StatusMeta> = {
  // NbMemberStatus
  SUBMITTED: { label: 'Başvuru alındı', color: 'info', conflict: true },
  NEEDS_INFO: { label: 'Belge bekliyor', color: 'warning', conflict: true },
  REJECTED: { label: 'Reddedildi', color: 'error', conflict: false },
  APPROVED_PENDING_PAYMENT: { label: 'Ödeme bekliyor', color: 'warning', conflict: true },
  APPROVED_EXPIRED: { label: 'Süresi doldu', color: 'default', conflict: false },
  ACTIVE: { label: 'Aktif üye', color: 'success', conflict: true },
  EXPIRED: { label: 'Süresi doldu', color: 'default', conflict: true },
  SUSPENDED: { label: 'Askıya alındı', color: 'warning', conflict: true },
  CANCELLED: { label: 'İptal etti', color: 'default', conflict: false },
  PENDING_VERIFICATION: { label: 'Eski (pending)', color: 'default', conflict: false },

  // VerificationCaseStatus (ek olanlar)
  IN_REVIEW: { label: 'İncelemede', color: 'info', conflict: false },
  APPROVED: { label: 'Onaylandı', color: 'success', conflict: false },
};

const FALLBACK: StatusMeta = { label: '—', color: 'default', conflict: false };

export function nbStatusMeta(status?: AnyNbStatus | null): StatusMeta {
  if (!status) return FALLBACK;
  return META[status] ?? { label: status, color: 'default', conflict: false };
}

interface Props {
  status?: AnyNbStatus | null;
  /** Override label (örn. "⚠ Aktif üye"). */
  label?: string;
  /** Override conflict styling — true ise warning rengi zorlanır. */
  conflict?: boolean;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

export default function NbStatusBadge({
  status,
  label,
  conflict,
  size = 'small',
  variant,
}: Props) {
  // Hiç NB üyeliği yoksa: yumuşak yeşil "boş alan" → kullanıcı seçilebilir
  if (!status) {
    return (
      <Chip
        size={size}
        variant="outlined"
        color="success"
        icon={<CheckCircleOutlineIcon />}
        label={label ?? 'NB üyesi değil'}
      />
    );
  }
  const meta = nbStatusMeta(status);
  const isConflict = conflict ?? meta.conflict;
  // Çakışma varsa filled + warning ikon — admin'in kaçırmaması için kontrastlı
  if (isConflict) {
    return (
      <Chip
        size={size}
        variant={variant ?? 'filled'}
        color="warning"
        icon={<WarningAmberIcon />}
        label={label ?? meta.label}
      />
    );
  }
  // Terminal/non-blocking status (REJECTED, CANCELLED, APPROVED_EXPIRED): outlined nötr
  return (
    <Chip
      size={size}
      variant={variant ?? 'outlined'}
      color={meta.color}
      label={label ?? meta.label}
    />
  );
}
