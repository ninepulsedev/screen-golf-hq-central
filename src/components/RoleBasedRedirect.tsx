import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RoleBasedRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // 역할에 따른 리디렉션
  switch (user.role) {
    case 'hq':
      console.log('HQ admin logged in, redirecting to storemanager');
      return <Navigate to="/storemanager" replace />;

    case 'store':
      console.log('Store manager logged in, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;

    default:
      console.log('Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
  }
};
