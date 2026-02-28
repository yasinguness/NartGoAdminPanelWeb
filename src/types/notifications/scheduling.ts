// ─── Schedule Type ─────────────────────────────────────────
export enum ScheduleType {
    IMMEDIATE = 'IMMEDIATE',
    SCHEDULED = 'SCHEDULED',
    USER_TIMEZONE = 'USER_TIMEZONE',
}

// ─── Schedule Config ───────────────────────────────────────
export interface ScheduleConfig {
    type: ScheduleType;
    scheduledAt?: string;       // ISO 8601
    timezone?: string;          // e.g. "Europe/Istanbul"
    userLocalTime?: string;     // e.g. "10:00" — send at user's local 10 AM
}

// ─── Common Timezones ──────────────────────────────────────
export const COMMON_TIMEZONES = [
    { value: 'Europe/Istanbul', label: 'Türkiye (UTC+3)' },
    { value: 'Europe/Berlin', label: 'Almanya (UTC+1/+2)' },
    { value: 'Europe/London', label: 'İngiltere (UTC+0/+1)' },
    { value: 'America/New_York', label: 'ABD Doğu (UTC-5/-4)' },
    { value: 'America/Los_Angeles', label: 'ABD Batı (UTC-8/-7)' },
    { value: 'Asia/Dubai', label: 'BAE (UTC+4)' },
    { value: 'UTC', label: 'UTC' },
];

// ─── Factory ───────────────────────────────────────────────
export const createScheduleConfig = (data: Partial<ScheduleConfig> = {}): ScheduleConfig => ({
    type: ScheduleType.IMMEDIATE,
    ...data,
});
