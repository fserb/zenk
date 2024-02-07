// github
import { Octokit } from "https://esm.sh/octokit";

import {GITHUB_CLIENT_ID, GITHUB_SECRET} from './dev.js';

let octokit = null;
let repo = null;

async function buildRepoForm() {
  const about = document.getElementById("about");
  about.innerHTML = `
    <p>Select the repository you want to use:</p>
    <div id="github_form">
      <select id="github_repo"><option>Loading...</option></select>
      <input type="submit" id="github_submit" value="submit" />
    </div>
  `;
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
      acc();
    });
  });

  return repo;
}

export async function startup() {
  const params = new URLSearchParams(document.location.search.substring(1));
  if (params.get("req") === "github") {
    const code = params.get("code");
    const state = params.get("state");
    window.history.replaceState({}, document.title, document.location.pathname);
    const storedState = localStorage.getItem("github_state");
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
    console.log("GITHUB TOKEN", data);
    const token = new URLSearchParams(data).get("access_token");
    localStorage.setItem("github_token", token);
  }


  const token = localStorage.getItem("github_token");
  console.log("TOKEN", token);
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

  console.log(`Writing to repo ${repo}`);

  return true;
}

export async function init() {
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
  return true;

  const about = document.getElementById("about");
  about.innerHTML = `
<p>Create a <a href='https://github.com/settings/personal-access-tokens/new'>Personal
Access Token</a> for your desired repository, that has
"content read/write access" and paste it here:</p>
<div id="github_form">
<input type="text" id="github_token" value="" placeholder="personal access token" />
<input type="text" id="github_repo" value="" placeholder="repo name" />
<input type="submit" id="github_submit" value="submit" />
</div>
`;

  await new Promise(async acc => {
    document.getElementById("github_submit").addEventListener("click", async (ev) => {
      ev.preventDefault();
      const token = document.getElementById("github_token");
      const repo = document.getElementById("github_repo");
      localStorage.setItem("github_token", token.value);
      localStorage.setItem("github_repo", repo.value);
      const valid = await startup();
      // acc(valid);
    });
  });
}

async function write(line) {
  let old = "";
  let old_sha = null;
  try {
    const file = await octokit.rest.repos.getContent({
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
      path: "zen.md",
    });
    old = atob(file.data.content);
    old_sha = file.data.sha;
  } catch (error) {};

  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner: repo.split("/")[0],
    repo: repo.split("/")[1],
    path: "zen.md",
    message: "ZenK update",
    content: btoa(old + line),
    sha: old_sha,
  });
}

export async function writeHeader(line) {
  await write(`\n\n## ${line}\n\n`);
}

export async function writeLine(line) {
  await write(line + "\n");
}