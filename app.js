// Initialize Gun
const gun = Gun({
  peers: ['https://gun-manhattan.herokuapp.com/gun'],
});

const user = gun.user();

// Register
window.register = async function () {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const email = document.getElementById('email').value.trim();
  const countryCode = document.getElementById('countryCode').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!username || !password) {
    return showMessage("Username and password required");
  }

  gun.get('users').get(username).once(async data => {
    if (data) {
      showMessage("Username already taken.");
    } else {
      user.create(username, password, (ack) => {
        if (ack.err) return showMessage("Register failed: " + ack.err);

        // Save additional details
        const fullPhone = countryCode + phone;
        gun.get('users').get(username).put({
          created: Date.now(),
          email: email || "",
          phone: fullPhone || ""
        });

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
  });
}

function showMessage(msg) {
  document.getElementById('msg').innerText = msg;
}
