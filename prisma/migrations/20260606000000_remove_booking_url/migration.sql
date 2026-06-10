-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gmail_user" TEXT NOT NULL DEFAULT '',
    "gmail_app_password" TEXT NOT NULL DEFAULT '',
    "sender_name" TEXT NOT NULL DEFAULT '',
    "first_name" TEXT NOT NULL DEFAULT 'Cantin',
    "last_name" TEXT NOT NULL DEFAULT 'Bartel',
    "display_name" TEXT NOT NULL DEFAULT 'Cantin Bartel',
    "professional_title" TEXT NOT NULL DEFAULT 'Développeur web freelance',
    "business_name" TEXT NOT NULL DEFAULT 'CB Web Artisan',
    "contact_email" TEXT NOT NULL DEFAULT 'cantinbartel.dev@gmail.com',
    "phone" TEXT NOT NULL DEFAULT '',
    "website_url" TEXT NOT NULL DEFAULT 'https://fr.cantinbartel.dev',
    "linkedin_url" TEXT NOT NULL DEFAULT 'https://www.linkedin.com/in/cantin-bartel',
    "instagram_url" TEXT NOT NULL DEFAULT '',
    "facebook_url" TEXT NOT NULL DEFAULT '',
    "whatsapp_url" TEXT NOT NULL DEFAULT '',
    "github_url" TEXT NOT NULL DEFAULT 'https://github.com/cantin-b',
    "signature_enabled" BOOLEAN NOT NULL DEFAULT true,
    "signature_logo_enabled" BOOLEAN NOT NULL DEFAULT true,
    "signature_custom_enabled" BOOLEAN NOT NULL DEFAULT false,
    "signature_visible_fields" TEXT NOT NULL DEFAULT 'name,title,phone,email,website,linkedin,instagram,facebook,whatsapp,github',
    "signature_html" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Settings" ("id", "gmail_user", "gmail_app_password", "sender_name", "first_name", "last_name", "display_name", "professional_title", "business_name", "contact_email", "phone", "website_url", "linkedin_url", "instagram_url", "facebook_url", "whatsapp_url", "github_url", "signature_enabled", "signature_logo_enabled", "signature_custom_enabled", "signature_visible_fields", "signature_html", "password_hash")
SELECT "id", "gmail_user", "gmail_app_password", "sender_name", "first_name", "last_name", "display_name", "professional_title", "business_name", "contact_email", "phone", "website_url", "linkedin_url", "instagram_url", "facebook_url", "whatsapp_url", "github_url", "signature_enabled", "signature_logo_enabled", "signature_custom_enabled", "signature_visible_fields", "signature_html", "password_hash"
FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
