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
    return <LoadingState message="Kategoriler yükleniyor..." />;
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          title="Kategoriler Yüklenemedi"
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </PageContainer>
    );
  }

  const columns = [
    { 
      id: 'name', 
      label: 'Ad',
      render: (row: BusinessCategory) => (
        <Box fontWeight={600}>{row.name}</Box>
      )
    },
    { id: 'description', label: 'Açıklama' },
    { 
      id: 'businessCount', 
      label: 'İşletmeler',
      align: 'center' as const,
      render: (row: BusinessCategory) => (
        <StatusChip 
          status={row.businessCount > 0 ? 'active' : 'inactive'} 
          label={String(row.businessCount || 0)}
          color={row.businessCount > 0 ? 'primary' : 'default'}
        />
      )
    },
    { id: 'displayOrder', label: 'Sıra', align: 'center' as const },
    { 
      id: 'active', 
      label: 'Durum',
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
        title="İşletme Kategorileri"
        subtitle="İşletme ve kuruluş kategorilerini yönetin"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Kategori Ekle
          </Button>
        }
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/' },
          { label: 'İşletme Kategorileri', active: true },
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
                <ListItemText>Kategoriyi Düzenle</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setDeleteId(row.id)} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Sil</ListItemText>
              </MenuItem>
            </ActionMenu>
          )}
        />
      </PageSection>

      {/* Edit/Add Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormGrid>
              <TextField
                label="Kategori Adı"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Görüntüleme Sırası"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="İkon Adı"
                value={formData.iconName}
                onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                fullWidth
                placeholder="e.g. store, restaurant"
              />
              <TextField
                label="İkon Rengi"
                value={formData.iconColor}
                onChange={(e) => setFormData({ ...formData, iconColor: e.target.value })}
                fullWidth
                placeholder="e.g. #FF0000"
              />
            </FormGrid>
            
            <TextField
              label="Açıklama"
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
              label="Aktif Durumu"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} color="inherit">İptal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCategory ? 'Değişiklikleri Kaydet' : 'Kategori Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Kategoriyi Sil"
        message="Bu kategoriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve ilişkili işletmeleri etkileyebilir."
        severity="error"
        confirmLabel="Sil"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteId(null)}
      />
    </PageContainer>
  );
};

export default BusinessCategories;