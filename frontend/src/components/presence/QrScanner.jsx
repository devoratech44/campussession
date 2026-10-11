// frontend/src/components/presence/QrScanner.jsx
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, CircleAlert, Camera } from 'lucide-react';

const SCAN_PATH = '/etudiant/pointage/';
const MAX_WIDTH = 640;
const PHOTO_MAX = 1200;
const NO_FRAME_MS = 6000;

// Extrait { token, k } d'un QR Campus Session ; null si ce n'est pas le nôtre
export function parseScan(text) {
  try {
    const url = new URL(text);
    const i = url.pathname.indexOf(SCAN_PATH);
    if (i === -1) return null;
    const token = url.pathname.slice(i + SCAN_PATH.length).split('/')[0];
    if (!token) return null;
    return { token, k: url.searchParams.get('k') || undefined };
  } catch {
    return null;
  }
}

export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('Ouverture de la caméra…');
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    let stream;
    let raf;
    let stopped = false;
    let gotFrame = false;

    const noFrameTimer = setTimeout(() => {
      if (!gotFrame && !stopped) {
        setHint("La caméra n'envoie pas d'image. Fermez les autres applications qui l'utilisent, vérifiez l'autorisation, ou utilisez le bouton « Prendre une photo du QR » ci-dessous.");
      }
    }, NO_FRAME_MS);

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth) {
        if (!gotFrame) { gotFrame = true; setStreaming(true); setHint('Placez le QR code du professeur dans le cadre.'); }
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
        canvas.width = Math.floor(video.videoWidth * scale);
        canvas.height = Math.floor(video.videoHeight * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (found?.data) {
          const parsed = parseScan(found.data);
          if (parsed) { stopped = true; onResult(parsed); return; }
          setHint("Ce QR code n'est pas un QR de pointage Campus Session.");
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const open = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (err) {
        if (err?.name === 'NotAllowedError') throw err;
        return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Caméra indisponible dans ce navigateur (HTTPS requis). Utilisez le bouton photo ci-dessous.");
        return;
      }
      try {
        stream = await open();
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();
        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (err?.name === 'NotAllowedError') setError("Accès à la caméra refusé. Autorisez-le (cadenas près de l'adresse), ou utilisez le bouton photo ci-dessous.");
        else if (err?.name === 'NotReadableError') setError("La caméra est utilisée par une autre application. Fermez-la, ou utilisez le bouton photo ci-dessous.");
        else setError("Impossible d'ouvrir la caméra. Utilisez le bouton photo ci-dessous.");
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(noFrameTimer);
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Secours : photo prise avec l'appareil photo natif
  const onPhoto = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
      const canvas = canvasRef.current;
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
      const parsed = found?.data ? parseScan(found.data) : null;
      if (parsed) onResult(parsed);
      else setHint(found?.data ? "Ce QR code n'est pas un QR de pointage Campus Session." : "Aucun QR code lisible sur la photo. Reprenez-la de plus près, bien nette.");
    };
    img.onerror = () => { URL.revokeObjectURL(url); setHint('Photo illisible, réessayez.'); };
    img.src = url;
  };

  return (
    <div className="qrscan" role="dialog" aria-modal="true" aria-label="Scanner le QR code">
      <div className="qrscan__box">
        <button type="button" className="qrscan__close" onClick={onClose} aria-label="Fermer"><X size={22} /></button>

        {error ? (
          <div className="alert alert-error" role="alert"><CircleAlert size={18} />{error}</div>
        ) : (
          <div className="qrscan__view">
            <video ref={videoRef} muted playsInline autoPlay />
            {streaming && <span className="qrscan__frame" aria-hidden="true" />}
          </div>
        )}
        {!error && <p className="qrscan__hint">{hint}</p>}

        <label className="btn btn-ghost qrscan__photo">
          <Camera size={18} /> Prendre une photo du QR
          <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
        </label>
        <canvas ref={canvasRef} hidden />
      </div>
    </div>
  );
}