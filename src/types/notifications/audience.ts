// ─── Segment Filter Types ──────────────────────────────────
// Backend ile birebir uyumlu — 11 filtre tipi
export enum SegmentFilterType {
    // Cihaz Bazlı Filtreler (Notification-Service Lokal Veri)
    USER_EMAIL = 'USER_EMAIL',
    PLATFORM = 'PLATFORM',
    DEVICE_TYPE = 'DEVICE_TYPE',
    ANONYMOUS_STATUS = 'ANONYMOUS_STATUS',
    LAST_ACTIVE = 'LAST_ACTIVE',
    REGISTRATION_DATE = 'REGISTRATION_DATE',

    // Kullanıcı Profil Filtreleri (Auth-Service Üzerinden)
    CITY = 'CITY',
    DISTRICT = 'DISTRICT',
    LANGUAGE = 'LANGUAGE',
    ACCOUNT_TYPE = 'ACCOUNT_TYPE',
    PREMIUM_STATUS = 'PREMIUM_STATUS',
    USER_STATUS = 'USER_STATUS',
}

export enum FilterOperator {
    EQUALS = 'EQUALS',
    NOT_EQUALS = 'NOT_EQUALS',
    GREATER_THAN = 'GREATER_THAN',
    LESS_THAN = 'LESS_THAN',
    IN = 'IN',
    CONTAINS = 'CONTAINS',
}

// ─── Segment Filter ────────────────────────────────────────
export interface SegmentFilter {
    id: string;
    type: SegmentFilterType;
    operator: FilterOperator;
    value: string | string[] | number | boolean;
    label?: string;
}

// ─── Audience Segment ──────────────────────────────────────
export interface AudienceSegment {
    id: string;
    name: string;
    description?: string;
    filters: SegmentFilter[];
    estimatedReach: number;
    createdAt: string;
    updatedAt: string;
    isPreset?: boolean;
}

// ─── Filter Option Metadata ────────────────────────────────
export interface FilterOption {
    type: SegmentFilterType;
    label: string;
    icon: string;
    description: string;
    operators: FilterOperator[];
    valueType: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
    options?: Array<{ value: string; label: string }>;
    category: 'device' | 'profile';
}

export const AVAILABLE_FILTERS: FilterOption[] = [
    // ─── Cihaz Bazlı ──────────────────────────────────
    {
        type: SegmentFilterType.USER_EMAIL,
        label: 'E-posta Adresi',
        icon: 'Email',
        description: 'Belirli kullanıcılara e-posta ile hedefle',
        operators: [FilterOperator.EQUALS, FilterOperator.CONTAINS, FilterOperator.IN],
        valueType: 'text',
        category: 'device',
    },
    {
        type: SegmentFilterType.PLATFORM,
        label: 'Platform',
        icon: 'PhoneIphone',
        description: 'Kullanıcının platformuna göre filtrele',
        operators: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.IN],
        valueType: 'select',
        options: [
            { value: 'android', label: 'Android' },
            { value: 'ios', label: 'iOS' },
            { value: 'web', label: 'Web' },
        ],
        category: 'device',
    },
    {
        type: SegmentFilterType.DEVICE_TYPE,
        label: 'Cihaz Tipi',
        icon: 'Devices',
        description: 'Cihaz tipine göre filtrele',
        operators: [FilterOperator.EQUALS, FilterOperator.NOT_EQUALS, FilterOperator.IN],
        valueType: 'select',
        options: [
            { value: 'android', label: 'Android' },
            { value: 'ios', label: 'iOS' },
        ],
        category: 'device',
    },
    {
        type: SegmentFilterType.ANONYMOUS_STATUS,
        label: 'Anonim Durum',
        icon: 'PersonOff',
        description: 'Anonim veya kayıtlı kullanıcıları filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'select',
        options: [
            { value: 'true', label: 'Anonim' },
            { value: 'false', label: 'Kayıtlı' },
        ],
        category: 'device',
    },
    {
        type: SegmentFilterType.LAST_ACTIVE,
        label: 'Son Aktif Olma',
        icon: 'AccessTime',
        description: 'Son aktif olma süresine göre filtrele (gün)',
        operators: [FilterOperator.LESS_THAN, FilterOperator.GREATER_THAN],
        valueType: 'number',
        category: 'device',
    },
    {
        type: SegmentFilterType.REGISTRATION_DATE,
        label: 'Kayıt Tarihi',
        icon: 'CalendarMonth',
        description: 'Kayıt tarihine göre filtrele (gün)',
        operators: [FilterOperator.LESS_THAN, FilterOperator.GREATER_THAN],
        valueType: 'number',
        category: 'device',
    },

    // ─── Kullanıcı Profil Bazlı (Auth-Service) ────────
    {
        type: SegmentFilterType.CITY,
        label: 'Şehir',
        icon: 'LocationCity',
        description: 'Kullanıcının şehrine göre filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'text',
        category: 'profile',
    },
    {
        type: SegmentFilterType.DISTRICT,
        label: 'İlçe',
        icon: 'LocationOn',
        description: 'Kullanıcının ilçesine göre filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'text',
        category: 'profile',
    },
    {
        type: SegmentFilterType.LANGUAGE,
        label: 'Dil',
        icon: 'Language',
        description: 'Kullanıcının tercih ettiği dile göre filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'select',
        options: [
            { value: 'TR', label: 'Türkçe' },
            { value: 'EN', label: 'English' },
            { value: 'DE', label: 'Deutsch' },
            { value: 'AR', label: 'العربية' },
        ],
        category: 'profile',
    },
    {
        type: SegmentFilterType.ACCOUNT_TYPE,
        label: 'Hesap Tipi',
        icon: 'Badge',
        description: 'Kişisel, işletme veya dernek hesapları',
        operators: [FilterOperator.EQUALS],
        valueType: 'select',
        options: [
            { value: 'PERSONAL', label: 'Kişisel' },
            { value: 'BUSINESS', label: 'İşletme' },
            { value: 'ASSOCIATION', label: 'Dernek' },
        ],
        category: 'profile',
    },
    {
        type: SegmentFilterType.PREMIUM_STATUS,
        label: 'Premium Durum',
        icon: 'Star',
        description: 'Premium (İşletme/Dernek) hesapları filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'select',
        options: [
            { value: 'true', label: 'Premium' },
            { value: 'false', label: 'Ücretsiz' },
        ],
        category: 'profile',
    },
    {
        type: SegmentFilterType.USER_STATUS,
        label: 'Kullanıcı Durumu',
        icon: 'ToggleOn',
        description: 'Aktif veya pasif kullanıcıları filtrele',
        operators: [FilterOperator.EQUALS],
        valueType: 'select',
        options: [
            { value: 'ACTIVE', label: 'Aktif' },
            { value: 'INACTIVE', label: 'Pasif' },
        ],
        category: 'profile',
    },
];

// ─── Factory ───────────────────────────────────────────────
let filterIdCounter = 0;

export const createSegmentFilter = (data: Partial<SegmentFilter> = {}): SegmentFilter => ({
    id: `filter-${Date.now()}-${filterIdCounter++}`,
    type: SegmentFilterType.CITY,
    operator: FilterOperator.EQUALS,
    value: '',
    ...data,
});

export const createAudienceSegment = (data: Partial<AudienceSegment> = {}): AudienceSegment => ({
    id: `segment-${Date.now()}`,
    name: '',
    filters: [],
    estimatedReach: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
});
