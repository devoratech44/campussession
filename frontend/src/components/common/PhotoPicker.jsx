// frontend/src/components/common/PhotoPicker.jsx
import { useEffect, useMemo, useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import env from '../../config/env';
import { photoUrl } from '../../utils/format';

const ACCEPT = ['image/jpeg', 'image/png'];

export default function PhotoPicker({ currentName, file, removed, onPick, onRemove, onError }) {
  const inputRef = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const hasCustom = Boolean(file) || (!removed && currentName && currentName !== env.defaultPhoto);
  const src = preview || photoUrl(removed || !currentName ? env.defaultPhoto : currentName);

  const onChange = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!ACCEPT.includes(picked.type)) return onError?.('Photo : formats JPEG ou PNG uniquement.');
    if (picked.size > env.maxPhotoMb * 1024 * 1024) return onError?.(`La photo ne doit pas dépasser ${env.maxPhotoMb} Mo.`);
    onError?.('');
    return onPick(picked);
  };

  return (
    <div className="photo-picker">
      <img className="avatar avatar-lg" src={src} alt="Photo de profil" />
      <div className="col">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={onChange} hidden />
        <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}><Camera size={18} /> Choisir une photo</button>
        {hasCustom && <button type="button" className="btn btn-ghost" onClick={onRemove}><Trash2 size={18} /> Photo par défaut</button>}
        <small className="hint">JPEG ou PNG, {env.maxPhotoMb} Mo maximum.</small>
      </div>
    </div>
  );
}