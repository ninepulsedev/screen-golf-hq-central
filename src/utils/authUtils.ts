// 인증 유틸리티 함수

/**
 * 본사 관리자인지 확인하는 함수
 * @param email 확인할 이메일 주소
 * @returns 본사 관리자이면 true, 아니면 false
 */
export const isHQAdmin = (email: string): boolean => {
  // 하드코딩된 이메일로 임시 설정 (보안을 위해 나중에 환경 변수로 변경)
  const hqAdminEmail = 'movare00@gmail.com';
  return email === hqAdminEmail;
};

/**
 * 사용자 역할을 반환하는 함수
 * @param email 사용자 이메일
 * @returns 'hq' | 'store'
 */
export const getUserRole = (email: string): 'hq' | 'store' => {
  return isHQAdmin(email) ? 'hq' : 'store';
};
