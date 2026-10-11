// frontend/src/components/common/Clock.jsx
import { Clock as ClockIcon } from 'lucide-react';
import useClock from '../../hooks/useClock';
import { TIMEZONE, TIMEZONE_LABEL } from '../../utils/presence';

export default function Clock() {
  const now = useClock();
  const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIMEZONE });
  return (
    <span className="clock">
      <ClockIcon size={16} />
      {date} · {now.toLocaleTimeString('fr-FR', { timeZone: TIMEZONE })} {TIMEZONE_LABEL}
    </span>
  );
}