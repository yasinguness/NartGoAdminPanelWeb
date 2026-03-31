import { useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Stack
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useEventCategories } from '../../hooks/useEventCategories';

// Import standardized components
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable } from '../../components/Data';
import { LoadingState, ErrorState } from '../../components/Feedback';
import { ActionButton, ActionMenu } from '../../components/Actions';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { FormGrid } from '../../components/Form';

export default function EventCategories() {
    const {
        categories,
        loading,
        error,
        openDialog,
        editedCategory,
        fetchCategories,
        handleOpenDialog,
        handleCloseDialog,
        handleInputChange,
        handleSave,
        handleDelete,
    } = useEventCategories();

    useEffect(() => {
        fetchCategories();
    }, []);

    if (loading) {
        return <LoadingState message="Etkinlik kategorileri yükleniyor..." />;
    }

    if (error) {
        return (
            <PageContainer>
                <ErrorState
                    title="Kategoriler Yüklenemedi"
                    message={error} 
                    onRetry={fetchCategories} 
                />
            </PageContainer>
        );
    }

    const columns = [
        { 
            id: 'name', 
            label: 'Ad',
            render: (row: any) => (
                <Box fontWeight={600}>{row.name}</Box>
            )
        },
        { 
            id: 'description', 
            label: 'Açıklama'
        },
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Etkinlik Kategorileri"
                subtitle="Etkinlik ve yarışma kategorilerini yönetin"
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
                    { label: 'Etkinlik Kategorileri', active: true },
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
                            <MenuItem onClick={() => handleOpenDialog(row)} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <DeleteIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText>Sil</ListItemText>
                            </MenuItem>
                        </ActionMenu>
                    )}
                />
            </PageSection>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editedCategory?.id ? 'Kategoriyi Düzenle' : 'Kategori Ekle'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ mt: 1 }}>
                        <FormGrid columns={1}>
                            <TextField
                                fullWidth
                                label="Kategori Adı"
                                value={editedCategory?.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Açıklama"
                                value={editedCategory?.description || ''}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                multiline
                                rows={4}
                            />
                        </FormGrid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={handleCloseDialog} color="inherit">İptal</Button>
                    <Stack direction="row" spacing={1}>
                        {editedCategory?.id && (
                            <Button onClick={handleDelete} color="error" variant="outlined">
                                Sil
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            {editedCategory?.id ? 'Değişiklikleri Kaydet' : 'Kategori Oluştur'}
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
 