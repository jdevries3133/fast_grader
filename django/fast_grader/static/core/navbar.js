function toggleNav() {
  const navEl = document.getElementById("navContainer");
  if (navEl.classList.contains("hidden")) {
    navEl.classList.remove("hidden");
  } else {
    navEl.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("navHamburger").addEventListener("click", toggleNav);
});
