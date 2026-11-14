import { Box, Stack, Typography } from '@mui/material';
import { au } from '../../theme/adminUsers';
import { STATUS_LABEL } from './userFilters';

/** Kullanıcılar listesi ve detayının ortak küçük parçaları. */

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'ACTIVE'
      ? { b: au.successBorder, c: au.successText }
      : status === 'PENDING'
        ? { b: au.warning, c: au.warningText }
        : { b: au.dangerBorder, c: au.danger };
  return (
    <Box component="span" sx={{ border: `1px solid ${tone.b}`, color: tone.c, borderRadius: '6px', px: 1, py: '2px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {STATUS_LABEL[status] ?? status}
    </Box>
  );
}

export function ProfileBar({ value, width = 64 }: { value: number; width?: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width, height: 6, bgcolor: au.border, borderRadius: 3 }} role="img" aria-label={`Profil yüzde ${value}`}>
        <Box sx={{ width: `${value}%`, height: 6, bgcolor: value >= 60 ? au.success : au.warning, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>%{value}</Typography>
    </Stack>
  );
}
