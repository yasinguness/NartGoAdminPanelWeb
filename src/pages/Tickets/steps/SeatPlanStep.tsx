/**
 * SeatPlanStep — Salon planı seçim/oluşturma adımı
 * Wizard Step 3.5: Numaralı koltuk mu, serbest giriş mi? Şablon seçimi.
 */
import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Stack, Radio, RadioGroup,
  FormControlLabel, alpha, useTheme, styled, Fade, Tooltip,
} from '@mui/material';
import {
  EventSeat as SeatIcon,
  Groups as GroupsIcon,
  Straighten as GridIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  VenueLayoutType,
  VenueTemplate,
} from '../../../types/tickets/ticketTypes';
import { ticketService } from '../../../services/ticket/ticketService';

// ─── Types ────────────────────────────────────────────────
interface SeatPlanStepProps {
  isSeated: boolean | null;
  onSeatedChange: (isSeated: boolean) => void;
  selectedTemplate: VenueTemplate | null;
  onTemplateSelect: (template: VenueTemplate | null) => void;
  capacity: number;
}

// ─── Styled ───────────────────────────────────────────────
const OptionCard = styled(Paper)<{ $selected?: boolean }>(({ theme, $selected }) => ({
  padding: theme.spacing(3),
  borderRadius: 16,
  cursor: 'pointer',
  transition: 'all 0.25s ease',
  border: `2px solid ${$selected ? theme.palette.primary.main : theme.palette.divider}`,
  background: $selected ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
  boxShadow: $selected ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` : 'none',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.08)}`,
  },
}));

const TemplateCard = styled(Paper)<{ $selected?: boolean }>(({ theme, $selected }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: `2px solid ${$selected ? theme.palette.primary.main : theme.palette.divider}`,
  background: $selected ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
  '&:hover': {
    borderColor: theme.palette.primary.light,
    boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
  },
}));

// ─── Template metadata ──────────────────────────────────
const TEMPLATE_META: Record<string, { icon: string; description: string }> = {
  [VenueLayoutType.THEATER]: { icon: '🎭', description: 'Klasik tiyatro düzeni, sahne önünde sıralar' },
  [VenueLayoutType.CONCERT]: { icon: '🎵', description: 'Konser salonu, yarım daire sahne' },
  [VenueLayoutType.STADIUM]: { icon: '🏟️', description: 'Büyük etkinlik, tribün düzeni' },
  [VenueLayoutType.CLASSROOM]: { icon: '🎓', description: 'Konferans/seminer, podyum düzeni' },
  [VenueLayoutType.GENERAL_ADMISSION]: { icon: '🎪', description: 'Ayakta izleme, koltuksuz alan' },
  [VenueLayoutType.CONCERT_HALL]: { icon: '🎼', description: 'Konser salonu, orkestra düzeni' },
  [VenueLayoutType.CONFERENCE_CENTER]: { icon: '📋', description: 'Konferans merkezi, masa düzeni' },
};

export default function SeatPlanStep({
  isSeated,
  onSeatedChange,
  selectedTemplate,
  onTemplateSelect,
  capacity,
}: SeatPlanStepProps) {
  const theme = useTheme();
  const [templates] = useState<VenueTemplate[]>(() => ticketService.getVenueTemplates());

  return (
    <Box>
      {/* Oturma Düzeni Seçimi */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
        Oturma Düzeni
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Etkinliğiniz numaralı koltuk mu, yoksa serbest giriş mi olacak?
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <OptionCard $selected={isSeated === true} onClick={() => onSeatedChange(true)} elevation={0}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 52, height: 52, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSeated === true
                  ? alpha(theme.palette.primary.main, 0.12)
                  : alpha(theme.palette.grey[500], 0.08),
              }}>
                <SeatIcon sx={{ fontSize: 28, color: isSeated === true ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Numaralı Koltuk
                  {isSeated === true && <CheckIcon sx={{ ml: 0.5, fontSize: 16, color: 'primary.main', verticalAlign: 'middle' }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Her bilet belirli bir koltuğa atanır. Salon planı gerektirir.
                </Typography>
              </Box>
            </Stack>
          </OptionCard>
        </Grid>

        <Grid item xs={12} sm={6}>
          <OptionCard $selected={isSeated === false} onClick={() => { onSeatedChange(false); onTemplateSelect(null); }} elevation={0}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{
                width: 52, height: 52, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isSeated === false
                  ? alpha(theme.palette.primary.main, 0.12)
                  : alpha(theme.palette.grey[500], 0.08),
              }}>
                <GroupsIcon sx={{ fontSize: 28, color: isSeated === false ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Serbest Giriş
                  {isSeated === false && <CheckIcon sx={{ ml: 0.5, fontSize: 16, color: 'primary.main', verticalAlign: 'middle' }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Koltuk ataması yok. Kapasite sınırı backend'de kontrol edilir.
                </Typography>
              </Box>
            </Stack>
          </OptionCard>
        </Grid>
      </Grid>

      {/* Şablon Seçimi (Numaralı Koltuk seçildiyse) */}
      {isSeated === true && (
        <Fade in>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <GridIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                Salon Şablonu Seçin
              </Typography>
              <Tooltip title="Hazır şablonlardan seçebilir veya özel salon planı oluşturabilirsiniz">
                <InfoIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </Tooltip>
            </Stack>

            <Grid container spacing={2}>
              {templates.map((tmpl) => {
                const meta = TEMPLATE_META[tmpl.type] || { icon: '📍', description: '' };
                const isSelected = selectedTemplate?.id === tmpl.id;

                return (
                  <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                    <TemplateCard
                      $selected={isSelected}
                      onClick={() => onTemplateSelect(isSelected ? null : tmpl)}
                      elevation={0}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography fontSize={28}>{meta.icon}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700} noWrap>
                              {tmpl.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tmpl.capacity} kişilik
                            </Typography>
                          </Box>
                          {isSelected && (
                            <CheckIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                          )}
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                          {tmpl.description || meta.description}
                        </Typography>

                        {tmpl.layout.sections.length > 0 && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {tmpl.layout.sections.map((section) => (
                              <Chip
                                key={section.id}
                                label={section.name}
                                size="small"
                                sx={{
                                  height: 22, fontSize: 11, fontWeight: 600,
                                  bgcolor: alpha(section.color, 0.12),
                                  color: section.color,
                                  border: `1px solid ${alpha(section.color, 0.3)}`,
                                }}
                              />
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </TemplateCard>
                  </Grid>
                );
              })}
            </Grid>

            {selectedTemplate && (
              <Fade in>
                <Paper
                  elevation={0}
                  sx={{
                    mt: 3, p: 2, borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.info.main, 0.04),
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <InfoIcon sx={{ color: 'info.main' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedTemplate.name} seçildi — {selectedTemplate.capacity} kişilik kapasite
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedTemplate.layout.sections.length} bölüm,{' '}
                        {selectedTemplate.layout.sections.reduce(
                          (acc, s) => acc + s.rows.reduce((a, r) => a + r.seats.length, 0), 0
                        )} koltuk.
                        Yayınlamadan önce koltuk düzenini düzenleyebilirsiniz.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* Serbest Giriş bilgi */}
      {isSeated === false && (
        <Fade in>
          <Paper
            elevation={0}
            sx={{
              p: 2, borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.success.main, 0.04),
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <GroupsIcon sx={{ color: 'success.main' }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Serbest giriş etkinliği
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Koltuk seçimi olmayacak. Kapasite ({capacity || '—'} kişi) backend'de otomatik kontrol edilir.
                  Kapasite dolduğunda bekleme listesi aktif olur.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Fade>
      )}
    </Box>
  );
}
