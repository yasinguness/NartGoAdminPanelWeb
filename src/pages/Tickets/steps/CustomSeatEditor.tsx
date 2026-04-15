/**
 * CustomSeatEditor — Interactive inline seat plan editor
 * Lets users add sections, configure rows and seats, and see a live preview.
 */
import { useState } from 'react';
import {
  Box, Typography, Paper, Stack, TextField, Button, IconButton, Select, MenuItem,
  FormControl, InputLabel, Chip, alpha, useTheme, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { SeatCategory, SeatStatus, type SeatSection } from '../../../types/tickets/ticketTypes';
import { trLetterAt, getNextLetterAfter } from '../../../utils/trAlphabet';
import { generateSeatNumbers, NUMBERING_MODES, type SeatNumberingMode } from '../../../utils/seatNumbering';

const SECTION_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

const CATEGORY_LABELS: Record<string, string> = {
  [SeatCategory.VIP]: 'VIP',
  [SeatCategory.PREMIUM]: 'Premium',
  [SeatCategory.STANDARD]: 'Standart',
  [SeatCategory.ECONOMY]: 'Ekonomi',
  [SeatCategory.WHEELCHAIR]: 'Engelli',
};

interface CustomSeatEditorProps {
  sections: SeatSection[];
  onChange: (sections: SeatSection[]) => void;
}

export default function CustomSeatEditor({ sections, onChange }: CustomSeatEditorProps) {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const totalSeats = sections.reduce((sum, s) => sum + s.rows.reduce((rs, r) => rs + r.seats.length, 0), 0);

  const addSection = () => {
    const idx = sections.length;
    const newSection: SeatSection = {
      id: `sec-${Date.now()}`,
      name: idx === 0 ? 'Standart' : `Bölge ${idx + 1}`,
      offsetX: 0,
      offsetY: idx * 100,
      color: SECTION_COLORS[idx % SECTION_COLORS.length],
      category: idx === 0 ? SeatCategory.STANDARD : SeatCategory.PREMIUM,
      basePrice: 0,
      rows: [
        {
          id: `row-${Date.now()}-1`,
          label: 'A',
          seats: generateSeatNumbers(10).map((num, i) => ({
            id: `seat-${Date.now()}-1-${i}`,
            number: num,
            status: SeatStatus.AVAILABLE,
            category: idx === 0 ? SeatCategory.STANDARD : SeatCategory.PREMIUM,
          })),
        },
      ],
    };
    onChange([...sections, newSection]);
    setExpandedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    onChange(sections.filter(s => s.id !== id));
    if (expandedSection === id) setExpandedSection(null);
  };

  const updateSection = (id: string, field: Partial<SeatSection>) => {
    onChange(sections.map(s => s.id === id ? { ...s, ...field } : s));
  };

  const addRow = (sectionId: string) => {
    onChange(sections.map(s => {
      if (s.id !== sectionId) return s;
      const usedLabels = s.rows.map(r => r.label);
      const lastRow = s.rows[s.rows.length - 1];
      const nextLabel = lastRow
        ? getNextLetterAfter(lastRow.label, usedLabels)
        : trLetterAt(s.rows.length);
      const seatsPerRow = s.rows.length > 0 ? s.rows[s.rows.length - 1].seats.length : 10;
      return {
        ...s,
        rows: [...s.rows, {
          id: `row-${Date.now()}`,
          label: nextLabel,
          seats: generateSeatNumbers(seatsPerRow, (s as any).numberingMode).map((num, i) => ({
            id: `seat-${Date.now()}-${i}`,
            number: num,
            status: SeatStatus.AVAILABLE,
            category: s.category,
          })),
        }],
      };
    }));
  };

  const removeRow = (sectionId: string, rowId: string) => {
    onChange(sections.map(s => {
      if (s.id !== sectionId) return s;
      if (s.rows.length <= 1) return s;
      return { ...s, rows: s.rows.filter(r => r.id !== rowId) };
    }));
  };

  const updateRowSeats = (sectionId: string, rowId: string, count: number) => {
    const safeCount = Math.max(1, Math.min(50, count));
    onChange(sections.map(s => {
      if (s.id !== sectionId) return s;
      const mode: SeatNumberingMode = (s as any).numberingMode || 'ltr';
      return {
        ...s,
        rows: s.rows.map(r => {
          if (r.id !== rowId) return r;
          // Regenerate all seat numbers with the correct mode
          const numbers = generateSeatNumbers(safeCount, mode);
          return {
            ...r,
            seats: numbers.map((num, i) => ({
              id: r.seats[i]?.id || `seat-${Date.now()}-${i}`,
              number: num,
              status: r.seats[i]?.status || SeatStatus.AVAILABLE,
              category: r.seats[i]?.category || s.category,
            })),
          };
        }),
      };
    }));
  };

  return (
    <Box>
      {/* Summary bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'grey.50' }}>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Bölge</Typography>
            <Typography variant="h6" fontWeight={800}>{sections.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Toplam Sıra</Typography>
            <Typography variant="h6" fontWeight={800}>{sections.reduce((s, sec) => s + sec.rows.length, 0)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Toplam Koltuk</Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main">{totalSeats}</Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Sections */}
      <Stack spacing={2}>
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSection === section.id;
          const sectionSeats = section.rows.reduce((s, r) => s + r.seats.length, 0);

          return (
            <Paper key={section.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', border: `2px solid ${isExpanded ? section.color : theme.palette.divider}`, transition: 'border-color 0.2s' }}>
              {/* Section header */}
              <Box
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, cursor: 'pointer', bgcolor: alpha(section.color, 0.06), '&:hover': { bgcolor: alpha(section.color, 0.1) }, transition: 'background 0.2s' }}
              >
                <DragIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: section.color, flexShrink: 0 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>{section.name}</Typography>
                <Chip size="small" label={`${sectionSeats} koltuk · ${section.rows.length} sıra`} sx={{ fontWeight: 600, fontSize: 11, bgcolor: alpha(section.color, 0.1), color: section.color }} />
                <Chip size="small" label={CATEGORY_LABELS[section.category] || section.category} variant="outlined" sx={{ fontWeight: 600, fontSize: 10, height: 22 }} />
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} sx={{ '&:hover': { color: 'error.main' } }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              {/* Section detail — expanded */}
              {isExpanded && (
                <Box sx={{ p: 2.5 }}>
                  {/* Section settings */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
                    <TextField
                      label="Bölge Adı"
                      size="small"
                      fullWidth
                      value={section.name}
                      onChange={e => updateSection(section.id, { name: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Kategori</InputLabel>
                      <Select
                        value={section.category}
                        label="Kategori"
                        onChange={e => updateSection(section.id, { category: e.target.value as SeatCategory })}
                        sx={{ borderRadius: 2 }}
                      >
                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                          <MenuItem key={val} value={val}>{label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Bölge Rengi"
                      size="small"
                      type="color"
                      value={section.color}
                      onChange={e => updateSection(section.id, { color: e.target.value })}
                      sx={{ minWidth: 80, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{ sx: { height: 40 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Numaralandırma</InputLabel>
                      <Select
                        value={(section as any).numberingMode || 'ltr'}
                        label="Numaralandırma"
                        onChange={e => {
                          const mode = e.target.value as SeatNumberingMode;
                          const updated = {
                            ...section,
                            numberingMode: mode,
                            rows: section.rows.map(r => ({
                              ...r,
                              seats: generateSeatNumbers(r.seats.length, mode).map((num, i) => ({
                                ...r.seats[i],
                                number: num,
                              })),
                            })),
                          };
                          onChange(sections.map(s => s.id === section.id ? updated : s));
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {NUMBERING_MODES.map(m => (
                          <MenuItem key={m.value} value={m.value}>
                            <Stack>
                              <Typography sx={{ fontSize: 13 }}>{m.label}</Typography>
                              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{m.example}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Divider sx={{ mb: 2 }} />

                  {/* Rows */}
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Sıralar
                  </Typography>

                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {section.rows.map((row) => (
                      <Paper key={row.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderRadius: 2 }}>
                        {/* Row label */}
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha(section.color, 0.12), color: section.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {row.label}
                        </Box>

                        {/* Seat count */}
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>Koltuk:</Typography>
                          <TextField
                            size="small"
                            type="number"
                            value={row.seats.length}
                            onChange={e => updateRowSeats(section.id, row.id, Number(e.target.value))}
                            InputProps={{ inputProps: { min: 1, max: 50 } }}
                            sx={{ width: 80, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            onFocus={e => e.target.select()}
                          />
                        </Stack>

                        {/* Visual seats */}
                        <Stack direction="row" spacing={0.3} sx={{ overflow: 'hidden', maxWidth: 200 }}>
                          {row.seats.slice(0, 20).map((seat) => (
                            <Box key={seat.id} sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: section.color, opacity: 0.6 }} />
                          ))}
                          {row.seats.length > 20 && (
                            <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5, fontSize: 9 }}>+{row.seats.length - 20}</Typography>
                          )}
                        </Stack>

                        <IconButton size="small" onClick={() => removeRow(section.id, row.id)} disabled={section.rows.length <= 1} sx={{ '&:hover': { color: 'error.main' } }}>
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Paper>
                    ))}
                  </Stack>

                  <Button size="small" startIcon={<AddIcon />} onClick={() => addRow(section.id)} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                    Sıra Ekle
                  </Button>
                </Box>
              )}
            </Paper>
          );
        })}

        {/* Add section button */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addSection}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 3, borderStyle: 'dashed', py: 1.5, color: 'primary.main' }}
        >
          Yeni Bölge Ekle
        </Button>
      </Stack>

      {/* Live preview */}
      {sections.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Önizleme
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            {/* Stage */}
            <Box sx={{ width: '60%', py: 0.8, bgcolor: alpha('#16a34a', 0.12), borderRadius: 1, textAlign: 'center', mb: 1.5 }}>
              <Typography variant="caption" fontWeight={600} color="#16a34a" sx={{ fontSize: 10 }}>SAHNE</Typography>
            </Box>
            {sections.map((sec) => (
              <Box key={sec.id} sx={{ width: '100%', mb: 1 }}>
                <Typography variant="caption" fontWeight={600} sx={{ color: sec.color, fontSize: 9, mb: 0.3, display: 'block', textAlign: 'center' }}>{sec.name}</Typography>
                {sec.rows.map((row) => (
                  <Stack key={row.id} direction="row" justifyContent="center" spacing={0.3} sx={{ mb: 0.3 }}>
                    <Typography sx={{ fontSize: 8, color: 'text.disabled', width: 12, textAlign: 'right', mr: 0.5, lineHeight: '10px' }}>{row.label}</Typography>
                    {row.seats.map((seat) => (
                      <Box key={seat.id} sx={{ width: 7, height: 7, borderRadius: 0.5, bgcolor: sec.color, opacity: 0.5 }} />
                    ))}
                  </Stack>
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
