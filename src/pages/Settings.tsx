import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { CurrencyDollarIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [ratePerInterval, setRatePerInterval] = useState<number>(5000);
  const [timeInterval, setTimeInterval] = useState<number>(10);
  const [roomCount, setRoomCount] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // 사용자 설정 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.email || !user?.countryCode) return;

      setLoading(true);
      try {
        const userDocRef = doc(db, `users_${user.countryCode}`, user.email);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRatePerInterval(userData.ratePerInterval || userData.ratePer10Minutes || 5000);
          setTimeInterval(userData.timeInterval || 10);
          setRoomCount(userData.roomCount || 5);
          console.log('사용자 설정 불러오기 성공:', userData);
        } else {
          console.log('사용자 문서 없음, 기본값 사용');
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setRatePerInterval(value);
  };

  const handleRateSave = async () => {
    if (!user?.email || !user?.countryCode) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      const userDocRef = doc(db, `users_${user.countryCode}`, user.email);

      // 🆕 Firestore에서 현재 방 정보 가져오기
      const userDoc = await getDoc(userDocRef);
      let updatedRooms = [];

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentRooms = userData.rooms || [];
        const ratePerInterval = userData.ratePerInterval || userData.ratePer10Minutes || 5000;

        // 시간당 요금 계산
        const hourlyRate = Math.round((ratePerInterval * 60) / timeInterval);

        // 모든 방카드의 요금 업데이트
        updatedRooms = currentRooms.map((room: any) => ({
          ...room,
          hourlyRate: hourlyRate
        }));

        console.log(`방카드 요금 업데이트: 시간당 ${hourlyRate}원 (${updatedRooms.length}개 방)`);
      }

      // Firestore 업데이트 (요금 설정과 방카드 요금 동시 업데이트)
      await updateDoc(userDocRef, {
        ratePerInterval,
        timeInterval,
        rooms: updatedRooms,
        settingsUpdatedAt: new Date().toISOString()
      });

      console.log('요금 설정 저장 성공:', { ratePerInterval, timeInterval, email: user.email });
      alert(`✅ 요금이 ${ratePerInterval.toLocaleString()}원으로 저장되었습니다.\n🏠 모든 방카드의 시간당 요금이 ${Math.round((ratePerInterval * 60) / timeInterval).toLocaleString()}원으로 업데이트되었습니다.`);

      // 저장 성공 후 상태 즉시 업데이트
      setRatePerInterval(ratePerInterval);
      setTimeInterval(timeInterval);
    } catch (error) {
      console.error('요금 설정 저장 실패:', error);
      alert('❌ 요금 설정 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setTimeInterval(value);
  };

  const handleTimeIntervalSave = async () => {
    if (!user?.email || !user?.countryCode) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      const userDocRef = doc(db, `users_${user.countryCode}`, user.email);

      // 🆕 Firestore에서 현재 방 정보 가져오기
      const userDoc = await getDoc(userDocRef);
      let updatedRooms = [];

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentRooms = userData.rooms || [];
        const ratePerInterval = userData.ratePerInterval || userData.ratePer10Minutes || 5000;

        // 시간 간격에 따른 시간당 요금 재계산
        const hourlyRate = Math.round((ratePerInterval * 60) / timeInterval);

        // 모든 방카드의 요금 업데이트
        updatedRooms = currentRooms.map((room: any) => ({
          ...room,
          hourlyRate: hourlyRate
        }));

        console.log(`시간 간격 변경: ${timeInterval}분당 ${ratePerInterval}원 → 시간당 ${hourlyRate}원 (${updatedRooms.length}개 방)`);
      }

      // Firestore 업데이트 (시간 간격과 방카드 요금 동시 업데이트)
      await updateDoc(userDocRef, {
        ratePerInterval,
        timeInterval,
        rooms: updatedRooms,
        settingsUpdatedAt: new Date().toISOString()
      });

      console.log('시간 간격 설정 저장 성공:', { timeInterval, email: user.email });
      alert(`✅ 시간 간격이 ${timeInterval}분으로 저장되었습니다.\n🏠 모든 방카드의 요금이 업데이트되었습니다.`);

      // 저장 성공 후 상태 즉시 업데이트
      setTimeInterval(timeInterval);
    } catch (error) {
      console.error('시간 간격 설정 저장 실패:', error);
      alert('❌ 시간 간격 설정 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoomCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setRoomCount(Math.min(Math.max(value, 1), 20));
  };

  const handleRoomCountSave = async () => {
    if (!user?.email || !user?.countryCode) {
      alert('로그인이 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      const userDocRef = doc(db, `users_${user.countryCode}`, user.email);

      await updateDoc(userDocRef, {
        roomCount,
        settingsUpdatedAt: new Date().toISOString()
      });

      console.log('방 갯수 설정 저장 성공:', { roomCount, email: user.email });

      // 저장 성공 후 즉시 SystemManager 페이지로 리디렉션
      alert(`✅ 방 갯수 ${roomCount}개로 저장되었습니다.\n🏠 System 페이지로 이동하여 방카드를 확인합니다.`);

      // 즉시 SystemManager 페이지로 이동
      window.location.href = '/system';

    } catch (error) {
      console.error('방 갯수 설정 저장 실패:', error);
      alert(`❌ 방 갯수 설정 저장에 실패했습니다.\n다시 시도해주세요.`);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-h1">설정</h1>
        <div className="flex items-center justify-center py-12">
          <div className="text-body">설정을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-h1">설정</h1>

      {user && (
        <div className="card-secondary">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-body mobile-text-xs">현재 사용자:</span>
              <span className="text-white font-medium mobile-text-sm">{user?.email}</span>
            </div>
            {user?.storeName && (
              <div className="flex justify-between items-center">
                <span className="text-body mobile-text-xs">매장:</span>
                <span className="text-white font-medium mobile-text-sm">{user?.storeName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* 카드 1: 요금 설정 */}
          <div className="lg:col-span-1 xl:col-span-1">
            <div className="card-primary h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-primary/20 rounded-full flex items-center justify-center mr-3 lg:mr-4">
                  <CurrencyDollarIcon className="icon-md lg:icon-lg text-primary" />
                </div>
                <div>
                  <h2 className="text-h2 mobile-text-sm">요금 설정</h2>
                  <p className="text-body text-xs lg:text-sm">스크린골프 이용 요금을 설정합니다</p>
                </div>
              </div>

              <div className="mobile-form flex-1 h-full">
                <div className="mobile-form-group">
                  <label className="mobile-form-label">
                    시간 간격 (분)
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={timeInterval}
                        onChange={handleTimeIntervalChange}
                        className="mobile-form-input touch-target"
                        placeholder="시간 간격을 입력하세요"
                        min="1"
                        max="60"
                        disabled={saving}
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                        분
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mobile-form-group">
                  <label className="mobile-form-label">
                    요금 ({timeInterval}분당)
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={ratePerInterval}
                        onChange={handleRateChange}
                        className="mobile-form-input touch-target"
                        placeholder="요금을 입력하세요"
                        min="0"
                        disabled={saving}
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                        원
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs lg:text-sm text-gray-400">
                    {timeInterval}분당 요금: {ratePerInterval.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-auto">
                <button
                  onClick={() => {
                    setTimeInterval(10);
                    setRatePerInterval(5000);
                  }}
                  className="mobile-button touch-target bg-gray-600 hover:bg-gray-700 flex-1"
                  disabled={saving}
                >
                  초기화
                </button>
                <button
                  onClick={handleTimeIntervalSave}
                  className="mobile-button touch-target flex-1"
                  disabled={saving || !user}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>

          {/* 카드 2: 방 갯수 설정 */}
          <div className="lg:col-span-1 xl:col-span-1">
            <div className="card-primary h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-secondary/20 rounded-full flex items-center justify-center mr-3 lg:mr-4">
                  <BuildingOfficeIcon className="icon-md lg:icon-lg text-secondary" />
                </div>
                <div>
                  <h2 className="text-h2 mobile-text-sm">방 갯수</h2>
                  <p className="text-body text-xs lg:text-sm">생성할 방의 총 갯수를 설정합니다</p>
                </div>
              </div>

              <div className="mobile-form flex-1">
                <div className="mobile-form-group">
                  <label className="mobile-form-label">
                    방 갯수
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={roomCount}
                        onChange={handleRoomCountChange}
                        className="mobile-form-input touch-target"
                        placeholder="방 갯수를 입력하세요"
                        min="1"
                        max="20"
                        disabled={saving}
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                        개
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs lg:text-sm text-gray-400">
                    생성할 방의 총 갯수 (1-20개)
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-auto">
                <button
                  onClick={() => {
                    setRoomCount(5);
                  }}
                  className="mobile-button touch-target bg-gray-600 hover:bg-gray-700 flex-1"
                  disabled={saving}
                >
                  초기화
                </button>
                <button
                  onClick={handleRoomCountSave}
                  className="mobile-button touch-target flex-1"
                  disabled={saving || !user}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>

          {/* 카드 3: 기타 설정 */}
          <div className="lg:col-span-1 xl:col-span-1">
            <div className="card-primary h-full flex flex-col">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-accent/20 rounded-full flex items-center justify-center mr-3 lg:mr-4">
                  <BuildingOfficeIcon className="icon-md lg:icon-lg text-accent" />
                </div>
                <div>
                  <h2 className="text-h2 mobile-text-sm">기타 설정</h2>
                  <p className="text-body text-xs lg:text-sm">추가 설정 기능이 준비 중입니다</p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 mobile-text-xs">다른 설정 기능이 준비 중입니다...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
