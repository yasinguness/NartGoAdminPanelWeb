import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { NbPanel } from '../../components/nartbusiness/ui';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbAttention, NbDeadlineRow } from '../../services/nartbusiness/nbAdminService';

/**
 * Panonun en üstündeki "bugün ilgilenmen gerekenler" bölümü.
 *
 * Pano önce yalnız sayı gösteriyordu ("3 ödeme bekliyor"). Sayı eyleme
 * dönüşmüyordu: kimin beklediğini bulmak için ayrı ekrana gidip süzmek
 * gerekiyordu. Burada her satır bir işi temsil eder ve kendi aksiyonunu
 * taşır.
 *
 * Sıralama sunucudan gelir: gecikmişler önce, sonra en yakın tarihli olanlar.
 * Yapacak iş yoksa bölüm boş görünmez, "kuyruk temiz" der.
 */

/** Kalan güne göre görsel şiddet. Gecikmiş olan her zaman en yüksek. */
function urgency(daysLeft?: number | null): {
  color: 'error' | 'warning' | 'info';
  text: string;
} {
  if (daysLeft == null) return { color: 'info', text: 'Tarih yok' };
  if (daysLeft < 0) {
    const d = Math.abs(daysLeft);
    return { color: 'error', text: d === 1 ? '1 gün gecikti' : `${d} gün gecikti` };
  }
  if (daysLeft === 0) return { color: 'error', text: 'Bugün son' };
  if (daysLeft === 1) return { color: 'warning', text: 'Yarın son' };
  return { color: daysLeft <= 3 ? 'warning' : 'info', text: `${daysLeft} gün kaldı` };
}

function DeadlineRow({ row, onOpen }: { row: NbDeadlineRow; onOpen: () => void }) {
  const u = urgency(row.daysLeft);
  const trial = row.kind === 'TRIAL';
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      spacing={1.5}
      sx={{ py: 1.25 }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) => t.palette[u.color].main + '1F',
          color: (t) => t.palette[u.color].main,
          flexShrink: 0,
        }}
      >
        {trial ? <ScheduleIcon fontSize="small" /> : <PaymentsIcon fontSize="small" />}
      </Box>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {row.companyName || row.applicationNumber || 'Adsız üye'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {trial ? 'Ücretsiz deneme bitiyor' : 'Ödeme süresi doluyor'}
          {row.applicationNumber ? ` · ${row.applicationNumber}` : ''}
        </Typography>
      </Box>

      <Chip size="small" color={u.color} variant="filled" label={u.text} sx={{ flexShrink: 0 }} />
      <Button size="small" variant="outlined" onClick={onOpen} sx={{ flexShrink: 0 }}>
        Üyeyi aç
      </Button>
    </Stack>
  );
}

function QueueRow({
  icon,
  label,
  hint,
  count,
  actionText,
  onAction,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  count: number;
  actionText: string;
  onAction: () => void;
  tone: 'error' | 'warning' | 'info';
}) {
  if (count <= 0) return null;
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1.25 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) => t.palette[tone].main + '1F',
          color: (t) => t.palette[tone].main,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
      <Chip size="small" color={tone} label={count} sx={{ flexShrink: 0, fontWeight: 700 }} />
      <Button size="small" variant="outlined" onClick={onAction} sx={{ flexShrink: 0 }}>
        {actionText}
      </Button>
    </Stack>
  );
}

export default function NbAttentionPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState<NbAttention | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    nbAdminService
      .getDashboardAttention(7)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deadlines = data?.deadlines ?? [];
  const queueTotal = (data?.submitted ?? 0) + (data?.needsInfo ?? 0) + (data?.approvedExpired ?? 0);
  const nothingToDo = !loading && deadlines.length === 0 && queueTotal === 0;
  const overdue = deadlines.filter((d) => (d.daysLeft ?? 0) < 0).length;

  return (
    <NbPanel
      title="Bugün ilgilenmen gerekenler"
      hint={
        loading
          ? undefined
          : overdue > 0
            ? `${overdue} kayıt gecikmiş`
            : `önümüzdeki ${data?.withinDays ?? 7} gün`
      }
      icon={<WarningAmberIcon />}
      action={
        deadlines.length > 0 ? (
          <Button size="small" onClick={() => navigate('/nartbusiness/members')}>
            Tüm üyeler
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={22} />
        </Box>
      ) : nothingToDo ? (
        <Stack alignItems="center" spacing={1} py={3}>
          <TaskAltIcon color="success" />
          <Typography variant="body2" color="text.secondary">
            Bekleyen iş yok. Kuyruklar temiz.
          </Typography>
        </Stack>
      ) : (
        <Stack divider={<Divider flexItem />}>
          <QueueRow
            icon={<GavelIcon fontSize="small" />}
            label="Komite kararı bekliyor"
            hint="Başvuru incelenmeyi bekliyor"
            count={data?.submitted ?? 0}
            actionText="Kuyruğa git"
            onAction={() => navigate('/nartbusiness/verification')}
            tone="warning"
          />
          <QueueRow
            icon={<HelpOutlineIcon fontSize="small" />}
            label="Ek bilgi bekleniyor"
            hint="Üyeden yanıt bekleyen başvurular"
            count={data?.needsInfo ?? 0}
            actionText="Üyelere git"
            onAction={() => navigate('/nartbusiness/members?status=NEEDS_INFO')}
            tone="info"
          />
          <QueueRow
            icon={<EventBusyIcon fontSize="small" />}
            label="Onay süresi dolmuş"
            hint="Ödeme yapılmadı, süre kapandı"
            count={data?.approvedExpired ?? 0}
            actionText="Üyelere git"
            onAction={() => navigate('/nartbusiness/members?status=APPROVED_EXPIRED')}
            tone="error"
          />
          {deadlines.map((row) => (
            <DeadlineRow
              key={`${row.memberId}-${row.kind}`}
              row={row}
              onOpen={() => navigate(`/nartbusiness/members/${row.memberId}`)}
            />
          ))}
        </Stack>
      )}
    </NbPanel>
  );
}
