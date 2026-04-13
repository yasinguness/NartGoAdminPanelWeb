/**
 * EventTypeStep — Step 2: Etkinlik türü seçimi (Ücretli / Ücretsiz / Davetiye)
 */
import {
  Box, Typography, Stack, Paper, Chip, alpha, useTheme,
} from '@mui/material';

export type EventType = 'paid' | 'free' | 'invite';

interface Props {
  eventType: EventType | null;
  onChange: (type: EventType) => void;
  error?: string;
}

const OPTIONS: { key: EventType; icon: string; name: string; desc: string; features: string[] }[] = [
  { key: 'paid', icon: '🎟️', name: 'Ücretli Etkinlik', desc: 'Bilet satışı yapılacak. Farklı fiyat kategorileri tanımlayabilirsiniz.', features: ['Katmanlı fiyatlandırma', 'Online ödeme', 'QR bilet'] },
  { key: 'free', icon: '🎁', name: 'Ücretsiz Etkinlik', desc: 'Katılım bedava. Kayıt formu ile katılımcı bilgileri toplanır.', features: ['Ücretsiz kayıt', 'Kapasite kontrolü', 'Katılımcı listesi'] },
  { key: 'invite', icon: '🔒', name: 'Davetiye ile Giriş', desc: 'Sadece davet edilen kişiler katılabilir.', features: ['Özel davet kodları', 'Kontrollü erişim', 'VIP etkinlikler'] },
];

const COLORS: Record<EventType, string> = { paid: '#1976d2', free: '#2e7d32', invite: '#ed6c02' };

export default function EventTypeStep({ eventType, onChange, error }: Props) {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Ne tür bir etkinlik oluşturmak istiyorsunuz?</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>Seçiminize göre sonraki adımlar otomatik şekillenir.</Typography>
      </Box>

      <Stack spacing={2}>
        {OPTIONS.map(opt => {
          const color = COLORS[opt.key];
          const sel = eventType === opt.key;
          return (
            <Paper key={opt.key} variant="outlined" onClick={() => onChange(opt.key)}
              sx={{ p: 3, borderRadius: 3, cursor: 'pointer', transition: 'all 0.15s', border: '2px solid',
                borderColor: sel ? color : 'divider', bgcolor: sel ? alpha(color, 0.04) : 'transparent',
                boxShadow: sel ? `0 0 0 3px ${alpha(color, 0.12)}` : 'none',
                '&:hover': { borderColor: sel ? color : alpha(color, 0.4), bgcolor: alpha(color, 0.02) } }}>
              <Stack direction="row" spacing={2.5} alignItems="flex-start">
                <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: alpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{opt.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{opt.name}</Typography>
                    {sel && <Chip label="Seçildi" size="small" sx={{ height: 22, fontWeight: 700, bgcolor: color, color: '#fff' }} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>{opt.desc}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {opt.features.map(f => <Chip key={f} label={f} size="small" variant="outlined" sx={{ height: 24, fontSize: 11, fontWeight: 600, borderColor: alpha(color, 0.3), color: sel ? color : 'text.secondary' }} />)}
                  </Stack>
                </Box>
                <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: sel ? color : 'text.disabled', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5, flexShrink: 0 }}>
                  {sel && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />}
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      {error && <Typography variant="caption" color="error">{error}</Typography>}
    </Stack>
  );
}
