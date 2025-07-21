// app.js const gun = Gun({ peers: ['https://gun-manhattan.herokuapp.com/gun'], }); const user = gun.user(); const usersDB = gun.get('users'); const adminKey = 'admin-secret'; // secure admin access

function showMessage(msg) { document.getElementById('msg').innerText = msg; }

function getInput(id) { return document.getElementById(id).value.trim(); }

function clearInputs() { ['username', 'password', 'email', 'country', 'phone'].forEach(id => document.getElementById(id).value = ''); }

function getFullPhone(country, phone) { return ${country}-${phone}; }

window.register = function () { const username = getInput('username'); const password = getInput('password'); const email = getInput('email'); const country = getInput('country'); const phone = getInput('phone'); const fullPhone = getFullPhone(country, phone);

if (!username || !password || !email || !country || !phone) return showMessage("All fields required");

usersDB.get(username).once(data => { if (data) return showMessage("Username already exists");

usersDB.map().once((u, k) => {
  if (u) {
    if (u.email === email) return showMessage("Email already used");
    if (u.phone === fullPhone) return showMessage("Phone number already used");
  }
});

user.create(username, password, ack => {
  if (ack.err) return showMessage("Register failed: " + ack.err);
  usersDB.get(username).put({ email, phone: fullPhone, created: Date.now() });
  showMessage("Registered successfully! Login now.");
});

}); }

window.login = function () { const username = getInput('username'); const password = getInput('password');

user.auth(username, password, ack => { if (ack.err) return showMessage("Login failed: " + ack.err); showMessage("Logged in as " + username); document.getElementById('status').innerText = User: ${username}; }); }

window.logout = function () { user.leave(); showMessage("Logged out"); document.getElementById('status').innerText = "Not logged in"; }

window.forgotPassword = function () { const username = getInput('username'); const email = getInput('email'); const country = getInput('country'); const phone = getInput('phone'); const fullPhone = getFullPhone(country, phone);

usersDB.get(username).once(data => { if (!data || data.email !== email || data.phone !== fullPhone) { return showMessage("Invalid credentials for password recovery"); } showMessage("Simulated password reset link sent"); }); }

window.recoverEmail = function () { const username = getInput('username'); const country = getInput('country'); const phone = getInput('phone'); const fullPhone = getFullPhone(country, phone);

usersDB.get(username).once(data => { if (!data || data.phone !== fullPhone) return showMessage("Invalid credentials for email recovery"); showMessage("Registered email: " + data.email); }); }

window.deleteAccount = function () { const username = getInput('username'); const password = getInput('password'); const email = getInput('email'); const country = getInput('country'); const phone = getInput('phone'); const fullPhone = getFullPhone(country, phone);

user.auth(username, password, ack => { if (ack.err) return showMessage("Auth failed: " + ack.err);

usersDB.get(username).once(data => {
  if (!data || data.email !== email || data.phone !== fullPhone) {
    return showMessage("Invalid email or phone for deletion");
  }
  if (!confirm("Are you sure?")) return;
  if (!confirm("Really delete account?")) return;
  if (!confirm("Final confirmation to delete?")) return;

  user.delete(username, password, res => {
    if (res.err) return showMessage("Deletion failed: " + res.err);
    usersDB.get(username).put(null);
    showMessage("Account deleted");
    logout();
  });
});

}); }

window.showAdminPanel = function () { const adminPassword = prompt("Enter admin password"); if (adminPassword !== adminKey) return showMessage("Access Denied");

let output = "<h3>All Registered Users</h3><ul>"; usersDB.map().once((data, username) => { if (data && username !== null) output += <li><b>${username}</b> — Email: ${data.email || 'N/A'}, Phone: ${data.phone || 'N/A'}, Created: ${new Date(data.created).toLocaleString()}</li>; }); output += "</ul>"; document.getElementById('admin').innerHTML = output; }

window.goBack = function () { history.back(); }

          
