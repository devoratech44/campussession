// frontend/src/components/common/SignaturePad.jsx
import { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import env from '../../config/env';

// onChange reçoit une image PNG (data URL) ou null si la zone est vide
export default function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [empty, setEmpty] = useState(true);
  const { signatureWidth: W, signatureHeight: H, signatureStroke: STROKE } = env;

  const paintBackground = () => {
    const ctx = ref.current.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = STROKE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  };

  useEffect(() => { paintBackground(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e) => {
    const rect = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * W) / rect.width, y: ((e.clientY - rect.top) * H) / rect.height };
  };

  const onDown = (e) => {
    e.preventDefault();
    ref.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = ref.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(last.current.x + 0.1, last.current.y + 0.1);
    ctx.stroke();
    setEmpty(false);
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = ref.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current.toDataURL('image/png'));
  };

  const clear = () => {
    paintBackground();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="sig-pad">
      <canvas
        ref={ref} width={W} height={H} style={{ aspectRatio: `${W} / ${H}` }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        aria-label="Zone de signature"
      />
      <div className="sig-hint">
        <small className="hint"><PenLine size={14} style={{ verticalAlign: 'text-bottom' }} /> Signez dans le cadre (doigt, souris ou stylet).</small>
        <button type="button" className="btn btn-ghost" onClick={clear} disabled={empty}><Eraser size={18} /> Effacer</button>
      </div>
    </div>
  );
}