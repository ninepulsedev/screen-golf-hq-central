import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useCountry } from '../contexts/CountryContext';
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  BuildingOfficeIcon,
  PencilIcon,
  WifiIcon,
  SignalSlashIcon,
  ComputerDesktopIcon,
  HomeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { formatPhoneNumberWithCountry } from '../utils/phoneFormatter';
import { generateStoreId } from '../utils/storeUtils';

interface StoreManager {
  uid: string;
  email: string; // 이메일 주소 (주요 식별자)
  extraEmail?: string; // 추가 이메일 (본사 관리자용)
  storeName: string;
  phoneNumber: string;
  role: string;
  createdAt: any;
  lastLogin: any;
  approved: boolean;
  region?: string; // 지역 정보 추가
  country?: string; // 국가 정보 추가
  countryCode?: string; // 국가 코드 추가
  clientIP?: string; // IP 주소 정보 추가
  city?: string; // 도시 정보 추가
}

const StoreManager: React.FC = () => {
  const { user } = useAuth();
  const { selectedCountry } = useCountry();
  const navigate = useNavigate();
  const [managers, setManagers] = useState<StoreManager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<StoreManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [useCardView, setUseCardView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 본사 관리자 여부 확인 - 기존 방식과 통일
  const isHqAdmin = user?.role === 'hq';

  // 지원하는 국가 목록
  const COUNTRIES = [
    { code: '전체', name: '전체', enName: 'All' },
    { code: 'KR', name: '대한민국', enName: 'South Korea' },
    { code: 'US', name: 'United States', enName: 'United States' },
    { code: 'JP', name: '일본', enName: 'Japan' },
    { code: 'CN', name: '중국', enName: 'China' },
    { code: 'GB', name: '영국', enName: 'United Kingdom' },
    { code: 'DE', name: '독일', enName: 'Germany' },
    { code: 'FR', name: '프랑스', enName: 'France' },
    { code: 'IT', name: '이탈리아', enName: 'Italy' },
    { code: 'ES', name: '스페인', enName: 'Spain' },
    { code: 'NL', name: '네덜란드', enName: 'Netherlands' }
  ];

  useEffect(() => {
    fetchManagers();
  }, []);

  useEffect(() => {
    // 선택된 국가에 따라 필터링
    if (selectedCountry === 'ALL') {
      setFilteredManagers(managers);
    } else {
      setFilteredManagers(managers.filter(manager => manager.countryCode === selectedCountry));
    }
  }, [selectedCountry, managers]);

  useEffect(() => {
    // 국가 선택에 따라 언어 설정
    if (selectedCountry === 'KR') {
      setSelectedLanguage('ko');
    } else if (['US', 'GB', 'AU', 'CA', 'NZ'].includes(selectedCountry)) {
      setSelectedLanguage('en');
    } else {
      setSelectedLanguage('ko'); // 기본 한국어
    }
  }, [selectedCountry]);

  // ResizeObserver를 사용하여 테이블 오버플로우 감지
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const tableElement = entry.target.querySelector('table');

      if (tableElement) {
        const needsScroll = tableElement.scrollWidth > entry.target.clientWidth;
        setUseCardView(needsScroll);
      }
    });

    if (containerRef.current && !loading && filteredManagers.length > 0) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [filteredManagers, loading]);

  // 언어별 텍스트
  const texts = {
    ko: {
      countrySelection: '국가 선택',
      managerList: '매장 목록',
      system: '시스템',
      country: '국가',
      region: '지역',
      storeName: '매장명',
      manager: '관리자',
      phone: '전화번호',
      createdAt: '가입일',
      status: '상태',
      approval: '승인',
      delete: '삭제',
      online: '온라인',
      offline: '오프라인',
      loading: '매장 목록을 불러오는 중...',
      error: '매장 목록을 불러오는데 실패했습니다.',
      managerCount: '개의 매장'
    },
    en: {
      countrySelection: 'Country Selection',
      managerList: 'Store List',
      system: 'System',
      country: 'Country',
      region: 'Region',
      storeName: 'Store Name',
      manager: 'Manager',
      phone: 'Phone',
      createdAt: 'Joined',
      status: 'Status',
      approval: 'Approval',
      delete: 'Delete',
      online: 'Online',
      offline: 'Offline',
      loading: 'Loading store list...',
      error: 'Failed to load store list.',
      managerCount: 'stores'
    }
  };

  const t = texts[selectedLanguage];

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const managerList: StoreManager[] = [];

      // 국가별 users 컬렉션 병렬 조회
      const countryCodes = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

      console.log(' 매장 관리자 데이터 병렬 조회 시작...');

      // Promise.all로 모든 국가 컬렉션을 동시에 조회
      const promises = countryCodes.map(async (countryCode) => {
        try {
          const usersRef = collection(db, `users_${countryCode}`);
          const querySnapshot = await getDocs(usersRef);

          const managers: StoreManager[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.role === 'store') {
              managers.push({
                uid: data.uid,
                email: data.email,
                extraEmail: data.extraEmail,
                storeName: data.storeName,
                phoneNumber: data.phoneNumber,
                role: data.role,
                createdAt: data.createdAt,
                lastLogin: data.lastLogin,
                approved: data.approved,
                country: data.country || '알 수 없음',
                countryCode: countryCode,
                region: data.region || '알 수 없음',
                city: data.city || '알 수 없음',
                clientIP: data.clientIP
              });
            }
          });

          console.log(` ${countryCode}: ${managers.length}개 매장 관리자 조회 완료`);
          return managers;
        } catch (error) {
          console.error(` ${countryCode} 조회 오류:`, error);
          return [];
        }
      });

      // 모든 병렬 조회 완료 대기
      const results = await Promise.all(promises);

      // 결과 합치기
      results.forEach(managers => {
        managerList.push(...managers);
      });

      console.log(` 전체 매장 관리자 조회 완료: ${managerList.length}개`);
      setManagers(managerList);
    } catch (err) {
      console.error('매장 관리자 목록 조회 오류:', err);
      setError('매장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (uid: string, approved: boolean) => {
    try {
      // email로 문서 찾기
      const manager = managers.find(m => m.uid === uid);
      if (!manager) return;

      await updateDoc(doc(db, "users", manager.email), {
        approved: approved,
        lastLogin: new Date()
      });

      setManagers(managers.map(m =>
        m.uid === uid ? { ...m, approved } : m
      ));
    } catch (err) {
      console.error('승인 상태 변경 오류:', err);
      setError('승인 상태 변경에 실패했습니다.');
    }
  };

  const deleteManager = async (uid: string) => {
    if (!confirm('정말로 이 매장 관리자를 삭제하시겠습니까?')) return;

    try {
      const manager = managers.find(m => m.uid === uid);
      if (!manager) return;

      await deleteDoc(doc(db, "users", manager.email));

      setManagers(managers.filter(m => m.uid !== uid));
    } catch (err) {
      console.error('매장 관리자 삭제 오류:', err);
      setError('매장 관리자 삭제에 실패했습니다.');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR');
  };

  const isRecentlyOnline = (lastLogin: any) => {
    if (!lastLogin) return false;
    const lastLoginDate = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastLoginDate.getTime()) / (1000 * 60);
    return diffInMinutes <= 5; // 5분 이내 접속이면 온라인으로 간주
  };

  // 카드 뷰 렌더링 함수
  const renderCardView = () => (
    <div className="mobile-card-grid">
      {filteredManagers.map((manager) => (
        <div key={manager.uid} className="mobile-card">
          {/* 카드 헤더: 매장명 + 상태 */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">{manager.storeName}</h3>
            <div className="flex items-center space-x-2">
              {isRecentlyOnline(manager.lastLogin) ? (
                <>
                  <WifiIcon className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-500">{t.online}</span>
                </>
              ) : (
                <>
                  <SignalSlashIcon className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-500">{t.offline}</span>
                </>
              )}
            </div>
          </div>

          {/* 카드 본문: 관리자 정보 */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{t.manager}:</span>
              <span className="text-sm text-white font-medium">{manager.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{t.phone}:</span>
              <span className="text-sm text-gray-300">{formatPhoneNumberWithCountry(manager.phoneNumber, manager.country)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{t.country}:</span>
              <span className="text-sm text-gray-300">{manager.country || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{t.region}:</span>
              <span className="text-sm text-gray-300">{manager.region}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">{t.createdAt}:</span>
              <span className="text-sm text-gray-300">{formatDate(manager.createdAt)}</span>
            </div>
          </div>

          {/* 카드 푸터: 액션 버튼 */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700 justify-center">
            <Link
              to={`/dashboard?mode=store&storeId=${generateStoreId(manager.email)}`}
              className="flex items-center space-x-1 px-4 py-3 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors text-sm"
            >
              <ChartBarIcon className="w-4 h-4" />
              <span>대시보드</span>
            </Link>

            <Link
              to={`/system?store=${manager.email}`}
              className="flex items-center space-x-1 px-4 py-3 bg-cyan-600/20 text-cyan-400 rounded-full hover:bg-cyan-600/30 transition-colors text-sm"
            >
              <ComputerDesktopIcon className="w-4 h-4" />
              <span>{t.system}</span>
            </Link>

            {isHqAdmin && (
              <>
                <button
                  onClick={() => toggleApproval(manager.uid, !manager.approved)}
                  className={`flex items-center space-x-1 px-4 py-3 rounded-full transition-colors text-sm ${manager.approved
                    ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                    : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                    }`}
                >
                  {manager.approved ? (selectedLanguage === 'ko' ? '승인됨' : 'Approved') : (selectedLanguage === 'ko' ? '대기' : 'Pending')}
                </button>

                <button
                  onClick={() => deleteManager(manager.uid)}
                  className="flex items-center space-x-1 px-4 py-3 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors text-sm"
                  title={t.delete}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>{t.delete}</span>
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* 관리자 목록 컨테이너 */}
      <div className="bg-gray-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">{t.managerList}</h2>
        </div>

        <div ref={containerRef} className="responsive-container transition-all duration-300 ease-in-out">
          {useCardView ? (
            // 카드 뷰
            <div className="p-4">
              {renderCardView()}
            </div>
          ) : (
            // 테이블 뷰 (기존 코드)
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800/50">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      대시보드
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.system}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.country}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.region}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.storeName}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.manager}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.phone}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.createdAt}
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {t.status}
                    </th>
                    {isHqAdmin && (
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t.approval}
                      </th>
                    )}
                    {isHqAdmin && (
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t.delete}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-gray-900/30 divide-y divide-gray-800/50">
                  {filteredManagers.map((manager) => (
                    <tr key={manager.uid} className="hover:bg-gray-800/30 transition-colors">
                      {/* 🆕 대시보드 아이콘 */}
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <Link
                          to={`/dashboard?mode=store&storeId=${generateStoreId(manager.email)}`}
                          className="inline-block p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                          title="매장 통계"
                        >
                          <ChartBarIcon className="w-6 h-6 text-green-400" />
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <Link
                          to={`/system?store=${manager.email}`}
                          className="inline-block p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                          title="시스템 관리"
                        >
                          <ComputerDesktopIcon className="w-6 h-6 text-cyan-400" />
                        </Link>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base text-gray-300">{manager.country || '-'}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base text-gray-300">{manager.region}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base text-gray-300">{manager.storeName}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base font-medium text-white">{manager.email}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base text-gray-300">{formatPhoneNumberWithCountry(manager.phoneNumber, manager.country)}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-base text-gray-300">{formatDate(manager.createdAt)}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {isRecentlyOnline(manager.lastLogin) ? (
                            <>
                              <WifiIcon className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-500">{t.online}</span>
                            </>
                          ) : (
                            <>
                              <SignalSlashIcon className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-500">{t.offline}</span>
                            </>
                          )}
                        </div>
                      </td>
                      {isHqAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => toggleApproval(manager.uid, !manager.approved)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${manager.approved
                              ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                              : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                              }`}
                          >
                            {manager.approved ? (selectedLanguage === 'ko' ? '승인됨' : 'Approved') : (selectedLanguage === 'ko' ? '대기' : 'Pending')}
                          </button>
                        </td>
                      )}
                      {isHqAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => deleteManager(manager.uid)}
                            className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                            title={t.delete}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredManagers.length === 0 && (
          <div className="text-center py-6">
            <UserGroupIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">{selectedLanguage === 'ko' ? '가입된 매장이 없습니다.' : 'No registered stores found.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManager;
