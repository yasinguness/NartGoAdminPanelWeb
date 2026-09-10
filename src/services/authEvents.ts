import { useAuthStore } from '../store/authStore';
import { clearTokens } from './tokenStorage';

let handling = false;

/**
 * 401 (oturum geçersiz) tek-merkez ele alımı. Eskiden her eşzamanlı 401 ayrı
 * `window.location.href` tetikliyordu (N redirect) ve Zustand temizlenmiyordu
 * (PrivateRoute hâlâ "authed" sanıp döngü/storm). Artık:
 *   - tek seferlik guard (ilk 401 yeter),
 *   - hem localStorage hem Zustand temizlenir,
 *   - basename-uyumlu tek redirect.
 */
export function handleUnauthorized(): void {
    if (handling) return;
    handling = true;
    clearTokens();
    try {
        useAuthStore.getState().logout();
    } catch {
        // store erişilemezse yut
    }
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.location.href = `${base}/login`;
}
