// 디바이스 및 브라우저 환경 감지 유틸리티

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  browser: string;
  os: string;
}

// 모바일 기기 감지
const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'iphone', 'ipad', 'ipod', 'blackberry',
    'windows phone', 'mobile', 'webos', 'opera mini'
  ];

  return mobileKeywords.some(keyword => userAgent.includes(keyword)) &&
    'ontouchstart' in window;
};

// 문제가 되는 User-Agent 감지
export const hasProblematicUserAgent = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();

  // WebView나 인앱 브라우저 감지
  const problematicPatterns = [
    'wv', // WebView
    'version/', // 일부 인앱 브라우저
    'samsungbrowser', // 삼성 인터넷 (일부 버전)
    'miuibrowser', // Xiaomi 브라우저
    'huaweibrowser', // Huawei 브라우저
    'oppobrowser', // OPPO 브라우저
    'vivobrowser', // Vivo 브라우저
    'ucbrowser', // UC Browser
    'qqbrowser', // QQ Browser
    'baiduboxapp', // Baidu App
    'weibo', // Weibo 내장 브라우저
    'line', // Line 내장 브라우저
    'kakaotalk', // KakaoTalk 내장 브라우저
    'naver', // Naver 앱 내장 브라우저
  ];

  return problematicPatterns.some(pattern => userAgent.includes(pattern));
};

// 태블릿 감지
const isTabletDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const tabletKeywords = ['ipad', 'tablet', 'kindle'];

  return tabletKeywords.some(keyword => userAgent.includes(keyword)) ||
    (isMobileDevice() && window.innerWidth > 768);
};

// 브라우저 종류 감지
const getBrowserType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'chrome';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  } else if (userAgent.includes('firefox')) {
    return 'firefox';
  } else if (userAgent.includes('edg')) {
    return 'edge';
  } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
    return 'opera';
  }

  return 'unknown';
};

// 운영체제 감지
const getOSType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('android')) {
    return 'android';
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    return 'ios';
  } else if (userAgent.includes('windows')) {
    return 'windows';
  } else if (userAgent.includes('mac')) {
    return 'macos';
  } else if (userAgent.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
};

// 메인 디바이스 정보 함수
export const getDeviceInfo = (): DeviceInfo => {
  const isMobile = isMobileDevice();
  const isTablet = isTabletDevice();

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    browser: getBrowserType(),
    os: getOSType()
  };
};

// 모바일 환경에서 리디렉션 방식을 사용해야 하는지 확인
export const shouldUseRedirect = (): boolean => {
  const deviceInfo = getDeviceInfo();

  // 모바일이나 태블릿 환경에서는 리디렉션 방식 사용
  if (deviceInfo.isMobile || deviceInfo.isTablet) {
    return true;
  }

  // Safari 데스크톱에서도 리디렉션 방식 사용 (팝업 차단 방지)
  if (deviceInfo.browser === 'safari') {
    return true;
  }

  // 문제가 되는 User-Agent를 가진 브라우저에서는 리디렉션 방식 사용
  if (hasProblematicUserAgent()) {
    return true;
  }

  return false;
};

// 콘솔에 디바이스 정보 로깅 (디버깅용)
export const logDeviceInfo = (): void => {
  const deviceInfo = getDeviceInfo();
  console.log('Device Info:', deviceInfo);
  console.log('Should use redirect:', shouldUseRedirect());
};
