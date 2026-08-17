// ------------------------------------------------------------------
// Preenche aqui o teu Client ID OAuth do Google Cloud Console.
// Instruções completas no README.md, secção "Ligar o Google Calendar".
// Sem isto preenchido, a app funciona na mesma — só a parte do
// calendário fica desligada (RF-87).
// ------------------------------------------------------------------
export const GOOGLE_CLIENT_ID = '';

const LS_KEY = 'googleClientId';

export function getEffectiveClientId() {
  return localStorage.getItem(LS_KEY)?.trim() || GOOGLE_CLIENT_ID.trim();
}

export function setStoredClientId(id) {
  const val = id?.trim() || '';
  if (val) localStorage.setItem(LS_KEY, val);
  else localStorage.removeItem(LS_KEY);
}

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

export function googleIntegrationEnabled() {
  return getEffectiveClientId().length > 0;
}
