// ui_display.js
// This script is responsible for dynamically updating the UI to display user data,
// login status, orders, and saved products. It also manages real-time updates
// from the database listeners, ensuring the displayed information is always current.

// --- Imports from Database Scripts ---
// Import necessary data loading and listening functions from db_core.js and db_features.js.
import {
  isUserLoggedIn, // Global state variable
  currentUserData, // Global state variable
  checkLoginStatus, // To trigger a UI update after auth changes
  listenToUserProfile,
  removeUserProfileListener
} from './db_core.js'; // Adjust path as necessary

import {
  loadShippingAddresses,
  listenToShippingAddresses,
  loadOrders,
  listenToOrders,
  loadSavedProducts,
  listenToSavedProducts,
  removeShippingAddress, // For dynamic button actions
  deleteOrderFromHistory, // For dynamic button actions
  removeSavedProduct, // For dynamic button actions
  moveSavedProductToCart // For dynamic button actions
} from './db_features.js'; // Adjust path as necessary

// --- Utility for displaying messages (can be imported from app_main.js later) ---
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

// --- Function #121: updateLoginStatusDisplay(isLoggedInStatus, username) ---
/**
 * Dynamically updates the login status text and color on the page.
 * This function ensures the user always sees their current authentication state.
 *
 * @param {boolean} isLoggedInStatus - True if the user is logged in, false otherwise.
 * @param {string|null} username - The username of the logged-in user, or null if not logged in.
 * @returns {void}
 */
export const updateLoginStatusDisplay = (isLoggedInStatus, username = null) => {
  const statusTextElement = document.getElementById('login-status-placeholder');
  if (!statusTextElement) {
    console.warn('Login status placeholder element not found.');
    return;
  }

  if (isLoggedInStatus) {
    statusTextElement.textContent = `Logged in as: ${username || 'Unknown User'}`;
    statusTextElement.style.color = '#28a745'; // Green for logged in
    showLoggedInAccountSections(); // Show user-specific sections
  } else {
    statusTextElement.textContent = 'Not Logged In';
    statusTextElement.style.color = '#dc3545'; // Red for not logged in
    hideLoggedInAccountSections(); // Hide user-specific sections
  }
  console.log(`Login status display updated: ${isLoggedInStatus ? 'Logged In' : 'Logged Out'}`);
};

// --- Function #122: showLoggedInAccountSections() ---
/**
 * Makes account-specific sections visible upon successful login.
 * These sections typically include profile data, orders, saved items, and settings.
 *
 * @returns {void}
 */
export const showLoggedInAccountSections = () => {
  const sectionsToShow = [
    'account-data',
    'change-credentials',
    'delete-account'
  ];
  sectionsToShow.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'block'; // Or 'flex', 'grid' depending on layout
      console.log(`Section '${id}' shown.`);
    }
  });
  // Hide login/registration forms
  const sectionsToHide = ['login', 'registration'];
  sectionsToHide.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
      console.log(`Section '${id}' hidden.`);
    }
  });
  displayAccountDataNote(false); // Hide the static note
  console.log('All logged-in specific sections are now visible.');
};

// --- Function #123: hideLoggedInAccountSections() ---
/**
 * Hides account-specific sections upon logout or initial page load (if not logged in).
 * Shows login/registration forms.
 *
 * @returns {void}
 */
export const hideLoggedInAccountSections = () => {
  const sectionsToHide = [
    'account-data',
    'change-credentials',
    'delete-account'
  ];
  sectionsToHide.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
      console.log(`Section '${id}' hidden.`);
    }
  });
  // Show login/registration forms
  const sectionsToShow = ['login', 'registration'];
  sectionsToShow.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'block'; // Or 'flex', 'grid'
      console.log(`Section '${id}' shown.`);
    }
  });
  displayAccountDataNote(true); // Show the static note
  console.log('All logged-in specific sections are now hidden.');
};

// --- Function #124: renderSavedShippingDetails(addressData) ---
/**
 * Populates and displays the user's saved shipping address in the designated UI area.
 * This function takes a single address object and formats it for display.
 *
 * @param {object|null} addressData - The shipping address object to display, or null to clear.
 * @returns {void}
 */
export const renderSavedShippingDetails = (addressData) => {
  const outputElement = document.getElementById('saved-shipping-output');
  if (!outputElement) {
    console.warn('Saved shipping output element not found.');
    return;
  }

  if (addressData) {
    outputElement.innerHTML = `
      <strong>${addressData.recipientName || 'N/A'}</strong><br>
      ${addressData.apartment || ''}, ${addressData.location || 'N/A'}<br>
      ${addressData.area || ''}, ${addressData.city || 'N/A'}, ${addressData.state || 'N/A'}, ${addressData.pincode || 'N/A'}<br>
      ${addressData.country || 'N/A'}<br>
      Contact: ${addressData.countryCode || ''} ${addressData.shipping_phone || 'N/A'}
    `;
    console.log('Shipping details rendered:', addressData);
  } else {
    outputElement.innerHTML = 'No shipping address saved yet.';
    console.log('Shipping details cleared/no data.');
  }
};

// --- Function #125: clearShippingDetailsDisplay() ---
/**
 * Clears any displayed shipping address information, showing a 'no data' message.
 *
 * @returns {void}
 */
export const clearShippingDetailsDisplay = () => {
  renderSavedShippingDetails(null); // Call the rendering function with null
  console.log('Shipping details display cleared.');
};

// --- Function #126: renderUserOrders(ordersArray) ---
/**
 * Iterates through an array of order objects and displays them in the 'Orders Created' section.
 * Clears existing orders before rendering the new list.
 *
 * @param {Array<object>} ordersArray - An array of order objects.
 * @returns {void}
 */
export const renderUserOrders = (ordersArray) => {
  const container = document.querySelector('.orders-container');
  if (!container) {
    console.warn('Orders container not found.');
    return;
  }
  container.innerHTML = ''; // Clear existing orders

  if (ordersArray && ordersArray.length > 0) {
    ordersArray.forEach(order => {
      addSingleOrderItem(order); // Use a helper to add each order
    });
    console.log(`Rendered ${ordersArray.length} user orders.`);
  } else {
    container.innerHTML = '<div class="message-output" style="margin-top: 20px;">No orders created yet.</div>';
    console.log('No user orders to render.');
  }
};

// --- Function #127: clearUserOrdersDisplay() ---
/**
 * Removes all displayed order items from the UI.
 *
 * @returns {void}
 */
export const clearUserOrdersDisplay = () => {
  const container = document.querySelector('.orders-container');
  if (container) {
    container.innerHTML = '';
    container.innerHTML = '<div class="message-output" style="margin-top: 20px;">No orders created yet.</div>';
    console.log('User orders display cleared.');
  }
};

// --- Function #128: addSingleOrderItem(orderData) ---
/**
 * Appends a new order item HTML element to the 'Orders Created' display.
 * Includes dynamic buttons for order actions.
 *
 * @param {object} orderData - The order object to add.
 * @returns {void}
 */
export const addSingleOrderItem = (orderData) => {
  const container = document.querySelector('.orders-container');
  if (!container || !orderData || !orderData.id) {
    console.warn('Invalid container or order data for adding item.');
    return;
  }

  const orderHtml = buildOrderItemHtml(orderData);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = orderHtml;
  const orderElement = tempDiv.firstElementChild;
  orderElement.id = `order-item-${orderData.id}`; // Assign a unique ID

  container.appendChild(orderElement);
  console.log(`Added order item ${orderData.id} to display.`);

  // Attach event listeners for dynamic buttons
  const delayButton = orderElement.querySelector('.delay-delivery-btn');
  if (delayButton) {
    delayButton.addEventListener('click', async () => {
      console.log(`Delay delivery clicked for order: ${orderData.id}`);
      // Simulate a prompt for new date, then call db_features.delayOrderDelivery
      const newDate = prompt('Enter new delivery date (YYYY-MM-DD):');
      if (newDate) {
        try {
          await delayOrderDelivery(getCurrentUserPub(), orderData.id, newDate);
          displayMessage(`order-item-${orderData.id}-message`, 'Delivery delayed!', false);
        } catch (error) {
          displayMessage(`order-item-${orderData.id}-message`, `Failed to delay: ${error.message}`, true);
        }
      }
    });
  }

  const cancelButton = orderElement.querySelector('.cancel-order-btn');
  if (cancelButton) {
    cancelButton.addEventListener('click', async () => {
      console.log(`Cancel order clicked for order: ${orderData.id}`);
      if (confirm('Are you sure you want to cancel this order?')) { // Replace with custom modal
        try {
          await cancelOrder(getCurrentUserPub(), orderData.id);
          displayMessage(`order-item-${orderData.id}-message`, 'Order cancelled!', false);
        } catch (error) {
          displayMessage(`order-item-${orderData.id}-message`, `Failed to cancel: ${error.message}`, true);
        }
      }
    });
  }

  const deleteHistoryButton = orderElement.querySelector('.delete-history-btn');
  if (deleteHistoryButton) {
    deleteHistoryButton.addEventListener('click', async () => {
      console.log(`Delete from history clicked for order: ${orderData.id}`);
      if (confirm('Are you sure you want to delete this order from history?')) { // Replace with custom modal
        try {
          await deleteOrderFromHistory(getCurrentUserPub(), orderData.id);
          orderElement.remove(); // Remove from UI on successful deletion
          displayMessage('orders-container-message', 'Order removed from history.', false);
        } catch (error) {
          displayMessage('orders-container-message', `Failed to delete: ${error.message}`, true);
        }
      }
    });
  }
};

// --- Function #129: updateSingleOrderItem(orderId, updatedData) ---
/**
 * Modifies an existing order item's display with new data.
 * Finds the order by its ID and updates its content.
 *
 * @param {string} orderId - The ID of the order to update.
 * @param {object} updatedData - The new data to update the order display with.
 * @returns {void}
 */
export const updateSingleOrderItem = (orderId, updatedData) => {
  const orderElement = document.getElementById(`order-item-${orderId}`);
  if (!orderElement) {
    console.warn(`Order item with ID '${orderId}' not found for update.`);
    return;
  }
  // This is a simplified update. A robust solution would re-render specific parts or the whole card.
  orderElement.querySelector('strong').textContent = `Order #${orderId}`;
  orderElement.querySelector('p:nth-of-type(1)').textContent = `Date: ${formatAndDisplayTimestamp(null, updatedData.orderDate)} | Status: ${updatedData.status}`;
  orderElement.querySelector('p:nth-of-type(2)').textContent = `Items: ${updatedData.items.length} | Total: $${updatedData.total.toFixed(2)}`;
  console.log(`Order item ${orderId} display updated.`);
};

// --- Function #130: removeSingleOrderItem(orderId) ---
/**
 * Deletes an order item's HTML element from the display.
 *
 * @param {string} orderId - The ID of the order item to remove.
 * @returns {void}
 */
export const removeSingleOrderItem = (orderId) => {
  const orderElement = document.getElementById(`order-item-${orderId}`);
  if (orderElement) {
    orderElement.remove();
    console.log(`Order item ${orderId} removed from display.`);
  } else {
    console.warn(`Order item with ID '${orderId}' not found for removal.`);
  }
};

// --- Function #131: renderSavedProducts(productsArray) ---
/**
 * Displays the list of products saved by the user for later.
 * Clears existing products before rendering the new list.
 *
 * @param {Array<object>} productsArray - An array of saved product objects.
 * @returns {void}
 */
export const renderSavedProducts = (productsArray) => {
  const container = document.querySelector('.saved-products-container');
  if (!container) {
    console.warn('Saved products container not found.');
    return;
  }
  container.innerHTML = ''; // Clear existing products

  if (productsArray && productsArray.length > 0) {
    productsArray.forEach(product => {
      addSingleSavedProductCard(product);
    });
    renderEmptyStateMessage('saved-products-container-message', ''); // Clear empty message
    console.log(`Rendered ${productsArray.length} saved products.`);
  } else {
    renderEmptyStateMessage('saved-products-container-message', 'No products saved for later.');
    console.log('No saved products to render.');
  }
};

// --- Function #132: clearSavedProductsDisplay() ---
/**
 * Removes all displayed saved product cards from the UI.
 *
 * @returns {void}
 */
export const clearSavedProductsDisplay = () => {
  const container = document.querySelector('.saved-products-container');
  if (container) {
    container.innerHTML = '';
    renderEmptyStateMessage('saved-products-container-message', 'No products saved for later.');
    console.log('Saved products display cleared.');
  }
};

// --- Function #133: addSingleSavedProductCard(productData) ---
/**
 * Appends a new saved product card HTML element to the display.
 * Includes dynamic buttons for product actions.
 *
 * @param {object} productData - The product object to add.
 * @returns {void}
 */
export const addSingleSavedProductCard = (productData) => {
  const container = document.querySelector('.saved-products-container');
  if (!container || !productData || !productData.id) {
    console.warn('Invalid container or product data for adding card.');
    return;
  }

  const productHtml = buildProductCardHtml(productData);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = productHtml;
  const productElement = tempDiv.firstElementChild;
  productElement.id = `product-card-${productData.id}`; // Assign a unique ID

  container.appendChild(productElement);
  console.log(`Added saved product card ${productData.id} to display.`);

  // Attach event listeners for dynamic buttons
  const moveToCartButton = productElement.querySelector('.move-to-cart-btn');
  if (moveToCartButton) {
    moveToCartButton.addEventListener('click', async () => {
      console.log(`Move to cart clicked for product: ${productData.id}`);
      try {
        await moveSavedProductToCart(getCurrentUserPub(), productData.id);
        displayMessage(`product-card-${productData.id}-message`, 'Moved to cart!', false);
      } catch (error) {
        displayMessage(`product-card-${productData.id}-message`, `Failed to move: ${error.message}`, true);
      }
    });
  }

  const removeButton = productElement.querySelector('.remove-saved-product-btn');
  if (removeButton) {
    removeButton.addEventListener('click', async () => {
      console.log(`Remove saved product clicked for product: ${productData.id}`);
      if (confirm('Are you sure you want to remove this saved product?')) { // Replace with custom modal
        try {
          await removeSavedProduct(getCurrentUserPub(), productData.id);
          productElement.remove(); // Remove from UI on successful deletion
          displayMessage('saved-products-container-message', 'Product removed from saved list.', false);
        } catch (error) {
          displayMessage('saved-products-container-message', `Failed to remove: ${error.message}`, true);
        }
      }
    });
  }
};

// --- Function #134: updateSingleSavedProductCard(productId, updatedData) ---
/**
 * Modifies an existing saved product card's display with new data.
 * Finds the product card by its ID and updates its content.
 *
 * @param {string} productId - The ID of the product card to update.
 * @param {object} updatedData - The new data to update the product card display with.
 * @returns {void}
 */
export const updateSingleSavedProductCard = (productId, updatedData) => {
  const productElement = document.getElementById(`product-card-${productId}`);
  if (!productElement) {
    console.warn(`Product card with ID '${productId}' not found for update.`);
    return;
  }
  // Update specific elements within the card
  productElement.querySelector('h4').textContent = updatedData.name || 'N/A';
  productElement.querySelector('p').textContent = `Price: $${(updatedData.price || 0).toFixed(2)}`;
  // Update image src if needed
  if (updatedData.imageUrl) {
    productElement.querySelector('img').src = updatedData.imageUrl;
  }
  console.log(`Saved product card ${productId} display updated.`);
};

// --- Function #135: removeSingleSavedProductCard(productId) ---
/**
 * Deletes a saved product card's HTML element from the display.
 *
 * @param {string} productId - The ID of the product card to remove.
 * @returns {void}
 */
export const removeSingleSavedProductCard = (productId) => {
  const productElement = document.getElementById(`product-card-${productId}`);
  if (productElement) {
    productElement.remove();
    console.log(`Saved product card ${productId} removed from display.`);
  } else {
    console.warn(`Saved product card with ID '${productId}' not found for removal.`);
  }
};

// --- Function #136: displayAccountDataNote(isVisible) ---
/**
 * Toggles the visibility of the "Account Data" section's static note.
 * This note informs users that the section is for logged-in users.
 *
 * @param {boolean} isVisible - True to show the note, false to hide it.
 * @returns {void}
 */
export const displayAccountDataNote = (isVisible) => {
  const noteElement = document.getElementById('account-data-note');
  if (noteElement) {
    noteElement.style.display = isVisible ? 'block' : 'none';
    console.log(`Account data note visibility set to: ${isVisible}`);
  }
};

// --- Function #137: showSuccessMessage(elementId, message) ---
/**
 * Displays a green-themed success message in a specified HTML element.
 *
 * @param {string} elementId - The ID of the HTML element to display the message in.
 * @param {string} message - The success message content.
 * @returns {void}
 */
export const showSuccessMessage = (elementId, message) => {
  displayMessage(elementId, message, false); // Use common utility, not error color
  const element = document.getElementById(elementId);
  if (element) {
    element.style.color = '#28a745'; // Green color for success
    element.style.fontWeight = 'bold';
  }
  console.log(`Success message shown in '${elementId}': ${message}`);
};

// --- Function #138: showErrorMessage(elementId, message) ---
/**
 * Displays a red-themed error message in a specified HTML element.
 *
 * @param {string} elementId - The ID of the HTML element to display the message in.
 * @param {string} message - The error message content.
 * @returns {void}
 */
export const showErrorMessage = (elementId, message) => {
  displayMessage(elementId, message, true); // Use common utility, with error color
  const element = document.getElementById(elementId);
  if (element) {
    element.style.color = 'var(--danger-color)'; // Red color for error
    element.style.fontWeight = 'bold';
  }
  console.error(`Error message shown in '${elementId}': ${message}`);
};

// --- Function #139: clearMessageDisplay(elementId) ---
/**
 * Clears the text content and resets styling of a message display element.
 *
 * @param {string} elementId - The ID of the message display element.
 * @returns {void}
 */
export const clearMessageDisplay = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.style.color = 'var(--text-color)'; // Reset to default text color
    element.style.fontWeight = 'normal';
    console.log(`Message display '${elementId}' cleared.`);
  }
};

// --- Function #140: toggleHtmlElementVisibility(elementId, isVisible) ---
/**
 * Toggles the CSS `display` property of any HTML element.
 *
 * @param {string} elementId - The ID of the HTML element to toggle.
 * @param {boolean} isVisible - True to show (display: 'block'), false to hide (display: 'none').
 * @returns {void}
 */
export const toggleHtmlElementVisibility = (elementId, isVisible) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = isVisible ? 'block' : 'none'; // Use 'block' as a common default
    console.log(`Element '${elementId}' visibility set to: ${isVisible}`);
  } else {
    console.warn(`Element with ID '${elementId}' not found for visibility toggle.`);
  }
};

// --- Function #141: updateProgressBarDisplay(progressPercentage) ---
/**
 * Visually updates a progress bar element on the page.
 * Assumes a progress bar element with a style property like `width`.
 *
 * @param {number} progressPercentage - The progress value (0-100).
 * @returns {void}
 */
export const updateProgressBarDisplay = (progressPercentage) => {
  // TODO: Implement HTML for a progress bar if not already present.
  const progressBar = document.getElementById('app-progress-bar'); // Example ID
  if (progressBar) {
    progressBar.style.width = `${Math.max(0, Math.min(100, progressPercentage))}%`;
    console.log(`Progress bar updated to ${progressPercentage}%.`);
  } else {
    console.warn('Progress bar element not found for update.');
  }
};

// --- Function #142: applyCssAnimation(elementId, animationClass) ---
/**
 * Adds a CSS animation class to an element, triggering a visual animation.
 *
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} animationClass - The CSS class defining the animation.
 * @returns {void}
 */
export const applyCssAnimation = (elementId, animationClass) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add(animationClass);
    // Remove class after animation to allow re-triggering
    element.addEventListener('animationend', () => {
      element.classList.remove(animationClass);
    }, { once: true });
    console.log(`Animation '${animationClass}' applied to '${elementId}'.`);
  } else {
    console.warn(`Element '${elementId}' not found for animation.`);
  }
};

// --- Function #143: removeCssAnimation(elementId, animationClass) ---
/**
 * Removes a CSS animation class from an element.
 *
 * @param {string} elementId - The ID of the HTML element.
 * @param {string} animationClass - The CSS class to remove.
 * @returns {void}
 */
export const removeCssAnimation = (elementId, animationClass) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.remove(animationClass);
    console.log(`Animation '${animationClass}' removed from '${elementId}'.`);
  }
};

// --- Function #144: createDynamicButton(text, className, onClickHandler) ---
/**
 * Generates an HTML button element dynamically with specified text, class, and click handler.
 *
 * @param {string} text - The text content of the button.
 * @param {string} className - The CSS class(es) for the button.
 * @param {function(): void} onClickHandler - The function to call when the button is clicked.
 * @returns {HTMLButtonElement} The created button element.
 */
export const createDynamicButton = (text, className, onClickHandler) => {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = className; // Assign class for styling
  button.addEventListener('click', onClickHandler);
  console.log(`Dynamic button created: "${text}" with class "${className}".`);
  return button;
};

// --- Function #145: appendHtmlElement(parentId, childElement) ---
/**
 * Appends a created HTML element to a parent element identified by its ID.
 *
 * @param {string} parentId - The ID of the parent HTML element.
 * @param {HTMLElement} childElement - The HTML element to append.
 * @returns {void}
 */
export const appendHtmlElement = (parentId, childElement) => {
  const parent = document.getElementById(parentId);
  if (parent && childElement) {
    parent.appendChild(childElement);
    console.log(`Appended element to parent '${parentId}'.`);
  } else {
    console.warn(`Parent '${parentId}' or child element not found for appending.`);
  }
};

// --- Function #146: removeHtmlElement(elementId) ---
/**
 * Removes an HTML element from the DOM by its ID.
 *
 * @param {string} elementId - The ID of the HTML element to remove.
 * @returns {void}
 */
export const removeHtmlElement = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.remove();
    console.log(`Element '${elementId}' removed from DOM.`);
  } else {
    console.warn(`Element with ID '${elementId}' not found for removal.`);
  }
};

// --- Function #147: buildProductCardHtml(productData) ---
/**
 * Constructs the full HTML string for a product card based on provided product data.
 * This HTML includes placeholders for dynamic buttons.
 *
 * @param {object} productData - The product data object.
 * @returns {string} The HTML string for a product card.
 */
export const buildProductCardHtml = (productData) => {
  const imageUrl = productData.imageUrl || `https://placehold.co/300x200/333/fff?text=${encodeURIComponent(productData.name || 'Product Image')}`;
  return `
    <div class="product-card">
        <img src="${imageUrl}" alt="${productData.name || 'Product Image'}" onerror="this.onerror=null;this.src='https://placehold.co/300x200/333/fff?text=Image+Missing';" style="border-radius: 5px; border: 1px solid rgba(212, 175, 55, 0.3); margin-bottom: 15px;">
        <h4>${productData.name || 'Unknown Product'}</h4>
        <p>Price: $${(productData.price || 0).toFixed(2)}</p>
        <div class="input-group" style="margin-top: 10px;">
            <button class="btn-secondary move-to-cart-btn" type="button">Move to Cart</button>
            <button class="btn-danger remove-saved-product-btn" type="button">Remove</button>
        </div>
        <div class="message-output" id="product-card-${productData.id}-message" style="margin-top: 10px;"></div>
    </div>
  `;
};

// --- Function #148: buildOrderItemHtml(orderData) ---
/**
 * Constructs the full HTML string for an order item based on provided order data.
 * Includes dynamic buttons for order actions.
 *
 * @param {object} orderData - The order data object.
 * @returns {string} The HTML string for an order item.
 */
export const buildOrderItemHtml = (orderData) => {
  const orderDate = orderData.orderDate ? new Date(orderData.orderDate).toLocaleDateString() : 'N/A';
  const total = (orderData.total || 0).toFixed(2);
  const itemsCount = orderData.items ? orderData.items.length : 0;
  return `
    <div class="order-item">
        <strong>Order #${orderData.id || 'N/A'}</strong><br>
        Date: ${orderDate} | Status: ${orderData.status || 'N/A'}<br>
        Items: ${itemsCount} | Total: $${total}<br>
        <div class="input-group" style="margin-top: 10px;">
            ${orderData.status === 'Shipped' ? `<button class="btn-secondary delay-delivery-btn" type="button">Delay Delivery</button>` : ''}
            ${orderData.status !== 'Cancelled' ? `<button class="btn-danger cancel-order-btn" type="button">Cancel Order</button>` : ''}
            <button class="btn-secondary delete-history-btn" type="button">Delete from History</button>
        </div>
        <div class="message-output" id="order-item-${orderData.id}-message" style="margin-top: 10px;"></div>
    </div>
  `;
};

// --- Function #149: formatAndDisplayTimestamp(elementId, timestamp) ---
/**
 * Formats a Unix timestamp (or ISO string) into a human-readable date/time string
 * and optionally displays it in a specified HTML element.
 *
 * @param {string|null} elementId - The ID of the HTML element to display in, or null to just return string.
 * @param {number|string} timestamp - The timestamp (Unix epoch or ISO string).
 * @returns {string} The formatted date/time string.
 */
export const formatAndDisplayTimestamp = (elementId, timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const formatted = date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = formatted;
  }
  console.log(`Formatted timestamp: ${formatted}`);
  return formatted;
};

// --- Function #150: showTemporaryNotification(message, type, durationMs) ---
/**
 * Displays a transient, dismissible notification to the user (e.g., a toast message).
 *
 * @param {string} message - The notification message.
 * @param {'success'|'error'|'info'} type - The type of notification (influences styling).
 * @param {number} durationMs - How long the notification should be visible in milliseconds.
 * @returns {void}
 */
export const showTemporaryNotification = (message, type = 'info', durationMs = 3000) => {
  // TODO: Implement a dedicated notification area in user.html or dynamically create it.
  // This is a stub.
  const notificationArea = document.getElementById('app-notification-area'); // Example ID
  if (!notificationArea) {
    console.warn('Notification area not found. Cannot display temporary notification.');
    alert(`Notification (${type}): ${message}`); // Fallback to alert
    return;
  }
  notificationArea.textContent = message;
  notificationArea.className = `notification ${type}`; // Apply styling
  notificationArea.style.display = 'block';

  setTimeout(() => {
    notificationArea.style.display = 'none';
    notificationArea.textContent = '';
    notificationArea.className = '';
  }, durationMs);
  console.log(`Temporary notification (${type}): ${message}`);
};

// --- Function #151: hideTemporaryNotification() ---
/**
 * Hides the currently active temporary notification.
 *
 * @returns {void}
 */
export const hideTemporaryNotification = () => {
  const notificationArea = document.getElementById('app-notification-area');
  if (notificationArea) {
    notificationArea.style.display = 'none';
    notificationArea.textContent = '';
    notificationArea.className = '';
    console.log('Temporary notification hidden.');
  }
};

// --- Function #152: handleRealtimeProfileUpdate(profileData) ---
/**
 * Updates UI components when user profile data changes in real-time.
 * This function would be registered as a callback with `listenToUserProfile` from `db_core.js`.
 *
 * @param {object|null} profileData - The updated user profile data.
 * @returns {void}
 */
export const handleRealtimeProfileUpdate = (profileData) => {
  console.log('Real-time profile update received:', profileData);
  if (profileData) {
    // Update elements that display username, email, etc.
    updateLoginStatusDisplay(true, profileData.username);
    // You might also call populateChangeFormsWithCurrentData(profileData) here
    // if the change forms are always visible and need to reflect the latest data.
  } else {
    // Handle case where profile might have been deleted or user logged out
    updateLoginStatusDisplay(false);
  }
};

// --- Function #153: handleRealtimeShippingUpdate(shippingData) ---
/**
 * Updates UI when shipping address data changes in real-time.
 * This function would be registered as a callback with `listenToShippingAddresses` from `db_features.js`.
 *
 * @param {object|null} shippingData - The updated shipping address data.
 * @param {string} addressId - The ID of the updated address.
 * @returns {void}
 */
export const handleRealtimeShippingUpdate = (shippingData, addressId) => {
  console.log(`Real-time shipping update for ${addressId}:`, shippingData);
  if (shippingData) {
    // Reload all shipping addresses and re-render the section to ensure consistency
    if (isUserLoggedIn && currentUserData && currentUserData.pub) {
      loadShippingAddresses(currentUserData.pub).then(renderSavedShippingDetails);
    }
  } else {
    // If shippingData is null, it means the address was deleted
    if (isUserLoggedIn && currentUserData && currentUserData.pub) {
      loadShippingAddresses(currentUserData.pub).then(renderSavedShippingDetails);
    } else {
      clearShippingDetailsDisplay();
    }
  }
};

// --- Function #154: handleRealtimeOrdersUpdate(ordersData) ---
/**
 * Updates UI when user order data changes in real-time.
 * This function would be registered as a callback with `listenToOrders` from `db_features.js`.
 *
 * @param {object|null} ordersData - The updated order data.
 * @param {string} orderId - The ID of the updated order.
 * @returns {void}
 */
export const handleRealtimeOrdersUpdate = (ordersData, orderId) => {
  console.log(`Real-time order update for ${orderId}:`, ordersData);
  if (ordersData) {
    // If an order is updated, find and update its specific card
    updateSingleOrderItem(orderId, ordersData);
  } else {
    // If ordersData is null, it means the order was deleted
    removeSingleOrderItem(orderId);
  }
  // After any update, it might be good to re-check the overall list for completeness
  if (isUserLoggedIn && currentUserData && currentUserData.pub) {
    loadOrders(currentUserData.pub).then(renderUserOrders);
  }
};

// --- Function #155: handleRealtimeProductsUpdate(productsData) ---
/**
 * Updates UI when saved product data changes in real-time.
 * This function would be registered as a callback with `listenToSavedProducts` from `db_features.js`.
 *
 * @param {object|null} productsData - The updated saved product data.
 * @param {string} productId - The ID of the updated product.
 * @returns {void}
 */
export const handleRealtimeProductsUpdate = (productsData, productId) => {
  console.log(`Real-time saved product update for ${productId}:`, productsData);
  if (productsData) {
    // If a product is updated, find and update its specific card
    updateSingleSavedProductCard(productId, productsData);
  } else {
    // If productsData is null, it means the product was removed
    removeSingleSavedProductCard(productId);
  }
  // After any update, it might be good to re-check the overall list for completeness
  if (isUserLoggedIn && currentUserData && currentUserData.pub) {
    loadSavedProducts(currentUserData.pub).then(renderSavedProducts);
  }
};

// --- Function #156: filterDisplayedOrdersByStatus(status) ---
/**
 * Filters the visible order list based on order status.
 * Hides orders that do not match the specified status.
 *
 * @param {string} status - The status to filter by (e.g., 'Shipped', 'Pending', 'Cancelled').
 * @returns {void}
 */
export const filterDisplayedOrdersByStatus = (status) => {
  const container = document.querySelector('.orders-container');
  if (!container) return;
  const orderItems = container.querySelectorAll('.order-item');
  orderItems.forEach(item => {
    // This assumes order status is visible in the item's text or data attribute
    const itemStatus = item.textContent.match(/Status: (\w+)/)?.[1];
    if (status === 'All' || itemStatus === status) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
  console.log(`Orders filtered by status: ${status}`);
};

// --- Function #157: sortDisplayedProductsByPrice(sortOrder) ---
/**
 * Sorts the displayed saved products by price (ascending or descending).
 *
 * @param {'asc'|'desc'} sortOrder - The order to sort by ('asc' for ascending, 'desc' for descending).
 * @returns {void}
 */
export const sortDisplayedProductsByPrice = (sortOrder) => {
  const container = document.querySelector('.saved-products-container');
  if (!container) return;
  const productCards = Array.from(container.querySelectorAll('.product-card'));

  productCards.sort((a, b) => {
    const priceA = parseFloat(a.querySelector('p').textContent.replace('Price: $', ''));
    const priceB = parseFloat(b.querySelector('p').textContent.replace('Price: $', ''));
    return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
  });

  // Re-append sorted cards to update display
  productCards.forEach(card => container.appendChild(card));
  console.log(`Saved products sorted by price: ${sortOrder}`);
};

// --- Function #158: updateFormInputPlaceholder(elementId, newText) ---
/**
 * Changes the placeholder text of an input field.
 *
 * @param {string} elementId - The ID of the input element.
 * @param {string} newText - The new placeholder text.
 * @returns {void}
 */
export const updateFormInputPlaceholder = (elementId, newText) => {
  const input = document.getElementById(elementId);
  if (input && input.placeholder !== undefined) {
    input.placeholder = newText;
    console.log(`Placeholder for '${elementId}' updated to: "${newText}".`);
  } else {
    console.warn(`Input element '${elementId}' not found or does not support placeholder.`);
  }
};

// --- Function #159: renderEmptyStateMessage(containerId, message) ---
/**
 * Displays a message within a container when no data is present.
 * This is useful for providing user feedback when lists are empty.
 *
 * @param {string} containerId - The ID of the container where the message should appear.
 * @param {string} message - The message to display (e.g., "No items found.").
 * @returns {void}
 */
export const renderEmptyStateMessage = (containerId, message) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container with ID '${containerId}' not found for empty state message.`);
    return;
  }
  if (message) {
    container.innerHTML = `<div class="message-output" style="margin-top: 20px;">${message}</div>`;
    console.log(`Empty state message rendered in '${containerId}': "${message}"`);
  } else {
    container.innerHTML = ''; // Clear message if empty
    console.log(`Empty state message cleared for '${containerId}'.`);
  }
};

// --- Function #160: dynamicallyUpdatePageTitle(newTitle) ---
/**
 * Changes the browser tab's title dynamically.
 *
 * @param {string} newTitle - The new title for the page.
 * @returns {void}
 */
export const dynamicallyUpdatePageTitle = (newTitle) => {
  if (typeof newTitle === 'string' && newTitle.length > 0) {
    document.title = newTitle;
    console.log(`Page title updated to: "${newTitle}".`);
  } else {
    console.warn('Invalid title provided for page title update.');
  }
};
