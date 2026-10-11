// frontend/src/components/common/StudentPicker.jsx
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../api/axios';
import env from '../../config/env';

// value : { id, label } ou null
export default function StudentPicker({ id, value, onChange, placeholder = 'Rechercher un étudiant…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      api.get('/enseignements/etudiants', { params: { search: query.trim() || undefined } })
        .then((res) => setResults(res.data.data))
        .catch(() => setResults([]));
    }, env.searchDebounceMs);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (value) {
    return (
      <div className="picked">
        <span>{value.label}</span>
        <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Retirer l'étudiant"><X size={18} /></button>
      </div>
    );
  }

  const pick = (s) => {
    onChange({ id: s.id, label: `${s.prenom} ${s.nom} (${s.matricule})` });
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="picker">
      <div className="input-icon">
        <Search size={18} className="lead" />
        <input
          id={id} type="search" value={query} placeholder={placeholder} autoComplete="off"
          onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        />
      </div>
      {open && (
        <ul className="picker-list">
          {results.length === 0 && <li className="muted">Aucun étudiant trouvé.</li>}
          {results.map((s) => (
            <li key={s.id} onMouseDown={(e) => { e.preventDefault(); pick(s); }}>
              <strong>{s.prenom} {s.nom}</strong>
              <small>{s.matricule}{s.classe ? ` · ${s.classe.nom}` : ''}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}