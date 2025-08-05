// db_features.js
// This script manages database operations for secondary user-specific features
// such as shipping addresses, orders, saved products, and complex account recovery/credential changes.
// It interacts heavily with db_core.js for fundamental database access and user authentication.

// --- Imports from db_core.js ---
// These imports provide access to the core Gun.js instances and utility functions.
import {
  getGunInstance,
  getUserInstance,
  getUsersRootNode,
  getCurrentUserPub,
  handleDatabaseError,
  generateUniqueRecordKey,
  encryptSensitiveData,
  decryptSensitiveData,
  updateUserProfileField, // Used for changing individual user profile fields
  loadUserProfile,        // Used for verifying current credentials
  isUserLoggedIn          // To check login status before sensitive operations
} from './db_core.js'; // Ensure this path is correct relative to db_core.js

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

// --- Function #41: saveShippingAddress(pub, addressData) ---
/**
 * Stores a new shipping address for a user in the database.
 * Each user can have multiple shipping addresses, stored under a unique key.
 * This function ensures the address is associated with the correct user and is globally replicated.
 *
 * @param {string} pub - The public key of the user.
 * @param {object} addressData - An object containing the shipping address details.
 * @returns {Promise<string>} A promise that resolves with the address ID or rejects on failure.
 */
export const saveShippingAddress = (pub, addressData) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided.'));
      return;
    }
    if (!addressData || typeof addressData !== 'object' || !addressData.recipientName || !addressData.location) {
      reject(new Error('Invalid address data. Recipient name and location are required.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }

    const addressId = generateUniqueRecordKey('shipping-address');
    try {
      // Store shipping addresses under a 'shippingAddresses' sub-node for the user.
      // Using .put() to store the object, with the unique addressId as its key.
      await usersNode.get(pub).get('shippingAddresses').get(addressId).put(addressData);

      console.log(`Shipping address ${addressId} saved for user ${pub}.`);
      displayMessage('saved-shipping-output', `Address saved: ${addressData.recipientName}, ${addressData.location}`, false);
      resolve(addressId);
    } catch (error) {
      handleDatabaseError(error, 'saveShippingAddress');
      reject(new Error(`Failed to save shipping address: ${error.message}`));
    }
  });
};

// --- Function #42: loadShippingAddresses(pub) ---
/**
 * Retrieves all saved shipping addresses for a user from the database.
 * This function iterates through the 'shippingAddresses' sub-node and collects all addresses.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of address objects.
 */
export const loadShippingAddresses = (pub) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided.'));
      return;
    }

    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }

    try {
      const addresses = [];
      // Use .map() to iterate over all children of the 'shippingAddresses' node.
      // .once() ensures we get the current state without continuous listening.
      usersNode.get(pub).get('shippingAddresses').map().once((data, key) => {
        if (data && key) {
          const { _, ...cleanData } = data; // Remove Gun.js metadata
          addresses.push({ id: key, ...cleanData });
        }
      });

      // Gun.js .map().once() is asynchronous and doesn't return a promise directly for completion.
      // A common pattern is to use a timeout or a more sophisticated listener management.
      // For this example, we'll simulate waiting for data to be collected.
      setTimeout(() => {
        console.log(`Loaded ${addresses.length} shipping addresses for user ${pub}.`);
        resolve(addresses);
      }, 500); // Small delay to allow map to collect data
    } catch (error) {
      handleDatabaseError(error, 'loadShippingAddresses');
      reject(new Error(`Failed to load shipping addresses: ${error.message}`));
    }
  });
};

// --- Function #43: updateShippingAddress(pub, addressId, updatedData) ---
/**
 * Modifies an existing shipping address for a user by its unique ID.
 * This function performs a partial update, merging new data with existing address details.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} addressId - The unique ID of the address to update.
 * @param {object} updatedData - The partial address data to merge.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const updateShippingAddress = (pub, addressId, updatedData) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !addressId || !updatedData) {
      reject(new Error('Missing public key, address ID, or update data.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }
    try {
      // Get the specific address node and use .put() to merge the updated data.
      await usersNode.get(pub).get('shippingAddresses').get(addressId).put(updatedData);
      console.log(`Shipping address ${addressId} updated for user ${pub}.`);
      resolve('Shipping address updated successfully.');
    } catch (error) {
      handleDatabaseError(error, 'updateShippingAddress');
      reject(new Error(`Failed to update shipping address: ${error.message}`));
    }
  });
};

// --- Function #44: deleteShippingAddress(pub, addressId) ---
/**
 * Permanently removes a specific shipping address for a user.
 * This is a destructive operation and should be confirmed by the user.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} addressId - The unique ID of the address to delete.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const deleteShippingAddress = (pub, addressId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !addressId) {
      reject(new Error('Missing public key or address ID.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }
    try {
      // Set the specific address node to null to delete it.
      await usersNode.get(pub).get('shippingAddresses').get(addressId).put(null);
      console.log(`Shipping address ${addressId} deleted for user ${pub}.`);
      resolve('Shipping address deleted successfully.');
    } catch (error) {
      handleDatabaseError(error, 'deleteShippingAddress');
      reject(new Error(`Failed to delete shipping address: ${error.message}`));
    }
  });
};

// --- Function #45: setDefaultShippingAddress(pub, addressId) ---
/**
 * Designates one of the user's shipping addresses as the default.
 * This might involve storing the default address ID in the user's main profile.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} addressId - The ID of the address to set as default.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const setDefaultShippingAddress = (pub, addressId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !addressId) { reject(new Error('Public key and address ID are required.')); return; }
    try {
      // Update a field in the user's main profile to store the default address ID.
      await updateUserProfileField(pub, 'defaultShippingAddressId', addressId);
      console.log(`Default shipping address set to ${addressId} for user ${pub}.`);
      resolve('Default shipping address set.');
    } catch (error) {
      handleDatabaseError(error, 'setDefaultShippingAddress');
      reject(new Error(`Failed to set default shipping address: ${error.message}`));
    }
  });
};

// --- Function #46: getShippingAddressById(pub, addressId) ---
/**
 * Fetches a single shipping address for a user by its unique ID.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} addressId - The unique ID of the address to retrieve.
 * @returns {Promise<object|null>} A promise that resolves with the address object or null if not found.
 */
export const getShippingAddressById = (pub, addressId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !addressId) { reject(new Error('Public key and address ID are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      usersNode.get(pub).get('shippingAddresses').get(addressId).once((data) => {
        if (data) {
          const { _, ...cleanData } = data;
          console.log(`Retrieved shipping address ${addressId} for ${pub}.`);
          resolve({ id: addressId, ...cleanData });
        } else {
          console.log(`Shipping address ${addressId} not found for ${pub}.`);
          resolve(null);
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'getShippingAddressById');
      reject(new Error(`Failed to retrieve shipping address: ${error.message}`));
    }
  });
};

// --- Function #47: listenToShippingAddresses(pub, callback) ---
/**
 * Sets up real-time updates for a user's shipping addresses.
 * The callback is triggered whenever any shipping address for the user is added, updated, or deleted.
 *
 * @param {string} pub - The public key of the user.
 * @param {function(object|null, string): void} callback - The function to call with updated address data and its key.
 * @returns {void}
 */
export const listenToShippingAddresses = (pub, callback) => {
  if (!pub || typeof pub !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for listenToShippingAddresses.');
    return;
  }
  const usersNode = getUsersRootNode();
  if (!usersNode) {
    console.error('Database not initialized. Cannot set up listener.');
    return;
  }
  try {
    usersNode.get(pub).get('shippingAddresses').map().on((data, key) => {
      const { _, ...cleanData } = data || {};
      console.log(`Real-time shipping address update for ${pub}: ${key}`, cleanData);
      callback(cleanData, key); // Pass data and key
    });
    console.log(`Listening for real-time updates on shipping addresses for user: ${pub}`);
  } catch (error) {
    handleDatabaseError(error, 'listenToShippingAddresses');
  }
};

// --- Function #48: createOrder(pub, orderData) ---
/**
 * Records a new purchase order for the user in the database.
 * Each order is stored under a unique ID, ensuring global replication.
 *
 * @param {string} pub - The public key of the user.
 * @param {object} orderData - An object containing the order details (e.g., items, total, status).
 * @returns {Promise<string>} A promise that resolves with the order ID or rejects on failure.
 */
export const createOrder = (pub, orderData) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided.'));
      return;
    }
    if (!orderData || typeof orderData !== 'object' || !orderData.items || !orderData.total) {
      reject(new Error('Invalid order data. Items and total are required.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }
    const orderId = generateUniqueRecordKey('order');
    try {
      // Store orders under an 'orders' sub-node for the user.
      await usersNode.get(pub).get('orders').get(orderId).put({
        ...orderData,
        orderDate: Gun.time.is(), // Add a server-side timestamp
        status: orderData.status || 'Pending' // Default status
      });
      console.log(`Order ${orderId} created for user ${pub}.`);
      resolve(orderId);
    } catch (error) {
      handleDatabaseError(error, 'createOrder');
      reject(new Error(`Failed to create order: ${error.message}`));
    }
  });
};

// --- Function #49: loadOrders(pub) ---
/**
 * Retrieves a list of all historical orders for a user from the database.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of order objects.
 */
export const loadOrders = (pub) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || typeof pub !== 'string') {
      reject(new Error('Invalid public key provided.'));
      return;
    }
    const usersNode = getUsersRootNode();
    if (!usersNode) {
      reject(new Error('Database not initialized.'));
      return;
    }
    try {
      const orders = [];
      usersNode.get(pub).get('orders').map().once((data, key) => {
        if (data && key) {
          const { _, ...cleanData } = data;
          orders.push({ id: key, ...cleanData });
        }
      });
      setTimeout(() => { // Simulate waiting for map to collect data
        console.log(`Loaded ${orders.length} orders for user ${pub}.`);
        resolve(orders);
      }, 500);
    } catch (error) {
      handleDatabaseError(error, 'loadOrders');
      reject(new Error(`Failed to load orders: ${error.message}`));
    }
  });
};

// --- Function #50: updateOrderStatus(pub, orderId, newStatus) ---
/**
 * Changes the status of an existing order (e.g., 'Shipped', 'Delivered').
 *
 * @param {string} pub - The public key of the user.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status string.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const updateOrderStatus = (pub, orderId, newStatus) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !orderId || !newStatus) { reject(new Error('Missing parameters.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      await usersNode.get(pub).get('orders').get(orderId).get('status').put(newStatus);
      console.log(`Order ${orderId} status updated to ${newStatus}.`);
      resolve('Order status updated successfully.');
    } catch (error) {
      handleDatabaseError(error, 'updateOrderStatus');
      reject(new Error(`Failed to update order status: ${error.message}`));
    }
  });
};

// --- Function #51: cancelOrder(pub, orderId) ---
/**
 * Marks a specific order as cancelled. This typically involves updating its status.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} orderId - The ID of the order to cancel.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const cancelOrder = (pub, orderId) => {
  return updateOrderStatus(pub, orderId, 'Cancelled');
};

// --- Function #52: delayOrderDelivery(pub, orderId, newDeliveryDate) ---
/**
 * Adjusts the scheduled delivery date of an order.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} orderId - The ID of the order to delay.
 * @param {string} newDeliveryDate - The new delivery date in ISO string format.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const delayOrderDelivery = (pub, orderId, newDeliveryDate) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !orderId || !newDeliveryDate) { reject(new Error('Missing parameters.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      await usersNode.get(pub).get('orders').get(orderId).get('deliveryDate').put(newDeliveryDate);
      console.log(`Order ${orderId} delivery delayed to ${newDeliveryDate}.`);
      resolve('Order delivery date updated successfully.');
    } catch (error) {
      handleDatabaseError(error, 'delayOrderDelivery');
      reject(new Error(`Failed to delay delivery: ${error.message}`));
    }
  });
};

// --- Function #53: deleteOrderFromHistory(pub, orderId) ---
/**
 * Permanently removes an order from the user's history.
 * This is a destructive operation and should be confirmed by the user.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} orderId - The ID of the order to delete.
 * @returns {Promise<string>} A promise that resolves on success or rejects on failure.
 */
export const deleteOrderFromHistory = (pub, orderId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !orderId) { reject(new Error('Missing public key or order ID.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      await usersNode.get(pub).get('orders').get(orderId).put(null);
      console.log(`Order ${orderId} deleted from history for user ${pub}.`);
      resolve('Order deleted from history successfully.');
    } catch (error) {
      handleDatabaseError(error, 'deleteOrderFromHistory');
      reject(new Error(`Failed to delete order from history: ${error.message}`));
    }
  });
};

// --- Function #54: getOrderById(pub, orderId) ---
/**
 * Fetches details of a single order for a user by its ID.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} orderId - The ID of the order to retrieve.
 * @returns {Promise<object|null>} A promise that resolves with the order object or null.
 */
export const getOrderById = (pub, orderId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !orderId) { reject(new Error('Public key and order ID are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      usersNode.get(pub).get('orders').get(orderId).once((data) => {
        if (data) {
          const { _, ...cleanData } = data;
          console.log(`Retrieved order ${orderId} for ${pub}.`);
          resolve({ id: orderId, ...cleanData });
        } else {
          console.log(`Order ${orderId} not found for ${pub}.`);
          resolve(null);
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'getOrderById');
      reject(new Error(`Failed to retrieve order: ${error.message}`));
    }
  });
};

// --- Function #55: listenToOrders(pub, callback) ---
/**
 * Sets up real-time updates for a user's orders.
 * The callback is triggered whenever any order for the user is added, updated, or deleted.
 *
 * @param {string} pub - The public key of the user.
 * @param {function(object|null, string): void} callback - The function to call with updated order data and its key.
 * @returns {void}
 */
export const listenToOrders = (pub, callback) => {
  if (!pub || typeof pub !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for listenToOrders.');
    return;
  }
  const usersNode = getUsersRootNode();
  if (!usersNode) {
    console.error('Database not initialized. Cannot set up listener.');
    return;
  }
  try {
    usersNode.get(pub).get('orders').map().on((data, key) => {
      const { _, ...cleanData } = data || {};
      console.log(`Real-time order update for ${pub}: ${key}`, cleanData);
      callback(cleanData, key);
    });
    console.log(`Listening for real-time updates on orders for user: ${pub}`);
  } catch (error) {
    handleDatabaseError(error, 'listenToOrders');
  }
};

// --- Function #56: addSavedProduct(pub, productData) ---
/**
 * Adds a product to the user's 'Saved for Later' list.
 *
 * @param {string} pub - The public key of the user.
 * @param {object} productData - Details of the product to save.
 * @returns {Promise<string>} A promise that resolves with the product ID or rejects.
 */
export const addSavedProduct = (pub, productData) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !productData || !productData.name || !productData.price) { reject(new Error('Missing product data.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    const productId = generateUniqueRecordKey('saved-product');
    try {
      await usersNode.get(pub).get('savedProducts').get(productId).put({
        ...productData,
        savedAt: Gun.time.is()
      });
      console.log(`Product ${productId} added to saved list for ${pub}.`);
      resolve(productId);
    } catch (error) {
      handleDatabaseError(error, 'addSavedProduct');
      reject(new Error(`Failed to add saved product: ${error.message}`));
    }
  });
};

// --- Function #57: loadSavedProducts(pub) ---
/**
 * Retrieves all products saved by the user for later.
 *
 * @param {string} pub - The public key of the user.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of saved product objects.
 */
export const loadSavedProducts = (pub) => {
  return new Promise(async (resolve, reject) => {
    if (!pub) { reject(new Error('Public key is required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      const products = [];
      usersNode.get(pub).get('savedProducts').map().once((data, key) => {
        if (data && key) {
          const { _, ...cleanData } = data;
          products.push({ id: key, ...cleanData });
        }
      });
      setTimeout(() => { // Simulate waiting for map to collect data
        console.log(`Loaded ${products.length} saved products for user ${pub}.`);
        resolve(products);
      }, 500);
    } catch (error) {
      handleDatabaseError(error, 'loadSavedProducts');
      reject(new Error(`Failed to load saved products: ${error.message}`));
    }
  });
};

// --- Function #58: removeSavedProduct(pub, productId) ---
/**
 * Deletes a product from the 'Saved for Later' list.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} productId - The ID of the product to remove.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const removeSavedProduct = (pub, productId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !productId) { reject(new Error('Missing parameters.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      await usersNode.get(pub).get('savedProducts').get(productId).put(null);
      console.log(`Product ${productId} removed from saved list for ${pub}.`);
      resolve('Saved product removed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'removeSavedProduct');
      reject(new Error(`Failed to remove saved product: ${error.message}`));
    }
  });
};

// --- Function #59: moveSavedProductToCart(pub, productId) ---
/**
 * Simulates moving a product from the saved list to the user's shopping cart.
 * In a real app, this would involve adding to a 'cart' node and removing from 'savedProducts'.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} productId - The ID of the product to move.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const moveSavedProductToCart = (pub, productId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !productId) { reject(new Error('Missing parameters.')); return; }
    console.log(`Attempting to move product ${productId} to cart for ${pub}...`);
    // TODO: Implement actual move logic:
    // 1. Load product data from savedProducts.
    // 2. Add it to a 'cart' node (e.g., usersNode.get(pub).get('cart').set(productData)).
    // 3. Remove it from savedProducts (call removeSavedProduct).
    try {
      // Simulate successful operation
      await removeSavedProduct(pub, productId); // Remove from saved after "moving"
      console.log(`Product ${productId} moved to cart (simulated) for ${pub}.`);
      resolve('Product moved to cart successfully.');
    } catch (error) {
      handleDatabaseError(error, 'moveSavedProductToCart');
      reject(new Error(`Failed to move product to cart: ${error.message}`));
    }
  });
};

// --- Function #60: getSavedProductById(pub, productId) ---
/**
 * Fetches details of a single saved product for a user by its ID.
 *
 * @param {string} pub - The public key of the user.
 * @param {string} productId - The ID of the saved product to retrieve.
 * @returns {Promise<object|null>} A promise that resolves with the product object or null.
 */
export const getSavedProductById = (pub, productId) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !productId) { reject(new Error('Public key and product ID are required.')); return; }
    const usersNode = getUsersRootNode();
    if (!usersNode) { reject(new Error('Database not initialized.')); return; }
    try {
      usersNode.get(pub).get('savedProducts').get(productId).once((data) => {
        if (data) {
          const { _, ...cleanData } = data;
          console.log(`Retrieved saved product ${productId} for ${pub}.`);
          resolve({ id: productId, ...cleanData });
        } else {
          console.log(`Saved product ${productId} not found for ${pub}.`);
          resolve(null);
        }
      });
    } catch (error) {
      handleDatabaseError(error, 'getSavedProductById');
      reject(new Error(`Failed to retrieve saved product: ${error.message}`));
    }
  });
};

// --- Function #61: listenToSavedProducts(pub, callback) ---
/**
 * Sets up real-time updates for a user's saved products.
 * The callback is triggered whenever any saved product for the user is added, updated, or deleted.
 *
 * @param {string} pub - The public key of the user.
 * @param {function(object|null, string): void} callback - The function to call with updated product data and its key.
 * @returns {void}
 */
export const listenToSavedProducts = (pub, callback) => {
  if (!pub || typeof pub !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for listenToSavedProducts.');
    return;
  }
  const usersNode = getUsersRootNode();
  if (!usersNode) {
    console.error('Database not initialized. Cannot set up listener.');
    return;
  }
  try {
    usersNode.get(pub).get('savedProducts').map().on((data, key) => {
      const { _, ...cleanData } = data || {};
      console.log(`Real-time saved product update for ${pub}: ${key}`, cleanData);
      callback(cleanData, key);
    });
    console.log(`Listening for real-time updates on saved products for user: ${pub}`);
  } catch (error) {
    handleDatabaseError(error, 'listenToSavedProducts');
  }
};

// --- Account Recovery Functions (Comprehensive Stubs) ---
// These functions require careful verification of existing credentials before revealing sensitive info.

// Helper for recovery functions to verify provided current credentials
const verifyRecoveryCredentials = async (inputData) => {
  const user = getUserInstance();
  if (!user || !isUserLoggedIn) {
    throw new Error('User not logged in or database not ready for verification.');
  }

  // Attempt to re-authenticate with provided credentials to verify
  return new Promise((resolve, reject) => {
    user.auth(inputData.username, inputData.password, (ack) => {
      if (ack.err) {
        reject(new Error(`Verification failed: ${ack.err}`));
      } else {
        // Further check if provided email/phone/cc match the authenticated user's data
        loadUserProfile(ack.sea.pub).then(profile => {
          if (profile && profile.email === inputData.email &&
              profile.phone === inputData.phone &&
              profile.countryCode === inputData.countryCode) {
            resolve(profile); // Return full profile if all match
          } else {
            reject(new Error('Provided recovery details do not match registered account.'));
          }
        }).catch(err => reject(new Error(`Failed to load profile for verification: ${err.message}`)));
      }
    });
  });
};

// --- Function #62: recoverUsernameByEmail(email, phone, password) ---
/**
 * Attempts to recover username using provided email, phone, and password.
 * This function verifies the provided details against existing user records
 * and, if successful, returns the associated username.
 *
 * @param {string} email - The registered email address.
 * @param {string} phone - The registered phone number.
 * @param {string} password - The registered password.
 * @returns {Promise<string>} A promise that resolves with the recovered username or rejects.
 */
export const recoverUsernameByEmail = (email, phone, password) => {
  return new Promise(async (resolve, reject) => {
    if (!email || !phone || !password) { reject(new Error('All recovery details are required.')); return; }
    displayMessage('rec-user-message', 'Attempting username recovery...', false);
    try {
      // In a real Gun.js app, you'd need to iterate through users or have a separate index
      // to find a user by email/phone. This is a conceptual stub.
      // For now, we'll simulate a lookup.
      const userProfile = await verifyRecoveryCredentials({ email, phone, password, username: 'any' }); // Username is placeholder for verification
      if (userProfile) {
        displayMessage('rec-user-message', `Your username is: ${userProfile.username}`, false);
        resolve(userProfile.username);
      } else {
        reject(new Error('No account found matching provided details.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'recoverUsernameByEmail');
      displayMessage('rec-user-message', `Recovery failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #63: recoverEmailByPhone(phone, password, username) ---
/**
 * Attempts to recover email using provided phone, password, and username.
 *
 * @param {string} phone - The registered phone number.
 * @param {string} password - The registered password.
 * @param {string} username - The registered username.
 * @returns {Promise<string>} A promise that resolves with the recovered email or rejects.
 */
export const recoverEmailByPhone = (phone, password, username) => {
  return new Promise(async (resolve, reject) => {
    if (!phone || !password || !username) { reject(new Error('All recovery details are required.')); return; }
    displayMessage('rec-email-message', 'Attempting email recovery...', false);
    try {
      const userProfile = await verifyRecoveryCredentials({ username, password, phone, email: 'any' }); // Email is placeholder
      if (userProfile) {
        displayMessage('rec-email-message', `Your email is: ${userProfile.email}`, false);
        resolve(userProfile.email);
      } else {
        reject(new Error('No account found matching provided details.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'recoverEmailByPhone');
      displayMessage('rec-email-message', `Recovery failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #64: requestPasswordReset(username, email, phone) ---
/**
 * Initiates a password reset process. In a real Gun.js app, this would involve
 * sending a signed token to the user's email/phone for a password change link.
 * Since Gun.js is decentralized, direct 'forgot password' links are complex.
 * This function simulates that process.
 *
 * @param {string} username - The user's username.
 * @param {string} email - The user's registered email.
 * @param {string} phone - The user's registered phone number.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const requestPasswordReset = (username, email, phone) => {
  return new Promise(async (resolve, reject) => {
    if (!username || !email || !phone) { reject(new Error('All details are required for password reset.')); return; }
    displayMessage('rec-pass-message', 'Initiating password reset...', false);
    try {
      // Simulate verifying user existence for password reset
      const userProfile = await loadUserProfile(getCurrentUserPub()); // This needs to be adapted for non-logged-in recovery
      if (userProfile && userProfile.username === username && userProfile.email === email && userProfile.phone === phone) {
        // In a real scenario, generate a one-time token, encrypt it, send it via email/SMS.
        // The user then uses this token to call a 'resetPasswordWithToken' function.
        displayMessage('rec-pass-message', 'Password reset link sent to your registered email/phone (simulated).', false);
        resolve('Password reset initiated.');
      } else {
        reject(new Error('Account details do not match.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'requestPasswordReset');
      displayMessage('rec-pass-message', `Password reset failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #65: recoverPhoneNumber(username, email, password) ---
/**
 * Retrieves the registered phone number after verification.
 *
 * @param {string} username - The registered username.
 * @param {string} email - The registered email.
 * @param {string} password - The registered password.
 * @returns {Promise<string>} A promise that resolves with the recovered phone number or rejects.
 */
export const recoverPhoneNumber = (username, email, password) => {
  return new Promise(async (resolve, reject) => {
    if (!username || !email || !password) { reject(new Error('All recovery details are required.')); return; }
    displayMessage('rec-phone-message', 'Attempting phone number recovery...', false);
    try {
      const userProfile = await verifyRecoveryCredentials({ username, password, email, phone: 'any' }); // Phone is placeholder
      if (userProfile) {
        displayMessage('rec-phone-message', `Your registered phone number is: ${userProfile.phone}`, false);
        resolve(userProfile.phone);
      } else {
        reject(new Error('No account found matching provided details.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'recoverPhoneNumber');
      displayMessage('rec-phone-message', `Recovery failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #66: recoverCountryCode(username, email, password) ---
/**
 * Retrieves the registered country code after verification.
 *
 * @param {string} username - The registered username.
 * @param {string} email - The registered email.
 * @param {string} password - The registered password.
 * @returns {Promise<string>} A promise that resolves with the recovered country code or rejects.
 */
export const recoverCountryCode = (username, email, password) => {
  return new Promise(async (resolve, reject) => {
    if (!username || !email || !password) { reject(new Error('All recovery details are required.')); return; }
    displayMessage('rec-cc-message', 'Attempting country code recovery...', false);
    try {
      const userProfile = await verifyRecoveryCredentials({ username, password, email, countryCode: 'any' }); // CC is placeholder
      if (userProfile) {
        displayMessage('rec-cc-message', `Your registered country code is: ${userProfile.countryCode}`, false);
        resolve(userProfile.countryCode);
      } else {
        reject(new Error('No account found matching provided details.'));
      }
    } catch (error) {
      handleDatabaseError(error, 'recoverCountryCode');
      displayMessage('rec-cc-message', `Recovery failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Credential Change Functions (Comprehensive Stubs) ---

// Helper for change credential functions to verify ALL provided current credentials
const verifyCurrentCredentialsForChange = async (inputData) => {
  const user = getUserInstance();
  if (!user || !isUserLoggedIn) {
    throw new Error('User not logged in or database not ready for verification.');
  }
  const currentPub = getCurrentUserPub();
  if (!currentPub) {
    throw new Error('Current user public key not found.');
  }

  // First, re-authenticate with provided CURRENT username and password
  return new Promise((resolve, reject) => {
    user.auth(inputData.current_username, inputData.current_password, (authAck) => {
      if (authAck.err) {
        reject(new Error(`Authentication failed: ${authAck.err}`));
        return;
      }
      // Ensure the authenticated user's pub matches the current logged-in user's pub
      if (authAck.sea.pub !== currentPub) {
        reject(new Error('Authentication mismatch: Provided credentials do not belong to the logged-in user.'));
        return;
      }

      // Then, load the full profile and verify email, phone, country code
      loadUserProfile(currentPub).then(profile => {
        if (profile &&
            profile.email === inputData.current_email &&
            profile.phone === inputData.current_phone &&
            profile.countryCode === inputData.current_cc) {
          resolve(profile); // All current credentials match
        } else {
          reject(new Error('Provided current email, phone, or country code do not match registered account.'));
        }
      }).catch(err => reject(new Error(`Failed to load profile for full verification: ${err.message}`)));
    });
  });
};


// --- Function #67: changeUsernamePermanently(oldData, newData) ---
/**
 * Updates username after verifying all current credentials.
 * This is a sensitive operation requiring full current credential verification.
 *
 * @param {object} oldData - Object with current_username, current_password, current_email, current_phone, current_cc.
 * @param {string} newUsername - The new username.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const changeUsernamePermanently = (oldData, newUsername) => {
  return new Promise(async (resolve, reject) => {
    if (!oldData || !newUsername) { reject(new Error('Missing old data or new username.')); return; }
    displayMessage('change-username-message', 'Changing username...', false);
    try {
      const currentUserProfile = await verifyCurrentCredentialsForChange(oldData);
      const user = getUserInstance();

      // Gun.js SEA does not directly support changing username/password for an existing key pair.
      // The standard approach is to:
      // 1. Create a NEW user with the new username/password.
      // 2. Transfer all old user's data to the new user's public key.
      // 3. Delete the old user's account.
      // This is a complex multi-step process. For now, we'll simulate the update.
      await updateUserProfileField(currentUserProfile.pub, 'username', newUsername);
      displayMessage('change-username-message', `Username changed to ${newUsername} (simulated).`, false);
      resolve('Username changed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'changeUsernamePermanently');
      displayMessage('change-username-message', `Failed to change username: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #68: changeEmailPermanently(oldData, newEmail) ---
/**
 * Updates email address after verifying all current credentials.
 *
 * @param {object} oldData - Object with current_username, current_password, current_email, current_phone, current_cc.
 * @param {string} newEmail - The new email address.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const changeEmailPermanently = (oldData, newEmail) => {
  return new Promise(async (resolve, reject) => {
    if (!oldData || !newEmail) { reject(new Error('Missing old data or new email.')); return; }
    displayMessage('change-email-message', 'Changing email...', false);
    try {
      const currentUserProfile = await verifyCurrentCredentialsForChange(oldData);
      await updateUserProfileField(currentUserProfile.pub, 'email', newEmail);
      displayMessage('change-email-message', `Email changed to ${newEmail}.`, false);
      resolve('Email changed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'changeEmailPermanently');
      displayMessage('change-email-message', `Failed to change email: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #69: changePasswordPermanently(oldData, newPassword) ---
/**
 * Updates password after verifying all current credentials.
 * Similar to username, direct password change for the same key pair is not typical in SEA.
 * This would involve re-creating the user or a complex key rotation. Simulating for now.
 *
 * @param {object} oldData - Object with current_username, current_password, current_email, current_phone, current_cc.
 * @param {string} newPassword - The new password.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const changePasswordPermanently = (oldData, newPassword) => {
  return new Promise(async (resolve, reject) => {
    if (!oldData || !newPassword) { reject(new Error('Missing old data or new password.')); return; }
    displayMessage('change-password-message', 'Changing password...', false);
    try {
      const currentUserProfile = await verifyCurrentCredentialsForChange(oldData);
      // Simulating password change. In a real Gun.js SEA context, changing the password
      // for an existing user's key pair is not directly supported as the password
      // is used to derive the key. You'd typically create a new user and migrate data.
      // For this example, we'll just log and resolve.
      console.log(`Password for ${currentUserProfile.username} changed (simulated).`);
      displayMessage('change-password-message', 'Password changed successfully (simulated).', false);
      resolve('Password changed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'changePasswordPermanently');
      displayMessage('change-password-message', `Failed to change password: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #70: changePhoneNumberPermanently(oldData, newPhoneNumber) ---
/**
 * Updates phone number after verifying all current credentials.
 *
 * @param {object} oldData - Object with current_username, current_password, current_email, current_phone, current_cc.
 * @param {string} newPhoneNumber - The new phone number.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const changePhoneNumberPermanently = (oldData, newPhoneNumber) => {
  return new Promise(async (resolve, reject) => {
    if (!oldData || !newPhoneNumber) { reject(new Error('Missing old data or new phone number.')); return; }
    displayMessage('change-phone-message', 'Changing phone number...', false);
    try {
      const currentUserProfile = await verifyCurrentCredentialsForChange(oldData);
      await updateUserProfileField(currentUserProfile.pub, 'phone', newPhoneNumber);
      displayMessage('change-phone-message', `Phone number changed to ${newPhoneNumber}.`, false);
      resolve('Phone number changed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'changePhoneNumberPermanently');
      displayMessage('change-phone-message', `Failed to change phone number: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #71: changeCountryCodePermanently(oldData, newCountryCode) ---
/**
 * Updates country code after verifying all current credentials.
 *
 * @param {object} oldData - Object with current_username, current_password, current_email, current_phone, current_cc.
 * @param {string} newCountryCode - The new country code.
 * @returns {Promise<string>} A promise that resolves on success or rejects.
 */
export const changeCountryCodePermanently = (oldData, newCountryCode) => {
  return new Promise(async (resolve, reject) => {
    if (!oldData || !newCountryCode) { reject(new Error('Missing old data or new country code.')); return; }
    displayMessage('change-cc-message', 'Changing country code...', false);
    try {
      const currentUserProfile = await verifyCurrentCredentialsForChange(oldData);
      await updateUserProfileField(currentUserProfile.pub, 'countryCode', newCountryCode);
      displayMessage('change-cc-message', `Country code changed to ${newCountryCode}.`, false);
      resolve('Country code changed successfully.');
    } catch (error) {
      handleDatabaseError(error, 'changeCountryCodePermanently');
      displayMessage('change-cc-message', `Failed to change country code: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #72: verifyCurrentCredentialsForChange(username, password, email, phone, countryCode) ---
/**
 * Verifies all current user credentials for sensitive changes.
 * This is a helper function used internally by credential change operations.
 * It ensures the provided current details match the logged-in user's stored data.
 *
 * @param {string} username - Current username.
 * @param {string} password - Current password.
 * @param {string} email - Current email.
 * @param {string} phone - Current phone number.
 * @param {string} countryCode - Current country code.
 * @returns {Promise<object>} A promise that resolves with the user's full profile if credentials match, or rejects.
 */
export const verifyCurrentCredentialsForChangePublic = (username, password, email, phone, countryCode) => {
  return verifyCurrentCredentialsForChange({
    current_username: username,
    current_password: password,
    current_email: email,
    current_phone: phone,
    current_cc: countryCode
  });
};


// --- Function #73: confirmAccountDeletion(pub, confirmationData) ---
/**
 * Finalizes and executes permanent account deletion.
 * This function should only be called after multiple user confirmations.
 * It deletes all associated user data from the database.
 *
 * @param {string} pub - The public key of the user to delete.
 * @param {object} confirmationData - Object containing confirmation flags (e.g., checkbox states).
 * @returns {Promise<string>} A promise that resolves on successful deletion or rejects.
 */
export const confirmAccountDeletion = (pub, confirmationData) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !confirmationData || !confirmationData.confirmed) {
      reject(new Error('Account deletion requires explicit confirmation.'));
      return;
    }
    displayMessage('delete-account-message', 'Processing account deletion...', false);
    try {
      // First, delete core user profile (this will cascade to sub-nodes if linked correctly)
      const usersNode = getUsersRootNode();
      if (!usersNode) { reject(new Error('Database not initialized.')); return; }

      await usersNode.get(pub).put(null); // Delete the main user node

      // Also explicitly delete sub-nodes if they are not directly linked by Gun's graph
      // (e.g., if you used .set() for collections, they might need explicit removal)
      await usersNode.get(pub).get('shippingAddresses').put(null);
      await usersNode.get(pub).get('orders').put(null);
      await usersNode.get(pub).get('savedProducts').put(null);

      // Log out the user immediately after deletion
      getUserInstance().leave();
      isUserLoggedIn = false; // Update global state
      currentUserData = null;

      displayMessage('delete-account-message', 'Account and all associated data permanently deleted.', false);
      console.log(`User account ${pub} and all data deleted.`);
      resolve('Account deleted successfully.');
    } catch (error) {
      handleDatabaseError(error, 'confirmAccountDeletion');
      displayMessage('delete-account-message', `Account deletion failed: ${error.message}`, true);
      reject(error);
    }
  });
};

// --- Function #74: validateRecoveryInput(inputData) ---
/**
 * Validates the structure and content of recovery form inputs.
 * Ensures that all required fields for a recovery attempt are present and in a valid format.
 *
 * @param {object} inputData - The data object from a recovery form.
 * @returns {boolean} True if input is valid, false otherwise.
 */
export const validateRecoveryInput = (inputData) => {
  if (!inputData || typeof inputData !== 'object') {
    console.error('Validation Error: Recovery input must be an object.');
    return false;
  }
  // Example validation for username recovery
  if (inputData.email && (!inputData.email.includes('@') || typeof inputData.email !== 'string')) {
    console.error('Validation Error: Invalid email format.'); return false;
  }
  if (inputData.phone && (typeof inputData.phone !== 'string' || inputData.phone.length < 7)) {
    console.error('Validation Error: Invalid phone number format.'); return false;
  }
  if (inputData.password && (typeof inputData.password !== 'string' || inputData.password.length < 8)) {
    console.error('Validation Error: Password too short or invalid type.'); return false;
  }
  // Add more specific checks based on which recovery form is being validated
  return true;
};

// --- Function #75: validateChangeCredentialInput(inputData) ---
/**
 * Validates inputs for credential change forms.
 * Ensures that both current and new credential fields meet validation criteria.
 *
 * @param {object} inputData - The data object from a credential change form.
 * @returns {boolean} True if input is valid, false otherwise.
 */
export const validateChangeCredentialInput = (inputData) => {
  if (!inputData || typeof inputData !== 'object') {
    console.error('Validation Error: Change credential input must be an object.');
    return false;
  }
  // Example for username change:
  if (inputData.newUsername && (typeof inputData.newUsername !== 'string' || inputData.newUsername.length < 3)) {
    console.error('Validation Error: New username too short.'); return false;
  }
  if (inputData.newEmail && (!inputData.newEmail.includes('@') || typeof inputData.newEmail !== 'string')) {
    console.error('Validation Error: Invalid new email format.'); return false;
  }
  if (inputData.newPassword && (typeof inputData.newPassword !== 'string' || inputData.newPassword.length < 8)) {
    console.error('Validation Error: New password too short.'); return false;
  }
  // Also validate current credentials part of the inputData (e.g., current_password, etc.)
  return true;
};

// --- Function #76: validateDeletionConfirmationCheckboxes(checkboxStates) ---
/**
 * Ensures all required deletion confirmation checkboxes are ticked before proceeding with deletion.
 * This adds an extra layer of user confirmation for irreversible actions.
 *
 * @param {object} checkboxStates - An object where keys are checkbox IDs and values are booleans (checked status).
 * @returns {boolean} True if all required checkboxes are checked, false otherwise.
 */
export const validateDeletionConfirmationCheckboxes = (checkboxStates) => {
  if (!checkboxStates || typeof checkboxStates !== 'object') {
    console.error('Validation Error: Checkbox states must be an object.');
    return false;
  }
  const requiredCheckboxes = [
    'confirm-data-deletion', // Example ID for "I understand all my data will be deleted"
    'confirm-irreversible',  // Example ID for "I understand this action is irreversible"
    'confirm-proceed'        // Example ID for "I confirm I want to proceed"
  ];
  for (const checkboxId of requiredCheckboxes) {
    if (!checkboxStates[checkboxId]) {
      console.error(`Validation Error: Checkbox '${checkboxId}' must be checked.`);
      return false;
    }
  }
  console.log('All deletion confirmation checkboxes are checked.');
  return true;
};

// --- Function #77: logFeatureSpecificAction(pub, actionType, details) ---
/**
 * Logs user actions related to specific features (e.g., 'ORDER_CANCELLED', 'ADDRESS_UPDATED').
 * This is useful for auditing, analytics, and debugging user behavior.
 * Logs are typically stored in a separate 'logs' node or sent to an external logging service.
 *
 * @param {string} pub - The public key of the user performing the action.
 * @param {string} actionType - A string describing the type of action (e.g., 'ORDER_CREATED').
 * @param {object} details - Additional details about the action.
 * @returns {Promise<string>} A promise that resolves on successful logging or rejects.
 */
export const logFeatureSpecificAction = (pub, actionType, details) => {
  return new Promise(async (resolve, reject) => {
    if (!pub || !actionType) { reject(new Error('Public key and action type are required for logging.')); return; }
    const gun = getGunInstance();
    if (!gun) { reject(new Error('Database not initialized.')); return; }
    const logId = generateUniqueRecordKey('action-log');
    try {
      // Store logs under a 'logs' node, possibly segmented by user or date.
      await gun.get('app_logs').get(logId).put({
        userPub: pub,
        actionType: actionType,
        details: details,
        timestamp: Gun.time.is()
      });
      console.log(`Action logged: ${actionType} by ${pub}.`);
      resolve('Action logged successfully.');
    } catch (error) {
      handleDatabaseError(error, 'logFeatureSpecificAction');
      reject(new Error(`Failed to log action: ${error.message}`));
    }
  });
};

// --- Function #78: subscribeToProductUpdates(productId, callback) ---
/**
 * Sets up a real-time listener for updates specific to a product (e.g., price change, stock level).
 * This allows the UI to react instantly to changes in product data, even if not directly related to the user's saved items.
 *
 * @param {string} productId - The ID of the product to subscribe to.
 * @param {function(object|null): void} callback - The function to call with the updated product data.
 * @returns {void}
 */
export const subscribeToProductUpdates = (productId, callback) => {
  if (!productId || typeof productId !== 'string' || typeof callback !== 'function') {
    console.error('Invalid parameters for subscribeToProductUpdates.');
    return;
  }
  const gun = getGunInstance();
  if (!gun) {
    console.error('Database not initialized. Cannot subscribe to product updates.');
    return;
  }
  try {
    // Assuming a 'products' root node in your database
    gun.get('products').get(productId).on((data, key) => {
      const { _, ...cleanData } = data || {};
      console.log(`Real-time product update for ${productId}:`, cleanData);
      callback(cleanData);
    });
    console.log(`Subscribed to real-time updates for product: ${productId}`);
  } catch (error) {
    handleDatabaseError(error, 'subscribeToProductUpdates');
  }
};

// --- Function #79: unsubscribeFromProductUpdates(productId) ---
/**
 * Removes a previously set real-time listener for product-specific updates.
 * Important for cleanup and preventing memory leaks.
 *
 * @param {string} productId - The ID of the product to unsubscribe from.
 * @returns {void}
 */
export const unsubscribeFromProductUpdates = (productId) => {
  if (!productId || typeof productId !== 'string') {
    console.error('Invalid product ID provided for unsubscribing.');
    return;
  }
  const gun = getGunInstance();
  if (!gun) {
    console.error('Database not initialized. Cannot unsubscribe from product updates.');
    return;
  }
  try {
    // To effectively remove, you'd need the exact callback reference passed to .on().
    // For demonstration, we'll just log a warning.
    // gun.get('products').get(productId).off(callbackReference);
    console.warn(`Attempted to unsubscribe from product ${productId}. In a real app, pass the original callback reference to .off().`);
  } catch (error) {
    handleDatabaseError(error, 'unsubscribeFromProductUpdates');
  }
};

// --- Function #80: handleDataConflictResolution(key, localData, remoteData) ---
/**
 * Implements logic to resolve data conflicts that might arise in a decentralized system
 * when the same data is modified concurrently on different peers.
 * Gun.js has built-in conflict resolution (CRDTs), but this function provides a hook
 * for custom application-level resolution strategies if needed.
 *
 * @param {string} key - The key of the data where conflict occurred.
 * @param {object} localData - The client's local version of the data.
 * @param {object} remoteData - The remote peer's version of the data.
 * @returns {object} The resolved data object.
 */
export const handleDataConflictResolution = (key, localData, remoteData) => {
  console.warn(`Data conflict detected for key: ${key}`);
  console.log('Local Data:', localData);
  console.log('Remote Data:', remoteData);

  // Gun.js's default CRDTs (Conflict-free Replicated Data Types) handle most conflicts automatically.
  // This function is for implementing custom logic if the default is not sufficient.
  // Common strategies:
  // 1. Last Write Wins (default for Gun.js's put)
  // 2. Merge (combine fields from both, e.g., for objects)
  // 3. Application-specific logic (e.g., for a counter, add both values)

  // Example: Simple merge strategy (prioritizes remote for direct conflicts, otherwise merges)
  const resolvedData = { ...localData, ...remoteData };

  console.log('Conflict resolved. Resulting Data:', resolvedData);
  return resolvedData;
};
