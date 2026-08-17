// ------------------------------------------------------------------------
// Camada Google — isolada do resto da app (secção 9.2 do documento de
// requisitos). Tudo aqui é APENAS LEITURA: nunca cria, altera ou apaga
// nada no Google Calendar do utilizador (RN-04, decisão fechada).
//
// Fluxo usado: Google Identity Services (GIS), sem backend, sem PKCE
// necessário porque não há troca de "authorization code" — pedimos
// diretamente um token de acesso via initTokenClient (fluxo implícito
// suportado oficialmente pela GIS para apps 100% cliente). O token dura
// cerca de 1 hora; ver secção 2.1 do documento de requisitos para as
// consequências aceites desta escolha (sem sincronização em segundo
// plano com a app fechada).
// ------------------------------------------------------------------------
import { db } from '../db/schema.js';
import { uid } from '../lib/id.js';
import { getEffectiveClientId, GOOGLE_SCOPES, googleIntegrationEnabled } from './config.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CONSUMER_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'yahoo.com']);

let gisLoadPromise = null;
function loadGis() {
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google);
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Não foi possível carregar o Google Identity Services. Verifica a ligação à Internet.'));
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

function requestToken({ hint = '', promptMode = 'consent select_account' } = {}) {
  return loadGis().then((google) => new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: getEffectiveClientId(),
      scope: GOOGLE_SCOPES,
      hint,
      prompt: promptMode,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response);
        }
      },
      error_callback: (err) => reject(new Error(err?.message || 'Autorização Google cancelada ou falhada.')),
    });
    client.requestAccessToken();
  }));
}

async function fetchUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Não foi possível obter a identidade da conta Google.');
  return res.json();
}

function guessAreaSlugFromEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return CONSUMER_DOMAINS.has(domain) ? 'pessoal' : 'best';
}

// ---------- Contas ----------

export async function getAccounts() {
  return db.accounts.toArray();
}

/**
 * Abre o consentimento Google e liga uma nova conta.
 * `preferredAreaId` é opcional — se omitido, é sugerida uma área pelo domínio do e-mail.
 */
export async function connectAccount(areas, preferredAreaId = null) {
  if (!googleIntegrationEnabled()) {
    throw new Error('A integração com o Google ainda não está configurada nesta instalação (falta o Client ID em js/google/config.js).');
  }
  const tokenResponse = await requestToken();
  const info = await fetchUserInfo(tokenResponse.access_token);

  const existing = await db.accounts.where('email').equals(info.email).first();
  const slug = guessAreaSlugFromEmail(info.email);
  const suggestedArea = areas.find((a) => a.colorToken === slug) || areas[0];
  const areaId = preferredAreaId || existing?.areaId || suggestedArea?.id;

  const account = {
    id: existing?.id || uid(),
    email: info.email,
    displayName: info.name || info.email,
    areaId,
    status: 'connected',
    scopes: GOOGLE_SCOPES.split(' '),
    lastSyncAt: null,
    syncToken: null,
  };

  const expiresAt = Date.now() + (tokenResponse.expires_in || 3600) * 1000;

  await db.transaction('rw', db.accounts, db.tokens, async () => {
    await db.accounts.put(account);
    await db.tokens.put({ accountId: account.id, accessToken: tokenResponse.access_token, expiresAt });
  });

  await listCalendars(account.id);
  return account;
}

export async function setAccountArea(accountId, areaId) {
  await db.accounts.update(accountId, { areaId });
}

/** Desliga uma conta: revoga o token e apaga tokens, calendários e eventos (RF-83, RN-06). */
export async function disconnectAccount(accountId) {
  const token = await db.tokens.get(accountId);
  if (token?.accessToken && window.google?.accounts?.oauth2?.revoke) {
    try {
      await new Promise((resolve) => window.google.accounts.oauth2.revoke(token.accessToken, resolve));
    } catch {
      /* revogação do lado do Google é best-effort; limpamos localmente de qualquer forma */
    }
  }
  const calendarIds = (await db.calendars.where('accountId').equals(accountId).toArray()).map((c) => c.id);
  const eventIds = (await db.events.where('accountId').equals(accountId).toArray()).map((e) => e.id);

  await db.transaction('rw', db.accounts, db.tokens, db.calendars, db.events, db.tasks, async () => {
    if (eventIds.length) {
      await db.tasks.where('sourceEventId').anyOf(eventIds).modify({ sourceEventId: null });
    }
    await db.events.where('accountId').equals(accountId).delete();
    await db.calendars.where('accountId').equals(accountId).delete();
    await db.tokens.delete(accountId);
    await db.accounts.delete(accountId);
  });
}

/** Garante um token válido; devolve null e marca a conta se for preciso reautorizar (RF-98/99). */
export async function ensureToken(accountId) {
  const token = await db.tokens.get(accountId);
  if (token && token.expiresAt - Date.now() > 60_000) return token.accessToken;

  const account = await db.accounts.get(accountId);
  if (!account) return null;
  try {
    const response = await requestToken({ hint: account.email, promptMode: '' });
    const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;
    await db.tokens.put({ accountId, accessToken: response.access_token, expiresAt });
    if (account.status !== 'connected') await db.accounts.update(accountId, { status: 'connected' });
    return response.access_token;
  } catch {
    await db.accounts.update(accountId, { status: 'needs_reauth' });
    return null;
  }
}

/** Reautorização explícita, pedida pelo utilizador a partir do aviso na interface. */
export async function reconnectAccount(accountId) {
  const account = await db.accounts.get(accountId);
  if (!account) return;
  const response = await requestToken({ hint: account.email, promptMode: 'consent' });
  const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;
  await db.tokens.put({ accountId, accessToken: response.access_token, expiresAt });
  await db.accounts.update(accountId, { status: 'connected' });
}

// ---------- Calendários ----------

export async function listCalendars(accountId) {
  const token = await ensureToken(accountId);
  if (!token) return [];
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Não foi possível obter a lista de calendários.');
  const data = await res.json();
  const calendars = (data.items || []).map((c) => ({
    id: c.id, accountId, name: c.summaryOverride || c.summary, color: c.backgroundColor || null,
    isVisible: c.primary ? true : (c.selected ?? true),
  }));
  await db.transaction('rw', db.calendars, async () => {
    for (const cal of calendars) await db.calendars.put(cal);
  });
  return calendars;
}

export async function getCalendarsForAccount(accountId) {
  return db.calendars.where('accountId').equals(accountId).toArray();
}

export async function setCalendarVisibility(id, isVisible) {
  await db.calendars.update(id, { isVisible });
}

// ---------- Eventos (cache apenas leitura) ----------

async function fetchEventsPage(calendarId, token, params, pageToken) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res;
}

/** Sincroniza os eventos de um calendário, incremental por syncToken quando possível (RF-91). */
async function syncCalendar(calendar, token, windowStartIso, windowEndIso) {
  let pageToken;
  let nextSyncToken = null;
  const seen = [];
  let useIncremental = Boolean(calendar.syncToken);

  do {
    const params = useIncremental
      ? { syncToken: calendar.syncToken, singleEvents: 'true' }
      : { timeMin: windowStartIso, timeMax: windowEndIso, singleEvents: 'true', orderBy: 'startTime' };
    const res = await fetchEventsPage(calendar.id, token, params, pageToken);

    if (res.status === 410) {
      // syncToken expirado/inválido — refazer sincronização completa desta janela.
      useIncremental = false;
      pageToken = undefined;
      calendar.syncToken = null;
      continue;
    }
    if (!res.ok) throw new Error(`Falha ao sincronizar o calendário "${calendar.name}".`);

    const data = await res.json();
    seen.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
  } while (pageToken);

  return { events: seen, nextSyncToken };
}

export async function syncAccountEvents(accountId, { pastDays = 30, futureDays = 90 } = {}) {
  const token = await ensureToken(accountId);
  if (!token) return { ok: false, reason: 'needs_reauth' };

  const calendars = (await db.calendars.where('accountId').equals(accountId).toArray()).filter((c) => c.isVisible);
  const windowStart = new Date(Date.now() - pastDays * 86400000).toISOString();
  const windowEnd = new Date(Date.now() + futureDays * 86400000).toISOString();

  for (const calendar of calendars) {
    const { events, nextSyncToken } = await syncCalendar(calendar, token, windowStart, windowEnd);

    await db.transaction('rw', db.events, db.calendars, async () => {
      for (const ev of events) {
        if (ev.status === 'cancelled') {
          await db.events.delete(ev.id);
          continue;
        }
        if (!ev.start) continue;
        const startsAt = ev.start.dateTime ? new Date(ev.start.dateTime).getTime() : new Date(ev.start.date).getTime();
        const endsAt = ev.end?.dateTime ? new Date(ev.end.dateTime).getTime() : (ev.end?.date ? new Date(ev.end.date).getTime() : startsAt);
        await db.events.put({
          id: ev.id, calendarId: calendar.id, accountId,
          title: ev.summary || '(sem título)', startsAt, endsAt,
          isAllDay: Boolean(ev.start.date && !ev.start.dateTime),
          location: ev.location || null,
          updatedAt: ev.updated ? new Date(ev.updated).getTime() : Date.now(),
          isCancelled: false,
        });
      }
      // Remove eventos fora da janela sincronizada (RN-10).
      const cutoffPast = Date.now() - pastDays * 86400000;
      await db.events.where('calendarId').equals(calendar.id).and((e) => e.startsAt < cutoffPast).delete();

      await db.calendars.update(calendar.id, { syncToken: nextSyncToken || calendar.syncToken || null });
    });
  }

  await db.accounts.update(accountId, { lastSyncAt: Date.now(), status: 'connected' });
  return { ok: true };
}

export async function syncAllAccounts(settings) {
  const accounts = await db.accounts.toArray();
  const results = [];
  for (const acc of accounts) {
    try {
      const r = await syncAccountEvents(acc.id, {
        pastDays: settings?.syncWindowPastDays ?? 30,
        futureDays: settings?.syncWindowFutureDays ?? 90,
      });
      results.push({ accountId: acc.id, ...r });
    } catch (e) {
      results.push({ accountId: acc.id, ok: false, reason: e.message });
    }
  }
  return results;
}

/** Lê eventos SÓ da cache local — nunca da rede (RF-94, funciona offline). */
export async function getCachedEvents({ fromTs, toTs, areaId = null }) {
  const events = await db.events.where('startsAt').between(fromTs, toTs, true, true).toArray();
  if (!events.length) return [];
  const accounts = await db.accounts.toArray();
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const calendars = await db.calendars.toArray();
  const calendarById = Object.fromEntries(calendars.map((c) => [c.id, c]));

  return events
    .map((e) => ({ ...e, account: accountById[e.accountId], calendar: calendarById[e.calendarId] }))
    .filter((e) => e.account && (!areaId || areaId === 'all' || e.account.areaId === areaId))
    .sort((a, b) => a.startsAt - b.startsAt);
}
