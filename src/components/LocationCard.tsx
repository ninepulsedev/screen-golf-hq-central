import React, { useState, useEffect } from 'react';
import { MapPinIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationCardProps {
  className?: string;
}

const LocationCard: React.FC<LocationCardProps> = ({ className = '' }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // 주소 변환 함수
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ko`
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        // 한국 주소 형식으로 변환 (도시 단위까지만)
        const addressParts = data.display_name.split(',');
        if (addressParts.length >= 2) {
          return `${addressParts[addressParts.length - 2].trim()} ${addressParts[addressParts.length - 3].trim()}`;
        }
        return data.display_name;
      }
      return '주소를 찾을 수 없습니다';
    } catch (err) {
      console.error('주소 변환 실패:', err);
      return '주소 변환 실패';
    }
  };

  // 위치 정보 가져오기
  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    setPermissionDenied(false);

    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        
        setLocation({
          latitude,
          longitude,
          address
        });
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setPermissionDenied(true);
            setError('위치 권한이 필요합니다');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('위치 정보를 사용할 수 없습니다');
            break;
          case error.TIMEOUT:
            setError('위치 정보 요청 시간이 초과되었습니다');
            break;
          default:
            setError('위치 정보를 가져오는데 실패했습니다');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // 컴포넌트 마운트 시 위치 정보 가져오기
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <>
      <div className={`bg-gray-900/90 backdrop-blur-xl p-4 rounded-2xl border border-gray-800/50 shadow-xl hover:shadow-2xl transition-all duration-300 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400">현재 위치</p>
            {loading ? (
              <div className="mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                <p className="text-xs text-gray-500 mt-1">위치 정보 가져오는 중...</p>
              </div>
            ) : location ? (
              <div>
                <p className="text-lg font-bold text-white mt-2">{location.address}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
            ) : error ? (
              <div>
                <p className="text-sm text-red-400 mt-2">{error}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-400 mt-2">위치 정보 없음</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="p-3 rounded-xl bg-cyan-500/20">
              <MapPinIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              title="위치 새로고침"
            >
              <ArrowPathIcon className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 위치 권한 거부 시 중앙 에러 메시지 */}
      {permissionDenied && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 p-6 rounded-2xl border border-gray-800/50 shadow-2xl max-w-md mx-4">
            <div className="flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">위치 권한이 필요합니다</h3>
            <p className="text-gray-300 text-center mb-6">
              정확한 위치 정보를 제공하기 위해 위치 권한이 필요합니다.<br />
              브라우저 설정에서 위치 권한을 허용해주세요.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setPermissionDenied(false)}
                className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={getCurrentLocation}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationCard;
