
import * as localFile from "./local_file.js";

let SYSTEM = null;

async function postLine(line) {
  console.log("postLine", line);
  await SYSTEM.write(line);
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

function main() {
  about();
}

main();