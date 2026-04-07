/**
 * useAnalytics — Otomatik sayfa takibi + aksiyon izleme hook'u
 *
 * Layout'a bir kez eklendiğinde tüm sayfa geçişlerini otomatik takip eder.
 * Bireysel sayfalarda trackAction/trackFeature ile özel aksiyonlar izlenebilir.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../../services/analytics/analyticsService';

/**
 * Layout'ta kullanılır — her rota değişikliğinde otomatik page_view kaydı yapar.
 */
export function usePageTracking() {
  const location = useLocation();
  const prevPath = useRef('');

  useEffect(() => {
    const path = location.pathname;
    if (path !== prevPath.current) {
      analyticsService.trackPageView(path);
      prevPath.current = path;
    }
  }, [location.pathname]);
}

/**
 * Bireysel sayfalarda aksiyon izlemek için kullanılır.
 *
 * const { trackAction, trackFeature } = useActionTracking();
 * trackAction('create_ticket_type', { eventId: '...' });
 * trackFeature('csv_export');
 */
export function useActionTracking() {
  const trackAction = useCallback((action: string, metadata?: Record<string, string | number>) => {
    analyticsService.trackAction(action, metadata);
  }, []);

  const trackFeature = useCallback((feature: string, metadata?: Record<string, string | number>) => {
    analyticsService.trackFeatureUse(feature, metadata);
  }, []);

  return { trackAction, trackFeature };
}
