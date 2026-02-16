import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { generateStoreId, inferCountryCodeFromEmail, normalizeCountryCode } from '../utils/storeUtils';
import { isHQAdmin } from '../utils/authUtils';

// 🆕 매장 사용자 데이터 조회 함수 - 모든 국가 컬렉션 순회
const fetchStoreUserData = async (email: string) => {
  console.log('🔍 AuthContext: 매장 데이터 조회 시작:', email);

  // 국가별 users 컬렉션 순회
  const countryCodes = ['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL'];

  for (const countryCode of countryCodes) {
    try {
      const userDocRef = doc(db, `users_${countryCode}`, email);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(`✅ AuthContext: ${countryCode}에서 매장 데이터 찾음:`, {
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
      console.error(`❌ AuthContext: ${countryCode} 조회 오류:`, error);
      continue;
    }
  }

  console.error('❌ AuthContext: 매장 데이터를 찾을 수 없음:', email);
  return null;
};

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'hq' | 'store' | null;
  storeName?: string;
  extraEmail?: string; // 추가 이메일 필드
  // 🆕 지역 정보 추가
  country?: string;            // 국가명 (대한민국, United States)
  countryCode?: string;        // 🆕 국가 코드 (KR, US)
  region?: string;             // 광역 (경상북도, CA)
  city?: string;               // 기초 (포항시, Los Angeles)
  storeId?: string;            // 스토어 ID
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', {
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        timestamp: new Date().toISOString()
      });

      if (firebaseUser) {
        try {
          // HQ 관리자 확인 - 조기 리턴 최적화
          if (firebaseUser.email && isHQAdmin(firebaseUser.email)) {
            console.log('HQ admin detected:', firebaseUser.email);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'hq'
            });
            setLoading(false); // 즉시 로딩 완료
            return; // 조기 리턴 - 불필요한 Firestore 조회 방지
          } else {
            // 매장 관리자 확인 - 모든 국가 컬렉션 순회 조회
            const email = firebaseUser.email || '';

            if (email) {
              console.log('AuthContext: Store manager detected, email:', email);

              try {
                // 🆕 fetchStoreUserData로 정확한 매장 데이터 조회
                const storeUserData = await fetchStoreUserData(email);

                if (storeUserData) {
                  console.log('AuthContext: Store manager data found:', storeUserData);
                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    role: storeUserData.role || 'store',
                    storeName: storeUserData.storeName,
                    extraEmail: storeUserData.extraEmail,
                    // 🆕 Firestore 문서에서 읽어온 정확한 지역 정보 사용
                    country: storeUserData.country || '대한민국',
                    countryCode: storeUserData.countryCode || normalizeCountryCode(storeUserData.country || '대한민국'),
                    region: storeUserData.region || '경상북도',
                    city: storeUserData.city || '포항시',
                    storeId: storeUserData.storeId || generateStoreId(email)
                  });
                } else {
                  console.warn('AuthContext: Store manager document not found for email:', email);
                  // 🆕 문서를 찾지 못한 경우에도 이메일 기반 기본값 설정
                  const inferredCountryCode = inferCountryCodeFromEmail(email);
                  const defaultCountry = inferredCountryCode === 'US' ? 'United States' : '대한민국';

                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    role: null,
                    country: defaultCountry,
                    countryCode: inferredCountryCode,
                    region: inferredCountryCode === 'KR' ? '경상북도' : 'California',
                    city: inferredCountryCode === 'KR' ? '포항시' : 'Los Angeles',
                    storeId: generateStoreId(email)
                  });
                }
              } catch (docError) {
                console.error('AuthContext: Store manager data query failed:', docError);
                // 🆕 Firestore 조회 실패 시에도 이메일 기반 기본값 설정
                const inferredCountryCode = inferCountryCodeFromEmail(email);
                const defaultCountry = inferredCountryCode === 'US' ? 'United States' : '대한민국';

                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  role: null,
                  country: defaultCountry,
                  countryCode: inferredCountryCode,
                  region: inferredCountryCode === 'KR' ? '경상북도' : 'California',
                  city: inferredCountryCode === 'KR' ? '포항시' : 'Los Angeles',
                  storeId: generateStoreId(email)
                });
              }
            } else {
              console.warn('AuthContext: Unknown user type, email:', email);
              // 알 수 없는 사용자 타입
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: null
              });
            }
          }
        } catch (error) {
          console.error('Auth context error:', error);
          // 에러 발생 시에도 기본 정보 설정
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: null
          });
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
