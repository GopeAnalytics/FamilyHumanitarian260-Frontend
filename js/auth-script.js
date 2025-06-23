(function () {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    console.log("No authentication token found. Redirecting to login page...");
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "sign.html";
  } else {
    try {
      const userData = JSON.parse(user);
      if (!userData.name || !userData.email) {
        console.log("Invalid user data. Redirecting to login page...");
        window.location.href = "sign.html";
      }
    } catch (e) {
      console.error("Error parsing user data:", e);
      window.location.href = "sign.html";
    }
  }
})();
