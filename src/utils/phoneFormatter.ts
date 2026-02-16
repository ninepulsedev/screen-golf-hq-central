import { getCountryCode } from '../data/countryCodes';

export const formatPhoneNumberWithCountry = (
  phoneNumber: string, 
  country?: string
): string => {
  // 전화번호가 없는 경우
  if (!phoneNumber) {
    return '-';
  }
  
  // 이미 국가번호가 있는 경우
  if (phoneNumber.startsWith('[')) {
    return phoneNumber;
  }
  
  // 국가번호 찾기
  const countryCode = getCountryCode(country || '');
  
  // 국가번호 적용
  return `[${countryCode}] ${phoneNumber}`;
};
