// github
import { Octokit } from "./lib/octokit.bundle.js";

import {GITHUB_CLIENT_ID, GITHUB_SECRET} from './dev.js';

import {closeMenu, buildMenu} from "./utils.js";

export function debounce(func, wait, immediate = false) {
  let timeout;
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

let octokit = null;
let repo = null;
let repofile = null;

export function status() {
  if (repo && repofile) {
    return `Syncing to ${repo}:${repofile}`;
  }
  return "";
}

async function buildRepoForm() {
  buildMenu(`
  <p>Select the repository you want to use:</p>
  <div id="github_form">
    <select id="github_repo"><option>Loading...</option></select>
    <button id="github_submit">select repo</button>
  </div>
  `);

  const select = document.getElementById("github_repo");
  const res = await octokit.rest.repos.listForAuthenticatedUser({visibility: "all", per_page: 100});
  const options = [];
  for (const repo of res.data) {
    const option = document.createElement("option");
    option.value = repo.full_name;
    option.textContent = repo.full_name;
    options.push(option);
  }
  options.sort((a, b) => a.textContent.localeCompare(b.textContent));
  select.innerHTML = "";
  for (const option of options) {
    select.appendChild(option);
  }

  let repo = null;

  await new Promise(acc => {
    document.getElementById("github_submit").addEventListener("click", async (ev) => {
      ev.preventDefault();
      repo = select.value;
      closeMenu();
      acc();
    });
  });

  return repo;
}

async function buildRepoFileForm() {
  buildMenu(`
  <p>Enter the path to the file you want to use:</p>
  <div id="github_form">
    <input id="github_file" type="text" value="zenk.md">
    <button id="github_submit">select file</button>
  </div>
  `);

  let file = null;

  await new Promise(acc => {
    document.getElementById("github_submit").addEventListener("click", async (ev) => {
      ev.preventDefault();
      file = document.getElementById("github_file").value;
      closeMenu();
      acc();
    });
  });

  return file;
}

export async function init() {
  const params = new URLSearchParams(document.location.search.substring(1));
  if (params.get("req") === "github") {
    const code = params.get("code");
    const state = params.get("state");
    window.history.replaceState({}, document.title, document.location.pathname);
    const storedState = localStorage.getItem("github_state");
    localStorage.removeItem("github_state");
    if (state !== storedState) {
      console.error(`Invalid state (${state} !== ${storedState})`);
      return false;
    }

    const res = await fetch("https://cors.metaphora.co/https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_SECRET,
        code: code,
      }),
    });
    const data = await res.text();
    // console.log("GITHUB TOKEN", data);
    const token = new URLSearchParams(data).get("access_token");
    localStorage.setItem("github_token", token);
  }

  const token = localStorage.getItem("github_token");
  // console.log("TOKEN", token);
  if (!token) return false;

  octokit = new Octokit({ auth: token });

  try {
    await octokit.rest.users.getAuthenticated();
  } catch (error) {
    if (error.status === 401) {
      localStorage.removeItem("github_token");
      return false;
    }
    throw error;
  }

  repo = localStorage.getItem("github_repo");

  if (!repo) {
    repo = await buildRepoForm();
    localStorage.setItem("github_repo", repo);
  }

  // check repo exists and has write access
  try {
    await octokit.rest.repos.get({
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
    });
  } catch (error) {
    console.error("REPO ERROR", error);
    if (error.status === 404) {
      alert(`Repository ${repo} not found`);
    } else if (error.status === 403) {
      alert(`You do not have write access to ${repo}`);
    }
    localStorage.removeItem("github_repo");
    repo = null;
    return false;
  }

  repofile = localStorage.getItem("github_file");
  if (!repofile) {
    repofile = await buildRepoFileForm();
    localStorage.setItem("github_file", repofile);
    if (!repofile) return false;
  }

  console.log(`Writing to ${repo}:${repofile}`);

  return true;
}

export function connect() {
  const random = new Uint8Array(32);
  window.crypto.getRandomValues(random);
  const state = Array.from(random, byte => byte.toString(16).padStart(2, '0')).join('');
  localStorage.setItem("github_state", state);

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${document.location.origin}${document.location.pathname}?req=github`,
    scope: "repo",
    state: state,
  }).toString();
  const url = `https://github.com/login/oauth/authorize?${params}`;
  document.location = url;
}

export function disconnect() {
  localStorage.removeItem("github_token");
  localStorage.removeItem("github_repo");
  localStorage.removeItem("github_file");
  repo = null;
  octokit = null;
  repofile = null;
}

async function write(content) {
  document.getElementById("status").classList.replace("load", "sync");
  let old = "";
  let old_sha = null;
  try {
    const file = await octokit.rest.repos.getContent({
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
      path: repofile,
    });
    old = atob(file.data.content);
    old_sha = file.data.sha;
  } catch (error) {};

  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner: repo.split("/")[0],
    repo: repo.split("/")[1],
    path: repofile,
    message: "ZenK update",
    content: btoa(old + content),
    sha: old_sha,
  });
  document.getElementById("status").classList.remove("sync");
}

export const sync = debounce(async (lines) => {
  if (lines.length === 0) return;
  if (!repo || !octokit) return;

  const text = lines
    .map(line => line.header ? `\n\n## ${line.value}\n` : line).join("\n") + "\n";
  lines.length = 0;
  await write(text);
}, 5000);
