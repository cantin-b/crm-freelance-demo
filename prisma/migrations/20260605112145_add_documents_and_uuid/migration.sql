/*
  Warnings:

  - The required column `uuid` was added to the `Prospect` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prospect_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prospect" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gm_link" TEXT,
    "rating" REAL,
    "reviews_count" INTEGER,
    "opening_hours" TEXT,
    "owner" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "linkedin_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "callback_at" DATETIME,
    "callback_note" TEXT,
    "notes" TEXT,
    "list_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Prospect" ("uuid", "address", "callback_at", "callback_note", "category", "city", "country", "created_at", "email", "facebook_url", "gm_link", "id", "instagram_url", "linkedin_url", "list_name", "name", "notes", "opening_hours", "owner", "phone", "postal_code", "rating", "reviews_count", "status", "updated_at", "website") SELECT ('c' || lower(hex(randomblob(12)))), "address", "callback_at", "callback_note", "category", "city", "country", "created_at", "email", "facebook_url", "gm_link", "id", "instagram_url", "linkedin_url", "list_name", "name", "notes", "opening_hours", "owner", "phone", "postal_code", "rating", "reviews_count", "status", "updated_at", "website" FROM "Prospect";
DROP TABLE "Prospect";
ALTER TABLE "new_Prospect" RENAME TO "Prospect";
CREATE UNIQUE INDEX "Prospect_uuid_key" ON "Prospect"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
