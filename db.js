// db.js — Advanced GunDB Handler for imacx_orders

const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
const ordersRef = gun.get('imacx_orders');

/**
 * Utility: Validates if order data has all required properties
 * @param {object} data 
 * @returns {boolean}
 */
function isValidOrder(data) {
  return data &&
    typeof data.orderId === 'string' &&
    typeof data.total === 'number' &&
    data.shipping &&
    data.basket &&
    typeof data.status === 'string' &&
    Object.keys(data.basket).length > 0;
}

/**
 * Get all fully defined, valid orders from GunDB
 * @returns {Promise<Array<{orderId: string, data: object}>>}
 */
async function getAllOrders() {
  return new Promise((resolve) => {
    const orders = [];
    ordersRef.map().once((data, key) => {
      if (isValidOrder(data)) {
        orders.push({ orderId: key, data });
      }
    });
    setTimeout(() => resolve(orders), 2000); // Wait to gather all
  });
}

/**
 * Get a specific order by ID
 * @param {string} orderId 
 * @returns {Promise<object|null>}
 */
async function getOrder(orderId) {
  return new Promise((resolve) => {
    ordersRef.get(orderId).once((data) => {
      if (isValidOrder(data)) {
        resolve(data);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Update one or more fields of a specific order
 * @param {string} orderId 
 * @param {object} updates - nested or flat fields
 * @returns {Promise<boolean>}
 */
async function updateOrder(orderId, updates) {
  return new Promise((resolve) => {
    if (!updates || typeof updates !== 'object') {
      console.warn('⚠️ Invalid update data');
      return resolve(false);
    }
    const ref = ordersRef.get(orderId);
    const promises = [];

    for (let key in updates) {
      const value = updates[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (let subKey in value) {
          promises.push(new Promise((res) => {
            ref.get(key).get(subKey).put(value[subKey], () => res());
          }));
        }
      } else {
        promises.push(new Promise((res) => {
          ref.get(key).put(value, () => res());
        }));
      }
    }

    Promise.all(promises).then(() => resolve(true));
  });
}

/**
 * Delete an entire order by ID
 * @param {string} orderId 
 * @returns {Promise<boolean>}
 */
async function deleteOrder(orderId) {
  return new Promise((resolve) => {
    ordersRef.get(orderId).put(null, ack => {
      resolve(!ack.err);
    });
  });
}

/**
 * Delete all orders (Dangerous!)
 * @returns {Promise<number>} - Number of orders deleted
 */
async function deleteAllOrders() {
  return new Promise((resolve) => {
    let deleted = 0;
    ordersRef.map().once((data, key) => {
      if (isValidOrder(data)) {
        ordersRef.get(key).put(null);
        deleted++;
      }
    });
    setTimeout(() => resolve(deleted), 2000);
  });
}

/**
 * Listen to real-time changes and replicate to callback
 * @param {function} onUpdate - receives { orderId, data }
 */
function onOrderChange(onUpdate) {
  ordersRef.map().on((data, key) => {
    if (isValidOrder(data)) {
      onUpdate({ orderId: key, data });
    }
  });
}
