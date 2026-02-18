import { Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuthStore } from '../store/authStore';

interface PrivateRouteProps {
    children: ReactElement;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return isAuthenticated ? children : <Navigate to="/login" />;
} 