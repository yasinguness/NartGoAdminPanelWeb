import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Grid,
    Alert,
    Chip,
    Divider,
    Card,
    CircularProgress,
    Tabs,
    Tab,
    IconButton,
    Stack
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Send as SendIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Close as CloseIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// Types and Services
import {
    NotificationPriority,
    NotificationType
} from '../../../types/notifications/notificationModel';
import { AdminBulkNotificationRequest, RecipientType } from '../../../types/notifications/adminBulkNotificationRequest';
import {
    TemplateType,
    getTemplateConfig,
    validateTemplateData,
    generatePreview
} from '../../../types/notifications/notificationTemplate';
import { eventIntegrationService } from '../../../services/notification/eventIntegrationService';
import { FormSection, FormGrid } from '../../../components/Form';
import UserSelectionDialog from './UserSelectionDialog';

interface EnhancedNotificationDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (request: AdminBulkNotificationRequest) => Promise<void>;
    initialData?: Partial<AdminBulkNotificationRequest>;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`notification-tabpanel-${index}`}
            aria-labelledby={`notification-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function EnhancedNotificationDialog({
    open,
    onClose,
    onSubmit,
    initialData
}: EnhancedNotificationDialogProps) {
    const { enqueueSnackbar } = useSnackbar();

    // State Management
    const [activeTab, setActiveTab] = useState(0);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | ''>('');
    const [templateData, setTemplateData] = useState<any>({});
    const [formData, setFormData] = useState<Partial<AdminBulkNotificationRequest>>(
        initialData || {
            title: '',
            content: '',
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.NORMAL,
            recipientType: RecipientType.ALL,
            sendPush: true,
            sendEmail: false,
            sendWebSocket: true
        }
    );

    // Event Integration States
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    // Validation States
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isValid, setIsValid] = useState(false);

    // User Selection States
    const [openUserSelector, setOpenUserSelector] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Effects
    useEffect(() => {
        if (open) {
            setFormData(initialData || {
                title: '',
                content: '',
                type: NotificationType.SYSTEM,
                priority: NotificationPriority.NORMAL,
                recipientType: RecipientType.ALL,
                sendPush: true,
                sendEmail: false,
                sendWebSocket: true
            });

            // Initialize template from initialData if present
            const initialTemplate = initialData?.templateCode as TemplateType || '';
            setSelectedTemplate(initialTemplate);

            // Smart tab selection
            if (initialTemplate && initialData?.recipientType === RecipientType.SPECIFIC_USERS) {
                // If targeting specific users with a custom/specific template, jump to Basic Info
                setActiveTab(1);
            } else {
                setActiveTab(0);
            }

            setTemplateData({});
            setPreviewContent('');
            setSelectedEvent(null);
            setSelectedUserIds([]);
        }
    }, [open, initialData]);

    useEffect(() => {
        if (open && selectedTemplate === TemplateType.EVENT_REMINDER) {
            loadPopularEvents();
        }
    }, [open, selectedTemplate]);

    useEffect(() => {
        if (selectedTemplate) {
            updateFormFromTemplate();
        }
    }, [selectedTemplate, templateData]);

    useEffect(() => {
        validateForm();
    }, [formData, templateData, selectedTemplate]);

    // Event Loading
    const loadPopularEvents = async () => {
        setLoadingEvents(true);
        try {
            const eventOptions = await eventIntegrationService.getPopularEvents();
            setEvents(eventOptions);
        } catch (error) {
            enqueueSnackbar('Popüler etkinlikler yüklenirken hata oluştu', { variant: 'error' });
        } finally {
            setLoadingEvents(false);
        }
    };

    // Template Handling
    const handleTemplateChange = (templateType: TemplateType | '') => {
        setSelectedTemplate(templateType);
        if (templateType) {
            const config = getTemplateConfig(templateType);
            if (config) {
                setFormData(prev => ({
                    ...prev,
                    priority: config.defaultPriority as NotificationPriority,
                    sendPush: config.defaultChannels.includes('push'),
                    sendEmail: config.defaultChannels.includes('email'),
                    sendWebSocket: config.defaultChannels.includes('websocket'),
                    sendTelegram: config.defaultChannels.includes('telegram')
                }));

                // Generate default content for system maintenance template
                if (templateType === TemplateType.SYSTEM_MAINTENANCE) {
                    const defaultMaintenanceData = {
                        maintenanceType: 'scheduled',
                        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // tomorrow
                        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16), // tomorrow + 1 hour
                        affectedServices: [],
                        statusPageUrl: ''
                    };

                    const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                        defaultMaintenanceData,
                        '',
                        'pre_notice_short'
                    );

                    setFormData(prev => ({
                        ...prev,
                        title,
                        content,
                        type: NotificationType.SYSTEM_MAINTENANCE,
                        templateParameters
                    }));

                    setPreviewContent(content);
                }
            }
        }
    };

    const updateFormFromTemplate = () => {
        if (!selectedTemplate) return;

        const config = getTemplateConfig(selectedTemplate);
        if (!config) return;

        // Generate preview content
        const preview = generatePreview(selectedTemplate, templateData);
        setPreviewContent(preview);

        // Update form data based on template
        setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
            ...prev,
            content: preview,
            templateCode: config.templateId
        }));
    };

    // Event Selection
    const handleEventSelection = async (eventOption: any) => {
        setSelectedEvent(eventOption);
        if (eventOption && selectedTemplate === TemplateType.EVENT_REMINDER) {
            try {
                const eventData = await eventIntegrationService.generateEventNotificationData(
                    eventOption.value,
                    selectedTemplate,
                    templateData
                );

                setTemplateData((prev: any) => ({
                    ...prev,
                    eventId: eventOption.value,
                    eventName: eventData.eventName,
                    eventTime: eventData.eventTime,
                    organizerName: eventData.organizerName
                }));

                // Generate automatic content
                const { title, content, templateParameters } = eventIntegrationService.generateEventReminderContent(
                    eventData,
                    templateData.customMessage,
                    templateData.notificationStyle || 'friendly'
                );

                // Update form with generated content
                setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                    ...prev,
                    title,
                    content,
                    type: NotificationType.EVENT_REMINDER,
                    priority: NotificationPriority.NORMAL,
                    templateParameters
                }));

                // Update preview
                setPreviewContent(content);
            } catch (error) {
                enqueueSnackbar('Etkinlik verileri yüklenirken hata oluştu', { variant: 'error' });
            }
        }
    };

    // Validation
    const validateForm = () => {
        const errors: string[] = [];

        // Basic validation
        if (!formData.title?.trim()) {
            errors.push('Başlık gereklidir');
        }

        if (!formData.content?.trim()) {
            errors.push('İçerik gereklidir');
        }

        if (!formData.type) {
            errors.push('Bildirim türü gereklidir');
        }

        // Template-specific validation
        if (selectedTemplate) {
            try {
                validateTemplateData(selectedTemplate, templateData);
            } catch (error: any) {
                if (error.errors) {
                    errors.push(...error.errors.map((e: any) => e.message));
                } else {
                    errors.push(error.message);
                }
            }
        }

        setValidationErrors(errors);
        setIsValid(errors.length === 0);
    };

    // Form Submission
    const handleSubmit = async () => {
        if (!isValid) {
            enqueueSnackbar('Lütfen form hatalarını düzeltin', { variant: 'error' });
            return;
        }

        try {
            const request: AdminBulkNotificationRequest = {
                ...formData,
                templateParameters: selectedTemplate ? templateData : undefined
            } as AdminBulkNotificationRequest;

            await onSubmit(request);
            handleClose();
            enqueueSnackbar('Bildirim başarıyla gönderildi', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar(`Bildirim gönderilirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, { variant: 'error' });
        }
    };

    const handleClose = () => {
        setActiveTab(0);
        setSelectedTemplate('');
        setTemplateData({});
        setFormData({
            title: '',
            content: '',
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.NORMAL,
            recipientType: RecipientType.ALL,
            sendPush: true,
            sendEmail: false,
            sendWebSocket: true
        });
        setValidationErrors([]);
        setIsValid(false);
        setPreviewContent('');
        setSelectedEvent(null);
        onClose();
    };

    // Render Template Fields
    const renderTemplateFields = () => {
        if (!selectedTemplate) return null;

        const config = getTemplateConfig(selectedTemplate);
        if (!config) return null;

        return (
            <Grid container spacing={2}>
                {config.fields.map((field) => {
                    // Check field dependency
                    if (field.dependsOn && !templateData[field.dependsOn]) {
                        return null;
                    }

                    return (
                        <Grid item xs={12} sm={6} key={field.key}>
                            {field.type === 'select' && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>{field.label}</InputLabel>
                                    <Select
                                        value={templateData[field.key] || ''}
                                        onChange={(e) => {
                                            setTemplateData((prev: any) => ({ ...prev, [field.key]: e.target.value }));

                                            // If this is notification style for event reminder, update content
                                            if (field.key === 'notificationStyle' && selectedTemplate === TemplateType.EVENT_REMINDER && selectedEvent) {
                                                setTimeout(() => {
                                                    eventIntegrationService.generateEventNotificationData(
                                                        selectedEvent.value,
                                                        selectedTemplate,
                                                        { ...templateData, [field.key]: e.target.value }
                                                    ).then(eventData => {
                                                        const { title, content, templateParameters } = eventIntegrationService.generateEventReminderContent(
                                                            eventData,
                                                            templateData.customMessage,
                                                            e.target.value
                                                        );

                                                        setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                            ...prev,
                                                            title,
                                                            content,
                                                            templateParameters
                                                        }));

                                                        setPreviewContent(content);
                                                    });
                                                }, 100);
                                            }

                                            // If this is notification style for system maintenance, update content
                                            if (field.key === 'notificationStyle' && selectedTemplate === TemplateType.SYSTEM_MAINTENANCE) {
                                                setTimeout(() => {
                                                    const maintenanceData = {
                                                        maintenanceType: templateData.maintenanceType || 'scheduled',
                                                        startTime: templateData.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                        endTime: templateData.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                        affectedServices: templateData.affectedServices || [],
                                                        statusPageUrl: templateData.statusPageUrl || ''
                                                    };

                                                    const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                                                        maintenanceData,
                                                        templateData.customMessage,
                                                        e.target.value
                                                    );

                                                    setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                        ...prev,
                                                        title,
                                                        content,
                                                        templateParameters
                                                    }));

                                                    setPreviewContent(content);
                                                }, 100);
                                            }
                                        }}
                                        label={field.label}
                                        required={field.required}
                                    >
                                        {field.options?.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            {field.type === 'multiselect' && (
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>{field.label}</InputLabel>
                                    <Select
                                        multiple
                                        value={templateData[field.key] || []}
                                        onChange={(e) => {
                                            setTemplateData((prev: any) => ({ ...prev, [field.key]: e.target.value }));

                                            // If this is for system maintenance, update content
                                            if (selectedTemplate === TemplateType.SYSTEM_MAINTENANCE) {
                                                setTimeout(() => {
                                                    const maintenanceData = {
                                                        maintenanceType: templateData.maintenanceType || 'scheduled',
                                                        startTime: templateData.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                        endTime: templateData.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                        affectedServices: field.key === 'affectedServices' ? e.target.value : (templateData.affectedServices || []),
                                                        statusPageUrl: templateData.statusPageUrl || ''
                                                    };

                                                    const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                                                        maintenanceData,
                                                        templateData.customMessage,
                                                        templateData.notificationStyle || 'pre_notice_short'
                                                    );

                                                    setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                        ...prev,
                                                        title,
                                                        content,
                                                        templateParameters
                                                    }));

                                                    setPreviewContent(content);
                                                }, 100);
                                            }
                                        }}
                                        label={field.label}
                                        required={field.required}
                                    >
                                        {field.options?.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            {field.type === 'datetime' && (
                                <TextField
                                    fullWidth
                                    label={field.label}
                                    type="datetime-local"
                                    value={templateData[field.key] || ''}
                                    onChange={(e) => {
                                        setTemplateData((prev: any) => ({ ...prev, [field.key]: e.target.value }));

                                        // If this is for system maintenance, update content
                                        if (selectedTemplate === TemplateType.SYSTEM_MAINTENANCE) {
                                            setTimeout(() => {
                                                const maintenanceData = {
                                                    maintenanceType: templateData.maintenanceType || 'scheduled',
                                                    startTime: field.key === 'startTime' ? e.target.value : (templateData.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)),
                                                    endTime: field.key === 'endTime' ? e.target.value : (templateData.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16)),
                                                    affectedServices: templateData.affectedServices || [],
                                                    statusPageUrl: templateData.statusPageUrl || ''
                                                };

                                                const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                                                    maintenanceData,
                                                    templateData.customMessage,
                                                    templateData.notificationStyle || 'pre_notice_short'
                                                );

                                                setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                    ...prev,
                                                    title,
                                                    content,
                                                    templateParameters
                                                }));

                                                setPreviewContent(content);
                                            }, 100);
                                        }
                                    }}
                                    margin="normal"
                                    required={field.required}
                                    InputLabelProps={{ shrink: true }}
                                />
                            )}

                            {field.type === 'textarea' && (
                                <TextField
                                    fullWidth
                                    label={field.label}
                                    multiline
                                    rows={3}
                                    value={templateData[field.key] || ''}
                                    onChange={(e) => {
                                        setTemplateData((prev: any) => ({ ...prev, [field.key]: e.target.value }));

                                        // If this is custom message for event reminder, update content
                                        if (field.key === 'customMessage' && selectedTemplate === TemplateType.EVENT_REMINDER && selectedEvent) {
                                            // Regenerate content with new custom message
                                            setTimeout(() => {
                                                eventIntegrationService.generateEventNotificationData(
                                                    selectedEvent.value,
                                                    selectedTemplate,
                                                    { ...templateData, [field.key]: e.target.value }
                                                ).then(eventData => {
                                                    const { title, content, templateParameters } = eventIntegrationService.generateEventReminderContent(
                                                        eventData,
                                                        e.target.value,
                                                        templateData.notificationStyle || 'friendly'
                                                    );

                                                    setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                        ...prev,
                                                        title,
                                                        content,
                                                        templateParameters
                                                    }));

                                                    setPreviewContent(content);
                                                });
                                            }, 100);
                                        }

                                        // If this is custom message for system maintenance, update content
                                        if (field.key === 'customMessage' && selectedTemplate === TemplateType.SYSTEM_MAINTENANCE) {
                                            setTimeout(() => {
                                                const maintenanceData = {
                                                    maintenanceType: templateData.maintenanceType || 'scheduled',
                                                    startTime: templateData.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                    endTime: templateData.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                    affectedServices: templateData.affectedServices || [],
                                                    statusPageUrl: templateData.statusPageUrl || ''
                                                };

                                                const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                                                    maintenanceData,
                                                    e.target.value,
                                                    templateData.notificationStyle || 'pre_notice_short'
                                                );

                                                setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                    ...prev,
                                                    title,
                                                    content,
                                                    templateParameters
                                                }));

                                                setPreviewContent(content);
                                            }, 100);
                                        }
                                    }}
                                    margin="normal"
                                    required={field.required}
                                    placeholder={field.placeholder}
                                />
                            )}

                            {['text', 'email', 'url', 'number'].includes(field.type) && (
                                <TextField
                                    fullWidth
                                    label={field.label}
                                    type={field.type}
                                    value={templateData[field.key] || ''}
                                    onChange={(e) => {
                                        setTemplateData((prev: any) => ({ ...prev, [field.key]: e.target.value }));

                                        // If this is for system maintenance, update content
                                        if (selectedTemplate === TemplateType.SYSTEM_MAINTENANCE) {
                                            setTimeout(() => {
                                                const maintenanceData = {
                                                    maintenanceType: templateData.maintenanceType || 'scheduled',
                                                    startTime: templateData.startTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                    endTime: templateData.endTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().slice(0, 16),
                                                    affectedServices: templateData.affectedServices || [],
                                                    statusPageUrl: field.key === 'statusPageUrl' ? e.target.value : (templateData.statusPageUrl || '')
                                                };

                                                const { title, content, templateParameters } = eventIntegrationService.generateSystemMaintenanceContent(
                                                    maintenanceData,
                                                    templateData.customMessage,
                                                    templateData.notificationStyle || 'pre_notice_short'
                                                );

                                                setFormData((prev: Partial<AdminBulkNotificationRequest>) => ({
                                                    ...prev,
                                                    title,
                                                    content,
                                                    templateParameters
                                                }));

                                                setPreviewContent(content);
                                            }, 100);
                                        }
                                    }}
                                    margin="normal"
                                    required={field.required}
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.description && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {field.description}
                                </Typography>
                            )}
                        </Grid>
                    );
                })}
            </Grid>
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={2}>
                        <NotificationsIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>Gelişmiş Bildirim Paneli</Typography>
                    </Box>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => {
                            // Validation before allowing tab change
                            if (newValue === 1 && !selectedTemplate) {
                                enqueueSnackbar('Önce bir şablon seçin', { variant: 'warning' });
                                return;
                            }
                            if (newValue === 2 && !selectedTemplate) {
                                enqueueSnackbar('Önce bir şablon seçin', { variant: 'warning' });
                                return;
                            }
                            if (newValue === 3 && (!formData.title || !formData.content)) {
                                enqueueSnackbar('Başlık ve içerik alanlarını doldurun', { variant: 'warning' });
                                return;
                            }
                            if (newValue === 4 && (!formData.title || !formData.content)) {
                                enqueueSnackbar('Önce temel bilgileri doldurun', { variant: 'warning' });
                                return;
                            }
                            setActiveTab(newValue);
                        }}
                    >
                        <Tab label="1. Şablon Seçimi" />
                        <Tab label="2. Temel Bilgiler" disabled={!selectedTemplate} />
                        <Tab label="3. Alıcı Seçimi" disabled={!selectedTemplate || !formData.title || !formData.content} />
                        <Tab label="4. Önizleme" disabled={!selectedTemplate || !formData.title || !formData.content} />
                    </Tabs>
                </Box>

                <TabPanel value={activeTab} index={0}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormSection
                                title="📋 Bildirim Şablonu Seçimi"
                                description="Hangi tür bildirim göndermek istediğinizi seçin. Şablon seçimi otomatik olarak başlık ve içeriği oluşturacaktır."
                            >
                                <FormGrid columns={1}>
                                    <FormControl fullWidth>
                                        <InputLabel>Bildirim Şablonu</InputLabel>
                                        <Select
                                            value={selectedTemplate}
                                            onChange={(e) => handleTemplateChange(e.target.value as TemplateType | '')}
                                            label="Bildirim Şablonu"
                                        >
                                            <MenuItem value="">
                                                <em>Özel Bildirim (Şablon Yok)</em>
                                            </MenuItem>
                                            <MenuItem value={TemplateType.EVENT_REMINDER}>
                                                📅 Etkinlik Hatırlatması
                                            </MenuItem>
                                            <MenuItem value={TemplateType.SYSTEM_MAINTENANCE}>
                                                🔧 Sistem Bakımı
                                            </MenuItem>
                                            <MenuItem value={TemplateType.PROMOTION}>
                                                🎯 Promosyon
                                            </MenuItem>
                                            <MenuItem value={TemplateType.FEATURE_UPDATE}>
                                                ✨ Özellik Güncellemesi
                                            </MenuItem>
                                            <MenuItem value={TemplateType.URGENT_NOTIFICATION}>
                                                🚨 Acil Bildirim
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </FormGrid>
                            </FormSection>
                        </Grid>

                        {selectedTemplate && (
                            <>
                                <Grid item xs={12}>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            Kullanılan şablon: <strong>{selectedTemplate}</strong>
                                        </Typography>
                                    </Alert>
                                </Grid>

                                {/* Event Selection for Event Reminder */}
                                {selectedTemplate === TemplateType.EVENT_REMINDER && (
                                    <Grid item xs={12}>
                                        <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                                            <Typography variant="h6" gutterBottom>
                                                🎯 Popüler Etkinlik Seçimi
                                            </Typography>
                                            <FormControl fullWidth margin="normal">
                                                <InputLabel>Etkinlik Seçimi</InputLabel>
                                                <Select
                                                    value={selectedEvent?.value || ''}
                                                    onChange={(e) => {
                                                        const event = events.find(ev => ev.value === e.target.value);
                                                        handleEventSelection(event);
                                                    }}
                                                    label="Etkinlik Seçimi"
                                                    required
                                                    disabled={loadingEvents}
                                                >
                                                    {loadingEvents ? (
                                                        <MenuItem disabled>
                                                            <CircularProgress size={20} sx={{ mr: 1 }} />
                                                            Popüler etkinlikler yükleniyor...
                                                        </MenuItem>
                                                    ) : events.length === 0 ? (
                                                        <MenuItem disabled>
                                                            Popüler etkinlik bulunamadı
                                                        </MenuItem>
                                                    ) : (
                                                        events.map((event) => (
                                                            <MenuItem key={event.value} value={event.value}>
                                                                <Box sx={{ width: '100%' }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                                        {event.event.name}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        📅 {event.date} • 📍 {event.location}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        🏷️ {event.category}
                                                                    </Typography>
                                                                </Box>
                                                            </MenuItem>
                                                        ))
                                                    )}
                                                </Select>
                                            </FormControl>

                                            {selectedEvent && (
                                                <Alert severity="success" sx={{ mt: 2 }}>
                                                    <Typography variant="body2">
                                                        ✅ <strong>{selectedEvent.event.name}</strong> etkinliği seçildi
                                                    </Typography>
                                                    <Typography variant="caption" display="block">
                                                        Otomatik içerik oluşturuldu. Temel bilgiler sekmesinde kontrol edebilirsiniz.
                                                    </Typography>
                                                </Alert>
                                            )}
                                        </Card>
                                    </Grid>
                                )}
                            </>
                        )}
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <Grid container spacing={2}>
                        <FormSection
                            title="📝 Temel Bilgiler"
                            description="Bildirim başlığı, içeriği ve diğer temel bilgileri düzenleyin."
                        >
                            <FormGrid>
                                <TextField
                                    fullWidth
                                    label="Başlık"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                    helperText="Bildirim başlığı kullanıcılara görünecek"
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Bildirim Türü</InputLabel>
                                    <Select
                                        value={formData.type || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        label="Bildirim Türü"
                                        required
                                    >
                                        <MenuItem value={NotificationType.SYSTEM}>Sistem</MenuItem>
                                        <MenuItem value={NotificationType.SYSTEM_MAINTENANCE}>Sistem Bakımı</MenuItem>
                                        <MenuItem value={NotificationType.PROMOTION}>Promosyon</MenuItem>
                                        <MenuItem value={NotificationType.ANNOUNCEMENT}>Duyuru</MenuItem>
                                        <MenuItem value={NotificationType.ALERT}>Uyarı</MenuItem>
                                        <MenuItem value={NotificationType.FEATURE_UPDATE}>Özellik Güncellemesi</MenuItem>
                                        <MenuItem value={NotificationType.EVENT_REMINDER}>Etkinlik Hatırlatması</MenuItem>
                                        <MenuItem value={NotificationType.URGENT}>Acil</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Öncelik</InputLabel>
                                    <Select
                                        value={formData.priority || NotificationPriority.NORMAL}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as NotificationPriority }))}
                                        label="Öncelik"
                                    >
                                        <MenuItem value={NotificationPriority.LOW}>Düşük</MenuItem>
                                        <MenuItem value={NotificationPriority.NORMAL}>Normal</MenuItem>
                                        <MenuItem value={NotificationPriority.HIGH}>Yüksek</MenuItem>
                                        <MenuItem value={NotificationPriority.URGENT}>Acil</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Bildirim Kanalları</InputLabel>
                                    <Select
                                        multiple
                                        value={[
                                            ...(formData.sendPush ? ['push'] : []),
                                            ...(formData.sendEmail ? ['email'] : []),
                                            ...(formData.sendWebSocket ? ['websocket'] : []),
                                            ...(formData.sendTelegram ? ['telegram'] : [])
                                        ]}
                                        onChange={(e) => {
                                            const channels = e.target.value as string[];
                                            setFormData(prev => ({
                                                ...prev,
                                                sendPush: channels.includes('push'),
                                                sendEmail: channels.includes('email'),
                                                sendWebSocket: channels.includes('websocket'),
                                                sendTelegram: channels.includes('telegram')
                                            }));
                                        }}
                                        label="Bildirim Kanalları"
                                    >
                                        <MenuItem value="push">📱 Push Bildirim</MenuItem>
                                        <MenuItem value="email">📧 Email</MenuItem>
                                        <MenuItem value="websocket">🌐 WebSocket</MenuItem>
                                        <MenuItem value="telegram">📱 Telegram</MenuItem>
                                    </Select>
                                </FormControl>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="İçerik"
                                        value={formData.content || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        multiline
                                        rows={4}
                                        required
                                        helperText="Bildirim içeriği. Şablon seçildiyse otomatik oluşturulmuştur."
                                    />
                                </Grid>
                            </FormGrid>
                        </FormSection>

                        {/* Template-specific fields */}
                        {selectedTemplate && (
                            <>
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 3 }}>
                                        <Chip label="Şablona Özel Alanlar" color="primary" variant="outlined" />
                                    </Divider>
                                </Grid>
                                {renderTemplateFields()}
                            </>
                        )}
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <Grid container spacing={2}>
                        <FormSection
                            title="👥 Alıcı Seçimi"
                            description="Bildirimin hangi kullanıcılara gönderileceğini seçin."
                        >
                            <FormGrid>
                                <FormControl fullWidth>
                                    <InputLabel>Alıcı Türü</InputLabel>
                                    <Select
                                        value={formData.recipientType || RecipientType.ALL}
                                        onChange={(e) => setFormData(prev => ({ ...prev, recipientType: e.target.value as RecipientType }))}
                                        label="Alıcı Türü"
                                    >
                                        <MenuItem value={RecipientType.ALL}>
                                            🌍 Tüm Kullanıcılar (Kayıtlı + Anonim)
                                        </MenuItem>
                                        <MenuItem value={RecipientType.REGISTERED}>
                                            👤 Sadece Kayıtlı Kullanıcılar
                                        </MenuItem>
                                        <MenuItem value={RecipientType.ANONYMOUS}>
                                            🕵️ Sadece Anonim Kullanıcılar
                                        </MenuItem>
                                        <MenuItem value={RecipientType.REGISTERED_AND_ANONYMOUS}>
                                            🔄 Kayıtlı ve Anonim (Ayrı Ayrı)
                                        </MenuItem>
                                        <MenuItem value={RecipientType.SPECIFIC_USERS}>
                                            🎯 Seçili Özel Kullanıcılar
                                        </MenuItem>
                                    </Select>
                                </FormControl>

                                {formData.recipientType === RecipientType.SPECIFIC_USERS && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<PeopleIcon />}
                                            onClick={() => setOpenUserSelector(true)}
                                        >
                                            Kullanıcı Seç
                                        </Button>
                                        {formData.emailList && formData.emailList.length > 0 && (
                                            <Typography variant="body2" color="success.main">
                                                {formData.emailList.length} kullanıcı seçildi
                                            </Typography>
                                        )}
                                    </Box>
                                )}

                                <TextField
                                    fullWidth
                                    label={formData.recipientType === RecipientType.SPECIFIC_USERS ? "Seçili Kullanıcı Emailleri" : "Spesifik Email Listesi (Opsiyonel)"}
                                    value={formData.emailList?.join(', ') || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        emailList: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                                    }))}
                                    helperText={formData.recipientType === RecipientType.SPECIFIC_USERS
                                        ? "Bildirim doğrudan bu email adreslerine gönderilecektir."
                                        : "Virgülle ayrılmış email adresleri. Boş bırakırsanız alıcı türü kullanılır."}
                                    placeholder="user1@example.com, user2@example.com"
                                />

                                <Grid item xs={12}>
                                    {formData.emailList && formData.emailList.length > 0 ? (
                                        <Alert severity="info">
                                            <Typography variant="body2">
                                                📧 <strong>{formData.emailList.length}</strong> spesifik email adresine gönderilecek
                                            </Typography>
                                            <Typography variant="caption" display="block">
                                                {formData.recipientType === RecipientType.SPECIFIC_USERS
                                                    ? "Doğrudan hedefleme aktif."
                                                    : "Alıcı türü ayarları geçersiz kılınacak."}
                                            </Typography>
                                        </Alert>
                                    ) : (
                                        <Alert severity="success">
                                            <Typography variant="body2">
                                                ✅ Bildirim şu kullanıcılara gönderilecek:
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {formData.recipientType === RecipientType.ALL && "🌍 Tüm kullanıcılar (kayıtlı + anonim)"}
                                                {formData.recipientType === RecipientType.REGISTERED && "👤 Sadece kayıtlı kullanıcılar"}
                                                {formData.recipientType === RecipientType.ANONYMOUS && "🕵️ Sadece anonim kullanıcılar"}
                                                {formData.recipientType === RecipientType.REGISTERED_AND_ANONYMOUS && "🔄 Kayıtlı ve anonim kullanıcılar (ayrı ayrı)"}
                                                {formData.recipientType === RecipientType.SPECIFIC_USERS && "⚠️ Lütfen email listesini doldurun."}
                                            </Typography>
                                        </Alert>
                                    )}
                                </Grid>
                            </FormGrid>
                        </FormSection>
                    </Grid>
                </TabPanel>

                <TabPanel value={activeTab} index={3}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
                                📋 Bildirim Önizlemesi
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <Card sx={{ p: 2, height: '100%' }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                                        📱 Push Bildirim
                                    </Typography>
                                    <Box sx={{
                                        bgcolor: '#f5f5f5',
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        minHeight: 120
                                    }}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: '#1976d2' }}>
                                            {formData.title || 'Başlık yok'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                                            {previewContent || formData.content || 'İçerik yok'}
                                        </Typography>
                                    </Box>
                                </Card>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <Card sx={{ p: 2, height: '100%' }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32' }}>
                                        📧 Email
                                    </Typography>
                                    <Box sx={{
                                        bgcolor: '#fafafa',
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid #e0e0e0',
                                        minHeight: 120
                                    }}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: '#2e7d32' }}>
                                            Konu: {formData.title || 'Başlık yok'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                            {previewContent || formData.content || 'İçerik yok'}
                                        </Typography>
                                    </Box>
                                </Card>
                            </Card>
                        </Grid>

                        {selectedTemplate === TemplateType.EVENT_REMINDER && selectedEvent && (
                            <Grid item xs={12}>
                                <Card variant="outlined" sx={{ bgcolor: '#fff3e0' }}>
                                    <Card sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ color: '#f57c00' }}>
                                            🎯 Etkinlik Bilgileri
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Etkinlik Adı:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedEvent.event.name}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Tarih & Saat:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedEvent.date}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Konum:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {selectedEvent.location}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Bildirim Stili:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {templateData.notificationStyle === 'friendly' && '🔔 Samimi ve Topluluk Odaklı'}
                                                    {templateData.notificationStyle === 'energetic' && '🚀 Enerjik ve Harekete Geçirici'}
                                                    {templateData.notificationStyle === 'short' && '⏰ Kısa ve Mobil Dostu'}
                                                    {templateData.notificationStyle === 'cultural' && '💙 Duygusal ve Kültürel Dokunuş'}
                                                    {templateData.notificationStyle === 'wedding' && '💒 Düğün ve Nişan'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Card>
                                </Card>
                            </Grid>
                        )}

                        {selectedTemplate === TemplateType.SYSTEM_MAINTENANCE && (
                            <Grid item xs={12}>
                                <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
                                    <Card sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
                                            ⚙️ Sistem Bakımı Bilgileri
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Bakım Türü:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {templateData.maintenanceType === 'scheduled' && '📅 Planlı Bakım'}
                                                    {templateData.maintenanceType === 'emergency' && '🚨 Acil Bakım'}
                                                    {templateData.maintenanceType === 'update' && '🔄 Sistem Güncellemesi'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Bildirim Stili:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {templateData.notificationStyle === 'pre_notice_short' && '⚙️ Ön Bilgilendirme – Kısa ve Net'}
                                                    {templateData.notificationStyle === 'pre_notice_friendly' && '🔧 Ön Bilgilendirme – Samimi Ton'}
                                                    {templateData.notificationStyle === 'reminder' && '⏰ Hatırlatma – Yaklaşan Bakım'}
                                                    {templateData.notificationStyle === 'completed' && '✅ Bakım Tamamlandı'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Başlangıç Zamanı:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {templateData.startTime ? new Date(templateData.startTime).toLocaleString('tr-TR') : 'Belirtilmemiş'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                    Bitiş Zamanı:
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {templateData.endTime ? new Date(templateData.endTime).toLocaleString('tr-TR') : 'Belirtilmemiş'}
                                                </Typography>
                                            </Grid>
                                            {templateData.affectedServices && templateData.affectedServices.length > 0 && (
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        Etkilenen Hizmetler:
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {templateData.affectedServices.join(', ')}
                                                    </Typography>
                                                </Grid>
                                            )}
                                            {templateData.statusPageUrl && (
                                                <Grid item xs={12}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        Durum Sayfası:
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {templateData.statusPageUrl}
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Card>
                                </Card>
                            </Grid>
                        )}

                        {validationErrors.length > 0 && (
                            <Grid item xs={12}>
                                <Alert severity="error">
                                    <Typography variant="subtitle2" gutterBottom>
                                        Form Hataları:
                                    </Typography>
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        {validationErrors.map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </Alert>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1}>
                                {isValid ? (
                                    <CheckCircleIcon color="success" />
                                ) : (
                                    <ErrorIcon color="error" />
                                )}
                                <Typography variant="body2" color={isValid ? 'success.main' : 'error.main'}>
                                    {isValid ? 'Form geçerli' : 'Form hataları var'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </TabPanel>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>İptal</Button>

                {activeTab > 0 && (
                    <Button
                        onClick={() => setActiveTab(activeTab - 1)}
                        variant="outlined"
                    >
                        Geri
                    </Button>
                )}

                {activeTab < 3 && (
                    <Button
                        onClick={() => {
                            if (activeTab === 0 && !selectedTemplate) {
                                enqueueSnackbar('Önce bir şablon seçin', { variant: 'warning' });
                                return;
                            }
                            if (activeTab === 1 && (!formData.title || !formData.content)) {
                                enqueueSnackbar('Başlık ve içerik alanlarını doldurun', { variant: 'warning' });
                                return;
                            }
                            if (activeTab === 2 && (!formData.title || !formData.content)) {
                                enqueueSnackbar('Önce temel bilgileri doldurun', { variant: 'warning' });
                                return;
                            }
                            setActiveTab(activeTab + 1);
                        }}
                        variant="contained"
                    >
                        İleri
                    </Button>
                )}

                {activeTab === 3 && (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={!isValid}
                        startIcon={<SendIcon />}
                    >
                        Bildirim Gönder
                    </Button>
                )}
            </DialogActions>

            <UserSelectionDialog
                open={openUserSelector}
                onClose={() => setOpenUserSelector(false)}
                onSuccess={() => { }}
                selectedUsers={selectedUserIds}
                setSelectedUsers={setSelectedUserIds}
                onSelectionComplete={(emails) => {
                    setFormData(prev => ({
                        ...prev,
                        emailList: [...new Set([...(prev.emailList || []), ...emails])]
                    }));
                }}
            />
        </Dialog>
    );
}
