/**
 * Admin Panel Analytics Service
 *
 * Tracks: page views, time spent, feature/action usage.
 * Stores locally (IndexedDB via localStorage fallback) + optional backend sync.
 *
 * Privacy: Only tracks admin user actions within the panel, no PII beyond admin email.
 */

const STORAGE_KEY = 'nartgo_admin_analytics';
const MAX_EVENTS = 5000; // Trim oldest when exceeded

// ─── Types ──────────────────────────────────────────────────

export interface AnalyticsEvent {
  type: 'page_view' | 'page_leave' | 'action' | 'feature_use';
  path: string;
  pageName: string;
  timestamp: string;
  durationMs?: number;      // time spent on page (page_leave only)
  action?: string;          // e.g. "create_ticket_type", "export_csv"
  metadata?: Record<string, string | number>;
  sessionId: string;
}

export interface PageStats {
  path: string;
  pageName: string;
  totalViews: number;
  avgDurationMs: number;
  totalDurationMs: number;
  lastVisited: string;
}

export interface ActionStats {
  action: string;
  count: number;
  lastUsed: string;
  paths: string[]; // which pages it was used from
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalActions: number;
  totalSessionTimeMs: number;
  topPages: PageStats[];
  topActions: ActionStats[];
  dailyActivity: { date: string; views: number; actions: number }[];
  peakHours: { hour: number; count: number }[];
}

// ─── Session ────────────────────────────────────────────────

const sessionId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let currentPagePath = '';
let currentPageName = '';
let pageEnterTime = 0;

// ─── Storage ────────────────────────────────────────────────

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEvents(events: AnalyticsEvent[]) {
  try {
    // Trim to max
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* storage full, ignore */ }
}

function pushEvent(event: AnalyticsEvent) {
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
}

// ─── Page name resolver ─────────────────────────────────────

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Kontrol Paneli',
  '/events': 'Etkinlikler',
  '/event-creation': 'Etkinlik Oluştur',
  '/event-categories': 'Etkinlik Kategorileri',
  '/tickets': 'Bilet Yönetimi',
  '/seat-map': 'Oturma Düzeni',
  '/sales-command': 'Satış Merkezi',
  '/box-office': 'Gişe',
  '/venue-inventory': 'Mekan Envanteri',
  '/settlement-finance': 'Ödeme & Mutabakat',
  '/gate-ops': 'Kapı Operasyonları',
  '/customer-support': 'Müşteri Destek',
  '/campaign-engine': 'Kampanya Motoru',
  '/users': 'Kullanıcılar',
  '/businesses': 'İşletmeler',
  '/associations': 'Dernekler',
  '/notifications': 'Bildirimler',
  '/feeds': 'Video Akışı',
  '/bulletins': 'Bültenler',
  '/content': 'İçerik',
  '/gamification': 'Oyunlaştırma',
  '/sub-merchants': 'Alt Bayiler',
  '/settings': 'Ayarlar',
  '/audit-log': 'Audit Log',
  '/devices': 'Cihazlar',
  '/analytics': 'Analitik',
};

function resolvePageName(path: string): string {
  // Exact match
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  // Prefix match (e.g. /events/123 → Etkinlikler)
  const base = '/' + path.split('/').filter(Boolean)[0];
  return PAGE_NAMES[base] || path;
}

// ─── Public API ─────────────────────────────────────────────

export const analyticsService = {
  /** Call on route change */
  trackPageView(path: string) {
    // Record leave of previous page
    if (currentPagePath && pageEnterTime > 0) {
      const duration = Date.now() - pageEnterTime;
      pushEvent({
        type: 'page_leave',
        path: currentPagePath,
        pageName: currentPageName,
        timestamp: new Date().toISOString(),
        durationMs: duration,
        sessionId,
      });
    }

    // Record new page view
    currentPagePath = path;
    currentPageName = resolvePageName(path);
    pageEnterTime = Date.now();

    pushEvent({
      type: 'page_view',
      path,
      pageName: currentPageName,
      timestamp: new Date().toISOString(),
      sessionId,
    });
  },

  /** Call when user performs a trackable action */
  trackAction(action: string, metadata?: Record<string, string | number>) {
    pushEvent({
      type: 'action',
      path: currentPagePath,
      pageName: currentPageName,
      timestamp: new Date().toISOString(),
      action,
      metadata,
      sessionId,
    });
  },

  /** Call when user uses a specific feature */
  trackFeatureUse(feature: string, metadata?: Record<string, string | number>) {
    pushEvent({
      type: 'feature_use',
      path: currentPagePath,
      pageName: currentPageName,
      timestamp: new Date().toISOString(),
      action: feature,
      metadata,
      sessionId,
    });
  },

  /** Get computed analytics summary */
  getSummary(daysBack = 30): AnalyticsSummary {
    const events = loadEvents();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffISO = cutoff.toISOString();

    const recent = events.filter(e => e.timestamp >= cutoffISO);

    // Page stats
    const pageMap = new Map<string, { views: number; totalDuration: number; durations: number[]; lastVisited: string; pageName: string }>();
    for (const e of recent) {
      if (e.type === 'page_view') {
        const existing = pageMap.get(e.path) || { views: 0, totalDuration: 0, durations: [], lastVisited: '', pageName: e.pageName };
        existing.views++;
        existing.lastVisited = e.timestamp > existing.lastVisited ? e.timestamp : existing.lastVisited;
        existing.pageName = e.pageName;
        pageMap.set(e.path, existing);
      }
      if (e.type === 'page_leave' && e.durationMs) {
        const existing = pageMap.get(e.path);
        if (existing) {
          existing.totalDuration += e.durationMs;
          existing.durations.push(e.durationMs);
        }
      }
    }

    const topPages: PageStats[] = Array.from(pageMap.entries())
      .map(([path, d]) => ({
        path,
        pageName: d.pageName,
        totalViews: d.views,
        avgDurationMs: d.durations.length > 0 ? Math.round(d.totalDuration / d.durations.length) : 0,
        totalDurationMs: d.totalDuration,
        lastVisited: d.lastVisited,
      }))
      .sort((a, b) => b.totalViews - a.totalViews);

    // Action stats
    const actionMap = new Map<string, { count: number; lastUsed: string; paths: Set<string> }>();
    for (const e of recent) {
      if ((e.type === 'action' || e.type === 'feature_use') && e.action) {
        const existing = actionMap.get(e.action) || { count: 0, lastUsed: '', paths: new Set() };
        existing.count++;
        existing.lastUsed = e.timestamp > existing.lastUsed ? e.timestamp : existing.lastUsed;
        existing.paths.add(e.path);
        actionMap.set(e.action, existing);
      }
    }

    const topActions: ActionStats[] = Array.from(actionMap.entries())
      .map(([action, d]) => ({
        action,
        count: d.count,
        lastUsed: d.lastUsed,
        paths: Array.from(d.paths),
      }))
      .sort((a, b) => b.count - a.count);

    // Daily activity
    const dailyMap = new Map<string, { views: number; actions: number }>();
    for (const e of recent) {
      const date = e.timestamp.slice(0, 10);
      const existing = dailyMap.get(date) || { views: 0, actions: 0 };
      if (e.type === 'page_view') existing.views++;
      if (e.type === 'action' || e.type === 'feature_use') existing.actions++;
      dailyMap.set(date, existing);
    }
    const dailyActivity = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Peak hours
    const hourCounts = new Array(24).fill(0);
    for (const e of recent) {
      if (e.type === 'page_view') {
        const hour = new Date(e.timestamp).getHours();
        hourCounts[hour]++;
      }
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

    // Totals
    const totalSessionTimeMs = topPages.reduce((s, p) => s + p.totalDurationMs, 0);

    return {
      totalPageViews: recent.filter(e => e.type === 'page_view').length,
      totalActions: recent.filter(e => e.type === 'action' || e.type === 'feature_use').length,
      totalSessionTimeMs,
      topPages,
      topActions,
      dailyActivity,
      peakHours,
    };
  },

  /** Clear all analytics data */
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Export raw events as JSON */
  exportRaw(): AnalyticsEvent[] {
    return loadEvents();
  },
};
