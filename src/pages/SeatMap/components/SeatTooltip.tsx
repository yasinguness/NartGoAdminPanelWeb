import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Seat, SeatCategory, getCategoryColor } from '../venueEngine';

interface Props {
  tip: { x: number; y: number; seat: Seat };
  categories: SeatCategory[];
  mode: 'edit' | 'preview';
}

export default function SeatTooltip({ tip, categories, mode }: Props) {
  const theme = useTheme();
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;
  const textSecondary = theme.palette.text.secondary;
  const textDisabled = theme.palette.text.disabled;
  const green = '#10b981';
  const cat = categories.find(c => c.id === tip.seat.category);

  return (
    <Box sx={{ position: 'fixed', zIndex: 200, left: tip.x, top: tip.y, bgcolor: surface, border: `1px solid ${border}`, borderRadius: 2,
      p: '6px 10px', pointerEvents: 'none', boxShadow: theme.shadows[8], whiteSpace: 'nowrap', maxWidth: 220 }}>
      <Typography sx={{ fontWeight: 700, color: textDisabled, fontSize: 9, textTransform: 'uppercase', mb: 0.25 }}>
        {tip.seat.sectionName} · Sıra {tip.seat.rowLabel}
      </Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 800 }}>Koltuk {tip.seat.seatNumber}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '2px', bgcolor: getCategoryColor(tip.seat.category, categories) }} />
        <Typography sx={{ fontSize: 10, color: textSecondary }}>{cat?.name}</Typography>
        {mode === 'preview' && <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: green, fontSize: 10, ml: 0.5 }}>₺{cat?.price}</Typography>}
      </Box>
      {tip.seat.status !== 'available' && (
        <Typography sx={{ fontSize: 9, fontWeight: 700, mt: 0.5, color:
          tip.seat.status === 'sold' ? '#ef4444' : tip.seat.status === 'reserved' ? '#f59e0b' : tip.seat.status === 'blocked' ? '#6b7280' : tip.seat.status === 'manual_assigned' ? '#8b5cf6' : textDisabled }}>
          {tip.seat.status === 'sold' ? '● Satıldı' : tip.seat.status === 'reserved' ? '● Rezerve' : tip.seat.status === 'blocked' ? '● Bloke' : tip.seat.status === 'manual_assigned' ? '● Manuel' : tip.seat.status === 'disabled' ? '● Kapalı' : ''}
        </Typography>
      )}
      {tip.seat.assignment && (
        <Box sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${border}` }}>
          <Typography sx={{ fontSize: 9, color: textSecondary }}>{tip.seat.assignment.ownerName}</Typography>
          <Typography sx={{ fontSize: 8, color: textDisabled, fontFamily: 'monospace' }}>{tip.seat.assignment.ownerEmail}</Typography>
        </Box>
      )}
    </Box>
  );
}
