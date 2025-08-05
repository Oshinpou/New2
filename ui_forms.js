// ui_forms.js
// This script manages all user interactions with forms on the user.html page.
// It handles input collection, client-side validation, displaying messages,
// and orchestrating calls to the appropriate database functions.

// --- Imports from Database Scripts ---
// Import necessary database functions from db_core.js and db_features.js.
// These functions will be called by the form handlers to interact with the Gun.js database.
import {
  registerUser,
  loginUser,
  logoutUser,
  checkLoginStatus, // Used for updating UI after auth actions
  getCurrentUserPub, // Used for user-specific operations
} from './db_core.js'; // Adjust path as necessary

import {
  saveShippingAddress,
  recoverUsernameByEmail,
  recoverEmailByPhone,
  requestPasswordReset,
  recoverPhoneNumber, // Specifically requested
  recoverCountryCode, // Specifically requested
  changeUsernamePermanently,
  changeEmailPermanently,
  changePasswordPermanently,
  changePhoneNumberPermanently, // Specifically requested
  changeCountryCodePermanently, // Specifically requested
  confirmAccountDeletion,
  validateRecoveryInput, // Re-exporting for UI validation
  validateChangeCredentialInput, // Re-exporting for UI validation
  validateDeletionConfirmationCheckboxes, // Re-exporting for UI validation
} from './db_features.js'; // Adjust path as necessary

// --- Utility for displaying messages (can be imported from ui_display.js later) ---
// For now, included here for self-containment of this script's functionality.
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

// --- Global UI State (can be moved to app_main.js or ui_display.js) ---
let currentLoadingButton = null; // Tracks which button is currently showing a loading state

// --- Function #81: initFormListeners() ---
/**
 * Attaches event listeners to all interactive forms on the user.html page.
 * This is the primary entry point for setting up UI interactions.
 * It ensures that form submissions are handled by JavaScript, not default browser behavior.
 *
 * @returns {void}
 */
export const initFormListeners = () => {
  console.log('Initializing form listeners...');

  // Registration Form
  document.getElementById('registration').querySelector('form').addEventListener('submit', handleRegistrationFormSubmit);
  // Login Form
  document.getElementById('login').querySelector('form').addEventListener('submit', handleLoginFormSubmit);
  // Logout Button (within status-nav)
  document.querySelector('#status-nav .btn-danger').addEventListener('click', handleLogoutButtonClick);
  // Go Back Button (within status-nav)
  document.querySelector('#status-nav .btn-secondary').addEventListener('click', handleGoBackButtonClick);

  // Account Recovery Forms
  document.querySelector('#recovery-system .sub-section:nth-of-type(1) form').addEventListener('submit', handleRecoverEmailFormSubmit);
  document.querySelector('#recovery-system .sub-section:nth-of-type(2) form').addEventListener('submit', handleRecoverUsernameFormSubmit);
  document.querySelector('#recovery-system .sub-section:nth-of-type(3) form').addEventListener('submit', handleRecoverPasswordFormSubmit);
  document.querySelector('#recovery-system .sub-section:nth-of-type(4) form').addEventListener('submit', handleRecoverPhoneFormSubmit); // Phone Recovery
  document.querySelector('#recovery-system .sub-section:nth-of-type(5) form').addEventListener('submit', handleRecoverCountryCodeFormSubmit); // Country Code Recovery

  // Change Credentials Forms
  document.querySelector('#change-credentials .sub-section:nth-of-type(1) form').addEventListener('submit', handleChangeUsernameFormSubmit);
  document.querySelector('#change-credentials .sub-section:nth-of-type(2) form').addEventListener('submit', handleChangeEmailFormSubmit);
  document.querySelector('#change-credentials .sub-section:nth-of-type(3) form').addEventListener('submit', handleChangePasswordFormSubmit);
  document.querySelector('#change-credentials .sub-section:nth-of-type(4) form').addEventListener('submit', handleChangePhoneFormSubmit); // Change Phone
  document.querySelector('#change-credentials .sub-section:nth-of-type(5) form').addEventListener('submit', handleChangeCountryCodeFormSubmit); // Change Country Code

  // Delete Account Form
  document.getElementById('delete-account').querySelector('form').addEventListener('submit', handleDeleteAccountFormSubmit);

  // Shipping Address Form
  document.querySelector('#account-data .sub-section:nth-of-type(1) form').addEventListener('submit', handleShippingAddressFormSubmit);

  // Add more specific listeners for dynamically created elements or other interactions as needed
  console.log('All primary form listeners attached.');
};

// --- Function #82: handleRegistrationFormSubmit(event) ---
/**
 * Captures and processes the registration form submission.
 * Performs client-side validation, shows loading state, calls the database function,
 * and provides user feedback.
 *
 * @param {Event} event - The DOM event object from the form submission.
 * @returns {void}
 */
export const handleRegistrationFormSubmit = async (event) => {
  event.preventDefault(); // Prevent default form submission and page reload

  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElementId = 'reg-message';

  resetAllFormErrors(form.id); // Clear previous errors

  // 1. Client-side Validation
  if (!clientSideValidateRegistration(formData)) {
    displayMessage(messageElementId, 'Please fill in all required fields correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton); // Show loading feedback
  displayMessage(messageElementId, 'Registering user...', false);

  try {
    // 2. Call Database Function
    await registerUser(formData);
    displayMessage(messageElementId, 'Registration successful! You can now log in.', false);
    clearFormInputs(form.id); // Clear form on success
    await checkLoginStatus(); // Update global login status and UI
  } catch (error) {
    displayMessage(messageElementId, `Registration failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRegistrationFormSubmit'); // Centralized error logging
  } finally {
    hideLoadingSpinner(submitButton, 'Register'); // Hide loading feedback
  }
};

// --- Function #83: handleLoginFormSubmit(event) ---
/**
 * Captures and processes the login form submission.
 * Performs client-side validation, shows loading state, calls the database function,
 * and provides user feedback.
 *
 * @param {Event} event - The DOM event object from the form submission.
 * @returns {void}
 */
export const handleLoginFormSubmit = async (event) => {
  event.preventDefault(); // Prevent default form submission and page reload

  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElementId = 'login-message';

  resetAllFormErrors(form.id); // Clear previous errors

  // 1. Client-side Validation
  if (!clientSideValidateLogin(formData)) {
    displayMessage(messageElementId, 'Please enter your username and password.', true);
    return;
  }

  showLoadingSpinner(submitButton); // Show loading feedback
  displayMessage(messageElementId, 'Logging in...', false);

  try {
    // 2. Call Database Function
    await loginUser(formData);
    displayMessage(messageElementId, 'Login successful!', false);
    clearFormInputs(form.id); // Clear form on success
    await checkLoginStatus(); // Update global login status and UI
    // In a full app, you'd now redirect or show account data sections
  } catch (error) {
    displayMessage(messageElementId, `Login failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleLoginFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Login'); // Hide loading feedback
  }
};

// --- Function #84: handleRecoverEmailFormSubmit(event) ---
/**
 * Processes the email recovery form submission.
 * Validates input and calls the `recoverEmailByPhone` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleRecoverEmailFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateRecoveryInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all details for email recovery.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Attempting email recovery...', false);

  try {
    // Call db_features.js function
    const recoveredEmail = await recoverEmailByPhone(formData.phone, formData.password, formData.username);
    displayMessage(messageElement.id, `Your email is: ${recoveredEmail}`, false);
  } catch (error) {
    displayMessage(messageElement.id, `Email recovery failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRecoverEmailFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Recover Email');
  }
};

// --- Function #85: handleRecoverUsernameFormSubmit(event) ---
/**
 * Processes the username recovery form submission.
 * Validates input and calls the `recoverUsernameByEmail` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleRecoverUsernameFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateRecoveryInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all details for username recovery.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Attempting username recovery...', false);

  try {
    // Call db_features.js function
    const recoveredUsername = await recoverUsernameByEmail(formData.email, formData.phone, formData.password);
    displayMessage(messageElement.id, `Your username is: ${recoveredUsername}`, false);
  } catch (error) {
    displayMessage(messageElement.id, `Username recovery failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRecoverUsernameFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Recover Username');
  }
};

// --- Function #86: handleRecoverPasswordFormSubmit(event) ---
/**
 * Processes the password recovery form submission.
 * Validates input and calls the `requestPasswordReset` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleRecoverPasswordFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateRecoveryInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all details for password reset.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Initiating password reset...', false);

  try {
    // Call db_features.js function
    await requestPasswordReset(formData.username, formData.email, formData.phone);
    displayMessage(messageElement.id, 'Password reset link sent to your registered email/phone (simulated).', false);
  } catch (error) {
    displayMessage(messageElement.id, `Password reset failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRecoverPasswordFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Recover Password');
  }
};

// --- Function #87: handleRecoverPhoneFormSubmit(event) ---
/**
 * Processes the phone number recovery form submission.
 * Validates input and calls the `recoverPhoneNumber` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleRecoverPhoneFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateRecoveryInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all details for phone number recovery.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Attempting phone number recovery...', false);

  try {
    const recoveredPhone = await recoverPhoneNumber(formData.username, formData.email, formData.password);
    displayMessage(messageElement.id, `Your registered phone number is: ${recoveredPhone}`, false);
  } catch (error) {
    displayMessage(messageElement.id, `Phone number recovery failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRecoverPhoneFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Recover Phone Number');
  }
};

// --- Function #88: handleRecoverCountryCodeFormSubmit(event) ---
/**
 * Processes the country code recovery form submission.
 * Validates input and calls the `recoverCountryCode` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleRecoverCountryCodeFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateRecoveryInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all details for country code recovery.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Attempting country code recovery...', false);

  try {
    const recoveredCC = await recoverCountryCode(formData.username, formData.email, formData.password);
    displayMessage(messageElement.id, `Your registered country code is: ${recoveredCC}`, false);
  } catch (error) {
    displayMessage(messageElement.id, `Country code recovery failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleRecoverCountryCodeFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Recover Country Code');
  }
};

// --- Function #89: handleChangeUsernameFormSubmit(event) ---
/**
 * Processes the change username form submission.
 * Validates input and calls the `changeUsernamePermanently` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleChangeUsernameFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateChangeCredentialInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all current and new details correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Changing username...', false);

  try {
    const oldData = {
      current_username: formData.current_username,
      current_password: formData.current_password,
      current_email: formData.current_email,
      current_phone: formData.current_phone,
      current_cc: formData.current_cc
    };
    await changeUsernamePermanently(oldData, formData.new_username);
    displayMessage(messageElement.id, 'Username changed successfully.', false);
    clearFormInputs(form.id);
  } catch (error) {
    displayMessage(messageElement.id, `Failed to change username: ${error.message}`, true);
    handleApplicationWideError(error, 'handleChangeUsernameFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Change Username');
  }
};

// --- Function #90: handleChangeEmailFormSubmit(event) ---
/**
 * Processes the change email form submission.
 * Validates input and calls the `changeEmailPermanently` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleChangeEmailFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateChangeCredentialInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all current and new details correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Changing email...', false);

  try {
    const oldData = {
      current_username: formData.current_username,
      current_password: formData.current_password,
      current_email: formData.current_email,
      current_phone: formData.current_phone,
      current_cc: formData.current_cc
    };
    await changeEmailPermanently(oldData, formData.new_email);
    displayMessage(messageElement.id, 'Email changed successfully.', false);
    clearFormInputs(form.id);
  } catch (error) {
    displayMessage(messageElement.id, `Failed to change email: ${error.message}`, true);
    handleApplicationWideError(error, 'handleChangeEmailFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Change Email');
  }
};

// --- Function #91: handleChangePasswordFormSubmit(event) ---
/**
 * Processes the change password form submission.
 * Validates input and calls the `changePasswordPermanently` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleChangePasswordFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateChangeCredentialInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all current and new details correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Changing password...', false);

  try {
    const oldData = {
      current_username: formData.current_username,
      current_password: formData.current_password,
      current_email: formData.current_email,
      current_phone: formData.current_phone,
      current_cc: formData.current_cc
    };
    await changePasswordPermanently(oldData, formData.new_password);
    displayMessage(messageElement.id, 'Password changed successfully.', false);
    clearFormInputs(form.id);
  } catch (error) {
    displayMessage(messageElement.id, `Failed to change password: ${error.message}`, true);
    handleApplicationWideError(error, 'handleChangePasswordFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Change Password');
  }
};

// --- Function #92: handleChangePhoneFormSubmit(event) ---
/**
 * Processes the change phone number form submission.
 * Validates input and calls the `changePhoneNumberPermanently` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleChangePhoneFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateChangeCredentialInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all current and new details correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Changing phone number...', false);

  try {
    const oldData = {
      current_username: formData.current_username,
      current_password: formData.current_password,
      current_email: formData.current_email,
      current_phone: formData.current_phone,
      current_cc: formData.current_cc
    };
    await changePhoneNumberPermanently(oldData, formData.new_phone);
    displayMessage(messageElement.id, 'Phone number changed successfully.', false);
    clearFormInputs(form.id);
  } catch (error) {
    displayMessage(messageElement.id, `Failed to change phone number: ${error.message}`, true);
    handleApplicationWideError(error, 'handleChangePhoneFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Change Phone Number');
  }
};

// --- Function #93: handleChangeCountryCodeFormSubmit(event) ---
/**
 * Processes the change country code form submission.
 * Validates input and calls the `changeCountryCodePermanently` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleChangeCountryCodeFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);
  if (!validateChangeCredentialInput(formData)) {
    displayMessage(messageElement.id, 'Please fill in all current and new details correctly.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Changing country code...', false);

  try {
    const oldData = {
      current_username: formData.current_username,
      current_password: formData.current_password,
      current_email: formData.current_email,
      current_phone: formData.current_phone,
      current_cc: formData.current_cc
    };
    await changeCountryCodePermanently(oldData, formData.new_cc);
    displayMessage(messageElement.id, 'Country code changed successfully.', false);
    clearFormInputs(form.id);
  } catch (error) {
    displayMessage(messageElement.id, `Failed to change country code: ${error.message}`, true);
    handleApplicationWideError(error, 'handleChangeCountryCodeFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Change Country Code');
  }
};

// --- Function #94: handleDeleteAccountFormSubmit(event) ---
/**
 * Processes the account deletion form submission.
 * Validates confirmations and calls the `confirmAccountDeletion` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleDeleteAccountFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = form.querySelector('.message-output');

  resetAllFormErrors(form.id);

  // Collect checkbox states
  const checkboxStates = {
    'confirm-data-deletion': form.querySelector('input[type="checkbox"]:nth-of-type(1)').checked,
    'confirm-irreversible': form.querySelector('input[type="checkbox"]:nth-of-type(2)').checked,
    'confirm-proceed': form.querySelector('input[type="checkbox"]:nth-of-type(3)').checked,
  };

  if (!validateDeletionConfirmationCheckboxes(checkboxStates)) {
    displayMessage(messageElement.id, 'Please check all confirmation boxes to proceed with deletion.', true);
    return;
  }
  // Add validation for current credentials as well
  if (!validateChangeCredentialInput(formData)) { // Reusing validation for current credentials
    displayMessage(messageElement.id, 'Please enter your current credentials to confirm deletion.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElement.id, 'Initiating account deletion...', false);

  try {
    const userPub = getCurrentUserPub(); // Get the public key of the currently logged-in user
    if (!userPub) {
      throw new Error('No user logged in to delete.');
    }
    // Verify current credentials before proceeding with deletion
    const currentCredentials = {
      current_username: formData.del_username,
      current_password: formData.del_password,
      current_email: formData.del_email,
      current_phone: formData.del_phone,
      current_cc: formData.del_cc
    };
    // This calls the helper from db_features that verifies credentials using SEA auth and profile check
    await verifyCurrentCredentialsForChangePublic(
      currentCredentials.current_username,
      currentCredentials.current_password,
      currentCredentials.current_email,
      currentCredentials.current_phone,
      currentCredentials.current_cc
    );

    await confirmAccountDeletion(userPub, { confirmed: true });
    displayMessage(messageElement.id, 'Account deleted permanently. You are now logged out.', false);
    clearFormInputs(form.id);
    await checkLoginStatus(); // Update UI to reflect logout
  } catch (error) {
    displayMessage(messageElement.id, `Account deletion failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleDeleteAccountFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Delete Account Permanently');
  }
};

// --- Function #95: handleShippingAddressFormSubmit(event) ---
/**
 * Processes the shipping address form submission.
 * Validates input and calls the `saveShippingAddress` or `updateShippingAddress` database function.
 *
 * @param {Event} event - The DOM event object.
 * @returns {void}
 */
export const handleShippingAddressFormSubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const formData = getFormDataById(form.id);
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElementId = 'saved-shipping-output'; // This element is used for display, not just messages

  resetAllFormErrors(form.id);
  if (!validateShippingInput(formData)) { // Assuming a validateShippingInput exists
    displayMessage(messageElementId, 'Please fill in all required shipping details.', true);
    return;
  }

  showLoadingSpinner(submitButton);
  displayMessage(messageElementId, 'Saving shipping details...', false);

  try {
    const userPub = getCurrentUserPub();
    if (!userPub) { throw new Error('User not logged in. Cannot save shipping address.'); }

    // Determine if it's an update or new save (e.g., by checking if an ID exists in formData)
    const addressId = formData.id || null; // Assume form might have a hidden ID field for existing address
    if (addressId) {
      await saveShippingAddress(userPub, formData); // saveShippingAddress can handle both new and update if ID is provided
    } else {
      await saveShippingAddress(userPub, formData);
    }

    displayMessage(messageElementId, 'Shipping details saved successfully.', false);
    // You'd typically re-render the saved shipping details section here
    // e.g., loadShippingAddresses(userPub).then(renderShippingDetails);
  } catch (error) {
    displayMessage(messageElementId, `Failed to save shipping details: ${error.message}`, true);
    handleApplicationWideError(error, 'handleShippingAddressFormSubmit');
  } finally {
    hideLoadingSpinner(submitButton, 'Save or Update Shipping Details');
  }
};

// --- Function #96: getFormDataById(formId) ---
/**
 * Extracts all input values from a specified form and returns them as an object.
 * Handles various input types including text, email, tel, password, number.
 *
 * @param {string} formId - The ID of the HTML form element.
 * @returns {object} An object where keys are input names and values are input values.
 */
export const getFormDataById = (formId) => {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID '${formId}' not found.`);
    return {};
  }
  const formData = {};
  const inputs = form.querySelectorAll('input[name]');
  inputs.forEach(input => {
    formData[input.name] = input.value.trim();
  });
  console.log(`Form data extracted from '${formId}':`, formData);
  return formData;
};

// --- Function #97: clearFormInputs(formId) ---
/**
 * Resets all input fields within a specified form.
 *
 * @param {string} formId - The ID of the HTML form element.
 * @returns {void}
 */
export const clearFormInputs = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    form.reset(); // Native form reset method
    console.log(`Form inputs cleared for '${formId}'.`);
  } else {
    console.warn(`Form with ID '${formId}' not found for clearing inputs.`);
  }
};

// --- Function #98: showLoadingSpinner(buttonElement) ---
/**
 * Displays a loading spinner on a button during asynchronous operations.
 * Disables the button and stores its original text to restore later.
 *
 * @param {HTMLButtonElement} buttonElement - The button element to modify.
 * @returns {void}
 */
export const showLoadingSpinner = (buttonElement) => {
  if (!buttonElement) return;
  currentLoadingButton = buttonElement; // Store reference to the button
  buttonElement.dataset.originalText = buttonElement.textContent; // Save original text
  buttonElement.textContent = 'Loading...'; // Change text
  buttonElement.disabled = true; // Disable button
  buttonElement.style.pointerEvents = 'none'; // Prevent further clicks
  // Add a simple spinner (e.g., a CSS class with an animation)
  buttonElement.classList.add('loading-spinner');
  console.log(`Loading spinner shown for button: ${buttonElement.dataset.originalText}`);
};

// --- Function #99: hideLoadingSpinner(buttonElement, originalText) ---
/**
 * Hides the loading spinner and restores the button's original state.
 *
 * @param {HTMLButtonElement} buttonElement - The button element to modify.
 * @param {string} originalText - The original text of the button.
 * @returns {void}
 */
export const hideLoadingSpinner = (buttonElement, originalText) => {
  if (!buttonElement) return;
  buttonElement.textContent = buttonElement.dataset.originalText || originalText; // Restore text
  buttonElement.disabled = false; // Enable button
  buttonElement.style.pointerEvents = 'auto'; // Re-enable clicks
  buttonElement.classList.remove('loading-spinner'); // Remove spinner class
  currentLoadingButton = null; // Clear reference
  console.log(`Loading spinner hidden for button: ${originalText}`);
};

// --- Function #100: clientSideValidateRegistration(data) ---
/**
 * Performs front-end validation for registration inputs.
 * This is a basic example; comprehensive validation would be more detailed.
 *
 * @param {object} data - The registration form data.
 * @returns {boolean} True if all basic fields are present and meet minimal criteria, false otherwise.
 */
export const clientSideValidateRegistration = (data) => {
  let isValid = true;
  if (!data.username || data.username.length < 3) {
    displayFormSpecificError('reg-username', 'Username must be at least 3 characters.'); isValid = false;
  }
  if (!data.email || !data.email.includes('@')) {
    displayFormSpecificError('reg-email', 'Please enter a valid email address.'); isValid = false;
  }
  if (!data.password || data.password.length < 8) {
    displayFormSpecificError('reg-password', 'Password must be at least 8 characters.'); isValid = false;
  }
  if (!data.phone || data.phone.length < 7) {
    displayFormSpecificError('reg-phone', 'Phone number must be at least 7 digits.'); isValid = false;
  }
  if (!data.country_code || data.country_code.length < 1) {
    displayFormSpecificError('reg-country-code', 'Country code is required.'); isValid = false;
  }
  console.log('Client-side registration validation result:', isValid);
  return isValid;
};

// --- Function #101: clientSideValidateLogin(data) ---
/**
 * Performs front-end validation for login inputs.
 *
 * @param {object} data - The login form data.
 * @returns {boolean} True if username and password are provided.
 */
export const clientSideValidateLogin = (data) => {
  let isValid = true;
  if (!data.username || data.username.length === 0) {
    displayFormSpecificError('login-username', 'Username is required.'); isValid = false;
  }
  if (!data.password || data.password.length === 0) {
    displayFormSpecificError('login-password', 'Password is required.'); isValid = false;
  }
  console.log('Client-side login validation result:', isValid);
  return isValid;
};

// --- Function #102: clientSideValidateRecoveryInput(data) ---
/**
 * Validates inputs for all recovery forms.
 * This function uses the imported `validateRecoveryInput` from `db_features.js`.
 *
 * @param {object} data - The data object from a recovery form.
 * @returns {boolean} True if input is valid, false otherwise.
 */
export const clientSideValidateRecoveryInput = (data) => {
  const isValid = validateRecoveryInput(data); // Re-using DB layer validation
  if (!isValid) {
    // Potentially add more specific UI feedback here based on validation failure reason
    console.error('Client-side recovery input validation failed.');
  }
  return isValid;
};

// --- Function #103: clientSideValidateChangeCredentialsInput(data) ---
/**
 * Validates inputs for all credential change forms.
 * This function uses the imported `validateChangeCredentialInput` from `db_features.js`.
 *
 * @param {object} data - The data object from a credential change form.
 * @returns {boolean} True if input is valid, false otherwise.
 */
export const clientSideValidateChangeCredentialsInput = (data) => {
  const isValid = validateChangeCredentialInput(data); // Re-using DB layer validation
  if (!isValid) {
    console.error('Client-side change credential input validation failed.');
  }
  return isValid;
};

// --- Function #104: clientSideValidateShippingInput(data) ---
/**
 * Validates inputs for the shipping address form.
 *
 * @param {object} data - The shipping address form data.
 * @returns {boolean} True if input is valid, false otherwise.
 */
export const clientSideValidateShippingInput = (data) => {
  let isValid = true;
  if (!data.recipient_name || data.recipient_name.length < 3) {
    displayFormSpecificError('ship-name', 'Recipient name is required.'); isValid = false;
  }
  if (!data.location || data.location.length < 5) {
    displayFormSpecificError('ship-location', 'Location is required.'); isValid = false;
  }
  if (!data.city || data.city.length < 2) {
    displayFormSpecificError('ship-city', 'City is required.'); isValid = false;
  }
  if (!data.pincode || data.pincode.length < 4) {
    displayFormSpecificError('ship-pincode', 'Pincode is required.'); isValid = false;
  }
  // Add more specific validations as needed
  console.log('Client-side shipping input validation result:', isValid);
  return isValid;
};

// --- Function #105: displayFormSpecificError(elementId, message) ---
/**
 * Shows an error message next to a specific form input or a dedicated error span.
 *
 * @param {string} elementId - The ID of the input field or a specific error message span.
 * @param {string} message - The error message to display.
 * @returns {void}
 */
export const displayFormSpecificError = (elementId, message) => {
  const inputElement = document.getElementById(elementId);
  if (inputElement) {
    // Create a small error span if it doesn't exist
    let errorSpan = inputElement.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains('form-error-message')) {
      errorSpan = document.createElement('span');
      errorSpan.classList.add('form-error-message');
      errorSpan.style.color = 'var(--danger-color)';
      errorSpan.style.fontSize = '0.85em';
      errorSpan.style.display = 'block';
      errorSpan.style.marginTop = '-15px';
      errorSpan.style.marginBottom = '10px';
      inputElement.parentNode.insertBefore(errorSpan, inputElement.nextSibling);
    }
    errorSpan.textContent = message;
    inputElement.classList.add('input-error-state'); // Add a class for error styling
  } else {
    console.warn(`Could not find element '${elementId}' to display form error.`);
  }
};

// --- Function #106: resetAllFormErrors(formId) ---
/**
 * Clears all error messages and error styling associated with a form.
 *
 * @param {string} formId - The ID of the HTML form element.
 * @returns {void}
 */
export const resetAllFormErrors = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    const errorSpans = form.querySelectorAll('.form-error-message');
    errorSpans.forEach(span => span.remove()); // Remove all error spans
    const errorInputs = form.querySelectorAll('.input-error-state');
    errorInputs.forEach(input => input.classList.remove('input-error-state')); // Remove error styling
    console.log(`All form errors reset for '${formId}'.`);
  }
};

// --- Function #107: disableFormInputs(formId) ---
/**
 * Disables all input fields and buttons within a specified form.
 * Useful during form submission to prevent multiple submissions.
 *
 * @param {string} formId - The ID of the HTML form element.
 * @returns {void}
 */
export const disableFormInputs = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    form.querySelectorAll('input, button').forEach(element => {
      element.disabled = true;
    });
    console.log(`All inputs disabled for form '${formId}'.`);
  }
};

// --- Function #108: enableFormInputs(formId) ---
/**
 * Re-enables all input fields and buttons within a specified form.
 *
 * @param {string} formId - The ID of the HTML form element.
 * @returns {void}
 */
export const enableFormInputs = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    form.querySelectorAll('input, button').forEach(element => {
      element.disabled = false;
    });
    console.log(`All inputs enabled for form '${formId}'.`);
  }
};

// --- Function #109: showCustomConfirmationModal(message, onConfirmCallback) ---
/**
 * Displays a custom, non-blocking confirmation dialog to the user.
 * This replaces browser's native `confirm()` for better UI control.
 *
 * @param {string} message - The message to display in the modal.
 * @param {function(): void} onConfirmCallback - Callback function to execute if user confirms.
 * @returns {void}
 */
export const showCustomConfirmationModal = (message, onConfirmCallback) => {
  // TODO: Implement a custom modal HTML structure in user.html or dynamically create it.
  // This is a stub for the UI logic.
  console.log(`Custom Confirmation Modal Shown: "${message}"`);
  // For now, simulate confirmation
  if (window.confirm(message)) { // Using native for immediate testing, replace with custom UI
    onConfirmCallback();
  }
};

// --- Function #110: hideCustomConfirmationModal() ---
/**
 * Hides the currently displayed custom confirmation modal.
 *
 * @returns {void}
 */
export const hideCustomConfirmationModal = () => {
  // TODO: Implement logic to hide the custom modal HTML structure.
  console.log('Custom Confirmation Modal Hidden.');
};

// --- Function #111: populateChangeFormsWithCurrentData(userData) ---
/**
 * Pre-fills current user data into the credential change forms.
 * This enhances user experience by showing their existing details.
 *
 * @param {object} userData - The current user's profile data.
 * @returns {void}
 */
export const populateChangeFormsWithCurrentData = (userData) => {
  if (!userData) {
    console.warn('No user data provided to populate change forms.');
    return;
  }
  // Example for username change form:
  const usernameChangeForm = document.querySelector('#change-credentials .sub-section:nth-of-type(1) form');
  if (usernameChangeForm) {
    usernameChangeForm.querySelector('input[name="current_username"]').value = userData.username || '';
    usernameChangeForm.querySelector('input[name="current_email"]').value = userData.email || '';
    usernameChangeForm.querySelector('input[name="current_phone"]').value = userData.phone || '';
    usernameChangeForm.querySelector('input[name="current_cc"]').value = userData.countryCode || '';
  }
  // Repeat for email, password, phone, country code change forms
  console.log('Change forms populated with current user data.');
};

// --- Function #112: populateRecoveryFormsWithHints(userData) ---
/**
 * Provides hints or pre-fills for recovery forms based on partial user data (if available).
 *
 * @param {object} userData - Partial user data for hints.
 * @returns {void}
 */
export const populateRecoveryFormsWithHints = (userData) => {
  if (!userData) {
    console.warn('No user data provided to populate recovery forms.');
    return;
  }
  // Example: if a user is partially identified, pre-fill some fields
  const emailRecoveryForm = document.querySelector('#recovery-system .sub-section:nth-of-type(1) form');
  if (emailRecoveryForm && userData.username) {
    emailRecoveryForm.querySelector('input[name="username"]').value = userData.username;
  }
  console.log('Recovery forms populated with hints.');
};

// --- Function #113: updateInputValidationState(elementId, isValid) ---
/**
 * Applies visual feedback (e.g., green/red border) to an input field based on its validation state.
 *
 * @param {string} elementId - The ID of the input element.
 * @param {boolean} isValid - True if the input is valid, false otherwise.
 * @returns {void}
 */
export const updateInputValidationState = (elementId, isValid) => {
  const input = document.getElementById(elementId);
  if (input) {
    input.classList.remove('input-valid-state', 'input-error-state');
    if (isValid) {
      input.classList.add('input-valid-state');
    } else {
      input.classList.add('input-error-state');
    }
  }
};

// --- Function #114: handleDeletionCheckboxConfirmation(checkboxId) ---
/**
 * Manages the state and validation of deletion confirmation checkboxes.
 *
 * @param {string} checkboxId - The ID of the checkbox.
 * @returns {boolean} The current checked state of the checkbox.
 */
export const handleDeletionCheckboxConfirmation = (checkboxId) => {
  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    console.log(`Checkbox '${checkboxId}' is now: ${checkbox.checked}`);
    return checkbox.checked;
  }
  return false;
};

// --- Function #115: togglePasswordInputVisibility(inputElementId) ---
/**
 * Adds a toggle button/icon for password field visibility.
 *
 * @param {string} inputElementId - The ID of the password input field.
 * @returns {void}
 */
export const togglePasswordInputVisibility = (inputElementId) => {
  const passwordInput = document.getElementById(inputElementId);
  if (passwordInput && passwordInput.type === 'password') {
    passwordInput.type = 'text';
    console.log(`Password input '${inputElementId}' is now visible.`);
  } else if (passwordInput) {
    passwordInput.type = 'password';
    console.log(`Password input '${inputElementId}' is now hidden.`);
  }
};

// --- Function #116: copyRecoveredTextToClipboard(text) ---
/**
 * Copies recovered data (e.g., username) to the clipboard.
 * Uses `document.execCommand('copy')` for broader iframe compatibility.
 *
 * @param {string} text - The text to copy.
 * @returns {Promise<boolean>} Resolves true on success, false on failure.
 */
export const copyRecoveredTextToClipboard = (text) => {
  return new Promise((resolve) => {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Text copied to clipboard:', text);
        resolve(true);
      } else {
        console.warn('Failed to copy text to clipboard.');
        resolve(false);
      }
    } catch (err) {
      console.error('Error copying text to clipboard:', err);
      resolve(false);
    } finally {
      document.body.removeChild(tempInput);
    }
  });
};

// --- Function #117: scrollToHtmlSection(sectionId) ---
/**
 * Smoothly scrolls the viewport to a specified HTML section.
 *
 * @param {string} sectionId - The ID of the section to scroll to.
 * @returns {void}
 */
export const scrollToHtmlSection = (sectionId) => {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log(`Scrolled to section: ${sectionId}`);
  } else {
    console.warn(`Section with ID '${sectionId}' not found for scrolling.`);
  }
};

// --- Function #118: addRealtimeInputValidationListeners(formId) ---
/**
 * Attaches event listeners for live input validation (e.g., on 'input' or 'blur' events).
 * Provides immediate feedback to the user as they type.
 *
 * @param {string} formId - The ID of the form to apply listeners to.
 * @returns {void}
 */
export const addRealtimeInputValidationListeners = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        // Example: Basic validation for non-empty
        const isValid = input.value.trim().length > 0;
        updateInputValidationState(input.id, isValid);
        // More complex validation would call specific clientSideValidate functions
      });
    });
    console.log(`Real-time input validation listeners added to form: ${formId}`);
  }
};

// --- Function #119: removeRealtimeInputValidationListeners(formId) ---
/**
 * Removes previously set real-time input validation listeners from a form.
 *
 * @param {string} formId - The ID of the form to remove listeners from.
 * @returns {void}
 */
export const removeRealtimeInputValidationListeners = (formId) => {
  const form = document.getElementById(formId);
  if (form) {
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      // Note: To truly remove, you need the exact function reference passed to addEventListener.
      // This is a conceptual stub.
      input.removeEventListener('input', () => {}); // This won't work without reference
    });
    console.warn(`Real-time input validation listeners removed from form: ${formId} (conceptual).`);
  }
};

// --- Function #120: handleEnterKeyFormSubmission(formId, submitButtonId) ---
/**
 * Allows form submission by pressing the Enter key when an input field is focused within the form.
 * Triggers a click event on the specified submit button.
 *
 * @param {string} formId - The ID of the form.
 * @param {string} submitButtonId - The ID of the form's submit button.
 * @returns {void}
 */
export const handleEnterKeyFormSubmission = (formId, submitButtonId) => {
  const form = document.getElementById(formId);
  const submitButton = document.getElementById(submitButtonId);
  if (form && submitButton) {
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default browser behavior (e.g., submitting empty forms)
        submitButton.click(); // Programmatically click the submit button
        console.log(`Enter key pressed in form '${formId}', triggering submit button.`);
      }
    });
  } else {
    console.warn(`Could not set up Enter key submission for form '${formId}'.`);
  }
};

// --- Event Handlers for Navigation/Logout (can be moved to app_main.js) ---
const handleLogoutButtonClick = async () => {
  console.log('Logout button clicked.');
  try {
    await logoutUser();
    displayMessage('login-status-placeholder', 'Not Logged In', true); // Update status
    // Potentially hide account sections and show login/reg sections here (via ui_display)
  } catch (error) {
    displayMessage('login-status-placeholder', `Logout failed: ${error.message}`, true);
    handleApplicationWideError(error, 'handleLogoutButtonClick');
  }
};

const handleGoBackButtonClick = () => {
  console.log('Go Back button clicked. Navigating back.');
  window.history.back(); // Use native browser history for navigation
};

// --- Global Error Handler (to be imported from app_main.js) ---
// For now, a simple placeholder. In a real app, this would be a robust, centralized function.
function handleApplicationWideError(error, context) {
  console.error(`Application Error in ${context}:`, error.message, error.stack);
  // displayMessage('global-app-message', `An application error occurred: ${error.message}`, true);
}

// --- Placeholder for validateShippingInput (defined in db_features.js but needed here for client-side validation) ---
// This is a placeholder for the actual function which would be imported from db_features.js
// For client-side use, you might have a simpler version or import it directly.
function validateShippingInput(data) {
  let isValid = true;
  if (!data.recipient_name || data.recipient_name.length < 3) isValid = false;
  if (!data.location || data.location.length < 5) isValid = false;
  if (!data.city || data.city.length < 2) isValid = false;
  if (!data.pincode || data.pincode.length < 4) isValid = false;
  if (!data.shipping_email || !data.shipping_email.includes('@')) isValid = false;
  if (!data.shipping_phone || data.shipping_phone.length < 7) isValid = false;
  return isValid;
}
