import React from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  TextField,
  IconButton,
  Stack,
  Button,
  useTheme,
  Paper,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
  AttachMoney as MoneyIcon,
  ConfirmationNumber as TicketIcon
} from '@mui/icons-material';
import { SeatCategory } from '../../types/tickets/ticketTypes';

// Define the shape of a category configuration
export interface TicketCategoryConfig {
  id: string;
  name: string;
  categoryType: SeatCategory;
  basePrice: number;
  color: string;
  quota?: number;
}

interface CategoryManagerProps {
  categories: TicketCategoryConfig[];
  onChange: (categories: TicketCategoryConfig[]) => void;
}

const PREDEFINED_COLORS = [
  '#FFD700', // Gold/VIP
  '#C0C0C0', // Silver/Premium
  '#4CAF50', // Green/Standard
  '#87CEEB', // Sky/Economy
  '#9C27B0', // Purple/Wheelchair
  '#FF5722', // Deep Orange
  '#E91E63', // Pink
  '#3F51B5', // Indigo
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onChange
}) => {
  const theme = useTheme();

  const handleAddCategory = () => {
    const newCategory: TicketCategoryConfig = {
      id: `cat-${Date.now()}`,
      name: 'New Category',
      categoryType: SeatCategory.STANDARD,
      basePrice: 0,
      color: PREDEFINED_COLORS[categories.length % PREDEFINED_COLORS.length],
      quota: 100
    };
    onChange([...categories, newCategory]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<TicketCategoryConfig>) => {
    onChange(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCategory = (id: string) => {
    onChange(categories.filter(c => c.id !== id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Ticket Categories & Pricing
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleAddCategory}
          size="small"
        >
          Add Category
        </Button>
      </Box>

      <Grid container spacing={3}>
        {categories.map((category) => (
          <Grid item xs={12} md={6} lg={4} key={category.id}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: category.color,
                  boxShadow: `0 4px 12px ${category.color}20`
                }
              }}
            >
              {/* Color Stripe */}
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: 4, 
                  bgcolor: category.color 
                }} 
              />

              <Stack spacing={2} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <TextField
                    variant="standard"
                    placeholder="Category Name"
                    value={category.name}
                    onChange={(e) => handleUpdateCategory(category.id, { name: e.target.value })}
                    InputProps={{
                      disableUnderline: true,
                      style: { fontWeight: 600, fontSize: '1.1rem' }
                    }}
                    fullWidth
                  />
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDeleteCategory(category.id)}
                    sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1 } }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                   <TextField
                    label="Price"
                    type="number"
                    size="small"
                    value={category.basePrice}
                    onChange={(e) => handleUpdateCategory(category.id, { basePrice: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><MoneyIcon fontSize="small"/></InputAdornment>,
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Quota"
                    type="number"
                    size="small"
                    value={category.quota}
                    onChange={(e) => handleUpdateCategory(category.id, { quota: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><TicketIcon fontSize="small"/></InputAdornment>,
                    }}
                    fullWidth
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Color Identifier
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {PREDEFINED_COLORS.map(color => (
                      <Box
                        key={color}
                        onClick={() => handleUpdateCategory(category.id, { color })}
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: category.color === color ? '2px solid #fff' : 'none',
                          boxShadow: category.color === color ? '0 0 0 2px #000' : 'none',
                          transition: 'transform 0.1s',
                          '&:hover': { transform: 'scale(1.2)' }
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
        
        {categories.length === 0 && (
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                color: 'text.secondary'
              }}
            >
              <Typography>No categories defined. Click "Add Category" to start.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
