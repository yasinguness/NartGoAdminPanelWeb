import React from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import { ConfirmationNumber as TicketIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import type { Seat, SeatCategory } from '../venueEngine';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedSeats: Seat[];
  categories: SeatCategory[];
  price: { sub: number; fee: number; total: number };
}

const green = '#10b981';

export default function OrderDialog({ open, onClose, selectedSeats, categories, price }: Props) {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        <TicketIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'text-bottom', color: green }} />Sipariş Özeti
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1} sx={{ mb: 2 }}>
          {selectedSeats.map(s => {
            const cat = categories.find(c => c.id === s.category);
            return (
              <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: cat?.color }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{s.sectionName} · {s.rowLabel}-{s.seatNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">{cat?.name}</Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: green }}>₺{cat?.price}</Typography>
              </Box>
            );
          })}
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.selected', borderRadius: 2 }}>
          <Typography fontWeight={600}>Ödenecek Tutar</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: green }}>₺{price.total.toLocaleString('tr-TR')}</Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', borderRadius: 2 }}>Geri</Button>
        <Button onClick={() => { onClose(); enqueueSnackbar('Ödeme sayfasına yönlendiriliyorsunuz...', { variant: 'success' }); }}
          variant="contained" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: green, '&:hover': { bgcolor: '#0ea271' } }}>
          Ödemeye Geç
        </Button>
      </DialogActions>
    </Dialog>
  );
}
