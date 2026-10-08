import { Suspense, lazy, useEffect, useState } from 'react';
import { getPlatformSnapshot, isMobileExperience, subscribePlatform } from './shared/platform.js';

const DesktopApp = lazy(() => import('./desktop/DesktopApp.jsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'));
const DonationApp = lazy(() => import('./donation/DonationApp.jsx'));

// A pagina de doacao e independente do site de fotos (sem cabecalho, rodape ou carrinho).
function isDonationPath() {
  return /^\/doar(\/|$)/.test(window.location.pathname);
}

export default function App() {
  const [platform, setPlatform] = useState(() => getPlatformSnapshot());

  useEffect(() => subscribePlatform(setPlatform), []);
  useEffect(() => {
    document.documentElement.dataset.platform = platform;
  }, [platform]);

  const Experience = isDonationPath() ? DonationApp : isMobileExperience(platform) ? MobileApp : DesktopApp;

  return (
    <Suspense fallback={<div className="experience-loading" aria-label="Carregando experiência" />}>
      <Experience platform={platform} />
    </Suspense>
  );
}
