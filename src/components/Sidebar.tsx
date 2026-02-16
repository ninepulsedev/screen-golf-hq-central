import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import CountrySelector from './CountrySelector';
import { useAuth } from '../contexts/AuthContext';
import { useCountry } from '../contexts/CountryContext';

const allMenuItems = [
  { name: '매장 관리자', href: '/storemanager', icon: BuildingOfficeIcon },
  { name: '대시보드', href: '/dashboard', icon: ChartBarIcon },
  { name: '시스템', href: '/system', icon: ComputerDesktopIcon },
  { name: '설정', href: '/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { selectedCountry, setSelectedCountry } = useCountry();

  // 반응형 PC 감지 - 실시간으로 화면 크기 변화 감지
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const shouldShow = isDesktop || isOpen;

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    console.log('Country selected in Sidebar:', countryCode);
  };

  const handleMenuItemClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* 모바일 사이드바 */}
      <div className={`mobile-nav ${shouldShow ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* 닫기 버튼 */}
        <div className="flex items-center justify-between p-4 lg:hidden">
          <h1 className="text-xl font-bold text-white">스크린골프 관리</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 데스크톱 헤더 */}
        <div className="hidden lg:flex items-center justify-center h-20 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600">
          <h1 className="text-xl font-bold text-white">스크린골프 관리</h1>
        </div>

        {/* 국가 선택기 - 본사 관리자에게만 표시 */}
        {user?.role === 'hq' && (
          <div className="px-4 pt-6 pb-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <label className="text-gray-300 text-xs font-medium mb-2 block">국가 선택</label>
              <CountrySelector
                value={selectedCountry}
                onChange={handleCountryChange}
                placeholder="Search country..."
              />
            </div>
          </div>
        )}

        {/* 홈으로 버튼 */}
        <div className="px-4 pb-2">
          <Link
            to="/login"
            onClick={handleMenuItemClick}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 touch-target ${location.pathname === '/'
              ? 'bg-cyan-600/20 text-cyan-400 border-r-2 border-cyan-400'
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
          >
            <HomeIcon className="w-5 h-5 mr-3" />
            홈으로
          </Link>
        </div>

        <nav className="mt-2">
          <div className="px-4 space-y-2">
            {allMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              // 본사 관리자일 때 시스템 메뉴 숨김, 매장 관리자일 때 매장 관리자 메뉴 숨김
              const isHidden = (user?.role === 'hq' && item.name === '시스템') || (user?.role === 'store' && item.name === '매장 관리자');

              if (isHidden) {
                return null; // 메뉴 항목을 완전히 숨김
              }

              return (
                <div key={item.name}>
                  <Link
                    to={item.href}
                    onClick={handleMenuItemClick}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 touch-target ${isActive
                      ? 'bg-cyan-600/20 text-cyan-400 border-r-2 border-cyan-400'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};
