import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, TextField, Grid, Card, CardContent,
  Avatar, IconButton, MenuItem, Select, FormControl, InputLabel,
  alpha, useTheme, Divider,
} from '@mui/material';
import {
  Save as SaveIcon, ArrowBack as BackIcon, CloudUpload as UploadIcon,
  Close as CloseIcon, Business as BusinessIcon, Person as PersonIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { PageContainer, PageHeader } from '../../components/Page';
import UserSearchAutocomplete from '../../components/UserSearchAutocomplete';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { BusinessStatus } from '../../types/businesses/businessModel';
import type { UserDTO } from '../../types/users/userModel';

export default function BusinessCreate() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { createBusinessAsAdmin, loading } = useBusinessStore();
  const { categories } = useBusinessCategory();

  const [owner, setOwner] = useState<UserDTO | null>(null);
  const [form, setForm] = useState({
    name: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    phoneNumber: '',
    email: '',
    website: '',
    city: '',
    district: '',
    country: 'Türkiye',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const profileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImagePick = (type: 'profile' | 'cover', file: File) => {
    const url = URL.createObjectURL(file);
    if (type === 'profile') { setProfileImage(file); setProfilePreview(url); }
    else { setCoverImage(file); setCoverPreview(url); }
  };

  const handleSubmit = async () => {
    if (!owner) {
      enqueueSnackbar('Lütfen işletme sahibi olacak kullanıcıyı seçin', { variant: 'warning' });
      return;
    }
    if (!form.name.trim()) {
      enqueueSnackbar('İşletme adı zorunludur', { variant: 'warning' });
      return;
    }
    if (!form.categoryId) {
      enqueueSnackbar('Kategori seçimi zorunludur', { variant: 'warning' });
      return;
    }

    try {
      const businessData = {
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        categoryId: form.categoryId,
        phoneNumber: form.phoneNumber || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        status: BusinessStatus.ACTIVE,
        address: {
          id: '',
          city: form.city,
          district: form.district,
          country: form.country,
          isDefault: true,
        },
      };

      await createBusinessAsAdmin(owner.id, businessData, profileImage || undefined, coverImage || undefined);
      enqueueSnackbar(
        `"${form.name}" işletmesi ${owner.firstName || owner.email} adına oluşturuldu`,
        { variant: 'success' },
      );
      navigate('/businesses');
    } catch {
      enqueueSnackbar('İşletme oluşturulamadı', { variant: 'error' });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Yeni İşletme Oluştur"
        subtitle="Bir kullanıcı adına yeni işletme kaydı oluşturun"
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'İşletmeler', href: '/businesses' },
          { label: 'Yeni İşletme' },
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/businesses')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Geri Dön
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Left: Form */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {/* Owner Selection */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                  <PersonIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>İşletme Sahibi</Typography>
                </Stack>
                <UserSearchAutocomplete
                  value={owner}
                  onChange={setOwner}
                  label="Sahip Kullanıcı *"
                  placeholder="Kullanıcı adı veya e-posta ile ara..."
                  helperText="Bu kullanıcı işletmenin sahibi olarak atanacak"
                  required
                />
                {owner && (
                  <Box sx={{
                    mt: 2, p: 1.5, borderRadius: 2,
                    bgcolor: alpha('#10b981', 0.06), border: `1px solid ${alpha('#10b981', 0.15)}`,
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar src={owner.imageUrl} sx={{ width: 36, height: 36, fontSize: 14, bgcolor: alpha('#10b981', 0.15), color: '#10b981' }}>
                        {owner.firstName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {owner.displayName || `${owner.firstName} ${owner.lastName}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{owner.email}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                  <BusinessIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700}>İşletme Bilgileri</Typography>
                </Stack>
                <Stack spacing={2.5}>
                  <TextField
                    label="İşletme Adı *"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Kısa Açıklama"
                    value={form.shortDescription}
                    onChange={(e) => updateForm('shortDescription', e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="Tek cümlelik açıklama"
                  />
                  <TextField
                    label="Detaylı Açıklama"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    rows={4}
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Kategori *</InputLabel>
                    <Select
                      value={form.categoryId}
                      label="Kategori *"
                      onChange={(e) => updateForm('categoryId', e.target.value)}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>

            {/* Contact & Location */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2.5}>İletişim & Konum</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField label="Telefon" value={form.phoneNumber} onChange={(e) => updateForm('phoneNumber', e.target.value)} fullWidth size="small" placeholder="+90 5XX XXX XX XX" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField label="E-posta" value={form.email} onChange={(e) => updateForm('email', e.target.value)} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Web Sitesi" value={form.website} onChange={(e) => updateForm('website', e.target.value)} fullWidth size="small" placeholder="https://" />
                  </Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Ülke" value={form.country} onChange={(e) => updateForm('country', e.target.value)} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Şehir" value={form.city} onChange={(e) => updateForm('city', e.target.value)} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="İlçe" value={form.district} onChange={(e) => updateForm('district', e.target.value)} fullWidth size="small" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right: Images & Actions */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Profile Image */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={2}>Profil Görseli</Typography>
                <input type="file" accept="image/*" ref={profileRef} onChange={(e) => { if (e.target.files?.[0]) handleImagePick('profile', e.target.files[0]); }} style={{ display: 'none' }} />
                {profilePreview ? (
                  <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box component="img" src={profilePreview} sx={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => { setProfileImage(null); setProfilePreview(null); }} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button fullWidth variant="outlined" startIcon={<UploadIcon />} onClick={() => profileRef.current?.click()} sx={{ py: 4, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                    Profil Görseli Yükle
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={2}>Kapak Görseli</Typography>
                <input type="file" accept="image/*" ref={coverRef} onChange={(e) => { if (e.target.files?.[0]) handleImagePick('cover', e.target.files[0]); }} style={{ display: 'none' }} />
                {coverPreview ? (
                  <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                    <Box component="img" src={coverPreview} sx={{ width: '100%', height: 120, objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => { setCoverImage(null); setCoverPreview(null); }} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button fullWidth variant="outlined" startIcon={<UploadIcon />} onClick={() => coverRef.current?.click()} sx={{ py: 3, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}>
                    Kapak Görseli Yükle
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={loading || !owner || !form.name.trim() || !form.categoryId}
              sx={{
                borderRadius: 3, py: 1.5, textTransform: 'none', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 14px 0 rgba(30, 107, 60, 0.39)',
              }}
            >
              {loading ? 'Oluşturuluyor...' : 'İşletmeyi Oluştur'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
