import { useEffect } from 'react';
import DonationManage from './DonationManage.jsx';
import DonationPage from './DonationPage.jsx';
import DonationThanks from './DonationThanks.jsx';
import './donation.css';
import './donation-sections.css';

const TITLE = 'Doe para a Paróquia São Rafael';

// Pagina independente do site de fotos: tem rotas e visual proprios.
export default function DonationApp() {
  const path = window.location.pathname.replace(/\/+$/, '');

  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => { document.title = previous; };
  }, []);

  if (path === '/doar/obrigado') return <DonationThanks />;
  if (path === '/doar/gerenciar') return <DonationManage />;
  return <DonationPage />;
}
