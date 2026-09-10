import { Navigate, useLocation } from 'react-router-dom';
import { ReactElement, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';
import { getValidToken } from '../services/tokenStorage';
import ForbiddenPage from './ForbiddenPage';

interface PrivateRouteProps {
    children: ReactElement;
    /** True ise yetkisizde 403 göster, false ise fallbackPath'e redirect */
    showForbidden?: boolean;
}

export default function PrivateRoute({ children, showForbidden = true }: PrivateRouteProps) {
    const storeAuthed = useAuthStore((state) => state.isAuthenticated);
    const storeLogout = useAuthStore((state) => state.logout);
    const { canAccess, fallbackPath } = useRole();
    const location = useLocation();

    // Tek auth gerçeği: Zustand "authed" dese de geçerli token yoksa korumalı
    // sayfayı render etme. (Eskiden ikisi ayrışınca token'sız admin istekleri
    // 401 storm'una düşüyordu.)
    const hasValidToken = getValidToken() !== null;
    const isAuthenticated = storeAuthed && hasValidToken;

    // Ayrışmayı (store authed ama token yok) kalıcı temizle ki tekrar tekrar
    // korumalı sayfa render edilmesin.
    useEffect(() => {
        if (storeAuthed && !hasValidToken) {
            storeLogout();
        }
    }, [storeAuthed, hasValidToken, storeLogout]);

    if (!isAuthenticated) {
        // Login sonrası geri yönlendirme için mevcut path'i state'te sakla
        return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
    }

    if (!canAccess(location.pathname)) {
        if (showForbidden) {
            return <ForbiddenPage />;
        }
        return <Navigate to={fallbackPath} replace />;
    }

    return children;
}
