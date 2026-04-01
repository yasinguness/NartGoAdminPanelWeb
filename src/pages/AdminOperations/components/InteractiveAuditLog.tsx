import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  Chip,
  TextField,
  Divider,
  MenuItem,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Menu,
  LinearProgress,
  Skeleton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { adminOperationsService } from '../../../services/admin/adminOperationsService';
import {
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  Autorenew as BackfillIcon,
  Timeline as TimelineIcon,
  FactCheck as StaffIcon,
  QrCodeScanner as CheckInIcon,
  AdminPanelSettings as AdminIcon,
  MoreVert as MoreVertIcon,
  BarChart as ChartIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';

export interface InteractiveAuditLogProps {
  eventId: string;
  eventName: string;
  onFetchAdminAudit?: (filters: any) => Promise<void>;
  onBackfillAdminAudit?: () => Promise<void>;
  onFetchCheckInAudit?: () => Promise<void>;
  onFetchMyHistory?: () => Promise<void>;
  onFetchStaffStats?: () => Promise<void>;
  onFetchRecentCheckIns?: () => Promise<void>;
  onFetchHourlyCounts?: () => Promise<void>;
  onFetchTicketAudit?: (ticketId: string) => Promise<void>;
}

interface AuditEntry {
  id: string;
  type: string;
  actor: string;
  action: string;
  detail: string;
  time: string;
}

export default function InteractiveAuditLog({
  eventId,
  eventName,
  onFetchAdminAudit,
  onBackfillAdminAudit,
  onFetchCheckInAudit,
  onFetchMyHistory,
  onFetchStaffStats,
  onFetchRecentCheckIns,
  onFetchHourlyCounts,
  onFetchTicketAudit,
}: InteractiveAuditLogProps) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditData, setAuditData] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Ticket Audit Search
  const [ticketSearch, setTicketSearch] = useState('');

  // Quick Reports Menu
  const [reportAnchorEl, setReportAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        setLoading(true);
        const response = await adminOperationsService.getAdminAudit({ eventId });
        const entries = (response?.data as any[]) ?? [];
        setAuditData(entries.map((e: any) => ({
          id: e.id ?? e.eventId ?? String(Math.random()),
          type: e.type ?? e.eventType ?? 'ADMIN',
          actor: e.actor ?? e.userEmail ?? e.performedBy ?? '',
          action: e.action ?? e.description ?? '',
          detail: e.detail ?? e.notes ?? '',
          time: e.time ?? e.createdAt ?? '',
        })));
      } catch {
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'ADMIN': return <AdminIcon />;
      case 'CHECKIN': return <CheckInIcon />;
      case 'SEAT': return <TimelineIcon />;
      case 'ORDER': return <TicketIcon />;
      default: return <FactCheckIcon />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'ADMIN': return '#1976d2'; // Blue
      case 'CHECKIN': return '#2e7d32'; // Green
      case 'SEAT': return '#ed6c02'; // Orange
      case 'ORDER': return '#9c27b0'; // Purple
      default: return '#757575';
    }
  };

  const filteredLogs = auditData.filter(log => {
     if (activeFilter !== 'ALL' && log.type !== activeFilter) return false;
     if (searchQuery && !log.actor.includes(searchQuery) && !log.detail.includes(searchQuery)) return false;
     return true;
  });

  return (
    <Box sx={{ p: 1, backgroundColor: 'background.default', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Meta Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary.main">{eventName || 'Event Audit'} - Denetim İzleri</Typography>
          <Typography variant="body2" color="text.secondary">Tüm sistem ve kullanıcı hareketleri logu</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button 
            variant="outlined" 
            startIcon={<ChartIcon />}
            onClick={(e) => setReportAnchorEl(e.currentTarget)}
            sx={{ fontWeight: 600, bgcolor: '#f3f4f6', borderColor: '#e5e7eb', color: 'text.primary' }}
          >
            Hızlı Raporlar
          </Button>
          <Menu anchorEl={reportAnchorEl} open={Boolean(reportAnchorEl)} onClose={() => setReportAnchorEl(null)}>
            <MenuItem onClick={() => { if (onFetchMyHistory) onFetchMyHistory(); setReportAnchorEl(null); }}>
               Kendi Check-In Geçmişim
            </MenuItem>
            <MenuItem onClick={() => { if (onFetchStaffStats) onFetchStaffStats(); setReportAnchorEl(null); }}>
               Personel Giriş İstatistikleri
            </MenuItem>
            <MenuItem onClick={() => { if (onFetchHourlyCounts) onFetchHourlyCounts(); setReportAnchorEl(null); }}>
               Saatlik Okutma Yoğunluğu
            </MenuItem>
            <MenuItem onClick={() => { if (onFetchRecentCheckIns) onFetchRecentCheckIns(); setReportAnchorEl(null); }}>
               Tüm Son Girişler (Check-in Listesi)
            </MenuItem>
          </Menu>
          <Divider orientation="vertical" flexItem />
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<BackfillIcon />}
            onClick={() => { if (onBackfillAdminAudit) onBackfillAdminAudit(); }}
            sx={{ fontWeight: 600, boxShadow: '0 4px 14px rgba(156, 39, 176, 0.3)' }}
          >
            AUDIT BACKFILL
          </Button>
        </Stack>
      </Box>

      {/* Mini Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'white', border: '1px solid #f0f0f0' }}>
            <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 56, height: 56 }}>
              <AdminIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#1976d2">12</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Admin İşlemi (Bugün)</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'white', border: '1px solid #f0f0f0' }}>
            <Avatar sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', width: 56, height: 56 }}>
              <CheckInIcon fontSize="large" />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={800} color="#2e7d32">843</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>Başarılı Giriş</Typography>
              <LinearProgress variant="determinate" value={70} color="success" sx={{ height: 6, borderRadius: 3 }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'white', border: '1px solid #f0f0f0' }}>
            <Avatar sx={{ bgcolor: '#fff8e1', color: '#f57f17', width: 56, height: 56 }}>
              <StaffIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={800} color="#f57f17">4</Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>Aktif Personel / Cihaz</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ flex: 1 }}>
        
        {/* LEFT PANEL: TIMELINE & FILTER */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            
            <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', bgcolor: '#fafafa' }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={2} alignItems="center">
                  <FilterIcon color="action" />
                  <TextField select size="small" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} sx={{ width: 150, bgcolor: 'white' }}>
                    <MenuItem value="ALL">Tüm Loglar</MenuItem>
                    <MenuItem value="ADMIN">Admin Aksiyonları</MenuItem>
                    <MenuItem value="CHECKIN">Giriş/Kapı Aks.</MenuItem>
                    <MenuItem value="SEAT">Koltuk Yönetimi</MenuItem>
                    <MenuItem value="ORDER">Sipariş / Bilet</MenuItem>
                  </TextField>
                  <TextField 
                    size="small" 
                    placeholder="Aktör veya İçerik Ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: 250, bgcolor: 'white' }}
                    InputProps={{ 
                      startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                    }}
                  />
                </Stack>
                
                <Button variant="outlined" size="small" onClick={() => { if(onFetchAdminAudit) onFetchAdminAudit({ filter: activeFilter }); }}>
                  Yenile (Fetch)
                </Button>
              </Stack>
            </Box>

            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {filteredLogs.map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 3, py: 2, '&:hover': { bgcolor: '#f8fafc' } }}>
                    <ListItemIcon sx={{ mt: 1 }}>
                      <Avatar sx={{ bgcolor: getLogColor(log.type) + '15', color: getLogColor(log.type) }}>
                         {getLogIcon(log.type)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {log.action}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" fontWeight={600}>
                            {log.time}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                            {log.detail}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Chip size="small" label={log.type} sx={{ borderRadius: 1, fontSize: '0.7rem', height: 20, bgcolor: '#f1f5f9', color: 'text.secondary', fontWeight: 600 }} />
                            <Chip size="small" label={`@${log.actor}`} sx={{ borderRadius: 1, fontSize: '0.7rem', height: 20, bgcolor: 'transparent', border: '1px solid #e2e8f0', color: 'text.secondary', fontWeight: 600 }} />
                          </Stack>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < filteredLogs.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
              {filteredLogs.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  Arama kriterlerinize uygun log bulunamadı.
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT PANEL: DEEP SEARCH & UTILS */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            
            {/* Ticket Deep Audit */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TicketIcon color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={700}>Bilet Yaşam Döngüsü (Audit)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Özel bir biletin tüm geçmişini karanlık loglardan kazıyarak inceleyin. (İptal, iade, satış, check-in denemeleri).
              </Typography>
              <Stack spacing={2}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Bilet ID (Örn: TCK-12345)" 
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                  }}
                />
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  disableElevation
                  disabled={!ticketSearch.trim()}
                  onClick={async () => {
                    if (onFetchTicketAudit) await onFetchTicketAudit(ticketSearch);
                    setTicketSearch('');
                  }}
                >
                  BİLET GEÇMİŞİNİ SORGULA
                </Button>
              </Stack>
            </Paper>

            {/* General Info / Logs info */}
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, bgcolor: '#f4f6f8', border: '1px dashed #cfd8dc', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
               <TimelineIcon sx={{ fontSize: 60, color: '#b0bec5', mb: 2 }} />
               <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>Loglar Neden Önemli?</Typography>
               <Typography variant="body2" color="text.disabled">
                 Müşteri şikayetlerinde, kapı uyuşmazlıklarında (already used vs.) veya admin'lerin hatalı işlemlerinde (yanlışlıkla iptal edilen biletler) geriye dönük kanıt sağlar.
               </Typography>
            </Paper>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  );

  function FactCheckIcon(props: any) {
    return <StaffIcon {...props} />;
  }
}
