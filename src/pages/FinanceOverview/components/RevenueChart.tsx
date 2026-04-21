import { Paper, Box, Typography, Stack, Skeleton } from '@mui/material';
import type { FinanceTimeseriesPoint } from '../../../services/financeOverview/financeOverviewTypes';
import { toNumber, formatMoney } from './formatters';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  data?: FinanceTimeseriesPoint[];
  currency?: string;
  loading?: boolean;
}

export default function RevenueChart({ data, currency = 'TRY', loading }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#FFFFFF', borderColor: 'rgba(201,162,39,0.12)' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(30,41,59,0.60)', textTransform: 'uppercase' }}>
          Günlük Gelir Trendi
        </Typography>
        <Stack direction="row" spacing={2}>
          <LegendDot color="#22c55e" label="Brüt" />
          <LegendDot color="#C9A227" label="Net" />
        </Stack>
      </Stack>

      {loading ? (
        <Skeleton variant="rectangular" height={240} sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }} />
      ) : !data || data.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(30,41,59,0.45)', fontSize: 12, fontStyle: 'normal' }}>
            Bu dönemde gelir hareketi yok
          </Typography>
        </Box>
      ) : (
        <Chart data={data} currency={currency} />
      )}
    </Paper>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ fontSize: 11, color: 'rgba(30,41,59,0.70)', fontWeight: 600 }}>{label}</Typography>
    </Stack>
  );
}

function Chart({ data, currency }: { data: FinanceTimeseriesPoint[]; currency: string }) {
  const values = data.flatMap(d => [toNumber(d.gross), toNumber(d.net)]);
  const max = Math.max(...values, 1);

  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 28, left: 50 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const toPoints = (key: 'gross' | 'net') =>
    data.map((d, i) => {
      const x = padding.left + i * xStep;
      const v = toNumber(d[key]);
      const y = padding.top + innerH - (v / max) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

  const grossPoints = toPoints('gross');
  const netPoints = toPoints('net');

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (max * i) / yTicks);

  const labelStride = Math.max(1, Math.floor(data.length / 8));

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ minWidth: 500 }}>
        {/* Y grid & labels */}
        {tickValues.map((v, i) => {
          const y = padding.top + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(0,0,0,0.05)" strokeDasharray="2,3" />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="rgba(30,41,59,0.45)" fontFamily="monospace">
                {formatMoney(v, currency)}
              </text>
            </g>
          );
        })}

        {/* Gross area */}
        <polygon
          points={`${padding.left},${padding.top + innerH} ${grossPoints} ${padding.left + (data.length - 1) * xStep},${padding.top + innerH}`}
          fill="#22c55e"
          fillOpacity={0.1}
        />
        <polyline points={grossPoints} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" />

        {/* Net line */}
        <polyline points={netPoints} fill="none" stroke="#C9A227" strokeWidth={2} strokeLinejoin="round" strokeDasharray="4,2" />

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelStride !== 0 && i !== data.length - 1) return null;
          const x = padding.left + i * xStep;
          let label = '';
          try {
            label = format(parseISO(d.t), 'dd MMM', { locale: tr });
          } catch {
            label = d.t;
          }
          return (
            <text key={i} x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="rgba(30,41,59,0.55)" fontFamily="monospace">
              {label}
            </text>
          );
        })}
      </svg>
    </Box>
  );
}
