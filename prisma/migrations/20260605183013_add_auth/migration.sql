-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
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
    "booking_url" TEXT NOT NULL DEFAULT '',
    "signature_enabled" BOOLEAN NOT NULL DEFAULT true,
    "signature_logo_enabled" BOOLEAN NOT NULL DEFAULT true,
    "signature_custom_enabled" BOOLEAN NOT NULL DEFAULT false,
    "signature_visible_fields" TEXT NOT NULL DEFAULT 'name,title,phone,email,website,linkedin,instagram,facebook,whatsapp,github',
    "signature_html" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Settings" ("booking_url", "business_name", "contact_email", "display_name", "facebook_url", "first_name", "github_url", "gmail_app_password", "gmail_user", "id", "instagram_url", "last_name", "linkedin_url", "phone", "professional_title", "sender_name", "signature_custom_enabled", "signature_enabled", "signature_html", "signature_logo_enabled", "signature_visible_fields", "website_url", "whatsapp_url") SELECT "booking_url", "business_name", "contact_email", "display_name", "facebook_url", "first_name", "github_url", "gmail_app_password", "gmail_user", "id", "instagram_url", "last_name", "linkedin_url", "phone", "professional_title", "sender_name", "signature_custom_enabled", "signature_enabled", "signature_html", "signature_logo_enabled", "signature_visible_fields", "website_url", "whatsapp_url" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
