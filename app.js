// Initialize Gun
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
});

const user = gun.user();
user.recall({ sessionStorage: true });
updateStatus();

// Show message utility
function showMessage(msg) {
  document.getElementById('msg').innerText = msg;
  console.log(msg);
}

// Update account status
function updateStatus() {
  if (user.is) {
    document.getElementById('status').innerText = `Logged in as: ${user.is.alias}`;
  } else {
    document.getElementById('status').innerText = 'Not Logged In';
  }
}

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

  gun.get('emails').get(email).once(emailData => {
    if (emailData) return showMessage("This email is already registered");

    gun.get('phones').get(fullPhone).once(phoneData => {
      if (phoneData) return showMessage("This phone number is already registered");

      gun.get('users').get(username).once(userData => {
        if (userData) return showMessage("Username already taken.");

        user.create(username, password, ack => {
          if (ack.err) return showMessage("Register failed: " + ack.err);

          gun.get('users').get(username).put({
            created: Date.now(),
            email: email,
            phone: fullPhone
          });

          gun.get('emails').get(email).put({ username });
          gun.get('phones').get(fullPhone).put({ username });
          gun.get('user_passwords').get(username).put({ password });

          showMessage("Registered! Please login.");
        });
      });
    });
  });
};

// Login
window.login = function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) return showMessage("Username and password required");

  user.auth(username, password, ack => {
    if (ack.err) return showMessage("Login failed: " + ack.err);
    showMessage("Welcome, " + username);
    updateStatus();
  });
};

// Logout
window.logout = function () {
  user.leave();
  updateStatus();
  showMessage("Logged out.");
};

window.deleteAccount = function () {
  const deleteUsername = document.getElementById('deleteUsername').value.trim();
  const deletePassword = document.getElementById('deletePassword').value.trim();
  const deleteEmail = document.getElementById('deleteEmail').value.trim().toLowerCase();
  const deletePhone = document.getElementById('deletePhone').value.trim();
  const deletePhoneCode = document.getElementById('deletePhoneCode').value.trim();
  const fullPhone = deletePhoneCode + deletePhone;

  if (!deleteUsername || !deletePassword || !deleteEmail || !deletePhoneCode || !deletePhone) {
    return showMessage("All fields required to delete account.");
  }

  // Authenticate the user
  user.auth(deleteUsername, deletePassword, ack => {
    if (ack.err) return showMessage("Authentication failed: " + ack.err);

    const pub = user.is.pub;

    // Step 1: Delete the public SEA user node
    gun.user(pub).put(null); // deletes `~pub` data

    // Step 2: Delete your app's stored metadata
    gun.get('users').get(deleteUsername).put(null);
    gun.get('emails').get(deleteEmail).put(null);
    gun.get('phones').get(fullPhone).put(null);
    gun.get('user_passwords').get(deleteUsername).put(null);

    // Step 3: Logout user
    user.leave();
    updateStatus();
    showMessage("Account fully deleted from database.");
  });
};
