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
        user.create(username, password, async (ack) => {
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

          // Encrypt and store password securely
          const encPass = await Gun.SEA.encrypt(password, password);
          gun.get('user_passwords').get(username).put({ encPass });

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
window.resetPassword = async function () {
  const username = document.getElementById('resetUsername').value.trim();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const countryCode = document.getElementById('resetCountryCode').value.trim();
  const phone = document.getElementById('resetPhone').value.trim();
  const fullPhone = countryCode + phone;
  const newPassword = document.getElementById('resetNewPassword').value.trim();

  if (!username || !email || !countryCode || !phone || !newPassword) {
    return showResetMsg("All fields are required.");
  }

  // Step 1: Get user data
  gun.get('users').get(username).once(async userData => {
    if (!userData) return showResetMsg("User not found.");

    const storedEmail = (userData.email || "").toLowerCase();
    const storedPhone = userData.phone || "";

    // Step 2: Match credentials
    if (storedEmail !== email || storedPhone !== fullPhone) {
      return showResetMsg("Email or phone number does not match.");
    }

    // Step 3: Try to fetch and decrypt old password
    gun.get('user_passwords').get(username).once(async pwData => {
      const encPass = pwData?.encPass;
      if (!encPass) return showResetMsg("Old password not found. Cannot authenticate.");

      // Try decrypting with old password (brute-fallback logic)
      let decrypted;
      try {
        decrypted = await Gun.SEA.decrypt(encPass, newPassword);
        if (decrypted === newPassword) {
          return showResetMsg("You are already using this password.");
        }
      } catch (e) {}

      // Try decrypting with guessed old password (from stored encryption)
      let oldPassword;
      try {
        oldPassword = await Gun.SEA.decrypt(encPass, decrypted);
      } catch (e) {
        return showResetMsg("Failed to authenticate old password.");
      }

      if (!oldPassword) {
        return showResetMsg("Decryption failed. Cannot authenticate.");
      }

      user.auth(username, oldPassword, async authAck => {
        if (authAck.err) {
          return showResetMsg("Authentication failed. Cannot reset.");
        }

        user.leave();

        // Recreate SEA user with new password
        user.create(username, newPassword, async createAck => {
          if (createAck.err) {
            return showResetMsg("Password reset failed: " + createAck.err);
          }

          // Encrypt and store new password
          const newEncPass = await Gun.SEA.encrypt(newPassword, newPassword);
          gun.get('user_passwords').get(username).put({ encPass: newEncPass });

          showResetMsg("Password reset successful. Please log in.");
        });
      });
    });
  });
}

// Show message in password reset section
function showResetMsg(msg) {
  const el = document.getElementById("resetMessage");
  if (el) {
    el.innerText = msg;
    el.style.display = "block";
  }
            }
