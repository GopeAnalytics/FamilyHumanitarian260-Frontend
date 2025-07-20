document.addEventListener("DOMContentLoaded", () => {
  // --- Initial Setup & Token Check ---
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first!");
    window.location.href = "sign.html";
    return;
  }

  // --- DOM Elements ---
  const spinner = document.getElementById("loadingSpinner");
  const accountSummaryEl = document.getElementById("accountSummary");
  const expenditureOutput = document.getElementById("expenditureOutput");
  const receiptsOutput = document.getElementById("receiptsOutput");
  const balanceOutput = document.getElementById("balanceOutput");

  // --- Currency Formatting ---
  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    KES: "Ksh.",
    UGX: "UGX",
    GHS: "₵",
    TZS: "TSh",
    ZMW: "ZK",
  };
  const formatCurrency = (amount, currencyCode) => {
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
  };

  // --- Fetch User Account Summary ---
  fetch("http://localhost:3000/api/user-summary", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .then((data) => {
      const currencyCode = data.currency_code || "KES";
      expenditureOutput.textContent = formatCurrency(
        data.expenditureAmount,
        currencyCode
      );
      receiptsOutput.textContent = formatCurrency(
        data.receiptsAmount,
        currencyCode
      );
      balanceOutput.textContent = formatCurrency(
        data.balanceAmount,
        currencyCode
      );

      spinner.style.display = "none";
      accountSummaryEl.style.display = "block";
    })
    .catch((err) => {
      console.error("Summary Fetch Error:", err);
      spinner.innerHTML = "<p>Failed to load account summary.</p>";
    });

  // --- Forex Calculator ---
  const fromCurrencySelect = document.getElementById("fromCurrency");
  const toCurrencySelect = document.getElementById("toCurrency");
  const amountInput = document.getElementById("amount");
  const resultDiv = document.getElementById("result");
  const buyRateSpan = document.getElementById("buyRate");
  const sellRateSpan = document.getElementById("sellRate");
  const swapButton = document.getElementById("swapButton");

  function updateRates() {
    const base = fromCurrencySelect.value;
    const target = toCurrencySelect.value;
    if (!base || !target) return;

    fetch(
      `https://v6.exchangerate-api.com/v6/109135b8edd97eb634841cd9/latest/${base}`
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        const rate = data.conversion_rates[target];
        if (!rate) {
          [buyRateSpan.textContent, sellRateSpan.textContent] = ["-", "-"];
          return;
        }
        const buyRate = rate * 1.01; // Example: 1% margin
        const sellRate = rate * 0.99; // Example: 1% margin
        buyRateSpan.textContent = `${buyRate.toFixed(2)} ${target}`;
        sellRateSpan.textContent = `${sellRate.toFixed(2)} ${target}`;
        updateConversion();
      })
      .catch((error) => {
        console.error("Forex Fetch Error:", error);
        [buyRateSpan.textContent, sellRateSpan.textContent] = [
          "Error",
          "Error",
        ];
      });
  }

  function updateConversion() {
    const buyRate = parseFloat(buyRateSpan.textContent);
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || isNaN(buyRate) || amount <= 0) {
      resultDiv.textContent = "Converted Amount: -";
      return;
    }
    const convertedAmount = (amount * buyRate).toFixed(2);
    const targetSymbol =
      currencySymbols[toCurrencySelect.value] || toCurrencySelect.value;
    resultDiv.textContent = `Converted Amount: ${targetSymbol} ${convertedAmount}`;
  }

  [fromCurrencySelect, toCurrencySelect].forEach((select) =>
    select.addEventListener("change", updateRates)
  );
  amountInput.addEventListener("input", updateConversion);

  swapButton.addEventListener("click", () => {
    [fromCurrencySelect.value, toCurrencySelect.value] = [
      toCurrencySelect.value,
      fromCurrencySelect.value,
    ];
    updateRates();
  });

  // --- Profile Dropdown & Modal ---
  const userIcon = document.getElementById("userIcon");
  const profileDropdown = document.getElementById("profileDropdown");
  const profileModal = document.getElementById("profileModal");
  const viewProfileBtn = document.getElementById("viewProfileBtn");
  const closeModal = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // Desktop profile functionality
  if (userIcon && profileDropdown) {
    userIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.style.display =
        profileDropdown.style.display === "block" ? "none" : "block";
    });
  }

  if (viewProfileBtn) {
    viewProfileBtn.addEventListener("click", () => {
      profileModal.style.display = "block";
      if (profileDropdown) profileDropdown.style.display = "none";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("theme");
      alert("You have been logged out.");
      window.location.href = "sign.html";
    });
  }

  // Mobile profile dropdown functionality
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

    // Mobile profile dropdown buttons
    const viewProfileBtnMobile = document.getElementById(
      "viewProfileBtnMobile"
    );
    const logoutBtnMobile = document.getElementById("logoutBtnMobile");

    // View/Edit Profile button for mobile
    if (viewProfileBtnMobile) {
      viewProfileBtnMobile.addEventListener("click", (e) => {
        e.preventDefault();
        if (profileModal) {
          profileModal.style.display = "block";
          profileDropdownMobile.style.display = "none";
        }
      });
    }

    // Logout button for mobile
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("userProfile");
        localStorage.removeItem("theme");
        alert("You have been logged out.");
        window.location.href = "sign.html";
      });
    }
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (
      profileDropdown &&
      userIcon &&
      !userIcon.contains(e.target) &&
      !profileDropdown.contains(e.target)
    ) {
      profileDropdown.style.display = "none";
    }
    if (
      profileDropdownMobile &&
      userIconMobile &&
      !userIconMobile.contains(e.target) &&
      !profileDropdownMobile.contains(e.target)
    ) {
      profileDropdownMobile.style.display = "none";
    }
  });

  // Modal close functionality
  if (closeModal && cancelBtn && profileModal) {
    [closeModal, cancelBtn].forEach((btn) =>
      btn.addEventListener("click", () => (profileModal.style.display = "none"))
    );
  }

  // --- Profile Form & Picture Upload ---
  const profileForm = document.getElementById("profileForm");
  const uploadBtn = document.getElementById("uploadBtn");
  const profileUploadInput = document.getElementById("profileUpload");
  const profileImage = document.getElementById("profileImage");

  if (uploadBtn && profileUploadInput) {
    uploadBtn.addEventListener("click", () => profileUploadInput.click());
  }

  if (profileUploadInput && profileImage) {
    profileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => (profileImage.src = event.target.result);
        reader.readAsDataURL(file);
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const profileData = {
        fullName: document.getElementById("fullName").value,
        role: document.getElementById("role").value,
        bio: document.getElementById("bio").value,
        imageSrc: profileImage ? profileImage.src : "",
      };
      localStorage.setItem("userProfile", JSON.stringify(profileData));
      alert("Profile saved successfully!");
      if (profileModal) profileModal.style.display = "none";
    });
  }

  // --- Theme Switcher & Persistence ---
  const themeIcon = document.getElementById("themeIcon");
  const body = document.body;

  function applyTheme(theme) {
    if (theme === "dark") {
      body.classList.add("dark-mode");
      if (themeIcon) themeIcon.classList.replace("fa-sun", "fa-moon");
    } else {
      body.classList.remove("dark-mode");
      if (themeIcon) themeIcon.classList.replace("fa-moon", "fa-sun");
    }
  }

  if (themeIcon) {
    themeIcon.addEventListener("click", () => {
      const newTheme = body.classList.contains("dark-mode") ? "light" : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  // --- Initial Load Functions ---
  function loadInitialData() {
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);

    // Load saved profile
    const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (savedProfile) {
      const fullNameEl = document.getElementById("fullName");
      const roleEl = document.getElementById("role");
      const bioEl = document.getElementById("bio");

      if (fullNameEl) fullNameEl.value = savedProfile.fullName || "";
      if (roleEl) roleEl.value = savedProfile.role || "";
      if (bioEl) bioEl.value = savedProfile.bio || "";
      if (savedProfile.imageSrc && profileImage) {
        profileImage.src = savedProfile.imageSrc;
      }
    }

    // Initial fetch for forex rates
    updateRates();
  }

  loadInitialData();
});
