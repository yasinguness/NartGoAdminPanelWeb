import { Box, useTheme } from '@mui/material';
import type { TimeseriesPoint } from '../../../services/executive/executiveTypes';

interface Props {
  data?: TimeseriesPoint[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  fill?: boolean;
}

export default function Sparkline({ data, color, height = 36, strokeWidth = 1.5, fill = true }: Props) {
  const theme = useTheme();
  const stroke = color || theme.palette.primary.main;

  if (!data || data.length < 2) {
    return (
      <Box sx={{ height, width: '100%', display: 'flex', alignItems: 'center', color: 'text.disabled', fontSize: 10, fontStyle: 'normal' }}>
        yeterli veri yok
      </Box>
    );
  }

  const values = data.map(d => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.v - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <Box sx={{ height, width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {fill && (
          <polygon points={areaPoints} fill={stroke} fillOpacity={0.12} />
        )}
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </Box>
  );
}
