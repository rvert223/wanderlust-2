// Auth service: sign up, log in, log out and the saved session.
// With VITE_API_BASE_URL set it calls your backend (POST /auth/signup and /auth/login, each
// answering { token, user: { name, email } }). Until then, accounts live on this device only,
// with passwords stored as SHA-256 hashes. Unlike other connectors there is NO fallback to the
// mock when the real call fails — a failed login must stay failed.
import { CONFIG, isConfigured } from '../config/env';
import { http } from '../connectors/_shared/http';
import { readJson, writeJson } from '../utils/storage';

const SESSION_KEY = 'wanderlust.session.v1';
const ACCOUNTS_KEY = 'wanderlust.accounts.v1';
const apiReady = () => isConfigured(CONFIG.api.baseUrl);

export const isDemoAuth = () => !apiReady();
export const loadSession = () => readJson(SESSION_KEY, null);
const saveSession = (session) => {
  writeJson(SESSION_KEY, session);
  return session;
};
export const signOut = () => writeJson(SESSION_KEY, null);

async function hash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const normalise = (email) => email.trim().toLowerCase();

/** signUp({ name, email, password }) -> { token, user: { name, email } } */
export async function signUp({ name, email, password }) {
  if (apiReady()) return saveSession(await http.post(`${CONFIG.api.baseUrl}/auth/signup`, { name, email, password }));
  const accounts = readJson(ACCOUNTS_KEY, {});
  const key = normalise(email);
  if (accounts[key]) throw new Error('An account with this email already exists. Log in instead.');
  accounts[key] = { name: name.trim(), email: key, passwordHash: await hash(password) };
  writeJson(ACCOUNTS_KEY, accounts);
  return saveSession({ token: `local-${Date.now()}`, user: { name: accounts[key].name, email: key } });
}

/** logIn({ email, password }) -> { token, user: { name, email } } */
export async function logIn({ email, password }) {
  if (apiReady()) return saveSession(await http.post(`${CONFIG.api.baseUrl}/auth/login`, { email, password }));
  const account = readJson(ACCOUNTS_KEY, {})[normalise(email)];
  if (!account || account.passwordHash !== (await hash(password))) throw new Error('Email or password is incorrect.');
  return saveSession({ token: `local-${Date.now()}`, user: { name: account.name, email: account.email } });
}
