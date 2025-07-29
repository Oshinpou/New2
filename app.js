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
 
  gun.user().get('profile').put({
  name: "John Doe",
  shippingAddress: "123 Main St, NY",
  email: "john@example.com"
});

gun.user().get('favorites').set({ itemId: 'product123' });
  });
};

function saveAccountData() {
  if (!user.is) return showMessage("Login first");

  const name = prompt("Enter name:");
  const address = prompt("Enter shipping address:");
  const favorite = prompt("Enter favorite item ID:");

  user.get('profile').put({ name, address });
  user.get('favorites').set({ itemId: favorite });

  showMessage("Account data saved.");
}

function loadAccountData() {
  if (!user.is) return showMessage("Login first");

  user.get('profile').once(profile => {
    if (profile) {
      console.log("Profile:", profile);
      showMessage(`Name: ${profile.name}, Address: ${profile.address}`);
    }
  });

  user.get('favorites').map().once(fav => {
    if (fav) {
      console.log("Favorite item:", fav.itemId);
    }
  });
}

function deleteAccountData() {
  if (!user.is) return showMessage("Login first");

  user.get('profile').put(null);  // deletes profile
  user.get('favorites').map().once((fav, key) => {
    user.get('favorites').get(key).put(null); // deletes each favorite
  });

  showMessage("All account data deleted.");
}

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

  user.auth(deleteUsername, deletePassword, async ack => {
    if (ack.err) return showMessage("Authentication failed: " + ack.err);

    const pub = user.is.pub;

    // Wipe all known paths the app wrote
    gun.get('users').get(deleteUsername).put(null);
    gun.get('emails').get(deleteEmail).put(null);
    gun.get('phones').get(fullPhone).put(null);
    gun.get('user_passwords').get(deleteUsername).put(null);

    // Wipe SEA root node fields
    gun.user(pub).once(data => {
      if (data) {
        Object.keys(data).forEach(key => {
          if (key !== '_') {
            gun.user(pub).get(key).put(null);
          }
        });
      }

      // Finally, null the root pub node itself
      gun.get(`~${pub}`).put(null);

      user.leave();
      updateStatus();
      showMessage("User account and data deleted (as fully as Gun allows).");
    });
  });
};

  
