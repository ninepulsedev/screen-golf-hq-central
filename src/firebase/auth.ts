import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './config';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getEmailTemplateForUser } from '../utils/languageDetector';
import { determineUserCollection, inferCountryCodeFromEmail, normalizeCountryCode } from '../utils/storeUtils';
import { isHQAdmin, getUserRole } from '../utils/authUtils';

// 본사 관리자 이메일은 환경 변수에서 관리
// .env.local 또는 .env.production 파일에 REACT_APP_HQ_ADMIN_EMAIL로 설정


interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
  role?: string;
  approved?: boolean;
}

// 단일 이메일 로그인 함수 (본사/매장 관리자 자동 구분)
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    console.log('Attempting email login:', { email });

    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    console.log('Firebase auth successful:', { uid: user.uid, email: user.email });

    // 본사 관리자인지 확인
    if (isHQAdmin(email)) {
      console.log('HQ admin detected:', email);
      return {
        success: true,
        user,
        role: 'hq'
      };
    }

    // 매장 관리자 처리
    console.log('Store manager detected, email:', email);

    // 🚀 성능 최적화: 단일 컬렉션 타겟팅으로 검색 속도 향상
    const countryCode = inferCountryCodeFromEmail(email);
    const targetCollection = `users_${countryCode}`;

    console.log(`Searching in optimized collection: ${targetCollection} for email: ${email}`);

    try {
      const docRef = doc(db, targetCollection, email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userDoc = docSnap;
        const foundCollection = targetCollection;
        console.log(`Found user in optimized collection: ${foundCollection}`);

        // 승인된 사용자인지 확인
        const userData = userDoc.data();
        console.log('User data:', { approved: userData?.approved, role: userData?.role });

        if (!userData?.approved) {
          console.log('User not approved, signing out');
          await signOut(auth);
          return {
            success: false,
            error: "관리자 승인이 필요합니다. 본사 관리자에게 문의하세요."
          };
        }

        // 마지막 로그인 시간 업데이트
        await setDoc(doc(db, foundCollection, email), {
          lastLogin: new Date()
        }, { merge: true });
        console.log('Last login updated successfully');

        return {
          success: true,
          user,
          role: 'store'
        };
      } else {
        console.log('User not found in optimized collection, signing out');
        await signOut(auth);
        return {
          success: false,
          error: "매장 관리자 계정이 아닙니다."
        };
      }
    } catch (error) {
      console.log(`Error searching collection ${targetCollection}:`, error);
      await signOut(auth);
      return {
        success: false,
        error: "로그인 중 오류가 발생했습니다."
      };
    }
  } catch (error: any) {
    console.error('로그인 에러:', error);

    if (error.code === 'auth/user-not-found') {
      return {
        success: false,
        error: "등록되지 않은 이메일입니다."
      };
    } else if (error.code === 'auth/wrong-password') {
      return {
        success: false,
        error: "비밀번호가 올바르지 않습니다."
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        error: "유효하지 않은 이메일 형식입니다."
      };
    } else if (error.code === 'auth/too-many-requests') {
      return {
        success: false,
        error: "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요."
      };
    } else {
      return {
        success: false,
        error: "로그인 중 오류가 발생했습니다."
      };
    }
  }
};

// IP 주소 추적 유틸리티리스
const getClientIP = async (): Promise<string> => {
  try {
    // IP 주소 추적 API 호출
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('IP 추적 실패:', error);
    return 'unknown';
  }
};

// 지역 정보 가져오기
const getRegionInfo = async (ip: string): Promise<string> => {
  try {
    const response = await fetch(`https://ipapi.co/json/${ip}`);
    const data = await response.json();
    return `${data.country_name} (${data.region_name})`;
  } catch (error) {
    console.error('지역 정보 추적 실패:', error);
    return '알 수 없음';
  }
};

// 비밀번호 재설정 이메일 발송
export const resetPassword = async (email: string): Promise<AuthResult> => {
  try {
    console.log('Sending password reset email to:', email);

    // 사용자 국가 정보 확인 (여러 컬렉션 검색)
    let userCountry: string | undefined;
    const countryCode = inferCountryCodeFromEmail(email);
    const possibleCollections = [
      `users_${countryCode}`,
      'users_KR', 'users_US', 'users_JP', 'users_CN', 'users_GB',
      'users_DE', 'users_FR', 'users_IT', 'users_ES', 'users_NL'
    ];

    // 가능한 컬렉션들을 순회하며 사용자 검색
    for (const collectionName of possibleCollections) {
      try {
        const userDoc = await getDoc(doc(db, collectionName, email));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userCountry = userData?.country;
          console.log(`Found user in collection: ${collectionName}, country: ${userCountry}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // 언어에 맞는 템플릿 가져오기
    const template = getEmailTemplateForUser(email, userCountry);

    // Firebase 기본 비밀번호 재설정 이메일 발송
    await sendPasswordResetEmail(auth, email);

    return {
      success: true,
      error: template.successMessage
    };
  } catch (error: any) {
    console.error('비밀번호 재설정 에러:', error);

    // 언어에 맞는 템플릿 가져오기 (에러 처리용)
    const template = getEmailTemplateForUser(email);

    if (error.code === 'auth/user-not-found') {
      return {
        success: false,
        error: template.userNotFound
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        error: template.invalidEmail
      };
    } else if (error.code === 'auth/too-many-requests') {
      return {
        success: false,
        error: template.tooManyRequests
      };
    } else {
      return {
        success: false,
        error: template.errorMessage
      };
    }
  }
};
// 매장 관리자 회원가입
export const signUpStoreAdmin = async (
  email: string,
  password: string,
  storeName: string,
  phoneNumber: string,
  location?: string, // 위치 정보 파라미터 추가
  extraEmail?: string, // 추가 이메일 파라미터 (본사 관리자용 Gmail)
  country?: string // 국가 정보 파라미터 추가
): Promise<AuthResult> => {
  let retryCount = 0;
  const maxRetries = 3;

  async function signUpWithRetry(): Promise<AuthResult> {
    while (retryCount < maxRetries) {
      try {
        // 국가별 컬렉션 이름 결정
        const collectionName = determineUserCollection(email, country);
        console.log(`Using collection: ${collectionName} for email: ${email}, country: ${country}`);

        // 성능 최적화: 단일 컬렉션 타겟팅으로 중복 확인 속도 향상
        const inferredCountryCode = inferCountryCodeFromEmail(email);
        const targetCollection = `users_${inferredCountryCode}`;

        console.log(`Checking for duplicate in optimized collection: ${targetCollection} for email: ${email}`);

        const docRef = doc(db, targetCollection, email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log(`Found existing user in collection: ${targetCollection}`);
          return {
            success: false,
            error: "이미 사용 중인 이메일입니다."
          };
        }

        // 성능 최적화: 외부 API 호출 제거 및 위치 정보 단순화
        let regionInfo = location || '';
        let clientIP = 'geolocation';

        if (!regionInfo) {
          // 기본 위치 정보 설정 (외부 API 호출 제거)
          regionInfo = country || '대한민국';
          clientIP = 'default';
        }

        // 🆕 국가 정보 제거 - region에서 국가 정보 분리
        const cleanRegion = regionInfo.replace(/^대한민국\s*/, '').trim();
        console.log('🔧 국가 정보 제거:', {
          original: regionInfo,
          cleaned: cleanRegion
        });

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // 성능 최적화: 불필요한 지연 제거
        // await new Promise(resolve => setTimeout(resolve, 200)); // 제거

        // Firestore에 매장 관리자 정보 저장 (국가별 컬렉션)
        const countryCode = normalizeCountryCode(country || '대한민국');
        await setDoc(doc(db, collectionName, email), {
          uid: user.uid,
          email, // 이메일 주소 (주요 식별자)
          extraEmail, // 추가 이메일 (본사 관리자용)
          storeName,
          phoneNumber,
          role: 'store',
          createdAt: new Date(),
          lastLogin: new Date(),
          approved: false, // 관리자 승인 필요
          clientIP: clientIP, // 성능 최적화: 중복 API 호출 제거
          region: cleanRegion, // 🆕 국가 정보 제거된 지역 정보
          country: country || '대한민국', // 원본 국가명 저장
          countryCode: countryCode, // 정규화된 국가 코드 저장
          collectionName // 어떤 컬렉션에 저장되었는지 기록
        });

        console.log(`User created successfully in collection: ${collectionName}`);

        // 성공 시에도 재시도 없이 바로 반환
        return {
          success: true,
          error: `회원가입이 완료되었습니다. 이메일이 ${email}(으)로 가입되었습니다. 관리자 승인 후 로그인 가능합니다.`
        };

      } catch (error: any) {
        retryCount++;
        console.error(`회원가입 시도 ${retryCount} 실패:`, error);

        if (retryCount >= maxRetries) {
          let errorMessage = analyzeError(error);
          return {
            success: false,
            error: errorMessage
          };
        }

        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        // while 루프 계속 진행 (다음 시도)
      }
    }

    // 루프 종료 시 명시적 반환
    return {
      success: false,
      error: "회원가입 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."
    };
  }

  try {
    return await signUpWithRetry();
  } catch (error: any) {
    console.error('회원가입 함수 실행 오류:', error);
    return {
      success: false,
      error: "회원가입 중 심각한 오류가 발생했습니다. 다시 시도해주세요."
    };
  }
};

// 에러 분석 함수
function analyzeError(error: any): string {
  if (error.code === 'auth/email-already-in-use') {
    return "이미 사용 중인 이메일입니다.";
  } else if (error.code === 'auth/weak-password') {
    return "비밀번호가 너무 약합니다. 8자 이상으로 설정해주세요.";
  } else if (error.code === 'auth/invalid-email') {
    return "유효하지 않은 이메일 형식입니다.";
  } else if (error.code === 'permission-denied') {
    return "권한이 없습니다. 관리자에게 문의하세요.";
  } else if (error.code === 'resource-exhausted') {
    return "서버가 일시적으로 과부하입니다. 잠시 후 다시 시도해주세요.";
  } else {
    return "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}
