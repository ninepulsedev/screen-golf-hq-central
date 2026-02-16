import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useCountry } from '../contexts/CountryContext';
import { useSearchParams, Link } from 'react-router-dom';
import { generateStoreId, normalizeCountryCode } from '../utils/storeUtils';

// 동적 차트 컴포넌트
const DynamicBarChart: React.FC<{ data: any[] }> = ({ data }) => {
  const [ChartModule, setChartModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const module = await import('recharts');
        setChartModule(module);
      } catch (error) {
        console.error('Failed to load chart module:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, []);

  if (loading || !ChartModule) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } = ChartModule;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="period"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={40}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value: number) => `₩${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: number) => [`₩${value.toLocaleString()}`, '매출']}
          />
          <Bar
            dataKey="revenue"
            fill="#06B6D4"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface RevenueData {
  period: string;
  revenue: number;
  count: number;
  date: Date;
}

interface Settlement {
  totalFee: number;
  createdAt: Date;
  startTime: Date;
  endTime: Date;
  storeName: string;
  roomName: string;
  storeId?: string; // 🆕 storeId 필드 추가
}

interface Store {
  id: string;
  name: string;
  email: string;
  countryCode: string;
}

type PeriodType = 'daily' | 'monthly' | 'yearly';
type ViewMode = 'all' | 'store';

// 🆕 매장 목록 조회 함수
const fetchStores = async (countryCode: string, currentUser: any, selectedCountry: string): Promise<Store[]> => {
  console.log('🏪 Dashboard: 매장 목록 조회 시작:', { countryCode, user: currentUser?.email, selectedCountry });

  // 🆕 국가 필터링 적용 - 선택된 국가가 ALL이 아닐 때만 해당 국가 매장 조회
  if (selectedCountry && selectedCountry !== 'ALL') {
    console.log('🌍 국가 필터링 적용:', selectedCountry);
    try {
      const usersRef = collection(db, `users_${selectedCountry}`);
      const q = query(usersRef, where('role', '==', 'store'));
      const querySnapshot = await getDocs(q);

      console.log(`📊 ${selectedCountry} 필터링 결과:`, querySnapshot.size, '개 문서 찾음');

      const stores: Store[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.storeName) {
          const storeName = data.storeName.trim();
          if (storeName) {
            stores.push({
              id: data.email,
              name: storeName,
              email: data.email,
              countryCode: selectedCountry
            });
          }
        }
      });

      console.log('✅ 국가 필터링 매장 목록 조회 성공:', stores.length, '개 매장');
      return stores;
    } catch (error: any) {
      console.error(`❌ ${selectedCountry} 필터링 매장 목록 조회 실패:`, error);
      return [];
    }
  }

  // 🆕 본사 관리자 특별 처리 - 국가코드 없어도 모든 국가 매장 조회
  if (currentUser?.role === 'hq') {
    console.log('🎯 본사 관리자 감지, 모든 국가 매장 조회 시작');
    const allCountryCodes = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

    for (const tryCountryCode of allCountryCodes) {
      try {
        console.log(`🔍 본사 관리자용 ${tryCountryCode} 국가 코드로 매장 목록 조회 시도...`);

        const usersRef = collection(db, `users_${tryCountryCode}`);
        const q = query(usersRef, where('role', '==', 'store'));
        const querySnapshot = await getDocs(q);

        console.log(`📊 ${tryCountryCode} 쿼리 결과:`, querySnapshot.size, '개 문서 찾음');

        const stores: Store[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();

          // storeName이 없으면 displayName이나 email을 사용
          const storeName = data.storeName || data.displayName || data.email;

          if (data.email && storeName) {
            stores.push({
              id: data.email,
              name: storeName,
              email: data.email,
              countryCode: tryCountryCode
            });
          }
        });

        // 매장을 찾은 경우 즉시 반환
        if (stores.length > 0) {
          console.log(`✅ 본사 관리자용 ${tryCountryCode}에서 매장 목록 조회 성공:`, stores.length, '개 매장');
          return stores;
        }

      } catch (error: any) {
        console.error(`❌ 본사 관리자용 ${tryCountryCode} 매장 목록 조회 실패:`, error);
        // 다음 countryCode로 시도
        continue;
      }
    }

    // 모든 국가에서 매장을 찾지 못한 경우 빈 배열 반환
    console.warn('⚠️ 본사 관리자용 모든 국가에서 매장을 찾지 못함');
    return [];
  }

  // 🆕 국가코드 자동 감지 (일반 사용자용)
  const inferredCountryCode = countryCode || inferCountryCode(currentUser?.email || '');
  console.log('🔍 추론된 국가코드:', inferredCountryCode);

  // 여러 countryCode 시도 (사용자의 countryCode가 없거나 잘못된 경우)
  const countryCodes = inferredCountryCode ? [inferredCountryCode] : ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

  for (const tryCountryCode of countryCodes) {
    try {
      console.log(`🔍 ${tryCountryCode} 국가 코드로 매장 목록 조회 시도...`);

      const usersRef = collection(db, `users_${tryCountryCode}`);
      const q = query(usersRef, where('role', '==', 'store'));
      const querySnapshot = await getDocs(q);

      console.log(`📊 ${tryCountryCode} 쿼리 결과:`, querySnapshot.size, '개 문서 찾음');

      const stores: Store[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // storeName이 없으면 displayName이나 email을 사용
        const storeName = data.storeName || data.displayName || data.email;

        if (data.email && storeName) {
          stores.push({
            id: data.email,
            name: storeName,
            email: data.email,
            countryCode: tryCountryCode
          });
        }
      });

      // 매장을 찾은 경우 즉시 반환
      if (stores.length > 0) {
        console.log(`✅ ${tryCountryCode}에서 매장 목록 조회 성공:`, stores.length, '개 매장');
        console.log('🏪 최종 매장 목록:', stores);
        return stores;
      }

    } catch (error: any) {
      console.error(`❌ ${tryCountryCode} 매장 목록 조회 실패:`, error);
      // 다음 countryCode로 시도
      continue;
    }
  }

  // 모든 countryCode에서 매장을 찾지 못한 경우
  console.warn('⚠️ 모든 국가 코드에서 매장을 찾지 못함, 폴백 매장 목록 사용');
  return [];
};

// 🆕 국가 코드 추론 함수
const inferCountryCode = (email: string): string => {
  if (!email) return '';

  const domain = email.split('@')[1]?.toLowerCase();
  const domainMap: { [key: string]: string } = {
    '.kr': 'KR',
    '.co.kr': 'KR',
    'naver.com': 'KR',
    'daum.net': 'KR',
    'gmail.com': 'US',
    'yahoo.com': 'US',
    'outlook.com': 'US'
  };

  for (const [key, value] of Object.entries(domainMap)) {
    if (domain?.includes(key)) {
      return value;
    }
  }

  return '';
};

// 🆕 매장 사용자 데이터 조회 함수 - AuthContext와 동일한 로직
const fetchStoreUserData = async (email: string) => {
  console.log('🔍 Dashboard: 매장 데이터 조회 시작:', email);

  // 국가별 users 컬렉션 순회
  const countryCodes = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

  for (const countryCode of countryCodes) {
    try {
      const userDocRef = doc(db, `users_${countryCode}`, email);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(`✅ Dashboard: ${countryCode}에서 매장 데이터 찾음:`, {
          email: userData.email,
          storeName: userData.storeName,
          countryCode: userData.countryCode,
          country: userData.country,
          role: userData.role
        });

        return {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          storeName: userData.storeName,
          countryCode: userData.countryCode,
          country: userData.country,
          region: userData.region,
          city: userData.city,
          extraEmail: userData.extraEmail,
          storeId: userData.storeId
        };
      }
    } catch (error) {
      console.error(`❌ Dashboard: ${countryCode} 조회 오류:`, error);
      continue;
    }
  }

  console.error('❌ Dashboard: 매장 데이터를 찾을 수 없음:', email);
  return null;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedCountry } = useCountry();
  const [searchParams] = useSearchParams();
  const targetStore = searchParams.get('store');
  const targetCountry = searchParams.get('country');

  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [targetStoreData, setTargetStoreData] = useState<any>(null);

  // 🆕 뷰 모드 및 매장 선택 상태 - 역할별 초기 설정
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // 🆕 실제 매장 목록 상태
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [hasStoreError, setHasStoreError] = useState(false);

  // 🆕 역할 식별
  const isStoreManager = user?.role === 'store';
  const storeId = isStoreManager && user.email ? generateStoreId(user.email) : null;

  // 🆕 특정 매장 모드 확인
  const isSpecificStoreMode = targetStore && targetCountry;

  // 🆕 URL 파라미터 처리 (뷰 모드 및 매장 선택 상태 초기화)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const storeId = urlParams.get('storeId');

    if (mode === 'store' && storeId) {
      setViewMode('store');
      setSelectedStoreId(storeId);
    } else {
      setViewMode('all');
      setSelectedStoreId(null);
    }
  }, []);

  // 국가 코드 정규화 함수
  const normalizeCountryCode = (country: string): string => {
    const countryMap: { [key: string]: string } = {
      '대한민국': 'KR',
      '한국': 'KR',
      'Korea': 'KR',
      'South Korea': 'KR',
      'United States': 'US',
      'USA': 'US',
      '미국': 'US',
      'America': 'US'
    };
    return countryMap[country] || country;
  };

  // Firestore에서 매출 데이터 조회
  const fetchRevenueData = async () => {
    console.log('🚀 Dashboard: fetchRevenueData 시작');
    console.log('👤 사용자 정보:', {
      email: user?.email,
      role: user?.role,
      countryCode: user?.countryCode,
      storeName: user?.storeName
    });
    console.log('🎯 viewMode:', viewMode, 'selectedStoreId:', selectedStoreId);
    console.log('🌍 선택된 국가:', selectedCountry);

    // 🆕 viewMode에 따른 초기 설정
    let targetCountryCode = user?.countryCode;
    let targetStoreId = null;

    // 🆕 HQ 사용자 국가 선택 우선 적용
    if (user?.role === 'hq' && selectedCountry && selectedCountry !== 'ALL') {
      console.log('🌍 HQ 사용자 국가 선택 적용:', selectedCountry);
      targetCountryCode = selectedCountry;
    }

    if (viewMode === 'store' && selectedStoreId) {
      // 매장 모드: 특정 매장 데이터 조회를 위한 설정
      console.log('🏪 매장 모드: 특정 매장 데이터 조회 - selectedStoreId:', selectedStoreId);
      targetStoreId = selectedStoreId;
    } else if (isSpecificStoreMode && targetStore) {
      // 구버전 URL 파라미터 처리 (하위 호환성)
      console.log('🔍 구버전 특정 매장 모드: 매장 데이터 조회 - targetStore:', targetStore);
      const storeUserData = await fetchStoreUserData(targetStore);
      if (storeUserData) {
        setTargetStoreData(storeUserData);
        targetCountryCode = storeUserData.countryCode;
        targetStoreId = storeUserData.storeId || generateStoreId(targetStore);
        console.log('✅ 구버전 특정 매장 데이터 찾음:', { storeName: storeUserData.storeName, countryCode: targetCountryCode, storeId: targetStoreId });
      } else {
        console.error('❌ 구버전 특정 매장 데이터를 찾을 수 없음:', targetStore);
        setLoading(false);
        return;
      }
    } else {
      // 전체 모드: 기존 로직 유지
      console.log('🌍 전체 모드: 모든 매장 데이터 조회');
    }

    let countryCode = targetCountryCode;
    let effectiveStoreId = targetStoreId || storeId;

    console.log('📍 최종 사용 국가 코드:', countryCode, '(선택된 국가:', selectedCountry, ')');

    // 🆕 매장 관리자 접근 제어
    if (user?.role === 'store' && targetStore && targetStore !== user.email) {
      console.warn('⚠️ 접근 권한 없음: 매장 관리자가 다른 매장 통계 접근 시도');
      setLoading(false);
      return;
    }

    // 🆕 countryCode가 없으면 직접 매장 데이터 조회로 fallback
    if (!countryCode && user?.email) {
      console.log('Dashboard: countryCode 없음, 직접 매장 데이터 조회 시도');

      // 🎯 movare00@gmail.com 특별 처리
      if (user.email === 'movare00@gmail.com' && user.role === 'hq') {
        console.log('🎯 movare00@gmail.com 본사 관리자 특별 처리 - 기본 countryCode 제공');
        countryCode = 'KR'; // 기본 국가코드 제공
      } else {
        const storeUserData = await fetchStoreUserData(user.email);
        if (storeUserData?.countryCode) {
          countryCode = storeUserData.countryCode;
          console.log('Dashboard: fallback으로 countryCode 찾음:', countryCode);
        }
      }
    }

    if (!countryCode) {
      console.error('Dashboard: countryCode를 찾을 수 없어 데이터 조회 불가');
      setLoading(false);
      // 🚨 가상데이터 사용금지: 실제 데이터만 사용
      console.warn('⚠️ countryCode 없음, 데이터를 조회할 수 없습니다.');
      setRevenueData([]);
      setTotalRevenue(0);
      setTotalTransactions(0);
      console.log('🔄 데이터 없음 상태로 설정 완료');
      return;
    }

    console.log('Dashboard: 매출 데이터 조회 시작 - countryCode:', countryCode, 'storeId:', effectiveStoreId);
    setLoading(true);
    try {
      const normalizedCountryCode = normalizeCountryCode(countryCode);
      const settlementsRef = collection(db, `settlements_${normalizedCountryCode}`);
      console.log('📁 조회 컬렉션:', `settlements_${normalizedCountryCode}`);

      // 기간별 쿼리 생성
      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);

      if (periodType === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (periodType === 'monthly') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
      } else if (periodType === 'yearly') {
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(11, 31);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('🔍 쿼리 조건:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        periodType
      });

      const q = query(
        settlementsRef,
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        // 🚨 임시: 서버 측 storeId 필터링 제거 (인덱스 문제)
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const settlements: Settlement[] = [];

      console.log('📊 쿼리 결과:', {
        totalDocs: querySnapshot.docs.length,
        querySize: querySnapshot.size,
        hasData: querySnapshot.docs.length > 0
      });

      if (querySnapshot.docs.length === 0) {
        console.warn('⚠️ Firestore에 데이터 없음');
        // 🚨 가상데이터 사용금지: 실제 데이터만 사용
        setRevenueData([]);
        setTotalRevenue(0);
        setTotalTransactions(0);
        console.log('🔄 데이터 없음 상태로 설정 완료');
        setLoading(false);
        return;
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 문서 데이터:', {
          id: doc.id,
          totalFee: data.totalFee,
          storeName: data.storeName,
          storeId: data.storeId,
          createdAt: data.createdAt
        });

        // 🆕 다양한 데이터 타입 처리
        const createdAt = data.createdAt?.toDate ?
          data.createdAt.toDate() :
          (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt));

        const startTime = data.startTime?.toDate ?
          data.startTime.toDate() :
          (typeof data.startTime === 'string' ? new Date(data.startTime) : new Date(data.startTime));

        const endTime = data.endTime?.toDate ?
          data.endTime.toDate() :
          (typeof data.endTime === 'string' ? new Date(data.endTime) : new Date(data.endTime));

        settlements.push({
          totalFee: data.totalFee || 0,
          createdAt: createdAt,
          startTime: startTime,
          endTime: endTime,
          storeName: data.storeName || '',
          roomName: data.roomName || '',
          storeId: data.storeId // 🆕 storeId 필드 추가
        });
      });

      // 🚨 임시: 클라이언트 측에서 storeId 필터링
      let filteredSettlements = settlements;
      if (effectiveStoreId) {
        filteredSettlements = settlements.filter(s => s.storeId === effectiveStoreId);
        console.log('🔍 클라이언트 필터링:', {
          totalSettlements: settlements.length,
          filteredSettlements: filteredSettlements.length,
          effectiveStoreId,
          viewMode,
          selectedStoreId,
          mode: viewMode === 'store' ? '새 매장 모드' : (isSpecificStoreMode ? '구버전 특정 매장' : '매장 관리자')
        });
      }

      // 기간별 데이터 집계
      const aggregatedData = aggregateRevenueData(filteredSettlements, periodType, selectedDate);

      console.log('📈 데이터 집계 결과:', {
        beforeFiltering: settlements.length,
        afterFiltering: filteredSettlements.length,
        aggregatedCount: aggregatedData.length,
        totalRevenue: aggregatedData.reduce((sum, item) => sum + item.revenue, 0),
        sampleData: aggregatedData[0]
      });

      if (aggregatedData.length === 0) {
        console.warn('⚠️ 집계된 데이터 없음');
        // 🚨 가상데이터 사용금지: 실제 데이터만 사용
        setRevenueData([]);
        setTotalRevenue(0);
        setTotalTransactions(0);
        console.log('🔄 데이터 없음 상태로 설정 완료');
      } else {
        setRevenueData(aggregatedData);
        const total = aggregatedData.reduce((sum, item) => sum + item.revenue, 0);
        const count = aggregatedData.reduce((sum, item) => sum + item.count, 0);
        setTotalRevenue(total);
        setTotalTransactions(count);
        console.log('✅ 실제 데이터 적용 완료:', { total, count, dataCount: aggregatedData.length });
      }

    } catch (error) {
      console.error('Dashboard: 매출 데이터 조회 실패:', error);
      console.error('Dashboard: 사용된 countryCode:', countryCode);
      console.error('Dashboard: 사용자 정보:', {
        email: user?.email,
        countryCode: user?.countryCode,
        role: user?.role
      });

      // 🚨 가상데이터 사용금지: 실제 데이터만 사용
      console.warn('⚠️ 에러 발생, 데이터를 조회할 수 없습니다.');
      setRevenueData([]);
      setTotalRevenue(0);
      setTotalTransactions(0);
      console.log('🔄 에러 상태로 설정 완료');
    } finally {
      setLoading(false);
    }
  };

  // 매출 데이터 집계 함수
  const aggregateRevenueData = (settlements: Settlement[], type: PeriodType, date: Date): RevenueData[] => {
    const data: RevenueData[] = [];

    if (type === 'daily') {
      // 시간대별 데이터 (00:00 - 23:00)
      for (let hour = 0; hour < 24; hour++) {
        const hourSettlements = settlements.filter(s => {
          const settlementHour = s.createdAt.getHours();
          return settlementHour === hour;
        });

        const revenue = hourSettlements.reduce((sum, s) => sum + s.totalFee, 0);
        data.push({
          period: `${hour.toString().padStart(2, '0')}:00`,
          revenue,
          count: hourSettlements.length,
          date: new Date(date.setHours(hour, 0, 0, 0))
        });
      }
    } else if (type === 'monthly') {
      // 일별 데이터 (1일 - 말일)
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const daySettlements = settlements.filter(s => {
          const settlementDay = s.createdAt.getDate();
          return settlementDay === day;
        });

        const revenue = daySettlements.reduce((sum, s) => sum + s.totalFee, 0);
        data.push({
          period: `${day}일`,
          revenue,
          count: daySettlements.length,
          date: new Date(date.getFullYear(), date.getMonth(), day)
        });
      }
    } else if (type === 'yearly') {
      // 월별 데이터 (1월 - 12월)
      for (let month = 0; month < 12; month++) {
        const monthSettlements = settlements.filter(s => {
          const settlementMonth = s.createdAt.getMonth();
          return settlementMonth === month;
        });

        const revenue = monthSettlements.reduce((sum, s) => sum + s.totalFee, 0);
        data.push({
          period: `${month + 1}월`,
          revenue,
          count: monthSettlements.length,
          date: new Date(date.getFullYear(), month, 1)
        });
      }
    }

    return data;
  };

  // 날짜 변경 핸들러
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  };

  // 날짜 포맷팅
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // 통화 포맷팅
  const formatCurrency = (amount: number): string => {
    return `₩${amount.toLocaleString()}`;
  };

  useEffect(() => {
    if (user) {
      fetchRevenueData();
    }
  }, [periodType, selectedDate, user?.email, viewMode, selectedStoreId, selectedCountry]);

  // 🆕 실제 매장 목록 로드 (HQ 사용자만)
  useEffect(() => {
    if (user?.role === 'hq' && !hasStoreError) {
      console.log('🏪 HQ 사용자 확인, 매장 목록 로드 시작');
      setStoresLoading(true);

      // countryCode가 없어도 fetchStores 함수가 내부적으로 처리
      fetchStores(user?.countryCode || '', user, selectedCountry).then((fetchedStores) => {
        // 🚨 가상매장 사용금지: 실제 매장 데이터만 사용
        setStores(fetchedStores);
        setStoresLoading(false);

        console.log('🏪 Dashboard: 실제 매장 목록 로드 완료:', fetchedStores.length);

        if (fetchedStores.length === 0) {
          console.warn('⚠️ 실제 매장 데이터 없음');
        } else {
          console.log('✅ 실제 매장 데이터 로드 성공:', fetchedStores.length, '개 매장');
        }
      }).catch((error) => {
        console.error('❌ 매장 목록 로드 중 에러 발생:', error);
        // 🚨 가상매장 사용금지: 에러 발생 시 빈 배열로 설정
        setStores([]);
        setStoresLoading(false);
        setHasStoreError(true); // ✅ 에러 상태 설정
        console.log('🔄 에러 발생으로 빈 매장 목록 설정');
      });
    } else if (user?.role !== 'hq') {
      console.log('🔄 HQ 사용자가 아니거나 사용자 정보 없음, 매장 목록 비움');
      setStores([]);
      setStoresLoading(false);
      setHasStoreError(false);
    }
  }, [user?.role, hasStoreError, user?.countryCode, selectedCountry]);

  // 🆕 매장 관리자 자기 매장 자동 선택
  useEffect(() => {
    if (user?.role === 'store' && user.email && !selectedStoreId) {
      const autoStoreId = generateStoreId(user.email);
      setSelectedStoreId(autoStoreId);
      setViewMode('store');
      console.log('🏪 매장 관리자 자기 매장 자동 선택:', { email: user.email, storeId: autoStoreId });
    }
  }, [user?.role, user.email, selectedStoreId]);

  // 🚨 가상매장 사용금지: Mock 데이터 제거 - 실제 데이터만 사용
  // 실제 운영 환경에서는 가상 데이터를 사용할 수 없음
  // 폴백 데이터는 generateFallbackData() 함수를 통해 동적으로 생성됨

  // 🆕 에러 상태 처리
  if (hasStoreError && user?.role === 'hq') {
    return (
      <div className="space-y-8">
        <div className="card-primary">
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">매장 목록을 불러올 수 없습니다</h2>
              <p className="text-gray-400 mb-6">
                매장 데이터를 불러오는 중 오류가 발생했습니다.
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setHasStoreError(false);
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🆕 매장 선택 전 데이터 표시 제어 - 항상 매장 선택 모드 사용
  // 본사 관리자는 매장 선택 드롭다운으로, 매장 관리자는 자기 매장으로 자동 설정

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        <p className="ml-4 text-gray-400">매출 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 헤더 및 컨트롤 */}
      <div className="card-primary">
        {/* 헤더 제목 */}
        <div className="mb-4">
          <h1 className="text-h1">
            {isSpecificStoreMode && targetStoreData
              ? `${targetStoreData.storeName} 통계`
              : (isStoreManager ? '내 매장 통계' : '매출 통계')}
          </h1>
        </div>

        {/* 컨트롤 그룹 - 모든 컨트롤을 한 줄로 통합 */}
        <div className="flex items-center justify-between w-full mb-6">
          {/* 전체/매장 토글 */}
          {user?.role === 'hq' && (
            <>
              <button
                onClick={() => {
                  setViewMode('all');
                  setSelectedStoreId(null);
                }}
                className={`px-4 py-3 rounded-full text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white'}`}
                style={{ width: '80px', height: '44px' }}
              >
                전체
              </button>
              <button
                onClick={() => setViewMode('store')}
                className={`px-4 py-3 rounded-full text-sm font-medium transition-colors ${viewMode === 'store' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white'}`}
                style={{ width: '80px', height: '44px' }}
              >
                매장
              </button>
            </>
          )}

          {/* 간격 추가 */}
          <div className="flex-grow"></div>

          {/* 기간 선택 */}
          <button
            onClick={() => setPeriodType('daily')}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors touch-target ${periodType === 'daily' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white'}`}
            style={{ width: '80px', height: '44px' }}
          >
            일별
          </button>
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors touch-target ${periodType === 'monthly' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white'}`}
            style={{ width: '80px', height: '44px' }}
          >
            월별
          </button>
          <button
            onClick={() => setPeriodType('yearly')}
            className={`px-4 py-3 rounded-full text-sm font-medium transition-colors touch-target ${periodType === 'yearly' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white'}`}
            style={{ width: '80px', height: '44px' }}
          >
            년별
          </button>

          {/* 날짜 선택 */}
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={handleDateChange}
            className="px-4 py-3 rounded-full text-sm touch-target border border-gray-600 bg-gray-800 text-white"
            style={{ width: '180px', height: '44px' }}
          />
        </div>
      </div>

      {/* 총계 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-secondary">
          <p className="text-caption">총 매출</p>
          <p className="text-xl lg:text-2xl font-bold text-primary mt-1 mobile-text-sm">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="card-secondary">
          <p className="text-caption">총 거래</p>
          <p className="text-xl lg:text-2xl font-bold text-secondary mt-1 mobile-text-sm">{totalTransactions.toLocaleString()}건</p>
        </div>
      </div>

      {/* 매장 선택 드롭다운 */}
      {user?.role === 'hq' && viewMode === 'store' && (
        <div className="card-primary">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">매장 선택</label>
            {storesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600 mr-2"></div>
                <p className="text-gray-400">매장 목록을 불러오는 중...</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-2">매장 목록을 불러올 수 없습니다.</p>
                <p className="text-caption text-gray-500 mb-3">
                  사용자: {user?.email} | 국가: {user?.countryCode}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-white rounded-full text-sm hover:bg-primary/90 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(e.target.value || null)}
                  className="mobile-form-input"
                >
                  {/* "매장" 모드에서는 "전체 매장" 옵션 숨김 */}
                  {viewMode === 'all' && <option value="">전체 매장</option>}
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      )}

      {/* 매출 그래프 */}
      <div className="card-primary">
        <h2 className="text-h2 mb-6">매출 추이</h2>
        <div className="mobile-chart overflow-hidden" style={{ width: '100%', height: '450px' }}>
          {revenueData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-body text-gray-400">
                {viewMode === 'store' && selectedStoreId
                  ? '해당 매장의 매출 데이터가 없습니다.'
                  : '해당 기간의 매출 데이터가 없습니다.'
                }
              </p>
            </div>
          ) : (
            <DynamicBarChart data={revenueData} />
          )}
        </div>
      </div>

      {/* 매출 데이터 표 */}
      <div className="card-primary">
        <h2 className="text-h2 mb-6">매출 상세</h2>

        {revenueData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-body text-gray-400">
              {viewMode === 'store' && selectedStoreId
                ? '해당 매장의 매출 데이터가 없습니다.'
                : '해당 기간의 매출 데이터가 없습니다.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">기간</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">매출</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">거래수</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">객단가</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData
                    .filter(item => item.revenue > 0)
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((item, index) => (
                      <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors">
                        <td className="py-3 px-4 text-white">{item.period}</td>
                        <td className="py-3 px-4 text-right text-primary font-medium">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-secondary">
                          {item.count}건
                        </td>
                        <td className="py-3 px-4 text-right text-warning">
                          {item.count > 0 ? formatCurrency(Math.round(item.revenue / item.count)) : '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-3">
              {revenueData
                .filter(item => item.revenue > 0)
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((item, index) => (
                  <div key={index} className="mobile-card">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-base font-semibold text-white">{item.period}</h3>
                      <span className="text-lg font-bold text-primary">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 mb-1">거래수</p>
                        <p className="text-white font-medium">{item.count}건</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">객단가</p>
                        <p className="text-warning font-medium">
                          {item.count > 0 ? formatCurrency(Math.round(item.revenue / item.count)) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {revenueData.filter(item => item.revenue > 0).length === 0 && (
              <div className="text-center py-8">
                <p className="text-body">
                  {viewMode === 'store' && selectedStoreId
                    ? '해당 매장의 매출 데이터가 없습니다.'
                    : '해당 기간의 매출 데이터가 없습니다.'
                  }
                </p>
                {viewMode === 'store' && selectedStoreId && (
                  <p className="text-caption text-gray-500 mt-2">
                    매장 ID: {selectedStoreId}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default Dashboard;
