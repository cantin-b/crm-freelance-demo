-- AlterTable: add language columns to Settings
ALTER TABLE "Settings" ADD COLUMN "professional_title_en" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "ui_language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Settings" ADD COLUMN "content_language" TEXT NOT NULL DEFAULT 'fr';

-- AlterTable: add language column to EmailTemplate
ALTER TABLE "EmailTemplate" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'fr';
