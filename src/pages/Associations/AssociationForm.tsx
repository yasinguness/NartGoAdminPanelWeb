import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AssociationCreateRequest } from '../../types/association/associationCreateRequest';
import { useAuth } from '../../hooks/useAuth';
import { useAssociationById } from '../../hooks/associations/useAssociations';
import { FormSection, FormGrid } from '../../components/Form';

interface AssociationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AssociationCreateRequest, files: { logo?: File; profileImage?: File; coverImage?: File }) => void;
  isEdit?: boolean;
  associationId?: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  shortDescription: Yup.string(),
  description: Yup.string(),
  taxNumber: Yup.string(),
  website: Yup.string().url('Invalid URL'),
  email: Yup.string().email('Invalid email'),
  phoneNumber: Yup.string(),
  whatsappNumber: Yup.string(),
  membershipFee: Yup.number().min(0, 'Fee must be positive'),
  membershipDurationMonths: Yup.number().min(1, 'Duration must be at least 1 month'),
});

const AssociationForm: React.FC<AssociationFormProps> = ({
  open,
  onClose,
  onSubmit,
  associationId,
  isEdit = false,
}) => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<{ logo?: File; profileImage?: File; coverImage?: File }>({});
  const { data: initialValues } = useAssociationById(associationId);

  const formik = useFormik<AssociationCreateRequest>({
    enableReinitialize: true,
    initialValues: initialValues ? {
      name: initialValues.name,
      ownerId: initialValues.ownerId,
      shortDescription: initialValues.shortDescription || '',
      description: initialValues.description || '',
      taxNumber: initialValues.taxNumber || '',
      website: initialValues.website || '',
      email: initialValues.email || '',
      phoneNumber: initialValues.phoneNumber || '',
      whatsappNumber: initialValues.whatsappNumber || '',
      membershipFee: initialValues.membershipFee || 0,
      membershipDurationMonths: initialValues.membershipDurationMonths || 12,
      hasSubscriptionSystem: initialValues.hasSubscriptionSystem || false,
      logoUrl: initialValues.logoUrl,
      profileImageUrl: initialValues.profileImageUrl,
      coverImageUrl: initialValues.coverImageUrl,
    } : {
      name: '',
      ownerId: currentUser?.id || '',
      shortDescription: '',
      description: '',
      taxNumber: '',
      website: '',
      email: '',
      phoneNumber: '',
      whatsappNumber: '',
      membershipFee: 0,
      membershipDurationMonths: 12,
      hasSubscriptionSystem: false,
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values, files);
    },
  });

  const handleFileChange = (field: 'logo' | 'profileImage' | 'coverImage') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            {isEdit ? 'Edit Association' : 'Create New Association'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Media Section */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                Branding & Visuals
              </Typography>
              <Grid container spacing={2} mt={0.5}>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ height: 100, borderStyle: 'dashed', flexDirection: 'column', gap: 1 }}
                  >
                    <CloudUploadIcon />
                    <Typography variant="caption">
                      {files.logo ? files.logo.name : 'Upload Logo'}
                    </Typography>
                    <input type="file" hidden accept="image/*" onChange={handleFileChange('logo')} />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ height: 100, borderStyle: 'dashed', flexDirection: 'column', gap: 1 }}
                  >
                    <CloudUploadIcon />
                    <Typography variant="caption">
                      {files.profileImage ? files.profileImage.name : 'Profile Image'}
                    </Typography>
                    <input type="file" hidden accept="image/*" onChange={handleFileChange('profileImage')} />
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ height: 100, borderStyle: 'dashed', flexDirection: 'column', gap: 1 }}
                  >
                    <CloudUploadIcon />
                    <Typography variant="caption">
                      {files.coverImage ? files.coverImage.name : 'Cover Image'}
                    </Typography>
                    <input type="file" hidden accept="image/*" onChange={handleFileChange('coverImage')} />
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Basic Information */}
            <FormSection title="Association Details">
              <FormGrid>
                <TextField
                  fullWidth
                  name="name"
                  label="Association Name"
                  placeholder="e.g. Amateur Sports Association"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
                <TextField
                  fullWidth
                  name="taxNumber"
                  label="Tax Number (Optional)"
                  placeholder="Official tax identification"
                  value={formik.values.taxNumber}
                  onChange={formik.handleChange}
                  error={formik.touched.taxNumber && Boolean(formik.errors.taxNumber)}
                  helperText={formik.touched.taxNumber && formik.errors.taxNumber}
                />
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="shortDescription"
                    label="Tagline / Short Description"
                    placeholder="Briefly describe the association"
                    value={formik.values.shortDescription}
                    onChange={formik.handleChange}
                    error={formik.touched.shortDescription && Boolean(formik.errors.shortDescription)}
                    helperText={formik.touched.shortDescription && formik.errors.shortDescription}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    name="description"
                    label="Full Description"
                    placeholder="Detailed information about organization goals, etc."
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                  />
                </Grid>
              </FormGrid>
            </FormSection>

            <FormSection title="Contact Information">
              <FormGrid>
                <TextField
                  fullWidth
                  name="email"
                  label="Public Email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
                <TextField
                  fullWidth
                  name="phoneNumber"
                  label="Phone Number"
                  value={formik.values.phoneNumber}
                  onChange={formik.handleChange}
                  error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                  helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                />
                <TextField
                  fullWidth
                  name="whatsappNumber"
                  label="WhatsApp Number"
                  value={formik.values.whatsappNumber}
                  onChange={formik.handleChange}
                  error={formik.touched.whatsappNumber && Boolean(formik.errors.whatsappNumber)}
                  helperText={formik.touched.whatsappNumber && formik.errors.whatsappNumber}
                />
                <TextField
                  fullWidth
                  name="website"
                  label="Website URL"
                  value={formik.values.website}
                  onChange={formik.handleChange}
                  error={formik.touched.website && Boolean(formik.errors.website)}
                  helperText={formik.touched.website && formik.errors.website}
                />
              </FormGrid>
            </FormSection>

            <FormSection title="Membership Settings">
              <FormGrid>
                <TextField
                  fullWidth
                  name="membershipFee"
                  label="Default Membership Fee"
                  type="number"
                  InputProps={{ startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography> }}
                  value={formik.values.membershipFee}
                  onChange={formik.handleChange}
                  error={formik.touched.membershipFee && Boolean(formik.errors.membershipFee)}
                  helperText={formik.touched.membershipFee && formik.errors.membershipFee}
                />
                <TextField
                  fullWidth
                  name="membershipDurationMonths"
                  label="Membership Duration (Months)"
                  type="number"
                  value={formik.values.membershipDurationMonths}
                  onChange={formik.handleChange}
                  error={formik.touched.membershipDurationMonths && Boolean(formik.errors.membershipDurationMonths)}
                  helperText={formik.touched.membershipDurationMonths && formik.errors.membershipDurationMonths}
                />
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formik.values.hasSubscriptionSystem}
                        onChange={formik.handleChange}
                        name="hasSubscriptionSystem"
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Enable Automated Subscription System</Typography>
                        <Typography variant="caption" color="text.secondary">Members will be automatically billed for cycles</Typography>
                      </Box>
                    }
                  />
                </Grid>
              </FormGrid>
            </FormSection>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, px: 4 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" sx={{ px: 4 }}>
            {isEdit ? 'Save Changes' : 'Create Association'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AssociationForm;
 