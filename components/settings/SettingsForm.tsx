"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import {
  SIGNATURE_FIELD_OPTIONS,
  parseSignatureVisibleFields,
  renderStandardSignature,
  serializeSignatureVisibleFields,
  type SignatureVisibleField,
} from "@/lib/templates";
import { LANGUAGE_OPTIONS, type Language } from "@/lib/constants";
import { useT } from "@/components/providers/UiLanguageProvider";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types";

interface Props {
  initialSettings: Settings;
}

type Status = { type: "success" | "error"; message: string } | null;
type SectionId = "smtp" | "profile" | "signature" | "language" | "security";

function SettingsSection({
  id,
  title,
  description,
  summary,
  badge,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  description: string;
  summary: string;
  badge?: { label: string; className: string };
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  const contentId = `settings-${id}`;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-inset"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            {badge && (
              <Badge variant="outline" className={cn("h-5 px-2 text-[11px]", badge.className)}>
                {badge.label}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <p className="hidden max-w-72 truncate text-xs text-zinc-500 sm:block">
          {summary}
        </p>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div id={contentId} className="border-t border-zinc-100/90 px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

export function SettingsForm({ initialSettings }: Props) {
  const t = useT();
  const router = useRouter();
  const gmailConfigured = Boolean(initialSettings.gmail_user && initialSettings.gmail_app_password);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    smtp: !gmailConfigured,
    profile: false,
    signature: false,
    language: false,
    security: false,
  });

  // SMTP state
  const [gmailUser, setGmailUser] = useState(initialSettings.gmail_user);
  const [gmailPassword, setGmailPassword] = useState(initialSettings.gmail_app_password);
  const [senderName, setSenderName] = useState(initialSettings.sender_name);
  const [showPassword, setShowPassword] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<Status>(null);

  // Sender profile state
  const [firstName, setFirstName] = useState(initialSettings.first_name);
  const [lastName, setLastName] = useState(initialSettings.last_name);
  const [professionalTitle, setProfessionalTitle] = useState(initialSettings.professional_title);
  const [professionalTitleEn, setProfessionalTitleEn] = useState(initialSettings.professional_title_en);
  const [businessName, setBusinessName] = useState(initialSettings.business_name);
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email);
  const [profilePhone, setProfilePhone] = useState(initialSettings.phone);
  const [websiteUrl, setWebsiteUrl] = useState(initialSettings.website_url);
  const [linkedinUrl, setLinkedinUrl] = useState(initialSettings.linkedin_url);
  const [instagramUrl, setInstagramUrl] = useState(initialSettings.instagram_url);
  const [facebookUrl, setFacebookUrl] = useState(initialSettings.facebook_url);
  const [whatsappUrl, setWhatsappUrl] = useState(initialSettings.whatsapp_url);
  const [githubUrl, setGithubUrl] = useState(initialSettings.github_url);
  const [signatureEnabled, setSignatureEnabled] = useState(initialSettings.signature_enabled);
  const [signatureLogoEnabled, setSignatureLogoEnabled] = useState(initialSettings.signature_logo_enabled);
  const [signatureCustomEnabled, setSignatureCustomEnabled] = useState(initialSettings.signature_custom_enabled);
  const [signatureVisibleFields, setSignatureVisibleFields] = useState<SignatureVisibleField[]>(
    parseSignatureVisibleFields(initialSettings.signature_visible_fields)
  );
  const [signatureHtml, setSignatureHtml] = useState(initialSettings.signature_html);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<Status>(null);
  // Preview language toggle (local — lets you preview FR/EN signature without
  // changing the global content language). Defaults to the saved content language.
  const [previewLang, setPreviewLang] = useState<Language>(
    initialSettings.content_language === "en" ? "en" : "fr"
  );

  // Language state
  const [contentLanguage, setContentLanguage] = useState<Language>(
    initialSettings.content_language === "en" ? "en" : "fr"
  );
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageStatus, setLanguageStatus] = useState<Status>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<Status>(null);

  // UI language state
  const [uiLanguage, setUiLanguage] = useState<Language>(
    initialSettings.ui_language === "fr" ? "fr" : "en"
  );
  const [uiLanguageSaving, setUiLanguageSaving] = useState(false);
  const [uiLanguageStatus, setUiLanguageStatus] = useState<Status>(null);

  async function handleUpdatePassword() {
    setSecurityStatus(null);
    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: "error", message: t.settings_passwords_mismatch });
      return;
    }
    if (!newPassword) {
      setSecurityStatus({ type: "error", message: t.settings_password_empty });
      return;
    }
    setSecuritySaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setSecurityStatus({ type: "success", message: t.settings_password_updated });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setSecurityStatus({ type: "error", message: data.error ?? t.settings_password_failed });
      }
    } catch {
      setSecurityStatus({ type: "error", message: t.settings_error_occurred });
    } finally {
      setSecuritySaving(false);
    }
  }

  function toggleSection(id: SectionId) {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function keepSectionOpen(id: SectionId) {
    setOpenSections(prev => ({ ...prev, [id]: true }));
  }

  function toggleSignatureField(field: SignatureVisibleField) {
    setSignatureVisibleFields(prev =>
      prev.includes(field)
        ? prev.filter(item => item !== field)
        : [...prev, field]
    );
  }

  async function handleSave() {
    setSmtpSaving(true);
    setSmtpStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmail_user: gmailUser,
          gmail_app_password: gmailPassword,
          sender_name: senderName,
        }),
      });
      if (!res.ok) throw new Error(t.settings_failed_save);
      setSmtpStatus({ type: "success", message: t.settings_settings_saved });
    } catch (err) {
      keepSectionOpen("smtp");
      setSmtpStatus({ type: "error", message: err instanceof Error ? err.message : t.settings_error_occurred });
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleTest() {
    setSmtpTesting(true);
    setSmtpStatus(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmail_user: gmailUser,
          gmail_app_password: gmailPassword,
          sender_name: senderName,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        keepSectionOpen("smtp");
        setSmtpStatus({ type: "error", message: data.error ?? t.settings_test_failed });
      } else {
        setSmtpStatus({ type: "success", message: t.settings_test_success(gmailUser) });
      }
    } catch (err) {
      keepSectionOpen("smtp");
      setSmtpStatus({ type: "error", message: err instanceof Error ? err.message : t.settings_connection_failed });
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileStatus(null);
    const computedDisplayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          display_name: computedDisplayName || initialSettings.display_name,
          professional_title: professionalTitle,
          professional_title_en: professionalTitleEn,
          business_name: businessName,
          contact_email: contactEmail,
          phone: profilePhone,
          website_url: websiteUrl,
          linkedin_url: linkedinUrl,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          whatsapp_url: whatsappUrl,
          github_url: githubUrl,
        }),
      });
      if (!res.ok) throw new Error(t.settings_profile_failed);
      setProfileStatus({ type: "success", message: t.settings_profile_saved });
    } catch (err) {
      keepSectionOpen("profile");
      setProfileStatus({ type: "error", message: err instanceof Error ? err.message : "Error saving profile." });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveSignature() {
    setSignatureSaving(true);
    setSignatureStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_enabled: signatureEnabled,
          signature_logo_enabled: signatureLogoEnabled,
          signature_custom_enabled: signatureCustomEnabled,
          signature_visible_fields: serializeSignatureVisibleFields(signatureVisibleFields),
          signature_html: signatureHtml,
        }),
      });
      if (!res.ok) throw new Error(t.settings_sig_failed);
      setSignatureStatus({ type: "success", message: t.settings_sig_saved });
    } catch (err) {
      keepSectionOpen("signature");
      setSignatureStatus({ type: "error", message: err instanceof Error ? err.message : "Error saving signature." });
    } finally {
      setSignatureSaving(false);
    }
  }

  async function handleSaveLanguage() {
    setLanguageSaving(true);
    setLanguageStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_language: contentLanguage }),
      });
      if (!res.ok) throw new Error(t.settings_language_failed);
      setLanguageStatus({ type: "success", message: t.settings_language_saved });
    } catch (err) {
      keepSectionOpen("language");
      setLanguageStatus({ type: "error", message: err instanceof Error ? err.message : "Error saving language." });
    } finally {
      setLanguageSaving(false);
    }
  }

  const smtpConfigured = Boolean(gmailUser && gmailPassword);
  const computedDisplayName = [
    firstName.trim(),
    lastName.trim(),
  ].filter(Boolean).join(" ") || initialSettings.display_name.trim() || "Nom non défini";
  const profileSummary = [
    computedDisplayName,
    professionalTitle.trim(),
  ].filter(Boolean).join(" · ");
  const signatureSummary = signatureEnabled
    ? signatureCustomEnabled
      ? t.settings_sig_custom_badge
      : `Generated · ${signatureVisibleFields.length} fields`
    : t.settings_sig_disabled_badge;
  const signatureFieldsValue = serializeSignatureVisibleFields(signatureVisibleFields);
  const standardSignaturePreview = renderStandardSignature(
    {
      first_name: firstName,
      last_name: lastName,
      display_name: computedDisplayName,
      professional_title: professionalTitle,
      professional_title_en: professionalTitleEn,
      contact_email: contactEmail,
      phone: profilePhone,
      website_url: websiteUrl,
      linkedin_url: linkedinUrl,
      instagram_url: instagramUrl,
      facebook_url: facebookUrl,
      whatsapp_url: whatsappUrl,
      github_url: githubUrl,
      signature_enabled: signatureEnabled,
      signature_logo_enabled: signatureLogoEnabled,
      signature_custom_enabled: false,
      signature_visible_fields: signatureFieldsValue,
      signature_html: "",
    },
    { language: previewLang }
  );

  async function handleSaveUiLanguage() {
    setUiLanguageStatus(null);
    setUiLanguageSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_language: uiLanguage }),
      });
      if (!res.ok) throw new Error(t.settings_language_failed);
      setUiLanguageStatus({ type: "success", message: t.settings_ui_language_saved });
      router.refresh();
    } catch (err) {
      setUiLanguageStatus({ type: "error", message: err instanceof Error ? err.message : t.settings_error_occurred });
    } finally {
      setUiLanguageSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <SettingsSection
        id="smtp"
        title={t.settings_smtp_title}
        description={t.settings_smtp_description}
        summary={smtpConfigured ? gmailUser : t.settings_smtp_not_configured}
        badge={{
          label: smtpConfigured ? t.settings_smtp_configured : t.settings_smtp_not_configured,
          className: smtpConfigured
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700",
        }}
        open={openSections.smtp}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">{t.settings_smtp_demo_notice}</p>

          <div className="space-y-1.5">
            <Label htmlFor="gmail_user">{t.settings_smtp_gmail_address}</Label>
            <Input
              id="gmail_user"
              type="email"
              placeholder="you@gmail.com"
              value={gmailUser}
              onChange={(e) => setGmailUser(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gmail_password">{t.settings_smtp_app_password}</Label>
            <div className="relative">
              <Input
                id="gmail_password"
                type={showPassword ? "text" : "password"}
                placeholder="xxxx xxxx xxxx xxxx"
                value={gmailPassword}
                onChange={(e) => setGmailPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender_name">{t.settings_smtp_sender_name}</Label>
            <Input
              id="sender_name"
              type="text"
              placeholder="Your Name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>

          {smtpStatus && (
            <p className={smtpStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {smtpStatus.message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={smtpSaving || smtpTesting}>
              {smtpSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={smtpSaving || smtpTesting || !gmailUser || !gmailPassword}
            >
              {smtpTesting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.settings_test_connection}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="profile"
        title={t.settings_profile_title}
        description={t.settings_profile_description}
        summary={profileSummary}
        open={openSections.profile}
        onToggle={toggleSection}
      >
        <div className="space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{t.settings_profile_first_name}</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{t.settings_profile_last_name}</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professional_title">{t.settings_profile_title_label}</Label>
              <Input
                id="professional_title"
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="professional_title_en">{t.settings_profile_title_en_label}</Label>
              <Input
                id="professional_title_en"
                placeholder={t.settings_profile_title_en_placeholder}
                value={professionalTitleEn}
                onChange={(e) => setProfessionalTitleEn(e.target.value)}
              />
              <p className="text-xs text-zinc-400">{t.settings_profile_title_en_hint}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="business_name">{t.settings_profile_business}</Label>
              <Input
                id="business_name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">{t.settings_profile_contact_email}</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile_phone">{t.settings_profile_phone}</Label>
              <Input
                id="profile_phone"
                type="tel"
                placeholder="+41 79 000 00 00"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="website_url">{t.settings_profile_website}</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input
                id="instagram_url"
                type="url"
                placeholder="https://instagram.com/..."
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook_url">Facebook</Label>
              <Input
                id="facebook_url"
                type="url"
                placeholder="https://facebook.com/..."
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_url">WhatsApp</Label>
              <Input
                id="whatsapp_url"
                type="url"
                placeholder="https://wa.me/..."
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="github_url">GitHub</Label>
              <Input
                id="github_url"
                type="url"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>
          </div>

          {profileStatus && (
            <p className={profileStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {profileStatus.message}
            </p>
          )}

          <div className="pt-1">
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="signature"
        title={t.settings_signature_title}
        description={t.settings_signature_description}
        summary={signatureSummary}
        badge={{
          label: signatureSummary,
          className: signatureEnabled
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-zinc-200 bg-zinc-50 text-zinc-600",
        }}
        open={openSections.signature}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="signature_enabled"
              checked={signatureEnabled}
              onCheckedChange={(v) => setSignatureEnabled(Boolean(v))}
            />
            <Label htmlFor="signature_enabled" className="cursor-pointer">
              {t.settings_sig_enabled_label}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="signature_custom_enabled"
              checked={signatureCustomEnabled}
              disabled={!signatureEnabled}
              onCheckedChange={(v) => setSignatureCustomEnabled(Boolean(v))}
            />
            <Label
              htmlFor="signature_custom_enabled"
              className={cn("cursor-pointer", !signatureEnabled && "text-zinc-400")}
            >
              {t.settings_sig_custom_label}
            </Label>
          </div>

          {!signatureCustomEnabled && (
            <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="signature_logo_enabled"
                    checked={signatureLogoEnabled}
                    disabled={!signatureEnabled}
                    onCheckedChange={(v) => setSignatureLogoEnabled(Boolean(v))}
                  />
                  <Label
                    htmlFor="signature_logo_enabled"
                    className={cn("cursor-pointer", !signatureEnabled && "text-zinc-400")}
                  >
                    {t.settings_sig_logo_label}
                  </Label>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!signatureEnabled}
                      className="h-8 justify-between gap-2 px-3"
                    >
                      {t.settings_sig_visible_fields}
                      <Badge variant="outline" className="h-5 rounded px-1.5 text-[11px]">
                        {signatureVisibleFields.length}
                      </Badge>
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-zinc-500">
                      {t.settings_sig_standard_label}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SIGNATURE_FIELD_OPTIONS.map(option => (
                      <DropdownMenuCheckboxItem
                        key={option.key}
                        checked={signatureVisibleFields.includes(option.key)}
                        onCheckedChange={() => toggleSignatureField(option.key)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {signatureEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-zinc-500">{t.settings_sig_preview}</p>
                    <div className="inline-flex overflow-hidden rounded-md border border-zinc-200">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPreviewLang(opt.value)}
                          className={cn(
                            "px-2.5 py-1 text-xs transition-colors",
                            previewLang === opt.value
                              ? "bg-zinc-900 text-white"
                              : "bg-white text-zinc-500 hover:bg-zinc-50"
                          )}
                        >
                          {opt.value.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
                    {standardSignaturePreview ? (
                      <div
                        className="overflow-x-auto"
                        dangerouslySetInnerHTML={{ __html: standardSignaturePreview }}
                      />
                    ) : (
                      <p className="text-sm text-zinc-400">{t.settings_sig_no_fields}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {signatureCustomEnabled && (
            <div className="space-y-1.5">
              <Label>{t.settings_sig_custom_label2}</Label>
              <TemplateEditor
                content={signatureHtml}
                onChange={setSignatureHtml}
                placeholder={t.settings_sig_custom_placeholder}
                minHeightClassName="min-h-36"
                className={cn(!signatureEnabled && "pointer-events-none opacity-60")}
              />
            </div>
          )}

          {signatureStatus && (
            <p className={signatureStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {signatureStatus.message}
            </p>
          )}

          <div className="pt-1">
            <Button onClick={handleSaveSignature} disabled={signatureSaving}>
              {signatureSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="language"
        title={t.settings_language_title}
        description={t.settings_language_description}
        summary={contentLanguage === "en" ? t.settings_language_content_en : t.settings_language_content_fr}
        open={openSections.language}
        onToggle={toggleSection}
      >
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="content_language">{t.settings_language_content_label}</Label>
            <Select
              value={contentLanguage}
              onValueChange={(v) => setContentLanguage(v as Language)}
            >
              <SelectTrigger id="content_language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-400">{t.settings_language_hint}</p>
          </div>

          {languageStatus && (
            <p className={languageStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {languageStatus.message}
            </p>
          )}

          <div className="pt-1">
            <Button onClick={handleSaveLanguage} disabled={languageSaving}>
              {languageSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </Button>
          </div>

          {/* UI Language */}
          <div className="mt-4 space-y-1.5 border-t border-zinc-100 pt-4">
            <Label htmlFor="ui_language">{t.settings_ui_language_label}</Label>
            <Select
              value={uiLanguage}
              onValueChange={(v) => setUiLanguage(v as Language)}
            >
              <SelectTrigger id="ui_language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-400">{t.settings_ui_language_hint}</p>

            {uiLanguageStatus && (
              <p className={uiLanguageStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
                {uiLanguageStatus.message}
              </p>
            )}

            <div className="pt-1">
              <Button onClick={handleSaveUiLanguage} disabled={uiLanguageSaving}>
                {uiLanguageSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="security"
        title={t.settings_security_title}
        description={t.settings_security_description}
        summary={t.settings_security_summary}
        open={openSections.security}
        onToggle={toggleSection}
      >
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">{t.settings_current_password}</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showCurrentPw ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">{t.settings_new_password}</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPw ? "text" : "password"}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">{t.settings_confirm_password}</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPw ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {securityStatus && (
            <p className={securityStatus.type === "success" ? "text-sm text-green-600" : "text-sm text-red-600"}>
              {securityStatus.message}
            </p>
          )}

          <div className="pt-1">
            <Button onClick={handleUpdatePassword} disabled={securitySaving || !currentPassword || !newPassword || !confirmPassword}>
              {securitySaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.settings_update_password}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
