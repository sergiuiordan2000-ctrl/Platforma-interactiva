-- Turnu Măgurele Civic — migrația 0001: schema inițială completă (30 de tabele).
-- Design: docs/faza4/FAZA_4_B1_MODEL_DATE.md (înghețat la checkpoint-ul Fazei 4, 28.09.2026).
-- Generată din schema Drizzle (server/src/db/schema/) cu drizzle-kit 0.31.11, apoi revizuită manual:
--   motor InnoDB + utf8mb4_0900_ai_ci pe fiecare tabel; ON DELETE implicit = RESTRICT;
--   nume scurte pentru cheile străine (fk_<tabel>_<coloană>).
-- Compatibilă MySQL 8.0 și 8.4 (B-6). Instrucțiunile sunt separate prin marcajul „statement-breakpoint” al Drizzle.
-- NU se modifică după publicare: orice schimbare de schemă este o migrație nouă, cu decizie explicită.

CREATE TABLE `admin_recovery_codes` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_recovery_codes_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` char(26) NOT NULL,
	`email` varchar(254) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`role` enum('super_admin','primarie_operator') NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`password_hash` varchar(255) NOT NULL,
	`must_change_password` boolean NOT NULL DEFAULT false,
	`failed_login_count` int unsigned NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`totp_secret_enc` varbinary(255),
	`totp_enabled_at` datetime(3),
	`totp_last_step` bigint,
	`created_at` datetime(3) NOT NULL,
	`created_by` char(26),
	`updated_at` datetime(3) NOT NULL,
	`last_login_at` datetime(3),
	`disabled_at` datetime(3),
	`disabled_by` char(26),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_admin_users_email` UNIQUE(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`actor_type` enum('admin','system') NOT NULL,
	`actor_user_id` char(26),
	`action` varchar(64) NOT NULL,
	`target_type` varchar(32),
	`target_id` varchar(64),
	`details` json,
	`ip_hash` char(64),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` char(26),
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `citizen_accounts` (
	`id` char(26) NOT NULL,
	`email` varchar(254) NOT NULL,
	`email_normalized` varchar(254) NOT NULL,
	`status` enum('pending','active') NOT NULL DEFAULT 'pending',
	`policy_version` varchar(32) NOT NULL,
	`policy_accepted_at` datetime(3) NOT NULL,
	`confirmed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`last_login_at` datetime(3),
	`is_demo` boolean NOT NULL DEFAULT false,
	CONSTRAINT `citizen_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_citizen_accounts_email_normalized` UNIQUE(`email_normalized`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `citizen_blocks` (
	`id` char(26) NOT NULL,
	`account_id` char(26),
	`kind` enum('temporary','permanent') NOT NULL,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`created_by` char(26),
	`note` varchar(500),
	`lifted_at` datetime(3),
	`lifted_by` char(26),
	`email_hash` char(64) NOT NULL,
	CONSTRAINT `citizen_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_citizen_blocks_kind_ends` CHECK((`citizen_blocks`.`kind` = 'temporary' AND `citizen_blocks`.`ends_at` IS NOT NULL) OR (`citizen_blocks`.`kind` = 'permanent' AND `citizen_blocks`.`ends_at` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `citizen_login_codes` (
	`id` char(26) NOT NULL,
	`account_id` char(26) NOT NULL,
	`code_hash` char(64) NOT NULL,
	`purpose` enum('confirm','login') NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`attempts` tinyint unsigned NOT NULL DEFAULT 0,
	`consumed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `citizen_login_codes_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(64) NOT NULL,
	`principal_type` enum('admin','citizen') NOT NULL,
	`user_id` char(26),
	`citizen_account_id` char(26),
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`idle_expires_at` datetime(3) NOT NULL,
	`absolute_expires_at` datetime(3) NOT NULL,
	`mfa_state` enum('pending','verified','not_required'),
	`revoked_at` datetime(3),
	`revoke_reason` varchar(32),
	`ip_hash` char(64),
	`user_agent` varchar(160),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `report_assignees` (
	`report_id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`assigned_at` datetime(3) NOT NULL,
	CONSTRAINT `pk_report_assignees` PRIMARY KEY(`report_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `report_categories` (
	`id` varchar(32) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL,
	`icon_name` varchar(64),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `report_categories_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `report_counter` (
	`id` tinyint unsigned NOT NULL,
	`last_value` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `report_counter_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_report_counter_single_row` CHECK(`report_counter`.`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `report_photos` (
	`id` char(26) NOT NULL,
	`report_id` char(26) NOT NULL,
	`ordinal` tinyint unsigned NOT NULL,
	`storage_key` varchar(200) NOT NULL,
	`mime` enum('image/webp','image/jpeg') NOT NULL,
	`size_bytes` int unsigned NOT NULL,
	`width` smallint unsigned NOT NULL,
	`height` smallint unsigned NOT NULL,
	`sha256` char(64) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `report_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_report_photos_storage_key` UNIQUE(`storage_key`),
	CONSTRAINT `uq_report_photos_report_ordinal` UNIQUE(`report_id`,`ordinal`),
	CONSTRAINT `chk_report_photos_ordinal` CHECK(`report_photos`.`ordinal` BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `report_responses` (
	`id` char(26) NOT NULL,
	`report_id` char(26) NOT NULL,
	`message` text NOT NULL,
	`author_user_id` char(26) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `report_responses_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` char(26) NOT NULL,
	`author_account_id` char(26),
	`reference_number` varchar(16) NOT NULL,
	`category_id` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`location_text` varchar(300) NOT NULL,
	`lat` decimal(9,6),
	`lng` decimal(9,6),
	`location_source` enum('text','pin','gps_pin','geocoded','admin_corrected') NOT NULL,
	`gps_accuracy_m` decimal(7,1),
	`location_approximate` boolean NOT NULL DEFAULT false,
	`resolution_status` enum('new','in_analysis','resolved') NOT NULL DEFAULT 'new',
	`city_hall_taken_over` boolean NOT NULL DEFAULT false,
	`city_hall_taken_over_at` datetime(3),
	`city_hall_taken_over_by` char(26),
	`city_hall_transmission_requested` boolean NOT NULL DEFAULT false,
	`city_hall_transmission_requested_at` datetime(3),
	`location_corrected_at` datetime(3),
	`location_corrected_by` char(26),
	`notify_opt_in` boolean NOT NULL DEFAULT false,
	`notify_opt_in_at` datetime(3),
	`unsubscribe_token_hash` char(64),
	`notify_unsubscribed_at` datetime(3),
	`idempotency_key` char(36),
	`is_demo` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_reports_reference_number` UNIQUE(`reference_number`),
	CONSTRAINT `uq_reports_unsubscribe_token_hash` UNIQUE(`unsubscribe_token_hash`),
	CONSTRAINT `uq_reports_idempotency_key` UNIQUE(`idempotency_key`),
	CONSTRAINT `chk_reports_lat_lng_pair` CHECK((`reports`.`lat` IS NULL) = (`reports`.`lng` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` char(26) NOT NULL,
	`type` enum('notification','announcement','news','event') NOT NULL,
	`title` varchar(200) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`published_at` datetime(3) NOT NULL,
	`author` varchar(100) NOT NULL,
	`category` varchar(64) NOT NULL,
	`image_url` varchar(255),
	`is_urgent` boolean NOT NULL DEFAULT false,
	`expires_at` datetime(3),
	`status` enum('published','draft') NOT NULL,
	`event_date` date,
	`event_time` time,
	`event_location` varchar(200),
	`event_organizer` varchar(200),
	`is_demo` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`created_by` char(26),
	`updated_at` datetime(3) NOT NULL,
	`updated_by` char(26),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `directory_departments` (
	`id` char(26) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` varchar(1000) NOT NULL,
	`location` varchar(200),
	`phone` varchar(32),
	`email` varchar(254),
	`schedule` varchar(200),
	`head_of_department` varchar(200),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `directory_departments_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `directory_institution` (
	`id` tinyint unsigned NOT NULL,
	`institution_name` varchar(200) NOT NULL,
	`short_name` varchar(100) NOT NULL,
	`county` varchar(64) NOT NULL,
	`address` varchar(300) NOT NULL,
	`postal_code` varchar(16) NOT NULL,
	`primary_phone` varchar(32) NOT NULL,
	`secondary_phone` varchar(32),
	`fax` varchar(32),
	`primary_email` varchar(254) NOT NULL,
	`registry_email` varchar(254),
	`website_url` varchar(255) NOT NULL,
	`schedule` json NOT NULL,
	`audience_schedule` json NOT NULL,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`updated_at` datetime(3) NOT NULL,
	`updated_by` char(26),
	CONSTRAINT `directory_institution_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_directory_institution_single_row` CHECK(`directory_institution`.`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `directory_links` (
	`id` char(26) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` varchar(500) NOT NULL,
	`url` varchar(500) NOT NULL,
	`category` enum('Plăți & Taxe','Transparență Decizională','Servicii Digitale','Instituții Partenere') NOT NULL,
	`is_external` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `directory_links_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `directory_services` (
	`id` char(26) NOT NULL,
	`department_id` char(26) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` varchar(1000) NOT NULL,
	`documents_required` json,
	`processing_time` varchar(100),
	`fee` varchar(100),
	`online_link` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `directory_services_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `quickdial_categories` (
	`id` char(26) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `quickdial_categories_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `quickdial_contacts` (
	`id` char(26) NOT NULL,
	`category_id` char(26) NOT NULL,
	`name` varchar(200) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`formatted_phone` varchar(40) NOT NULL,
	`short_description` varchar(300),
	`availability` varchar(100) NOT NULL,
	`is_emergency` boolean NOT NULL DEFAULT false,
	`address` varchar(300),
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_demo` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`verified_source` varchar(300),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `quickdial_contacts_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `survey_answers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`submission_id` char(26) NOT NULL,
	`question_id` char(26) NOT NULL,
	`option_id` char(26),
	`text_value` text,
	CONSTRAINT `survey_answers_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `survey_options` (
	`id` char(26) NOT NULL,
	`question_id` char(26) NOT NULL,
	`ordinal` smallint unsigned NOT NULL,
	`text` varchar(300) NOT NULL,
	CONSTRAINT `survey_options_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_survey_options_question_ordinal` UNIQUE(`question_id`,`ordinal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `survey_questions` (
	`id` char(26) NOT NULL,
	`survey_id` char(26) NOT NULL,
	`ordinal` smallint unsigned NOT NULL,
	`text` varchar(500) NOT NULL,
	`type` enum('single_choice','multiple_choice','free_text') NOT NULL,
	`is_required` boolean NOT NULL DEFAULT false,
	`help_text` varchar(500),
	CONSTRAINT `survey_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_survey_questions_survey_ordinal` UNIQUE(`survey_id`,`ordinal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `survey_submissions` (
	`id` char(26) NOT NULL,
	`survey_id` char(26) NOT NULL,
	`participation_fingerprint` char(64) NOT NULL,
	`submitted_at` datetime(3) NOT NULL,
	`is_demo` boolean NOT NULL DEFAULT false,
	CONSTRAINT `survey_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_survey_submissions_fingerprint` UNIQUE(`survey_id`,`participation_fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` char(26) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(64),
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`results_visibility` enum('live','after_close') NOT NULL DEFAULT 'after_close',
	`pow_enabled` boolean NOT NULL DEFAULT false,
	`integrity_flag` boolean NOT NULL DEFAULT false,
	`integrity_note` varchar(500),
	`first_submission_at` datetime(3),
	`is_demo` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`created_by` char(26),
	`updated_at` datetime(3) NOT NULL,
	`updated_by` char(26),
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`),
	CONSTRAINT `chk_surveys_period` CHECK(`surveys`.`end_at` > `surveys`.`start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` char(26) NOT NULL,
	`kind` enum('registry_notification','citizen_status_update','citizen_login_code','citizen_account_blocked') NOT NULL,
	`report_id` char(26),
	`dedupe_key` varchar(128),
	`recipient` varchar(254) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`body_text` mediumtext,
	`attachment_photo_ids` json,
	`status` enum('queued','sending','sent','failed','blocked','simulated','cancelled','on_hold') NOT NULL,
	`attempts` int unsigned NOT NULL DEFAULT 0,
	`next_attempt_at` datetime(3),
	`locked_until` datetime(3),
	`last_error` varchar(500),
	`mode_at_send` enum('simulated','allowlist','live'),
	`transport` enum('simulated','smtp'),
	`provider_message_id` varchar(200),
	`created_at` datetime(3) NOT NULL,
	`sent_at` datetime(3),
	`body_purged_at` datetime(3),
	CONSTRAINT `email_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_email_outbox_dedupe_key` UNIQUE(`dedupe_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`bucket_key` varchar(255) NOT NULL,
	`window_start` datetime(3) NOT NULL,
	`count` int unsigned NOT NULL DEFAULT 0,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `pk_rate_limits` PRIMARY KEY(`bucket_key`,`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `rejected_attempts` (
	`hour` datetime NOT NULL,
	`area` enum('vote','report','login','citizen_code') NOT NULL,
	`target_id` varchar(64) NOT NULL DEFAULT '',
	`reason` enum('duplicate','rate_limited','closed','honeypot','too_fast','pow_invalid','invalid','blocked') NOT NULL,
	`ip_hash` char(64) NOT NULL,
	`count` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `pk_rejected_attempts` PRIMARY KEY(`hour`,`area`,`target_id`,`reason`,`ip_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE `used_pow_challenges` (
	`challenge_hash` char(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `used_pow_challenges_challenge_hash` PRIMARY KEY(`challenge_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `admin_recovery_codes` ADD CONSTRAINT `fk_admin_recovery_codes_user_id` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `admin_users` ADD CONSTRAINT `fk_admin_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `admin_users` ADD CONSTRAINT `fk_admin_users_disabled_by` FOREIGN KEY (`disabled_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `fk_audit_log_actor_user_id` FOREIGN KEY (`actor_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `fk_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `citizen_blocks` ADD CONSTRAINT `fk_citizen_blocks_account_id` FOREIGN KEY (`account_id`) REFERENCES `citizen_accounts`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `citizen_blocks` ADD CONSTRAINT `fk_citizen_blocks_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `citizen_blocks` ADD CONSTRAINT `fk_citizen_blocks_lifted_by` FOREIGN KEY (`lifted_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `citizen_login_codes` ADD CONSTRAINT `fk_citizen_login_codes_account_id` FOREIGN KEY (`account_id`) REFERENCES `citizen_accounts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `fk_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `fk_sessions_citizen_account_id` FOREIGN KEY (`citizen_account_id`) REFERENCES `citizen_accounts`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `report_assignees` ADD CONSTRAINT `fk_report_assignees_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `report_assignees` ADD CONSTRAINT `fk_report_assignees_user_id` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `report_photos` ADD CONSTRAINT `fk_report_photos_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `report_responses` ADD CONSTRAINT `fk_report_responses_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `report_responses` ADD CONSTRAINT `fk_report_responses_author_user_id` FOREIGN KEY (`author_user_id`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_author_account_id` FOREIGN KEY (`author_account_id`) REFERENCES `citizen_accounts`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_category_id` FOREIGN KEY (`category_id`) REFERENCES `report_categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_city_hall_taken_over_by` FOREIGN KEY (`city_hall_taken_over_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `fk_reports_location_corrected_by` FOREIGN KEY (`location_corrected_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `fk_announcements_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `announcements` ADD CONSTRAINT `fk_announcements_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `directory_institution` ADD CONSTRAINT `fk_directory_institution_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `directory_services` ADD CONSTRAINT `fk_directory_services_department_id` FOREIGN KEY (`department_id`) REFERENCES `directory_departments`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `quickdial_contacts` ADD CONSTRAINT `fk_quickdial_contacts_category_id` FOREIGN KEY (`category_id`) REFERENCES `quickdial_categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_answers` ADD CONSTRAINT `fk_survey_answers_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `survey_submissions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_answers` ADD CONSTRAINT `fk_survey_answers_question_id` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_answers` ADD CONSTRAINT `fk_survey_answers_option_id` FOREIGN KEY (`option_id`) REFERENCES `survey_options`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_options` ADD CONSTRAINT `fk_survey_options_question_id` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_questions` ADD CONSTRAINT `fk_survey_questions_survey_id` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `survey_submissions` ADD CONSTRAINT `fk_survey_submissions_survey_id` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `fk_surveys_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `fk_surveys_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE `email_outbox` ADD CONSTRAINT `fk_email_outbox_report_id` FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
--> statement-breakpoint
CREATE INDEX `idx_admin_recovery_codes_user` ON `admin_recovery_codes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_occurred` ON `audit_log` (`occurred_at`);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_actor` ON `audit_log` (`actor_user_id`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_target` ON `audit_log` (`target_type`,`target_id`);
--> statement-breakpoint
CREATE INDEX `idx_citizen_blocks_email_hash` ON `citizen_blocks` (`email_hash`);
--> statement-breakpoint
CREATE INDEX `idx_citizen_blocks_account` ON `citizen_blocks` (`account_id`);
--> statement-breakpoint
CREATE INDEX `idx_citizen_login_codes_account` ON `citizen_login_codes` (`account_id`);
--> statement-breakpoint
CREATE INDEX `idx_citizen_login_codes_expires` ON `citizen_login_codes` (`expires_at`);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_sessions_citizen` ON `sessions` (`citizen_account_id`);
--> statement-breakpoint
CREATE INDEX `idx_sessions_absolute_expires` ON `sessions` (`absolute_expires_at`);
--> statement-breakpoint
CREATE INDEX `idx_report_assignees_user` ON `report_assignees` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_report_responses_report_created` ON `report_responses` (`report_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_reports_author_created` ON `reports` (`author_account_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_reports_created` ON `reports` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_created` ON `reports` (`resolution_status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_reports_category` ON `reports` (`category_id`);
--> statement-breakpoint
CREATE INDEX `idx_reports_taken_over` ON `reports` (`city_hall_taken_over`);
--> statement-breakpoint
CREATE INDEX `idx_reports_is_demo` ON `reports` (`is_demo`);
--> statement-breakpoint
CREATE INDEX `idx_announcements_status_published` ON `announcements` (`status`,`published_at`);
--> statement-breakpoint
CREATE INDEX `idx_announcements_type_event` ON `announcements` (`type`,`event_date`);
--> statement-breakpoint
CREATE INDEX `idx_announcements_expires` ON `announcements` (`expires_at`);
--> statement-breakpoint
CREATE INDEX `idx_directory_services_department` ON `directory_services` (`department_id`);
--> statement-breakpoint
CREATE INDEX `idx_quickdial_contacts_category` ON `quickdial_contacts` (`category_id`);
--> statement-breakpoint
CREATE INDEX `idx_survey_answers_question_option` ON `survey_answers` (`question_id`,`option_id`);
--> statement-breakpoint
CREATE INDEX `idx_survey_answers_submission` ON `survey_answers` (`submission_id`);
--> statement-breakpoint
CREATE INDEX `idx_surveys_status_end` ON `surveys` (`status`,`end_at`);
--> statement-breakpoint
CREATE INDEX `idx_email_outbox_status_next` ON `email_outbox` (`status`,`next_attempt_at`);
--> statement-breakpoint
CREATE INDEX `idx_email_outbox_created` ON `email_outbox` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_email_outbox_report` ON `email_outbox` (`report_id`);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_expires` ON `rate_limits` (`expires_at`);
--> statement-breakpoint
CREATE INDEX `idx_used_pow_challenges_expires` ON `used_pow_challenges` (`expires_at`);
