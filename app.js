// Initialize Gun (with a relay peer for global sync)
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'], // Use any public peer or your own
});

const user = gun.user();

// Register
window.register = async function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    return showMessage("Username and password required");
  }

  // Check if username already exists
  gun.get('users').get(username).once(async data => {
    if (data) {
      showMessage("Username already taken.");
    } else {
      // Register with SEA
      user.create(username, password, (ack) => {
        if (ack.err) return showMessage("Register failed: " + ack.err);
        // Save user reference under 'users' for lookup
        gun.get('users').get(username).put({ created: Date.now() });
        showMessage("Registered! Please login.");
      });
    }
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
    // You can now store or sync user data via `user.get('profile')` etc.
  });
}

function showMessage(msg) {
  document.getElementById('msg').innerText = msg;
}
