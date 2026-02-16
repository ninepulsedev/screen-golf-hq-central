import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove, getDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { generateStoreId, normalizeCountryCode } from '../utils/storeUtils';
import { COUNTRY_OPTIONS, searchCountries, getCountryOption } from '../data/countryCodes';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Room {
  id: string;
  name: string;
  status: 'available' | 'occupied';
  startTime?: string;
  endTime?: string;
  currentGame?: {
    startTime: Date;
    endTime: Date;
    totalFee: number;
  };
}

interface Store {
  id: string;
  name: string;
  managerEmail: string;
  country: string;
  region: string;
  city: string;
  address?: string;
  phone?: string;
  roomCount: number;
  createdAt: any;
}

interface Settlement {
  id: string;
  roomId: string;
  roomName: string;
  storeId: string;
  startTime: string;
  endTime: string;
  usageMinutes: number;
  totalFee: number;
  createdAt: any;
}

interface GameRecord {
  id: string;
  roomId: string;
  roomName: string;
  startTime: Date;
  endTime: Date;
  totalFee: number;
  createdAt: any;
}

interface StoreManager {
  email: string;
  storeName?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  role?: string;
  roomCount?: number;
  createdAt?: any;
  lastActive?: any;
  uid?: string;
  phoneNumber?: string;
  approved?: boolean;
  requestedAt?: any;
  approvedAt?: any;
  approvedBy?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

const SystemManager: React.FC = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeManagers, setStoreManagers] = useState<StoreManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdRooms, setCreatedRooms] = useState<Room[]>([]);

  // 필터링 상태
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredManagers, setFilteredManagers] = useState<StoreManager[]>([]);

  // 매장 관리자 승인 상태 관리
  const [pendingManagers, setPendingManagers] = useState<StoreManager[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'approval'>('overview');

  // 🆕 매장 관리자 삭제 기능 상태
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [settlementModal, setSettlementModal] = useState<{
    isOpen: boolean;
    room: Room | null;
    startTime: string;
    endTime: string;
    usageTime: string;
    totalFee: number;
  }>({
    isOpen: false,
    room: null,
    startTime: '',
    endTime: '',
    usageTime: '',
    totalFee: 0
  });

  // 날짜 변환 함수
  const convertTimestampToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  };

  // 매장 정보 조회
  const fetchStores = async () => {
    if (!user?.email || !user?.countryCode) {
      console.error('사용자 정보가 없습니다.');
      return;
    }

    try {
      const storesRef = collection(db, 'stores');
      const querySnapshot = await getDocs(storesRef);
      const storesList: Store[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        storesList.push({
          id: doc.id,
          name: data.name || '기본 매장',
          managerEmail: data.managerEmail || user.email,
          country: data.country || user.country || '대한민국',
          region: data.region || user.region || '미설정',
          city: data.city || user.city || '미설정',
          address: data.address || '',
          phone: data.phone || '',
          roomCount: data.roomCount || 0,
          createdAt: data.createdAt || new Date()
        });
      });

      setStores(storesList);
      console.log('🏪 매장 정보 조회 완료:', storesList.length, '개');
    } catch (err) {
      console.error('❌ 매장 정보 조회 실패:', err);
      setError('매장 정보를 불러오는 데 실패했습니다.');
    }
  };

  // 매장 관리자 목록 조회
  const fetchStoreManagers = async () => {
    if (user?.role === 'hq') {
      console.log('🔍 본사 관리자 확인, 매장 관리자 목록 조회 시작...');
      try {
        const managers: StoreManager[] = [];

        // users_KR 컬렉션 조회
        console.log('📂 users_KR 컬렉션 조회 중...');
        const krUsersCollection = collection(db, 'users_KR');
        const krUsersSnapshot = await getDocs(krUsersCollection);
        console.log(`📊 users_KR 문서 수: ${krUsersSnapshot.docs.length}`);

        krUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          console.log(`👤 KR 사용자: ${doc.id}, role: ${userData.role}, storeName: ${userData.storeName}`);
          if (userData.role === 'store' || userData.storeName) {
            managers.push({
              email: doc.id,
              storeName: userData.storeName,
              country: userData.country || '대한민국',
              countryCode: userData.countryCode || 'KR',
              region: userData.region,
              city: userData.city,
              role: userData.role,
              roomCount: userData.roomCount || 0,
              createdAt: userData.createdAt,
              lastActive: userData.lastActive
            });
          }
        });

        // users_US 컬렉션 조회
        console.log('📂 users_US 컬렉션 조회 중...');
        const usUsersCollection = collection(db, 'users_US');
        const usUsersSnapshot = await getDocs(usUsersCollection);
        console.log(`📊 users_US 문서 수: ${usUsersSnapshot.docs.length}`);

        usUsersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          console.log(`👤 US 사용자: ${doc.id}, role: ${userData.role}, storeName: ${userData.storeName}`);
          if (userData.role === 'store' || userData.storeName) {
            managers.push({
              email: doc.id,
              storeName: userData.storeName,
              country: userData.country || 'United States',
              countryCode: userData.countryCode || 'US',
              region: userData.region,
              city: userData.city,
              role: userData.role,
              roomCount: userData.roomCount || 0,
              createdAt: userData.createdAt,
              lastActive: userData.lastActive
            });
          }
        });

        console.log(`✅ 최종 매장 관리자 수: ${managers.length}`);
        setStoreManagers(managers);
        console.log('🏢 매장 관리자 목록 조회 완료:', managers.length, '개');
      } catch (err) {
        console.error('❌ 매장 관리자 목록 조회 실패:', err);
        setError('매장 관리자 목록을 불러오는 데 실패했습니다.');
      }
    } else {
      console.log('❌ 본사 관리자가 아님:', user?.role);
    }
  };

  // 매장 관리자 승인 기능
  const toggleApproval = async (email: string, approved: boolean) => {
    try {
      const userDocRef = doc(db, `users_${user?.countryCode || 'KR'}`, email);
      await updateDoc(userDocRef, {
        approved,
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? user?.email : null,
        status: approved ? 'approved' : 'rejected'
      });

      // 상태 업데이트
      setStoreManagers(prev =>
        prev.map(manager =>
          manager.email === email
            ? { ...manager, approved, status: approved ? 'approved' : 'rejected' }
            : manager
        )
      );

      console.log(`📋 매장 관리자 ${approved ? '승인' : '거절'}:`, email);
    } catch (error) {
      console.error('❌ 승인 처리 실패:', error);
      alert('승인 처리에 실패했습니다.');
    }
  };

  // 대기 중인 매장 관리자 조회
  const fetchPendingManagers = async () => {
    if (user?.role !== 'hq') return;

    try {
      const allPending: StoreManager[] = [];

      // users_KR 컬렉션에서 대기자 조회
      const krUsersCollection = collection(db, 'users_KR');
      const krUsersSnapshot = await getDocs(krUsersCollection);
      krUsersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (!userData.approved && userData.storeName) {
          allPending.push({
            email: doc.id,
            storeName: userData.storeName,
            country: userData.country || '대한민국',
            countryCode: userData.countryCode || 'KR',
            region: userData.region,
            city: userData.city,
            role: userData.role,
            roomCount: userData.roomCount || 0,
            createdAt: userData.createdAt,
            lastActive: userData.lastActive,
            uid: userData.uid,
            phoneNumber: userData.phoneNumber,
            approved: userData.approved || false,
            requestedAt: userData.createdAt,
            status: userData.status || 'pending'
          });
        }
      });

      // users_US 컬렉션에서 대기자 조회
      const usUsersCollection = collection(db, 'users_US');
      const usUsersSnapshot = await getDocs(usUsersCollection);
      usUsersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (!userData.approved && userData.storeName) {
          allPending.push({
            email: doc.id,
            storeName: userData.storeName,
            country: userData.country || 'United States',
            countryCode: userData.countryCode || 'US',
            region: userData.region,
            city: userData.city,
            role: userData.role,
            roomCount: userData.roomCount || 0,
            createdAt: userData.createdAt,
            lastActive: userData.lastActive,
            uid: userData.uid,
            phoneNumber: userData.phoneNumber,
            approved: userData.approved || false,
            requestedAt: userData.createdAt,
            status: userData.status || 'pending'
          });
        }
      });

      setPendingManagers(allPending);
      console.log(' 대기 중인 매장 관리자:', allPending.length, '개');
    } catch (error) {
      console.error(' 대기자 조회 실패:', error);
    }
  };

  // 매장 관리자 삭제 기능
  const toggleManagerSelection = (email: string, checked: boolean) => {
    if (checked) {
      setSelectedManagers(prev => [...prev, email]);
    } else {
      setSelectedManagers(prev => prev.filter(e => e !== email));
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEmails = filteredManagers.map(m => m.email);
      setSelectedManagers(allEmails);
    } else {
      setSelectedManagers([]);
    }
  };

  const deleteManager = async (email: string) => {
    try {
      // users_KR 또는 users_US 컬렉션에서 삭제
      const manager = storeManagers.find(m => m.email === email);
      const countryCode = manager?.countryCode || 'KR';
      const userDocRef = doc(db, `users_${countryCode}`, email);
      await deleteDoc(userDocRef);

      // 상태 업데이트
      setStoreManagers(prev => prev.filter(m => m.email !== email));
      setSelectedManagers(prev => prev.filter(e => e !== email));

      console.log(` 매장 관리자 삭제:`, email);
    } catch (error) {
      console.error(' 매장 관리자 삭제 실패:', error);
      alert('매장 관리자 삭제에 실패했습니다.');
    }
  };

  const deleteSelectedManagers = async () => {
    if (selectedManagers.length === 0) {
      alert('삭제할 매장 관리자를 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택된 ${selectedManagers.length}명의 매장 관리자를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      for (const email of selectedManagers) {
        const manager = storeManagers.find(m => m.email === email);
        const countryCode = manager?.countryCode || 'KR';
        const userDocRef = doc(db, `users_${countryCode}`, email);
        await deleteDoc(userDocRef);
      }

      // 상태 업데이트
      setStoreManagers(prev => prev.filter(m => !selectedManagers.includes(m.email)));
      setSelectedManagers([]);
      setShowDeleteConfirm(false);

      console.log(` 일괄 매장 관리자 삭제:`, selectedManagers.length, '명');
    } catch (error) {
      console.error(' 일괄 삭제 실패:', error);
      alert('일괄 삭제에 실패했습니다.');
    }
  };

  // 필터링 로직
  useEffect(() => {
    let filtered = storeManagers;

    // 국가 필터링
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(manager => manager.countryCode === selectedCountry);
    }

    // 검색 필터링
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(manager =>
        (manager.storeName && manager.storeName.toLowerCase().includes(term)) ||
        manager.email.toLowerCase().includes(term) ||
        (manager.region && manager.region.toLowerCase().includes(term)) ||
        (manager.city && manager.city.toLowerCase().includes(term))
      );
    }

    setFilteredManagers(filtered);
  }, [storeManagers, selectedCountry, searchTerm]);

  useEffect(() => {
    const loadData = async () => {
      await fetchStores();
      await fetchStoreManagers();
      if (user?.role === 'hq') {
        await fetchPendingManagers();
      }
      setLoading(false);
    };

    loadData();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 본사 관리자 화면 */}
      {user?.role === 'hq' && (
        <div className="card-primary">
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 mb-6 border-b border-gray-700/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'overview'
                ? 'text-primary border-primary bg-primary/10'
                : 'text-gray-400 border-transparent hover:text-white'
                }`}
            >
              📊 전체 현황
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-6 py-3 font-medium transition-colors border-b-2 relative ${activeTab === 'approval'
                ? 'text-primary border-primary bg-primary/10'
                : 'text-gray-400 border-transparent hover:text-white'
                }`}
            >
              ✅ 승인 대기
              {pendingManagers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-warning text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingManagers.length}
                </span>
              )}
            </button>
          </div>

          {/* 전체 현황 탭 */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h2">전국 매장 관리자 목록</h3>
                <div className="text-body">
                  총 {filteredManagers.length}개 매장
                </div>
              </div>

              {/* 필터링 컴포넌트 */}
              <div className="card-secondary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 국가 선택 드롭다운 */}
                  <div>
                    <label className="block text-body font-medium mb-2">
                      국가 선택
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">🌍 전체 국가</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.nameKo} ({country.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 검색 입력창 */}
                  <div className="md:col-span-2">
                    <label className="block text-body font-medium mb-2">
                      매장 검색
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="매장명, 관리자 이메일, 지역으로 검색..."
                        className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="icon-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 초기화 버튼 */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedCountry('all');
                      setSearchTerm('');
                    }}
                    className="btn-secondary"
                  >
                    필터 초기화
                  </button>
                </div>
              </div>

              {/* 매장 관리자 목록 표시 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredManagers.length === 0 ? (
                  <div className="text-center py-12 col-span-full">
                    <BuildingOfficeIcon className="icon-lg text-gray-600 mx-auto mb-4" />
                    <p className="text-body text-lg">
                      {searchTerm || selectedCountry !== 'all'
                        ? '검색 결과가 없습니다.'
                        : '등록된 매장 관리자가 없습니다.'
                      }
                    </p>
                  </div>
                ) : (
                  filteredManagers.map((manager) => (
                    <div
                      key={manager.email}
                      className="card-secondary hover:border-gray-600/50 transition-all duration-300 hover:transform hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedManagers.includes(manager.email)}
                            onChange={(e) => toggleManagerSelection(manager.email, e.target.checked)}
                            className="w-4 h-4 text-cyan-600 rounded border-gray-600 focus:ring-cyan-500"
                          />
                          <div className="flex-1">
                            <h5 className="text-h3 text-white truncate">{manager.storeName || '미설정'}</h5>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${manager.role === 'store'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                          {manager.role === 'store' ? '매장 관리자' : '미승인'}
                        </span>
                        {/* 삭제 버튼 - 본사 관리자만 표시 */}
                        {user?.role === 'hq' && (
                          <button
                            onClick={() => deleteManager(manager.email)}
                            className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-body">관리자:</span>
                          <span className="text-primary">{manager.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-body">국가:</span>
                          <span className="text-white">
                            {(() => {
                              const countryOption = getCountryOption(manager.countryCode || '');
                              return countryOption
                                ? `${countryOption.flag} ${countryOption.nameKo}`
                                : manager.countryCode === 'KR' ? '대한민국' :
                                  manager.countryCode === 'US' ? 'United States' :
                                    manager.country || '미설정';
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-body">지역:</span>
                          <span className="text-white">{manager.region || '미설정'} {manager.city || ''}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-body">방 갯수:</span>
                          <span className="text-primary">{manager.roomCount || 0}개</span>
                        </div>
                        ))
                )}
                      </div>
                    </div>
    filteredManagers.length === 0 && (
                      <div className="text-center py-12">
                        <BuildingOfficeIcon className="icon-lg text-gray-600 mx-auto mb-4" />
                        <p className="text-body text-lg">
                          {searchTerm || selectedCountry !== 'all'
                            ? '검색 결과가 없습니다.'
                            : '등록된 매장 관리자가 없습니다.'
                          }
                        </p>
                      </div>
                    )
  }
              </div >
          )}

              {/* 승인 대기 탭 */}
              {
                activeTab === 'approval' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-h2">승인 대기 매장 관리자</h3>
                      <div className="text-body">
                        총 {pendingManagers.length}개 대기
                      </div>
                    </div>

                    {/* 승인 대기 목록 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700/50">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">신청일</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">매장명</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">관리자</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">국가</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">지역</th>
                            <th className="text-center py-3 px-4 text-gray-400 font-medium">상태</th>
                            <th className="text-center py-3 px-4 text-gray-400 font-medium">처리</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingManagers.map((manager) => (
                            <tr key={manager.email} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                              <td className="py-3 px-4 text-white">
                                {manager.requestedAt ?
                                  convertTimestampToDate(manager.requestedAt).toLocaleDateString('ko-KR') :
                                  '-'
                                }
                              </td>
                              <td className="py-3 px-4 text-white">{manager.storeName || '-'}</td>
                              <td className="py-3 px-4 text-primary">{manager.email}</td>
                              <td className="py-3 px-4 text-white">
                                {(() => {
                                  const countryOption = getCountryOption(manager.countryCode || '');
                                  return countryOption
                                    ? `${countryOption.flag} ${countryOption.nameKo}`
                                    : manager.countryCode === 'KR' ? '대한민국' :
                                      manager.countryCode === 'US' ? 'United States' :
                                        manager.country || '미설정';
                                })()}
                              </td>
                              <td className="py-3 px-4 text-white">{manager.region || '-'} {manager.city || ''}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${manager.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                  }`}>
                                  {manager.status === 'pending' ? '대기' :
                                    manager.status === 'approved' ? '승인됨' : '거절됨'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    onClick={() => toggleApproval(manager.email, true)}
                                    className="px-3 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    승인
                                  </button>
                                  <button
                                    onClick={() => toggleApproval(manager.email, false)}
                                    className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    거절
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {pendingManagers.length === 0 && (
                        <div className="text-center py-12">
                          <CheckCircleIcon className="icon-lg text-gray-600 mx-auto mb-4" />
                          <p className="text-body text-lg">승인 대기 중인 매장 관리자가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            </div >
          )}

          {/* 매장 관리자 화면 (기존 기능 유지) */}
          {
            user?.role !== 'hq' && (
              <div className="card-primary">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-h2">방 관리</h3>
                  <div className="text-body">
                    Settings 페이지에서 방 갯수를 설정하면 자동으로 생성됩니다
                  </div>
                </div>

                {/* 매장 정보 표시 영역 */}
                <div className="border-t border-gray-700/50 pt-6">
                  <h4 className="text-h3 mb-4">매장 정보</h4>
                  <div className="card-secondary">
                    {user?.email ? (() => {
                      const storeId = generateStoreId(user.email);
                      const currentStore = stores.find(s => s.id === storeId);
                      return (
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="text-body">매장명 :</span>
                          <span className="text-white font-medium">{currentStore?.name || '기본 매장'}</span>
                          <span className="text-body">•</span>
                          <span className="text-body">관리자 :</span>
                          <span className="text-white font-medium">{currentStore?.managerEmail || user?.email || '미설정'}</span>
                          <span className="text-body">•</span>
                          <span className="text-body">국가 :</span>
                          <span className="text-white font-medium">{currentStore?.country === 'KR' ? '대한민국' : currentStore?.country === 'US' ? 'United States' : '미설정'}</span>
                          <span className="text-body">•</span>
                          <span className="text-body">지역 :</span>
                          <span className="text-white font-medium">{currentStore?.region || '미설정'} {currentStore?.city || ''}</span>
                        </div>
                      );
                    })() : (
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-body">매장명 :</span>
                        <span className="text-white font-medium">기본 매장</span>
                        <span className="text-body">•</span>
                        <span className="text-body">관리자 :</span>
                        <span className="text-white font-medium">{user?.email || '미설정'}</span>
                        <span className="text-body">•</span>
                        <span className="text-body">국가 :</span>
                        <span className="text-white font-medium">미설정</span>
                        <span className="text-body">•</span>
                        <span className="text-body">지역 :</span>
                        <span className="text-white font-medium">미설정</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 방 목록 표시 */}
                <div className="mt-8">
                  <h4 className="text-h3 mb-4">방 목록</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {createdRooms.map((room) => (
                      <div key={room.id} className="card-secondary hover:border-gray-600/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-h3 text-white">{room.name}</h5>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {room.status === 'available' ? '사용 가능' : '사용 중'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-body">상태:</span>
                            <span className={`font-medium ${room.status === 'available' ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                              {room.status === 'available' ? '사용 가능' : '사용 중'}
                            </span>
                          </div>

                          {room.status === 'occupied' && room.currentGame && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-body">시작 시간:</span>
                                <span className="text-white">
                                  {convertTimestampToDate(room.currentGame.startTime).toLocaleTimeString('ko-KR')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-body">예상 요금:</span>
                                <span className="text-primary font-medium">
                                  {room.currentGame.totalFee.toLocaleString()}원
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-4">
                          {room.status === 'available' && (
                            <button className="btn-primary w-full">
                              시작
                            </button>
                          )}

                          {room.status === 'occupied' && (
                            <button className="btn-secondary w-full">
                              정산
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {createdRooms.length === 0 && (
                    <div className="text-center py-12">
                      <BuildingOfficeIcon className="icon-lg text-gray-600 mx-auto mb-4" />
                      <p className="text-body text-lg">생성된 방이 없습니다.</p>
                      <p className="text-body text-sm mt-2">Settings 페이지에서 방 갯수를 설정해주세요.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          }
        </div >
      );
};

      export default SystemManager;
