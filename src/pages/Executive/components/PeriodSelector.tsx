import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import type { TimeRange } from '../../../services/executive/executiveTypes';

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

const OPTIONS: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24s' },
  { key: '7d', label: '7G' },
  { key: '30d', label: '30G' },
  { key: '90d', label: '90G' },
  { key: 'ytd', label: 'YTD' },
];

export default function PeriodSelector({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      size="small"
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      sx={{
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(201,162,39,0.2)',
        '& .MuiToggleButton-root': {
          color: 'rgba(243,238,224,0.6)',
          fontSize: 11,
          fontWeight: 700,
          px: 1.5,
          py: 0.5,
          border: 'none',
          textTransform: 'none',
          letterSpacing: 0.5,
          '&.Mui-selected': {
            bgcolor: 'rgba(201,162,39,0.18)',
            color: '#C9A227',
            '&:hover': {
              bgcolor: 'rgba(201,162,39,0.22)',
            },
          },
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.06)',
          },
        },
      }}
    >
      {OPTIONS.map(o => (
        <ToggleButton key={o.key} value={o.key}>{o.label}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
