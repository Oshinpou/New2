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

    gun.get('emails').get(email).once(emailData => {
      if (emailData) return showMessage("This email is already registered");

      gun.get('phones').get(fullPhone).once(phoneData => {
        if (phoneData) return showMessage("This phone number is already registered");

        gun.get('users').get(username).once(async userData => {
          if (userData) return showMessage("Username already taken");

          user.create(username, password, async (ack) => {
            if (ack.err) return showMessage("Register failed: " + ack.err);

            gun.get('users').get(username).put({
              created: Date.now(),
              email: email,
              phone: fullPhone
            });

            gun.get('emails').get(email).put({ username });
            gun.get('phones').get(fullPhone).put({ username });

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
    if (!username || !password) return showMessage("Username and password required");

    user.auth(username, password, (ack) => {
      if (ack.err) return showMessage("Login failed: " + ack.err);
      showMessage("Welcome, " + username);
    });
  }

  // Change Email
  window.changeEmail = function () {
    const username = prompt("Enter current username:");
    const password = prompt("Enter current password:");
    const phone = prompt("Enter full phone (with country code):");
    const newEmail = prompt("Enter new email:");

    gun.get('users').get(username).once(async (data) => {
      if (!data || data.phone !== phone) return showMessage("Phone mismatch");
      const encPass = await gun.get('user_passwords').get(username).get('encPass').then();
      const decPass = await Gun.SEA.decrypt(encPass.encPass, password);
      if (decPass !== password) return showMessage("Wrong password");

      gun.get('emails').get(data.email).put(null); // Remove old
      gun.get('emails').get(newEmail).put({ username }); // New map

      gun.get('users').get(username).put({ email: newEmail }, () => {
        showMessage("Email updated");
      });
    });
  }

  // Change Phone
  window.changePhone = function () {
    const username = prompt("Enter current username:");
    const password = prompt("Enter current password:");
    const email = prompt("Enter current email:");
    const newCountryCode = prompt("Enter new country code:");
    const newPhone = prompt("Enter new phone number:");
    const newFullPhone = newCountryCode + newPhone;

    gun.get('users').get(username).once(async (data) => {
      if (!data || data.email !== email) return showMessage("Email mismatch");
      const encPass = await gun.get('user_passwords').get(username).get('encPass').then();
      const decPass = await Gun.SEA.decrypt(encPass.encPass, password);
      if (decPass !== password) return showMessage("Wrong password");

      gun.get('phones').get(data.phone).put(null); // Remove old
      gun.get('phones').get(newFullPhone).put({ username }); // New map

      gun.get('users').get(username).put({ phone: newFullPhone }, () => {
        showMessage("Phone updated");
      });
    });
  }

  // Change Password
  window.changePassword = function () {
    const username = prompt("Enter current username:");
    const email = prompt("Enter current email:");
    const phone = prompt("Enter current full phone:");
    const currentPassword = prompt("Enter current password:");
    const newPassword = prompt("Enter new password:");

    gun.get('users').get(username).once(async (data) => {
      if (!data || data.email !== email || data.phone !== phone)
        return showMessage("User data mismatch");

      const encPass = await gun.get('user_passwords').get(username).get('encPass').then();
      const decPass = await Gun.SEA.decrypt(encPass.encPass, currentPassword);
      if (decPass !== currentPassword) return showMessage("Incorrect password");

      const newEnc = await Gun.SEA.encrypt(newPassword, newPassword);
      gun.get('user_passwords').get(username).put({ encPass: newEnc }, () => {
        showMessage("Password updated");
      });
    });
  }

  // Change Username
  window.changeUsername = function () {
    const oldUsername = prompt("Enter current username:");
    const password = prompt("Enter current password:");
    const phone = prompt("Enter current full phone:");
    const email = prompt("Enter current email:");
    const newUsername = prompt("Enter new username:");

    gun.get('users').get(oldUsername).once(async (data) => {
      if (!data || data.email !== email || data.phone !== phone)
        return showMessage("Mismatch with current data");

      const encPass = await gun.get('user_passwords').get(oldUsername).get('encPass').then();
      const decPass = await Gun.SEA.decrypt(encPass.encPass, password);
      if (decPass !== password) return showMessage("Password incorrect");

      const newData = {
        ...data,
        username: newUsername
      };

      gun.get('users').get(newUsername).put(newData);
      gun.get('user_passwords').get(newUsername).put({ encPass: encPass.encPass });

      // Map new references
      gun.get('emails').get(email).put({ username: newUsername });
      gun.get('phones').get(data.phone).put({ username: newUsername });

      gun.get('users').get(oldUsername).put(null);
      gun.get('user_passwords').get(oldUsername).put(null);

      showMessage("Username changed successfully to " + newUsername);
    });
  }

  // UI Message Display
  function showMessage(msg) {
    const m = document.getElementById('msg');
    if (m) m.innerText = msg;
    else alert(msg);
  }
