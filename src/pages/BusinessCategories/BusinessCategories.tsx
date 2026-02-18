import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { BusinessCategory } from '../../store/businessCategoryStore';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable, StatusChip } from '../../components/Data';
import { LoadingState, ErrorState, ConfirmDialog } from '../../components/Feedback';
import { ActionButton, ActionMenu } from '../../components/Actions';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { FormGrid } from '../../components/Form';

const BusinessCategories = () => {
  const {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    updateActiveStatus,
  } = useBusinessCategory();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BusinessCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconName: '',
    iconColor: '',
    active: true,
    displayOrder: 0,
  });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpenDialog = (category?: BusinessCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        iconName: category.iconName || '',
        iconColor: category.iconColor || '',
        active: category.active,
        displayOrder: category.displayOrder || 0,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        iconName: '',
        iconColor: '',
        active: true,
        displayOrder: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      try {
        await deleteCategory(deleteId);
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  if (loading) {
    return <LoadingState message="Loading categories..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState 
          title="Failed to Load Categories" 
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </PageContainer>
    );
  }

  const columns = [
    { 
      id: 'name', 
      label: 'Name',
      render: (row: BusinessCategory) => (
        <Box fontWeight={600}>{row.name}</Box>
      )
    },
    { id: 'description', label: 'Description' },
    { 
      id: 'businessCount', 
      label: 'Businesses',
      align: 'center' as const,
      render: (row: BusinessCategory) => (
        <StatusChip 
          status={row.businessCount > 0 ? 'active' : 'inactive'} 
          label={String(row.businessCount || 0)}
          color={row.businessCount > 0 ? 'primary' : 'default'}
        />
      )
    },
    { id: 'displayOrder', label: 'Order', align: 'center' as const },
    { 
      id: 'active', 
      label: 'Status',
      render: (row: BusinessCategory) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Switch
            size="small"
            checked={row.active}
            onChange={(e) => updateActiveStatus(row.id, e.target.checked)}
          />
          <StatusChip status={row.active ? 'active' : 'inactive'} />
        </Stack>
      )
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Business Categories"
        subtitle="Manage categories for businesses and organizations"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Category
          </Button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Business Categories', active: true },
        ]}
      />

      <PageSection>
        <DataTable
          columns={columns}
          data={categories}
          renderRowActions={(row) => (
            <ActionMenu>
              <MenuItem onClick={() => handleOpenDialog(row)}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit System Category</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setDeleteId(row.id)} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      {/* Edit/Add Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormGrid>
              <TextField
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Display Order"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Icon Name"
                value={formData.iconName}
                onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                fullWidth
                placeholder="e.g. store, restaurant"
              />
              <TextField
                label="Icon Color"
                value={formData.iconColor}
                onChange={(e) => setFormData({ ...formData, iconColor: e.target.value })}
                fullWidth
                placeholder="e.g. #FF0000"
              />
            </FormGrid>
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Active Status"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCategory ? 'Save Changes' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone and may affect associated businesses."
        severity="error"
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />
    </PageContainer>
  );
};

export default BusinessCategories;