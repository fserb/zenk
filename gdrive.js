// google drive
/* global gapi google */

import * as keys from "./dev.js";

const DISCOVERY_DOC =
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

const SCOPES = ['https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents'];

const REDIRECT_URL = document.location.origin + document.location.pathname;
const STORAGE_KEY = "zenk.google_token";

function loadScript(url) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = url;
  document.body.appendChild(script);

  return new Promise(acc => script.addEventListener("load", acc));
}

async function loadGAPI() {
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise(res => gapi.load('client:picker', res));
  await gapi.client.init({
    apiKey: keys.GOOGLE_API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });

  const token = localStorage.getItem("google_access_token");
  if (token) {
    gapi.auth.setToken(JSON.parse(token));
  }
}

async function loadGSI() {
  await loadScript("https://accounts.google.com/gsi/client");
}

// getAuthCode redirects to Google login and then comes back with
// the auth code on the URL.
function getAuthCode() {
  const codeClient = google.accounts.oauth2.initCodeClient({
    client_id: keys.GOOGLE_CLIENT_ID,
    scope: SCOPES.join(" "),
    access_type: "offline",
    ux_mode: 'redirect',
    redirect_uri: REDIRECT_URL,
  });

  codeClient.requestCode();
}

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  window.history.replaceState({}, document.title, document.location.pathname);
}

// getRefreshToken returns a (hopefully) valid refresh token. If there's no
// auth code, we request it (which may reload the page). After that, we
// can use a valid "code" query param to request a refresh token. We then
// keep the refresh token on local storage FOREVER.
async function getRefreshToken() {
  const rt = localStorage.getItem(STORAGE_KEY);
  if (rt) {
    return JSON.parse(rt);
  }

  const s = new URLSearchParams(document.location.search);
  const code = s.get("code");
  if (!code) {
    return getAuthCode();
  }

  reset();
  const now = Math.floor(Date.now() / 1000);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    mode: "cors",
    headers: {"Content-Type": "application/json"},
    credentials: "same-origin",
    body: JSON.stringify({
      "code": code,
      "client_id": keys.GOOGLE_CLIENT_ID,
      "client_secret": keys.GOOGLE_CLIENT_SECRET,
      "grant_type": "authorization_code",
      "redirect_uri": REDIRECT_URL
    }),
  });
  const out = await res.json();
  out.expiresAt = now + (out?.expires_in ?? 0);

  console.log("REFRESH TOKEN", out);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(out));

  return out;
}

// return an accessToken that is valid for at least 15min. It may refresh
// the page if no refreshToken and no code is available.
async function getAccessToken() {
  const rt = await getRefreshToken();
  const exp = rt?.expiresAt ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (exp - now > 15 * 60) {
    return rt;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    mode: "cors",
    headers: {"Content-Type": "application/json"},
    credentials: "same-origin",
    body: JSON.stringify({
      "client_id": keys.GOOGLE_CLIENT_ID,
      "client_secret": keys.GOOGLE_CLIENT_SECRET,
      "refresh_token": rt.refresh_token,
      "grant_type": "refresh_token",
    }),
  });
  const out = await res.json();
  out.expiresAt = now + (out?.expires_in ?? 0);

  const nrt = Object.assign({}, rt, out);
  console.log("ACCESS TOKEN", nrt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nrt));

  return nrt;
}

// makes sure that GAPI has a valid token for at least 15min.
async function updateAccessToken() {
  gapi.auth.setToken(await getAccessToken());
}

export async function startup() {
  const rt = localStorage.getItem(STORAGE_KEY);
  if (rt) {
    const obj = JSON.parse(rt);
    if (obj?.refresh_token) return false;
  }

  const code = (new URLSearchParams(document.location.search)).get("code");
  if (code) return false;

  return true;

}

export async function init() {
  await Promise.all([loadGAPI(), loadGSI()]);

  updateAccessToken();

  return true;
}

export async function writeHeader(line) {
}

export async function writeLine(line) {
}