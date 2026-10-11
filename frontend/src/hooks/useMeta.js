// frontend/src/hooks/useMeta.js
import { useEffect, useState } from 'react';
import api from '../api/axios';

let cache = null;
let inflight = null;

// Listes et règles fournies par le serveur (niveaux, genres, seuils, mot de passe…)
export default function useMeta() {
  const [meta, setMeta] = useState(cache);

  useEffect(() => {
    if (cache) return;
    inflight = inflight || api.get('/settings/meta').then((res) => { cache = res.data.data; return cache; });
    inflight.then(setMeta).catch(() => { inflight = null; });
  }, []);

  return meta;
}