// usePollingStatus.js — polls GET /api/status-pagamento every 3 s.
// Stops when status is 'approved', 'rejected', or 'cancelled'.
import { useState, useEffect, useRef } from 'react';
import { statusPagamento } from '../lib/api';

const INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['approved', 'rejected', 'cancelled'];

export function usePollingStatus(transactionId) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!transactionId) return;

    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const data = await statusPagamento(transactionId);
        if (!stopped) {
          setStatus(data.status);
          if (TERMINAL_STATUSES.includes(data.status)) {
            stopped = true;
          }
        }
      } catch (err) {
        if (!stopped) setError(err.message);
      }

      if (!stopped) {
        timerRef.current = setTimeout(poll, INTERVAL_MS);
      }
    }

    poll();

    return () => {
      stopped = true;
      clearTimeout(timerRef.current);
    };
  }, [transactionId]);

  const isPolling = Boolean(transactionId) && !TERMINAL_STATUSES.includes(status);

  return { status, isPolling, error };
}

export default usePollingStatus;
