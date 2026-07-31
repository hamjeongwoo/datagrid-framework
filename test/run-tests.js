/* Node test runner for DataGrid's DOM-free data logic.
 * Run: node test/run-tests.js
 */
'use strict';

require('../dist/datagrid.js'); /* attaches DataGrid to globalThis */
var T = globalThis.DataGrid._test;

var passed = 0;
var failed = 0;

function assert(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL: ' + name); }
}
function assertEq(actual, expected, name) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a === e) { passed++; }
  else { failed++; console.error('  FAIL: ' + name + '\n    expected ' + e + '\n    actual   ' + a); }
}
function suite(name, fn) {
  console.log('• ' + name);
  fn();
}

/* ---------------- defaultComparator ---------------- */
suite('defaultComparator', function () {
  var c = T.defaultComparator;
  assert(c(1, 2) < 0, 'numbers ascending');
  assert(c(10, 2) > 0, 'numeric not lexicographic');
  assert(c('a', 'b') < 0, 'strings');
  assert(c('item10', 'item2') > 0, 'natural string ordering');
  assert(c(null, 'a') > 0, 'null sorts last');
  assert(c('a', undefined) < 0, 'undefined sorts last');
  assert(c(null, undefined) === 0, 'two blanks equal');
  assert(c(new Date(2020, 0, 1), new Date(2021, 0, 1)) < 0, 'dates');
  assert(c(true, false) < 0, 'true before false');
});

/* ---------------- sortRows ---------------- */
suite('sortRows', function () {
  var rows = [
    { name: 'Carol', age: 30 },
    { name: 'alice', age: 25 },
    { name: 'Bob', age: 30 },
  ];
  assertEq(
    T.sortRows(rows, [{ field: 'name', dir: 'asc' }]).map(function (r) { return r.name; }),
    ['alice', 'Bob', 'Carol'],
    'case-insensitive asc'
  );
  assertEq(
    T.sortRows(rows, [{ field: 'age', dir: 'desc' }, { field: 'name', dir: 'asc' }]).map(function (r) { return r.name; }),
    ['Bob', 'Carol', 'alice'],
    'multi-sort age desc then name asc'
  );
  assertEq(T.sortRows(rows, []).map(function (r) { return r.name; }), ['Carol', 'alice', 'Bob'], 'no sort keeps order');
  var original = rows.map(function (r) { return r.name; });
  T.sortRows(rows, [{ field: 'name', dir: 'asc' }]);
  assertEq(rows.map(function (r) { return r.name; }), original, 'input array not mutated');

  /* stability */
  var dup = [{ k: 1, tag: 'a' }, { k: 1, tag: 'b' }, { k: 0, tag: 'c' }];
  assertEq(
    T.sortRows(dup, [{ field: 'k', dir: 'asc' }]).map(function (r) { return r.tag; }),
    ['c', 'a', 'b'],
    'stable for equal keys'
  );

  /* custom comparator */
  var custom = T.sortRows(rows, [{ field: 'name', dir: 'asc' }], {
    name: function (a, b) { return a.length - b.length; },
  });
  assertEq(custom.map(function (r) { return r.name; }), ['Bob', 'Carol', 'alice'], 'custom comparator by length');
});

/* ---------------- text filter ---------------- */
suite('buildFilterPredicate (text)', function () {
  var rows = [{ v: 'Hello World' }, { v: 'goodbye' }, { v: null }];
  function run(model) {
    return rows.filter(T.buildFilterPredicate('v', model)).map(function (r) { return r.v; });
  }
  assertEq(run({ type: 'text', op: 'contains', value: 'world' }), ['Hello World'], 'contains, case-insensitive');
  assertEq(run({ type: 'text', op: 'notContains', value: 'o' }), [null], 'notContains');
  assertEq(run({ type: 'text', op: 'equals', value: 'GOODBYE' }), ['goodbye'], 'equals');
  assertEq(run({ type: 'text', op: 'notEqual', value: 'goodbye' }), ['Hello World', null], 'notEqual');
  assertEq(run({ type: 'text', op: 'startsWith', value: 'hell' }), ['Hello World'], 'startsWith');
  assertEq(run({ type: 'text', op: 'endsWith', value: 'bye' }), ['goodbye'], 'endsWith');
});

/* ---------------- number filter ---------------- */
suite('buildFilterPredicate (number)', function () {
  var rows = [{ n: 1 }, { n: 5 }, { n: 10 }, { n: null }, { n: 'x' }];
  function run(model) {
    return rows.filter(T.buildFilterPredicate('n', model)).map(function (r) { return r.n; });
  }
  assertEq(run({ type: 'number', op: 'equals', value: '5' }), [5], 'equals (string input coerced)');
  assertEq(run({ type: 'number', op: 'notEqual', value: 5 }), [1, 10], 'notEqual excludes blanks/NaN');
  assertEq(run({ type: 'number', op: 'lessThan', value: 5 }), [1], 'lessThan');
  assertEq(run({ type: 'number', op: 'lessThanOrEqual', value: 5 }), [1, 5], 'lessThanOrEqual');
  assertEq(run({ type: 'number', op: 'greaterThan', value: 5 }), [10], 'greaterThan');
  assertEq(run({ type: 'number', op: 'greaterThanOrEqual', value: 5 }), [5, 10], 'greaterThanOrEqual');
  assertEq(run({ type: 'number', op: 'inRange', value: 2, valueTo: 10 }), [5, 10], 'inRange inclusive');
});

/* ---------------- set filter ---------------- */
suite('buildFilterPredicate (set)', function () {
  var rows = [{ s: 'A' }, { s: 'B' }, { s: 'C' }];
  var p = T.buildFilterPredicate('s', { type: 'set', values: ['A', 'C'] });
  assertEq(rows.filter(p).map(function (r) { return r.s; }), ['A', 'C'], 'set membership');
  var none = T.buildFilterPredicate('s', { type: 'set', values: [] });
  assertEq(rows.filter(none).length, 0, 'empty set matches nothing');
});

/* ---------------- filterRows (AND across columns) ---------------- */
suite('filterRows', function () {
  var rows = [
    { name: 'Alice', age: 30 },
    { name: 'Albert', age: 50 },
    { name: 'Bob', age: 30 },
  ];
  var out = T.filterRows(rows, {
    name: { type: 'text', op: 'startsWith', value: 'al' },
    age: { type: 'number', op: 'equals', value: 30 },
  });
  assertEq(out.map(function (r) { return r.name; }), ['Alice'], 'AND across columns');
  assertEq(T.filterRows(rows, {}).length, 3, 'empty model returns all');
});

/* ---------------- quick filter ---------------- */
suite('quickFilterRows', function () {
  var rows = [
    { name: 'Alice', city: 'Seoul' },
    { name: 'Bob', city: 'Busan' },
    { name: 'Carol', city: 'Seoul' },
  ];
  var fields = ['name', 'city'];
  assertEq(T.quickFilterRows(rows, 'seoul', fields).length, 2, 'matches any field');
  assertEq(T.quickFilterRows(rows, 'bob busan', fields).length, 1, 'all terms must match (AND)');
  assertEq(T.quickFilterRows(rows, 'bob seoul', fields).length, 0, 'terms across different rows do not match');
  assertEq(T.quickFilterRows(rows, '  ', fields).length, 3, 'blank text returns all');
});

/* ---------------- pagination ---------------- */
suite('paginate', function () {
  var p = T.paginate(103, 20, 0);
  assertEq([p.page, p.pageCount, p.start, p.end, p.firstRow, p.lastRow], [0, 6, 0, 20, 1, 20], 'first page');
  p = T.paginate(103, 20, 5);
  assertEq([p.start, p.end, p.firstRow, p.lastRow], [100, 103, 101, 103], 'last partial page');
  p = T.paginate(103, 20, 99);
  assertEq(p.page, 5, 'page clamped to last');
  p = T.paginate(0, 20, 0);
  assertEq([p.pageCount, p.firstRow, p.lastRow, p.total], [1, 0, 0, 0], 'empty data');
});

suite('pageButtonModel', function () {
  assertEq(T.pageButtonModel(5, 0), [0, 1, 2, 3, 4], 'few pages: all buttons');
  var m = T.pageButtonModel(20, 10);
  assert(m[0] === 0 && m[m.length - 1] === 19, 'always includes first and last');
  assert(m.indexOf(10) !== -1, 'includes current page');
  assert(m.indexOf('…') !== -1, 'uses ellipsis for gaps');
});

/* ---------------- CSV ---------------- */
suite('csv', function () {
  assertEq(T.csvEscape('plain'), 'plain', 'no quoting needed');
  assertEq(T.csvEscape('a,b'), '"a,b"', 'comma quoted');
  assertEq(T.csvEscape('say "hi"'), '"say ""hi"""', 'quotes doubled');
  assertEq(T.csvEscape('line1\nline2'), '"line1\nline2"', 'newline quoted');
  assertEq(T.csvEscape(null), '', 'null becomes empty');

  var csv = T.buildCsv(
    [{ name: 'Kim, Minsoo', amount: 1200 }],
    [
      { field: 'name', headerName: 'Name' },
      { field: 'amount', headerName: 'Amount', valueFormatter: function (v) { return '$' + v; } },
    ]
  );
  assertEq(csv, 'Name,Amount\r\n"Kim, Minsoo",$1200', 'header + formatted + escaped row');
});

/* ---------------- column normalization ---------------- */
suite('normalizeColumns', function () {
  var cols = T.normalizeColumns(
    [{ field: 'a' }, { field: 'b', sortable: false, filter: true }],
    { width: 200 }
  );
  assertEq(cols[0].width, 200, 'defaultColDef applied');
  assertEq(cols[0].sortable, true, 'built-in defaults applied');
  assertEq(cols[1].sortable, false, 'colDef overrides default');
  assertEq(cols[1].filter, 'text', 'filter:true normalized to text');
  assertEq(cols[0].colId, 'a', 'colId falls back to field');
});

/* ---------------- escapeHtml ---------------- */
suite('escapeHtml', function () {
  assertEq(
    T.escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    'html special chars escaped'
  );
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
