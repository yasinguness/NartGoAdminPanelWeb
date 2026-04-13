import React from 'react';
import { Box, Typography, Button, IconButton, TextField, Stack, useTheme, alpha } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { SeatCategory, VenueConfig } from '../venueEngine';

interface Props {
  venue: VenueConfig;
  categories: SeatCategory[];
  stats: { total: number; maxRevenue: number; counts: Record<string, number> };
  activeSectionId: string;
  onSaveAndContinue: () => void;
  onPreview: () => void;
  onReset: () => void;
}

export default function PreviewSidebar({ venue, categories, stats, activeSectionId, onSaveAndContinue, onPreview, onReset }: Props) {
  const theme = useTheme();
  const surface = theme.palette.background.paper;
  const border = theme.palette.divider;

  const totalSeats = stats.total;
  const maxRevenue = stats.maxRevenue;
  const sectionCount = categories.length;
  const totalRows = venue.sections.reduce((acc, sec) => acc + sec.rows.length, 0);

  const activeCategory = categories.find(c => c.id === activeSectionId);
  const activeSection = venue.sections.find(s => s.defaultCategory === activeSectionId);

  return (
    <Box sx={{ width: 300, flexShrink: 0, bgcolor: surface, borderLeft: `1px solid ${border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* A) Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: `1px solid ${border}` }}>
        <Typography sx={{ fontWeight: 800 }}>Özet</Typography>
        <Typography sx={{ fontSize: 13, color: '#2e7d32', cursor: 'pointer', fontWeight: 600 }}>Düzenle</Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        
        {/* B) 4 stat kart */}
        <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {[
            { value: totalSeats, label: 'Toplam Koltuk' },
            { value: `₺${maxRevenue.toLocaleString('tr-TR')}`, label: 'Maks. Gelir', color: '#15803d' },
            { value: sectionCount, label: 'Bölge' },
            { value: totalRows, label: 'Toplam Sıra' }
          ].map((stat, i) => (
             <Box key={i} sx={{ bgcolor: '#f9fafb', borderRadius: 2, p: 1.5, border: `1px solid ${border}` }}>
               <Typography sx={{ fontSize: 20, fontWeight: 700, color: stat.color || 'inherit' }}>{stat.value}</Typography>
               <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{stat.label}</Typography>
             </Box>
          ))}
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.disabled', letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
            BÖLGE DAĞILIMI
          </Typography>
          
          <Stack spacing={0.5}>
             {categories.map(cat => (
               <Box key={cat.id} sx={{
                 display: 'flex', alignItems: 'center', gap: 1, py: 0.75,
                 borderBottom: `1px solid ${alpha(border, 0.5)}`
               }}>
                 <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cat.color }}/>
                 <Typography variant="body2" sx={{ flex: 1 }}>{cat.name}</Typography>
                 <Typography variant="caption" color="text.secondary">{stats.counts[cat.id] || 0} koltuk</Typography>
                 <Typography variant="caption" fontWeight={600}>₺{cat.price}</Typography>
               </Box>
             ))}
          </Stack>
        </Box>

        {/* D) Aktif bölge sıra editörü */}
        {activeSection && activeCategory && (
          <Box sx={{ p: 2, bgcolor: '#f9fafb', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {activeCategory.name} — Sıralar
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#2e7d32', cursor: 'pointer', fontWeight: 600 }}>
                + Sıra Ekle
              </Typography>
            </Box>

            <Stack spacing={1}>
              {activeSection.rows.map((row) => (
                <Box key={row.label} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, py: 0.75,
                  borderBottom: `1px solid ${alpha(border, 0.5)}`
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: 1,
                    bgcolor: '#4b5563', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{row.label}</Typography>
                  </Box>

                  <TextField
                    size="small"
                    value={row.seatCount}
                    sx={{ width: 50, bgcolor: 'background.paper' }}
                    inputProps={{ min: 1, max: 50, style: { textAlign: 'center', padding: '4px' } }}
                    type="number"
                  />

                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    koltuk
                  </Typography>

                  <Box sx={{ display: 'flex', gap: '2px', flex: 1, flexWrap: 'wrap', alignItems: 'center', ml: 1 }}>
                    {Array.from({ length: Math.min(row.seatCount, 5) }).map((_, i) => (
                      <Box key={i} sx={{ width: 6, height: 6, borderRadius: 0.5, bgcolor: activeCategory.color || '#ccc' }}/>
                    ))}
                    {row.seatCount > 5 && (
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>+{row.seatCount - 5}</Typography>
                    )}
                  </Box>

                  <IconButton size="small" sx={{ color: 'error.light', p: 0.5 }}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* E) Alt aksiyonlar */}
      <Box sx={{ p: 2, borderTop: `1px solid ${border}` }}>
        <Button fullWidth variant="contained" color="success" onClick={onSaveAndContinue} sx={{ mb: 1, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}>
          Kaydet & Devam Et →
        </Button>
        <Button fullWidth variant="outlined" onClick={onPreview} sx={{ mb: 1, textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
          Önizleme Aç
        </Button>
        <Button fullWidth variant="outlined" color="error" onClick={onReset} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
          Planı Sıfırla
        </Button>
      </Box>

    </Box>
  );
}
