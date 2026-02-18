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
        try {
            await businessStore.updateUserBusiness(
                business.ownerId,
                business.id,
                edited,
                profileImage || undefined,
                coverImage || undefined,
                galleryImages
            );
            enqueueSnackbar('Business updated successfully', { variant: 'success' });
            refetch();
            setEdited({});
        } catch (error) {
            enqueueSnackbar('Failed to update business', { variant: 'error' });
        }
    };

    const handleVerify = async () => {
        if (!business) return;
        try {
            await businessStore.verifyBusiness(business.id);
            enqueueSnackbar(business.verified ? 'Business unverified' : 'Business verified', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Failed to toggle active status', { variant: 'error' });
        }
    };

    const handleSetGlobalFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.setBusinessAsGloballyFeatured(business.ownerId, business.id, durationInDays);
            enqueueSnackbar('Set as globally featured', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Failed to set global feature', { variant: 'error' });
        }
    };

    const handleSetLocalFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.setBusinessAsLocallyFeatured(business.ownerId, business.id, durationInDays, featuredRadiusInKm);
            enqueueSnackbar('Set as locally featured', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Failed to set local feature', { variant: 'error' });
        }
    };

    const handleRemoveFeatured = async () => {
        if (!business) return;
        try {
            await businessStore.removeFeaturedStatus(business.id);
            enqueueSnackbar('Featured status removed', { variant: 'success' });
            refetch();
        } catch (error) {
            enqueueSnackbar('Failed to remove featured status', { variant: 'error' });
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
                <Alert severity="error">Business not found or failed to load.</Alert>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/businesses')} sx={{ mt: 2 }}>
                    Back to List
                </Button>
            </Box>
        );
    }

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
                        Back
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
                        disabled={!hasChanges}
                        onClick={handleSave}
                        color="primary"
                    >
                        Save Changes
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
                                    {business.verified && <Chip icon={<VerifiedIcon />} label="Verified" color="success" size="small" />}
                                </Stack>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Stack spacing={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <StarIcon color="warning" fontSize="small" />
                                        <Typography variant="body2">
                                            {business.averageRating?.toFixed(1) || 'N/A'} ({business.totalReviews || 0} reviews)
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <VisibilityIcon color="action" fontSize="small" />
                                        <Typography variant="body2">{business.viewCount || 0} views</Typography>
                                    </Box>
                                     <Box display="flex" alignItems="center" gap={1}>
                                        <FavoriteIcon color="error" fontSize="small" />
                                        <Typography variant="body2">{business.favoriteCount || 0} favorites</Typography>
                                    </Box>
                                </Stack>
                           </CardContent>
                        </Card>


                        {/* Featured Actions Card - Refactored */}
                        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                            <CardContent sx={{ p: 0 }}>
                                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                        Featured Management
                                    </Typography>
                                    <Tabs  
                                        value={featuredTab} 
                                        onChange={(_e, v) => setFeaturedTab(v)} 
                                        variant="fullWidth" 
                                        size="small"
                                        
                                        sx={{ minHeight: 40 }}
                                    >
                                        <Tab 
                                            label="Global" 
                                            icon={<StarIcon sx={{ fontSize: 18 }} />} 
                                            iconPosition="start"
                                            sx={{ minHeight: 40, py: 1 }}
                                        />
                                        <Tab 
                                            label="Local" 
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
                                                <Typography variant="h6" color="primary.main">Active Global Feature</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Promoted across the entire platform.
                                                </Typography>
                                            </Box>
                                            
                                            <Paper variant="outlined" sx={{ width: '100%', p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                                                <Stack spacing={1}>
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Remaining Days</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.remainingFeaturedDays || 0} days</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">End Date</Typography>
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
                                                Cancel Global Feature
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Stack spacing={2}>
                                            <Alert severity="info" sx={{ py: 0 }}>
                                                Global featuring promotes this business to all users regardless of location.
                                            </Alert>
                                            <TextField
                                                label="Duration (Days)"
                                                type="number"
                                                size="small"
                                                value={durationInDays}
                                                onChange={(e) => setDurationInDays(Number(e.target.value))}
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">Days</InputAdornment>,
                                                }}
                                            />
                                            <Button 
                                                fullWidth 
                                                variant="contained" 
                                                onClick={handleSetGlobalFeatured}
                                                startIcon={<TrendingUpIcon />}
                                            >
                                                Promote Globally
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
                                                <Typography variant="h6" color="secondary.main">Active Local Feature</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Promoted to users within <strong>{business.featuredRadiusKm || featuredRadiusInKm}km</strong>.
                                                </Typography>
                                            </Box>

                                            <Paper variant="outlined" sx={{ width: '100%', p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                                                <Stack spacing={1}>
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Radius</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.featuredRadiusKm} km</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Remaining Days</Typography>
                                                        <Typography variant="body2" fontWeight="bold">{business.remainingFeaturedDays || 0} days</Typography>
                                                    </Box>
                                                    <Divider />
                                                    <Box display="flex" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">End Date</Typography>
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
                                                Cancel Local Feature
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <Stack spacing={2}>
                                            <Alert severity="info" sx={{ py: 0 }}>
                                                Local featuring boosts visibility for users near this business.
                                            </Alert>
                                            <TextField
                                                label="Duration (Days)"
                                                type="number"
                                                size="small"
                                                value={durationInDays}
                                                onChange={(e) => setDurationInDays(Number(e.target.value))}
                                                fullWidth
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">Days</InputAdornment>,
                                                }}
                                            />
                                            <TextField
                                                label="Radius (Km)"
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
                                                Promote Locally
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
                                    Admin Actions
                                </Typography>
                                <Stack spacing={1}>
                                    <Button 
                                        fullWidth 
                                        variant={business.verified ? "outlined" : "contained"} 
                                        color={business.verified ? "warning" : "success"}
                                        startIcon={<VerifyIcon />}
                                        onClick={handleVerify}
                                    >
                                        {business.verified ? 'Revoke Verification' : 'Verify Business'}
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
                            <Tab label="General Info" icon={<BusinessIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Location" icon={<MapIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Contact" icon={<PhoneIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Images" icon={<PhotoIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Settings" icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>

                        {/* TAB 0: General Info */}
                        <TabPanel value={tabValue} index={0}>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Business Name"
                                        value={edited.name ?? business.name ?? ''}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Short Description"
                                        multiline
                                        rows={2}
                                        value={edited.shortDescription ?? business.shortDescription ?? ''}
                                        onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                                        helperText="Brief summary used in cards and lists"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Full Description"
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
                                        label="Street Address"
                                        value={edited.address?.street ?? business.address?.street ?? ''}
                                        onChange={(e) => handleAddressChange('street', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="District / Neighborhood"
                                        value={edited.address?.district ?? business.address?.district ?? ''}
                                        onChange={(e) => handleAddressChange('district', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        value={edited.address?.city ?? business.address?.city ?? ''}
                                        onChange={(e) => handleAddressChange('city', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Zip Code"
                                        value={edited.address?.postalCode ?? business.address?.postalCode ?? ''}
                                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Country"
                                        value={edited.address?.country ?? business.address?.country ?? ''}
                                        onChange={(e) => handleAddressChange('country', e.target.value)}
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Divider textAlign="left"><Chip label="Coordinates" size="small" /></Divider>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Latitude"
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
                                        label="Longitude"
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
                                        label="Phone Number"
                                        value={edited.phoneNumber ?? business.phoneNumber ?? ''}
                                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        value={edited.email ?? business.email ?? ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment>,
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Website URL"
                                        value={edited.website ?? business.website ?? ''}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
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
                                    <Typography variant="subtitle2" gutterBottom>Profile Image</Typography>
                                    <ImageUploader 
                                        onImageSelect={(f) => setProfileImage(Array.isArray(f) ? f[0] : f)} 
                                        currentImage={business.profileImageUrl} 
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>Cover Image</Typography>
                                    <ImageUploader 
                                        onImageSelect={(f) => setCoverImage(Array.isArray(f) ? f[0] : f)} 
                                        currentImage={business.coverImageUrl} 
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>Gallery Images</Typography>
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
                                    <Typography variant="h6" gutterBottom>System Features</Typography>
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
                                                    <Typography variant="subtitle2">Enable Subscription System</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Allows the business to offer subscription plans to users.
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Paper>
                                </Box>

                                <Box>
                                    <Typography variant="h6" gutterBottom>Detailed Featured Stats</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Featured Views" 
                                                value={business.featuredViewsCount || 0} 
                                                disabled 
                                                fullWidth 
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Featured Clicks" 
                                                value={business.featuredClicksCount || 0} 
                                                disabled 
                                                fullWidth 
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField 
                                                label="Conversion Rate" 
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
