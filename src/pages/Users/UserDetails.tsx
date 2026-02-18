import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    TextField,
    Grid,
    Stack,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Avatar,
} from '@mui/material';
import {
    Save as SaveIcon,
    Edit as EditIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useUsers } from '../../hooks/useUsers';
import { UserDTO, UserStatusEnum, AccountType, LanguageDisplayNames } from '../../types/users/userModel';
import { RaceEnum } from '../../types/enums/raceEnum';
import { BusinessType } from '../../types/enums/businessType';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { FormSection, FormGrid } from '../../components/Form';
import { StatusChip } from '../../components/Data';
import { LoadingState, ErrorState } from '../../components/Feedback';

export default function UserDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { getUserAdmin, updateUserAdmin } = useUsers();

    const [user, setUser] = useState<UserDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState<UserDTO | null>(null);

    useEffect(() => {
        if (id) {
            fetchUser();
        }
    }, [id]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await getUserAdmin(id!);
            setUser(response.data);
            setFormData(response.data);
        } catch (error) {
            console.error('Error fetching user:', error);
            enqueueSnackbar('Failed to fetch user details', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setFormData({ ...user! });
        setEditing(true);
    };

    const handleCancel = () => {
        setFormData(user);
        setEditing(false);
    };

    const handleSave = async () => {
        if (!formData) return;

        try {
            setSaving(true);
            await updateUserAdmin({ userId: id!, userData: formData });
            setUser(formData);
            setEditing(false);
            enqueueSnackbar('User updated successfully', { variant: 'success' });
        } catch (error) {
            console.error('Error updating user:', error);
            enqueueSnackbar('Failed to update user', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof UserDTO, value: any) => {
        setFormData((prev: UserDTO | null) => ({ ...prev!, [field]: value }));
    };

    const handleAddressChange = (addressType: 'currentAddress' | 'hometownAddress', field: string, value: any) => {
        setFormData((prev: UserDTO | null) => ({
            ...prev!,
            [addressType]: { ...(prev![addressType] || {}), [field]: value }
        }));
    };

    if (loading) {
        return <LoadingState message="Loading user details..." />;
    }

    if (!user || !formData) {
        return (
            <PageContainer>
                <ErrorState 
                    title="User Not Found" 
                    message="The user you are looking for does not exist or has been removed."
                    onRetry={() => navigate('/users')}
                    
                />
            </PageContainer>
        );
    }

    const displayData = editing ? formData : user;

    const headerActions = editing ? (
        <Stack direction="row" spacing={1}>
            <Button
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                color="inherit"
            >
                Cancel
            </Button>
            <Button
                startIcon={<SaveIcon />}
                onClick={handleSave}
                variant="contained"
                disabled={saving}
            >
                {saving ? 'Saving...' : 'Save Changes'}
            </Button>
        </Stack>
    ) : (
        <Button
            startIcon={<EditIcon />}
            onClick={handleEdit}
            variant="contained"
        >
            Edit User
        </Button>
    );

    return (
        <PageContainer>
            <PageHeader
                title={`${displayData.firstName} ${displayData.lastName}`}
                subtitle={`User ID: ${displayData.email}`}
                onBack={() => navigate('/users')}
                actions={headerActions}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Users', href: '/users' },
                    { label: 'Details', active: true },
                ]}
            />

            <Grid container spacing={3}>
                {/* Profile Overview Sidebar */}
                <Grid item xs={12} md={4}>
                    <PageSection>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                            <Avatar
                                src={displayData.imageUrl}
                                sx={{ 
                                    width: 120, 
                                    height: 120,
                                    border: '4px solid',
                                    borderColor: 'divider',
                                    boxShadow: (theme) => theme.shadows[2]
                                }}
                            >
                                {displayData.firstName.charAt(0)}{displayData.lastName.charAt(0)}
                            </Avatar>
                            
                            <Box textAlign="center">
                                <Typography variant="h5" fontWeight={600} gutterBottom>
                                    {displayData.firstName} {displayData.lastName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {displayData.email}
                                </Typography>
                            </Box>

                            <Stack direction="column" spacing={2} width="100%">
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">Status</Typography>
                                    <StatusChip status={displayData.userStatus} />
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">Account Type</Typography>
                                    <StatusChip 
                                        status={displayData.accountType} 
                                        color={displayData.accountType === AccountType.BUSINESS ? 'secondary' : 'info'}
                                    />
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">Created At</Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {displayData.createdAt ? new Date(displayData.createdAt).toLocaleDateString() : 'N/A'}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                                {displayData.role.map((role) => (
                                    <StatusChip
                                        key={role}
                                        status={role}
                                        label={role}
                                        color={role === 'ADMIN' ? 'primary' : 'default'}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    </PageSection>
                </Grid>

                {/* Detailed Information */}
                <Grid item xs={12} md={8}>
                    <Stack spacing={3}>
                        {/* Personal Info */}
                        <PageSection title="Personal Information">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    value={displayData.firstName}
                                    onChange={(e) => editing && handleChange('firstName', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={displayData.lastName}
                                    onChange={(e) => editing && handleChange('lastName', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    value={displayData.email}
                                    onChange={(e) => editing && handleChange('email', e.target.value)}
                                    disabled={!editing}
                                />
                                <Box display="flex" gap={1}>
                                    <TextField
                                        sx={{ width: '100px' }}
                                        label="Code"
                                        value={displayData.phoneCode || ''}
                                        onChange={(e) => editing && handleChange('phoneCode', e.target.value)}
                                        disabled={!editing}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Phone"
                                        value={displayData.gsmNo}
                                        onChange={(e) => editing && handleChange('gsmNo', e.target.value)}
                                        disabled={!editing}
                                    />
                                </Box>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="Birth Date"
                                        value={displayData.birthDate ? new Date(displayData.birthDate) : null}
                                        onChange={(date) => editing && handleChange('birthDate', date?.toISOString())}
                                        disabled={!editing}
                                        slotProps={{ textField: { fullWidth: true } }}
                                    />
                                </LocalizationProvider>
                                <FormControl fullWidth>
                                    <InputLabel>Race</InputLabel>
                                    <Select
                                        value={displayData.race || ''}
                                        onChange={(e) => editing && handleChange('race', e.target.value)}
                                        disabled={!editing}
                                        label="Race"
                                    >
                                        <MenuItem value="">Not specified</MenuItem>
                                        {Object.values(RaceEnum).map((race) => (
                                            <MenuItem key={race} value={race}>{race}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    fullWidth
                                    label="Family"
                                    value={displayData.family || ''}
                                    onChange={(e) => editing && handleChange('family', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Job"
                                    value={displayData.job || ''}
                                    onChange={(e) => editing && handleChange('job', e.target.value)}
                                    disabled={!editing}
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Language</InputLabel>
                                    <Select
                                        value={displayData.language}
                                        onChange={(e) => editing && handleChange('language', e.target.value)}
                                        disabled={!editing}
                                        label="Language"
                                    >
                                        {Object.entries(LanguageDisplayNames).map(([key, value]) => (
                                            <MenuItem key={key} value={key}>{value}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Box display="flex" alignItems="center">
                                    <StatusChip 
                                        status={displayData.profileIncomplete ? 'pending' : 'active'}
                                        label={displayData.profileIncomplete ? 'Profile Incomplete' : 'Profile Complete'}
                                        showIcon
                                    />
                                </Box>
                            </FormGrid>
                        </PageSection>

                        {/* Business Info */}
                        {displayData.accountType === AccountType.BUSINESS && (
                            <PageSection title="Business Information">
                                <FormGrid>
                                    <TextField
                                        fullWidth
                                        label="Company Name"
                                        value={displayData.companyName || ''}
                                        onChange={(e) => editing && handleChange('companyName', e.target.value)}
                                        disabled={!editing}
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>Business Type</InputLabel>
                                        <Select
                                            value={displayData.businessType || ''}
                                            onChange={(e) => editing && handleChange('businessType', e.target.value)}
                                            disabled={!editing}
                                            label="Business Type"
                                        >
                                            <MenuItem value="">Not specified</MenuItem>
                                            {Object.values(BusinessType).map((type) => (
                                                <MenuItem key={type} value={type}>{type}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </FormGrid>
                            </PageSection>
                        )}

                        {/* Current Address */}
                        <PageSection title="Current Address">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="City"
                                    value={displayData.currentAddress?.city || ''}
                                    onChange={(e) => editing && handleAddressChange('currentAddress', 'city', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="District"
                                    value={displayData.currentAddress?.district || ''}
                                    onChange={(e) => editing && handleAddressChange('currentAddress', 'district', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={displayData.currentAddress?.country || ''}
                                    onChange={(e) => editing && handleAddressChange('currentAddress', 'country', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Postal Code"
                                    value={displayData.currentAddress?.postalCode || ''}
                                    onChange={(e) => editing && handleAddressChange('currentAddress', 'postalCode', e.target.value)}
                                    disabled={!editing}
                                />
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Full Address Description"
                                        value={displayData.currentAddress?.description || ''}
                                        onChange={(e) => editing && handleAddressChange('currentAddress', 'description', e.target.value)}
                                        disabled={!editing}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </FormGrid>
                        </PageSection>

                        {/* Hometown Address */}
                        <PageSection title="Hometown Address">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="City"
                                    value={displayData.hometownAddress?.city || ''}
                                    onChange={(e) => editing && handleAddressChange('hometownAddress', 'city', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="District"
                                    value={displayData.hometownAddress?.district || ''}
                                    onChange={(e) => editing && handleAddressChange('hometownAddress', 'district', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={displayData.hometownAddress?.country || ''}
                                    onChange={(e) => editing && handleAddressChange('hometownAddress', 'country', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Village"
                                    value={displayData.hometownAddress?.village || ''}
                                    onChange={(e) => editing && handleAddressChange('hometownAddress', 'village', e.target.value)}
                                    disabled={!editing}
                                />
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Hometown Description"
                                        value={displayData.hometownAddress?.description || ''}
                                        onChange={(e) => editing && handleAddressChange('hometownAddress', 'description', e.target.value)}
                                        disabled={!editing}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </FormGrid>
                        </PageSection>

                        {/* Additional Info */}
                        <PageSection title="Legacy Location Info">
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="Current City (Legacy)"
                                    value={displayData.currentCity || ''}
                                    onChange={(e) => editing && handleChange('currentCity', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Current District (Legacy)"
                                    value={displayData.currentDistrict || ''}
                                    onChange={(e) => editing && handleChange('currentDistrict', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Hometown City (Legacy)"
                                    value={displayData.hometownCity || ''}
                                    onChange={(e) => editing && handleChange('hometownCity', e.target.value)}
                                    disabled={!editing}
                                />
                                <TextField
                                    fullWidth
                                    label="Hometown Village (Legacy)"
                                    value={displayData.hometownVillage || ''}
                                    onChange={(e) => editing && handleChange('hometownVillage', e.target.value)}
                                    disabled={!editing}
                                />
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Profile Image URL"
                                        value={displayData.imageUrl || ''}
                                        onChange={(e) => editing && handleChange('imageUrl', e.target.value)}
                                        disabled={!editing}
                                    />
                                </Grid>
                            </FormGrid>
                        </PageSection>
                    </Stack>
                </Grid>
            </Grid>
        </PageContainer>
    );
}
