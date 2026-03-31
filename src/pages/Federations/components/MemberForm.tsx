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
  Avatar,
  Typography,
  IconButton,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface MemberFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: MemberFormValues) => void;
  initialValues?: Partial<MemberFormValues>;
  isEdit?: boolean;
}

export interface MemberFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipNumber: string;
  joinDate: string;
  membershipEndDate: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  association: string;
  membershipType: 'BASIC' | 'STANDARD' | 'PREMIUM';
  address: string;
  city: string;
  country: string;
  postalCode: string;
  membershipPrice: number;
  profileImage?: File | string;
}

const validationSchema = Yup.object({
  firstName: Yup.string().required('Ad zorunludur'),
  lastName: Yup.string().required('Soyad zorunludur'),
  email: Yup.string().email('Geçersiz e-posta adresi').required('E-posta zorunludur'),
  phone: Yup.string().required('Telefon numarası zorunludur'),
  membershipNumber: Yup.string().required('Üyelik numarası zorunludur'),
  joinDate: Yup.string().required('Katılım tarihi zorunludur'),
  membershipEndDate: Yup.string().required('Bitiş tarihi zorunludur'),
  status: Yup.string().required('Durum zorunludur'),
  association: Yup.string().required('Dernek zorunludur'),
  membershipType: Yup.string().required('Üyelik türü zorunludur'),
  address: Yup.string().required('Adres zorunludur'),
  city: Yup.string().required('Şehir zorunludur'),
  country: Yup.string().required('Ülke zorunludur'),
  postalCode: Yup.string().required('Posta kodu zorunludur'),
  membershipPrice: Yup.number().required('Üyelik ücreti zorunludur').min(0, 'Ücret pozitif olmalıdır'),
});

const steps = ['Temel Bilgiler', 'Üyelik Detayları', 'İletişim Bilgileri'];

const MemberForm: React.FC<MemberFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isEdit = false,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const formik = useFormik<MemberFormValues>({
    initialValues: {
      firstName: initialValues?.firstName || '',
      lastName: initialValues?.lastName || '',
      email: initialValues?.email || '',
      phone: initialValues?.phone || '',
      membershipNumber: initialValues?.membershipNumber || '',
      joinDate: initialValues?.joinDate || '',
      membershipEndDate: initialValues?.membershipEndDate || '',
      status: initialValues?.status || 'PENDING',
      association: initialValues?.association || '',
      membershipType: initialValues?.membershipType || 'BASIC',
      address: initialValues?.address || '',
      city: initialValues?.city || '',
      country: initialValues?.country || '',
      postalCode: initialValues?.postalCode || '',
      membershipPrice: initialValues?.membershipPrice || 0,
    },
    validationSchema,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      formik.setFieldValue('profileImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getProfileImageSource = () => {
    if (initialValues?.profileImage && typeof initialValues.profileImage === 'string') {
      return initialValues.profileImage;
    }
    return profileImagePreview || undefined;
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = () => {
    formik.handleSubmit();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="firstName"
                label="Ad"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="lastName"
                label="Soyad"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="E-posta"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="phone"
                label="Telefon"
                value={formik.values.phone}
                onChange={formik.handleChange}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="membershipNumber"
                label="Üyelik Numarası"
                value={formik.values.membershipNumber}
                onChange={formik.handleChange}
                error={formik.touched.membershipNumber && Boolean(formik.errors.membershipNumber)}
                helperText={formik.touched.membershipNumber && formik.errors.membershipNumber}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.membershipType && Boolean(formik.errors.membershipType)}>
                <InputLabel>Üyelik Türü</InputLabel>
                <Select
                  name="membershipType"
                  value={formik.values.membershipType}
                  onChange={formik.handleChange}
                  label="Üyelik Türü"
                >
                  <MenuItem value="BASIC">Temel</MenuItem>
                  <MenuItem value="STANDARD">Standart</MenuItem>
                  <MenuItem value="PREMIUM">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="joinDate"
                label="Katılım Tarihi"
                type="date"
                value={formik.values.joinDate}
                onChange={formik.handleChange}
                error={formik.touched.joinDate && Boolean(formik.errors.joinDate)}
                helperText={formik.touched.joinDate && formik.errors.joinDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="membershipEndDate"
                label="Bitiş Tarihi"
                type="date"
                value={formik.values.membershipEndDate}
                onChange={formik.handleChange}
                error={formik.touched.membershipEndDate && Boolean(formik.errors.membershipEndDate)}
                helperText={formik.touched.membershipEndDate && formik.errors.membershipEndDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.status && Boolean(formik.errors.status)}>
                <InputLabel>Durum</InputLabel>
                <Select
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                  label="Durum"
                >
                  <MenuItem value="ACTIVE">Aktif</MenuItem>
                  <MenuItem value="PENDING">Beklemede</MenuItem>
                  <MenuItem value="SUSPENDED">Askıya Alınmış</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="membershipPrice"
                label="Üyelik Ücreti"
                type="number"
                value={formik.values.membershipPrice}
                onChange={formik.handleChange}
                error={formik.touched.membershipPrice && Boolean(formik.errors.membershipPrice)}
                helperText={formik.touched.membershipPrice && formik.errors.membershipPrice}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Adres"
                value={formik.values.address}
                onChange={formik.handleChange}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="city"
                label="Şehir"
                value={formik.values.city}
                onChange={formik.handleChange}
                error={formik.touched.city && Boolean(formik.errors.city)}
                helperText={formik.touched.city && formik.errors.city}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="country"
                label="Ülke"
                value={formik.values.country}
                onChange={formik.handleChange}
                error={formik.touched.country && Boolean(formik.errors.country)}
                helperText={formik.touched.country && formik.errors.country}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="postalCode"
                label="Posta Kodu"
                value={formik.values.postalCode}
                onChange={formik.handleChange}
                error={formik.touched.postalCode && Boolean(formik.errors.postalCode)}
                helperText={formik.touched.postalCode && formik.errors.postalCode}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={formik.touched.association && Boolean(formik.errors.association)}>
                <InputLabel>Dernek</InputLabel>
                <Select
                  name="association"
                  value={formik.values.association}
                  onChange={formik.handleChange}
                  label="Dernek"
                >
                  <MenuItem value="Basketball">Basketball</MenuItem>
                  <MenuItem value="Swimming">Swimming</MenuItem>
                  <MenuItem value="Football">Football</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">{isEdit ? 'Üyeyi Düzenle' : 'Yeni Üye Ekle'}</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, mb: 4 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Geri</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            İleri
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEdit ? 'Güncelle' : 'Oluştur'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MemberForm; 