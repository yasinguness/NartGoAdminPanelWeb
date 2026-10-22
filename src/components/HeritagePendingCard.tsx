import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { heritageVillageService, type PendingSummary } from '../services/heritageVillageService';

/**
 * Ortak Hafıza'da bekleyen işler tek yerde: kullanıcı katkıları, tartışmalı kayıtlar, yeni sülale önerileri,
 * konum kuyruğu, Instagram yorumları. Her satır ilgili ekrana götürür. Bekleyen yoksa hiç görünmez.
 */
export default function HeritagePendingCard({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<PendingSummary | null>(null);
  useEffect(() => { heritageVillageService.pendingSummary().then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  const rows = [
    { n: data.villageContributions, label: 'köy bilgisi önerisi (ad, sülale, tarihçe, düzeltme)', to: '/heritage/villages?pending=1' },
    { n: data.communityDisputed, label: 'tartışmalı kayıt (itiraz edilmiş ad/sülale)', to: '/heritage/families?tab=4' },
    { n: data.familySuggestions, label: 'atlasta olmayan yeni sülale önerisi', to: '/heritage/families?tab=3' },
    { n: data.decidableTasks, label: 'karara hazır köy sorusu (3+ oy)', to: '/heritage/villages?pending=1' },
    { n: data.locationQueue, label: 'konum incelemesi', to: '/heritage/locations' },
    { n: data.instagramComments, label: 'Instagram yorumu', to: '/heritage/families?tab=2' },
  ].filter((r) => r.n > 0);
  if (!rows.length) return null;
  const total = rows.reduce((a, r) => a + r.n, 0);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography fontWeight={700}>Ortak Hafıza'da bekleyenler</Typography>
        <Chip size="small" color="warning" label={total} />
        {!compact && data.communityPending > 0 && (
          <Typography variant="caption" color="text.secondary">· {data.communityPending} topluluk kaydı köylü teyidi bekliyor (kendiliğinden kesinleşir)</Typography>
        )}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {rows.map((r) => (
          <Chip key={r.label} component={RouterLink} to={r.to} clickable variant="outlined" label={`${r.n} ${r.label}`} />
        ))}
      </Box>
    </Paper>
  );
}
