import { Box, Typography, Stack, Paper, Tooltip } from '@mui/material';
import type { PnlBreakdown } from '../../../services/financeOverview/financeOverviewTypes';
import { formatMoneyFull, toNumber } from './formatters';

interface Props {
  data?: PnlBreakdown;
  currency?: string;
  loading?: boolean;
}

interface Step {
  key: string;
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
  color: string;
  note?: string;
}

export default function PnlWaterfall({ data, currency = 'TRY', loading }: Props) {
  if (loading || !data) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)', minHeight: 320 }}>
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase', mb: 2 }}>
          P&L Akışı
        </Typography>
        <Typography sx={{ color: 'rgba(243,238,224,0.4)', fontSize: 12, fontStyle: 'italic' }}>
          {loading ? 'Yükleniyor…' : 'Veri yok'}
        </Typography>
      </Paper>
    );
  }

  const gross = toNumber(data.gross);
  const iyzico = toNumber(data.iyzicoCommission);
  const refunds = toNumber(data.refunds);
  const vat = toNumber(data.vat);
  const platformFee = toNumber(data.platformFee);
  const organizerPayout = toNumber(data.organizerPayout);
  const net = toNumber(data.net);

  const steps: Step[] = [
    { key: 'gross', label: 'Brüt Gelir (GMV)', value: gross, type: 'positive', color: '#22c55e', note: 'Başarılı ödemelerin toplamı' },
    { key: 'refunds', label: 'İadeler', value: -refunds, type: 'negative', color: '#ef4444', note: 'Refunded ödemeler' },
    { key: 'iyzico', label: 'Iyzico Komisyonu', value: -iyzico, type: 'negative', color: '#f59e0b', note: '~%2.5 işlem komisyonu' },
    { key: 'payout', label: 'Organizatör Payoutu', value: -organizerPayout, type: 'negative', color: '#8b5cf6', note: 'Organizatöre aktarılan' },
    { key: 'platformFee', label: 'Platform Ücreti', value: platformFee, type: 'positive', color: '#C9A227', note: '~%8 platform payı' },
    { key: 'vat', label: 'KDV (%18)', value: -vat, type: 'negative', color: '#64748b', note: 'Platform ücreti üzerinden KDV' },
    { key: 'net', label: 'Net Kâr', value: net, type: 'total', color: '#22c55e', note: 'Platformda kalan' },
  ];

  const maxAbs = Math.max(...steps.map(s => Math.abs(s.value)), 1);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#0A130F', borderColor: 'rgba(201,162,39,0.12)' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'rgba(243,238,224,0.6)', textTransform: 'uppercase' }}>
          P&L Akışı
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'rgba(243,238,224,0.4)', fontStyle: 'italic' }}>
          brüt gelirden net kâra
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        {steps.map(step => {
          const widthPct = Math.max(5, (Math.abs(step.value) / maxAbs) * 100);
          const isNeg = step.value < 0;
          const isTotal = step.type === 'total';

          return (
            <Box key={step.key}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{
                    fontSize: isTotal ? 13 : 12,
                    fontWeight: isTotal ? 800 : 600,
                    color: isTotal ? '#F3EEE0' : 'rgba(243,238,224,0.8)',
                    letterSpacing: 0.3,
                  }}>
                    {step.label}
                  </Typography>
                  {step.note && (
                    <Tooltip title={step.note} arrow>
                      <Typography sx={{ fontSize: 9, color: 'rgba(243,238,224,0.35)', fontStyle: 'italic' }}>
                        ⓘ
                      </Typography>
                    </Tooltip>
                  )}
                </Stack>
                <Typography sx={{
                  fontSize: isTotal ? 14 : 12,
                  fontFamily: 'monospace',
                  fontWeight: isTotal ? 900 : 700,
                  color: isTotal ? step.color : (isNeg ? '#ef4444' : '#22c55e'),
                }}>
                  {isNeg ? '−' : '+'}{formatMoneyFull(Math.abs(step.value), currency)}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: isTotal ? 12 : 8,
                  width: `${widthPct}%`,
                  borderRadius: 0.75,
                  background: isTotal
                    ? `linear-gradient(90deg, ${step.color} 0%, ${step.color}88 100%)`
                    : step.color,
                  opacity: isTotal ? 1 : 0.85,
                  border: isTotal ? `1px solid ${step.color}` : 'none',
                  boxShadow: isTotal ? `0 0 12px ${step.color}55` : 'none',
                }}
              />
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
