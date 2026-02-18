import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Slider,
  Chip,
  Button,
  ButtonGroup,
  useTheme,
  alpha
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  PanTool,
  NearMe,
  GridOn,
  GridOff,
  Undo,
  Redo,
  Delete,
  DragIndicator
} from '@mui/icons-material';
import { 
  VenueLayout, 
  SeatStatus, 
  SeatCategory,
  SeatSection,
  VenueLayoutType 
} from '../../types/tickets/ticketTypes';
import { TicketCategoryConfig } from './CategoryManager';

// --- Types ---
interface SeatingEditorProps {
  layout: VenueLayout;
  onLayoutChange: (layout: VenueLayout) => void;
  categories: TicketCategoryConfig[];
  readOnly?: boolean;
}

// --- Sub-Components ---

// 1. Stage Component
const Stage: React.FC<{ layout: VenueLayout }> = ({ layout }) => {
  const theme = useTheme();
  const { stage } = layout;
  if (!stage) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: stage.x,
        top: stage.y,
        width: stage.width,
        height: stage.height,
        backgroundColor: stage.color || theme.palette.grey[800],
        borderRadius: stage.type === 'semicircle' ? '0 0 50% 50%' : 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: theme.shadows[4],
        border: `2px solid ${alpha(theme.palette.common.white, 0.1)}`,
        zIndex: 5
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#fff', 
          fontWeight: 700, 
          letterSpacing: 4,
          textTransform: 'uppercase',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        {stage.label || 'STAGE'}
      </Typography>
    </Box>
  );
};

// 2. Individual Seat Component (Memoized for performance)
const SeatItem = React.memo(({ 
  seat, 
  rowLabel, 
  isSelected, 
  categoryConfig, 
  onSelect 
}: { 
  seat: any, 
  rowLabel: string, 
  isSelected: boolean, 
  categoryConfig?: TicketCategoryConfig, 
  onSelect: (id: string, shiftKey: boolean) => void 
}) => {
  const theme = useTheme();
  
  // Determine color based on status or category
  let bgColor = categoryConfig?.color || '#e0e0e0';
  let opacity = 1;
  let cursor = 'pointer';

  if (seat.status === SeatStatus.BLOCKED) {
    bgColor = theme.palette.grey[400];
    opacity = 0.5;
  } else if (seat.status === SeatStatus.SOLD) {
    bgColor = theme.palette.error.main;
    cursor = 'not-allowed';
  } else if (seat.status === SeatStatus.RESERVED) {
    bgColor = theme.palette.warning.main;
  }

  return (
    <Tooltip title={`${rowLabel}${seat.number} (${categoryConfig?.name || 'Standard'})`}>
      <Box
        onClick={(e) => {
            e.stopPropagation();
            onSelect(seat.id, e.shiftKey);
        }}
        sx={{
          width: 30,
          height: 30,
          margin: '3px',
          borderRadius: '6px 6px 3px 3px',
          background: `linear-gradient(135deg, ${bgColor} 0%, ${alpha(bgColor, 0.8)} 100%)`,
          opacity,
          cursor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.palette.getContrastText(bgColor),
          fontSize: '0.65rem',
          fontWeight: 800,
          border: isSelected 
            ? `2px solid ${theme.palette.primary.main}` 
            : `1px solid ${alpha(theme.palette.common.black, 0.05)}`,
          boxShadow: isSelected 
            ? `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}, inset 0 2px 4px rgba(255,255,255,0.3)`
            : '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2)',
          transform: isSelected ? 'scale(1.1) translateY(-3px)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          position: 'relative',
          '&:after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 'inherit',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 50%)',
            pointerEvents: 'none'
          },
          '&:hover': {
            transform: 'scale(1.2) translateY(-4px)',
            boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            filter: 'brightness(1.1)'
          }
        }}
      >
        {seat.status === SeatStatus.BLOCKED ? 'X' : seat.number}
      </Box>
    </Tooltip>
  );
});

// --- Main Editor Component ---
export const SeatingEditor: React.FC<SeatingEditorProps> = ({
  layout,
  onLayoutChange,
  categories,
  readOnly = false
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // -- Viewport State --
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  
  // -- Editor State --
  const [mode, setMode] = useState<'select' | 'pan' | 'drag-section'>('select');
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(true);
  
  // -- Selection Box State --
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedStage, setDraggedStage] = useState(false);
  const [sectionDragStart, setSectionDragStart] = useState({ x: 0, y: 0 });

  // -- Handlers --

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(s => Math.min(Math.max(s + delta, 0.2), 3));
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - position.x - rect.width / 2) / scale;
    const y = (e.clientY - rect.top - position.y - rect.height / 2) / scale;

    if (mode === 'pan' || (e.button === 1)) { 
      setIsDragging(true);
      setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y });
    } else if (mode === 'select') {
      setSelectionBox({ start: { x: e.clientX, y: e.clientY }, end: { x: e.clientX, y: e.clientY } });
      if (!e.shiftKey) setSelectedSeatIds(new Set());
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    } else if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, end: { x: e.clientX, y: e.clientY } } : null);
    } else if (draggedSectionId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = (e.clientX - rect.left - position.x - rect.width / 2) / scale;
      const mouseY = (e.clientY - rect.top - position.y - rect.height / 2) / scale;
      
      // Update local position for visual feedback
      // We still update the parent to keep it in sync, but we could optimize this further if needed.
      const newLayout = JSON.parse(JSON.stringify(layout));
      const section = newLayout.sections.find((s: any) => s.id === draggedSectionId);
      if (section) {
        section.offsetX = mouseX - sectionDragStart.x;
        section.offsetY = mouseY - sectionDragStart.y;
        onLayoutChange(newLayout);
      }
    } else if (draggedStage) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = (e.clientX - rect.left - position.x - rect.width / 2) / scale;
      const mouseY = (e.clientY - rect.top - position.y - rect.height / 2) / scale;

      const newLayout = { ...layout };
      if (newLayout.stage) {
        newLayout.stage = {
          ...newLayout.stage,
          x: mouseX - sectionDragStart.x,
          y: mouseY - sectionDragStart.y
        };
        onLayoutChange(newLayout);
      }
    }
  };

  const handleClearSelection = () => {
    setSelectedSeatIds(new Set());
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const boxLeft = Math.min(selectionBox.start.x, selectionBox.end.x);
        const boxRight = Math.max(selectionBox.start.x, selectionBox.end.x);
        const boxTop = Math.min(selectionBox.start.y, selectionBox.end.y);
        const boxBottom = Math.max(selectionBox.start.y, selectionBox.end.y);

        const newlySelected = new Set<string>(e.shiftKey ? selectedSeatIds : []);
        
        const seatElements = document.querySelectorAll('.seat-item');
        seatElements.forEach(el => {
          const seatRect = el.getBoundingClientRect();
          if (
            seatRect.left >= boxLeft &&
            seatRect.right <= boxRight &&
            seatRect.top >= boxTop &&
            seatRect.bottom <= boxBottom
          ) {
            newlySelected.add(el.getAttribute('data-seat-id') || '');
          }
        });
        
        setSelectedSeatIds(newlySelected);
      }
      setSelectionBox(null);
    }
    setIsDragging(false);
    setDraggedSectionId(null);
    setDraggedStage(false);
  };

  const handleSelectSeat = useCallback((seatId: string, multiSelect: boolean) => {
    if (readOnly) return;
    
    setSelectedSeatIds(prev => {
      const newSet = new Set(multiSelect ? prev : []);
      if (prev.has(seatId) && multiSelect) {
        newSet.delete(seatId);
      } else {
        newSet.add(seatId);
      }
      return newSet;
    });
  }, [readOnly]);

  const handleUpdateSelectedSeats = (updates: any) => {
    if (!layout) return;
    const newLayout = JSON.parse(JSON.stringify(layout));

    newLayout.sections.forEach((section: SeatSection) => {
        section.rows.forEach(row => {
            row.seats.forEach(seat => {
                if (selectedSeatIds.has(seat.id)) {
                    Object.assign(seat, updates);
                }
            });
        });
    });

    onLayoutChange(newLayout);
  };

  const handleZoom = (val: number) => setScale(val);

  // -- Inspector Panel --
  const renderInspector = () => {
    const selectedCount = selectedSeatIds.size;
    
    if (selectedCount === 0) {
      return (
        <Box p={3} textAlign="center" color="text.secondary">
          <Typography variant="body2">Select seats to edit properties</Typography>
        </Box>
      );
    }

    return (
      <Box p={2}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {selectedCount} Seat{selectedCount > 1 ? 's' : ''} Selected
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom>
          ASSIGN CATEGORY
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
          {categories.map(cat => (
             <Chip
                key={cat.id}
                label={cat.name}
                onClick={() => handleUpdateSelectedSeats({ category: cat.categoryType, categoryId: cat.id })} // Assuming seat stores categoryId or type
                sx={{
                   bgcolor: cat.color,
                   color: theme.palette.getContrastText(cat.color),
                   '&:hover': { opacity: 0.9 }
                }}
             />
          ))}
        </Stack>

        <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom>
          STATUS
        </Typography>
        <ButtonGroup fullWidth size="small" sx={{ mb: 3 }}>
           <Button onClick={() => handleUpdateSelectedSeats({ status: SeatStatus.AVAILABLE })}>Open</Button>
           <Button onClick={() => handleUpdateSelectedSeats({ status: SeatStatus.BLOCKED })}>Block</Button>
        </ButtonGroup>

        <Button 
            fullWidth 
            color="error" 
            variant="outlined" 
            startIcon={<Delete />}
            onClick={() => {/* Implement remove seat logic if needed */}}
        >
            Delete Selected
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '650px', border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.paper' }}>
       {/* CANVAS AREA */}
       <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', bgcolor: '#f5f5f7' }}>
          {/* Toolbar */}
          <Paper 
            elevation={2}
            sx={{ 
                position: 'absolute', 
                top: 16, 
                left: 16, 
                zIndex: 10, 
                borderRadius: 2,
                p: 0.5,
                display: 'flex',
                gap: 0.5
            }}
          >
             <Tooltip title="Select Mode">
                <IconButton 
                    color={mode === 'select' ? 'primary' : 'default'} 
                    onClick={() => setMode('select')}
                >
                    <NearMe />
                </IconButton>
             </Tooltip>
             <Tooltip title="Pan Mode (or Hold Space)">
                <IconButton 
                    color={mode === 'pan' ? 'primary' : 'default'} 
                    onClick={() => setMode('pan')}
                >
                    <PanTool />
                </IconButton>
             </Tooltip>
             <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
             <Tooltip title="Zoom In">
                <IconButton onClick={() => handleZoom(Math.min(scale + 0.2, 3))}><ZoomIn /></IconButton>
             </Tooltip>
             <Tooltip title="Zoom Out">
                <IconButton onClick={() => handleZoom(Math.max(scale - 0.2, 0.2))}><ZoomOut /></IconButton>
             </Tooltip>
             <Tooltip title="Fit to Screen">
                <IconButton onClick={() => { setScale(1); setPosition({x:0, y:0}); }}><CenterFocusStrong /></IconButton>
             </Tooltip>
             <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
             <Button 
                size="small" 
                variant="outlined" 
                color="inherit" 
                onClick={handleClearSelection}
                disabled={selectedSeatIds.size === 0}
                sx={{ ml: 1, fontSize: '0.7rem' }}
             >
                Clear Sel
             </Button>
          </Paper>

          {/* Grid Background & Canvas */}
          <Box
             ref={canvasRef}
             onWheel={handleWheel}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             sx={{
                width: '100%',
                height: '100%',
                cursor: mode === 'pan' || isDragging ? 'grab' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(showGrid && {
                   backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                   backgroundSize: '20px 20px'
                })
             }}
          >
             <Box
                sx={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    width: layout.width || 1000,
                    height: layout.height || 800,
                    position: 'relative',
                    // bgcolor: 'white',
                    // boxShadow: '0 0 40px rgba(0,0,0,0.05)'
                }}
             >
                 {/* Elements Layer */}
                 <Box
                    onMouseDown={(e) => {
                      if (mode === 'select' && e.altKey && layout.stage) {
                        e.stopPropagation();
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const mouseX = (e.clientX - rect.left - position.x - rect.width / 2) / scale;
                        const mouseY = (e.clientY - rect.top - position.y - rect.height / 2) / scale;
                        setDraggedStage(true);
                        setSectionDragStart({ x: mouseX - layout.stage.x, y: mouseY - layout.stage.y });
                      }
                    }}
                    sx={{ cursor: mode === 'select' ? 'grab' : 'inherit' }}
                 >
                    <Stage layout={layout} />
                 </Box>

                 {layout.sections.map((section: SeatSection) => (
                    <Box
                        key={section.id}
                        onMouseDown={(e) => {
                          if (mode === 'select' && e.altKey) { // Alt + drag to move section
                            e.stopPropagation();
                            const rect = canvasRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            const mouseX = (e.clientX - rect.left - position.x - rect.width / 2) / scale;
                            const mouseY = (e.clientY - rect.top - position.y - rect.height / 2) / scale;
                            setDraggedSectionId(section.id);
                            setSectionDragStart({ x: mouseX - section.offsetX, y: mouseY - section.offsetY });
                          }
                        }}
                        sx={{
                            position: 'absolute',
                            left: section.offsetX,
                            top: section.offsetY,
                            transform: `rotate(${section.rotation || 0}deg)`,
                            p: 2,
                            cursor: mode === 'select' ? 'default' : 'inherit',
                            '&:hover': mode === 'select' ? {
                              bgcolor: 'rgba(0,0,0,0.02)',
                              borderRadius: 2,
                              outline: '1px dashed #ccc'
                            } : {}
                        }}
                    >
                        <Stack spacing={0.5}>
                            {section.rows.map(row => (
                                <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" sx={{ width: 24, textAlign: 'center', fontWeight: 'bold', color: 'text.secondary', opacity: 0.6 }}>
                                        {row.label}
                                    </Typography>
                                    <Box sx={{ display: 'flex' }}>
                                        {row.seats.map(seat => {
                                            const catConfig = categories.find(c => c.categoryType === seat.category) || categories[0];
                                            return (
                                              <Box key={seat.id} className="seat-item" data-seat-id={seat.id}>
                                                <SeatItem
                                                    seat={seat}
                                                    rowLabel={row.label}
                                                    isSelected={selectedSeatIds.has(seat.id)}
                                                    categoryConfig={catConfig}
                                                    onSelect={handleSelectSeat}
                                                />
                                              </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                 ))}

                 {/* Marquee Selection Box Overlay */}
                 {selectionBox && (
                    <Box
                      sx={{
                        position: 'fixed',
                        left: Math.min(selectionBox.start.x, selectionBox.end.x),
                        top: Math.min(selectionBox.start.y, selectionBox.end.y),
                        width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                        height: Math.abs(selectionBox.end.y - selectionBox.start.y),
                        border: `1px solid ${theme.palette.primary.main}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        zIndex: 9999,
                        pointerEvents: 'none'
                      }}
                    />
                 )}
             </Box>
          </Box>
       </Box>

       {/* INSPECTOR PANEL */}
       <Paper 
         sx={{ 
            width: 280, 
            borderLeft: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20
         }}
       >
          <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`} bgcolor={alpha(theme.palette.primary.main, 0.05)}>
             <Typography variant="overline" fontWeight={700} color="primary">Inspector</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {renderInspector()}
          </Box>
       </Paper>
    </Box>
  );
};
