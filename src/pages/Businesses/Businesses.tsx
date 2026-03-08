import { useEffect, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    Chip,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Switch,
    FormControlLabel,
    Stack,
    Avatar,
    Divider,
    useTheme,
    alpha,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tabs,
    Tab,
    ListItemIcon,
    ListItemText,
    Paper
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Star as StarIcon,
    LocationOn as LocationIcon,
    Delete as DeleteIcon,
    Business as BusinessIcon,
    CheckCircle as VerifyIcon,
    Verified as VerifiedIcon,
    CardMembership as SubscriptionIcon,
    TrendingUp as TrendingUpIcon,
    Visibility as VisibilityIcon,
    Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useBusinessQuery } from '../../hooks/useBusinessQuery';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { BusinessDto, BusinessStatus } from '../../types/businesses/businessModel';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import debounce from 'lodash/debounce';
import { ImageUploader } from '../../components/ImageUploader';
import { businessService, GoogleMapsImportResponse } from '../../services/business/businessService';

// Standardized Components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatusChip } from '../../components/Data';
import { FilterBar } from '../../components/Filter';
import { ActionMenu } from '../../components/Actions';

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
        errors.phoneNumber = 'Telefon formatı geçersiz. Örn: +905551112233';
    }

    if (email && !EMAIL_REGEX.test(email.trim())) {
        errors.email = 'Email formatı geçersiz.';
    }

    if (website && !WEBSITE_REGEX.test(website.trim())) {
        errors.website = 'Website formatı geçersiz.';
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

export default function Businesses() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { categories } = useBusinessCategory();
    const businessStore = useBusinessStore();

    // Dialog & Interaction logic
    const [selectedBusiness, setSelectedBusiness] = useState<BusinessDto | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogType, setDialogType] = useState<'details' | 'edit' | 'feature'>('details');
    const [editedBusiness, setEditedBusiness] = useState<Partial<BusinessDto> | null>(null);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [openHardDeleteDialog, setOpenHardDeleteDialog] = useState(false);
    const [businessToHardDelete, setBusinessToHardDelete] = useState<string | null>(null);
    const [durationInDays, setDurationInDays] = useState<number>(30);
    const [featuredRadiusInKm, setFeaturedRadiusInKm] = useState<number>(10);
    const [openGoogleImportDialog, setOpenGoogleImportDialog] = useState(false);
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [googleImportLoading, setGoogleImportLoading] = useState(false);
    const [googleImportResult, setGoogleImportResult] = useState<GoogleMapsImportResponse | null>(null);
    const [googleImportError, setGoogleImportError] = useState<string | null>(null);

    // UI States
    const [page, setPage] = useState(1);
    const [searchKeyword, setSearchKeyword] = useState('');

    // Filters
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<BusinessStatus | ''>('');
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [radiusInKm, setRadiusInKm] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'distance' | 'name' | 'recently_added' | ''>('');

    // Query Configuration
    const queryParams = useMemo(() => ({
        page: page - 1,
        size: 10,
        keyword: searchKeyword,
        categoryId: selectedCategory,
        status: selectedStatus || undefined,
        city: selectedCity || undefined,
        featuredOnly,
        radiusInKm: radiusInKm || undefined,
        sortBy: sortBy || undefined,
        includeUnverified: true,
        includeInactive: true
    }), [page, searchKeyword, selectedCategory, selectedStatus, selectedCity, featuredOnly, radiusInKm, sortBy]);

    const resp = useBusinessQuery(queryParams);

    // Handlers
    const debouncedSetSearchKeyword = useMemo(
        () => debounce((value: string) => {
            setSearchKeyword(value);
            setPage(1);
        }, 500),
        []
    );

    // Filter Clears
    const handleClearFilters = useCallback(() => {
        setSelectedCategory('');
        setSelectedStatus('');
        setFeaturedOnly(false);
        setSelectedCity('');
        setRadiusInKm(null);
        setSortBy('');
        // We do not clear keyword, keyword has its own clear button
    }, []);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategory) count++;
        if (selectedStatus) count++;
        if (featuredOnly) count++;
        if (selectedCity) count++;
        if (radiusInKm) count++;
        if (sortBy) count++;
        return count;
    }, [selectedCategory, selectedStatus, featuredOnly, selectedCity, radiusInKm, sortBy]);

    // Local search value for immediate display (controlled by SearchInput's internal state)
    const [localSearchValue, setLocalSearchValue] = useState('');

    const handleSearchChange = useCallback((value: string) => {
        setLocalSearchValue(value);
        debouncedSetSearchKeyword(value);
    }, [debouncedSetSearchKeyword]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handleRefresh = useCallback(() => resp.refetch(), [resp]);

    // Dialog Handlers
    const handleOpenDialog = useCallback((business: BusinessDto, type: 'details' | 'edit' | 'feature') => {
        setSelectedBusiness(business);
        setDialogType(type);
        setOpenDialog(true);
        if (type === 'edit') {
            setEditedBusiness({ ...business });
        }
    }, []);

    const handleCloseDialog = useCallback(() => {
        setOpenDialog(false);
        setSelectedBusiness(null);
        setEditedBusiness(null);
        setProfileImage(null);
        setCoverImage(null);
        setGalleryImages([]);
    }, []);

    const handleTabChange = (_e: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleOpenGoogleImportDialog = () => {
        setGoogleImportError(null);
        setOpenGoogleImportDialog(true);
    };

    const handleCloseGoogleImportDialog = () => {
        setOpenGoogleImportDialog(false);
        setGoogleMapsUrl('');
        setGoogleImportError(null);
        setGoogleImportResult(null);
        setGoogleImportLoading(false);
    };

    const handleImportFromGoogleMaps = async () => {
        if (!googleMapsUrl.trim()) {
            setGoogleImportError('Google Maps linki zorunlu.');
            return;
        }

        try {
            setGoogleImportLoading(true);
            setGoogleImportError(null);
            const response = await businessService.importGoogleMapsBusiness({
                mapsUrl: googleMapsUrl.trim()
            });
            setGoogleImportResult(response.data);
            enqueueSnackbar('Google Maps verisi başarıyla alındı', { variant: 'success' });
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Google Maps import işlemi başarısız oldu.';
            setGoogleImportError(message);
            enqueueSnackbar(message, { variant: 'error' });
        } finally {
            setGoogleImportLoading(false);
        }
    };

    const handleApplyGoogleImportToBusiness = () => {
        if (!googleImportResult) {
            return;
        }

        setEditedBusiness((prev) => {
            if (!prev) {
                return prev;
            }

            const mergedAddress = prev.address
                ? {
                    ...prev.address,
                    description: googleImportResult.formattedAddress || prev.address.description,
                    latitude: googleImportResult.latitude ?? prev.address.latitude,
                    longitude: googleImportResult.longitude ?? prev.address.longitude
                }
                : prev.address;

            const openingHoursText = (googleImportResult.openingHours || []).join('\n');
            const importedDescription = openingHoursText
                ? `Google Maps opening hours:\n${openingHoursText}`
                : undefined;

            return {
                ...prev,
                name: googleImportResult.name || prev.name,
                phoneNumber: googleImportResult.phone || prev.phoneNumber,
                website: googleImportResult.website || prev.website,
                address: mergedAddress,
                shortDescription: googleImportResult.formattedAddress || prev.shortDescription,
                description: prev.description || importedDescription
            };
        });

        enqueueSnackbar('Import edilen bilgiler forma aktarıldı', { variant: 'success' });
        handleCloseGoogleImportDialog();
    };

    const handleInputChange = (field: keyof BusinessDto, value: any) => {
        setEditedBusiness(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Image handlers
    const handleProfileImageSelect = (files: File | File[]) => {
        setProfileImage(Array.isArray(files) ? files[0] : files);
    };

    const handleCoverImageSelect = (files: File | File[]) => {
        setCoverImage(Array.isArray(files) ? files[0] : files);
    };

    // Action Logic
    const handleUpdateBusiness = async () => {
        if (!selectedBusiness || !editedBusiness) return;
        const validationErrors = validateContactFields(
            editedBusiness.phoneNumber,
            editedBusiness.email,
            editedBusiness.website
        );
        if (Object.keys(validationErrors).length > 0) {
            enqueueSnackbar('Lütfen iletişim alanlarındaki hataları düzeltin.', { variant: 'error' });
            return;
        }
        try {
            await businessStore.updateUserBusiness(
                selectedBusiness.ownerId,
                selectedBusiness.id,
                editedBusiness,
                profileImage || undefined,
                coverImage || undefined,
                galleryImages
            );
            enqueueSnackbar('Business updated successfully', { variant: 'success' });
            handleCloseDialog();
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to update business', { variant: 'error' });
        }
    };

    const contactValidationErrors = useMemo(
        () =>
            validateContactFields(
                editedBusiness?.phoneNumber,
                editedBusiness?.email,
                editedBusiness?.website
            ),
        [editedBusiness?.phoneNumber, editedBusiness?.email, editedBusiness?.website]
    );
    const hasContactValidationErrors = Object.keys(contactValidationErrors).length > 0;

    const handleHardDeleteBusiness = useCallback(async (businessId: string) => {
        setBusinessToHardDelete(businessId);
        setOpenHardDeleteDialog(true);
    }, []);

    const confirmHardDelete = useCallback(async () => {
        if (!businessToHardDelete) return;
        try {
            await businessStore.hardDeleteBusiness(businessToHardDelete);
            enqueueSnackbar('Business permanently deleted successfully', { variant: 'success' });
            setOpenHardDeleteDialog(false);
            setBusinessToHardDelete(null);
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to permanently delete business', { variant: 'error' });
        }
    }, [businessToHardDelete, businessStore, enqueueSnackbar, resp]);

    const cancelHardDelete = useCallback(() => {
        setOpenHardDeleteDialog(false);
        setBusinessToHardDelete(null);
    }, []);

    const handleSetGlobalFeatured = async () => {
        if (!selectedBusiness) return;
        try {
            await businessStore.setBusinessAsGloballyFeatured(selectedBusiness.ownerId, selectedBusiness.id, durationInDays);
            enqueueSnackbar('Business set as globally featured successfully', { variant: 'success' });
            handleCloseDialog();
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to set business as globally featured', { variant: 'error' });
        }
    };

    const handleSetLocalFeatured = async () => {
        if (!selectedBusiness) return;
        try {
            await businessStore.setBusinessAsLocallyFeatured(selectedBusiness.ownerId, selectedBusiness.id, durationInDays, featuredRadiusInKm);
            enqueueSnackbar('Business set as locally featured successfully', { variant: 'success' });
            handleCloseDialog();
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to set business as locally featured', { variant: 'error' });
        }
    };

    const handleRemoveFeatured = async () => {
        if (!selectedBusiness) return;
        try {
            await businessStore.removeFeaturedStatus(selectedBusiness.id);
            enqueueSnackbar('Featured status removed successfully', { variant: 'success' });
            handleCloseDialog();
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to remove featured status', { variant: 'error' });
        }
    };

    // Quick Toggles
    const handleToggleVerified = async (e: React.MouseEvent, id: string, current: boolean) => {
        e.stopPropagation();
        try {
            await businessStore.verifyBusiness(id);
            enqueueSnackbar(current ? 'Business unverified' : 'Business verified', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Failed to update verification status', { variant: 'error' });
        }
    };

    const handleToggleSubscription = async (e: React.MouseEvent, business: BusinessDto) => {
        e.stopPropagation();
        try {
            const updated = { ...business, hasSubscriptionSystem: !business.hasSubscriptionSystem };
            await businessStore.updateBusinessFields(business.id, updated);
            enqueueSnackbar(updated.hasSubscriptionSystem ? 'Subscription enabled' : 'Subscription disabled', { variant: 'success' });
            resp.refetch();
        } catch (error) {
            enqueueSnackbar('Failed to update subscription status', { variant: 'error' });
        }
    };

    const renderRating = (rating?: number, count?: number) => {
        if (!rating) return <Typography variant="caption" color="text.secondary">No ratings</Typography>;
        return (
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2" fontWeight="bold">{rating.toFixed(1)}</Typography>
                <Typography variant="caption" color="text.secondary">({count})</Typography>
            </Stack>
        );
    };

    const columns = [
        {
            id: 'business',
            label: 'Business',
            render: (business: BusinessDto) => (
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                        src={business.profileImageUrl}
                        variant="rounded"
                        sx={{ width: 48, height: 48, bgcolor: 'primary.light' }}
                    >
                        {business.name?.[0]?.toUpperCase() || <BusinessIcon />}
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {business.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            {business.categoryName} • {business.address?.city || 'Unknown Location'}
                        </Typography>
                    </Box>
                </Stack>
            )
        },
        {
            id: 'stats',
            label: 'Stats',
            render: (business: BusinessDto) => (
                <Stack spacing={0.5}>
                    {renderRating(business.averageRating, business.totalReviews)}
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Box display="flex" alignItems="center" gap={0.5} title="Views">
                            <VisibilityIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{business.viewCount || 0}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5} title="Favorites">
                            <FavoriteIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{business.favoriteCount || 0}</Typography>
                        </Box>
                    </Stack>
                </Stack>
            )
        },
        {
            id: 'status',
            label: 'Status',
            render: (business: BusinessDto) => (
                <StatusChip status={business.status} />
            )
        },
        {
            id: 'features',
            label: 'Features',
            render: (business: BusinessDto) => (
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title={business.verified ? "Verified Business" : "Not Verified"}>
                        <IconButton
                            size="small"
                            color={business.verified ? "success" : "default"}
                            onClick={(e) => handleToggleVerified(e, business.id, business.verified)}
                            sx={{
                                bgcolor: business.verified ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                                '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.2) }
                            }}
                        >
                            {business.verified ? <VerifiedIcon fontSize="small" /> : <VerifyIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={business.globallyFeatured ? "Globally Featured" : "Not Globally Featured"}>
                        <IconButton
                            size="small"
                            color={business.globallyFeatured ? "primary" : "default"}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(business, 'feature');
                            }}
                            sx={{
                                bgcolor: business.globallyFeatured ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                            }}
                        >
                            <TrendingUpIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={business.locallyFeatured ? "Locally Featured" : "Not Locally Featured"}>
                        <IconButton
                            size="small"
                            color={business.locallyFeatured ? "secondary" : "default"}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(business, 'feature');
                            }}
                            sx={{
                                bgcolor: business.locallyFeatured ? alpha(theme.palette.secondary.main, 0.1) : 'transparent'
                            }}
                        >
                            <LocationIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={business.hasSubscriptionSystem ? "Subscription Active" : "No Subscription"}>
                        <IconButton
                            size="small"
                            color={business.hasSubscriptionSystem ? "info" : "default"}
                            onClick={(e) => handleToggleSubscription(e, business)}
                            sx={{
                                bgcolor: business.hasSubscriptionSystem ? alpha(theme.palette.info.main, 0.1) : 'transparent'
                            }}
                        >
                            <SubscriptionIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )
        },
        {
            id: 'owner',
            label: 'Owner',
            render: (business: BusinessDto) => (
                <Box>
                    <Typography variant="body2">{business.ownerName || 'Unknown'}</Typography>
                    <Typography variant="caption" color="text.secondary">ID: ...{business.ownerId?.slice(-6)}</Typography>
                </Box>
            )
        }
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Businesses"
                subtitle="Manage your partners, subscriptions, and featured listings."
                actions={
                    <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefresh}
                    >
                        Refresh Data
                    </Button>
                }
                breadcrumbs={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Businesses', active: true },
                ]}
            />

            {/* Error States */}
            {resp.isError && (
                <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={handleRefresh}>Retry</Button>}>
                    {String(resp.error)}
                </Alert>
            )}

            <PageSection>
                <FilterBar
                    search={{
                        value: localSearchValue,
                        onChange: handleSearchChange,
                        placeholder: "Search businesses..."
                    }}
                    onClearFilters={handleClearFilters}
                    activeFilterCount={activeFilterCount}
                    filters={
                        <>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={selectedCategory}
                                    label="Category"
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={selectedStatus}
                                    label="Status"
                                    onChange={(e) => setSelectedStatus(e.target.value as BusinessStatus)}
                                >
                                    <MenuItem value="">All Statuses</MenuItem>
                                    <MenuItem value={BusinessStatus.ACTIVE}>Active</MenuItem>
                                    <MenuItem value={BusinessStatus.PENDING}>Pending</MenuItem>
                                    <MenuItem value={BusinessStatus.INACTIVE}>Inactive</MenuItem>
                                    <MenuItem value={BusinessStatus.SUSPENDED}>Suspended</MenuItem>
                                </Select>
                            </FormControl>
                            <Divider orientation="vertical" flexItem variant="middle" />
                            <FormControlLabel
                                control={<Switch size="small" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} />}
                                label={<Typography variant="body2">Featured Only</Typography>}
                            />
                        </>
                    }
                    advancedFilters={
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField fullWidth label="City" size="small" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Sort By</InputLabel>
                                    <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value as any)}>
                                        <MenuItem value="">Default</MenuItem>
                                        <MenuItem value="name">Name (A-Z)</MenuItem>
                                        <MenuItem value="recently_added">Newest First</MenuItem>
                                        <MenuItem value="distance">Nearest</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="Radius (km)"
                                    type="number"
                                    size="small"
                                    value={radiusInKm || ''}
                                    onChange={(e) => setRadiusInKm(e.target.value ? parseFloat(e.target.value) : null)}
                                />
                            </Grid>
                        </Grid>
                    }
                />

                <DataTable
                    columns={columns}
                    data={resp.data || []}
                    loading={resp.isLoading}
                    pagination={{
                        page: page,
                        pageSize: 10,
                        total: resp.totalElements || 0,
                        onPageChange: handlePageChange
                    }}
                    onRowClick={(row) => navigate(`/businesses/${row.id}`)}
                    renderRowActions={(row) => (
                        <ActionMenu>
                            <MenuItem onClick={() => navigate(`/businesses/${row.id}`)}>
                                <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>View Details</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => handleOpenDialog(row, 'edit')}>
                                <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Edit Business</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => handleHardDeleteBusiness(row.id)} sx={{ color: 'error.main' }}>
                                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                                <ListItemText>Delete Permanently</ListItemText>
                            </MenuItem>
                        </ActionMenu>
                    )}
                />
            </PageSection>

            {/* Dialogs */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        height: 'auto',
                        maxHeight: '90vh',
                        borderRadius: 2
                    },
                }}
            >
                <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                    {dialogType === 'details' ? 'Business Details' :
                        dialogType === 'edit' ? 'Edit Business' :
                            'Manage Featured Status'}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selectedBusiness && (
                        <Box>
                            {dialogType === 'details' ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Alert severity="info" icon={<BusinessIcon />}>
                                            Detailed view is best seen on the dedicated business page.
                                        </Alert>
                                    </Grid>
                                    <Grid item xs={12} display="flex" justifyContent="flex-end">
                                        <Button
                                            variant="contained"
                                            onClick={() => navigate(`/businesses/${selectedBusiness.id}`)}
                                        >
                                            Go to Full Details Page
                                        </Button>
                                    </Grid>
                                </Grid>
                            ) : dialogType === 'edit' ? (
                                <>
                                    <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                                        <Tab label="Basic Info" />
                                        <Tab label="Contact" />
                                        <Tab label="Features" />
                                        <Tab label="Images" />
                                    </Tabs>

                                    <TabPanel value={tabValue} index={0}>
                                        <Stack spacing={2}>
                                            <TextField
                                                fullWidth
                                                label="Name"
                                                value={editedBusiness?.name || ''}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Description"
                                                value={editedBusiness?.description || ''}
                                                multiline
                                                rows={4}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                            />
                                        </Stack>
                                    </TabPanel>

                                    <TabPanel value={tabValue} index={1}>
                                        <Stack spacing={2}>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                                                <Button variant="outlined" onClick={handleOpenGoogleImportDialog}>
                                                    Google Maps'ten İçe Aktar
                                                </Button>
                                                <Typography variant="caption" color="text.secondary">
                                                    Bağlantıdan isim, telefon, adres ve website alanları doldurulur.
                                                </Typography>
                                            </Stack>
                                            <TextField
                                                fullWidth
                                                label="Phone"
                                                value={editedBusiness?.phoneNumber || ''}
                                                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                                error={Boolean(contactValidationErrors.phoneNumber)}
                                                helperText={contactValidationErrors.phoneNumber}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Email"
                                                type="email"
                                                value={editedBusiness?.email || ''}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                error={Boolean(contactValidationErrors.email)}
                                                helperText={contactValidationErrors.email}
                                            />
                                            <TextField
                                                fullWidth
                                                label="Website"
                                                value={editedBusiness?.website || ''}
                                                onChange={(e) => handleInputChange('website', e.target.value)}
                                                error={Boolean(contactValidationErrors.website)}
                                                helperText={contactValidationErrors.website}
                                            />
                                        </Stack>
                                    </TabPanel>

                                    <TabPanel value={tabValue} index={2}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={editedBusiness?.hasSubscriptionSystem || false}
                                                    onChange={(e) => handleInputChange('hasSubscriptionSystem', e.target.checked)}
                                                />
                                            }
                                            label="Enable Subscription System"
                                        />
                                    </TabPanel>

                                    <TabPanel value={tabValue} index={3}>
                                        <Stack spacing={3}>
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>Profile Image</Typography>
                                                <ImageUploader onImageSelect={handleProfileImageSelect} currentImage={selectedBusiness.profileImageUrl} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>Cover Image</Typography>
                                                <ImageUploader onImageSelect={handleCoverImageSelect} currentImage={selectedBusiness.coverImageUrl} />
                                            </Box>
                                        </Stack>
                                    </TabPanel>
                                </>
                            ) : (
                                <Stack spacing={3} sx={{ py: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            Current Status
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip
                                                icon={<StarIcon />}
                                                label="Global"
                                                color={selectedBusiness.globallyFeatured ? "primary" : "default"}
                                                variant={selectedBusiness.globallyFeatured ? "filled" : "outlined"}
                                            />
                                            <Chip
                                                icon={<LocationIcon />}
                                                label="Local"
                                                color={selectedBusiness.locallyFeatured ? "secondary" : "default"}
                                                variant={selectedBusiness.locallyFeatured ? "filled" : "outlined"}
                                            />
                                        </Stack>
                                    </Box>

                                    {(selectedBusiness.globallyFeatured || selectedBusiness.locallyFeatured) && (
                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Featured Performance
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">Remaining Days</Typography>
                                                    <Typography variant="h6">{selectedBusiness.remainingFeaturedDays || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">Views</Typography>
                                                    <Typography variant="h6">{selectedBusiness.featuredViewsCount || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">Clicks</Typography>
                                                    <Typography variant="h6">{selectedBusiness.featuredClicksCount || 0}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary">Conversion Rate</Typography>
                                                    <Typography variant="h6">{selectedBusiness.featuredConversionRate ? `${selectedBusiness.featuredConversionRate.toFixed(1)}%` : '0%'}</Typography>
                                                </Grid>
                                            </Grid>
                                            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Start: {selectedBusiness.featuredStartDate ? new Date(selectedBusiness.featuredStartDate).toLocaleDateString() : 'N/A'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    End: {selectedBusiness.featuredEndDate ? new Date(selectedBusiness.featuredEndDate).toLocaleDateString() : 'N/A'}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    )}

                                    <Divider />
                                    
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Set Featured Status
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Duration (days)"
                                                value={durationInDays}
                                                onChange={(e) => setDurationInDays(Number(e.target.value))}
                                                InputProps={{ inputProps: { min: 1 } }}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Radius (km) - Local Only"
                                                value={featuredRadiusInKm}
                                                onChange={(e) => setFeaturedRadiusInKm(Number(e.target.value))}
                                                InputProps={{ inputProps: { min: 1 } }}
                                                size="small"
                                                disabled={selectedBusiness.globallyFeatured && !selectedBusiness.locallyFeatured}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                        {!selectedBusiness.globallyFeatured && (
                                            <Button variant="contained" color="primary" startIcon={<StarIcon />} onClick={handleSetGlobalFeatured} fullWidth>
                                                Globally Featured
                                            </Button>
                                        )}
                                        {!selectedBusiness.locallyFeatured && (
                                            <Button variant="contained" color="secondary" startIcon={<LocationIcon />} onClick={handleSetLocalFeatured} fullWidth>
                                                Locally Featured
                                            </Button>
                                        )}
                                    </Stack>

                                    {(selectedBusiness.globallyFeatured || selectedBusiness.locallyFeatured) && (
                                        <Button variant="outlined" color="error" onClick={handleRemoveFeatured} fullWidth sx={{ mt: 2 }}>
                                            Remove All Featured Status
                                        </Button>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    {dialogType === 'edit' ? (
                        <>
                            <Button onClick={handleCloseDialog}>Cancel</Button>
                            <Button
                                onClick={handleUpdateBusiness}
                                variant="contained"
                                color="primary"
                                disabled={hasContactValidationErrors}
                            >
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleCloseDialog}>Close</Button>
                    )}
                </DialogActions>
            </Dialog>

            <Dialog
                open={openGoogleImportDialog}
                onClose={handleCloseGoogleImportDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Google Maps'ten İşletme Bilgisi Al</DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <Stack spacing={2}>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Google Maps Linki"
                            placeholder="https://maps.google.com/... veya https://share.google/..."
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            disabled={googleImportLoading}
                        />

                        {googleImportError && <Alert severity="error">{googleImportError}</Alert>}

                        {googleImportResult && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Stack spacing={1}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {googleImportResult.name || '-'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {googleImportResult.formattedAddress || 'Adres bulunamadı'}
                                    </Typography>
                                    <Typography variant="body2">
                                        Telefon: {googleImportResult.phone || '-'}
                                    </Typography>
                                    <Typography variant="body2">
                                        Website: {googleImportResult.website || '-'}
                                    </Typography>
                                    <Typography variant="body2">
                                        Place ID: {googleImportResult.placeId || '-'}
                                    </Typography>
                                    {typeof googleImportResult.latitude === 'number' && typeof googleImportResult.longitude === 'number' && (
                                        <Typography variant="body2">
                                            Konum: {googleImportResult.latitude}, {googleImportResult.longitude}
                                        </Typography>
                                    )}
                                    {googleImportResult.openingHours && googleImportResult.openingHours.length > 0 && (
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>Çalışma Saatleri</Typography>
                                            {googleImportResult.openingHours.map((hour) => (
                                                <Typography key={hour} variant="caption" display="block" color="text.secondary">
                                                    {hour}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseGoogleImportDialog} disabled={googleImportLoading}>
                        Kapat
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={handleImportFromGoogleMaps}
                        disabled={googleImportLoading}
                    >
                        {googleImportLoading ? 'Alınıyor...' : 'Bilgileri Çek'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleApplyGoogleImportToBusiness}
                        disabled={!googleImportResult || googleImportLoading}
                    >
                        Forma Uygula
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Hard Delete Dialog */}
            <Dialog open={openHardDeleteDialog} onClose={cancelHardDelete}>
                <DialogTitle>Confirm Permanent Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to permanently delete this business? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelHardDelete}>Cancel</Button>
                    <Button onClick={confirmHardDelete} color="error" variant="contained">Delete Permanently</Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
