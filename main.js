// Initialize Peerbit & GunDB
const peer = await window.Peerbit.create();
const ordersDB = await peer.open('orders');

const gun = Gun('https://gun-manhattan.herokuapp.com/gun');
const sea = Gun.SEA;
const gorders = gun.get('imacx_orders');

// IndexedDB cache
const db = new Dexie('localCache');
db.version(1).stores({ orders: 'orderId' });

// Render
async function syncAndRender() {
  const all = await ordersDB.query.all();
  await db.orders.bulkPut(all);
  renderOrders(await db.orders.toArray());
}
ordersDB.events.on('replicated', syncAndRender);
syncAndRender();

// Store order (called from your UI)
async function storeOrder(order) {
  await ordersDB.put(order, order.orderId);
  gorders.get(order.orderId).put(order);
}

// Search by email or name
const fuse = new Fuse(await db.orders.toArray(), {
  keys: ['shipping.email', 'shipping.recipient'],
  threshold: 0.3
});

function search(q) {
  return fuse.search(q).map(x => x.item);
}
