import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, ChevronRightIcon, UserIcon, BuildingOfficeIcon, EnvelopeIcon, MapPinIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { signInWithEmail, signUpStoreAdmin, resetPassword } from '../firebase/auth';

interface LoginFormData {
  email: string;
  password: string;
  confirmPassword: string;
  storeName: string;
  phoneNumber: string;
  location: string;
  country?: string;
  province?: string;
  city?: string;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // 위치 정보 가져오기 함수
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // OpenStreetMap Nominatim API로 주소 변환
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko&extratags=1&namedetails=1`
          );
          const data = await response.json();

          if (data && data.address) {
            const address = data.address;
            const country = address.country || '';
            const province = address.state || address.province || '';
            const city = address.city || address.town || address.village || '';

            // 위치 정보를 개별 필드로 저장
            setFormData(prev => ({
              ...prev,
              country,
              province,
              city,
              location: `${country} ${province} ${city}`.trim()
            }));
          } else {
            setFormData(prev => ({ ...prev, location: '주소를 찾을 수 없습니다' }));
          }
        } catch (err) {
          console.error('주소 변환 실패:', err);
          setFormData(prev => ({ ...prev, location: '주소 변환 실패' }));
        }

        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('위치 권한이 필요합니다');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('위치 정보를 사용할 수 없습니다');
            break;
          case error.TIMEOUT:
            setLocationError('위치 정보 요청 시간이 초과되었습니다');
            break;
          default:
            setLocationError('위치 정보를 가져오는데 실패했습니다');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    phoneNumber: '',
    location: '',
    country: '',
    province: '',
    city: ''
  });

  // 기억하기 기능 - localStorage에서 이메일 복원
  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 이메일 유효성 검사
  const isEmailValid = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const emailError = formData.email && !isEmailValid(formData.email) ? '유효한 이메일 주소를 입력하세요' : '';

  // 이메일 인증 처리
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 이메일 유효성 검사
    if (!isEmailValid(formData.email)) {
      setError('유효한 이메일 주소를 입력하세요');
      return;
    }

    // 비밀번호 유효성 검사
    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    // 가입 시 비밀번호 확인 검사
    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    // 가입 시 추가 필드 검사
    if (isSignUp) {
      if (!formData.storeName.trim()) {
        setError('매장 이름을 입력하세요');
        return;
      }
      if (!formData.phoneNumber.trim()) {
        setError('전화번호를 입력하세요');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // 매장 관리자 가입
        const result = await signUpStoreAdmin(
          formData.email,
          formData.password,
          formData.storeName,
          formData.phoneNumber,
          formData.location,
          undefined, // extraEmail 제거
          formData.country
        );

        if (result.success) {
          setSuccess(result.error || '가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
          // 가입 성공 후 로그인 폼으로 전환
          setTimeout(() => {
            setIsSignUp(false);
            setFormData({
              email: formData.email,
              password: '',
              confirmPassword: '',
              storeName: '',
              phoneNumber: '',
              location: '',
              country: '',
              province: '',
              city: ''
            });
          }, 2000);
        } else {
          setError(result.error || '가입 중 오류가 발생했습니다');
        }
      } else {
        // 이메일 로그인 (본사/매장 자동 구분)
        const result = await signInWithEmail(formData.email, formData.password);

        if (result.success) {
          setSuccess('로그인 성공!');

          // 기억하기 기능 처리
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', formData.email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }

          // 역할 기반 리디렉션
          setTimeout(() => {
            navigate('/redirect');
          }, 1000);
        } else {
          setError(result.error || '로그인 중 오류가 발생했습니다');
        }
      }
    } catch (err) {
      console.error('인증 에러:', err);
      setError('인증 중 오류가 발생했습니다. 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 재설정 처리
  const handlePasswordReset = async () => {
    if (!resetEmail.trim() || !isEmailValid(resetEmail)) {
      setError('유효한 이메일 주소를 입력하세요');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await resetPassword(resetEmail);
      if (result.success) {
        setSuccess(result.error || '비밀번호 재설정 링크가 발송되었습니다.');
        setShowPasswordReset(false);
        setResetEmail('');
      } else {
        setError(result.error || '비밀번호 재설정 중 오류가 발생했습니다');
      }
    } catch (err) {
      console.error('비밀번호 재설정 에러:', err);
      setError('비밀번호 재설정 중 오류가 발생했습니다. 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-600 to-cyan-600 rounded-2xl shadow-2xl mb-4">
            <BuildingOfficeIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">스크린 골프 HQ</h1>
          <p className="text-gray-400">본사 및 매장 관리자 포털</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isSignUp ? '매장 관리자 가입' : '로그인'}
          </h2>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                이메일 주소
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  autoComplete="username"
                  className={`w-full pl-10 pr-3 py-3 bg-gray-800/50 border rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm ${isEmailValid(formData.email) && formData.email
                    ? 'border-gray-700/50 focus:ring-cyan-500/50 focus:border-cyan-500/50'
                    : formData.email && !isEmailValid(formData.email)
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                      : 'border-gray-700/50 focus:ring-cyan-500/50 focus:border-cyan-500/50'
                    }`}
                  placeholder="이메일 주소를 입력하세요"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-red-400">{emailError}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                  )}
                </button>
              </div>
            </div>

            {/* 가입 필드들 */}
            {isSignUp && (
              <>
                {/* 비밀번호 확인 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                      placeholder="비밀번호를 다시 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 매장 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    매장 이름
                  </label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                    placeholder="매장 이름을 입력하세요"
                  />
                </div>

                {/* 전화번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    전화번호
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                    placeholder="전화번호를 입력하세요"
                  />
                </div>

                {/* 위치 정보 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    위치 정보
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
                      placeholder="위치 정보"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="px-4 py-3 bg-gray-700/50 text-white rounded-full hover:bg-gray-600/50 transition-all duration-300 disabled:opacity-50"
                    >
                      {locationLoading ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <MapPinIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {locationError && (
                    <p className="mt-1 text-xs text-red-400">{locationError}</p>
                  )}
                </div>
              </>
            )}

            {/* 기억하기 + 비밀번호 찾기 (로그인 시만) */}
            {!isSignUp && (
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-cyan-600 bg-gray-800/50 border-gray-600/50 rounded-full focus:ring-cyan-500 focus:ring-2 transition-all duration-300"
                  />
                  <span className="text-sm text-gray-300">기억하기</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
                >
                  비밀번호를 잊어버리셨나요?
                </button>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-full hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>
                  {isLoading ? (isSignUp ? '가입 중...' : '로그인 중...') : (isSignUp ? '가입하기' : '로그인')}
                </span>
                {!isLoading && <ChevronRightIcon className="w-5 h-5" />}
              </div>
            </button>
          </form>

          {/* 가입/로그인 전환 */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  storeName: '',
                  phoneNumber: '',
                  location: '',
                  country: '',
                  province: '',
                  city: ''
                });
              }}
              className="text-cyan-400 hover:text-cyan-300 transition-colors duration-300 text-sm"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
            </button>
          </div>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="mt-6 p-4 bg-red-600/20 border border-red-500/30 rounded-full text-red-200 text-center backdrop-blur-xl">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-6 p-4 bg-emerald-600/20 border border-emerald-500/30 rounded-full text-emerald-200 text-center backdrop-blur-xl">
            <p className="font-medium">{success}</p>
          </div>
        )}
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700/50 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">비밀번호 재설정</h3>
            <p className="text-gray-300 text-sm mb-6">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 발송해 드립니다.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  이메일 주소
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300"
                  placeholder="이메일 주소를 입력하세요"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmail('');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors duration-300"
                >
                  취소
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '발송 중...' : '링크 발송'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
