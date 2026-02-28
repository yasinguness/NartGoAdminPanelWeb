import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Stack, Chip, IconButton, Card, CardContent,
    Grid, Select, MenuItem, TextField, FormControl, InputLabel,
    Tooltip, Divider, alpha, List, ListItem,
    ListItemText, ListItemIcon, Collapse, Paper, Fade, Grow,
} from '@mui/material';
import {
    FilterList as FilterIcon, Add as AddIcon, Delete as DeleteIcon,
    Groups as GroupsIcon, FlashOn as FlashIcon,
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
    PhoneIphone as PlatformIcon,
    LocationCity as CityIcon,
    People as PeopleIcon,
    Email as EmailIconMui,
    Devices as DevicesIcon,
    PersonOff as PersonOffIcon,
    AccessTime as TimeIcon,
    CalendarMonth as CalendarIcon,
    LocationOn as LocationOnIcon,
    Language as LanguageIcon,
    Badge as BadgeIcon,
    Star as StarIcon,
    ToggleOn as ToggleIcon,
    Close as CloseIcon,
    PersonSearch as PersonSearchIcon,
} from '@mui/icons-material';
import {
    SegmentFilter, SegmentFilterType, FilterOperator, AVAILABLE_FILTERS,
    createSegmentFilter,
} from '../../../types/notifications/audience';
import { audienceService } from '../../../services/notification/audienceService';
import UserSelectionDialog from './UserSelectionDialog';

// ─── Icon Map ──────────────────────────────────────────────
const FILTER_ICON_MAP: Record<string, React.ReactElement> = {
    Email: <EmailIconMui fontSize="small" />,
    PhoneIphone: <PlatformIcon fontSize="small" />,
    Devices: <DevicesIcon fontSize="small" />,
    PersonOff: <PersonOffIcon fontSize="small" />,
    AccessTime: <TimeIcon fontSize="small" />,
    CalendarMonth: <CalendarIcon fontSize="small" />,
    LocationCity: <CityIcon fontSize="small" />,
    LocationOn: <LocationOnIcon fontSize="small" />,
    Language: <LanguageIcon fontSize="small" />,
    Badge: <BadgeIcon fontSize="small" />,
    Star: <StarIcon fontSize="small" />,
    ToggleOn: <ToggleIcon fontSize="small" />,
};

const getFilterIcon = (iconName: string) => FILTER_ICON_MAP[iconName] || <FilterIcon fontSize="small" />;

// ─── Operator Labels ──────────────────────────────────────
const OPERATOR_LABELS: Record<FilterOperator, string> = {
    [FilterOperator.EQUALS]: 'Eşittir',
    [FilterOperator.NOT_EQUALS]: 'Eşit Değildir',
    [FilterOperator.GREATER_THAN]: 'Büyüktür',
    [FilterOperator.LESS_THAN]: 'Küçüktür',
    [FilterOperator.IN]: 'İçinde',
    [FilterOperator.CONTAINS]: 'İçerir',
};

// ─── Color palette for filter categories ──────────────────
const CATEGORY_COLORS = {
    device: { main: '#6366f1', light: '#818cf8', bg: '#eef2ff' },
    profile: { main: '#10b981', light: '#34d399', bg: '#ecfdf5' },
};

interface AudienceBuilderProps {
    filters: SegmentFilter[];
    onFiltersChange: (filters: SegmentFilter[]) => void;
    onReachChange: (reach: number) => void;
}

export default function AudienceBuilder({ filters, onFiltersChange, onReachChange }: AudienceBuilderProps) {
    const [estimate, setEstimate] = useState<{ totalEstimatedReach: number; deviceBasedReach: number; profileBasedReach: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['device', 'profile']);

    // User Selection Dialog state
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [activeEmailFilterId, setActiveEmailFilterId] = useState<string | null>(null);

    // Estimate reach when filters change
    useEffect(() => {
        const fetchEstimate = async () => {
            if (filters.length === 0) {
                onReachChange(0);
                setEstimate(null);
                return;
            }
            setLoading(true);
            try {
                const result = await audienceService.estimateReach(filters);
                setEstimate(result);
                onReachChange(result.totalEstimatedReach);
            } catch (error) {
                console.error('Reach estimation error:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchEstimate, 500);
        return () => clearTimeout(timer);
    }, [filters, onReachChange]);

    const addFilter = (type: SegmentFilterType) => {
        const option = AVAILABLE_FILTERS.find(f => f.type === type);
        if (!option) return;
        const newFilter = createSegmentFilter({
            type,
            operator: option.operators[0],
            value: option.valueType === 'number' ? 0 : option.valueType === 'boolean' ? false : '',
        });

        // For USER_EMAIL, immediately open user selection dialog
        if (type === SegmentFilterType.USER_EMAIL) {
            setActiveEmailFilterId(newFilter.id);
            setSelectedUsers([]);
            setUserDialogOpen(true);
        }

        onFiltersChange([...filters, newFilter]);
    };

    const removeFilter = (id: string) => {
        onFiltersChange(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id: string, updates: Partial<SegmentFilter>) => {
        onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
    };

    // Handle user selection complete from dialog
    const handleUserSelectionComplete = (selectedEmails: string[]) => {
        if (activeEmailFilterId && selectedEmails.length > 0) {
            updateFilter(activeEmailFilterId, {
                value: selectedEmails.join(','),
                operator: FilterOperator.IN,
            });
        }
        setActiveEmailFilterId(null);
        setUserDialogOpen(false);
    };

    // Open user picker for an existing email filter
    const openUserPickerForFilter = (filterId: string) => {
        setActiveEmailFilterId(filterId);
        setSelectedUsers([]);
        setUserDialogOpen(true);
    };

    const deviceFilters = AVAILABLE_FILTERS.filter(f => f.category === 'device');
    const profileFilters = AVAILABLE_FILTERS.filter(f => f.category === 'profile');

    // Parse emails from a filter value
    const getEmailsFromFilter = (filter: SegmentFilter): string[] => {
        if (typeof filter.value === 'string' && filter.value.length > 0) {
            return filter.value.split(',').map(e => e.trim()).filter(Boolean);
        }
        return [];
    };

    return (
        <Box sx={{ py: 1 }}>
            <Grid container spacing={3}>
                {/* ─── Left: Filter Picker ──────────────────────── */}
                <Grid item xs={12} md={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{
                            px: 2.5, py: 2,
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: '#fff',
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <AddIcon fontSize="small" />
                                <Typography variant="subtitle2" fontWeight={800} letterSpacing={0.3}>
                                    Filtre Ekle
                                </Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ opacity: 0.8, mt: 0.5, display: 'block' }}>
                                Kullanıcı segmentasyonu için filtre seçin
                            </Typography>
                        </Box>

                        {/* Device Filters Group */}
                        <List disablePadding>
                            <ListItem
                                button
                                onClick={() => toggleGroup('device')}
                                sx={{
                                    py: 1.5, px: 2.5,
                                    bgcolor: alpha(CATEGORY_COLORS.device.main, 0.04),
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: alpha(CATEGORY_COLORS.device.main, 0.08) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <DevicesIcon fontSize="small" sx={{ color: CATEGORY_COLORS.device.main }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Cihaz & Hesap Filtreleri"
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 700, color: CATEGORY_COLORS.device.main }}
                                />
                                <Chip label={deviceFilters.length} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(CATEGORY_COLORS.device.main, 0.1), color: CATEGORY_COLORS.device.main }} />
                                {expandedGroups.includes('device') ? <ExpandLessIcon sx={{ ml: 0.5, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ ml: 0.5, color: 'text.secondary' }} />}
                            </ListItem>
                            <Collapse in={expandedGroups.includes('device')} timeout="auto">
                                <List component="div" disablePadding>
                                    {deviceFilters.map(f => (
                                        <ListItem
                                            key={f.type}
                                            button
                                            sx={{
                                                pl: 3, pr: 2, py: 1,
                                                '&:hover': {
                                                    bgcolor: alpha(CATEGORY_COLORS.device.main, 0.06),
                                                    '& .add-icon': { opacity: 1, transform: 'scale(1)' }
                                                },
                                                transition: 'all 0.15s ease',
                                            }}
                                            onClick={() => addFilter(f.type)}
                                        >
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                {getFilterIcon(f.icon)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={f.label}
                                                secondary={f.description}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { fontSize: '0.65rem' } }}
                                            />
                                            <AddIcon
                                                className="add-icon"
                                                fontSize="small"
                                                sx={{
                                                    color: CATEGORY_COLORS.device.main,
                                                    opacity: 0.3,
                                                    transform: 'scale(0.8)',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>

                            <Divider />

                            {/* Profile Filters Group */}
                            <ListItem
                                button
                                onClick={() => toggleGroup('profile')}
                                sx={{
                                    py: 1.5, px: 2.5,
                                    bgcolor: alpha(CATEGORY_COLORS.profile.main, 0.04),
                                    borderBottom: expandedGroups.includes('profile') ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: alpha(CATEGORY_COLORS.profile.main, 0.08) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <PeopleIcon fontSize="small" sx={{ color: CATEGORY_COLORS.profile.main }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Profil & Konum Filtreleri"
                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 700, color: CATEGORY_COLORS.profile.main }}
                                />
                                <Chip label={profileFilters.length} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(CATEGORY_COLORS.profile.main, 0.1), color: CATEGORY_COLORS.profile.main }} />
                                {expandedGroups.includes('profile') ? <ExpandLessIcon sx={{ ml: 0.5, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ ml: 0.5, color: 'text.secondary' }} />}
                            </ListItem>
                            <Collapse in={expandedGroups.includes('profile')} timeout="auto">
                                <List component="div" disablePadding>
                                    {profileFilters.map(f => (
                                        <ListItem
                                            key={f.type}
                                            button
                                            sx={{
                                                pl: 3, pr: 2, py: 1,
                                                '&:hover': {
                                                    bgcolor: alpha(CATEGORY_COLORS.profile.main, 0.06),
                                                    '& .add-icon': { opacity: 1, transform: 'scale(1)' }
                                                },
                                                transition: 'all 0.15s ease',
                                            }}
                                            onClick={() => addFilter(f.type)}
                                        >
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                {getFilterIcon(f.icon)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={f.label}
                                                secondary={f.description}
                                                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { fontSize: '0.65rem' } }}
                                            />
                                            <AddIcon
                                                className="add-icon"
                                                fontSize="small"
                                                sx={{
                                                    color: CATEGORY_COLORS.profile.main,
                                                    opacity: 0.3,
                                                    transform: 'scale(0.8)',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Collapse>
                        </List>
                    </Paper>

                    {/* ─── Reach Estimate Card ──────────────────── */}
                    <Card
                        elevation={0}
                        sx={{
                            mt: 3,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: alpha('#6366f1', 0.2),
                            background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                                <Box sx={{
                                    p: 1, borderRadius: 2,
                                    bgcolor: alpha('#6366f1', 0.15),
                                    display: 'flex',
                                }}>
                                    <GroupsIcon sx={{ color: '#6366f1' }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800}>Tahmini Erişim</Typography>
                                    <Typography variant="caption" color="text.secondary">Seçili filtrelere göre</Typography>
                                </Box>
                                {loading && (
                                    <FlashIcon className="animate-pulse" sx={{ color: '#f59e0b', ml: 'auto' }} />
                                )}
                            </Stack>

                            <Box sx={{ textAlign: 'center', py: 1 }}>
                                <Typography
                                    variant="h3"
                                    fontWeight={900}
                                    sx={{
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        lineHeight: 1,
                                    }}
                                >
                                    {estimate ? estimate.totalEstimatedReach.toLocaleString() : '0'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Kullanıcı Hedefleniyor
                                </Typography>
                            </Box>

                            {estimate && (
                                <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: alpha('#6366f1', 0.2) }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <DevicesIcon sx={{ fontSize: 14, color: CATEGORY_COLORS.device.main }} />
                                            <Typography variant="caption" color="text.secondary">Cihaz Filtresi</Typography>
                                        </Stack>
                                        <Typography variant="caption" fontWeight={700}>{estimate.deviceBasedReach.toLocaleString()}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <PeopleIcon sx={{ fontSize: 14, color: CATEGORY_COLORS.profile.main }} />
                                            <Typography variant="caption" color="text.secondary">Profil Filtresi</Typography>
                                        </Stack>
                                        <Typography variant="caption" fontWeight={700}>{estimate.profileBasedReach.toLocaleString()}</Typography>
                                    </Stack>
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* ─── Right: Active Filters ────────────────────── */}
                <Grid item xs={12} md={8}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <FilterIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="subtitle1" fontWeight={800}>
                                Aktif Filtreler
                            </Typography>
                            {filters.length > 0 && (
                                <Chip
                                    label={filters.length}
                                    size="small"
                                    color="primary"
                                    sx={{ height: 22, fontWeight: 800, fontSize: '0.7rem' }}
                                />
                            )}
                        </Stack>
                        {filters.length > 0 && (
                            <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => onFiltersChange([])}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Tümünü Temizle
                            </Button>
                        )}
                    </Stack>

                    {filters.length === 0 ? (
                        <Fade in>
                            <Paper
                                elevation={0}
                                sx={{
                                    borderStyle: 'dashed',
                                    border: '2px dashed',
                                    borderColor: alpha('#6366f1', 0.2),
                                    bgcolor: alpha('#6366f1', 0.02),
                                    height: 280,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 4,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: alpha('#6366f1', 0.4),
                                        bgcolor: alpha('#6366f1', 0.04),
                                    }
                                }}
                            >
                                <Box textAlign="center">
                                    <Box sx={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        bgcolor: alpha('#6366f1', 0.08),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        mx: 'auto', mb: 2,
                                    }}>
                                        <FilterIcon sx={{ fontSize: 32, color: alpha('#6366f1', 0.4) }} />
                                    </Box>
                                    <Typography variant="body1" fontWeight={700} color="text.secondary" gutterBottom>
                                        Henüz filtre eklenmedi
                                    </Typography>
                                    <Typography variant="body2" color="text.disabled">
                                        Soldaki listeden filtre ekleyerek kullanıcıları hedefleyin.
                                        <br />
                                        Filtre eklenmezse tüm kullanıcılar hedeflenir.
                                    </Typography>
                                </Box>
                            </Paper>
                        </Fade>
                    ) : (
                        <Stack spacing={2.5}>
                            {filters.map((filter, index) => {
                                const option = AVAILABLE_FILTERS.find(f => f.type === filter.type);
                                if (!option) return null;
                                const isEmailFilter = filter.type === SegmentFilterType.USER_EMAIL;
                                const emails = isEmailFilter ? getEmailsFromFilter(filter) : [];
                                const catColor = CATEGORY_COLORS[option.category];

                                return (
                                    <Grow in key={filter.id} timeout={300 + index * 100}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: 3,
                                                position: 'relative',
                                                overflow: 'visible',
                                                border: '1px solid',
                                                borderColor: alpha(catColor.main, 0.15),
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    borderColor: alpha(catColor.main, 0.4),
                                                    boxShadow: `0 4px 20px ${alpha(catColor.main, 0.08)}`,
                                                }
                                            }}
                                        >
                                            {/* Filter Header Bar */}
                                            <Box sx={{
                                                px: 2, py: 1,
                                                bgcolor: alpha(catColor.main, 0.04),
                                                borderBottom: '1px solid',
                                                borderColor: alpha(catColor.main, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Box sx={{ color: catColor.main, display: 'flex' }}>
                                                        {getFilterIcon(option.icon)}
                                                    </Box>
                                                    <Typography variant="body2" fontWeight={700} sx={{ color: catColor.main }}>
                                                        {option.label}
                                                    </Typography>
                                                    <Chip
                                                        label={option.category === 'device' ? 'Cihaz' : 'Profil'}
                                                        size="small"
                                                        sx={{
                                                            height: 18, fontSize: '0.6rem', fontWeight: 700,
                                                            bgcolor: alpha(catColor.main, 0.1),
                                                            color: catColor.main,
                                                        }}
                                                    />
                                                </Stack>
                                                <Tooltip title="Filtreyi kaldır">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeFilter(filter.id)}
                                                        sx={{
                                                            color: 'text.disabled',
                                                            '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.08) }
                                                        }}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                {isEmailFilter ? (
                                                    /* ─── USER_EMAIL Special UI ─────────── */
                                                    <Box>
                                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                startIcon={<PersonSearchIcon />}
                                                                onClick={() => openUserPickerForFilter(filter.id)}
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    textTransform: 'none',
                                                                    fontWeight: 700,
                                                                    borderColor: alpha(catColor.main, 0.3),
                                                                    color: catColor.main,
                                                                    '&:hover': {
                                                                        borderColor: catColor.main,
                                                                        bgcolor: alpha(catColor.main, 0.04),
                                                                    }
                                                                }}
                                                            >
                                                                Kullanıcı Seç
                                                            </Button>
                                                            {emails.length > 0 && (
                                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                                    {emails.length} kullanıcı seçildi
                                                                </Typography>
                                                            )}
                                                        </Stack>

                                                        {emails.length > 0 ? (
                                                            <Box sx={{
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: 0.75,
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                bgcolor: alpha(catColor.main, 0.03),
                                                                border: '1px solid',
                                                                borderColor: alpha(catColor.main, 0.1),
                                                                maxHeight: 140,
                                                                overflow: 'auto',
                                                            }}>
                                                                {emails.map((email, idx) => (
                                                                    <Chip
                                                                        key={idx}
                                                                        label={email}
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onDelete={() => {
                                                                            const newEmails = emails.filter((_, i) => i !== idx);
                                                                            updateFilter(filter.id, {
                                                                                value: newEmails.join(','),
                                                                            });
                                                                        }}
                                                                        sx={{
                                                                            height: 26,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 600,
                                                                            borderColor: alpha(catColor.main, 0.25),
                                                                            '& .MuiChip-deleteIcon': {
                                                                                fontSize: 14,
                                                                                '&:hover': { color: 'error.main' }
                                                                            }
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        ) : (
                                                            <Paper
                                                                elevation={0}
                                                                sx={{
                                                                    p: 2.5,
                                                                    borderRadius: 2,
                                                                    bgcolor: alpha(catColor.main, 0.02),
                                                                    border: '1px dashed',
                                                                    borderColor: alpha(catColor.main, 0.15),
                                                                    textAlign: 'center',
                                                                }}
                                                            >
                                                                <EmailIconMui sx={{ fontSize: 28, color: alpha(catColor.main, 0.3), mb: 0.5 }} />
                                                                <Typography variant="caption" color="text.disabled" display="block">
                                                                    "Kullanıcı Seç" butonuna tıklayarak kullanıcı listesinden seçim yapın.
                                                                </Typography>
                                                            </Paper>
                                                        )}
                                                    </Box>
                                                ) : (
                                                    /* ─── Standard Filter UI ─────────── */
                                                    <Grid container spacing={2} alignItems="center">
                                                        <Grid item xs={12} sm={5}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel sx={{ fontSize: '0.8rem' }}>Koşul</InputLabel>
                                                                <Select
                                                                    value={filter.operator}
                                                                    label="Koşul"
                                                                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                                                                    sx={{ borderRadius: 2 }}
                                                                >
                                                                    {option.operators.map(op => (
                                                                        <MenuItem key={op} value={op}>
                                                                            {OPERATOR_LABELS[op] || op}
                                                                        </MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                        <Grid item xs={12} sm={7}>
                                                            {option.valueType === 'select' ? (
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel sx={{ fontSize: '0.8rem' }}>Değer</InputLabel>
                                                                    <Select
                                                                        value={filter.value}
                                                                        label="Değer"
                                                                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                                        sx={{ borderRadius: 2 }}
                                                                    >
                                                                        {option.options?.map(opt => (
                                                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            ) : (
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    label="Değer"
                                                                    type={option.valueType === 'number' ? 'number' : 'text'}
                                                                    value={filter.value}
                                                                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                                />
                                                            )}
                                                        </Grid>
                                                    </Grid>
                                                )}
                                            </CardContent>

                                            {/* AND connector between filters */}
                                            {index < filters.length - 1 && (
                                                <Chip
                                                    label="VE"
                                                    size="small"
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: -14,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        zIndex: 1,
                                                        fontWeight: 800,
                                                        fontSize: '0.65rem',
                                                        height: 24,
                                                        bgcolor: 'background.paper',
                                                        border: '2px solid',
                                                        borderColor: alpha('#6366f1', 0.2),
                                                        color: '#6366f1',
                                                    }}
                                                />
                                            )}
                                        </Card>
                                    </Grow>
                                );
                            })}
                        </Stack>
                    )}
                </Grid>
            </Grid>

            {/* ─── User Selection Dialog ──────────────────────── */}
            <UserSelectionDialog
                open={userDialogOpen}
                onClose={() => {
                    setUserDialogOpen(false);
                    // If filter was just added but no users selected, remove it
                    if (activeEmailFilterId) {
                        const filter = filters.find(f => f.id === activeEmailFilterId);
                        if (filter && (!filter.value || filter.value === '')) {
                            removeFilter(activeEmailFilterId);
                        }
                    }
                    setActiveEmailFilterId(null);
                }}
                onSuccess={() => { }}
                selectedUsers={selectedUsers}
                setSelectedUsers={setSelectedUsers}
                onSelectionComplete={handleUserSelectionComplete}
            />
        </Box>
    );
}
