import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Avatar,
  FormHelperText,
  Stack,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { FormSection, FormGrid } from '../../components/Form';

interface FederationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: FederationFormValues) => void;
  initialValues?: FederationFormValues;
  isEdit?: boolean;
}

export interface FederationFormValues {
  name: string;
  code: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  establishedDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  logo?: string | File;
  coverImage?: string | File;
  socialMedia: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  code: Yup.string().required('Code is required'),
  description: Yup.string().required('Description is required'),
  contactEmail: Yup.string().email('Invalid email').required('Email is required'),
  contactPhone: Yup.string().required('Phone number is required'),
  address: Yup.string().required('Address is required'),
  website: Yup.string().url('Invalid URL').required('Website is required'),
  establishedDate: Yup.date().required('Established date is required'),
  status: Yup.string().required('Status is required'),
  socialMedia: Yup.object({
    facebook: Yup.string().url('Invalid URL'),
    twitter: Yup.string().url('Invalid URL'),
    instagram: Yup.string().url('Invalid URL'),
  }),
});

const initialFormValues: FederationFormValues = {
  name: '',
  code: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  website: '',
  establishedDate: '',
  status: 'PENDING',
  socialMedia: {
    facebook: '',
    twitter: '',
    instagram: '',
  },
};

const FederationForm: React.FC<FederationFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isEdit = false,
}) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const formik = useFormik<FederationFormValues>({
    initialValues: initialValues || initialFormValues,
    validationSchema,
    onSubmit: (values: FederationFormValues) => {
      onSubmit(values);
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      formik.setFieldValue('logo', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      formik.setFieldValue('coverImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getLogoSource = () => {
    if (typeof initialValues?.logo === 'string') {
      return initialValues.logo;
    }
    return logoPreview || undefined;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            {isEdit ? 'Edit Federation' : 'Create New Federation'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Branding Section */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
                Branding & Visuals
              </Typography>
              <Grid container spacing={3} mt={0.5}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      src={getLogoSource()}
                      sx={{ width: 100, height: 100, mx: 'auto', mb: 2, border: '2px solid', borderColor: 'divider' }}
                    >
                      {formik.values.name?.charAt(0) || 'F'}
                    </Avatar>
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                    >
                      Upload Logo
                      <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Box
                    sx={{
                      height: 130,
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {(coverPreview || (typeof initialValues?.coverImage === 'string' && initialValues.coverImage)) && (
                      <Box
                        component="img"
                        src={coverPreview || (initialValues?.coverImage as string)}
                        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }}
                      />
                    )}
                    <Button
                      variant="outlined"
                      component="label"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      sx={{ position: 'relative', zIndex: 1 }}
                    >
                      Upload Cover Image
                      <input type="file" hidden accept="image/*" onChange={handleCoverChange} />
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Basic Information */}
            <FormSection title="Basic Information">
              <FormGrid>
                <TextField
                  fullWidth
                  label="Federation Name"
                  name="name"
                  placeholder="e.g. National Soccer Federation"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
                <TextField
                  fullWidth
                  label="Federation Code"
                  name="code"
                  placeholder="e.g. NSF"
                  value={formik.values.code}
                  onChange={formik.handleChange}
                  error={formik.touched.code && Boolean(formik.errors.code)}
                  helperText={formik.touched.code && formik.errors.code}
                />
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    multiline
                    rows={3}
                    placeholder="Tell us about the federation..."
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                  />
                </Grid>
              </FormGrid>
            </FormSection>

            <FormSection title="Contact & Location">
              <FormGrid>
                <TextField
                  fullWidth
                  label="Contact Email"
                  name="contactEmail"
                  value={formik.values.contactEmail}
                  onChange={formik.handleChange}
                  error={formik.touched.contactEmail && Boolean(formik.errors.contactEmail)}
                  helperText={formik.touched.contactEmail && formik.errors.contactEmail}
                />
                <TextField
                  fullWidth
                  label="Contact Phone"
                  name="contactPhone"
                  value={formik.values.contactPhone}
                  onChange={formik.handleChange}
                  error={formik.touched.contactPhone && Boolean(formik.errors.contactPhone)}
                  helperText={formik.touched.contactPhone && formik.errors.contactPhone}
                />
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Full Address"
                    name="address"
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    error={formik.touched.address && Boolean(formik.errors.address)}
                    helperText={formik.touched.address && formik.errors.address}
                  />
                </Grid>
              </FormGrid>
            </FormSection>

            <FormSection title="Organization Details">
              <FormGrid>
                <TextField
                  fullWidth
                  label="Website URL"
                  name="website"
                  placeholder="https://example.com"
                  value={formik.values.website}
                  onChange={formik.handleChange}
                  error={formik.touched.website && Boolean(formik.errors.website)}
                  helperText={formik.touched.website && formik.errors.website}
                />
                <TextField
                  fullWidth
                  label="Established Date"
                  name="establishedDate"
                  type="date"
                  value={formik.values.establishedDate}
                  onChange={formik.handleChange}
                  error={formik.touched.establishedDate && Boolean(formik.errors.establishedDate)}
                  helperText={formik.touched.establishedDate && formik.errors.establishedDate}
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
                  <InputLabel>Operational Status</InputLabel>
                  <Select
                    name="status"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    label="Operational Status"
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                  </Select>
                  {formik.touched.status && formik.errors.status && (
                    <FormHelperText>{formik.errors.status}</FormHelperText>
                  )}
                </FormControl>
              </FormGrid>
            </FormSection>

            <FormSection title="Social Presence">
              <FormGrid>
                <TextField
                  fullWidth
                  label="Facebook"
                  name="socialMedia.facebook"
                  value={formik.values.socialMedia.facebook}
                  onChange={formik.handleChange}
                  error={formik.touched.socialMedia?.facebook && Boolean(formik.errors.socialMedia?.facebook)}
                  helperText={formik.touched.socialMedia?.facebook && formik.errors.socialMedia?.facebook}
                />
                <TextField
                  fullWidth
                  label="Twitter (X)"
                  name="socialMedia.twitter"
                  value={formik.values.socialMedia.twitter}
                  onChange={formik.handleChange}
                  error={formik.touched.socialMedia?.twitter && Boolean(formik.errors.socialMedia?.twitter)}
                  helperText={formik.touched.socialMedia?.twitter && formik.errors.socialMedia?.twitter}
                />
                <TextField
                  fullWidth
                  label="Instagram"
                  name="socialMedia.instagram"
                  value={formik.values.socialMedia.instagram}
                  onChange={formik.handleChange}
                  error={formik.touched.socialMedia?.instagram && Boolean(formik.errors.socialMedia?.instagram)}
                  helperText={formik.touched.socialMedia?.instagram && formik.errors.socialMedia?.instagram}
                />
              </FormGrid>
            </FormSection>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, px: 4 }}>
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formik.isSubmitting}
            sx={{ px: 4 }}
          >
            {isEdit ? 'Save Changes' : 'Create Federation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FederationForm;
 