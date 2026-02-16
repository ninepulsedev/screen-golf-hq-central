import {
  HomeIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

export const PAGE_INFO = {
  '/': {
    title: '홈',
    icon: HomeIcon,
    color: 'text-cyan-400',
    description: '스크린골프 관리 시스템 메인 페이지',
    details: ['시스템 개요', '빠른 링크', '사용자 가이드']
  },
  '/dashboard': {
    title: '대시보드',
    icon: ChartBarIcon,
    color: 'text-blue-400',
    description: '시스템 대시보드 및 통계',
    details: ['실시간 통계', '성과 지표', '데이터 분석']
  },
  '/system': {
    title: '시스템 관리',
    icon: ComputerDesktopIcon,
    color: 'text-purple-400',
    description: '스토어 및 시스템 관리',
    details: ['스토어 관리', '방 상태 제어', '시스템 설정']
  },
  '/settings': {
    title: '설정',
    icon: Cog6ToothIcon,
    color: 'text-gray-400',
    description: '애플리케이션 설정 및 환경 설정',
    details: ['사용자 설정', '시스템 설정', '환경 설정']
  },
  '/storemanager': {
    title: '매장 관리자 관리',
    icon: BuildingOfficeIcon,
    color: 'text-emerald-400',
    description: '매장 관리자 및 권한 관리',
    details: ['관리자 목록', '승인 처리', '권한 설정']
  }
};

export type PageInfoType = typeof PAGE_INFO[keyof typeof PAGE_INFO];
