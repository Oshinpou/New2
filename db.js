// db.js – Global GunDB Manager
import Gun from 'https://cdn.jsdelivr.net/npm/gun/gun.js';
import 'https://cdn.jsdelivr.net/npm/gun/sea.js';
import 'https://cdn.jsdelivr.net/npm/gun/lib/radix.js';
import 'https://cdn.jsdelivr.net/npm/gun/lib/radisk.js';
import 'https://cdn.jsdelivr.net/npm/gun/lib/store.js';
import 'https://cdn.jsdelivr.net/npm/gun/lib/rindexed.js';

export const DB = (() => {
  const gunInstances = {};
  let gun = null;

  const init = (relayURL = '/gun', options = {}) => {
    gun = Gun({
      peers: [relayURL],
      localStorage: true,
      radisk: true,
      ...options,
    });
    console.log('GunDB Initialized at:', relayURL);
  };

  const validateData = (data) => {
    return typeof data === 'object' && data !== null && !Array.isArray(data);
  };

  const use = (namespace) => {
    if (!gun) throw new Error('GunDB not initialized. Call DB.init() first.');
    if (!gunInstances[namespace]) {
      gunInstances[namespace] = gun.get(namespace);
    }

    const dbRef = gunInstances[namespace];

    return {
      save: (key, data) => {
        return new Promise((resolve, reject) => {
          if (!validateData(data)) return reject('Invalid data structure');
          dbRef.get(key).put(data, (ack) => {
            if (ack.err) reject(ack.err);
            else resolve(ack);
          });
        });
      },

      read: (key) => {
        return new Promise((resolve) => {
          dbRef.get(key).once((data) => {
            if (!data || data._) return resolve(null); // ignore metadata
            resolve(data);
          });
        });
      },

      update: (key, changes) => {
        return new Promise((resolve, reject) => {
          dbRef.get(key).once((oldData) => {
            if (!oldData) return reject('Data not found');
            const newData = { ...oldData, ...changes };
            dbRef.get(key).put(newData, (ack) => {
              if (ack.err) reject(ack.err);
              else resolve(newData);
            });
          });
        });
      },

      delete: (key) => {
        return new Promise((resolve, reject) => {
          dbRef.get(key).put(null, (ack) => {
            if (ack.err) reject(ack.err);
            else resolve(true);
          });
        });
      },

      listAll: () => {
        return new Promise((resolve) => {
          const allData = {};
          dbRef.map().once((data, key) => {
            if (data && data !== null && !data._) {
              allData[key] = data;
            }
          });
          setTimeout(() => resolve(allData), 1000); // Allow map to finish
        });
      },

      onChange: (callback) => {
        dbRef.map().on((data, key) => {
          if (data && data !== null && !data._) {
            callback(key, data);
          }
        });
      },

      listenKey: (key, callback) => {
        dbRef.get(key).on((data) => {
          if (data && data !== null && !data._) {
            callback(data);
          }
        });
      },
    };
  };

  return { init, use };
})();
