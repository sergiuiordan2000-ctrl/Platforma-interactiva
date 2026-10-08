-- Turnu Măgurele Civic (Urbis Activ) — migrația 0002: încercările de autentificare cu Google.
-- Design: docs/faza5/AMENDAMENT_AUTENTIFICARE_GOOGLE_PLAN.md §8 D, §9.1, §11.3: adăugare explicită la B1,
-- decizia proprietarului din 08.10.2026. Folosirea unică a `state`, verificată pe server și atomic.
-- Numai date generate de aplicație, temporare (10 minute + curățare prin purge:retention): fără date Google
-- (fără e-mail, fără `sub`, fără jetoane). Compatibilă MySQL 8.0 / 8.4 și MariaDB 11.4.
-- NU se modifică după publicare.

CREATE TABLE `citizen_oauth_attempts` (
	`id` char(64) NOT NULL,
	`nonce` varchar(64) NOT NULL,
	`code_verifier` varchar(128) NOT NULL,
	`policy_version` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	CONSTRAINT `citizen_oauth_attempts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE INDEX `idx_citizen_oauth_attempts_expires` ON `citizen_oauth_attempts` (`expires_at`);
