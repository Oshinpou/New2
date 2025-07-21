document.addEventListener("DOMContentLoaded", function () { const db = Gun();

const users = db.get('users');

function getUserKey(username) { return username.toLowerCase(); }

// Register function window.register = function () { const username = document.getElementById("reg-username").value.trim(); const email = document.getElementById("reg-email").value.trim(); const password = document.getElementById("reg-password").value.trim(); const phone = document.getElementById("reg-phone").value.trim(); const country = document.getElementById("reg-country").value.trim();

if (!username || !email || !password || !phone || !country) {
  alert("All fields are required.");
  return;
}

const fullPhone = `${country}-${phone}`;

users.map().once(data => {
  if (data) {
    if (
      data.username === username ||
      data.email === email ||
      data.phone === fullPhone
    ) {
      alert("Username, email, or phone number already exists.");
      throw new Error("Duplicate registration");
    }
  }
});

const userKey = getUserKey(username);

users.set({
  username,
  email,
  password,
  phone: fullPhone,
  createdAt: Date.now()
});

alert("Registration successful");

};

// Login function window.login = function () { const username = document.getElementById("login-username").value.trim(); const password = document.getElementById("login-password").value.trim();

if (!username || !password) {
  alert("Both fields are required.");
  return;
}

users.map().once(data => {
  if (data && data.username === username && data.password === password) {
    localStorage.setItem("loggedInUser", JSON.stringify(data));
    alert("Login successful");
    return;
  }
});

};

// Logout function window.logout = function () { localStorage.removeItem("loggedInUser"); alert("Logged out"); };

// Recover password window.recoverPassword = function () { const username = document.getElementById("recover-username").value.trim(); const phone = document.getElementById("recover-phone").value.trim(); const country = document.getElementById("recover-country").value.trim();

const fullPhone = `${country}-${phone}`;

users.map().once(data => {
  if (data && data.username === username && data.phone === fullPhone) {
    alert(`Password for ${username} is: ${data.password}`);
    return;
  }
});

};

// Delete Account window.deleteAccount = function () { const username = document.getElementById("delete-username").value.trim(); const email = document.getElementById("delete-email").value.trim(); const phone = document.getElementById("delete-phone").value.trim(); const country = document.getElementById("delete-country").value.trim(); const password = document.getElementById("delete-password").value.trim();

const fullPhone = `${country}-${phone}`;

users.map().once((data, key) => {
  if (
    data &&
    data.username === username &&
    data.email === email &&
    data.phone === fullPhone &&
    data.password === password
  ) {
    db.get('users').get(key).put(null);
    alert("Account deleted successfully");
    return;
  }
});

};

// Status Check window.showStatus = function () { const user = localStorage.getItem("loggedInUser"); if (user) { alert("Logged in as " + JSON.parse(user).username); } else { alert("Not logged in"); } }; });

