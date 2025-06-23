// Utility function to show spinner
function showSpinner(button) {
  const originalText = button.textContent;
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span> ${originalText}...`;
  return originalText;
}

function hideSpinner(button, originalText) {
  button.disabled = false;
  button.textContent = originalText;
}

// Add new form toggles
document
  .getElementById("show-request-signup")
  .addEventListener("click", (e) => {
    e.preventDefault();
    toggleForms("request-signup");
  });

document.getElementById("show-code-signup").addEventListener("click", (e) => {
  e.preventDefault();
  toggleForms("sign-up");
});

document
  .getElementById("back-to-signin-from-request")
  .addEventListener("click", (e) => {
    e.preventDefault();
    toggleForms("sign-in");
  });

// Modified toggle function
function toggleForms(showId) {
  const forms = ["sign-in", "sign-up", "change-pin", "request-signup"];
  forms.forEach((formId) => {
    document.getElementById(formId).style.display =
      formId === showId ? "block" : "none";
  });
}

// Handle signup request submission
document
  .getElementById("submit-request")
  .addEventListener("click", async () => {
    const button = document.getElementById("submit-request");
    const originalText = showSpinner(button);

    const name = document.getElementById("request-name").value.trim();
    const email = document.getElementById("request-email").value.trim();
    const country = document.getElementById("request-country").value;
    const messageElement = document.getElementById("request-message");

    // Basic validation
    if (!name || !email || !country) {
      messageElement.textContent = "All fields are required";
      messageElement.style.color = "red";
      hideSpinner(button, originalText);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/request-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, country }),
      });

      const data = await response.json();

      if (response.ok) {
        messageElement.textContent =
          "Request submitted! You'll receive a code via email once approved.";
        messageElement.style.color = "green";

        setTimeout(() => {
          toggleForms("sign-up");
          document.getElementById("sign-up-email").value = email;
        }, 2000);
      } else {
        messageElement.textContent = data.error || "Error submitting request";
        messageElement.style.color = "red";
      }
    } catch (err) {
      messageElement.textContent = "Network error - please try again";
      messageElement.style.color = "red";
    } finally {
      hideSpinner(button, originalText);
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  const signInForm = document.getElementById("sign-in");
  const signUpForm = document.getElementById("sign-up");
  const changePinForm = document.getElementById("change-pin");

  const showSignUpLink = document.getElementById("show-signup");
  const showSignInLink = document.querySelector(".auth-switch a#show-signin");
  const showForgotPinLink = document.getElementById("show-forgot-pin");
  const backToSignInLink = document.getElementById("back-to-signin");

  if (showSignUpLink) {
    showSignUpLink.addEventListener("click", (e) => {
      e.preventDefault();
      signInForm.style.display = "none";
      signUpForm.style.display = "block";
      changePinForm.style.display = "none";
    });
  }

  if (showSignInLink) {
    showSignInLink.addEventListener("click", (e) => {
      e.preventDefault();
      signInForm.style.display = "block";
      signUpForm.style.display = "none";
      changePinForm.style.display = "none";
    });
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  // Sign In Button with Spinner
  const signInBtn = document.getElementById("sign-in-btn");
  if (signInBtn) {
    signInBtn.addEventListener("click", async () => {
      const originalText = showSpinner(signInBtn);

      const credential = document.getElementById("sign-in-name").value;
      const pin = document.getElementById("sign-in-pin").value;
      const messageElement = document.getElementById("sign-in-message");

      if (!credential || !pin) {
        messageElement.textContent = "All fields are required.";
        messageElement.style.color = "red";
        hideSpinner(signInBtn, originalText);
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, pin }),
        });

        const data = await res.json();

        if (res.ok) {
          messageElement.textContent = "Login successful! Redirecting...";
          messageElement.classList.add("success");
          messageElement.style.color = "#28a745";

          localStorage.setItem("token", data.token);
          localStorage.setItem(
            "user",
            JSON.stringify({
              Id: data.user.Id,
              name: data.user.name,
              email: data.user.email,
              country: data.user.country,
            })
          );

          setTimeout(() => {
            if (data.user.country === "USA") {
              window.location.href = "admin.html";
            } else {
              window.location.href = "home.html";
            }
          }, 1000);
        } else {
          messageElement.textContent = data.message;
          messageElement.classList.add("error");
          messageElement.style.color = "red";
          hideSpinner(signInBtn, originalText);
        }
      } catch (err) {
        messageElement.textContent = "An error occurred. Please try again.";
        messageElement.style.color = "red";
        hideSpinner(signInBtn, originalText);
        console.error(err);
      }
    });
  }

  async function verifySignupCode(code) {
    try {
      const response = await fetch(
        "http://localhost:3000/api/validate-signup-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      return await response.json();
    } catch (error) {
      console.error("Code verification error:", error);
      return { error: "Failed to verify code" };
    }
  }

  // Verify Code Button with Spinner
  document
    .getElementById("verify-code-btn")
    ?.addEventListener("click", async () => {
      const button = document.getElementById("verify-code-btn");
      const originalText = showSpinner(button);

      const code = document.getElementById("sign-up-code").value.trim();
      const messageElement = document.getElementById("code-hint");

      if (!code) {
        messageElement.textContent = "Please enter a signup code";
        messageElement.style.color = "red";
        hideSpinner(button, originalText);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:3000/api/validate-signup-code",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Code verification failed");
        }

        // Validate response structure
        if (!data.name || !data.email || !data.country) {
          throw new Error("Invalid server response - missing user data");
        }

        // Auto-fill the form fields
        document.getElementById("sign-up-name").value = data.name;
        document.getElementById("sign-up-email").value = data.email;
        document.getElementById("sign-up-country").value = data.country;

        // Lock the auto-filled fields
        document.getElementById("sign-up-name").readOnly = true;
        document.getElementById("sign-up-email").readOnly = true;
        document.getElementById("sign-up-country").disabled = true;

        messageElement.textContent =
          "Code verified! Please complete your registration.";
        messageElement.style.color = "green";
      } catch (error) {
        console.error("Verification error:", error);
        messageElement.textContent = error.message;
        messageElement.style.color = "red";
      } finally {
        hideSpinner(button, originalText);
      }
    });

  // Sign Up Button with Spinner
  const signUpBtn = document.getElementById("sign-up-btn");
  if (signUpBtn) {
    signUpBtn.addEventListener("click", async () => {
      const originalText = showSpinner(signUpBtn);

      const code = document.getElementById("sign-up-code").value.trim();
      const name = document.getElementById("sign-up-name").value.trim();
      const email = document.getElementById("sign-up-email").value.trim();
      const pin = document.getElementById("sign-up-pin").value;
      const confirmPin = document.getElementById("sign-up-confirm-pin").value;
      const country = document.getElementById("sign-up-country").value;
      const messageElement = document.getElementById("sign-up-message");

      messageElement.textContent = "";
      messageElement.className = "message";

      if (!code) {
        messageElement.textContent = "Please verify your signup code first";
        messageElement.style.color = "red";
        hideSpinner(signUpBtn, originalText);
        return;
      }

      let isValid = true;

      // Name validation with null check
      const nameHint = document.getElementById("name-hint");
      if (!name || name.length < 3) {
        if (nameHint) nameHint.style.color = "red";
        isValid = false;
      } else {
        if (nameHint) nameHint.style.color = "";
      }

      // Email validation with null check
      const emailHint = document.getElementById("email-hint");
      if (!email || !isValidEmail(email)) {
        if (emailHint) emailHint.style.color = "red";
        isValid = false;
      } else {
        if (emailHint) emailHint.style.color = "";
      }

      // PIN validation with null check
      const pinHint = document.getElementById("pin-hint");
      if (!pin || !isValidPin(pin)) {
        if (pinHint) pinHint.style.color = "red";
        isValid = false;
      } else {
        if (pinHint) pinHint.style.color = "";
      }

      // Confirm PIN validation with null check
      const confirmPinHint = document.getElementById("confirm-pin-hint");
      if (pin !== confirmPin) {
        if (confirmPinHint) confirmPinHint.style.color = "red";
        isValid = false;
      } else {
        if (confirmPinHint) confirmPinHint.style.color = "";
      }

      if (!country) {
        messageElement.textContent = "Please select a country.";
        messageElement.classList.add("error");
        messageElement.style.color = "red";
        isValid = false;
      }

      if (!isValid) {
        messageElement.textContent = "Please fix the highlighted errors.";
        messageElement.classList.add("error");
        messageElement.style.color = "red";
        hideSpinner(signUpBtn, originalText);
        return;
      }

      // Submit registration
      try {
        const res = await fetch("http://localhost:3000/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name, email, pin, country }),
        });

        const data = await res.json();

        if (res.ok) {
          messageElement.textContent =
            "Registration successful! Redirecting to login...";
          messageElement.classList.add("success");
          messageElement.style.color = "#28a745";

          setTimeout(() => {
            toggleForms("sign-in");
            document.getElementById("sign-in-message").textContent =
              "Registration successful! Please sign in.";
            document.getElementById("sign-in-message").className =
              "message success";
            document.getElementById("sign-in-name").value = email;
          }, 2000);
        } else {
          messageElement.textContent =
            data.message || "Registration failed. Please try again.";
          messageElement.classList.add("error");
          messageElement.style.color = "red";
          hideSpinner(signUpBtn, originalText);
        }
      } catch (err) {
        messageElement.textContent = "An error occurred. Please try again.";
        messageElement.classList.add("error");
        messageElement.style.color = "red";
        hideSpinner(signUpBtn, originalText);
        console.error(err);
      }
    });
  }

  if (showForgotPinLink) {
    showForgotPinLink.addEventListener("click", (e) => {
      e.preventDefault();
      signInForm.style.display = "none";
      signUpForm.style.display = "none";
      changePinForm.style.display = "block";
    });
  }

  if (backToSignInLink) {
    backToSignInLink.addEventListener("click", (e) => {
      e.preventDefault();
      signInForm.style.display = "block";
      signUpForm.style.display = "none";
      changePinForm.style.display = "none";
    });
  }
});

// Handle PIN reset
document.addEventListener("DOMContentLoaded", () => {
  // Check if the user was redirected from a successful PIN reset
  const params = new URLSearchParams(window.location.search);
  if (params.get("resetSuccess") === "true") {
    document.getElementById("sign-in-message").textContent =
      "PIN reset successful! Please sign in with your new PIN.";
    document.getElementById("sign-in-message").style.color = "#28a745";
  }

  const showForgotPinLink = document.getElementById("show-forgot-pin");
  const backToSignInLink = document.getElementById("back-to-signin");

  if (showForgotPinLink) {
    showForgotPinLink.addEventListener("click", (e) => {
      e.preventDefault();
      toggleForms("change-pin");
    });
  }

  if (backToSignInLink) {
    backToSignInLink.addEventListener("click", (e) => {
      e.preventDefault();
      toggleForms("sign-in");
    });
  }

  // Function to validate email format
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Send Reset Link Button with Spinner
  const requestResetBtn = document.getElementById("request-reset-btn");
  if (requestResetBtn) {
    requestResetBtn.addEventListener("click", async () => {
      const originalText = showSpinner(requestResetBtn);

      const email = document.getElementById("reset-email").value.trim();
      const messageElement = document.getElementById("reset-pin-message");
      const hintElement = document.getElementById("reset-email-hint");

      // Reset previous messages
      messageElement.textContent = "";
      hintElement.style.color = "";

      // Validate email
      if (!email) {
        messageElement.textContent = "Please enter your email address.";
        messageElement.style.color = "red";
        hideSpinner(requestResetBtn, originalText);
        return;
      }

      if (!isValidEmail(email)) {
        hintElement.style.color = "red";
        messageElement.textContent = "Please enter a valid email address.";
        messageElement.style.color = "red";
        hideSpinner(requestResetBtn, originalText);
        return;
      }

      try {
        const res = await fetch("http://localhost:3000/api/request-pin-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();

        if (res.ok) {
          messageElement.textContent =
            "Reset link has been sent to your email. Please check your inbox and follow the instructions.";
          messageElement.style.color = "#28a745";
        } else {
          messageElement.textContent =
            data.message || "Failed to send reset link. Please try again.";
          messageElement.style.color = "red";
        }
      } catch (err) {
        messageElement.textContent = "An error occurred. Please try again.";
        messageElement.style.color = "red";
        console.error(err);
      } finally {
        hideSpinner(requestResetBtn, originalText);
      }
    });
  }

  // Email validation for reset form
  const resetEmailInput = document.getElementById("reset-email");
  if (resetEmailInput) {
    resetEmailInput.addEventListener("input", function () {
      const email = this.value.trim();
      const hintElement = document.getElementById("reset-email-hint");

      if (email && !isValidEmail(email)) {
        hintElement.style.color = "red";
      } else {
        hintElement.style.color = "";
      }
    });
  }

  const newPinInput = document.getElementById("new-pin");
  if (newPinInput) {
    newPinInput.addEventListener("input", function () {
      const pin = this.value;
      const hintElement = document.getElementById("new-pin-hint");

      if (pin && !isValidPin(pin)) {
        hintElement.style.color = "red";
      } else {
        hintElement.style.color = "";
      }
    });
  }

  const confirmNewPinInput = document.getElementById("confirm-new-pin");
  if (confirmNewPinInput) {
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
  }
});
