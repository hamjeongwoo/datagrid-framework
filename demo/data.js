/* Demo data generator (deterministic — seeded PRNG, no Math.random). */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var FIRST = ['Aiden', 'Bella', 'Chris', 'Dana', 'Eli', 'Fiona', 'Grace', 'Hana', 'Ian', 'Jisoo',
    'Kai', 'Luna', 'Minho', 'Nari', 'Owen', 'Priya', 'Quinn', 'Ravi', 'Sana', 'Theo',
    'Uma', 'Victor', 'Wendy', 'Xander', 'Yuna', 'Zane'];
  var LAST = ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Smith', 'Johnson', 'Garcia', 'Chen', 'Tanaka',
    'Muller', 'Rossi', 'Silva', 'Novak', 'Haddad', 'Okafor'];
  var DEPTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'Support'];
  var CITIES = ['Seoul', 'Tokyo', 'New York', 'London', 'Berlin', 'Singapore', 'Sydney', 'Toronto'];
  var STATUS = ['Active', 'On Leave', 'Contract', 'Inactive'];
  var PRODUCTS = ['Aurora Desk', 'Nimbus Chair', 'Quartz Lamp', 'Vertex Monitor', 'Echo Keyboard',
    'Pulse Mouse', 'Orbit Hub', 'Slate Tablet', 'Flux Cable', 'Nova Stand'];

  function makeEmployees(count, seed) {
    var rnd = mulberry32(seed || 42);
    var rows = [];
    for (var i = 0; i < count; i++) {
      var first = FIRST[Math.floor(rnd() * FIRST.length)];
      var last = LAST[Math.floor(rnd() * LAST.length)];
      var year = 2015 + Math.floor(rnd() * 11);
      var month = 1 + Math.floor(rnd() * 12);
      var day = 1 + Math.floor(rnd() * 28);
      rows.push({
        id: i + 1,
        name: first + ' ' + last,
        email: (first + '.' + last).toLowerCase() + '@example.com',
        department: DEPTS[Math.floor(rnd() * DEPTS.length)],
        city: CITIES[Math.floor(rnd() * CITIES.length)],
        status: STATUS[Math.floor(rnd() * STATUS.length)],
        salary: 42000 + Math.floor(rnd() * 1180) * 100,
        rating: Math.round(rnd() * 40 + 10) / 10,
        progress: Math.floor(rnd() * 101),
        remote: rnd() > 0.55,
        hireDate: year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day,
      });
    }
    return rows;
  }

  function makeOrders(count, seed) {
    var rnd = mulberry32(seed || 7);
    var rows = [];
    for (var i = 0; i < count; i++) {
      var qty = 1 + Math.floor(rnd() * 12);
      var price = 9 + Math.floor(rnd() * 490);
      rows.push({
        orderId: 'ORD-' + String(10000 + i),
        product: PRODUCTS[Math.floor(rnd() * PRODUCTS.length)],
        customer: FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)],
        quantity: qty,
        unitPrice: price,
        total: qty * price,
        paid: rnd() > 0.3,
        status: ['Delivered', 'Shipped', 'Processing', 'Cancelled'][Math.floor(rnd() * 4)],
      });
    }
    return rows;
  }

  global.DemoData = { makeEmployees: makeEmployees, makeOrders: makeOrders };
})(window);
