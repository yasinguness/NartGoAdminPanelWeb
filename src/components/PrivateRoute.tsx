import { Navigate, useLocation } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuthStore } from '../store/authStore';
import { useRole } from '../hooks/useRole';

interface PrivateRouteProps {
    children: ReactElement;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { canAccess, isEditorOnly } = useRole();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" />;

    // Editor role — redirect to /content for unauthorized pages and dashboard
    if (isEditorOnly && (location.pathname === '/dashboard' || !canAccess(location.pathname))) {
        return <Navigate to="/content" replace />;
    }

    return children;
}
