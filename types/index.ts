export interface Document {
  id: number;
  prospect_id: number;
  filename: string;
  filepath: string;
  category: string;
  size: number;
  created_at: string;
  data_url?: string;
  mime_type?: string;
}

export interface Appointment {
  id: number;
  prospect_id: number;
  title: string;
  date: string;        // ISO string (serialised from DateTime)
  duration: number;    // minutes
  type: string;        // "call" | "visio"
  meet_link: string | null;
  notes: string | null;
  status: string;      // "scheduled" | "completed" | "cancelled"
  created_at: string;
  updated_at: string;
}

export type AppointmentWithProspect = Appointment & {
  prospect: {
    id: number;
    name: string;
    city: string | null;
    phone: string | null;
    status: string;
  };
};

export interface Prospect {
  id: number;
  uuid: string;
  name: string;
  category: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gm_link: string | null;
  rating: number | null;
  reviews_count: number | null;
  opening_hours: string | null;
  owner: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  status: string;
  callback_at: Date | null;
  callback_note: string | null;
  notes: string | null;
  list_name: string | null;
  documents?: Document[];
  appointments?: Appointment[];
  created_at: Date;
  updated_at: Date;
}

export type CalendarEventType = "appointment" | "callback";

export type CalendarEventMeta = {
  prospectId: number;
  prospectName: string;
  city: string | null;
  phone: string | null;
  // appointment only
  appointmentId?: number;
  appointmentType?: string;
  meetLink?: string | null;
  notes?: string | null;
  duration?: number;
  // callback only
  callbackNote?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string; // ISO string from the API
  end: string;   // ISO string from the API
  type: CalendarEventType;
  meta: CalendarEventMeta;
};

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  language: string; // "fr" | "en"
  created_at: Date;
  updated_at: Date;
}

export interface List {
  id: number;
  name: string;
  is_visible: boolean;
  created_at: Date;
}

export interface Settings {
  id: number;
  gmail_user: string;
  gmail_app_password: string;
  sender_name: string;
  first_name: string;
  last_name: string;
  display_name: string;
  professional_title: string;
  professional_title_en: string;
  business_name: string;
  contact_email: string;
  phone: string;
  website_url: string;
  linkedin_url: string;
  instagram_url: string;
  facebook_url: string;
  whatsapp_url: string;
  github_url: string;
  signature_enabled: boolean;
  signature_logo_enabled: boolean;
  signature_custom_enabled: boolean;
  signature_visible_fields: string;
  signature_html: string;
  ui_language: string; // "en" | "fr"
  content_language: string; // "en" | "fr"
  password_hash: string;
}
