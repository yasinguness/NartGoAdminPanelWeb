import { api } from '../api';
import { TemplateType, TemplateConfig, getTemplateConfig } from '../../types/notifications/notificationTemplate';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
    statusCode: number;
    statusMessage: string;
}

interface TemplateMetadata {
    id: string;
    name: string;
    description: string;
    type: TemplateType;
    category: string;
    icon: string;
    color: string;
    isActive: boolean;
    usageCount: number;
    lastUsed?: string;
    createdAt: string;
    updatedAt: string;
}

interface TemplateUsage {
    templateId: string;
    templateName: string;
    usageCount: number;
    lastUsed: string;
    successRate: number;
    averageDeliveryTime: number;
}

interface TemplateAnalytics {
    totalTemplates: number;
    activeTemplates: number;
    mostUsedTemplate: TemplateUsage;
    recentUsage: TemplateUsage[];
    deliveryStats: {
        totalSent: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        averageDeliveryTime: number;
    };
}

export const templateManagementService = {
    /**
     * Get all available templates
     */
    getAllTemplates: async (): Promise<TemplateMetadata[]> => {
        try {
            const response = await api.get<ApiResponse<TemplateMetadata[]>>('/notifications/templates');
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw new Error('Şablonlar yüklenirken hata oluştu');
        }
    },

    /**
     * Get template by ID
     */
    getTemplateById: async (templateId: string): Promise<TemplateConfig> => {
        try {
            const response = await api.get<ApiResponse<TemplateConfig>>(`/notifications/templates/${templateId}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw new Error('Şablon yüklenirken hata oluştu');
        }
    },

    /**
     * Create new template
     */
    createTemplate: async (template: Omit<TemplateConfig, 'id'>): Promise<TemplateConfig> => {
        try {
            const response = await api.post<ApiResponse<TemplateConfig>>('/notifications/templates', template);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error creating template:', error);
            throw new Error('Şablon oluşturulurken hata oluştu');
        }
    },

    /**
     * Update existing template
     */
    updateTemplate: async (templateId: string, template: Partial<TemplateConfig>): Promise<TemplateConfig> => {
        try {
            const response = await api.put<ApiResponse<TemplateConfig>>(`/notifications/templates/${templateId}`, template);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error updating template:', error);
            throw new Error('Şablon güncellenirken hata oluştu');
        }
    },

    /**
     * Delete template
     */
    deleteTemplate: async (templateId: string): Promise<void> => {
        try {
            const response = await api.delete<ApiResponse<void>>(`/notifications/templates/${templateId}`);
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            throw new Error('Şablon silinirken hata oluştu');
        }
    },

    /**
     * Activate/Deactivate template
     */
    toggleTemplateStatus: async (templateId: string, isActive: boolean): Promise<void> => {
        try {
            const response = await api.patch<ApiResponse<void>>(`/notifications/templates/${templateId}/status`, {
                isActive
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error toggling template status:', error);
            throw new Error('Şablon durumu güncellenirken hata oluştu');
        }
    },

    /**
     * Get template usage analytics
     */
    getTemplateAnalytics: async (): Promise<TemplateAnalytics> => {
        try {
            const response = await api.get<ApiResponse<TemplateAnalytics>>('/notifications/templates/analytics');
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error fetching template analytics:', error);
            throw new Error('Şablon analitikleri yüklenirken hata oluştu');
        }
    },

    /**
     * Get template usage history
     */
    getTemplateUsageHistory: async (templateId: string, days: number = 30): Promise<TemplateUsage[]> => {
        try {
            const response = await api.get<ApiResponse<TemplateUsage[]>>(`/notifications/templates/${templateId}/usage`, {
                params: { days }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error fetching template usage history:', error);
            throw new Error('Şablon kullanım geçmişi yüklenirken hata oluştu');
        }
    },

    /**
     * Validate template configuration
     */
    validateTemplateConfig: (config: TemplateConfig): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Check required fields
        if (!config.templateId) {
            errors.push('Template ID gereklidir');
        }

        if (!config.fields || config.fields.length === 0) {
            errors.push('En az bir alan tanımlanmalıdır');
        }

        if (!config.previewTemplate) {
            errors.push('Önizleme şablonu gereklidir');
        }

        // Validate fields
        config.fields?.forEach((field, index) => {
            if (!field.key) {
                errors.push(`Alan ${index + 1}: Anahtar gereklidir`);
            }

            if (!field.label) {
                errors.push(`Alan ${index + 1}: Etiket gereklidir`);
            }

            if (field.type === 'select' && (!field.options || field.options.length === 0)) {
                errors.push(`Alan ${field.key}: Seçenekler gereklidir`);
            }

            if (field.dependsOn && !config.fields?.find(f => f.key === field.dependsOn)) {
                errors.push(`Alan ${field.key}: Bağımlı olduğu alan bulunamadı: ${field.dependsOn}`);
            }
        });

        // Check for circular dependencies
        const checkCircularDependency = (fieldKey: string, visited: Set<string> = new Set()): boolean => {
            if (visited.has(fieldKey)) {
                return true;
            }

            const field = config.fields?.find(f => f.key === fieldKey);
            if (!field?.dependsOn) {
                return false;
            }

            visited.add(fieldKey);
            return checkCircularDependency(field.dependsOn, visited);
        };

        config.fields?.forEach(field => {
            if (field.dependsOn && checkCircularDependency(field.key)) {
                errors.push(`Alan ${field.key}: Döngüsel bağımlılık tespit edildi`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Test template with sample data
     */
    testTemplate: async (templateId: string, sampleData: any): Promise<{ preview: string; isValid: boolean; errors: string[] }> => {
        try {
            const response = await api.post<ApiResponse<{ preview: string; isValid: boolean; errors: string[] }>>(
                `/notifications/templates/${templateId}/test`,
                { sampleData }
            );
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error testing template:', error);
            throw new Error('Şablon test edilirken hata oluştu');
        }
    },

    /**
     * Duplicate template
     */
    duplicateTemplate: async (templateId: string, newName: string): Promise<TemplateConfig> => {
        try {
            const response = await api.post<ApiResponse<TemplateConfig>>(`/notifications/templates/${templateId}/duplicate`, {
                newName
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('Error duplicating template:', error);
            throw new Error('Şablon kopyalanırken hata oluştu');
        }
    },

    /**
     * Export template as JSON
     */
    exportTemplate: async (templateId: string): Promise<string> => {
        try {
            const template = await templateManagementService.getTemplateById(templateId);
            return JSON.stringify(template, null, 2);
        } catch (error) {
            console.error('Error exporting template:', error);
            throw new Error('Şablon dışa aktarılırken hata oluştu');
        }
    },

    /**
     * Import template from JSON
     */
    importTemplate: async (templateJson: string): Promise<TemplateConfig> => {
        try {
            const template = JSON.parse(templateJson);
            
            // Validate imported template
            const validation = templateManagementService.validateTemplateConfig(template);
            if (!validation.isValid) {
                throw new Error(`Geçersiz şablon: ${validation.errors.join(', ')}`);
            }

            // Remove ID if exists to create new template
            const { id, ...templateWithoutId } = template;
            
            return await templateManagementService.createTemplate(templateWithoutId);
        } catch (error) {
            console.error('Error importing template:', error);
            throw new Error('Şablon içe aktarılırken hata oluştu');
        }
    },

    /**
     * Get built-in templates
     */
    getBuiltInTemplates: (): TemplateConfig[] => {
        const builtInTemplates: TemplateConfig[] = [];
        
        Object.values(TemplateType).forEach(templateType => {
            const config = getTemplateConfig(templateType);
            if (config) {
                builtInTemplates.push(config);
            }
        });

        return builtInTemplates;
    },

    /**
     * Compare templates
     */
    compareTemplates: (template1: TemplateConfig, template2: TemplateConfig): {
        differences: string[];
        similarities: string[];
    } => {
        const differences: string[] = [];
        const similarities: string[] = [];

        // Compare basic properties
        if (template1.templateId !== template2.templateId) {
            differences.push('Template ID farklı');
        } else {
            similarities.push('Template ID aynı');
        }

        if (template1.previewTemplate !== template2.previewTemplate) {
            differences.push('Önizleme şablonu farklı');
        } else {
            similarities.push('Önizleme şablonu aynı');
        }

        // Compare fields
        const fields1 = template1.fields || [];
        const fields2 = template2.fields || [];

        if (fields1.length !== fields2.length) {
            differences.push(`Alan sayısı farklı: ${fields1.length} vs ${fields2.length}`);
        } else {
            similarities.push(`Alan sayısı aynı: ${fields1.length}`);
        }

        // Compare individual fields
        fields1.forEach((field1, index) => {
            const field2 = fields2[index];
            if (!field2) {
                differences.push(`Alan ${index + 1}: İkinci şablonda bulunamadı`);
                return;
            }

            if (field1.key !== field2.key) {
                differences.push(`Alan ${index + 1}: Anahtar farklı (${field1.key} vs ${field2.key})`);
            }

            if (field1.type !== field2.type) {
                differences.push(`Alan ${index + 1}: Tip farklı (${field1.type} vs ${field2.type})`);
            }

            if (field1.required !== field2.required) {
                differences.push(`Alan ${index + 1}: Zorunluluk farklı`);
            }
        });

        return { differences, similarities };
    }
};
