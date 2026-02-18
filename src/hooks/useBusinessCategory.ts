import { useCallback, useEffect } from 'react';
import { useBusinessCategoryStore, BusinessCategory } from '../store/businessCategoryStore';
import { useSnackbar } from 'notistack';

export const useBusinessCategory = () => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    updateActiveStatus,
    getCategoryById,
  } = useBusinessCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = useCallback(
    async (category: Omit<BusinessCategory, 'id'>) => {
      try {
        await createCategory(category);
        enqueueSnackbar('Category created successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to create category', { variant: 'error' });
        throw error;
      }
    },
    [createCategory, enqueueSnackbar]
  );

  const handleUpdateCategory = useCallback(
    async (id: string, category: Omit<BusinessCategory, 'id'>) => {
      try {
        await updateCategory(id, category);
        enqueueSnackbar('Category updated successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to update category', { variant: 'error' });
        throw error;
      }
    },
    [updateCategory, enqueueSnackbar]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await deleteCategory(id);
        enqueueSnackbar('Category deleted successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to delete category', { variant: 'error' });
        throw error;
      }
    },
    [deleteCategory, enqueueSnackbar]
  );

  const handleUpdateActiveStatus = useCallback(
    async (id: string, active: boolean) => {
      try {
        await updateActiveStatus(id, active);
        enqueueSnackbar(
          `Category ${active ? 'activated' : 'deactivated'} successfully`,
          { variant: 'success' }
        );
      } catch (error) {
        enqueueSnackbar('Failed to update category status', { variant: 'error' });
        throw error;
      }
    },
    [updateActiveStatus, enqueueSnackbar]
  );

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    updateActiveStatus: handleUpdateActiveStatus,
    getCategoryById,
  };
}; 