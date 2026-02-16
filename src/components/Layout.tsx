import React, { ReactNode, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import NotificationContainer from './NotificationContainer';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950/50 p-4 mobile-content">
          {children || <Outlet />}
        </main>
        <NotificationContainer />
      </div>
    </div>
  );
};
