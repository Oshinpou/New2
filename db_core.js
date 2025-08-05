// db_core.js
// This script contains core Gun.js initialization, global instances,
// and fundamental user account management operations (CRUD).
// It ensures secure, globally replicated, and real-time data handling for user profiles.

// --- CDN Imports ---
// Main Gun.js library (bundle includes SEA for security, Radix for indexing, Axe for auto-updates)
// Using a specific, stable version for consistency in a real-world application.
import { Gun } from 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/gun.js';
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/sea.js'; // Security, Encryption, Authorization
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/lib/radix.js'; // For efficient indexing
import 'https://cdn.jsdelivr.net/npm/gun@0.2020.1231/lib/axe.js';   // For auto-updating graph

// --- Gun.js Configuration Variables ---
// Define multiple relay peers for robust global replication and uptime.
// These are public relays. For a production application, consider hosting your own
// or using trusted, dedicated relays for better control, performance, and data ownership.
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gundb-webrtc.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://peer.walled.city/gun',
  // Add more trusted relay peers here for increased redundancy and global reach.
  // Example for local development: 'http://localhost:8765/gun'
];

// --- Global Gun.js Instances ---
// These will be initialized by initGunDB and then exported for other modules.
let gunInstance = null;
let userInstance = null;
let usersRootNode = null; // The main 'users' node in the database, holding all user data.

// --- Utility for displaying messages (can be imported from ui_display.js later) ---
// For now, included here for self-containment of this script's functionality.
// In a multi-script setup, this would typically be in a UI-specific script.
function displayMessage(elementId, message, isError = false) {
  const outputElement = document.getElementById(elementId);
  if (outputElement) {
    outputElement.textContent = message;
    outputElement.style.color = isError ? 'var(--danger-color)' : 'var(--text-color)';
    console.log(`UI Message for ${elementId}: ${message}`);
  } else {
    console.warn(`Warning: UI element with ID '${elementId}' not found for message: "${message}"`);
  }
}

// --- Global State Variables ---
// These are managed by authentication functions and can be observed by UI scripts.
export let isUserLoggedIn = false;
export let currentUserData = null; // Stores details of the currently authenticated user

// --- Function #1: initGunDB() ---
/**
 * Initializes the Gun.js database instance and sets up the user management system.
 * This function ensures a stable connection to multiple relay peers for global data replication
 * and prepares the core database nodes for user and application data.
 * It uses a Promise to indicate successful initialization, crucial for asynchronous operations.
 *
 * @returns {Promise<void>} A Promise that resolves when Gun.js and its user system are initialized.
 */
export const initGunDB = () => {
  return new Promise((resolve, reject) => {
    try {
      if (gunInstance) {
        console.warn('Gun.js already initialized. Skipping re-initialization.');
        displayMessage('app-status', 'Database already initialized.', false);
        resolve(); // Resolve immediately if already initialized
        return;
      }

      // Initialize the Gun.js database with specified peers.
      // `radix: true` enables Radix Trie for efficient indexing and querying.
      // `axe: true` enables automatic graph updates, simplifying data consistency.
      gunInstance = Gun({
        peers: RELAY_PEERS,
        radix: true,
        axe: true,
        // Optional: `localStorage: false` if you want to prevent local storage of data,
        // relying solely on peers. Default is true.
        // `uuid: Gun.uuid` ensures consistent UUID generation if needed.
      });

      // Initialize the Gun.js user instance with SEA (Security, Encryption, Authorization).
      // `recall({ sessionStorage: true })` attempts to recall the last logged-in user
      // from session storage, providing session persistence across browser tabs/reloads.
      userInstance = gunInstance.user().recall({ sessionStorage: true });

      // Define the root node for all user-related data.
      // All user profiles will be children of this 'users' node.
      usersRootNode = gunInstance.get('users');

      // Add a listener to ensure Gun.js is connected to at least one peer.
      // This is a basic check for connection stability.
      gunInstance.on('out', function(msg){
        if(msg.err){
          console.error('Gun.js Connection Error:', msg.err);
          displayMessage('app-status', `Database connection error: ${msg.err}`, true);
          // Consider more robust error handling or re-connection logic here.
          // This reject is for initial connection failure, not ongoing.
          if (!gunInstance._.opt.peers.length) { // Only reject if no peers are connected at all
            reject(new Error(`Gun.js connection failed: ${msg.err}`));
          }
        } else if (msg.ok) {
          console.log('Gun.js connected to a peer:', msg.ok);
          displayMessage('app-status', 'Database connected successfully!', false);
          resolve(); // Resolve the promise once a connection is established
        }
      });

      // A timeout to reject the promise if no connection is established within a reasonable time.
      setTimeout(() => {
        if (!gunInstance._.opt.peers.length) { // Check if any peers are actually connected
          console.warn('Gun.js did not connect to any peers within the timeout.');
          displayMessage('app-status', 'Database connection timed out. Retrying...', true);
          // Implement retry logic or fallbacks here if needed.
          reject(new Error('Gun.js connection timed out.'));
        }
      }, 7000); // 7-second timeout for initial connection

      console.log('Gun.js initialization initiated with peers:', RELAY_PEERS);
      displayMessage('app-status', 'Initializing database connection...', false);

    } catch (error) {
      console.error('Failed to initialize Gun.js:', error);
      displayMessage('app-status', `Failed to initialize database: ${error.message}`, true);
      reject(error); // Reject the promise on initialization error
    }
  });
};

// --- Function #2: getGunInstance() ---
/**
 * Provides access to the initialized Gun.js database instance.
 * This is a getter function to ensure other modules can interact with the database.
 *
 * @returns {Gun|null} The Gun.js instance or null if not yet initialized.
 */
export const getGunInstance = () => {
  if (!gunInstance) {
    console.error('Gun.js instance not initialized. Call initGunDB() first.');
    return null;
  }
  return gunInstance;
};

// --- Function #3: getUserInstance() ---
/**
 * Provides access to the initialized Gun.js SEA user instance.
 * This is crucial for authentication and managing user-specific data.
 *
 * @returns {Gun.User|null} The Gun.js User instance or null if not yet initialized.
 */
export const getUserInstance = () => {
  if (!userInstance) {
    console.error('Gun.js User instance not initialized. Call initGunDB() first.');
    return null;
  }
  return userInstance;
};

// --- Function #4: getUsersRootNode() ---
/**
 * Provides access to the root Gun node where all user data is stored.
 * This node serves as the entry point for accessing individual user profiles.
 *
 * @returns {Gun|null} The 'users' Gun node or null if not yet initialized.
 */
export const getUsersRootNode = () => {
  if (!usersRootNode) {
    console.error('Users root node not initialized. Call initGunDB() first.');
    return null;
  }
  return usersRootNode;
};

// --- Function #5: registerUser(userData) ---
/**
 * Registers a new user with Gun.js SEA.
 * This function handles user creation, secure password hashing, and initial data storage.
 * It includes robust validation and error handling for real-world use.
 *
 * @param {object} userData - An object containing username, email, phone, countryCode, and password.
 * @returns {Promise<string>} A promise that resolves with a success message or rejects with an error.
 */
export const registerUser = (userData) => {
  return new Promise(async (resolve, reject) => {
    // 1. Input Validation
    if (!userData || typeof userData.username !== 'string' || userData.username.length < 3 ||
        typeof userData.email !== 'string' || !userData.email.includes('@') ||
        typeof userData.password !== 'string' || userData.password.length < 8 ||
        typeof userData.phone !== 'string' || userData.phone.length < 7 ||
        typeof userData.countryCode !== 'string' || userData.countryCode.length < 1) {
      const errorMessage = 'Invalid registration data. Please check username (min 3), email, password (min 8), phone (min 7), and country code.';
      displayMessage('reg-message', errorMessage, true);
      console.error('Registration Validation Error:', userData);
      reject(new Error(errorMessage));
      return;
    }

    displayMessage('reg-message', 'Attempting user registration...', false);
    const user = getUserInstance();
    const usersNode = getUsersRootNode();

    if (!user || !usersNode) {
        reject(new Error('Database not fully initialized. Please try again.'));
        return;
    }

    try {
      // 2. Use Gun.js `user.create` for secure user creation.
      // The SEA library handles password hashing and key generation automatically.
      user.create(userData.username, userData.password, async (ack) => {
        if (ack.err) {
          const errorMessage = `Registration failed: ${ack.err}. Username might already exist.`;
          displayMessage('reg-message', errorMessage, true);
          console.error('Gun.js User Creation Error:', ack.err);
          reject(new Error(errorMessage));
        } else {
          // 3. On successful creation, authenticate the user to get their public key.
          user.auth(userData.username, userData.password, async (authAck) => {
            if (authAck.err) {
              const errorMessage = `Registration successful, but auto-login failed: ${authAck.err}`;
              displayMessage('reg-message', errorMessage, true);
              console.error('Gun.js Auth after Create Error:', authAck.err);
              reject(new Error(errorMessage));
              return;
            }

            const userPub = authAck.sea.pub; // User's unique public key
            // Use time-based data segmentation for better database management (e.g., for large datasets).
            const creationDateKey = `created-${new Date().toISOString().split('T')[0]}`;
            const userSpecificNode = usersNode.get(userPub);

            // 4. Store additional user data under their public key.
            // Using .put() for object fields.
            await userSpecificNode.put({
              username: userData.username,
              email: userData.email,
              phone: userData.phone,
              countryCode: userData.countryCode,
              createdAt: Gun.time.is(), // Gun's internal timestamp
              lastLogin: Gun.time.is(),
              isRegistered: true,
              [creationDateKey]: true // Mark creation date
            });

            // Update global state
            isUserLoggedIn = true;
            currentUserData = {
              pub: userPub,
              alias: userData.username,
              email: userData.email,
              phone: userData.phone,
              countryCode: userData.countryCode,
              createdAt: Gun.time.is(),
              lastLogin: Gun.time.is()
            };

            displayMessage('reg-message', 'Registration successful! You are now logged in.', false);
            console.log('New user registered and logged in:', currentUserData);
            resolve('Registration successful and logged in.');
          });
        }
      });
    } catch (error) {
      const errorMessage = `An unexpected error occurred during registration: ${error.message}`;
      displayMessage('reg-message', errorMessage, true);
      console.error('Unexpected Registration Error:', error);
      reject(new Error(errorMessage));
    }
  });
};

// --- Function #6: loginUser(loginData) ---
/**
 * Authenticates a user with Gun.js SEA.
 * On success, it establishes a user session, updates global state, and fetches full user data.
 * Includes robust validation, error handling, and UI feedback.
 *
 * @param {object} loginData - An object containing username and password.
 * @returns {Promise<string>} A promise that resolves with a success message or rejects with an error.
 */
export const loginUser = (loginData) => {
  return new Promise(async (resolve, reject) => {
    // 1. Input Validation
    if (!loginData || typeof loginData.username !== 'string' || loginData.username.length < 3 ||
        typeof loginData.password !== 'string' || loginData.password.length < 8) {
      const errorMessage = 'Invalid login data. Please provide a valid username and password.';
      displayMessage('login-message', errorMessage, true);
      console.error('Login Validation Error:', loginData);
      reject(new Error(errorMessage));
      return;
    }

    displayMessage('login-message', 'Attempting login...', false);
    const user = getUserInstance();
    const usersNode = getUsersRootNode();

    if (!user || !usersNode) {
        reject(new Error('Database not fully initialized. Please try again.'));
        return;
    }

    try {
      // 2. Use Gun.js `user.auth` to securely log in the user.
      // The SEA library handles authentication and session management.
      user.auth(loginData.username, loginData.password, async (ack) => {
        if (ack.err) {
          const errorMessage = `Login failed: ${ack.err}. Please check your username and password.`;
          displayMessage('login-message', errorMessage, true);
          console.error('Gun.js Auth Error:', ack.err);
          // Implement exponential backoff for retries if this were an automatic retry
          // const delay = calculateExponentialBackoffDelay(retryCount);
          reject(new Error(errorMessage));
        } else {
          const userPub = ack.sea.pub; // User's unique public key
          // 3. On successful authentication, update the application state.
          isUserLoggedIn = true;
          currentUserData = {
            pub: userPub,
            alias: loginData.username,
            // Initial data from auth ack. More detailed data fetched below.
          };

          // 4. Retrieve and load the full user data from the database.
          // Using .once() to get the data once. Real-time updates handled by listenToUserProfile.
          usersNode.get(userPub).once((data) => {
            if (data) {
              currentUserData = { ...currentUserData, ...data };
              console.log('Full user data loaded:', currentUserData);
            }
            // 5. Update the last login timestamp in the database.
            // This is an asynchronous operation, but not critical to block login success.
            usersNode.get(userPub).put({ lastLogin: Gun.time.is() });
            
            displayMessage('login-message', 'Login successful!', false);
            console.log('User logged in:', currentUserData);
            resolve('Login successful.');
          });
        }
      });
    } catch (error) {
      const errorMessage = `An unexpected error occurred during login: ${error.message}`;
      displayMessage('login-message', errorMessage, true);
      console.error('Unexpected Login Error:', error);
      reject(new Error(errorMessage));
    }
  });
};

// --- Function #7: logoutUser() ---
/**
 * Logs out the current user from the Gun.js SEA session.
 * Clears the local session data and updates the global application state.
 *
 * @returns {Promise<string>} A promise that resolves with a success message or rejects with an error.
 */
export const logoutUser = () => {
  return new Promise((resolve, reject) => {
    const user = getUserInstance();
    if (!user) {
      const errorMessage = 'User instance not initialized. Cannot log out.';
      console.error(errorMessage);
      reject(new Error(errorMessage));
      return;
    }

    try {
      // Gun.js SEA's `user.leave()` method effectively logs out the user.
      user.leave();
      isUserLoggedIn = false;
      currentUserData = null;
      displayMessage('status-nav-message', 'You have been logged out.', false); // Assuming a message area for status/nav
      console.log('User logged out successfully.');
      resolve('Logged out successfully.');
    } catch (error) {
      const errorMessage = `Failed to log out: ${error.message}`;
      console.error(errorMessage, error);
      reject(new Error(errorMessage));
    }
  });
};

// --- Function #8: checkLoginStatus() ---
/**
 * Checks the current login status of the user based on the Gun.js SEA session.
 * Updates the global `isUserLoggedIn` and `currentUserData` variables.
 * This function is crucial for maintaining session state across page loads and UI updates.
 *
 * @returns {Promise<boolean>} A promise that resolves with true if logged in, false otherwise.
 */
export const checkLoginStatus = () => {
  return new Promise((resolve) => {
    const user = getUserInstance();
    if (!user) {
      console.warn('Gun.js User instance not initialized when checking login status.');
      isUserLoggedIn = false;
      currentUserData = null;
      displayMessage('login-status-placeholder', 'Application not ready.', true);
      resolve(false);
      return;
    }

    // `user.recall()` with no arguments attempts to recall the last session.
    // The `on` callback fires when the authentication state changes or is recalled.
    user.on(async (ack) => {
      if (ack.pub) {
        // User is authenticated (public key exists)
        isUserLoggedIn = true;
        currentUserData = { pub: ack.pub, alias: ack.alias }; // alias is the username

        // Fetch full user data from the database using the public key.
        // Using .once() to get the data once. Listeners can be set up separately for real-time.
        const usersNode = getUsersRootNode();
        if (usersNode) {
          usersNode.get(currentUserData.pub).once((data) => {
            if (data) {
              currentUserData = { ...currentUserData, ...data };
              console.log('Login status check: Full user data loaded:', currentUserData);
            }
            displayMessage('login-status-placeholder', `Logged in as: ${currentUserData.alias || 'Unknown User'}`, false);
            resolve(true); // Resolve with true as user is logged in
          });
        } else {
          // Fallback if usersRootNode isn't ready, still indicate logged in
          displayMessage('login-status-placeholder', `Logged in as: ${currentUserData.alias || 'Unknown User'} (partial data)`, false);
          resolve(true);
        }
      } else {
        // User is not logged in or session expired/invalid
        isUserLoggedIn = false;
        currentUserData = null;
        displayMessage('login-status-placeholder', 'Not Logged In', true);
        resolve(false); // Resolve with false as user is not logged in
      }
    });
  });
};

// --- Function #9: getCurrentUserPub() ---
/**
 * Retrieves the public key (unique identifier) of the currently logged-in user.
 * This public key is essential for accessing user-specific data in Gun.js.
 *
 * @returns {string|null} The user's public key if logged in, otherwise null.
 */
export const getCurrentUserPub = () => {
  if (isUserLoggedIn && currentUserData && currentUserData.pub) {
    return currentUserData.pub;
  }
  console.warn('No user is currently logged in or public key is unavailable.');
  return null;
};

// --- Function #10: getCurrentUserAlias() ---
/**
 * Retrieves the username (alias) of the currently logged-in user.
 * This is the human-readable identifier for the user.
 *
 * @returns {string|null} The user's alias if logged in, otherwise null.
 */
export const getCurrentUserAlias = () => {
  if (isUserLoggedIn && currentUserData && currentUserData.alias) {
    return currentUserData.alias;
  }
  console.warn('No user is currently logged in or alias is unavailable.');
  return null;
};

// --- Function #11: saveUserProfile(pub, profileData) ---
/**
 * Persists or updates a user's core profile data in the database.
 * This function uses the user's public key as the primary identifier.
 * It ensures data is stored under the correct user node and is globally replicated.
 *
 * @param {string} pub - The public key of the user.
 * @param {object} profileData - The profile data to save/update (e.g., {email: 'new@example.com'}).
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const saveUserProfile = (pub, profileData) => {
  return new Promise((resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided for saving profile.'));
      return;
    }
    if (!profileData || typeof profileData !== 'object') {
      reject(new Error('Invalid profile data provided. Must be an object.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database root node not initialized.'));
      return;
    }

    try {
      // Use .put() to merge the new profile data into the user's node.
      // This automatically handles updates and creation.
      usersNode.get(pub).put(profileData, (ack) => {
        if (ack.err) {
          console.error(`Error saving user profile for ${pub}:`, ack.err);
          reject(new Error(`Failed to save profile: ${ack.err}`));
        } else {
          console.log(`User profile for ${pub} saved successfully.`, ack);
          resolve('User profile saved successfully.');
        }
      });
    } catch (error) {
      console.error('Unexpected error in saveUserProfile:', error);
      reject(new Error(`An unexpected error occurred: ${error.message}`));
    }
  });
};

// --- Function #12: loadUserProfile(pub) ---
/**
 * Retrieves a user's core profile data from the database.
 * This function fetches the latest available data for a given public key.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<object|null>} A promise that resolves with the user's profile data or null if not found.
 */
export const loadUserProfile = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided for loading profile.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database root node not initialized.'));
      return;
    }

    try {
      // Use .once() to fetch the data once. For real-time updates, use listenToUserProfile.
      usersNode.get(pub).once((data) => {
        if (data) {
          // Remove Gun.js metadata if present
          const { _, ...profileData } = data;
          console.log(`User profile for ${pub} loaded:`, profileData);
          resolve(profileData);
        } else {
          console.log(`No profile found for user: ${pub}`);
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Unexpected error in loadUserProfile:', error);
      reject(new Error(`An unexpected error occurred: ${error.message}`));
    }
  });
};

// --- Function #13: updateUserProfileField(pub, field, value) ---
/**
 * Atomically updates a single field in a user's profile.
 * This is an efficient way to update specific attributes without overwriting the entire profile.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} field - The name of the field to update (e.g., 'email', 'phone').
 * @param {*} value - The new value for the specified field.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const updateUserProfileField = (pub, field, value) => {
  return new Promise((resolve, reject) => {
    if (!pub || typeof pub !== 'string' || !field || typeof field !== 'string') {
      reject(new Error('Invalid public key or field name provided for update.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database root node not initialized.'));
      return;
    }

    try {
      // Use .get(field).put(value) for atomic field updates.
      usersNode.get(pub).get(field).put(value, (ack) => {
        if (ack.err) {
          console.error(`Error updating field '${field}' for ${pub}:`, ack.err);
          reject(new Error(`Failed to update field: ${ack.err}`));
        } else {
          console.log(`Field '${field}' for ${pub} updated successfully to: ${value}`, ack);
          resolve(`Field '${field}' updated successfully.`);
        }
      });
    } catch (error) {
      console.error('Unexpected error in updateUserProfileField:', error);
      reject(new Error(`An unexpected error occurred: ${error.message}`));
    }
  });
};

// --- Function #14: deleteUserProfile(pub) ---
/**
 * Permanently removes a user's core profile data from the database.
 * This is a destructive operation and should be used with extreme caution and confirmation.
 * It sets the user's main node to null, effectively deleting it from the graph.
 *
 * @param {string} pub - The public key of the user whose profile is to be deleted.
 * @returns {Promise<string>} A promise that resolves on successful deletion or rejects on failure.
 */
export const deleteUserProfile = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided for deleting profile.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database root node not initialized.'));
      return;
    }

    try {
      // Setting the user's node to null effectively deletes it in Gun.js.
      usersNode.get(pub).put(null, (ack) => {
        if (ack.err) {
          console.error(`Error deleting user profile for ${pub}:`, ack.err);
          reject(new Error(`Failed to delete profile: ${ack.err}`));
        } else {
          console.log(`User profile for ${pub} deleted successfully.`, ack);
          resolve('User profile deleted successfully.');
        }
      });
    } catch (error) {
      console.error('Unexpected error in deleteUserProfile:', error);
      reject(new Error(`An unexpected error occurred: ${error.message}`));
    }
  });
};

// --- Function #15: listenToUserProfile(pub, callback) ---
/**
 * Sets up a real-time listener for changes to a user's core profile data.
 * The provided callback function will be invoked whenever the profile data changes.
 * This enables live updates across all connected devices.
 *
 * @param {string} pub - The public key of the user to listen to.
 * @param {function(object|null): void} callback - The function to call with the updated profile data.
 * @returns {void}
 */
export const listenToUserProfile = (pub, callback) => {
  if (!pub || typeof pub !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for listenToUserProfile. Requires public key and a callback function.');
    return;
  }

  const usersNode = getUsersRootNode();
  if (!usersNode) {
    console.error('Database root node not initialized. Cannot set up listener.');
    return;
  }

  try {
    // The .on() method provides real-time updates.
    usersNode.get(pub).on((data, key) => {
      // Remove Gun.js metadata before passing to callback
      const { _, ...profileData } = data || {};
      console.log(`Real-time update for user ${pub}:`, profileData);
      callback(profileData);
    });
    console.log(`Listening for real-time updates on user profile: ${pub}`);
  } catch (error) {
    console.error('Error setting up listenToUserProfile:', error);
  }
};

// --- Function #16: removeUserProfileListener(pub) ---
/**
 * Removes a previously set real-time listener for a user profile.
 * This is important for preventing memory leaks when a listener is no longer needed.
 * Note: Gun.js's .off() requires the exact same callback function reference to remove.
 * For simplicity here, we'll just log, but in a real app, you'd manage listener references.
 *
 * @param {string} pub - The public key of the user whose listener is to be removed.
 * @returns {void}
 */
export const removeUserProfileListener = (pub) => {
  if (!pub || typeof pub !== 'string') {
    console.error('Invalid public key provided for removing listener.');
    return;
  }

  const usersNode = getUsersRootNode();
  if (!usersNode) {
    console.error('Database root node not initialized. Cannot remove listener.');
    return;
  }

  try {
    // To effectively remove, you'd need the exact callback reference passed to .on().
    // For demonstration, we'll just log. A more robust solution involves storing callbacks.
    // usersNode.get(pub).off(callbackReference);
    console.warn(`Attempted to remove listener for user ${pub}. In a real app, pass the original callback reference to .off().`);
  } catch (error) {
    console.error('Error removing user profile listener:', error);
  }
};

// --- Function #17: validateUserDataSchema(data) ---
/**
 * Enforces a predefined schema for user data before storage.
 * This helps maintain data integrity and consistency across the database.
 * Returns true if data matches schema, false otherwise.
 *
 * @param {object} data - The user data object to validate.
 * @returns {boolean} True if the data conforms to the schema, false otherwise.
 */
export const validateUserDataSchema = (data) => {
  if (typeof data !== 'object' || data === null) {
    console.error('Validation Error: Data must be an object.');
    return false;
  }
  const requiredFields = ['username', 'email', 'phone', 'countryCode', 'createdAt', 'lastLogin', 'isRegistered'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Validation Error: Missing required field '${field}'.`);
      return false;
    }
  }
  // Further type and format checks can be added here
  if (typeof data.username !== 'string' || data.username.length < 3) return false;
  if (typeof data.email !== 'string' || !data.email.includes('@')) return false;
  // ... more comprehensive validation for each field
  console.log('User data schema validated successfully.');
  return true;
};

// --- Function #18: ensureUserNodeExists(pub) ---
/**
 * Guarantees a user's root node exists in the database for subsequent operations.
 * If the node doesn't exist, it can optionally create a minimal placeholder.
 * This prevents errors when trying to access non-existent paths.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<boolean>} Resolves true if node exists or was created, false on error.
 */
export const ensureUserNodeExists = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided to ensureUserNodeExists.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database root node not initialized. Cannot ensure node exists.'));
      return;
    }
    usersNode.get(pub).once((data) => {
      if (data) {
        console.log(`User node for ${pub} already exists.`);
        resolve(true);
      } else {
        // Create a minimal placeholder to ensure the node exists
        usersNode.get(pub).put({ placeholder: true, createdAt: Gun.time.is() }, (ack) => {
          if (ack.err) {
            console.error(`Failed to create placeholder node for ${pub}:`, ack.err);
            reject(new Error(`Failed to ensure user node: ${ack.err}`));
          } else {
            console.log(`Placeholder node created for ${pub}.`);
            resolve(true);
          }
        });
      }
    });
  });
};

// --- Function #19: handleDatabaseError(error, context) ---
/**
 * Centralized error handling for all database operations.
 * This function logs the error, provides context, and can trigger UI notifications
 * or analytics reporting in a real-world scenario.
 *
 * @param {Error} error - The error object caught.
 * @param {string} context - A descriptive string indicating where the error occurred.
 * @returns {void}
 */
export const handleDatabaseError = (error, context = 'Unknown database operation') => {
  console.error(`Database Error in ${context}:`, error.message, error.stack);
  // In a real application, you might also:
  // displayMessage('global-error-message', `An error occurred: ${error.message}`, true);
  // sendAnalyticsEvent('database_error', { context, errorMessage: error.message });
  // logToRemoteService({ level: 'error', context, error: error.message });
};

// --- Function #20: generateUniqueRecordKey(prefix) ---
/**
 * Generates a unique, time-based key for new database entries.
 * This helps in organizing data and can be useful for time-series queries or archiving.
 * Keys are often used as identifiers for items within collections (e.g., 'order-2025-08-05-UUID').
 *
 * @param {string} prefix - A prefix for the key (e.g., 'order', 'product', 'address').
 * @returns {string} A unique, time-segmented key.
 */
export const generateUniqueRecordKey = (prefix = 'record') => {
  const dateSegment = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const uuid = Gun.uuid(); // Gun.js's built-in UUID generator
  const uniqueKey = `${prefix}-${dateSegment}-${uuid}`;
  console.log(`Generated unique key: ${uniqueKey}`);
  return uniqueKey;
};

// --- Function #21: encryptSensitiveData(data, key) ---
/**
 * Encrypts sensitive data using Gun.js SEA (Security, Encryption, Authorization).
 * This ensures data privacy when stored in the decentralized database.
 * The 'key' parameter would typically be derived from the user's SEA keys or a shared secret.
 *
 * @param {object|string} data - The data to encrypt.
 * @param {object} key - The SEA key pair or shared secret to use for encryption.
 * @returns {Promise<string>} A promise that resolves with the encrypted string.
 */
export const encryptSensitiveData = (data, key) => {
  return new Promise(async (resolve, reject) => {
    if (!key) {
      reject(new Error('Encryption key is required.'));
      return;
    }
    try {
      const encrypted = await Gun.SEA.encrypt(data, key);
      if (encrypted) {
        console.log('Data encrypted successfully.');
        resolve(encrypted);
      } else {
        reject(new Error('SEA encryption failed.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'encryptSensitiveData');
      reject(new Error(`Encryption error: ${error.message}`));
    }
  });
};

// --- Function #22: decryptSensitiveData(encryptedData, key) ---
/**
 * Decrypts sensitive data retrieved from the database using Gun.js SEA.
 * This function reverses the encryption process, making the data readable again.
 *
 * @param {string} encryptedData - The encrypted string to decrypt.
 * @param {object} key - The SEA key pair or shared secret used for encryption.
 * @returns {Promise<object|string>} A promise that resolves with the decrypted data.
 */
export const decryptSensitiveData = (encryptedData, key) => {
  return new Promise(async (resolve, reject) => {
    if (!key || typeof encryptedData !== 'string') {
      reject(new Error('Decryption key and encrypted data string are required.'));
      return;
    }
    try {
      const decrypted = await Gun.SEA.decrypt(encryptedData, key);
      if (decrypted) {
        console.log('Data decrypted successfully.');
        resolve(decrypted);
      } else {
        reject(new Error('SEA decryption failed.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'decryptSensitiveData');
      reject(new Error(`Decryption error: ${error.message}`));
    }
  });
};

// --- Function #23: getPublicUserAttributes(pub) ---
/**
 * Retrieves only publicly accessible user data from the database.
 * This function is designed to fetch information that can be shared without authentication.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<object|null>} A promise that resolves with public user data or null.
 */
export const getPublicUserAttributes = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      usersNode.get(pub).once((data) => {
        if (data) {
          // Example: Only return username and creation date as public attributes
          const publicData = {
            username: data.username,
            createdAt: data.createdAt
          };
          console.log(`Public attributes for ${pub}:`, publicData);
          resolve(publicData);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'getPublicUserAttributes');
      reject(new Error(`Failed to get public attributes: ${error.message}`));
    }
  });
};

// --- Function #24: getPrivateUserAttributes(pub) ---
/**
 * Retrieves private user data from the database.
 * This function should only be called after successful user authentication,
 * as the data might be encrypted or require specific permissions.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<object|null>} A promise that resolves with private user data or null.
 */
export const getPrivateUserAttributes = (pub) => {
  return new Promise(async (resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    if (!isUserLoggedIn || getCurrentUserPub() !== pub) {
      reject(new Error('Unauthorized: Cannot access private attributes for another user or not logged in.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      // In a real scenario, you might decrypt specific fields here.
      usersNode.get(pub).once((data) => {
        if (data) {
          const { _, username, createdAt, ...privateData } = data; // Exclude public fields and Gun metadata
          console.log(`Private attributes for ${pub}:`, privateData);
          resolve(privateData);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'getPrivateUserAttributes');
      reject(new Error(`Failed to get private attributes: ${error.message}`));
    }
  });
};

// --- Function #25: updateLastLoginTimestamp(pub) ---
/**
 * Records the exact time of the user's last successful login.
 * This timestamp is useful for auditing, session management, or displaying user activity.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const updateLastLoginTimestamp = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      usersNode.get(pub).get('lastLogin').put(Gun.time.is(), (ack) => {
        if (ack.err) {
          handleDatabaseError(ack.err, 'updateLastLoginTimestamp');
          reject(new Error(`Failed to update last login: ${ack.err}`));
        } else {
          console.log(`Last login timestamp updated for ${pub}.`);
          resolve('Last login timestamp updated.');
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'updateLastLoginTimestamp');
      reject(new Error(`Error updating last login: ${error.message}`));
    }
  });
};

// --- Function #26: setInitialUserPermissions(pub) ---
/**
 * Configures initial data access permissions for a newly created user.
 * In Gun.js, this might involve setting up graph permissions or
 * defining which parts of the user's data are public vs. private.
 *
 * @param {string} pub - The public key of the new user.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const setInitialUserPermissions = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      // Example: Mark a 'private' sub-node for future encrypted data
      usersNode.get(pub).get('permissions').put({
        public: true,
        private: true, // Controlled by SEA encryption
        // Add more granular permissions as needed
      }, (ack) => {
        if (ack.err) {
          handleDatabaseError(ack.err, 'setInitialUserPermissions');
          reject(new Error(`Failed to set permissions: ${ack.err}`));
        } else {
          console.log(`Initial permissions set for ${pub}.`);
          resolve('Initial user permissions set.');
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'setInitialUserPermissions');
      reject(new Error(`Error setting permissions: ${error.message}`));
    }
  });
};

// --- Function #27: archiveOldUserData(pub, thresholdDate) ---
/**
 * Moves infrequently accessed old user data to an archive.
 * This helps in managing the active dataset size and can improve performance
 * for frequently accessed data. Archiving typically involves moving data
 * to a different key path or a separate storage solution (e.g., S3/LevelDB backend).
 *
 * @param {string} pub - The public key of the user.
 * @param {string} thresholdDate - Data older than this date (YYYY-MM-DD) will be considered for archiving.
 * @returns {Promise<string>} A promise that resolves with a summary of archived data or rejects.
 */
export const archiveOldUserData = (pub, thresholdDate) => {
  return new Promise((resolve, reject) => {
    if (!pub || !thresholdDate) { reject(new Error('Public key and threshold date are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    console.log(`Initiating archive for ${pub} older than ${thresholdDate}...`);
    // TODO: Implement actual archiving logic. This would involve:
    // 1. Querying for data older than thresholdDate (e.g., orders, logs).
    // 2. Moving or copying that data to an 'archive' sub-node or a different Gun instance/backend.
    // 3. Deleting the original data from the active path.
    // This is a complex operation requiring careful planning for data integrity.
    setTimeout(() => { // Simulate async archiving
      console.log(`Archiving process for ${pub} completed (simulated).`);
      resolve(`Archived data for ${pub} older than ${thresholdDate}.`);
    }, 1000);
  });
};

// --- Function #28: restoreArchivedUserData(pub, archiveId) ---
/**
 * Retrieves specific archived user data and potentially moves it back to the active dataset.
 * This is the reverse operation of archiving and requires knowing the archive identifier.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} archiveId - The identifier of the archived data to restore.
 * @returns {Promise<object>} A promise that resolves with the restored data or rejects.
 */
export const restoreArchivedUserData = (pub, archiveId) => {
  return new Promise((resolve, reject) => {
    if (!pub || !archiveId) { reject(new Error('Public key and archive ID are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    console.log(`Attempting to restore archive ${archiveId} for ${pub}...`);
    // TODO: Implement actual restoration logic. This would involve:
    // 1. Locating the archived data using archiveId.
    // 2. Copying it back to the active user data path.
    // 3. Handling any potential conflicts or merging.
    setTimeout(() => { // Simulate async restoration
      const restoredData = { id: archiveId, content: 'Restored data content' };
      console.log(`Archived data ${archiveId} restored for ${pub} (simulated).`);
      resolve(restoredData);
    }, 1000);
  });
};

// --- Function #29: performDataSchemaMigration(oldSchemaVersion, newSchemaVersion) ---
/**
 * Manages database schema updates. When your application's data structure changes,
 * this function can be used to transform existing data from an older schema version
 * to a newer one, ensuring compatibility and preventing data loss.
 *
 * @param {string} oldSchemaVersion - The version of the current data schema.
 * @param {string} newSchemaVersion - The target version of the data schema.
 * @returns {Promise<string>} A promise that resolves on successful migration or rejects.
 */
export const performDataSchemaMigration = (oldSchemaVersion, newSchemaVersion) => {
  return new Promise((resolve, reject) => {
    if (!oldSchemaVersion || !newSchemaVersion) { reject(new Error('Schema versions are required.')); return; }
    console.log(`Initiating data migration from ${oldSchemaVersion} to ${newSchemaVersion}...`);
    // TODO: Implement schema migration logic. This is highly application-specific.
    // It might involve iterating over specific data nodes, reading, transforming, and writing back.
    // Example: if a field name changed from 'tel' to 'phoneNumber', you'd read 'tel' and write to 'phoneNumber'.
    setTimeout(() => { // Simulate async migration
      console.log(`Data migration from ${oldSchemaVersion} to ${newSchemaVersion} completed (simulated).`);
      resolve(`Data migrated from ${oldSchemaVersion} to ${newSchemaVersion}.`);
    }, 1500);
  });
};

// --- Function #30: initiateUserDataBackup(pub) ---
/**
 * Triggers a process to back up a user's entire dataset.
 * In a Gun.js context, this typically means exporting the user's graph data
 * to a more permanent, external storage solution like a file system, S3, or another database.
 * This function would interact with the Gun.js `dump` or `export` features if available,
 * or manually traverse and collect data.
 *
 * @param {string} pub - The public key of the user to back up.
 * @returns {Promise<string>} A promise that resolves with a backup identifier or rejects.
 */
export const initiateUserDataBackup = (pub) => {
  return new Promise((resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    console.log(`Initiating data backup for user ${pub}...`);
    // TODO: Implement actual backup logic.
    // This could involve:
    // 1. Traversing the user's data graph using .map() or .once().
    // 2. Serializing the data (e.g., to JSON).
    // 3. Sending the serialized data to an external service/backend for storage.
    const backupId = `backup-${Gun.uuid()}`;
    setTimeout(() => { // Simulate async backup
      console.log(`User data backup for ${pub} completed (simulated). Backup ID: ${backupId}`);
      resolve(backupId);
    }, 2000);
  });
};

// --- Function #31: restoreUserDataFromBackup(pub, backupIdentifier) ---
/**
 * Restores user data from a specific backup.
 * This involves fetching the backup data from external storage and
 * importing it back into the Gun.js graph for the specified user.
 *
 * @param {string} pub - The public key of the user to restore data for.
 * @param {string} backupIdentifier - The identifier of the backup to restore.
 * @returns {Promise<string>} A promise that resolves on successful restoration or rejects.
 */
export const restoreUserDataFromBackup = (pub, backupIdentifier) => {
  return new Promise((resolve, reject) => {
    if (!pub || !backupIdentifier) { reject(new Error('Public key and backup identifier are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    console.log(`Restoring user data for ${pub} from backup ${backupIdentifier}...`);
    // TODO: Implement actual restore logic.
    // This could involve:
    // 1. Fetching the serialized backup data from external storage using backupIdentifier.
    // 2. Parsing the data.
    // 3. Using Gun.js .put() or .set() to re-insert the data into the user's node.
    setTimeout(() => { // Simulate async restore
      console.log(`User data for ${pub} restored from backup ${backupIdentifier} (simulated).`);
      resolve('User data restored successfully.');
    }, 2000);
  });
};

// --- Function #32: getConnectedRelayPeers() ---
/**
 * Returns a list of currently active Gun.js relay connections.
 * This can be useful for debugging, monitoring network health, or displaying
 * connection status to the user.
 *
 * @returns {string[]} An array of URLs of connected relay peers.
 */
export const getConnectedRelayPeers = () => {
  if (!gunInstance) {
    console.warn('Gun.js instance not initialized. Cannot get connected peers.');
    return [];
  }
  // Gun.js stores connected peers internally. Accessing internal properties.
  const connectedPeers = Object.keys(gunInstance._.opt.peers || {});
  console.log('Currently connected Gun.js peers:', connectedPeers);
  return connectedPeers;
};

// --- Function #33: checkSingleRelayHealth(relayUrl) ---
/**
 * Pings a specific relay to verify its responsiveness and connection status.
 * This can be used to diagnose issues with individual relay servers.
 *
 * @param {string} relayUrl - The URL of the relay to check.
 * @returns {Promise<boolean>} A promise that resolves true if the relay is healthy, false otherwise.
 */
export const checkSingleRelayHealth = (relayUrl) => {
  return new Promise((resolve) => {
    if (!relayUrl || typeof relayUrl !== 'string') {
      console.error('Invalid relay URL provided for health check.');
      resolve(false);
      return;
    }
    console.log(`Checking health of relay: ${relayUrl}...`);
    // TODO: Implement actual ping/health check. This might involve:
    // 1. Attempting a small data read/write operation to that specific peer.
    // 2. Using a WebSocket ping if Gun.js exposes that.
    // For now, simulate a check.
    const isHealthy = Math.random() > 0.1; // 90% chance of being healthy
    setTimeout(() => {
      console.log(`Relay ${relayUrl} is ${isHealthy ? 'healthy' : 'unhealthy'}.`);
      resolve(isHealthy);
    }, 500);
  });
};

// --- Function #34: reconnectToFailedRelay(relayUrl) ---
/**
 * Attempts to re-establish connection with a previously disconnected or failed relay.
 * This is part of a robust connection management strategy to ensure high availability.
 *
 * @param {string} relayUrl - The URL of the relay to reconnect to.
 * @returns {Promise<string>} A promise that resolves on successful reconnection or rejects.
 */
export const reconnectToFailedRelay = (relayUrl) => {
  return new Promise((resolve, reject) => {
    if (!relayUrl || typeof relayUrl !== 'string') {
      reject(new Error('Invalid relay URL provided for reconnection.'));
      return;
    }
    if (!gunInstance) {
      reject(new Error('Gun.js instance not initialized. Cannot reconnect.'));
      return;
    }
    console.log(`Attempting to reconnect to relay: ${relayUrl}...`);
    try {
      // Gun.js automatically attempts to reconnect to configured peers.
      // To force a reconnect, you might temporarily remove and re-add the peer,
      // or simply rely on Gun's internal retry mechanisms.
      // For demonstration, we'll simulate a reconnect.
      gunInstance.opt({ peers: { [relayUrl]: {} } }); // Re-add peer to options
      setTimeout(() => {
        const reconnected = Math.random() > 0.2; // 80% chance of success
        if (reconnected) {
          console.log(`Successfully reconnected to relay: ${relayUrl}.`);
          resolve(`Reconnected to ${relayUrl}.`);
        } else {
          console.warn(`Failed to reconnect to relay: ${relayUrl}.`);
          reject(new Error(`Failed to reconnect to ${relayUrl}.`));
        }
      }, 1000);
    } catch (error) {
      handleDatabaseError(error, 'reconnectToFailedRelay');
      reject(new Error(`Error during reconnect attempt: ${error.message}`));
    }
  });
};

// --- Function #35: monitorGlobalDataSyncStatus() ---
/**
 * Provides insights into the real-time data synchronization across all connected peers.
 * This can involve tracking pending writes, received updates, and overall network latency.
 * Gun.js doesn't expose a direct 'sync status' API, so this is a conceptual function
 * that would aggregate information from various listeners or internal metrics.
 *
 * @returns {Promise<object>} A promise that resolves with sync status metrics.
 */
export const monitorGlobalDataSyncStatus = () => {
  return new Promise((resolve, reject) => {
    if (!gunInstance) { reject(new Error('Gun.js instance not initialized.')); return; }
    console.log('Monitoring global data synchronization status...');
    // TODO: Implement actual monitoring logic. This is advanced and might involve:
    // 1. Tracking `gun.on('out')` and `gun.on('in')` events.
    // 2. Observing specific data nodes for their last updated timestamps across peers.
    // 3. Estimating latency to different peers.
    setTimeout(() => { // Simulate sync status
      const status = {
        peersConnected: getConnectedRelayPeers().length,
        pendingWrites: Math.floor(Math.random() * 5),
        lastSyncTime: Gun.time.is(),
        overallHealth: getConnectedRelayPeers().length > 0 ? 'Good' : 'Poor'
      };
      console.log('Global data sync status:', status);
      resolve(status);
    }, 700);
  });
};

// --- Function #36: retrieveGunInternalStats() ---
/**
 * Fetches internal performance and data metrics from Gun.js.
 * This can include information about the local graph size, memory usage,
 * and number of active listeners, useful for debugging and optimization.
 *
 * @returns {Promise<object>} A promise that resolves with Gun.js internal statistics.
 */
export const retrieveGunInternalStats = () => {
  return new Promise((resolve, reject) => {
    if (!gunInstance) { reject(new Error('Gun.js instance not initialized.')); return; }
    console.log('Retrieving Gun.js internal statistics...');
    try {
      // Gun.js sometimes exposes internal stats via `gun._.stats` or similar.
      // This might vary by Gun.js version or build.
      const stats = {
        localGraphSize: gunInstance._.graph ? Object.keys(gunInstance._.graph).length : 0,
        activeListeners: gunInstance._.on ? Object.keys(gunInstance._.on).length : 0,
        // Add more relevant internal stats as needed/available
        timestamp: Gun.time.is()
      };
      console.log('Gun.js Internal Stats:', stats);
      resolve(stats);
    } catch (error) {
      handleDatabaseError(error, 'retrieveGunInternalStats');
      reject(new Error(`Failed to retrieve Gun.js stats: ${error.message}`));
    }
  });
};

// --- Function #37: clearLocalGunCache() ---
/**
 * Clears the browser's local Gun.js data cache.
 * This can be useful for debugging, ensuring a fresh data load, or for privacy reasons.
 * Note: This only clears local data, not data on the network peers.
 *
 * @returns {Promise<string>} A promise that resolves on successful clearance or rejects.
 */
export const clearLocalGunCache = () => {
  return new Promise((resolve, reject) => {
    if (!gunInstance) { reject(new Error('Gun.js instance not initialized.')); return; }
    console.warn('Attempting to clear local Gun.js cache...');
    try {
      // Gun.js doesn't have a direct `clearCache()` method.
      // This typically involves clearing localStorage entries related to Gun.js.
      // For example, `localStorage.clear()` would clear ALL local storage, which is usually too broad.
      // A safer approach is to target specific Gun.js keys if known.
      // For demonstration, we'll simulate the effect.
      // If using IndexedDB/WebSQL, more specific API calls would be needed.
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('gun/') || key.startsWith('SEA/')) {
          localStorage.removeItem(key);
        }
      });
      console.log('Local Gun.js cache cleared (simulated by removing relevant localStorage keys).');
      resolve('Local Gun.js cache cleared.');
    } catch (error) {
      handleDatabaseError(error, 'clearLocalGunCache');
      reject(new Error(`Failed to clear local cache: ${error.message}`));
    }
  });
};

// --- Function #38: handleOfflineDataSynchronization() ---
/**
 * Manages data queuing and syncing when the client goes offline and then comes back online.
 * Gun.js inherently handles much of this, but this function can provide a hook for
 * custom logic, UI feedback, or prioritizing certain data syncs.
 *
 * @returns {Promise<string>} A promise that resolves when offline data is handled.
 */
export const handleOfflineDataSynchronization = () => {
  return new Promise((resolve) => {
    console.log('Handling offline data synchronization...');
    // Gun.js automatically queues writes when offline and syncs them when online.
    // This function could be used to:
    // 1. Display 'Offline Mode' UI.
    // 2. Prioritize certain data types for sync when online.
    // 3. Provide a manual 'Sync Now' button.
    // 4. Listen to browser 'online'/'offline' events.
    window.addEventListener('online', () => {
      console.log('Browser is online. Gun.js will automatically sync pending data.');
      displayMessage('app-status', 'Online. Syncing data...', false);
      resolve('Offline data synced.');
    });
    window.addEventListener('offline', () => {
      console.log('Browser is offline. Data will be queued.');
      displayMessage('app-status', 'Offline. Data will sync when online.', true);
      // No resolve here, as sync happens upon reconnection.
    });
    console.log('Offline/Online event listeners set up.');
    resolve('Offline data synchronization handler initialized.');
  });
};

// --- Function #39: setupGlobalDataListener(rootKey, callback) ---
/**
 * Sets up a real-time listener for changes on a broad, global database key.
 * This allows monitoring changes to collections or major data segments across the application.
 * The callback receives the updated data for that key.
 *
 * @param {string} rootKey - The top-level key to listen to (e.g., 'users', 'products').
 * @param {function(object|null): void} callback - The function to call with the updated data.
 * @returns {void}
 */
export const setupGlobalDataListener = (rootKey, callback) => {
  if (!rootKey || typeof rootKey !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for setupGlobalDataListener. Requires root key and a callback function.');
    return;
  }
  const gun = getGunInstance();
  if (!gun) {
    console.error('Gun.js instance not initialized. Cannot set up global listener.');
    return;
  }
  try {
    gun.get(rootKey).on((data, key) => {
      const { _, ...cleanData } = data || {};
      console.log(`Global data update for key '${rootKey}':`, cleanData);
      callback(cleanData);
    });
    console.log(`Listening for real-time updates on global key: '${rootKey}'`);
  } catch (error) {
    handleDatabaseError(error, 'setupGlobalDataListener');
  }
};

// --- Function #40: removeGlobalDataListener(rootKey) ---
/**
 * Removes a previously set real-time listener for a global database key.
 * This is important for cleanup and preventing unnecessary data processing.
 * Similar to `removeUserProfileListener`, requires the original callback reference for effective removal.
 *
 * @param {string} rootKey - The top-level key whose listener is to be removed.
 * @returns {void}
 */
export const removeGlobalDataListener = (rootKey) => {
  if (!rootKey || typeof rootKey !== 'string') {
    console.error('Invalid root key provided for removing global listener.');
    return;
  }
  const gun = getGunInstance();
  if (!gun) {
    console.error('Gun.js instance not initialized. Cannot remove global listener.');
    return;
  }
  try {
    // To effectively remove, you'd need the exact callback reference passed to .on().
    // For demonstration, we'll just log a warning.
    // gun.get(rootKey).off(callbackReference);
    console.warn(`Attempted to remove global listener for key '${rootKey}'. In a real app, pass the original callback reference to .off().`);
  } catch (error) {
    handleDatabaseError(error, 'removeGlobalDataListener');
  }
};

// --- Export core instances for other modules to use ---
// These are already exported individually at the top, but can be grouped here too.
// export { gunInstance, userInstance, usersRootNode, isUserLoggedIn, currentUserData };
