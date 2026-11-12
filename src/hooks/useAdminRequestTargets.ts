import { useCallback, useEffect, useState } from 'react';
import { heritageAdminRequestService, type AdminRequestKind, type AdminRequestTarget } from '../services/heritageEditorService';

/**
 * Yöneticiye gönderilmiş kayıtlar (açık ya da son 14 günde geri çevrilmiş). Anahtar: "tür|hedef".
 * Yalnız editör için yüklenir; yönetici kararı zaten kendisi verir.
 */
export function useAdminRequestTargets(enabled: boolean) {
  const [map, setMap] = useState<Record<string, AdminRequestTarget>>({});
  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await heritageAdminRequestService.openTargets();
      setMap(Object.fromEntries(rows.map((r) => [`${r.kind}|${r.target}`, r])));
    } catch { /* bilgi amaçlı; yüklenemezse düğme yine görünür */ }
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  const get = useCallback((kind: AdminRequestKind, target: string) => map[`${kind}|${target}`], [map]);
  return { get, reload };
}
