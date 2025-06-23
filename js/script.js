document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first!");
    window.location.href = "sign.html";
    return;
  }

  // DOM Elements
  const spinner = document.getElementById("loadingSpinner");
  const accountSummary = document.getElementById("accountSummary");
  const expenditureOutput = document.getElementById("expenditureOutput");
  const receiptsOutput = document.getElementById("receiptsOutput");
  const balanceOutput = document.getElementById("balanceOutput");

  // Currency symbol mapping
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

  // Function to format amount with currency symbol
  function formatCurrency(amount, currencyCode) {
    const symbol = currencySymbols[currencyCode] || currencyCode;
    return `${symbol} ${parseFloat(amount).toFixed(2)}`;
  }

  // Fetch user account summary
  fetch("http://localhost:3000/api/user-summary", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      spinner.classList.add("fade-out");

      // Get currency code from the response or default to KES
      const currencyCode = data.currency_code || "KES";

      expenditureOutput.innerHTML = formatCurrency(
        data.expenditureAmount,
        currencyCode
      );
      receiptsOutput.innerHTML = formatCurrency(
        data.receiptsAmount,
        currencyCode
      );
      balanceOutput.innerHTML = formatCurrency(
        data.balanceAmount,
        currencyCode
      );

      setTimeout(() => {
        spinner.style.display = "none";
        accountSummary.style.display = "block";
        accountSummary.classList.add("fade-in");
      }, 500);
    })
    .catch((err) => {
      console.error("Summary Fetch Error:", err);
      spinner.classList.add("fade-out");

      setTimeout(() => {
        spinner.style.display = "none";
        alert("Failed to load account summary.");
      }, 500);
    });

  // Forex Calculator Functionality
  const fromCurrencySelect = document.getElementById("fromCurrency");
  const toCurrencySelect = document.getElementById("toCurrency");
  const amountInput = document.getElementById("amount");
  const resultDiv = document.getElementById("result");
  const fromFlag = document.getElementById("fromFlag");
  const toFlag = document.getElementById("toFlag");
  const buyRateSpan = document.getElementById("buyRate");
  const sellRateSpan = document.getElementById("sellRate");
  const swapButton = document.getElementById("swapButton");

  // Map currency to country code
  function getCountryCode(currency) {
    const map = {
      USD: "US",
      EUR: "DE",
      GBP: "GB",
      KES: "KE",
      UGX: "UG",
      GHS: "GH",
      TZS: "TZ",
      ZMW: "ZM",
    };
    return map[currency] || "US";
  }

  function updateFlags() {
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;

    if (fromFlag && toFlag) {
      fromFlag.src = `https://flagsapi.com/${getCountryCode(
        fromCurrency
      )}/flat/64.png`;
      toFlag.src = `https://flagsapi.com/${getCountryCode(
        toCurrency
      )}/flat/64.png`;
    }
  }

  function updateRates() {
    const base = fromCurrencySelect.value;
    const target = toCurrencySelect.value;

    if (!base || !target) {
      console.error("Missing currency selection.");
      return;
    }

    fetch(
      `https://v6.exchangerate-api.com/v6/109135b8edd97eb634841cd9/latest/${base}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (!data.conversion_rates || !data.conversion_rates[target]) {
          buyRateSpan.textContent = "-";
          sellRateSpan.textContent = "-";
          resultDiv.innerHTML = "<strong>Converted:</strong> -";
          return;
        }

        const rate = data.conversion_rates[target];
        const buyRate = rate;
        const sellRate = (rate * 0.98).toFixed(2); // 2% margin

        buyRateSpan.textContent = buyRate.toFixed(2);
        sellRateSpan.textContent = sellRate;

        updateConversion();
      })
      .catch((error) => {
        console.error("Forex Fetch Error:", error);
        buyRateSpan.textContent = "-";
        sellRateSpan.textContent = "-";
        resultDiv.innerHTML = "<strong>Converted:</strong> -";
      });
  }

  function updateConversion() {
    const buyRate = parseFloat(buyRateSpan.textContent);
    const amount = parseFloat(amountInput.value);

    if (isNaN(amount) || isNaN(buyRate)) {
      resultDiv.innerHTML = "<strong>Converted:</strong> -";
      return;
    }

    const convertedAmount = (amount * buyRate).toFixed(2);
    const target = toCurrencySelect.value;
    const symbol = currencySymbols[target] || target;
    resultDiv.innerHTML = `<strong>Converted:</strong> ${symbol} ${convertedAmount}`;
  }
  if (fromCurrencySelect) {
    fromCurrencySelect.addEventListener("change", () => {
      updateFlags();
      updateRates();
    });
  }

  if (toCurrencySelect) {
    toCurrencySelect.addEventListener("change", () => {
      updateFlags();
      updateRates();
    });
  }

  if (amountInput) {
    amountInput.addEventListener("input", () => {
      updateConversion();
    });
  }

  if (swapButton) {
    swapButton.addEventListener("click", () => {
      const fromValue = fromCurrencySelect.value;
      const toValue = toCurrencySelect.value;

      // Swap the selected currencies
      fromCurrencySelect.value = toValue;
      toCurrencySelect.value = fromValue;

      updateFlags();
      updateRates();
    });
  }
  if (fromCurrencySelect && toCurrencySelect) {
    updateFlags();
    updateRates();
  }
});
