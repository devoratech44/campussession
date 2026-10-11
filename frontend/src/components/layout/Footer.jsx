// frontend/src/components/layout/Footer.jsx
import env from '../../config/env';
import Clock from '../common/Clock';

export default function Footer() {
  return (
    <footer className="footer">
      <Clock />
      <span>{env.copyright}</span>
      <span>
        Conçu et développé par{' '}
        <a href={env.authorUrl} target="_blank" rel="noopener noreferrer"><strong>{env.authorName}</strong></a>
      </span>
    </footer>
  );
}