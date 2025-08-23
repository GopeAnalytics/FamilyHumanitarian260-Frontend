//Base URL initialization
const BASE_URL = "http://localhost:3000";
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login first!");
    window.location.href = "sign.html";
    return;
  }
  const durationSelect = document.getElementById("durationSelect");

  // Define the filterReceipts function that was missing
  function filterReceipts() {
    fetchReceipts();
  }

  // Add event listener using the filterReceipts function
  durationSelect.addEventListener("change", filterReceipts);

  function fetchReceipts() {
    fetch(`${BASE_URL}/api/user/receipts?duration=${durationSelect.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => renderReceipts(data.receipts))
      .catch((err) => {
        console.error("Error fetching receipts:", err);
        // Add error handling to show the user something went wrong
        const tbody = document.getElementById("receiptsBody");
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Error loading receipts. Please try again later.</td></tr>`;
      });
  }

  function formatCurrency(amount, currencyCode) {
    const code = currencyCode || "USD";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  }

  function renderReceipts(receipts) {
    const tbody = document.getElementById("receiptsBody");
    tbody.innerHTML = "";

    // Show a message if no receipts are available
    if (!receipts || receipts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No receipts found for the selected period.</td></tr>`;
      return;
    }

    receipts.forEach((receipt) => {
      const row = document.createElement("tr");

      // Use the formatCurrency function to handle all currency formatting
      const totalAmountFormatted = formatCurrency(
        receipt.total_amount,
        receipt.currency_code
      );

      const balanceAmountFormatted = formatCurrency(
        receipt.balance_amount,
        receipt.currency_code
      );

      // Extract file ID from drive_link for viewing
      const viewLink = receipt.drive_link
        ? `<a href="https://drive.google.com/file/d/${
            receipt.drive_link.match(/[-\w]{25,}/)
              ? receipt.drive_link.match(/[-\w]{25,}/)[0]
              : receipt.drive_link.split("id=")[1]
          }/view" target="_blank">View Receipt</a>`
        : "-";

      row.innerHTML = `
        <td>${receipt.reference}</td>
        <td>${new Date(receipt.submission_time).toLocaleDateString()}</td>
        <td>${totalAmountFormatted}</td>
        <td style="color: ${
          receipt.balance_amount == 0 ? "green" : "red"
        }">${balanceAmountFormatted}</td>
        <td>${receipt.name}</td>
        <td>${viewLink}</td>
      `;

      tbody.appendChild(row);
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  });
  // Initialize by fetching receipts when the page loads
  fetchReceipts();
});
