import { Navigate, useLocation } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';

interface PrivateRouteProps {
    children: ReactElement;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { canAccess, fallbackPath } = useRole();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" />;

    if (!canAccess(location.pathname)) {
        return <Navigate to={fallbackPath} replace />;
    }

    return children;
}
