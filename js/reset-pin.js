document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");
  const messageElement = document.getElementById("reset-pin-message");
  const emailDisplay = document.getElementById("email-display");

  // Display the email (but not editable)
  if (email) {
    emailDisplay.textContent = `Resetting PIN for: ${email}`;
  }

  // If no token or email is provided, show error
  if (!token || !email) {
    messageElement.textContent = "Invalid or expired reset link.";
    messageElement.style.color = "red";
    document.getElementById("reset-pin-btn").disabled = true;
    return;
  }

  function isValidPin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      return false;
    }

    for (let i = 0; i < pin.length - 1; i++) {
      if (parseInt(pin[i + 1]) - parseInt(pin[i]) === 1) {
        return false;
      }
    }

    return true;
  }

  // Handle PIN input validation
  const newPinInput = document.getElementById("new-pin");
  newPinInput.addEventListener("input", function () {
    const pin = this.value;
    const hintElement = document.getElementById("new-pin-hint");

    if (pin && !isValidPin(pin)) {
      hintElement.style.color = "red";
    } else {
      hintElement.style.color = "";
    }
  });

  const confirmNewPinInput = document.getElementById("confirm-new-pin");
  confirmNewPinInput.addEventListener("input", function () {
    const pin = document.getElementById("new-pin").value;
    const confirmPin = this.value;
    const hintElement = document.getElementById("confirm-new-pin-hint");

    if (confirmPin && pin !== confirmPin) {
      hintElement.style.color = "red";
    } else {
      hintElement.style.color = "";
    }
  });

  // Handle PIN reset submission
  const resetPinBtn = document.getElementById("reset-pin-btn");
  resetPinBtn.addEventListener("click", async () => {
    const newPin = document.getElementById("new-pin").value;
    const confirmNewPin = document.getElementById("confirm-new-pin").value;

    messageElement.textContent = "";

    let isValid = true;

    if (!newPin || !isValidPin(newPin)) {
      document.getElementById("new-pin-hint").style.color = "red";
      isValid = false;
    } else {
      document.getElementById("new-pin-hint").style.color = "";
    }

    if (newPin !== confirmNewPin) {
      document.getElementById("confirm-new-pin-hint").style.color = "red";
      isValid = false;
    } else {
      document.getElementById("confirm-new-pin-hint").style.color = "";
    }

    if (!isValid) {
      messageElement.textContent = "Please fix the highlighted errors.";
      messageElement.style.color = "red";
      return;
    }

    try {
      const res = await fetch(
        "https://fhserver.org.fh260.org/api/complete-pin-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email, newPin }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        messageElement.textContent =
          "PIN reset successful! Redirecting to login...";
        messageElement.style.color = "#28a745";

        setTimeout(() => {
          window.location.href = "sign.html?resetSuccess=true";
        }, 2000);
      } else {
        messageElement.textContent =
          data.message || "Failed to reset PIN. Please try again.";
        messageElement.style.color = "red";
      }
    } catch (err) {
      messageElement.textContent = "An error occurred. Please try again.";
      messageElement.style.color = "red";
      console.error(err);
    }
  });
});
