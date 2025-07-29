const gun = Gun({ peers: ['https://gun-manhattan.herokuapp.com/gun'] });
const usersDiv = document.getElementById('users');

// List all users from the root
gun.get('~@').map().once((aliasData, alias) => {
  if (!aliasData) return;

  const userId = Object.keys(aliasData)[0]; // public key
  const user = gun.user(userId);

  user.get('profile').once(profile => {
    if (!profile) return;

    const div = document.createElement('div');
    div.innerHTML = `
      <b>User:</b> ${alias} <br>
      <b>Name:</b> ${profile.name || 'N/A'}<br>
      <b>Email:</b> ${profile.email || 'N/A'}<br>
      <b>Shipping:</b> ${profile.shippingAddress || 'N/A'}<br>
      <button onclick="deleteUser('${userId}')">Delete</button>
      <hr>
    `;
    usersDiv.appendChild(div);
  });
});

// Admin delete user (soft delete)
window.deleteUser = function (userPubKey) {
  const user = gun.user(userPubKey);

  user.get('profile').put(null); // delete profile
  user.get('favorites').map().put(null); // delete all favorites
  user.get('deleted').put(true); // flag account as deleted

  alert("User flagged as deleted. Refresh to see changes.");
};
