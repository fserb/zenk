// utils.js


export function closeMenu() {
  const menu = document.getElementsByTagName("menu")[0];
  const ctx = document.getElementById("menu");
  ctx.innerHTML = "";
  menu.style.display = "none";
}

export function buildMenu(content) {
  const menu = document.getElementsByTagName("menu")[0];
  const ctx = document.getElementById("menu");
  ctx.innerHTML = content;
  menu.style.display = "flex";
}
