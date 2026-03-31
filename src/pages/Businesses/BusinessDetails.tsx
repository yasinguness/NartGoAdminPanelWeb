import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Stack,
    Avatar,
    Button,
    Grid,
    Divider,
    TextField,
    FormControlLabel,
    Switch,
    CircularProgress,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardMedia,
    IconButton,
    Alert,
    useTheme,
    alpha,
    InputAdornment
} from '@mui/material';
import {
    ArrowBack,
    Save as SaveIcon,
    Star as StarIcon,
    LocationOn as LocationIcon,
    CheckCircle as VerifyIcon,
    Verified as VerifiedIcon,
    Business as BusinessIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Language as WebIcon,
    Map as MapIcon,
    TrendingUp as TrendingUpIcon,
    Visibility as VisibilityIcon,
    Favorite as FavoriteIcon,
    PhotoCamera as PhotoIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useBusinessDetails } from '../../hooks/useBusinessDetails';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { BusinessDto } from '../../types/businesses/businessModel';
import { ImageUploader } from '../../components/ImageUploader';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const WEBSITE_REGEX = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?$/;

interface ContactValidationErrors {
    phoneNumber?: string;
    email?: string;
    website?: string;
}

const validateContactFields = (
    phoneNumber?: string,
    email?: string,
    website?: string
): ContactValidationErrors => {
    const errors: ContactValidationErrors = {};

    if (phoneNumber && !PHONE_REGEX.test(phoneNumber.trim())) {
        errors.phoneNumber = 'Geçersiz telefon formatı. Örnek: +905551112233';
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
        errors.email = 'Geçersiz e-posta formatı.';
    }

    if (website && !WEBSITE_REGEX.test(website.trim())) {
        errors.website = 'Geçersiz web sitesi formatı.';
    }

    return errors;
};

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`business-tabpanel-${index}`}
            aria-labelledby={`business-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function BusinessDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const businessStore = useBusinessStore();

    // Fetch Data
    const { data: business, isLoading, isError, refetch } = useBusinessDetails(id);

    // Local State
    const [tabValue, setTabValue] = useState(0);
    const [edited, setEdited] = useState<Partial<BusinessDto>>({});
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    
    // Feature Config State
    const [durationInDays, setDurationInDays] = useState<number>(30);
    const [featuredRadiusInKm, setFeaturedRadiusInKm] = useState<number>(10);
    const [featuredTab, setFeaturedTab] = useState(0);

    // Sync edited state when business loads
    useEffect(() => {
        if (business) {
            setEdited({});
            setProfileImage(null);
            setCoverImage(null);
            setGalleryImages([]);
        }
    }, [business]);

    const handleTabChange = (_e: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleInputChange = (field: keyof BusinessDto, value: any) => {
        setEdited(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: string, value: any) => {
        setEdited(prev => ({
            ...prev,
            address: {
                ...((prev.address || business?.address) as any),
                [field]: value
            }
        }));
    };

    // Actions
    const handleSave = async () => {
        if (!business) return;
        const validationErrors = validateContactFields(
            edited.phoneNumber ?? business.phoneNumber,
            edited.email ?? business.email,
            edited.website ?? business.website
        );
        if (Object.keys(validationErrors).length > 0) {
            enqueueSnackbar('Kaydetmeden önce iletişim alanı hatalarını düzeltin.', { variant: 'error' });
            return;
        }
        try {
            await businessStore.updateUserBusiness(
                business.ownerId,
                business.id,
                edited,
                profileImage || undefined,
                coverImage || undefined,
                galleryImages
            );
            enqueueSnackbar('İşletme başarıyla güncellendi', { variant: 'success' });
            refetch();
            setEdited({});
        } catch (error) {
            enqueueSnackbar('İşletme güncellenemedi', { variant: 'error' });
        }
    };

    const handleVerify = async () => {
        if (!business) return;
        try {
            await businessStore.verifyBusiness(business.id);
            enqueueSnackbar(business.verified ? 'İşletme doğrulaması kaldırıldı' : 'İşletme doğrulandı', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Durum değiştirilemedi', { variant: 'error' });
        }
    };

    const handleSetGlobalFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.setBusinessAsGloballyFeatured(business.ownerId, business.id, durationInDays);
            enqueueSnackbar('Global öne çıkan olarak ayarlandı', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Global öne çıkarma ayarlanamadı', { variant: 'error' });
        }
    };

    const handleSetLocalFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.setBusinessAsLocallyFeatured(business.ownerId, business.id, durationInDays, featuredRadiusInKm);
            enqueueSnackbar('Yerel öne çıkan olarak ayarlandı', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Yerel öne çıkarma ayarlanamadı', { variant: 'error' });
        }
    };

    const handleRemoveFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.removeFeaturedStatus(business.id);
            enqueueSnackbar('Öne çıkan durumu kaldırıldı', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Öne çıkan durumu kaldırılamadı', { variant: 'error' });
        }
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !business) {
        return (
            <Box p={4}>
                <Alert severity="error">İşletme bulunamadı veya yüklenemedi.</Alert>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/businesses')} sx={{ mt: 2 }}>
                    Listeye Dön
                </Button>
            </Box>
        );
    }

    const contactValidationErrors = validateContactFields(
        edited.phoneNumber ?? business.phoneNumber,
        edited.email ?? business.email,
        edited.website ?? business.website
    );
    const hasContactValidationErrors = Object.keys(contactValidationErrors).length > 0;

    const hasChanges = Object.keys(edited).length > 0 || profileImage || coverImage || galleryImages.length > 0;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button 
                        startIcon={<ArrowBack />} 
                        onClick={() => navigate('/businesses')}
                        color="inherit"
                    >
                        Geri
                    </Button>
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            {business.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            ID: {business.id}
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={2}>
                     <Button 
                        variant="contained" 
                        startIcon={<SaveIcon />}
                        disabled={!hasChanges || hasContactValidationErrors}
                        onClick={handleSave}
                        color="primary"
                    >
                        Değişiklikleri Kaydet
                    </Button>
                </Stack>
            </Stack>

            <Grid container spacing={3}>
                {/* Left Column: Profile Card & Quick Actions */}
                <Grid item xs={12} md={4} lg={3}>
                    <Stack spacing={3}>
                        {/* Profile Card */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                           <Box sx={{ position: 'relative', height: 140, bgcolor: 'grey.200' }}>
                                <CardMedia
                                    component="img"
                                    height="140"
                                    image={coverImage ? URL.createObjectURL(coverImage) : (business.coverImageUrl || '/placeholder-cover.jpg')}
                                    alt="Cover"
                                    sx={{ objectFit: 'cover' }}
                                />
                                <Box 
                                    sx={{ 
                                        position: 'absolute', 
                                        bottom: -40, 
                                        left: 20, 
                                        p: 0.5, 
                                        bgcolor: 'background.paper', 
                                        borderRadius: '50%' 
                                    }}
                                >
                                    <Avatar 
                                        src={profileImage ? URL.createObjectURL(profileImage) : business.profileImageUrl}
                                        sx={{ width: 80, height: 80 }}
                                    >
                                        <BusinessIcon fontSize="large" />
                                    </Avatar>
                                </Box>
                           </Box>
                           <CardContent sx={{ pt: 6 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>
                                    {business.name}
                                </Typography>
                                <Stack direction="row" spacing={1} mb={2}>
                                    <Chip 
                                        label={business.status} 
                                        color={business.status === 'ACTIVE' ? 'success' : 'default'} 
                                        size="small" 
                                        variant="outlined" 
                                    />
                                    {business.verified && <Chip icon={<VerifiedIcon />} label="Doğrulanmış" color="success" size="small" />}
                                </Stack>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Stack spacing={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <StarIcon color="warning" fontSize="small" />
                                        <Typography variant="body2">
                                            {business.averageRating?.toFixed(1) || 'N/A'} ({business.totalReviews || 0} değerlendirme)
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <VisibilityIcon color="action" fontSize="small" />
                                        <Typography variant="body2">{business.viewCount || 0} görüntülenme</Typography>
                                    </Box>
                                     <Box display="flex" alignItems="center" gap={1}>
                                        <FavoriteIcon color="error" fontSize="small" />
                                        <Typography variant="body2">{business.favoriteCount || 0} favori</Typography>
                                    </Box>
                                </Stack>
                           </CardContent>
                        </Card>


                        {/* Featured Actions Card - Refactored */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <CardContent sx={{ p: 0 }}>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                        Öne Çıkarma Yönetimi
                                    </Typography>
                                    <Tabs  
                                        value={featuredTab} 
                                        onChange={(_e, v) => setFeaturedTab(v)} 
                                        variant="fullWidth" 
                                        size="small"
                                        
                                        sx={{ minHeight: 40 }}
                                    >
                                        <Tab 
                                            label="Küresel"
                                            icon={<StarIcon sx={{ fontSize: 18 }} />} 
                                            iconPosition="start"
                                            sx={{ minHeight: 40, py: 1 }}
                                        />
                                        <Tab 
                                            label="Yerel"
                                            icon={<LocationIcon sx={{ fontSize: 18 }} />} 
                                            iconPosition="start" 
                                            sx={{ minHeight: 40, py: 1 }}
                                        />
                                    </Tabs>
                                </Box>

                                {/* GLOBAL TAB */}
                                <TabPanel value={featuredTab} index={0}>
                                    {business.globallyFeatured ? (
                                        <Stack spacing={2} alignItems="center" textAlign="center">
                                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 56, height: 56 }}>
                                                <StarIcon fontSize="large" />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" color="primary.main">Aktif Küresel Öne Çıkarma</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Tüm platformda tanıtılıyor.
                                                </Typography>
                                            </Box>
                                            
                                            <Paper variant="outlined" sx={{ width: '100%', p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                                                <Stack spacing={1}>
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Kalan Gün</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.remainingFeaturedDays || 0} gün</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Bitiş Tarihi</Typography>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {business.featuredEndDate ? new Date(business.featuredEndDate).toLocaleDateString() : 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>

                                            <Button 
                                                fullWidth 
                                                variant="outlined" 
                                                color="error"
                                                onClick={handleRemoveFeatured}
                                            >
                                                Küresel Öne Çıkarmayı İptal Et
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Stack spacing={2}>
                                            <Alert severity="info" sx={{ py: 0 }}>
                                                Küresel öne çıkarma, bu işletmeyi konumdan bağımsız olarak tüm kullanıcılara tanıtır.
                                            </Alert>
                                            <TextField
                                                label="Süre (Gün)"
                                                type="number"
                                                size="small"
                                                value={durationInDays}
                                                onChange={(e) => setDurationInDays(Number(e.target.value))}
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">Gün</InputAdornment>,
                                                }}
                                            />
                                            <Button 
                                                fullWidth 
                                                variant="contained" 
                                                onClick={handleSetGlobalFeatured}
                                                startIcon={<TrendingUpIcon />}
                                            >
                                                Küresel Öne Çıkar
                                            </Button>
                                        </Stack>
                                    )}
                                </TabPanel>

                                {/* LOCAL TAB */}
                                <TabPanel value={featuredTab} index={1}>
                                    {business.locallyFeatured ? (
                                        <Stack spacing={2} alignItems="center" textAlign="center">
                                            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', width: 56, height: 56 }}>
                                                <LocationIcon fontSize="large" />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" color="secondary.main">Aktif Yerel Öne Çıkarma</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>{business.featuredRadiusKm || featuredRadiusInKm} km</strong> içindeki kullanıcılara tanıtılıyor.
                                                </Typography>
                                            </Box>

                                            <Paper variant="outlined" sx={{ width: '100%', p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                                                <Stack spacing={1}>
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Yarıçap</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.featuredRadiusKm} km</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Kalan Gün</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.remainingFeaturedDays || 0} gün</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Bitiş Tarihi</Typography>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {business.featuredEndDate ? new Date(business.featuredEndDate).toLocaleDateString() : 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>

                                            <Button 
                                                fullWidth 
                                                variant="outlined" 
                                                color="error"
                                                onClick={handleRemoveFeatured}
                                            >
                                                Yerel Öne Çıkarmayı İptal Et
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Stack spacing={2}>
                                            <Alert severity="info" sx={{ py: 0 }}>
                                                Yerel öne çıkarma, bu işletmenin yakınındaki kullanıcılar için görünürlüğü artırır.
                                            </Alert>
                                            <TextField
                                                label="Süre (Gün)"
                                                type="number"
                                                size="small"
                                                value={durationInDays}
                                                onChange={(e) => setDurationInDays(Number(e.target.value))}
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">Gün</InputAdornment>,
                                                }}
                                            />
                                            <TextField
                                                label="Yarıçap (Km)"
                                                type="number"
                                                size="small"
                                                value={featuredRadiusInKm}
                                                onChange={(e) => setFeaturedRadiusInKm(Number(e.target.value))}
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">Km</InputAdornment>,
                                                }}
                                            />
                                            <Button 
                                                fullWidth 
                                                variant="contained" 
                                                color="secondary"
                                                onClick={handleSetLocalFeatured}
                                                startIcon={<LocationIcon />}
                                            >
                                                Yerel Öne Çıkar
                                            </Button>
                                        </Stack>
                                    )}
                                </TabPanel>
                            </CardContent>
                        </Card>

                         {/* Admin Actions */}
                         <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Admin İşlemleri
                                </Typography>
                                <Stack spacing={1}>
                                    <Button 
                                        fullWidth 
                                        variant={business.verified ? "outlined" : "contained"} 
                                        color={business.verified ? "warning" : "success"}
                                        startIcon={<VerifyIcon />}
                                        onClick={handleVerify}
                                    >
                                        {business.verified ? 'Doğrulamayı Kaldır' : 'İşletmeyi Doğrula'}
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Column: Editing Tabs */}
                <Grid item xs={12} md={8} lg={9}>
                     <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange} 
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                        >
                            <Tab label="Genel Bilgi" icon={<BusinessIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Konum" icon={<MapIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="İletişim" icon={<PhoneIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Görseller" icon={<PhotoIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Ayarlar" icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>

                        {/* TAB 0: General Info */}
                        <TabPanel value={tabValue} index={0}>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="İşletme Adı"
                                        value={edited.name ?? business.name ?? ''}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Kısa Açıklama"
                                        multiline
                                        rows={2}
                                        value={edited.shortDescription ?? business.shortDescription ?? ''}
                                        onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                                        helperText="Kartlarda ve listelerde kullanılan kısa özet"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Detaylı Açıklama"
                                        multiline
                                        rows={6}
                                        value={edited.description ?? business.description ?? ''}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        {/* TAB 1: Location */}
                        <TabPanel value={tabValue} index={1}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Sokak Adresi"
                                        value={edited.address?.street ?? business.address?.street ?? ''}
                                        onChange={(e) => handleAddressChange('street', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="İlçe / Mahalle"
                                        value={edited.address?.district ?? business.address?.district ?? ''}
                                        onChange={(e) => handleAddressChange('district', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Şehir"
                                        value={edited.address?.city ?? business.address?.city ?? ''}
                                        onChange={(e) => handleAddressChange('city', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Posta Kodu"
                                        value={edited.address?.postalCode ?? business.address?.postalCode ?? ''}
                                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Ülke"
                                        value={edited.address?.country ?? business.address?.country ?? ''}
                                        onChange={(e) => handleAddressChange('country', e.target.value)}
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Divider textAlign="left"><Chip label="Koordinatlar" size="small" /></Divider>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Enlem"
                                        value={edited.address?.latitude ?? business.address?.latitude ?? ''}
                                        onChange={(e) => handleAddressChange('latitude', parseFloat(e.target.value))}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">Lat</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Boylam"
                                        value={edited.address?.longitude ?? business.address?.longitude ?? ''}
                                        onChange={(e) => handleAddressChange('longitude', parseFloat(e.target.value))}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">Long</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        {/* TAB 2: Contact */}
                        <TabPanel value={tabValue} index={2}>
                             <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Telefon Numarası"
                                        value={edited.phoneNumber ?? business.phoneNumber ?? ''}
                                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                        error={Boolean(contactValidationErrors.phoneNumber)}
                                        helperText={contactValidationErrors.phoneNumber}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="E-posta Adresi"
                                        type="email"
                                        value={edited.email ?? business.email ?? ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        error={Boolean(contactValidationErrors.email)}
                                        helperText={contactValidationErrors.email}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Web Sitesi URL"
                                        value={edited.website ?? business.website ?? ''}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
                                        error={Boolean(contactValidationErrors.website)}
                                        helperText={contactValidationErrors.website}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><WebIcon color="action" /></InputAdornment>,
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        {/* TAB 3: Images */}
                        <TabPanel value={tabValue} index={3}>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>Profil Görseli</Typography>
                                    <ImageUploader 
                                        onImageSelect={(f) => setProfileImage(Array.isArray(f) ? f[0] : f)} 
                                        currentImage={business.profileImageUrl} 
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>Kapak Görseli</Typography>
                                    <ImageUploader 
                                        onImageSelect={(f) => setCoverImage(Array.isArray(f) ? f[0] : f)} 
                                        currentImage={business.coverImageUrl} 
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>Galeri Görselleri</Typography>
                                    <ImageUploader 
                                        onImageSelect={(f) => setGalleryImages(Array.isArray(f) ? f : [f])} 
                                        currentImage={business.galleryImages?.[0]} 
                                        multiple 
                                    />
                                </Grid>
                            </Grid>
                        </TabPanel>

                        {/* TAB 4: Settings */}
                        <TabPanel value={tabValue} index={4}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="h6" gutterBottom>Sistem Özellikleri</Typography>
                                    <Paper variant="outlined" sx={{ p: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={edited.hasSubscriptionSystem ?? business.hasSubscriptionSystem}
                                                    onChange={(e) => handleInputChange('hasSubscriptionSystem', e.target.checked)}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="subtitle2">Abonelik Sistemini Etkinleştir</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        İşletmenin kullanıcılara abonelik planları sunmasına olanak tanır.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Paper>
                                </Box>

                                <Box>
                                    <Typography variant="h6" gutterBottom>Detaylı Öne Çıkarma İstatistikleri</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Öne Çıkan Görüntülenme"
                                                value={business.featuredViewsCount || 0} 
                                                disabled 
                                                fullWidth 
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Öne Çıkan Tıklanma"
                                                value={business.featuredClicksCount || 0} 
                                                disabled 
                                                fullWidth 
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Dönüşüm Oranı"
                                                value={`${business.featuredConversionRate || 0}%`} 
                                                disabled 
                                                fullWidth 
                                                size="small"
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Stack>
                        </TabPanel>

                     </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
