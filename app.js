// Initialize Gun
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
});

const user = gun.user();

// Register
window.register = async function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const countryCode = document.getElementById('countryCode').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!username || !password) return showMessage("Username and password required");
  if (!email) return showMessage("Email is required");
  if (!countryCode || !phone) return showMessage("Phone number with country code required");

  const fullPhone = countryCode + phone;

  // Check if email is already used
  gun.get('emails').get(email).once(emailData => {
    if (emailData) return showMessage("This email is already registered");

    // Check if full phone number is already used
    gun.get('phones').get(fullPhone).once(phoneData => {
      if (phoneData) return showMessage("This phone number with country code is already registered");

      // Check if username is already taken
      gun.get('users').get(username).once(async userData => {
        if (userData) return showMessage("Username already taken.");

        // Create account
        user.create(username, password, (ack) => {
          if (ack.err) return showMessage("Register failed: " + ack.err);

          // Save user data and references
          gun.get('users').get(username).put({
            created: Date.now(),
            email: email,
            phone: fullPhone
          });

          // Map email and phone to prevent reuse
          gun.get('emails').get(email).put({ username });
gun.get('phones').get(fullPhone).put({ username });
gun.get('user_passwords').get(username).put({ password });

showMessage("Registered! Please login.");
        });
      });
    });
  });
}

// Login
window.login = async function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    return showMessage("Username and password required");
  }

  user.auth(username, password, (ack) => {
    if (ack.err) return showMessage("Login failed: " + ack.err);
    showMessage("Welcome, " + username);
  });
}

function showMessage(msg) {
  document.getElementById('msg').innerText = msg;
}


// Password Reset
window.resetPassword = function () {
  const username = document.getElementById('resetUsername').value.trim();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const countryCode = document.getElementById('resetCountryCode').value.trim();
  const phone = document.getElementById('resetPhone').value.trim();
  const newPassword = document.getElementById('resetNewPassword').value.trim();
  const fullPhone = countryCode + phone;

  if (!username || !email || !countryCode || !phone || !newPassword) {
    return showResetMsg("All fields are required");
  }

  gun.get('users').get(username).once(userData => {
    if (!userData) return showResetMsg("User not found");

    const savedEmail = (userData.email || "").toLowerCase();
    const savedPhone = userData.phone || "";

    if (savedEmail === email && savedPhone === fullPhone) {
      // Authenticate to allow password update
      user.auth(username, userData.password || "", (ack) => {
        if (ack.err) {
          return showResetMsg("Authentication failed. Cannot reset.");
        }

        // Change password
        user.leave(); // ensure logout before change
        Gun.SEA.pair().then(newPair => {
          user.create(username, newPassword, (ack) => {
            if (ack.err) return showResetMsg("Failed to reset password: " + ack.err);

            // Update password reference for future auth (custom field)
            gun.get('user_passwords').get(username).put({ password: newPassword });

            showResetMsg("Password successfully reset. Please login.");
          });
        });
      });
    } else {
      showResetMsg("Email or phone number with country code does not match");
    }
  });
}

function showResetMsg(msg) {
  document.getElementById('resetMsg').innerText = msg;
}
