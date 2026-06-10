import type { Settings } from "@/types";

type SenderVars = Pick<
  Settings,
  | "first_name"
  | "last_name"
  | "display_name"
  | "professional_title"
  | "professional_title_en"
  | "contact_email"
  | "phone"
  | "website_url"
  | "linkedin_url"
  | "instagram_url"
  | "facebook_url"
  | "whatsapp_url"
  | "github_url"
  | "signature_enabled"
  | "signature_logo_enabled"
  | "signature_custom_enabled"
  | "signature_visible_fields"
  | "signature_html"
>;

type FullSenderVars = Pick<
  Settings,
  | "first_name"
  | "last_name"
  | "display_name"
  | "professional_title"
  | "professional_title_en"
  | "business_name"
  | "contact_email"
  | "phone"
  | "website_url"
  | "linkedin_url"
  | "instagram_url"
  | "facebook_url"
  | "whatsapp_url"
  | "github_url"
  | "signature_enabled"
  | "signature_logo_enabled"
  | "signature_custom_enabled"
  | "signature_visible_fields"
  | "signature_html"
>;

export const SIGNATURE_FIELD_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "title", label: "Title" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "github", label: "GitHub" },
] as const;

export type SignatureVisibleField = typeof SIGNATURE_FIELD_OPTIONS[number]["key"];

export const DEFAULT_SIGNATURE_VISIBLE_FIELDS = SIGNATURE_FIELD_OPTIONS.map(
  option => option.key
);

export const DEFAULT_SIGNATURE_VISIBLE_FIELDS_VALUE = DEFAULT_SIGNATURE_VISIBLE_FIELDS.join(",");

const VARIABLE_NAMES = [
  "name",
  "owner",
  "city",
  "website",
  "senderName",
  "senderFirstName",
  "senderLastName",
  "senderTitle",
  "senderBusinessName",
  "senderEmail",
  "senderPhone",
  "senderWebsite",
  "senderLinkedIn",
  "senderInstagram",
  "senderFacebook",
  "senderWhatsApp",
  "senderGithub",
  "signature",
] as const;

const SIGNATURE_LOGO_PATH = "/logo.png";
const SOCIAL_ICON_PATHS = {
  linkedin: "/linkedin-logo.png",
  github: "/github-logo.png",
  facebook: "/facebook-logo.png",
  instagram: "/instagram-logo.png",
  whatsapp: "/whatsapp-logo.png",
} as const;

type ReplaceOptions = {
  appendSignature?: boolean;
  forceSignature?: boolean;
  assetBaseUrl?: string;
  language?: string; // "en" | "fr" — selects signature title language
};

function clean(value: string): string {
  return value.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function href(value: string): string {
  return escapeHtml(clean(value));
}

function assetUrl(path: string, baseUrl?: string): string {
  const base = clean(baseUrl ?? "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function parseSignatureVisibleFields(value?: string | null): SignatureVisibleField[] {
  if (value === undefined || value === null) {
    return DEFAULT_SIGNATURE_VISIBLE_FIELDS;
  }

  const allowed = new Set<SignatureVisibleField>(DEFAULT_SIGNATURE_VISIBLE_FIELDS);
  const selected = value
    .split(",")
    .map(item => item.trim())
    .filter((item): item is SignatureVisibleField => allowed.has(item as SignatureVisibleField));

  return DEFAULT_SIGNATURE_VISIBLE_FIELDS.filter(field => selected.includes(field));
}

export function serializeSignatureVisibleFields(fields: readonly SignatureVisibleField[]): string {
  const selected = new Set(fields);
  return DEFAULT_SIGNATURE_VISIBLE_FIELDS.filter(field => selected.has(field)).join(",");
}

function isFieldVisible(fields: readonly SignatureVisibleField[], field: SignatureVisibleField): boolean {
  return fields.includes(field);
}

function renderContactLine(label: string, value: string, linkPrefix?: string): string {
  const text = clean(value);
  if (!text) return "";
  const renderedValue = linkPrefix
    ? `<a href="${linkPrefix}${href(text)}" style="color:#52525b; text-decoration:none;">${escapeHtml(text)}</a>`
    : escapeHtml(text);
  const labelHtml = label
    ? `<span style="font-weight:700; color:#27272a;">${label}</span> `
    : "";

  return [
    `${labelHtml}${renderedValue}<br />`,
  ].join("");
}

function renderSocialIcon(label: string, url: string, iconUrl: string): string {
  const target = clean(url);
  if (!target) return "";

  return [
    `<a href="${href(target)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-right:7px; text-decoration:none; vertical-align:middle;">`,
    `<img src="${iconUrl}" width="20" height="20" alt="${label}" border="0" style="display:inline-block; width:20px; height:20px; border:0; outline:none; text-decoration:none; vertical-align:middle;" />`,
    `</a>`,
  ].join("");
}

function buildSignature(
  sender: SenderVars,
  { force = false, assetBaseUrl, language }: { force?: boolean; assetBaseUrl?: string; language?: string } = {}
): string {
  if (!force && !sender.signature_enabled) return "";
  if (sender.signature_custom_enabled) return sender.signature_html;

  return renderStandardSignature(sender, { assetBaseUrl, language });
}

// Pick the professional title for the given content language. Falls back to the
// French title when the English one is empty so the signature is never blank.
function resolveTitle(sender: SenderVars, language?: string): string {
  if (language === "en") {
    return clean(sender.professional_title_en) || clean(sender.professional_title);
  }
  return clean(sender.professional_title);
}

export function renderStandardSignature(
  sender: SenderVars,
  { assetBaseUrl, language }: { assetBaseUrl?: string; language?: string } = {}
): string {
  const visibleFields = parseSignatureVisibleFields(sender.signature_visible_fields);

  const logoUrl = sender.signature_logo_enabled
    ? assetUrl(SIGNATURE_LOGO_PATH, assetBaseUrl)
    : "";
  const fullName = [
    clean(sender.first_name),
    clean(sender.last_name),
  ].filter(Boolean).join(" ") || clean(sender.display_name);
  const visibleName = isFieldVisible(visibleFields, "name") ? fullName : "";
  const title = isFieldVisible(visibleFields, "title") ? resolveTitle(sender, language) : "";
  const phoneLine = isFieldVisible(visibleFields, "phone")
    ? renderContactLine("", sender.phone, "tel:")
    : "";
  const emailLine = isFieldVisible(visibleFields, "email")
    ? renderContactLine("", sender.contact_email, "mailto:")
    : "";
  const website = isFieldVisible(visibleFields, "website") ? clean(sender.website_url) : "";
  const socialIcons = [
    isFieldVisible(visibleFields, "linkedin")
      ? renderSocialIcon("LinkedIn", sender.linkedin_url, assetUrl(SOCIAL_ICON_PATHS.linkedin, assetBaseUrl))
      : "",
    isFieldVisible(visibleFields, "instagram")
      ? renderSocialIcon("Instagram", sender.instagram_url, assetUrl(SOCIAL_ICON_PATHS.instagram, assetBaseUrl))
      : "",
    isFieldVisible(visibleFields, "facebook")
      ? renderSocialIcon("Facebook", sender.facebook_url, assetUrl(SOCIAL_ICON_PATHS.facebook, assetBaseUrl))
      : "",
    isFieldVisible(visibleFields, "whatsapp")
      ? renderSocialIcon("WhatsApp", sender.whatsapp_url, assetUrl(SOCIAL_ICON_PATHS.whatsapp, assetBaseUrl))
      : "",
    isFieldVisible(visibleFields, "github")
      ? renderSocialIcon("Github", sender.github_url, assetUrl(SOCIAL_ICON_PATHS.github, assetBaseUrl))
      : "",
  ].filter(Boolean).join("");
  const hasTextContent = Boolean(visibleName || title || phoneLine || emailLine || website || socialIcons);

  if (!logoUrl && !hasTextContent) return "";

  const logoCell = logoUrl
    ? `<td width="136" style="width:136px; padding:0 ${hasTextContent ? "24px" : "0"} 0 0; vertical-align:middle;"><p style="margin:0;"><img src="${logoUrl}" width="112" alt="CB Web Artisan" border="0" style="display:block; width:112px; height:auto; border:0; outline:none; text-decoration:none;" /></p></td>`
    : "";
  const separatorCell = logoUrl && hasTextContent
    ? `<td width="1" style="box-sizing:content-box; width:1px; border-left:2px solid #a1a1aa; padding:0; font-size:0; line-height:0;"><p style="margin:0;">&nbsp;</p></td>`
    : "";
  const spacerCell = "";
  const contentCell = hasTextContent
    ? [
        `<td style="padding:0 0 0 ${logoUrl && hasTextContent ? "14px" : "0"}; vertical-align:middle; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.32; color:#27272a;">`,
        visibleName || title || phoneLine || emailLine || website
          ? [
              `<p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.32; color:#27272a;">`,
              visibleName ? `<strong style="font-weight:700; color:#18181b;">${escapeHtml(visibleName)}</strong><br />` : "",
              title ? `${escapeHtml(title)}<br />` : "",
              phoneLine || emailLine ? `${phoneLine}${emailLine}` : "",
              website
                ? `<a href="${href(website)}" target="_blank" rel="noopener noreferrer" style="color:#52525b; text-decoration:underline;">${escapeHtml(website)}</a>`
                : "",
              `</p>`,
            ].join("")
          : "",
        socialIcons ? `<p style="margin:4px 0 0; font-size:0; line-height:0;">${socialIcons}</p>` : "",
        `</td>`,
      ].join("\n")
    : "";

  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; margin-top:18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.32; color:#27272a;">`,
    `<tr>`,
    logoCell,
    separatorCell,
    spacerCell,
    contentCell,
    `</tr>`,
    `</table>`,
  ].join("\n");
}

function stripStrongFromVariables(text: string): string {
  const variablePattern = VARIABLE_NAMES.join("|");
  const strongVariable = new RegExp(
    `<(strong|b)(?:\\s[^>]*)?>\\s*(\\{\\{(?:${variablePattern})\\}\\})([\\s,.;:!?]*)<\\/\\1>`,
    "gi"
  );

  return text.replace(strongVariable, "$2$3");
}

function hasSignatureVariable(text: string): boolean {
  return /\{\{signature\}\}/.test(text);
}

function appendSignatureIfNeeded(text: string, signature: string): string {
  if (!signature.trim()) return text;
  const trimmed = text.trim();
  if (!trimmed) return signature;
  return `${trimmed}\n${signature}`;
}

// Replace {{name}}, {{owner}}, {{city}}, {{website}} with prospect values.
// Optionally replaces sender variables when settings are provided.
// owner: only the first name from a semicolon-separated list.
export function replaceVariables(
  text: string,
  prospect: { name: string; owner: string | null; city: string | null; website: string | null },
  sender?: FullSenderVars,
  options: ReplaceOptions = {}
): string {
  const firstOwner = prospect.owner?.split(";")[0]?.trim() ?? "";
  const shouldAppendSignature = options.appendSignature && sender && !hasSignatureVariable(text);
  const signature = sender
    ? buildSignature(sender, {
        force: options.forceSignature,
        assetBaseUrl: options.assetBaseUrl,
        language: options.language,
      })
    : "";

  let result = stripStrongFromVariables(text)
    .replace(/\{\{name\}\}/g, prospect.name)
    .replace(/\{\{owner\}\}/g, firstOwner)
    .replace(/\{\{city\}\}/g, prospect.city ?? "")
    .replace(/\{\{website\}\}/g, prospect.website ?? "");

  if (sender) {
    result = result
      .replace(/\{\{senderName\}\}/g,        [
        clean(sender.first_name),
        clean(sender.last_name),
      ].filter(Boolean).join(" ") || sender.display_name)
      .replace(/\{\{senderFirstName\}\}/g,    sender.first_name)
      .replace(/\{\{senderLastName\}\}/g,     sender.last_name)
      .replace(/\{\{senderTitle\}\}/g,        sender.professional_title)
      .replace(/\{\{senderBusinessName\}\}/g, sender.business_name)
      .replace(/\{\{senderEmail\}\}/g,        sender.contact_email)
      .replace(/\{\{senderPhone\}\}/g,        sender.phone)
      .replace(/\{\{senderWebsite\}\}/g,      sender.website_url)
      .replace(/\{\{senderLinkedIn\}\}/g,     sender.linkedin_url)
      .replace(/\{\{senderInstagram\}\}/g,    sender.instagram_url)
      .replace(/\{\{senderFacebook\}\}/g,     sender.facebook_url)
      .replace(/\{\{senderWhatsApp\}\}/g,     sender.whatsapp_url)
      .replace(/\{\{senderGithub\}\}/g,       sender.github_url)
      .replace(/\{\{signature\}\}/g,          signature);
  }

  if (shouldAppendSignature) {
    result = appendSignatureIfNeeded(result, signature);
  }

  return result;
}
