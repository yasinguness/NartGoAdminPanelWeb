import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  Button,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  Snackbar,
  InputAdornment,
  Fade,
  CircularProgress,
  Avatar,
  Badge,
  styled,
  alpha,
  useTheme
} from '@mui/material';
import {
  EventSeat as SeatIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  GridOn as GridIcon,
  ColorLens as ColorIcon,
  AttachMoney as PriceIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  Stadium as StadiumIcon,
  TheaterComedy as TheaterIcon,
  MusicNote as ConcertIcon,
  School as ClassroomIcon,
  People as PeopleIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  VisibilityOff as VisibilityOffIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { 
  LayoutStyle, 
  SeatCategory, 
  SeatStatus,
  TicketCreationState,
  VenueLayoutType,
  SeatSection,
} from '../../types/tickets/ticketTypes';
import { ticketService } from '../../services/ticket/ticketService';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { tr } from 'date-fns/locale'; // Removing Turkish locale for standardization to English

import { PageContainer, PageHeader } from '../../components/Page';
import { CategoryManager, TicketCategoryConfig } from '../../components/Tickets/CategoryManager';
import { SeatingEditor } from '../../components/Tickets/SeatingCanvas';

// Styled Components
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.3s ease',
  ...(ownerState.active && {
    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    boxShadow: '0 4px 20px 0 rgba(0,0,0,0.25)',
    transform: 'scale(1.1)',
  }),
  ...(ownerState.completed && {
    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
  }),
}));

function ColorlibStepIcon(props: { active?: boolean; completed?: boolean; icon: React.ReactNode; className?: string }) {
  const { active, completed, className, icon } = props;
  const theme = useTheme();

  const icons: { [index: string]: React.ReactElement } = {
    1: <CategoryIcon />,
    2: <StadiumIcon />,
    3: <PriceIcon />,
    4: <ScheduleIcon />,
    5: <PreviewIcon />,
  };

  return (
    <ColorlibStepIconRoot theme={theme} ownerState={{ completed, active }} className={className}>
      {completed ? <CheckIcon /> : icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

const GlassCard = styled(Card)(({ theme }) => ({
  background: theme.palette.background.paper, // Removed explicit glass effect for consistency with standardization
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const SeatButton = styled(Box)<{ 
  status: SeatStatus; 
  category: SeatCategory; 
  selected?: boolean;
  categoryColor?: string;
}>(({ status, selected, categoryColor }) => {
  const getStatusColor = () => {
    switch (status) {
      case SeatStatus.AVAILABLE:
        return categoryColor || '#4CAF50';
      case SeatStatus.RESERVED:
        return '#FFA000';
      case SeatStatus.SOLD:
        return '#E74C3C';
      case SeatStatus.BLOCKED:
        return '#9E9E9E';
      case SeatStatus.OCCUPIED:
        return '#424242';
      default:
        return '#4CAF50';
    }
  };

  return {
    width: 28,
    height: 28,
    borderRadius: '6px 6px 3px 3px',
    backgroundColor: getStatusColor(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: status === SeatStatus.AVAILABLE || status === SeatStatus.BLOCKED ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    border: selected ? '3px solid #1976d2' : '1px solid rgba(0,0,0,0.1)',
    boxShadow: selected ? '0 0 10px rgba(25, 118, 210, 0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      transform: 'scale(1.15)',
      zIndex: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#fff',
  };
});

const steps = [
  'Ticket Details',
  'Categories & Pricing',
  'Venue Layout',
  'Sales Schedule',
  'Preview & Save',
];

const categoryColors: Record<SeatCategory, string> = {
  [SeatCategory.VIP]: '#FFD700',
  [SeatCategory.PREMIUM]: '#C0C0C0',
  [SeatCategory.STANDARD]: '#4CAF50',
  [SeatCategory.ECONOMY]: '#87CEEB',
  [SeatCategory.WHEELCHAIR]: '#9C27B0',
};

const categoryNames: Record<SeatCategory, string> = {
  [SeatCategory.VIP]: 'VIP',
  [SeatCategory.PREMIUM]: 'Premium',
  [SeatCategory.STANDARD]: 'Standard',
  [SeatCategory.ECONOMY]: 'Economy',
  [SeatCategory.WHEELCHAIR]: 'Wheelchair',
};

interface TicketCreationPageProps {
  eventId?: string;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const TicketCreationPage: React.FC<TicketCreationPageProps> = ({ 
  eventId = '', 
  onSave, 
  onCancel 
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Form State
  const [ticketState, setTicketState] = useState<TicketCreationState>({
    step: 0,
    eventId: eventId,
    ticketName: '',
    description: '',
    layoutStyle: LayoutStyle.STRAIGHT,
    seatMap: null,
    pricingZones: [],
    salesPeriods: [],
    saleStartAt: null,
    saleEndAt: null,
    currency: 'TRY',
  });

  // Venue Editor State
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [editMode, setEditMode] = useState<'select' | 'block' | 'category'>('select');
  const [selectedCategory, setSelectedCategory] = useState<SeatCategory>(SeatCategory.STANDARD);

  // Templates
  const templates = ticketService.getVenueTemplates();

  // Initialize layout from template
  useEffect(() => {
    const template = templates.find(t => t.style === ticketState.layoutStyle);
    if (template && !ticketState.seatMap) {
      setTicketState(prev => ({
        ...prev,
        seatMap: JSON.parse(JSON.stringify(template.seatMap)),
        pricingZones: template.seatMap.categories.map(category => ({
          id: category.categoryId,
          name: category.categoryName,
          category: SeatCategory.STANDARD, // Default
          basePrice: category.basePrice,
          color: categoryColors[SeatCategory.STANDARD],
          seatCount: category.rows.reduce((acc: number, row) => acc + row.availableSeats.length + row.occupiedSeats.length, 0),
        })),
      }));
    }
  }, [ticketState.layoutStyle]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSave();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const request = {
        eventId: ticketState.eventId,
        name: ticketState.ticketName,
        description: ticketState.description,
        basePrice: ticketState.pricingZones.reduce((min, zone) => 
          zone.basePrice < min ? zone.basePrice : min, 
          ticketState.pricingZones[0]?.basePrice || 0
        ),
        currency: ticketState.currency,
        capacityTotal: ticketState.venueLayout?.totalCapacity || 0,
        saleStartAt: ticketState.saleStartAt?.toISOString() || new Date().toISOString(),
        saleEndAt: ticketState.saleEndAt?.toISOString() || new Date().toISOString(),
        venueLayout: ticketState.venueLayout || undefined,
      };

      await ticketService.createTicketType(request);
      setSnackbar({ open: true, message: 'Ticket created successfully!', severity: 'success' });
      onSave?.(request);
    } catch (error) {
      setSnackbar({ open: true, message: 'Error creating ticket!', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = useCallback((seatId: string, section: SeatSection) => {
    if (editMode === 'select') {
      setSelectedSeats(prev => 
        prev.includes(seatId) 
          ? prev.filter(id => id !== seatId)
          : [...prev, seatId]
      );
    } else if (editMode === 'block' && ticketState.venueLayout) {
      const updatedLayout = { ...ticketState.venueLayout };
      updatedLayout.sections = updatedLayout.sections.map(sec => {
        if (sec.id === section.id) {
          return {
            ...sec,
            rows: sec.rows.map(row => ({
              ...row,
              seats: row.seats.map(seat => 
                seat.id === seatId
                  ? { ...seat, status: seat.status === SeatStatus.BLOCKED ? SeatStatus.AVAILABLE : SeatStatus.BLOCKED }
                  : seat
              ),
            })),
          };
        }
        return sec;
      });
      setTicketState(prev => ({ ...prev, venueLayout: updatedLayout }));
    } else if (editMode === 'category' && ticketState.venueLayout) {
      const updatedLayout = { ...ticketState.venueLayout };
      updatedLayout.sections = updatedLayout.sections.map(sec => {
        if (sec.id === section.id) {
          return {
            ...sec,
            rows: sec.rows.map(row => ({
              ...row,
              seats: row.seats.map(seat => 
                seat.id === seatId
                  ? { ...seat, category: selectedCategory }
                  : seat
              ),
            })),
          };
        }
        return sec;
      });
      setTicketState(prev => ({ ...prev, venueLayout: updatedLayout }));
    }
  }, [editMode, ticketState.venueLayout, selectedCategory]);

  const updateSectionPrice = (sectionId: string, price: number) => {
    setTicketState(prev => ({
      ...prev,
      pricingZones: prev.pricingZones.map(zone =>
        zone.id === sectionId ? { ...zone, basePrice: price } : zone
      ),
    }));

    if (ticketState.venueLayout) {
      const updatedLayout = { ...ticketState.venueLayout };
      updatedLayout.sections = updatedLayout.sections.map(section =>
        section.id === sectionId ? { ...section, basePrice: price } : section
      );
      setTicketState(prev => ({ ...prev, venueLayout: updatedLayout }));
    }
  };

  const getLayoutIcon = (type: VenueLayoutType) => {
    switch (type) {
      case VenueLayoutType.THEATER:
        return <TheaterIcon sx={{ fontSize: 48 }} />;
      case VenueLayoutType.CONCERT:
        return <ConcertIcon sx={{ fontSize: 48 }} />;
      case VenueLayoutType.STADIUM:
        return <StadiumIcon sx={{ fontSize: 48 }} />;
      case VenueLayoutType.CLASSROOM:
        return <ClassroomIcon sx={{ fontSize: 48 }} />;
      case VenueLayoutType.GENERAL_ADMISSION:
        return <PeopleIcon sx={{ fontSize: 48 }} />;
      default:
        return <StadiumIcon sx={{ fontSize: 48 }} />;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const generatedRows: any[] = [];
        const detectedCategories = new Set<SeatCategory>();
        
        // Process rows
        (jsonData as any[]).forEach((row, index) => {
             if (!row || row.length < 2) return;
             // Skip header
             if (index === 0 && (String(row[0]).toLowerCase().includes('row') || String(row[0]).toLowerCase().includes('sıra'))) return;

             const label = String(row[0] || '').trim();
             const count = parseInt(row[1]);
             
             if (!label || isNaN(count)) return;
             
             const categoryStr = String(row[2] || '').toLowerCase();
             
             // Smart Category Mapping
             let category = SeatCategory.STANDARD;
             if (categoryStr.includes('vip') || categoryStr.includes('gold')) category = SeatCategory.VIP;
             else if (categoryStr.includes('premium') || categoryStr.includes('silver')) category = SeatCategory.PREMIUM;
             else if (categoryStr.includes('economy') || categoryStr.includes('student')) category = SeatCategory.ECONOMY;
             else if (categoryStr.includes('wheel') || categoryStr.includes('disabled')) category = SeatCategory.WHEELCHAIR;
             
             detectedCategories.add(category);

             // Create seats
             const seats = [];
             for(let i=1; i<=count; i++) {
                 seats.push({
                     id: `${label}-${i}-${Date.now()}`,
                     number: String(i),
                     status: SeatStatus.AVAILABLE,
                     category: category,
                     type: 'standard', 
                     price: 0 
                 });
             }
             
             generatedRows.push({
                 id: `row-${label}-${Date.now()}`,
                 label: label,
                 seats: seats
             });
        });

        if (generatedRows.length > 0) {
            // Generate Pricing Zones based on detected categories
            const newPricingZones = Array.from(detectedCategories).map((cat, index) => ({
                id: `zone-${cat}-${Date.now()}`,
                name: categoryNames[cat] || 'Standard',
                category: cat,
                basePrice: 0,
                color: categoryColors[cat],
                seatCount: generatedRows.reduce((acc, row) => 
                    acc + row.seats.filter((s: any) => s.category === cat).length, 0
                ),
            }));

            // Create a default section containing all imported rows
            const startSection: SeatSection = {
                id: `section-${Date.now()}`,
                name: 'Main Hall',
                category: SeatCategory.STANDARD, // Default fallback
                basePrice: 0, 
                rows: generatedRows,
                offsetX: 50,
                offsetY: 50,
                rotation: 0,
                color: '#2196F3'
            };
            
            // Calculate layout dimensions
            const maxSeatsInRow = Math.max(...generatedRows.map(r => r.seats.length));
            const layoutWidth = Math.max(800, maxSeatsInRow * 40 + 200);
            const layoutHeight = Math.max(600, generatedRows.length * 50 + 200);

            const newLayout = {
                ...ticketState.venueLayout, 
                id: ticketState.venueLayout?.id || 'imported-layout',
                name: 'Imported Layout',
                type: VenueLayoutType.THEATER,
                width: layoutWidth,
                height: layoutHeight,
                sections: [startSection],
                totalCapacity: generatedRows.reduce((acc, r) => acc + r.seats.length, 0),
                stage: ticketState.venueLayout?.stage || { x: layoutWidth/2 - 100, y: 0, width: 200, height: 60, label: 'STAGE', type: 'rectangle' as const }
            };
            
            setTicketState(prev => ({
                ...prev,
                venueLayout: newLayout as any,
                venueLayoutType: VenueLayoutType.THEATER,
                pricingZones: newPricingZones // Replace existing zones with new ones from import
            }));
             setSnackbar({ open: true, message: `Successfully imported ${generatedRows.length} rows with ${detectedCategories.size} categories!`, severity: 'success' });
        } else {
             setSnackbar({ open: true, message: 'No valid rows found. Format: Label | Count | Category', severity: 'warning' });
        }
        
      } catch (error) {
        console.error('Error importing excel:', error);
        setSnackbar({ open: true, message: 'Failed to import Excel file', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderTicketInfoStep = () => (
    <Fade in timeout={500}>
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Ticket Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ticket Name"
              placeholder="e.g. VIP Seating, Standing, Premium"
              value={ticketState.ticketName}
              onChange={(e) => setTicketState(prev => ({ ...prev, ticketName: e.target.value }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryIcon color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={ticketState.currency}
                label="Currency"
                onChange={(e) => setTicketState(prev => ({ ...prev, currency: e.target.value }))}
              >
                <MenuItem value="TRY">₺ Turkish Lira</MenuItem>
                <MenuItem value="USD">$ US Dollar</MenuItem>
                <MenuItem value="EUR">€ Euro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              placeholder="Enter detailed information about the ticket..."
              value={ticketState.description}
              onChange={(e) => setTicketState(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Select Venue Layout
        </Typography>
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <GlassCard
                sx={{
                  cursor: 'pointer',
                  border: ticketState.venueLayoutType === template.type 
                    ? `3px solid ${theme.palette.primary.main}` 
                    : '1px solid transparent',
                  position: 'relative',
                  overflow: 'visible',
                }}
                onClick={() => {
                  setTicketState(prev => ({
                    ...prev,
                    venueLayoutType: template.type,
                    venueLayout: JSON.parse(JSON.stringify(template.layout)),
                    pricingZones: template.layout.sections.map(section => ({
                      id: section.id,
                      name: section.name,
                      category: section.category,
                      basePrice: section.basePrice,
                      color: section.color,
                      seatCount: section.rows.reduce((acc, row) => acc + row.seats.length, 0),
                    })),
                  }));
                }}
              >
                {ticketState.venueLayoutType === template.type && (
                  <Badge
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                    }}
                    badgeContent={<CheckIcon sx={{ color: '#fff', fontSize: 16 }} />}
                    color="primary"
                  />
                )}
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ 
                    color: ticketState.venueLayoutType === template.type ? 'primary.main' : 'text.secondary',
                    mb: 2,
                  }}>
                    {getLayoutIcon(template.type)}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>
                  <Chip 
                    icon={<PeopleIcon />}
                    label={`${template.capacity} Capacity`}
                    size="small"
                    color={ticketState.venueLayoutType === template.type ? 'primary' : 'default'}
                  />
                </CardContent>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Fade>
  );

  const renderCategoriesStep = () => (
    <Fade in timeout={500}>
       <Box>
            <CategoryManager
                categories={ticketState.pricingZones.map(z => ({
                    id: z.id,
                    name: z.name,
                    categoryType: z.category,
                    basePrice: z.basePrice,
                    color: z.color,
                    quota: z.seatCount
                }))}
                onChange={(newCategories) => {
                    setTicketState(prev => ({
                        ...prev,
                        pricingZones: newCategories.map(c => ({
                            id: c.id,
                            name: c.name,
                            category: c.categoryType,
                            basePrice: c.basePrice,
                            color: c.color,
                            seatCount: c.quota || 0
                        }))
                    }));
                }}
            />
       </Box>
    </Fade>
  );

  const renderVenueLayoutStep = () => (
    <Fade in timeout={500}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Seating Layout Editor
          </Typography>
          <Box>
            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: 'none' }}
              id="excel-upload-input"
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-upload-input">
              <Button 
                component="span" 
                startIcon={<UploadIcon />} 
                variant="outlined"
                color="primary"
              >
                Import from Excel
              </Button>
            </label>
          </Box>
        </Box>

        {ticketState.venueLayout ? (
           <SeatingEditor
              layout={ticketState.venueLayout}
              onLayoutChange={(newLayout) => setTicketState(prev => ({ ...prev, venueLayout: newLayout }))}
              categories={ticketState.pricingZones.map(z => ({
                    id: z.id,
                    name: z.name,
                    categoryType: z.category,
                    basePrice: z.basePrice,
                    color: z.color,
                    quota: z.seatCount
                }))}
           />
        ) : (
            <Alert severity="warning">
                No layout initialized. Please select a template in the first step or import an Excel file.
            </Alert>
        )}
      </Box>
    </Fade>
  );

  const renderScheduleStep = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Fade in timeout={500}>
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Sales Schedule
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <GlassCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ backgroundColor: 'primary.main' }}>
                      <ScheduleIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Sales Start
                    </Typography>
                  </Box>
                  <DateTimePicker
                    label="Start Date & Time"
                    value={ticketState.saleStartAt}
                    onChange={(date) => setTicketState(prev => ({ ...prev, saleStartAt: date }))}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        helperText: 'When ticket sales should begin'
                      } 
                    }}
                  />
                </CardContent>
              </GlassCard>
            </Grid>

            <Grid item xs={12} md={6}>
              <GlassCard>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar sx={{ backgroundColor: 'error.main' }}>
                      <ScheduleIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Sales End
                    </Typography>
                  </Box>
                  <DateTimePicker
                    label="End Date & Time"
                    value={ticketState.saleEndAt}
                    onChange={(date) => setTicketState(prev => ({ ...prev, saleEndAt: date }))}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        helperText: 'When ticket sales should end'
                      } 
                    }}
                  />
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Tip:</strong> It is recommended to end sales before the event starts. You can keep it open for last-minute sales.
            </Typography>
          </Alert>
        </Box>
      </Fade>
    </LocalizationProvider>
  );

  const renderPreviewStep = () => (
    <Fade in timeout={500}>
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Preview & Confirm
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <GlassCard>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Ticket Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Name:</Typography>
                    <Typography fontWeight={600}>{ticketState.ticketName || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Venue Type:</Typography>
                    <Typography fontWeight={600}>
                      {templates.find(t => t.type === ticketState.venueLayoutType)?.name || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Currency:</Typography>
                    <Typography fontWeight={600}>{ticketState.currency}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <GlassCard>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Capacity
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Total Seats:</Typography>
                    <Typography fontWeight={600}>
                      {ticketState.venueLayout?.totalCapacity || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Zones:</Typography>
                    <Typography fontWeight={600}>
                      {ticketState.pricingZones.length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>

          <Grid item xs={12}>
            <GlassCard>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Pricing Summary
                </Typography>
                <Grid container spacing={2}>
                  {ticketState.pricingZones.map((zone) => (
                    <Grid item xs={6} sm={4} md={3} key={zone.id}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          backgroundColor: alpha(zone.color, 0.1),
                          border: `2px solid ${zone.color}`,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {zone.name}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {zone.basePrice} {ticketState.currency}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {zone.seatCount} seats
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          <Grid item xs={12}>
            <GlassCard>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Sales Schedule
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ backgroundColor: 'success.main', width: 32, height: 32 }}>
                        <ScheduleIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Start</Typography>
                        <Typography fontWeight={600}>
                          {ticketState.saleStartAt 
                            ? ticketState.saleStartAt.toLocaleString('en-US')
                            : 'Not set'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ backgroundColor: 'error.main', width: 32, height: 32 }}>
                        <ScheduleIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" color="text.secondary">End</Typography>
                        <Typography fontWeight={600}>
                          {ticketState.saleEndAt 
                            ? ticketState.saleEndAt.toLocaleString('en-US')
                            : 'Not set'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>
          </Grid>

          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 4, 
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                color: '#fff',
                borderRadius: 4,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Estimated Max Revenue
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {ticketState.pricingZones.reduce((acc, z) => acc + (z.basePrice * z.seatCount), 0).toLocaleString('en-US')} {ticketState.currency}
                  </Typography>
                </Box>
                <Avatar sx={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <PriceIcon sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Fade>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderTicketInfoStep();
      case 1:
        return renderCategoriesStep();
      case 2:
        return renderVenueLayoutStep();
      case 3:
        return renderScheduleStep();
      case 4:
        return renderPreviewStep();
      default:
        return null;
    }
  };

  return (
    <PageContainer>
        <PageHeader 
          title="Ticket Creator"
          subtitle="Professional seating layout and ticket management"
          breadcrumbs={[
            { label: 'Events', href: '/events' },
            { label: 'Ticket Creator', active: true }
          ]}
        />
      
      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 4 }}>
        <Stepper activeStep={activeStep} connector={<ColorlibConnector />} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel StepIconComponent={(props) => (
                <ColorlibStepIcon {...props} icon={index + 1} />
              )}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: activeStep === index ? 700 : 400,
                    color: activeStep === index ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Content */}
      <Paper sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 4, minHeight: 400 }}>
        {renderStepContent(activeStep)}
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel || handleBack}
          disabled={activeStep === 0 && !onCancel}
          startIcon={<ArrowBackIcon />}
          sx={{ minWidth: 140 }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading}
          endIcon={activeStep === steps.length - 1 ? <SaveIcon /> : <ArrowForwardIcon />}
          sx={{ 
            minWidth: 140,
            // background: 'linear-gradient(135deg, #16461C 0%, #4C8B53 100%)', // Removed hardcoded green
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : activeStep === steps.length - 1 ? (
            'Save'
          ) : (
            'Next'
          )}
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default TicketCreationPage;
