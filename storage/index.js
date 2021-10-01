const Database = require("quick-store");

module.exports = {
  count: createDatabase("count"),
  users: createDatabase("users"),
};

function createDatabase(name) {
  const db = new Database(`${__dirname}/${name}.json`);
  return {
    get: (key = null) => new Promise(resolve => key ? db.getItem(key, resolve) : db.get(resolve)),
    set: (key, value) => new Promise(resolve => db.setItem(key, value, resolve)),
    add: (key, value) => new Promise(resolve => db.getItem(key, current => db.setItem(key, (current || 0) + value, resolve))),
    put: (obj) => new Promise(resolve => db.put(obj, resolve)),
  };
}