import { useMediaQuery } from 'react-responsive';

const useBreakpoint = () => {
  const isMobile = useMediaQuery({ maxWidth: 639 });
  const isTablet = useMediaQuery({ minWidth: 640, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isMobileOrTablet = useMediaQuery({ maxWidth: 1023 });
  const isLandscape = useMediaQuery({ query: '(orientation: landscape)' });
  const isMobileLandscape = isMobile && isLandscape;

  return { isMobile, isTablet, isDesktop, isMobileOrTablet, isLandscape, isMobileLandscape };
};

export default useBreakpoint;
