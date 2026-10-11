// frontend/src/hooks/useServerStatus.js
import { useEffect, useState } from 'react';
import api from '../api/axios';
import env from '../config/env';

export default function useServerStatus() {
  const [status, setStatus] = useState('checking'); // checking | online | offline

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        await api.get('/health');
        if (active) setStatus('online');
      } catch {
        if (active) setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, env.statusRefreshMs);
    return () => { active = false; clearInterval(id); };
  }, []);

  return status;
}