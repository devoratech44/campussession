-- backend/database/campussession.sql
-- Campus Session - Schéma complet v2.1 - base : pim_campussession
-- © 2026 CampusSession - @PIM

CREATE DATABASE IF NOT EXISTS `pim_campussession`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pim_campussession`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. STRUCTURE ACADÉMIQUE
-- =========================================================

CREATE TABLE IF NOT EXISTS `filieres` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(100) NOT NULL,
  `niveau` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_filieres_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(100) NOT NULL,
  `salle` VARCHAR(100) NULL,
  `annee_academique` VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_classes_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `classe_filiere` (
  `classe_id` INT UNSIGNED NOT NULL,
  `filiere_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`classe_id`, `filiere_id`),
  CONSTRAINT `fk_cf_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cf_filiere` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 2. UTILISATEURS (admin, professeur, étudiant)
-- =========================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role` ENUM('admin','professeur','etudiant') NOT NULL,
  `matricule` VARCHAR(50) NULL,
  `prenom` VARCHAR(100) NOT NULL,
  `nom` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `telephone` VARCHAR(30) NULL,
  `mot_de_passe` VARCHAR(100) NOT NULL,
  `photo` VARCHAR(255) NOT NULL DEFAULT 'default.png',
  `date_naissance` DATE NULL,
  `lieu_naissance` VARCHAR(150) NULL,
  `adresse` VARCHAR(255) NULL,
  `genre` ENUM('Homme','Femme','Autre') NULL,
  -- Étudiant
  `niveau` VARCHAR(50) NULL,
  `filiere_id` INT UNSIGNED NULL,
  `classe_id` INT UNSIGNED NULL,
  `etat_academique` ENUM('Nouveau','Réinscrit','Redoublant') NULL,
  -- Professeur
  `specialite` VARCHAR(150) NULL,
  `statut` ENUM('Disponible','Congé') NULL,
  -- Code de vérification à 6 chiffres
  `est_verifie` TINYINT(1) NOT NULL DEFAULT 0,
  `code_hash` VARCHAR(100) NULL,
  `code_expires_at` DATETIME NULL,
  `code_attempts` INT NOT NULL DEFAULT 0,
  `code_sent_at` DATETIME NULL,
  -- Blocage
  `est_bloque` TINYINT(1) NOT NULL DEFAULT 0,
  `motif_blocage` VARCHAR(255) NULL,
  `blocage_auto` TINYINT(1) NOT NULL DEFAULT 0,
  -- En ligne
  `last_seen_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_matricule` (`matricule`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_classe` (`classe_id`),
  KEY `idx_users_filiere` (`filiere_id`),
  CONSTRAINT `fk_users_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_filiere` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 3. GROUPES
-- =========================================================

CREATE TABLE IF NOT EXISTS `groupes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `classe_id` INT UNSIGNED NOT NULL,
  `filiere_id` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_groupes_classe` (`classe_id`),
  CONSTRAINT `fk_groupes_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_groupes_filiere` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `groupe_etudiants` (
  `groupe_id` INT UNSIGNED NOT NULL,
  `etudiant_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`groupe_id`, `etudiant_id`),
  CONSTRAINT `fk_ge_groupe` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ge_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 4. MODULES ET ENSEIGNEMENTS (assignations)
-- =========================================================

CREATE TABLE IF NOT EXISTS `modules` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `nom` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `coefficient` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  `volume_horaire` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_modules_code` (`code`),
  CONSTRAINT `ck_modules_coef` CHECK (`coefficient` >= 0 AND `coefficient` <= 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enseignement = module + professeur + public (classe | filière | groupe | étudiant) + année
-- L'unicité d'une assignation est contrôlée par le contrôleur (colonnes de public nullables).
CREATE TABLE IF NOT EXISTS `enseignements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module_id` INT UNSIGNED NOT NULL,
  `professeur_id` INT UNSIGNED NOT NULL,
  `public_type` ENUM('classe','filiere','groupe','etudiant') NOT NULL,
  `classe_id` INT UNSIGNED NULL,
  `filiere_id` INT UNSIGNED NULL,
  `groupe_id` INT UNSIGNED NULL,
  `etudiant_id` INT UNSIGNED NULL,
  `annee_academique` VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ens_module` (`module_id`),
  KEY `idx_ens_prof` (`professeur_id`),
  KEY `idx_ens_public` (`public_type`, `classe_id`, `filiere_id`, `groupe_id`, `etudiant_id`),
  CONSTRAINT `fk_ens_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ens_prof` FOREIGN KEY (`professeur_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ens_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ens_filiere` FOREIGN KEY (`filiere_id`) REFERENCES `filieres` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ens_groupe` FOREIGN KEY (`groupe_id`) REFERENCES `groupes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ens_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 5. EMPLOI DU TEMPS
-- jour : 1 = lundi ... 7 = dimanche
-- Un créneau finissant à minuit est stocké avec heure_fin = '24:00:00' (valide en MySQL TIME)
-- =========================================================

CREATE TABLE IF NOT EXISTS `emplois_du_temps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enseignement_id` INT UNSIGNED NOT NULL,
  `jour` TINYINT UNSIGNED NOT NULL,
  `heure_debut` TIME NOT NULL,
  `heure_fin` TIME NOT NULL,
  `salle` VARCHAR(100) NULL,
  `date_debut` DATE NULL,
  `date_fin` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_edt_ens` (`enseignement_id`),
  KEY `idx_edt_jour` (`jour`, `heure_debut`),
  CONSTRAINT `fk_edt_ens` FOREIGN KEY (`enseignement_id`) REFERENCES `enseignements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_edt_jour` CHECK (`jour` BETWEEN 1 AND 7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 6. SÉANCES ET PRÉSENCES
-- =========================================================

CREATE TABLE IF NOT EXISTS `seances` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enseignement_id` INT UNSIGNED NOT NULL,
  `date_seance` DATE NOT NULL,
  `heure_debut` TIME NULL,
  `heure_fin` TIME NULL,
  `points_abordes` TEXT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seances_ens_date` (`enseignement_id`, `date_seance`),
  CONSTRAINT `fk_seances_ens` FOREIGN KEY (`enseignement_id`) REFERENCES `enseignements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_seances_createur` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `presences` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `seance_id` INT UNSIGNED NOT NULL,
  `etudiant_id` INT UNSIGNED NOT NULL,
  `statut` ENUM('present','retard','absent') NOT NULL DEFAULT 'present',
  `minutes_retard` INT NOT NULL DEFAULT 0,
  `justifie` TINYINT(1) NOT NULL DEFAULT 0,
  `motif_justification` VARCHAR(255) NULL,
  `remarque` VARCHAR(255) NULL,
  `saisi_par` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_presence_seance_etudiant` (`seance_id`, `etudiant_id`),
  KEY `idx_presences_etudiant` (`etudiant_id`, `statut`, `justifie`),
  CONSTRAINT `fk_pres_seance` FOREIGN KEY (`seance_id`) REFERENCES `seances` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pres_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pres_saisi` FOREIGN KEY (`saisi_par`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 7. DEVOIRS, EXAMENS, TP, RENDUS, NOTES
-- =========================================================

CREATE TABLE IF NOT EXISTS `travaux` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enseignement_id` INT UNSIGNED NOT NULL,
  `type` ENUM('devoir','examen','tp') NOT NULL,
  `numero_tp` TINYINT UNSIGNED NULL,
  `titre` VARCHAR(200) NOT NULL,
  `consignes` TEXT NULL,
  `fichier` VARCHAR(255) NULL,
  `nom_original` VARCHAR(255) NULL,
  `date_travail` DATE NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_travaux_tp` (`enseignement_id`, `type`, `numero_tp`),
  KEY `idx_travaux_date` (`date_travail`),
  CONSTRAINT `fk_travaux_ens` FOREIGN KEY (`enseignement_id`) REFERENCES `enseignements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_travaux_createur` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_travaux_tp` CHECK (`numero_tp` IS NULL OR `numero_tp` BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rendus` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `travail_id` INT UNSIGNED NOT NULL,
  `etudiant_id` INT UNSIGNED NOT NULL,
  `fichier` VARCHAR(255) NULL,
  `nom_original` VARCHAR(255) NULL,
  `commentaire` TEXT NULL,
  `en_retard` TINYINT(1) NOT NULL DEFAULT 0,
  `date_rendu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rendu_travail_etudiant` (`travail_id`, `etudiant_id`),
  CONSTRAINT `fk_rendus_travail` FOREIGN KEY (`travail_id`) REFERENCES `travaux` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rendus_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `travail_id` INT UNSIGNED NOT NULL,
  `etudiant_id` INT UNSIGNED NOT NULL,
  `valeur` DECIMAL(4,2) NOT NULL,
  `commentaire` TEXT NULL,
  `saisi_par` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_note_travail_etudiant` (`travail_id`, `etudiant_id`),
  KEY `idx_notes_etudiant` (`etudiant_id`),
  CONSTRAINT `fk_notes_travail` FOREIGN KEY (`travail_id`) REFERENCES `travaux` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notes_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notes_saisi` FOREIGN KEY (`saisi_par`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ck_notes_valeur` CHECK (`valeur` >= 0 AND `valeur` <= 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 8. DOCUMENTS ET AVIS
-- =========================================================

CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titre` VARCHAR(200) NOT NULL,
  `description` VARCHAR(255) NULL,
  `type` ENUM('cours','ressource','video','autre') NOT NULL DEFAULT 'cours',
  `fichier` VARCHAR(255) NULL,
  `nom_original` VARCHAR(255) NULL,
  `taille` BIGINT UNSIGNED NULL,
  `lien` VARCHAR(500) NULL,
  `module_id` INT UNSIGNED NULL,
  `classe_id` INT UNSIGNED NULL,
  `uploader_id` INT UNSIGNED NULL,
  `est_archive` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documents_filtres` (`module_id`, `classe_id`, `est_archive`),
  CONSTRAINT `fk_docs_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_docs_classe` FOREIGN KEY (`classe_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_docs_uploader` FOREIGN KEY (`uploader_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `avis_cours` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enseignement_id` INT UNSIGNED NOT NULL,
  `etudiant_id` INT UNSIGNED NOT NULL,
  `appreciation` TINYINT UNSIGNED NOT NULL,
  `commentaire` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_avis_ens_etudiant` (`enseignement_id`, `etudiant_id`),
  CONSTRAINT `fk_avis_ens` FOREIGN KEY (`enseignement_id`) REFERENCES `enseignements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_avis_etudiant` FOREIGN KEY (`etudiant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_avis_appreciation` CHECK (`appreciation` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 9. MESSAGERIE
-- =========================================================

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('prive','groupe') NOT NULL DEFAULT 'prive',
  `titre` VARCHAR(150) NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_conv_createur` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversation_participants` (
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `last_read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversation_id`, `user_id`),
  KEY `idx_cp_user` (`user_id`),
  CONSTRAINT `fk_cp_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `sender_id` INT UNSIGNED NULL,
  `contenu` VARCHAR(2000) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conv` (`conversation_id`, `created_at`),
  CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 10. NOTIFICATIONS CIBLÉES
-- =========================================================

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `titre` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('information','devoir','examen','notes','presences','emploi_du_temps','systeme') NOT NULL DEFAULT 'information',
  `cible_type` ENUM('tous','classe','filiere','groupe','utilisateur') NOT NULL DEFAULT 'tous',
  `cible_id` INT UNSIGNED NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notif_createur` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_user` (
  `notification_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `est_lue` TINYINT(1) NOT NULL DEFAULT 0,
  `lue_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`, `user_id`),
  KEY `idx_nu_user` (`user_id`, `est_lue`),
  CONSTRAINT `fk_nu_notif` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_nu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- DONNÉES DE BASE
-- =========================================================

-- Filières (niveau déduit du nom)
INSERT IGNORE INTO `filieres` (`nom`, `niveau`) VALUES
  ('CIITN 1', 'Niveau 1'),
  ('CIITN 2', 'Niveau 2'),
  ('LISD 1',  'Niveau 1'),
  ('LISD 2',  'Niveau 2'),
  ('CIST 1',  'Niveau 1'),
  ('ICC 1',   'Niveau 1');

-- Classes (la salle sera renseignée depuis l'interface admin)
INSERT IGNORE INTO `classes` (`nom`, `annee_academique`) VALUES
  ('CIITN 1', '2026-2027'),
  ('CIITN 2', '2026-2027'),
  ('LISD 1',  '2026-2027'),
  ('LISD 2',  '2026-2027'),
  ('CIST 1',  '2026-2027'),
  ('ICC 1',   '2026-2027');

-- Chaque classe regroupe la filière du même nom
INSERT IGNORE INTO `classe_filiere` (`classe_id`, `filiere_id`)
SELECT c.`id`, f.`id` FROM `classes` c JOIN `filieres` f ON f.`nom` = c.`nom`;

-- Administrateur par défaut : Pape Ibrahima MBAYE (mot de passe = hash bcrypt fourni)
INSERT INTO `users`
  (`role`, `matricule`, `prenom`, `nom`, `email`, `telephone`, `mot_de_passe`, `photo`, `est_verifie`)
VALUES
  ('admin', NULL, 'Pape Ibrahima', 'MBAYE', 'campussession1@gmail.com', '+221 76 386 23 67',
   '$2b$10$9c8/pTtB6sFEqQpeDLnuzuRHAaSPdlx5M4ZuMnUz5w.Z/pi.apUYi', 'default.png', 1)
ON DUPLICATE KEY UPDATE
  `mot_de_passe` = VALUES(`mot_de_passe`),
  `role` = 'admin',
  `est_verifie` = 1,
  `est_bloque` = 0;

ALTER TABLE `seances`
  ADD COLUMN `creneau_id` INT UNSIGNED NULL AFTER `enseignement_id`,
  ADD COLUMN `salle` VARCHAR(100) NULL AFTER `heure_fin`,
  ADD COLUMN `statut` ENUM('planifiee','ouverte','fermee','annulee') NOT NULL DEFAULT 'planifiee' AFTER `salle`,
  ADD COLUMN `motif_annulation` VARCHAR(255) NULL AFTER `statut`,
  ADD COLUMN `qr_token` VARCHAR(64) NULL AFTER `points_abordes`,
  ADD COLUMN `code_acces` VARCHAR(12) NULL AFTER `qr_token`,
  ADD COLUMN `signature_prof` MEDIUMTEXT NULL AFTER `code_acces`,
  ADD COLUMN `signe_at` DATETIME NULL AFTER `signature_prof`,
  ADD COLUMN `signe_par` INT UNSIGNED NULL AFTER `signe_at`,
  ADD COLUMN `ouverte_at` DATETIME NULL,
  ADD COLUMN `scan_jusqua` DATETIME NULL,
  ADD COLUMN `auto_ferme_at` DATETIME NULL,
  ADD COLUMN `fermee_at` DATETIME NULL,
  ADD COLUMN `modifiee` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `mail_prof_at` DATETIME NULL,
  ADD COLUMN `mail_retard_at` DATETIME NULL,
  ADD COLUMN `mail_absence_at` DATETIME NULL,
  ADD UNIQUE KEY `uq_seances_creneau_date` (`creneau_id`, `date_seance`),
  ADD UNIQUE KEY `uq_seances_qr` (`qr_token`),
  ADD KEY `idx_seances_statut` (`statut`, `date_seance`),
  ADD KEY `idx_seances_code` (`code_acces`),
  ADD CONSTRAINT `fk_seances_creneau` FOREIGN KEY (`creneau_id`) REFERENCES `emplois_du_temps` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_seances_signataire` FOREIGN KEY (`signe_par`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `presences`
  MODIFY COLUMN `statut` ENUM('present','retard','absent') NOT NULL DEFAULT 'absent',
  ADD COLUMN `methode` ENUM('qr','code','prof','admin','auto') NOT NULL DEFAULT 'auto' AFTER `minutes_retard`,
  ADD COLUMN `signature` MEDIUMTEXT NULL AFTER `methode`,
  ADD COLUMN `scanned_at` DATETIME NULL AFTER `signature`;

ALTER TABLE presences
  ADD COLUMN signe_at DATETIME NULL,
  ADD COLUMN pointe_par INT NULL,
  ADD COLUMN ip VARCHAR(64) NULL,
  ADD COLUMN appareil VARCHAR(255) NULL;

  DELETE p FROM presences p JOIN seances s ON s.id = p.seance_id WHERE s.salle = 'Salle test';
DELETE FROM seances WHERE salle = 'Salle test';
DELETE FROM emplois_du_temps WHERE salle = 'Salle test';

SET @debut = SEC_TO_TIME(FLOOR(TIME_TO_SEC(ADDTIME(UTC_TIME(), '00:12:00')) / 60) * 60);

INSERT INTO emplois_du_temps (enseignement_id, jour, heure_debut, heure_fin, salle, date_debut, date_fin)
SELECT e.id, ((DAYOFWEEK(UTC_DATE()) + 5) % 7) + 1, @debut, ADDTIME(@debut, '00:30:00'), 'Salle test', UTC_DATE(), UTC_DATE()
FROM enseignements e
JOIN classes c ON c.id = e.classe_id
WHERE e.public_type = 'classe' AND c.nom = 'CIITN 1'
ORDER BY e.id
LIMIT 1;
ALTER TABLE travaux ADD COLUMN date_limite DATETIME NULL AFTER date_travail;