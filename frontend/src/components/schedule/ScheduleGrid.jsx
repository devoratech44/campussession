// frontend/src/components/schedule/ScheduleGrid.jsx
import { PUBLIC_TYPES, layoutDay, moduleColor, toLabel, todayDayId } from '../../utils/schedule';

const ROW_H = Number(import.meta.env.VITE_SCHEDULE_ROW_HEIGHT) || 52;
const DETAIL_H = Number(import.meta.env.VITE_SCHEDULE_DETAIL_HEIGHT) || 132;
const COL_MIN = Number(import.meta.env.VITE_SCHEDULE_COL_MIN) || 150;
const TIME_COL = 58;

// Minutes écoulées depuis minuit, en GMT
const nowMinutesUtc = () => {
  const d = new Date();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export default function ScheduleGrid({ slots, days, schedule, onSlotClick, onEmptyClick }) {
  const { startMinutes, endMinutes, stepMinutes } = schedule;
  const rows = (endMinutes - startMinutes) / stepMinutes;
  const times = Array.from({ length: rows }, (_, i) => startMinutes + i * stepMinutes);

  // Disposition de chaque jour + largeur de colonne selon les cours simultanés
  const layouts = days.map((d) => {
    const items = layoutDay(slots.filter((s) => s.jour === d.id));
    return { day: d, items, lanes: Math.max(1, ...items.map((i) => i.lanes)) };
  });

  // Hauteur de chaque ligne : assez grande pour que les cours qui la touchent s'affichent en détail
  const rowH = times.map((t) => {
    const next = t + stepMinutes;
    let h = ROW_H;
    layouts.forEach(({ items }) => items.forEach(({ start, end }) => {
      if (start < next && end > t) {
        const slotRows = Math.max(1, Math.round((end - start) / stepMinutes));
        h = Math.max(h, Math.ceil(DETAIL_H / slotRows));
      }
    }));
    return h;
  });
  const offsets = [0];
  rowH.forEach((h, i) => offsets.push(offsets[i] + h));
  const total = offsets[rows];

  // Position verticale (px) d'une heure : interpolation dans la ligne concernée
  const yOf = (min) => {
    const f = (min - startMinutes) / stepMinutes;
    const i = Math.min(rows - 1, Math.max(0, Math.floor(f)));
    return offsets[i] + (f - i) * rowH[i];
  };
  const minuteAt = (y) => {
    let i = 0;
    while (i < rows - 1 && y >= offsets[i + 1]) i += 1;
    return startMinutes + i * stepMinutes;
  };

  const template = `${TIME_COL}px ${layouts.map((l) => `minmax(${COL_MIN * l.lanes}px, 1fr)`).join(' ')}`;
  const minWidth = TIME_COL + layouts.reduce((sum, l) => sum + COL_MIN * l.lanes, 0);

  const today = todayDayId();
  const nowMin = nowMinutesUtc();
  const showNow = nowMin >= startMinutes && nowMin < endMinutes;

  const onColClick = (e, jour) => {
    if (!onEmptyClick || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onEmptyClick({ jour, minutes: minuteAt(e.clientY - rect.top) });
  };

  // Fond quadrillé suivant les hauteurs réelles des lignes
  const lines = offsets.slice(1).map((y) => `linear-gradient(to bottom, transparent ${y - 1}px, var(--border) ${y - 1}px, var(--border) ${y}px, transparent ${y}px)`).join(',');

  return (
    <div className="sched-wrap">
      <div className="sched" style={{ '--cols': days.length, minWidth }}>
        <div className="sched-head" style={{ gridTemplateColumns: template }}>
          <div className="sched-corner" />
          {days.map((d) => <div key={d.id} className={`sched-dayhead ${d.id === today ? 'today' : ''}`}>{d.label}</div>)}
        </div>

        <div className="sched-body" style={{ gridTemplateColumns: template }}>
          <div className="sched-times">
            {times.map((t, i) => <div key={t} className={t % 60 === 0 ? 'hour' : 'half'} style={{ height: rowH[i] }}>{toLabel(t)}</div>)}
          </div>

          {layouts.map(({ day: d, items }) => (
            <div
              key={d.id} className="sched-col" role="presentation" onClick={(e) => onColClick(e, d.id)}
              style={{ height: total, backgroundImage: lines }}
            >
              {showNow && d.id === today && <span className="sched-now" style={{ top: yOf(nowMin) }} aria-hidden="true" />}

              {items.map(({ slot, start, end, lane, lanes }) => {
                const ens = slot.enseignement;
                const prof = `${ens.professeur.prenom} ${ens.professeur.nom}`;
                const top = yOf(start);
                return (
                  <button
                    key={slot.id} type="button" className="sched-ev lg"
                    title={`${ens.module.code} - ${ens.module.nom}\n${slot.heureDebut} - ${slot.heureFin}\n${prof}\n${PUBLIC_TYPES[ens.publicType]} : ${ens.publicLabel}${slot.salle ? `\nSalle : ${slot.salle}` : ''}`}
                    style={{
                      top,
                      height: yOf(end) - top - 2,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                      background: moduleColor(ens.module.id),
                    }}
                    onClick={(e) => { e.stopPropagation(); onSlotClick?.(slot); }}
                  >
                    <strong className="ev-title">{ens.module.code} · {ens.module.nom}</strong>
                    <span className="ev-line ev-time">{slot.heureDebut} - {slot.heureFin}</span>
                    <span className="ev-line">{prof}</span>
                    <span className="ev-line">{PUBLIC_TYPES[ens.publicType]} : {ens.publicLabel}</span>
                    <span className="ev-line">Salle : {slot.salle || 'non définie'}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}