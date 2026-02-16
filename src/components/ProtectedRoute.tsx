import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'hq' | 'store';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  console.log('ProtectedRoute check:', {
    loading,
    user: user ? {
      uid: user.uid,
      email: user.email,
      role: user.role
    } : null,
    requiredRole,
    path: location.pathname
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 역할 기반 리디렉션 로직
  if (!requiredRole) {
    // 역할이 지정되지 않은 경우 (공통 페이지), 바로 접근 허용
    console.log('Common page access, no role restriction');
    return <>{children}</>;
  }

  if (user.role !== requiredRole) {
    console.log('Role mismatch:', { userRole: user.role, requiredRole });

    // 특정 매장 모드 본사 관리자 시스템 접근 허용
    const isSpecificStoreMode = searchParams.get('store');
    if (requiredRole === 'store' && user.role === 'hq' && isSpecificStoreMode) {
      console.log('Specific store mode: HQ admin accessing store system, access granted');
      return <>{children}</>;
    }

    // 역할이 맞지 않는 경우, 사용자 역할에 맞는 페이지로 리디렉션
    switch (user.role) {
      case 'hq':
        console.log('HQ admin accessing store page, redirecting to storemanager');
        return <Navigate to="/storemanager" replace />;

      case 'store':
        console.log('Store manager accessing hq page, redirecting to system');
        return <Navigate to="/system" replace />;

      default:
        console.log('Unknown role, showing access denied');
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">접근 거부</h1>
              <p className="text-gray-300 mb-2">이 페이지에 접근할 권한이 없습니다.</p>
              <p className="text-gray-400 text-sm">
                현재 역할: {user.role || '없음'} | 필요 역할: {requiredRole}
              </p>
            </div>
          </div>
        );
    }
  }

  console.log('Access granted, rendering children');
  return <>{children}</>;
};
