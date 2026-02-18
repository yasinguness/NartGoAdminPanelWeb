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
        return <LoadingState message="Loading event categories..." />;
    }

    if (error) {
        return (
            <PageContainer>
                <ErrorState 
                    title="Failed to Load Categories" 
                    message={error} 
                    onRetry={fetchCategories} 
                />
            </PageContainer>
        );
    }

    const columns = [
        { 
            id: 'name', 
            label: 'Name',
            render: (row: any) => (
                <Box fontWeight={600}>{row.name}</Box>
            )
        },
        { 
            id: 'description', 
            label: 'Description' 
        },
    ];

    return (
        <PageContainer>
            <PageHeader
                title="Event Categories"
                subtitle="Manage categories for events and competitions"
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
                    { label: 'Event Categories', active: true },
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
                            <MenuItem onClick={() => handleOpenDialog(row)} sx={{ color: 'error.main' }}>
                                <ListItemIcon>
                                    <DeleteIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText>Delete</ListItemText>
                            </MenuItem>
                        </ActionMenu>
                    )}
                />
            </PageSection>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editedCategory?.id ? 'Edit Category' : 'Add Category'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ mt: 1 }}>
                        <FormGrid columns={1}>
                            <TextField
                                fullWidth
                                label="Category Name"
                                value={editedCategory?.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Description"
                                value={editedCategory?.description || ''}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                multiline
                                rows={4}
                            />
                        </FormGrid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
                    <Stack direction="row" spacing={1}>
                        {editedCategory?.id && (
                            <Button onClick={handleDelete} color="error" variant="outlined">
                                Delete
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            {editedCategory?.id ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
}
 