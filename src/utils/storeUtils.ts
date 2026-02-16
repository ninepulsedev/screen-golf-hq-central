// 매장 관련 유틸리티 함수
import { COUNTRY_CODES } from '../data/countryCodes';

/**
 * 이메일 주소를 기반으로 매장 ID 생성
 * @param email 이메일 주소
 * @returns 변환된 매장 ID
 */
export const generateStoreId = (email: string): string => {
  return email.replace(/[@.]/g, '_');
};

/**
 * 국가 코드 정규화 (국가명을 ISO 2자리 코드로 변환)
 * @param country 국가명 또는 코드
 * @returns 정규화된 국가 코드 (KR, US, JP 등)
 */
export const normalizeCountryCode = (country: string): string => {
  if (!country) return 'KR'; // 기본값: 한국

  // 이미 2자리 코드인 경우
  if (country.length === 2 && /^[A-Z]{2}$/.test(country.toUpperCase())) {
    return country.toUpperCase();
  }

  // 국가명으로 코드 찾기
  const countryUpper = country.toUpperCase();

  // 주요 국가명 매핑
  const countryNameMap: { [key: string]: string } = {
    '대한민국': 'KR',
    '한국': 'KR',
    'KOREA': 'KR',
    'UNITED STATES': 'US',
    'USA': 'US',
    '미국': 'US',
    'JAPAN': 'JP',
    '일본': 'JP',
    'CHINA': 'CN',
    '중국': 'CN',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    '영국': 'GB'
  };

  // 직접 매핑된 국가코드 반환
  if (countryNameMap[countryUpper]) {
    return countryNameMap[countryUpper];
  }

  // COUNTRY_CODES에서 국가명으로 검색
  for (const [countryName, countryCode] of Object.entries(COUNTRY_CODES)) {
    if (countryName.toUpperCase() === countryUpper) {
      // 국가번호에서 국가코드 추출 (간단한 매핑)
      const codeMap: { [key: string]: string } = {
        '+82': 'KR', '+1': 'US', '+81': 'JP', '+86': 'CN',
        '+44': 'GB', '+49': 'DE', '+33': 'FR', '+39': 'IT',
        '+34': 'ES', '+31': 'NL', '+46': 'SE', '+47': 'NO',
        '+45': 'DK', '+41': 'CH', '+43': 'AT', '+358': 'FI'
      };
      return codeMap[countryCode] || 'KR';
    }
  }

  return 'KR'; // 기본값: 한국
};

/**
 * 이메일 도메인 기반 국가 코드 추론
 * @param email 이메일 주소
 * @returns 추론된 국가 코드
 */
export const inferCountryCodeFromEmail = (email: string): string => {
  if (!email) return 'KR';

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'KR';

  // 🆕 이메일 제공업체 기반 국가 추론 (더 정확함)
  const providerCountryMap: { [key: string]: string } = {
    // 한국 이메일 제공업체
    'daum.net': 'KR',
    'naver.com': 'KR',
    'hanmail.net': 'KR',
    'nate.com': 'KR',
    'paran.com': 'KR',
    'korea.com': 'KR',
    'dreamwiz.com': 'KR',
    'chol.com': 'KR',
    'hanafos.com': 'KR',

    // 미국 이메일 제공업체
    'gmail.com': 'US',
    'yahoo.com': 'US',
    'hotmail.com': 'US',
    'outlook.com': 'US',
    'aol.com': 'US',
    'icloud.com': 'US',
    'mail.com': 'US',
    'zoho.com': 'US',

    // 기타 국가
    'qq.com': 'CN',
    '163.com': 'CN',
    '126.com': 'CN',
    'sina.com': 'CN',
    'sohu.com': 'CN',
    'yahoo.co.jp': 'JP',
    'gmail.co.jp': 'JP',
    'yahoo.co.uk': 'GB',
    'gmail.co.uk': 'GB',
    'web.de': 'DE',
    'gmx.de': 'DE',
    'libero.it': 'IT',
    'virgilio.it': 'IT',
    'yahoo.fr': 'FR',
    'gmail.fr': 'FR',
    'yahoo.es': 'ES',
    'gmail.es': 'ES'
  };

  // 정확한 이메일 제공업체 매칭
  if (providerCountryMap[domain]) {
    return providerCountryMap[domain];
  }

  // 도메인 기반 국가 추론 (기존 로직 유지)
  const domainCountryMap: { [key: string]: string } = {
    'co.kr': 'KR',
    'kr': 'KR',
    'com': 'US',
    'org': 'US',
    'net': 'US',
    'edu': 'US',
    'gov': 'US',
    'co.jp': 'JP',
    'jp': 'JP',
    'co.cn': 'CN',
    'cn': 'CN',
    'co.uk': 'GB',
    'uk': 'GB',
    'ca': 'CA',
    'au': 'AU',
    'de': 'DE',
    'fr': 'FR',
    'it': 'IT',
    'es': 'ES',
    'nl': 'NL'
  };

  // 정확한 도메인 매칭
  if (domainCountryMap[domain]) {
    return domainCountryMap[domain];
  }

  // 부분 매칭 (.co.kr, .co.jp 등)
  for (const [pattern, code] of Object.entries(domainCountryMap)) {
    if (domain.includes(pattern)) {
      return code;
    }
  }

  return 'KR'; // 기본값: 한국
};

/**
 * 국가 코드를 기반으로 users 컬렉션 이름 생성
 * @param countryCode 국가 코드 (KR, US, JP 등)
 * @returns users 컬렉션 이름 (users_KR, users_US 등)
 */
export const getUserCollectionName = (countryCode?: string): string => {
  const code = countryCode || 'KR';
  return `users_${code}`;
};

/**
 * 사용자 정보를 저장할 컬렉션 이름 결정
 * @param email 사용자 이메일
 * @param country 국가명 (선택사항)
 * @returns 컬렉션 이름
 */
export const determineUserCollection = (email: string, country?: string): string => {
  // 국가 정보가 있으면 국가 코드로 변환
  if (country) {
    const countryCode = normalizeCountryCode(country);
    return getUserCollectionName(countryCode);
  }

  // 이메일 도메인으로 국가 추론
  const inferredCode = inferCountryCodeFromEmail(email);
  return getUserCollectionName(inferredCode);
};
