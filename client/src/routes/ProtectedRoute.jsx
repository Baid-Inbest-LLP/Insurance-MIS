import { Navigate, useLocation } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { clearSession, isAuthenticated } from '../lib/session';
import { useMe } from '../hooks/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const { data: user, isLoading, isError } = useMe();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Never render an authenticated page until the profile request has settled.
  // A stale/missing token must fail closed rather than briefly exposing its UI.
  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (isError || !user) {
    clearSession();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
