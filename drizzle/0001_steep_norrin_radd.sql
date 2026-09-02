CREATE TABLE `riskSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`screeningCaseId` int NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(160) NOT NULL,
	`severity` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
	`weight` int NOT NULL,
	`description` text NOT NULL,
	`status` enum('MATCH','MISMATCH','SUSPICIOUS','UNKNOWN') NOT NULL,
	`evidenceJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `riskSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screeningCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` varchar(32) NOT NULL,
	`identityId` int NOT NULL,
	`documentId` int NOT NULL,
	`score` int NOT NULL,
	`riskLevel` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
	`status` enum('completed','processing','needs_review') NOT NULL,
	`decision` varchar(120) NOT NULL,
	`recommendedAction` varchar(160) NOT NULL,
	`evidenceJson` json NOT NULL,
	`subscoresJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `screeningCases_id` PRIMARY KEY(`id`),
	CONSTRAINT `screeningCases_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `screeningEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`screeningCaseId` int NOT NULL,
	`stage` varchar(80) NOT NULL,
	`status` enum('completed','current','pending') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`durationMs` int NOT NULL,
	`detail` varchar(240) NOT NULL,
	CONSTRAINT `screeningEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `syntheticDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identityId` int NOT NULL,
	`documentType` varchar(40) NOT NULL,
	`filename` varchar(160) NOT NULL,
	`issueDate` varchar(16) NOT NULL,
	`expiryDate` varchar(16) NOT NULL,
	`extractedText` text NOT NULL,
	`metadataJson` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syntheticDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `syntheticIdentities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syntheticId` varchar(32) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`dateOfBirth` varchar(16) NOT NULL,
	`nationality` varchar(80) NOT NULL,
	`documentNumber` varchar(48) NOT NULL,
	`documentType` varchar(40) NOT NULL,
	`expiryDate` varchar(16) NOT NULL,
	`faceReference` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syntheticIdentities_id` PRIMARY KEY(`id`),
	CONSTRAINT `syntheticIdentities_syntheticId_unique` UNIQUE(`syntheticId`)
);
