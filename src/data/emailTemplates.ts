export const EMAIL_TEMPLATES = {
  korean: {
    subject: '스크린골프 관리 시스템 - 비밀번호 재설정',
    successMessage: '비밀번호 재설정 링크를 발송했습니다. 이메일을 확인해주세요.',
    errorMessage: '비밀번호 재설정 이메일 발송에 실패했습니다.',
    userNotFound: '등록되지 않은 이메일입니다.',
    invalidEmail: '유효하지 않은 이메일 형식입니다.',
    tooManyRequests: '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.'
  },
  english: {
    subject: 'Screen Golf Management System - Password Reset',
    successMessage: 'Password reset link has been sent. Please check your email.',
    errorMessage: 'Failed to send password reset email.',
    userNotFound: 'User not found.',
    invalidEmail: 'Invalid email format.',
    tooManyRequests: 'Too many requests. Please try again later.'
  }
};

export const detectLanguage = (email: string, userCountry?: string): 'korean' | 'english' => {
  // 사용자 데이터에 국가 정보가 있는 경우
  if (userCountry) {
    return (userCountry === '대한민국' || userCountry === '한국') ? 'korean' : 'english';
  }
  
  // 이메일 도메인으로 한국 사용자 감지
  const domain = email.split('@')[1]?.toLowerCase();
  const koreanDomains = ['co.kr', 'kr', 'ac.kr', 'go.kr'];
  
  if (koreanDomains.some(kDomain => domain?.endsWith(kDomain))) {
    return 'korean';
  }
  
  return 'english'; // 기본값
};

export const getEmailTemplate = (email: string, userCountry?: string) => {
  const language = detectLanguage(email, userCountry);
  return EMAIL_TEMPLATES[language];
};
