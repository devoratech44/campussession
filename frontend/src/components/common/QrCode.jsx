// frontend/src/components/common/QrCode.jsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ value, size }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setSrc(''); });
    return () => { active = false; };
  }, [value, size]);

  return src ? <img className="qr" src={src} alt="QR code de présence" width={size} height={size} /> : null;
}