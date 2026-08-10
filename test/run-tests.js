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

  /* 콤마 구분 문자열도 다중 값 표현으로 받는다 (v2.21) */
  assertEq(n('a,b'), ['a', 'b'], '콤마 문자열 분해');
  assertEq(n('a, b ,c'), ['a', 'b', 'c'], '항목 trim');
  assertEq(n('a,,b'), ['a', 'b'], '빈 항목 제거');
  assertEq(n(','), [], '구분자만 → 선택 없음');
  assertEq(n(''), [], '빈 문자열 = 선택 없음 (v2.21 — 이전엔 [""])');
  assertEq(n('   '), [], '공백만 → 선택 없음');
  /* 배열 항목은 손대지 않는다 — 이미 분해된 값을 다시 쪼개면 안 된다 */
  assertEq(n(['a,b']), ['a,b'], '배열 안의 콤마는 그대로 (한 항목)');
  assertEq(n([' a ']), [' a '], '배열 항목은 trim하지 않는다');
});

suite('denormalizeMultiValue', function () {
  var d = T.denormalizeMultiValue;
  /* 원본이 쓰던 표현을 유지한다 — 편집 한 번에 값 타입이 바뀌면 서버 스키마와 어긋난다 */
  assertEq(d(['a', 'b'], ['x']), ['a', 'b'], '원본이 배열 → 배열');
  assertEq(d(['a', 'b'], 'x'), 'a,b', '원본이 문자열 → 콤마 문자열');
  assertEq(d(['a', 'b'], null), 'a,b', '원본 null → 문자열이 기본');
  assertEq(d(['a', 'b'], undefined), 'a,b', '원본 undefined → 문자열이 기본');
  assertEq(d([], 'x'), '', '선택 없음 + 문자열 원본 → 빈 문자열');
  assertEq(d([], ['x']), [], '선택 없음 + 배열 원본 → 빈 배열');
  /* 반환 배열은 사본이어야 한다 (호출자가 원본을 쥐고 흔들지 못하게) */
  var src = ['a'];
  assert(d(src, []) !== src, '배열 반환은 사본');
  /* 문자열 입력도 받아 정규화 후 다시 직렬화한다 */
  assertEq(d('a, b', 'x'), 'a,b', '문자열 입력 → 정규화된 문자열');
});

suite('sameEditValue', function () {
  var s = T.sameEditValue;
  /* 다중 값은 표현이 아니라 내용으로 비교 — 열었다 그냥 닫으면 변경이 아니어야 한다 */
  assert(s('a,b', ['a', 'b'], true), '콤마 문자열 == 배열');
  assert(s('a, b', 'a,b', true), '공백 차이는 같은 값');
  assert(s(null, '', true), 'null == 빈 문자열 (둘 다 선택 없음)');
  assert(s('', [], true), '빈 문자열 == 빈 배열');
  assert(!s('a,b', 'b,a', true), '순서가 다르면 다른 값');
  assert(!s('a', 'a,b', true), '항목 수가 다르면 다른 값');
  /* multi가 아니면 종전대로 엄격 비교 — 콤마가 든 일반 문자열을 쪼개면 안 된다 */
  assert(s('a,b', 'a,b', false), '비다중: 같은 문자열');
  assert(!s('a, b', 'a,b', false), '비다중: 공백 차이는 다른 값');
  assert(!s(null, '', false), '비다중: null !== 빈 문자열');
  /* 한쪽이 배열이면 multi 플래그가 없어도 내용 비교로 넘어간다 (기존 동작) */
  assert(s(['a'], 'a', false), '한쪽이 배열이면 내용 비교');
  /* Date 비교는 종전대로 */
  assert(s(new Date(2024, 0, 1), new Date(2024, 0, 1), false), 'Date는 시각으로 비교');
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

  /* 콤마 문자열도 배열과 똑같이 label로 매핑된다 (v2.21) —
   * 이전에는 'js,css'가 통째로 옵션 조회에 실패해 코드 그대로 칩 하나가 됐다 */
  assertEq(l(opts, 'js,css'), ['JS', 'CSS'], '콤마 문자열 → label 배열');
  assertEq(l(opts, 'js, css'), ['JS', 'CSS'], '공백 있는 콤마 문자열');
  assertEq(l(opts, ''), [], '빈 문자열 → 빈 배열 (칩 없음)');
  /* 숫자 값은 분해 후 문자열이 되지만 lookupOptionLabel이 String 비교로 잡는다 */
  assertEq(l(opts, '3'), ['레벨3'], '문자열로 들어온 숫자 값도 매칭');
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

  /* ---- 커스텀 함수 aggFunc ---- */
  var seen = null;
  var out = T.aggregateValues(rows, 'v', function (values, ctx) { seen = { values: values, ctx: ctx }; return 'X'; });
  assertEq(out, 'X', '함수 반환값이 그대로 집계값');
  assertEq(seen.values, [10, 20, 30, null, '', 'abc'], 'values는 원본 그대로 (거르지 않는다)');
  assert(seen.ctx.rows === rows, 'ctx.rows는 집계 대상 행 배열');
  assertEq(seen.ctx.field, 'v', 'ctx.field');
  assertEq(seen.ctx.colDef, null, 'opts 없으면 colDef는 null');
  assertEq(seen.ctx.parent, null, 'opts 없으면 parent는 null');

  var ctx2 = null;
  var parentRow = { name: 'project' };
  var col = { field: 'v', aggFunc: 'noop' };
  T.aggregateValues(rows, 'v', function (v, c) { ctx2 = c; }, { colDef: col, parent: parentRow });
  assert(ctx2.colDef === col, 'opts.colDef가 ctx로 전달');
  assert(ctx2.parent === parentRow, 'opts.parent가 ctx로 전달 (트리 요약)');

  /* 문자열이 아닌 값도 그대로 통과 — "이름 (자식 수)" 같은 표시가 목적 */
  assertEq(
    T.aggregateValues([{ v: 1 }, { v: 2 }], 'v', function (values, c) { return c.parent.name + ' (' + values.length + ')'; },
      { parent: { name: 'project' } }),
    'project (2)',
    '부모 이름 + 자식 수 조합'
  );

  /* undefined 반환은 null로 정규화 — 내장 집계의 "표시하지 않음" 규약과 통일 */
  assertEq(T.aggregateValues(rows, 'v', function () {}), null, 'undefined 반환 → null');
  assertEq(T.aggregateValues(rows, 'v', function () { return null; }), null, 'null 반환 유지');
  /* 0과 빈 문자열은 유효한 집계 결과다 */
  assertEq(T.aggregateValues(rows, 'v', function () { return 0; }), 0, '0 반환 유지');
  assertEq(T.aggregateValues(rows, 'v', function () { return ''; }), '', '빈 문자열 반환 유지');

  /* 예외는 집계 하나만 null로 만들고 failures로 올려보낸다 (콘솔은 호출자가) */
  var failures = [];
  var boom = T.aggregateValues(rows, 'v', function () { throw new Error('boom'); }, { failures: failures });
  assertEq(boom, null, '예외 → null');
  assertEq(failures.length, 1, 'failures로 보고');
  assertEq(failures[0].field, 'v', 'failures에 필드명');
  /* failures를 안 넘겨도 죽지 않는다 */
  assertEq(T.aggregateValues(rows, 'v', function () { throw new Error('x'); }), null, 'failures 없어도 안전');
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

  /* 커스텀 함수 aggFunc — 그룹에서는 parent가 null이고 rows가 그 그룹의 행들 */
  var gseen = [];
  var fnOut = T.buildGroupView(rows, ['dept'], expandAll, [{ field: 'pay', aggFunc: function (values, ctx) {
    gseen.push({ n: values.length, parent: ctx.parent, field: ctx.field });
    return values.length + '건';
  } }]);
  assertEq(fnOut[0].agg.pay, '2건', '그룹 집계에 함수 반환값');
  assertEq(gseen[0].parent, null, '그룹에는 부모 행이 없다 → parent null');
  assertEq(gseen[0].field, 'pay', 'ctx.field 전달');
  /* 함수 예외는 failures로 — 그룹 뷰 자체는 정상 생성된다 */
  var gfail = [];
  var gboom = T.buildGroupView(rows, ['dept'], expandAll,
    [{ field: 'pay', aggFunc: function () { throw new Error('boom'); } }], gfail);
  assertEq(gboom.length, 6, '집계가 실패해도 그룹 뷰는 그대로');
  assertEq(gboom[0].agg.pay, null, '실패한 집계는 null');
  assertEq(gfail.length, 2, '그룹마다 failure 보고 (호출자가 컬럼당 1회로 접는다)');

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

/* ---------------- buildQueryString ---------------- */
suite('buildQueryString — bracket 표기 (qs/PHP/Rails)', function () {
  var dec = function (params) { return decodeURIComponent(T.buildQueryString(params, 'bracket')); };

  assertEq(dec({ a: 1, b: 'x' }), 'a=1&b=x', '평면 파라미터');
  assertEq(dec({}), '', '빈 객체 → 빈 문자열');
  assertEq(T.buildQueryString(null), '', 'null → 빈 문자열');

  /* BUG-009 — 중첩 객체/배열이 [object Object]로 뭉개지던 케이스 */
  assertEq(dec({ page: { selectPage: 1, pageSize: 20 } }),
    'page[selectPage]=1&page[pageSize]=20', '중첩 객체 → 브래킷 표기');
  assertEq(dec({ sorts: [{ field: 'name', dir: 'asc' }, { field: 'pay', dir: 'desc' }] }),
    'sorts[0][field]=name&sorts[0][dir]=asc&sorts[1][field]=pay&sorts[1][dir]=desc',
    '객체 배열 → 인덱스 + 브래킷');
  assertEq(dec({ tags: ['x', 'y'] }), 'tags[0]=x&tags[1]=y', '원시값 배열 → 인덱스');
  assertEq(dec({ a: { b: { c: 1 } } }), 'a[b][c]=1', '3단 중첩');
  assert(T.buildQueryString({ a: { b: 1 } }, 'bracket').indexOf('%5B') !== -1, '브래킷은 인코딩된다');

  /* 빈 값 규칙 */
  assertEq(dec({ a: 1, b: undefined, c: 2 }), 'a=1&c=2', 'undefined는 생략');
  assertEq(dec({ a: null }), 'a=', 'null은 빈 값');
  assertEq(dec({ a: '' }), 'a=', '빈 문자열도 빈 값');
  assertEq(dec({ a: {} }), '', '빈 객체는 아무것도 안 남김');
  assertEq(dec({ a: [] }), '', '빈 배열은 아무것도 안 남김');
  assertEq(dec({ a: false, b: 0 }), 'a=false&b=0', 'false/0은 값으로 유지');

  /* Date는 ISO — String(date)의 장황한 표기 대신 */
  assertEq(dec({ from: new Date(Date.UTC(2024, 2, 15)) }), 'from=2024-03-15T00:00:00.000Z',
    'Date → ISO 문자열');

  /* 인코딩 */
  assertEq(T.buildQueryString({ 'q v': 'a&b=c' }), 'q%20v=a%26b%3Dc', '키·값 모두 인코딩');
  assertEq(dec({ q: '한글' }), 'q=한글', '유니코드');

  /* 순환 참조가 있어도 죽지 않는다 */
  var cyc = { name: 'root' };
  cyc.self = cyc;
  var out = dec({ node: cyc });
  assert(out.indexOf('node[name]=root') !== -1, '순환 참조: 도달 가능한 값은 살린다');
  assert(out.indexOf('node[self][self]') === -1, '순환 참조: 무한 재귀 없음');
  /* 형제로 같은 객체가 두 번 나오는 것은 순환이 아니다 */
  var shared = { v: 1 };
  assertEq(dec({ a: shared, b: shared }), 'a[v]=1&b[v]=1', '공유 참조는 양쪽 다 직렬화');
});

suite('buildQueryString — dot 표기 (기본, Spring/ASP.NET)', function () {
  var dot = function (params) { return decodeURIComponent(T.buildQueryString(params, 'dot')); };

  assertEq(dot({ page: { selectPage: 0, pageSize: 20 } }),
    'page.selectPage=0&page.pageSize=20', '중첩 객체 → 점 표기');
  assertEq(dot({ a: { b: { c: 1 } } }), 'a.b.c=1', '3단 중첩도 점으로');

  /* 배열 인덱스는 두 표기 모두 대괄호 — Spring의 List 바인딩이 sorts[0].field 규약 */
  assertEq(dot({ sorts: [{ field: 'name', dir: 'asc' }] }),
    'sorts[0].field=name&sorts[0].dir=asc', '객체 배열 → 인덱스는 대괄호, 속성은 점');
  assertEq(dot({ tags: ['x', 'y'] }), 'tags[0]=x&tags[1]=y', '원시값 배열은 두 표기 동일');
  assertEq(dot({ m: [[1, 2]] }), 'm[0][0]=1&m[0][1]=2', '중첩 배열');

  /* 평면 파라미터와 빈 값 규칙은 bracket과 동일 */
  assertEq(dot({ a: 1, b: 'x' }), 'a=1&b=x', '평면 파라미터는 표기 무관');
  assertEq(dot({ a: undefined, b: null }), 'b=', 'undefined 생략 / null 빈 값');

  /* 기본값이 dot — bracket만 명시적으로 옵트인한다 */
  assertEq(decodeURIComponent(T.buildQueryString({ p: { a: 1 } })), 'p.a=1', '기본은 dot');
  assertEq(decodeURIComponent(T.buildQueryString({ p: { a: 1 } }, 'dot')), 'p.a=1', "'dot' 명시");
  assertEq(decodeURIComponent(T.buildQueryString({ p: { a: 1 } }, 'bracket')), 'p[a]=1', "'bracket' 옵트인");
  assertEq(decodeURIComponent(T.buildQueryString({ p: { a: 1 } }, 'nope')), 'p.a=1', '모르는 값 → 기본(dot)');
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

  assertEq(T.parseDataSourceResponse([{ a: 1 }]), { rows: [{ a: 1 }], total: 1, hasTotal: false, last: null },
    'bare array response');
  assertEq(
    T.parseDataSourceResponse({ rows: [{ a: 1 }], total: 99 }),
    { rows: [{ a: 1 }], total: 99, hasTotal: true, last: null },
    '{rows, total} response'
  );
  assertEq(T.parseDataSourceResponse({ rows: [{}] }), { rows: [{}], total: 1, hasTotal: false, last: null },
    'total defaults to rows.length');
  assertEq(T.parseDataSourceResponse(null), { rows: [], total: 0, hasTotal: false, last: null },
    'malformed response → empty');

  /* v2.22 — hasTotal은 "서버가 실제로 준 총건수인가". rows.length로 채운 값을
   * 기지의 총계로 믿으면 무한 스크롤이 첫 페이지에서 끝나버린다. */
  assertEq(T.parseDataSourceResponse({ rows: [{}, {}] }).hasTotal, false, '채운 total은 hasTotal false');
  assertEq(T.parseDataSourceResponse({ rows: [], total: 0 }).hasTotal, true, 'total: 0도 서버가 준 값');
  assertEq(T.parseDataSourceResponse({ rows: [{}], last: true }).last, true, '마지막 페이지 플래그를 함께 읽는다');
  assertEq(T.parseDataSourceResponse({ rows: [{}], hasMore: true }).last, false, 'hasMore는 반전');
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

  /* 커스텀 함수 aggFunc — 트리에서만 ctx.parent가 부모 행으로 채워진다.
   * "이름 (자손 리프 수)" 표시가 이 API의 주 동기다. */
  var named = T.computeTreeSummary(roots, getId, [{ field: 'id', aggFunc: function (values, ctx) {
    return ctx.parent.id + ' (' + ctx.rows.length + ')';
  } }]);
  assertEq(named.root.id, 'root (3)', 'parent 행 + 자손 리프 수');
  assertEq(named.sub.id, 'sub (2)', '중첩 부모도 자기 리프 기준');
  assertEq(named.single, undefined, '리프 루트는 여전히 요약 없음');

  /* 예외 → 해당 집계만 null, failures로 보고 (부모마다 1건씩) */
  var tfail = [];
  var tboom = T.computeTreeSummary(roots, getId,
    [{ field: 'size', aggFunc: function () { throw new Error('boom'); } }], tfail);
  assertEq(tboom.root.size, null, '실패한 집계는 null');
  assertEq(tfail.length, 2, '부모 2개 → failure 2건');
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

  /* required 선언도 편집 의도 — 올려주지 않으면 required만 쓴 컬럼이 조용히 무동작 */
  var req = T.normalizeColumns([
    { field: 'a', required: true },
    { field: 'b', required: true, editable: false },
    { field: 'c' },
  ]);
  assertEq(req[0].editable, true, 'required declared → editable defaults to true');
  assertEq(req[1].editable, false, 'explicit editable:false wins over required');
  assertEq(req[2].required, false, 'required defaults to false');

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

/* ---------------- date/datetime 에디터 ---------------- */
suite('toDateInputValue', function () {
  assertEq(T.toDateInputValue('2024-03-15', false), '2024-03-15', 'ISO date → date input');
  assertEq(T.toDateInputValue('2024-03-15', true), '2024-03-15T00:00', 'ISO date → datetime input');
  assertEq(T.toDateInputValue(new Date(2024, 2, 15, 14, 30), true), '2024-03-15T14:30', 'Date → datetime input');
  assertEq(T.toDateInputValue(new Date(2024, 2, 15, 14, 30), false), '2024-03-15', 'datetime → date input drops time');
  assertEq(T.toDateInputValue('2024/03/15', false), '2024-03-15', 'slash format normalized');
  assertEq(T.toDateInputValue(new Date(2024, 0, 5).getTime(), false), '2024-01-05', 'timestamp → date input');

  assertEq(T.toDateInputValue(null, false), '', 'null → empty input');
  assertEq(T.toDateInputValue(undefined, false), '', 'undefined → empty input');
  assertEq(T.toDateInputValue('', false), '', 'empty string → empty input');
  assertEq(T.toDateInputValue('나중에', false), '', 'unparsable → empty input (no crash)');
});

suite('parseDateInputValue', function () {
  /* 타입 보존 (auto) — 원본이 무엇이었냐로 커밋 타입이 정해진다 */
  var asDate = T.parseDateInputValue('2024-03-15', new Date(2020, 0, 1));
  assert(asDate instanceof Date, 'Date 원본 → Date 커밋');
  assertEq(asDate.getFullYear(), 2024, 'Date 커밋: 연도');
  assertEq(asDate.getDate(), 15, 'Date 커밋: 일 (로컬, 하루 안 밀림)');
  assertEq(asDate.getHours(), 0, 'Date 커밋: 로컬 자정');

  assertEq(T.parseDateInputValue('2024-03-15', 1700000000000), new Date(2024, 2, 15).getTime(),
    '숫자 원본 → 타임스탬프 커밋');
  assertEq(T.parseDateInputValue('2024-03-15', '2020-01-01'), '2024-03-15', '문자열 원본 → 문자열 커밋');
  assertEq(T.parseDateInputValue('2024-03-15T14:30', '2020-01-01T00:00'), '2024-03-15T14:30',
    'datetime 문자열 원문 유지');

  /* column.format이 날짜 패턴이면 그 표기로 커밋 (원시 값 = 화면 표기) */
  assertEq(T.parseDateInputValue('2024-03-15', '2020/01/01', { format: 'yyyy/MM/dd' }), '2024/03/15',
    'format 패턴으로 커밋');
  assertEq(T.parseDateInputValue('2024-03-15', '2020-01-01', { format: '#,##0' }), '2024-03-15',
    '숫자 마스크는 날짜 패턴이 아니므로 입력 원문 유지');

  /* valueType 강제 지정 */
  assert(T.parseDateInputValue('2024-03-15', '2020-01-01', { valueType: 'date' }) instanceof Date,
    "valueType: 'date' 강제");
  assertEq(T.parseDateInputValue('2024-03-15', '2020-01-01', { valueType: 'timestamp' }),
    new Date(2024, 2, 15).getTime(), "valueType: 'timestamp' 강제");
  assertEq(T.parseDateInputValue('2024-03-15', new Date(2020, 0, 1), { valueType: 'string' }),
    '2024-03-15', "valueType: 'string' 강제");
  assert(T.parseDateInputValue('2024-03-15', '2020-01-01', { valueType: 'auto' }) === '2024-03-15',
    "valueType: 'auto'는 생략과 동일");

  /* 빈 입력 = 날짜 지우기, 단 원본도 빈 값이면 변경 없음 (스퓨리어스 커밋 가드) */
  assertEq(T.parseDateInputValue('', '2020-01-01'), null, '빈 입력 → null (지우기)');
  assertEq(T.parseDateInputValue('', new Date(2020, 0, 1)), null, '빈 입력 → null (Date 원본도)');
  assertEq(T.parseDateInputValue('', null), null, '원본 null + 빈 입력 → null 그대로');
  assertEq(T.parseDateInputValue('', ''), '', "원본 '' + 빈 입력 → '' 유지 (스퓨리어스 커밋 방지)");
  assertEq(T.parseDateInputValue('', undefined), undefined, '원본 undefined + 빈 입력 → undefined 유지');

  /* 해석 불가 입력은 원본 유지 */
  assertEq(T.parseDateInputValue('garbage', '2020-01-01'), '2020-01-01', '해석 불가 입력 → 원본 유지');

  /* 왕복: 에디터를 열었다 그대로 닫으면 값이 변하지 않아야 한다 */
  ['2024-03-15', '2024-12-31', '2024-01-01'].forEach(function (s) {
    assertEq(T.parseDateInputValue(T.toDateInputValue(s, false), s), s, 'round-trip 문자열 ' + s);
  });
  var dRound = new Date(2024, 6, 4, 9, 5);
  assertEq(T.parseDateInputValue(T.toDateInputValue(dRound, true), dRound).getTime(), dRound.getTime(),
    'round-trip Date (분 단위)');
});

suite('editValueEquals', function () {
  assert(T.editValueEquals(1, 1), '원시값 동일');
  assert(!T.editValueEquals(1, 2), '원시값 상이');
  assert(T.editValueEquals(null, null), 'null 동일');
  assert(!T.editValueEquals(null, ''), "null !== ''");
  /* Date는 참조가 아니라 시각으로 — 이게 아니면 date 에디터가 매번 변경으로 잡힌다 */
  assert(T.editValueEquals(new Date(2024, 2, 15), new Date(2024, 2, 15)), '같은 시각의 다른 Date 인스턴스는 동일');
  assert(!T.editValueEquals(new Date(2024, 2, 15), new Date(2024, 2, 16)), '다른 시각의 Date는 상이');
  assert(!T.editValueEquals(new Date(2024, 2, 15), '2024-03-15'), 'Date와 문자열은 상이');
});

suite('defaultEditorType', function () {
  assertEq(T.defaultEditorType({}), 'text', '기본은 text');
  assertEq(T.defaultEditorType({ dataType: 'number' }), 'number', "dataType: 'number' → number");
  assertEq(T.defaultEditorType({ filter: 'number' }), 'number', "filter: 'number' → number");
  assertEq(T.defaultEditorType({ dataType: 'date' }), 'date', "dataType: 'date' → date");
  assertEq(T.defaultEditorType({ dataType: 'bool' }), 'text', "dataType: 'bool' → text (전용 에디터 없음)");
  assertEq(T.defaultEditorType({ dataType: 'string' }), 'text', "dataType: 'string' → text");
});

suite('resolveDomLayout', function () {
  assertEq(T.resolveDomLayout(undefined), 'normal', '생략 → normal');
  assertEq(T.resolveDomLayout('normal'), 'normal', "'normal' 명시");
  assertEq(T.resolveDomLayout('autoHeight'), 'autoHeight', "'autoHeight'");
  assertEq(T.resolveDomLayout('fill'), 'fill', "'fill'");
  /* 오타가 레이아웃을 통째로 바꾸면 원인 찾기가 어렵다 — 모르는 값은 normal로 */
  assertEq(T.resolveDomLayout('Fill'), 'normal', '대소문자 다르면 normal (엄격 매칭)');
  assertEq(T.resolveDomLayout('auto'), 'normal', '모르는 값 → normal');
  assertEq(T.resolveDomLayout(null), 'normal', 'null → normal');
  assertEq(T.resolveDomLayout(true), 'normal', '불리언 → normal');
});

suite('resolveDataModes — pageMode 상속', function () {
  /* 아무것도 안 주면 셋 다 client (기존 기본값과 동일) */
  var none = T.resolveDataModes({});
  assertEq(none.pageMode, 'client', '생략 → pageMode client');
  assertEq(none.sortMode, 'client', '생략 → sortMode client');
  assertEq(none.filterMode, 'client', '생략 → filterMode client');
  assertEq(none.warnings.length, 0, '경고 없음');
  assertEq(T.resolveDataModes(undefined).pageMode, 'client', 'options 자체가 없어도 크래시 없음');

  /* 핵심 규칙: pageMode: 'server'면 명시하지 않은 축이 따라온다.
   * 서버 페이징에서 클라 정렬은 현재 페이지만 정렬하므로 조용히 틀린 결과가 된다. */
  var server = T.resolveDataModes({ pageMode: 'server' });
  assertEq(server.sortMode, 'server', "pageMode: 'server' → sortMode 상속");
  assertEq(server.filterMode, 'server', "pageMode: 'server' → filterMode 상속");
  assertEq(server.warnings.length, 0, '상속은 경고 대상이 아님');

  /* 상속은 단방향 — sort/filter가 server라고 pageMode를 끌어올리지 않는다.
   * (서버가 정렬된 전체를 주고 클라가 페이징하는 정상 조합) */
  var sortOnly = T.resolveDataModes({ sortMode: 'server' });
  assertEq(sortOnly.pageMode, 'client', "sortMode: 'server'가 pageMode를 바꾸지 않음");
  assertEq(sortOnly.filterMode, 'client', 'filterMode도 pageMode(client)를 따름');
  assertEq(T.resolveDataModes({ filterMode: 'server' }).pageMode, 'client', 'filterMode도 단방향');

  /* 명시 지정은 상속을 이긴다 */
  var mixed = T.resolveDataModes({ pageMode: 'server', sortMode: 'client' });
  assertEq(mixed.sortMode, 'client', '명시한 client가 상속을 이긴다');
  assertEq(mixed.filterMode, 'server', '명시 안 한 축은 여전히 상속');
  assertEq(mixed.warnings.length, 1, '어긋난 조합은 경고 1건');
  assertEq(mixed.warnings[0], 'sortMode', '경고 대상 키');

  var both = T.resolveDataModes({ pageMode: 'server', sortMode: 'client', filterMode: 'client' });
  assertEq(both.warnings.length, 2, '두 축 모두 어긋나면 경고 2건');

  /* pageMode가 client면 client 명시는 지극히 정상 — 경고하지 않는다 */
  assertEq(T.resolveDataModes({ pageMode: 'client', sortMode: 'client' }).warnings.length, 0,
    'client + client 조합은 경고 없음');
  assertEq(T.resolveDataModes({ pageMode: 'client', sortMode: 'server' }).warnings.length, 0,
    'client 페이징 + server 정렬은 정상 조합');

  /* 모르는 값은 client로 (resolveDomLayout과 같은 엄격 매칭 규칙) */
  assertEq(T.resolveDataModes({ pageMode: 'Server' }).pageMode, 'client', '대소문자 다르면 client');
  assertEq(T.resolveDataModes({ pageMode: 'remote' }).pageMode, 'client', '모르는 값 → client');
  /* null/undefined는 "미지정"이라 상속, 그 외 잘못된 값은 client 명시로 취급 */
  assertEq(T.resolveDataModes({ pageMode: 'server', sortMode: null }).sortMode, 'server', 'null → 미지정으로 상속');
  assertEq(T.resolveDataModes({ pageMode: 'server', sortMode: undefined }).sortMode, 'server', 'undefined → 상속');
  assertEq(T.resolveDataModes({ pageMode: 'server', sortMode: 'oops' }).sortMode, 'client', '잘못된 값 → client');

  /* v2.22 — infiniteScroll은 서버 페이징이 전제이므로 pageMode를 올린다 */
  var inf = T.resolveDataModes({ infiniteScroll: true });
  assertEq(inf.pageMode, 'server', 'infiniteScroll → pageMode server');
  assertEq(inf.sortMode, 'server', 'sort도 따라 올라감');
  assertEq(inf.filterMode, 'server', 'filter도 따라 올라감');
  assertEq(inf.warnings.length, 0, '자동 승격은 경고 대상 아님');
  /* 명시 지정은 여전히 이긴다 */
  assertEq(T.resolveDataModes({ infiniteScroll: true, pageMode: 'client' }).pageMode, 'client',
    '명시한 pageMode가 승격을 이긴다');
  assertEq(T.resolveDataModes({ infiniteScroll: true, sortMode: 'client' }).warnings[0], 'sortMode',
    '승격된 server + 명시 client는 종전대로 경고');
});

suite('resolveInfiniteScroll — 무한 스크롤 옵션 정규화', function () {
  var ds = { url: '/api/x' };

  var off = T.resolveInfiniteScroll({});
  assertEq(off.enabled, false, '옵션 없으면 비활성');
  assertEq(off.warnings.length, 0, '비활성은 경고 없음');
  assertEq(T.resolveInfiniteScroll(undefined).enabled, false, 'options 자체가 없어도 크래시 없음');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: false, dataSource: ds }).enabled, false, 'false는 비활성');

  var on = T.resolveInfiniteScroll({ infiniteScroll: true, dataSource: ds });
  assertEq(on.enabled, true, 'true + dataSource → 활성');
  assertEq(on.threshold, 200, '기본 임계값 200px');
  assertEq(on.pageSize, null, 'pageSize 미지정이면 null (paginationPageSize를 쓴다)');

  /* dataSource 없이는 자동 조회할 대상이 없다 — 조용히 무시하지 않고 알린다 */
  var noDs = T.resolveInfiniteScroll({ infiniteScroll: true });
  assertEq(noDs.enabled, false, 'dataSource 없으면 비활성');
  assertEq(noDs.warnings[0], 'noDataSource', '경고 키');

  var cfg = T.resolveInfiniteScroll({ infiniteScroll: { threshold: 50, pageSize: 30 }, dataSource: ds });
  assertEq(cfg.threshold, 50, '객체 설정 threshold');
  assertEq(cfg.pageSize, 30, '객체 설정 pageSize');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { threshold: 0 }, dataSource: ds }).threshold, 0,
    'threshold 0 = 정확히 바닥에서만 (유효값)');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { threshold: -5 }, dataSource: ds }).threshold, 200,
    '음수는 기본값으로');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { threshold: 'x' }, dataSource: ds }).threshold, 200,
    '숫자 아니면 기본값');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { pageSize: 0 }, dataSource: ds }).pageSize, null,
    'pageSize 0은 무효');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { pageSize: 25.7 }, dataSource: ds }).pageSize, 25,
    '소수는 내림');

  /* 어긋난 조합 — 막지는 않고 경고만 */
  var client = T.resolveInfiniteScroll({ infiniteScroll: true, dataSource: ds, pageMode: 'client' });
  assertEq(client.enabled, true, "pageMode: 'client'여도 막지는 않는다 (request 훅 구성 가능)");
  assertEq(client.warnings[0], 'clientPageMode', '경고 키');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: true, dataSource: ds, domLayout: 'autoHeight' }).warnings[0],
    'autoHeight', 'autoHeight는 스크롤이 안 생겨 끝까지 받는다 — 경고');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: true, domLayout: 'autoHeight' }).warnings.length, 1,
    '비활성이면 추가 경고를 쌓지 않는다 (noDataSource 하나뿐)');

  /* v2.23 — 페이저가 없으니 크기 변경 UI는 상태 바가 대신한다 (기본 표시) */
  assertEq(on.pageSizeSelector, true, '기본은 크기 선택 표시');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { pageSizeSelector: false }, dataSource: ds }).pageSizeSelector,
    false, 'false면 숨김');
  assertEq(T.resolveInfiniteScroll({ infiniteScroll: { pageSizeSelector: 0 }, dataSource: ds }).pageSizeSelector,
    true, 'false가 아닌 값은 모두 표시 (opt-out만 허용)');
  assertEq(off.pageSizeSelector, false, '무한 스크롤이 아니면 선택 UI도 없음');
});

suite('pageSizeSelectOptions — 페이지 크기 선택지', function () {
  assertEq(T.pageSizeSelectOptions([10, 20, 50, 100], 20), [10, 20, 50, 100], '현재 값이 목록에 있으면 그대로');

  /* 핵심: 현재 값이 목록에 없으면 select가 빈 칸이 된다 (selectedIndex -1) */
  assertEq(T.pageSizeSelectOptions([10, 20, 50, 100], 25), [10, 20, 25, 50, 100],
    '현재 값을 정렬된 자리에 끼워 넣는다');
  assertEq(T.pageSizeSelectOptions([10, 20], 5), [5, 10, 20], '가장 작아도 앞에 들어간다');
  assertEq(T.pageSizeSelectOptions([10, 20], 500), [10, 20, 500], '가장 커도 뒤에 들어간다');

  assertEq(T.pageSizeSelectOptions([50, 10, 20], 20), [10, 20, 50], '오름차순 정렬');
  assertEq(T.pageSizeSelectOptions([10, 10, 20], 20), [10, 20], '중복 제거');
  assertEq(T.pageSizeSelectOptions(['10', '20'], 20), [10, 20], '문자열 숫자도 수용');

  /* 크기로 성립하지 않는 값은 버린다 — 0이 남으면 나눗셈이 무한대가 된다 */
  assertEq(T.pageSizeSelectOptions([0, -5, 'x', null, 20], 20), [20], '0·음수·비숫자는 제외');
  assertEq(T.pageSizeSelectOptions([], 25), [25], '목록이 비어도 현재 값은 남는다');
  assertEq(T.pageSizeSelectOptions(null, 25), [25], 'null 목록 안전');
  assertEq(T.pageSizeSelectOptions([10, 20], 0), [10, 20], '현재 값이 무효면 끼워 넣지 않는다');
  assertEq(T.pageSizeSelectOptions(null, null), [], '둘 다 없으면 빈 목록');
});

suite('shouldLoadMore — 바닥 판정', function () {
  var base = {
    enabled: true, hasMore: true, loading: false, threshold: 200,
    scrollTop: 0, clientHeight: 400, scrollHeight: 4000,
  };
  var w = function (patch) {
    var o = {}, k;
    for (k in base) o[k] = base[k];
    for (k in patch || {}) o[k] = patch[k];
    return o;
  };

  assertEq(T.shouldLoadMore(w()), false, '맨 위에서는 로드 안 함');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3399 })), false, '남은 201px — 아직');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3400 })), true, '남은 거리가 임계값과 같으면 로드 (경계 포함)');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3401 })), true, '임계값 안으로 들어오면 로드');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3600 })), true, '완전히 바닥이면 로드');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3400, threshold: 0 })), false, 'threshold 0이면 정확히 바닥에서만');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3600, threshold: 0 })), true, 'threshold 0 + 바닥');

  /* 가드 3종 */
  assertEq(T.shouldLoadMore(w({ scrollTop: 3600, enabled: false })), false, '비활성이면 안 함');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3600, hasMore: false })), false, '마지막이면 안 함');
  assertEq(T.shouldLoadMore(w({ scrollTop: 3600, loading: true })), false, '로드 중이면 안 함 (중복 요청 방지)');

  /* 첫 페이지가 뷰포트를 못 채운 경우 — 스크롤이 없으니 scroll 이벤트도 없다.
   * 이걸 바닥으로 보지 않으면 "더 있는데 멈춘 그리드"가 된다. */
  assertEq(T.shouldLoadMore(w({ scrollHeight: 300, clientHeight: 400 })), true,
    '내용이 뷰포트보다 작으면 바닥으로 본다');

  /* 레이아웃이 없는 경우(숨겨진 탭 등)는 판정 불가 — 안 보이는 그리드가 끝까지 받아버리면 안 된다 */
  assertEq(T.shouldLoadMore(w({ clientHeight: 0, scrollHeight: 0 })), false, 'clientHeight 0이면 판정 보류');
  assertEq(T.shouldLoadMore(undefined), false, '인자 없어도 크래시 없음');
});

suite('readLastPageFlag — 서버 마지막 페이지 플래그', function () {
  assertEq(T.readLastPageFlag({ last: true }), true, 'last: true = 마지막 (Spring Data Page)');
  assertEq(T.readLastPageFlag({ last: false }), false, 'last: false = 더 있음');
  assertEq(T.readLastPageFlag({ lastPage: true }), true, 'lastPage');
  assertEq(T.readLastPageFlag({ isLast: true }), true, 'isLast');
  /* hasMore/hasNext는 의미가 반대 */
  assertEq(T.readLastPageFlag({ hasMore: true }), false, 'hasMore: true = 아직 아님');
  assertEq(T.readLastPageFlag({ hasMore: false }), true, 'hasMore: false = 마지막');
  assertEq(T.readLastPageFlag({ hasNext: false }), true, 'hasNext: false = 마지막');

  assertEq(T.readLastPageFlag({}), null, '아무 키도 없으면 모름');
  assertEq(T.readLastPageFlag(null), null, 'null 안전');
  assertEq(T.readLastPageFlag([1, 2]), null, '배열 응답에는 플래그가 없다');
  /* 불리언이 아닌 값은 모름 — 문자열 'false'가 true로 읽히면 안 된다 */
  assertEq(T.readLastPageFlag({ last: 'false' }), null, "문자열 'false'는 모름으로");
  assertEq(T.readLastPageFlag({ last: 0 }), null, '숫자도 모름으로');
  /* 우선순위: last가 hasMore보다 앞 */
  assertEq(T.readLastPageFlag({ last: true, hasMore: true }), true, 'last가 우선');
});

suite('resolveLastPage — 마지막 페이지 확정', function () {
  /* 1. 명시 플래그가 최우선 — 다른 신호로 덮지 않는다 */
  assertEq(T.resolveLastPage({ explicit: false, receivedCount: 0 }), false,
    '서버가 더 있다고 하면 0건이어도 그 말을 따른다');
  assertEq(T.resolveLastPage({ explicit: true, receivedCount: 50, pageSize: 50, total: 1000, loaded: 50 }), true,
    '서버가 마지막이라 하면 다른 신호와 무관하게 마지막');

  /* 2. 수신 0건 = 무한 루프 안전장치 */
  assertEq(T.resolveLastPage({ explicit: null, receivedCount: 0 }), true, '0건이면 마지막');
  assertEq(T.resolveLastPage({ receivedCount: 0, pageSize: 50 }), true, 'explicit 생략 + 0건');

  /* 3. total 기지 */
  assertEq(T.resolveLastPage({ receivedCount: 20, pageSize: 50, loaded: 100, total: 100 }), true,
    'loaded === total이면 마지막');
  assertEq(T.resolveLastPage({ receivedCount: 50, pageSize: 50, loaded: 50, total: 500 }), false,
    'total이 남았으면 더 있음');
  /* total을 모르면(null) 이 규칙은 건너뛴다 — rows.length로 채운 값을 믿으면 첫 페이지에서 끝난다 */
  assertEq(T.resolveLastPage({ receivedCount: 50, pageSize: 50, loaded: 50, total: null }), false,
    'total 미지 + 꽉 찬 페이지 = 더 있음');

  /* 4. 부분 페이지 추론 */
  assertEq(T.resolveLastPage({ receivedCount: 30, pageSize: 50, loaded: 130 }), true,
    'pageSize보다 적게 오면 마지막');
  assertEq(T.resolveLastPage({ receivedCount: 50, pageSize: 50, loaded: 150 }), false,
    '꽉 찬 페이지면 더 있음 (다음 요청이 0건이면 그때 끝)');
  /* pageSize를 모르면 추론하지 않는다 */
  assertEq(T.resolveLastPage({ receivedCount: 3, loaded: 3 }), false, 'pageSize 없으면 부분 페이지 추론 없음');
  assertEq(T.resolveLastPage(undefined), true, '인자 없으면 0건 취급 → 마지막 (무한 루프 방지 쪽으로)');
});

suite('resolveInfiniteStatus — 하단 상태 바 문구', function () {
  var loading = T.resolveInfiniteStatus({ loading: true, hasMore: true, loaded: 40 });
  assertEq(loading.kind, 'loading', '로딩 중');
  assertEq(loading.key, 'loadingMore', '로케일 키');

  /* 로딩이 마지막 판정보다 우선 — 로딩 중에 "마지막"이 뜨면 안 된다 */
  assertEq(T.resolveInfiniteStatus({ loading: true, hasMore: false, loaded: 40 }).kind, 'loading',
    '로딩이 우선');

  var end = T.resolveInfiniteStatus({ loading: false, hasMore: false, loaded: 137 });
  assertEq(end.kind, 'end', '마지막 도달');
  assertEq(end.key, 'noMoreRows', '로케일 키');
  assertEq(end.params.loaded, 137, '누적 건수');

  var moreNoTotal = T.resolveInfiniteStatus({ loading: false, hasMore: true, loaded: 40, total: null });
  assertEq(moreNoTotal.key, 'rowsLoaded', 'total 모르면 누적만');
  assertEq(moreNoTotal.params.loaded, 40, '누적 건수');

  var moreTotal = T.resolveInfiniteStatus({ loading: false, hasMore: true, loaded: 40, total: 500 });
  assertEq(moreTotal.key, 'rowsLoadedOfTotal', 'total 알면 분모까지');
  assertEq(moreTotal.params.total, 500, '총건수');

  assertEq(T.resolveInfiniteStatus({}).kind, 'end', '아무것도 없으면 더 받을 게 없는 상태');
  assertEq(T.resolveInfiniteStatus({}).params.loaded, 0, '0건');
  assertEq(T.resolveInfiniteStatus(undefined).kind, 'end', '인자 없어도 크래시 없음');
});

suite('shouldResetPageOnReload', function () {
  /* 명시적 재조회는 조회 조건이 바뀐 경우가 대부분 — 리셋이 기본 */
  assert(T.shouldResetPageOnReload(undefined), '인자 없음 → 1페이지로 리셋');
  assert(T.shouldResetPageOnReload({}), '빈 객체 → 리셋');
  assert(T.shouldResetPageOnReload(null), 'null → 리셋');
  assert(T.shouldResetPageOnReload({ keepPage: false }), 'keepPage: false → 리셋');
  /* 저장 후 보던 페이지 그대로 새로고침하는 탈출구 */
  assert(!T.shouldResetPageOnReload({ keepPage: true }), 'keepPage: true → 페이지 유지');
  /* 다른 키가 섞여도 keepPage만 본다 */
  assert(T.shouldResetPageOnReload({ silent: true }), '모르는 키만 있으면 리셋');
  assert(!T.shouldResetPageOnReload({ keepPage: true, silent: true }), '다른 키가 섞여도 유지');
});

suite('shouldAutoLoad — dataSource 최초 자동 조회', function () {
  /* 기본은 조회 — 기존 코드(autoLoad를 적지 않은 전부)의 동작이 그대로여야 한다 */
  assert(T.shouldAutoLoad({ url: '/api/x' }), '생략 → 자동 조회');
  assert(T.shouldAutoLoad({ url: '/api/x', autoLoad: true }), 'true → 자동 조회');

  /* 끄는 건 정확히 false일 때만 */
  assert(!T.shouldAutoLoad({ url: '/api/x', autoLoad: false }), 'false → 조회 안 함');
  assert(T.shouldAutoLoad({ url: '/api/x', autoLoad: 0 }), '0은 false가 아니므로 조회 (엄격 비교)');
  assert(T.shouldAutoLoad({ url: '/api/x', autoLoad: null }), 'null은 미지정 취급 → 조회');
  assert(T.shouldAutoLoad({ url: '/api/x', autoLoad: undefined }), 'undefined → 조회');
  assert(T.shouldAutoLoad({ url: '/api/x', autoLoad: 'false' }), "문자열 'false'는 참값 → 조회");

  /* dataSource 자체가 없으면 조회할 대상이 없다 */
  assert(!T.shouldAutoLoad(null), 'dataSource 없음 → 조회 안 함');
  assert(!T.shouldAutoLoad(undefined), 'undefined dataSource 안전');
});

suite('shouldShowEditableIcon', function () {
  var editable = { editable: true };
  var readonly = { editable: false };
  assert(T.shouldShowEditableIcon(editable, true, true), '편집 가능 + 그리드 활성 + 옵션 on → 표시');
  assert(!T.shouldShowEditableIcon(editable, true, false), '옵션 off → 미표시');
  assert(!T.shouldShowEditableIcon(readonly, true, true), '읽기 전용 컬럼 → 미표시');
  /* 그리드가 잠기면(editable: false / setEditable(false)) 컬럼 설정과 무관하게 감춘다 —
   * 편집할 수 없는데 편집 아이콘이 남아 있으면 거짓 정보가 된다 */
  assert(!T.shouldShowEditableIcon(editable, false, true), '그리드 잠금 → 미표시');
  assert(!T.shouldShowEditableIcon(null, true, true), 'null 컬럼 → 미표시 (크래시 없음)');
  assert(!T.shouldShowEditableIcon({}, true, true), 'editable 미지정 → 미표시');
  assert(T.shouldShowEditableIcon(editable, true, true) === true, '불리언 반환 (truthy 값 누출 없음)');
});

/* ---------------- required (column.required) ---------------- */
suite('isBlankValue', function () {
  var b = T.isBlankValue;
  assert(b(null), 'null = 빈 값');
  assert(b(undefined), 'undefined = 빈 값');
  assert(b(''), '빈 문자열 = 빈 값');
  assert(b('   '), '공백만 있는 문자열 = 빈 값');
  assert(b('\t\n'), '탭·개행만 = 빈 값');
  assert(b([]), '빈 배열(multiselect) = 빈 값');

  /* 0과 false는 유효한 입력이다 — 빈 값으로 보면 숫자 0이나 체크 해제를
   * 미입력으로 취급해 정상 값의 저장을 막아버린다 */
  assert(!b(0), '숫자 0 = 유효한 값');
  assert(!b(false), 'false(체크 해제) = 유효한 값');
  assert(!b('0'), "문자열 '0' = 유효한 값");
  assert(!b(['a']), '항목 있는 배열 = 유효한 값');
  assert(!b('a'), '문자열 = 유효한 값');
  assert(!b(new Date(2024, 0, 1)), 'Date 객체 = 유효한 값');
  assert(!b({}), '객체 = 유효한 값');
  assert(b(null) === true, '불리언 반환');
});

suite('isRequiredViolated', function () {
  var v = T.isRequiredViolated;
  assert(v({ required: true }, ''), 'required + 빈 값 → 위반');
  assert(v({ required: true }, null), 'required + null → 위반');
  assert(!v({ required: true }, 'x'), 'required + 값 있음 → 통과');
  assert(!v({ required: true }, 0), 'required + 0 → 통과');
  assert(!v({ required: false }, ''), 'required 아님 → 값과 무관하게 통과');
  assert(!v({}, ''), 'required 미지정 → 통과');
  assert(!v(null, ''), 'null 컬럼 → 통과 (크래시 없음)');
  assert(v({ required: true }, '') === true, '불리언 반환');
});

suite('shouldShowRequired', function () {
  var s = T.shouldShowRequired;
  var req = { required: true, editable: true };
  assert(s(req, true), 'required + 편집 가능 + 그리드 활성 → 표시');
  /* editableIndicator와 같은 기준 — 고칠 수 없는 자리의 "필수"는 할 일이 없다 */
  assert(!s(req, false), '그리드 잠금 → 미표시');
  assert(!s({ required: true, editable: false }, true), '편집 불가 컬럼 → 미표시');
  assert(!s({ required: false, editable: true }, true), 'required 아님 → 미표시');
  assert(!s(null, true), 'null 컬럼 → 미표시');
  assert(s(req, true) === true, '불리언 반환');
});

suite('shouldMarkRequiredCell', function () {
  var m = T.shouldMarkRequiredCell;
  var req = { required: true, editable: true };
  /* 셀 마커는 "비어서 조치가 필요한" 셀만 — 컬럼 전체에 그리면 정보량이 0이다 */
  assert(m(req, '', true), '필수 + 빈 값 → 마커');
  assert(!m(req, 'Seoul', true), '필수 + 값 있음 → 마커 없음');
  assert(!m(req, 0, true), '필수 + 0 → 마커 없음 (0은 유효한 값)');
  assert(!m(req, '', false), '그리드 잠금 → 마커 없음');
  assert(!m({ required: false, editable: true }, '', true), 'required 아님 → 마커 없음');
  assert(m(req, '', true) === true, '불리언 반환');
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

/* ---------------- interpolate ---------------- */
suite('interpolate', function () {
  var i = T.interpolate;
  assertEq(i('{a} to {b}', { a: 1, b: 20 }), '1 to 20', 'both tokens replaced');
  assertEq(i('{total}건 중 {from}–{to}', { total: 90, from: 1, to: 20 }),
    '90건 중 1–20', 'korean template');
  assertEq(i('no tokens', { a: 1 }), 'no tokens', 'template without tokens');
  assertEq(i('{a}', null), '{a}', 'no params → token kept');
  assertEq(i('{a} {b}', { a: 'x' }), 'x {b}', 'missing param keeps its token (오타를 화면에 드러냄)');
  assertEq(i('{a}', { a: 0 }), '0', 'falsy value is still substituted');
  assertEq(i('{a}', { a: null }), 'null', 'null stringified, not skipped');
  assertEq(i('{a}-{a}', { a: 'z' }), 'z-z', 'repeated token');
  assertEq(i('{ a }', { a: 1 }), '{ a }', 'spaces inside braces are not a token');
  assertEq(i(undefined, { a: 1 }), '', 'undefined template → empty string');
  assertEq(i(null), '', 'null template → empty string');
  assertEq(i(42), '42', 'non-string template stringified');
  /* 치환값이 토큰을 포함해도 2차 치환은 일어나지 않는다 (replace 콜백이라 안전) */
  assertEq(i('{a}', { a: '{a}' }), '{a}', 'substituted value is not re-scanned');
});

/* ---------------- resolveLocaleText ---------------- */
suite('resolveLocaleText', function () {
  var r = T.resolveLocaleText;

  var def = r();
  assertEq(def.filterApply, 'Apply', 'no arg → english defaults');
  assertEq(def.noRowsToShow, 'No rows to show', 'default overlay text');
  assertEq(r(null).blanks, '(Blanks)', 'null → defaults');
  assertEq(r('ko').filterApply, 'Apply', 'non-object ignored');

  var partial = r({ filterApply: '적용' });
  assertEq(partial.filterApply, '적용', 'override applied');
  assertEq(partial.filterClear, 'Clear', 'unspecified keys keep english default');

  var ko = r(T.LOCALE_KO);
  assertEq(ko.noRowsToShow, '표시할 데이터가 없습니다', 'full korean locale');
  assertEq(
    Object.keys(T.LOCALE_KO).sort(),
    Object.keys(T.LOCALE_EN).sort(),
    'ko covers exactly the en keys (번역 누락/오타 키 방지)'
  );

  /* 문자열이 아닌 값은 화면에 [object Object]로 새지 않도록 무시한다 */
  var bad = r({ filterApply: { text: '적용' }, filterClear: 123, blanks: null, loading: '로딩' });
  assertEq(bad.filterApply, 'Apply', 'object value ignored');
  assertEq(bad.filterClear, 'Clear', 'number value ignored');
  assertEq(bad.blanks, '(Blanks)', 'null value ignored');
  assertEq(bad.loading, '로딩', 'valid sibling still applied');

  assertEq(r({ myOwnKey: 'x' }).myOwnKey, 'x', 'unknown keys kept (소비자 확장 허용)');
  assertEq(r({ filterApply: '' }).filterApply, '', 'empty string is a valid override');

  /* 원본을 오염시키지 않는다 — 다음 그리드가 앞 그리드의 로케일을 물려받으면 안 된다 */
  r({ filterApply: '적용' });
  assertEq(T.LOCALE_EN.filterApply, 'Apply', 'LOCALE_EN not mutated');
  assertEq(r().filterApply, 'Apply', 'later resolve unaffected');
});

/* ---------------- resolveStatusColumnConfig × localeText ---------------- */
suite('resolveStatusColumnConfig (localeText)', function () {
  var ko = T.resolveStatusColumnConfig(true, T.resolveLocaleText(T.LOCALE_KO));
  assertEq(ko.headerName, '상태', 'header from locale');
  assertEq(ko.labels, { added: '신규', updated: '수정', deleted: '삭제' }, 'labels from locale');

  /* 명시 설정이 로케일보다 우선 */
  var mixed = T.resolveStatusColumnConfig(
    { headerName: '변경', labels: { deleted: '폐기' } },
    T.resolveLocaleText(T.LOCALE_KO)
  );
  assertEq(mixed.headerName, '변경', 'explicit headerName wins over locale');
  assertEq(mixed.labels.deleted, '폐기', 'explicit label wins over locale');
  assertEq(mixed.labels.added, '신규', 'unspecified label still from locale');

  assertEq(T.resolveStatusColumnConfig(true).headerName, 'Status', 'no locale arg → english');
});

/* ---------------- resolvePopupEditorConfig ---------------- */
suite('resolvePopupEditorConfig', function () {
  var r = T.resolvePopupEditorConfig;

  assertEq(r(false), null, 'falsy → null (기능 꺼짐)');
  assertEq(r(undefined), null, 'undefined → null');
  assertEq(r(0), null, '0 → null');

  var d = r(true);
  assertEq(d.position, 'center', 'true → 중앙 팝업 기본');
  assertEq(d.width, 420, 'default width');
  assertEq(d.columns, 1, 'default columns');
  assertEq(d.trigger, 'dblclick', 'default trigger');
  assertEq(d.instantUpdate, false, 'default instantUpdate');
  assertEq(d.closeOnBackdrop, true, 'default closeOnBackdrop');
  assertEq(d.fields, null, 'default fields = 전체');
  assertEq(d.buttons.map(function (b) { return b.key; }), ['save', 'cancel'], 'default buttons');

  assertEq(r({ position: 'left' }).position, 'left', 'left');
  assertEq(r({ position: 'right' }).position, 'right', 'right');
  /* 오타가 레이아웃을 통째로 바꾸지 않게 (resolveDomLayout과 같은 방침) */
  assertEq(r({ position: 'top' }).position, 'center', '모르는 position → center');
  assertEq(r({ position: null }).position, 'center', 'null position → center');

  assertEq(r({ width: 0 }).width, 420, 'width 0은 무시');
  assertEq(r({ width: -10 }).width, 420, '음수 width 무시');
  assertEq(r({ width: '500' }).width, 420, '문자열 width 무시');
  assertEq(r({ width: 500 }).width, 500, '유효한 width 적용');
  assertEq(r({ columns: 2 }).columns, 2, 'columns 2');
  assertEq(r({ columns: 3 }).columns, 1, '지원하지 않는 columns → 1');

  assertEq(r({ trigger: 'none' }).trigger, 'none', 'trigger none');
  assertEq(r({ trigger: 'click' }).trigger, 'dblclick', '모르는 trigger → dblclick');
  assertEq(r({ closeOnBackdrop: false }).closeOnBackdrop, false, 'closeOnBackdrop 끄기');
  assertEq(r({ instantUpdate: 1 }).instantUpdate, true, 'truthy instantUpdate');
  assertEq(r({ title: 'X' }).title, 'X', '문자열 title');
  assertEq(typeof r({ title: function () {} }).title, 'function', '함수 title');
  assertEq(r({ title: 42 }).title, null, '문자열/함수가 아닌 title은 무시');
  assertEq(r({ fields: ['a', 'b'] }).fields, ['a', 'b'], 'fields 목록');
  assertEq(r({ fields: 'a' }).fields, null, '배열 아닌 fields 무시');

  /* fields 배열은 사본이어야 한다 — 소비자가 나중에 바꿔도 설정이 안 흔들리게 */
  var src = ['a'];
  var cfg = r({ fields: src });
  src.push('b');
  assertEq(cfg.fields, ['a'], 'fields는 사본');
});

/* ---------------- resolvePopupButtons ---------------- */
suite('resolvePopupButtons', function () {
  var r = T.resolvePopupButtons;

  assertEq(r(undefined).map(function (b) { return b.key; }), ['save', 'cancel'], '생략 → 기본 버튼');
  assertEq(r('save').map(function (b) { return b.key; }), ['save', 'cancel'], '배열 아니면 기본');
  /* 빈 배열은 "버튼 없음"으로 존중 — 헤더 닫기와 Esc가 남으므로 갇히지 않는다 */
  assertEq(r([]), [], '빈 배열 = 버튼 없음');

  var b = r(['save']);
  assertEq(b.length, 1, 'save 하나만');
  assertEq(b[0].builtin, 'save', 'builtin 표시');
  assertEq(b[0].variant, 'primary', 'save는 primary');
  assertEq(r(['cancel'])[0].variant, 'default', 'cancel은 default');
  assertEq(r(['close'])[0].builtin, 'close', 'close 내장 버튼');

  /* 배열 순서 = 배치 순서 (기본 버튼을 앞뒤로 옮기거나 뺄 수 있다) */
  assertEq(
    r(['cancel', 'save']).map(function (x) { return x.key; }),
    ['cancel', 'save'],
    '순서 존중'
  );

  var custom = r([{ key: 'del', text: '삭제', variant: 'danger', title: '행 삭제' }]);
  assertEq(custom[0].key, 'del', 'custom key');
  assertEq(custom[0].text, '삭제', 'custom text');
  assertEq(custom[0].variant, 'danger', 'danger variant');
  assertEq(custom[0].title, '행 삭제', 'custom title');
  assertEq(custom[0].builtin, null, 'custom은 builtin 아님');

  assertEq(r([{ text: 'X' }])[0].key, 'X', 'key 생략 시 text가 key');
  assertEq(r([{ text: 'X', variant: 'weird' }])[0].variant, 'default', '모르는 variant → default');
  assertEq(typeof r([{ text: 'X', onClick: function () {} }])[0].onClick, 'function', 'onClick 보존');
  assertEq(r([{ text: 'X', onClick: 'nope' }])[0].onClick, null, '함수 아닌 onClick 무시');
  assertEq(typeof r([{ text: 'X', onLoad: function () {} }])[0].onLoad, 'function', 'onLoad 보존');
  assertEq(r([{ text: 'X', onLoad: 'nope' }])[0].onLoad, null, '함수 아닌 onLoad 무시');
  assertEq(r([{ text: 'X' }])[0].onLoad, null, 'onLoad 생략 → null');
  /* 내장 버튼은 콜백 자리가 없다 — 동작이 고정이므로 onLoad도 받지 않는다 */
  assertEq(r(['save'])[0].onLoad, undefined, '내장 버튼에는 onLoad 없음');

  /* text 없는 객체는 그릴 수 없으니 조용히 건너뛴다 (팝업 전체가 죽지 않게) */
  assertEq(r([{ key: 'a' }, 'save']).map(function (x) { return x.key; }), ['save'], 'text 없는 객체 건너뜀');
  assertEq(r([null, undefined, 'save']).map(function (x) { return x.key; }), ['save'], 'null 항목 건너뜀');
  assertEq(r(['bogus', 'save']).map(function (x) { return x.key; }), ['save'], '모르는 문자열 건너뜀');
});

/* ---------------- buildPopupFields ---------------- */
suite('buildPopupFields', function () {
  var build = T.buildPopupFields;
  var cols = [
    { field: 'name', colId: 'name', headerName: 'Name', editable: true },
    { field: 'age', colId: 'age', headerName: 'Age' },                      /* 편집 불가 */
    { field: 'city', colId: 'city', headerName: 'City', editable: true },
  ];

  var f = build(cols, T.resolvePopupEditorConfig(true), true);
  assertEq(f.map(function (x) { return x.field; }), ['name', 'age', 'city'], '컬럼 순서 유지');
  assertEq(f.map(function (x) { return x.readonly; }), [false, true, false], 'editable → readonly 반전');
  assertEq(f[0].label, 'Name', '기본 라벨은 headerName');

  /* hide는 그리드 설정을 따르되 popupEditor.hide 명시가 이긴다 (readonly와 같은 층위) */
  var hideCases = build([
    { field: 'shown', colId: 'shown', editable: true },
    { field: 'gridHidden', colId: 'gridHidden', editable: true, hide: true },
    { field: 'formOnly', colId: 'formOnly', editable: true, hide: true, popupEditor: { hide: false } },
    { field: 'gridOnly', colId: 'gridOnly', editable: true, popupEditor: { hide: true } },
  ], T.resolvePopupEditorConfig(true), true);
  assertEq(hideCases.map(function (x) { return x.field; }), ['shown', 'formOnly'],
    'hide: false는 그리드 hide를 이기고, hide: true는 보이는 컬럼을 폼에서 뺀다');

  /* 내장 컬럼과 체크박스는 폼에 넣지 않는다 */
  var builtins = build([
    { field: 'a', colId: 'a', editable: true },
    { colId: '__rowNum', __rowNumber: true, field: undefined },
    { colId: '__rowStatus', __rowStatus: true, field: '__rowStatus' },
    { colId: '__detailToggle', __detailToggle: true, field: '__d' },
    { colId: 'sel', field: 'sel', checkboxSelection: true },
    { field: 'hidden', colId: 'hidden', hide: true },
  ], T.resolvePopupEditorConfig(true), true);
  assertEq(builtins.map(function (x) { return x.field; }), ['a'], '내장·체크박스·숨김 컬럼 제외');

  /* 그리드 잠금은 절대적 — popupEditor.readonly: false로도 못 푼다 */
  var locked = build([{ field: 'a', colId: 'a', editable: true, popupEditor: { readonly: false } }],
    T.resolvePopupEditorConfig(true), false);
  assertEq(locked[0].readonly, true, 'setEditable(false)가 readonly:false를 이긴다');

  /* 컬럼 단위 커스터마이즈 */
  var custom = build([
    { field: 'a', colId: 'a', headerName: 'A', editable: true,
      popupEditor: { label: '가', hint: '도움말', span: 2, order: 1 } },
    { field: 'b', colId: 'b', headerName: 'B', editable: true, popupEditor: { order: 0 } },
    { field: 'c', colId: 'c', headerName: 'C', editable: true, popupEditor: false },
    { field: 'd', colId: 'd', headerName: 'D', editable: true, popupEditor: { hide: true } },
    { field: 'e', colId: 'e', headerName: 'E', popupEditor: { readonly: false } },
    { field: 'f', colId: 'f', headerName: 'F', editable: true, popupEditor: { readonly: true } },
  ], T.resolvePopupEditorConfig(true), true);
  assertEq(custom.map(function (x) { return x.field; }), ['b', 'a', 'e', 'f'], 'order 반영 + 제외');
  var a = custom.find(function (x) { return x.field === 'a'; });
  assertEq(a.label, '가', 'label 오버라이드');
  assertEq(a.hint, '도움말', 'hint');
  assertEq(a.span, 2, 'span 2');
  assertEq(custom.find(function (x) { return x.field === 'e'; }).readonly, false,
    'readonly:false로 폼에서만 편집 허용');
  assertEq(custom.find(function (x) { return x.field === 'f'; }).readonly, true,
    'readonly:true로 폼에서만 잠금');

  /* order: 0은 "맨 앞으로"여야 한다 — 첫 필드의 자연 인덱스 0과 동점이지만
   * 명시 지정이 이기지 않으면 아무 일도 일어나지 않는다 */
  var tie = build([
    { field: 'first', colId: 'first', editable: true },
    { field: 'lifted', colId: 'lifted', editable: true, popupEditor: { order: 0 } },
    { field: 'third', colId: 'third', editable: true },
  ], T.resolvePopupEditorConfig(true), true);
  assertEq(tie.map(function (x) { return x.field; }), ['lifted', 'first', 'third'],
    'order: 0이 자연 인덱스 0을 이긴다');

  /* order 미지정끼리는 컬럼 순서 그대로 */
  var noOrder = build([
    { field: 'x', colId: 'x', editable: true },
    { field: 'y', colId: 'y', editable: true },
  ], T.resolvePopupEditorConfig(true), true);
  assertEq(noOrder.map(function (x) { return x.field; }), ['x', 'y'], 'order 없으면 컬럼 순서');

  /* 에디터 오버라이드는 editCol에만 반영되고 원본 컬럼은 안 건드린다 */
  var srcCol = { field: 'x', colId: 'x', headerName: 'X', editable: true,
    editor: 'select', editorOptions: ['a'],
    popupEditor: { editor: 'text', editorSearch: true } };
  var ov = build([srcCol], T.resolvePopupEditorConfig(true), true)[0];
  assertEq(ov.editCol.editor, 'text', 'editor 오버라이드');
  assertEq(ov.editCol.editorSearch, true, 'editorSearch 오버라이드');
  assertEq(ov.editCol.editorOptions, ['a'], '오버라이드 안 한 값은 원본 승계');
  assertEq(srcCol.editor, 'select', '원본 컬럼은 불변 (그리드 셀 표시는 그대로)');
  assert(ov.col === srcCol, 'col은 원본 참조 유지');

  /* 오버라이드가 없으면 사본을 만들지 않는다 */
  var plain = build([{ field: 'y', colId: 'y', editable: true }], T.resolvePopupEditorConfig(true), true)[0];
  assert(plain.editCol === plain.col, '오버라이드 없으면 editCol === col');

  /* required도 폼 전용 오버라이드 대상 — validator와 같은 층위 */
  var reqOn = build(
    [{ field: 'z', colId: 'z', editable: true, popupEditor: { required: true } }],
    T.resolvePopupEditorConfig(true), true
  )[0];
  assertEq(reqOn.editCol.required, true, '폼에서만 필수로 올리기');
  var reqOff = build(
    [{ field: 'z', colId: 'z', editable: true, required: true, popupEditor: { required: false } }],
    T.resolvePopupEditorConfig(true), true
  )[0];
  assertEq(reqOff.editCol.required, false, '폼에서만 필수 해제');
  assertEq(reqOff.col.required, true, '원본 컬럼의 required는 불변 (그리드 셀 마커는 그대로)');

  /* config.fields는 목록이자 순서 */
  var picked = build(cols, T.resolvePopupEditorConfig({ fields: ['city', 'name'] }), true);
  assertEq(picked.map(function (x) { return x.field; }), ['city', 'name'], 'fields 순서대로');

  assertEq(build(null, T.resolvePopupEditorConfig(true), true), [], 'null 컬럼 → 빈 배열');
  assertEq(build([{ colId: 'x' }], T.resolvePopupEditorConfig(true), true), [],
    'field 없는 컬럼 제외');
});

/* ---------------- diffPopupValues ---------------- */
suite('diffPopupValues', function () {
  var diff = T.diffPopupValues;
  var fields = [
    { field: 'a', readonly: false },
    { field: 'b', readonly: false },
    { field: 'ro', readonly: true },
  ];

  assertEq(diff({ a: 1, b: 2 }, { a: 1, b: 2 }, fields), {}, '변경 없음');
  assertEq(diff({ a: 1, b: 2 }, { a: 9, b: 2 }, fields),
    { a: { oldValue: 1, newValue: 9 } }, '바뀐 필드만');
  /* readonly 필드는 저장 대상이 아니다 */
  assertEq(diff({ ro: 1 }, { ro: 2 }, fields), {}, 'readonly는 diff에서 제외');

  /* 배열은 참조가 아니라 내용으로 비교 (multiselect) */
  assertEq(diff({ a: ['x'] }, { a: ['x'] }, fields), {}, '같은 내용 배열 = 무변경');
  assertEq(Object.keys(diff({ a: ['x'] }, { a: ['x', 'y'] }, fields)), ['a'], '내용 다른 배열 = 변경');
  assertEq(diff({ a: null }, { a: [] }, fields), {}, 'null → 빈 배열은 스퓨리어스 변경이 아니다');

  /* Date는 시각으로 비교 (참조 비교면 열었다 닫을 때마다 변경으로 잡힌다) */
  assertEq(diff({ a: new Date(2024, 0, 1) }, { a: new Date(2024, 0, 1) }, fields), {},
    '같은 시각 Date = 무변경');
  assertEq(Object.keys(diff({ a: new Date(2024, 0, 1) }, { a: new Date(2024, 0, 2) }, fields)), ['a'],
    '다른 시각 Date = 변경');

  assertEq(diff({ a: 1 }, { a: 1 }, []), {}, '필드 없음');
  assertEq(diff(null, null, fields), {}, 'null 안전');
});

/* ---------------- validatePopupValues ---------------- */
suite('validatePopupValues', function () {
  var v = T.validatePopupValues;
  var row = { n: 5 };
  var fields = [
    { field: 'n', readonly: false, col: {}, editCol: { validator: function (val) { return val > 0 || '양수'; } } },
    { field: 'plain', readonly: false, col: {}, editCol: {} },
    { field: 'ro', readonly: true, col: {}, editCol: { validator: function () { return '항상 실패'; } } },
  ];

  assertEq(v(fields, { n: 5 }, row).errors, {}, '통과하면 오류 없음');
  assertEq(v(fields, { n: -1 }, row).errors, { n: '양수' }, '실패 메시지');
  /* readonly 필드는 검증하지 않는다 — 사용자가 바꿀 수 없는 값으로 Save를 막으면 갇힌다 */
  assert(v(fields, { n: 5 }, row).errors.ro === undefined, 'readonly는 검증 제외');

  /* validator 예외는 편집을 막지 않고 failures로 올려보낸다 (콘솔은 호출자가) */
  var boom = [{ field: 'x', readonly: false, col: {}, editCol: {
    validator: function () { throw new Error('boom'); } } }];
  var res = v(boom, { x: 1 }, row);
  assertEq(res.errors, {}, '예외는 오류로 치지 않는다 (인라인과 같은 규약)');
  assertEq(res.failures.length, 1, 'failures로 보고');
  assertEq(res.failures[0].field, 'x', 'failures에 필드명');

  /* false 반환은 메시지 없는 실패 */
  var f2 = [{ field: 'y', readonly: false, col: {}, editCol: { validator: function () { return false; } } }];
  assert(v(f2, { y: 1 }, row).errors.y !== undefined, 'false 반환도 실패로 잡힌다');

  assertEq(v(null, {}, row).errors, {}, 'null 필드 안전');
  assertEq(v(fields, null, row).errors, { n: '양수' }, 'values 없으면 undefined로 검증');

  /* ---- required ---- */
  var reqFields = [
    { field: 'city', label: '근무 도시', readonly: false, col: {}, editCol: { required: true } },
    { field: 'ro', label: '읽기', readonly: true, col: {}, editCol: { required: true } },
  ];
  var ko = T.resolveLocaleText(DataGrid.locales.ko);
  assertEq(
    v(reqFields, { city: '' }, row, ko).errors,
    { city: '근무 도시은(는) 필수 항목입니다' },
    'required 위반 → 로케일 메시지 (라벨 사용)'
  );
  assertEq(v(reqFields, { city: 'Seoul' }, row, ko).errors, {}, 'required 충족 → 오류 없음');
  assert(v(reqFields, { ro: '' }, row, ko).errors.ro === undefined, 'readonly 필수는 검증 제외');
  /* localeText 생략 시 영어 기본 문구 */
  assert(/is required/.test(v(reqFields, { city: '' }, row).errors.city), 'localeText 생략 → 영어 기본');

  /* required가 validator보다 먼저 — 빈 값을 validator에 넘기지 않는다.
   * 안 그러면 모든 소비자가 validator 안에서 빈 값 처리를 중복 작성해야 한다 */
  var calls = [];
  var both = [{ field: 'z', label: 'Z', readonly: false, col: {}, editCol: {
    required: true,
    validator: function (val) { calls.push(val); return '검증 실패'; } } }];
  var r2 = v(both, { z: '' }, row, ko);
  assertEq(calls.length, 0, '빈 값이면 validator를 호출하지 않는다');
  assert(/필수/.test(r2.errors.z), 'required 메시지가 우선');
  v(both, { z: 'x' }, row, ko);
  assertEq(calls, ['x'], 'required 통과 후 validator 실행');

  /* 0은 유효한 값이므로 required를 통과하고 validator까지 간다 */
  var zero = [{ field: 'q', label: 'Q', readonly: false, col: {}, editCol: { required: true } }];
  assertEq(v(zero, { q: 0 }, row, ko).errors, {}, 'required + 0 → 통과');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
