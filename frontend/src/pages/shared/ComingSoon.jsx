// frontend/src/pages/shared/ComingSoon.jsx
import { Hammer } from 'lucide-react';

export default function ComingSoon({ title, icon: Icon = Hammer }) {
  return (
    <section className="card rise soon-box">
      <span className="ico"><Icon size={36} /></span>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p className="muted" style={{ margin: 0, maxWidth: '46ch' }}>
        Cette rubrique est prévue au cahier des charges et sera développée dans un prochain lot.
      </p>
    </section>
  );
}