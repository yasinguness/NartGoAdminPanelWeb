import { Navigate, useLocation } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';
import ForbiddenPage from './ForbiddenPage';

interface PrivateRouteProps {
    children: ReactElement;
    /** True ise yetkisizde 403 göster, false ise fallbackPath'e redirect */
    showForbidden?: boolean;
}

export default function PrivateRoute({ children, showForbidden = true }: PrivateRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { canAccess, fallbackPath } = useRole();
    const location = useLocation();

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
