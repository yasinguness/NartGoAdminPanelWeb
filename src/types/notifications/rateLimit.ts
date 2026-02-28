// ─── Quiet Hours ───────────────────────────────────────────
export interface QuietHours {
    enabled: boolean;
    startHour: number;  // 0-23, default 22
    endHour: number;    // 0-23, default 8
    timezone: string;
}

// ─── Rate Limit Config ─────────────────────────────────────
export interface RateLimitConfig {
    maxPushPerUserPerDay: number;         // max push notifications per user per day
    quietHours: QuietHours;
    frequencyCap: number;                 // max campaign notifications per day
    spamDetectionEnabled: boolean;
    autoThrottleEnabled: boolean;
    maxBulkRecipientsPerBatch: number;    // max recipients per batch send
}

// ─── Factory ───────────────────────────────────────────────
export const createRateLimitConfig = (data: Partial<RateLimitConfig> = {}): RateLimitConfig => ({
    maxPushPerUserPerDay: 5,
    quietHours: {
        enabled: true,
        startHour: 22,
        endHour: 8,
        timezone: 'Europe/Istanbul',
    },
    frequencyCap: 2,
    spamDetectionEnabled: true,
    autoThrottleEnabled: true,
    maxBulkRecipientsPerBatch: 1000,
    ...data,
});
