/**
 * StageEditor — Sahne manuel ayarlama paneli
 * Konum, boyut, şekil, etiket, renk düzenleme
 */
import {
  Box, Typography, Stack, TextField, Slider, alpha, useTheme, IconButton, Tooltip, Paper,
} from '@mui/material';
import { Close as CloseIcon,
} from '@mui/icons-material';
import type { StageConfig, StageShape } from '../venueEngine';

interface StageEditorProps {
  stage: StageConfig;
  onChange: (stage: StageConfig) => void;
  onClose: () => void;
}

const SHAPES: { value: StageShape; label: string; icon: string }[] = [
  { value: 'rectangle', label: 'Dikdörtgen', icon: '▬' },
  { value: 'semicircle', label: 'Yarım Daire', icon: '⌓' },
  { value: 'circle', label: 'Daire', icon: '●' },
  { value: 'thrust', label: 'T-Şekli', icon: '⊤' },
  { value: 'oval', label: 'Oval', icon: '⬮' },
];



export default function StageEditor({ stage, onChange, onClose }: StageEditorProps) {
  const theme = useTheme();

  const update = (patch: Partial<StageConfig>) => onChange({ ...stage, ...patch });

  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: alpha(theme.palette.primary.main, 0.02),
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Sahne Ayarları
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
      </Stack>

      {/* Şekil */}
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Şekil</Typography>
      <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {SHAPES.map(s => (
          <Tooltip key={s.value} title={s.label}>
            <Box
              onClick={() => update({ shape: s.value })}
              sx={{
                width: 36, height: 36, borderRadius: 1.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
                border: `2px solid ${stage.shape === s.value ? theme.palette.primary.main : theme.palette.divider}`,
                bgcolor: stage.shape === s.value ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { borderColor: theme.palette.primary.light },
              }}
            >
              {s.icon}
            </Box>
          </Tooltip>
        ))}
      </Stack>

      {/* Konum */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <TextField size="small" label="X" type="number" value={stage.x}
          onChange={e => update({ x: Number(e.target.value) })}
          sx={{ flex: 1 }} inputProps={{ step: 10 }} />
        <TextField size="small" label="Y" type="number" value={stage.y}
          onChange={e => update({ y: Number(e.target.value) })}
          sx={{ flex: 1 }} inputProps={{ step: 10 }} />
      </Stack>

      {/* Boyut */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <TextField size="small" label="Genişlik" type="number" value={stage.width}
          onChange={e => update({ width: Math.max(50, Number(e.target.value)) })}
          sx={{ flex: 1 }} inputProps={{ min: 50, max: 1000, step: 10 }} />
        <TextField size="small" label="Yükseklik" type="number" value={stage.height}
          onChange={e => update({ height: Math.max(30, Number(e.target.value)) })}
          sx={{ flex: 1 }} inputProps={{ min: 30, max: 500, step: 10 }} />
      </Stack>

      {/* Boyut Slider */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        Boyut: {stage.width} x {stage.height}
      </Typography>
      <Slider size="small" value={stage.width} min={50} max={800} step={10}
        onChange={(_, v) => update({ width: v as number })}
        sx={{ mb: 1.5 }} />

      {/* Etiket */}
      <TextField size="small" fullWidth label="Sahne Etiketi" value={stage.label}
        onChange={e => update({ label: e.target.value })}
        placeholder="SAHNE"
        sx={{ mb: 1.5 }} />



      {/* Sürükle ipucu */}
      <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block', fontSize: '0.65rem' }}>
        💡 Canvas üzerinde Alt+sürükle ile sahneyi taşıyabilirsiniz
      </Typography>
    </Paper>
  );
}
