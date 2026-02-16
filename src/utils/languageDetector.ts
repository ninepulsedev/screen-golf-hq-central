import { getEmailTemplate } from '../data/emailTemplates';

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

export const getEmailTemplateForUser = (email: string, userCountry?: string) => {
  return getEmailTemplate(email, userCountry);
};
