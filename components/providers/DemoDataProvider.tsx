"use client";

import { useEffect, useInsertionEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { createDemoSeedData, type DemoActivityEvent, type DemoAppointment, type DemoDocument, type DemoProspect, type DemoState } from "@/lib/demoSeedData";
import { isAllowedStatusTransition } from "@/lib/constants";
import { normalizeDemoLanguage, writeDemoLanguagePreference } from "@/lib/demoLanguage";

export const DEMO_CURRENT_USER_STORAGE_KEY = "crm_demo_current_user_email";
export const DEMO_STATE_UPDATED_EVENT = "crm-demo-state-updated";

const DEMO_STATE_CHANNEL = "crm-freelance-demo-state";
const SYNCABLE_DEMO_FIELDS = [
  "prospects",
  "appointments",
  "activityEvents",
  "documents",
  "lists",
  "templates",
  "settings",
] as const;

const PROSPECT_STATUSES = ["new", "contacted", "callback", "not_interested", "no_answer"];
const HIGH_VALUE_STATUSES = ["proposal_sent", "client", "archived"];
const MANUAL_CONTACT_LIST_NAME = "Ajout contact";
const SORTABLE_PROSPECT_FIELDS = ["updated_at", "created_at", "name", "city", "owner", "status"] as const;
const STATUS_SORT_ORDER = [
  "new",
  "contacted",
  "callback",
  "no_answer",
  "not_interested",
  "proposal_sent",
  "client",
  "archived",
];
type ProspectSortKey = (typeof SORTABLE_PROSPECT_FIELDS)[number];
type SortDirection = "asc" | "desc";
const EXPORT_COLUMNS = [
  "id", "name", "category", "address", "postal_code", "city", "country",
  "phone", "email", "website", "gm_link", "rating", "reviews_count",
  "opening_hours", "owner", "facebook_url", "instagram_url", "linkedin_url",
  "status", "callback_at", "callback_note", "notes", "list_name",
  "created_at", "updated_at",
] as const;

let demoFetchInstalled = false;
let originalFetch: typeof window.fetch | null = null;
let activeDemoStateRef: MutableRefObject<DemoState> | null = null;
let activeDemoCommitRef: MutableRefObject<((nextState: DemoState, options?: { skipBroadcast?: boolean }) => void) | null> | null = null;

function cloneDemoValue<T>(value: T): T {
  if (value == null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getTabId(tabIdRef: MutableRefObject<string | null>) {
  if (!tabIdRef.current) tabIdRef.current = createTabId();
  return tabIdRef.current;
}

function readStoredCurrentUserEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_CURRENT_USER_STORAGE_KEY);
}

function storeCurrentUserEmail(email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_CURRENT_USER_STORAGE_KEY, email);
}

function clearStoredCurrentUserEmail() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_CURRENT_USER_STORAGE_KEY);
}

function createInitialDemoState() {
  const seed = createDemoSeedData();
  const storedEmail = readStoredCurrentUserEmail();
  const validStoredEmail = seed.credentials.some(
    credential => normalizeEmail(credential.email) === normalizeEmail(storedEmail ?? "")
  );

  if (storedEmail && !validStoredEmail) clearStoredCurrentUserEmail();
  return {
    ...seed,
    currentUserEmail: validStoredEmail ? storedEmail : null,
  };
}

function buildSyncPayload(state: DemoState): Partial<DemoState> {
  const payload: Partial<DemoState> = {};
  for (const field of SYNCABLE_DEMO_FIELDS) {
    (payload as Record<string, unknown>)[field] = cloneDemoValue(state[field]);
  }
  return payload;
}

function mergeSyncPayload(currentState: DemoState, payload: Partial<DemoState>): DemoState {
  const synced = SYNCABLE_DEMO_FIELDS.reduce((nextState, field) => {
    if (field in payload) {
      return { ...nextState, [field]: cloneDemoValue(payload[field]) };
    }
    return nextState;
  }, currentState);

  return {
    ...synced,
    currentUserEmail: currentState.currentUserEmail,
    credentials: currentState.credentials,
  };
}

function isIncomingStateNewer(message: { version?: number; updatedAt?: number }, currentVersion: number, currentUpdatedAt: number) {
  const incomingVersion = Number(message.version || 0);
  const incomingUpdatedAt = Number(message.updatedAt || 0);
  return incomingVersion > currentVersion || (incomingVersion === currentVersion && incomingUpdatedAt > currentUpdatedAt);
}

function broadcastState(
  channel: BroadcastChannel | null,
  {
    tabId,
    version,
    updatedAt,
    state,
  }: { tabId: string; version: number; updatedAt: number; state: DemoState }
) {
  if (!channel) return;
  channel.postMessage({
    type: "state-update",
    tabId,
    version,
    updatedAt,
    payload: buildSyncPayload(state),
  });
}

function notifyDemoStateUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DEMO_STATE_UPDATED_EVENT));
}

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [demoState, setDemoState] = useState(createInitialDemoState);
  const stateRef = useRef(demoState);
  const commitRef = useRef<((nextState: DemoState, options?: { skipBroadcast?: boolean }) => void) | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateVersionRef = useRef(0);
  const stateUpdatedAtRef = useRef(0);
  const tabIdRef = useRef<string | null>(null);

  useInsertionEffect(() => {
    stateRef.current = demoState;
    commitRef.current = (nextState, options = {}) => {
      stateRef.current = nextState;
      setDemoState(nextState);
      notifyDemoStateUpdated();

      if (!options.skipBroadcast) {
        stateVersionRef.current += 1;
        stateUpdatedAtRef.current = Date.now();
        broadcastState(channelRef.current, {
          tabId: getTabId(tabIdRef),
          version: stateVersionRef.current,
          updatedAt: stateUpdatedAtRef.current,
          state: nextState,
        });
      }
    };
    activeDemoStateRef = stateRef;
    activeDemoCommitRef = commitRef;
    installDemoFetch();
  }, [demoState]);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return undefined;

    const channel = new BroadcastChannel(DEMO_STATE_CHANNEL);
    const tabId = getTabId(tabIdRef);
    stateUpdatedAtRef.current = stateUpdatedAtRef.current || Date.now();
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as {
        type?: string;
        tabId?: string;
        targetTabId?: string;
        version?: number;
        updatedAt?: number;
        payload?: Partial<DemoState>;
      };
      if (!message || message.tabId === tabId) return;

      if (message.type === "request-state") {
        channel.postMessage({
          type: "state-response",
          tabId,
          targetTabId: message.tabId,
          version: stateVersionRef.current,
          updatedAt: stateUpdatedAtRef.current,
          payload: buildSyncPayload(stateRef.current),
        });
        return;
      }

      if (message.type === "state-response" && message.targetTabId !== tabId) return;
      if (message.type !== "state-update" && message.type !== "state-response") return;
      if (!message.payload || !isIncomingStateNewer(message, stateVersionRef.current, stateUpdatedAtRef.current)) return;

      stateVersionRef.current = Number(message.version || 0);
      stateUpdatedAtRef.current = Number(message.updatedAt || Date.now());
      commitRef.current?.(mergeSyncPayload(stateRef.current, message.payload), { skipBroadcast: true });
    };

    channel.addEventListener("message", handleMessage);
    channel.postMessage({
      type: "request-state",
      tabId,
      version: stateVersionRef.current,
      updatedAt: stateUpdatedAtRef.current,
    });

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, []);

  return children;
}

function installDemoFetch() {
  if (typeof window === "undefined" || demoFetchInstalled) return;
  originalFetch = window.fetch.bind(window);
  window.fetch = handleDemoFetch;
  demoFetchInstalled = true;
}

async function handleDemoFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = toUrl(input);
  if (!url || url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
    return originalFetch ? originalFetch(input, init) : fetch(input, init);
  }

  try {
    const requestMethod = input instanceof Request ? input.method : "GET";
    const method = String(init.method || requestMethod || "GET").toUpperCase();
    const body = parseBody(init.body);
    return await handleDemoRequest({
      state: activeDemoStateRef?.current,
      commit: activeDemoCommitRef?.current,
      method,
      body,
      url,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Something went wrong." }, 500);
  }
}

async function handleDemoRequest({
  state,
  commit,
  method,
  body,
  url,
}: {
  state?: DemoState;
  commit?: ((nextState: DemoState, options?: { skipBroadcast?: boolean }) => void) | null;
  method: string;
  body: unknown;
  url: URL;
}) {
  if (!state) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const path = url.pathname;

  if (path === "/api/auth/login" && method === "POST") return handleLogin(state, commit, body);
  if (path === "/api/auth/logout" && method === "POST") return handleLogout(state, commit);
  if (path === "/api/auth/forgot-password" && method === "POST") return jsonResponse({ success: true });
  if (path === "/api/auth/password" && method === "PATCH") return handlePasswordChange(state, commit, body);
  if (path === "/api/auth/me" && method === "GET") return handleMe(state);

  if (path === "/api/settings") {
    if (method === "GET") return jsonResponse(state.settings);
    if (method === "PATCH") return handleSettingsPatch(state, commit, body);
  }
  if (path === "/api/settings/test" && method === "POST") return jsonResponse({ ok: true });

  if (path === "/api/import" && method === "POST") {
    return jsonResponse({ error: "CSV import is disabled in this public demo. The sample prospects are preloaded." }, 403);
  }

  if (path === "/api/prospects/export" && method === "GET") return handleProspectExport(state, url);
  if (path === "/api/prospects") {
    if (method === "GET") return jsonResponse(listProspects(state, url, "prospects"));
    if (method === "PATCH") return handleBulkProspectStatus(state, commit, body);
    if (method === "DELETE") return handleBulkProspectDelete(state, commit, body);
  }
  if (path === "/api/clients") {
    if (method === "GET") return jsonResponse(listProspects(state, url, "clients"));
    if (method === "POST") return handleClientCreate(state, commit, body);
  }

  const prospectAppointmentMatch = /^\/api\/prospects\/(\d+)\/appointments$/.exec(path);
  if (prospectAppointmentMatch) {
    const prospectId = Number(prospectAppointmentMatch[1]);
    if (method === "GET") return jsonResponse(listProspectAppointments(state, prospectId));
    if (method === "POST") return handleAppointmentCreate(state, commit, prospectId, body);
  }

  const prospectDocumentMatch = /^\/api\/prospects\/(\d+)\/documents$/.exec(path);
  if (prospectDocumentMatch) {
    const prospectId = Number(prospectDocumentMatch[1]);
    if (method === "GET") return jsonResponse(listProspectDocuments(state, prospectId));
    if (method === "POST") return handleDocumentUpload(state, commit, prospectId, body);
  }

  const prospectMatch = /^\/api\/prospects\/(\d+)$/.exec(path);
  if (prospectMatch) {
    const prospectId = Number(prospectMatch[1]);
    if (method === "GET") return handleProspectGet(state, prospectId);
    if (method === "PATCH") return handleProspectPatch(state, commit, prospectId, body);
    if (method === "DELETE") return handleProspectDelete(state, commit, prospectId);
  }

  if (path === "/api/appointments" && method === "GET") return jsonResponse(listAppointmentsWithProspects(state));
  const appointmentMatch = /^\/api\/appointments\/(\d+)$/.exec(path);
  if (appointmentMatch) {
    const appointmentId = Number(appointmentMatch[1]);
    if (method === "PATCH") return handleAppointmentPatch(state, commit, appointmentId, body);
    if (method === "DELETE") return handleAppointmentDelete(state, commit, appointmentId);
  }

  if (path === "/api/calendar" && method === "GET") return jsonResponse({ events: buildCalendarEvents(state) });
  if (path === "/api/dashboard" && method === "GET") return jsonResponse(buildDashboardData(state));
  if (path === "/api/activity" && method === "POST") return handleActivityCreate(state, commit, body);

  if (path === "/api/lists") {
    if (method === "GET") return jsonResponse(listListsWithCounts(state));
    if (method === "POST") return jsonResponse({ error: "Creating new lists is disabled in this demo." }, 403);
  }
  const listMatch = /^\/api\/lists\/(\d+)$/.exec(path);
  if (listMatch) {
    const listId = Number(listMatch[1]);
    if (method === "PATCH") return handleListPatch(state, commit, listId, body);
    if (method === "DELETE") return handleListDelete(state, commit, listId);
  }

  if (path === "/api/templates") {
    if (method === "GET") return jsonResponse(listTemplates(state, url));
    if (method === "POST") return handleTemplateCreate(state, commit, body);
  }
  const templateMatch = /^\/api\/templates\/(\d+)$/.exec(path);
  if (templateMatch) {
    const templateId = Number(templateMatch[1]);
    if (method === "GET") return handleTemplateGet(state, templateId);
    if (method === "PATCH") return handleTemplatePatch(state, commit, templateId, body);
    if (method === "DELETE") return handleTemplateDelete(state, commit, templateId);
  }

  const documentFileMatch = /^\/api\/documents\/(\d+)\/(view|download)$/.exec(path);
  if (documentFileMatch && method === "GET") {
    return handleDocumentFile(state, Number(documentFileMatch[1]), documentFileMatch[2] as "view" | "download");
  }

  const documentMatch = /^\/api\/documents\/(\d+)$/.exec(path);
  if (documentMatch && method === "DELETE") return handleDocumentDelete(state, commit, Number(documentMatch[1]));

  if (path === "/api/email" && method === "POST") return handleEmailSend(state, commit, body);

  return jsonResponse({ error: "Not found." }, 404);
}

function handleLogin(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const email = normalizeEmail(payload.email);
  const password = String(payload.password ?? "");
  const credential = state.credentials.find(
    item => normalizeEmail(item.email) === email && item.password === password
  );

  if (!credential) return jsonResponse({ error: "Invalid email or password" }, 401);
  const nextState = { ...state, currentUserEmail: credential.email };
  storeCurrentUserEmail(credential.email);
  commit(nextState);
  return jsonResponse({ success: true, user: { email: credential.email, name: credential.label } });
}

function handleLogout(state: DemoState, commit: CommitFn) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  clearStoredCurrentUserEmail();
  commit({ ...state, currentUserEmail: null });
  return jsonResponse({ success: true });
}

function handleMe(state: DemoState) {
  if (!state.currentUserEmail) return jsonResponse({ error: "Unauthorized" }, 401);
  const credential = state.credentials.find(item => item.email === state.currentUserEmail);
  return jsonResponse({ user: { email: state.currentUserEmail, name: credential?.label ?? "User one" } });
}

function handlePasswordChange(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const currentPassword = String(payload.currentPassword ?? "");
  const newPassword = String(payload.newPassword ?? "");
  const currentEmail = normalizeEmail(state.currentUserEmail ?? "");
  const credential = state.credentials.find(item => normalizeEmail(item.email) === currentEmail) ?? state.credentials[0];
  if (!credential || credential.password !== currentPassword) {
    return jsonResponse({ error: "Current password is incorrect" }, 401);
  }
  if (!newPassword) return jsonResponse({ error: "Missing fields" }, 400);
  commit({
    ...state,
    credentials: state.credentials.map(item =>
      item.id === credential.id ? { ...item, password: newPassword } : item
    ),
  });
  return jsonResponse({ success: true });
}

function handleSettingsPatch(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const settings = { ...state.settings };
  const shouldStoreLanguagePreference = payload.persist_language_preference === true;
  for (const [key, value] of Object.entries(payload)) {
    if (key in settings) {
      (settings as Record<string, unknown>)[key] = value;
    }
  }
  const uiLanguage = normalizeDemoLanguage(settings.ui_language as string | undefined);
  if (shouldStoreLanguagePreference && uiLanguage) writeDemoLanguagePreference(uiLanguage);
  commit({ ...state, settings });
  return jsonResponse(settings);
}

function listProspects(state: DemoState, url: URL, source: "prospects" | "clients") {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const visibleListNames = new Set(state.lists.filter(list => list.is_visible).map(list => list.name));
  const sourceRows = state.prospects.filter(prospect => source === "clients"
    ? HIGH_VALUE_STATUSES.includes(prospect.status)
    : PROSPECT_STATUSES.includes(prospect.status) && Boolean(prospect.list_name && visibleListNames.has(prospect.list_name)));
  const base = sourceRows.filter(prospect => matchesProspectFilters(prospect, url, source));

  const { sortKey, sortDirection } = parseProspectSort(url);
  const sorted = sortProspects(base, sortKey, sortDirection);
  const start = (page - 1) * limit;
  const pageRows = sorted.slice(start, start + limit);
  const categories = distinctSorted(state.prospects.map(prospect => prospect.category).filter(isPresentString));
  const countries = distinctSorted(sourceRows.map(prospect => prospect.country).filter(isPresentString));
  const listNames = distinctSorted(state.lists.map(list => list.name).filter(isPresentString));

  return {
    prospects: pageRows,
    total: sorted.length,
    page,
    totalPages: Math.max(1, Math.ceil(sorted.length / limit)),
    navIds: sorted.map(prospect => prospect.id),
    categories,
    countries,
    listNames,
  };
}

function matchesProspectFilters(prospect: DemoProspect, url: URL, source: "prospects" | "clients") {
  const countries = csvParam(url, "country");
  const categories = csvParam(url, "category");
  const statuses = csvParam(url, "status");
  const search = normalizeSearch(url.searchParams.get("search") ?? "");
  const hasEmail = url.searchParams.get("hasEmail");
  const hasWebsite = url.searchParams.get("hasWebsite");
  const listName = url.searchParams.get("listName");

  if (countries.length && !countries.includes(prospect.country ?? "")) return false;
  if (categories.length && !categories.includes(prospect.category ?? "")) return false;
  if (statuses.length && !statuses.includes(prospect.status)) return false;
  if (source !== "clients" && hasEmail === "yes" && !prospect.email) return false;
  if (source !== "clients" && hasEmail === "no" && prospect.email) return false;
  if (source !== "clients" && hasWebsite === "yes" && !prospect.website) return false;
  if (source !== "clients" && hasWebsite === "no" && prospect.website) return false;
  if (source !== "clients" && listName && prospect.list_name !== listName) return false;
  if (search) {
    const haystack = normalizeSearch([
      prospect.name,
      prospect.city,
      prospect.owner,
      prospect.category,
      prospect.phone,
      prospect.email,
    ].filter(Boolean).join(" "));
    if (!haystack.includes(search)) return false;
  }
  return true;
}

function parseProspectSort(url: URL): { sortKey: ProspectSortKey; sortDirection: SortDirection } {
  const requestedSort = url.searchParams.get("sort");
  const requestedDirection = url.searchParams.get("direction");
  const sortKey = SORTABLE_PROSPECT_FIELDS.includes(requestedSort as ProspectSortKey)
    ? requestedSort as ProspectSortKey
    : "updated_at";
  const sortDirection = requestedDirection === "asc" || requestedDirection === "desc"
    ? requestedDirection
    : "desc";
  return { sortKey, sortDirection };
}

function compareNullableText(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function compareStatus(a: string, b: string) {
  const aIndex = STATUS_SORT_ORDER.indexOf(a);
  const bIndex = STATUS_SORT_ORDER.indexOf(b);
  return (aIndex === -1 ? STATUS_SORT_ORDER.length : aIndex) -
    (bIndex === -1 ? STATUS_SORT_ORDER.length : bIndex);
}

function sortProspects(rows: DemoProspect[], sortKey: ProspectSortKey, sortDirection: SortDirection) {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (sortKey === "updated_at" || sortKey === "created_at") {
      diff = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
    } else if (sortKey === "status") {
      diff = compareStatus(a.status, b.status);
    } else {
      diff = compareNullableText(a[sortKey], b[sortKey]);
    }
    const directionalDiff = sortDirection === "asc" ? diff : -diff;
    return directionalDiff || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() || b.id - a.id;
  });
}

function handleProspectGet(state: DemoState, prospectId: number) {
  const prospect = state.prospects.find(item => item.id === prospectId);
  if (!prospect) return jsonResponse({ error: "Not found." }, 404);
  return jsonResponse(prospect);
}

function handleProspectPatch(state: DemoState, commit: CommitFn, prospectId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const prospect = state.prospects.find(item => item.id === prospectId);
  if (!prospect) return jsonResponse({ error: "Not found." }, 404);
  const payload = asRecord(body);
  if (typeof payload.status === "string" && !isAllowedStatusTransition(prospect.status, payload.status)) {
    return jsonResponse({ error: "This status transition is not allowed." }, 400);
  }
  const nextProspect = {
    ...prospect,
    ...payload,
    id: prospect.id,
    uuid: prospect.uuid,
    updated_at: new Date().toISOString(),
  } as DemoProspect;
  const nextState = {
    ...state,
    prospects: state.prospects.map(item => item.id === prospectId ? nextProspect : item),
  };
  commit(nextState);
  return jsonResponse(nextProspect);
}

function handleProspectDelete(state: DemoState, commit: CommitFn, prospectId: number) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  commit(removeProspectIds(state, [prospectId]));
  return jsonResponse({ ok: true });
}

function handleBulkProspectStatus(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const ids = sanitizeIds(payload.ids);
  const status = typeof payload.status === "string" ? payload.status : "";
  if (!ids.length || !status) return jsonResponse({ error: "ids and status are required." }, 400);
  const invalidProspect = state.prospects.find(prospect =>
    ids.includes(prospect.id) && !isAllowedStatusTransition(prospect.status, status)
  );
  if (invalidProspect) {
    return jsonResponse({ error: "This status transition is not allowed." }, 400);
  }
  const now = new Date().toISOString();
  commit({
    ...state,
    prospects: state.prospects.map(prospect =>
      ids.includes(prospect.id) ? { ...prospect, status, updated_at: now } : prospect
    ),
  });
  return jsonResponse({ ok: true, updated: ids.length });
}

function handleBulkProspectDelete(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const ids = sanitizeIds(asRecord(body).ids);
  if (!ids.length) return jsonResponse({ error: "ids are required." }, 400);
  commit(removeProspectIds(state, ids));
  return jsonResponse({ ok: true, deleted: ids.length });
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function handleClientCreate(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!name) return jsonResponse({ error: "Client name is required." }, 400);
  if (status !== "proposal_sent" && status !== "client") {
    return jsonResponse({ error: "Initial status must be proposal_sent or client." }, 400);
  }

  const now = new Date().toISOString();
  const id = nextId(state.prospects);
  const client: DemoProspect = {
    id,
    uuid: `manual-client-${id}-${Date.now()}`,
    name,
    category: cleanOptionalString(payload.category),
    address: cleanOptionalString(payload.address),
    postal_code: cleanOptionalString(payload.postal_code),
    city: cleanOptionalString(payload.city),
    country: cleanOptionalString(payload.country),
    phone: cleanOptionalString(payload.phone),
    email: cleanOptionalString(payload.email),
    website: cleanOptionalString(payload.website),
    gm_link: null,
    rating: null,
    reviews_count: null,
    opening_hours: null,
    owner: cleanOptionalString(payload.owner),
    facebook_url: null,
    instagram_url: null,
    linkedin_url: null,
    status,
    callback_at: null,
    callback_note: null,
    notes: cleanOptionalString(payload.notes),
    list_name: MANUAL_CONTACT_LIST_NAME,
    created_at: now,
    updated_at: now,
  };

  commit({ ...state, prospects: [client, ...state.prospects] });
  return jsonResponse(client, 201);
}

function removeProspectIds(state: DemoState, ids: number[]): DemoState {
  const idSet = new Set(ids);
  return {
    ...state,
    prospects: state.prospects.filter(prospect => !idSet.has(prospect.id)),
    appointments: state.appointments.filter(appt => !idSet.has(appt.prospect_id)),
    activityEvents: state.activityEvents.filter(event => !idSet.has(event.prospect_id)),
    documents: state.documents.filter(doc => !idSet.has(doc.prospect_id)),
  };
}

function handleProspectExport(state: DemoState, url: URL) {
  const ids = csvParam(url, "ids").map(Number).filter(Number.isFinite);
  const source = url.searchParams.get("source") === "clients" ? "clients" : "prospects";
  const rows = ids.length
    ? state.prospects.filter(prospect => ids.includes(prospect.id))
    : listProspects(state, url, source).prospects;
  const csv = toCsv(rows as unknown as Record<string, unknown>[]);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"prospects_demo_${new Date().toISOString().slice(0, 10)}.csv\"`,
    },
  });
}

function listProspectAppointments(state: DemoState, prospectId: number) {
  return state.appointments
    .filter(appt => appt.prospect_id === prospectId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function listAppointmentsWithProspects(state: DemoState) {
  return state.appointments
    .map(appt => {
      const prospect = state.prospects.find(item => item.id === appt.prospect_id);
      if (!prospect) return null;
      return {
        ...appt,
        prospect: {
          id: prospect.id,
          name: prospect.name,
          city: prospect.city,
          phone: prospect.phone,
          status: prospect.status,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());
}

function handleAppointmentCreate(state: DemoState, commit: CommitFn, prospectId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  if (!state.prospects.some(prospect => prospect.id === prospectId)) {
    return jsonResponse({ error: "Prospect not found." }, 404);
  }
  const payload = normalizeAppointmentPayload(body);
  if ("error" in payload) return jsonResponse({ error: payload.error }, 400);
  const conflict = findAppointmentConflict(state, payload.date, payload.duration);
  if (conflict) return jsonResponse({ error: "Conflict", conflictWith: conflict }, 409);
  const appointment: DemoAppointment = {
    id: nextId(state.appointments),
    prospect_id: prospectId,
    title: payload.title,
    date: payload.date.toISOString(),
    duration: payload.duration,
    type: payload.type,
    meet_link: payload.meet_link,
    notes: payload.notes,
    status: "scheduled",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const warnings = findCallbackWarnings(state, payload.date, payload.duration, prospectId);
  commit({ ...state, appointments: [...state.appointments, appointment] });
  return jsonResponse({ appointment, warnings }, 201);
}

function handleAppointmentPatch(state: DemoState, commit: CommitFn, appointmentId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const current = state.appointments.find(appt => appt.id === appointmentId);
  if (!current) return jsonResponse({ error: "Appointment not found." }, 404);
  const payload = asRecord(body);
  const next: DemoAppointment = { ...current, updated_at: new Date().toISOString() };
  if ("title" in payload) next.title = String(payload.title || "").trim();
  if ("type" in payload) next.type = String(payload.type);
  if ("status" in payload) next.status = String(payload.status);
  if ("meet_link" in payload) next.meet_link = payload.meet_link ? String(payload.meet_link).trim() : null;
  if ("notes" in payload) next.notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  if ("date" in payload) next.date = new Date(String(payload.date)).toISOString();
  if ("duration" in payload) next.duration = Number(payload.duration);

  if (next.status === "scheduled" && (next.date !== current.date || next.duration !== current.duration)) {
    const conflict = findAppointmentConflict(state, new Date(next.date), next.duration, appointmentId);
    if (conflict) return jsonResponse({ error: "Conflict", conflictWith: conflict }, 409);
  }

  const warnings = next.status === "scheduled"
    ? findCallbackWarnings(state, new Date(next.date), next.duration, next.prospect_id)
    : [];
  commit({
    ...state,
    appointments: state.appointments.map(appt => appt.id === appointmentId ? next : appt),
  });
  return jsonResponse({ appointment: next, warnings });
}

function handleAppointmentDelete(state: DemoState, commit: CommitFn, appointmentId: number) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  commit({ ...state, appointments: state.appointments.filter(appt => appt.id !== appointmentId) });
  return jsonResponse({ success: true });
}

function buildCalendarEvents(state: DemoState) {
  const appointmentEvents = state.appointments
    .filter(appt => appt.status === "scheduled")
    .map(appt => {
      const prospect = state.prospects.find(item => item.id === appt.prospect_id);
      if (!prospect) return null;
      const start = new Date(appt.date);
      return {
        id: `appointment-${appt.id}`,
        title: `${appt.title} — ${prospect.name}`,
        start: start.toISOString(),
        end: new Date(start.getTime() + appt.duration * 60 * 1000).toISOString(),
        type: "appointment" as const,
        meta: {
          appointmentId: appt.id,
          prospectId: prospect.id,
          prospectName: prospect.name,
          city: prospect.city,
          phone: prospect.phone,
          appointmentType: appt.type,
          meetLink: appt.meet_link,
          notes: appt.notes,
          duration: appt.duration,
        },
      };
    })
    .filter(Boolean);

  const callbackEvents = state.prospects
    .filter(prospect => Boolean(prospect.callback_at))
    .map(prospect => {
      const start = new Date(prospect.callback_at!);
      return {
        id: `callback-${prospect.id}`,
        title: `Call ${prospect.name}`,
        start: start.toISOString(),
        end: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        type: "callback" as const,
        meta: {
          prospectId: prospect.id,
          prospectName: prospect.name,
          city: prospect.city,
          phone: prospect.phone,
          callbackNote: prospect.callback_note,
        },
      };
    });

  return [...appointmentEvents, ...callbackEvents];
}

function buildDashboardData(state: DemoState) {
  const statusCounts = STATUS_SORT_ORDER.reduce<Record<string, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  for (const prospect of state.prospects) {
    statusCounts[prospect.status] = (statusCounts[prospect.status] ?? 0) + 1;
  }

  const totalProspects = state.prospects.length;
  const convertedClients = (statusCounts.client ?? 0) + (statusCounts.archived ?? 0);
  const proposalPipeline = (statusCounts.proposal_sent ?? 0) + convertedClients;
  const contactedProspects = totalProspects - (statusCounts.new ?? 0);
  const callsMade = state.activityEvents.filter(event => event.type === "call").length;
  const emailsSent = state.activityEvents.filter(event => event.type === "email").length;
  const conversionRate = totalProspects ? Math.round((convertedClients / totalProspects) * 100) : 0;

  return {
    summary: {
      callsMade,
      emailsSent,
      conversionRate,
      activeOpportunities: statusCounts.proposal_sent ?? 0,
      totalProspects,
      convertedClients,
    },
    activitySeries: buildActivitySeries(state.activityEvents),
    funnel: [
      { key: "leads", count: totalProspects, rate: 100 },
      { key: "contacted", count: contactedProspects, rate: percentOf(contactedProspects, totalProspects) },
      { key: "proposal_sent", count: proposalPipeline, rate: percentOf(proposalPipeline, totalProspects) },
      { key: "clients", count: convertedClients, rate: percentOf(convertedClients, totalProspects) },
    ],
    pipeline: STATUS_SORT_ORDER
      .map(status => ({ status, count: statusCounts[status] ?? 0, rate: percentOf(statusCounts[status] ?? 0, totalProspects) }))
      .filter(item => item.count > 0),
    followUps: buildDashboardFollowUps(state),
  };
}

function buildActivitySeries(activityEvents: DemoActivityEvent[]) {
  const parsedDates = activityEvents
    .map(event => new Date(event.created_at))
    .filter(date => Number.isFinite(date.getTime()));
  const latest = parsedDates.length
    ? new Date(Math.max(...parsedDates.map(date => date.getTime())))
    : new Date();
  const end = startOfWeek(latest);
  const weeks = Array.from({ length: 8 }, (_, index) => addDays(end, (index - 7) * 7));

  return weeks.map(weekStart => {
    const weekEnd = addDays(weekStart, 7).getTime();
    const calls = activityEvents.filter(event => {
      const timestamp = new Date(event.created_at).getTime();
      return event.type === "call" && timestamp >= weekStart.getTime() && timestamp < weekEnd;
    }).length;
    const emails = activityEvents.filter(event => {
      const timestamp = new Date(event.created_at).getTime();
      return event.type === "email" && timestamp >= weekStart.getTime() && timestamp < weekEnd;
    }).length;
    return {
      weekStart: weekStart.toISOString(),
      calls,
      emails,
      total: calls + emails,
    };
  });
}

function buildDashboardFollowUps(state: DemoState) {
  const now = Date.now();
  const callbackItems = state.prospects
    .filter(prospect => prospect.callback_at && new Date(prospect.callback_at).getTime() >= now)
    .map(prospect => ({
      id: `callback-${prospect.id}`,
      type: "callback",
      date: prospect.callback_at!,
      title: "Callback",
      prospectId: prospect.id,
      prospectName: prospect.name,
      status: prospect.status,
    }));
  const appointmentItems = state.appointments
    .filter(appointment => appointment.status === "scheduled" && new Date(appointment.date).getTime() >= now)
    .map(appointment => {
      const prospect = state.prospects.find(item => item.id === appointment.prospect_id);
      return {
        id: `appointment-${appointment.id}`,
        type: "appointment",
        date: appointment.date,
        title: appointment.title,
        prospectId: appointment.prospect_id,
        prospectName: prospect?.name ?? "Unknown",
        status: prospect?.status ?? "",
      };
    });

  return [...callbackItems, ...appointmentItems]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);
}

function startOfWeek(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() - day + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function percentOf(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function listProspectDocuments(state: DemoState, prospectId: number) {
  return state.documents
    .filter(doc => doc.prospect_id === prospectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function handleDocumentUpload(state: DemoState, commit: CommitFn, prospectId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  if (!(body instanceof FormData)) return jsonResponse({ error: "No file provided." }, 400);
  const file = body.get("file");
  const category = body.get("category");
  if (!(file instanceof File)) return jsonResponse({ error: "No file provided." }, 400);
  if (typeof category !== "string" || !["form", "quote", "invoice", "other"].includes(category)) {
    return jsonResponse({ error: "Invalid category." }, 400);
  }
  if (file.size > 10 * 1024 * 1024) return jsonResponse({ error: "File exceeds the 10 MB limit." }, 400);

  const existing = state.documents.find(doc => doc.prospect_id === prospectId && doc.filename === file.name);
  const document: DemoDocument = {
    id: existing?.id ?? nextId(state.documents),
    prospect_id: prospectId,
    filename: file.name,
    filepath: `demo://${prospectId}/${file.name}`,
    category,
    size: file.size,
    created_at: new Date().toISOString(),
    data_url: await fileToDataUrl(file),
    mime_type: file.type || "application/octet-stream",
  };
  commit({
    ...state,
    documents: [document, ...state.documents.filter(doc => doc.id !== document.id)],
  });
  return jsonResponse(document);
}

function handleDocumentDelete(state: DemoState, commit: CommitFn, documentId: number) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  commit({ ...state, documents: state.documents.filter(doc => doc.id !== documentId) });
  return jsonResponse({ success: true });
}

async function handleDocumentFile(state: DemoState, documentId: number, mode: "view" | "download") {
  const document = state.documents.find(doc => doc.id === documentId);
  if (!document?.data_url) return jsonResponse({ error: "Document not found." }, 404);
  const response = await fetch(document.data_url);
  const blob = await response.blob();
  const disposition = mode === "download" ? "attachment" : "inline";
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": document.mime_type || blob.type || "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${document.filename}"`,
    },
  });
}

function listListsWithCounts(state: DemoState) {
  return [...state.lists]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(list => ({
      ...list,
      prospectCount: state.prospects.filter(prospect => prospect.list_name === list.name).length,
    }));
}

function handleListPatch(state: DemoState, commit: CommitFn, listId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const list = state.lists.find(item => item.id === listId);
  if (!list) return jsonResponse({ error: "List not found." }, 404);

  let nextName = list.name;
  if ("name" in payload) {
    if (typeof payload.name !== "string") return jsonResponse({ error: "List name must be a string." }, 400);
    nextName = payload.name.trim();
    if (!nextName) return jsonResponse({ error: "List name is required." }, 400);
    const duplicate = state.lists.some(
      item => item.id !== listId && item.name.trim().toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) return jsonResponse({ error: "A list with this name already exists." }, 409);
  }

  let nextVisibility = list.is_visible;
  if ("is_visible" in payload) {
    if (typeof payload.is_visible !== "boolean") return jsonResponse({ error: "is_visible must be a boolean." }, 400);
    nextVisibility = payload.is_visible;
  }

  if (!("name" in payload) && !("is_visible" in payload)) {
    return jsonResponse({ error: "No supported list fields provided." }, 400);
  }

  const updated = { ...list, name: nextName, is_visible: nextVisibility };
  commit({
    ...state,
    lists: state.lists.map(item => item.id === listId ? updated : item),
    prospects: state.prospects.map(prospect => (
      prospect.list_name === list.name ? { ...prospect, list_name: nextName } : prospect
    )),
  });
  return jsonResponse(updated);
}

function handleListDelete(state: DemoState, commit: CommitFn, listId: number) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const list = state.lists.find(item => item.id === listId);
  if (!list) return jsonResponse({ error: "List not found." }, 404);
  const removableIds = state.prospects
    .filter(prospect => prospect.list_name === list.name && !HIGH_VALUE_STATUSES.includes(prospect.status))
    .map(prospect => prospect.id);
  commit({
    ...removeProspectIds(state, removableIds),
    lists: state.lists.filter(item => item.id !== listId),
  });
  return jsonResponse({ ok: true });
}

function listTemplates(state: DemoState, url: URL) {
  const language = url.searchParams.get("language");
  return [...state.templates]
    .filter(template => !language || template.language === language)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function handleTemplateGet(state: DemoState, templateId: number) {
  const template = state.templates.find(item => item.id === templateId);
  if (!template) return jsonResponse({ error: "Not found." }, 404);
  return jsonResponse(template);
}

function handleTemplateCreate(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const name = String(payload.name ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  if (!name || !subject) return jsonResponse({ error: "Name and subject are required." }, 400);
  const template = {
    id: nextId(state.templates),
    name,
    subject,
    body: String(payload.body ?? ""),
    category: typeof payload.category === "string" ? payload.category : null,
    language: payload.language === "en" ? "en" : "fr",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  commit({ ...state, templates: [...state.templates, template] });
  return jsonResponse(template, 201);
}

function handleTemplatePatch(state: DemoState, commit: CommitFn, templateId: number, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const template = state.templates.find(item => item.id === templateId);
  if (!template) return jsonResponse({ error: "Not found." }, 404);
  const payload = asRecord(body);
  const updated = {
    ...template,
    ...(payload.name !== undefined && { name: String(payload.name).trim() }),
    ...(payload.subject !== undefined && { subject: String(payload.subject).trim() }),
    ...(payload.body !== undefined && { body: String(payload.body) }),
    ...(payload.category !== undefined && { category: typeof payload.category === "string" ? payload.category : null }),
    ...(payload.language !== undefined && { language: payload.language === "en" ? "en" : "fr" }),
    updated_at: new Date().toISOString(),
  };
  commit({ ...state, templates: state.templates.map(item => item.id === templateId ? updated : item) });
  return jsonResponse(updated);
}

function handleTemplateDelete(state: DemoState, commit: CommitFn, templateId: number) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  commit({ ...state, templates: state.templates.filter(item => item.id !== templateId) });
  return jsonResponse({ ok: true });
}

function handleEmailSend(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  if (!(body instanceof FormData)) return jsonResponse({ error: "Invalid email payload." }, 400);
  const prospectId = Number(body.get("prospectId"));
  const to = String(body.get("to") ?? "").trim();
  const subject = String(body.get("subject") ?? "").trim();
  if (!to || !subject) return jsonResponse({ error: "Recipient and subject are required." }, 400);
  const now = new Date().toISOString();
  const activityEvent = createActivityEvent(state, prospectId, "email", now);
  commit({
    ...state,
    activityEvents: activityEvent ? [activityEvent, ...state.activityEvents] : state.activityEvents,
    prospects: state.prospects.map(prospect =>
      prospect.id === prospectId && prospect.status === "new"
        ? { ...prospect, status: "contacted", updated_at: now }
        : prospect
    ),
  });
  return jsonResponse({ ok: true });
}

function handleActivityCreate(state: DemoState, commit: CommitFn, body: unknown) {
  if (!commit) return jsonResponse({ error: "Demo state is not ready." }, 503);
  const payload = asRecord(body);
  const prospectId = Number(payload.prospectId);
  const type = payload.type === "email" ? "email" : "call";
  const activityEvent = createActivityEvent(state, prospectId, type);
  if (!activityEvent) return jsonResponse({ error: "Prospect not found." }, 404);
  commit({ ...state, activityEvents: [activityEvent, ...state.activityEvents] });
  return jsonResponse(activityEvent, 201);
}

function createActivityEvent(
  state: DemoState,
  prospectId: number,
  type: "call" | "email",
  createdAt = new Date().toISOString()
): DemoActivityEvent | null {
  if (!Number.isFinite(prospectId) || !state.prospects.some(prospect => prospect.id === prospectId)) return null;
  return {
    id: nextId(state.activityEvents),
    prospect_id: prospectId,
    type,
    created_at: createdAt,
  };
}

function normalizeAppointmentPayload(body: unknown):
  | { title: string; date: Date; duration: number; type: string; meet_link: string | null; notes: string | null }
  | { error: string } {
  const payload = asRecord(body);
  const title = String(payload.title ?? "").trim();
  if (!title) return { error: "Title is required." };
  const date = new Date(String(payload.date ?? ""));
  if (Number.isNaN(date.getTime())) return { error: "Invalid date." };
  const duration = Number(payload.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration % 15 !== 0) {
    return { error: "Duration must be a multiple of 15." };
  }
  const type = String(payload.type ?? "");
  if (!["call", "visio"].includes(type)) return { error: "Invalid type." };
  const meet_link = payload.meet_link ? String(payload.meet_link).trim() : null;
  const notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  return { title, date, duration, type, meet_link, notes };
}

function findAppointmentConflict(state: DemoState, start: Date, duration: number, ignoreAppointmentId?: number) {
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const conflict = state.appointments.find(appt => {
    if (appt.id === ignoreAppointmentId || appt.status !== "scheduled") return false;
    const apptStart = new Date(appt.date);
    const apptEnd = new Date(apptStart.getTime() + appt.duration * 60 * 1000);
    return start < apptEnd && end > apptStart;
  });
  if (!conflict) return null;
  return {
    id: conflict.id,
    title: conflict.title,
    date: conflict.date,
    duration: conflict.duration,
  };
}

function findCallbackWarnings(state: DemoState, start: Date, duration: number, prospectId: number) {
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return state.prospects
    .filter(prospect => prospect.id !== prospectId && prospect.callback_at)
    .filter(prospect => {
      const callbackAt = new Date(prospect.callback_at!);
      return callbackAt >= start && callbackAt <= end;
    })
    .map(prospect => ({
      prospectId: prospect.id,
      prospectName: prospect.name,
      callback_at: prospect.callback_at!,
    }));
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

type CommitFn = ((nextState: DemoState, options?: { skipBroadcast?: boolean }) => void) | null | undefined;

function toUrl(input: RequestInfo | URL) {
  try {
    if (input instanceof URL) return input;
    if (input instanceof Request) return new URL(input.url);
    return new URL(String(input), window.location.origin);
  } catch {
    return null;
  }
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (!body) return null;
  if (body instanceof FormData) return body;
  if (body instanceof URLSearchParams) return Object.fromEntries(body.entries());
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function csvParam(url: URL, key: string) {
  return (url.searchParams.get(key) ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function sanitizeIds(value: unknown) {
  return Array.isArray(value)
    ? value.map(Number).filter(Number.isFinite)
    : [];
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function distinctSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function nextId(items: { id: number }[]) {
  return Math.max(0, ...items.map(item => item.id)) + 1;
}

function escapeCsvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Record<string, unknown>[]) {
  return [
    EXPORT_COLUMNS.join(","),
    ...rows.map(row => EXPORT_COLUMNS.map(column => escapeCsvCell(row[column])).join(",")),
  ].join("\r\n");
}
