import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json() as {
    gmail_user?: string;
    gmail_app_password?: string;
    sender_name?: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    professional_title?: string;
    professional_title_en?: string;
    business_name?: string;
    contact_email?: string;
    phone?: string;
    website_url?: string;
    linkedin_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    whatsapp_url?: string;
    github_url?: string;
    signature_enabled?: boolean;
    signature_logo_enabled?: boolean;
    signature_custom_enabled?: boolean;
    signature_visible_fields?: string;
    signature_html?: string;
    ui_language?: string;
    content_language?: string;
  };

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      ...(body.gmail_user !== undefined         && { gmail_user: body.gmail_user }),
      ...(body.gmail_app_password !== undefined && { gmail_app_password: body.gmail_app_password }),
      ...(body.sender_name !== undefined        && { sender_name: body.sender_name }),
      ...(body.first_name !== undefined         && { first_name: body.first_name }),
      ...(body.last_name !== undefined          && { last_name: body.last_name }),
      ...(body.display_name !== undefined       && { display_name: body.display_name }),
      ...(body.professional_title !== undefined && { professional_title: body.professional_title }),
      ...(body.professional_title_en !== undefined && { professional_title_en: body.professional_title_en }),
      ...(body.business_name !== undefined      && { business_name: body.business_name }),
      ...(body.contact_email !== undefined      && { contact_email: body.contact_email }),
      ...(body.phone !== undefined              && { phone: body.phone }),
      ...(body.website_url !== undefined        && { website_url: body.website_url }),
      ...(body.linkedin_url !== undefined       && { linkedin_url: body.linkedin_url }),
      ...(body.instagram_url !== undefined      && { instagram_url: body.instagram_url }),
      ...(body.facebook_url !== undefined       && { facebook_url: body.facebook_url }),
      ...(body.whatsapp_url !== undefined       && { whatsapp_url: body.whatsapp_url }),
      ...(body.github_url !== undefined         && { github_url: body.github_url }),
      ...(body.signature_enabled !== undefined  && { signature_enabled: body.signature_enabled }),
      ...(body.signature_logo_enabled !== undefined && { signature_logo_enabled: body.signature_logo_enabled }),
      ...(body.signature_custom_enabled !== undefined && { signature_custom_enabled: body.signature_custom_enabled }),
      ...(body.signature_visible_fields !== undefined && { signature_visible_fields: body.signature_visible_fields }),
      ...(body.signature_html !== undefined     && { signature_html: body.signature_html }),
      ...(body.ui_language !== undefined        && { ui_language: body.ui_language }),
      ...(body.content_language !== undefined   && { content_language: body.content_language }),
    },
    create: {
      id: 1,
      gmail_user:         body.gmail_user ?? "",
      gmail_app_password: body.gmail_app_password ?? "",
      sender_name:        body.sender_name ?? "",
      first_name:         body.first_name ?? "Cantin",
      last_name:          body.last_name ?? "Bartel",
      display_name:       body.display_name ?? "Cantin Bartel",
      professional_title: body.professional_title ?? "Développeur web freelance",
      professional_title_en: body.professional_title_en ?? "",
      business_name:      body.business_name ?? "CB Web Artisan",
      contact_email:      body.contact_email ?? "cantinbartel.dev@gmail.com",
      phone:              body.phone ?? "",
      website_url:        body.website_url ?? "https://fr.cantinbartel.dev",
      linkedin_url:       body.linkedin_url ?? "https://www.linkedin.com/in/cantin-bartel",
      instagram_url:      body.instagram_url ?? "",
      facebook_url:       body.facebook_url ?? "",
      whatsapp_url:       body.whatsapp_url ?? "",
      github_url:         body.github_url ?? "https://github.com/cantin-b",
      signature_enabled:  body.signature_enabled ?? true,
      signature_logo_enabled: body.signature_logo_enabled ?? true,
      signature_custom_enabled: body.signature_custom_enabled ?? false,
      signature_visible_fields: body.signature_visible_fields ?? "name,title,phone,email,website,linkedin,instagram,facebook,whatsapp,github",
      signature_html:     body.signature_html ?? "",
      ui_language:        body.ui_language ?? "en",
      content_language:   body.content_language ?? "fr",
    },
  });

  return NextResponse.json(settings);
}
