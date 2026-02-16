import React, { useState, useEffect } from 'react';
import { BellIcon, UserIcon, HomeIcon, BuildingOfficeIcon, Cog6ToothIcon, ChartBarIcon, InformationCircleIcon, WifiIcon, SignalSlashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { PAGE_INFO } from '../data/pageInfo';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showPanel, setShowPanel] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 연결 상태 모니터링
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 동적 페이지 정보 가져오기
  const getPageInfo = (pathname: string) => {
    return PAGE_INFO[pathname] || PAGE_INFO['/'];
  };

  const pageInfo = getPageInfo(location.pathname);
  const Icon = pageInfo.icon;

  // 패널 토글
  const togglePanel = () => {
    setShowPanel(!showPanel);
  };

  // 외부 클릭 시 패널 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const headerElement = target.closest('header');
      const panelElement = target.closest('.dynamic-panel');

      if (headerElement && !panelElement) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPanel]);

  return (
    <>
      {/* 모바일 헤더 */}
      <header className="mobile-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            {/* 햄버거 버튼 */}
            <button
              onClick={onMenuClick}
              className="mobile-menu-button touch-target"
              title="메뉴"
            >
              <Bars3Icon />
            </button>

            <div className="ml-4 flex items-center">
              <Icon className={`w-8 h-8 mr-3 ${pageInfo.color}`} />
              <h2 className="text-xl font-semibold text-white">{pageInfo.title}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* 사용자 정보 - PC와 동일하게 표시 */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.displayName || '관리자'}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.email || 'admin@screengolf.com'}
                </p>
              </div>
              <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 데스크톱 헤더 */}
      <header className="hidden lg:block bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50">
        <div className="flex items-center justify-between px-8 h-20">
          <div className="flex items-center">
            <Icon className={`w-10 h-10 mr-4 ${pageInfo.color}`} />
            <h2 className="text-2xl font-semibold text-white">{pageInfo.title}</h2>
          </div>

          <div className="flex items-center space-x-6">
            {/* 사용자 정보만 표시 */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-base font-medium text-white">
                  {user?.displayName || '관리자'}
                </p>
                <p className="text-sm text-gray-400">
                  {user?.email || 'admin@screengolf.com'}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* 동적 정보 패널 */}
          <div className={`absolute right-8 top-20 w-80 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50 transition-all duration-300 ${showPanel ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}>
            <div className="p-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">주요 기능:</h4>
                <ul className="space-y-2">
                  {pageInfo.details.map((detail: string, index: number) => (
                    <li key={index} className="flex items-center text-sm text-gray-400">
                      <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>연결 상태:</span>
                  <span className={isOnline ? "text-green-500" : "text-red-500"}>
                    {isOnline ? "온라인" : "오프라인"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>마지막 업데이트: {new Date().toLocaleString('ko-KR')}</span>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
