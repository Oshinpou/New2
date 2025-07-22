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

function updatePassword() {
  const username = document.getElementById('updateUsername').value.trim();
  const email = document.getElementById('updateEmail').value.trim();
  const countryCode = document.getElementById('updateCountryCode').value.trim();
  const phone = document.getElementById('updatePhone').value.trim();
  const newPassword = document.getElementById('updateNewPassword').value;

  const updateMsg = document.getElementById('updateMessage');
  updateMsg.style.display = 'none';

  if (!username || !email || !countryCode || !phone || !newPassword) {
    updateMsg.textContent = 'All fields are required.';
    updateMsg.style.display = 'block';
    return;
  }

  gun.get('users').get(username).once(async (data) => {
    if (!data) {
      updateMsg.textContent = 'User not found.';
      updateMsg.style.display = 'block';
      return;
    }

    const storedEmail = data.email;
    const storedPhone = data.phone;
    const storedCode = data.countryCode;

    if (storedEmail !== email || storedPhone !== phone || storedCode !== countryCode) {
      updateMsg.textContent = 'Details do not match.';
      updateMsg.style.display = 'block';
      return;
    }

    try {
      const pair = await SEA.pair();
      const encryptedPassword = await SEA.encrypt(newPassword, pair);
      gun.get('users').get(username).put({
        password: encryptedPassword,
        pub: pair.pub,
        epub: pair.epub,
        priv: pair.priv,
        epriv: pair.epriv
      });
      updateMsg.textContent = 'Password updated successfully.';
      updateMsg.style.color = 'green';
      updateMsg.style.display = 'block';
    } catch (err) {
      updateMsg.textContent = 'Error updating password.';
      updateMsg.style.display = 'block';
    }
  });
}
