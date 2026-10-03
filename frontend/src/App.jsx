import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { getPlatformSnapshot, isMobileExperience, subscribePlatform } from './shared/platform.js';

const DesktopApp = lazy(() => import('./desktop/DesktopApp.jsx'));
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'));
// O painel da equipe é outra aplicação: só é baixado por quem abre /painel.
const PainelApp = lazy(() => import('./painel/PainelApp.jsx'));

const noPainel = () => /^\/painel(\/|$)/.test(window.location.pathname);

function SitePublico() {
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

export default function App() {
  if (noPainel()) {
    return (
      <BrowserRouter>
        <Suspense fallback={<p role="status" className="p-8 font-body">Carregando o painel…</p>}>
          <Routes>
            <Route path="/painel/*" element={<PainelApp />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }
  return <SitePublico />;
}
