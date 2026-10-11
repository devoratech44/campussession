// frontend/src/components/common/PasswordStrength.jsx
import { evaluatePassword } from '../../utils/password';

export default function PasswordStrength({ value, rules }) {
  if (!value) return null;
  const { score, label, color } = evaluatePassword(value, rules);
  return (
    <div aria-live="polite">
      <div className="strength"><span style={{ width: `${(score / 4) * 100}%`, background: color }} /></div>
      <small className="muted">Robustesse : <strong style={{ color }}>{label}</strong></small>
    </div>
  );
}