/**
 * SeatPlanStep — Mekan & Salon planı adımı
 * Step 4: Mekan seçimi (Google Places) + Oturma düzeni + Şablon seçimi
 */
import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, alpha, useTheme, styled, Fade, Tooltip,
  TextField, CircularProgress, Dialog, DialogTitle, DialogContent, IconButton,
} from '@mui/material';
import {
  EventSeat as SeatIcon,
  Groups as GroupsIcon,
  Straighten as GridIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  TipsAndUpdates as TipIcon,
  Place as PlaceIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import {
  VenueLayoutType,
  VenueTemplate,
  type SeatSection,
  SeatCategory,
  SeatStatus,
} from '../../../types/tickets/ticketTypes';
import { ticketService } from '../../../services/ticket/ticketService';
import GooglePlacesInput, { type AddressValue } from '../../../components/GooglePlacesInput';
import CustomSeatEditor from './CustomSeatEditor';
import { seatTemplateService, type SeatTemplate } from '../../../services/ticket/seatTemplateService';

// ─── Types ────────────────────────────────────────────────
// LocationDetails replaced by AddressValue from GooglePlacesInput
interface _Deprecated_LocationDetails {
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  fullAddress?: string;
}

interface SeatPlanStepProps {
  isSeated: boolean | null;
  onSeatedChange: (isSeated: boolean) => void;
  selectedTemplate: VenueTemplate | null;
  onTemplateSelect: (template: VenueTemplate | null) => void;
  capacity: number;
  addressValue: AddressValue | null;
  onAddressChange: (v: AddressValue | null) => void;
  customSections: SeatSection[];
  onCustomSectionsChange: (v: SeatSection[]) => void;
  capacityValue: string;
  onCapacityChange: (v: string) => void;
  capacityError?: string;
  editorMode: boolean;
  onEditorModeChange: (v: boolean) => void;
}

// ─── Styled ───────────────────────────────────────────────
const OptionCard = styled(Paper, { shouldForwardProp: (p) => p !== '$selected' })<{ $selected?: boolean }>(({ theme, $selected }) => ({
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

const TemplateCard = styled(Paper, { shouldForwardProp: (p) => p !== '$selected' })<{ $selected?: boolean }>(({ theme, $selected }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  position: 'relative' as const,
  border: `2px solid ${$selected ? '#16a34a' : theme.palette.divider}`,
  background: $selected ? alpha('#16a34a', 0.04) : theme.palette.background.paper,
  boxShadow: $selected ? `0 0 0 3px ${alpha('#16a34a', 0.12)}` : 'none',
  '&:hover': {
    borderColor: $selected ? '#16a34a' : theme.palette.primary.light,
    boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
  },
}));

// ─── Template metadata + default sections ───────────────
interface TemplateDefinition {
  icon: string;
  description: string;
  defaultSections: { name: string; category: string; color: string; rows: { label: string; seats: number }[] }[];
}

const TEMPLATE_DEFS: Record<string, TemplateDefinition> = {
  [VenueLayoutType.THEATER]: {
    icon: '🎭', description: 'Klasik tiyatro düzeni, sahne önünde sıralar',
    defaultSections: [
      { name: 'VIP', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 10 }, { label: 'B', seats: 10 }] },
      { name: 'Standart', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'C', seats: 15 }, { label: 'D', seats: 15 }, { label: 'E', seats: 15 }, { label: 'F', seats: 15 }] },
      { name: 'Balkon', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'G', seats: 20 }, { label: 'H', seats: 20 }] },
    ],
  },
  [VenueLayoutType.CONCERT]: {
    icon: '🎵', description: 'Konser salonu, yarım daire sahne',
    defaultSections: [
      { name: 'Altın Çember', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 20 }, { label: 'B', seats: 20 }] },
      { name: 'Ön Bölge', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'C', seats: 30 }, { label: 'D', seats: 30 }, { label: 'E', seats: 30 }] },
      { name: 'Arka Bölge', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'F', seats: 40 }, { label: 'G', seats: 40 }, { label: 'H', seats: 40 }] },
    ],
  },
  [VenueLayoutType.STADIUM]: {
    icon: '🏟️', description: 'Büyük etkinlik, tribün düzeni',
    defaultSections: [
      { name: 'Tribün VIP', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 25 }, { label: 'B', seats: 25 }] },
      { name: 'Tribün A', category: 'PREMIUM', color: '#9C27B0', rows: [{ label: 'C', seats: 40 }, { label: 'D', seats: 40 }, { label: 'E', seats: 40 }] },
      { name: 'Tribün B', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'F', seats: 50 }, { label: 'G', seats: 50 }, { label: 'H', seats: 50 }] },
      { name: 'Kale Arkası', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'I', seats: 60 }, { label: 'J', seats: 60 }] },
    ],
  },
  [VenueLayoutType.CLASSROOM]: {
    icon: '🎓', description: 'Konferans/seminer, podyum düzeni',
    defaultSections: [
      { name: 'Ön Sıra', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 8 }] },
      { name: 'Orta Bölge', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'B', seats: 12 }, { label: 'C', seats: 12 }, { label: 'D', seats: 12 }] },
      { name: 'Arka Bölge', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'E', seats: 15 }, { label: 'F', seats: 15 }] },
    ],
  },
  [VenueLayoutType.GENERAL_ADMISSION]: {
    icon: '🎪', description: 'Ayakta izleme, koltuksuz alan',
    defaultSections: [{ name: 'Genel Giriş', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'A', seats: 50 }] }],
  },
  [VenueLayoutType.CONCERT_HALL]: {
    icon: '🎼', description: 'Konser salonu, orkestra düzeni',
    defaultSections: [
      { name: 'Orkestra VIP', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 15 }, { label: 'B', seats: 15 }] },
      { name: 'Parter', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'C', seats: 20 }, { label: 'D', seats: 20 }, { label: 'E', seats: 20 }] },
      { name: 'Balkon', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'F', seats: 25 }, { label: 'G', seats: 25 }] },
    ],
  },
  [VenueLayoutType.CONFERENCE_CENTER]: {
    icon: '📋', description: 'Konferans merkezi, masa düzeni',
    defaultSections: [
      { name: 'VIP Masalar', category: 'VIP', color: '#FFD700', rows: [{ label: 'A', seats: 6 }] },
      { name: 'Standart Oturma', category: 'STANDARD', color: '#4CAF50', rows: [{ label: 'B', seats: 10 }, { label: 'C', seats: 10 }, { label: 'D', seats: 10 }] },
      { name: 'Arka Sıralar', category: 'ECONOMY', color: '#2196F3', rows: [{ label: 'E', seats: 12 }, { label: 'F', seats: 12 }] },
    ],
  },
};

/** Convert template definition → SeatSection[] for CustomSeatEditor */
function templateToSections(def: TemplateDefinition): SeatSection[] {
  return def.defaultSections.map((sec, i) => ({
    id: `sec-tmpl-${i}-${Date.now()}`,
    name: sec.name,
    offsetX: 0, offsetY: i * 100,
    color: sec.color,
    category: sec.category as SeatCategory,
    basePrice: 0,
    rows: sec.rows.map((r, ri) => ({
      id: `row-tmpl-${i}-${ri}-${Date.now()}`,
      label: r.label,
      seats: Array.from({ length: r.seats }, (_, si) => ({
        id: `seat-tmpl-${i}-${ri}-${si}-${Date.now()}`,
        number: si + 1,
        status: SeatStatus.AVAILABLE,
        category: sec.category as SeatCategory,
      })),
    })),
  }));
}

function calcTemplateCapacity(def: TemplateDefinition): number {
  return def.defaultSections.reduce((sum, sec) => sum + sec.rows.reduce((rs, r) => rs + r.seats, 0), 0);
}

// ─── SVG Previews ────────────────────────────────────────
function TemplateSVG({ type }: { type: string }) {
  const common = { stroke: '#16a34a', strokeWidth: 1.5 };
  const seatColor = '#d1fae5';
  const stageColor = alpha('#16a34a', 0.15);

  switch (type) {
    case VenueLayoutType.THEATER:
      return (
        <svg viewBox="0 0 200 160" width="100%" height="140">
          {/* Stage */}
          <rect x="40" y="10" width="120" height="24" rx="4" fill={stageColor} {...common} />
          <text x="100" y="26" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">SAHNE</text>
          {/* Rows — curved */}
          {[0,1,2,3,4].map(r => (
            <g key={r}>
              {Array.from({ length: 8 + r * 2 }).map((_, i) => {
                const cx = 100 + (i - (8 + r * 2) / 2 + 0.5) * 14;
                const cy = 50 + r * 22;
                return <rect key={i} x={cx - 5} y={cy - 4} width="10" height="8" rx="2" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />;
              })}
            </g>
          ))}
        </svg>
      );
    case VenueLayoutType.CONCERT:
      return (
        <svg viewBox="0 0 200 160" width="100%" height="140">
          <ellipse cx="100" cy="22" rx="60" ry="14" fill={stageColor} {...common} />
          <text x="100" y="26" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">SAHNE</text>
          {[0,1,2,3].map(r => (
            <g key={r}>
              {Array.from({ length: 10 + r * 2 }).map((_, i) => {
                const cx = 100 + (i - (10 + r * 2) / 2 + 0.5) * 12;
                return <rect key={i} x={cx - 4} y={52 + r * 24} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />;
              })}
            </g>
          ))}
        </svg>
      );
    case VenueLayoutType.STADIUM:
      return (
        <svg viewBox="0 0 200 160" width="100%" height="140">
          <rect x="60" y="55" width="80" height="40" rx="6" fill={stageColor} {...common} />
          <text x="100" y="79" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">SAHA</text>
          {/* Top */}
          {[0,1].map(r => <g key={`t${r}`}>{Array.from({ length: 14 }).map((_, i) => <rect key={i} x={24 + i * 11} y={12 + r * 14} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />)}</g>)}
          {/* Bottom */}
          {[0,1].map(r => <g key={`b${r}`}>{Array.from({ length: 14 }).map((_, i) => <rect key={i} x={24 + i * 11} y={108 + r * 14} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />)}</g>)}
          {/* Left */}
          {[0,1].map(c => <g key={`l${c}`}>{Array.from({ length: 4 }).map((_, i) => <rect key={i} x={12 + c * 14} y={45 + i * 18} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />)}</g>)}
          {/* Right */}
          {[0,1].map(c => <g key={`r${c}`}>{Array.from({ length: 4 }).map((_, i) => <rect key={i} x={168 + c * 14} y={45 + i * 18} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />)}</g>)}
        </svg>
      );
    case VenueLayoutType.CLASSROOM:
    case VenueLayoutType.CONFERENCE_CENTER:
      return (
        <svg viewBox="0 0 200 160" width="100%" height="140">
          <rect x="60" y="10" width="80" height="20" rx="4" fill={stageColor} {...common} />
          <text x="100" y="24" textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">PODYUM</text>
          {/* U-shape tables + chairs */}
          {[0,1,2,3,4].map(r => (
            <g key={r}>
              <rect x={40} y={44 + r * 22} width={120} height="4" rx="2" fill={alpha('#16a34a', 0.1)} stroke="#16a34a" strokeWidth="0.5" />
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x={44 + i * 15} y={50 + r * 22} width="8" height="7" rx="1.5" fill={seatColor} stroke="#16a34a" strokeWidth="0.8" />
              ))}
            </g>
          ))}
        </svg>
      );
    default: // GENERAL_ADMISSION / CONCERT_HALL
      return (
        <svg viewBox="0 0 200 160" width="100%" height="140">
          <rect x="20" y="10" width="160" height="140" rx="12" fill={stageColor} {...common} strokeDasharray="6 3" />
          <text x="100" y="75" textAnchor="middle" fontSize="12" fill="#16a34a" fontWeight="600">SERBEST ALAN</text>
          <text x="100" y="92" textAnchor="middle" fontSize="9" fill={alpha('#16a34a', 0.6)}>Koltuk ataması yok</text>
        </svg>
      );
  }
}

export default function SeatPlanStep({
  isSeated, onSeatedChange, selectedTemplate, onTemplateSelect, capacity,
  addressValue, onAddressChange,
  customSections, onCustomSectionsChange,
  capacityValue, onCapacityChange, capacityError,
  editorMode, onEditorModeChange,
}: SeatPlanStepProps) {
  const theme = useTheme();
  const [templates] = useState<VenueTemplate[]>(() => ticketService.getVenueTemplates());
  const [previewTemplate, setPreviewTemplate] = useState<VenueTemplate | null>(null);

  // Kayıtlı salon planları
  const [savedTemplates, setSavedTemplates] = useState<SeatTemplate[]>([]);
  const [savedTemplatesLoading, setSavedTemplatesLoading] = useState(false);

  useEffect(() => {
    if (isSeated === true) {
      setSavedTemplatesLoading(true);
      seatTemplateService.listTemplates()
        .then(res => { if (res.success) setSavedTemplates(res.data || []); })
        .catch(() => {})
        .finally(() => setSavedTemplatesLoading(false));
    }
  }, [isSeated]);

  /** Kayıtlı şablonu SeatSection[]'a dönüştür (editörde düzenlenebilir) */
  const savedTemplateToSections = (tpl: SeatTemplate): SeatSection[] => {
    const layout = tpl.layout;
    if (!layout?.rows) return [];

    const cats = layout.categories || [];
    // Sıra → kategori eşleşmesi
    const rowToCat = new Map<string, { name: string; color: string }>();
    for (const cat of cats) {
      for (const rowName of cat.rows || []) {
        rowToCat.set(rowName, { name: cat.name, color: cat.color });
      }
    }

    // Kategorilere göre grupla
    const sectionMap = new Map<string, { name: string; color: string; category: string; rows: { label: string; seats: number }[] }>();

    for (const row of layout.rows) {
      const cat = rowToCat.get(row.name) || { name: 'Genel', color: '#4CAF50' };
      const key = cat.name;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, { name: cat.name, color: cat.color, category: 'STANDARD', rows: [] });
      }
      sectionMap.get(key)!.rows.push({ label: row.name, seats: row.seatCount });
    }

    // Eğer hiç kategori yoksa tek section oluştur
    if (sectionMap.size === 0) {
      return [{
        id: `sec-saved-0-${Date.now()}`,
        name: tpl.name,
        offsetX: 0, offsetY: 0,
        color: '#4CAF50',
        category: SeatCategory.STANDARD,
        basePrice: 0,
        rows: layout.rows.map((r, ri) => ({
          id: `row-saved-0-${ri}-${Date.now()}`,
          label: r.name,
          seats: Array.from({ length: r.seatCount }, (_, si) => ({
            id: `seat-saved-0-${ri}-${si}-${Date.now()}`,
            number: si + 1,
            status: SeatStatus.AVAILABLE,
            category: SeatCategory.STANDARD,
          })),
        })),
      }];
    }

    return Array.from(sectionMap.entries()).map(([key, sec], i) => ({
      id: `sec-saved-${i}-${Date.now()}`,
      name: sec.name,
      offsetX: 0, offsetY: i * 100,
      color: sec.color,
      category: sec.category as SeatCategory,
      basePrice: 0,
      rows: sec.rows.map((r, ri) => ({
        id: `row-saved-${i}-${ri}-${Date.now()}`,
        label: r.label,
        seats: Array.from({ length: r.seats }, (_, si) => ({
          id: `seat-saved-${i}-${ri}-${si}-${Date.now()}`,
          number: si + 1,
          status: SeatStatus.AVAILABLE,
          category: sec.category as SeatCategory,
        })),
      })),
    }));
  };

  // Location handlers moved to GooglePlacesInput component

  return (
    <Box>
      {/* ━━━ MEKAN SEÇİMİ ━━━ */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <PlaceIcon fontSize="small" color="primary" />
        <Typography variant="subtitle1" fontWeight={700}>Etkinlik Mekanı</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Mekan adı veya adres yazarak arayın.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <GooglePlacesInput
          value={addressValue}
          onChange={onAddressChange}
          label="Mekan Ara"
          placeholder="Örn: Kadıköy Sahne, ATO Congresium, Harbiye Cemil Topuzlu..."
          size="medium"
          fullWidth
          showDetails
        />
      </Box>

      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3, mt: 1 }} />

      {/* ━━━ OTURMA DÜZENİ ━━━ */}

      {isSeated === null && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`, bgcolor: alpha(theme.palette.info.main, 0.04) }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <TipIcon sx={{ color: 'info.main', mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Hangi düzeni seçmeliyim?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                <strong>Serbest Giriş</strong> — Çoğu etkinlik için. Katılımcılar istedikleri yere oturur.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 0.5 }}>
                <strong>Numaralı Koltuk</strong> — Tiyatro, sinema gibi koltuklu mekanlar için. Salon planı gerekir.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Oturma Düzeni</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Etkinliğiniz numaralı koltuk mu, yoksa serbest giriş mi olacak?
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <OptionCard $selected={isSeated === false} onClick={() => { onSeatedChange(false); onTemplateSelect(null); }} elevation={0}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSeated === false ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.grey[500], 0.08) }}>
                <GroupsIcon sx={{ fontSize: 28, color: isSeated === false ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" fontWeight={700}>Serbest Giriş</Typography>
                  <Chip label="Önerilen" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                  {isSeated === false && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                </Stack>
                <Typography variant="caption" color="text.secondary">Koltuk ataması yok. Kapasite otomatik kontrol edilir.</Typography>
              </Box>
            </Stack>
          </OptionCard>
        </Grid>
        <Grid item xs={12} sm={6}>
          <OptionCard $selected={isSeated === true} onClick={() => onSeatedChange(true)} elevation={0}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSeated === true ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.grey[500], 0.08) }}>
                <SeatIcon sx={{ fontSize: 28, color: isSeated === true ? 'primary.main' : 'text.secondary' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Numaralı Koltuk
                  {isSeated === true && <CheckIcon sx={{ ml: 0.5, fontSize: 16, color: 'primary.main', verticalAlign: 'middle' }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary">Her bilet belirli bir koltuğa atanır. Salon planı gerektirir.</Typography>
              </Box>
            </Stack>
          </OptionCard>
        </Grid>
      </Grid>

      {/* ━━━ SERBEST GİRİŞ: kapasite input ━━━ */}
      {isSeated === false && (
        <Fade in>
          <Box>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${alpha('#16a34a', 0.2)}`, bgcolor: alpha('#16a34a', 0.04) }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <CheckIcon sx={{ color: 'success.main', mt: 0.3 }} />
                <Box>
                  <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>Serbest giriş etkinliği</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    Koltuk seçimi olmayacak. {capacity > 0 ? `Toplam kapasite: ${capacity} kişi.` : 'Kapasite bir sonraki adımda bilet kontenjanlarından otomatik hesaplanacak.'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Fade>
      )}

      {/* ━━━ NUMARALI KOLTUK: şablon seçimi ━━━ */}
      {isSeated === true && (
        <Fade in>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <GridIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>Salon Şablonu Seçin</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bir şablon seçin ve etkinliğinize uygun şekilde özelleştirin. Bölge sayıları, sıra ve koltuk adetleri tamamen değiştirilebilir.
            </Typography>

            {/* ── Şablon seçimi veya editör ── */}
            {!editorMode ? (
              <>
                <Grid container spacing={2}>

                  {/* ══ 1) KAYITLI SALON PLANLARI — en üstte ══ */}
                  {savedTemplatesLoading && (
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="caption" color="text.secondary">Kayıtlı planlar yükleniyor...</Typography>
                      </Stack>
                    </Grid>
                  )}
                  {savedTemplates.length > 0 && (
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <BookmarkIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                        <Typography variant="subtitle2" fontWeight={700} color="#16a34a">
                          Kayıtlı Salon Planları
                        </Typography>
                        <Chip label={`${savedTemplates.length} plan`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: alpha('#16a34a', 0.1), color: '#16a34a' }} />
                      </Stack>
                    </Grid>
                  )}
                  {savedTemplates.map((saved) => {
                    const savedTotalSeats = saved.totalSeats || saved.layout?.rows?.reduce((s, r) => s + r.seatCount, 0) || 0;
                    const isSelected = selectedTemplate?.id === `saved:${saved.id}`;
                    const savedCats = saved.layout?.categories || [];
                    const savedRows = saved.layout?.rows || [];
                    return (
                      <Grid item xs={12} sm={6} md={4} key={`saved-${saved.id}`}>
                        <TemplateCard
                          $selected={isSelected}
                          elevation={0}
                          onClick={() => {
                            if (isSelected) {
                              onTemplateSelect(null);
                            } else {
                              onTemplateSelect({ id: `saved:${saved.id}`, name: saved.name, description: saved.description || '', type: VenueLayoutType.THEATER, capacity: savedTotalSeats, thumbnail: '', layout: { sections: [] }, seatMap: { sections: [] } } as unknown as VenueTemplate);
                              onCustomSectionsChange(savedTemplateToSections(saved));
                              onEditorModeChange(true);
                            }
                          }}
                        >
                          {isSelected && <Box sx={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', bgcolor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}><CheckIcon sx={{ color: '#fff', fontSize: 16 }} /></Box>}
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: alpha('#16a34a', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid', borderColor: alpha('#16a34a', 0.25) }}>
                                <BookmarkIcon sx={{ color: '#16a34a', fontSize: 24 }} />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={700} noWrap>{saved.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{savedTotalSeats} koltuk · {savedRows.length} sıra · özelleştirilebilir</Typography>
                              </Box>
                            </Stack>

                            {/* Kategori breakdown veya sıra özeti */}
                            {savedCats.length > 0 ? (
                              <Stack spacing={0.5}>
                                {savedCats.map(cat => {
                                  const catSeats = savedRows.filter(r => cat.rows?.includes(r.name)).reduce((s, r) => s + r.seatCount, 0);
                                  const rowRange = cat.rows?.length ? `${cat.rows[0]}–${cat.rows[cat.rows.length - 1]}` : '';
                                  return (
                                    <Stack key={cat.name} direction="row" spacing={1} alignItems="center">
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cat.color, flexShrink: 0 }} />
                                      <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{cat.name}</Typography>
                                      <Typography variant="caption" color="text.disabled" fontSize={10}>{rowRange}</Typography>
                                      <Typography variant="caption" fontWeight={700} fontFamily="monospace" fontSize={11}>{catSeats}</Typography>
                                    </Stack>
                                  );
                                })}
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {savedRows.slice(0, 8).map(r => (
                                  <Chip key={r.name} label={`${r.name}:${r.seatCount}`} size="small"
                                    sx={{ height: 18, fontSize: 9, fontWeight: 600, bgcolor: alpha('#16a34a', 0.08) }} />
                                ))}
                                {savedRows.length > 8 && <Chip label={`+${savedRows.length - 8}`} size="small" sx={{ height: 18, fontSize: 9, color: 'text.disabled' }} />}
                              </Stack>
                            )}
                          </Stack>
                        </TemplateCard>
                      </Grid>
                    );
                  })}

                  {/* ══ 2) HAZIR ŞABLONLAR ══ */}
                  {savedTemplates.length > 0 && (
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                        <GridIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                          Hazır Şablonlar
                        </Typography>
                      </Stack>
                    </Grid>
                  )}
                  {templates.map((tmpl) => {
                    const def = TEMPLATE_DEFS[tmpl.type] || { icon: '📍', description: '', defaultSections: [] };
                    const isSelected = selectedTemplate?.id === tmpl.id;
                    const totalCap = calcTemplateCapacity(def);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                        <TemplateCard
                          $selected={isSelected}
                          elevation={0}
                          onClick={() => {
                            if (isSelected) { onTemplateSelect(null); }
                            else { onTemplateSelect(tmpl); setPreviewTemplate(tmpl); }
                          }}
                        >
                          {isSelected && <Box sx={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', bgcolor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}><CheckIcon sx={{ color: '#fff', fontSize: 16 }} /></Box>}
                          <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Typography fontSize={28}>{def.icon}</Typography>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={700} noWrap>{tmpl.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{totalCap} koltuk · özelleştirilebilir</Typography>
                              </Box>
                            </Stack>
                            <Stack spacing={0.5}>
                              {def.defaultSections.map(sec => {
                                const secCap = sec.rows.reduce((s, r) => s + r.seats, 0);
                                return (
                                  <Stack key={sec.name} direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: sec.color, flexShrink: 0 }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{sec.name}</Typography>
                                    <Typography variant="caption" fontWeight={700} fontFamily="monospace" fontSize={11}>{secCap}</Typography>
                                  </Stack>
                                );
                              })}
                            </Stack>
                            {isSelected && (
                              <Chip icon={<EditIcon sx={{ fontSize: 12 }} />} label="Düzenle" size="small"
                                onClick={(e) => { e.stopPropagation(); onCustomSectionsChange(templateToSections(def)); onEditorModeChange(true); }}
                                sx={{ height: 24, fontSize: 10, fontWeight: 700, cursor: 'pointer', bgcolor: '#16a34a', color: '#fff', '&:hover': { bgcolor: '#15803d' }, alignSelf: 'flex-start' }} />
                            )}
                          </Stack>
                        </TemplateCard>
                      </Grid>
                    );
                  })}

                  {/* ══ 3) ÖZEL DÜZEN ══ */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TemplateCard $selected={selectedTemplate?.id === '__custom__'} elevation={0}
                      onClick={() => { onTemplateSelect({ id: '__custom__', name: 'Özel Düzen', description: '', type: VenueLayoutType.GENERAL_ADMISSION, capacity: 0, thumbnail: '', layout: { sections: [] }, seatMap: { sections: [] } } as unknown as VenueTemplate); onCustomSectionsChange([]); onEditorModeChange(true); }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography fontSize={28}>✏️</Typography>
                          <Box sx={{ flex: 1 }}><Typography variant="subtitle2" fontWeight={700}>Özel Düzen</Typography><Typography variant="caption" color="text.secondary">Sıfırdan oluştur</Typography></Box>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>Bölge, sıra ve koltukları sıfırdan kendiniz yerleştirin.</Typography>
                      </Stack>
                    </TemplateCard>
                  </Grid>
                </Grid>

                {/* Seçili şablon özeti */}
                {selectedTemplate && selectedTemplate.id !== '__custom__' && (
                  <Fade in>
                    <Paper elevation={0} sx={{ mt: 3, p: 2.5, borderRadius: 3, border: `1px solid ${alpha('#16a34a', 0.3)}`, bgcolor: alpha('#16a34a', 0.04) }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha('#16a34a', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckIcon sx={{ color: '#16a34a' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{selectedTemplate.name} seçildi — {calcTemplateCapacity(TEMPLATE_DEFS[selectedTemplate.type] || { icon: '', description: '', defaultSections: [] })} koltuk</Typography>
                          <Typography variant="caption" color="text.secondary">Devam edebilir veya editörde özelleştirebilirsiniz.</Typography>
                        </Box>
                        <Chip label="Düzenle" size="small" variant="outlined"
                          onClick={() => { onCustomSectionsChange(templateToSections(TEMPLATE_DEFS[selectedTemplate.type] || { icon: '', description: '', defaultSections: [] })); onEditorModeChange(true); }}
                          sx={{ height: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer', borderColor: '#16a34a', color: '#16a34a' }} />
                      </Stack>
                    </Paper>
                  </Fade>
                )}
              </>
            ) : (
              /* ── EDİTÖR MODU ── */
              <Fade in>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EditIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>Salon Planı Editörü</Typography>
                      {selectedTemplate && selectedTemplate.id !== '__custom__' && <Chip label={selectedTemplate.name} size="small" variant="outlined" sx={{ height: 22, fontSize: 10, fontWeight: 600 }} />}
                    </Stack>
                    <Chip label="← Şablonlara dön" size="small" variant="outlined" onClick={() => onEditorModeChange(false)} sx={{ height: 24, fontSize: 10, fontWeight: 600, cursor: 'pointer' }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Bölge ekleyin/silin, sıra ve koltuk sayılarını değiştirin. Tüm değerler düzenlenebilir.</Typography>
                  <CustomSeatEditor sections={customSections} onChange={onCustomSectionsChange} />
                </Box>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* ━━━ ONIZLEME MODAL ━━━ */}
      <Dialog open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {previewTemplate && (() => {
          const def = TEMPLATE_DEFS[previewTemplate.type] || { icon: '📍', description: '', defaultSections: [] };
          const totalCap = calcTemplateCapacity(def);
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography fontSize={24}>{def.icon}</Typography>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{previewTemplate.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{totalCap} koltuk · {def.defaultSections.length} bölge</Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setPreviewTemplate(null)}><CloseIcon /></IconButton>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2, mb: 2.5, border: '1px solid', borderColor: 'divider' }}>
                  <TemplateSVG type={previewTemplate.type} />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{previewTemplate.description || def.description}</Typography>

                {/* Bolge bazli kapasite breakdown — card ile ayni format */}
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                  Bölge Dağılımı
                </Typography>
                <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                  {def.defaultSections.map(sec => {
                    const secCap = sec.rows.reduce((a, r) => a + r.seats, 0);
                    const pct = totalCap > 0 ? Math.round((secCap / totalCap) * 100) : 0;
                    return (
                      <Stack key={sec.name} direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sec.color, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>{sec.name}</Typography>
                        <Typography variant="body2" fontWeight={700} fontFamily="monospace">{secCap}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ minWidth: 35, textAlign: 'right' }}>%{pct}</Typography>
                        <Typography variant="caption" color="text.disabled">{sec.rows.length} sıra</Typography>
                      </Stack>
                    );
                  })}
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ width: 10 }} />
                    <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>Toplam</Typography>
                    <Typography variant="body2" fontWeight={800} fontFamily="monospace">{totalCap}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ minWidth: 35, textAlign: 'right' }}>%100</Typography>
                    <Typography variant="caption" color="text.disabled">
                      {def.defaultSections.reduce((s, sec) => s + sec.rows.length, 0)} sıra
                    </Typography>
                  </Stack>
                </Stack>

                {/* Ozellestirme notu */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.06), border: `1px solid ${alpha('#3b82f6', 0.15)}` }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <InfoIcon sx={{ color: '#3b82f6', fontSize: 18, mt: 0.2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      Bu şablon bir başlangıç noktasıdır. Seçtikten sonra bölge sayılarını, sıra adetlerini ve koltuk sayılarını tamamen değiştirebilirsiniz.
                    </Typography>
                  </Stack>
                </Paper>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
