import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Menu,
  CardHeader,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Receipt as ReceiptIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  CardGiftcard as GiftIcon,
  ChevronRight as ChevronRightIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MemberForm, { MemberFormValues } from './MemberForm';
import MemberBenefits from './MemberBenefits';
import { useNavigate } from 'react-router-dom';
import { MembershipStatus } from '../../../types/associationMember/membershipStatus';
import { AssociationMemberDto } from '../../../types/associationMember/associationMemberDto';
import { useFederationMembers } from '../../../hooks/federations/useFederations';

interface MembersTabProps {
  federationId: string;
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
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MembersTab: React.FC<MembersTabProps> = ({ federationId }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: members, isLoading, error } = useFederationMembers(federationId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [associationFilter, setAssociationFilter] = useState('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [memberToUpdate, setMemberToUpdate] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [detailTabValue, setDetailTabValue] = useState(0);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [paymentMenuAnchor, setPaymentMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentStatusDialogOpen, setIsPaymentStatusDialogOpen] = useState(false);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleAddMember = () => {
    navigate(`/members/new?federationId=${federationId}`);
  };

  const handleEditMember = (id: number) => {
    navigate(`/members/${id}/edit`);
  };

  const handleDeleteMember = (id: number) => {
    // Implement delete functionality
    console.log('Delete member:', id);
  };

  const handleViewDetails = (id: number) => {
    navigate(`/members/${id}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load members.</Alert>;
  }

  const filteredMembers = members?.content.filter((member: AssociationMemberDto) =>
    member.userFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userLastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (memberId: number) => {
    setMemberToDelete(memberId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    // Handle member deletion
    console.log('Deleting member:', memberToDelete);
    setIsDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const handleStatusUpdate = (memberId: number) => {
    setMemberToUpdate(memberId);
    setIsStatusDialogOpen(true);
  };

  const handleStatusConfirm = (newStatus: string) => {
    // Handle status update
    console.log('Updating member status:', memberToUpdate, 'to', newStatus);
    setIsStatusDialogOpen(false);
    setMemberToUpdate(null);
  };

  const handleDetailTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setDetailTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getMembershipTypeColor = (type: string) => {
    switch (type) {
      case 'PREMIUM':
        return 'primary';
      case 'STANDARD':
        return 'info';
      case 'BASIC':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleFormSubmit = (values: MemberFormValues) => {
    // Handle form submission
    console.log('Form submitted:', values);
    setIsFormOpen(false);
  };

  const handlePaymentMenuOpen = (event: React.MouseEvent<HTMLElement>, payment: any) => {
    setPaymentMenuAnchor(event.currentTarget);
    setSelectedPayment(payment);
  };

  const handlePaymentMenuClose = () => {
    setPaymentMenuAnchor(null);
    setSelectedPayment(null);
  };

  const handleDownloadReceipt = (payment: any) => {
    // Implement receipt download logic
    console.log('Downloading receipt for payment:', payment);
    handlePaymentMenuClose();
  };

  const handlePrintReceipt = (payment: any) => {
    // Implement receipt print logic
    console.log('Printing receipt for payment:', payment);
    handlePaymentMenuClose();
  };

  const handleEmailReceipt = (payment: any) => {
    // Implement email receipt logic
    console.log('Emailing receipt for payment:', payment);
    handlePaymentMenuClose();
  };

  const handleUpdatePaymentStatus = (payment: any) => {
    setSelectedPayment(payment);
    setIsPaymentStatusDialogOpen(true);
    handlePaymentMenuClose();
  };

  const handlePaymentStatusConfirm = (newStatus: string) => {
    // Implement payment status update logic
    console.log('Updating payment status:', selectedPayment.id, 'to', newStatus);
    setIsPaymentStatusDialogOpen(false);
    setSelectedPayment(null);
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          placeholder="Search members..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMember}
          sx={{ textTransform: 'none' }}
        >
          Add Member
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Association</TableCell>
              <TableCell>Join Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers?.map((member: AssociationMemberDto) => (
              <TableRow
                key={member.id}
                hover
                onClick={() => handleViewDetails(Number(member.id))}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar alt={`${member.userFirstName} ${member.userLastName}`}>
                      {member.userFirstName[0]}
                    </Avatar>
                    <Typography variant="body1">
                      {member.userFirstName} {member.userLastName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{member.userEmail}</TableCell>
                <TableCell>
                  <Chip
                    label={member.status}
                    color={member.status === MembershipStatus.ACTIVE ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{member.associationName}</TableCell>
                <TableCell>{new Date(member.membershipStartDate).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditMember(Number(member.id));
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMember(Number(member.id));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Member Details Dialog */}
      <Dialog
        open={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        maxWidth="lg" // Consider 'lg' for more space
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: selectedMember ? getStatusColor(selectedMember.status) + '.main' : 'grey.500', color: 'white' }}>
              {selectedMember?.name[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">{selectedMember?.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedMember?.email}
              </Typography>
            </Box>
             <Box sx={{ flexGrow: 1 }} /> {/* Pushes buttons to the right */}
            <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                    if (selectedMember) handleEditMember(selectedMember.id);
                    setIsDetailsDialogOpen(false); // Close details dialog when opening edit form
                }}
                sx={{ textTransform: 'none', mr: 1 }}
                size="small"
            >
                Edit Member
            </Button>
            <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                    if (selectedMember) handleDeleteClick(selectedMember.id);
                    setIsDetailsDialogOpen(false); // Close details dialog when opening delete confirmation
                }}
                sx={{ textTransform: 'none' }}
                size="small"
            >
                Delete
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p:0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={detailTabValue} 
              onChange={handleDetailTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              sx={{ px:2 }}
            >
              <Tab icon={<CalendarIcon />} iconPosition="start" label="Membership" sx={{textTransform: 'none'}} />
              <Tab icon={<PaymentIcon />} iconPosition="start" label="Payment History" sx={{textTransform: 'none'}} />
              <Tab icon={<ReceiptIcon />} iconPosition="start" label="Transactions" sx={{textTransform: 'none'}} />
              <Tab icon={<GiftIcon />} iconPosition="start" label="Benefits" sx={{textTransform: 'none'}} />
            </Tabs>
          </Box>

          <Box sx={{ p: 2.5 }}> {/* Added padding for TabPanel content */}
            <TabPanel value={detailTabValue} index={0}>
              <Grid container spacing={3}> {/* Increased spacing */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Membership Details
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Membership Number:</strong> {selectedMember?.membershipNumber}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Type:</strong> {selectedMember?.membershipType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Price:</strong> ${selectedMember?.membershipPrice}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Join Date:</strong> {selectedMember?.joinDate}
                    </Typography>
                    <Typography variant="body2">
                      <strong>End Date:</strong> {selectedMember?.membershipEndDate}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Contact Information
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Phone:</strong> {selectedMember?.phone}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Association:</strong> {selectedMember?.association}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong>{' '}
                      <Chip
                        label={selectedMember?.status}
                        size="small"
                        color={getStatusColor(selectedMember?.status)}
                      />
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={detailTabValue} index={1}>
              <Typography variant="h6" gutterBottom sx={{mb:2}}> {/* Use h6 for section title */}
                Payment History
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMember?.paymentHistory.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>${payment.amount}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            size="small"
                            color={getPaymentStatusColor(payment.status)}
                          />
                        </TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handlePaymentMenuOpen(e, payment)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={detailTabValue} index={2}>
              <Typography variant="h6" gutterBottom sx={{mb:2}}> {/* Use h6 for section title */}
                Transaction History
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Transaction ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMember?.paymentHistory.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.transactionId}</TableCell>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>${payment.amount}</TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status}
                            size="small"
                            color={getPaymentStatusColor(payment.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={detailTabValue} index={3}>
              <MemberBenefits memberId={selectedMember?.id} />
            </TabPanel>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p:2 }}>
          <Button onClick={() => setIsDetailsDialogOpen(false)} sx={{textTransform: 'none'}}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Actions Menu */}
      <Menu
        anchorEl={paymentMenuAnchor}
        open={Boolean(paymentMenuAnchor)}
        onClose={handlePaymentMenuClose}
      >
        <MenuItem onClick={() => handleDownloadReceipt(selectedPayment)}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download Receipt
        </MenuItem>
        <MenuItem onClick={() => handlePrintReceipt(selectedPayment)}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Print Receipt
        </MenuItem>
        <MenuItem onClick={() => handleEmailReceipt(selectedPayment)}>
          <EmailIcon fontSize="small" sx={{ mr: 1 }} />
          Email Receipt
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleUpdatePaymentStatus(selectedPayment)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Update Status
        </MenuItem>
      </Menu>

      {/* Payment Status Update Dialog */}
      <Dialog
        open={isPaymentStatusDialogOpen}
        onClose={() => setIsPaymentStatusDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Update Payment Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{mb:1}}>
            Update payment status for Transaction ID: {selectedPayment?.transactionId}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                label="New Status"
                defaultValue=""
                onChange={(e) => handlePaymentStatusConfirm(e.target.value)}
              >
                <MenuItem value="PAID">Paid</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="REFUNDED">Refunded</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentStatusDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handlePaymentStatusConfirm('PAID')}
            color="primary"
            variant="contained"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Delete Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this member? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Update Member Status</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                label="New Status"
                defaultValue=""
                onChange={(e) => handleStatusConfirm(e.target.value)}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="SUSPENDED">Suspended</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => handleStatusConfirm('ACTIVE')} color="primary" variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Form Dialog */}
      <MemberForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={selectedMember}
        isEdit={isEdit}
      />
    </Box>
  );
};

export default MembersTab; 