
import {closeMenu, buildMenu} from "./utils.js";

// import * as googleDrive from "./gdrive.js";
import * as github from "./github.js";

let SYSTEM = null;
let lastWrite = 0;
const text = [];

function date() {
  return new Date().toLocaleString('en-GB', {
    hour12: false,
    weekday: 'short',
    timeZoneName: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/(?:(\d),)/g, '$1');
}

async function postLine(line) {
  if (Date.now() - lastWrite > 60*60*1000) {
    text.push({header: true, value: date()});
  }
  lastWrite = Date.now();
  text.push(line);
  document.getElementById("status").classList.add("load");

  if (SYSTEM) {
    SYSTEM.sync(text);
  }
}

function updateWords(wc) {
  const words = document.getElementById("words");

  words.innerHTML = "";
  const D = 21;
  while(wc > 0) {
    const s = Math.min(250, wc);
    wc -= s;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = D;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#E0DDDD";
    ctx.beginPath();
    ctx.moveTo(D / 2, D / 2);
    ctx.lineTo(0, D / 2);
    ctx.arc(D / 2, D / 2, D / 2, Math.PI, 2 * Math.PI * s / 250 + Math.PI);
    ctx.closePath();
    ctx.fill();

    words.appendChild(canvas);
  }
}

function editor() {
  const inp = /** @type {HTMLTextAreaElement} */
    (document.getElementById("inp"));

  inp.value = "\n\n\n\n\n";
  inp.scrollTop = inp.scrollHeight;
  inp.focus();

  const BLOCKED = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  let lastEnter = inp.value.length;
  let wordCount = 0;

  const menu = document.getElementsByTagName("menu")[0];

  inp.addEventListener("keydown", ev => {
    closeMenu();
    if (BLOCKED.has(ev.key)) {
      ev.preventDefault();
      return;
    }

    if (ev.key === "Enter") {
      const lastLine = inp.value.substring(lastEnter).trim();
      postLine(lastLine);

      const wc = lastLine.match(/[\w\d\'\"-]+/gi);
      if (wc) {
        wordCount += wc.length;
      }
      updateWords(wordCount);

      lastEnter = inp.selectionStart + 1;

    }

    if (ev.key === "Backspace") {
      const p = inp.selectionStart;
      if (p <= lastEnter) {
        ev.preventDefault();
        return;
      }
    }

    inp.scrollTop = inp.scrollHeight;
  });

  inp.addEventListener("input", ev => {
    inp.scrollTop = inp.scrollHeight;
  });

  inp.addEventListener("select", ev => {
    ev.preventDefault();
    inp.focus();
    inp.setSelectionRange(inp.value.length,inp.value.length);
  });

  document.addEventListener("DOMContentLoaded", ev => {
    inp.focus();
  });

  inp.addEventListener("blur", ev => {
    if (ev.relatedTarget && ev.relatedTarget.closest("menu")) return;
    ev.preventDefault();
    inp.focus();
  });

  window.visualViewport.addEventListener("resize", ev => {
    document.getElementsByTagName("html")[0].style.height =
      window.visualViewport.height + "px";
  });

  window.addEventListener("touchend", ev => {
    if (ev.target.closest("menu")) return;
    closeMenu();
    inp.focus();
  });

  window.addEventListener("mouseup", ev => {
    if (ev.target.closest("menu")) return;
    closeMenu();
    inp.focus();
  });
}

function download(ev) {
  const content = text
    .map(line => line.header ? `\n\n## ${line.value}\n` : line).join("\n");

  const el = document.createElement('a');
  el.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content));
  const nameDate = date().replace(/[^a-z0-9]/gi, "_");
  el.setAttribute('download', `ZenK - ${nameDate}.md`);
  el.click();
  closeMenu();
  document.getElementById("status").classList.remove("load", "sync");
}

closeMenu();

function menu() {
  const menu = document.getElementsByTagName("menu")[0];

  if (menu.style.display !== "none") {
    closeMenu();
    return;
  }

  if (!SYSTEM) {
    buildMenu(`
      <button id="menu_save">Download</button>
      <button id="menu_github">Connect to GitHub</button>
    `);

    document.getElementById("menu_save").addEventListener("click", download);
    document.getElementById("menu_github").addEventListener("click", () => github.connect());

    return;
  }

  let status = "";
  if (SYSTEM) {
    status = SYSTEM.status();
  }

  buildMenu(`<p>${status}</p><button id="menu_dc">Disconnect</button>`);

  document.getElementById("menu_dc").addEventListener("click", () => {
    if (SYSTEM) {
      SYSTEM.disconnect();
      SYSTEM = null;
    }
    closeMenu();
  });
}

document.getElementById("title").addEventListener("click", menu);

function about() {
  const menu = document.getElementsByTagName("menu")[0];

  buildMenu(`
  <p><b>ZenK</b> is a non-editable text input<br>
  <p>Click here to retrieve your text or to connect to a service.</p>
`);
}

editor();

if (await github.init()) {
  SYSTEM = github;
  if (text.length > 0) {
    SYSTEM.sync(text);
  }
} else {
  about();
}
