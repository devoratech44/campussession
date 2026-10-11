// frontend/src/components/presence/LiveQr.jsx
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import env from '../../config/env';
import { errorMessage } from '../../utils/format';
import QrCode from '../common/QrCode';

// QR code tournant : le serveur donne une nouvelle clé toutes les ~3 s
export default function LiveQr({ seanceId }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    let timer;
    const run = async () => {
      try {
        const { data } = await api.get(`/presences/seances/${seanceId}/qr`);
        if (!alive) return;
        setQr(data.data);
        setError('');
        timer = setTimeout(run, data.data.refreshMs);
      } catch (err) {
        if (!alive) return;
        setError(errorMessage(err));
        timer = setTimeout(run, 3000);
      }
    };
    run();
    return () => { alive = false; clearTimeout(timer); };
  }, [seanceId]);

  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      {qr ? <QrCode value={qr.url} size={env.qrSize} /> : <div className="empty">Génération du QR code…</div>}
      {error && <small className="hint">{error}</small>}
      {qr && <small className="hint">Ce QR code se renouvelle toutes les {Math.round(qr.refreshMs / 1000)} s.</small>}
    </div>
  );
}