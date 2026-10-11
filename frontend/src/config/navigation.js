// frontend/src/config/navigation.js
import {
  LayoutDashboard, Users, School, UsersRound, BookOpen, CalendarDays, ClipboardCheck,
  NotebookPen, FolderOpen, Bell, MessageSquare, TrendingUp, Settings, ScanLine, Star, BookMarked,
} from 'lucide-react';

export const PROF_NAV = [
  { to: '/professeur', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/professeur/emploi-du-temps', label: 'Emploi du temps', icon: CalendarDays },
  { to: '/professeur/presences', label: 'Séances et présences', icon: ClipboardCheck, badge: 'pointage' },
  { to: '/professeur/cours', label: 'Mes cours et étudiants', icon: BookOpen },
  { to: '/professeur/evaluations', label: 'Devoirs, examens et notes', icon: NotebookPen, badge: 'devoirs' },
  { to: '/professeur/moyennes', label: 'Moyennes', icon: TrendingUp },
  { to: '/professeur/documents', label: 'Documents', icon: FolderOpen },
  { to: '/professeur/avis', label: 'Avis des étudiants', icon: Star },
  { to: '/professeur/messagerie', label: 'Messagerie', icon: MessageSquare, badge: 'messages' },
  { to: '/professeur/parametres', label: 'Paramètres', icon: Settings },
];

export const ETUDIANT_NAV = [
  { to: '/etudiant', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/etudiant/emploi-du-temps', label: 'Emploi du temps', icon: CalendarDays },
  { to: '/etudiant/pointage', label: 'Pointer ma présence', icon: ScanLine, badge: 'pointage' },
  { to: '/etudiant/presences', label: 'Mes présences', icon: ClipboardCheck },
  { to: '/etudiant/contenu', label: 'Contenu des cours', icon: BookMarked },
  { to: '/etudiant/devoirs', label: 'Devoirs', icon: NotebookPen, badge: 'devoirs' },
  { to: '/etudiant/notes', label: 'Mes notes', icon: TrendingUp },
  { to: '/etudiant/documents', label: 'Documents', icon: FolderOpen },
  { to: '/etudiant/avis', label: 'Avis sur mes cours', icon: Star },
  { to: '/etudiant/messagerie', label: 'Messagerie', icon: MessageSquare, badge: 'messages' },
  { to: '/etudiant/parametres', label: 'Paramètres', icon: Settings },
];

// soon: true = page pas encore développée (affiche « Bientôt »)
export const ADMIN_NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/admin/classes', label: 'Classes et filières', icon: School },
  { to: '/admin/groupes', label: 'Groupes', icon: UsersRound },
  { to: '/admin/modules', label: 'Modules', icon: BookOpen },
  { to: '/admin/emploi-du-temps', label: 'Emploi du temps', icon: CalendarDays },
  { to: '/admin/presences', label: 'Présences', icon: ClipboardCheck },
  { to: '/admin/evaluations', label: 'Devoirs, examens et notes', icon: NotebookPen },
  { to: '/admin/documents', label: 'Documents', icon: FolderOpen },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/messagerie', label: 'Messagerie', icon: MessageSquare, badge: 'messages' },
  { to: '/admin/rapports', label: 'Rapports', icon: TrendingUp },
  { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
];