import {
    Box,
    Paper,
    Typography,
    TextField,
    FormControl,
    Select,
    MenuItem,
    Badge,
    Avatar,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import {
    Search as SearchIcon,
    Notifications as NotificationsIcon,
    ViewModule as ViewModuleIcon,
    ViewList as ViewListIcon
} from '@mui/icons-material';
import { NotificationPriority } from '../../../types/notifications/notificationModel';

interface FilterBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterPriority: NotificationPriority | 'all';
    setFilterPriority: (priority: NotificationPriority | 'all') => void;
    viewMode: 'table' | 'cards';
    setViewMode: (mode: 'table' | 'cards') => void;
    unreadCount: number;
}

export default function FilterBar({
    searchTerm,
    setSearchTerm,
    filterPriority,
    setFilterPriority,
    viewMode,
    setViewMode,
    unreadCount
}: FilterBarProps) {
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 3, 
                mb: 3, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Bildirim Merkezi
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                        Kullanıcılarınıza bildirim yönetin ve gönderin
                    </Typography>
                </Box>
                <Badge badgeContent={unreadCount} color="error" max={99}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                        <NotificationsIcon fontSize="large" />
                    </Avatar>
                </Badge>
            </Box>
            
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <TextField
                    placeholder="Bildirim ara..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                        sx: { 
                            bgcolor: 'rgba(0,0,0,0.10)', 
                            borderRadius: 2,
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255,255,255,0.3)'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255,255,255,0.5)'
                            }
                        }
                    }}
                    sx={{ minWidth: 250 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value as NotificationPriority | 'all')}
                        displayEmpty
                        sx={{ 
                            bgcolor: 'rgba(0,0,0,0.10)', 
                            borderRadius: 2,
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255,255,255,0.3)'
                            }
                        }}
                    >
                        <MenuItem value="all">Tüm Öncelikler</MenuItem>
                        <MenuItem value={NotificationPriority.LOW}>Düşük</MenuItem>
                        <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                        <MenuItem value={NotificationPriority.HIGH}>Yüksek</MenuItem>
                        <MenuItem value={NotificationPriority.URGENT}>Acil</MenuItem>
                    </Select>
                </FormControl>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                    size="small"
                    sx={{ 
                        '& .MuiToggleButton-root': { 
                            color: 'rgba(255,255,255,0.7)',
                            borderColor: 'rgba(255,255,255,0.3)',
                            '&.Mui-selected': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.3)'
                                }
                            },
                            '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.08)'
                            }
                        }
                    }}
                >
                    <ToggleButton value="cards" aria-label="card view">
                        <ViewModuleIcon />
                    </ToggleButton>
                    <ToggleButton value="table" aria-label="table view">
                        <ViewListIcon />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        </Paper>
    );
}
