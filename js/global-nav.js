// Navigation functionality
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");
const closeNav = document.getElementById("close-nav");

hamburger.addEventListener("click", () => {
  navMenu.classList.add("nav-active");
});

closeNav.addEventListener("click", () => {
  navMenu.classList.remove("nav-active");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (
    profileDropdownMobile &&
    !userIconMobile.contains(e.target) &&
    !profileDropdownMobile.contains(e.target)
  ) {
    profileDropdownMobile.style.display = "none";
  }
});
