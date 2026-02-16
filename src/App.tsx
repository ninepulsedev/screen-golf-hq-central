import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CountryProvider } from './contexts/CountryContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleBasedRedirect } from './components/RoleBasedRedirect';
import { Layout } from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationContainer from './components/NotificationContainer';

// Direct imports for stability
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import StoreManager from './pages/StoreManager';
import SystemManager from './pages/SystemManager';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CountryProvider>
        <NotificationProvider>
          <Router>
              <Routes>
                {/* 랜딩 페이지 */}
                <Route path="/" element={<Landing />} />

                {/* 로그인 페이지 */}
                <Route path="/login" element={<Login />} />

                {/* 로그인 후 역할 기반 리디렉션 */}
                <Route path="/redirect" element={
                  <RoleBasedRedirect />
                } />

                {/* 보호된 라우트 */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />

                <Route path="/storemanager" element={
                  <ProtectedRoute requiredRole="hq">
                    <Layout>
                      <StoreManager />
                    </Layout>
                  </ProtectedRoute>
                } />

                <Route path="/system" element={
                  <ProtectedRoute requiredRole="store">
                    <Layout>
                      <SystemManager />
                    </Layout>
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
          </Router>
        </NotificationProvider>
      </CountryProvider>
    </AuthProvider>
  );
};

export default App;
