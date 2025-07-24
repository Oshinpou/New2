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

  async function updatePassword() {
  const username = document.getElementById('updateUsername').value.trim();
  const email = document.getElementById('updateEmail').value.trim().toLowerCase();
  const countryCode = document.getElementById('updateCountryCode').value.trim();
  const phone = document.getElementById('updatePhone').value.trim();
  const oldPassword = document.getElementById('updateOldPassword').value.trim();
  const newPassword = document.getElementById('updateNewPassword').value.trim();
  const updateMsg = document.getElementById('updateMessage');

  updateMsg.style.color = 'red';
  updateMsg.style.display = 'block';

  if (!username || !email || !countryCode || !phone || !oldPassword || !newPassword) {
    updateMsg.textContent = 'All fields are required.';
    return;
  }

  const fullPhone = countryCode + phone;

  // Retrieve user data for email/phone verification
  gun.get('users').get(username).once(async (data) => {
    if (!data) {
      updateMsg.textContent = 'User not found.';
      return;
    }

    const storedEmail = (data.email || '').toLowerCase();
    const storedPhone = (data.phone || '');

    if (storedEmail !== email || storedPhone !== fullPhone) {
      updateMsg.textContent = 'Details do not match.';
      return;
    }

    // Authenticate with old password
    user.auth(username, oldPassword, async (ack) => {
      if (ack.err) {
        updateMsg.textContent = 'Old password is incorrect.';
        return;
      }

      // Encrypt and update new password
      const encPass = await Gun.SEA.encrypt(newPassword, newPassword);
      gun.get('user_passwords').get(username).put({ encPass });

      updateMsg.textContent = 'Password updated successfully.';
      updateMsg.style.color = 'green';
    });
  });
  }
