// github
import { Octokit } from "https://esm.sh/octokit";

import {GITHUB_CLIENT_ID, GITHUB_SECRET} from './dev.js';

let octokit = null;

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

  // octokit = new Octokit({ auth: token });

  // try {
  //   await octokit.rest.users.getAuthenticated();
  // } catch (error) {
  //   if (error.status === 401) {
  //     return false; // Token is invalid or expired
  //   }
  //   throw error;
  // }



  // return true;
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

  // document.getElementById("github_token").value = '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';
  // document.getElementById("github_repo").value = 'zk';

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

export async function writeHeader(line) {
}

export async function writeLine(line) {
}