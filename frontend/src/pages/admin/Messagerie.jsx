// frontend/src/pages/admin/Messagerie.jsx
import { MessageSquare } from 'lucide-react';
import MessagerieView from '../../components/messagerie/MessagerieView';

export default function Messagerie() {
  return (
    <section className="stack rise">
      <div className="page-head">
        <h1 className="page-title"><span className="ico"><MessageSquare size={24} /></span> Messagerie</h1>
      </div>
      <MessagerieView canGroup />
    </section>
  );
}