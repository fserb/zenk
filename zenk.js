
import * as localFile from "./local_file.js";
// import * as googleDrive from "./gdrive.js";
import * as github from "./github.js";

let SYSTEM = null;
let lastWrite = 0;

function date() {
  return new Date().toLocaleString('en-US', {
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
  if (!SYSTEM) return;

  if (Date.now() - lastWrite > 60*60*1000) {
    await SYSTEM.writeHeader(date());
  }
  lastWrite = Date.now();
  await SYSTEM.writeLine(line);
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

function about() {
  // TODO: if called twice, need to clone the nodes to remove the events.

  document.getElementById("target_file").addEventListener("click", async () => {
    if (!await localFile.init()) document.location.reload();
    SYSTEM = localFile;
    editor();
  });

  // document.getElementById("target_gdrive").addEventListener("click", async () => {
  //   if (!await googleDrive.init()) document.location.reload();
  //   SYSTEM = googleDrive;
  //   editor();
  // });

  document.getElementById("target_github").addEventListener("click", async () => {
    if (!await github.init()) document.location.reload();
    SYSTEM = github;
    editor();
  });
}

function editor() {
  // TODO: if called twice, need to clone the nodes to remove the events.
  document.getElementById("block").style.display = "flex";
  document.getElementById("about").style.display = "none";

  const inp = /** @type {HTMLTextAreaElement} */
    (document.getElementById("inp"));

  inp.value = "\n\n\n\n\n";
  inp.scrollTop = inp.scrollHeight;
  inp.focus();

  const BLOCKED = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  let lastEnter = inp.value.length;
  let wordCount = 0;

  inp.addEventListener("keydown", ev => {
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
    ev.preventDefault();
    inp.focus();
  });

  window.visualViewport.addEventListener("resize", ev => {
    document.getElementsByTagName("html")[0].style.height =
      window.visualViewport.height + "px";
  });

  window.addEventListener("touchend", ev => {
    inp.focus();
  });
}

if (await github.startup()) {
  SYSTEM = github;
  editor();
} else {
  about();
}