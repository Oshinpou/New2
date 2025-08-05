// usernextdb.js - Full Gundb User Account and Sub-Database Handler

// CDN dependencies assumed to be included in HTML: // <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>

const gun = Gun({ peers: [ 'https://gun-manhattan.herokuapp.com/gun', 'https://gunjs.herokuapp.com/gun', 'https://gun-server-macx.glitch.me/gun' ] });

const rootDB = gun.get('imacx-user-database');

// ============================ // ACCOUNT MANAGEMENT SECTION // ============================

function registerUser(data, callback) { const userKey = ${data.username}_${data.email}_${data.phone}_${data.countryCode}; rootDB.get(userKey).once(existing => { if (existing) return callback('User already exists'); rootDB.get(userKey).put({ ...data, createdAt: Date.now() }, ack => { callback(ack.err || 'Registration successful'); }); }); }

function loginUser(username, password, callback) { rootDB.map().once(data => { if (data && data.username === username && data.password === password) { callback('Login successful', data); } }); }

function deleteUser(userKey, callback) { rootDB.get(userKey).put(null, ack => { callback(ack.err || 'Account deleted permanently'); }); }

function updateCredentials(userKey, updatedData, callback) { rootDB.get(userKey).put(updatedData, ack => { callback(ack.err || 'Credentials updated'); }); }

function recoverAccount(findKey, callback) { rootDB.get(findKey).once(data => { if (data) callback('Account found', data); else callback('Account not found'); }); }

// ============================ // SUB-DATABASE SECTION // ============================

function saveShipping(userKey, shippingData, callback) { rootDB.get(userKey).get('shipping').put(shippingData, ack => { callback(ack.err || 'Shipping data saved'); }); }

function saveOrder(userKey, orderData, callback) { const orderKey = order_${Date.now()}; rootDB.get(userKey).get('orders').get(orderKey).put(orderData, ack => { callback(ack.err || 'Order saved'); }); }

function saveProduct(userKey, productData, callback) { const productKey = product_${Date.now()}; rootDB.get(userKey).get('savedProducts').get(productKey).put(productData, ack => { callback(ack.err || 'Product saved'); }); }

function pushNotification(userKey, message, callback) { const notifyKey = notification_${Date.now()}; rootDB.get(userKey).get('notifications').get(notifyKey).put({ message, time: new Date().toISOString() }, ack => { callback(ack.err || 'Notification pushed'); }); }

// ============================ // GLOBAL SYNC + MAINTENANCE // ============================

function readAllData(userKey, callback) { rootDB.get(userKey).once(data => { callback(data); }); }

function listenToData(userKey, node, onData) { rootDB.get(userKey).get(node).map().on(onData); }

function deleteNode(userKey, node, callback) { rootDB.get(userKey).get(node).put(null, ack => { callback(ack.err || ${node} deleted); }); }

function validateDefined(data) { return Object.fromEntries( Object.entries(data || {}).filter(([_, v]) => v !== undefined) ); }

// ============================ // UTILITIES // ============================

function ensureStableConnection(callback) { const timeout = setTimeout(() => callback('Connection timed out'), 5000); gun.get('health-check').put({ ping: Date.now() }, ack => { clearTimeout(timeout); callback(ack.err || 'Connected and stable'); }); }

// Async Promisified helpers async function promisifiedGet(node) { return new Promise(resolve => node.once(resolve)); }

async function promisifiedPut(node, data) { return new Promise(resolve => node.put(data, resolve)); }

// Example: Time-based segmentation key function getTimeSegmentKey(prefix) { const now = new Date(); return ${prefix}_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}; }

