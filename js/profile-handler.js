document.addEventListener("DOMContentLoaded", () => {
  // Check authentication first
  const token = localStorage.getItem("token");
  if (!token) {
    redirectToLogin();
    return;
  }

  // Initialize profile functionality
  initProfileDropdowns();
  initProfileModal();
  loadProfileData();
  initLogout();
  initThemeSwitcher();

  // Close dropdowns when clicking outside
  document.addEventListener("click", handleClickOutside);
});

function redirectToLogin() {
  window.location.href = "sign.html";
}

function initProfileDropdowns() {
  // Desktop dropdown
  const userIcon = document.getElementById("userIcon");
  const profileDropdown = document.getElementById("profileDropdown");

  if (userIcon && profileDropdown) {
    userIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.style.display =
        profileDropdown.style.display === "block" ? "none" : "block";
    });
  }

  // Mobile dropdown
  const userIconMobile = document.getElementById("userIconMobile");
  const profileDropdownMobile = document.getElementById(
    "profileDropdownMobile"
  );

  if (userIconMobile && profileDropdownMobile) {
    userIconMobile.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdownMobile.style.display =
        profileDropdownMobile.style.display === "block" ? "none" : "block";
    });
  }

  // View profile buttons (both desktop and mobile)
  const viewProfileBtns = [
    document.getElementById("viewProfileBtn"),
    document.getElementById("viewProfileBtnMobile"),
  ].filter(Boolean);

  viewProfileBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("profileModal").style.display = "block";
      closeAllDropdowns();
    });
  });
}

function initProfileModal() {
  const profileModal = document.getElementById("profileModal");
  const closeModal = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const profileUploadInput = document.getElementById("profileUpload");
  const profileImage = document.getElementById("profileImage");
  const profileForm = document.getElementById("profileForm");

  // Modal close functionality
  [closeModal, cancelBtn].forEach((btn) => {
    if (btn)
      btn.addEventListener(
        "click",
        () => (profileModal.style.display = "none")
      );
  });

  // Profile picture upload
  if (uploadBtn && profileUploadInput) {
    uploadBtn.addEventListener("click", () => profileUploadInput.click());
  }

  if (profileUploadInput && profileImage) {
    profileUploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Show loading state
          profileImage.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ddd'/%3E%3C/svg%3E";

          const formData = new FormData();
          formData.append("profilePhoto", file);
          formData.append("role", document.getElementById("role").value);
          formData.append("bio", document.getElementById("bio").value);

          const response = await fetch(`${BASE_URL}/api/profile`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              // Don't set Content-Type - the browser will set it with boundary
            },
            body: formData,
            credentials: "include",
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Upload failed");
          }

          const result = await response.json();
          updateProfileUI(result.profile);
          alert("Profile photo updated successfully!");
        } catch (error) {
          console.error("Upload error:", error);
          alert(error.message || "Failed to upload profile photo");
          // Reset to previous image
          const prevPhoto = localStorage.getItem("profilePhoto");
          if (prevPhoto) profileImage.src = prevPhoto;
        }
      }
    });
  }

  // Profile form submission
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const formData = new FormData();
        const role = document.getElementById("role").value;
        const bio = document.getElementById("bio").value;

        // Append as JSON string to avoid form-data parsing issues
        formData.append("data", JSON.stringify({ role, bio }));

        // Include file if selected
        const fileInput = document.getElementById("profileUpload");
        if (fileInput.files[0]) {
          formData.append("profilePhoto", fileInput.files[0]);
        }

        const response = await fetch(`${BASE_URL}/api/profile`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Update failed");
        }

        const result = await response.json();
        alert("Profile saved successfully!");
        profileModal.style.display = "none";
        updateProfileUI(result.profile);
      } catch (error) {
        console.error("Profile save error:", error);
        alert(error.message || "Failed to save profile");
      }
    });
  }
}

async function loadProfileData() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load profile");
    }

    const profileData = await response.json();
    updateProfileUI(profileData);
  } catch (error) {
    console.error("Profile load error:", error);
    if (error.message.includes("Failed to fetch")) {
      alert("Network error - please check your connection");
    }
  }
}

function updateProfileUI(profileData) {
  // Update form fields
  const fullNameEl = document.getElementById("fullName");
  const roleEl = document.getElementById("role");
  const bioEl = document.getElementById("bio");
  const profileImage = document.getElementById("profileImage");

  if (fullNameEl) fullNameEl.value = profileData.name || "";
  if (roleEl) roleEl.value = profileData.role || "";
  if (bioEl) bioEl.value = profileData.bio || "";

  // Update profile image in modal and dropdowns
  if (profileImage && profileData.profilePhoto) {
    profileImage.src = profileData.profilePhoto;
    localStorage.setItem("profilePhoto", profileData.profilePhoto);
  }

  // Update user icons in headers
  const userIcons = [
    document.getElementById("userIcon"),
    document.getElementById("userIconMobile"),
  ].filter(Boolean);

  userIcons.forEach((icon) => {
    if (profileData.profilePhoto) {
      // Replace icon with profile image
      icon.innerHTML = `<img src="${profileData.profilePhoto}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      // Use initials if no profile photo
      const initials = (profileData.name || "U")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      icon.innerHTML = `<span style="font-size: 0.8em; font-weight: bold;">${initials}</span>`;
    }
  });
}

function initLogout() {
  const logoutBtns = [
    document.getElementById("logoutBtn"),
    document.getElementById("logoutBtnMobile"),
  ].filter(Boolean);

  logoutBtns.forEach((btn) => {
    btn.addEventListener("click", logoutUser);
  });
}

function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("userProfile");
  localStorage.removeItem("theme");
  alert("You have been logged out.");
  window.location.href = "sign.html";
}

function initThemeSwitcher() {
  const themeIcon = document.getElementById("themeIcon");
  const body = document.body;

  if (themeIcon) {
    // Apply saved theme
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    themeIcon.addEventListener("click", () => {
      const newTheme = body.classList.contains("dark-mode") ? "light" : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      body.classList.add("dark-mode");
      if (themeIcon) themeIcon.classList.replace("fa-sun", "fa-moon");
    } else {
      body.classList.remove("dark-mode");
      if (themeIcon) themeIcon.classList.replace("fa-moon", "fa-sun");
    }
  }
}

function closeAllDropdowns() {
  const dropdowns = [
    document.getElementById("profileDropdown"),
    document.getElementById("profileDropdownMobile"),
  ].filter(Boolean);

  dropdowns.forEach((dropdown) => {
    dropdown.style.display = "none";
  });
}

function handleClickOutside(e) {
  // Close profile dropdowns when clicking outside
  const profileElements = [
    document.getElementById("userIcon"),
    document.getElementById("profileDropdown"),
    document.getElementById("userIconMobile"),
    document.getElementById("profileDropdownMobile"),
  ].filter(Boolean);

  const clickedInsideProfile = profileElements.some((el) =>
    el.contains(e.target)
  );

  if (!clickedInsideProfile) {
    closeAllDropdowns();
  }
}

// Make functions available for other scripts if needed
window.profileHandler = {
  loadProfileData,
  logoutUser,
  updateProfileUI,
};
