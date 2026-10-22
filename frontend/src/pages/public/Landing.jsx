// frontend/src/pages/public/Landing.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CalendarDays, Clock, ScanLine, PenLine, Target, TrendingUp, Eye, FolderOpen, MessageSquare, Star, UsersRound,
  Menu, X, FileText, Download, ArrowRight,
} from 'lucide-react';
import landing from '../../config/landing';
import { useAuth } from '../../contexts/AuthContext';
import { homeForRole } from '../../utils/roles';
import Logo from '../../components/common/Logo';
import ContactModal from '../../components/landing/ContactModal';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import '../../styles/landing.css';

const ICONS = {
  book: BookOpen, calendar: CalendarDays, clock: Clock, scan: ScanLine, pen: PenLine, target: Target,
  chart: TrendingUp, eye: Eye, folder: FolderOpen, message: MessageSquare, star: Star, users: UsersRound,
};
const NAME = import.meta.env.VITE_APP_NAME || 'CampusSession';

function useDocAvailable(path) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let alive = true;
    // Avec la règle SPA, un fichier absent renvoie index.html : on vérifie le type
    fetch(path, { method: 'HEAD' })
      .then((r) => { if (alive) setOk(r.ok && !(r.headers.get('content-type') || '').includes('text/html')); })
      .catch(() => { if (alive) setOk(false); });
    return () => { alive = false; };
  }, [path]);
  return ok;
}

function DocCard({ doc }) {
  const ok = useDocAvailable(doc.path);
  return (
    <div className="lp-doc">
      <FileText size={34} aria-hidden="true" />
      <h3>{doc.label}</h3>
      {ok === false
        ? <span className="lp-btn lp-btn--disabled" aria-disabled="true">Bientôt disponible</span>
        : <a className="lp-btn lp-btn--primary" href={doc.path} download><Download size={18} /> Télécharger</a>}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const [contact, setContact] = useState(false);
  const loginTo = user ? homeForRole(user.role) : '/connexion';
  const loginLabel = user ? 'Mon espace' : 'Connexion';

  useEffect(() => {
    const prev = document.title;
    document.title = `${NAME} – Suivre, apprendre, progresser`;
    document.documentElement.lang = 'fr';
    const set = (sel, attr, val, create) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement('meta'); create(el); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    const desc = 'CampusSession : plateforme web pour suivre les cours, les emplois du temps, la présence et le travail à faire.';
    set('meta[name="description"]', 'content', desc, (el) => el.setAttribute('name', 'description'));
    set('meta[property="og:title"]', 'content', document.title, (el) => el.setAttribute('property', 'og:title'));
    set('meta[property="og:description"]', 'content', desc, (el) => el.setAttribute('property', 'og:description'));
    set('meta[property="og:type"]', 'content', 'website', (el) => el.setAttribute('property', 'og:type'));
    return () => { document.title = prev; };
  }, []);

  const openContact = () => { setMenu(false); setContact(true); };

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-container lp-header__in">
          <a href="#accueil" className="lp-brand" aria-label={`${NAME}, accueil`}><Logo size={40} /><span>{NAME}</span></a>
          <nav className={`lp-nav ${menu ? 'open' : ''}`} aria-label="Navigation principale">
            {landing.nav.map((l) => <a key={l.href} href={l.href} onClick={() => setMenu(false)}>{l.label}</a>)}
            <Link className="lp-btn lp-btn--primary lp-nav__login" to={loginTo}>{loginLabel}</Link>
          </nav>
          <Link className="lp-btn lp-btn--primary lp-header__login" to={loginTo}>{loginLabel}</Link>
          <button type="button" className="lp-burger" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">{menu ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </header>

      <main id="accueil">
        <section className="lp-hero">
          <div className="lp-container lp-hero__in">
            <div>
              <span className="lp-eyebrow">Bienvenue sur votre campus numérique</span>
              <h1>La plateforme pour suivre vos cours, votre présence et votre travail</h1>
              <p className="lp-lead">{NAME} regroupe en un seul endroit les emplois du temps, le suivi des présences, les devoirs à rendre et les notes, pour les étudiants, les professeurs et l&apos;administration.</p>
              <div className="lp-cta">
                <Link className="lp-btn lp-btn--primary" to={loginTo}>{loginLabel}</Link>
                <button type="button" className="lp-btn lp-btn--outline" onClick={openContact}>Contacter l&apos;administrateur</button>
              </div>
            </div>
            <div className="lp-mock" aria-hidden="true">
              <div className="lp-mock__bar"><i /><i /><i /></div>
              <div className="lp-mock__body">
                <div className="lp-mock__kpis"><b>92 %</b><b>2</b><b>14,5</b></div>
                <div className="lp-mock__gauge"><span style={{ width: '40%' }} /></div>
                <div className="lp-mock__gauge"><span style={{ width: '20%' }} /></div>
                <div className="lp-mock__row"><em /><em /></div>
                <div className="lp-mock__row"><em /><em /></div>
                <div className="lp-mock__row"><em /><em /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-welcome">
          <div className="lp-container lp-welcome__in">
            <h2>Étudiants, bienvenue !</h2>
            <p>Ici, tout votre parcours est au même endroit : où et quand ont lieu vos cours, où vous en êtes de vos présences, quels travaux rendre et quelles notes vous avez obtenues. Un seul compte, simple à utiliser, sur ordinateur comme sur téléphone.</p>
          </div>
        </section>

        <section id="fonctionnalites" className="lp-section">
          <div className="lp-container">
            <h2>Ce que fait {NAME}</h2>
            <div className="lp-grid">
              {landing.features.map((f) => {
                const Icon = ICONS[f.icon] || BookOpen;
                return (
                  <article className="lp-card" key={f.title}>
                    <span className="lp-card__ico"><Icon size={22} aria-hidden="true" /></span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section--alt">
          <div className="lp-container">
            <h2>Pour qui ?</h2>
            <div className="lp-grid lp-grid--3">
              {landing.profiles.map((p) => (
                <article className="lp-card" key={p.title}>
                  <h3>{p.title}</h3>
                  <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="compte" className="lp-section">
          <div className="lp-container">
            <h2>Comment obtenir un compte</h2>
            <p className="lp-intro">Les comptes sont créés par l&apos;administration après validation de la demande.</p>
            <ol className="lp-steps">{landing.steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}</ol>
            <div className="lp-cta">
              <button type="button" className="lp-btn lp-btn--primary" onClick={openContact}>Contacter l&apos;administrateur</button>
              <Link className="lp-btn lp-btn--outline" to={loginTo}>{loginLabel} <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>

        <section id="documents" className="lp-section lp-section--alt">
          <div className="lp-container">
            <h2>Documents d&apos;inscription</h2>
            <p className="lp-intro">Téléchargez l&apos;un des deux documents ci-dessous (même contenu, deux présentations au choix).</p>
            <div className="lp-grid lp-grid--2">{landing.documents.map((d) => <DocCard key={d.path} doc={d} />)}</div>
          </div>
        </section>
      </main>

            <footer id="contact" className="lp-footer">
        <div className="lp-container lp-footer__grid">
          <div>
            <div className="lp-brand"><Logo size={40} /><span>{NAME}</span></div>
            <p className="lp-footer__motto">Suivre – apprendre – progresser</p>
            <p>Une plateforme pensée pour accompagner chaque étudiant, au quotidien.</p>
          </div>
          <div>
            <h3>Navigation</h3>
            <ul>{landing.nav.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
          </div>
          <div>
            <h3>Accès</h3>
            <ul>
              <li><Link to={loginTo}>{loginLabel}</Link></li>
              <li><button type="button" onClick={openContact}>Contacter l&apos;administrateur</button></li>
            </ul>
          </div>
        </div>
        <div className="lp-container lp-footer__bottom">
          <p>Plateforme utilisée dans le cadre du programme d&apos;accompagnement porté par <a href={landing.devoratechUrl} target="_blank" rel="noopener noreferrer">DevoraTech</a></p>
          <p>{import.meta.env.VITE_COPYRIGHT || `© 2026 ${NAME}`}</p>
        </div>
      </footer>

      {contact && <ContactModal onClose={() => setContact(false)} />}
    </div>
  );
}