//Base URL initialization
const BASE_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  // Make the approve and reject functions globally available
  window.approveRequest = approveRequest;
  window.rejectRequest = rejectRequest;

  function convertToViewLink(link) {
    const match = link.match(/[-\w]{25,}/);
    const fileId = match ? match[0] : null;
    return fileId ? `https://drive.google.com/file/d/${fileId}/view` : link;
  }

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token || !user) {
    showNotification("Please login first.", "error");
    window.location.href = "sign.html";
    return;
  }

  if (user.country !== "USA") {
    showNotification("Not authorized to view this page.", "error");
    window.location.href = "home.html";
    return;
  }

  // Elements
  const receiptTypeSelect = document.getElementById("receiptTypeFilter");
  const countrySelect = document.getElementById("countryFilter");
  const userSelect = document.getElementById("userFilter");
  const receiptsSection = document.getElementById("receiptsSection");

  // Load initial countries and users
  fetch(`${BASE_URL}/api/admin/filters`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      populateSelect(countrySelect, ["All", ...data.countries]);
      populateSelect(userSelect, ["All"]); // Initially all users
    })
    .catch((error) => {
      console.error("Error loading filters:", error);
      showNotification("Error loading filter options", "error");
    });

  function populateSelect(select, options) {
    if (!select) return;

    select.innerHTML = "";
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
  }

  function fetchReceipts() {
    if (!receiptTypeSelect || !countrySelect || !userSelect) return;

    const params = new URLSearchParams({
      receiptType: receiptTypeSelect.value,
      country: countrySelect.value,
      user: userSelect.value,
    });

    fetch(`${BASE_URL}/api/admin/receipts?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        renderReceipts(data.receipts);
      })
      .catch((error) => {
        console.error("Error fetching receipts:", error);
        showNotification("Error loading receipts", "error");
      });
  }

  function formatCurrency(amount, currencyCode) {
    // Default to USD if no currency code is provided
    const code = currencyCode || "USD";

    try {
      // Create a formatter for the specific currency
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
      }).format(parseFloat(amount));
    } catch (error) {
      console.error("Error formatting currency:", error);
      return `${amount} ${code}`;
    }
  }

  function renderReceipts(receipts) {
    if (!receiptsSection) return;

    receiptsSection.innerHTML = "";

    if (!receipts || receipts.length === 0) {
      receiptsSection.innerHTML =
        "<div class='no-results'>No receipts found</div>";
      return;
    }

    receipts.forEach((receipt) => {
      const row = document.createElement("div");
      row.className = "receipt-row";

      // Format the amounts with the correct currency
      const totalAmountFormatted = formatCurrency(
        receipt.total_amount,
        receipt.currency_code
      );
      const balanceAmountFormatted = formatCurrency(
        receipt.balance_amount,
        receipt.currency_code
      );

      row.innerHTML = `
        <div>${receipt.reference || "N/A"}</div>
        <div>${new Date(receipt.submission_time).toLocaleDateString()}</div>
        <div>${totalAmountFormatted}</div>
        <div style="color: ${receipt.balance_amount == 0 ? "green" : "red"};">
          ${balanceAmountFormatted}
        </div>
        <div>${receipt.name || "Unknown"}</div>
        <div>
          ${
            receipt.drive_link
              ? `<a href="${convertToViewLink(
                  receipt.drive_link
                )}" target="_blank">View Receipt</a>`
              : "-"
          }
        </div>
      `;

      receiptsSection.appendChild(row);
    });
  }

  // Set up event listeners if elements exist
  if (receiptTypeSelect) {
    receiptTypeSelect.addEventListener("change", fetchReceipts);
  }

  if (countrySelect) {
    countrySelect.addEventListener("change", () => {
      if (countrySelect.value === "All") {
        populateSelect(userSelect, ["All"]);
      } else {
        fetch(`${BASE_URL}/api/admin/users?country=${countrySelect.value}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            populateSelect(userSelect, ["All", ...data.users]);
          })
          .catch((error) => {
            console.error("Error loading users:", error);
            showNotification(
              "Error loading users for selected country",
              "error"
            );
          });
      }
      fetchReceipts();
    });
  }

  if (userSelect) {
    userSelect.addEventListener("change", fetchReceipts);
  }

  // Initial fetch
  fetchReceipts();

  function loadPendingRequests() {
    fetch(`${BASE_URL}/api/admin/pending-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((requests) => {
        const container = document.getElementById("requests-list");
        if (!container) return;

        if (!requests || requests.length === 0) {
          container.innerHTML =
            "<div class='no-requests'>No pending requests</div>";
          return;
        }

        container.innerHTML = requests
          .map(
            (req) => `
            <div class="table-row">
              <div>${req.name || "N/A"}</div>
              <div>${req.email || "N/A"}</div>
              <div>${req.country || "N/A"}</div>
              <div>${new Date(req.requested_at).toLocaleDateString()}</div>
              <div class="actions">
                <button class="approve-btn" data-id="${req.id}">Approve</button>
                <button class="reject-btn" data-id="${req.id}">Reject</button>
              </div>
            </div>
          `
          )
          .join("");

        // Add event listeners to the buttons
        document.querySelectorAll(".approve-btn").forEach((btn) => {
          btn.addEventListener("click", () => approveRequest(btn.dataset.id));
        });

        document.querySelectorAll(".reject-btn").forEach((btn) => {
          btn.addEventListener("click", () => rejectRequest(btn.dataset.id));
        });
      })
      .catch((err) => {
        console.error("Error loading requests:", err);
        showNotification("Error loading requests", "error");
      });
  }

  async function approveRequest(requestId) {
    try {
      showLoadingSpinner(true);
      const response = await fetch(
        `${BASE_URL}/api/admin/approve-request/${requestId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! Status: ${response.status}`
        );
      }

      const data = await response.json();
      loadPendingRequests();
      showNotification(
        data.message || "Request approved and code sent",
        "success"
      );
    } catch (err) {
      console.error("Approval error:", err);
      showNotification(`Error approving request: ${err.message}`, "error");
    } finally {
      showLoadingSpinner(false);
    }
  }

  async function rejectRequest(requestId) {
    try {
      const reason = prompt("Enter reason for rejection (optional):");

      showLoadingSpinner(true);
      const response = await fetch(
        `${BASE_URL}/api/admin/reject-request/${requestId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // Send the reason as part of the request body, but as just 'status'
          body: JSON.stringify({ status: "rejected" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! Status: ${response.status}`
        );
      }

      const data = await response.json();
      loadPendingRequests();
      showNotification(data.message || "Request rejected", "success");
    } catch (err) {
      console.error("Rejection error:", err);
      showNotification(`Error rejecting request: ${err.message}`, "error");
    } finally {
      showLoadingSpinner(false);
    }
  }

  function showLoadingSpinner(show) {
    const existingSpinner = document.getElementById("loading-spinner");

    if (show) {
      if (!existingSpinner) {
        const spinner = document.createElement("div");
        spinner.id = "loading-spinner";
        spinner.className = "spinner-overlay";
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
      }
    } else {
      if (existingSpinner) {
        existingSpinner.remove();
      }
    }
  }

  function showNotification(message, type) {
    const existing = document.getElementById("notification");
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement("div");
    notification.id = "notification";
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");

      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 500);
      }, 3000);
    }, 10);
  }

  // Initial load
  loadPendingRequests();

  // Periodically refresh data
  setInterval(loadPendingRequests, 30000);
});
