import { Box, Typography, Button, TextField, Divider, Chip, Stack } from '@mui/material';
import { SelectAll, EventSeat, TableRows, Stadium, LinearScale, Delete } from '@mui/icons-material';
import type { VenueConfig, Seat, SeatCategory } from '../venueEngine';
import { NUMBERING_MODES, type SeatNumberingMode } from '../../../utils/seatNumbering';

interface Props {
  venue: VenueConfig;
  seats: Seat[];
  categories: SeatCategory[];
  currentTool: string;
  leftTab: string;
  editingSectionId: string | null;
  stats: { total: number; maxRevenue: number; counts: Record<string, number> };
  onVenueChange: (v: VenueConfig) => void;
  onLoadTemplate: (type: any) => void;
  onToolChange: (tool: string) => void;
  onTabChange: (tab: any) => void;
  onEditSection: (id: string | null) => void;
}

const COLOR_OPTIONS = [
  '#f59e0b', '#8b5cf6', '#3b82f6',
  '#10b981', '#ef4444', '#f97316', '#6b7280'
];

const tools = [
  { id: 'select',   label: 'Seç',     icon: <SelectAll /> },
  { id: 'seat',     label: 'Koltuk',  icon: <EventSeat /> },
  { id: 'row',      label: 'Sıra',    icon: <TableRows /> },
  { id: 'stage',    label: 'Sahne',   icon: <Stadium />   },
  { id: 'corridor', label: 'Koridor', icon: <LinearScale />},
  { id: 'disabled', label: 'Sil',     icon: <Delete />, color: 'error' },
];

export default function DesignerLeftPanel({ venue, categories, currentTool, onToolChange, onVenueChange, stats }: Props) {
  const activeSection = categories.find(c => c.id === currentTool);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* A) Araçlar Başlığı */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Araçlar</Typography>
        <Typography variant="caption" color="text.secondary">Bölge seç, koltuk ekle</Typography>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        
        {/* B) ÇİZİM ARAÇLARI */}
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
            ÇİZİM ARAÇLARI
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
             {tools.map(tool => {
               const isActive = currentTool === tool.id;
               return (
                 <Box key={tool.id} onClick={() => onToolChange(tool.id)}
                   sx={{
                     display: 'flex', flexDirection: 'column',
                     alignItems: 'center', gap: 0.5,
                     p: 1, borderRadius: 2, cursor: 'pointer',
                     border: '1.5px solid',
                     borderColor: isActive ? '#2e7d32' : 'transparent',
                     bgcolor: isActive ? '#f0fdf4' : 'transparent',
                     '&:hover': { bgcolor: 'action.hover' },
                     color: tool.color ? tool.color : 'inherit'
                   }}>
                   {tool.icon}
                   <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{tool.label}</Typography>
                 </Box>
               )
             })}
          </Box>
        </Box>

        <Divider />

        {/* D) BÖLGELER */}
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.disabled', letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
            BÖLGELER
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
             {categories.map(s => {
               const isActive = activeSection?.id === s.id;
               return (
                 <Box key={s.id} onClick={() => onToolChange(s.id)}
                   sx={{
                     display: 'flex', alignItems: 'center',
                     gap: 1, px: 1.5, py: 0.75, cursor: 'pointer',
                     borderRadius: 1,
                     bgcolor: isActive ? '#f0fdf4' : 'transparent',
                     borderLeft: isActive ? '3px solid #2e7d32' : '3px solid transparent',
                     '&:hover': { bgcolor: 'action.hover' }
                   }}>
                   <Box sx={{
                     width: 10, height: 10, borderRadius: '50%',
                     bgcolor: s.color, flexShrink: 0
                   }}/>
                   <Typography variant="body2" sx={{ flex: 1, fontWeight: isActive ? 700 : 500 }}>
                     {s.name}
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     {stats.counts[s.id] || 0}
                   </Typography>
                 </Box>
               )
             })}
          </Box>
          <Button variant="outlined" size="small" fullWidth sx={{ mt: 2, borderStyle: 'dashed', textTransform: 'none', borderRadius: 2, color: '#2e7d32', borderColor: '#2e7d32' }}>
            + Yeni Bölge Ekle
          </Button>
        </Box>

      </Box>

      <Divider />

      {/* F) Aktif bölge mini editörü */}
      {activeSection && (
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{activeSection.name}</Typography>
            {/* Just an edit icon placeholder */}
            <Typography sx={{ color: 'text.secondary', cursor: 'pointer' }}>✎</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Bölge Adı</Typography>
              <TextField size="small" fullWidth value={activeSection.name} InputProps={{ sx: { fontSize: 13 } }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">Fiyat (₺)</Typography>
              <TextField size="small" fullWidth value={activeSection.price} InputProps={{ sx: { fontSize: 13 } }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Renk</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
             {COLOR_OPTIONS.map(c => (
               <Box key={c} sx={{
                 width: 20, height: 20, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                 border: activeSection.color === c ? '2px solid #000' : 'none'
               }} onClick={() => {
                 onVenueChange({
                   ...venue,
                   sections: venue.sections.map(s =>
                     s.id === activeSection.id ? { ...s, colorOverride: c } : s
                   ),
                 });
               }} />
             ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Numaralandırma</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {NUMBERING_MODES.map(m => {
              const currentMode: SeatNumberingMode =
                (venue.sections.find(s => s.id === activeSection.id) as any)?.numberingMode || 'ltr';
              return (
                <Chip
                  key={m.value}
                  label={m.label}
                  size="small"
                  variant={currentMode === m.value ? 'filled' : 'outlined'}
                  color={currentMode === m.value ? 'primary' : 'default'}
                  onClick={() => {
                    onVenueChange({
                      ...venue,
                      sections: venue.sections.map(s =>
                        s.id === activeSection.id ? { ...s, numberingMode: m.value as any } : s
                      ),
                    });
                  }}
                  sx={{ cursor: 'pointer', fontWeight: currentMode === m.value ? 700 : 400, fontSize: 10 }}
                />
              );
            })}
          </Stack>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', fontSize: 10 }}>
            {NUMBERING_MODES.find(m => m.value === ((venue.sections.find(s => s.id === activeSection.id) as any)?.numberingMode || 'ltr'))?.example}
          </Typography>
        </Box>
      )}

    </Box>
  );
}
