// frontend/src/components/presence/SuccessCelebration.jsx
import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import '../../styles/celebration.css';

const COUNT = Number(import.meta.env.VITE_CELEBRATION_PARTICLES) || 36;
const COLORS = (import.meta.env.VITE_CELEBRATION_COLORS || '#16a34a,#22c55e,#d4a017,#ffffff').split(',');

/** info : { prenom, module, professeur, salle, heure, statut, methode, retardMin } */
export default function SuccessCelebration({ open, info = {}, onClose }) {
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const bar = i % 3 === 0;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          left: Math.random() * 100,
          w: bar ? 3 : 6 + Math.random() * 6,
          h: bar ? 14 + Math.random() * 12 : 6 + Math.random() * 6,
          duration: 4 + Math.random() * 4,
          delay: Math.random() * 3,
          sway: 16 + Math.random() * 36,
          spin: Math.random() > 0.5 ? 360 : -360,
        };
      }),
    [open]
  );

  if (!open) return null;

  const rows = [
    ['Module', info.module],
    ['Professeur', info.professeur],
    ['Salle', info.salle],
    ['Heure du pointage', info.heure],
    ['Méthode', info.methode],
    ['Statut', info.statut === 'retard' ? `En retard (${info.retardMin} min)` : 'Présent'],
  ].filter(([, v]) => v);

  return (
    <div className="celebration" role="dialog" aria-live="polite">
      <div className="celebration__particles" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="celebration__particle"
            style={{
              left: `${p.left}%`,
              width: `${p.w}px`,
              height: `${p.h}px`,
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--sway': `${p.sway}px`,
              '--spin': `${p.spin}deg`,
            }}
          />
        ))}
      </div>

      <div className="celebration__card">
        <CheckCircle2 className="celebration__icon" size={64} />
        <h2>Présence confirmée</h2>
        <p className="celebration__wish">Bon cours{info.prenom ? `, ${info.prenom}` : ''}.</p>

        <dl className="celebration__infos">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <button type="button" className="celebration__btn" onClick={onClose}>Continuer</button>
      </div>
    </div>
  );
}