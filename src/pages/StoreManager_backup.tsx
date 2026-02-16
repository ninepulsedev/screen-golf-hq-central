import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
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
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { formatPhoneNumberWithCountry } from '../utils/phoneFormatter';

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
  clientIP?: string; // IP 주소 정보 추가
}

const StoreManager: React.FC = () => {
  const [managers, setManagers] = useState<StoreManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const managerList: StoreManager[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.role === 'store') {
          managerList.push({
            uid: data.uid,
            email: data.email, // 이메일을 주요 식별자로 사용
            extraEmail: data.extraEmail, // 추가 이메일 필드
            storeName: data.storeName,
            phoneNumber: data.phoneNumber,
            role: data.role,
            createdAt: data.createdAt,
            lastLogin: data.lastLogin,
            approved: data.approved,
            country: data.country || '알 수 없음', // 국가 정보 추가
            region: data.region || '알 수 없음', // 지역 정보 추가
            clientIP: data.clientIP // IP 주소 정보 추가
          });
        }
      });

      setManagers(managerList);
    } catch (err) {
      console.error('매장 관리자 목록 조회 오류:', err);
      setError('매장 관리자 목록을 불러오는데 실패했습니다.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">매장 관리자 목록을 불러오는 중...</p>
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

      {/* 관리자 목록 테이블 */}
      <div className="bg-gray-900/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white">매장 관리자 목록</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800/50">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  시스템
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  국가
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  지역
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  매장명
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  이메일 주소
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  승인
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900/30 divide-y divide-gray-800/50">
              {managers.map((manager) => (
                <tr key={manager.uid} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <Link
                      to="/system"
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
                          <span className="text-sm text-green-500">온라인</span>
                        </>
                      ) : (
                        <>
                          <SignalSlashIcon className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-500">오프라인</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleApproval(manager.uid, !manager.approved)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${manager.approved
                        ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                        : 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                        }`}
                    >
                      {manager.approved ? '승인됨' : '대기'}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => deleteManager(manager.uid)}
                      className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {managers.length === 0 && (
          <div className="text-center py-6">
            <UserGroupIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">가입된 매장 관리자가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreManager;
