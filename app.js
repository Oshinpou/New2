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

  // Utility to show message
function showMessage(msg, success = false) {
  const msgBox = document.getElementById('updateMsg');
  msgBox.style.color = success ? 'green' : 'red';
  msgBox.textContent = msg;
}

// Main function
const form = document.getElementById('updatePasswordForm');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('updateUsername').value.trim();
  const email = document.getElementById('updateEmail').value.trim();
  const oldPassword = document.getElementById('oldPassword').value.trim();
  const newPassword = document.getElementById('newPassword').value.trim();

  if (!username || !email || !oldPassword || !newPassword) {
    return showMessage("Please fill in all fields");
  }

  // Step 1: Authenticate user with old password
  user.auth(username, oldPassword, async (authAck) => {
    if (authAck.err) return showMessage("Old password is incorrect");

    // Step 2: Check if email matches
    user.get('email').once((storedEmail) => {
      if (!storedEmail || storedEmail.toLowerCase() !== email.toLowerCase()) {
        user.leave();
        return showMessage("Email does not match");
      }

      // Step 3: Backup additional user data if needed (currently just email)
      const backupData = { email: storedEmail };

      // Step 4: Logout current session
      user.leave();

      // Step 5: Re-create user with same username and new password
      gun.user().create(username, newPassword, (createAck) => {
        if (createAck.err && createAck.err.includes('User already created')) {
          return showMessage("Account already exists. Cannot reset password this way.");
        }
        if (createAck.err) return showMessage("Failed to update password: " + createAck.err);

        // Step 6: Log in with new password
        gun.user().auth(username, newPassword, (loginAck) => {
          if (loginAck.err) return showMessage("Password changed, but login failed");

          // Step 7: Restore backed up user data
          gun.user().get('email').put(backupData.email);

          showMessage("Password changed successfully", true);
        });
      });
    });
  });
});

