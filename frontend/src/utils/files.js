// frontend/src/utils/files.js
import api from '../api/axios';

// Télécharge un fichier protégé (le jeton de connexion est ajouté par axios)
export async function downloadFile(url, name = 'fichier') {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
const SIZE_UNITS = ['o', 'Ko', 'Mo', 'Go'];
export function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  let v = Number(bytes);
  let i = 0;
  while (v >= 1024 && i < SIZE_UNITS.length - 1) { v /= 1024; i += 1; }
  return `${(i === 0 ? v : Math.round(v * 10) / 10).toString().replace('.', ',')} ${SIZE_UNITS[i]}`;
}

// Ouvre un fichier protégé dans un nouvel onglet (PDF, images)
export async function openFile(url) {
  const win = window.open('', '_blank');
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    if (win) win.location.href = href;
    else window.location.href = href;
    setTimeout(() => URL.revokeObjectURL(href), 60000);
  } catch (err) {
    win?.close();
    throw err;
  }
}