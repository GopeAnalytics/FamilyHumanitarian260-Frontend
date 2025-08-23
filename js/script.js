//BASE URL initilization
const BASE_URL = "http://localhost:3000";
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
  fetch(`${BASE_URL}/api/user-summary`, {
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

  // --- Initial Load Functions ---
  function loadInitialData() {
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") || "light";

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
