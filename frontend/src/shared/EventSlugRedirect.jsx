import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { obterEventoPorSlug } from '../lib/api.js';

export default function EventSlugRedirect() {
  const { slug } = useParams();
  const [eventId, setEventId] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    obterEventoPorSlug(slug)
      .then(({ event }) => setEventId(event.eventoId))
      .catch(() => setFailed(true));
  }, [slug]);
  if (eventId) return <Navigate replace to={`/evento/${encodeURIComponent(eventId)}`} />;
  if (failed) return <Navigate replace to="/buscar" />;
  return null;
}
