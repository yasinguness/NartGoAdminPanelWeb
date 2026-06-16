import React, { useState, useEffect } from 'react';
import { venueInventoryService } from '../../services/venue/venueInventory.service';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  Divider,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Drawer,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Sensors as TechIcon,
  Stars as VipIcon,
  EventSeat as SeatIcon,
  Lock as LockIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowRight as CollapseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

const COLORS = {
  sellable: '#10b981', // green
  vip: '#8b5cf6', // purple
  blackout: '#ef4444', // red
  hold: '#f59e0b', // amber
  neutral: '#64748b' // grey
};

type InventoryAllocation = {
  sellable: number;
  vip: number;
  hold: number;
  blackout: number;
};

type InventoryChild = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  allocation: InventoryAllocation;
};

type InventoryBlock = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  allocation: InventoryAllocation;
  expanded?: boolean;
  children: InventoryChild[];
};

type InventoryRow = InventoryBlock | (InventoryChild & { parentId: string });

function isInventoryBlock(row: InventoryRow): row is InventoryBlock {
  return !('parentId' in row);
}

export default function VenueInventoryManager() {
  const [data, setData] = useState<InventoryBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const inv = await venueInventoryService.getVenueTopology('v-zpsm');
        setData(inv || []);
      } catch (err) {
        // silently handled
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleRowClick = (entity: any) => {
    setSelectedEntity(entity);
    setDrawerOpen(true);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setData(prev => prev.map(block => block.id === id ? { ...block, expanded: !block.expanded } : block));
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getBarColor = (type: string) => COLORS[type as keyof typeof COLORS] || COLORS.neutral;

  const renderAllocationBar = (alloc: any, total: number) => {
    return (
      <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: 140 }}>
        {['sellable', 'vip', 'hold', 'blackout'].map((k) => {
          const val = alloc[k];
          if (!val) return null;
          const pct = (val / total) * 100;
          return <Box key={k} sx={{ width: `${pct}%`, bgcolor: getBarColor(k) }} />;
        })}
      </Box>
    );
  };

  const rowsToRender: InventoryRow[] = [];
  data.forEach((block: InventoryBlock) => {
    if (block.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        rowsToRender.push(block);
        if (block.expanded) {
          block.children.forEach((child: InventoryChild) => rowsToRender.push({ ...child, parentId: block.id }));
        }
    } else {
        // If parent doesn't match, maybe child matches
        const matchingChildren = block.children.filter((child: InventoryChild) => child.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (matchingChildren.length > 0) {
            rowsToRender.push({ ...block, expanded: true }); // auto expand to show matching
            matchingChildren.forEach((child: InventoryChild) => rowsToRender.push({ ...child, parentId: block.id }));
        }
    }
  });

  if (loading && data.length === 0) {
      return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#f8fafc' }}>
              <Typography variant="h6" color="text.secondary">Envanter Verileri Yükleniyor...</Typography>
          </Box>
      );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#f8fafc' }}>
      
      {/* 1. Yoğun veri odaklı üst bar */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={800} sx={{ mr: 4 }}>Mekan Envanteri</Typography>
        
        <TextField select size="small" label="Mekan" value="v-zpsm" sx={{ minWidth: 200 }}>
           <MenuItem value="v-zpsm">Zorlu PSM (Ana Sahne)</MenuItem>
           <MenuItem value="v-vw">Volkswagen Arena</MenuItem>
        </TextField>
        
        <TextField select size="small" label="Kontrol Modu" value="EVENT" sx={{ minWidth: 150 }}>
           <MenuItem value="VENUE">Master (Kalıcı)</MenuItem>
           <MenuItem value="EVENT">Etkinlik Özel Dağıtım</MenuItem>
        </TextField>

        <Box sx={{ flexGrow: 1 }} />
        
        <Button variant="contained" disableElevation color="primary" size="small" sx={{ fontWeight: 600 }}>
          Değişiklikleri Yayınla
        </Button>
      </Box>

      {/* 2. Sticky KPI Bandı (Inventory Context) */}
      <Box sx={{ p: 2, bgcolor: '#1e293b', color: 'white', position: 'sticky', top: 64, zIndex: 10, display: 'flex', justifyContent: 'space-between', gap: 2, overflowX: 'auto', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <KpiItem label="Toplam Kapasite" value="2.000" subValue="Maksimum İzin" color={COLORS.neutral} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
        <KpiItem label="Satışa Açık" value="1.600" subValue="Mekanın %80'i" color={COLORS.sellable} icon={<SeatIcon fontSize="small"/>} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
        <KpiItem label="Sponsor/VIP Kontenjan" value="150" subValue="Garantili Bloklar" color={COLORS.vip} icon={<VipIcon fontSize="small"/>} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
        <KpiItem label="Etkinlik Bekletmeleri" value="200" subValue="Serbest Bırakılmayı Bekliyor" color={COLORS.hold} icon={<LockIcon fontSize="small"/>} />
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />
        <KpiItem label="Teknik Kapatmalar" value="50" subValue="Kamera/Mikser Masası" color={COLORS.blackout} icon={<TechIcon fontSize="small"/>}/>
      </Box>

      {/* 3. Split-view çalışma (Left: Tree Grid, Right: Drawer) */}
      <Box sx={{ display: 'flex', flex: 1, p: 3, gap: 3, overflow: 'hidden' }}>
        
        {/* Powerful Table/Tree Experience */}
        <Paper elevation={0} sx={{ flex: 1, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: 'white' }}>
          
          <Box sx={{ p: 2, bgcolor: selectedIds.length > 0 ? '#f5f3ff' : 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
            {selectedIds.length > 0 ? (
              <>
                <Typography variant="subtitle1" fontWeight={700} color="#7c3aed">{selectedIds.length} Birim Seçili</Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small" disableElevation sx={{ bgcolor: COLORS.vip }}>Toplu VIP Kontenjan</Button>
                  <Button variant="contained" size="small" disableElevation sx={{ bgcolor: COLORS.blackout }}>Satışa Kapat</Button>
                  <Button variant="outlined" size="small" sx={{ borderColor: '#cbd5e1', color: 'text.primary' }}>Kilit Kaldır</Button>
                </Stack>
              </>
            ) : (
              <>
                <Typography variant="h6" fontWeight={700}>Mekan Ağacı</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField 
                    size="small" 
                    placeholder="Blok veya Sıra Ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ bgcolor: '#f8fafc', width: 250, '& fieldset': { border: 'none' } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  />
                  <IconButton size="small"><FilterIcon /></IconButton>
                </Stack>
              </>
            )}
          </Box>
          
          <TableContainer sx={{ flex: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ bgcolor: '#f8fafc' }}></TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Birim (Blok / Sıra)</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, align: 'center' }}>Toplam</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Dağılım Haritası</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700 }}>Satılabilir</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, color: COLORS.vip }}>VIP/Sponsor</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, color: COLORS.hold }}>Bekletme</TableCell>
                  <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 700, color: COLORS.blackout }}>Kapalı</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsToRender.map(row => {
                  const isSelected = selectedIds.includes(row.id);
                  const isBlock = isInventoryBlock(row);
                  
                  return (
                    <TableRow 
                      key={row.id} 
                      hover
                      selected={isSelected}
                      onClick={() => handleRowClick(row)}
                      sx={{ 
                        cursor: 'pointer', 
                        bgcolor: isSelected ? '#f5f3ff !important' : (isBlock ? '#ffffff' : '#f8fafc'), 
                        '& td': { borderColor: '#f1f5f9', py: isBlock ? 1.5 : 1 } 
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ pl: isBlock ? 2 : 5 }}>
                         <Checkbox checked={isSelected} onClick={(e) => toggleSelect(row.id, e)} size="small" />
                      </TableCell>
                      <TableCell sx={{ fontWeight: isBlock ? 700 : 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                         {isBlock && (
                           <IconButton size="small" onClick={(e) => toggleExpand(row.id, e)} sx={{ p: 0.5 }}>
                             {row.expanded ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
                           </IconButton>
                         )}
                         <Typography variant={isBlock ? "subtitle2" : "body2"} fontWeight={isBlock ? 700 : 500}>
                           {row.name}
                         </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>{row.capacity}</TableCell>
                      <TableCell>
                         {renderAllocationBar(row.allocation, row.capacity)}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.sellable }}>
                         {row.allocation.sellable > 0 ? row.allocation.sellable : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.vip }}>
                         {row.allocation.vip > 0 ? row.allocation.vip : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.hold }}>
                         {row.allocation.hold > 0 ? row.allocation.hold : '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: COLORS.blackout }}>
                         {row.allocation.blackout > 0 ? row.allocation.blackout : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        
        {/* RIGHT DRAWER: Structural Mutation Actions */}
        <Drawer
          anchor="right"
          variant="persistent"
          open={isDrawerOpen}
          sx={{ '& .MuiDrawer-paper': { width: 400, position: 'relative', borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 20px rgba(0,0,0,0.02)' } }}
        >
          {selectedEntity ? (
            <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                 <Box>
                    <Typography variant="h5" fontWeight={800}>{selectedEntity.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>{selectedEntity.id}</Typography>
                 </Box>
                 <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ bgcolor: '#f1f5f9' }}>
                    <CloseIcon fontSize="small" />
                 </IconButton>
              </Box>
              
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1', mb: 4, textAlign: 'center' }}>
                 <Typography variant="h3" fontWeight={800} color="#334155">{selectedEntity.capacity}</Typography>
                 <Typography variant="caption" color="text.secondary" fontWeight={600}>TOPLAM KOLTUK</Typography>
              </Box>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Kontenjan Ataması</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lh: 1.5 }}>
                 Bu birim içerisindeki müsait blok/koltukları belirli bir amaca tahsis edin veya teknik kısıtlar (kamera vs.) sebebiyle satıştan kaldırın.
              </Typography>

              <Stack spacing={3}>
                 <TextField select fullWidth size="small" label="Atama Tipi" defaultValue="VIP">
                    <MenuItem value="SELLABLE">Satışa Açık</MenuItem>
                    <MenuItem value="VIP">Sponsor / VIP Kontenjan</MenuItem>
                    <MenuItem value="HOLD">Geçici Bekletme (Etkinlik Rezerve)</MenuItem>
                    <MenuItem value="BLACKOUT">Satışa Kapalı (Teknik Kısıt)</MenuItem>
                 </TextField>

                 <TextField fullWidth size="small" label="Adet / Koltuk Sayısı" type="number" defaultValue={selectedEntity.capacity} />
                 
                 <TextField fullWidth size="small" label="Açıklama (Kurumsal, İsim, Neden)" placeholder="Örn: Garanti BBVA VIP Allotment" />
              </Stack>

              {/* Warnings */}
              <Box sx={{ mt: 3, p: 2, bgcolor: '#fffbeb', borderRadius: 2, display: 'flex', gap: 1.5 }}>
                 <WarningIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                 <Typography variant="caption" color="#b45309" fontWeight={500}>
                    Eğer bu birimde halihazırda satılmış (PAID) biletler varsa, onların durumu değiştirilemez. Sadece müsait koltuklar bu atamadan etkilenir.
                 </Typography>
              </Box>

              {/* Action Bar Bottom */}
              <Box sx={{ mt: 'auto', display: 'flex', gap: 2, pt: 3, borderTop: '1px solid #f1f5f9' }}>
                 <Button variant="contained" fullWidth disableElevation sx={{ bgcolor: '#7c3aed', py: 1.5, fontWeight: 700 }}>
                   KONTENJANI GÜNCELLE
                 </Button>
              </Box>
            </Box>
          ) : null}
        </Drawer>
      </Box>
    </Box>
  );

  function KpiItem({ label, value, subValue, color, icon }: { label: string, value: string, subValue: string, color: string, icon?: React.ReactNode }) {
    return (
      <Box sx={{ minWidth: 160, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
           {icon && <Box sx={{ color, display: 'flex' }}>{icon}</Box>}
           <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Typography>
        </Box>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>{subValue}</Typography>
      </Box>
    );
  }
}
