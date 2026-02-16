import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove, getDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { generateStoreId, normalizeCountryCode } from '../utils/storeUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  XMarkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// 🆕 Firestore Timestamp 변환 헬퍼 함수
const convertTimestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();

  // Firestore Timestamp인 경우
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // 문자열인 경우
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // Date 객체인 경우
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // 숫자(타임스탬프)인 경우
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  return new Date();
};

interface Room {
  id: string;
  name: string;
  roomNumber: number;
  status: 'available' | 'occupied' | 'maintenance';
  hourlyRate: number;
  gameStartTime?: any;
  createdAt?: any;
}

interface Store {
  id: string;
  name: string;
  managerEmail: string;
  country: string;
  region: string;
  city: string;
  rooms: Room[];
}

interface Settlement {
  id: string;
  roomId: string;
  roomName: string;
  storeId: string;
  startTime: string;
  endTime: string;
  usageMinutes: number;
  usageHours: number;
  totalFee: number;
  settledAt: any;
}

interface GameRecord {
  id: string;
  roomId: string;
  roomName: string;
  storeId: string;
  startTime: any;
  endTime: any;
  usageMinutes: number;
  usageHours: number;
  totalFee: number;
  dayOfWeek: string;
  hourOfDay: number;
  month: number;
  year: number;
  isWeekend: boolean;
  createdAt: any;
}

const SystemManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetStoreEmail = searchParams.get('store');

  // 🆕 컴포넌트 렌더링 즉시 로그
  console.log('🟢 SystemManager 컴포넌트 렌더링 즉시 시작', {
    user: user ? {
      email: user.email,
      role: user.role,
      storeName: user.storeName
    } : 'null',
    targetStoreEmail,
    timestamp: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdRooms, setCreatedRooms] = useState<Room[]>([]);
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

  // 🆕 이메일로 매장 전체 데이터 조회 함수
  const fetchStoreUserData = async (email: string) => {
    console.log('🔍 매장 데이터 조회 시작:', email);

    // 국가별 users 컬렉션 순회
    const countryCodes = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

    for (const countryCode of countryCodes) {
      try {
        const userDocRef = doc(db, `users_${countryCode}`, email);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`✅ ${countryCode}에서 매장 데이터 찾음:`, {
            email: userData.email,
            storeName: userData.storeName,
            countryCode: userData.countryCode,
            country: userData.country,
            roomsCount: userData.rooms?.length || 0
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
            extraEmail: userData.extraEmail
          };
        }
      } catch (error) {
        console.error(`❌ ${countryCode} 조회 오류:`, error);
        continue;
      }
    }

    console.error('❌ 매장 데이터를 찾을 수 없음:', email);
    return null;
  };

  // 🆕 타겟 사용자 결정 (URL 파라미터가 있으면 해당 매장 데이터 직접 조회)
  const [targetUser, setTargetUser] = useState<any>(null);

  useEffect(() => {
    console.log('� SystemManager useEffect 실행 시작', {
      user: user ? {
        email: user.email,
        role: user.role,
        storeName: user.storeName
      } : 'null',
      targetStoreEmail,
      timestamp: new Date().toISOString()
    });

    console.log('�🔍 SystemManager: useEffect 시작', {
      targetStoreEmail,
      user,
      componentMounted: true
    });

    const loadTargetUser = async () => {
      console.log('🔍 SystemManager: loadTargetUser 시작', {
        targetStoreEmail,
        user: user ? {
          email: user.email,
          role: user.role,
          storeName: user.storeName
        } : null
      });

      if (targetStoreEmail) {
        console.log('🎯 URL 파라미터 매장 데이터 로드:', targetStoreEmail);
        const storeUserData = await fetchStoreUserData(targetStoreEmail);
        console.log('🔄 targetUser 설정 (URL 파라미터):', storeUserData);
        setTargetUser(storeUserData);
      } else {
        console.log('👤 현재 사용자 데이터 사용');
        console.log('🔄 targetUser 설정 (현재 사용자):', user);
        setTargetUser(user);
      }

      console.log('✅ loadTargetUser 완료');
    };

    loadTargetUser();
  }, [targetStoreEmail, user]);

  // 🆕 요금 설정 상태 추가
  const [settings, setSettings] = useState({
    ratePerInterval: 5000, // 시간 간격당 요금 (예: 1분당 1000원)
    timeInterval: 10, // 시간 간격 (분 단위, 예: 1분)
    roomCount: 4 // 방 갯수
  });

  // 🆕 단일 초기화 함수로 모든 데이터 로딩 통합
  const initializeSystemData = async () => {
    if (!targetUser?.email || !targetUser?.countryCode) {
      console.error('타겟 사용자 정보가 없습니다.');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 시스템 데이터 초기화 시작...', {
        email: targetUser.email,
        countryCode: targetUser.countryCode,
        storeName: targetUser.storeName
      });

      // 단일 Firestore 조회로 모든 데이터 가져오기
      const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error('사용자 문서가 존재하지 않습니다.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      console.log('📋 사용자 데이터 로드 완료:', {
        roomsCount: userData.rooms?.length || 0,
        roomCount: userData.roomCount,
        ratePerInterval: userData.ratePerInterval
      });

      // 1. 요금 설정 상태 업데이트
      const ratePerInterval = userData.ratePerInterval ||
        Math.round((userData.ratePer10Minutes || 5000) * 10 / (userData.timeInterval || 10));

      setSettings({
        ratePerInterval: ratePerInterval,
        timeInterval: userData.timeInterval || 10,
        roomCount: userData.roomCount || 4
      });

      // 2. 방 데이터 상태 업데이트
      const rooms: Room[] = userData.rooms || [];
      console.log('🏠 방 데이터 설정:', rooms.length, '개');
      setCreatedRooms(rooms);

      // 3. 방 갯수 조절 (필요한 경우에만)
      const targetRoomCount = userData.roomCount || 4;
      const currentCount = rooms.length;

      if (currentCount !== targetRoomCount) {
        console.log(`🎯 방 갯수 조절 필요: ${currentCount} → ${targetRoomCount}`);
        await adjustRoomCount(targetRoomCount);
      }

      console.log('✅ 시스템 데이터 초기화 완료');
    } catch (error) {
      console.error('❌ 시스템 데이터 초기화 오류:', error);
      setError('시스템 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 페이지 로드 시 단일 초기화 실행
  useEffect(() => {
    console.log('🔄 initializeSystemData useEffect 시작', {
      targetUser: targetUser ? {
        email: targetUser.email,
        role: targetUser.role,
        countryCode: targetUser.countryCode
      } : 'null',
      timestamp: new Date().toISOString()
    });

    if (targetUser) {
      initializeSystemData();
    } else {
      console.log('⏸️ targetUser가 없어 초기화 스킵');
    }
  }, [targetUser]);

  // 🆕 실시간 데이터 감지 (초기화 후에만 시작)
  useEffect(() => {
    if (!targetUser?.email || !targetUser?.countryCode || loading) return;

    console.log('🔄 실시간 데이터 감지 시작...');
    const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        console.log('📡 실시간 데이터 업데이트:', {
          roomsCount: userData.rooms?.length || 0,
          roomCount: userData.roomCount,
          ratePerInterval: userData.ratePerInterval
        });

        // 방 데이터만 실시간 업데이트 (설정은 초기화 시에만 설정)
        const rooms: Room[] = userData.rooms || [];
        setCreatedRooms(rooms);
      }
    }, (error) => {
      console.error('🔥 실시간 데이터 감지 오류:', error);
    });

    return () => {
      console.log('🛑 실시간 데이터 감지 정리');
      unsubscribe();
    };
  }, [targetUser, loading]);

  // 🆕 페이지 로드 시 방 갯수 조절 함수 (초기화 시에만 사용)
  const adjustRoomCount = async (targetCount: number): Promise<Room[]> => {
    if (!targetUser?.email || !targetUser?.countryCode) {
      console.error('사용자 정보가 없습니다.');
      return [];
    }

    const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('사용자 문서가 존재하지 않습니다.');
      return [];
    }

    const userData = userDoc.data();
    const currentRooms: Room[] = userData.rooms || [];
    const currentCount = currentRooms.length;

    // 🆕 정확한 시간당 요금 계산
    let hourlyRate = 50000; // 기본값
    const ratePer10Minutes = userData.ratePer10Minutes || 5000;
    const timeInterval = userData.timeInterval || 10;
    hourlyRate = Math.round((ratePer10Minutes / timeInterval) * 60);

    let updatedRooms = [...currentRooms];

    if (currentCount < targetCount) {
      // 방 추가: 필요한 만큼 방 생성
      const roomsToAdd = targetCount - currentCount;
      console.log(`${roomsToAdd}개의 방 생성 (기본 요금: ${hourlyRate}원/시간)`);

      for (let i = currentCount; i < targetCount; i++) {
        const newRoom: Room = {
          id: `room-${i + 1}`,
          name: `방 ${i + 1}`,
          roomNumber: i + 1,
          status: 'available',
          hourlyRate: hourlyRate,
          createdAt: new Date()
        };
        updatedRooms.push(newRoom);
      }
    } else if (currentCount > targetCount) {
      // 방 삭제: 마지막 방부터 제거
      const roomsToRemove = currentCount - targetCount;
      console.log(`${roomsToRemove}개의 방 삭제 (마지막 방부터)`);
      updatedRooms = updatedRooms.slice(0, targetCount);
    } else {
      // 방 갯수가 같으면 기존 방의 요금만 업데이트
      updatedRooms = currentRooms.map(room => ({
        ...room,
        hourlyRate: hourlyRate
      }));
    }

    // Firestore 업데이트
    await updateDoc(userDocRef, {
      rooms: updatedRooms,
      updatedAt: new Date()
    });

    console.log('방 갯수 조절 완료:', updatedRooms.length);
    return updatedRooms;
  };

  // 🆕 현재 시간 상태 관리 (실시간 업데이트)
  const [currentTime, setCurrentTime] = useState(new Date());

  // 🆕 1초마다 현재 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 🆕 게임 시간 계산 함수 (실시간 업데이트)
  const calculateGameTime = useCallback((room: Room): string => {
    if (!room.gameStartTime) return '0분';

    const startTime = convertTimestampToDate(room.gameStartTime);
    const now = currentTime; // 🆕 상태 기반 시간 사용
    let diffMs = now.getTime() - startTime.getTime();

    // 🆕 음수 방지 - 무조건 0초부터 시작
    if (diffMs < 0) {
      diffMs = 0;
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    } else {
      return `${seconds}초`;
    }
  }, [currentTime]); // 🆕 currentTime 의존성 추가

  // 🆕 현재 요금 계산 함수
  const calculateCurrentFee = useCallback((room: Room): number => {
    if (!room.gameStartTime || room.status !== 'occupied') {
      return 0;
    }

    const now = currentTime; // 🆕 상태 기반 시간 사용
    const gameStartTime = convertTimestampToDate(room.gameStartTime);

    // 경과 시간 (초 단위)
    let elapsedMs = now.getTime() - gameStartTime.getTime();

    // 🆕 음수 방지 - 무조건 0초부터 시작
    if (elapsedMs < 0) {
      elapsedMs = 0;
    }

    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    // Settings에서 설정한 값 직접 사용
    const ratePerInterval = settings.ratePerInterval; // Settings에서 설정한 시간 간격당 요금 (예: 1분당 1000원)
    const timeInterval = settings.timeInterval; // Settings에서 설정한 시간 간격 (분 단위, 예: 1)

    // 경과 시간을 시간 간격 단위로 변환 (예: 1분당 1000원, 5분당 5000원)
    // 예: 90초 경과, 1분 간격 → 90초 / 60초 = 1.5개 간격
    const elapsedIntervals = elapsedSeconds / (timeInterval * 60);

    // 완성된 시간 간격만큼만 요금 계산 (첫 간격 완성 전까지는 0원)
    // 예: 0.5개 간격 → 아직 1개 간격 완성 안됨 → 0원
    // 예: 1.0개 간격 → 1개 간격 완성됨 → 1 × 1000원 = 1000원
    const completedIntervals = Math.floor(elapsedIntervals);
    const totalFee = completedIntervals * ratePerInterval;

    return totalFee;
  }, [currentTime, settings]); // 🆕 currentTime와 settings 의존성 추가

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'occupied':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusText = (status: Room['status']) => {
    switch (status) {
      case 'available':
        return '이용 가능';
      case 'occupied':
        return '사용 중';
      case 'maintenance':
        return '점검 중';
      default:
        return '알 수 없음';
    }
  };

  // 🆕 게임 시작 함수
  const startNewGame = async (roomId: string) => {
    if (!targetUser?.email || !targetUser?.countryCode) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      const userData = userDoc.data();
      const rooms = userData.rooms || [];
      const roomIndex = rooms.findIndex((r: Room) => r.id === roomId);

      if (roomIndex === -1) {
        alert('방을 찾을 수 없습니다.');
        return;
      }

      // 방 상태 업데이트
      const now = new Date();
      // 🆕 현재 시간을 그대로 사용하여 0초부터 시작 보장
      const startTime = new Date(now.getTime());

      // 🆕 즉시 currentTime 동기화하여 -1초 방지
      setCurrentTime(now);

      rooms[roomIndex] = {
        ...rooms[roomIndex],
        status: 'occupied',
        gameStartTime: startTime // 🆕 밀리초까지 0으로 설정
      };

      await updateDoc(userDocRef, {
        rooms: rooms
      });

      console.log('게임 시작:', roomId);
    } catch (error) {
      console.error('게임 시작 실패:', error);
      alert('게임 시작에 실패했습니다.');
    }
  };

  // 🆕 GameRecord 생성 함수
  const createGameRecord = async (room: Room, endTime: Date) => {
    if (!targetUser?.email || !targetUser?.countryCode) return;

    try {
      const storeId = generateStoreId(targetUser.email);
      const normalizedCountryCode = normalizeCountryCode(targetUser.countryCode);

      // 🆕 시간 변환을 통일된 헬퍼 함수로 사용
      const startTime = convertTimestampToDate(room.gameStartTime);

      // null 값 검증 강화
      if (!startTime || !(startTime instanceof Date) || isNaN(startTime.getTime())) {
        console.error('❌ Invalid startTime:', room.gameStartTime);
        return;
      }

      const endTimeDate = convertTimestampToDate(endTime);
      if (!endTimeDate || !(endTimeDate instanceof Date) || isNaN(endTimeDate.getTime())) {
        console.error('❌ Invalid endTime:', endTime);
        return;
      }

      // 🆕 요금 계산을 calculateCurrentFee 방식으로 통일
      const totalFee = calculateCurrentFee(room);

      const usageMs = endTimeDate.getTime() - startTime.getTime();
      const usageMinutes = Math.floor(usageMs / (1000 * 60));
      const usageHours = parseFloat((usageMinutes / 60).toFixed(2));

      // 날짜 정보 추출
      const dayOfWeek = startTime.toLocaleDateString('ko-KR', { weekday: 'long' });
      const hourOfDay = startTime.getHours();
      const month = startTime.getMonth() + 1;
      const year = startTime.getFullYear();
      const isWeekend = startTime.getDay() === 0 || startTime.getDay() === 6;

      const gameRecord: GameRecord = {
        id: `game_${room.id}_${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        storeId: storeId,
        startTime: startTime.toLocaleString('ko-KR'),
        endTime: endTimeDate ?
          endTimeDate.toLocaleString('ko-KR') :
          new Date().toLocaleString('ko-KR'),
        usageMinutes: usageMinutes,
        usageHours: usageHours,
        totalFee: totalFee,
        dayOfWeek: dayOfWeek,
        hourOfDay: hourOfDay,
        month: month,
        year: year,
        isWeekend: isWeekend,
        createdAt: new Date()
      };

      // 🆕 settlements 컬렉션 생성 확인
      const settlementsCollectionRef = collection(db, `settlements_${normalizedCountryCode}`);
      const gameRecordDocRef = doc(settlementsCollectionRef, gameRecord.id);

      await setDoc(gameRecordDocRef, gameRecord);
      console.log('🎮 GameRecord 생성 성공:', gameRecord);
    } catch (error) {
      console.error('❌ GameRecord 생성 실패:', error);
    }
  };

  // 🆕 Settlement 문서 생성 함수
  const createSettlementDocument = async (room: Room, endTime: Date) => {
    if (!targetUser?.email || !targetUser?.countryCode) return;

    try {
      const storeId = generateStoreId(targetUser.email);
      const normalizedCountryCode = normalizeCountryCode(targetUser.countryCode);

      // 🆕 시간 변환을 통일된 헬퍼 함수로 사용
      const startTime = convertTimestampToDate(room.gameStartTime);

      // null 값 검증 강화
      if (!startTime || !(startTime instanceof Date) || isNaN(startTime.getTime())) {
        console.error('❌ Invalid startTime:', room.gameStartTime);
        return;
      }

      const endTimeDate = convertTimestampToDate(endTime);
      if (!endTimeDate || !(endTimeDate instanceof Date) || isNaN(endTimeDate.getTime())) {
        console.error('❌ Invalid endTime:', endTime);
        return;
      }

      // 🆕 요금 계산을 calculateCurrentFee 방식으로 통일
      const totalFee = calculateCurrentFee(room);

      const usageMs = endTimeDate.getTime() - startTime.getTime();
      const usageMinutes = Math.floor(usageMs / (1000 * 60));
      const usageHours = parseFloat((usageMinutes / 60).toFixed(2));

      const settlement: Settlement = {
        id: `settlement_${room.id}_${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        storeId: storeId,
        startTime: startTime.toLocaleString('ko-KR'),
        endTime: endTimeDate.toLocaleString('ko-KR'),
        usageMinutes: usageMinutes,
        usageHours: usageHours,
        totalFee: totalFee,
        settledAt: new Date()
      };

      // 🆕 settlements 컬렉션 생성 확인
      const settlementsCollectionRef = collection(db, `settlements_${normalizedCountryCode}`);
      const settlementDocRef = doc(settlementsCollectionRef, settlement.id);

      await setDoc(settlementDocRef, settlement);
      console.log('💰 Settlement 문서 생성 성공:', settlement);
    } catch (error) {
      console.error('❌ Settlement 문서 생성 실패:', error);
    }
  };

  // 🆕 게임 종료 함수
  const endGame = async (roomId: string) => {
    if (!targetUser?.email || !targetUser?.countryCode) return;

    try {
      console.log('🎮 게임 종료 시작:', roomId);
      const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      const userData = userDoc.data();
      const rooms = userData.rooms || [];
      const roomIndex = rooms.findIndex((r: Room) => r.id === roomId);

      if (roomIndex === -1) {
        alert('방을 찾을 수 없습니다.');
        return;
      }

      const room = rooms[roomIndex];
      const endTime = new Date();

      console.log('📝 방 정보:', room);
      console.log('⏰ 종료 시간:', endTime);

      // 방 상태 업데이트
      const { gameStartTime, ...roomWithoutStartTime } = room;
      rooms[roomIndex] = {
        ...roomWithoutStartTime,
        status: 'available'
      };

      console.log('💾 방 상태 업데이트:', rooms[roomIndex]);
      await updateDoc(userDocRef, {
        rooms: rooms
      });

      console.log('✅ 게임 종료 완료:', roomId);
    } catch (error) {
      console.error('❌ 게임 종료 실패:', error);
    }
  };

  // 게임 종료 및 정산 함수
  const endGameWithSettlement = async (roomId: string) => {
    if (!targetUser?.email || !targetUser?.countryCode) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('🎮 게임 종료 시작:', roomId);
      const userDocRef = doc(db, `users_${targetUser.countryCode}`, targetUser.email);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      const userData = userDoc.data();
      const rooms = userData.rooms || [];
      const roomIndex = rooms.findIndex((r: Room) => r.id === roomId);

      if (roomIndex === -1) {
        alert('방을 찾을 수 없습니다.');
        return;
      }

      const room = rooms[roomIndex];
      const endTime = new Date();

      console.log('📝 방 정보:', room);
      console.log('⏰ 종료 시간:', endTime);

      // 🆕 GameRecord 생성
      if (room.status === 'occupied' && room.gameStartTime) {
        console.log('🎯 GameRecord 생성 시도...');
        await createGameRecord(room, endTime);
        console.log('✅ GameRecord 생성 완료');
      } else {
        console.warn('⚠️ GameRecord 생성 조건 불충족:', {
          status: room.status,
          hasStartTime: !!room.gameStartTime
        });
      }

      // 방 상태 업데이트
      const { gameStartTime, ...roomWithoutStartTime } = room;
      rooms[roomIndex] = {
        ...roomWithoutStartTime,
        status: 'available'
      };

      console.log('💾 방 상태 업데이트:', rooms[roomIndex]);
      await updateDoc(userDocRef, {
        rooms: rooms
      });

      console.log('✅ 게임 종료 및 정산 완료:', roomId);
      alert('게임이 성공적으로 종료되었습니다.');
    } catch (error) {
      console.error('❌ 게임 종료 실패:', error);
      console.error('❌ 에러 상세:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        stack: (error as any)?.stack
      });
      alert(`게임 종료에 실패했습니다: ${(error as any)?.message || '알 수 없는 오류'}`);
    }
  };

  // 정산 모달 열기 함수
  const openSettlementModal = (room: Room) => {
    const usageTime = calculateGameTime(room);
    const totalFee = calculateCurrentFee(room);
    const startTime = room.gameStartTime ?
      convertTimestampToDate(room.gameStartTime).toLocaleString('ko-KR') : '';
    const endTime = room.status === 'occupied' && room.gameStartTime ?
      new Date().toLocaleString('ko-KR') : '';

    setSettlementModal({
      isOpen: true,
      room: room,
      startTime: startTime,
      endTime: endTime,
      usageTime: usageTime,
      totalFee: totalFee
    });
  };

  // 정산 모달 닫기 함수
  const closeSettlementModal = () => {
    setSettlementModal({
      isOpen: false,
      room: null,
      startTime: '',
      endTime: '',
      usageTime: '',
      totalFee: 0
    });
  };

  // 정산 완료 함수
  const completeSettlement = async () => {
    if (!settlementModal.room) return;

    try {
      await endGameWithSettlement(settlementModal.room.id);
      closeSettlementModal();
      alert('결제가 완료되었습니다.');
    } catch (error) {
      console.error('결제 실패:', error);
      alert('결제에 실패했습니다.');
    }
  };

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
      {/* 방 관리 화면 */}
      <div className="card-primary rounded-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-h2">방 관리</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // 자기 매장 통계로 대시보드 이동
                const currentStoreId = user?.email ? generateStoreId(user.email) : '';
                navigate(`/dashboard?mode=store&storeId=${currentStoreId}`);
              }}
              className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
              title="대시보드"
            >
              <ChartBarIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 🆕 매장 정보 표시 영역 */}
        <div className="border-t border-gray-700/50 pt-6">
          <h4 className="text-h3 mb-4">매장 정보</h4>
          <div className="card-secondary">
            {targetUser?.email ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">매장명</span>
                  <span className="text-white font-medium mobile-text-sm">{targetUser?.storeName || '기본 매장'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">관리자</span>
                  <span className="text-white font-medium mobile-text-sm">{targetUser?.email || '미설정'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">국가</span>
                  <span className="text-white font-medium mobile-text-sm">{targetUser?.country === '대한민국' ? '대한민국' : targetUser?.country === 'United States' ? 'United States' : targetUser?.country || '미설정'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">지역</span>
                  <span className="text-white font-medium mobile-text-sm">{targetUser?.region !== targetUser?.country ? (targetUser?.region || '미설정') : ''} {targetUser?.city || ''}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">관리자</span>
                  <span className="text-white font-medium mobile-text-sm">미설정</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">국가</span>
                  <span className="text-white font-medium mobile-text-sm">미설정</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body mobile-text-xs">지역</span>
                  <span className="text-white font-medium mobile-text-sm">미설정</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 방 목록 표시 영역 */}
        <div className="border-t border-gray-700/50 pt-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-h3">방 목록 ({createdRooms.length}개)</h4>
          </div>
          <div className="mobile-card-grid">
            {createdRooms.map((room) => {
              return (
                <div
                  key={room.id}
                  className="card-secondary hover:border-gray-600/50 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 flex items-center justify-center">
                      <h5 className="text-h3 text-white mobile-text-sm">{room.name}</h5>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full touch-target ${getStatusColor(room.status)}`}>
                      {getStatusText(room.status)}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-body mobile-text-xs">요금 ({settings.timeInterval}분당):</span>
                      <span className="text-primary mobile-text-sm">{settings.ratePerInterval.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body mobile-text-xs">결제 요금:</span>
                      <span className="text-warning font-bold mobile-text-sm">
                        ₩{calculateCurrentFee(room).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body mobile-text-xs">시작 시간:</span>
                      <span className="text-primary mobile-text-xs">
                        {room.gameStartTime ?
                          convertTimestampToDate(room.gameStartTime).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) :
                          '-'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body mobile-text-xs">종료 시간:</span>
                      <span className="text-primary mobile-text-xs">
                        {room.status === 'occupied' && room.gameStartTime ?
                          // 실시간 종료 시간 (현재 시간)
                          new Date().toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) :
                          '-'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body mobile-text-xs">이용 시간:</span>
                      <span className="text-primary mobile-text-xs">{calculateGameTime(room)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    {room.status === 'available' && (
                      <button
                        onClick={() => startNewGame(room.id)}
                        className="mobile-button touch-target"
                      >
                        시작
                      </button>
                    )}

                    {room.status === 'occupied' && (
                      <button
                        onClick={() => openSettlementModal(room)}
                        className="mobile-button touch-target bg-gray-600 hover:bg-gray-700"
                      >
                        결제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {
        error && (
          <div className="card-primary border-red-500/50 rounded-full">
            <p className="text-error">{error}</p>
          </div>
        )
      }

      {/* 결재 모달 */}
      {settlementModal.isOpen && settlementModal.room && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeSettlementModal}
        >
          <div
            className="card-primary w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h2 mobile-text-sm">결제 정보</h3>
              <button
                onClick={closeSettlementModal}
                className="text-gray-400 hover:text-white transition-colors touch-target p-2"
              >
                <XMarkIcon className="icon-md" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-body mobile-text-xs">방 이름:</span>
                <span className="text-white font-medium mobile-text-sm">{settlementModal.room?.name || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body mobile-text-xs">시작 시간:</span>
                <span className="text-primary mobile-text-xs">{settlementModal.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body mobile-text-xs">종료 시간:</span>
                <span className="text-primary mobile-text-xs">{settlementModal.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body mobile-text-xs">이용 시간:</span>
                <span className="text-primary mobile-text-xs">{settlementModal.usageTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body mobile-text-xs">결제 요금:</span>
                <span className="text-warning font-bold text-lg mobile-text-sm">
                  ₩{settlementModal.totalFee.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeSettlementModal}
                className="mobile-button touch-target bg-gray-600 hover:bg-gray-700 flex-1"
              >
                취소
              </button>
              <button
                onClick={completeSettlement}
                className="mobile-button touch-target flex-1"
              >
                결제 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManager;
