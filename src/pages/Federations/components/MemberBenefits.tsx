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
  Tooltip,
  Divider,
  CardHeader,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocalOffer as OfferIcon,
  DateRange as DateRangeIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface MemberBenefit {
  id: number;
  businessName: string;
  businessType: string;
  benefitDescription: string;
  discountPercentage?: number;
  discountAmount?: number;
  agreementStartDate: string;
  agreementEndDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  terms: string;
  eligibilityCriteria: string;
  maxUsagePerMember?: number;
  currentUsageCount: number;
}

interface MemberBenefitsProps {
  memberId: number;
}

// Dummy data for member benefits
const memberBenefitsList: MemberBenefit[] = [
  {
    id: 1,
    businessName: 'Sports Equipment Store',
    businessType: 'RETAIL',
    benefitDescription: '20% discount on all sports equipment',
    discountPercentage: 20,
    agreementStartDate: '2024-01-01',
    agreementEndDate: '2024-12-31',
    status: 'ACTIVE',
    terms: 'Valid for all sports equipment. Cannot be combined with other offers.',
    eligibilityCriteria: 'Active members only',
    maxUsagePerMember: 5,
    currentUsageCount: 2,
  },
  {
    id: 2,
    businessName: 'Fitness Center',
    businessType: 'SERVICE',
    benefitDescription: 'Free monthly fitness assessment',
    agreementStartDate: '2024-01-01',
    agreementEndDate: '2024-12-31',
    status: 'ACTIVE',
    terms: 'One free assessment per month. Must book in advance.',
    eligibilityCriteria: 'Premium members only',
    maxUsagePerMember: 12,
    currentUsageCount: 3,
  },
];

const validationSchema = Yup.object({
  businessName: Yup.string().required('Business name is required'),
  businessType: Yup.string().required('Business type is required'),
  benefitDescription: Yup.string().required('Benefit description is required').min(10, 'Description must be at least 10 characters'),
  discountPercentage: Yup.number().min(0, 'Must be >= 0').max(100, 'Must be <= 100').nullable(),
  discountAmount: Yup.number().min(0, 'Must be >= 0').nullable(),
  agreementStartDate: Yup.date().required('Start date is required').typeError('Invalid date format'),
  agreementEndDate: Yup.date().required('End date is required').typeError('Invalid date format')
    .min(Yup.ref('agreementStartDate'), 'End date cannot be before start date'),
  terms: Yup.string().required('Terms are required').min(10, 'Terms must be at least 10 characters'),
  eligibilityCriteria: Yup.string().required('Eligibility criteria is required').min(10, 'Criteria must be at least 10 characters'),
  maxUsagePerMember: Yup.number().min(0, 'Must be >= 0').integer('Must be an integer').nullable(),
  status: Yup.string().required('Status is required').oneOf(['ACTIVE', 'PENDING', 'EXPIRED']),
});

const MemberBenefits: React.FC<MemberBenefitsProps> = ({ memberId }) => {
  const [benefits, setBenefits] = useState<MemberBenefit[]>(memberBenefitsList);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<MemberBenefit | null>(null);
  const [isEdit, setIsEdit] = useState(false);

  const formik = useFormik<Omit<MemberBenefit, 'id' | 'currentUsageCount'>>({
    initialValues: {
      businessName: '',
      businessType: '',
      benefitDescription: '',
      discountPercentage: undefined,
      discountAmount: undefined,
      agreementStartDate: '',
      agreementEndDate: '',
      status: 'PENDING',
      terms: '',
      eligibilityCriteria: '',
      maxUsagePerMember: undefined,
    },
    validationSchema: validationSchema,
    onSubmit: (values) => {
      if (isEdit && selectedBenefit) {
        setBenefits(prevBenefits => 
          prevBenefits.map(b => b.id === selectedBenefit.id ? { ...selectedBenefit, ...values } : b)
        );
        console.log('Updating benefit:', selectedBenefit.id, values);
      } else {
        const newBenefit: MemberBenefit = {
          id: Date.now(),
          ...values,
          currentUsageCount: 0,
        };
        setBenefits(prevBenefits => [...prevBenefits, newBenefit]);
        console.log('Adding new benefit:', newBenefit);
      }
      setIsFormOpen(false);
      formik.resetForm();
    },
  });

  const handleAddBenefit = () => {
    setIsEdit(false);
    setSelectedBenefit(null);
    formik.resetForm({ values: {
        businessName: '',
        businessType: '',
        benefitDescription: '',
        discountPercentage: undefined,
        discountAmount: undefined,
        agreementStartDate: new Date().toISOString().split('T')[0],
        agreementEndDate: '',
        status: 'PENDING',
        terms: '',
        eligibilityCriteria: '',
        maxUsagePerMember: undefined,
    }});
    setIsFormOpen(true);
  };

  const handleEditBenefit = (benefit: MemberBenefit) => {
    setIsEdit(true);
    setSelectedBenefit(benefit);
    formik.setValues({
      businessName: benefit.businessName,
      businessType: benefit.businessType,
      benefitDescription: benefit.benefitDescription,
      discountPercentage: benefit.discountPercentage,
      discountAmount: benefit.discountAmount,
      agreementStartDate: benefit.agreementStartDate,
      agreementEndDate: benefit.agreementEndDate,
      status: benefit.status,
      terms: benefit.terms,
      eligibilityCriteria: benefit.eligibilityCriteria,
      maxUsagePerMember: benefit.maxUsagePerMember,
    });
    setIsFormOpen(true);
  };

  const handleDeleteBenefit = (benefit: MemberBenefit) => {
    setSelectedBenefit(benefit);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedBenefit) {
      setBenefits(prevBenefits => prevBenefits.filter(b => b.id !== selectedBenefit.id));
      console.log('Deleting benefit:', selectedBenefit?.id);
    }
    setIsDeleteDialogOpen(false);
    setSelectedBenefit(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 0 }}>
      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardHeader
          title="Member Benefits"
          titleTypographyProps={{ variant: 'h6' }}
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddBenefit}
              sx={{ textTransform: 'none' }}
            >
              Add New Benefit
            </Button>
          }
          sx={{ pb: 1, pt: 2, px: 2 }}
        />
        <Box sx={{p: 2}}>
          <TableContainer component={Paper} sx={{ borderRadius: 1.5, overflowX: 'auto', boxShadow: 'none' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Business</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Benefit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Agreement Period</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Usage</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benefits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                          <InfoIcon sx={{ fontSize: 48, color: 'text.disabled', mb:1 }}/>
                          <Typography variant="subtitle1" color="textSecondary">
                              No benefits assigned yet.
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                              Click "Add New Benefit" to get started.
                          </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {benefits.map((benefit) => (
                  <TableRow key={benefit.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BusinessIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">{benefit.businessName}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {benefit.businessType}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{benefit.benefitDescription}</Typography>
                        {benefit.discountPercentage != null && (
                          <Chip
                            size="small"
                            label={`${benefit.discountPercentage}% OFF`}
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                         {benefit.discountAmount != null && (
                          <Chip
                            size="small"
                            label={`$${benefit.discountAmount} OFF`}
                            color="secondary"
                             variant="outlined"
                            sx={{ mt: 0.5, ml: benefit.discountPercentage != null ? 0.5 : 0 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DateRangeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {new Date(benefit.agreementStartDate).toLocaleDateString()} - {new Date(benefit.agreementEndDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {benefit.currentUsageCount}
                        {benefit.maxUsagePerMember != null && ` / ${benefit.maxUsagePerMember}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={benefit.status}
                        size="small"
                        color={getStatusColor(benefit.status)}
                        sx={{ textTransform: 'capitalize', fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Benefit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditBenefit(benefit)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Benefit">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteBenefit(benefit)}
                        >
                          <DeleteIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      {/* Benefit Form Dialog */}
      <Dialog open={isFormOpen} onClose={() => { setIsFormOpen(false); formik.resetForm(); }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ pb: 1}}>
          <Typography variant="h6" component="div" fontWeight="bold">
            {isEdit ? 'Edit Benefit' : 'Add New Benefit'}
          </Typography>
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent sx={{pt:1}}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="businessName"
                  name="businessName"
                  label="Business Name"
                  value={formik.values.businessName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.businessName && Boolean(formik.errors.businessName)}
                  helperText={formik.touched.businessName && formik.errors.businessName}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" error={formik.touched.businessType && Boolean(formik.errors.businessType)}>
                  <InputLabel id="businessType-label">Business Type</InputLabel>
                  <Select
                    labelId="businessType-label"
                    id="businessType"
                    name="businessType"
                    label="Business Type"
                    value={formik.values.businessType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  >
                    <MenuItem value="RETAIL">Retail</MenuItem>
                    <MenuItem value="SERVICE">Service</MenuItem>
                    <MenuItem value="RESTAURANT">Restaurant</MenuItem>
                    <MenuItem value="HEALTH_WELLNESS">Health & Wellness</MenuItem>
                    <MenuItem value="ENTERTAINMENT">Entertainment</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                  {formik.touched.businessType && formik.errors.businessType && (
                    <FormHelperText>{formik.errors.businessType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  id="benefitDescription"
                  name="benefitDescription"
                  label="Benefit Description"
                  value={formik.values.benefitDescription}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.benefitDescription && Boolean(formik.errors.benefitDescription)}
                  helperText={formik.touched.benefitDescription && formik.errors.benefitDescription}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  id="discountPercentage"
                  name="discountPercentage"
                  label="Discount Percentage (Optional)"
                  value={formik.values.discountPercentage ?? ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.discountPercentage && Boolean(formik.errors.discountPercentage)}
                  helperText={formik.touched.discountPercentage && formik.errors.discountPercentage}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  id="discountAmount"
                  name="discountAmount"
                  label="Discount Amount (Optional)"
                  value={formik.values.discountAmount ?? ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.discountAmount && Boolean(formik.errors.discountAmount)}
                  helperText={formik.touched.discountAmount && formik.errors.discountAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  id="agreementStartDate"
                  name="agreementStartDate"
                  label="Agreement Start Date"
                  value={formik.values.agreementStartDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.agreementStartDate && Boolean(formik.errors.agreementStartDate)}
                  helperText={formik.touched.agreementStartDate && formik.errors.agreementStartDate}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  id="agreementEndDate"
                  name="agreementEndDate"
                  label="Agreement End Date"
                  value={formik.values.agreementEndDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.agreementEndDate && Boolean(formik.errors.agreementEndDate)}
                  helperText={formik.touched.agreementEndDate && formik.errors.agreementEndDate}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
               <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" error={formik.touched.status && Boolean(formik.errors.status)}>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    name="status"
                    label="Status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                  </Select>
                   {formik.touched.status && formik.errors.status && (
                    <FormHelperText>{formik.errors.status}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  id="maxUsagePerMember"
                  name="maxUsagePerMember"
                  label="Max Usage Per Member (Optional)"
                  value={formik.values.maxUsagePerMember ?? ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.maxUsagePerMember && Boolean(formik.errors.maxUsagePerMember)}
                  helperText={formik.touched.maxUsagePerMember && formik.errors.maxUsagePerMember}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  id="terms"
                  name="terms"
                  label="Terms and Conditions"
                  value={formik.values.terms}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.terms && Boolean(formik.errors.terms)}
                  helperText={formik.touched.terms && formik.errors.terms}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  id="eligibilityCriteria"
                  name="eligibilityCriteria"
                  label="Eligibility Criteria"
                  value={formik.values.eligibilityCriteria}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.eligibilityCriteria && Boolean(formik.errors.eligibilityCriteria)}
                  helperText={formik.touched.eligibilityCriteria && formik.errors.eligibilityCriteria}
                  size="small"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{p:2}}>
            <Button onClick={() => { setIsFormOpen(false); formik.resetForm(); }} sx={{textTransform:'none'}}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={formik.isSubmitting || !formik.isValid}
              sx={{textTransform:'none'}}
            >
              {isEdit ? 'Update Benefit' : 'Create Benefit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Delete Benefit</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the benefit "<strong>{selectedBenefit?.benefitDescription || ''}</strong>" from "<strong>{selectedBenefit?.businessName || ''}</strong>"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{p:2}}>
          <Button onClick={() => setIsDeleteDialogOpen(false)} sx={{textTransform:'none'}}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" sx={{textTransform:'none'}}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemberBenefits; 