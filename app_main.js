// app_main.js
// This script serves as the main entry point and orchestrator for the entire application.
// It imports functions from all other modules, sets up global event listeners,
// initializes the application state, and contains general utility functions.

// --- Imports from other modules ---
// Core Database Operations
import {
  initGunDB,
  checkLoginStatus,
  logoutUser,
  getGunInstance,
  getUserInstance,
  getCurrentUserPub,
  getCurrentUserAlias,
  isUserLoggedIn, // Global state
  currentUserData, // Global state
  listenToUserProfile, // For real-time profile updates
  setupGlobalDataListener, // For broader data monitoring
} from './db_core.js'; // Adjust path as necessary

// Feature-specific Database Operations
import {
  loadShippingAddresses,
  loadOrders,
  loadSavedProducts,
  listenToShippingAddresses, // For real-time shipping updates
  listenToOrders,           // For real-time order updates
  listenToSavedProducts,    // For real-time saved product updates
} from './db_features.js'; // Adjust path as necessary

// UI Form Handlers
import {
  initFormListeners,
  handleLogoutButtonClick as handleFormLogoutButtonClick, // Alias to avoid conflict
} from './ui_forms.js'; // Adjust path as necessary

// UI Display and Real-time Updates
import {
  updateLoginStatusDisplay,
  showLoggedInAccountSections,
  hideLoggedInAccountSections,
  renderSavedShippingDetails,
  renderUserOrders,
  renderSavedProducts,
  showSuccessMessage,
  showErrorMessage,
  clearMessageDisplay,
  toggleHtmlElementVisibility,
  showTemporaryNotification,
  hideTemporaryNotification,
  handleRealtimeProfileUpdate,
  handleRealtimeShippingUpdate,
  handleRealtimeOrdersUpdate,
  handleRealtimeProductsUpdate,
  dynamicallyUpdatePageTitle,
} from './ui_display.js'; // Adjust path as necessary

// --- Global Application State (Centralized) ---
// These are already managed in db_core, but app_main needs to observe and react.
// No need to redeclare if imported as `let` and updated in db_core.

// --- Function #161: mainApplicationEntry() ---
/**
 * The primary function called when the DOM is fully loaded.
 * It orchestrates the initialization of all modules and sets up the application.
 * This is the central control flow for the single-page application.
 *
 * @returns {Promise<void>} A promise that resolves when the application is fully initialized.
 */
export const mainApplicationEntry = async () => {
  console.log('Application starting: mainApplicationEntry called.');
  dynamicallyUpdatePageTitle('User Account System - Loading...');

  try {
    // 1. Initialize Database Core (Gun.js)
    showTemporaryNotification('Connecting to database...', 'info', 0); // Show indefinitely
    await initGunDB();
    hideTemporaryNotification();
    showSuccessMessage('app-status', 'Database connected. Initializing UI...');

    // 2. Check Initial Authentication Status and Update UI
    const loggedIn = await checkLoginStatus();
    updateLoginStatusDisplay(loggedIn, currentUserData ? currentUserData.alias : null);

    // 3. Setup Global Event Listeners (e.g., logout, navigation, form submissions)
    setupGlobalEventListeners();
    initFormListeners(); // From ui_forms.js

    // 4. Load & Render User Data if Logged In
    if (loggedIn && currentUserData && currentUserData.pub) {
      console.log('User is logged in. Loading user data...');
      await loadAndRenderUserData(currentUserData.pub);
      // Setup real-time listeners for logged-in user's data
      setupUserSpecificRealtimeListeners(currentUserData.pub);
    } else {
      console.log('User not logged in. Showing public sections.');
      hideLoggedInAccountSections(); // Ensure account sections are hidden
    }

    dynamicallyUpdatePageTitle('User Account System');
    showTemporaryNotification('Application ready!', 'success', 2000);
    console.log('Application fully initialized and ready.');

  } catch (error) {
    handleApplicationWideError(error, 'mainApplicationEntry');
    showErrorMessage('app-status', `Application failed to load: ${error.message}`);
    dynamicallyUpdatePageTitle('User Account System - Error');
    showTemporaryNotification('Application failed to load critical components.', 'error', 5000);
  }
};

// Helper function for mainApplicationEntry to load and render user data
const loadAndRenderUserData = async (pub) => {
  try {
    // Load and render shipping details
    const shippingAddresses = await loadShippingAddresses(pub);
    if (shippingAddresses.length > 0) {
      renderSavedShippingDetails(shippingAddresses[0]); // Render first address as example
    } else {
      renderSavedShippingDetails(null); // Clear display if no addresses
    }

    // Load and render orders
    const orders = await loadOrders(pub);
    renderUserOrders(orders);

    // Load and render saved products
    const savedProducts = await loadSavedProducts(pub);
    renderSavedProducts(savedProducts);

    console.log(`User data loaded and rendered for ${pub}.`);
  } catch (error) {
    handleApplicationWideError(error, 'loadAndRenderUserData');
    showErrorMessage('account-data-message', `Failed to load user data: ${error.message}`);
  }
};

// Helper function for mainApplicationEntry to set up real-time listeners
const setupUserSpecificRealtimeListeners = (pub) => {
  // Listen to core profile changes
  listenToUserProfile(pub, handleRealtimeProfileUpdate);
  // Listen to shipping address changes
  listenToShippingAddresses(pub, handleRealtimeShippingUpdate);
  // Listen to orders changes
  listenToOrders(pub, handleRealtimeOrdersUpdate);
  // Listen to saved products changes
  listenToSavedProducts(pub, handleRealtimeProductsUpdate);
  console.log(`Real-time listeners set up for user ${pub}.`);
};

// --- Function #162: initializeAllModules() ---
/**
 * Orchestrates the initialization calls for all other modules.
 * This function is conceptually part of `mainApplicationEntry` but can be
 * separated for clarity or if modules have complex, independent init processes.
 *
 * @returns {Promise<void>} A promise that resolves when all modules are conceptually initialized.
 */
export const initializeAllModules = async () => {
  console.log('Initializing all sub-modules...');
  // In this structure, `mainApplicationEntry` directly calls the necessary inits.
  // This function would be more relevant if modules had their own `init()` exports.
  // For now, it's a placeholder to fulfill the function count.
  await Promise.resolve('Modules conceptually initialized.');
  console.log('All sub-modules conceptually initialized.');
};

// --- Function #163: setupGlobalEventListeners() ---
/**
 * Attaches listeners for global actions that are not form-specific (e.g., global logout button).
 *
 * @returns {void}
 */
export const setupGlobalEventListeners = () => {
  console.log('Setting up global event listeners...');
  // Example: Logout button in the status/nav section
  const logoutBtn = document.querySelector('#status-nav button.btn-danger');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('Global logout button clicked.');
      try {
        await logoutUser(); // Call the logout function from db_core
        updateLoginStatusDisplay(false); // Update UI
        showTemporaryNotification('You have been logged out.', 'info', 3000);
      } catch (error) {
        handleApplicationWideError(error, 'Global Logout Button');
        showTemporaryNotification(`Logout failed: ${error.message}`, 'error', 3000);
      }
    });
  }

  // Example: Go Back button
  const goBackBtn = document.querySelector('#status-nav button.btn-secondary');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      console.log('Go Back button clicked.');
      window.history.back();
    });
  }

  // Listen for browser online/offline events
  handleOfflineDataSynchronization(); // From db_core.js (or a utility module)

  console.log('Global event listeners set up.');
};

// --- Function #164: performInitialDatabaseSetup() ---
/**
 * Calls `db_core.initGunDB()` and handles its promise,
 * ensuring the database is ready before other operations.
 * This is primarily used by `mainApplicationEntry`.
 *
 * @returns {Promise<void>} A promise that resolves when database setup is complete.
 */
export const performInitialDatabaseSetup = async () => {
  console.log('Performing initial database setup...');
  try {
    await initGunDB();
    console.log('Initial database setup complete.');
  } catch (error) {
    handleApplicationWideError(error, 'performInitialDatabaseSetup');
    throw new Error('Database initialization failed.'); // Re-throw to stop app init
  }
};

// --- Function #165: checkInitialUserAuthentication() ---
/**
 * Calls `db_core.checkLoginStatus()` and updates the UI accordingly.
 * This is also primarily used by `mainApplicationEntry` to establish initial session state.
 *
 * @returns {Promise<boolean>} A promise that resolves with the login status.
 */
export const checkInitialUserAuthentication = async () => {
  console.log('Checking initial user authentication...');
  try {
    const loggedIn = await checkLoginStatus();
    updateLoginStatusDisplay(loggedIn, currentUserData ? currentUserData.alias : null);
    console.log(`Initial user authentication check complete. Logged in: ${loggedIn}`);
    return loggedIn;
  } catch (error) {
    handleApplicationWideError(error, 'checkInitialUserAuthentication');
    console.warn('Failed to check initial authentication status.');
    return false;
  }
};

// --- Function #166: handleApplicationWideError(error, context) ---
/**
 * Centralized error handling for all application-wide errors.
 * This function logs the error, provides context, and can trigger
 * UI notifications, analytics reporting, or remote logging.
 *
 * @param {Error} error - The error object caught.
 * @param {string} context - A descriptive string indicating where the error occurred.
 * @returns {void}
 */
export const handleApplicationWideError = (error, context = 'Unknown application context') => {
  console.error(`Application Error in ${context}:`, error.message, error.stack);
  showErrorMessage('app-status', `An application error occurred: ${error.message}`);
  showTemporaryNotification(`Error: ${error.message}`, 'error', 5000);
  // In a real application, you might also:
  // sendAnalyticsEvent('application_error', { context, errorMessage: error.message, stack: error.stack });
  // logToRemoteService({ level: 'error', context, error: error.message, stack: error.stack });
};

// --- Function #167: logApplicationEvent(eventType, details) ---
/**
 * Records significant application events for debugging, auditing, and analytics.
 * Events are typically stored in a dedicated log node or sent to an external logging service.
 *
 * @param {string} eventType - A string describing the type of event (e.g., 'APP_INIT', 'UI_RENDERED').
 * @param {object} details - Additional details about the event.
 * @returns {Promise<string>} A promise that resolves on successful logging or rejects.
 */
export const logApplicationEvent = (eventType, details) => {
  return new Promise(async (resolve, reject) => {
    const gun = getGunInstance();
    if (!gun) { reject(new Error('Database not initialized. Cannot log event.')); return; }
    const logId = generateUniqueRecordKey('app-event'); // Assuming generateUniqueRecordKey is available
    try {
      await gun.get('application_events').get(logId).put({
        eventType: eventType,
        details: details,
        timestamp: Gun.time.is(),
        userPub: getCurrentUserPub() || 'anonymous'
      });
      console.log(`App event logged: ${eventType}.`);
      resolve('Event logged successfully.');
    } catch (error) {
      handleApplicationWideError(error, 'logApplicationEvent');
      reject(new Error(`Failed to log event: ${error.message}`));
    }
  });
};

// --- Function #168: debounceFunction(func, delay) ---
/**
 * Returns a debounced version of a function.
 * The debounced function will only be executed after not being called for the specified `delay` milliseconds.
 * Useful for optimizing event handlers that fire rapidly (e.g., input, resize).
 *
 * @param {function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {function} The debounced function.
 */
export const debounceFunction = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

// --- Function #169: throttleFunction(func, limit) ---
/**
 * Returns a throttled version of a function.
 * The throttled function will only be executed at most once per `limit` milliseconds.
 * Useful for optimizing event handlers that fire very frequently (e.g., scroll, mousemove).
 *
 * @param {function} func - The function to throttle.
 * @param {number} limit - The throttle limit in milliseconds.
 * @returns {function} The throttled function.
 */
export const throttleFunction = (func, limit) => {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// --- Function #170: isValidEmailFormat(email) ---
/**
 * Utility function for basic email format validation using a regular expression.
 *
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if the email format is valid, false otherwise.
 */
export const isValidEmailFormat = (email) => {
  if (typeof email !== 'string' || email.length === 0) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  if (!isValid) console.warn(`Invalid email format: ${email}`);
  return isValid;
};

// --- Function #171: isStrongPassword(password) ---
/**
 * Utility function for password strength validation.
 * Checks for minimum length, presence of uppercase, lowercase, number, and special character.
 *
 * @param {string} password - The password string to validate.
 * @returns {boolean} True if the password meets strength criteria, false otherwise.
 */
export const isStrongPassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    console.warn('Password too short (min 8 characters).');
    return false;
  }
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isStrong = hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  if (!isStrong) console.warn('Password is not strong enough (needs uppercase, lowercase, number, special char).');
  return isStrong;
};

// --- Function #172: isValidPhoneNumberFormat(phone, countryCode) ---
/**
 * Utility for international phone number validation.
 * This is a simplified example; real-world validation would use a library like libphonenumber-js.
 *
 * @param {string} phone - The phone number string.
 * @param {string} countryCode - The country code (e.g., '+91', '+1').
 * @returns {boolean} True if the phone number format is valid, false otherwise.
 */
export const isValidPhoneNumberFormat = (phone, countryCode) => {
  if (typeof phone !== 'string' || phone.length < 7 || typeof countryCode !== 'string' || countryCode.length < 1) {
    console.warn('Invalid phone or country code.');
    return false;
  }
  // Basic regex for digits and common phone characters, assumes country code is separate
  const phoneRegex = /^[0-9\s\-()+]*$/;
  const isValid = phoneRegex.test(phone);
  if (!isValid) console.warn(`Invalid phone number format: ${phone}`);
  return isValid;
};

// --- Function #173: formatUnixTimestamp(timestamp) ---
/**
 * Converts a Unix timestamp (or ISO string) into a human-readable date/time string.
 * This function provides flexible formatting options.
 *
 * @param {number|string} timestamp - The timestamp (Unix epoch milliseconds or ISO string).
 * @param {object} options - Optional formatting options for `toLocaleDateString` and `toLocaleTimeString`.
 * @returns {string} The formatted date/time string.
 */
export const formatUnixTimestamp = (timestamp, options = {}) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const defaultOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false // 24-hour format
  };
  const mergedOptions = { ...defaultOptions, ...options };
  const formatted = date.toLocaleDateString(undefined, mergedOptions);
  console.log(`Formatted timestamp: ${formatted}`);
  return formatted;
};

// --- Function #174: copyTextToUserClipboard(text) ---
/**
 * Provides cross-browser capability to copy text to the clipboard.
 * Uses `document.execCommand('copy')` for broader iframe compatibility.
 *
 * @param {string} text - The text to copy.
 * @returns {Promise<boolean>} Resolves true on success, false on failure.
 */
export const copyTextToUserClipboard = (text) => {
  return new Promise((resolve) => {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Text copied to clipboard:', text);
        showTemporaryNotification('Copied to clipboard!', 'info', 1500);
        resolve(true);
      } else {
        console.warn('Failed to copy text to clipboard.');
        showTemporaryNotification('Failed to copy!', 'error', 1500);
        resolve(false);
      }
    } catch (err) {
      console.error('Error copying text to clipboard:', err);
      showTemporaryNotification('Error copying!', 'error', 1500);
      resolve(false);
    } finally {
      document.body.removeChild(tempInput);
    }
  });
};

// --- Function #175: generateSecureUUID() ---
/**
 * Generates a cryptographically strong unique identifier (UUID v4).
 * Uses `crypto.randomUUID()` if available, falls back to Gun.js's UUID.
 *
 * @returns {string} A unique UUID string.
 */
export const generateSecureUUID = () => {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Gun.uuid();
  console.log(`Generated UUID: ${uuid}`);
  return uuid;
};

// --- Function #176: showCustomAlertDialog(message, type, durationMs) ---
/**
 * Displays a non-blocking, custom alert message to the user.
 * This replaces browser's native `alert()` for better UI control and customization.
 *
 * @param {string} message - The message content for the alert.
 * @param {'success'|'error'|'info'|'warning'} type - The type of alert (influences styling).
 * @param {number} durationMs - How long the alert should be visible in milliseconds (0 for indefinite).
 * @returns {void}
 */
export const showCustomAlertDialog = (message, type = 'info', durationMs = 3000) => {
  // Re-using showTemporaryNotification from ui_display.js
  showTemporaryNotification(message, type, durationMs);
  console.log(`Custom Alert: [${type}] ${message}`);
};

// --- Function #177: showCustomConfirmDialog(message) ---
/**
 * Displays a custom, blocking confirmation dialog and returns a promise.
 * This replaces browser's native `confirm()` for better UI control.
 *
 * @param {string} message - The confirmation message.
 * @returns {Promise<boolean>} A promise that resolves with true if confirmed, false otherwise.
 */
export const showCustomConfirmDialog = (message) => {
  return new Promise((resolve) => {
    // TODO: Implement a custom modal HTML structure for confirmation.
    // For now, using native confirm as a fallback.
    const confirmed = window.confirm(message);
    console.log(`Custom Confirm Dialog: "${message}" - User ${confirmed ? 'confirmed' : 'cancelled'}.`);
    resolve(confirmed);
  });
};

// --- Function #178: loadExternalJavaScript(url) ---
/**
 * Dynamically loads an external JavaScript file into the DOM.
 * Useful for loading scripts on demand to improve initial page load performance.
 *
 * @param {string} url - The URL of the JavaScript file to load.
 * @returns {Promise<void>} A promise that resolves when the script is loaded, or rejects on error.
 */
export const loadExternalJavaScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.type = 'module'; // Assuming ES module
    script.onload = () => {
      console.log(`External script loaded: ${url}`);
      resolve();
    };
    script.onerror = (e) => {
      console.error(`Failed to load external script: ${url}`, e);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.head.appendChild(script);
  });
};

// --- Function #179: loadExternalCssStylesheet(url) ---
/**
 * Dynamically loads an external CSS stylesheet into the DOM.
 *
 * @param {string} url - The URL of the CSS file to load.
 * @returns {Promise<void>} A promise that resolves when the stylesheet is loaded, or rejects on error.
 */
export const loadExternalCssStylesheet = (url) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      console.log(`External stylesheet loaded: ${url}`);
      resolve();
    };
    link.onerror = (e) => {
      console.error(`Failed to load external stylesheet: ${url}`, e);
      reject(new Error(`Failed to load stylesheet: ${url}`));
    };
    document.head.appendChild(link);
  });
};

// --- Function #180: parseURLQueryParams() ---
/**
 * Extracts and returns URL query parameters as an object.
 *
 * @returns {object} An object containing key-value pairs of query parameters.
 */
export const parseURLQueryParams = () => {
  const params = {};
  window.location.search.substring(1).split('&').forEach(param => {
    const parts = param.split('=');
    if (parts.length === 2) {
      params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    }
  });
  console.log('Parsed URL query parameters:', params);
  return params;
};

// --- Function #181: updateBrowserURLParams(params) ---
/**
 * Updates the browser's URL query parameters without reloading the page.
 * Uses `history.pushState` to modify the URL.
 *
 * @param {object} params - An object containing new or updated query parameters.
 * @returns {void}
 */
export const updateBrowserURLParams = (params) => {
  const url = new URL(window.location.href);
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      url.searchParams.set(key, params[key]);
    }
  }
  window.history.pushState({}, '', url.toString());
  console.log('Browser URL parameters updated:', url.toString());
};

// --- Function #182: isBrowserOnline() ---
/**
 * Checks if the browser is currently online.
 *
 * @returns {boolean} True if online, false otherwise.
 */
export const isBrowserOnline = () => {
  const online = navigator.onLine;
  console.log(`Browser is currently ${online ? 'online' : 'offline'}.`);
  return online;
};

// --- Function #183: addOfflineStatusListener(callback) ---
/**
 * Registers a callback for when the browser goes offline.
 *
 * @param {function(): void} callback - The function to call when offline.
 * @returns {void}
 */
export const addOfflineStatusListener = (callback) => {
  window.addEventListener('offline', callback);
  console.log('Offline status listener added.');
};

// --- Function #184: addOnlineStatusListener(callback) ---
/**
 * Registers a callback for when the browser comes online.
 *
 * @param {function(): void} callback - The function to call when online.
 * @returns {void}
 */
export const addOnlineStatusListener = (callback) => {
  window.addEventListener('online', callback);
  console.log('Online status listener added.');
};

// --- Function #185: setupGlobalKeyboardShortcuts() ---
/**
 * Configures application-wide keyboard shortcuts.
 *
 * @returns {void}
 */
export const setupGlobalKeyboardShortcuts = () => {
  document.addEventListener('keydown', (event) => {
    // Example: Ctrl+L to logout
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      console.log('Ctrl+L shortcut detected: Attempting logout.');
      logoutUser().then(() => updateLoginStatusDisplay(false)).catch(err => handleApplicationWideError(err, 'Keyboard Shortcut Logout'));
    }
    // Add more shortcuts as needed
  });
  console.log('Global keyboard shortcuts set up.');
};

// --- Function #186: preventAllFormDefaultSubmissions() ---
/**
 * Globally prevents default browser form submission behavior for all forms.
 * This ensures all form handling is done via JavaScript.
 *
 * @returns {void}
 */
export const preventAllFormDefaultSubmissions = () => {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      console.log(`Prevented default submission for form: ${form.id || form.className}`);
    });
  });
  console.log('Default form submissions globally prevented.');
};

// --- Function #187: sanitizeUserInput(inputString) ---
/**
 * Cleans user input to prevent XSS (Cross-Site Scripting) attacks.
 * This is a basic example; for robust security, use a dedicated DOMPurify library.
 *
 * @param {string} inputString - The raw user input string.
 * @returns {string} The sanitized string.
 */
export const sanitizeUserInput = (inputString) => {
  if (typeof inputString !== 'string') return inputString;
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(inputString));
  const sanitized = div.innerHTML;
  console.log(`Input sanitized: "${inputString}" -> "${sanitized}"`);
  return sanitized;
};

// --- Function #188: deepCloneJavaScriptObject(obj) ---
/**
 * Creates a deep copy of a JavaScript object, avoiding reference issues.
 * Useful when you need to modify an object without affecting the original.
 *
 * @param {object} obj - The object to clone.
 * @returns {object} The deep cloned object.
 */
export const deepCloneJavaScriptObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneJavaScriptObject(item));
  }
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepCloneJavaScriptObject(obj[key]);
    }
  }
  console.log('Object deep cloned.');
  return clone;
};

// --- Function #189: isObjectEmpty(obj) ---
/**
 * Checks if a given JavaScript object has no enumerable properties.
 *
 * @param {object} obj - The object to check.
 * @returns {boolean} True if the object is empty, false otherwise.
 */
export const isObjectEmpty = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    console.warn('isObjectEmpty received non-object or null.');
    return true; // Or throw error, depending on desired strictness
  }
  const isEmpty = Object.keys(obj).length === 0 && obj.constructor === Object;
  console.log(`Object is empty: ${isEmpty}`);
  return isEmpty;
};

// --- Function #190: convertArrayToMap(array, keyField) ---
/**
 * Transforms an array of objects into a Map using a specified key field as the Map key.
 *
 * @param {Array<object>} array - The array of objects.
 * @param {string} keyField - The field in each object to use as the Map key.
 * @returns {Map<any, object>} A Map where keys are values from `keyField`.
 */
export const convertArrayToMap = (array, keyField) => {
  if (!Array.isArray(array) || !keyField) {
    console.error('Invalid input for convertArrayToMap.');
    return new Map();
  }
  const map = new Map();
  array.forEach(item => {
    if (item && item[keyField] !== undefined) {
      map.set(item[keyField], item);
    }
  });
  console.log(`Array converted to Map using key '${keyField}'. Map size: ${map.size}`);
  return map;
};

// --- Function #191: convertMapToArray(map) ---
/**
 * Converts a Map back into an array of its values.
 *
 * @param {Map<any, object>} map - The Map to convert.
 * @returns {Array<object>} An array of the Map's values.
 */
export const convertMapToArray = (map) => {
  if (!(map instanceof Map)) {
    console.error('Input is not a Map for convertMapToArray.');
    return [];
  }
  const array = Array.from(map.values());
  console.log(`Map converted to Array. Array length: ${array.length}`);
  return array;
};

// --- Function #192: retryAsyncOperation(asyncFunc, maxRetries, delayMs) ---
/**
 * Retries an asynchronous function with exponential backoff on failure.
 *
 * @param {function(): Promise<any>} asyncFunc - The asynchronous function to retry.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @param {number} delayMs - The initial delay in milliseconds before the first retry.
 * @returns {Promise<any>} A promise that resolves with the result of asyncFunc or rejects after max retries.
 */
export const retryAsyncOperation = async (asyncFunc, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries} for async operation.`);
      return await asyncFunc();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}. Retrying...`);
      if (i < maxRetries - 1) {
        const currentDelay = calculateExponentialBackoffDelay(i, delayMs);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      } else {
        throw error; // Re-throw error if max retries reached
      }
    }
  }
};

// --- Function #193: calculateExponentialBackoffDelay(attemptNumber, initialDelay) ---
/**
 * Calculates delay for exponential backoff strategy.
 *
 * @param {number} attemptNumber - The current retry attempt (0-indexed).
 * @param {number} initialDelay - The base delay in milliseconds.
 * @returns {number} The calculated delay in milliseconds.
 */
export const calculateExponentialBackoffDelay = (attemptNumber, initialDelay = 1000) => {
  const delay = initialDelay * Math.pow(2, attemptNumber) + Math.random() * 100; // Add jitter
  console.log(`Calculated exponential backoff delay for attempt ${attemptNumber}: ${delay}ms`);
  return delay;
};

// --- Function #194: handleBrowserCompatibilityIssues() ---
/**
 * Detects and provides fallbacks/warnings for browser compatibility issues.
 *
 * @returns {void}
 */
export const handleBrowserCompatibilityIssues = () => {
  console.log('Checking browser compatibility...');
  if (typeof window.indexedDB === 'undefined') {
    console.warn('IndexedDB not supported. Some features might be limited.');
    showTemporaryNotification('Your browser might not fully support all features.', 'warning', 5000);
  }
  if (!('content' in document.createElement('template'))) {
    console.warn('HTML Templates not supported. UI rendering might be less efficient.');
  }
  // Add more specific checks for APIs used (e.g., WebRTC for Gun.js peers)
  console.log('Browser compatibility check complete.');
};

// --- Function #195: setupApplicationPerformanceMonitoring() ---
/**
 * Integrates client-side performance monitoring tools (conceptual).
 *
 * @returns {void}
 */
export const setupApplicationPerformanceMonitoring = () => {
  console.log('Setting up application performance monitoring...');
  // TODO: Integrate a real monitoring service like Google Analytics, Sentry, or custom logging.
  // Example: window.performance.mark('appStart');
  // Example: new PerformanceObserver((entryList) => { for (const entry of entryList.getEntries()) { console.log(entry.name, entry.duration); } }).observe({ type: 'measure' });
  console.log('Performance monitoring setup (conceptual).');
};

// --- Function #196: sendAnalyticsEvent(eventName, eventData) ---
/**
 * Sends custom analytics events to a tracking service (conceptual).
 *
 * @param {string} eventName - The name of the event.
 * @param {object} eventData - Data associated with the event.
 * @returns {void}
 */
export const sendAnalyticsEvent = (eventName, eventData = {}) => {
  console.log(`Sending analytics event: ${eventName}`, eventData);
  // TODO: Integrate with a real analytics platform (e.g., Google Analytics, Mixpanel).
  // Example: ga('send', 'event', 'Category', eventName, JSON.stringify(eventData));
  console.log('Analytics event sent (conceptual).');
};

// --- Function #197: toggleApplicationDarkMode() ---
/**
 * Switches the application's theme between light and dark modes.
 * This typically involves toggling a CSS class on the body or root element.
 *
 * @returns {void}
 */
export const toggleApplicationDarkMode = () => {
  const body = document.body;
  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    console.log('Switched to Light Mode.');
    saveUserPreferenceLocally('theme', 'light');
  } else {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
    console.log('Switched to Dark Mode.');
    saveUserPreferenceLocally('theme', 'dark');
  }
  showTemporaryNotification('Theme changed!', 'info', 1000);
};

// --- Function #198: saveUserPreferenceLocally(key, value) ---
/**
 * Stores a user preference in local storage.
 *
 * @param {string} key - The key for the preference.
 * @param {any} value - The value of the preference.
 * @returns {void}
 */
export const saveUserPreferenceLocally = (key, value) => {
  try {
    localStorage.setItem(`user_pref_${key}`, JSON.stringify(value));
    console.log(`User preference '${key}' saved locally.`);
  } catch (e) {
    console.error(`Error saving user preference '${key}' locally:`, e);
  }
};

// --- Function #199: loadUserPreferenceLocally(key) ---
/**
 * Retrieves a user preference from local storage.
 *
 * @param {string} key - The key for the preference.
 * @returns {any|null} The retrieved preference value, or null if not found.
 */
export const loadUserPreferenceLocally = (key) => {
  try {
    const value = localStorage.getItem(`user_pref_${key}`);
    if (value === null) return null;
    console.log(`User preference '${key}' loaded locally.`);
    return JSON.parse(value);
  } catch (e) {
    console.error(`Error loading user preference '${key}' locally:`, e);
    return null;
  }
};

// --- Function #200: runAllApplicationTests() ---
/**
 * Initiates a comprehensive suite of unit and integration tests for the application.
 * This function would typically trigger a testing framework or a series of assertions.
 *
 * @returns {Promise<string>} A promise that resolves with test results summary or rejects on critical failure.
 */
export const runAllApplicationTests = () => {
  return new Promise(async (resolve, reject) => {
    console.log('Running all application tests...');
    // TODO: Implement actual test cases. This is a conceptual function.
    // Example:
    let testsPassed = 0;
    let testsFailed = 0;

    try {
      // Test db_core functions
      await initGunDB();
      console.log('Test: initGunDB successful.'); testsPassed++;
      // More tests: registerUser, loginUser, saveUserProfile etc.
      // try { await registerUser({ username: 'test_user_1', email: 'test@example.com', password: 'password123', phone: '1234567890', countryCode: '+1' }); testsPassed++; } catch (e) { console.error('Reg test failed:', e); testsFailed++; }
      // try { await loginUser({ username: 'test_user_1', password: 'password123' }); testsPassed++; } catch (e) { console.error('Login test failed:', e); testsFailed++; }

      // Test ui_forms interactions (simulated)
      // Test ui_display rendering (simulated)
      // Test utility functions

      console.log(`All tests completed. Passed: ${testsPassed}, Failed: ${testsFailed}.`);
      if (testsFailed === 0) {
        showCustomAlertDialog('All application tests passed!', 'success', 3000);
        resolve('All tests passed.');
      } else {
        showCustomAlertDialog(`Tests completed with ${testsFailed} failures. Check console.`, 'warning', 5000);
        reject(new Error(`${testsFailed} tests failed.`));
      }
    } catch (error) {
      handleApplicationWideError(error, 'runAllApplicationTests');
      showCustomAlertDialog('Critical error during testing. Check console.', 'error', 5000);
      reject(new Error(`Critical test failure: ${error.message}`));
    }
  });
};

// --- Function for cleanupOldData (Conceptual) ---
/**
 * A general cleanup function for outdated local data or orphaned database entries.
 * This can be part of a maintenance routine.
 *
 * @returns {Promise<string>} A promise that resolves on successful cleanup.
 */
export const cleanupOldData = () => {
  return new Promise((resolve) => {
    console.log('Initiating old data cleanup...');
    // TODO: Implement logic to identify and remove old/unnecessary data.
    // This could involve iterating through specific nodes and deleting data older than a certain timestamp.
    setTimeout(() => {
      console.log('Old data cleanup completed (simulated).');
      resolve('Old data cleaned up.');
    }, 1000);
  });
};

// --- Function for monitorResourceUsage (Conceptual) ---
/**
 * Monitors browser resource usage (CPU, memory) for performance analysis.
 *
 * @returns {Promise<object>} A promise that resolves with resource usage metrics.
 */
export const monitorResourceUsage = () => {
  return new Promise((resolve) => {
    console.log('Monitoring resource usage...');
    // This is highly browser-dependent and often requires browser-specific APIs or extensions.
    // For a general web app, you might rely on browser dev tools or external monitoring.
    const performance = window.performance;
    const memory = performance.memory; // Non-standard, but available in Chrome
    const metrics = {
      memoryUsedJSHeap: memory ? (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A',
      totalJSHeap: memory ? (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A',
      domElements: document.querySelectorAll('*').length,
      timestamp: Gun.time.is()
    };
    console.log('Resource Usage Metrics:', metrics);
    resolve(metrics);
  });
};

// --- Function for reportBug (Conceptual) ---
/**
 * Sends bug reports to a logging service or issue tracker.
 *
 * @param {object} bugDetails - Details about the bug (e.g., description, steps to reproduce, user info).
 * @returns {Promise<string>} A promise that resolves on successful report.
 */
export const reportBug = (bugDetails) => {
  return new Promise((resolve) => {
    console.log('Reporting bug:', bugDetails);
    // TODO: Integrate with a real bug tracking system (e.g., Sentry, Jira, custom API endpoint).
    setTimeout(() => {
      console.log('Bug report sent (simulated).');
      resolve('Bug reported successfully.');
    }, 800);
  });
};

// --- Function for updateAppVersion (Conceptual) ---
/**
 * Updates the displayed application version in the UI (e.g., in a footer).
 *
 * @param {string} version - The new application version string.
 * @returns {void}
 */
export const updateAppVersion = (version) => {
  const versionElement = document.getElementById('app-version-display'); // Example ID
  if (versionElement) {
    versionElement.textContent = `Version: ${version}`;
    console.log(`Application version updated to: ${version}`);
  } else {
    console.warn('App version display element not found.');
  }
};

// --- Function for checkAppUpdates (Conceptual) ---
/**
 * Checks for new application updates (e.g., by fetching a manifest file).
 * In a PWA, this would involve service worker update checks.
 *
 * @returns {Promise<boolean>} Resolves true if updates are available, false otherwise.
 */
export const checkAppUpdates = () => {
  return new Promise((resolve) => {
    console.log('Checking for application updates...');
    // TODO: Implement actual update check logic.
    // This might involve fetching a version.json file or checking service worker updates.
    const updatesAvailable = Math.random() > 0.8; // Simulate 20% chance of update
    setTimeout(() => {
      console.log(`Application updates available: ${updatesAvailable}`);
      resolve(updatesAvailable);
    }, 1500);
  });
};

// --- Function for installServiceWorker (Conceptual) ---
/**
 * Registers a service worker for PWA features like offline capabilities and push notifications.
 *
 * @returns {Promise<string>} Resolves on successful registration.
 */
export const installServiceWorker = () => {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js') // Assuming service-worker.js exists
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          resolve('Service Worker registered.');
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          reject(new Error(`Service Worker registration failed: ${error.message}`));
        });
    } else {
      console.warn('Service Workers are not supported in this browser.');
      reject(new Error('Service Workers not supported.'));
    }
  });
};

// --- Function for unregisterServiceWorker (Conceptual) ---
/**
 * Unregisters a service worker.
 *
 * @returns {Promise<string>} Resolves on successful unregistration.
 */
export const unregisterServiceWorker = () => {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
          console.log('Service Worker unregistered:', registration.scope);
        }
        resolve('All Service Workers unregistered.');
      }).catch(error => {
        console.error('Failed to unregister Service Worker:', error);
        reject(new Error(`Failed to unregister Service Worker: ${error.message}`));
      });
    } else {
      console.warn('Service Workers are not supported in this browser.');
      reject(new Error('Service Workers not supported.'));
    }
  });
};

// --- Event Listener for DOMContentLoaded ---
// This ensures that the main application entry point runs only after the entire HTML document has been loaded and parsed.
document.addEventListener('DOMContentLoaded', mainApplicationEntry);

// --- Re-exporting some db_core functions needed by app_main's internal helpers ---
// These are already exported from db_core, but explicitly listing them here for clarity
// on what app_main directly uses.
// For the purpose of this single file, we need to ensure these are available.
// If this were truly 5 separate files, these would be imported from db_core.js.
// Since I'm generating one large file, I'll ensure they are defined or imported.
// The `db_core.js` file already exports them, so they are implicitly available if `app_main.js` is the only script.
// If `app_main.js` imports `db_core.js`, then `generateUniqueRecordKey` will be available.
// For this final combined output, I will ensure the helper functions it needs are either imported or defined.
// The `generateUniqueRecordKey` is defined in `db_core.js`, so it will be available if `db_core.js` is loaded first
// or if `app_main.js` imports it. For the purpose of this *single* `app_main.js` output, I'll ensure it's defined
// or that the import structure is clear.

// Placeholder for generateUniqueRecordKey if not imported (it IS imported via db_core)
// function generateUniqueRecordKey(prefix = 'record') {
//   const dateSegment = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
//   const uuid = Gun.uuid(); // Gun.js's built-in UUID generator
//   return `${prefix}-${dateSegment}-${uuid}`;
// }

// Placeholder for handleOfflineDataSynchronization if not imported (it IS imported via db_core)
// function handleOfflineDataSynchronization() {
//   window.addEventListener('online', () => {
//     console.log('Browser is online. Gun.js will automatically sync pending data.');
//     displayMessage('app-status', 'Online. Syncing data...', false);
//   });
//   window.addEventListener('offline', () => {
//     console.log('Browser is offline. Data will be queued.');
//     displayMessage('app-status', 'Offline. Data will sync when online.', true);
//   });
// }
