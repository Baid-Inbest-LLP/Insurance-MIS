import { Navigate, useLocation } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { isAuthenticated } from '../lib/session';
import { useMe } from '../hooks/useAuth';

export default function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const { data: user, isLoading } = useMe();

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles) {
    if (isLoading) {
      return (
        <Center h="100vh">
          <Loader />
        </Center>
      );
    }
    if (user && !roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
