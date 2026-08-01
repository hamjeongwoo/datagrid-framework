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

/* ---------------- clipboard TSV ---------------- */
suite('buildTsv', function () {
  var cols = [{ field: 'a' }, { field: 'b' }];
  assertEq(T.buildTsv([{ a: 1, b: 'x' }, { a: 2, b: 'y' }], cols), '1\tx\r\n2\ty', 'rows joined with CRLF, cells with tab');
  assertEq(T.buildTsv([{ a: null, b: undefined }], cols), '\t', 'null/undefined become empty');
  assertEq(T.buildTsv([{ a: 'has\ttab', b: 'has"quote' }], cols), '"has\ttab"\t"has""quote"', 'tab/quote cells quoted, quotes doubled');
  assertEq(T.buildTsv([{ a: 'line1\nline2', b: 'ok' }], cols), '"line1\nline2"\tok', 'newline cell quoted');
  assertEq(
    T.buildTsv([{ a: 52000, b: 'raw' }], [{ field: 'a', valueFormatter: function (v) { return '$' + v; } }]),
    '52000',
    'raw values, no formatter (roundtrip/spreadsheet friendly)'
  );
});

suite('parseTsv', function () {
  assertEq(T.parseTsv('1\tx\r\n2\ty'), [['1', 'x'], ['2', 'y']], 'CRLF rows');
  assertEq(T.parseTsv('1\tx\n2\ty'), [['1', 'x'], ['2', 'y']], 'LF rows');
  assertEq(T.parseTsv('a\tb\n'), [['a', 'b']], 'trailing newline does not add an empty row');
  assertEq(T.parseTsv('solo'), [['solo']], 'single cell');
  assertEq(T.parseTsv('"has\ttab"\tplain'), [['has\ttab', 'plain']], 'quoted cell with tab');
  assertEq(T.parseTsv('"line1\nline2"\tok'), [['line1\nline2', 'ok']], 'quoted cell with newline');
  assertEq(T.parseTsv('"say ""hi"""\tx'), [['say "hi"', 'x']], 'doubled quotes unescaped');
  assertEq(T.parseTsv('a\t\tb'), [['a', '', 'b']], 'empty middle cell');
  assertEq(T.parseTsv(''), [['']], 'empty text is one empty cell');

  /* 왕복: buildTsv → parseTsv */
  var cols = [{ field: 'a' }, { field: 'b' }];
  var rows = [{ a: 'x\ty', b: 'q"z' }, { a: 'line\nbreak', b: 'end' }];
  assertEq(
    T.parseTsv(T.buildTsv(rows, cols)),
    [['x\ty', 'q"z'], ['line\nbreak', 'end']],
    'roundtrip preserves special characters'
  );
});

/* ---------------- validation message ---------------- */
suite('validationMessage', function () {
  var v = T.validationMessage;
  assertEq(v(true), null, 'true is valid');
  assertEq(v(undefined), null, 'undefined is valid (validator with no return)');
  assertEq(v(null), null, 'null is valid');
  assertEq(v('급여는 0 이상이어야 합니다'), '급여는 0 이상이어야 합니다', 'string is the error message');
  assertEq(v(false), 'Invalid value', 'false rejects with default message');
  assertEq(v(''), 'Invalid value', 'empty string rejects with default message');
  assertEq(v(0), 'Invalid value', 'other falsy values reject with default message');
});

suite('normalizeEditorOptions', function () {
  var n = T.normalizeEditorOptions;
  assertEq(n(undefined), [], 'undefined → empty');
  assertEq(n(null), [], 'null → empty');
  assertEq(n('kr'), [], 'non-array → empty');
  assertEq(n(['kr', 'jp']), [
    { label: 'kr', value: 'kr' }, { label: 'jp', value: 'jp' },
  ], 'string entries: label = value');
  assertEq(n([{ label: '한국', value: 'kr' }, { label: '일본', value: 'jp' }]), [
    { label: '한국', value: 'kr' }, { label: '일본', value: 'jp' },
  ], 'object entries keep label/value');
  assertEq(n([{ value: 'kr' }]), [{ label: 'kr', value: 'kr' }], 'missing label falls back to value');
  assertEq(n([{ label: '한국' }]), [{ label: '한국', value: '한국' }], 'missing value falls back to label');
  assertEq(n([{ label: '열', value: 10 }]), [{ label: '열', value: 10 }], 'value keeps its original type');
  assertEq(n(['kr', null, undefined, { label: '일본', value: 'jp' }, {}]), [
    { label: 'kr', value: 'kr' }, { label: '일본', value: 'jp' },
  ], 'null/undefined/empty-object entries are skipped');
  assertEq(n([0, '']), [
    { label: '0', value: 0 }, { label: '', value: '' },
  ], 'falsy primitives (0, empty string) are kept');
});

suite('filterEditorOptions', function () {
  var f = T.filterEditorOptions;
  var opts = [
    { label: '한국', value: 'kr' }, { label: '일본', value: 'jp' },
    { label: 'United States', value: 'us' }, { label: 'United Kingdom', value: 'uk' },
  ];
  assertEq(f(opts, ''), T.normalizeEditorOptions(opts), 'empty query → all');
  assertEq(f(opts, '   '), T.normalizeEditorOptions(opts), 'blank query → all');
  assertEq(f(opts, null), T.normalizeEditorOptions(opts), 'null query → all');
  assertEq(f(opts, undefined), T.normalizeEditorOptions(opts), 'undefined query → all');
  assertEq(f(opts, 'united'), [
    { label: 'United States', value: 'us' }, { label: 'United Kingdom', value: 'uk' },
  ], 'label contains, case-insensitive');
  assertEq(f(opts, 'KING'), [{ label: 'United Kingdom', value: 'uk' }], 'uppercase query matches');
  assertEq(f(opts, '한국'), [{ label: '한국', value: 'kr' }], 'korean label matches');
  assertEq(f(opts, 'kr'), [{ label: '한국', value: 'kr' }], 'value string also matches');
  assertEq(f(opts, 'zzz'), [], 'no match → empty');
  assertEq(f(['Seoul', 'Tokyo'], 'seo'), [{ label: 'Seoul', value: 'Seoul' }], 'string options filtered');
  assertEq(f([{ label: '열', value: 10 }, { label: '백', value: 100 }], '10'), [
    { label: '열', value: 10 }, { label: '백', value: 100 },
  ], 'numeric value stringified for matching');
  assertEq(f(undefined, 'a'), [], 'no options → empty');
  assertEq(f(opts, ' united '), [
    { label: 'United States', value: 'us' }, { label: 'United Kingdom', value: 'uk' },
  ], 'query is trimmed');
});

suite('lookupOptionLabel', function () {
  var l = T.lookupOptionLabel;
  var opts = [{ label: '한국', value: 'kr' }, { label: '일본', value: 'jp' }];
  assertEq(l(opts, 'kr'), '한국', 'value → label');
  assertEq(l(opts, 'us'), null, 'unknown value → null');
  assertEq(l(opts, null), null, 'null value → null');
  assertEq(l(opts, undefined), null, 'undefined value → null');
  assertEq(l(undefined, 'kr'), null, 'no options → null');
  assertEq(l(['kr', 'jp'], 'kr'), 'kr', 'string options: label = value');
  var nums = [{ label: 'Junior', value: 1 }, { label: 'Senior', value: 3 }];
  assertEq(l(nums, 1), 'Junior', 'number value strict match');
  assertEq(l(nums, '3'), 'Senior', 'stringified number matches loosely (via select.value)');
  var zero = [{ label: '없음', value: 0 }, { label: '빈 값', value: '' }];
  assertEq(l(zero, 0), '없음', 'falsy value 0 matches');
  assertEq(l(zero, ''), '빈 값', 'falsy value empty-string matches');
  assertEq(l([{ label: '영', value: 0 }, { label: '문자영', value: '0' }], '0'),
    '문자영', 'strict match wins before loose stringified match');
});

suite('isCheckedValue', function () {
  var c = T.isCheckedValue;
  /* 매핑 없음 — 관용 표기 */
  assertEq(c(true), true, 'true → checked');
  assertEq(c(false), false, 'false → unchecked');
  assertEq(c(1), true, '1 → checked');
  assertEq(c(0), false, '0 → unchecked');
  assertEq(c('Y'), true, "'Y' → checked");
  assertEq(c('n'), false, "'n' → unchecked (case-insensitive)");
  assertEq(c('yes'), true, "'yes' → checked");
  assertEq(c('FALSE'), false, "'FALSE' → unchecked");
  assertEq(c('0'), false, "'0' string → unchecked");
  assertEq(c('1'), true, "'1' string → checked");
  assertEq(c(''), false, 'empty string → unchecked');
  assertEq(c(null), false, 'null → unchecked');
  assertEq(c(undefined), false, 'undefined → unchecked');
  assertEq(c('anything'), true, 'other truthy string → checked');
  /* 매핑 있음 — checked 값과의 일치로만 판정 */
  var yn = { checked: 'Y', unchecked: 'N' };
  assertEq(c('Y', yn), true, "mapping: 'Y' matches checked");
  assertEq(c('N', yn), false, "mapping: 'N' → unchecked");
  assertEq(c('yes', yn), false, "mapping: 'yes' is not checked value");
  assertEq(c(null, yn), false, 'mapping: null → unchecked');
  var num = { checked: 1, unchecked: 0 };
  assertEq(c(1, num), true, 'mapping: number 1 strict match');
  assertEq(c('1', num), true, "mapping: '1' matches via stringified compare");
  assertEq(c(0, num), false, 'mapping: 0 → unchecked');
  /* 배열 editorOptions(select용)가 넘어와도 매핑으로 오인하지 않음 */
  assertEq(c('Y', ['Y', 'N']), true, 'array opts ignored → lenient rules apply');
});

suite('normalizeMultiValue', function () {
  var n = T.normalizeMultiValue;
  assertEq(n(['a', 'b']), ['a', 'b'], 'array passes through');
  assertEq(n([]), [], 'empty array passes through');
  assertEq(n(null), [], 'null → empty');
  assertEq(n(undefined), [], 'undefined → empty');
  assertEq(n('a'), ['a'], 'single value wrapped');
  assertEq(n(0), [0], 'falsy single value (0) wrapped');
  assertEq(n(''), [''], 'falsy single value (empty string) wrapped');
});

suite('shallowArrayEquals', function () {
  var eq = T.shallowArrayEquals;
  assertEq(eq(['a', 'b'], ['a', 'b']), true, 'same elements/order');
  assertEq(eq([], []), true, 'empty arrays equal');
  assertEq(eq(['a', 'b'], ['b', 'a']), false, 'order matters');
  assertEq(eq(['a'], ['a', 'b']), false, 'length differs');
  assertEq(eq([1], ['1']), false, 'strict comparison (1 vs "1")');
  assertEq(eq(null, []), false, 'null vs empty array');
  assertEq(eq('a', ['a']), false, 'non-array vs array');
});

suite('lookupOptionLabels', function () {
  var l = T.lookupOptionLabels;
  var opts = [{ label: 'JS', value: 'js' }, { label: 'CSS', value: 'css' }, { label: '레벨3', value: 3 }];
  assertEq(l(opts, ['js', 'css']), ['JS', 'CSS'], 'values → labels, order kept');
  assertEq(l(opts, []), [], 'empty array → empty');
  assertEq(l(opts, null), [], 'null → empty');
  assertEq(l(opts, 'js'), ['JS'], 'single value normalized to array');
  assertEq(l(opts, ['js', 'xx']), ['JS', 'xx'], 'unknown value falls back to String(value)');
  assertEq(l(opts, [3]), ['레벨3'], 'number value matched');
  assertEq(l(opts, ['js', null, 'css']), ['JS', 'CSS'], 'null entries skipped');
  assertEq(l(undefined, ['js']), ['js'], 'no options → raw strings');
});

/* ---------------- floating filter model ---------------- */
suite('buildFloatingFilterModel', function () {
  var f = T.buildFloatingFilterModel;
  assertEq(f('text', null, null), null, 'null raw clears filter');
  assertEq(f('text', '  ', null), null, 'blank text clears filter');
  assertEq(f('number', '', null), null, 'empty number clears filter');
  assertEq(f('text', 'abc', null), { type: 'text', op: 'contains', value: 'abc' }, 'text defaults to contains');
  assertEq(
    f('text', 'abc', { type: 'text', op: 'startsWith', value: 'a' }),
    { type: 'text', op: 'startsWith', value: 'abc' },
    'existing text op preserved'
  );
  assertEq(f('number', '42', null), { type: 'number', op: 'equals', value: '42' }, 'number defaults to equals');
  assertEq(
    f('number', '42', { type: 'number', op: 'greaterThan', value: '1' }),
    { type: 'number', op: 'greaterThan', value: '42' },
    'existing number op preserved'
  );
  assertEq(
    f('number', '42', { type: 'number', op: 'inRange', value: '1', valueTo: '9' }).op,
    'equals',
    'inRange not expressible in single input -> equals'
  );
  assertEq(f('set', 'Sales', null), { type: 'set', values: ['Sales'] }, 'set single value');
  assertEq(f('set', '', null), { type: 'set', values: [''] }, 'set blank value is a real filter');
  assertEq(f('set', null, null), null, 'set null clears filter');
});

/* ---------------- aggregation ---------------- */
suite('aggregateValues', function () {
  var rows = [{ v: 10 }, { v: 20 }, { v: 30 }, { v: null }, { v: '' }, { v: 'abc' }];
  assertEq(T.aggregateValues(rows, 'v', 'sum'), 60, 'sum skips null/blank/NaN');
  assertEq(T.aggregateValues(rows, 'v', 'avg'), 20, 'avg over numeric values only');
  assertEq(T.aggregateValues(rows, 'v', 'min'), 10, 'min');
  assertEq(T.aggregateValues(rows, 'v', 'max'), 30, 'max');
  assertEq(T.aggregateValues(rows, 'v', 'count'), 6, 'count includes every row');
  assertEq(T.aggregateValues([{ v: '5' }, { v: '7' }], 'v', 'sum'), 12, 'numeric strings coerced');
  assertEq(T.aggregateValues([{ v: null }, { v: 'x' }], 'v', 'sum'), null, 'no numeric values -> null');
  assertEq(T.aggregateValues([], 'v', 'sum'), null, 'empty rows -> null');
  assertEq(T.aggregateValues([], 'v', 'count'), 0, 'empty rows count 0');
  assertEq(T.aggregateValues([{ v: -5 }, { v: 3 }], 'v', 'min'), -5, 'negative min');
});

/* ---------------- row grouping ---------------- */
suite('buildGroupView', function () {
  var rows = [
    { dept: 'Sales', team: 'A', pay: 100 },
    { dept: 'Dev', team: 'X', pay: 300 },
    { dept: 'Sales', team: 'B', pay: 200 },
    { dept: 'Dev', team: 'X', pay: 500 },
  ];
  var expandAll = function () { return true; };
  var collapseAll = function () { return false; };

  assertEq(T.buildGroupView(rows, [], expandAll).length, 4, 'no group fields returns rows as-is');

  /* single level, all expanded */
  var out = T.buildGroupView(rows, ['dept'], expandAll, [{ field: 'pay', aggFunc: 'sum' }]);
  assertEq(out.length, 6, '2 group headers + 4 leaves');
  assertEq(out[0].__group, true, 'first item is a group header');
  assertEq([out[0].value, out[0].leafCount, out[0].agg.pay], ['Sales', 2, 300], 'Sales group: first-seen order, count, sum');
  assertEq(out[1].team, 'A', 'leaves follow their group header');
  assertEq([out[3].value, out[3].agg.pay], ['Dev', 800], 'Dev group aggregate');

  /* collapsed: leaves hidden, aggregates still computed */
  var closed = T.buildGroupView(rows, ['dept'], collapseAll, [{ field: 'pay', aggFunc: 'sum' }]);
  assertEq(closed.length, 2, 'collapsed groups hide leaves');
  assertEq(closed[0].expanded, false, 'expanded flag false');
  assertEq(closed[1].agg.pay, 800, 'aggregate computed over hidden children');

  /* selective expansion by path */
  var partial = T.buildGroupView(rows, ['dept'], function (path) {
    return path.indexOf('Dev') !== -1;
  });
  assertEq(partial.length, 4, 'only Dev group expanded (2 headers + 2 leaves)');

  /* two levels */
  var nested = T.buildGroupView(rows, ['dept', 'team'], expandAll, [{ field: 'pay', aggFunc: 'count' }]);
  var kinds = nested.map(function (it) { return it.__group ? 'g' + it.level : 'r'; });
  assertEq(kinds, ['g0', 'g1', 'r', 'g1', 'r', 'g0', 'g1', 'r', 'r'], 'nested group/leaf layout');
  var teamX = nested.filter(function (it) { return it.__group && it.value === 'X'; })[0];
  assertEq([teamX.level, teamX.leafCount, teamX.agg.pay], [1, 2, 2], 'child group level/count/agg');
  assert(teamX.path.indexOf('Dev') !== -1 && teamX.path.indexOf('team:X') !== -1, 'path includes ancestry');

  /* non-contiguous values still form one group (bucketing, not run-length) */
  assertEq(
    T.buildGroupView(rows, ['dept'], expandAll).filter(function (it) { return it.__group; }).length,
    2,
    'interleaved rows produce one group per value'
  );

  /* null group values */
  var withNull = T.buildGroupView([{ dept: null, pay: 1 }, { dept: null, pay: 2 }], ['dept'], expandAll);
  assertEq([withNull[0].value, withNull[0].leafCount], [null, 2], 'null values grouped together, value preserved');

  /* input not mutated */
  assertEq(rows.length, 4, 'input rows untouched');
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

/* ---------------- applyValueGetters ---------------- */
suite('applyValueGetters', function () {
  var rows = [
    { qty: 2, price: 100 },
    { qty: 3, price: 50 },
  ];
  var cols = [
    { field: 'qty' },
    { field: 'total', valueGetter: function (r) { return r.qty * r.price; } },
  ];
  var out = T.applyValueGetters(rows, cols);
  assert(out === rows, 'returns same array');
  assertEq(rows[0].total, 200, 'derived value written to row');
  assertEq(rows[1].total, 150, 'second row derived');

  /* getter가 기존 필드를 덮어쓸 수도 있다 */
  T.applyValueGetters(rows, [{ field: 'qty', valueGetter: function (r) { return r.qty + 10; } }]);
  assertEq(rows[0].qty, 12, 'getter can overwrite existing field');

  /* 예외는 해당 셀만 건너뛴다 */
  var errRows = [{ a: 1 }, { a: 2 }];
  var origError = console.error;
  console.error = function () {};
  T.applyValueGetters(errRows, [{
    field: 'b',
    valueGetter: function (r) { if (r.a === 1) throw new Error('boom'); return r.a * 2; },
  }]);
  console.error = origError;
  assertEq(errRows[0].b, undefined, 'failing getter leaves value unset');
  assertEq(errRows[1].b, 4, 'other rows still computed');

  /* field 없는 getter·getter 없는 컬럼은 무시 */
  var same = [{ x: 1 }];
  T.applyValueGetters(same, [{ valueGetter: function () { return 9; } }, { field: 'x' }]);
  assertEq(same, [{ x: 1 }], 'no field or no getter → untouched');
});

/* ---------------- xlsx export (crc32 / makeZip / worksheet) ---------------- */
suite('xlsx export', function () {
  var enc = new TextEncoder();
  assertEq(T.crc32(enc.encode('')), 0, 'crc32 of empty');
  assertEq(T.crc32(enc.encode('abc')).toString(16), '352441c2', 'crc32 known value');
  assertEq(T.crc32(enc.encode('123456789')).toString(16), 'cbf43926', 'crc32 check value');

  var zip = T.makeZip([{ name: 'a.txt', data: 'hello' }, { name: 'dir/b.xml', data: '<x/>' }]);
  function u32At(off) {
    return (zip[off] | (zip[off + 1] << 8) | (zip[off + 2] << 16) | (zip[off + 3] << 24)) >>> 0;
  }
  assertEq(u32At(0).toString(16), '4034b50', 'local file header signature');
  assertEq(u32At(zip.length - 22).toString(16), '6054b50', 'end of central directory signature');
  var entryCount = zip[zip.length - 22 + 10] | (zip[zip.length - 22 + 11] << 8);
  assertEq(entryCount, 2, 'EOCD entry count');
  /* 첫 파일 데이터가 STORE로 그대로 들어간다: 헤더 30바이트 + 이름 5바이트 뒤 */
  var text = String.fromCharCode.apply(null, zip.slice(35, 40));
  assertEq(text, 'hello', 'stored data intact');

  var xml = T.buildWorksheetXml(
    [{ n: 42.5, s: 'a<b', b: true, x: null }],
    [{ field: 'n', headerName: 'Num' }, { field: 's', headerName: 'Str' },
     { field: 'b', headerName: 'Bool' }, { field: 'x', headerName: 'Nil' }]
  );
  assert(xml.indexOf('<c t="n"><v>42.5</v></c>') !== -1, 'number as numeric cell');
  assert(xml.indexOf('a&lt;b') !== -1, 'string xml-escaped');
  assert(xml.indexOf('<c t="b"><v>1</v></c>') !== -1, 'boolean cell');
  assert(xml.indexOf('<c/>') !== -1, 'null → empty cell');
  assert(xml.indexOf('<t xml:space="preserve">Num</t>') !== -1, 'header row present');

  var fmtXml = T.buildWorksheetXml(
    [{ n: 5 }],
    [{ field: 'n', headerName: 'N', valueFormatter: function (v) { return '$' + v; } }]
  );
  assert(fmtXml.indexOf('$5') !== -1 && fmtXml.indexOf('<c t="n">') === -1, 'formatter output as string cell');

  var parts = T.buildXlsxParts([], [{ field: 'a', headerName: 'A' }], 'My "Sheet"');
  assertEq(parts.map(function (p) { return p.name; }), [
    '[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml',
  ], 'xlsx part names');
  assert(parts[2].data.indexOf('name="My &quot;Sheet&quot;"') !== -1, 'sheet name escaped');
});

/* ---------------- computeRowTops / findRowAtOffset ---------------- */
suite('computeRowTops / findRowAtOffset', function () {
  var items = [
    { id: 1 },
    { __detail: true, row: { id: 1 } },
    { id: 2 },
    { id: 3 },
    { __detail: true, row: { id: 3 } },
  ];
  var layout = T.computeRowTops(items, 40, 200);
  assertEq(layout.tops, [0, 40, 240, 280, 320], 'tops accumulate mixed heights');
  assertEq(layout.total, 520, 'total height');
  assertEq(layout.ordinals, [0, 1, 1, 2, 3], 'ordinals skip detail rows');

  var empty = T.computeRowTops([], 40, 200);
  assertEq(empty.tops, [], 'empty items');
  assertEq(empty.total, 0, 'empty total');

  var tops = layout.tops;
  assertEq(T.findRowAtOffset(tops, 0), 0, 'offset 0 → first row');
  assertEq(T.findRowAtOffset(tops, 39), 0, 'inside first row');
  assertEq(T.findRowAtOffset(tops, 40), 1, 'boundary → detail row');
  assertEq(T.findRowAtOffset(tops, 239), 1, 'inside tall detail row');
  assertEq(T.findRowAtOffset(tops, 240), 2, 'after detail');
  assertEq(T.findRowAtOffset(tops, 9999), 4, 'beyond end → last row');
  assertEq(T.findRowAtOffset([], 100), 0, 'empty tops → 0');
});

/* ---------------- buildDataSourceRequest / parseDataSourceResponse ---------------- */
suite('dataSource request/response', function () {
  var state = {
    pagination: true,
    page: 2,
    pageSize: 25,
    sortModel: [{ field: 'name', dir: 'asc' }],
    filterModel: { city: { type: 'text', op: 'contains', value: 'Seo' } },
    quickFilter: 'kim',
    sortMode: 'server',
    filterMode: 'server',
    pageMode: 'server',
  };

  var req = T.buildDataSourceRequest({ url: '/api/emp' }, state);
  assertEq(req.method, 'GET', 'default method GET');
  assert(req.url.indexOf('/api/emp?') === 0, 'query string appended');
  assert(req.url.indexOf('page=2') !== -1 && req.url.indexOf('pageSize=25') !== -1, 'server paging params');
  assert(req.url.indexOf('sort=') !== -1, 'server sort param');
  assert(req.url.indexOf('filter=') !== -1 && req.url.indexOf('quickFilter=kim') !== -1, 'server filter params');
  assert(req.body === null, 'GET has no body');

  var clientState = {
    pagination: true, page: 2, pageSize: 25,
    sortModel: state.sortModel, filterModel: state.filterModel, quickFilter: 'kim',
    sortMode: 'client', filterMode: 'client', pageMode: 'client',
  };
  var req2 = T.buildDataSourceRequest({ url: '/api/emp' }, clientState);
  assertEq(req2.url, '/api/emp', 'client modes send no state params');

  var req3 = T.buildDataSourceRequest(
    { url: '/api/emp', method: 'post', params: { dept: 'eng' } },
    state
  );
  assertEq(req3.method, 'POST', 'method uppercased');
  assertEq(req3.url, '/api/emp', 'POST keeps url clean');
  var body = JSON.parse(req3.body);
  assertEq(body.dept, 'eng', 'static params merged');
  assertEq(body.page, 2, 'state params in body');

  var req4 = T.buildDataSourceRequest(
    { url: '/api/emp?v=1', params: function () { return { token: 'abc' }; } },
    clientState
  );
  assert(req4.url.indexOf('/api/emp?v=1&token=abc') === 0, 'function params + existing query string');

  var emptySort = T.buildDataSourceRequest({ url: '/x' }, {
    pagination: false, sortModel: [], filterModel: {}, quickFilter: '',
    sortMode: 'server', filterMode: 'server', pageMode: 'server',
  });
  assertEq(emptySort.url, '/x', 'empty sort/filter omitted from params');

  /* ---- request 훅 (v2.5 — 서버 스펙 맞춤 커스텀 파라미터 빌더) ---- */
  var seen = null;
  var req5 = T.buildDataSourceRequest({
    url: '/api/v2',
    params: { fixed: 'yes' },
    request: function (s) {
      seen = s;
      return {
        offset: s.page * s.pageSize,
        limit: s.pageSize,
        orderBy: s.sortModel.length ? s.sortModel[0].field + ':' + s.sortModel[0].dir : undefined,
        q: s.quickFilter || undefined,
      };
    },
  }, state);
  assert(req5.url.indexOf('offset=50') !== -1 && req5.url.indexOf('limit=25') !== -1, 'request hook custom paging params');
  assert(req5.url.indexOf('orderBy=name%3Aasc') !== -1, 'request hook custom sort format');
  assert(req5.url.indexOf('fixed=yes') !== -1, 'params base still merged under request hook');
  assert(req5.url.indexOf('page=') === -1 && req5.url.indexOf('sort=') === -1, 'default mapping replaced by request hook');
  assertEq(seen.page, 2, 'request state: page');
  assertEq(seen.quickFilter, 'kim', 'request state: quickFilter');
  assertEq(seen.sortMode, 'server', 'request state: modes');

  var req6 = T.buildDataSourceRequest({
    url: '/api/v2',
    request: function () { return { q: undefined, keep: 'k' }; },
  }, state);
  assert(req6.url.indexOf('q=') === -1 && req6.url.indexOf('keep=k') !== -1, 'undefined values omitted (conditional params)');

  var origErr = console.error;
  console.error = function () {};
  try {
    var req7 = T.buildDataSourceRequest({
      url: '/api/v2',
      request: function () { throw new Error('boom'); },
    }, state);
    assert(req7.url.indexOf('page=2') !== -1, 'request hook exception → default mapping fallback');
    var req8 = T.buildDataSourceRequest({
      url: '/x',
      params: function () { throw new Error('boom'); },
      headers: function () { throw new Error('boom'); },
    }, state);
    assert(req8.url.indexOf('page=2') !== -1, 'params exception → state params still applied');
    assertEq(req8.headers, null, 'headers exception → no headers');
  } finally {
    console.error = origErr;
  }

  /* ---- headers (v2.5 — 인증 토큰 등) ---- */
  var req9 = T.buildDataSourceRequest({ url: '/x', headers: { Authorization: 'Bearer t1' } }, state);
  assertEq(req9.headers, { Authorization: 'Bearer t1' }, 'static headers object');
  var req10 = T.buildDataSourceRequest(
    { url: '/x', headers: function () { return { 'X-Token': 'live' }; } },
    state
  );
  assertEq(req10.headers, { 'X-Token': 'live' }, 'headers function evaluated per request');
  assertEq(T.buildDataSourceRequest({ url: '/x' }, state).headers, null, 'no headers option → null');

  assertEq(T.parseDataSourceResponse([{ a: 1 }]), { rows: [{ a: 1 }], total: 1 }, 'bare array response');
  assertEq(
    T.parseDataSourceResponse({ rows: [{ a: 1 }], total: 99 }),
    { rows: [{ a: 1 }], total: 99 },
    '{rows, total} response'
  );
  assertEq(T.parseDataSourceResponse({ rows: [{}] }), { rows: [{}], total: 1 }, 'total defaults to rows.length');
  assertEq(T.parseDataSourceResponse(null), { rows: [], total: 0 }, 'malformed response → empty');
});

/* ---------------- buildGroupHeaderRuns ---------------- */
suite('buildGroupHeaderRuns', function () {
  var cols = [
    { colId: 'a', field: 'a' },
    { colId: 'b', field: 'b' },
    { colId: 'c', field: 'c' },
    { colId: 'd', field: 'd' },
  ];
  var groups = [
    { headerName: 'AB', children: ['a', 'b'] },
    { headerName: 'D', children: ['d'] },
  ];
  var runs = T.buildGroupHeaderRuns(cols, groups);
  assertEq(
    runs.map(function (r) { return { name: r.headerName, ids: r.colIds }; }),
    [
      { name: 'AB', ids: ['a', 'b'] },
      { name: '', ids: ['c'] },
      { name: 'D', ids: ['d'] },
    ],
    'contiguous groups spanned, ungrouped as filler'
  );

  /* 순서가 바뀌어 그룹이 끊기면 스팬도 끊긴다 */
  var reordered = [cols[0], cols[2], cols[1], cols[3]];
  runs = T.buildGroupHeaderRuns(reordered, groups);
  assertEq(
    runs.map(function (r) { return r.headerName; }),
    ['AB', '', 'AB', 'D'],
    'non-contiguous same group becomes separate runs'
  );

  /* pinned 경계에서 스팬이 끊긴다 */
  var pinnedCols = [
    { colId: 'a', field: 'a', pinned: 'left' },
    { colId: 'b', field: 'b' },
  ];
  runs = T.buildGroupHeaderRuns(pinnedCols, [{ headerName: 'AB', children: ['a', 'b'] }]);
  assertEq(runs.length, 2, 'pinned boundary splits run');
  assertEq(runs[0].pinned, 'left', 'pinned flag carried');

  /* field로도 컬럼을 지칭할 수 있다 */
  runs = T.buildGroupHeaderRuns([{ colId: 'col-0', field: 'x' }], [{ headerName: 'X', children: ['x'] }]);
  assertEq(runs[0].headerName, 'X', 'children matched by field');

  assertEq(T.buildGroupHeaderRuns(cols, []).length, 1, 'no groups → single filler run');
  assertEq(T.buildGroupHeaderRuns([], groups), [], 'no columns → empty');
});

/* ---------------- computeAutoHeights / computeTopsFromHeights ---------------- */
suite('computeAutoHeights', function () {
  var measure = function (text) { return text.length * 10; }; /* 글자당 10px 가짜 측정기 */
  var wrapCols = [{ field: 'memo', width: 132 }]; /* 가용폭 100px → 10글자/줄 */

  var h = T.computeAutoHeights(
    [{ memo: 'short' }, { memo: 'this is a much longer memo text' }, { memo: null }],
    wrapCols, measure, 40, 20
  );
  assertEq(h[0], 40, 'single line keeps base height');
  /* 31글자 → 310px / 100px = 4줄 → 4*20+12 = 92 */
  assertEq(h[1], 92, 'long text grows row height');
  assertEq(h[2], 40, 'null value → base height');

  var h2 = T.computeAutoHeights([{ memo: 'ab\ncd' }], wrapCols, measure, 40, 20);
  assertEq(h2[0], 52, 'explicit newlines counted (2 lines → 2*20+12)');

  var h3 = T.computeAutoHeights([{ __group: true }, { __detail: true }], wrapCols, measure, 40, 20);
  assertEq(h3, [40, 40], 'group/detail items keep base height');

  var fmt = [{ field: 'v', width: 132, valueFormatter: function (v) { return v + '!!!!!!!!!!!!!!!'; } }];
  var h4 = T.computeAutoHeights([{ v: 'x' }], fmt, measure, 40, 20);
  assertEq(h4[0], 52, 'formatter output measured (16 chars → 2 lines)');

  var layout = T.computeTopsFromHeights([40, 92, 40]);
  assertEq(layout.tops, [0, 40, 132], 'tops from heights');
  assertEq(layout.total, 172, 'total from heights');
  assertEq(T.computeTopsFromHeights([]), { tops: [], total: 0 }, 'empty heights');
});

/* ---------------- computeColumnWindow ---------------- */
suite('computeColumnWindow', function () {
  var W = T.computeColumnWindow;
  function cols(n, w, pinnedMap) {
    var out = [];
    for (var i = 0; i < n; i++) out.push({ width: w, pinned: (pinnedMap || {})[i] || null });
    return out;
  }

  /* 10개 × 100px, 뷰포트 300px, 스크롤 0 → 컬럼 0-2 가시 + 버퍼 2 */
  assertEq(W(cols(10, 100), 0, 300), { c1: 0, c2: 4 }, 'window at origin with buffer');
  /* 스크롤 450 → 450~750 → 컬럼 4-7 가시, 버퍼 → 2-9 */
  assertEq(W(cols(10, 100), 450, 300), { c1: 2, c2: 9 }, 'window mid-scroll');
  /* 스크롤 끝 (700~1000) → 7-9 가시, 버퍼 → 5-9 */
  assertEq(W(cols(10, 100), 700, 300), { c1: 5, c2: 9 }, 'window at end clamped');

  /* 좌고정 1개: 가시 영역이 고정 폭만큼 좁아진다 */
  var pinned = cols(10, 100, { 0: 'left' });
  var win = W(pinned, 0, 300);
  assertEq(win, { c1: 0, c2: 4 }, 'pinned-left narrows middle viewport (cols 1-2 visible + buffer)');

  /* 버퍼 0 지정 */
  assertEq(W(cols(10, 100), 0, 300, 0), { c1: 0, c2: 2 }, 'explicit zero buffer');

  /* 일반 컬럼이 없으면 전체 */
  assertEq(W(cols(2, 100, { 0: 'left', 1: 'right' }), 0, 300), { c1: 0, c2: 1 }, 'all pinned → full range');
});

/* ---------------- computeMergeContinuation ---------------- */
suite('computeMergeContinuation', function () {
  var M = T.computeMergeContinuation;
  assertEq(
    M([{ d: 'A' }, { d: 'A' }, { d: 'B' }, { d: 'B' }, { d: 'A' }], 'd'),
    [false, true, false, true, false],
    'consecutive equal values marked as continuation'
  );
  assertEq(
    M([{ d: 'A' }, { __group: true }, { d: 'A' }], 'd'),
    [false, false, false],
    'group header breaks the run'
  );
  assertEq(
    M([{ d: 'A' }, { __detail: true, row: {} }, { d: 'A' }], 'd'),
    [false, false, false],
    'detail row breaks the run'
  );
  assertEq(M([{ d: null }, { d: null }], 'd'), [false, true], 'nulls merge together');
  assertEq(M([{ d: 1 }, { d: '1' }], 'd'), [false, false], 'strict equality (1 !== "1")');
  assertEq(M([], 'd'), [], 'empty list');
});

/* ---------------- computeMergeSpans ---------------- */
suite('computeMergeSpans', function () {
  var S = T.computeMergeSpans;
  assertEq(
    S([false, true, false, true, false]),
    [2, 0, 2, 0, 1],
    'run starts get run length, continuations get 0'
  );
  assertEq(S([false, true, true, true]), [4, 0, 0, 0], 'single long run');
  assertEq(S([false, false, false]), [1, 1, 1], 'no merges → all standalone (span 1)');
  assertEq(S([false]), [1], 'single row');
  assertEq(S([]), [], 'empty list');
  assertEq(
    S(T.computeMergeContinuation(
      [{ d: 'A' }, { d: 'A' }, { __group: true }, { d: 'A' }, { d: 'A' }], 'd')),
    [2, 0, 1, 2, 0],
    'composes with computeMergeContinuation (group breaks run)'
  );
});

/* ---------------- tree (buildTreeNodes 등) ---------------- */
suite('buildTreeNodes', function () {
  // nested 형식
  var nested = [
    { name: 'a', children: [{ name: 'a1' }, { name: 'a2', children: [{ name: 'a2x' }] }] },
    { name: 'b' },
  ];
  var roots = T.buildTreeNodes(nested, {});
  assertEq(roots.length, 2, 'nested: two roots');
  assertEq(roots[0].children.length, 2, 'nested: children parsed');
  assertEq(roots[0].children[1].children[0].row.name, 'a2x', 'nested: deep child');
  assertEq(roots[0].children[1].children[0].level, 2, 'nested: level assigned');

  // flat(parentId) 형식
  var flat = [
    { id: 1, name: 'root' },
    { id: 2, name: 'child', parentId: 1 },
    { id: 3, name: 'grandchild', parentId: 2 },
    { id: 4, name: 'orphan', parentId: 99 },
  ];
  var froots = T.buildTreeNodes(flat, { parentIdField: 'parentId', idField: 'id' });
  assertEq(froots.length, 2, 'flat: missing parent → root');
  assertEq(froots[0].children[0].children[0].row.name, 'grandchild', 'flat: chain built');
  assertEq(froots[1].row.name, 'orphan', 'flat: orphan kept as root');

  // 순환 참조: 어느 루트에서도 도달 불가한 행도 유실되지 않는다
  var cyc = [
    { id: 1, parentId: 2, name: 'x' },
    { id: 2, parentId: 1, name: 'y' },
  ];
  var croots = T.buildTreeNodes(cyc, { parentIdField: 'parentId', idField: 'id' });
  assertEq(T.collectTreeNodes(croots).length, 2, 'flat: cycle broken, no row lost');

  assertEq(T.buildTreeNodes([], {}), [], 'empty input');
});

suite('filterTreeNodes / sortTreeNodes / flattenTreeNodes', function () {
  var data = [
    { name: 'docs', children: [{ name: 'readme' }, { name: 'license' }] },
    { name: 'src', children: [{ name: 'app', children: [{ name: 'main' }] }] },
  ];
  var roots = T.buildTreeNodes(data, {});

  // filter: 매치 + 조상 유지
  var f1 = T.filterTreeNodes(roots, function (r) { return r.name === 'main'; }, false);
  assertEq(f1.length, 1, 'filter: only matching branch kept');
  assertEq(f1[0].row.name, 'src', 'filter: ancestor kept');
  assertEq(f1[0].children[0].children[0].row.name, 'main', 'filter: match kept');

  // filter: keepChildren이면 매치된 부모의 자손 유지
  var f2 = T.filterTreeNodes(roots, function (r) { return r.name === 'docs'; }, true);
  assertEq(f2[0].children.length, 2, 'filter: children of match kept (keepChildren)');
  var f3 = T.filterTreeNodes(roots, function (r) { return r.name === 'docs'; }, false);
  assertEq(f3[0].children.length, 0, 'filter: children dropped without keepChildren');

  // sort: 형제끼리만 정렬 (계층 유지)
  var sorted = T.sortTreeNodes(roots, function (rows) {
    return rows.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  });
  assertEq(sorted[0].row.name, 'docs', 'sort: roots sorted');
  assertEq(sorted[0].children[0].row.name, 'license', 'sort: siblings sorted');
  assertEq(sorted[1].children[0].row.name, 'app', 'sort: hierarchy preserved');

  // flatten: 조상이 모두 펼쳐진 노드만
  var all = T.flattenTreeNodes(roots, function () { return true; });
  assertEq(all.length, 6, 'flatten: all visible when expanded');
  assertEq(all.map(function (n) { return n.level; }), [0, 1, 1, 0, 1, 2], 'flatten: levels');
  var collapsed = T.flattenTreeNodes(roots, function (r) { return r.name === 'src'; });
  assertEq(collapsed.length, 3, 'flatten: collapsed subtree hidden');
  assertEq(
    collapsed.map(function (n) { return n.row.name; }),
    ['docs', 'src', 'app'],
    'flatten: only expanded ancestors shown (app collapsed → main hidden)'
  );
  assertEq(collapsed[1].expanded, true, 'flatten: expanded flag set');
  assertEq(collapsed[0].hasChildren, true, 'flatten: hasChildren flag set');
});

/* ---------------- computeTreeSummary ---------------- */
suite('computeTreeSummary', function () {
  var data = [
    {
      id: 'root',
      children: [
        { id: 'sub', children: [{ id: 'f1', size: 10 }, { id: 'f2', size: 30 }] },
        { id: 'f3', size: 5 },
      ],
    },
    { id: 'single', size: 99 }, // 리프 루트 — 요약 없음
  ];
  var roots = T.buildTreeNodes(data, {});
  var getId = function (r) { return r.id; };
  var s = T.computeTreeSummary(roots, getId, [{ field: 'size', aggFunc: 'sum' }]);
  assertEq(s.root.size, 45, 'parent sums all descendant leaves (not folders)');
  assertEq(s.sub.size, 40, 'nested parent sums its own leaves');
  assertEq(s.single, undefined, 'leaf root has no summary');
  var avg = T.computeTreeSummary(roots, getId, [{ field: 'size', aggFunc: 'avg' }]);
  assertEq(avg.sub.size, 20, 'avg aggregation');
  var cnt = T.computeTreeSummary(roots, getId, [{ field: 'size', aggFunc: 'count' }]);
  assertEq(cnt.root.size, 3, 'count counts leaves');
  assertEq(T.computeTreeSummary([], getId, [{ field: 'size', aggFunc: 'sum' }]), {}, 'empty tree');
});

/* ---------------- applyTreeCheck ---------------- */
suite('applyTreeCheck', function () {
  var data = [
    { id: 'p', children: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { id: 'q', children: [{ id: 'x' }] },
  ];
  var roots = T.buildTreeNodes(data, {});
  var getId = function (r) { return r.id; };
  var rowById = {};
  T.collectTreeNodes(roots).forEach(function (n) { rowById[n.row.id] = n.row; });

  // 부모 체크 → 자손 전체 체크 (캐스케이드 다운)
  var s1 = T.applyTreeCheck(roots, getId, {}, rowById.p, true, { cascade: true });
  assertEq([s1.p, s1.a, s1.b, s1.c], [true, true, true, true], 'cascade down');
  assertEq(s1.q || false, false, 'other branch untouched');

  // 자식 하나 해제 → 부모 indeterminate (캐스케이드 업)
  var s2 = T.applyTreeCheck(roots, getId, s1, rowById.b, false, { cascade: true });
  assertEq(s2.p, 'indeterminate', 'mixed children → parent indeterminate');
  assertEq([s2.a, s2.b, s2.c], [true, false, true], 'only target child changed');

  // 나머지 자식도 해제 → 부모 false
  var s3 = T.applyTreeCheck(roots, getId, s2, rowById.a, false, { cascade: true });
  var s4 = T.applyTreeCheck(roots, getId, s3, rowById.c, false, { cascade: true });
  assertEq(s4.p, false, 'all children false → parent false');

  // 자식 전부 체크 → 부모 true
  var s5 = T.applyTreeCheck(roots, getId, {}, rowById.a, true, { cascade: true });
  s5 = T.applyTreeCheck(roots, getId, s5, rowById.b, true, { cascade: true });
  s5 = T.applyTreeCheck(roots, getId, s5, rowById.c, true, { cascade: true });
  assertEq(s5.p, true, 'all children true → parent true');

  // cascade: false → 대상만
  var s6 = T.applyTreeCheck(roots, getId, {}, rowById.p, true, { cascade: false });
  assertEq([s6.p, s6.a || false], [true, false], 'no cascade: target only');

  // disabled: 대상이 disabled면 무변경, 자손 중 disabled는 건너뜀
  var dis = function (r) { return r.id === 'b'; };
  var s7 = T.applyTreeCheck(roots, getId, {}, rowById.b, true, { cascade: true, isDisabled: dis });
  assertEq(Object.keys(s7).length > 0 ? s7.b || false : false, false, 'disabled target unchanged');
  var s8 = T.applyTreeCheck(roots, getId, {}, rowById.p, true, { cascade: true, isDisabled: dis });
  assertEq(s8.b || false, false, 'disabled child skipped in cascade');
  assertEq(s8.p, 'indeterminate', 'parent reflects skipped child (mixed)');
});

/* ---------------- subtreeFullyChecked ---------------- */
suite('subtreeFullyChecked', function () {
  var data = [
    {
      id: 'f',
      children: [{ id: 'a' }, { id: 'lic' }, { id: 'sub', children: [{ id: 'b' }] }],
    },
  ];
  var roots = T.buildTreeNodes(data, {});
  var byId = {};
  T.collectTreeNodes(roots).forEach(function (n) { byId[n.row.id] = n.row; });
  var sel = function (ids) { return function (r) { return ids.indexOf(r.id) !== -1; }; };
  var disLic = function (r) { return r.id === 'lic'; };
  var noneDis = function () { return false; };
  var S = T.subtreeFullyChecked;

  assertEq(S(roots, byId.f, sel(['a', 'lic', 'b']), noneDis), true, 'all leaves selected → true');
  assertEq(S(roots, byId.f, sel(['a', 'b']), noneDis), false, 'unselected leaf → false');
  // BUG-004 핵심 케이스: 비활성 리프만 미선택이면 "완전 체크"로 간주 → 클릭 의도 = 해제
  assertEq(S(roots, byId.f, sel(['a', 'b']), disLic), true, 'disabled leaf excluded from check');
  assertEq(S(roots, byId.f, sel(['a']), disLic), false, 'checkable leaf missing → false');
  assertEq(S(roots, byId.sub, sel(['b']), disLic), true, 'works on nested subtree');
  assertEq(S(roots, byId.a, sel([]), noneDis), false, 'leaf target unselected → false');
  assertEq(S(roots, byId.a, sel(['a']), noneDis), true, 'leaf target selected → true');
  assertEq(S(roots, { id: 'ghost' }, sel([]), noneDis), false, 'unknown row → false');
});

/* ---------------- deriveTreeCheckStates ---------------- */
suite('deriveTreeCheckStates', function () {
  var data = [
    { id: 'p', children: [{ id: 'a' }, { id: 'b' }] },
    { id: 'q', children: [{ id: 'x' }, { id: 'y' }] },
    { id: 'leafRoot' },
  ];
  var roots = T.buildTreeNodes(data, {});
  var getId = function (r) { return r.id; };
  var sel = function (ids) {
    return function (r) { return ids.indexOf(r.id) !== -1; };
  };

  var s1 = T.deriveTreeCheckStates(roots, getId, sel(['a', 'b']));
  assertEq(s1.p, true, 'all children selected → parent true');
  var s2 = T.deriveTreeCheckStates(roots, getId, sel(['a']));
  assertEq(s2.p, 'indeterminate', 'some children selected → parent indeterminate');
  assertEq([s2.a, s2.b], [true, false], 'leaf states follow selection');
  var s3 = T.deriveTreeCheckStates(roots, getId, sel([]));
  assertEq([s3.p, s3.q, s3.leafRoot], [false, false, false], 'nothing selected → all false');
  var s4 = T.deriveTreeCheckStates(roots, getId, sel(['leafRoot']));
  assertEq(s4.leafRoot, true, 'leaf root reflects own selection');
  // 부모 표시는 자식에서만 유도 — 부모 자신의 선택 여부와 무관
  var s5 = T.deriveTreeCheckStates(roots, getId, sel(['p']));
  assertEq(s5.p, false, 'parent display derived from children only');
});

/* ---------------- fillSeries ---------------- */
suite('fillSeries', function () {
  assertEq(T.fillSeries([1, 3], 3), [5, 7, 9], 'arithmetic extrapolation');
  assertEq(T.fillSeries([10], 3), [10, 10, 10], 'single number copied');
  assertEq(T.fillSeries([0.1, 0.2], 2), [0.3, 0.4], 'float step rounded (no 0.30000000004)');
  assertEq(T.fillSeries(['a', 'b'], 5), ['a', 'b', 'a', 'b', 'a'], 'pattern repeats cyclically');
  assertEq(T.fillSeries([5, 'x'], 2), [5, 'x'], 'mixed types → pattern repeat');
  assertEq(T.fillSeries([10, 5], 2), [0, -5], 'descending series');
  assertEq(T.fillSeries([], 3), [], 'empty source');
  assertEq(T.fillSeries([1, 2], 0), [], 'zero count');
});

/* ---------------- findNextMatch ---------------- */
suite('findNextMatch', function () {
  var rows = [
    { name: 'Alice', city: 'Seoul' },
    { __group: true, value: 'G' },
    { name: 'Bob', city: 'Tokyo' },
    { name: 'Carol', city: 'Seoul' },
  ];
  var fields = ['name', 'city'];

  assertEq(T.findNextMatch(rows, fields, 'seoul', null), { index: 0, col: 1 }, 'first match, case-insensitive');
  assertEq(T.findNextMatch(rows, fields, 'seoul', { index: 0, col: 1 }), { index: 3, col: 1 }, 'continues after cursor, skips group row');
  assertEq(T.findNextMatch(rows, fields, 'seoul', { index: 3, col: 1 }), { index: 0, col: 1 }, 'wraps to start');
  assertEq(T.findNextMatch(rows, fields, 'bo', null), { index: 2, col: 0 }, 'substring match');
  assertEq(T.findNextMatch(rows, fields, 'zzz', null), null, 'no match → null');
  assertEq(T.findNextMatch(rows, fields, '', null), null, 'empty text → null');
  assertEq(T.findNextMatch([], fields, 'a', null), null, 'no rows → null');
  assertEq(T.findNextMatch(rows, [], 'a', null), null, 'no fields → null');

  /* 같은 행의 다음 컬럼부터 이어서 찾는다 */
  var multi = [{ a: 'xx', b: 'xx' }];
  assertEq(T.findNextMatch(multi, ['a', 'b'], 'xx', { index: 0, col: 0 }), { index: 0, col: 1 }, 'next column in same row');
  assertEq(T.findNextMatch(multi, ['a', 'b'], 'xx', { index: 0, col: 1 }), { index: 0, col: 0 }, 'wraps within single row');

  assertEq(T.findNextMatch([{ v: null }, { v: 'ok' }], ['v'], 'ok', null), { index: 1, col: 0 }, 'null values skipped');
});

/* ---------------- rollbackRows ---------------- */
suite('rollbackRows', function () {
  var a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }, x = { id: 'x' }, y = { id: 'y' };

  assertEq(
    T.rollbackRows([a, x, b], [x], []).map(function (r) { return r.id; }),
    ['a', 'b'],
    'added rows removed'
  );
  assertEq(
    T.rollbackRows([a, c], [], [{ row: b, index: 1 }]).map(function (r) { return r.id; }),
    ['a', 'b', 'c'],
    'deleted row restored at recorded index'
  );
  assertEq(
    T.rollbackRows([a], [], [{ row: b, index: 99 }]).map(function (r) { return r.id; }),
    ['a', 'b'],
    'out-of-range index appends'
  );
  assertEq(
    T.rollbackRows([c], [], [{ row: b, index: 1 }, { row: a, index: 0 }]).map(function (r) { return r.id; }),
    ['a', 'b', 'c'],
    'multiple deletions restored in index order'
  );
  assertEq(
    T.rollbackRows([a, x, c], [x], [{ row: b, index: 1 }]).map(function (r) { return r.id; }),
    ['a', 'b', 'c'],
    'added removal + deletion restore combined'
  );
  var original = [a, x];
  T.rollbackRows(original, [x], []);
  assertEq(original.length, 2, 'input array not mutated');
  assertEq(T.rollbackRows([], [], []), [], 'empty inputs');
});

/* ---------------- buildJsonRows ---------------- */
suite('buildJsonRows', function () {
  var rows = [
    { id: 1, name: 'Alice', secret: 'x' },
    { id: 2, name: null, secret: 'y' },
  ];
  var cols = [{ field: 'id' }, { field: 'name' }, { colId: 'chk' }];
  var out = T.buildJsonRows(rows, cols);
  assertEq(out, [{ id: 1, name: 'Alice' }, { id: 2, name: null }], 'field columns only, raw values');
  assert(out[0] !== rows[0], 'returns new objects');
  assertEq(T.buildJsonRows([], cols), [], 'empty rows');
  assertEq(T.buildJsonRows(rows, []), [{}, {}], 'no field columns → empty objects');
  assert(JSON.parse(JSON.stringify(out)).length === 2, 'JSON round-trip safe');
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

  /* editor 선언 → editable 생략 시 true */
  var ed = T.normalizeColumns([
    { field: 'a', editor: 'select', editorOptions: ['x'] },
    { field: 'b', editor: 'number', editable: false },
    { field: 'c', editor: { init: function () {}, getValue: function () {} } },
    { field: 'd' },
  ]);
  assertEq(ed[0].editable, true, 'editor declared → editable defaults to true');
  assertEq(ed[1].editable, false, 'explicit editable:false wins over editor');
  assertEq(ed[2].editable, true, 'custom editor object also implies editable');
  assertEq(ed[3].editable, false, 'no editor → editable stays false');

  var edDefault = T.normalizeColumns(
    [{ field: 'a', editor: 'text' }, { field: 'b' }],
    { editable: false }
  );
  assertEq(edDefault[0].editable, false, 'defaultColDef editable:false is explicit — editor does not override');
  var edFromDefault = T.normalizeColumns([{ field: 'a' }], { editor: 'text' });
  assertEq(edFromDefault[0].editable, true, 'editor from defaultColDef also implies editable');
});

/* ---------------- typeComparator ---------------- */
suite('typeComparator', function () {
  var num = T.typeComparator('number');
  assert(num('9', '10') < 0, 'number: numeric strings compared numerically');
  assert(num(100, '20') > 0, 'number: mixed number/string');
  assert(num(null, 5) > 0, 'number: blank last');
  assert(num('abc', 5) > 0, 'number: NaN last');
  assert(num('abc', 'def') === 0, 'number: two NaN equal');

  var date = T.typeComparator('date');
  assert(date('2024-01-02', '2024-01-10') < 0, 'date: ISO strings');
  assert(date(new Date(2024, 5, 1), '2024-01-01') > 0, 'date: Date vs string');
  assert(date('', '2024-01-01') > 0, 'date: blank last');
  assert(date('not-a-date', '2024-01-01') > 0, 'date: unparsable last');

  var bool = T.typeComparator('bool');
  assert(bool(true, false) < 0, 'bool: true first');
  assert(bool(false, false) === 0, 'bool: equal');
  assert(bool(null, false) > 0, 'bool: blank last');

  assert(T.typeComparator('string') === null, 'string → null (default comparator)');
  assert(T.typeComparator(undefined) === null, 'undefined → null');
});

/* ---------------- parseLocalDate ---------------- */
suite('parseLocalDate', function () {
  /* 시간대 표기가 없는 ISO는 로컬 시각 — 아래 단언들은 실행 시간대와 무관하게 성립한다.
   * new Date('2024-03-15')(UTC 자정)로 파싱하면 KST에서 09시, 뉴욕에서 전날 19시가 되어
   * getHours()/getDate()가 어긋난다 (BUG-008). */
  var d = T.parseLocalDate('2024-03-15');
  assertEq(d.getFullYear(), 2024, 'date-only ISO: year');
  assertEq(d.getMonth(), 2, 'date-only ISO: month (local)');
  assertEq(d.getDate(), 15, 'date-only ISO: day (local, no shift)');
  assertEq(d.getHours(), 0, 'date-only ISO: local midnight, not UTC midnight');

  var dt = T.parseLocalDate('2024-03-15T14:30');
  assertEq(dt.getHours(), 14, 'datetime ISO: local hours');
  assertEq(dt.getMinutes(), 30, 'datetime ISO: local minutes');
  assertEq(T.parseLocalDate('2024-03-15T14:30:45').getSeconds(), 45, 'datetime ISO: seconds');
  assertEq(T.parseLocalDate('2024-03-15 14:30').getHours(), 14, 'space separator accepted');

  var inst = new Date(2024, 0, 1);
  assert(T.parseLocalDate(inst) === inst, 'Date instance passes through');
  assertEq(T.parseLocalDate(0).getTime(), 0, 'number → timestamp');

  /* 시간대가 명시된 값은 절대 시각 — 그대로 존중한다 */
  assertEq(T.parseLocalDate('2024-03-15T00:00:00Z').getTime(), Date.UTC(2024, 2, 15), 'zoned ISO respects Z');
  assert(isNaN(T.parseLocalDate('garbage').getTime()), 'unparsable → Invalid Date');
});

/* ---------------- formatNumber / formatDate / formatValue ---------------- */
suite('format', function () {
  assertEq(T.formatNumber(1234567.891, '#,##0.00'), '1,234,567.89', 'grouping + 2 decimals');
  assertEq(T.formatNumber(1234.5, '$#,##0.00'), '$1,234.50', 'prefix + zero-padded decimals');
  assertEq(T.formatNumber(-1234.5, '$#,##0.00'), '-$1,234.50', 'negative before prefix');
  assertEq(T.formatNumber(1234, '#,##0 원'), '1,234 원', 'literal suffix');
  assertEq(T.formatNumber(0.5, '0.###'), '0.5', '# decimals trim trailing zeros');
  assertEq(T.formatNumber(0.5, '0.00#'), '0.50', "min decimals from '0' count");
  assertEq(T.formatNumber(3.14159, '0.00'), '3.14', 'rounds to mask decimals');
  assertEq(T.formatNumber(3.999, '0.00'), '4.00', 'rounding carries');
  assertEq(T.formatNumber(7, '000'), '007', 'integer zero padding');
  assertEq(T.formatNumber(1234, '####'), '1234', 'no grouping without comma');
  assertEq(T.formatNumber(null, '#,##0'), '', 'null → empty');
  assertEq(T.formatNumber('abc', '#,##0'), 'abc', 'non-numeric passthrough');

  assertEq(T.formatDate('2024-03-05T09:07:02', 'yyyy-MM-dd'), '2024-03-05', 'ISO date');
  assertEq(T.formatDate(new Date(2024, 2, 5, 9, 7, 2), 'yyyy-MM-dd HH:mm:ss'), '2024-03-05 09:07:02', 'Date with time tokens');
  assertEq(T.formatDate(new Date(2024, 11, 25), 'yy/MM/dd'), '24/12/25', 'two-digit year');
  assertEq(T.formatDate('garbage', 'yyyy-MM-dd'), 'garbage', 'unparsable passthrough');
  assertEq(T.formatDate(null, 'yyyy'), '', 'null → empty');
  /* 시간대 무관 왕복 — UTC 파싱이면 음수 오프셋 지역에서 하루 밀린다 (BUG-008) */
  assertEq(T.formatDate('2024-03-15', 'yyyy-MM-dd'), '2024-03-15', 'date-only ISO round-trips in any timezone');
  assertEq(T.formatDate('2024-01-01', 'yyyy-MM-dd'), '2024-01-01', 'year boundary does not shift');

  assertEq(T.formatValue(1234, '#,##0'), '1,234', 'dispatch to number on #/0');
  assertEq(T.formatValue('2024-03-05', 'yyyy.MM.dd'), '2024.03.05', 'dispatch to date otherwise');
  assertEq(T.formatValue(42, ''), '42', 'empty pattern → String(value)');
});

/* ---------------- normalizeColumns dataType/format ---------------- */
suite('normalizeColumns (dataType/format)', function () {
  var cols = T.normalizeColumns([
    { field: 'n', dataType: 'number', filter: true },
    { field: 'b', dataType: 'bool', filter: true },
    { field: 'd', dataType: 'date', filter: true },
    { field: 'x', dataType: 'number', align: 'center' },
    { field: 'f', format: '#,##0.0' },
    { field: 'g', format: '#,##0.0', valueFormatter: function () { return 'custom'; } },
  ]);
  assertEq(cols[0].filter, 'number', 'dataType number → number filter');
  assertEq(cols[0].align, 'right', 'dataType number → right align');
  assertEq(cols[1].filter, 'set', 'dataType bool → set filter');
  assertEq(cols[2].filter, 'text', 'dataType date → text filter');
  assertEq(cols[3].align, 'center', 'explicit align wins over dataType');
  assertEq(cols[4].valueFormatter(1234.56), '1,234.6', 'format synthesizes valueFormatter');
  assertEq(cols[5].valueFormatter(1), 'custom', 'explicit valueFormatter wins over format');
});

/* ---------------- computeColumnWidths ---------------- */
suite('computeColumnWidths', function () {
  var W = T.computeColumnWidths;
  assertEq(
    W([{ colId: 'a', width: 100, minWidth: 60 }, { colId: 'b', width: 200, minWidth: 60 }], {}, 1000),
    { a: 100, b: 200 },
    'fixed widths used as-is'
  );
  assertEq(
    W([{ colId: 'a', width: 100, minWidth: 60 }, { colId: 'f', width: 160, minWidth: 60, flex: 1 }], {}, 500),
    { a: 100, f: 400 },
    'flex takes remaining space'
  );
  assertEq(
    W([
      { colId: 'x', width: 100, minWidth: 60, flex: 1 },
      { colId: 'y', width: 100, minWidth: 60, flex: 3 },
    ], {}, 400),
    { x: 100, y: 300 },
    'flex ratio split'
  );
  assertEq(
    W([{ colId: 'a', width: 100, minWidth: 60 }], { a: 300 }, 1000),
    { a: 300 },
    'override wins over width'
  );
  assertEq(
    W([{ colId: 'a', width: 100, minWidth: 120 }], {}, 1000),
    { a: 120 },
    'minWidth clamps up'
  );
  assertEq(
    W([{ colId: 'a', width: 100, minWidth: 60, maxWidth: 80 }], { a: 500 }, 1000),
    { a: 80 },
    'maxWidth clamps override down'
  );
  assertEq(
    W([{ colId: 'f', width: 100, minWidth: 60, maxWidth: 150, flex: 1 }], {}, 900),
    { f: 150 },
    'maxWidth clamps flex'
  );
  assertEq(
    W([{ colId: 'f', width: 100, minWidth: 200, flex: 1 }], {}, 100),
    { f: 200 },
    'flex never below minWidth even without space'
  );
});

/* ---------------- applyColumnState ---------------- */
suite('applyColumnState', function () {
  function cols() {
    return [
      { colId: 'a', hide: false },
      { colId: 'b', hide: false },
      { colId: 'c', hide: true },
    ];
  }

  var r = T.applyColumnState(cols(), [{ colId: 'c' }, { colId: 'a' }, { colId: 'b' }]);
  assertEq(r.columns.map(function (c) { return c.colId; }), ['c', 'a', 'b'], 'reordered by state order');

  r = T.applyColumnState(cols(), [{ colId: 'b' }]);
  assertEq(r.columns.map(function (c) { return c.colId; }), ['b', 'a', 'c'], 'unlisted columns appended in original order');

  r = T.applyColumnState(cols(), [{ colId: 'ghost' }, { colId: 'b' }]);
  assertEq(r.columns.map(function (c) { return c.colId; }), ['b', 'a', 'c'], 'unknown colId ignored');

  r = T.applyColumnState(cols(), [{ colId: 'a', width: 250 }, { colId: 'b', width: 'x' }, { colId: 'c', width: -5 }]);
  assertEq(r.widths, { a: 250 }, 'only positive numeric widths collected');

  r = T.applyColumnState(cols(), [{ colId: 'a', hide: true }, { colId: 'b' }]);
  assertEq(r.hidden, { a: true }, 'hidden map only for entries that specify hide');

  var input = cols();
  r = T.applyColumnState(input, [{ colId: 'c', hide: false }]);
  assertEq(input.map(function (c) { return c.colId; }), ['a', 'b', 'c'], 'input array not mutated');
  assertEq(input[2].hide, true, 'input column objects not mutated');

  r = T.applyColumnState(cols(), []);
  assertEq(r.columns.map(function (c) { return c.colId; }), ['a', 'b', 'c'], 'empty state keeps order');
  assertEq(r.widths, {}, 'empty state → no widths');

  r = T.applyColumnState(cols(), null);
  assertEq(r.columns.length, 3, 'null state keeps all columns');

  r = T.applyColumnState(cols(), [{ colId: 'a' }, { colId: 'a', width: 99 }]);
  assertEq(r.columns.map(function (c) { return c.colId; }), ['a', 'b', 'c'], 'duplicate colId in state applied once');
  assertEq(r.widths, {}, 'duplicate entry after first is ignored');

  r = T.applyColumnState(cols(), [null, { noColId: true }, { colId: 'b' }]);
  assertEq(r.columns[0].colId, 'b', 'malformed entries skipped');
});

/* ---------------- insertRowsAt ---------------- */
suite('insertRowsAt', function () {
  var a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' }, n1 = { id: 'n1' }, n2 = { id: 'n2' };
  var base = [a, b, c];
  var ids = function (rows) { return rows.map(function (r) { return r.id; }); };

  assertEq(ids(T.insertRowsAt(base, [n1])), ['a', 'b', 'c', 'n1'], 'index 생략 → 맨 뒤');
  assertEq(ids(T.insertRowsAt(base, [n1], null)), ['a', 'b', 'c', 'n1'], 'null → 맨 뒤');
  assertEq(ids(T.insertRowsAt(base, [n1], 0)), ['n1', 'a', 'b', 'c'], 'index 0 → 맨 앞');
  assertEq(ids(T.insertRowsAt(base, [n1], 2)), ['a', 'b', 'n1', 'c'], '중간 삽입');
  assertEq(ids(T.insertRowsAt(base, [n1], 3)), ['a', 'b', 'c', 'n1'], 'index = length → 맨 뒤');
  assertEq(ids(T.insertRowsAt(base, [n1], 99)), ['a', 'b', 'c', 'n1'], '범위 초과 → 맨 뒤로 클램프');
  assertEq(ids(T.insertRowsAt(base, [n1], -5)), ['n1', 'a', 'b', 'c'], '음수 → 맨 앞으로 클램프');
  assertEq(ids(T.insertRowsAt(base, [n1], 1.9)), ['a', 'n1', 'b', 'c'], '소수 → 내림');
  assertEq(ids(T.insertRowsAt(base, [n1, n2], 1)), ['a', 'n1', 'n2', 'b', 'c'], '여러 행 순서 유지');
  assertEq(ids(T.insertRowsAt([], [n1], 0)), ['n1'], '빈 배열에 삽입');
  var before = base.slice();
  T.insertRowsAt(base, [n1], 0);
  assertEq(ids(base), ids(before), '입력 배열 불변');
});

/* ---------------- resolveStatusColumnConfig ---------------- */
suite('resolveStatusColumnConfig', function () {
  var d = T.resolveStatusColumnConfig(true);
  assertEq(d.headerName, 'Status', 'true → default headerName');
  assertEq(d.width, 90, 'true → default width');
  assertEq(d.labels, { added: 'New', updated: 'Updated', deleted: 'Deleted' }, 'true → default labels');
  assertEq(d.colors, { added: 'green', updated: 'yellow', deleted: 'red' }, 'true → default colors');

  var c = T.resolveStatusColumnConfig({
    headerName: '상태', width: 80,
    labels: { added: '신규', deleted: '삭제' },
    colors: { updated: 'blue' },
  });
  assertEq(c.headerName, '상태', 'headerName override');
  assertEq(c.width, 80, 'width override');
  assertEq(c.labels, { added: '신규', updated: 'Updated', deleted: '삭제' }, 'labels merged per key');
  assertEq(c.colors, { added: 'green', updated: 'blue', deleted: 'red' }, 'colors merged per key');

  var w = T.resolveStatusColumnConfig({ width: 'wide' });
  assertEq(w.width, 90, 'non-numeric width ignored');

  var e = T.resolveStatusColumnConfig({ headerName: '' });
  assertEq(e.headerName, '', 'empty headerName respected');
});

/* ---------------- partitionStagedRemoval ---------------- */
suite('partitionStagedRemoval', function () {
  var a = { id: 1 }, b = { id: 2 }, c = { id: 3 }, ghost = { id: 9 };
  var all = [a, b, c];

  var r = T.partitionStagedRemoval([b], all, [b], []);
  assertEq(r.hard.length, 1, 'added row → hard');
  assertEq(r.hard[0].wasAdded, true, 'hard entry wasAdded');
  assertEq(r.hard[0].index, 1, 'hard entry keeps index');
  assertEq(r.soft.length, 0, 'added row not soft');

  r = T.partitionStagedRemoval([a, c], all, [], []);
  assertEq(r.hard.length, 0, 'baseline rows not hard');
  assertEq(r.soft.map(function (en) { return en.row; }), [a, c], 'baseline rows → soft');
  assert(r.soft[0].soft === true && r.soft[0].wasAdded === false, 'soft entry flags');

  r = T.partitionStagedRemoval([a, b], all, [b], []);
  assertEq(r.hard.length, 1, 'mixed: added → hard');
  assertEq(r.soft.length, 1, 'mixed: baseline → soft');

  r = T.partitionStagedRemoval([a], all, [], [a]);
  assertEq(r.soft.length, 0, 'already soft-deleted row skipped');

  r = T.partitionStagedRemoval([ghost], all, [], []);
  assertEq(r.hard.length + r.soft.length, 0, 'row not in grid ignored');

  r = T.partitionStagedRemoval(null, all, [], []);
  assertEq(r.hard.length + r.soft.length, 0, 'null rows → empty');
});

/* ---------------- resolveHeaderClass ---------------- */
suite('resolveHeaderClass', function () {
  assertEq(T.resolveHeaderClass('hl', { colId: 'a' }), ['hl'], 'string class');
  assertEq(T.resolveHeaderClass('  hl  accent ', {}), ['hl', 'accent'], 'multi class trimmed/split');
  assertEq(T.resolveHeaderClass(null, {}), [], 'null → []');
  assertEq(T.resolveHeaderClass(undefined, {}), [], 'undefined → []');
  assertEq(T.resolveHeaderClass('', {}), [], 'empty string → []');
  assertEq(T.resolveHeaderClass('   ', {}), [], 'blank string → []');
  assertEq(
    T.resolveHeaderClass(function (c) { return c.colId === 'salary' ? 'money' : 'plain'; }, { colId: 'salary' }),
    ['money'],
    'function receives colDef'
  );
  assertEq(
    T.resolveHeaderClass(function () { return null; }, { colId: 'a' }),
    [],
    'function returning null → []'
  );
  /* 콜백 예외는 잡아서 빈 배열 폴백 — console.error는 시끄러우니 잠시 막는다 */
  var origErr = console.error;
  console.error = function () {};
  try {
    assertEq(
      T.resolveHeaderClass(function () { throw new Error('boom'); }, { colId: 'a' }),
      [],
      'throwing function → [] (caught)'
    );
  } finally {
    console.error = origErr;
  }
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
