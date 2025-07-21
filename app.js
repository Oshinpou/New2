// app.js

// Initialize GUN const gun = Gun({ peers: ['https://gun-manhattan.herokuapp.com/gun'] }); const db = gun.get('users');

// PouchDB initialization const pouch = new PouchDB('users');

// Sync GunDB and PouchDB function syncData() { db.map().once((data, id) => { if (data && data.username) { pouch.get(id).catch(() => pouch.put({ _id: id, ...data })); } }); } syncData();

// Utility to show messages function showMessage(el, msg) { el.innerText = msg; el.style.display = 'block'; setTimeout(() => el.style.display = 'none', 4000); }

// Registration function registerUser() { const username = document.getElementById('reg-username').value; const email = document.getElementById('reg-email').value; const code = document.getElementById('reg-code').value; const phone = document.getElementById('reg-phone').value; const password = document.getElementById('reg-password').value; const msg = document.getElementById('register-msg');

if (!username || !email || !code || !phone || !password) { return showMessage(msg, 'All fields are required.'); }

const userId = username; db.get(userId).once(data => { if (data) return showMessage(msg, 'Username already exists.');

// Check duplicates by email and phone
db.map().once((u) => {
  if (u) {
    if (u.email === email) return showMessage(msg, 'Email already registered.');
    if (u.phone === phone && u.code === code) return showMessage(msg, 'Phone already registered.');
  }
});

db.get(userId).put({ username, email, code, phone, password });
showMessage(msg, 'Account created successfully.');

}); }

// Login function loginUser() { const username = document.getElementById('login-username').value; const password = document.getElementById('login-password').value; const msg = document.getElementById('login-msg');

db.get(username).once(user => { if (!user || user.password !== password) return showMessage(msg, 'Invalid credentials.'); localStorage.setItem('loggedInUser', username); showMessage(msg, 'Login successful.'); document.getElementById('status').innerText = 'Logged in as ' + username; }); }

// Forgot Password function recoverPassword() { const username = document.getElementById('recover-username').value; const email = document.getElementById('recover-email').value; const code = document.getElementById('recover-code').value; const phone = document.getElementById('recover-phone').value; const msg = document.getElementById('recover-msg');

db.get(username).once(user => { if (user && user.email === email && user.code === code && user.phone === phone) { showMessage(msg, 'Your password is: ' + user.password); } else { showMessage(msg, 'Invalid details.'); } }); }

// Recover Email function recoverEmail() { const username = document.getElementById('recover-email-username').value; const code = document.getElementById('recover-email-code').value; const phone = document.getElementById('recover-email-phone').value; const msg = document.getElementById('recover-email-msg');

db.get(username).once(user => { if (user && user.code === code && user.phone === phone) { showMessage(msg, 'Your email is: ' + user.email); } else { showMessage(msg, 'Invalid details.'); } }); }

// Delete Account function deleteAccount() { const username = document.getElementById('del-username').value; const email = document.getElementById('del-email').value; const code = document.getElementById('del-code').value; const phone = document.getElementById('del-phone').value; const password = document.getElementById('del-password').value; const msg = document.getElementById('delete-msg');

let confirmation = confirm('Are you sure you want to delete your account?'); if (!confirmation) return; confirmation = confirm('Please confirm again to delete.'); if (!confirmation) return; confirmation = confirm('Final confirmation to delete account.'); if (!confirmation) return;

db.get(username).once(user => { if (user && user.email === email && user.code === code && user.phone === phone && user.password === password) { db.get(username).put(null); showMessage(msg, 'Account deleted successfully.'); } else { showMessage(msg, 'Invalid credentials.'); } }); }

// Logout function logout() { localStorage.removeItem('loggedInUser'); document.getElementById('status').innerText = 'Logged out'; }

// Back function goBack() { window.history.back(); }

// Populate Admin Page function loadAdminData() { const table = document.getElementById('admin-table'); table.innerHTML = '<tr><th>Username</th><th>Email</th><th>Phone</th><th>Code</th><th>Password</th><th>Action</th></tr>'; db.map().once((user, key) => { if (user && user.username) { const row = document.createElement('tr'); row.innerHTML = <td>${user.username}</td><td>${user.email}</td><td>${user.phone}</td><td>${user.code}</td><td>${user.password}</td><td><button onclick="adminDelete('${key}')">Delete</button></td>; table.appendChild(row); } }); }

function adminDelete(username) { const confirmed = confirm('Confirm admin delete account: ' + username); if (!confirmed) return; db.get(username).put(null); loadAdminData(); }

// On load window.onload = function () { const status = document.getElementById('status'); const user = localStorage.getItem('loggedInUser'); if (user) status.innerText = 'Logged in as ' + user;

if (document.getElementById('admin-table')) loadAdminData(); };

