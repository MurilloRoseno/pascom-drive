import { Suspense, lazy, useEffect, useState } from 'react';
import { getPlatformSnapshot, isMobileExperience, subscribePlatform } from './shared/platform.js';

const DesktopApp = lazy(() => import('./desktop/DesktopApp.jsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'));

export default function App() {
  const [platform, setPlatform] = useState(() => getPlatformSnapshot());

  useEffect(() => subscribePlatform(setPlatform), []);
  useEffect(() => {
    document.documentElement.dataset.platform = platform;
  }, [platform]);

  const Experience = isMobileExperience(platform) ? MobileApp : DesktopApp;

  return (
    <Suspense fallback={<div className="experience-loading" aria-label="Carregando experiência" />}>
      <Experience platform={platform} />
    </Suspense>
  );
}
