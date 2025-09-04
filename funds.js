// API Base URL
const BASE_URL = "http://localhost:3000";
// API Base URL
const API_BASE_URL = "http://localhost:3000/api";

// Global variables
let receipts = [];
let addedItems = [];
let selectedReceipt = null;
let colleagues = [];
let selectedColleague = null;
let currencyCode = "USD";
let currencySymbol = "$";
let userCountry = "";
let isFromSectionLocked = false;
let isCategoryLocked = false;

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the page
  initPage();

  // Event listeners
  const transferTypeSelect = document.getElementById("transferType");
  const colleagueSelect = document.getElementById("colleagueSelect");
  const receiptNumberSelect = document.getElementById("receiptNumber");
  const transferAmountInput = document.getElementById("transferAmount");
  const categorySelect = document.getElementById("category");
  const subcategorySelect = document.getElementById("subcategory");
  const addItemBtn = document.getElementById("addItemBtn");
  const proceedToSummaryBtn = document.getElementById("proceedToSummaryBtn");
  const backFromSummaryBtn = document.getElementById("backFromSummaryBtn");
  const submitTransferBtn = document.getElementById("submitTransferBtn");

  // Define subcategories for each category
  const subcategories = {
    Fuel: ["Full Tank", "Top up", "One Month Full tank", "Other"],
    "Paper Works": [
      "Government",
      "Government-eCitizen Kenya",
      "Labor Charge(Service fee)",
      "Other",
    ],
    Office: [
      "Printer",
      "Rim Papers",
      "Pen",
      "Tona",
      "Catridge",
      "Ink",
      "Stamp",
      "Other",
    ],
    "Borehole Supplies": [
      "Afri dev Pump",
      "Mark II Pump",
      "Rods",
      "Pump Installation",
      "Plaques",
      "Drill bits",
      "Rivets",
      "Casing Pipes",
      "Targid Glue",
      "Grouting",
      "Centralizers",
      "Pipes",
      "Rubber",
      "Riser Pipes (Afri Dev Pipes)",
      "Galvanized Iron Pipes(GI)",
      "Mud Pumps",
      "Water Hoses",
      "Filters",
      "Bearings",
      "Grease",
      "Labor Charge(Service fee)",
      "Other",
    ],
    Construction: [
      "Cement",
      "Sand",
      "Gravel",
      "Bricks",
      "Iron Sheets",
      "Nails",
      "Timber",
      "Labor Charge(Service fee)",
      "Other",
    ],
    Permits: [
      "Geological Survey",
      "Borehole Permits",
      "Drilling Permits",
      "Labor Charge(Service fee)",
      "Other",
    ],
    "Internet/Electricity": ["Monthly Charge", "Other"],
    Rent: ["Monthly", "Other"],
    "Vehicle Repair": [
      "Tires",
      "Alternator",
      "Battery",
      "Oil Change",
      "Brake Pads",
      "Suspension",
      "Exhaust Pipe",
      "GearBox",
      "Speedometer",
      "Oil filters",
      "Rings",
      "Air filters",
      "Grease",
      "Labor Charge(Service fee)",
      "Other",
    ],
    Expeditions: ["Car Hire", "Labor Charge(Service fee)", "Other"],
    Transport: ["Labor Charge(Service fee)", "Other"],
    Meals: ["Lunch", "Dinner", "Snacks", "Other"],
    Accommodations: ["Hotel Rooms", "Labor Charge(Service fee)", "Other"],
    Projects: [
      "Drilling Hand Boreholes",
      "Drilling Solar Boreholes",
      "Constructing Schools",
      "Labor Charge(Service fee)",
      "Other",
    ],
    Training: [
      "Sheldon's Visit",
      "General Meeting",
      "Leadership Training",
      "Transport",
      "Other",
    ],
    "Vehicle Service": [
      "Body Repair",
      "Body Paint",
      "Labor Charge(Service fee)",
      "Engine Change",
      "Insurance",
      "Other",
    ],
    Other: ["Other"],
  };

  // Event listeners
  if (transferTypeSelect) {
    transferTypeSelect.addEventListener("change", handleTransferTypeChange);
  }

  if (colleagueSelect) {
    colleagueSelect.addEventListener("change", handleColleagueSelection);
  }

  if (receiptNumberSelect) {
    receiptNumberSelect.addEventListener("change", handleReceiptSelection);
  }

  if (transferAmountInput) {
    transferAmountInput.addEventListener("input", function () {
      calculateOutstandingAmount();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", handleCategoryChange);
  }

  if (subcategorySelect) {
    subcategorySelect.addEventListener("change", handleSubcategoryChange);
  }

  if (addItemBtn) {
    addItemBtn.addEventListener("click", addItem);
  }

  if (proceedToSummaryBtn) {
    proceedToSummaryBtn.addEventListener("click", proceedToSummary);
  }

  if (backFromSummaryBtn) {
    backFromSummaryBtn.addEventListener("click", backFromSummary);
  }

  if (submitTransferBtn) {
    submitTransferBtn.addEventListener("click", submitTransfer);
  }

  // Functions
  function initPage() {
    // Load colleagues
    loadColleagues();

    // Load receipts for current user
    loadReceipts();
  }

  function lockFromSection(lock) {
    isFromSectionLocked = lock;
    const fromInputs = document.querySelectorAll(
      "#receiptNumber, #transferAmount"
    );

    fromInputs.forEach((input) => {
      input.disabled = lock;
    });

    // Also disable colleague selection if transfer type is colleague
    const transferType = document.getElementById("transferType").value;
    if (
      transferType === "colleague" &&
      document.getElementById("colleagueSelect")
    ) {
      document.getElementById("colleagueSelect").disabled = lock;
    }
  }

  function lockCategory(lock) {
    isCategoryLocked = lock;
    document.getElementById("category").disabled = lock;
  }

  async function loadColleagues() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Please log in to access this feature", "error");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/transfer_colleagues`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch colleagues");
      }

      const data = await response.json();

      if (data.success) {
        colleagues = data.data;
        populateColleaguesDropdown();
      } else {
        showNotification(data.error || "Failed to load colleagues", "error");
      }
    } catch (error) {
      console.error("Error loading colleagues:", error);
      showNotification("Error loading colleagues.", "error");
    }
  }

  function populateColleaguesDropdown() {
    const colleagueSelect = document.getElementById("colleagueSelect");
    if (!colleagueSelect) return;

    // Clear existing options
    colleagueSelect.innerHTML = "";

    if (colleagues.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No colleagues available";
      colleagueSelect.appendChild(option);
      return;
    }

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a colleague";
    colleagueSelect.appendChild(defaultOption);

    // Add colleague options
    colleagues.forEach((colleague) => {
      const option = document.createElement("option");
      option.value = colleague.Id;
      option.textContent = colleague.name;
      option.setAttribute("data-colleague", JSON.stringify(colleague));
      colleagueSelect.appendChild(option);
    });
  }

  function handleTransferTypeChange() {
    const transferType = this.value;
    const colleagueSelectionGroup = document.getElementById(
      "colleagueSelectionGroup"
    );
    const colleagueInfo = document.getElementById("colleagueInfo");

    if (transferType === "colleague") {
      colleagueSelectionGroup.style.display = "block";
      if (colleagues.length === 0) {
        loadColleagues();
      }
    } else {
      colleagueSelectionGroup.style.display = "none";
      colleagueInfo.style.display = "none";
      selectedColleague = null;

      // Load current user's receipts
      loadReceipts();
    }

    // Reset lock state when transfer type changes
    lockFromSection(false);
    lockCategory(false);
  }

  function handleColleagueSelection() {
    const selectedOption = this.options[this.selectedIndex];
    if (!selectedOption.value) {
      document.getElementById("colleagueInfo").style.display = "none";
      selectedColleague = null;
      return;
    }

    selectedColleague = JSON.parse(
      selectedOption.getAttribute("data-colleague")
    );

    // Show colleague info
    document.getElementById("selectedColleagueName").textContent =
      selectedColleague.name;
    document.getElementById("selectedColleagueEmail").textContent =
      selectedColleague.email;
    document.getElementById("colleagueInfo").style.display = "block";

    // Load colleague's receipts
    loadReceipts(selectedColleague.Id);

    // Reset lock state when colleague changes
    lockFromSection(false);
    lockCategory(false);
  }

  async function loadReceipts(colleagueId = null) {
    showLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Please log in to access this feature", "error");
        return;
      }

      let url = `${API_BASE_URL}/funds-transfer/receipts`;
      if (colleagueId) {
        url += `?colleagueId=${colleagueId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch receipts");
      }

      const data = await response.json();

      if (data.success) {
        receipts = data.data;
        populateReceiptsDropdown();
      } else {
        showNotification(data.error || "Failed to load receipts", "error");
      }
    } catch (error) {
      console.error("Error loading receipts:", error);
      showNotification("Error loading receipts. Please try again.", "error");
    } finally {
      showLoading(false);
    }
  }

  function populateReceiptsDropdown() {
    const receiptNumberSelect = document.getElementById("receiptNumber");
    if (!receiptNumberSelect) return;

    // Clear existing options
    receiptNumberSelect.innerHTML = "";

    if (receipts.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No pending receipts available";
      receiptNumberSelect.appendChild(option);
      return;
    }

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select receipt number";
    receiptNumberSelect.appendChild(defaultOption);

    // Add receipt options
    receipts.forEach((receipt) => {
      const option = document.createElement("option");
      option.value = receipt.receipt_reference;
      option.textContent = receipt.receipt_reference;
      option.setAttribute("data-receipt", JSON.stringify(receipt));
      receiptNumberSelect.appendChild(option);
    });
  }

  function handleReceiptSelection() {
    const selectedOption = this.options[this.selectedIndex];
    if (!selectedOption.value) return;

    selectedReceipt = JSON.parse(selectedOption.getAttribute("data-receipt"));

    // Set currency code and symbol from receipt
    if (selectedReceipt.currency_code) {
      currencyCode = selectedReceipt.currency_code;
      currencySymbol = getCurrencySymbol(currencyCode);
    }
    document.getElementById("currencyCode").textContent = currencyCode;

    // Populate the form fields
    document.getElementById("totalAmount").value = selectedReceipt.total_amount;
    document.getElementById("receiptAmount").value =
      selectedReceipt.balance_amount;
    document.getElementById("receiptCategory").value = selectedReceipt.category;

    // Calculate outstanding amount
    calculateOutstandingAmount();
  }

  function calculateOutstandingAmount() {
    const receiptAmount =
      parseFloat(document.getElementById("receiptAmount").value) || 0;
    const transferAmount =
      parseFloat(document.getElementById("transferAmount").value) || 0;

    if (transferAmount > receiptAmount) {
      showNotification(
        "Transfer amount cannot exceed receipt balance",
        "error"
      );
      document.getElementById("transferAmount").value = receiptAmount;
      document.getElementById("outstandingAmount").value = 0;
      return;
    }

    const outstandingAmount = receiptAmount - transferAmount;
    document.getElementById("outstandingAmount").value =
      outstandingAmount.toFixed(2);
  }

  function handleCategoryChange() {
    const selectedCategory = this.value;
    const subcategorySelect = document.getElementById("subcategory");

    if (selectedCategory) {
      // Enable subcategory select
      subcategorySelect.disabled = false;

      // Clear existing options
      subcategorySelect.innerHTML =
        '<option value="">Select subcategory</option>';

      // Add new options based on selected category
      if (subcategories[selectedCategory]) {
        subcategories[selectedCategory].forEach(function (subcat) {
          const option = document.createElement("option");
          option.value = subcat.toLowerCase().replace(/\s+/g, "-");
          option.textContent = subcat;
          subcategorySelect.appendChild(option);
        });
      }
    } else {
      // Disable subcategory select if no category selected
      subcategorySelect.disabled = true;
      subcategorySelect.innerHTML =
        '<option value="">Select subcategory</option>';
      document.getElementById("subcategoryDetails").style.display = "none";
    }
  }

  function handleSubcategoryChange() {
    const selectedSubcategory = this.options[this.selectedIndex].text;
    const subcategoryDetails = document.getElementById("subcategoryDetails");
    const selectedSubcategorySpan = document.getElementById(
      "selectedSubcategory"
    );

    if (this.value) {
      selectedSubcategorySpan.textContent = selectedSubcategory;
      subcategoryDetails.style.display = "block";

      // Lock the category when a subcategory is selected
      lockCategory(true);
    } else {
      subcategoryDetails.style.display = "none";
    }
  }

  function addItem() {
    const subcategorySelect = document.getElementById("subcategory");
    const subcategory =
      subcategorySelect.options[subcategorySelect.selectedIndex].text;
    const description = document.getElementById("itemDescription").value;
    const amount = parseFloat(document.getElementById("itemAmount").value);

    // Get transfer amount
    const transferAmount =
      parseFloat(document.getElementById("transferAmount").value) || 0;

    // Calculate total of all added items
    const currentItemsTotal = addedItems.reduce(
      (total, item) => total + item.amount,
      0
    );

    // Check if adding this item would exceed the transfer amount
    if (currentItemsTotal + amount > transferAmount) {
      showNotification(
        `Adding this item would exceed the transfer amount. Maximum amount you can add is ${currencySymbol}${(
          transferAmount - currentItemsTotal
        ).toFixed(2)}`,
        "error"
      );
      return;
    }

    if (!subcategory || !description || isNaN(amount) || amount <= 0) {
      showNotification("Please fill in all item details correctly.", "error");
      return;
    }

    // Add item to the array
    addedItems.push({
      subcategory,
      description,
      amount,
    });

    // Update the grid
    updateAddedItemsGrid();

    // Show the added items container if it's hidden
    document.getElementById("addedItemsContainer").style.display = "block";

    // Lock the From section after adding the first item
    if (addedItems.length === 1) {
      lockFromSection(true);
    }

    // Clear the form but keep the category and subcategory selected
    document.getElementById("itemDescription").value = "";
    document.getElementById("itemAmount").value = "";
  }

  function updateAddedItemsGrid() {
    const addedItemsGrid = document.getElementById("addedItemsGrid");
    // Clear the grid
    addedItemsGrid.innerHTML = "";

    // Add each item to the grid
    addedItems.forEach(function (item, index) {
      const itemCard = document.createElement("div");
      itemCard.classList.add("added-item-card");

      itemCard.innerHTML = `
                <div class="added-item-subcategory">${item.subcategory}</div>
                <div class="added-item-details">${item.description}</div>
                <div class="added-item-details"><strong>Amount: ${currencySymbol}${item.amount.toFixed(
        2
      )}</strong></div>
                <div class="item-actions">
                    <button class="item-action-btn edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="item-action-btn delete-btn" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

      addedItemsGrid.appendChild(itemCard);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = parseInt(this.getAttribute("data-index"));
        const item = addedItems[index];

        // Fill the form with item data for editing
        document.getElementById("itemDescription").value = item.description;
        document.getElementById("itemAmount").value = item.amount;

        // Remove the item from the list
        addedItems.splice(index, 1);
        updateAddedItemsGrid();

        // Show the subcategory details if hidden
        document.getElementById("subcategoryDetails").style.display = "block";

        // If no items left, unlock the From section
        if (addedItems.length === 0) {
          lockFromSection(false);
        }
      });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = parseInt(this.getAttribute("data-index"));
        addedItems.splice(index, 1);
        updateAddedItemsGrid();

        // Hide the added items container if no items left
        if (addedItems.length === 0) {
          document.getElementById("addedItemsContainer").style.display = "none";
          // Unlock the From section when all items are removed
          lockFromSection(false);
        }
      });
    });
  }

  function proceedToSummary() {
    // Validate form
    const receiptNumber = document.getElementById("receiptNumber").value;
    const totalAmount = parseFloat(
      document.getElementById("totalAmount").value
    );
    const receiptAmount = parseFloat(
      document.getElementById("receiptAmount").value
    );
    const receiptCategory = document.getElementById("receiptCategory").value;
    const transferAmount = parseFloat(
      document.getElementById("transferAmount").value
    );
    const outstandingAmount = parseFloat(
      document.getElementById("outstandingAmount").value
    );
    const category = document.getElementById("category").value;
    const transactionCost =
      parseFloat(document.getElementById("transactionCost").value) || 0;

    // FIX: Allow outstandingAmount to be 0
    if (
      !receiptNumber ||
      isNaN(totalAmount) ||
      isNaN(receiptAmount) ||
      !receiptCategory ||
      isNaN(transferAmount) ||
      (isNaN(outstandingAmount) && outstandingAmount !== 0) || // Fixed validation for 0
      !category ||
      addedItems.length === 0
    ) {
      showNotification(
        "Please complete all required fields and add at least one item.",
        "error"
      );
      return;
    }

    // Calculate total amount
    const itemsTotal = addedItems.reduce(
      (total, item) => total + item.amount,
      0
    );
    const totalTransferAmount = itemsTotal + transactionCost;

    // Update summary section
    document.getElementById("summaryReceiptNumber").textContent = receiptNumber;
    document.getElementById(
      "summaryTotalOriginalAmount"
    ).textContent = `${currencySymbol}${totalAmount.toFixed(2)}`;
    document.getElementById(
      "summaryReceiptAmount"
    ).textContent = `${currencySymbol}${receiptAmount.toFixed(2)}`;
    document.getElementById("summaryReceiptCategory").textContent =
      receiptCategory;
    document.getElementById(
      "summaryTransferAmount"
    ).textContent = `${currencySymbol}${transferAmount.toFixed(2)}`;
    document.getElementById(
      "summaryOutstandingAmount"
    ).textContent = `${currencySymbol}${outstandingAmount.toFixed(2)}`;

    document.getElementById("summaryCategory").textContent =
      document.getElementById("category").options[
        document.getElementById("category").selectedIndex
      ].text;

    // Update subcategories in summary
    const summarySubcategories = document.getElementById(
      "summarySubcategories"
    );
    summarySubcategories.innerHTML = "";

    addedItems.forEach(function (item) {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("summary-item");
      itemDiv.style.padding = "10px";
      itemDiv.style.marginBottom = "10px";
      itemDiv.style.borderBottom = "1px solid #eee";

      if (document.body.classList.contains("dark-mode")) {
        itemDiv.style.borderBottomColor = "#444";
      }

      itemDiv.innerHTML = `
                <div class="summary-label">${item.subcategory}</div>
                <div class="summary-value">${item.description}</div>
                <div class="summary-value">${currencySymbol}${item.amount.toFixed(
        2
      )}</div>
            `;

      summarySubcategories.appendChild(itemDiv);
    });

    document.getElementById(
      "summaryTransactionCost"
    ).textContent = `${currencySymbol}${transactionCost.toFixed(2)}`;
    document.getElementById(
      "summaryTotalAmount"
    ).textContent = `${currencySymbol}${totalTransferAmount.toFixed(2)}`;

    // Hide all form sections and show only summary
    document
      .querySelectorAll(".section-container:not(.summary-section)")
      .forEach((el) => {
        el.style.display = "none";
      });
    document.querySelector(".proceed-button-container").style.display = "none";
    document.getElementById("summarySection").style.display = "block";

    // Scroll to the top of the summary section
    document
      .getElementById("summarySection")
      .scrollIntoView({ behavior: "smooth" });
  }

  function backFromSummary() {
    // Show all form sections and hide summary
    document
      .querySelectorAll(".section-container:not(.summary-section)")
      .forEach((el) => {
        el.style.display = "block";
      });
    document.querySelector(".proceed-button-container").style.display = "flex";
    document.getElementById("summarySection").style.display = "none";
  }

  async function submitTransfer() {
    showLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showNotification("Please log in to submit transfers", "error");
        window.location.href = "sign.html";
        return;
      }

      // Collect all form data
      const receiptNumber = document.getElementById("receiptNumber").value;
      const totalAmount = parseFloat(
        document.getElementById("totalAmount").value
      );
      const receiptAmount = parseFloat(
        document.getElementById("receiptAmount").value
      );
      const receiptCategory = document.getElementById("receiptCategory").value;
      const transferAmount = parseFloat(
        document.getElementById("transferAmount").value
      );
      const outstandingAmount = parseFloat(
        document.getElementById("outstandingAmount").value
      );
      const category = document.getElementById("category").value;
      const transactionCost =
        parseFloat(document.getElementById("transactionCost").value) || 0;

      // Get colleague ID if selected
      const colleagueId = selectedColleague ? selectedColleague.Id : null;

      // Calculate total transfer amount
      const itemsTotal = addedItems.reduce(
        (total, item) => total + item.amount,
        0
      );
      const totalTransferAmount = itemsTotal + transactionCost;

      // Prepare data for API
      const transferData = {
        receiptNumber: parseInt(receiptNumber),
        totalAmount,
        receiptAmount,
        receiptCategory,
        transferAmount,
        outstandingAmount,
        category,
        transactionCost,
        totalAmount: totalTransferAmount,
        subcategories: addedItems,
        colleagueId,
        currencyCode,
      };

      // Send data to API
      const response = await fetch(`${API_BASE_URL}/funds-transfer/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transferData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit transfer");
      }

      if (data.success) {
        showNotification(
          "Transfer submitted successfully! It is now pending approval.",
          "success"
        );

        // Reset form
        resetForm();

        // Hide summary and show form sections
        document.getElementById("summarySection").style.display = "none";
        document
          .querySelectorAll(".section-container:not(.summary-section)")
          .forEach((el) => {
            el.style.display = "block";
          });
        document.querySelector(".proceed-button-container").style.display =
          "flex";

        // Reload receipts to update available options
        if (selectedColleague) {
          loadReceipts(selectedColleague.Id);
        } else {
          loadReceipts();
        }
      } else {
        showNotification(data.error || "Failed to submit transfer", "error");
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      showNotification(
        error.message || "Error submitting transfer. Please try again.",
        "error"
      );
    } finally {
      showLoading(false);
    }
  }

  function resetForm() {
    document.getElementById("receiptNumber").value = "";
    document.getElementById("totalAmount").value = "";
    document.getElementById("receiptAmount").value = "";
    document.getElementById("receiptCategory").value = "";
    document.getElementById("transferAmount").value = "";
    document.getElementById("outstandingAmount").value = "";
    document.getElementById("category").value = "";
    document.getElementById("subcategory").disabled = true;
    document.getElementById("subcategory").innerHTML =
      '<option value="">Select subcategory</option>';
    document.getElementById("subcategoryDetails").style.display = "none";
    document.getElementById("transactionCost").value = "0";

    // Clear added items
    addedItems = [];
    document.getElementById("addedItemsGrid").innerHTML = "";
    document.getElementById("addedItemsContainer").style.display = "none";

    // Reset selected receipt and colleague
    selectedReceipt = null;

    // Reset transfer type to self
    document.getElementById("transferType").value = "self";
    document.getElementById("colleagueSelectionGroup").style.display = "none";
    document.getElementById("colleagueInfo").style.display = "none";
    selectedColleague = null;

    // Unlock all sections
    lockFromSection(false);
    lockCategory(false);
  }

  function showNotification(message, type) {
    const notification = document.getElementById("notification");
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add("show");

    // Hide notification after 5 seconds
    setTimeout(() => {
      notification.classList.remove("show");
    }, 5000);
  }

  function showLoading(show) {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? "flex" : "none";
    }
  }

  function getCurrencySymbol(code) {
    const currencySymbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      KES: "KSh",
      // Add more currency codes as needed
    };

    return currencySymbols[code] || code;
  }
});
