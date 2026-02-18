import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Alert,
  Stack,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAssociationTransactions } from '../../../hooks/subscriptionPayments/useSubscriptionPayments';
import { SubscriptionPaymentFilterDto } from '../../../types/subscriptionPayment';
import { AdminSubscriptionPaymentDto, SubscriptionType } from '../../../types/subscriptionPayment/adminSubscriptionPaymentDto';

interface AssociationTransactionsProps {
  associationId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`subscription-tabpanel-${index}`}
      aria-labelledby={`subscription-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const AssociationTransactions: React.FC<AssociationTransactionsProps> = ({ associationId }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState<SubscriptionPaymentFilterDto>({});
  const [selectedTransaction, setSelectedTransaction] = useState<AdminSubscriptionPaymentDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [expandedFilters, setExpandedFilters] = useState(false);
  
  // Business Subscriptions için ayrı state
  const [businessPage, setBusinessPage] = useState(0);
  const [businessRowsPerPage, setBusinessRowsPerPage] = useState(10);
  const [businessFilter, setBusinessFilter] = useState<SubscriptionPaymentFilterDto>({});
  
  // Member Subscriptions için ayrı state  
  const [memberPage, setMemberPage] = useState(0);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);
  const [memberFilter, setMemberFilter] = useState<SubscriptionPaymentFilterDto>({});

  // Business subscriptions için API çağrısı
  const { data: businessRevenueData, isLoading: isLoadingBusiness, isError: isErrorBusiness, error: errorBusiness } = useAssociationTransactions(
    associationId,
    { ...businessFilter, subscriptionType: SubscriptionType.BUSINESS_SUBSCRIPTION },
    businessPage,
    businessRowsPerPage
  );

  // Member subscriptions için API çağrısı
  const { data: memberRevenueData, isLoading: isLoadingMember, isError: isErrorMember, error: errorMember } = useAssociationTransactions(
    associationId,
    { ...memberFilter, subscriptionType: SubscriptionType.MEMBER_SUBSCRIPTION },
    memberPage,
    memberRowsPerPage
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBusinessFilterChange = (field: keyof SubscriptionPaymentFilterDto, value: any) => {
    setBusinessFilter(prev => ({ ...prev, [field]: value }));
    setBusinessPage(0);
  };

  const handleMemberFilterChange = (field: keyof SubscriptionPaymentFilterDto, value: any) => {
    setMemberFilter(prev => ({ ...prev, [field]: value }));
    setMemberPage(0);
  };

  const handleViewDetail = (transaction: AdminSubscriptionPaymentDto) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTransaction(null);
  };

  const clearBusinessFilters = () => {
    setBusinessFilter({});
    setBusinessPage(0);
  };

  const clearMemberFilters = () => {
    setMemberFilter({});
    setMemberPage(0);
  };

  // Business transactions
  const businessTransactions = businessRevenueData?.data?.content || [];
  const businessTotalElements = businessRevenueData?.data?.totalElements ?? 0;

  // Member transactions
  const memberTransactions = memberRevenueData?.data?.content || [];
  const memberTotalElements = memberRevenueData?.data?.totalElements ?? 0;

  // Business summary stats
  const businessSummaryStats = useMemo(() => {
    if (!businessTransactions.length) {
      return { totalRevenue: 0, totalTransactions: 0, newSubscriptions: 0, renewals: 0 };
    }

    const totalRevenue = businessTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalTransactions = businessTransactions.length;
    const newSubscriptions = businessTransactions.filter(tx => tx.eventType?.toLowerCase() === 'initial_purchase').length;
    const renewals = businessTransactions.filter(tx => tx.eventType?.toLowerCase() === 'renewal').length;

    return { totalRevenue, totalTransactions, newSubscriptions, renewals };
  }, [businessTransactions]);

  // Member summary stats
  const memberSummaryStats = useMemo(() => {
    if (!memberTransactions.length) {
      return { totalRevenue: 0, totalTransactions: 0, newSubscriptions: 0, renewals: 0 };
    }

    const totalRevenue = memberTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalTransactions = memberTransactions.length;
    const newSubscriptions = memberTransactions.filter(tx => tx.eventType?.toLowerCase() === 'initial_purchase').length;
    const renewals = memberTransactions.filter(tx => tx.eventType?.toLowerCase() === 'renewal').length;

    return { totalRevenue, totalTransactions, newSubscriptions, renewals };
  }, [memberTransactions]);

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'active') return 'success';           // Yeşil - Aktif
    if (statusLower === 'pending') return 'warning';          // Turuncu - Beklemede
    if (statusLower === 'expired') return 'error';            // Kırmızı - Süresi doldu
    if (statusLower === 'cancelled') return 'error';          // Kırmızı - İptal edildi
    if (statusLower === 'inactive') return 'error';           // Kırmızı - Pasif
    if (statusLower === 'suspended') return 'warning';        // Turuncu - Askıya alındı
    if (statusLower === 'trial') return 'info';               // Mavi - Deneme
    return 'default';                                          // Gri - Diğer
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'active') return 'ACTIVE';
    if (statusLower === 'pending') return 'PENDING';
    if (statusLower === 'expired') return 'EXPIRED';
    if (statusLower === 'cancelled') return 'CANCELLED';
    if (statusLower === 'inactive') return 'INACTIVE';
    if (statusLower === 'suspended') return 'SUSPENDED';
    if (statusLower === 'trial') return 'TRIAL';
    return status?.toUpperCase() || 'N/A';
  };

  const getEventTypeColor = (eventType: string): 'success' | 'info' | 'error' | 'warning' | 'primary' | 'secondary' => {
    const eventLower = eventType?.toLowerCase();
    if (eventLower === 'initial_purchase') return 'success';    // Yeşil - Yeni satın alma
    if (eventLower === 'renewal') return 'primary';             // Mavi - Yenileme
    if (eventLower === 'cancellation') return 'error';         // Kırmızı - İptal
    if (eventLower === 'expiration') return 'warning';         // Turuncu - Süresi doldu
    if (eventLower === 'refund') return 'secondary';           // Mor - İade
    return 'info';                                             // Açık mavi - Diğer
  };

  const getEventTypeBadge = (eventType: string) => {
    const eventLower = eventType?.toLowerCase();
    if (eventLower === 'initial_purchase') return 'NEW';
    if (eventLower === 'renewal') return 'RENEWAL';
    if (eventLower === 'cancellation') return 'CANCEL';
    if (eventLower === 'expiration') return 'EXPIRED';
    if (eventLower === 'refund') return 'REFUND';
    return eventType || 'N/A';
  };

  // Status Legend Component
  const StatusLegend = () => (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <InfoIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="subtitle2" fontWeight="bold">Status Colors</Typography>
      </Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Chip 
          label="ACTIVE - Aktif" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#2e7d32', // Dark green
            color: 'white',
            '&:hover': { backgroundColor: '#1b5e20' }
          }} 
        />
        <Chip 
          label="PENDING - Beklemede" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#ed6c02', // Dark orange
            color: 'white',
            '&:hover': { backgroundColor: '#e65100' }
          }} 
        />
        <Chip 
          label="EXPIRED - Süresi Doldu" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#d32f2f', // Dark red
            color: 'white',
            '&:hover': { backgroundColor: '#c62828' }
          }} 
        />
        <Chip 
          label="CANCELLED - İptal Edildi" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#d32f2f', // Dark red
            color: 'white',
            '&:hover': { backgroundColor: '#c62828' }
          }} 
        />
        <Chip 
          label="INACTIVE - Pasif" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#d32f2f', // Dark red
            color: 'white',
            '&:hover': { backgroundColor: '#c62828' }
          }} 
        />
        <Chip 
          label="SUSPENDED - Askıya Alındı" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#ed6c02', // Dark orange
            color: 'white',
            '&:hover': { backgroundColor: '#e65100' }
          }} 
        />
        <Chip 
          label="TRIAL - Deneme" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#0288d1', // Dark blue
            color: 'white',
            '&:hover': { backgroundColor: '#01579b' }
          }} 
        />
        <Chip 
          label="OTHER - Diğer" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#616161', // Dark grey
            color: 'white',
            '&:hover': { backgroundColor: '#424242' }
          }} 
        />
      </Stack>
    </Paper>
  );

  // Event Type Legend Component
  const EventTypeLegend = () => (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <InfoIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="subtitle2" fontWeight="bold">Event Type Colors</Typography>
      </Box>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Chip 
          label="NEW - Yeni Satın Alma" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#2e7d32', // Dark green
            color: 'white',
            '&:hover': { backgroundColor: '#1b5e20' }
          }} 
        />
        <Chip 
          label="RENEWAL - Yenileme" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#1976d2', // Dark blue
            color: 'white',
            '&:hover': { backgroundColor: '#1565c0' }
          }} 
        />
        <Chip 
          label="CANCEL - İptal" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#d32f2f', // Dark red
            color: 'white',
            '&:hover': { backgroundColor: '#c62828' }
          }} 
        />
        <Chip 
          label="EXPIRED - Süresi Doldu" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#ed6c02', // Dark orange
            color: 'white',
            '&:hover': { backgroundColor: '#e65100' }
          }} 
        />
        <Chip 
          label="REFUND - İade" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#7b1fa2', // Dark purple
            color: 'white',
            '&:hover': { backgroundColor: '#6a1b9a' }
          }} 
        />
        <Chip 
          label="OTHER - Diğer" 
          size="small" 
          sx={{ 
            fontWeight: 'bold',
            backgroundColor: '#0288d1', // Light blue
            color: 'white',
            '&:hover': { backgroundColor: '#01579b' }
          }} 
        />
      </Stack>
    </Paper>
  );

  // Combined Legends Component
  const ColorLegends = () => (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <EventTypeLegend />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatusLegend />
        </Grid>
      </Grid>
    </Box>
  );

  const renderSummaryCards = (stats: any) => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
            <Typography variant="h5">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.totalRevenue)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>Total Transactions</Typography>
            <Typography variant="h5">{stats.totalTransactions}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>New Subscriptions</Typography>
            <Typography variant="h5">{stats.newSubscriptions}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>Renewals</Typography>
            <Typography variant="h5">{stats.renewals}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = (currentFilter: SubscriptionPaymentFilterDto, onFilterChange: (field: keyof SubscriptionPaymentFilterDto, value: any) => void, onClearFilters: () => void) => (
    <Paper sx={{ mb: 3 }}>
      <Accordion expanded={expandedFilters} onChange={() => setExpandedFilters(!expandedFilters)}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Advanced Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Quick Search */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quick Search"
                placeholder="Search member name, email, transaction ID..."
                value={currentFilter.searchTerm || ''}
                onChange={e => onFilterChange('searchTerm', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Clear Filters Button */}
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                fullWidth
                onClick={onClearFilters}
                sx={{ height: '56px' }}
              >
                Clear All Filters
              </Button>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={currentFilter.startDate ? new Date(currentFilter.startDate).toISOString().split('T')[0] : ''}
                InputLabelProps={{ shrink: true }}
                onChange={e => onFilterChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={currentFilter.endDate ? new Date(currentFilter.endDate).toISOString().split('T')[0] : ''}
                InputLabelProps={{ shrink: true }}
                onChange={e => onFilterChange('endDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </Grid>

            {/* Package Type */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Package Type"
                value={currentFilter.packageType || ''}
                onChange={(e) => onFilterChange('packageType', e.target.value)}
              >
                <MenuItem value="">All Packages</MenuItem>
                <MenuItem value="BRONZE">Bronze</MenuItem>
                <MenuItem value="SILVER">Silver</MenuItem>
                <MenuItem value="GOLD">Gold</MenuItem>
                <MenuItem value="PLATINUM">Platinum</MenuItem>
              </TextField>
            </Grid>

            {/* Event Type */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Event Type"
                value={currentFilter.eventType || ''}
                onChange={(e) => onFilterChange('eventType', e.target.value)}
              >
                <MenuItem value="">All Events</MenuItem>
                <MenuItem value="INITIAL_PURCHASE">New Purchase</MenuItem>
                <MenuItem value="RENEWAL">Renewal</MenuItem>
                <MenuItem value="CANCELLATION">Cancellation</MenuItem>
                <MenuItem value="EXPIRATION">Expiration</MenuItem>
              </TextField>
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                value={currentFilter.status || ''}
                onChange={(e) => onFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="ACTIVE" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#2e7d32',
                        color: 'white'
                      }} 
                    />
                    Active
                  </Box>
                </MenuItem>
                <MenuItem value="PENDING">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="PENDING" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#ed6c02',
                        color: 'white'
                      }} 
                    />
                    Pending
                  </Box>
                </MenuItem>
                <MenuItem value="EXPIRED">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="EXPIRED" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#d32f2f',
                        color: 'white'
                      }} 
                    />
                    Expired
                  </Box>
                </MenuItem>
                <MenuItem value="CANCELLED">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="CANCELLED" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#d32f2f',
                        color: 'white'
                      }} 
                    />
                    Cancelled
                  </Box>
                </MenuItem>
                <MenuItem value="INACTIVE">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="INACTIVE" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#d32f2f',
                        color: 'white'
                      }} 
                    />
                    Inactive
                  </Box>
                </MenuItem>
                <MenuItem value="SUSPENDED">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="SUSPENDED" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#ed6c02',
                        color: 'white'
                      }} 
                    />
                    Suspended
                  </Box>
                </MenuItem>
                <MenuItem value="TRIAL">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="TRIAL" 
                      size="small" 
                      sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: '#0288d1',
                        color: 'white'
                      }} 
                    />
                    Trial
                  </Box>
                </MenuItem>
              </TextField>
            </Grid>

            {/* Member Filters */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Member Name"
                placeholder="Search by member name..."
                value={currentFilter.memberName || ''}
                onChange={e => onFilterChange('memberName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Member Email"
                placeholder="Search by email..."
                value={currentFilter.memberEmail || ''}
                onChange={e => onFilterChange('memberEmail', e.target.value)}
              />
            </Grid>

            {/* Amount Range */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Min Amount"
                type="number"
                value={currentFilter.minAmount || ''}
                onChange={e => onFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );

  const renderTransactionTable = (
    transactions: AdminSubscriptionPaymentDto[],
    isLoading: boolean,
    isError: boolean,
    error: any,
    page: number,
    rowsPerPage: number,
    totalElements: number,
    onPageChange: (event: unknown, newPage: number) => void,
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  ) => (
    <Paper>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">Error loading transactions: {error?.message || 'Unknown error'}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Member Name</TableCell>
                  <TableCell>Package Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No transactions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx: AdminSubscriptionPaymentDto) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>{new Date(tx.paymentDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {tx.memberName || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {tx.memberEmail || ''}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.packageType || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: tx.currency || 'TRY' }).format(tx.amount || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`Status: ${tx.status || 'N/A'} - Açıklama için yukarıdaki legend'a bakınız`}>
                          <Chip 
                            label={getStatusBadge(tx.status)} 
                            color={getStatusColor(tx.status)} 
                            size="small"
                            sx={{ 
                              fontWeight: 'bold',
                              cursor: 'help',
                              minWidth: '90px',
                              // Status renklerini daha koyu yapıyoruz
                              ...(getStatusColor(tx.status) === 'success' && {
                                backgroundColor: '#2e7d32',
                                color: 'white',
                                '&:hover': { backgroundColor: '#1b5e20' }
                              }),
                              ...(getStatusColor(tx.status) === 'error' && {
                                backgroundColor: '#d32f2f',
                                color: 'white',
                                '&:hover': { backgroundColor: '#c62828' }
                              }),
                              ...(getStatusColor(tx.status) === 'warning' && {
                                backgroundColor: '#ed6c02',
                                color: 'white',
                                '&:hover': { backgroundColor: '#e65100' }
                              }),
                              ...(getStatusColor(tx.status) === 'info' && {
                                backgroundColor: '#0288d1',
                                color: 'white',
                                '&:hover': { backgroundColor: '#01579b' }
                              }),
                              ...(getStatusColor(tx.status) === 'default' && {
                                backgroundColor: '#616161',
                                color: 'white',
                                '&:hover': { backgroundColor: '#424242' }
                              })
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={`Event Type: ${tx.eventType || 'N/A'} - Açıklama için yukarıdaki legend'a bakınız`}>
                          <Chip 
                            label={getEventTypeBadge(tx.eventType)} 
                            color={getEventTypeColor(tx.eventType)} 
                            size="small"
                            sx={{ 
                              fontWeight: 'bold',
                              cursor: 'help',
                              minWidth: '90px',
                              // Event type renklerini daha koyu yapıyoruz
                              ...(getEventTypeColor(tx.eventType) === 'success' && {
                                backgroundColor: '#2e7d32',
                                color: 'white',
                                '&:hover': { backgroundColor: '#1b5e20' }
                              }),
                              ...(getEventTypeColor(tx.eventType) === 'primary' && {
                                backgroundColor: '#1976d2',
                                color: 'white',
                                '&:hover': { backgroundColor: '#1565c0' }
                              }),
                              ...(getEventTypeColor(tx.eventType) === 'error' && {
                                backgroundColor: '#d32f2f',
                                color: 'white',
                                '&:hover': { backgroundColor: '#c62828' }
                              }),
                              ...(getEventTypeColor(tx.eventType) === 'warning' && {
                                backgroundColor: '#ed6c02',
                                color: 'white',
                                '&:hover': { backgroundColor: '#e65100' }
                              }),
                              ...(getEventTypeColor(tx.eventType) === 'secondary' && {
                                backgroundColor: '#7b1fa2',
                                color: 'white',
                                '&:hover': { backgroundColor: '#6a1b9a' }
                              }),
                              ...(getEventTypeColor(tx.eventType) === 'info' && {
                                backgroundColor: '#0288d1',
                                color: 'white',
                                '&:hover': { backgroundColor: '#01579b' }
                              })
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip label={tx.platform || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetail(tx)}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalElements}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      )}
    </Paper>
  );

  return (
    <Box>
      {/* Subscription Type Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<BusinessIcon />} 
            iconPosition="start"
            label={
              <Badge badgeContent={businessTotalElements} color="primary" max={999}>
                Business Subscriptions
              </Badge>
            }
            sx={{ textTransform: 'none', px: 3 }}
          />
          <Tab 
            icon={<PeopleIcon />} 
            iconPosition="start"
            label={
              <Badge badgeContent={memberTotalElements} color="secondary" max={999}>
                Member Subscriptions
              </Badge>
            }
            sx={{ textTransform: 'none', px: 3 }}
          />
        </Tabs>
      </Paper>

      {/* Business Subscriptions Tab */}
      <TabPanel value={tabValue} index={0}>
        {renderSummaryCards(businessSummaryStats)}
        {renderFilters(businessFilter, handleBusinessFilterChange, clearBusinessFilters)}
        {renderTransactionTable(
          businessTransactions,
          isLoadingBusiness,
          isErrorBusiness,
          errorBusiness,
          businessPage,
          businessRowsPerPage,
          businessTotalElements,
          (event, newPage) => setBusinessPage(newPage),
          (event) => {
            setBusinessRowsPerPage(parseInt(event.target.value, 10));
            setBusinessPage(0);
          }
        )}
      </TabPanel>

      {/* Member Subscriptions Tab */}
      <TabPanel value={tabValue} index={1}>
        {renderSummaryCards(memberSummaryStats)}
        {renderFilters(memberFilter, handleMemberFilterChange, clearMemberFilters)}
        {renderTransactionTable(
          memberTransactions,
          isLoadingMember,
          isErrorMember,
          errorMember,
          memberPage,
          memberRowsPerPage,
          memberTotalElements,
          (event, newPage) => setMemberPage(newPage),
          (event) => {
            setMemberRowsPerPage(parseInt(event.target.value, 10));
            setMemberPage(0);
          }
        )}
      </TabPanel>

      {/* Detail Modal - existing code remains the same */}
      <Dialog
        open={isDetailModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Transaction Details
              {selectedTransaction && (
                <Chip 
                  label={selectedTransaction.subscriptionType === SubscriptionType.BUSINESS_SUBSCRIPTION ? 'Business' : 'Member'}
                  size="small"
                  color={selectedTransaction.subscriptionType === SubscriptionType.BUSINESS_SUBSCRIPTION ? 'primary' : 'secondary'}
                />
              )}
            </Box>
            <IconButton onClick={handleCloseModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Grid container spacing={3}>
              {/* Member Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Member Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Member Name</Typography>
                    <Typography variant="body1">{selectedTransaction.memberName || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Email</Typography>
                    <Typography variant="body1">{selectedTransaction.memberEmail || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Membership Number</Typography>
                    <Typography variant="body1">{selectedTransaction.membershipNumber || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Subscription Type</Typography>
                    <Typography variant="body1">
                      <Chip 
                        label={selectedTransaction.subscriptionType === SubscriptionType.BUSINESS_SUBSCRIPTION ? 'Business Subscription' : 'Member Subscription'}
                        size="small"
                        color={selectedTransaction.subscriptionType === SubscriptionType.BUSINESS_SUBSCRIPTION ? 'primary' : 'secondary'}
                      />
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Payment Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Payment Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Payment Date</Typography>
                    <Typography variant="body1">{new Date(selectedTransaction.paymentDate).toLocaleString('tr-TR')}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Amount</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: selectedTransaction.currency || 'TRY' }).format(selectedTransaction.amount || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Currency</Typography>
                    <Typography variant="body1">{selectedTransaction.currency || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Platform</Typography>
                    <Typography variant="body1">{selectedTransaction.platform || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Environment</Typography>
                    <Typography variant="body1">{selectedTransaction.environment || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Transaction ID</Typography>
                    <Typography variant="body2" fontFamily="monospace">{selectedTransaction.revenuecatTransactionId || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Subscription Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Subscription Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Package Type</Typography>
                    <Typography variant="body1">
                      <Chip label={selectedTransaction.packageType || 'N/A'} size="small" variant="outlined" />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Typography variant="body1">
                      <Chip label={selectedTransaction.status} color={getStatusColor(selectedTransaction.status)} size="small" />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Event Type</Typography>
                    <Typography variant="body1">
                      <Chip 
                        label={getEventTypeBadge(selectedTransaction.eventType)} 
                        color={getEventTypeColor(selectedTransaction.eventType)} 
                        size="small" 
                      />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Subscription Status</Typography>
                    <Typography variant="body1">{selectedTransaction.subscriptionStatus || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Expiration Date</Typography>
                    <Typography variant="body1">{selectedTransaction.expirationDate ? new Date(selectedTransaction.expirationDate).toLocaleDateString('tr-TR') : 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Product ID</Typography>
                    <Typography variant="body2" fontFamily="monospace">{selectedTransaction.productId || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Business Information */}
              {selectedTransaction.businessName && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Business Information</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">Business Name</Typography>
                      <Typography variant="body1">{selectedTransaction.businessName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">Business ID</Typography>
                      <Typography variant="body2" fontFamily="monospace">{selectedTransaction.businessId || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Color Legends */}
      <ColorLegends />
    </Box>
  );
};

export default AssociationTransactions; 