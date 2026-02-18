import { useCallback, useState } from 'react';
import { useEventStore } from '../store/events/eventStore';
import { useSnackbar } from 'notistack';
import { EventCategoryDto } from '../types/events/eventModel';

export const useEventCategories = () => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useEventStore();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategoryDto | null>(null);
  const [editedCategory, setEditedCategory] = useState<Partial<EventCategoryDto> | null>(null);

  const handleOpenDialog = useCallback((category?: EventCategoryDto) => {
    if (category) {
      setSelectedCategory(category);
      setEditedCategory({ ...category });
    } else {
      setSelectedCategory(null);
      setEditedCategory({ name: '', description: '' });
    }
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setSelectedCategory(null);
    setEditedCategory(null);
  }, []);

  const handleInputChange = useCallback((field: keyof EventCategoryDto, value: string) => {
    setEditedCategory(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!editedCategory) return;

    try {
      if (selectedCategory) {
        await updateCategory(selectedCategory.id, editedCategory as EventCategoryDto);
        enqueueSnackbar('Category updated successfully', { variant: 'success' });
      } else {
        await createCategory(editedCategory as EventCategoryDto);
        enqueueSnackbar('Category created successfully', { variant: 'success' });
      }
      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      enqueueSnackbar('Failed to save category', { variant: 'error' });
    }
  }, [selectedCategory, editedCategory, updateCategory, createCategory, fetchCategories, handleCloseDialog, enqueueSnackbar]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;

    try {
      await deleteCategory(selectedCategory.id);
      enqueueSnackbar('Category deleted successfully', { variant: 'success' });
      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      enqueueSnackbar('Failed to delete category', { variant: 'error' });
    }
  }, [selectedCategory, deleteCategory, fetchCategories, handleCloseDialog, enqueueSnackbar]);

  return {
    categories,
    loading,
    error,
    openDialog,
    selectedCategory,
    editedCategory,
    fetchCategories,
    handleOpenDialog,
    handleCloseDialog,
    handleInputChange,
    handleSave,
    handleDelete,
  };
};
