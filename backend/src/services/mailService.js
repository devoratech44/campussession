// backend/src/services/mailService.js
const nodemailer = require('nodemailer');
const env = require('../config/env');
const cfg = require('../config/appConfig');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const transporter = nodemailer.createTransport({
  host: env.mail.host,
  port: env.mail.port,
  secure: env.mail.port === 465,
  auth: { user: env.mail.user, pass: env.mail.pass },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

const SEND_TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS) || 10000;
const USE_BREVO = (process.env.MAIL_PROVIDER || '').toLowerCase() === 'brevo' && Boolean(process.env.BREVO_API_KEY);

// « Nom <adresse> » -> { name, email }
function parseFrom(from) {
  const m = String(from || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || cfg.appName, email: m[2].trim() } : { name: cfg.appName, email: String(from || env.mail.user).trim() };
}

// Envoi unique : API Brevo (HTTPS, port 443) ou SMTP, avec délai maximal
async function sendMail({ to, subject, text, html }) {
  const run = async () => {
    if (USE_BREVO) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: parseFrom(env.mail.from), to: [{ email: to }], subject, textContent: text, htmlContent: html }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Brevo ${res.status} ${(await res.text()).slice(0, 200)}`);
      return;
    }
    await transporter.sendMail({ from: env.mail.from, to, subject, text, html });
  };
  await Promise.race([
    run(),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`délai de ${SEND_TIMEOUT_MS / 1000} s dépassé`)), SEND_TIMEOUT_MS + 1000)),
  ]);
}

async function sendVerificationCode(user, code) {
  const minutes = cfg.verification.validityMinutes;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #d7e5dd;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#16a34a,#2563eb);padding:20px;color:#fff;text-align:center">
      <h2 style="margin:0">${cfg.appName}</h2>
      <p style="margin:4px 0 0">Suivre – apprendre – progresser</p>
    </div>
    <div style="padding:24px;color:#0c1b14">
      <p>Bonjour ${user.prenom},</p>
      <p>Voici votre code de vérification :</p>
      <p style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;margin:20px 0;color:#15803d">${code}</p>
      <p>Il est valable <strong>${minutes} minutes</strong>. Ne le communiquez à personne.</p>
    </div>
  </div>`;

  try {
    await sendMail({
      to: user.email,
      subject: `${code} est votre code ${cfg.appName}`,
      text: `Bonjour ${user.prenom}, votre code de vérification ${cfg.appName} est : ${code} (valable ${minutes} minutes).`,
      html,
    });
    logger.success('MAIL', `Code de vérification envoyé à ${user.email}`);
  } catch (err) {
    logger.error('MAIL', `Échec d'envoi à ${user.email} : ${err.message}`);
    throw new ApiError(502, "Impossible d'envoyer le code par email. Réessayez ou contactez l'administrateur.");
  }
}

// ---------- Mails de présence ----------
const PUBLIC_LABEL = { classe: 'Classe', filiere: 'Filière', groupe: 'Groupe', etudiant: 'Cours individuel' };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

async function deliver({ to, subject, text, html }) {
  try {
    await sendMail({ to, subject, text, html });
    logger.success('MAIL', `Envoyé à ${to} : ${subject}`);
    return true;
  } catch (err) {
    logger.error('MAIL', `Échec d'envoi à ${to} : ${err.message}`);
    return false;
  }
}

function compose({ heading, intro, rows = [], outro, cta }) {
  const table = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:14px 0">${rows
      .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#51655a;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 10px;font-weight:600">${esc(v)}</td></tr>`)
      .join('')}</table>`
    : '';
  const button = cta
    ? `<p style="text-align:center;margin:20px 0"><a href="${esc(cta.url)}" style="background:#15803d;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">${esc(cta.label)}</a></p>`
    : '';
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #d7e5dd;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#16a34a,#2563eb);padding:18px;color:#fff;text-align:center">
      <h2 style="margin:0">${esc(cfg.appName)}</h2><p style="margin:4px 0 0">${esc(heading)}</p>
    </div>
    <div style="padding:22px;color:#0c1b14">
      <p>${esc(intro)}</p>${table}${outro ? `<p>${esc(outro)}</p>` : ''}${button}
    </div>
  </div>`;
  const text = [intro, ...rows.map(([k, v]) => `${k} : ${v}`), outro, cta ? `${cta.label} : ${cta.url}` : ''].filter(Boolean).join('\n');
  return { html, text };
}

const courseRows = (i) => [
  ['Date', longDate(i.date)],
  ['Horaire', `${i.heureDebut} - ${i.heureFin}`],
  ['Module', `${i.moduleCode} - ${i.moduleNom}`],
  ['Professeur', i.professeur],
  ['Salle', i.salle || 'Non définie'],
];

function sendProfessorReminder(i) {
  const { html, text } = compose({
    heading: 'Rappel de cours',
    intro: `Bonjour ${i.profPrenom}, vous avez cours dans 30 minutes.`,
    rows: [
      ...courseRows(i).filter(([k]) => k !== 'Professeur'),
      ['Public', `${PUBLIC_LABEL[i.publicType]} : ${i.publicLabel}`],
      ['Filière(s) concernée(s)', i.filieres.length ? i.filieres.join(', ') : 'Non précisée'],
      ['Effectif', `${i.nbEtudiants} étudiant(s)`],
    ],
    outro: `La session s'ouvrira automatiquement à ${i.ouvertureA}. Signez sur la page de session pour afficher le QR code et le code de présence.`,
    cta: { label: 'Ouvrir la session', url: `${cfg.sessions.publicUrl}/professeur/presences/${i.seanceId}` },
  });
  return deliver({ to: i.profEmail, subject: `Rappel : ${i.moduleNom} à ${i.heureDebut} (salle ${i.salle || '?'})`, text, html });
}

function sendStudentLateNotice(student, i) {
  const { html, text } = compose({
    heading: 'Pointage de présence',
    intro: `Bonjour ${student.prenom}, le cours a commencé et votre présence n'est pas encore enregistrée.`,
    rows: courseRows(i),
    outro: 'Si vous êtes présent, pointez maintenant (QR code ou code) : vous serez noté en retard. Sans pointage avant la fin du cours, vous serez marqué absent.',
    cta: { label: 'Pointer ma présence', url: `${cfg.sessions.publicUrl}/etudiant/pointage` },
  });
  return deliver({ to: student.email, subject: `Cours de ${i.moduleNom} : pointez votre présence`, text, html });
}

function sendStudentAbsenceCheck(student, i) {
  const { html, text } = compose({
    heading: 'Êtes-vous absent ?',
    intro: `Bonjour ${student.prenom}, êtes-vous absent au cours de ${i.moduleNom} avec ${i.professeur} ?`,
    rows: courseRows(i),
    outro: `Le cours se termine à ${i.heureFin}. Si vous êtes en salle, pointez avant la fin. Sinon vous serez enregistré absent.`,
    cta: { label: 'Pointer ma présence', url: `${cfg.sessions.publicUrl}/etudiant/pointage` },
  });
  return deliver({ to: student.email, subject: `Êtes-vous absent au cours de ${i.moduleNom} ?`, text, html });
}

module.exports = { sendVerificationCode, sendProfessorReminder, sendStudentLateNotice, sendStudentAbsenceCheck };