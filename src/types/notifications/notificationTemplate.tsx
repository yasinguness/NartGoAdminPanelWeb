import { z } from 'zod';

// Base Template Interface
export interface NotificationTemplate {
    id: string;
    name: string;
    description: string;
    type: TemplateType;
    category: TemplateCategory;
    icon: string;
    color: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Template Types
export enum TemplateType {
    EVENT_REMINDER = 'EVENT_REMINDER',
    SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
    PROMOTION = 'PROMOTION',
    FEATURE_UPDATE = 'FEATURE_UPDATE',
    URGENT_NOTIFICATION = 'URGENT_NOTIFICATION',
    WELCOME_MESSAGE = 'WELCOME_MESSAGE',
    PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
    SECURITY_ALERT = 'SECURITY_ALERT',
    CUSTOM = 'CUSTOM'
}

// Template Categories
export enum TemplateCategory {
    SYSTEM = 'SYSTEM',
    BUSINESS = 'BUSINESS',
    MARKETING = 'MARKETING',
    SECURITY = 'SECURITY',
    USER_EXPERIENCE = 'USER_EXPERIENCE'
}

// Template Field Definition
export interface TemplateField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'url' | 'datetime' | 'select' | 'multiselect' | 'textarea' | 'boolean';
    required: boolean;
    defaultValue?: any;
    placeholder?: string;
    validation?: z.ZodSchema<any>;
    options?: Array<{ value: string; label: string }>;
    dependsOn?: string; // Field dependency
    description?: string;
}

// Template Configuration
export interface TemplateConfig {
    templateId: string;
    fields: TemplateField[];
    defaultPriority: string;
    defaultChannels: string[];
    previewTemplate: string;
    validationSchema: z.ZodSchema<any>;
}

// Event Reminder Template
export const EVENT_REMINDER_TEMPLATE: TemplateConfig = {
    templateId: 'event-reminder',
    fields: [
        {
            key: 'notificationStyle',
            label: 'Bildirim Stili',
            type: 'select',
            required: true,
            options: [
                { value: 'friendly', label: '🔔 Samimi ve Topluluk Odaklı' },
                { value: 'energetic', label: '🚀 Enerjik ve Harekete Geçirici' },
                { value: 'short', label: '⏰ Kısa ve Mobil Dostu' },
                { value: 'cultural', label: '💙 Duygusal ve Kültürel Dokunuş' },
                { value: 'wedding', label: '💒 Düğün ve Nişan' }
            ],
            description: 'Bildirim tonunu ve stilini seçin'
        },
        {
            key: 'customMessage',
            label: 'Özel Mesaj',
            type: 'textarea',
            required: false,
            placeholder: 'Opsiyonel özel mesaj ekleyin...'
        }
    ],
    defaultPriority: 'NORMAL',
    defaultChannels: ['push', 'email', 'websocket'],
    previewTemplate: '{{eventName}} etkinliği {{eventTime}} tarihinde başlayacak. {{customMessage}}',
    validationSchema: z.object({
        notificationStyle: z.enum(['friendly', 'energetic', 'short', 'cultural', 'wedding']),
        customMessage: z.string().optional()
    })
};

// System Maintenance Template
export const SYSTEM_MAINTENANCE_TEMPLATE: TemplateConfig = {
    templateId: 'system-maintenance',
    fields: [
        {
            key: 'notificationStyle',
            label: 'Bildirim Stili',
            type: 'select',
            required: true,
            options: [
                { value: 'pre_notice_short', label: '⚙️ Ön Bilgilendirme – Kısa ve Net' },
                { value: 'pre_notice_friendly', label: '🔧 Ön Bilgilendirme – Samimi Ton' },
                { value: 'reminder', label: '⏰ Hatırlatma – Yaklaşan Bakım' },
                { value: 'completed', label: '✅ Bakım Tamamlandı' }
            ],
            description: 'Bildirim tonunu ve stilini seçin'
        },
        {
            key: 'maintenanceType',
            label: 'Bakım Türü',
            type: 'select',
            required: true,
            options: [
                { value: 'scheduled', label: 'Planlı Bakım' },
                { value: 'emergency', label: 'Acil Bakım' },
                { value: 'update', label: 'Sistem Güncellemesi' }
            ]
        },
        {
            key: 'startTime',
            label: 'Başlangıç Zamanı',
            type: 'datetime',
            required: true
        },
        {
            key: 'endTime',
            label: 'Bitiş Zamanı',
            type: 'datetime',
            required: true
        },
        {
            key: 'affectedServices',
            label: 'Etkilenen Hizmetler',
            type: 'multiselect',
            required: false,
            options: [
                { value: 'api', label: 'API Servisleri' },
                { value: 'web', label: 'Web Uygulaması' },
                { value: 'mobile', label: 'Mobil Uygulama' },
                { value: 'database', label: 'Veritabanı' },
                { value: 'payment', label: 'Ödeme Sistemi' }
            ]
        },
        {
            key: 'statusPageUrl',
            label: 'Durum Sayfası URL',
            type: 'url',
            required: false,
            placeholder: 'https://status.example.com'
        },
        {
            key: 'customMessage',
            label: 'Özel Mesaj',
            type: 'textarea',
            required: false,
            placeholder: 'Opsiyonel özel mesaj ekleyin...'
        }
    ],
    defaultPriority: 'HIGH',
    defaultChannels: ['push', 'email', 'websocket', 'telegram'],
    previewTemplate: 'Sistem bakımı {{startTime}} - {{endTime}} arasında gerçekleşecek. {{affectedServices}} etkilenecek.',
    validationSchema: z.object({
        notificationStyle: z.enum(['pre_notice_short', 'pre_notice_friendly', 'reminder', 'completed']),
        maintenanceType: z.enum(['scheduled', 'emergency', 'update']),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        affectedServices: z.array(z.string()).optional(),
        statusPageUrl: z.string().url().optional(),
        customMessage: z.string().optional()
    }).refine((data: any) => new Date(data.endTime) > new Date(data.startTime), {
        message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır',
        path: ['endTime']
    })
};

// Promotion Template
export const PROMOTION_TEMPLATE: TemplateConfig = {
    templateId: 'promotion',
    fields: [
        {
            key: 'promotionType',
            label: 'Promosyon Türü',
            type: 'select',
            required: true,
            options: [
                { value: 'discount', label: 'İndirim' },
                { value: 'free_shipping', label: 'Ücretsiz Kargo' },
                { value: 'buy_one_get_one', label: '1 Alana 1 Bedava' },
                { value: 'cashback', label: 'Nakit İade' }
            ]
        },
        {
            key: 'discountCode',
            label: 'İndirim Kodu',
            type: 'text',
            required: false,
            placeholder: 'SAVE20'
        },
        {
            key: 'discountPercentage',
            label: 'İndirim Yüzdesi',
            type: 'number',
            required: false,
            dependsOn: 'promotionType',
            description: 'Sadece indirim türü seçildiğinde gerekli'
        },
        {
            key: 'validUntil',
            label: 'Geçerlilik Tarihi',
            type: 'datetime',
            required: true
        },
        {
            key: 'targetAudience',
            label: 'Hedef Kitle',
            type: 'multiselect',
            required: false,
            options: [
                { value: 'all', label: 'Tüm Kullanıcılar' },
                { value: 'new', label: 'Yeni Kullanıcılar' },
                { value: 'premium', label: 'Premium Üyeler' },
                { value: 'inactive', label: 'Pasif Kullanıcılar' }
            ]
        }
    ],
    defaultPriority: 'LOW',
    defaultChannels: ['push', 'email'],
    previewTemplate: '{{promotionType}} promosyonu! {{discountCode}} kodu ile {{discountPercentage}}% indirim. {{validUntil}} tarihine kadar geçerli.',
    validationSchema: z.object({
        promotionType: z.enum(['discount', 'free_shipping', 'buy_one_get_one', 'cashback']),
        discountCode: z.string().optional(),
        discountPercentage: z.number().min(0).max(100).optional(),
        validUntil: z.string().datetime(),
        targetAudience: z.array(z.string()).optional()
    }).refine((data: any) => {
        if (data.promotionType === 'discount' && !data.discountPercentage) {
            return false;
        }
        return true;
    }, {
        message: 'İndirim türü seçildiğinde indirim yüzdesi zorunludur',
        path: ['discountPercentage']
    })
};

// Feature Update Template
export const FEATURE_UPDATE_TEMPLATE: TemplateConfig = {
    templateId: 'feature-update',
    fields: [
        {
            key: 'featureName',
            label: 'Özellik Adı',
            type: 'text',
            required: true,
            placeholder: 'Yeni özellik adı'
        },
        {
            key: 'releaseDate',
            label: 'Yayın Tarihi',
            type: 'datetime',
            required: true
        },
        {
            key: 'impactLevel',
            label: 'Etkisi',
            type: 'select',
            required: true,
            options: [
                { value: 'low', label: 'Düşük' },
                { value: 'medium', label: 'Orta' },
                { value: 'high', label: 'Yüksek' }
            ]
        },
        {
            key: 'changelogUrl',
            label: 'Değişiklik Günlüğü URL',
            type: 'url',
            required: false,
            placeholder: 'https://example.com/changelog'
        },
        {
            key: 'customMessage',
            label: 'Özel Mesaj',
            type: 'textarea',
            required: false,
            placeholder: 'Opsiyonel açıklama ekleyin...'
        }
    ],
    defaultPriority: 'NORMAL',
    defaultChannels: ['push', 'email', 'websocket'],
    previewTemplate: 'Yeni özellik: {{featureName}} yayında! {{releaseDate}} itibarıyla kullanılabilir. Etki: {{impactLevel}}. {{customMessage}}',
    validationSchema: z.object({
        featureName: z.string().min(1),
        releaseDate: z.string().datetime(),
        impactLevel: z.enum(['low', 'medium', 'high']),
        changelogUrl: z.string().url().optional(),
        customMessage: z.string().optional()
    })
};

// Template Registry
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
    [TemplateType.EVENT_REMINDER]: EVENT_REMINDER_TEMPLATE,
    [TemplateType.SYSTEM_MAINTENANCE]: SYSTEM_MAINTENANCE_TEMPLATE,
    [TemplateType.PROMOTION]: PROMOTION_TEMPLATE,
    [TemplateType.FEATURE_UPDATE]: FEATURE_UPDATE_TEMPLATE
};

// Template Helper Functions
export const getTemplateConfig = (templateType: TemplateType): TemplateConfig | null => {
    return TEMPLATE_REGISTRY[templateType] || null;
};

export const validateTemplateData = (templateType: TemplateType, data: any) => {
    const config = getTemplateConfig(templateType);
    if (!config) {
        throw new Error(`Template configuration not found for type: ${templateType}`);
    }
    return config.validationSchema.parse(data);
};

export const generatePreview = (templateType: TemplateType, data: any): string => {
    const config = getTemplateConfig(templateType);
    if (!config) {
        return 'Template not found';
    }
    
    let preview = config.previewTemplate;
    
    // Replace placeholders with actual data
    Object.entries(data).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        if (preview.includes(placeholder)) {
            preview = preview.replace(placeholder, String(value || ''));
        }
    });
    
    return preview;
};
