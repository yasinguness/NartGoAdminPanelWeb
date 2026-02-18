import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Box,
    Grid,
    IconButton,
    InputAdornment,
    Typography,
} from '@mui/material';
import * as Icons from '@mui/icons-material';
import { Search as SearchIcon } from '@mui/icons-material';
import { SvgIconComponent } from '@mui/icons-material';

interface IconPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (iconName: string) => void;
    currentIcon?: string;
}

export const IconPicker = ({ open, onClose, onSelect, currentIcon }: IconPickerProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredIcons, setFilteredIcons] = useState<string[]>([]);

    useEffect(() => {
        // Tüm Material Icons'u al ve filtrele
        const allIcons = Object.keys(Icons).filter(
            (icon) => icon !== 'default' && icon !== 'Search'
        );
        setFilteredIcons(allIcons);
    }, []);

    useEffect(() => {
        // Arama terimine göre ikonları filtrele
        const filtered = Object.keys(Icons).filter(
            (icon) =>
                icon !== 'default' &&
                icon !== 'Search' &&
                icon.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredIcons(filtered);
    }, [searchTerm]);

    const handleIconClick = (iconName: string) => {
        onSelect(iconName);
        onClose();
    };

    const getIconComponent = (iconName: string): SvgIconComponent | null => {
        const IconComponent = (Icons as Record<string, SvgIconComponent>)[iconName];
        return IconComponent || null;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    height: '80vh',
                    maxHeight: '800px',
                },
            }}
        >
            <DialogTitle>
                <Typography variant="h6" component="div">
                    Icon Seçici
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="İkon ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        height: 'calc(100% - 80px)',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#888',
                            borderRadius: '4px',
                            '&:hover': {
                                background: '#555',
                            },
                        },
                    }}
                >
                    <Grid container spacing={1}>
                        {filteredIcons.map((iconName) => {
                            const IconComponent = getIconComponent(iconName);
                            if (!IconComponent) return null;

                            return (
                                <Grid item xs={4} sm={3} md={2} key={iconName}>
                                    <IconButton
                                        onClick={() => handleIconClick(iconName)}
                                        sx={{
                                            width: '100%',
                                            height: '80px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5,
                                            border: currentIcon === iconName ? '2px solid' : 'none',
                                            borderColor: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: 'primary.light',
                                                color: 'primary.contrastText',
                                            },
                                        }}
                                    >
                                        <IconComponent />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.7rem',
                                                textAlign: 'center',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {iconName}
                                        </Typography>
                                    </IconButton>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            </DialogContent>
        </Dialog>
    );
}; 