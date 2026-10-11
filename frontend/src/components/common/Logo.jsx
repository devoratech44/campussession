// frontend/src/components/common/Logo.jsx
export default function Logo({ size = 44 }) {
  return <img src="/logo.png" alt="Logo Campus Session" width={size} height={size} style={{ objectFit: 'contain', borderRadius: '22%', background: '#fff', padding: 4, boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }} />;
}