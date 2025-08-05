// userdb.js - Consolidated & Condensed User Account Management System

import { Gun } from 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/gun.js';
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/sea.js';
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/lib/radix.js';
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/lib/axe.js';

const RELAY_PEERS = ['https://gun-manhattan.herokuapp.com/gun', 'https://gundb-webrtc.herokuapp.com/gun', 'https://gun-us.herokuapp.com/gun', 'https://peer.walled.city/gun'];
let gunInstance = null, userInstance = null, usersRootNode = null, emailIndexNode = null, phoneIndexNode = null;
export let isUserLoggedIn = false, currentUserData = null;

// UI & Validation Utilities (Condensed)
const msg = (id, m, isErr=false) => { const el=document.getElementById(id); if(el){ el.textContent=m; el.style.color=isErr?'var(--danger-color)':'var(--text-color)'; } };
const sucMsg = (id, m) => { msg(id, m); const el=document.getElementById(id); if(el){ el.style.color='#28a745'; el.style.fontWeight='bold'; } };
const errMsg = (id, m) => { msg(id, m, true); const el=document.getElementById(id); if(el){ el.style.color='var(--danger-color)'; el.style.fontWeight='bold'; } };
const clearMsg = (id) => { const el=document.getElementById(id); if(el){ el.textContent=''; el.style.color='var(--text-color)'; el.style.fontWeight='normal'; } };
const showTempNotif = (m, t='info', d=3000) => { const n=document.getElementById('app-notification-area'); if(!n){ return; } n.textContent=m; n.className=`notification ${t}`; n.style.display='block'; if(d>0){ setTimeout(() => { n.style.display='none'; n.textContent=''; n.className=''; }, d); } };
const hideTempNotif = () => { const n=document.getElementById('app-notification-area'); if(n){ n.style.display='none'; n.textContent=''; n.className=''; } };
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e||'');
const isStrongPass = (p) => (p||'').length>=8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p);
const isValidPhone = (p) => (p||'').length>=7 && /^[0-9\s\-()+]*$/.test(p);
const getFormData = (f) => Object.fromEntries(new FormData(f).entries());
const toggleVis = (id, v) => { const el=document.getElementById(id); if(el) el.style.display=v?'block':'none'; };
const updatePageTitle = (t) => { if(t) document.title=t; };
const genUniqueKey = (p='record') => `${p}-${new Date().toISOString().split('T')[0]}-${Gun.uuid()}`;
const handleDBErr = (e, ctx='DB Op') => { console.error(`DB Error in ${ctx}:`, e); errMsg('app-status', `DB error: ${e.message}`); };
const handleAppErr = (e, ctx='App') => { console.error(`App Error in ${ctx}:`, e); errMsg('app-status', `App error: ${e.message}`); showTempNotif(`Error: ${e.message}`, 'error', 5000); };

// Core Database Operations (Condensed)
async function initGunDB() {
  return new Promise((res, rej) => {
    if (gunInstance) { res(); return; }
    gunInstance = Gun({ peers: RELAY_PEERS, radix: true, axe: true });
    userInstance = gunInstance.user().recall({ sessionStorage: true });
    usersRootNode = gunInstance.get('users');
    emailIndexNode = gunInstance.get('email_index');
    phoneIndexNode = gunInstance.get('phone_index');
    gunInstance.on('out', m => { if(m.err){ rej(new Error(`Gun.js conn failed: ${m.err}`)); } else if(m.ok){ res(); } });
    setTimeout(() => { if(!gunInstance._.opt.peers.length) rej(new Error('Gun.js conn timed out.')); }, 7000);
    msg('app-status', 'Initializing database connection...');
  });
}
const getGun = () => gunInstance;
const getUser = () => userInstance;
const getUsersNode = () => usersRootNode;
const getPub = () => isUserLoggedIn && currentUserData && currentUserData.pub ? currentUserData.pub : null;
const getAlias = () => isUserLoggedIn && currentUserData && currentUserData.alias ? currentUserData.alias : null;

async function registerUser(d) {
  return new Promise(async (res, rej) => {
    if (!d.username || d.username.length < 3 || !isValidEmail(d.email) || !isStrongPass(d.password) || !isValidPhone(d.phone) || d.country_code.length < 1) { rej(new Error('Invalid registration data.')); return; }
    msg('reg-message', 'Attempting registration...', false);
    const u=getUser(), uN=getUsersNode(), eI=emailIndexNode, pI=phoneIndexNode;
    if (!u||!uN||!eI||!pI) { rej(new Error('DB not fully initialized.')); return; }
    const cPN = `${d.country_code}${d.phone}`;
    try {
      if (await new Promise(r => eI.get(d.email).once(d => r(!!d)))) { rej(new Error('Email already in use.')); return; }
      if (await new Promise(r => pI.get(cPN).once(d => r(!!d)))) { rej(new Error('Phone number with this country code already in use.')); return; }
      u.create(d.username, d.password, async a => {
        if (a.err) { rej(new Error(`Registration failed: ${a.err}. Username might exist.`)); }
        else {
          u.auth(d.username, d.password, async aA => {
            if (aA.err) { rej(new Error(`Reg successful, but auto-login failed: ${aA.err}`)); return; }
            const p=aA.sea.pub, cT=Gun.time.is();
            await uN.get(p).put({ username: d.username, email: d.email, phone: d.phone, countryCode: d.country_code, createdAt: cT, lastLogin: cT, isRegistered: true, [`created_on_${new Date(cT).toISOString().split('T')[0]}`]: true });
            await eI.get(d.email).put(p); await pI.get(cPN).put(p);
            isUserLoggedIn=true; currentUserData={pub:p,alias:d.username,email:d.email,phone:d.phone,countryCode:d.country_code,createdAt:cT,lastLogin:cT};
            res('Registration successful and logged in.');
          });
        }
      });
    } catch (e) { rej(new Error(`An unexpected error occurred: ${e.message}`)); }
  });
}

async function loginUser(d) {
  return new Promise(async (res, rej) => {
    if (!d.username || d.username.length < 3 || !d.password || d.password.length < 8) { rej(new Error('Invalid login data.')); return; }
    msg('login-message', 'Attempting login...', false);
    const u=getUser(), uN=getUsersNode(); if (!u||!uN) { rej(new Error('DB not fully initialized.')); return; }
    try {
      u.auth(d.username, d.password, async a => {
        if (a.err) { rej(new Error(`Login failed: ${a.err}. Check username/password.`)); }
        else {
          isUserLoggedIn=true; currentUserData={pub:a.sea.pub,alias:d.username};
          uN.get(currentUserData.pub).once(data => { if(data){ const {_,...cD}=data; currentUserData={...currentUserData,...cD}; } uN.get(currentUserData.pub).put({lastLogin:Gun.time.is()}); res('Login successful.'); });
        }
      });
    } catch (e) { rej(new Error(`Unexpected error during login: ${e.message}`)); }
  });
}

async function logoutUser() {
  return new Promise((res, rej) => {
    const u=getUser(); if(!u){ rej(new Error('User instance not initialized.')); return; }
    try { u.leave(); isUserLoggedIn=false; currentUserData=null; res('Logged out.'); }
    catch(e){ rej(new Error(`Failed to log out: ${e.message}`)); }
  });
}

async function checkLoginStatus() {
  return new Promise(res => {
    const u=getUser(); if(!u){ isUserLoggedIn=false; currentUserData=null; res(false); return; }
    u.on(async a => {
      if(a.pub){ isUserLoggedIn=true; currentUserData={pub:a.pub,alias:a.alias};
        const uN=getUsersNode(); if(uN){ uN.get(currentUserData.pub).once(data => { if(data){ const {_,...cD}=data; currentUserData={...currentUserData,...cD}; } res(true); }); } else { res(true); }
      } else { isUserLoggedIn=false; currentUserData=null; res(false); }
    });
  });
}

async function saveUserProfile(p, d) {
  return new Promise(async (res, rej) => {
    if (!p||!d) { rej(new Error('Invalid params.')); return; }
    const uN=getUsersNode(); if(!uN){ rej(new Error('DB root node not init.')); return; }
    try { uN.get(p).put(d, a => { if(a.err){ rej(new Error(`Failed to save profile: ${a.err}`)); } else { res('Profile saved.'); } }); }
    catch(e){ rej(new Error(`Unexpected error: ${e.message}`)); }
  });
}

async function loadUserProfile(p) {
  return new Promise(async (res, rej) => {
    if (!p) { rej(new Error('Invalid public key.')); return; }
    const uN=getUsersNode(); if(!uN){ rej(new Error('DB root node not init.')); return; }
    try { uN.get(p).once(d => { if(d){ const {_,...pD}=d; res(Object.keys(pD).length > 0 ? pD : null); } else { res(null); } }); }
    catch(e){ rej(new Error(`Unexpected error: ${e.message}`)); }
  });
}

async function updateUserProfileField(p, f, v) {
  return new Promise(async (res, rej) => {
    if (!p||!f||v===undefined) { rej(new Error('Invalid params.')); return; }
    const uN=getUsersNode(); if(!uN){ rej(new Error('DB root node not init.')); return; }
    try { uN.get(p).get(f).put(v, a => { if(a.err){ rej(new Error(`Failed to update field: ${a.err}`)); } else { res(`Field '${f}' updated.`); } }); }
    catch(e){ rej(new Error(`Unexpected error: ${e.message}`)); }
  });
}

async function deleteUserProfile(p) {
  return new Promise(async (res, rej) => {
    if (!p) { rej(new Error('Invalid public key.')); return; }
    const uN=getUsersNode(); if(!uN){ rej(new Error('DB root node not init.')); return; }
    const uE=currentUserData?currentUserData.email:null, uPC=currentUserData?`${currentUserData.countryCode}${currentUserData.phone}`:null;
    try {
      await uN.get(p).put(null);
      if(uE) await emailIndexNode.get(uE).put(null);
      if(uPC) await phoneIndexNode.get(uPC).put(null);
      res('User profile deleted.');
    } catch (e) { rej(new Error(`Unexpected error: ${e.message}`)); }
  });
}

function listenToUserProfile(p, cb) {
  if (!p||!cb) return console.error('Invalid params for listenToUserProfile.');
  const uN=getUsersNode(); if(!uN) return console.error('DB root node not init.');
  try { uN.get(p).on(d => { const {_,...pD}=d||{}; cb(Object.keys(pD).length > 0 ? pD : null); }); } catch (e) { handleDBErr(e, 'listenToUserProfile'); }
}
function removeUserProfileListener(p) { console.warn(`Conceptual: Remove listener for ${p}.`); }
function validateUserDataSchema(d) {
  if (!d||typeof d!=='object') return false;
  const rF=['username','email','phone','countryCode','createdAt','lastLogin','isRegistered'];
  for(const f of rF) if(!(f in d)||d[f]===undefined) return false;
  return d.username.length>=3&&isValidEmail(d.email)&&isValidPhone(d.phone)&&d.countryCode.length>=1;
}
async function ensureUserNodeExists(p) {
  return new Promise(async (res, rej) => {
    if (!p) { rej(new Error('Invalid public key.')); return; }
    const uN=getUsersNode(); if(!uN){ rej(new Error('DB root node not init.')); return; }
    uN.get(p).once(d => { if(d){ res(true); } else { uN.get(p).put({placeholder:true,createdAt:Gun.time.is()},a=>{ if(a.err){ rej(new Error(`Failed to create placeholder: ${a.err}`)); } else { res(true); } }); } });
  });
}

// Feature-Specific Database Operations (Condensed)
async function saveShippingAddress(p, d) {
  if (!p||!d||!d.recipientName||!d.location||!d.shipping_phone||!d.shipping_cc) throw new Error('Invalid address data.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const aI=genUniqueKey('shipping-address'); await uN.get(p).get('shippingAddresses').get(aI).put(d); return aI;
}
async function loadShippingAddresses(p) {
  if (!p) throw new Error('Invalid public key.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const a=[]; await new Promise(r => { uN.get(p).get('shippingAddresses').map().once((d,k) => { if(d&&k){ const {_,...cD}=d; if(Object.keys(cD).length>0) a.push({id:k,...cD}); } r(); }); }); return a;
}
async function updateShippingAddress(p, aI, d) {
  if (!p||!aI||!d||Object.keys(d).length===0) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('shippingAddresses').get(aI).put(d); return 'Address updated.';
}
async function deleteShippingAddress(p, aI) {
  if (!p||!aI) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('shippingAddresses').get(aI).put(null); return 'Address deleted.';
}
async function setDefaultShippingAddress(p, aI) { if (!p||!aI) throw new Error('Missing params.'); await updateUserProfileField(p, 'defaultShippingAddressId', aI); return 'Default address set.'; }
async function getShippingAddressById(p, aI) {
  if (!p||!aI) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  return new Promise(res => uN.get(p).get('shippingAddresses').get(aI).once(d => { if(d){ const {_,...cD}=d; res(Object.keys(cD).length > 0 ? {id:aI,...cD} : null); } else { res(null); } }));
}
function listenToShippingAddresses(p, cb) {
  if (!p||!cb) return console.error('Invalid params.');
  const uN=getUsersNode(); if(!uN) return console.error('DB not init.');
  try { uN.get(p).get('shippingAddresses').map().on((d,k) => { const {_,...cD}=d||{}; cb(Object.keys(cD).length > 0 ? cD : null, k); }); } catch (e) { handleDBErr(e, 'listenToShippingAddresses'); }
}

async function createOrder(p, d) {
  if (!p||!d||!d.items||d.items.length===0||!d.total) throw new Error('Invalid order data.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const oI=genUniqueKey('order'); await uN.get(p).get('orders').get(oI).put({...d,orderDate:Gun.time.is(),status:d.status||'Pending'}); return oI;
}
async function loadOrders(p) {
  if (!p) throw new Error('Invalid public key.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const o=[]; await new Promise(r => { uN.get(p).get('orders').map().once((d,k) => { if(d&&k){ const {_,...cD}=d; if(Object.keys(cD).length>0) o.push({id:k,...cD}); } r(); }); }); return o;
}
async function updateOrderStatus(p, oI, nS) {
  if (!p||!oI||!nS) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('orders').get(oI).get('status').put(nS); return 'Order status updated.';
}
async function cancelOrder(p, oI) { return updateOrderStatus(p, oI, 'Cancelled'); }
async function delayOrderDelivery(p, oI, nDD) {
  if (!p||!oI||!nDD) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('orders').get(oI).get('deliveryDate').put(nDD); return 'Order delivery delayed.';
}
async function deleteOrderFromHistory(p, oI) {
  if (!p||!oI) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('orders').get(oI).put(null); return 'Order deleted.';
}
function listenToOrders(p, cb) {
  if (!p||!cb) return console.error('Invalid params.');
  const uN=getUsersNode(); if(!uN) return console.error('DB not init.');
  try { uN.get(p).get('orders').map().on((d,k) => { const {_,...cD}=d||{}; cb(Object.keys(cD).length > 0 ? cD : null, k); }); } catch (e) { handleDBErr(e, 'listenToOrders'); }
}

async function addSavedProduct(p, d) {
  if (!p||!d||!d.name||!d.price) throw new Error('Missing product data.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const pI=genUniqueKey('saved-product'); await uN.get(p).get('savedProducts').get(pI).put({...d,savedAt:Gun.time.is()}); return pI;
}
async function loadSavedProducts(p) {
  if (!p) throw new Error('Invalid public key.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  const pA=[]; await new Promise(r => { uN.get(p).get('savedProducts').map().once((d,k) => { if(d&&k){ const {_,...cD}=d; if(Object.keys(cD).length>0) pA.push({id:k,...cD}); } r(); }); }); return pA;
}
async function removeSavedProduct(p, pI) {
  if (!p||!pI) throw new Error('Missing params.');
  const uN=getUsersNode(); if(!uN) throw new Error('DB not init.');
  await uN.get(p).get('savedProducts').get(pI).put(null); return 'Product removed.';
}
async function moveSavedProductToCart(p, pI) { if (!p||!pI) throw new Error('Missing params.'); await removeSavedProduct(p, pI); return 'Product moved (simulated).'; }
function listenToSavedProducts(p, cb) {
  if (!p||!cb) return console.error('Invalid params.');
  const uN=getUsersNode(); if(!uN) return console.error('DB not init.');
  try { uN.get(p).get('savedProducts').map().on((d,k) => { const {_,...cD}=d||{}; cb(Object.keys(cD).length > 0 ? cD : null, k); }); } catch (e) { handleDBErr(e, 'listenToSavedProducts'); }
}

async function verifyRecoveryCredentials(d) {
  const u=getUser(); if (!u) throw new Error('DB not ready.');
  return new Promise((res, rej) => {
    u.auth(d.username, d.password, a => {
      if (a.err) { rej(new Error(`Auth failed: ${a.err}`)); return; }
      loadUserProfile(a.sea.pub).then(p => {
        if (p && p.email===d.email && p.phone===d.phone && p.countryCode===d.countryCode) res(p);
        else rej(new Error('Recovery details do not match.'));
      }).catch(rej);
    });
  });
}

async function recoverUsernameByEmail(e, p, pw) {
  if (!e||!p||!pw) throw new Error('All recovery details are required.');
  msg('rec-user-message', 'Attempting username recovery...', false);
  try { const uP=await verifyRecoveryCredentials({email:e,phone:p,password:pw,username:'any',countryCode:'any'}); return uP.username; }
  catch (e) { throw new Error(`Recovery failed: ${e.message}`); }
}
async function recoverEmailByPhone(p, pw, u) {
  if (!p||!pw||!u) throw new Error('All recovery details are required.');
  msg('rec-email-message', 'Attempting email recovery...', false);
  try { const uP=await verifyRecoveryCredentials({username:u,password:pw,phone:p,email:'any',countryCode:'any'}); return uP.email; }
  catch (e) { throw new Error(`Recovery failed: ${e.message}`); }
}
async function requestPasswordReset(u, e, p) {
  if (!u||!e||!p) throw new Error('All details are required.');
  msg('rec-pass-message', 'Initiating password reset...', false);
  try {
    const g=getGun(); if (!g) throw new Error('DB not ready'); let fP=null;
    await new Promise(r => g.get('email_index').get(e).once(pub => { if(pub) fP=pub; r(); }));
    if (!fP) await new Promise(r => g.get('phone_index').get(`${e.countryCode}${p}`).once(pub => { if(pub) fP=pub; r(); }));
    if (fP) { const uP=await loadUserProfile(fP); if (uP&&uP.username===u&&uP.email===e&&uP.phone===p) return 'Password reset link sent (simulated).'; else throw new Error('Account details do not match.'); }
    else throw new Error('No account found.');
  } catch (e) { throw new Error(`Password reset failed: ${e.message}`); }
}
async function recoverPhoneNumber(u, e, pw) {
  if (!u||!e||!pw) throw new Error('All recovery details are required.');
  msg('rec-phone-message', 'Attempting phone recovery...', false);
  try { const uP=await verifyRecoveryCredentials({username:u,email:e,password:pw,phone:'any',countryCode:'any'}); return `${uP.countryCode}${uP.phone}`; }
  catch (e) { throw new Error(`Recovery failed: ${e.message}`); }
}
async function recoverCountryCode(u, e, pw) {
  if (!u||!e||!pw) throw new Error('All recovery details are required.');
  msg('rec-cc-message', 'Attempting country code recovery...', false);
  try { const uP=await verifyRecoveryCredentials({username:u,email:e,password:pw,phone:'any',countryCode:'any'}); return uP.countryCode; }
  catch (e) { throw new Error(`Recovery failed: ${e.message}`); }
}

async function verifyCurrentCredentialsForChange(d) {
  const u=getUser(); if (!u||!isUserLoggedIn) throw new Error('Not logged in or DB not ready.');
  const cP=getPub(); if (!cP) throw new Error('Current user public key not found.');
  return new Promise((res, rej) => {
    u.auth(d.current_username, d.current_password, a => {
      if (a.err) { rej(new Error(`Auth failed: ${a.err}`)); return; }
      if (a.sea.pub !== cP) { rej(new Error('Auth mismatch.')); return; }
      loadUserProfile(cP).then(p => {
        if (p && p.email===d.current_email && p.phone===d.current_phone && p.countryCode===d.current_cc) res(p);
        else rej(new Error('Provided cu
